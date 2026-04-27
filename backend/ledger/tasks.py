import random
import time

from django.db import transaction

from django_q.tasks import async_task

from .models import LedgerEntry, Payout


def process_payout(payout_id, attempt=1):
    with transaction.atomic():
        payout = Payout.objects.select_for_update().get(id=payout_id)

        if payout.status in (Payout.Status.COMPLETED, Payout.Status.FAILED):
            return

        if payout.status == Payout.Status.PENDING:
            payout.status = Payout.Status.PROCESSING
            payout.save(update_fields=["status", "updated_at"])

    outcome = random.choices(["success", "fail", "hang"], [70, 20, 10])[0]

    # outcome = 'fail'

    if outcome == "hang":
        if attempt < 3:
            delay = 2 ** attempt
            time.sleep(delay)
            async_task("ledger.tasks.process_payout", payout_id, attempt + 1)
            return
        outcome = "fail"

    with transaction.atomic():
        payout = Payout.objects.select_for_update().get(id=payout_id)

        if outcome == "success":
            payout.status = Payout.Status.COMPLETED
            payout.save(update_fields=["status", "updated_at"])

        elif outcome == "fail":
            payout.status = Payout.Status.FAILED
            payout.save(update_fields=["status", "updated_at"])

            LedgerEntry.objects.create(
                merchant=payout.merchant,
                amount_paise=payout.amount_paise,
                entry_type=LedgerEntry.EntryType.CREDIT,
                reference_payout=payout,
            )
