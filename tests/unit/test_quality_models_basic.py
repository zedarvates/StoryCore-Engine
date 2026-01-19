"""
Basic unit tests for quality models to verify structure setup.
"""

import pytest
from src.models.quality_models import (
    ContinuityViolation,
    ContinuityResult,
    VoiceSegment,
    AudioKeyframe,
    QualityIssue,
    ImprovementSuggestion,
    QualityScore,
    QualityReport
)


def test_continuity_violation_creation():
    """Test that ContinuityViolation can be created and serialized."""
    violation = ContinuityViolation(
        violation_type="180_rule",
        severity="high",
        description="180-degree rule violated",
        timestamp_a=1.5,
        timestamp_b=2.0,
        suggested_fix="Adjust camera angle"
    )
    
    assert violation.violation_type == "180_rule"
    assert violation.severity == "high"
    
    # Test serialization
    data = violation.to_dict()
    assert data["type"] == "180_rule"
    assert data["severity"] == "high"
    
    # Test deserialization
    restored = ContinuityViolation.from_dict(data)
    assert restored.violation_type == violation.violation_type
    assert restored.severity == violation.severity


def test_voice_segment_duration():
    """Test that VoiceSegment duration property works correctly."""
    segment = VoiceSegment(
        start_time=1.0,
        end_time=3.5,
        confidence=0.95,
        rms_level=0.5
    )
    
    assert segment.duration == 2.5
    assert segment.confidence == 0.95


def test_quality_score_passed():
    """Test that QualityScore.passed() method works correctly."""
    score = QualityScore(
        overall_score=75.0,
        sharpness_score=80.0,
        motion_score=70.0,
        audio_score=75.0,
        continuity_score=75.0,
        issues=[],
        suggestions=[]
    )
    
    assert score.passed(threshold=70.0) is True
    assert score.passed(threshold=80.0) is False


def test_quality_score_serialization():
    """Test that QualityScore can be serialized and deserialized."""
    issue = QualityIssue(
        issue_type="low_sharpness",
        severity="medium",
        description="Frame sharpness below threshold",
        timestamp=1.5,
        frame_number=45,
        metric_value=85.0,
        threshold_value=100.0
    )
    
    suggestion = ImprovementSuggestion(
        suggestion_id="sugg_001",
        priority=1,
        action="Increase sharpness",
        parameters={"sharpen": 1.2},
        expected_improvement=10.0,
        related_issue_ids=["issue_001"]
    )
    
    score = QualityScore(
        overall_score=75.0,
        sharpness_score=80.0,
        motion_score=70.0,
        audio_score=75.0,
        continuity_score=75.0,
        issues=[issue],
        suggestions=[suggestion]
    )
    
    # Test JSON serialization
    json_str = score.to_json()
    assert "overall_score" in json_str
    assert "75.0" in json_str
    
    # Test deserialization
    restored = QualityScore.from_json(json_str)
    assert restored.overall_score == score.overall_score
    assert len(restored.issues) == 1
    assert len(restored.suggestions) == 1


def test_project_manager_quality_fields():
    """Test that ProjectManager includes quality validation fields."""
    from src.project_manager import ProjectManager
    
    pm = ProjectManager()
    
    # Check capabilities
    assert "continuity_validation" in pm.default_capabilities
    assert "audio_mixing" in pm.default_capabilities
    assert "quality_validation" in pm.default_capabilities
    
    # Check generation status
    assert "continuity_validation" in pm.default_generation_status
    assert "audio_mixing" in pm.default_generation_status
    assert "quality_validation" in pm.default_generation_status


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
