import os

import pandas as pd
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from sales.models import Customer, Transaction

BULAN_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

DEFAULT_PATHS = [
    ("transaksi", "test/dataset/transaksi (2).csv"),
    ("customer", "test/dataset/customer (2).csv"),
    ("transaksi_2026", "test/2026/transaksi_2026_01.csv"),
]


class Command(BaseCommand):
    help = "Seed transaksi & customer dari CSV (folder test) + buat user admin default"

    def add_arguments(self, parser):
        parser.add_argument("--transaksi", default=DEFAULT_PATHS[0][1])
        parser.add_argument("--customer", default=DEFAULT_PATHS[1][1])
        parser.add_argument("--transaksi-2026", default=DEFAULT_PATHS[2][1])

    def handle(self, *args, **opts):
        base = settings.BASE_DIR.parent
        cust_path = base / opts["customer"]
        trx_path = base / opts["transaksi"]
        trx26_path = base / opts["transaksi_2026"]

        with transaction.atomic():
            self._seed_customers(cust_path)
            self._seed_transactions(trx_path)
            if trx26_path.exists():
                self._seed_transactions(trx26_path)
            self._seed_admin()

        self.stdout.write(self.style.SUCCESS(f"Seed selesai: Customer={Customer.objects.count()}, Transaction={Transaction.objects.count()}"))

    def _seed_customers(self, path):
        df = pd.read_csv(path)
        for row in df.to_dict("records"):
            Customer.objects.update_or_create(
                id=str(row["id"]),
                defaults={
                    "nama": row["nama"],
                    "tipe": row["tipe"],
                    "join": str(row["join"]),
                    "total_transaksi": int(row["total_transaksi"]),
                    "total_revenue": float(row["total_revenue"]),
                },
            )

    def _seed_transactions(self, path):
        df = pd.read_csv(path, parse_dates=["tanggal"])
        cust_ids = set(Customer.objects.values_list("id", flat=True))
        created = 0
        for row in df.to_dict("records"):
            cid = str(row["kode_cust"])
            if cid not in cust_ids:
                continue
            t = row["tanggal"]
            if not isinstance(t, pd.Timestamp):
                t = pd.to_datetime(t)
            bulan = BULAN_ID[t.month - 1]
            tanggal = t.date()
            year = t.year
            _, created_flag = Transaction.objects.update_or_create(
                id=str(row["id"]),
                defaults={
                    "tanggal": tanggal,
                    "customer_id": cid,
                    "keterangan": str(row["keterangan"]),
                    "qty": float(row["qty"]),
                    "satuan": str(row["satuan"]),
                    "harga": float(row["harga"]),
                    "total": float(row["total"]),
                    "bulan": bulan,
                    "tahun": int(row.get("tahun", year)),
                    "tipe_customer": str(row["tipe_customer"]),
                    "tipe_produk": str(row["tipe_produk"]),
                },
            )
            if created_flag:
                created += 1
        print(f"  {path.name}: {created} baru, total di DB {Transaction.objects.count()}")

    def _seed_admin(self):
        username = os.getenv("SEED_ADMIN_USERNAME", "admin@seruni.local")
        password = os.getenv("SEED_ADMIN_PASSWORD", "admin123")
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=username, password=password, role="admin")
            print(f"  user admin dibuat: {username}")
        else:
            u = User.objects.get(username=username)
            if not u.is_admin:
                u.role = "admin"
                u.is_staff = True
                u.is_superuser = True
                u.save()
