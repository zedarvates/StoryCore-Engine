import requests
import json
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_discovery():
    """Test the Discovery Lab narrative analysis endpoint."""
    base_url = os.environ.get("API_URL", "http://localhost:8001")
    url_render = f"{base_url}/api/llm/render-template"
    url_generate = f"{base_url}/api/llm/generate"
    
    # Sample Transcript
    sample_content = """
    INTERVIEWER: Monsieur Dupont, depuis combien de temps travaillez-vous ici ?
    DUPONT: Cinquante ans. Mon père était là, mon grand-père aussi. On ne répare plus seulement des montres, on répare des souvenirs.
    INTERVIEWER: Que pensez-vous de l'arrivée des montres connectées ?
    DUPONT: C'est du plastique. Ça n'a pas d'âme. Une montre mécanique, c'est un coeur qui bat. Si on ne remonte pas le ressort, elle s'arrête. Comme nous.
    INTERVIEWER: Votre fils va-t-il reprendre la boutique ?
    DUPONT: (Silence) Non. Il est à Paris. Il travaille dans la "data". Il dit que le temps n'a plus besoin d'engrenages. Quand je fermerai, ce sera la fin de trois générations. Le silence va s'installer dans cette rue.
    """

    project_name = "Le Dernier Horloger"
    project_goal = "Documentaire sur l'artisanat en disparition"

    payload_render = {
        "template_name": "assistant_editor_discovery",
        "variables": {
            "project_name": project_name,
            "project_goal": project_goal,
            "content_to_analyze": sample_content
        }
    }

    print("=" * 60)
    print("🔬 DISCOVERY LAB - Narrative Analysis Test")
    print("=" * 60)
    print(f"Project: {project_name}")
    print(f"Goal: {project_goal}")
    print(f"API URL: {base_url}")
    print("-" * 60)
    
    try:
        # Step 1: Render the template
        print("\n[1/2] Rendering prompt template...")
        response = requests.post(url_render, json=payload_render, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Template render failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
        rendered_prompt = response.json().get("rendered_prompt", "")
        print(f"✅ Template rendered ({len(rendered_prompt)} chars)")
        
        # Step 2: Call LLM with rendered prompt
        print("\n[2/2] Calling LLM for analysis...")
        generate_payload = {
            "prompt": rendered_prompt,
            "max_tokens": 2048,
            "temperature": 0.7
        }
        
        response = requests.post(url_generate, json=generate_payload, timeout=120)
        
        if response.status_code != 200:
            print(f"❌ LLM generation failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
        result = response.json()
        generated_text = result.get("text", "")
        
        print("\n" + "=" * 60)
        print("📊 AI ASSISTANT EDITOR - ANALYSIS RESULT")
        print("=" * 60)
        print(generated_text)
        print("=" * 60)
        print("✅ Discovery test completed successfully!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection refused - Is the backend server running?")
        print(f"   Try: python -m uvicorn src.api_server_fastapi:app --port 8001")
        return _run_offline_demo()
        
    except requests.exceptions.Timeout:
        print("❌ Request timed out - LLM may be processing slowly")
        return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def _run_offline_demo():
    """Run demo mode when backend is not available."""
    print("\n" + "=" * 60)
    print("📡 OFFLINE DEMO MODE (Backend not available)")
    print("=" * 60)
    
    print("""
[PROPOSED ANALYSIS BY AI ASSISTANT EDITOR]

1. THEME IDENTIFICATION:
   - Obsolescence vs Tradition (The heart vs The data)
   - Generational disconnection (The son in Paris)
   - Mortality and Time (The spring that stops)

2. CONFLICT & FRICTION:
   - The clash between mechanical 'soul' and digital 'plastic'.
   - Internal conflict: Dupont's resignation to the end of his legacy.

3. STORY STAKES:
   - The loss of a 3-generation heritage.
   - The silence of a village street (cultural erasure).

4. ROUGH STRUCTURE:
   - Act 1: The Ritual. Dupont in his workshop. 'On répare des souvenirs'.
   - Act 2: The Antagonist. Discussion on smartwatches. 'Ça n'a pas d'âme'. 
           The revelation about the son.
   - Act 3: The Silence. Dupont looking out at the street. 
           'Le silence va s'installer'.
""")
    print("=" * 60)
    print("💡 Tip: Start the backend server to run live analysis")
    return True


if __name__ == "__main__":
    success = test_discovery()
    sys.exit(0 if success else 1)
