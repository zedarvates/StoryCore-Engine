#!/usr/bin/env python3
"""
Test different Ollama models to find one that works
"""

import requests
import json

def test_model(model_name, prompt, num_predict=500):
    """Test a specific model"""
    
    base_url = "http://localhost:11434"
    
    print(f"\n{'=' * 60}")
    print(f"Testing model: {model_name}")
    print(f"{'=' * 60}")
    
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": num_predict
        }
    }
    
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
                print(f"\n📋 Response (first 300 chars):")
                print(response_text[:300])
                return True
            else:
                print("⚠️  Response field is empty!")
                return False
        else:
            print(f"❌ Error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def main():
    """Test multiple models"""
    
    prompt = """Generate a creative project name and brief description for a story project.

Genre: Fantasy, Adventure
Tone: Epic, Heroic
Target Audience: general audience

RESPOND WITH ONLY THIS JSON FORMAT, NO OTHER TEXT:
{
  "projectName": "A memorable project name (2-4 words max)",
  "description": "A brief description (1-2 sentences max)"
}"""
    
    # Models to test (in order of preference)
    models_to_test = [
        "llama3.1:8b",
        "mistral:latest",
        "gemma3:4b",
        "gemma2:2b",
        "qwen2.5-coder:latest",
    ]
    
    print("Testing different models for JSON generation...")
    print(f"Prompt length: {len(prompt)} chars")
    
    working_models = []
    
    for model in models_to_test:
        if test_model(model, prompt):
            working_models.append(model)
    
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")
    print(f"Working models: {working_models if working_models else 'None found'}")
    
    if working_models:
        print(f"\n✅ Recommended model: {working_models[0]}")
    else:
        print("\n⚠️  No working models found. Try increasing num_predict or using a different model.")

if __name__ == "__main__":
    main()
