import sys
import threading
from datetime import datetime

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from sales.models import Transaction

_LOCK = threading.Lock()
_timer = None


def _schedule_predict():
    if "test" in sys.argv[0] or any(a.startswith("test") for a in sys.argv[1:]):
        return
    global _timer
    with _LOCK:
        if _timer is not None:
            _timer.cancel()
        from django.core.management import call_command

        def _run():
            global _timer
            with _LOCK:
                _timer = None
            from prediction.services import predict_from_db
            from sales.models import Customer

            try:
                result = predict_from_db()
                print(f"[auto-predict] {result['periode'] if result else 'no data'} @ {datetime.now():%H:%M:%S}")
                _recompute_customer_totals()
            except Exception as e:
                print(f"[auto-predict] error: {e}")

        _timer = threading.Timer(2.0, _run)
        _timer.daemon = True
        _timer.start()


def _recompute_customer_totals():
    from django.db.models import Count, Sum
    from sales.models import Customer, Transaction

    agg = (
        Transaction.objects.values("customer_id")
        .annotate(n=Count("id"), rev=Sum("total"))
    )
    for row in agg:
        Customer.objects.filter(id=row["customer_id"]).update(
            total_transaksi=row["n"], total_revenue=row["rev"]
        )


@receiver(post_save, sender=Transaction)
def on_transaction_saved(sender, instance, **kwargs):
    _schedule_predict()


@receiver(post_delete, sender=Transaction)
def on_transaction_deleted(sender, instance, **kwargs):
    _schedule_predict()
