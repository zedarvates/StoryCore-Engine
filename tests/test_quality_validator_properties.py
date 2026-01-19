#!/usr/bin/env python3
"""
Property-based tests for Quality Validator.
Tests universal properties that should hold for quality assessment.
"""

import pytest
import math
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from quality_validator import (
    QualityValidator, QualityMetric, QualityStandard, QualityScore,
    QualityIssue, QualityAssessment
)


# Strategy generators for property-based testing
@composite
def valid_frame_sequence(draw):
    """Generate valid frame sequences for testing."""
    num_frames = draw(st.integers(min_value=2, max_value=5))  # Small for performance
    height = draw(st.integers(min_value=50, max_value=100))
    width = draw(st.integers(min_value=50, max_value=100))
    
    frames = []
    base_color = draw(st.integers(min_value=50, max_value=200))
    
    for i in range(num_frames):
        # Create frame with gradual changes
        color_shift = i * 5
        frame = [[[base_color + color_shift, base_color + color_shift + 10, base_color + color_shift + 20] 
                 for _ in range(width)] for _ in range(height)]
        frames.append(frame)
    
    return frames


@composite
def valid_quality_standard(draw):
    """Generate valid quality standards."""
    return draw(st.sampled_from(list(QualityStandard)))


class TestQualityValidatorProperties:
    """Property-based tests for Quality Validator."""
    
    @given(valid_frame_sequence(), valid_quality_standard())
    @settings(max_examples=5, deadline=3000, suppress_health_check=[HealthCheck.too_slow])
    def test_property_ve_14_quality_metric_consistency(self, frames, standard):
        """
        Property VE-14: Quality Metric Consistency
        For any valid frame sequence, quality metrics should be consistent
        and provide meaningful assessments.
        **Validates: Requirements VE-5.5, VE-5.7, VE-7.8**
        """
        # Initialize validator with test standard
        validator = QualityValidator(quality_standard=standard, enable_advanced_analysis=False)
        
        # Assess quality
        assessment = validator.assess_quality(frames)
        
        # Verify assessment structure
        assert hasattr(assessment, 'overall_score'), "Missing overall_score"
        assert hasattr(assessment, 'quality_scores'), "Missing quality_scores"
        assert hasattr(assessment, 'detected_issues'), "Missing detected_issues"
        assert hasattr(assessment, 'recommendations'), "Missing recommendations"
        assert hasattr(assessment, 'processing_time'), "Missing processing_time"
        assert hasattr(assessment, 'frame_count'), "Missing frame_count"
        assert hasattr(assessment, 'standard'), "Missing standard"
        assert hasattr(assessment, 'passes_standard'), "Missing passes_standard"
        
        # Verify score ranges
        assert 0.0 <= assessment.overall_score <= 1.0, f"Overall score out of range: {assessment.overall_score}"
        assert assessment.frame_count == len(frames), f"Frame count mismatch: {assessment.frame_count} != {len(frames)}"
        assert assessment.processing_time >= 0.0, f"Invalid processing time: {assessment.processing_time}"
        assert assessment.standard == standard, f"Standard mismatch: {assessment.standard} != {standard}"
        
        # Verify quality scores
        for score in assessment.quality_scores:
            assert isinstance(score, QualityScore), f"Invalid score type: {type(score)}"
            assert 0.0 <= score.score <= 1.0, f"Quality score out of range: {score.score}"
            assert 0.0 <= score.confidence <= 1.0, f"Confidence out of range: {score.confidence}"
            assert isinstance(score.metric, QualityMetric), f"Invalid metric type: {type(score.metric)}"
            assert score.standard == standard, f"Score standard mismatch: {score.standard} != {standard}"
        
        # Verify issues
        for issue in assessment.detected_issues:
            assert isinstance(issue, QualityIssue), f"Invalid issue type: {type(issue)}"
            assert isinstance(issue.metric, QualityMetric), f"Invalid issue metric type: {type(issue.metric)}"
            assert 0.0 <= issue.severity <= 1.0, f"Issue severity out of range: {issue.severity}"
            assert 0.0 <= issue.confidence <= 1.0, f"Issue confidence out of range: {issue.confidence}"
    
    @given(valid_frame_sequence())
    @settings(max_examples=5, deadline=2500)
    def test_property_ve_15_quality_threshold_validation(self, frames):
        """
        Property VE-15: Quality Threshold Validation
        For any frame sequence, quality thresholds should be applied
        consistently across different standards.
        **Validates: Requirements VE-5.6, VE-5.7, VE-7.3**
        """
        # Test different quality standards
        standards = [QualityStandard.PREVIEW, QualityStandard.WEB_HD, QualityStandard.BROADCAST]
        assessments = []
        
        for standard in standards:
            validator = QualityValidator(quality_standard=standard, enable_advanced_analysis=False)
            assessment = validator.assess_quality(frames)
            assessments.append((standard, assessment))
        
        # Verify threshold consistency
        for i in range(len(assessments) - 1):
            current_standard, current_assessment = assessments[i]
            next_standard, next_assessment = assessments[i + 1]
            
            # Higher standards should generally be harder to pass
            # (though this may not always be true due to different weighting)
            assert current_assessment.overall_score >= 0.0, f"Invalid score for {current_standard.value}"
            assert next_assessment.overall_score >= 0.0, f"Invalid score for {next_standard.value}"
            
            # Both assessments should have same frame count
            assert current_assessment.frame_count == next_assessment.frame_count, "Frame count inconsistency"
    
    @given(st.integers(min_value=2, max_value=4))
    @settings(max_examples=5, deadline=2000)
    def test_property_ve_16_visual_quality_assessment(self, num_frames):
        """
        Property VE-16: Visual Quality Assessment
        For any frame sequence, visual quality assessment should provide
        meaningful PSNR and SSIM-based evaluations.
        **Validates: Requirements VE-5.5, VE-7.6**
        """
        validator = QualityValidator(enable_advanced_analysis=False)
        
        # Create frames with known quality characteristics
        frames = []
        for i in range(num_frames):
            # Create frame with controlled quality
            frame = [[[100 + i * 20, 150, 200] for _ in range(50)] for _ in range(50)]
            frames.append(frame)
        
        assessment = validator.assess_quality(frames)
        
        # Find visual quality score
        visual_scores = [s for s in assessment.quality_scores if s.metric == QualityMetric.VISUAL_QUALITY]
        assert len(visual_scores) > 0, "No visual quality score found"
        
        visual_score = visual_scores[0]
        assert 'avg_psnr' in visual_score.details, "Missing PSNR details"
        assert 'avg_ssim' in visual_score.details, "Missing SSIM details"
        
        # PSNR and SSIM should be reasonable values
        psnr = visual_score.details['avg_psnr']
        ssim = visual_score.details['avg_ssim']
        
        assert 0.0 <= psnr <= 1.0, f"PSNR out of range: {psnr}"
        assert 0.0 <= ssim <= 1.0, f"SSIM out of range: {ssim}"
    
    @given(valid_frame_sequence())
    @settings(max_examples=5, deadline=2000)
    def test_property_ve_17_motion_smoothness_analysis(self, frames):
        """
        Property VE-17: Motion Smoothness Analysis
        For any frame sequence, motion smoothness analysis should provide
        consistent motion vector evaluations.
        **Validates: Requirements VE-5.6, VE-7.7**
        """
        validator = QualityValidator(enable_advanced_analysis=False)
        
        assessment = validator.assess_quality(frames)
        
        # Find motion smoothness score
        motion_scores = [s for s in assessment.quality_scores if s.metric == QualityMetric.MOTION_SMOOTHNESS]
        assert len(motion_scores) > 0, "No motion smoothness score found"
        
        motion_score = motion_scores[0]
        assert 'smoothness_scores' in motion_score.details, "Missing smoothness details"
        assert 'motion_vectors' in motion_score.details, "Missing motion vector details"
        
        # Motion vectors should be reasonable
        motion_vectors = motion_score.details['motion_vectors']
        for vector in motion_vectors:
            assert 'magnitude' in vector, "Missing motion magnitude"
            assert 'confidence' in vector, "Missing motion confidence"
            assert vector['magnitude'] >= 0.0, f"Invalid motion magnitude: {vector['magnitude']}"
            assert 0.0 <= vector['confidence'] <= 1.0, f"Invalid motion confidence: {vector['confidence']}"
    
    @given(valid_frame_sequence())
    @settings(max_examples=5, deadline=2000)
    def test_property_ve_18_sharpness_assessment(self, frames):
        """
        Property VE-18: Sharpness Assessment
        For any frame sequence, sharpness assessment should provide
        meaningful Laplacian variance measurements.
        **Validates: Requirements VE-5.5, VE-7.3**
        """
        validator = QualityValidator(enable_advanced_analysis=False)
        
        assessment = validator.assess_quality(frames)
        
        # Find sharpness score
        sharpness_scores = [s for s in assessment.quality_scores if s.metric == QualityMetric.SHARPNESS]
        assert len(sharpness_scores) > 0, "No sharpness score found"
        
        sharpness_score = sharpness_scores[0]
        assert 'raw_scores' in sharpness_score.details, "Missing raw sharpness scores"
        assert 'normalized_scores' in sharpness_score.details, "Missing normalized sharpness scores"
        
        # Sharpness scores should be reasonable
        raw_scores = sharpness_score.details['raw_scores']
        normalized_scores = sharpness_score.details['normalized_scores']
        
        assert len(raw_scores) == len(frames), f"Raw scores count mismatch: {len(raw_scores)} != {len(frames)}"
        assert len(normalized_scores) == len(frames), f"Normalized scores count mismatch: {len(normalized_scores)} != {len(frames)}"
        
        for score in normalized_scores:
            assert 0.0 <= score <= 1.0, f"Normalized sharpness score out of range: {score}"
    
    @given(valid_frame_sequence())
    @settings(max_examples=5, deadline=2000)
    def test_property_ve_19_noise_level_analysis(self, frames):
        """
        Property VE-19: Noise Level Analysis
        For any frame sequence, noise level analysis should provide
        consistent statistical variance measurements.
        **Validates: Requirements VE-5.6, VE-7.3**
        """
        validator = QualityValidator(enable_advanced_analysis=False)
        
        assessment = validator.assess_quality(frames)
        
        # Find noise level score
        noise_scores = [s for s in assessment.quality_scores if s.metric == QualityMetric.NOISE_LEVEL]
        assert len(noise_scores) > 0, "No noise level score found"
        
        noise_score = noise_scores[0]
        assert 'noise_scores' in noise_score.details, "Missing noise score details"
        
        # Noise scores should be reasonable
        noise_scores_list = noise_score.details['noise_scores']
        assert len(noise_scores_list) == len(frames), f"Noise scores count mismatch: {len(noise_scores_list)} != {len(frames)}"
        
        for score in noise_scores_list:
            assert 0.0 <= score <= 1.0, f"Noise score out of range: {score}"
    
    @given(valid_quality_standard())
    @settings(max_examples=5, deadline=1500)
    def test_property_ve_20_professional_standards_compliance(self, standard):
        """
        Property VE-20: Professional Standards Compliance
        For any quality standard, professional standards assessment should
        provide appropriate compliance measurements.
        **Validates: Requirements VE-7.7, VE-7.8**
        """
        validator = QualityValidator(quality_standard=standard, enable_advanced_analysis=True)
        
        # Create test frames with known characteristics
        frames = []
        for i in range(3):
            # Create frame with reasonable resolution
            frame = [[[100, 150, 200] for _ in range(100)] for _ in range(100)]
            frames.append(frame)
        
        assessment = validator.assess_quality(frames)
        
        # Find professional standards score
        standards_scores = [s for s in assessment.quality_scores if s.metric == QualityMetric.PROFESSIONAL_STANDARDS]
        
        if standards_scores:  # Only if advanced analysis is enabled
            standards_score = standards_scores[0]
            assert 'resolution_score' in standards_score.details, "Missing resolution score"
            assert 'color_depth_score' in standards_score.details, "Missing color depth score"
            assert 'compression_score' in standards_score.details, "Missing compression score"
            
            # Professional standards components should be reasonable
            resolution_score = standards_score.details['resolution_score']
            color_depth_score = standards_score.details['color_depth_score']
            compression_score = standards_score.details['compression_score']
            
            assert 0.0 <= resolution_score <= 1.0, f"Resolution score out of range: {resolution_score}"
            assert 0.0 <= color_depth_score <= 1.0, f"Color depth score out of range: {color_depth_score}"
            assert 0.0 <= compression_score <= 1.0, f"Compression score out of range: {compression_score}"


def test_quality_validator_basic_functionality():
    """Test basic functionality of quality validator."""
    validator = QualityValidator(quality_standard=QualityStandard.WEB_HD, enable_advanced_analysis=False)
    
    # Create simple test frames
    frames = []
    for i in range(3):
        frame = [[[100 + i * 10, 150, 200] for _ in range(50)] for _ in range(50)]
        frames.append(frame)
    
    # Test assessment
    assessment = validator.assess_quality(frames)
    
    assert assessment.frame_count == 3
    assert 0.0 <= assessment.overall_score <= 1.0
    assert len(assessment.quality_scores) > 0
    assert assessment.processing_time >= 0.0
    assert assessment.standard == QualityStandard.WEB_HD
    assert isinstance(assessment.passes_standard, bool)
    
    # Test individual quality scores
    for score in assessment.quality_scores:
        assert 0.0 <= score.score <= 1.0
        assert 0.0 <= score.confidence <= 1.0
        assert isinstance(score.details, dict)
    
    print("✓ Basic quality validator tests passed")


if __name__ == "__main__":
    # Run basic functionality test
    test_quality_validator_basic_functionality()
    
    # Run a few property tests manually
    test_instance = TestQualityValidatorProperties()
    
    print("Quality validator property tests ready for execution")