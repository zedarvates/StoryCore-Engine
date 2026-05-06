import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent.parent))

from cinematic.cinematic_types import MOOD_VISUAL_MAP
from api.categories.prompt import PromptCategoryHandler
from api.config import APIConfig
from api.router import APIRouter
from api.models import RequestContext


def validate_visual_impact():
    print("=== Validation Visuelle StoryCore Cinematic Engine ===\n")

    # Mock dependencies
    config = APIConfig()
    router = APIRouter(config)
    handler = PromptCategoryHandler(config, router)
    context = RequestContext(request_id="test_validation", user="admin")

    test_cases = [
        {
            "narrative": "A lonely cyber-punk street with neon signs and rain puddles.",
            "mood": "kodak_vision3",
            "visual_style": "Cinematic Realism",
        },
        {
            "narrative": "An intense interrogation room with a single hanging bulb.",
            "mood": "bleach_bypass",
            "visual_style": "High Contrast",
        },
        {
            "narrative": "A sunset over a fantasy castle with dragons flying in the distance.",
            "mood": "chiaroscuro",
            "visual_style": "Epic Fantasy",
        },
    ]

    for i, test in enumerate(test_cases):
        print(f"Test Case {i + 1}:")
        print(f"  Narrative: {test['narrative']}")
        print(f"  Target Mood: {test['mood']}")

        params = {
            "narrative": test["narrative"],
            "mood": test["mood"],
            "visual_style": test["visual_style"],
        }

        response = handler.cinematic_enhance(params, context)

        if response.status == "success":
            enhanced = response.data["enhanced"]
            print("  Result: \033[92mSUCCESS\033[0m")
            print(f"  Enhanced Prompt: \n    {enhanced}\n")

            # Check for technical terms
            terms = MOOD_VISUAL_MAP.get(test["mood"], {})
            color_science = terms.get("color_science", "")
            lighting = terms.get("lighting", "")

            if color_science and color_science.lower() in enhanced.lower():
                print(f"  [PASS] Color Science '{color_science}' correctly injected.")
            else:
                print(f"  [FAIL] FAILED to inject Color Science '{color_science}'.")

            if lighting and lighting.lower() in enhanced.lower():
                print(f"  [PASS] Lighting '{lighting}' correctly injected.")
            else:
                print(f"  [FAIL] FAILED to inject Lighting '{lighting}'.")
        else:
            print(f"  Result: \033[91mFAILED\033[0m - {response.message}")
        print("-" * 50)


if __name__ == "__main__":
    validate_visual_impact()
