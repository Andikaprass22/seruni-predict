from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import BasePermission, IsAuthenticated

from .models import Customer, Transaction
from .serializers import CustomerSerializer, TransactionSerializer


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "is_admin", False))


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related("customer").all().order_by("-tanggal")
    serializer_class = TransactionSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        tipe_produk = self.request.query_params.get("tipe_produk")
        q = self.request.query_params.get("q")
        if tipe_produk:
            qs = qs.filter(tipe_produk__icontains=tipe_produk)
        if q:
            qs = qs.filter(Q(id__icontains=q) | Q(keterangan__icontains=q) | Q(tipe_produk__icontains=q))
        return qs


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("id")
    serializer_class = CustomerSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]
