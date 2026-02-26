"""
Basic unit tests for quality models to verify structure setup.
"""

import pytest
from src.quality_validator import (
    QualityIssue,
    ImprovementSuggestion,
    QualityScore,
    QualityMetrics,
    QualityThresholds,
    QualityThresholdResult,
    QualityValidator,
    QualityMetric,
    QualityStandard
)


def test_quality_issue_creation():
    """Test that QualityIssue can be created and serialized."""
    issue = QualityIssue(
        issue_type="low_sharpness",
        severity="high",
        description="Frame sharpness below threshold",
        timestamp=1.5,
        frame_number=45,
        metric_value=85.0,
        threshold_value=100.0
    )
    
    assert issue.issue_type == "low_sharpness"
    assert issue.severity == "high"
    
    # Test serialization
    data = issue.to_dict()
    assert data["type"] == "low_sharpness"
    assert data["severity"] == "high"


def test_quality_metrics():
    """Test that QualityMetrics can be created correctly."""
    metrics = QualityMetrics(
        sharpness=150.0,
        noise_level=0.1,
        contrast=1.2,
        brightness=1.0,
        overall_score=0.95
    )
    
    assert metrics.sharpness == 150.0
    assert metrics.noise_level == 0.1
    assert metrics.overall_score == 0.95
    
    # Test serialization
    data = metrics.to_dict()
    assert "sharpness" in data
    assert "overall_score" in data


def test_quality_thresholds():
    """Test that QualityThresholds can be created correctly."""
    thresholds = QualityThresholds(
        min_sharpness=50.0,
        max_noise_level=0.5,
        min_contrast=0.5,
        min_brightness=0.5
    )
    
    assert thresholds.min_sharpness == 50.0
    assert thresholds.max_noise_level == 0.5
    
    # Test serialization
    data = thresholds.to_dict()
    assert "min_sharpness" in data
    assert "max_noise_level" in data


def test_improvement_suggestion():
    """Test that ImprovementSuggestion can be created correctly."""
    suggestion = ImprovementSuggestion(
        suggestion_id="sugg_001",
        priority=1,
        action="Increase sharpness",
        parameters={"sharpen": 1.2},
        expected_improvement=10.0,
        related_issue_ids=["issue_001"]
    )
    
    assert suggestion.suggestion_id == "sugg_001"
    assert suggestion.priority == 1
    assert suggestion.action == "Increase sharpness"
    
    # Test serialization
    data = suggestion.to_dict()
    assert data["id"] == "sugg_001"
    assert data["priority"] == 1


def test_quality_score_creation():
    """Test that QualityScore can be created correctly."""
    score = QualityScore(
        score=0.85,
        confidence=0.9,
        metric=QualityMetric.SHARPNESS,
        standard=QualityStandard.WEB_HD,
        details={"test": "value"}
    )
    
    assert score.score == 0.85
    assert score.confidence == 0.9
    assert score.metric == QualityMetric.SHARPNESS
    
    # Test serialization
    data = score.to_dict()
    assert data["score"] == 0.85
    assert data["metric"] == "sharpness"


def test_quality_threshold_result():
    """Test that QualityThresholdResult works correctly."""
    result = QualityThresholdResult(
        passes_thresholds=True,
        sharpness_pass=True,
        noise_pass=True,
        contrast_pass=True,
        brightness_pass=True,
        details={}
    )
    
    assert result.passes_thresholds is True
    assert result.sharpness_pass is True
    
    # Test serialization
    data = result.to_dict()
    assert data["passes_thresholds"] is True


def test_quality_validator_threshold_validation():
    """Test that QualityValidator.validate_quality_thresholds works correctly."""
    validator = QualityValidator()
    
    metrics = QualityMetrics(
        sharpness=150.0,
        noise_level=0.1,
        contrast=1.2,
        brightness=1.0,
        overall_score=0.95
    )
    
    thresholds = QualityThresholds(
        min_sharpness=50.0,
        max_noise_level=0.5,
        min_contrast=0.5,
        min_brightness=0.5
    )
    
    result = validator.validate_quality_thresholds(metrics, thresholds)
    
    assert result.passes_thresholds is True
    assert result.sharpness_pass is True
    assert result.noise_pass is True


def test_quality_validator_level_thresholds():
    """Test that QualityValidator.get_quality_thresholds_for_level works correctly."""
    validator = QualityValidator()
    
    for level in ['low', 'medium', 'high', 'ultra']:
        thresholds = validator.get_quality_thresholds_for_level(level)
        assert thresholds.min_sharpness > 0
        assert 0 <= thresholds.max_noise_level <= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])