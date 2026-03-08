import requests
import json

BASE_URL = "http://localhost:8001/v1/gems"
APP_ID = "b53a9f3f-28a0-49f5-aa01-6dae2c5faa46"

def test_transfer():
    payload = {
        "app_id": APP_ID,
        "from_user_id": "user_rich",
        "to_user_id": "user_worker",
        "amount": 30,
        "reason": "payment_for_ltx2_video"
    }
    
    print(f"🚀 Sending 30 gems from user_rich to user_worker...")
    response = requests.post(f"{BASE_URL}/transfer", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

    # Check Balances
    print("\n🔍 Checking balances...")
    for uid in ["user_rich", "user_worker"]:
        res = requests.get(f"{BASE_URL}/balance/{uid}")
        print(f"Wallet {uid}: {res.json()['gem_balance']} Gems (Tier: {res.json()['gem_tier']})")

if __name__ == "__main__":
    test_transfer()
