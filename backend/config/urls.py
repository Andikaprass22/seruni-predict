from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import MeView
from prediction.views import CurrentPredictionView, ExportView, HistoryView, RefreshPredictionView, RetrainView
from sales.views import CustomerViewSet, TransactionViewSet

router = DefaultRouter()
router.register("transactions", TransactionViewSet, basename="transaction")
router.register("customers", CustomerViewSet, basename="customer")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", MeView.as_view(), name="me"),
    path("api/predictions/current/", CurrentPredictionView.as_view(), name="prediction_current"),
    path("api/predictions/history/", HistoryView.as_view(), name="prediction_history"),
    path("api/predictions/refresh/", RefreshPredictionView.as_view(), name="prediction_refresh"),
    path("api/predictions/retrain/", RetrainView.as_view(), name="prediction_retrain"),
    path("api/predictions/export/", ExportView.as_view(), name="prediction_export"),
    path("api/", include(router.urls)),
]
