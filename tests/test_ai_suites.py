
import asyncio
import logging
import sys
import os

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.qwen_image_suite_integration import QwenImageSuiteIntegration, EditingMode, EditingQuality
from src.audio_processing.cinematic_audio_suite import CinematicAudioSuite

async def test_image_suite():
    print("\n--- Testing Image Suite ---")
    suite = QwenImageSuiteIntegration()
    
    # Test Skin Enhance
    print("Testing Skin Enhance...")
    # config is a dict now in skin_enhance
    config = {"smoothing": 0.5, "preserve_texture": True}
    result = await suite.skin_enhance("test_actor.png", config)
    print(f"Skin Enhance Result: {'Success' if result.success else 'Failed'} - Path: {result.output_path if hasattr(result, 'output_path') else result.metadata.get('output_path')}")
    
    # Test AI Stylist
    print("Testing AI Stylist Suggestions...")
    result = await suite.ai_stylist_suggest("test_actor.png")
    print(f"Stylist Result: {'Success' if result.success else 'Failed'}")
    if result.success:
        print(f"Suggestions: {result.metadata.get('suggestions')}")

async def test_audio_suite():
    print("\n--- Testing Audio Suite ---")
    suite = CinematicAudioSuite()
    
    # Test SFX Generation
    print("Testing SFX Generation...")
    result = await suite.generate_sfx("Space laser blast", {"duration": 2.0})
    print(f"SFX Result: {'Success' if result.success else 'Failed'} - Path: {result.audio_path}")
    
    # Test V2A Sync
    print("Testing V2A Sync...")
    result = await suite.sync_video_audio("cinematic_shot.mp4")
    print(f"V2A Result: {'Success' if result.success else 'Failed'} - Synced Path: {result.synchronized_audio_path}")

async def main():
    logging.basicConfig(level=logging.INFO)
    await test_image_suite()
    await test_audio_suite()
    print("\nTests completed!")

if __name__ == "__main__":
    asyncio.run(main())
