import asyncio
import os
import sys
from pathlib import Path

# Force mock mode
os.environ["USE_MOCK_COMFYUI"] = "true"

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.kiwiedit_service import get_kiwiedit_service


async def test_kiwiedit():
    print("🎬 Testing Kiwiedit Semantic Editing...")
    service = get_kiwiedit_service()

    # Simulation d'un swap d'objet
    result = await service.edit_video(
        video_path="input/samples/duel.mp4",
        target_object="sword",
        action="swap",
        replacement="light saber",
    )

    print(f"Status: {result['status']}")
    print(f"Action: {result['action']} of {result['target']}")
    print(f"Output: {result['output_path']}")

    # Simulation d'une insertion
    print("\n📦 Testing Prop Insertion...")
    insert_result = await service.insert_prop(
        video_path="input/samples/office.mp4",
        prop_description="A golden trophy",
        position_hint="on the desk",
    )
    print(f"Status: {insert_result['status']}")
    print(f"Inserted: {insert_result['prop']}")
    print(f"Output: {insert_result['output_path']}")


if __name__ == "__main__":
    asyncio.run(test_kiwiedit())
