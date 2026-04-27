import grequests  # You may need to: pip install grequests
import uuid
import json

url = "http://localhost:8000/api/v1/payouts/"
# Using the same merchant ID we seeded
merchant_id = "00000000-0000-0000-0000-000000000001"

def hammer():
    print("🚀 Launching 20 simultaneous withdrawal requests...")
    
    # We create 20 UNIQUE requests (different idempotency keys)
    # If we used the same key, the backend would block them as duplicates.
    # Here we are testing if the database handles 20 DIFFERENT people 
    # trying to grab money at the exact same millisecond.
    requests = [
        grequests.post(
            url, 
            json={"amount_paise": 10000, "bank_account_id": f"STRESS-TEST-{i}"},
            headers={"Idempotency-Key": str(uuid.uuid4()), "Content-Type": "application/json"}
        ) for i in range(20)
    ]
    
    responses = grequests.map(requests)
    
    successes = [r for r in responses if r is not None and r.status_code == 201]
    print(f"✅ Successes: {len(successes)}")
    print(f"❌ Failures: {len(responses) - len(successes)}")

if __name__ == "__main__":
    hammer()