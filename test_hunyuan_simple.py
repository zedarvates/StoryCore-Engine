"""
Simple integration test for HunyuanVideo

This file provides quick validation of the HunyuanVideo integration
without requiring pytest or extensive setup.

Author: Kiro AI Assistant
Date: January 14, 2026
"""

import asyncio
import sys
from pathlib import Path
from PIL import Image
import numpy as np

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from hunyuan_video_integration import (
    HunyuanVideoIntegration,
    VideoGenerationRequest,
    HunyuanWorkflowType,
    generate_text_to_video,
    generate_image_to_video
)
from advanced_workflow_config import HunyuanVideoConfig


def create_test_image(width=720, height=480):
    """Create a test image"""
    arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    return Image.fromarray(arr)


async def test_text_to_video():
    """Test text-to-video generation"""
    print("\n" + "="*70)
    print("TEST 1: Text-to-Video Generation")
    print("="*70)
    
    try:
        config = HunyuanVideoConfig(
            width=720,
            height=480,
            num_frames=10,
            steps=20,
            enable_upscaling=False
        )
        
        integration = HunyuanVideoIntegration(config)
        
        request = VideoGenerationRequest(
            workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
            prompt="A beautiful sunset over the ocean with waves crashing",
            negative_prompt="blurry, low quality",
            seed=42,
            num_frames=10
        )
        
        print(f"Generating video from prompt: '{request.prompt[:50]}...'")
        result = await integration.generate_video(request)
        
        if result.success:
            print(f"✓ SUCCESS")
            print(f"  - Generated {result.num_frames} frames")
            print(f"  - Resolution: {result.resolution[0]}x{result.resolution[1]}")
            print(f"  - Quality score: {result.quality_score:.3f}")
            print(f"  - Temporal consistency: {result.temporal_consistency:.3f}")
            print(f"  - Sharpness: {result.sharpness_score:.3f}")
            print(f"  - Generation time: {result.generation_time:.2f}s")
        else:
            print(f"✗ FAILED: {result.error_message}")
            return False
        
        await integration.cleanup()
        return True
        
    except Exception as e:
        print(f"✗ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_image_to_video():
    """Test image-to-video generation"""
    print("\n" + "="*70)
    print("TEST 2: Image-to-Video Generation")
    print("="*70)
    
    try:
        config = HunyuanVideoConfig(
            width=720,
            height=480,
            num_frames=10,
            steps=20
        )
        
        integration = HunyuanVideoIntegration(config)
        
        # Create test image
        test_image = create_test_image()
        print(f"Created test image: {test_image.size}")
        
        request = VideoGenerationRequest(
            workflow_type=HunyuanWorkflowType.IMAGE_TO_VIDEO,
            prompt="Animate this image with gentle motion",
            conditioning_image=test_image,
            num_frames=10
        )
        
        print(f"Generating video from image and prompt...")
        result = await integration.generate_video(request)
        
        if result.success:
            print(f"✓ SUCCESS")
            print(f"  - Generated {result.num_frames} frames")
            print(f"  - Resolution: {result.resolution[0]}x{result.resolution[1]}")
            print(f"  - Quality score: {result.quality_score:.3f}")
            print(f"  - Generation time: {result.generation_time:.2f}s")
        else:
            print(f"✗ FAILED: {result.error_message}")
            return False
        
        await integration.cleanup()
        return True
        
    except Exception as e:
        print(f"✗ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_super_resolution():
    """Test super-resolution upscaling"""
    print("\n" + "="*70)
    print("TEST 3: Super-Resolution Upscaling")
    print("="*70)
    
    try:
        config = HunyuanVideoConfig(
            width=720,
            height=480,
            num_frames=5,
            steps=15,
            enable_upscaling=True,
            upscale_factor=1.5
        )
        
        integration = HunyuanVideoIntegration(config)
        
        request = VideoGenerationRequest(
            workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
            prompt="Test upscaling",
            num_frames=5,
            enable_upscaling=True,
            upscale_factor=1.5
        )
        
        print(f"Generating video with upscaling (factor: 1.5x)...")
        result = await integration.generate_video(request)
        
        if result.success:
            print(f"✓ SUCCESS")
            print(f"  - Original resolution: 720x480")
            print(f"  - Upscaled resolution: {result.resolution[0]}x{result.resolution[1]}")
            print(f"  - Expected: 1080x720")
            print(f"  - Match: {result.resolution == (1080, 720)}")
            print(f"  - Generation time: {result.generation_time:.2f}s")
        else:
            print(f"✗ FAILED: {result.error_message}")
            return False
        
        await integration.cleanup()
        return True
        
    except Exception as e:
        print(f"✗ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_caching():
    """Test frame caching"""
    print("\n" + "="*70)
    print("TEST 4: Frame Caching")
    print("="*70)
    
    try:
        config = HunyuanVideoConfig(num_frames=5, steps=10)
        integration = HunyuanVideoIntegration(config)
        
        request = VideoGenerationRequest(
            workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
            prompt="Test caching",
            seed=42,
            enable_caching=True,
            num_frames=5
        )
        
        # First generation
        print("First generation (no cache)...")
        result1 = await integration.generate_video(request)
        time1 = result1.generation_time
        
        # Second generation (should use cache)
        print("Second generation (with cache)...")
        result2 = await integration.generate_video(request)
        time2 = result2.generation_time
        
        if result1.success and result2.success:
            print(f"✓ SUCCESS")
            print(f"  - First generation: {time1:.3f}s")
            print(f"  - Second generation: {time2:.3f}s")
            print(f"  - Cache hits: {integration.generation_stats['cache_hits']}")
            print(f"  - Cache size: {len(integration.frame_cache)}")
        else:
            print(f"✗ FAILED")
            return False
        
        await integration.cleanup()
        return True
        
    except Exception as e:
        print(f"✗ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_statistics():
    """Test statistics tracking"""
    print("\n" + "="*70)
    print("TEST 5: Statistics Tracking")
    print("="*70)
    
    try:
        config = HunyuanVideoConfig(num_frames=5, steps=10)
        integration = HunyuanVideoIntegration(config)
        
        # Generate multiple videos
        for i in range(3):
            request = VideoGenerationRequest(
                workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
                prompt=f"Test video {i}",
                num_frames=5
            )
            await integration.generate_video(request)
        
        stats = integration.get_stats()
        
        print(f"✓ Statistics collected:")
        print(f"  - T2V count: {stats['t2v_count']}")
        print(f"  - I2V count: {stats['i2v_count']}")
        print(f"  - Total frames: {stats['total_frames']}")
        print(f"  - Total time: {stats['total_time']:.2f}s")
        print(f"  - Average FPS: {stats['avg_fps']:.1f}")
        print(f"  - Cache size: {stats['cache_size']}")
        
        await integration.cleanup()
        return True
        
    except Exception as e:
        print(f"✗ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_convenience_functions():
    """Test convenience functions"""
    print("\n" + "="*70)
    print("TEST 6: Convenience Functions")
    print("="*70)
    
    try:
        # Test T2V convenience function
        print("Testing generate_text_to_video()...")
        result1 = await generate_text_to_video(
            prompt="Test convenience T2V",
            num_frames=5,
            steps=10
        )
        
        if not result1.success:
            print(f"✗ T2V convenience function failed")
            return False
        
        print(f"✓ T2V convenience function: {result1.num_frames} frames")
        
        # Test I2V convenience function
        print("Testing generate_image_to_video()...")
        test_image = create_test_image()
        result2 = await generate_image_to_video(
            prompt="Test convenience I2V",
            image=test_image,
            num_frames=5,
            steps=10
        )
        
        if not result2.success:
            print(f"✗ I2V convenience function failed")
            return False
        
        print(f"✓ I2V convenience function: {result2.num_frames} frames")
        
        return True
        
    except Exception as e:
        print(f"✗ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False


async def run_all_tests():
    """Run all tests"""
    print("\n" + "="*70)
    print("HUNYUANVIDEO INTEGRATION - SIMPLE TEST SUITE")
    print("="*70)
    
    tests = [
        ("Text-to-Video", test_text_to_video),
        ("Image-to-Video", test_image_to_video),
        ("Super-Resolution", test_super_resolution),
        ("Caching", test_caching),
        ("Statistics", test_statistics),
        ("Convenience Functions", test_convenience_functions),
    ]
    
    results = []
    for name, test_func in tests:
        result = await test_func()
        results.append((name, result))
    
    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)
