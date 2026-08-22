from django.core.validators import RegexValidator
from django.db import transaction
from rest_framework import serializers

from .models import Customer, Transaction

BULAN_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]


def next_transaction_id(tanggal):
    # Single Admin: low concurrency, tapi cegah race dengan atomic + retry di create()
    prefix = f"TRX-{tanggal.year}{tanggal.month:02d}"
    qs = Transaction.objects.filter(id__startswith=prefix)
    nums = []
    for tid in qs.values_list("id", flat=True):
        try:
            nums.append(int(tid[len(prefix):]))
        except (IndexError, ValueError):
            continue
    nxt = (max(nums) + 1) if nums else 1
    return f"{prefix}{nxt:03d}"


def next_customer_id():
    nums = []
    for cid in Customer.objects.values_list("id", flat=True):
        try:
            nums.append(int(cid.split("-")[1]))
        except (IndexError, ValueError):
            continue
    nxt = (max(nums) + 1) if nums else 1
    return f"CUST-{nxt:03d}"


class CustomerSerializer(serializers.ModelSerializer):
    # Validasi join YYYY-MM agar konsisten dengan frontend & seed
    join = serializers.CharField(
        validators=[RegexValidator(r"^\d{4}-\d{2}$", message="join harus format YYYY-MM")],
        help_text="YYYY-MM",
    )

    class Meta:
        model = Customer
        fields = ["id", "nama", "tipe", "join", "total_transaksi", "total_revenue"]
        read_only_fields = ["id", "total_transaksi", "total_revenue"]

    def create(self, validated_data):
        # Atomic untuk cegah race CUST-### duplikat
        with transaction.atomic():
            validated_data["id"] = next_customer_id()
            return super().create(validated_data)


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id", "tanggal", "customer", "keterangan", "qty", "satuan",
            "harga", "total", "bulan", "tahun", "tipe_customer", "tipe_produk",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        # Ambil instance values untuk PATCH parsial agar tidak false-positive
        tanggal = attrs.get("tanggal")
        if tanggal is None and self.instance is not None:
            tanggal = getattr(self.instance, "tanggal", None)
        qty = attrs.get("qty")
        harga = attrs.get("harga")
        total = attrs.get("total")
        # Fallback ke instance untuk qty/harga/total jika parsial
        if self.instance is not None:
            qty = qty if qty is not None else getattr(self.instance, "qty", None)
            harga = harga if harga is not None else getattr(self.instance, "harga", None)
            # total validasi hanya jika client kirim total eksplisit
            if "total" not in attrs:
                total = None
        if qty is not None and harga is not None and total is not None:
            if abs(qty * harga - total) > 1:
                raise serializers.ValidationError({"total": "total harus = qty x harga"})
        if tanggal is not None:
            # Jika client mengirim tanggal baru (atau create), auto-derive bulan/tahun jika tidak dikirim
            is_tanggal_update = "tanggal" in attrs
            bulan = attrs.get("bulan")
            tahun = attrs.get("tahun")
            if is_tanggal_update:
                if bulan is None:
                    bulan = BULAN_ID[tanggal.month - 1]
                    attrs["bulan"] = bulan
                if tahun is None:
                    tahun = tanggal.year
                    attrs["tahun"] = tahun
            else:
                # Validasi tanpa perubahan tanggal: fallback ke instance
                if bulan is None and self.instance is not None:
                    bulan = getattr(self.instance, "bulan", None)
                if tahun is None and self.instance is not None:
                    tahun = getattr(self.instance, "tahun", None)
                if bulan is None:
                    bulan = BULAN_ID[tanggal.month - 1]
                    attrs["bulan"] = bulan
                if tahun is None:
                    tahun = tanggal.year
                    attrs["tahun"] = tahun
            if bulan != BULAN_ID[tanggal.month - 1]:
                raise serializers.ValidationError({"bulan": "bulan tidak sesuai tanggal"})
            if tahun != tanggal.year:
                raise serializers.ValidationError({"tahun": "tahun tidak sesuai tanggal"})
        return attrs

    def create(self, validated_data):
        # Atomic + derive bulan/tahun/total agar tahan partial payload
        tanggal = validated_data.get("tanggal")
        if tanggal is not None:
            validated_data.setdefault("bulan", BULAN_ID[tanggal.month - 1])
            validated_data.setdefault("tahun", tanggal.year)
        validated_data["total"] = validated_data["qty"] * validated_data["harga"]
        with transaction.atomic():
            validated_data["id"] = next_transaction_id(validated_data["tanggal"])
            try:
                return super().create(validated_data)
            except Exception as e:
                # Retry sekali jika race ID duplikat (IntegrityError)
                if "UNIQUE" in str(e) or "unique" in str(e).lower():
                    validated_data["id"] = next_transaction_id(validated_data["tanggal"])
                    return super().create(validated_data)
                raise

    def update(self, instance, validated_data):
        qty = validated_data.get("qty", instance.qty)
        harga = validated_data.get("harga", instance.harga)
        validated_data["total"] = qty * harga
        # Jika tanggal diupdate tanpa bulan/tahun, sinkronkan
        if "tanggal" in validated_data:
            t = validated_data["tanggal"]
            validated_data.setdefault("bulan", BULAN_ID[t.month - 1])
            validated_data.setdefault("tahun", t.year)
        return super().update(instance, validated_data)
