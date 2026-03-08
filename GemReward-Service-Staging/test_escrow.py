import requests
import json
import time

BASE_URL = "http://localhost:8001/v1/gems"
APP_ID = "b53a9f3f-28a0-49f5-aa01-6dae2c5faa46" # Same from seed_test

def check_balances():
    print("\n🔍 Balances:")
    for uid in ["user_rich", "user_worker"]:
        res = requests.get(f"{BASE_URL}/balance/{uid}")
        print(f"  {uid}: {res.json()['gem_balance']} Gems")

def test_escrow_flow():
    # 1. Reset user rich balance to 100 for clean test (via seed if needed, but let's assume it's there)
    # Actually seed_test should be re-run if we want fresh start
    
    # 2. PROPOSE Escrow: 50 gems for a rendering job
    payload = {
        "app_id": APP_ID,
        "sender_id": "user_rich",
        "receiver_id": "user_worker",
        "amount": 50,
        "reason": "rendering_ltx2_job_42"
    }
    
    print("\n📦 Creating Escrow: 50 gems from user_rich to user_worker...")
    res = requests.post(f"{BASE_URL}/escrow/create", json=payload)
    if res.status_code != 200:
        print(f"FAILED: {res.text}")
        return
    
    escrow_id = res.json()["escrow_id"]
    print(f"✅ Escrow Created! ID: {escrow_id}")
    check_balances() # user_rich should be 50, user_worker 30 (from previous test)

    # 3. RELEASE Escrow: Job finished!
    print(f"\n🚀 Releasing Escrow {escrow_id} (Job Complete)...")
    res = requests.post(f"{BASE_URL}/escrow/release/{escrow_id}")
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}")
    check_balances() # user_rich 50, user_worker 80

    # 4. TEST CANCEL (New Escrow)
    print("\n📦 Test Cancel Flow: Creating 20 gems escrow...")
    payload["amount"] = 20
    res = requests.post(f"{BASE_URL}/escrow/create", json=payload)
    escrow_id_2 = res.json()["escrow_id"]
    check_balances() # user_rich 30, user_worker 80
    
    print(f"\n❌ Cancelling Escrow {escrow_id_2} (Job Failed)...")
    res = requests.post(f"{BASE_URL}/escrow/cancel/{escrow_id_2}")
    print(f"Status: {res.status_code}")
    check_balances() # user_rich 50, user_worker 80

if __name__ == "__main__":
    # Ensure users exist (re-seed if necessary)
    # requests.post(...) 
    test_escrow_flow()
