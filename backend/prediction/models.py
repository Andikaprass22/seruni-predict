from django.db import models


class Prediction(models.Model):
    periode = models.CharField(max_length=7, unique=True)
    prediksi = models.FloatField()
    lower = models.FloatField()
    upper = models.FloatField()
    metode = models.CharField(max_length=10, default="auto")
    created_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.periode


class HistoryPoint(models.Model):
    periode = models.CharField(max_length=7, unique=True)
    actual = models.FloatField(null=True, blank=True)
    prediksi = models.FloatField(null=True, blank=True)
    error = models.FloatField(null=True, blank=True)
    abs_error = models.FloatField(null=True, blank=True)
    mape = models.FloatField(null=True, blank=True)
    split = models.CharField(max_length=10, default="train")

    def __str__(self):
        return self.periode


class TopProduct(models.Model):
    periode = models.CharField(max_length=7)
    rank = models.IntegerField()
    tipe_produk = models.CharField(max_length=100)
    probabilitas = models.FloatField()

    class Meta:
        unique_together = ("periode", "rank")


class ModelStatus(models.Model):
    trained_until = models.CharField(max_length=7, null=True, blank=True)
    last_retrain_at = models.DateTimeField(null=True, blank=True)
    r2_test = models.FloatField(null=True, blank=True)
    mae_test = models.FloatField(null=True, blank=True)
    mape_test = models.FloatField(null=True, blank=True)
    n_train = models.IntegerField(null=True, blank=True)
    n_test = models.IntegerField(null=True, blank=True)
