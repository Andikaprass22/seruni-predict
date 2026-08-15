import logging

import pandas as pd
from django.utils import timezone

from predictor import engine
from predictor.features import aggregate_monthly

from .models import HistoryPoint, ModelStatus, Prediction, TopProduct

logger = logging.getLogger(__name__)


def _transactions_df():
    from sales.models import Transaction

    qs = Transaction.objects.all().values(
        "id", "tanggal", "customer_id", "tipe_produk", "qty", "total"
    )
    rows = list(qs)
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["tanggal"] = pd.to_datetime(df["tanggal"])
    df.rename(columns={"customer_id": "kode_cust"}, inplace=True)
    return df


def _monthly():
    return aggregate_monthly(_transactions_df())


def predict_from_db():
    df = _transactions_df()
    if df.empty:
        logger.warning("No transactions to predict")
        return None
    monthly = _monthly()
    result = engine.predict_next(monthly)
    if result is None:
        return None
    Prediction.objects.update_or_create(
        periode=result["periode"],
        defaults={
            "prediksi": result["prediksi"],
            "lower": result["lower"],
            "upper": result["upper"],
            "metode": "auto",
        },
    )
    _sync_history(monthly, result)
    top = engine.predict_top_products(monthly, df)
    _sync_top_products(result["periode"], top)
    return result


def _sync_history(monthly, current_pred):
    feat = engine.build_features(monthly)
    r = feat["total_revenue_bulan"]
    feat["target"] = r.shift(-1)
    n_test = 4
    n = len(feat)
    n_train = n - n_test
    periods = feat["periode"].to_numpy()
    actuals = feat["total_revenue_bulan"].to_numpy()
    targets = feat["target"].to_numpy()

    for i, p in enumerate(periods):
        act = float(actuals[i])
        # prediksi in-sample: lag1 * (1 + model.predict(X))
        row = feat.iloc[[i]]
        X_row = engine.to_matrix(row)
        g = engine.load_model().predict(X_row)[0]
        pred_val = float(row["lag_1"].iloc[0] * (1 + g))
        if pd.isna(targets[i]):
            # Bulan terakhir punya aktual tapi belum punya target (t+1).
            # Hitung prediksi in-sample (lag1 x (1+growth)) agar baris punya
            # prediksi, error, dan MAPE — sama seperti bulan lain di riwayat.
            err = act - pred_val
            mape = abs(err) / act * 100 if act else None
            HistoryPoint.objects.update_or_create(
                periode=p,
                defaults={
                    "actual": act,
                    "prediksi": pred_val,
                    "error": err,
                    "abs_error": abs(err),
                    "mape": mape,
                    "split": "actual",
                },
            )
            continue
        err = act - pred_val
        mape = abs(err) / act * 100 if act else None
        split = "train" if i < n_train else "test"
        HistoryPoint.objects.update_or_create(
            periode=p,
            defaults={
                "actual": act,
                "prediksi": pred_val,
                "error": err,
                "abs_error": abs(err),
                "mape": mape,
                "split": split,
            },
        )
    HistoryPoint.objects.update_or_create(
        periode=current_pred["periode"],
        defaults={"prediksi": current_pred["prediksi"], "actual": None, "error": None, "abs_error": None, "mape": None, "split": "future"},
    )


def _sync_top_products(periode, top):
    TopProduct.objects.filter(periode=periode).delete()
    if top:
        TopProduct.objects.bulk_create(
            [TopProduct(periode=periode, rank=t["rank"], tipe_produk=t["tipe_produk"], probabilitas=t["probabilitas"]) for t in top]
        )


def retrain_from_db():
    from predictor import trainer

    df = _transactions_df()
    if df.empty:
        return None
    monthly = _monthly()
    trained = trainer.train_from_transactions(df, monthly)
    trainer.train_top_products_classifier(df, monthly)
    last_periode = str(monthly["periode"].iloc[-1])
    result = engine.predict_next(monthly)
    if result:
        Prediction.objects.update_or_create(
            periode=result["periode"],
            defaults={
                "prediksi": result["prediksi"],
                "lower": result["lower"],
                "upper": result["upper"],
                "metode": "manual",
            },
        )
        _sync_history(monthly, result)
        top = engine.predict_top_products(monthly, df)
        _sync_top_products(result["periode"], top)
    ModelStatus.objects.update_or_create(
        pk=1,
        defaults={
            "trained_until": last_periode,
            "last_retrain_at": timezone.now(),
            "r2_test": trained["metrics_test"]["R2"],
            "mae_test": trained["metrics_test"]["MAE"],
            "mape_test": trained["metrics_test"]["MAPE"],
            "n_train": trained["n_train"],
            "n_test": trained["N_TEST"],
        },
    )
    return result


def current_payload():
    pred = Prediction.objects.order_by("-periode").first()
    status = ModelStatus.objects.first()
    top = TopProduct.objects.filter(periode=pred.periode if pred else "").order_by("rank")
    return {
        "prediksi": {
            "periode": pred.periode,
            "prediksi": pred.prediksi,
            "lower": pred.lower,
            "upper": pred.upper,
            "metode": pred.metode,
        }
        if pred
        else None,
        "top_products": [
            {"rank": t.rank, "tipe_produk": t.tipe_produk, "probabilitas": t.probabilitas}
            for t in top
        ],
        "top_products_status": "available" if engine.classifier_available() else "not_trained",
        "model_status": {
            "trained_until": status.trained_until,
            "last_retrain_at": status.last_retrain_at.isoformat() if status and status.last_retrain_at else None,
            "r2_test": status.r2_test,
            "mae_test": status.mae_test,
            "mape_test": status.mape_test,
            "n_train": status.n_train,
            "n_test": status.n_test,
        }
        if status
        else None,
    }
