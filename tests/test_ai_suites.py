import asyncio
import logging
import sys
import os
from PIL import Image

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Force use of mock ComfyUI for tests
from backend.config import settings
settings.USE_MOCK_COMFYUI = True

from src.qwen_image_suite_integration import QwenImageSuiteIntegration, EditingMode, EditingQuality
from src.audio_processing.cinematic_audio_suite import CinematicAudioSuite

async def _test_image_suite():
    print("\n--- Testing Image Suite ---")

    suite = QwenImageSuiteIntegration()

    # Ensure test file exists with valid image data
    if os.path.exists("test_actor.png"):
        try:
            os.remove("test_actor.png")
        except:
            pass
            
    Image.new('RGB', (100, 100), color='red').save("test_actor.png")

    # Test Skin Enhance
    print("Testing Skin Enhance...")
    config = {"smoothing": 0.5, "preserve_texture": True}
    result = await suite.skin_enhance("test_actor.png", config)
    
    output_path = getattr(result, 'output_path', None)
    if not output_path and hasattr(result, 'metadata'):
        output_path = result.metadata.get('output_path')
        
    print(f"Skin Enhance Result: {'Success' if result.success else 'Failed'} - Path: {output_path}")
    assert result.success, f"Skin Enhance failed: {getattr(result, 'error_message', 'Unknown error')}"

    # Test AI Stylist
    print("Testing AI Stylist Suggestions...")
    # NOTE: The correct method name is ai_style_assist
    result = await suite.ai_style_assist("test_actor.png")
    print(f"Stylist Result: {'Success' if result.success else 'Failed'}")
    if result.success:
        print(f"Suggestions: {result.metadata.get('suggestions')}")
    assert result.success, f"AI Stylist failed: {getattr(result, 'error_message', 'Unknown error')}"

async def _test_audio_suite():
    print("\n--- Testing Audio Suite ---")
    suite = CinematicAudioSuite()

    # Ensure test file exists
    if not os.path.exists("cinematic_shot.mp4"):
        with open("cinematic_shot.mp4", "wb") as f:
            f.write(b"dummy_mp4_content")

    # Test SFX Generation
    print("Testing SFX Generation...")
    result = await suite.generate_sfx("Space laser blast", {"duration": 2.0})
    print(f"SFX Result: {'Success' if result.success else 'Failed'} - Path: {result.audio_path}")
    assert result.success, f"SFX Generation failed: {result.error_message}"

    # Test V2A Sync
    print("Testing V2A Sync...")
    result = await suite.sync_video_audio("cinematic_shot.mp4")
    print(f"V2A Result: {'Success' if result.success else 'Failed'} - Synced Path: {result.synchronized_audio_path}")
    assert result.success, f"V2A Sync failed: {result.error_message}"

def test_image_suite():
    asyncio.run(_test_image_suite())

def test_audio_suite():
    asyncio.run(_test_audio_suite())

if __name__ == "__main__":
    # Run tests if called directly
    test_image_suite()
    test_audio_suite()