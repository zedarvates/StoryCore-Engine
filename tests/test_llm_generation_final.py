#!/usr/bin/env python3
"""
Final test of LLM generation with the fixed model selection
"""

import requests
import json

def test_with_llama():
    """Test with llama3.1:8b (the new default)"""
    
    base_url = "http://localhost:11434"
    
    print("=" * 60)
    print("Testing LLM Generation with llama3.1:8b")
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
        "model": "llama3.1:8b",
        "prompt": json_prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 500
        }
    }
    
    print(f"📤 Sending request to llama3.1:8b...")
    
    try:
        response = requests.post(
            f"{base_url}/api/generate",
            json=payload,
            timeout=60
        )
        
        if response.ok:
            data = response.json()
            response_text = data.get('response', '')
            
            print(f"✅ Response received:")
            print(f"   - response length: {len(response_text)}")
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
                    return True
                except json.JSONDecodeError as e:
                    print(f"\n⚠️  Could not parse as JSON: {e}")
                    return False
            else:
                print("⚠️  Response field is empty!")
                return False
        else:
            print(f"❌ Error response: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    success = test_with_llama()
    print("\n" + "=" * 60)
    if success:
        print("✅ LLM generation is working correctly!")
    else:
        print("❌ LLM generation still has issues")
    print("=" * 60)
