from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .features import FEATURE_COLS, MODELS_DIR, build_features, to_matrix

_MODEL_CACHE: dict = {}
_CLF_CACHE: dict = {}


def load_model():
    if "model" not in _MODEL_CACHE:
        _MODEL_CACHE["model"] = joblib.load(MODELS_DIR / "model_rf_terbaik.joblib")
    return _MODEL_CACHE["model"]


def load_classifier():
    clf_path = MODELS_DIR / "produk_terlaris.joblib"
    if not clf_path.exists():
        return None
    if "clf" not in _CLF_CACHE:
        _CLF_CACHE["clf"] = joblib.load(clf_path)
    return _CLF_CACHE["clf"]


def classifier_available() -> bool:
    return (MODELS_DIR / "produk_terlaris.joblib").exists()


def invalidate_model_cache():
    _MODEL_CACHE.clear()
    _CLF_CACHE.clear()


def predict_next(monthly: pd.DataFrame) -> dict:
    feat = build_features(monthly)
    feat_next = feat.dropna(subset=FEATURE_COLS).iloc[[-1]]
    if feat_next.empty:
        return None
    model = load_model()
    X_next = to_matrix(feat_next)
    lag1_next = feat_next["lag_1"].iloc[0]
    g = model.predict(X_next)[0]
    pred = float(lag1_next * (1 + g))
    tree_preds = np.array([lag1_next * (1 + t.predict(X_next)[0]) for t in model.estimators_])
    lo, hi = np.percentile(tree_preds, [16, 84])
    periode = str(pd.Period(feat_next["periode"].iloc[0], "M") + 1)
    return {"periode": periode, "prediksi": pred, "lower": float(lo), "upper": float(hi)}


def predict_top_products(monthly: pd.DataFrame, transactions: pd.DataFrame) -> list:
    clf = load_classifier()
    if clf is None:
        return None
    feat = build_features(monthly)
    clf_data = feat[FEATURE_COLS + ["periode"]].merge(
        _top_prod_by_periode(transactions), on="periode", how="left"
    ).dropna(subset=FEATURE_COLS + ["target_produk"])
    Xc = to_matrix(clf_data)
    if Xc.shape[0] < 2:
        return None
    Xc_next = to_matrix(feat.dropna(subset=FEATURE_COLS).iloc[[-1]])
    proba = clf.predict_proba(Xc_next)[0]
    proba_series = pd.Series(proba, index=clf.classes_).sort_values(ascending=False).head(5)
    return [
        {"rank": i + 1, "tipe_produk": name, "probabilitas": float(p)}
        for i, (name, p) in enumerate(proba_series.items())
    ]


def _top_prod_by_periode(transactions: pd.DataFrame) -> pd.DataFrame:
    t = transactions.copy()
    t["periode"] = t["tanggal"].dt.to_period("M").astype(str)
    bulanan_produk = t.groupby(["periode", "tipe_produk"])["total"].sum().reset_index()
    top = (
        bulanan_produk.sort_values("total", ascending=False)
        .drop_duplicates("periode")
        .set_index("periode")["tipe_produk"]
        .rename("target_produk")
    )
    return top
