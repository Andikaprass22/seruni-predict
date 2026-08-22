from rest_framework.pagination import PageNumberPagination


class FlexiblePagination(PageNumberPagination):
    """Single Admin: izinkan FE minta ?page_size=100 untuk list kecil (1200 transaksi)."""

    page_size_query_param = "page_size"
    max_page_size = 200
    page_size = 20
