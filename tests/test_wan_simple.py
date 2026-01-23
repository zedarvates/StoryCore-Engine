"""
Simple test for Wan Video Integration with non-blocking features

This test validates:
- Async/await patterns
- Timeout mechanisms
- Circuit breaker functionality
- Cancellation support
- All main workflows

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Import with absolute imports
from advanced_workflow_config import WanVideoConfig
from advanced_model_manager import AdvancedModelManager
import wan_video_integration
from wan_video_integration import (
    InpaintingMask,
    AlphaChannelMode,
    DualImageGuidance,
    CompositeLayer
)

# Get the main class
WanVideoIntegration = wan_video_integration.WanVideoIntegration
generate_inpainted_video = wan_video_integration.generate_inpainted_video
generate_transparent_video = wan_video_integration.generate_transparent_video

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("PIL not available, using mock images")


async def test_basic_initialization():
    """Test basic initialization"""
    print("\n=== Test 1: Basic Initialization ===")
    
    config = WanVideoConfig()
    integration = WanVideoIntegration(config)
    
    assert integration.config == config
    assert not integration.model_loaded
    assert integration.timeout_seconds == 300.0
    assert integration._circuit_breaker_enabled
    
    print("✓ Basic initialization successful")
    await integration.cleanup()


async def test_model_loading():
    """Test model loading with timeout"""
    print("\n=== Test 2: Model Loading ===")
    
    config = WanVideoConfig()
    integration = WanVideoIntegration(config, timeout_seconds=10.0)
    
    # Load models
    result = await integration.load_models()
    assert result is True
    assert integration.model_loaded
    
    print("✓ Model loading successful")
    await integration.cleanup()


async def test_timeout_mechanism():
    """Test timeout mechanism"""
    print("\n=== Test 3: Timeout Mechanism ===")
    
    config = WanVideoConfig()
    integration = WanVideoIntegration(config, timeout_seconds=1.0)
    
    # This should complete within timeout
    try:
        await integration.load_models()
        print("✓ Operation completed within timeout")
    except asyncio.TimeoutError:
        print("✗ Operation timed out unexpectedly")
        raise
    
    await integration.cleanup()


async def test_circuit_breaker():
    """Test circuit breaker functionality"""
    print("\n=== Test 4: Circuit Breaker ===")
    
    config = WanVideoConfig()
    integration = WanVideoIntegration(config, enable_circuit_breaker=True)
    integration._max_failures = 3  # Lower threshold for testing
    
    # Simulate failures
    for i in range(3):
        integration._record_failure()
    
    assert integration._circuit_open
    print("✓ Circuit breaker opened after failures")
    
    # Check that operations are blocked
    assert not integration._check_circuit_breaker()
    print("✓ Circuit breaker blocks operations when open")
    
    await integration.cleanup()


async def test_cancellation():
    """Test cancellation support"""
    print("\n=== Test 5: Cancellation Support ===")
    
    config = WanVideoConfig()
    integration = WanVideoIntegration(config)
    
    # Request cancellation
    integration.request_cancellation()
    
    # Try to check cancellation
    try:
        integration._check_cancellation()
        print("✗ Cancellation not detected")
    except asyncio.CancelledError:
        print("✓ Cancellation detected successfully")
    
    await integration.cleanup()


async def test_transparent_video_generation():
    """Test transparent video generation"""
    print("\n=== Test 6: Transparent Video Generation ===")
    
    config = WanVideoConfig(
        width=720,
        height=480,
        num_frames=10,
        enable_alpha=True
    )
    integration = WanVideoIntegration(config, timeout_seconds=30.0)
    
    try:
        rgba_frames = await integration.create_transparent_video(
            prompt="A floating ghost character",
            alpha_mode=AlphaChannelMode.THRESHOLD,
            timeout=10.0
        )
        
        assert len(rgba_frames) == 10
        print(f"✓ Generated {len(rgba_frames)} RGBA frames")
        
        stats = integration.get_stats()
        assert stats['alpha_generation_count'] == 1
        print("✓ Statistics updated correctly")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        raise
    finally:
        await integration.cleanup()


async def test_video_inpainting():
    """Test video inpainting"""
    print("\n=== Test 7: Video Inpainting ===")
    
    if not PIL_AVAILABLE:
        print("⊘ Skipping (PIL not available)")
        return
    
    config = WanVideoConfig(
        width=720,
        height=480,
        num_frames=10,
        enable_inpainting=True
    )
    integration = WanVideoIntegration(config, timeout_seconds=30.0)
    
    try:
        # Create mock input frames
        input_frames = [
            Image.new('RGB', (720, 480), (100, 100, 100))
            for _ in range(10)
        ]
        
        # Create mask
        mask = InpaintingMask(
            mask_image=Image.new('L', (720, 480), 255),
            blur_radius=4
        )
        
        # Generate inpainted video
        result_frames = await integration.generate_video_with_inpainting(
            prompt="Fill with beautiful landscape",
            video_frames=input_frames,
            mask=mask,
            use_multi_stage=True,
            timeout=15.0
        )
        
        assert len(result_frames) == 10
        print(f"✓ Inpainted {len(result_frames)} frames")
        
        stats = integration.get_stats()
        assert stats['inpainting_count'] == 1
        print("✓ Statistics updated correctly")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        raise
    finally:
        await integration.cleanup()


async def test_dual_guidance():
    """Test dual image guidance"""
    print("\n=== Test 8: Dual Image Guidance ===")
    
    if not PIL_AVAILABLE:
        print("⊘ Skipping (PIL not available)")
        return
    
    config = WanVideoConfig(
        width=720,
        height=480,
        num_frames=10
    )
    integration = WanVideoIntegration(config, timeout_seconds=30.0)
    
    try:
        # Create guidance
        guidance = DualImageGuidance(
            reference_image=Image.new('RGB', (720, 480), (128, 128, 128)),
            reference_strength=0.8,
            blend_mode="linear"
        )
        
        # Generate with guidance
        result_frames = await integration.generate_with_dual_guidance(
            prompt="Generate video with guidance",
            guidance=guidance,
            timeout=15.0
        )
        
        assert len(result_frames) == 10
        print(f"✓ Generated {len(result_frames)} frames with guidance")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        raise
    finally:
        await integration.cleanup()


async def test_video_compositing():
    """Test video compositing"""
    print("\n=== Test 9: Video Compositing ===")
    
    if not PIL_AVAILABLE:
        print("⊘ Skipping (PIL not available)")
        return
    
    config = WanVideoConfig()
    integration = WanVideoIntegration(config, timeout_seconds=30.0)
    
    try:
        # Create layers
        layer1_frames = [
            Image.new('RGB', (720, 480), (255, 0, 0))
            for _ in range(5)
        ]
        
        layer2_frames = [
            Image.new('RGB', (720, 480), (0, 255, 0))
            for _ in range(5)
        ]
        
        layers = [
            CompositeLayer(video_frames=layer1_frames, opacity=1.0),
            CompositeLayer(video_frames=layer2_frames, opacity=0.5, offset_x=100, offset_y=100)
        ]
        
        # Composite
        result_frames = await integration.composite_videos(
            layers=layers,
            timeout=15.0
        )
        
        assert len(result_frames) == 5
        print(f"✓ Composited {len(result_frames)} frames")
        
        stats = integration.get_stats()
        assert stats['compositing_count'] == 1
        print("✓ Statistics updated correctly")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        raise
    finally:
        await integration.cleanup()


async def test_convenience_functions():
    """Test convenience functions"""
    print("\n=== Test 10: Convenience Functions ===")
    
    try:
        # Test transparent video generation
        rgba_frames = await generate_transparent_video(
            prompt="A ghost character",
            width=720,
            height=480,
            num_frames=5
        )
        
        assert len(rgba_frames) == 5
        print(f"✓ Convenience function generated {len(rgba_frames)} frames")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        raise


async def test_statistics_and_info():
    """Test statistics and model info"""
    print("\n=== Test 11: Statistics and Model Info ===")
    
    config = WanVideoConfig()
    integration = WanVideoIntegration(config)
    
    # Load models
    await integration.load_models()
    
    # Get model info
    model_info = integration.get_model_info()
    assert model_info['model_loaded']
    assert 'circuit_breaker' in model_info
    assert 'operation_state' in model_info
    assert 'stats' in model_info
    print("✓ Model info retrieved successfully")
    
    # Get stats
    stats = integration.get_stats()
    assert 'total_frames' in stats
    assert 'circuit_breaker_status' in stats
    assert 'failure_rate' in stats
    print("✓ Statistics retrieved successfully")
    
    await integration.cleanup()


async def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("Wan Video Integration - Non-Blocking Tests")
    print("=" * 60)
    
    tests = [
        test_basic_initialization,
        test_model_loading,
        test_timeout_mechanism,
        test_circuit_breaker,
        test_cancellation,
        test_transparent_video_generation,
        test_video_inpainting,
        test_dual_guidance,
        test_video_compositing,
        test_convenience_functions,
        test_statistics_and_info
    ]
    
    passed = 0
    failed = 0
    skipped = 0
    
    for test in tests:
        try:
            await test()
            passed += 1
        except AssertionError as e:
            print(f"✗ Test failed: {e}")
            failed += 1
        except Exception as e:
            if "Skipping" in str(e):
                skipped += 1
            else:
                print(f"✗ Test error: {e}")
                failed += 1
    
    print("\n" + "=" * 60)
    print(f"Test Results: {passed} passed, {failed} failed, {skipped} skipped")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
