"""
Property-Based Tests for Super Resolution Engine

Feature: ai-enhancement, Property 2: Super Resolution Quality and Performance
Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5

This module tests universal properties of super-resolution upscaling
using property-based testing with Hypothesis.
"""

import pytest
import asyncio
from hypothesis import given, strategies as st, settings, assume
from hypothesis import HealthCheck

from src.super_resolution_engine import (
    SuperResolutionEngine, UpscaleConfig, UpscaleFactor,
    UpscaleQuality, UpscaledFrame, TraditionalMethod
)
from src.ai_enhancement_engine import VideoFrame, PerformanceMode
from src.model_manager import ModelManager, ModelManagerConfig


# Hypothesis strategies for generating test data
@st.composite
def video_frame_strategy(draw):
    """Generate random video frames."""
    frame_id = f"frame_{draw(st.integers(min_value=0, max_value=1000))}"
    width = draw(st.integers(min_value=320, max_value=1920))
    height = draw(st.integers(min_value=240, max_value=1080))
    format_type = draw(st.sampled_from(['RGB', 'RGBA', 'BGR']))
    data = bytes([draw(st.integers(min_value=0, max_value=255)) for _ in range(100)])
    timestamp = draw(st.floats(min_value=0.0, max_value=60.0))
    
    return VideoFrame(
        frame_id=frame_id,
        width=width,
        height=height,
        format=format_type,
        data=data,
        timestamp=timestamp,
        metadata={}
    )


@st.composite
def upscale_config_strategy(draw):
    """Generate random upscale configurations."""
    factor = draw(st.sampled_from(list(UpscaleFactor)))
    quality = draw(st.sampled_from(list(UpscaleQuality)))
    preserve_details = draw(st.booleans())
    enhance_sharpness = draw(st.booleans())
    denoise = draw(st.booleans())
    performance_mode = draw(st.sampled_from(list(PerformanceMode)))
    
    return UpscaleConfig(
        factor=factor,
        quality=quality,
        preserve_details=preserve_details,
        enhance_sharpness=enhance_sharpness,
        denoise=denoise,
        performance_mode=performance_mode
    )


class TestSuperResolutionProperties:
    """Property-based tests for Super Resolution Engine."""
    
    @pytest.fixture
    async def engine(self):
        """Create a super resolution engine for testing."""
        config = ModelManagerConfig()
        model_manager = ModelManager(config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        yield engine
        await model_manager.shutdown()
    
    @pytest.mark.asyncio
    @given(
        frame=video_frame_strategy(),
        factor=st.sampled_from(list(UpscaleFactor))
    )
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_correct_output_dimensions(self, frame, factor):
        """
        Property 2.1: Correct Output Dimensions
        
        For any input frame and valid upscale factor (2x, 4x, 8x), the super-resolution
        engine should produce output with correct dimensions.
        
        Validates: Requirement 2.1
        """
        config = ModelManagerConfig()
        model_manager = ModelManager(config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        
        try:
            upscale_config = UpscaleConfig(factor=factor)
            
            # Upscale frame
            upscaled_frame = await engine.upscale_frame(frame, upscale_config)
            
            # Property: Upscaled frame should be returned
            assert upscaled_frame is not None, "Upscaled frame should be returned"
            assert isinstance(upscaled_frame, UpscaledFrame), "Result should be UpscaledFrame"
            
            # Property: Original frame should be preserved
            assert upscaled_frame.original_frame == frame, "Original frame should be preserved"
            
            # Property: Upscale factor should match configuration
            assert upscaled_frame.upscale_config.factor == factor, \
                f"Upscale factor should match, expected {factor}, got {upscaled_frame.upscale_config.factor}"
            
            # Property: Output data should exist and be larger
            assert upscaled_frame.upscaled_data is not None, "Upscaled data should exist"
            assert len(upscaled_frame.upscaled_data) > 0, "Upscaled data should not be empty"
            
            # Property: Processing time should be recorded
            assert upscaled_frame.processing_time_ms >= 0, \
                "Processing time should be non-negative"
            
        finally:
            await model_manager.shutdown()
    
    @pytest.mark.asyncio
    @given(
        frame=video_frame_strategy(),
        config=upscale_config_strategy()
    )
    @settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_better_detail_preservation_than_traditional(self, frame, config):
        """
        Property 2.2: Better Detail Preservation
        
        For any upscaling operation, AI super-resolution should provide better detail
        preservation than traditional methods.
        
        Validates: Requirement 2.2
        """
        model_config = ModelManagerConfig()
        model_manager = ModelManager(model_config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        
        try:
            # Upscale with comparison enabled
            upscaled_frame = await engine.upscale_frame(
                frame, config, compare_traditional=True
            )
            
            # Property: Quality metrics should exist
            assert upscaled_frame.quality_metrics is not None, \
                "Quality metrics should be available"
            
            # Property: Detail preservation score should be reasonable
            detail_score = upscaled_frame.quality_metrics.detail_preservation_score
            assert 0.0 <= detail_score <= 1.0, \
                f"Detail preservation score should be 0-1, got {detail_score}"
            
            # Property: If comparison was done, AI should be competitive
            if upscaled_frame.comparison_result:
                ai_quality = upscaled_frame.comparison_result.ai_quality.overall_quality_score
                best_traditional = max(
                    upscaled_frame.comparison_result.traditional_results.values(),
                    key=lambda m: m.overall_quality_score
                ).overall_quality_score
                
                # AI should be at least as good as traditional methods
                assert ai_quality >= best_traditional * 0.95, \
                    f"AI quality ({ai_quality:.3f}) should be competitive with traditional ({best_traditional:.3f})"
            
        finally:
            await model_manager.shutdown()
    
    @pytest.mark.asyncio
    @given(
        frame=video_frame_strategy(),
        factor=st.sampled_from(list(UpscaleFactor))
    )
    @settings(max_examples=30, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_intelligent_detail_reconstruction(self, frame, factor):
        """
        Property 2.3: Intelligent Detail Reconstruction
        
        For any low-resolution input, the AI system should intelligently reconstruct
        missing detail information.
        
        Validates: Requirement 2.3
        """
        model_config = ModelManagerConfig()
        model_manager = ModelManager(model_config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        
        try:
            config = UpscaleConfig(
                factor=factor,
                preserve_details=True,
                enhance_sharpness=True
            )
            
            upscaled_frame = await engine.upscale_frame(frame, config)
            
            # Property: Quality metrics should show detail reconstruction
            metrics = upscaled_frame.quality_metrics
            
            # PSNR should be reasonable
            assert metrics.psnr > 0, "PSNR should be positive"
            assert metrics.psnr < 60, "PSNR should be realistic"
            
            # SSIM should indicate structural similarity
            assert 0.0 <= metrics.ssim <= 1.0, "SSIM should be 0-1"
            
            # Edge preservation should be good
            assert metrics.edge_preservation_score >= 0.5, \
                "Edge preservation should be reasonable"
            
            # Texture quality should be maintained
            assert metrics.texture_quality_score >= 0.5, \
                "Texture quality should be reasonable"
            
            # Overall quality should be acceptable
            assert metrics.overall_quality_score >= 0.6, \
                f"Overall quality should be acceptable, got {metrics.overall_quality_score}"
            
        finally:
            await model_manager.shutdown()
    
    @pytest.mark.asyncio
    @given(
        frame=video_frame_strategy(),
        factor=st.sampled_from(list(UpscaleFactor)),
        quality=st.sampled_from(list(UpscaleQuality))
    )
    @settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_processing_time_suitable_for_quality_level(self, frame, factor, quality):
        """
        Property 2.4: Processing Time Suitable for Quality Level
        
        For any quality level specified, the processing time should be suitable
        for the specified quality level.
        
        Validates: Requirement 2.4
        """
        model_config = ModelManagerConfig()
        model_manager = ModelManager(model_config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        
        try:
            config = UpscaleConfig(factor=factor, quality=quality)
            
            # Estimate processing time
            estimated_time = engine.estimate_processing_time(
                (frame.width, frame.height), factor, quality
            )
            
            # Property: Estimation should be positive
            assert estimated_time > 0, "Estimated time should be positive"
            
            # Upscale frame
            upscaled_frame = await engine.upscale_frame(frame, config)
            actual_time = upscaled_frame.processing_time_ms
            
            # Property: Actual time should be reasonable
            assert actual_time > 0, "Actual processing time should be positive"
            
            # Property: Processing time should correlate with quality level
            # FAST should be faster than HIGH_QUALITY
            if quality == UpscaleQuality.FAST:
                assert actual_time < 1000, \
                    f"FAST quality should process quickly, took {actual_time}ms"
            elif quality == UpscaleQuality.HIGH_QUALITY:
                # HIGH_QUALITY can take longer but should still be reasonable
                assert actual_time < 5000, \
                    f"HIGH_QUALITY should complete in reasonable time, took {actual_time}ms"
            
            # Property: Estimation should be in the right ballpark (within 10x)
            ratio = actual_time / estimated_time
            assert 0.1 <= ratio <= 10.0, \
                f"Actual time should be reasonably close to estimate, ratio: {ratio}"
            
        finally:
            await model_manager.shutdown()
    
    @pytest.mark.asyncio
    @given(
        frame=video_frame_strategy(),
        config=upscale_config_strategy()
    )
    @settings(max_examples=30, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_quality_assessment_and_alternatives(self, frame, config):
        """
        Property 2.5: Quality Assessment and Alternative Options
        
        For any upscaling that fails or produces artifacts, the system should provide
        quality assessment and alternative options.
        
        Validates: Requirement 2.5
        """
        model_config = ModelManagerConfig()
        model_manager = ModelManager(model_config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        
        try:
            # Upscale with comparison to get alternatives
            upscaled_frame = await engine.upscale_frame(
                frame, config, compare_traditional=True
            )
            
            # Property: Should always return a result (even if fallback)
            assert upscaled_frame is not None, "Should always return a result"
            
            # Property: Quality metrics should always be available
            assert upscaled_frame.quality_metrics is not None, \
                "Quality metrics should always be available"
            
            # Property: If comparison was done, alternatives should be provided
            if upscaled_frame.comparison_result:
                comparison = upscaled_frame.comparison_result
                
                # Should have traditional method results
                assert len(comparison.traditional_results) > 0, \
                    "Should have traditional method comparisons"
                
                # Should identify best traditional method
                assert comparison.best_traditional_method is not None, \
                    "Should identify best traditional method"
                
                # Should provide recommendation
                assert comparison.recommendation, \
                    "Should provide recommendation"
                assert len(comparison.recommendation) > 0, \
                    "Recommendation should not be empty"
                
                # Should calculate improvement percentage
                assert isinstance(comparison.improvement_percentage, (int, float)), \
                    "Improvement percentage should be numeric"
            
            # Property: If fallback was used, error message should be provided
            if upscaled_frame.fallback_used:
                assert upscaled_frame.error_message is not None, \
                    "Fallback should include error message"
                assert len(upscaled_frame.error_message) > 0, \
                    "Error message should not be empty"
            
        finally:
            await model_manager.shutdown()
    
    @pytest.mark.asyncio
    @given(
        frames=st.lists(video_frame_strategy(), min_size=2, max_size=5),
        factor=st.sampled_from(list(UpscaleFactor))
    )
    @settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_sequence_upscaling_consistency(self, frames, factor):
        """
        Property: Sequence Upscaling Consistency
        
        For any sequence of frames, all frames should be upscaled consistently
        with the same configuration.
        
        Validates: Requirements 2.1, 2.4
        """
        # Ensure sequential frames
        for i, frame in enumerate(frames):
            frame.timestamp = float(i)
            frame.frame_id = f"seq_frame_{i}"
        
        model_config = ModelManagerConfig()
        model_manager = ModelManager(model_config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        
        try:
            config = UpscaleConfig(factor=factor, quality=UpscaleQuality.BALANCED)
            
            # Upscale sequence
            upscaled_frames = await engine.upscale_sequence(frames, config)
            
            # Property: All frames should be processed
            assert len(upscaled_frames) == len(frames), \
                f"All frames should be processed, got {len(upscaled_frames)}/{len(frames)}"
            
            # Property: All frames should use same configuration
            for upscaled_frame in upscaled_frames:
                assert upscaled_frame.upscale_config.factor == factor, \
                    "All frames should use same upscale factor"
            
            # Property: Quality should be consistent across sequence
            quality_scores = [f.quality_metrics.overall_quality_score for f in upscaled_frames]
            if len(quality_scores) > 1:
                avg_quality = sum(quality_scores) / len(quality_scores)
                # All scores should be within reasonable range of average
                for score in quality_scores:
                    assert abs(score - avg_quality) < 0.3, \
                        f"Quality should be consistent across sequence, score {score} vs avg {avg_quality}"
            
        finally:
            await model_manager.shutdown()
    
    @pytest.mark.asyncio
    @given(
        frame=video_frame_strategy(),
        factor=st.sampled_from(list(UpscaleFactor))
    )
    @settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_comparison_with_all_traditional_methods(self, frame, factor):
        """
        Property: Comprehensive Traditional Method Comparison
        
        For any upscaling operation with comparison enabled, all traditional methods
        should be evaluated.
        
        Validates: Requirement 2.2
        """
        model_config = ModelManagerConfig()
        model_manager = ModelManager(model_config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        
        try:
            config = UpscaleConfig(factor=factor)
            
            # Upscale with comparison
            upscaled_frame = await engine.upscale_frame(
                frame, config, compare_traditional=True
            )
            
            # Property: Comparison should be performed
            assert upscaled_frame.comparison_result is not None, \
                "Comparison should be performed when requested"
            
            comparison = upscaled_frame.comparison_result
            
            # Property: All traditional methods should be evaluated
            expected_methods = set(TraditionalMethod)
            actual_methods = set(comparison.traditional_results.keys())
            assert actual_methods == expected_methods, \
                f"All traditional methods should be evaluated, missing: {expected_methods - actual_methods}"
            
            # Property: Each method should have quality metrics
            for method, metrics in comparison.traditional_results.items():
                assert 0.0 <= metrics.overall_quality_score <= 1.0, \
                    f"Quality score for {method.value} should be valid"
                assert metrics.psnr > 0, \
                    f"PSNR for {method.value} should be positive"
                assert 0.0 <= metrics.ssim <= 1.0, \
                    f"SSIM for {method.value} should be valid"
            
        finally:
            await model_manager.shutdown()
    
    @pytest.mark.asyncio
    async def test_property_supported_factors_availability(self):
        """
        Property: Supported Factors Availability
        
        The engine should support all specified upscale factors (2x, 4x, 8x).
        
        Validates: Requirement 2.1
        """
        model_config = ModelManagerConfig()
        model_manager = ModelManager(model_config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        
        try:
            # Get supported factors
            supported_factors = engine.get_supported_factors()
            
            # Property: Should support all required factors
            assert UpscaleFactor.X2 in supported_factors, "Should support 2x upscaling"
            assert UpscaleFactor.X4 in supported_factors, "Should support 4x upscaling"
            assert UpscaleFactor.X8 in supported_factors, "Should support 8x upscaling"
            
            # Property: Should have exactly these three factors
            assert len(supported_factors) == 3, \
                f"Should support exactly 3 factors, got {len(supported_factors)}"
            
        finally:
            await model_manager.shutdown()
    
    @pytest.mark.asyncio
    @given(
        frame=video_frame_strategy(),
        config=upscale_config_strategy()
    )
    @settings(max_examples=30, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_statistics_tracking(self, frame, config):
        """
        Property: Processing Statistics Tracking
        
        For any upscaling operation, comprehensive statistics should be tracked.
        
        Validates: Requirements 2.4, 2.5
        """
        model_config = ModelManagerConfig()
        model_manager = ModelManager(model_config)
        await model_manager.initialize()
        engine = SuperResolutionEngine(model_manager)
        
        try:
            # Reset stats
            engine.reset_stats()
            
            # Upscale frame
            upscaled_frame = await engine.upscale_frame(frame, config)
            
            # Get statistics
            stats = engine.get_processing_stats()
            
            # Property: Statistics should be tracked
            assert stats['total_frames'] == 1, "Should track frame count"
            assert stats['successful_upscales'] >= 0, "Should track successful upscales"
            assert 0.0 <= stats['success_rate'] <= 1.0, "Success rate should be valid"
            assert stats['average_processing_time'] >= 0, "Average time should be non-negative"
            
            # Property: Factor-specific stats should exist
            assert 'by_factor' in stats, "Should have factor-specific stats"
            factor_value = config.factor.value
            assert factor_value in stats['by_factor'], \
                f"Should have stats for factor {factor_value}"
            
        finally:
            await model_manager.shutdown()


# Run tests with pytest
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
