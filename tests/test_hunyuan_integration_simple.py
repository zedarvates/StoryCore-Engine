#!/usr/bin/env python3
"""
Simple test for HunyuanVideo Integration

This test validates the basic functionality of HunyuanVideoIntegration.
"""

import asyncio
import sys
from pathlib import Path
from PIL import Image

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from hunyuan_video_integration import (
    HunyuanVideoIntegration,
    VideoGenerationRequest,
    VideoGenerationResult,
    HunyuanWorkflowType
)

try:
    from advanced_workflow_config import HunyuanVideoConfig
except ImportError:
    # Fallback config if not available
    from dataclasses import dataclass
    @dataclass
    class HunyuanVideoConfig:
        model_path: str = "models/hunyuan_video_i2v.safetensors"
        upscale_model: str = "models/hunyuan_video_sr.safetensors"
        clip_vision_path: str = "models/clip_vision_h.safetensors"
        width: int = 720
        height: int = 480
        num_frames: int = 121
        steps: int = 50


async def test_hunyuan_video_integration():
    """Test the HunyuanVideoIntegration class"""
    print("🧪 Testing HunyuanVideoIntegration...")
    
    # Create integration with default config
    config = HunyuanVideoConfig()
    integration = HunyuanVideoIntegration(config)
    
    # Test integration properties
    assert integration is not None
    print("✅ Integration initialization successful")
    
    # Test T2V request
    print("🎬 Testing T2V request...")
    t2v_request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="A beautiful sunset over mountains",
        num_frames=10,  # Small for quick test
        width=256,
        height=256
    )
    
    t2v_result = await integration.generate_video(t2v_request)
    assert t2v_result.success, f"T2V generation failed: {t2v_result.error_message}"
    assert len(t2v_result.frames) == 10
    print(f"✅ T2V generation successful ({len(t2v_result.frames)} frames)")
    
    # Test I2V request
    print("🎬 Testing I2V request...")
    test_image = Image.new('RGB', (256, 256), color='red')
    i2v_request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.IMAGE_TO_VIDEO,
        prompt="Transform this image into a dynamic video",
        conditioning_image=test_image,
        num_frames=10,
        width=256,
        height=256
    )
    
    i2v_result = await integration.generate_video(i2v_request)
    assert i2v_result.success, f"I2V generation failed: {i2v_result.error_message}"
    assert len(i2v_result.frames) == 10
    print(f"✅ I2V generation successful ({len(i2v_result.frames)} frames)")
    
    # Test stats
    stats = integration.get_stats()
    assert stats['t2v_count'] == 1
    assert stats['i2v_count'] == 1
    print("✅ Stats collection working")
    
    # Test cache clear
    integration.clear_cache()
    assert len(integration.frame_cache) == 0
    print("✅ Cache clear working")
    
    # Cleanup
    await integration.cleanup()
    print("✅ Cleanup successful")
    
    print("🎉 All HunyuanVideo integration tests passed!")
    return True


async def test_error_handling():
    """Test error handling"""
    print("\n🚨 Testing error handling...")
    
    config = HunyuanVideoConfig()
    integration = HunyuanVideoIntegration(config)
    
    # Test invalid request (empty prompt)
    invalid_request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="",  # Empty prompt should fail validation
        num_frames=10
    )
    
    result = await integration.generate_video(invalid_request)
    assert not result.success
    assert "Prompt cannot be empty" in result.error_message
    print("✅ Empty prompt validation working")
    
    # Test I2V without image
    i2v_no_image = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.IMAGE_TO_VIDEO,
        prompt="Test I2V",
        conditioning_image=None,  # Missing image
        num_frames=10
    )
    
    result = await integration.generate_video(i2v_no_image)
    assert not result.success
    assert "Conditioning image required" in result.error_message
    print("✅ Missing image validation working")
    
    await integration.cleanup()
    print("🎉 Error handling tests passed!")
    return True


async def main():
    """Run all tests"""
    print("🚀 Starting HunyuanVideo Integration Tests")
    print("=" * 60)
    
    try:
        await test_hunyuan_video_integration()
        await test_error_handling()
        
        print("\n" + "=" * 60)
        print("🎯 All tests passed!")
        print("=" * 60)
        return True
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)