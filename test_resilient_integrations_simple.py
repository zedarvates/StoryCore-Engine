"""
Simple tests for resilient workflow integrations

Tests the error handling and resilience features integrated into
HunyuanVideo and Wan Video workflows.

Author: Kiro AI Assistant
Date: January 14, 2026
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from PIL import Image
import numpy as np

# Import resilient integrations
from hunyuan_video_integration_resilient import (
    ResilientHunyuanVideoIntegration,
    VideoGenerationRequest,
    HunyuanWorkflowType
)
from wan_video_integration_resilient import (
    ResilientWanVideoIntegration,
    AlphaChannelMode
)

# Import configurations
from advanced_workflow_config import HunyuanVideoConfig, WanVideoConfig


def print_test_header(test_name: str):
    """Print test header"""
    print(f"\n{'='*60}")
    print(f"Test: {test_name}")
    print(f"{'='*60}")


def print_test_result(success: bool, message: str = ""):
    """Print test result"""
    status = "✓ PASSED" if success else "✗ FAILED"
    print(f"{status}: {message}")


async def test_hunyuan_resilient_initialization():
    """Test 1: Resilient HunyuanVideo initialization"""
    print_test_header("Resilient HunyuanVideo Initialization")
    
    try:
        config = HunyuanVideoConfig(
            width=720,
            height=480,
            num_frames=121
        )
        
        integration = ResilientHunyuanVideoIntegration(config)
        
        # Check components initialized
        assert integration.base_integration is not None
        assert integration.error_system is not None
        assert integration.t2v_circuit is not None
        assert integration.i2v_circuit is not None
        assert integration.upscale_circuit is not None
        
        # Check fallback chains configured
        t2v_chain = integration.error_system.get_fallback_chain('hunyuan_t2v')
        assert len(t2v_chain.fallbacks) == 3
        
        i2v_chain = integration.error_system.get_fallback_chain('hunyuan_i2v')
        assert len(i2v_chain.fallbacks) == 3
        
        await integration.cleanup()
        
        print_test_result(True, "Initialization successful with all components")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def test_hunyuan_resilient_t2v_generation():
    """Test 2: Resilient T2V generation"""
    print_test_header("Resilient T2V Generation")
    
    try:
        config = HunyuanVideoConfig(
            width=720,
            height=480,
            num_frames=61  # Reduced for testing
        )
        
        integration = ResilientHunyuanVideoIntegration(config)
        
        request = VideoGenerationRequest(
            workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
            prompt="A beautiful sunset",
            width=720,
            height=480,
            num_frames=61,
            steps=20  # Reduced for testing
        )
        
        result = await integration.generate_video(request)
        
        # Check result
        assert result is not None
        assert result.success or len(result.warnings) > 0  # May use fallback
        
        # Check statistics
        stats = integration.get_statistics()
        assert stats['t2v_attempts'] == 1
        
        await integration.cleanup()
        
        print_test_result(True, f"Generated video with {len(result.frames)} frames")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def test_hunyuan_circuit_breaker():
    """Test 3: Circuit breaker functionality"""
    print_test_header("HunyuanVideo Circuit Breaker")
    
    try:
        config = HunyuanVideoConfig(width=720, height=480, num_frames=61)
        integration = ResilientHunyuanVideoIntegration(config)
        
        # Check circuit breaker state
        t2v_state = integration.t2v_circuit.get_state()
        assert t2v_state['state'] == 'closed'  # Should start closed
        
        # Check can execute
        assert integration.t2v_circuit.can_execute() == True
        
        await integration.cleanup()
        
        print_test_result(True, "Circuit breaker working correctly")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def test_hunyuan_system_health():
    """Test 4: System health monitoring"""
    print_test_header("HunyuanVideo System Health")
    
    try:
        config = HunyuanVideoConfig(width=720, height=480, num_frames=61)
        integration = ResilientHunyuanVideoIntegration(config)
        
        # Get system health
        health = integration.get_system_health()
        
        assert 'circuit_breakers' in health
        assert 'generation_stats' in health
        assert 'error_system_health' in health
        assert 'degradation_level' in health
        
        # Check circuit breakers
        assert 't2v' in health['circuit_breakers']
        assert 'i2v' in health['circuit_breakers']
        assert 'upscale' in health['circuit_breakers']
        
        await integration.cleanup()
        
        print_test_result(True, "System health monitoring working")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def test_wan_resilient_initialization():
    """Test 5: Resilient Wan Video initialization"""
    print_test_header("Resilient Wan Video Initialization")
    
    try:
        config = WanVideoConfig(
            width=720,
            height=480,
            num_frames=81,
            enable_inpainting=True,
            enable_alpha=True
        )
        
        integration = ResilientWanVideoIntegration(config)
        
        # Check components initialized
        assert integration.base_integration is not None
        assert integration.error_system is not None
        
        # Check fallback chains configured
        transparent_chain = integration.error_system.get_fallback_chain('wan_transparent')
        assert len(transparent_chain.fallbacks) == 3
        
        inpainting_chain = integration.error_system.get_fallback_chain('wan_inpainting')
        assert len(inpainting_chain.fallbacks) == 3
        
        await integration.cleanup()
        
        print_test_result(True, "Initialization successful with all components")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def test_wan_resilient_transparent_video():
    """Test 6: Resilient transparent video generation"""
    print_test_header("Resilient Transparent Video Generation")
    
    try:
        config = WanVideoConfig(
            width=720,
            height=480,
            num_frames=41,  # Reduced for testing
            enable_alpha=True
        )
        
        integration = ResilientWanVideoIntegration(config)
        
        rgba_frames = await integration.create_transparent_video(
            prompt="A floating ghost",
            alpha_mode=AlphaChannelMode.THRESHOLD
        )
        
        # Check result
        assert rgba_frames is not None
        assert len(rgba_frames) > 0
        
        # Check statistics
        stats = integration.get_statistics()
        assert stats['transparent_video_attempts'] == 1
        
        await integration.cleanup()
        
        print_test_result(True, f"Generated {len(rgba_frames)} RGBA frames")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def test_wan_resilient_inpainting():
    """Test 7: Resilient video inpainting"""
    print_test_header("Resilient Video Inpainting")
    
    try:
        config = WanVideoConfig(
            width=720,
            height=480,
            num_frames=41,
            enable_inpainting=True
        )
        
        integration = ResilientWanVideoIntegration(config)
        
        # Create mock input frames
        input_frames = [
            Image.new('RGB', (720, 480), (100, 100, 100))
            for _ in range(10)
        ]
        
        # Create mock mask
        mask = Image.new('L', (720, 480), 255)
        
        inpainted_frames = await integration.inpaint_video(
            prompt="Fill with landscape",
            video_frames=input_frames,
            mask=mask
        )
        
        # Check result
        assert inpainted_frames is not None
        assert len(inpainted_frames) > 0
        
        # Check statistics
        stats = integration.get_statistics()
        assert stats['inpainting_attempts'] == 1
        
        await integration.cleanup()
        
        print_test_result(True, f"Inpainted {len(inpainted_frames)} frames")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def test_wan_system_health():
    """Test 8: Wan Video system health"""
    print_test_header("Wan Video System Health")
    
    try:
        config = WanVideoConfig(width=720, height=480, num_frames=41)
        integration = ResilientWanVideoIntegration(config)
        
        # Get system health
        health = integration.get_system_health()
        
        assert 'base_integration' in health
        assert 'error_system' in health
        assert 'generation_stats' in health
        assert 'degradation_level' in health
        
        await integration.cleanup()
        
        print_test_result(True, "System health monitoring working")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def test_error_analytics():
    """Test 9: Error analytics integration"""
    print_test_header("Error Analytics Integration")
    
    try:
        config = HunyuanVideoConfig(width=720, height=480, num_frames=61)
        integration = ResilientHunyuanVideoIntegration(config)
        
        # Get error analytics
        error_analytics = integration.error_system.error_analytics
        
        # Check analytics methods available
        assert hasattr(error_analytics, 'get_error_rate')
        assert hasattr(error_analytics, 'get_most_common_errors')
        assert hasattr(error_analytics, 'generate_report')
        
        # Generate report
        report = error_analytics.generate_report()
        assert 'total_errors' in report
        assert 'error_rate_per_minute' in report
        
        await integration.cleanup()
        
        print_test_result(True, "Error analytics working")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def test_graceful_degradation():
    """Test 10: Graceful degradation"""
    print_test_header("Graceful Degradation")
    
    try:
        config = HunyuanVideoConfig(width=720, height=480, num_frames=61)
        integration = ResilientHunyuanVideoIntegration(config)
        
        # Get degradation system
        degradation = integration.error_system.graceful_degradation
        
        # Check initial level
        assert degradation.current_level == 'full'
        
        # Test degradation
        degradation.degrade("Test degradation")
        assert degradation.current_level == 'high'
        
        # Test parameter adjustment
        params = {'quality': 1.0, 'steps': 50}
        adjusted = degradation.adjust_parameters(params)
        assert adjusted['quality'] < params['quality']
        assert adjusted['steps'] < params['steps']
        
        # Test restoration
        degradation.restore()
        assert degradation.current_level == 'full'
        
        await integration.cleanup()
        
        print_test_result(True, "Graceful degradation working")
        return True
        
    except Exception as e:
        print_test_result(False, f"Error: {e}")
        return False


async def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("Resilient Integrations Test Suite")
    print("="*60)
    
    tests = [
        test_hunyuan_resilient_initialization,
        test_hunyuan_resilient_t2v_generation,
        test_hunyuan_circuit_breaker,
        test_hunyuan_system_health,
        test_wan_resilient_initialization,
        test_wan_resilient_transparent_video,
        test_wan_resilient_inpainting,
        test_wan_system_health,
        test_error_analytics,
        test_graceful_degradation
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"\n✗ Test failed with exception: {e}")
            results.append(False)
    
    # Print summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    print(f"Failed: {total - passed}/{total}")
    print(f"Success Rate: {passed/total*100:.1f}%")
    
    if passed == total:
        print("\n✓ All tests passed!")
    else:
        print(f"\n✗ {total - passed} test(s) failed")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
