from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django_q.tasks import async_task

from .models import LedgerEntry, Merchant, Payout


def create_payout_safely(merchant_id, amount_paise, bank_account_id):
    with transaction.atomic():
        merchant = Merchant.objects.select_for_update().get(id=merchant_id)

        credits = LedgerEntry.objects.filter(
            merchant=merchant, entry_type=LedgerEntry.EntryType.CREDIT
        ).aggregate(total=Coalesce(Sum("amount_paise"), 0))["total"]

        debits = LedgerEntry.objects.filter(
            merchant=merchant, entry_type=LedgerEntry.EntryType.DEBIT
        ).aggregate(total=Coalesce(Sum("amount_paise"), 0))["total"]

        balance = credits - debits

        if balance < amount_paise:
            raise ValueError("Insufficient balance")

        payout = Payout.objects.create(
            merchant=merchant,
            amount_paise=amount_paise,
            bank_account_id=bank_account_id,
            status=Payout.Status.PENDING,
        )

        LedgerEntry.objects.create(
            merchant=merchant,
            amount_paise=amount_paise,
            entry_type=LedgerEntry.EntryType.DEBIT,
            reference_payout=payout,
        )

        # Enqueue only after the transaction commits so the worker never
        # fetches a payout that doesn't yet exist in the database.
        transaction.on_commit(
            lambda: async_task("ledger.tasks.process_payout", payout.id)
        )

        return payout
