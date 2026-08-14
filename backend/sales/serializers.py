from rest_framework import serializers

from .models import Customer, Transaction

BULAN_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]


def next_transaction_id(tanggal):
    prefix = f"TRX-{tanggal.year}{tanggal.month:02d}"
    qs = Transaction.objects.filter(id__startswith=prefix)
    nums = []
    for tid in qs.values_list("id", flat=True):
        try:
            nums.append(int(tid.split("-")[1]))
        except (IndexError, ValueError):
            continue
    nxt = (max(nums) + 1) if nums else 1
    return f"{prefix}-{nxt:03d}"


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
    class Meta:
        model = Customer
        fields = ["id", "nama", "tipe", "join", "total_transaksi", "total_revenue"]
        read_only_fields = ["id", "total_transaksi", "total_revenue"]

    def create(self, validated_data):
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
        tanggal = attrs.get("tanggal")
        qty = attrs.get("qty")
        harga = attrs.get("harga")
        total = attrs.get("total")
        if qty is not None and harga is not None and total is not None:
            if abs(qty * harga - total) > 1:
                raise serializers.ValidationError({"total": "total harus = qty x harga"})
        if tanggal is not None:
            bulan = attrs.get("bulan")
            tahun = attrs.get("tahun")
            if bulan != BULAN_ID[tanggal.month - 1]:
                raise serializers.ValidationError({"bulan": "bulan tidak sesuai tanggal"})
            if tahun != tanggal.year:
                raise serializers.ValidationError({"tahun": "tahun tidak sesuai tanggal"})
        return attrs

    def create(self, validated_data):
        validated_data["id"] = next_transaction_id(validated_data["tanggal"])
        validated_data["total"] = validated_data["qty"] * validated_data["harga"]
        return super().create(validated_data)

    def update(self, instance, validated_data):
        qty = validated_data.get("qty", instance.qty)
        harga = validated_data.get("harga", instance.harga)
        validated_data["total"] = qty * harga
        return super().update(instance, validated_data)
