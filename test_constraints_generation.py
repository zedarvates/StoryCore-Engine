#!/usr/bin/env python3
"""
Test constraint generation with llama3.1:8b
"""

import requests
import json

def test_constraints_generation():
    """Test constraint generation"""
    
    base_url = "http://localhost:11434"
    
    print("=" * 60)
    print("Testing Constraint Generation with llama3.1:8b")
    print("=" * 60)
    
    prompt = """Generate 3-5 project constraints for a story project with these characteristics:
- Project: Realms of Eternal Dawn
- Genre: Fantasy, Adventure
- Tone: Epic, Heroic
- Target Audience: general audience
- Duration: 27 seconds

For each constraint, provide:
1. Category (technical, creative, budget, or timeline)
2. The constraint itself (concise statement)
3. Impact (how this affects the project)

IMPORTANT: Respond ONLY with a valid JSON array.

Example format:
[
  {
    "category": "technical",
    "constraint": "Must be compatible with mobile devices",
    "impact": "Requires responsive design and optimized assets for smaller screens"
  }
]"""
    
    payload = {
        "model": "llama3.1:8b",
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 1000
        }
    }
    
    print(f"📤 Sending constraint generation request...")
    
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
                    print(f"   - Number of constraints: {len(parsed) if isinstance(parsed, list) else 1}")
                    
                    if isinstance(parsed, list):
                        for i, constraint in enumerate(parsed, 1):
                            print(f"\n   Constraint {i}:")
                            print(f"     - Category: {constraint.get('category', 'N/A')}")
                            print(f"     - Constraint: {constraint.get('constraint', 'N/A')}")
                            print(f"     - Impact: {constraint.get('impact', 'N/A')}")
                    else:
                        print(f"   - Category: {parsed.get('category', 'N/A')}")
                        print(f"   - Constraint: {parsed.get('constraint', 'N/A')}")
                        print(f"   - Impact: {parsed.get('impact', 'N/A')}")
                    
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
    success = test_constraints_generation()
    print("\n" + "=" * 60)
    if success:
        print("✅ Constraint generation is working correctly!")
    else:
        print("❌ Constraint generation still has issues")
    print("=" * 60)
