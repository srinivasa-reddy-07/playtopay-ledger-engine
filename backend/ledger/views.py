import functools

from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import IdempotencyKey, LedgerEntry, Merchant, Payout
from .services import create_payout_safely

DUMMY_MERCHANT_ID = "00000000-0000-0000-0000-000000000001"


def idempotency_check(view_func):
    @functools.wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        idempotency_key = request.headers.get("Idempotency-Key")

        if not idempotency_key:
            return Response({"error": "Idempotency-Key header is required."}, status=400)

        try:
            merchant = Merchant.objects.get(id=DUMMY_MERCHANT_ID)
        except Merchant.DoesNotExist:
            return Response({"error": "Merchant not found."}, status=404)

        from django.db import transaction

        with transaction.atomic():
            record, created = IdempotencyKey.objects.get_or_create(
                key=idempotency_key,
                defaults={"merchant": merchant, "status": IdempotencyKey.Status.IN_PROGRESS},
            )

        if not created:
            if record.status == IdempotencyKey.Status.IN_PROGRESS:
                return Response(
                    {"error": "A request with this Idempotency-Key is already in progress."},
                    status=409,
                )
            return Response(record.response_body, status=record.response_status)

        try:
            response = view_func(self, request, *args, **kwargs)
            record.response_status = response.status_code
            record.response_body = response.data
            record.status = IdempotencyKey.Status.COMPLETED
            record.save(update_fields=["response_status", "response_body", "status"])
            return response
        except Exception:
            record.delete()
            raise

    return wrapper


class PayoutRequestView(APIView):

    @idempotency_check
    def post(self, request):
        amount_paise = request.data.get("amount_paise")
        bank_account_id = request.data.get("bank_account_id")

        if amount_paise is None or bank_account_id is None:
            return Response(
                {"error": "amount_paise and bank_account_id are required."}, status=400
            )

        if not isinstance(amount_paise, int) or amount_paise <= 0:
            return Response({"error": "amount_paise must be a positive integer."}, status=400)

        try:
            payout = create_payout_safely(
                merchant_id=DUMMY_MERCHANT_ID,
                amount_paise=amount_paise,
                bank_account_id=bank_account_id,
            )
        except Merchant.DoesNotExist:
            return Response({"error": "Merchant not found."}, status=404)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        return Response(
            {
                "payout_id": str(payout.id),
                "merchant_id": str(payout.merchant_id),
                "amount_paise": payout.amount_paise,
                "bank_account_id": payout.bank_account_id,
                "status": payout.status,
                "created_at": payout.created_at.isoformat(),
            },
            status=201,
        )


class DashboardView(APIView):

    def get(self, request):
        merchant_qs = Merchant.objects.filter(id=DUMMY_MERCHANT_ID)
        if not merchant_qs.exists():
            return JsonResponse({"error": "Merchant not found."}, status=404)

        credits = LedgerEntry.objects.filter(
            merchant_id=DUMMY_MERCHANT_ID, entry_type=LedgerEntry.EntryType.CREDIT
        ).aggregate(total=Coalesce(Sum("amount_paise"), 0))["total"]

        debits = LedgerEntry.objects.filter(
            merchant_id=DUMMY_MERCHANT_ID, entry_type=LedgerEntry.EntryType.DEBIT
        ).aggregate(total=Coalesce(Sum("amount_paise"), 0))["total"]

        available_balance = credits - debits

        held_balance = Payout.objects.filter(
            merchant_id=DUMMY_MERCHANT_ID,
            status__in=[Payout.Status.PENDING, Payout.Status.PROCESSING],
        ).aggregate(total=Coalesce(Sum("amount_paise"), 0))["total"]

        recent_entries = list(
            LedgerEntry.objects.filter(merchant_id=DUMMY_MERCHANT_ID)
            .order_by("-created_at")[:10]
            .values("id", "amount_paise", "entry_type", "created_at")
        )
        for entry in recent_entries:
            entry["id"] = str(entry["id"])
            entry["created_at"] = entry["created_at"].isoformat()

        recent_payouts = list(
            Payout.objects.filter(merchant_id=DUMMY_MERCHANT_ID)
            .order_by("-created_at")[:10]
            .values("id", "amount_paise", "status", "bank_account_id", "created_at")
        )
        for payout in recent_payouts:
            payout["id"] = str(payout["id"])
            payout["created_at"] = payout["created_at"].isoformat()

        return JsonResponse(
            {
                "available_balance": available_balance,
                "held_balance": held_balance,
                "recent_entries": recent_entries,
                "recent_payouts": recent_payouts,
            }
        )
