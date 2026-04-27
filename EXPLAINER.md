# Engineering Explainer: PlayToPay Ledger

When building this system, the primary goal was **absolute money integrity**. If the UI breaks, that's a bug. If the ledger drifts, **that's a catastrophe**. Here is how I approached the core architecture to ensure safe, concurrent, and idempotent payouts.

## 1. The Ledger

### The Balance Query

```python
balance = LedgerEntry.objects.filter(merchant=merchant).aggregate(
    total=Sum(
        Case(
            When(entry_type='CREDIT', then=F('amount_paise')),
            When(entry_type='DEBIT', then=-F('amount_paise')),
            default=0,
            output_field=BigIntegerField()
        )
    )
)['total'] or 0
```

### Why I modeled it this way

I explicitly avoided putting a balance integer column on the Merchant table. **A static balance column is notoriously easy to let drift out of sync** due to race conditions or manual database edits. Instead, I built a double-entry style ledger. The balance is dynamically calculated on the fly by summing up every immutable CREDIT and DEBIT row. It's like **reading a bank statement instead of just looking at the total**—if the math ever looks wrong, I have an exact, unalterable paper trail to prove where every paisa went.

---

## 2. The Lock

### The Code

```python
with transaction.atomic():
    # Lock the merchant row so nobody else can touch their balance right now
    merchant = Merchant.objects.select_for_update().get(id=merchant_id)
    current_balance = get_balance(merchant)
    
    if current_balance < amount_paise:
        raise ValueError("Insufficient funds")
```

### How it works

The biggest risk in a payout system is a **"double spend"**—like a user with ₹100 double-clicking withdraw and successfully requesting ₹200. To prevent this, I rely on **PostgreSQL's row-level locking via `SELECT FOR UPDATE`**.

When a payout request starts, it puts an **exclusive lock on that specific merchant's row**. If a second, simultaneous request comes in at the exact same millisecond, it hits a wall. The database forces the second request to wait in line until the first one is completely finished. By the time the second request gets the lock, the balance has already been deducted, the `if current_balance < amount_paise` check fails, and it's cleanly rejected.

---

## 3. The Idempotency

Network drops happen, and frontends will retry requests. We can't accidentally initiate two payouts for the same intent.

### How the system knows it's seen a key before

The frontend generates a **UUID (Idempotency-Key header)** for every unique user action. I store this key, along with the API response, in a dedicated `IdempotencyKey` table. If a request comes in with a key I already have, I intercept it in the middleware/view and just hand back the saved response without touching the ledger again.

### The "In-Flight" Race

What if the first request is still processing when the exact same retry hits the server? My `IdempotencyKey` table has a **UNIQUE constraint on the key**. The database will instantly throw an `IntegrityError` when the second request tries to save the same key, acting as a **natural, distributed lock**. The second request is aborted before it ever reaches the money logic.

---

## 4. The State Machine

Money only flows in one direction. A payout goes from `PENDING` → `PROCESSING`, and then finally to either `COMPLETED` or `FAILED`.

### The Guard

I blocked illegal transitions (like `FAILED` resurrecting to `COMPLETED`) right at the entry point of the background task:

```python
def process_payout(payout_id):
    payout = Payout.objects.get(id=payout_id)
    
    # Hard stop: We only process brand new payouts.
    if payout.status != 'PENDING':
        return 
```

If a payout fails, the system automatically wraps the status update and the refund (a CREDIT ledger entry) inside a `transaction.atomic()` block so **they succeed or fail together**.

---

## 5. The AI Audit

I used LLMs to help scaffold the boilerplate, but **you can't trust them blindly with financial logic**.

### What the AI gave me

When I asked it for the payout creation logic, it gave me a **classic check-then-act race condition** using Python-level math:

```python
# AI's flawed code
merchant = Merchant.objects.get(id=merchant_id)
if merchant.balance >= requested_amount: # Dangerous!
    create_payout(...)
    merchant.balance -= requested_amount
    merchant.save()
```

### Why I rejected it

**The AI failed to account for concurrency.** In the split second between fetching `merchant.balance` and calling `.save()`, another thread could have spent those exact same funds.

### What I replaced it with

I completely ripped that out. I enforced the **`BigIntegerField` paise format**, removed the **static balance column entirely**, and wrote the **database-level `.select_for_update()` lock** and **dynamic `.aggregate()` sum query** shown in Section 1 and 2.

---

## 6. Infrastructure & Deployment Strategy

### Distributed Architecture

The system is split across **Vercel (Frontend)** and **Render (Backend/DB)** to leverage specialized hosting for static vs. dynamic assets:

- **Vercel** handles React frontend deployment with global CDN and instant cold-start
- **Render** hosts the Django backend, PostgreSQL database, and background worker on a single instance

### Infrastructure as Code (IaC)

Deployment is managed via **`render.yaml`**. This blueprint automates the provisioning of:

- PostgreSQL instance with persistent data volume
- Web Service linked to the database
- Environment variable injection for secrets and configuration

This ensures a **reproducible production environment** without manual server configuration.

### Process Chaining (Sidecar Pattern)

To maintain the ledger's high-concurrency requirements on a single free-tier instance, I chained the web server and the task worker in the startup command:

```bash
gunicorn playtopay.wsgi:application & python manage.py qcluster
```

**Why this matters:** This ensures the **Django-Q2 cluster is always alive** to process the payout queue the moment a request is recorded in the ledger. Without this, payouts could sit indefinitely waiting for a worker that doesn't exist.

### Security Handshake

Configured **`CSRF_TRUSTED_ORIGINS`** and **`CORS_ALLOWED_ORIGINS`** specifically for the Vercel production domain. This allows secure, state-changing financial requests across different cloud providers while blocking unauthorized cross-origin requests.

```python
CSRF_TRUSTED_ORIGINS = [
    "https://playtopay.vercel.app"
]

CORS_ALLOWED_ORIGINS = [
    "https://playtopay.vercel.app"
]
```

This is critical for a financial system: we accept requests **only** from our trusted frontend, and the browser's CSRF protection prevents token hijacking attacks.