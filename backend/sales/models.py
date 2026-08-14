from django.db import models

TIPE_CHOICES = [
    ("ukm", "UKM"),
    ("sekolah", "Sekolah"),
    ("agri_tech", "Agri Tech"),
    ("enterprise", "Enterprise"),
    ("personal", "Personal"),
    ("pemerintah", "Pemerintah"),
    ("event", "Event"),
]


class Customer(models.Model):
    id = models.CharField(max_length=20, primary_key=True)
    nama = models.CharField(max_length=100)
    tipe = models.CharField(max_length=20, choices=TIPE_CHOICES)
    join = models.CharField(max_length=7, help_text="YYYY-MM")
    total_transaksi = models.IntegerField(default=0)
    total_revenue = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.id} - {self.nama}"


class Transaction(models.Model):
    id = models.CharField(max_length=30, primary_key=True)
    tanggal = models.DateField()
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="transactions")
    keterangan = models.CharField(max_length=200)
    qty = models.FloatField()
    satuan = models.CharField(max_length=20)
    harga = models.FloatField()
    total = models.FloatField()
    bulan = models.CharField(max_length=20)
    tahun = models.IntegerField()
    tipe_customer = models.CharField(max_length=20)
    tipe_produk = models.CharField(max_length=100)

    def __str__(self):
        return self.id
