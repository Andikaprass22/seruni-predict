import json
from pathlib import Path

import numpy as np
import pandas as pd

MODELS_DIR = Path(__file__).parent / "models"


def _metadata():
    try:
        with open(MODELS_DIR / "model_metadata.json", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError as e:
        raise FileNotFoundError(
            "model_metadata.json tidak ditemukan — jalankan retrain atau seed ulang. "
            f"Cari di {MODELS_DIR / 'model_metadata.json'}"
        ) from e
    except json.JSONDecodeError as e:
        raise ValueError(f"model_metadata.json korup: {e}") from e


FEATURE_COLS = _metadata()["features"]


def aggregate_monthly(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["periode"] = df["tanggal"].dt.to_period("M").astype(str)
    bulanan = (
        df.groupby("periode")
        .agg(
            total_revenue_bulan=("total", "sum"),
            n_transaksi=("id", "count"),
            qty_total=("qty", "sum"),
            n_produk_unik=("tipe_produk", "nunique"),
            n_customer_unik=("kode_cust", "nunique"),
        )
        .reset_index()
    )
    bulanan["tahun"] = bulanan["periode"].str[:4].astype(int)
    bulanan["bulan_num"] = bulanan["periode"].str[5:7].astype(int)
    bulanan["avg_transaksi"] = bulanan["total_revenue_bulan"] / bulanan["n_transaksi"]
    return bulanan


def build_features(monthly: pd.DataFrame) -> pd.DataFrame:
    feat = monthly.copy()
    r = feat["total_revenue_bulan"]
    for l in [1, 2, 3]:
        feat[f"lag_{l}"] = r.shift(l)
    feat["ma_3"] = r.rolling(3).mean()
    feat["std_3"] = r.rolling(3).std()
    feat["growth"] = r.pct_change() * 100
    feat["diff"] = r.diff()
    feat["bulan_sin"] = np.sin(2 * np.pi * feat["bulan_num"] / 12)
    feat["bulan_cos"] = np.cos(2 * np.pi * feat["bulan_num"] / 12)
    return feat


def to_matrix(feat: pd.DataFrame) -> np.ndarray:
    return feat[FEATURE_COLS].to_numpy()
