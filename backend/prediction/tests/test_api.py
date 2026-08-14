from django.test import TestCase

from accounts.models import User
from sales.models import Customer, Transaction


class SalesApiTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(username="admin@test.local", password="pass12345", role="admin")
        self.staff = User.objects.create_user(username="staff@test.local", password="pass12345", role="staff")
        self.cust = Customer.objects.create(id="CUST-001", nama="Toko A", tipe="ukm", join="2022-01")

    def _auth(self, user):
        resp = self.client.post(
            "/api/auth/token/",
            {"username": user.username, "password": "pass12345"},
            content_type="application/json",
        )
        return {"HTTP_AUTHORIZATION": f"Bearer {resp.json()['access']}"}

    def test_staff_can_create_transaction(self):
        h = self._auth(self.staff)
        resp = self.client.post(
            "/api/transactions/",
            {
                "tanggal": "2026-02-03",
                "customer": "CUST-001",
                "keterangan": "Cetak Banner",
                "qty": 2,
                "satuan": "m",
                "harga": 100.0,
                "total": 200.0,
                "bulan": "Februari",
                "tahun": 2026,
                "tipe_customer": "ukm",
                "tipe_produk": "Banner Flexi",
            },
            content_type="application/json",
            **h,
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(Transaction.objects.count(), 1)
        self.assertTrue(resp.json()["id"].startswith("TRX-202602"))

    def test_staff_cannot_update_transaction(self):
        trx = Transaction.objects.create(
            id="TRX-2026001", tanggal="2026-01-02", customer=self.cust, keterangan="A",
            qty=1, satuan="pcs", harga=10.0, total=10.0, bulan="Januari", tahun=2026,
            tipe_customer="ukm", tipe_produk="ID Card",
        )
        h = self._auth(self.staff)
        resp = self.client.patch(f"/api/transactions/{trx.id}/", {"keterangan": "B"}, content_type="application/json", **h)
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_update_transaction(self):
        trx = Transaction.objects.create(
            id="TRX-2026002", tanggal="2026-01-02", customer=self.cust, keterangan="A",
            qty=1, satuan="pcs", harga=10.0, total=10.0, bulan="Januari", tahun=2026,
            tipe_customer="ukm", tipe_produk="ID Card",
        )
        h = self._auth(self.admin)
        resp = self.client.patch(f"/api/transactions/{trx.id}/", {"qty": 3, "harga": 50.0}, content_type="application/json", **h)
        self.assertEqual(resp.status_code, 200, resp.content)
        trx.refresh_from_db()
        self.assertEqual(trx.total, 150.0)

    def test_invalid_total_rejected(self):
        h = self._auth(self.staff)
        resp = self.client.post(
            "/api/transactions/",
            {
                "tanggal": "2026-02-03",
                "customer": "CUST-001",
                "keterangan": "X",
                "qty": 2,
                "satuan": "m",
                "harga": 100.0,
                "total": 999.0,
                "bulan": "Februari",
                "tahun": 2026,
                "tipe_customer": "ukm",
                "tipe_produk": "Banner Flexi",
            },
            content_type="application/json",
            **h,
        )
        self.assertEqual(resp.status_code, 400)

    def test_staff_cannot_create_customer(self):
        h = self._auth(self.staff)
        resp = self.client.post("/api/customers/", {"nama": "X", "tipe": "ukm", "join": "2026-01"}, content_type="application/json", **h)
        self.assertEqual(resp.status_code, 403)

    def test_unauthenticated_denied(self):
        resp = self.client.get("/api/transactions/")
        self.assertEqual(resp.status_code, 401)
