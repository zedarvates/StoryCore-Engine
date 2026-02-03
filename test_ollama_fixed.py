#!/usr/bin/env python3
"""
Test Ollama with higher token limits to account for thinking
"""

import requests
import json

def test_ollama_with_higher_tokens():
    """Test Ollama with higher token limits"""
    
    base_url = "http://localhost:11434"
    
    print("=" * 60)
    print("Testing with HIGHER token limit (500 tokens)...")
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
            "num_predict": 500  # Much higher to account for thinking
        }
    }
    
    print(f"📤 Sending request with num_predict=500...")
    
    try:
        response = requests.post(
            f"{base_url}/api/generate",
            json=payload,
            timeout=60
        )
        
        if response.ok:
            data = response.json()
            response_text = data.get('response', '')
            thinking_text = data.get('thinking', '')
            
            print(f"✅ Response received:")
            print(f"   - response length: {len(response_text)}")
            print(f"   - thinking length: {len(thinking_text)}")
            print(f"   - done_reason: {data.get('done_reason', 'unknown')}")
            
            if response_text:
                print(f"\n📋 Response text:")
                print(response_text)
                
                # Try to parse as JSON
                try:
                    parsed = json.loads(response_text)
                    print(f"\n✅ Successfully parsed as JSON:")
                    print(f"   - projectName: {parsed.get('projectName', 'N/A')}")
                    print(f"   - description: {parsed.get('description', 'N/A')}")
                except json.JSONDecodeError as e:
                    print(f"\n⚠️  Could not parse as JSON: {e}")
            else:
                print("⚠️  Response field is still empty!")
                if thinking_text:
                    print(f"\n💭 Thinking content (first 200 chars):")
                    print(thinking_text[:200])
        else:
            print(f"❌ Error response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_ollama_with_higher_tokens()
