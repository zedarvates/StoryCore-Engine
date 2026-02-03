#!/usr/bin/env python3
"""
Test the LLM response parser logic
"""

import json
import re

response = """Here are the 5 project constraints for Realms of Eternal Dawn:

[
  {
    "category": "creative",
    "constraint": "The narrative must focus on a single hero's journey",
    "impact": "Limits character development and potential plot twists, prioritizing the protagonist's arc"
  },
  {
    "category": "timeline",
    "constraint": "All visual effects must be pre-rendered, no real-time rendering allowed",
    "impact": "Requires extensive pre-production planning and asset creation to meet tight deadline"
  },
  {
    "category": "budget",
    "constraint": "Voice acting budget is capped at $5,000",
    "impact": "May require creative choices on voice actor selection or script rewrites to accommodate budget constraints"
  },
  {
    "category": "technical",
    "constraint": "Must be exported in 4K resolution",
    "impact": "Increases file size and requires more powerful hardware for rendering and playback"
  },
  {
    "category": "creative",
    "constraint": "The story must include a climactic battle sequence",
    "impact": "Requires careful choreography and planning to ensure epic scope and impact within the 27-second time limit"
  }
]"""

print("Testing JSON extraction from response with text prefix...")
print("=" * 60)

# Try to find JSON array or object
trimmed = response.strip()
jsonMatch = re.search(r'(\[[\s\S]*\]|\{[\s\S]*\})', trimmed)

if jsonMatch:
    print("✅ Found JSON match!")
    json_str = jsonMatch.group(0)
    print(f"JSON string length: {len(json_str)}")
    
    try:
        parsed = json.loads(json_str)
        print(f"✅ Successfully parsed JSON!")
        print(f"   - Type: {type(parsed)}")
        print(f"   - Length: {len(parsed) if isinstance(parsed, list) else 'N/A'}")
        
        if isinstance(parsed, list):
            print(f"\n✅ Extracted {len(parsed)} constraints:")
            for i, item in enumerate(parsed, 1):
                print(f"\n   Constraint {i}:")
                print(f"     - Category: {item.get('category', 'N/A')}")
                print(f"     - Constraint: {item.get('constraint', 'N/A')[:50]}...")
                print(f"     - Impact: {item.get('impact', 'N/A')[:50]}...")
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing failed: {e}")
else:
    print("❌ No JSON found in response")
