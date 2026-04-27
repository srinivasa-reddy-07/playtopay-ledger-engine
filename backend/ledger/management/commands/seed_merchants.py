from django.core.management.base import BaseCommand
from django.db import transaction
from ledger.models import Merchant, LedgerEntry

DUMMY_MERCHANT_ID = "00000000-0000-0000-0000-000000000001"

class Command(BaseCommand):
    help = "Seeds the database with a dummy merchant and initial funds."

    def handle(self, *args, **options):
        with transaction.atomic():
            merchant, created = Merchant.objects.get_or_create(
                id=DUMMY_MERCHANT_ID,
                defaults={"name": "Test Merchant"}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created merchant {merchant.id}"))
                
                # Give the merchant some starting funds (e.g., 1,000,000.00 INR = 100,000,000 paise)
                LedgerEntry.objects.create(
                    merchant=merchant,
                    amount_paise=100000000,
                    entry_type=LedgerEntry.EntryType.CREDIT
                )
                self.stdout.write(self.style.SUCCESS("Added initial funds of 1,000,000.00 INR to the merchant."))
            else:
                self.stdout.write(self.style.WARNING("Dummy merchant already exists. Skipping."))
