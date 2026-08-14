import tempfile
from pathlib import Path

import pandas as pd
from django.conf import settings
from django.test import TestCase

from predictor import engine
from predictor.features import MODELS_DIR, aggregate_monthly
from predictor.trainer import train_from_transactions

TRX_PATH = Path(settings.BASE_DIR).parent / "test" / "dataset" / "transaksi (2).csv"


class EngineParityTest(TestCase):
    def setUp(self):
        self.df = pd.read_csv(TRX_PATH, parse_dates=["tanggal"])
        self.monthly = aggregate_monthly(self.df)

    def test_predict_next_matches_metadata(self):
        engine.invalidate_model_cache()
        r = engine.predict_next(self.monthly)
        self.assertEqual(r["periode"], "2026-01")
        self.assertAlmostEqual(r["prediksi"], 26905.170065281163, delta=1.0)
        self.assertAlmostEqual(r["lower"], 23606.88464185462, delta=10.0)
        self.assertAlmostEqual(r["upper"], 29237.18217142844, delta=10.0)

    def test_trainer_metrics_match_notebook(self):
        with tempfile.TemporaryDirectory() as tmp:
            backup = MODELS_DIR / "model_rf_terbaik.joblib"
            bk = backup.with_suffix(".joblib.bak")
            bk.write_bytes(backup.read_bytes())
            try:
                trained = train_from_transactions(self.df, self.monthly)
                m = trained["metrics_test"]
                self.assertAlmostEqual(m["R2"], 0.9564, delta=0.005)
                self.assertAlmostEqual(m["MAPE"], 1.50, delta=0.1)
                self.assertEqual(trained["n_train"], 40)
            finally:
                backup.write_bytes(bk.read_bytes())
                bk.unlink(missing_ok=True)
                engine.invalidate_model_cache()

    def test_fixed_hyperparameters(self):
        model = engine.load_model()
        self.assertEqual(model.n_estimators, 300)
        self.assertEqual(model.max_features, 0.6)
        self.assertEqual(model.min_samples_leaf, 2)
        self.assertEqual(model.random_state, 42)
