#!/usr/bin/env python3
"""
Direct test of Ollama API to diagnose the empty response issue
"""

import requests
import json
import sys

def test_ollama():
    """Test Ollama API directly"""
    
    base_url = "http://localhost:11434"
    
    # Test 1: Check if Ollama is running
    print("=" * 60)
    print("TEST 1: Checking if Ollama is running...")
    print("=" * 60)
    
    try:
        response = requests.get(f"{base_url}/api/tags", timeout=5)
        print(f"✅ Ollama is running (status: {response.status_code})")
        
        if response.ok:
            data = response.json()
            models = data.get('models', [])
            print(f"📦 Available models: {len(models)}")
            for model in models:
                print(f"  - {model.get('name', 'unknown')}")
    except Exception as e:
        print(f"❌ Ollama is not running or not accessible: {e}")
        return False
    
    # Test 2: Try to generate with a simple prompt
    print("\n" + "=" * 60)
    print("TEST 2: Testing generation with simple prompt...")
    print("=" * 60)
    
    payload = {
        "model": "qwen3-vl:4b",
        "prompt": "Say hello",
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 50
        }
    }
    
    print(f"📤 Sending payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{base_url}/api/generate",
            json=payload,
            timeout=30
        )
        
        print(f"📥 Response status: {response.status_code}")
        print(f"📥 Response headers: {dict(response.headers)}")
        
        if response.ok:
            data = response.json()
            print(f"✅ Response received:")
            print(f"   - response field: '{data.get('response', '')}'")
            print(f"   - response length: {len(data.get('response', ''))}")
            print(f"   - done: {data.get('done', False)}")
            print(f"   - Full response: {json.dumps(data, indent=2)}")
            
            if not data.get('response'):
                print("⚠️  WARNING: Response field is empty!")
        else:
            print(f"❌ Error response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False
    
    # Test 3: Try with JSON format prompt
    print("\n" + "=" * 60)
    print("TEST 3: Testing with JSON format prompt...")
    print("=" * 60)
    
    json_prompt = """Generate a creative project name and brief description for a story project.

Genre: Fantasy, Adventure
Tone: Epic, Heroic
Target Audience: general audience

RESPOND WITH ONLY THIS JSON FORMAT, NO OTHER TEXT:
{
  "projectName": "A memorable project name (2-4 words max)",
  "description": "A brief description (1-2 sentences max)"
}"""
    
    payload = {
        "model": "qwen3-vl:4b",
        "prompt": json_prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 200
        }
    }
    
    print(f"📤 Sending JSON format prompt...")
    
    try:
        response = requests.post(
            f"{base_url}/api/generate",
            json=payload,
            timeout=30
        )
        
        print(f"📥 Response status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            response_text = data.get('response', '')
            print(f"✅ Response received:")
            print(f"   - response: '{response_text}'")
            print(f"   - response length: {len(response_text)}")
            
            if response_text:
                print(f"\n📋 Full response text:")
                print(response_text)
            else:
                print("⚠️  WARNING: Response field is empty!")
        else:
            print(f"❌ Error response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All tests completed")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    success = test_ollama()
    sys.exit(0 if success else 1)
