import threading
import uuid

from django.db import connection
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from ledger.models import IdempotencyKey, LedgerEntry, Merchant, Payout

DUMMY_MERCHANT_ID = "00000000-0000-0000-0000-000000000001"


class SecurityTests(TransactionTestCase):
    def setUp(self):
        self.merchant = Merchant.objects.create(
            id=DUMMY_MERCHANT_ID, name="Test Merchant"
        )
        LedgerEntry.objects.create(
            merchant=self.merchant,
            amount_paise=1000,
            entry_type=LedgerEntry.EntryType.CREDIT,
        )
        self.url = "/api/v1/payouts/"

    def test_idempotency_safety(self):
        client = APIClient()
        idem_key = str(uuid.uuid4())
        payload = {"amount_paise": 200, "bank_account_id": "ACC123"}

        res1 = client.post(
            self.url,
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY=idem_key,
        )
        self.assertEqual(res1.status_code, 201)

        res2 = client.post(
            self.url,
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY=idem_key,
        )
        self.assertEqual(res2.status_code, 201)

        self.assertEqual(res1.data["payout_id"], res2.data["payout_id"])
        self.assertEqual(Payout.objects.count(), 1)
        self.assertEqual(IdempotencyKey.objects.count(), 1)

    def test_payout_concurrency(self):
        idem_key1 = str(uuid.uuid4())
        idem_key2 = str(uuid.uuid4())
        payload = {"amount_paise": 600, "bank_account_id": "ACC123"}

        results = []

        def make_request(key):
            try:
                client = APIClient()
                res = client.post(
                    self.url,
                    payload,
                    format="json",
                    HTTP_IDEMPOTENCY_KEY=key,
                )
                results.append(res.status_code)
            finally:
                connection.close()

        t1 = threading.Thread(target=make_request, args=(idem_key1,))
        t2 = threading.Thread(target=make_request, args=(idem_key2,))

        t1.start()
        t2.start()

        t1.join()
        t2.join()

        self.assertIn(201, results)
        self.assertIn(400, results)
        self.assertEqual(results.count(201), 1)
        self.assertEqual(results.count(400), 1)

        credits = LedgerEntry.objects.filter(
            merchant=self.merchant, entry_type=LedgerEntry.EntryType.CREDIT
        ).aggregate(total=Coalesce(Sum("amount_paise"), 0))["total"]
        
        debits = LedgerEntry.objects.filter(
            merchant=self.merchant, entry_type=LedgerEntry.EntryType.DEBIT
        ).aggregate(total=Coalesce(Sum("amount_paise"), 0))["total"]
        
        balance = credits - debits
        self.assertEqual(balance, 400)
        self.assertEqual(Payout.objects.count(), 1)
