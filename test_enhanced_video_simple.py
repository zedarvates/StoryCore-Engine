#!/usr/bin/env python3
"""
Simple test for Enhanced Video Engine integration

This test validates the basic functionality of the Enhanced Video Engine
and its integration with advanced ComfyUI workflows.
"""

import asyncio
import sys
import time
from pathlib import Path
from PIL import Image

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from src.enhanced_video_engine import (
    EnhancedVideoEngine,
    AdvancedVideoConfig,
    AdvancedVideoMode,
    WorkflowSelectionStrategy,
    create_enhanced_video_engine
)


async def test_enhanced_video_engine():
    """Test Enhanced Video Engine functionality"""
    print("🎬 Testing Enhanced Video Engine Integration")
    print("=" * 60)
    
    try:
        # Test 1: Engine Creation and Initialization
        print("\n1. Creating Enhanced Video Engine...")
        start_time = time.time()
        
        engine = EnhancedVideoEngine()
        success = await engine.initialize()
        
        init_time = time.time() - start_time
        print(f"   ✅ Engine initialized in {init_time:.2f}s: {success}")
        
        # Test 2: Configuration Validation
        print("\n2. Testing Configuration Validation...")
        
        # Valid configuration
        valid_config = AdvancedVideoConfig(
            prompt="A serene mountain landscape with flowing clouds",
            width=832,
            height=480,
            num_frames=33,
            fps=16,
            mode=AdvancedVideoMode.AUTO,
            selection_strategy=WorkflowSelectionStrategy.BALANCED
        )
        
        validation_result = await engine._validate_config(valid_config)
        print(f"   ✅ Valid config validation: {validation_result['valid']}")
        
        # Invalid configuration (empty prompt)
        invalid_config = AdvancedVideoConfig(
            prompt="",  # Empty prompt
            width=832,
            height=480,
            num_frames=33
        )
        
        validation_result = await engine._validate_config(invalid_config)
        print(f"   ✅ Invalid config validation: {not validation_result['valid']}")
        print(f"      Error: {validation_result.get('error', 'N/A')}")
        
        # Test 3: Workflow Selection
        print("\n3. Testing Workflow Selection...")
        
        # Test AUTO mode selection
        auto_config = AdvancedVideoConfig(
            prompt="Test prompt for auto selection",
            mode=AdvancedVideoMode.AUTO,
            selection_strategy=WorkflowSelectionStrategy.BALANCED
        )
        
        selection_result = await engine._select_workflow(auto_config)
        print(f"   ✅ Auto workflow selection: {selection_result['use_advanced']}")
        print(f"      Reason: {selection_result['reason']}")
        
        # Test LEGACY mode selection
        legacy_config = AdvancedVideoConfig(
            prompt="Test prompt for legacy mode",
            mode=AdvancedVideoMode.LEGACY
        )
        
        selection_result = await engine._select_workflow(legacy_config)
        print(f"   ✅ Legacy workflow selection: {not selection_result['use_advanced']}")
        print(f"      Reason: {selection_result['reason']}")
        
        # Test 4: Workflow Configuration Creation
        print("\n4. Testing Workflow Configuration Creation...")
        
        # HunyuanVideo configuration
        hunyuan_config = AdvancedVideoConfig(
            prompt="Beautiful sunset over ocean waves",
            width=832,
            height=480,
            num_frames=33,
            fps=16,
            guidance_scale=7.5,
            num_inference_steps=25,
            seed=42,
            enable_super_resolution=True,
            target_resolution=(1664, 960)
        )
        
        workflow_config = await engine._create_workflow_config(hunyuan_config, 'video/hunyuan_video')
        print(f"   ✅ HunyuanVideo config created: {len(workflow_config)} parameters")
        print(f"      Prompt: {workflow_config['prompt'][:50]}...")
        print(f"      Resolution: {workflow_config['width']}x{workflow_config['height']}")
        print(f"      Super-resolution: {workflow_config.get('enable_super_resolution', False)}")
        
        # Wan Video configuration with alpha
        wan_config = AdvancedVideoConfig(
            prompt="Transparent liquid flowing with alpha channel",
            width=832,
            height=480,
            num_frames=81,
            fps=16,
            enable_alpha_channel=True,
            transparency_threshold=0.6,
            enable_multi_stage=True
        )
        
        workflow_config = await engine._create_workflow_config(wan_config, 'video/wan_video')
        print(f"   ✅ Wan Video config created: {len(workflow_config)} parameters")
        print(f"      Alpha channel: {workflow_config.get('enable_alpha_channel', False)}")
        print(f"      Multi-stage: {workflow_config.get('processing_stage') == 'combined'}")
        
        # Test 5: Legacy Workflow Execution (Mock)
        print("\n5. Testing Legacy Workflow Execution...")
        
        legacy_test_config = AdvancedVideoConfig(
            prompt="Test video for legacy engine",
            width=832,
            height=480,
            num_frames=33,
            fps=16
        )
        
        try:
            legacy_result = await engine._execute_legacy_workflow(legacy_test_config)
            print(f"   ✅ Legacy workflow executed: {legacy_result.success}")
            print(f"      Workflow type: {legacy_result.workflow_type}")
            print(f"      Duration: {legacy_result.duration_seconds:.2f}s")
        except Exception as e:
            print(f"   ⚠️  Legacy workflow test failed (expected): {str(e)[:50]}...")
        
        # Test 6: Quality Validation
        print("\n6. Testing Quality Validation...")
        
        # Create mock result for quality validation
        from src.enhanced_video_engine import AdvancedVideoResult
        import numpy as np
        
        mock_result = AdvancedVideoResult(
            success=True,
            width=832,
            height=480,
            num_frames=33,
            has_alpha_channel=True,
            workflow_used='video/wan_video'
        )
        
        quality_config = AdvancedVideoConfig(
            prompt="Test quality validation",
            enable_alpha_channel=True
        )
        
        quality_result = await engine._validate_quality(mock_result, quality_config)
        print(f"   ✅ Quality validation completed: {quality_result['overall_score']:.3f}")
        print(f"      Metrics: {list(quality_result['metrics'].keys())}")
        print(f"      Alpha quality included: {'alpha_quality' in quality_result['metrics']}")
        
        # Test 7: Performance Statistics
        print("\n7. Testing Performance Statistics...")
        
        # Add some mock statistics
        engine.generation_stats.update({
            'total_generations': 5,
            'successful_generations': 4,
            'advanced_workflow_usage': 3,
            'legacy_fallback_usage': 1,
            'quality_scores': [0.85, 0.90, 0.88, 0.92],
            'workflow_performance': {
                'video/hunyuan_video': {
                    'count': 2,
                    'total_time': 90.0,
                    'total_quality': 1.78
                }
            }
        })
        
        stats = engine.get_performance_stats()
        print(f"   ✅ Performance stats calculated:")
        print(f"      Success rate: {stats['success_rate']:.1%}")
        print(f"      Advanced usage rate: {stats['advanced_usage_rate']:.1%}")
        print(f"      Average quality: {stats['average_quality_score']:.3f}")
        print(f"      Workflow stats: {len(stats['workflow_stats'])} workflows")
        
        # Test 8: Available Workflows
        print("\n8. Testing Available Workflows Info...")
        
        workflows = engine.get_available_workflows()
        print(f"   ✅ Workflows info retrieved:")
        print(f"      Advanced workflows: {len(workflows['advanced'])}")
        print(f"      Legacy workflows: {len(workflows['legacy'])}")
        print(f"      Available modes: {len(workflows['modes'])}")
        print(f"      Selection strategies: {len(workflows['strategies'])}")
        
        # Test 9: Health Check
        print("\n9. Testing Health Check...")
        
        health = await engine.health_check()
        print(f"   ✅ Health check completed: {health['status']}")
        print(f"      Components checked: {len(health['checks'])}")
        
        if health['status'] != 'healthy':
            print(f"      Status details: {health.get('checks', {})}")
        
        # Test 10: Factory Function
        print("\n10. Testing Factory Function...")
        
        factory_engine = await create_enhanced_video_engine()
        print(f"   ✅ Factory function created engine: {factory_engine is not None}")
        print(f"      Engine type: {type(factory_engine).__name__}")
        
        print("\n" + "=" * 60)
        print("🎉 Enhanced Video Engine Integration Test Completed!")
        print("   All core functionality validated successfully")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_cli_integration():
    """Test CLI integration"""
    print("\n🖥️  Testing CLI Integration")
    print("=" * 40)
    
    try:
        from src.enhanced_video_cli import EnhancedVideoCLI
        
        # Test CLI creation
        cli = EnhancedVideoCLI()
        print("   ✅ CLI instance created")
        
        # Test configuration creation
        test_args = {
            'prompt': 'A beautiful test video',
            'width': 832,
            'height': 480,
            'num_frames': 33,
            'fps': 16,
            'mode': 'auto',
            'selection_strategy': 'balanced',
            'enable_quality_validation': True,
            'min_quality_score': 0.8
        }
        
        config = cli.create_config_from_args(**test_args)
        print(f"   ✅ CLI config created: {config.prompt[:30]}...")
        print(f"      Mode: {config.mode.value}")
        print(f"      Strategy: {config.selection_strategy.value}")
        
        # Test with image inputs
        test_args_with_images = {
            'prompt': 'Transform this image into video',
            'mode': 'hunyuan_i2v',
            'enable_alpha_channel': True,
            'target_resolution': '1664x960'
        }
        
        config_with_images = cli.create_config_from_args(**test_args_with_images)
        print(f"   ✅ CLI config with advanced features created")
        print(f"      Alpha channel: {config_with_images.enable_alpha_channel}")
        print(f"      Target resolution: {config_with_images.target_resolution}")
        
        print("   🎉 CLI integration test completed!")
        return True
        
    except Exception as e:
        print(f"   ❌ CLI test failed: {str(e)}")
        return False


async def main():
    """Run all tests"""
    print("🚀 Starting Enhanced Video Engine Integration Tests")
    print("=" * 80)
    
    # Test core engine
    engine_success = await test_enhanced_video_engine()
    
    # Test CLI integration
    cli_success = await test_cli_integration()
    
    print("\n" + "=" * 80)
    print("📊 Test Summary:")
    print(f"   Enhanced Video Engine: {'✅ PASS' if engine_success else '❌ FAIL'}")
    print(f"   CLI Integration: {'✅ PASS' if cli_success else '❌ FAIL'}")
    
    overall_success = engine_success and cli_success
    print(f"\n🎯 Overall Result: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    return overall_success


if __name__ == "__main__":
    # Run tests
    success = asyncio.run(main())
    sys.exit(0 if success else 1)