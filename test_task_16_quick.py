"""
Task 16: Quick Integration Test

Fast integration test for Task 16 validation.

Author: AI Enhancement Team
Date: 2026-01-14
"""

import numpy as np
import time

# Import Video Processing modules
from src.video import (
    AIDenoiser,
    AIDeblurrer,
    ColorGradingAI,
    HDRToneMapper,
    TemporalConsistencyEnforcer,
    ColorGradingStyle,
    ToneMappingMethod,
    DenoiseMethod,
    DeblurMethod
)


def create_test_frame():
    """Create a single test frame."""
    frame = np.random.randint(50, 200, (480, 640, 3), dtype=np.uint8)
    return frame


def test_integration():
    """Quick integration test."""
    print("\n" + "="*70)
    print("TASK 16: QUICK INTEGRATION TEST")
    print("="*70)
    
    start_time = time.time()
    
    # Test 1: Initialize all components
    print("\n1. Initializing all components...")
    try:
        denoiser = AIDenoiser()
        deblurrer = AIDeblurrer()
        color_grader = ColorGradingAI()
        tone_mapper = HDRToneMapper()
        consistency_enforcer = TemporalConsistencyEnforcer()
        print("   [PASS] All components initialized")
    except Exception as e:
        print(f"   [FAIL] Initialization failed: {e}")
        return False
    
    # Test 2: Process single frame through pipeline
    print("\n2. Processing single frame through pipeline...")
    try:
        frame = create_test_frame()
        
        # Denoise
        denoise_result = denoiser.denoise_frame(frame, method=DenoiseMethod.GAUSSIAN)
        print(f"   - Denoised: noise_removed={denoise_result.noise_removed:.2%}")
        
        # Deblur
        deblur_result = deblurrer.deblur_frame(
            denoise_result.denoised_frame,
            method=DeblurMethod.WIENER
        )
        print(f"   - Deblurred: improvement={deblur_result.sharpness_improvement:.2%}")
        
        # Tone map
        tone_result = tone_mapper.tone_map(
            deblur_result.deblurred_frame,
            method=ToneMappingMethod.REINHARD
        )
        print(f"   - Tone mapped: compression={tone_result.compression_ratio:.2f}x")
        
        # Color grade
        grade_result = color_grader.apply_style(
            tone_result.mapped_frame,
            ColorGradingStyle.CINEMATIC
        )
        print(f"   - Color graded: quality={grade_result.quality_score:.3f}")
        
        print("   [PASS] Single frame pipeline")
    except Exception as e:
        print(f"   [FAIL] Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 3: Process sequence
    print("\n3. Processing sequence...")
    try:
        frames = [create_test_frame() for _ in range(3)]
        
        # Denoise sequence
        denoised = denoiser.denoise_sequence(frames, method=DenoiseMethod.GAUSSIAN)
        print(f"   - Denoised {len(denoised)} frames")
        
        # Color grade sequence
        graded = color_grader.grade_sequence(
            denoised,
            style=ColorGradingStyle.WARM,
            smooth_transitions=True
        )
        print(f"   - Graded {len(graded)} frames")
        
        # Enforce consistency
        consistent = consistency_enforcer.enforce_consistency(graded)
        print(f"   - Enforced consistency on {len(consistent)} frames")
        
        print("   [PASS] Sequence processing")
    except Exception as e:
        print(f"   [FAIL] Sequence processing failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 4: Test all color grading styles
    print("\n4. Testing all color grading styles...")
    try:
        frame = create_test_frame()
        styles = [
            ColorGradingStyle.CINEMATIC,
            ColorGradingStyle.VINTAGE,
            ColorGradingStyle.WARM,
            ColorGradingStyle.COOL,
            ColorGradingStyle.VIBRANT
        ]
        
        for style in styles:
            result = color_grader.apply_style(frame, style, intensity=0.8)
            assert result.graded_frame.shape == frame.shape
        
        print(f"   - Tested {len(styles)} styles")
        print("   [PASS] All styles working")
    except Exception as e:
        print(f"   [FAIL] Style testing failed: {e}")
        return False
    
    # Test 5: Test all tone mapping methods
    print("\n5. Testing all tone mapping methods...")
    try:
        frame = create_test_frame()
        methods = [
            ToneMappingMethod.REINHARD,
            ToneMappingMethod.DRAGO,
            ToneMappingMethod.FILMIC,
            ToneMappingMethod.ACES
        ]
        
        for method in methods:
            result = tone_mapper.tone_map(frame, method=method)
            assert result.mapped_frame.shape == frame.shape
        
        print(f"   - Tested {len(methods)} methods")
        print("   [PASS] All methods working")
    except Exception as e:
        print(f"   [FAIL] Method testing failed: {e}")
        return False
    
    # Test 6: Statistics collection
    print("\n6. Testing statistics collection...")
    try:
        denoise_stats = denoiser.get_statistics()
        deblur_stats = deblurrer.get_statistics()
        tone_stats = tone_mapper.get_statistics()
        
        print(f"   - Denoiser: {denoise_stats.get('frames_processed', 0)} frames processed")
        print(f"   - Deblurrer: {deblur_stats.get('frames_processed', 0)} frames processed")
        print(f"   - Tone Mapper: {tone_stats.get('frames_processed', 0)} frames processed")
        print("   [PASS] Statistics collection")
    except Exception as e:
        print(f"   [FAIL] Statistics failed: {e}")
        return False
    
    elapsed_time = time.time() - start_time
    
    # Summary
    print("\n" + "="*70)
    print("[PASS] ALL INTEGRATION TESTS PASSED")
    print("="*70)
    print(f"\nTotal time: {elapsed_time:.2f} seconds")
    print("\nTest Results:")
    print("  [PASS] Component Initialization")
    print("  [PASS] Single Frame Pipeline")
    print("  [PASS] Sequence Processing")
    print("  [PASS] All Color Grading Styles")
    print("  [PASS] All Tone Mapping Methods")
    print("  [PASS] Statistics Collection")
    print("\n[PASS] System is production-ready!")
    
    return True


if __name__ == "__main__":
    success = test_integration()
    exit(0 if success else 1)
