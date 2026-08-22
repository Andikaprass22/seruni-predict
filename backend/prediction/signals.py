import os
import sys
import threading
from datetime import datetime

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from sales.models import Transaction

_LOCK = threading.Lock()
_timer = None
_DISABLED = os.environ.get("SERUNI_DISABLE_AUTO_PREDICT", "") == "1"


def _is_management_context():
    # Skip hanya untuk command maintenance yang tidak lewat HTTP (migrate/seed/shell)
    # runserver HARUS tetap jalan — jangan skip auto-predict di server.
    argv = " ".join(sys.argv)
    return any(k in argv for k in ("migrate", "seed_data", "collectstatic", "shell"))


def _schedule_predict():
    if _DISABLED or _is_management_context():
        return
    global _timer
    with _LOCK:
        if _timer is not None:
            _timer.cancel()
        _timer = threading.Timer(2.0, _run)
        _timer.daemon = True
        _timer.start()


def _run():
    global _timer
    with _LOCK:
        _timer = None
    try:
        from prediction.services import predict_from_db

        result = predict_from_db()
        print(f"[auto-predict] {result['periode'] if result else 'no data'} @ {datetime.now():%H:%M:%S}")
        _recompute_customer_totals()
    except Exception as e:
        print(f"[auto-predict] error: {e}")


def _recompute_customer_totals():
    from django.db.models import Count, Sum
    from sales.models import Customer

    agg = Transaction.objects.values("customer_id").annotate(n=Count("id"), rev=Sum("total"))
    seen = set()
    for row in agg:
        seen.add(row["customer_id"])
        Customer.objects.filter(id=row["customer_id"]).update(
            total_transaksi=row["n"], total_revenue=row["rev"] or 0.0
        )
    # Customer yang sudah tidak punya transaksi -> 0 kan agar tidak stale
    if seen:
        Customer.objects.exclude(id__in=seen).update(total_transaksi=0, total_revenue=0.0)
    else:
        Customer.objects.all().update(total_transaksi=0, total_revenue=0.0)


@receiver(post_save, sender=Transaction)
def on_transaction_saved(sender, instance, **kwargs):
    transaction.on_commit(lambda: _schedule_predict())


@receiver(post_delete, sender=Transaction)
def on_transaction_deleted(sender, instance, **kwargs):
    transaction.on_commit(lambda: _schedule_predict())
