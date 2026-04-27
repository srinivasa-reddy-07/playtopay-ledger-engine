import uuid
from django.db import models


class Merchant(models.Model):
    """
    Represents a merchant in the payout engine.

    NOTE: No `balance` field is stored here. The current balance for any
    merchant must be derived dynamically by aggregating LedgerEntry records
    (sum of CREDITs minus sum of DEBITs). This enforces the double-entry
    ledger invariant and makes the balance always auditable.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "merchant"

    def __str__(self):
        return f"{self.name} ({self.id})"


class Payout(models.Model):
    """
    A payout request from a merchant to a bank account.
    Payout is defined before LedgerEntry so that LedgerEntry can reference
    it directly without a forward string reference.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.PROTECT,
        related_name="payouts",
    )
    amount_paise = models.BigIntegerField(
        help_text="Payout amount in the smallest currency unit (paise)."
    )
    bank_account_id = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payout"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payout {self.id} | {self.merchant.name} | {self.status}"


class LedgerEntry(models.Model):
    """
    An immutable double-entry ledger record for a merchant.
    Every financial event (credit or debit) is recorded here.
    Entries are never updated or deleted — only inserted.
    """

    class EntryType(models.TextChoices):
        CREDIT = "CREDIT", "Credit"
        DEBIT = "DEBIT", "Debit"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.PROTECT,
        related_name="ledger_entries",
    )
    amount_paise = models.BigIntegerField(
        help_text="Entry amount in the smallest currency unit (paise). Always positive."
    )
    entry_type = models.CharField(
        max_length=10,
        choices=EntryType.choices,
    )
    reference_payout = models.ForeignKey(
        Payout,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ledger_entries",
        help_text="The payout that triggered this ledger entry, if applicable.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ledger_entry"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.entry_type} | {self.amount_paise} paise "
            f"| {self.merchant.name} | {self.created_at.date()}"
        )


class IdempotencyKey(models.Model):
    """
    Tracks the lifecycle of an idempotent request.
    The `key` is the primary key — supplied by the client on each request.
    If a request is already IN_PROGRESS or COMPLETED, the stored response
    is returned immediately without re-processing.
    """

    class Status(models.TextChoices):
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"

    key = models.UUIDField(primary_key=True)
    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.PROTECT,
        related_name="idempotency_keys",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.IN_PROGRESS,
    )
    response_status = models.IntegerField(
        null=True,
        blank=True,
        help_text="HTTP status code of the completed response.",
    )
    response_body = models.JSONField(
        null=True,
        blank=True,
        help_text="JSON-serialised response body for replay.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "idempotency_key"

    def __str__(self):
        return f"IdempotencyKey {self.key} | {self.status}"
