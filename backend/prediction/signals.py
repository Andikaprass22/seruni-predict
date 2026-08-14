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
    # Skip saat management command / script (bukan request server)
    argv0 = os.path.basename(sys.argv[0])
    return "manage.py" in argv0 or "manage.py" in sys.argv[0] or sys.argv[0].endswith(".py") and "manage" not in sys.argv[0]


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
    for row in agg:
        Customer.objects.filter(id=row["customer_id"]).update(
            total_transaksi=row["n"], total_revenue=row["rev"]
        )


@receiver(post_save, sender=Transaction)
def on_transaction_saved(sender, instance, **kwargs):
    transaction.on_commit(lambda: _schedule_predict())


@receiver(post_delete, sender=Transaction)
def on_transaction_deleted(sender, instance, **kwargs):
    transaction.on_commit(lambda: _schedule_predict())
