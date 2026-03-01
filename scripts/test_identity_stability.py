import requests
import json
import time
import os
import jwt
from datetime import datetime, timedelta

# Configuration
API_URL = "http://localhost:8001/api"
JWT_SECRET = "your-default-secret-key-change-it" # Fallback, will try to read from .env

def get_jwt_secret():
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                if line.startswith("JWT_SECRET="):
                    return line.split("=")[1].strip().strip('"')
    return JWT_SECRET

def create_dev_token():
    secret = get_jwt_secret()
    payload = {
        "sub": "dev_user",
        "exp": datetime.utcnow() + timedelta(days=1),
        "iat": datetime.utcnow(),
        "role": "admin"
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def test_identity_stability():
    token = create_dev_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n--- TEST: IDENTITY STABILITY & CHARACTER CONSISTENCY ---\n")
    
    # 1. Create a Characters Identity
    char_data = {
        "name": "Elena Vance",
        "description": "A focused investigative journalist, early 30s, sharp features, short dark hair, wearing a beige trench coat.",
        "project_id": "stability-test-001"
    }
    
    print(f"1. Creating character: {char_data['name']}...")
    create_res = requests.post(f"{API_URL}/identity", json=char_data, headers=headers)
    if create_res.status_code != 201:
        print(f"Failed to create identity: {create_res.status_code} - {create_res.text}")
        return
    
    identity = create_res.json()
    identity_id = identity['id']
    print(f"   SUCCESS: Identity ID = {identity_id}")
    
    # 2. Extract and Lock Visual Attributes
    extract_data = {
        "image_path": "assets/defaults/character_reference.jpg",
        "use_llm": True
    }
    
    print(f"\n2. Extracting & Locking Visual Identity (Identity Lock)...")
    extract_res = requests.post(f"{API_URL}/identity/{identity_id}/extract", json=extract_data, headers=headers)
    if extract_res.status_code != 200:
        if "No such file or directory" in extract_res.text:
             print(f"   Note: Extraction failed because image doesn't exist, but we proceed for demonstration.")
        else:
            print(f"Failed to extract/lock: {extract_res.status_code} - {extract_res.text}")
            # Proceed anyway if we want to test apply (though it might fail if locked bit is false)
    else:
        locked_identity = extract_res.json()
        print(f"   SUCCESS: Identity is now LOCKED.")
        print(f"   Detected Face: {locked_identity['visual_attributes'].get('face_shape', 'N/A')}")
    
    # 3. Generate Consistency Grid (3x3 Matrix)
    print(f"\n3. Generating Character Consistency Grid (3x3 Matrix)...")
    grid_data = {
        "characterId": identity_id,
        "characterName": char_data['name'],
        "gridSize": "3x3"
    }
    # Note: Using automation endpoints
    grid_res = requests.post(f"{API_URL}/character/grid/generate", json=grid_data, headers=headers)

    if grid_res.status_code != 200:
        print(f"   INFO: Consistency grid call failed (expected if ComfyUI not running): {grid_res.status_code}")
    else:
        grid_bundle = grid_res.json()
        print(f"   SUCCESS: Consistency Grid generated.")
        print(f"   Grid Path: {grid_bundle['grid_image_path']}")
    
    # 4. Apply Identity to a new Scene Prompt
    scene_data = {
        "scene_description": "Elena is sitting in a dark café, lit by a single desk lamp, looking at a classified file.",
        "scene_type": "medium_shot"
    }
    print(f"\n4. Applying Identity Lock to a new scene prompt...")
    
    # Try locking it manually if extraction failed
    requests.put(f"{API_URL}/identity/{identity_id}", json={"visual_attributes": {"face_shape": "oval", "extraction_confidence": 0.9}, "is_locked": True}, headers=headers)

    apply_res = requests.post(f"{API_URL}/identity/{identity_id}/apply", json=scene_data, headers=headers)
    
    if apply_res.status_code != 200:
        print(f"Failed to apply identity: {apply_res.status_code} - {apply_res.text}")
    else:
        final_prompt = apply_res.json()
        print(f"   SUCCESS: Prompt specialized for consistent character.")
        print(f"   RESULTING PROMPT:\n   {final_prompt['prompt']}")
    
    print("\n--- TEST COMPLETED ---\n")

if __name__ == "__main__":
    test_identity_stability()
