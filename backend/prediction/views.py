import csv
from io import StringIO

from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import HistoryPoint
from .services import current_payload, predict_from_db, retrain_from_db


class CurrentPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(current_payload())


class RefreshPredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(request.user, "is_admin", False):
            return Response({"detail": "Hanya admin"}, status=status.HTTP_403_FORBIDDEN)
        result = predict_from_db()
        if result is None:
            return Response({"detail": "Data tidak cukup"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(current_payload())


class RetrainView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(request.user, "is_admin", False):
            return Response({"detail": "Hanya admin"}, status=status.HTTP_403_FORBIDDEN)
        result = retrain_from_db()
        if result is None:
            return Response({"detail": "Data tidak cukup"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(current_payload())


class HistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = HistoryPoint.objects.all().order_by("periode")
        return Response(
            [
                {
                    "periode": h.periode,
                    "actual": h.actual,
                    "prediksi": h.prediksi,
                    "error": h.error,
                    "abs_error": h.abs_error,
                    "mape": h.mape,
                    "split": h.split,
                }
                for h in rows
            ]
        )


class ExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow(["periode", "actual", "prediksi", "error", "abs_error", "mape", "split"])
        for h in HistoryPoint.objects.all().order_by("periode"):
            writer.writerow([h.periode, h.actual, h.prediksi, h.error, h.abs_error, h.mape, h.split])
        resp = HttpResponse(buf.getvalue(), content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="seruni_predict_history.csv"'
        return resp
