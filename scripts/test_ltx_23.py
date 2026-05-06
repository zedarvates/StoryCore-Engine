"""
Test Script for LTX 2.3 Video Generation in StoryCore-Engine

This script validates the connection between the Backend and ComfyUI,
and attempts to generate a 5-second video clip with native audio.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.ltx_service import LTXVideoService, LTXGenerationConfig, LTXAspectRatio
from backend.config import settings


async def test_ltx_generation():
    print("--- 🎬 StoryCore-Engine: LTX 2.3 Test Suite ---")

    # Check ComfyUI URL
    comfy_url = settings.COMFYUI_BASE_URL
    print(f"📡 ComfyUI Base URL: {comfy_url}")

    # Initialize Service
    service = LTXVideoService()

    # Define Test Configuration
    # We'll use a cinematic landscape prompt with specific audio request
    config = LTXGenerationConfig(
        prompt="Cinematic shot of a neo-noir rainy street in Tokyo, neon lights reflecting on puddles, slow camera dolly in, 8k, highly detailed",
        negative_prompt="blurry, low quality, static, cartoon, 3d render",
        aspect_ratio=LTXAspectRatio.HORIZONTAL,
        duration=5.0,
        audio_enabled=True,
        audio_prompt="Soft jazz music playing in the distance, heavy rain falling on the pavement, city atmosphere",
        steps=20,
        cfg=3.5,
    )

    print(f"📝 Testing Prompt: '{config.prompt}'")
    print(f"🎵 Audio Prompt: '{config.audio_prompt}'")

    # Run Generation
    try:
        print("🚀 Submitting job to LTX 2.3 engine... (this may take a few minutes)")

        # We'll use a temporary output path for testing
        test_output = Path(settings.OUTPUT_FOLDER) / "test_ltx_23.mp4"

        result = await service.generate_video(config, str(test_output))

        if result["status"] == "completed":
            print(f"✅ SUCCESS! Video generated at: {result['output_path']}")
            print(f"📄 Job Details: {result['job_id']}")
        else:
            print(f"❌ FAILED: {result.get('error', 'Unknown error')}")

    except Exception as e:
        print(f"💥 Exception occurred during test: {e}")


if __name__ == "__main__":
    if settings.USE_MOCK_COMFYUI:
        print(
            "⚠️ NOTE: Running in MOCK mode (no real generation). Set USE_MOCK_COMFYUI=False in .env for real test."
        )

    asyncio.run(test_ltx_generation())
