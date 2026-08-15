import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from sklearn.metrics import (accuracy_score, f1_score, mean_absolute_error,
                             mean_squared_error, r2_score, top_k_accuracy_score)

from .engine import invalidate_model_cache
from .features import FEATURE_COLS, MODELS_DIR, build_features, to_matrix

RANDOM_STATE = 42
FINAL_PARAMS = {
    "n_estimators": 300,
    "max_depth": None,
    "max_features": 0.6,
    "min_samples_leaf": 2,
    "random_state": RANDOM_STATE,
}
RECENCY_W = 2.0
N_TEST = 4
CLF_PARAMS = {
    "n_estimators": 300,
    "learning_rate": 0.08,
    "max_depth": 3,
    "min_samples_leaf": 4,
    "random_state": RANDOM_STATE,
}


def _metrics(y_true, y_pred):
    mask = y_true != 0
    mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100) if mask.any() else float("nan")
    return {
        "R2": float(r2_score(y_true, y_pred)),
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "MSE": float(mean_squared_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "MAPE": mape,
    }


def train_from_transactions(transactions: pd.DataFrame, monthly: pd.DataFrame):
    feat = build_features(monthly)
    r = feat["total_revenue_bulan"]
    feat["target"] = r.shift(-1)
    feat["target_growth"] = feat["target"] / feat["lag_1"] - 1
    feat_model = feat.dropna(subset=FEATURE_COLS + ["target", "target_growth"]).copy()

    X = to_matrix(feat_model)
    y_level = feat_model["target"].to_numpy()
    y_growth = feat_model["target_growth"].to_numpy()
    lag1 = feat_model["lag_1"].to_numpy()
    periode = feat_model["periode"].to_numpy()

    n_train = len(X) - N_TEST
    X_train, X_test = X[:n_train], X[n_train:]
    ytr_g = y_growth[:n_train]
    yte = y_level[n_train:]
    lag1_te = lag1[n_train:]

    w = np.linspace(1.0, RECENCY_W, n_train)
    model = RandomForestRegressor(n_jobs=-1, **FINAL_PARAMS)
    model.fit(X_train, ytr_g, sample_weight=w)
    p_te = lag1_te * (1 + model.predict(X_test))
    m_test = _metrics(yte, p_te)

    p_tr = lag1[:n_train] * (1 + model.predict(X_train))
    m_train = _metrics(y_level[:n_train], p_tr)

    joblib.dump(model, MODELS_DIR / "model_rf_terbaik.joblib")
    invalidate_model_cache()
    return {"model": model, "metrics_test": m_test, "metrics_train": m_train, "n_train": n_train, "N_TEST": N_TEST}


def train_top_products_classifier(transactions: pd.DataFrame, monthly: pd.DataFrame):
    feat = build_features(monthly)
    t = transactions.copy()
    t["periode"] = t["tanggal"].dt.to_period("M").astype(str)
    bulanan_produk = t.groupby(["periode", "tipe_produk"])["total"].sum().reset_index()
    top_prod = (
        bulanan_produk.sort_values("total", ascending=False)
        .drop_duplicates("periode")
        .set_index("periode")["tipe_produk"]
        .rename("target_produk")
    )
    clf_data = feat[FEATURE_COLS + ["periode"]].merge(top_prod, on="periode", how="left")
    clf_data = clf_data.dropna(subset=FEATURE_COLS + ["target_produk"]).copy()
    Xc = to_matrix(clf_data)
    yc = clf_data["target_produk"].to_numpy()
    if Xc.shape[0] < 2:
        return None
    n_train = Xc.shape[0] - N_TEST
    clf = GradientBoostingClassifier(**CLF_PARAMS)
    clf.fit(Xc[:n_train], yc[:n_train])
    joblib.dump(clf, MODELS_DIR / "produk_terlaris.joblib")
    invalidate_model_cache()

    # Evaluasi holdout: akurasi top-1 vs top-3 (target realistis untuk prediksi produk).
    y_test = yc[n_train:]
    if len(y_test) > 0:
        proba_test = clf.predict_proba(Xc[n_train:])
        labels = clf.classes_
        acc_top1 = accuracy_score(y_test, clf.predict(Xc[n_train:]))
        acc_top3 = top_k_accuracy_score(y_test, proba_test, k=3, labels=labels)
        f1 = f1_score(y_test, clf.predict(Xc[n_train:]), average="macro", labels=labels)
    else:
        acc_top1 = acc_top3 = f1 = float("nan")
    return {
        "acc_top1": float(acc_top1),
        "acc_top3": float(acc_top3),
        "f1_macro": float(f1),
        "n_test": int(len(y_test)),
    }


def save_metadata(metrics_test, metrics_train, n_train, last_periode, prediksi):
    meta = {
        "model": "RandomForestRegressor",
        "best_hyperparameters": FINAL_PARAMS,
        "recency_weight": RECENCY_W,
        "n_train": int(n_train),
        "n_test": N_TEST,
        "feature_count": len(FEATURE_COLS),
        "features": FEATURE_COLS,
        "metrics_test": metrics_test,
        "metrics_train": metrics_train,
        "prediksi_berikutnya": prediksi,
        "trained_until": last_periode,
    }
    with open(MODELS_DIR / "model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
