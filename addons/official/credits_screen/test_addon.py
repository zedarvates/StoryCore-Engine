import asyncio
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.getcwd())

from addons.official.credits_screen.src.main import service, CreditsRequest


async def test_generation():
    print("Testing Credits Generation...")
    req = CreditsRequest(
        project_id="test_project",
        text="DIRECTED BY\nCline AI\n\nACTORS\nUser A\nUser B",
        duration=5,
        scroll_speed=100,
        final_thank_you=True,
        include_pegi=True,
        include_storycore=True,
        output_filename="test_credits.mp4",
    )

    result = await service.generate_credits_video(req)
    if result["success"]:
        print(f"SUCCESS: {result['video_path']}")
        if Path(result["video_path"]).exists():
            print("Video file created.")
        else:
            print("ERROR: Video file not found after generation.")
    else:
        print(f"FAILED: {result['error']}")


if __name__ == "__main__":
    asyncio.run(test_generation())
