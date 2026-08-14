from django.contrib import admin

from .models import HistoryPoint, ModelStatus, Prediction, TopProduct

admin.site.register(Prediction)
admin.site.register(HistoryPoint)
admin.site.register(TopProduct)
admin.site.register(ModelStatus)
