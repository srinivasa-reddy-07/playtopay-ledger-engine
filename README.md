# PlayToPay Ledger Engine

A high-concurrency, idempotent financial ledger system built with Django and React.

> 💡 **Note for Reviewers:** Please see [EXPLAINER.md](./EXPLAINER.md) for a deep dive into the ledger architecture, concurrency handling, pessimistic locking, and idempotency design.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)

---

## Overview

PlayToPay Ledger is designed with **absolute money integrity** at its core. It ensures safe, concurrent, and idempotent payouts through:

- **Double-entry ledger system** for immutable transaction history
- **Row-level database locks** to prevent double-spending
- **Idempotency keys** for network-resilient retries
- **State machine enforcement** for one-directional money flow
- **Async processing** with background job queue
- **Comprehensive race-condition and idempotency tests** with threading

---

## Architecture

The system runs as a **three-process distributed application**:

```text
┌─────────────────────────────────────────────────────────────┐
│                    PlayToPay Ledger                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │  Django Server   │  │  Background Job  │  │  React    │  │
│  │  (REST API)      │  │  Queue (django-q2)  │  Frontend │  │
│  │  Port: 8000      │  │  (Async Payouts) │  │ Port:5173 │  │
│  └──────────────────┘  └──────────────────┘  └───────────┘  │
│                              │                                 │
│                    ┌─────────▼──────────────┐               │
│                    │   SQLite / PostgreSQL  │               │
│                    │  (Ledger + Locks)      │               │
│                    └────────────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role | Port |
|-----------|------|------|
| **Django Server** | Handles API requests, validates payouts, manages transactions | `8000` |
| **Background Worker** | Processes queued payout jobs asynchronously via django-q2 | N/A |
| **React Frontend** | User interface for initiating payouts and monitoring balance | `5173` |
| **Database** | SQLite (local dev), PostgreSQL (production) | N/A |

---

## Setup Instructions

### Prerequisites

- **Python 3.9+**
- **Node.js 16+** (for frontend)
- **pip** and **npm** package managers

**Note:** SQLite3 comes built-in with Python. PostgreSQL is optional for local development and recommended only for production deployments that require full row-level locking via `SELECT FOR UPDATE`.

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (uses SQLite by default)
python manage.py migrate

# (Optional) Seed test merchant data
python manage.py seed_merchants
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

---

## Running the Application

You need **three terminal windows** (or tabs) to run all processes simultaneously:

### Terminal 1: Django Server

Handles all REST API requests and transaction management.

```bash
cd backend
source .venv/bin/activate
python manage.py runserver
```

**Expected output:**
```
Starting development server at http://127.0.0.1:8000/
```

---

### Terminal 2: Background Worker (django-q2)

Processes asynchronous payout jobs in the background queue.

```bash
cd backend
source .venv/bin/activate
python manage.py qcluster
```

**Expected output:**
```
Starting task cluster...
Monitoring tasks...
```

---

### Terminal 3: React Frontend

Provides the user interface for the application.

```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

---

## Running Tests

The automated test suite includes both **race-condition safety** and **idempotency duplication** tests using Django's `TransactionTestCase` and Python threading.

### Run All Tests

```bash
cd backend
source .venv/bin/activate
python manage.py test ledger.tests.test_security
```

**What this suite covers:**
- Concurrent payout attempts with row-level locking
- Double-spend prevention under simultaneous requests
- Idempotency key deduplication with UNIQUE constraint enforcement
- Threading-based race condition scenarios

### Expected Output

```
test_concurrent_payouts (ledger.tests.test_security.TestConcurrentPayouts) ... ok
test_double_spending_blocked (ledger.tests.test_security.TestDoubleSpend) ... ok
test_idempotency_prevents_duplicates (ledger.tests.test_security.TestIdempotency) ... ok

Ran 3 tests in 0.234s

OK
```

---

## Project Structure

```
playtopay-ledger/
├── backend/                    # Django application
│   ├── ledger/                 
│   │   ├── models.py           # LedgerEntry, Merchant, Payout, IdempotencyKey
│   │   ├── views.py            # API endpoints
│   │   ├── services.py         # Locking and aggregation logic
│   │   ├── tasks.py            # Background job functions (django-q2)
│   │   └── tests/              # Test package
│   │       ├── __init__.py
│   │       └── test_security.py # Concurrency & idempotency threading tests
│   ├── manage.py               # Django CLI
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Environment config (optional)
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page routes
│   │   ├── hooks/              # Custom React hooks
│   │   └── App.jsx             # Root component
│   ├── package.json            # Node dependencies
│   └── vite.config.js          # Vite build config
│
└── README.md                   # This file
```

---

## Key Features

✅ **Double-Entry Ledger** — Every transaction is immutable and auditable  
✅ **Row-Level Locking** — Prevents race conditions at the database level  
✅ **Idempotency Keys** — Safe retries with no duplicate charges  
✅ **State Machine** — Enforces legal payout status transitions  
✅ **Async Processing** — Background queue for heavy workloads  
✅ **Comprehensive Tests** — Automated concurrency and idempotency checks with threading  

---

## Development Notes

### Environment Variables

Create a `.env` file in the `backend/` directory (optional):

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
```

Django will default to SQLite if no database configuration is provided. To use PostgreSQL in production, add:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/playtopay
```

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**Database Errors**
```bash
# Reset SQLite database (local development)
rm db.sqlite3
python manage.py migrate
python manage.py seed_merchants
```

---

## ⚠️ Live Demo: Render Free Tier

This project is hosted on **Render's Free Instance**. To save resources, the server automatically "spins down" after 15 minutes of inactivity.

### The "Cold Start"

If the app hasn't been visited recently, it may take **30–60 seconds to wake up**.

**What to expect:** You might see a "Backend Unavailable" message on the initial load. Please **wait about a minute and refresh the page**. Once the server is awake, the ledger and background workers will process requests instantly.

### Verification

You can verify the backend is active by visiting:
```
https://playtopay-backend.onrender.com/api/v1/dashboard/
```

If you see JSON data, the engine is fully operational.

---

## System Health

### Checking Background Worker Status

To verify the background worker is running, monitor any payout in the dashboard:

1. Initiate a test payout from the React frontend
2. Check the payout status in the ledger
3. **If status changes from `PENDING` → `PROCESSING` → `COMPLETED` within 60 seconds**, the worker is healthy
4. **If status stays `PENDING` for more than 60 seconds**, the worker process is still initializing (typical on cold start)

Once the server wakes up, payouts process in milliseconds.

---

## License

Proprietary — PlayToPay Financial Ledger System

---

## Support

For detailed architectural information, refer to [EXPLAINER.md](./EXPLAINER.md).