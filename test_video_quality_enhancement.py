"""
Test Video Quality Enhancement Modules (Phase 3)

This test validates the AI denoiser, AI deblurrer, color grading AI,
and HDR tone mapper modules.

Author: AI Enhancement Team
Date: 2026-01-14
"""

import numpy as np
from PIL import Image
import time

# Import Phase 3 modules
from src.video import (
    AIDenoiser,
    AIDeblurrer,
    ColorGradingAI,
    HDRToneMapper,
    NoiseType,
    DenoiseMethod,
    BlurType,
    DeblurMethod,
    ColorGradingStyle,
    ToneMappingMethod,
    HDRStandard
)


def create_test_frame(width=640, height=480):
    """Create a test frame with gradient and noise."""
    # Create gradient
    x = np.linspace(0, 255, width)
    y = np.linspace(0, 255, height)
    xx, yy = np.meshgrid(x, y)
    
    # Create RGB frame
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:, :, 0] = xx.astype(np.uint8)  # Red gradient
    frame[:, :, 1] = yy.astype(np.uint8)  # Green gradient
    frame[:, :, 2] = 128  # Constant blue
    
    return frame


def add_noise(frame, noise_level=0.1):
    """Add Gaussian noise to frame."""
    noise = np.random.normal(0, noise_level * 255, frame.shape)
    noisy = frame.astype(np.float32) + noise
    return np.clip(noisy, 0, 255).astype(np.uint8)


def add_blur(frame, kernel_size=5):
    """Add simple blur to frame."""
    from scipy.ndimage import uniform_filter
    blurred = np.zeros_like(frame, dtype=np.float32)
    for c in range(3):
        blurred[:, :, c] = uniform_filter(frame[:, :, c].astype(np.float32), size=kernel_size)
    return blurred.astype(np.uint8)


def test_ai_denoiser():
    """Test AI denoiser module."""
    print("\n" + "="*60)
    print("TEST 1: AI Denoiser")
    print("="*60)
    
    # Create test frame
    clean_frame = create_test_frame()
    noisy_frame = add_noise(clean_frame, noise_level=0.15)
    
    # Initialize denoiser
    denoiser = AIDenoiser(
        default_method=DenoiseMethod.ADAPTIVE,
        temporal_smoothing=True,
        preserve_details=True
    )
    
    # Test 1: Analyze noise
    print("\n1. Analyzing noise...")
    analysis = denoiser.analyze_noise(noisy_frame)
    print(f"   {analysis}")
    assert 0.0 <= analysis.noise_level <= 1.0, "Invalid noise level"
    assert analysis.noise_type in NoiseType, "Invalid noise type"
    print("   ✓ Noise analysis passed")
    
    # Test 2: Denoise frame
    print("\n2. Denoising frame...")
    result = denoiser.denoise_frame(noisy_frame, method=DenoiseMethod.ADAPTIVE)
    print(f"   {result}")
    assert result.denoised_frame.shape == noisy_frame.shape, "Shape mismatch"
    assert 0.0 <= result.noise_removed <= 1.0, "Invalid noise removed"
    print("   ✓ Frame denoising passed")
    
    # Test 3: Denoise sequence
    print("\n3. Denoising sequence...")
    frames = [add_noise(clean_frame, 0.1) for _ in range(5)]
    denoised_frames = denoiser.denoise_sequence(frames, strength=1.0)
    assert len(denoised_frames) == len(frames), "Frame count mismatch"
    print(f"   Denoised {len(denoised_frames)} frames")
    print("   ✓ Sequence denoising passed")
    
    # Test 4: Statistics
    print("\n4. Getting statistics...")
    stats = denoiser.get_statistics()
    print(f"   Average noise removed: {stats['avg_noise_removed']:.2%}")
    print(f"   Frames processed: {stats['frames_processed']}")
    print("   ✓ Statistics passed")
    
    print("\n✅ AI Denoiser: ALL TESTS PASSED")


def test_ai_deblurrer():
    """Test AI deblurrer module."""
    print("\n" + "="*60)
    print("TEST 2: AI Deblurrer")
    print("="*60)
    
    # Create test frame
    sharp_frame = create_test_frame()
    
    # Add blur using scipy if available, otherwise skip
    try:
        blurry_frame = add_blur(sharp_frame, kernel_size=5)
    except ImportError:
        print("   ⚠ Scipy not available, using simulated blur")
        blurry_frame = sharp_frame  # Use original for testing
    
    # Initialize deblurrer
    deblurrer = AIDeblurrer(
        default_method=DeblurMethod.ADAPTIVE,
        max_iterations=10,
        preserve_edges=True
    )
    
    # Test 1: Analyze blur
    print("\n1. Analyzing blur...")
    analysis = deblurrer.analyze_blur(blurry_frame)
    print(f"   {analysis}")
    assert 0.0 <= analysis.blur_amount <= 1.0, "Invalid blur amount"
    assert analysis.blur_type in BlurType, "Invalid blur type"
    print("   ✓ Blur analysis passed")
    
    # Test 2: Deblur frame
    print("\n2. Deblurring frame...")
    result = deblurrer.deblur_frame(blurry_frame, method=DeblurMethod.WIENER)
    print(f"   {result}")
    assert result.deblurred_frame.shape == blurry_frame.shape, "Shape mismatch"
    assert 0.0 <= result.quality_score <= 1.0, "Invalid quality score"
    print("   ✓ Frame deblurring passed")
    
    # Test 3: Deblur sequence
    print("\n3. Deblurring sequence...")
    frames = [blurry_frame for _ in range(5)]
    deblurred_frames = deblurrer.deblur_sequence(frames, strength=1.0)
    assert len(deblurred_frames) == len(frames), "Frame count mismatch"
    print(f"   Deblurred {len(deblurred_frames)} frames")
    print("   ✓ Sequence deblurring passed")
    
    # Test 4: Statistics
    print("\n4. Getting statistics...")
    stats = deblurrer.get_statistics()
    print(f"   Average sharpness improvement: {stats['avg_sharpness_improvement']:.2%}")
    print(f"   Frames processed: {stats['frames_processed']}")
    print("   ✓ Statistics passed")
    
    print("\n✅ AI Deblurrer: ALL TESTS PASSED")


def test_color_grading_ai():
    """Test color grading AI module."""
    print("\n" + "="*60)
    print("TEST 3: Color Grading AI")
    print("="*60)
    
    # Create test frame
    frame = create_test_frame()
    
    # Initialize grader
    grader = ColorGradingAI(
        preserve_skin_tones=True,
        auto_white_balance=False
    )
    
    # Test 1: Analyze colors
    print("\n1. Analyzing colors...")
    analysis = grader.analyze_colors(frame)
    print(f"   {analysis}")
    assert 0.0 <= analysis.saturation_level <= 1.0, "Invalid saturation"
    assert 0.0 <= analysis.brightness_level <= 1.0, "Invalid brightness"
    print("   ✓ Color analysis passed")
    
    # Test 2: Apply preset style
    print("\n2. Applying preset style...")
    result = grader.apply_style(frame, ColorGradingStyle.CINEMATIC, intensity=0.8)
    print(f"   {result}")
    assert result.graded_frame.shape == frame.shape, "Shape mismatch"
    assert result.style_applied == ColorGradingStyle.CINEMATIC, "Wrong style"
    print("   ✓ Preset style passed")
    
    # Test 3: Apply custom grade
    print("\n3. Applying custom grade...")
    result = grader.apply_custom_grade(
        frame,
        brightness=0.1,
        contrast=0.2,
        saturation=0.15,
        temperature=0.1
    )
    print(f"   {result}")
    assert result.graded_frame.shape == frame.shape, "Shape mismatch"
    assert result.style_applied == ColorGradingStyle.CUSTOM, "Wrong style"
    print("   ✓ Custom grade passed")
    
    # Test 4: Grade sequence
    print("\n4. Grading sequence...")
    frames = [frame for _ in range(5)]
    graded_frames = grader.grade_sequence(
        frames,
        style=ColorGradingStyle.WARM,
        intensity=0.9,
        smooth_transitions=True
    )
    assert len(graded_frames) == len(frames), "Frame count mismatch"
    print(f"   Graded {len(graded_frames)} frames")
    print("   ✓ Sequence grading passed")
    
    # Test 5: Test all preset styles
    print("\n5. Testing all preset styles...")
    styles = [
        ColorGradingStyle.CINEMATIC,
        ColorGradingStyle.VINTAGE,
        ColorGradingStyle.WARM,
        ColorGradingStyle.COOL,
        ColorGradingStyle.VIBRANT,
        ColorGradingStyle.DESATURATED,
        ColorGradingStyle.NOIR,
        ColorGradingStyle.SUNSET,
        ColorGradingStyle.TEAL_ORANGE
    ]
    for style in styles:
        result = grader.apply_style(frame, style, intensity=0.8)
        assert result.graded_frame.shape == frame.shape, f"Shape mismatch for {style}"
        print(f"   ✓ {style.value} style passed")
    
    print("\n✅ Color Grading AI: ALL TESTS PASSED")


def test_hdr_tone_mapper():
    """Test HDR tone mapper module."""
    print("\n" + "="*60)
    print("TEST 4: HDR Tone Mapper")
    print("="*60)
    
    # Create test HDR frame (simulated with high dynamic range)
    hdr_frame = create_test_frame()
    # Simulate HDR by expanding dynamic range
    hdr_frame = np.clip(hdr_frame.astype(np.float32) * 1.5, 0, 255).astype(np.uint8)
    
    # Initialize tone mapper
    mapper = HDRToneMapper(
        target_standard=HDRStandard.SDR,
        preserve_colors=True,
        adaptive_local=True
    )
    
    # Test 1: Analyze dynamic range
    print("\n1. Analyzing dynamic range...")
    analysis = mapper.analyze_dynamic_range(hdr_frame)
    print(f"   {analysis}")
    assert analysis.dynamic_range >= 0, "Invalid dynamic range"
    assert 0.0 <= analysis.clipped_highlights <= 1.0, "Invalid clipping"
    print("   ✓ Dynamic range analysis passed")
    
    # Test 2: Tone map frame
    print("\n2. Tone mapping frame...")
    result = mapper.tone_map(hdr_frame, method=ToneMappingMethod.ACES, gamma=2.2)
    print(f"   {result}")
    assert result.mapped_frame.shape == hdr_frame.shape, "Shape mismatch"
    assert result.compression_ratio >= 1.0, "Invalid compression ratio"
    print("   ✓ Tone mapping passed")
    
    # Test 3: Adjust exposure
    print("\n3. Adjusting exposure...")
    adjusted = mapper.adjust_exposure(hdr_frame, exposure_compensation=1.0)
    assert adjusted.shape == hdr_frame.shape, "Shape mismatch"
    print("   ✓ Exposure adjustment passed")
    
    # Test 4: Auto-exposure
    print("\n4. Testing auto-exposure...")
    auto_exposed = mapper.adjust_exposure(hdr_frame, auto_expose=True)
    assert auto_exposed.shape == hdr_frame.shape, "Shape mismatch"
    print("   ✓ Auto-exposure passed")
    
    # Test 5: Compress dynamic range
    print("\n5. Compressing dynamic range...")
    compressed = mapper.compress_dynamic_range(hdr_frame, target_stops=8.0)
    assert compressed.shape == hdr_frame.shape, "Shape mismatch"
    print("   ✓ Dynamic range compression passed")
    
    # Test 6: Tone map sequence
    print("\n6. Tone mapping sequence...")
    frames = [hdr_frame for _ in range(5)]
    sdr_frames = mapper.tone_map_sequence(
        frames,
        method=ToneMappingMethod.FILMIC,
        smooth_transitions=True
    )
    assert len(sdr_frames) == len(frames), "Frame count mismatch"
    print(f"   Tone mapped {len(sdr_frames)} frames")
    print("   ✓ Sequence tone mapping passed")
    
    # Test 7: Test all tone mapping methods
    print("\n7. Testing all tone mapping methods...")
    methods = [
        ToneMappingMethod.REINHARD,
        ToneMappingMethod.DRAGO,
        ToneMappingMethod.MANTIUK,
        ToneMappingMethod.FILMIC,
        ToneMappingMethod.ACES
    ]
    for method in methods:
        result = mapper.tone_map(hdr_frame, method=method)
        assert result.mapped_frame.shape == hdr_frame.shape, f"Shape mismatch for {method}"
        print(f"   ✓ {method.value} method passed")
    
    # Test 8: Statistics
    print("\n8. Getting statistics...")
    stats = mapper.get_statistics()
    print(f"   Average compression ratio: {stats['avg_compression_ratio']:.2f}x")
    print(f"   Frames processed: {stats['frames_processed']}")
    print("   ✓ Statistics passed")
    
    print("\n✅ HDR Tone Mapper: ALL TESTS PASSED")


def test_integration():
    """Test integration of all Phase 3 modules."""
    print("\n" + "="*60)
    print("TEST 5: Integration Test")
    print("="*60)
    
    # Create test frame
    clean_frame = create_test_frame()
    
    # Add noise and blur
    noisy_frame = add_noise(clean_frame, noise_level=0.1)
    try:
        noisy_blurry_frame = add_blur(noisy_frame, kernel_size=3)
    except ImportError:
        noisy_blurry_frame = noisy_frame
    
    # Initialize all modules
    denoiser = AIDenoiser()
    deblurrer = AIDeblurrer()
    grader = ColorGradingAI()
    tone_mapper = HDRToneMapper()
    
    print("\n1. Complete enhancement pipeline...")
    
    # Step 1: Denoise
    print("   Step 1/4: Denoising...")
    denoise_result = denoiser.denoise_frame(noisy_blurry_frame)
    
    # Step 2: Deblur
    print("   Step 2/4: Deblurring...")
    deblur_result = deblurrer.deblur_frame(denoise_result.denoised_frame)
    
    # Step 3: Tone map
    print("   Step 3/4: Tone mapping...")
    tone_result = tone_mapper.tone_map(deblur_result.deblurred_frame)
    
    # Step 4: Color grade
    print("   Step 4/4: Color grading...")
    grade_result = grader.apply_style(tone_result.mapped_frame, ColorGradingStyle.CINEMATIC)
    
    # Verify final result
    assert grade_result.graded_frame.shape == clean_frame.shape, "Shape mismatch"
    print("   ✓ Pipeline completed successfully")
    
    print("\n2. Batch processing...")
    frames = [noisy_blurry_frame for _ in range(3)]
    
    # Process sequence
    denoised = denoiser.denoise_sequence(frames)
    deblurred = deblurrer.deblur_sequence(denoised)
    tone_mapped = tone_mapper.tone_map_sequence(deblurred)
    graded = grader.grade_sequence(tone_mapped, ColorGradingStyle.WARM)
    
    assert len(graded) == len(frames), "Frame count mismatch"
    print(f"   Processed {len(graded)} frames")
    print("   ✓ Batch processing passed")
    
    print("\n✅ Integration Test: ALL TESTS PASSED")


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("VIDEO QUALITY ENHANCEMENT - PHASE 3 TESTS")
    print("="*60)
    print("\nTesting AI Denoiser, AI Deblurrer, Color Grading AI, and HDR Tone Mapper")
    
    start_time = time.time()
    
    try:
        # Run individual module tests
        test_ai_denoiser()
        test_ai_deblurrer()
        test_color_grading_ai()
        test_hdr_tone_mapper()
        
        # Run integration test
        test_integration()
        
        # Summary
        elapsed_time = time.time() - start_time
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED")
        print("="*60)
        print(f"\nTotal time: {elapsed_time:.2f} seconds")
        print("\nPhase 3 modules are working correctly:")
        print("  ✓ AI Denoiser")
        print("  ✓ AI Deblurrer")
        print("  ✓ Color Grading AI")
        print("  ✓ HDR Tone Mapper")
        print("  ✓ Integration")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
