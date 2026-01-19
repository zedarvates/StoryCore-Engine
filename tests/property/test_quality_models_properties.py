"""
Property-based tests for quality data models.

These tests verify universal properties that should hold for all valid inputs,
using the hypothesis library for property-based testing.
"""

import json
from hypothesis import given, strategies as st, settings
from hypothesis.strategies import composite
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from models.quality_models import (
    ContinuityViolation,
    ContinuityResult,
    VoiceSegment,
    AudioKeyframe,
    QualityIssue,
    ImprovementSuggestion,
    QualityScore,
    QualityReport
)


# Custom strategies for generating valid test data
@composite
def continuity_violation_strategy(draw):
    """Generate valid ContinuityViolation instances."""
    violation_types = ["180_rule", "jump_cut", "spatial_inconsistency", "temporal_break"]
    severities = ["low", "medium", "high", "critical"]
    
    return ContinuityViolation(
        violation_type=draw(st.sampled_from(violation_types)),
        severity=draw(st.sampled_from(severities)),
        description=draw(st.text(min_size=1, max_size=200)),
        timestamp_a=draw(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False)),
        timestamp_b=draw(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False)),
        suggested_fix=draw(st.text(min_size=1, max_size=200))
    )


@composite
def continuity_result_strategy(draw):
    """Generate valid ContinuityResult instances."""
    return ContinuityResult(
        passed=draw(st.booleans()),
        violations=draw(st.lists(continuity_violation_strategy(), max_size=10)),
        shot_a_id=draw(st.text(min_size=1, max_size=50)),
        shot_b_id=draw(st.text(min_size=1, max_size=50)),
        timestamp=draw(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False))
    )


@composite
def voice_segment_strategy(draw):
    """Generate valid VoiceSegment instances."""
    start = draw(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False))
    end = draw(st.floats(min_value=start, max_value=start + 100.0, allow_nan=False, allow_infinity=False))
    
    return VoiceSegment(
        start_time=start,
        end_time=end,
        confidence=draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)),
        rms_level=draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    )


@composite
def audio_keyframe_strategy(draw):
    """Generate valid AudioKeyframe instances."""
    curve_types = ["linear", "exponential", "logarithmic"]
    
    return AudioKeyframe(
        timestamp=draw(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False)),
        volume_db=draw(st.floats(min_value=-100.0, max_value=30.0, allow_nan=False, allow_infinity=False)),
        curve_type=draw(st.sampled_from(curve_types))
    )


@composite
def quality_issue_strategy(draw):
    """Generate valid QualityIssue instances."""
    issue_types = ["low_sharpness", "unnatural_motion", "metallic_voice", "audio_gap"]
    severities = ["low", "medium", "high", "critical"]
    
    return QualityIssue(
        issue_type=draw(st.sampled_from(issue_types)),
        severity=draw(st.sampled_from(severities)),
        description=draw(st.text(min_size=1, max_size=200)),
        timestamp=draw(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False)),
        frame_number=draw(st.one_of(st.none(), st.integers(min_value=0, max_value=10000))),
        metric_value=draw(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False)),
        threshold_value=draw(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False))
    )


@composite
def improvement_suggestion_strategy(draw):
    """Generate valid ImprovementSuggestion instances."""
    return ImprovementSuggestion(
        suggestion_id=draw(st.text(min_size=1, max_size=50)),
        priority=draw(st.integers(min_value=1, max_value=5)),
        action=draw(st.text(min_size=1, max_size=200)),
        parameters=draw(st.dictionaries(
            st.text(min_size=1, max_size=20),
            st.one_of(
                st.floats(allow_nan=False, allow_infinity=False, min_value=-1e100, max_value=1e100),
                st.integers(min_value=-1000000, max_value=1000000),
                st.text(max_size=50)
            ),
            max_size=5
        )),
        expected_improvement=draw(st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)),
        related_issue_ids=draw(st.lists(st.text(min_size=1, max_size=50), max_size=5))
    )


@composite
def quality_score_strategy(draw):
    """Generate valid QualityScore instances."""
    return QualityScore(
        overall_score=draw(st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)),
        sharpness_score=draw(st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)),
        motion_score=draw(st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)),
        audio_score=draw(st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)),
        continuity_score=draw(st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)),
        issues=draw(st.lists(quality_issue_strategy(), max_size=10)),
        suggestions=draw(st.lists(improvement_suggestion_strategy(), max_size=10))
    )


@composite
def quality_report_strategy(draw):
    """Generate valid QualityReport instances."""
    total = draw(st.integers(min_value=0, max_value=100))
    passed = draw(st.integers(min_value=0, max_value=total))
    
    return QualityReport(
        project_name=draw(st.text(min_size=1, max_size=100)),
        timestamp=draw(st.text(min_size=1, max_size=50)),
        total_shots=total,
        passed_shots=passed,
        failed_shots=total - passed,
        average_quality_score=draw(st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False)),
        shot_scores=draw(st.lists(quality_score_strategy(), max_size=10)),
        continuity_results=draw(st.lists(continuity_result_strategy(), max_size=10)),
        audio_analysis=draw(st.dictionaries(
            st.text(min_size=1, max_size=20),
            st.one_of(
                st.floats(allow_nan=False, allow_infinity=False, min_value=-1e100, max_value=1e100),
                st.integers(min_value=-1000000, max_value=1000000),
                st.text(max_size=50)
            ),
            max_size=5
        )),
        aggregate_stats=draw(st.dictionaries(
            st.text(min_size=1, max_size=20),
            st.one_of(
                st.floats(allow_nan=False, allow_infinity=False, min_value=-1e100, max_value=1e100),
                st.integers(min_value=-1000000, max_value=1000000),
                st.text(max_size=50)
            ),
            max_size=5
        )),
        visualizations=draw(st.dictionaries(
            st.text(min_size=1, max_size=20),
            st.text(max_size=100),
            max_size=5
        ))
    )


# Property 27: Quality Data Serialization
# Validates: Requirements 9.1, 9.3

@given(violation=continuity_violation_strategy())
@settings(max_examples=50)
def test_continuity_violation_serialization(violation):
    """
    Feature: professional-video-audio-quality
    Property 27: For any quality data object, serialization to JSON should 
    conform to Data_Contract_v1 schema, and the pretty printer should produce 
    valid human-readable JSON.
    
    Validates: Requirements 9.1, 9.3
    """
    # Serialize to dict
    data = violation.to_dict()
    
    # Should be a valid dictionary
    assert isinstance(data, dict)
    
    # Should contain all required fields
    assert "type" in data
    assert "severity" in data
    assert "description" in data
    assert "timestamp_a" in data
    assert "timestamp_b" in data
    assert "suggested_fix" in data
    
    # Should be JSON serializable (pretty printer test)
    json_str = json.dumps(data, indent=2)
    assert isinstance(json_str, str)
    
    # Should be valid JSON
    parsed = json.loads(json_str)
    assert parsed == data


@given(result=continuity_result_strategy())
@settings(max_examples=50)
def test_continuity_result_serialization(result):
    """
    Feature: professional-video-audio-quality
    Property 27: For any quality data object, serialization to JSON should 
    conform to Data_Contract_v1 schema.
    
    Validates: Requirements 9.1, 9.3
    """
    data = result.to_dict()
    
    assert isinstance(data, dict)
    assert "passed" in data
    assert "violations" in data
    assert "shot_a_id" in data
    assert "shot_b_id" in data
    assert "timestamp" in data
    assert isinstance(data["violations"], list)
    
    # Should be JSON serializable
    json_str = json.dumps(data, indent=2)
    parsed = json.loads(json_str)
    assert parsed == data


@given(segment=voice_segment_strategy())
@settings(max_examples=50)
def test_voice_segment_serialization(segment):
    """
    Feature: professional-video-audio-quality
    Property 27: For any quality data object, serialization to JSON should 
    conform to Data_Contract_v1 schema.
    
    Validates: Requirements 9.1, 9.3
    """
    data = segment.to_dict()
    
    assert isinstance(data, dict)
    assert "start_time" in data
    assert "end_time" in data
    assert "confidence" in data
    assert "rms_level" in data
    assert "duration" in data
    
    # Duration should be calculated correctly
    assert data["duration"] == segment.duration
    
    # Should be JSON serializable
    json_str = json.dumps(data, indent=2)
    parsed = json.loads(json_str)
    assert parsed == data


@given(keyframe=audio_keyframe_strategy())
@settings(max_examples=50)
def test_audio_keyframe_serialization(keyframe):
    """
    Feature: professional-video-audio-quality
    Property 27: For any quality data object, serialization to JSON should 
    conform to Data_Contract_v1 schema.
    
    Validates: Requirements 9.1, 9.3
    """
    data = keyframe.to_dict()
    
    assert isinstance(data, dict)
    assert "timestamp" in data
    assert "volume_db" in data
    assert "curve_type" in data
    
    # Should be JSON serializable
    json_str = json.dumps(data, indent=2)
    parsed = json.loads(json_str)
    assert parsed == data


@given(issue=quality_issue_strategy())
@settings(max_examples=50)
def test_quality_issue_serialization(issue):
    """
    Feature: professional-video-audio-quality
    Property 27: For any quality data object, serialization to JSON should 
    conform to Data_Contract_v1 schema.
    
    Validates: Requirements 9.1, 9.3
    """
    data = issue.to_dict()
    
    assert isinstance(data, dict)
    assert "type" in data
    assert "severity" in data
    assert "description" in data
    assert "timestamp" in data
    assert "frame_number" in data
    assert "metric_value" in data
    assert "threshold_value" in data
    
    # Should be JSON serializable
    json_str = json.dumps(data, indent=2)
    parsed = json.loads(json_str)
    assert parsed == data


@given(suggestion=improvement_suggestion_strategy())
@settings(max_examples=50)
def test_improvement_suggestion_serialization(suggestion):
    """
    Feature: professional-video-audio-quality
    Property 27: For any quality data object, serialization to JSON should 
    conform to Data_Contract_v1 schema.
    
    Validates: Requirements 9.1, 9.3
    """
    data = suggestion.to_dict()
    
    assert isinstance(data, dict)
    assert "id" in data
    assert "priority" in data
    assert "action" in data
    assert "parameters" in data
    assert "expected_improvement" in data
    assert "related_issues" in data
    
    # Should be JSON serializable
    json_str = json.dumps(data, indent=2)
    parsed = json.loads(json_str)
    assert parsed == data


@given(score=quality_score_strategy())
@settings(max_examples=50)
def test_quality_score_serialization(score):
    """
    Feature: professional-video-audio-quality
    Property 27: For any quality data object, serialization to JSON should 
    conform to Data_Contract_v1 schema.
    
    Validates: Requirements 9.1, 9.3
    """
    data = score.to_dict()
    
    assert isinstance(data, dict)
    assert "overall_score" in data
    assert "sharpness_score" in data
    assert "motion_score" in data
    assert "audio_score" in data
    assert "continuity_score" in data
    assert "passed" in data
    assert "issues" in data
    assert "suggestions" in data
    
    # Should be JSON serializable
    json_str = score.to_json()
    parsed = json.loads(json_str)
    assert parsed == data


@given(report=quality_report_strategy())
@settings(max_examples=50)
def test_quality_report_serialization(report):
    """
    Feature: professional-video-audio-quality
    Property 27: For any quality data object, serialization to JSON should 
    conform to Data_Contract_v1 schema.
    
    Validates: Requirements 9.1, 9.3
    """
    data = report.to_dict()
    
    assert isinstance(data, dict)
    assert "project_name" in data
    assert "timestamp" in data
    assert "total_shots" in data
    assert "passed_shots" in data
    assert "failed_shots" in data
    assert "average_quality_score" in data
    assert "shot_scores" in data
    assert "continuity_results" in data
    assert "audio_analysis" in data
    assert "aggregate_stats" in data
    assert "visualizations" in data
    
    # Should be JSON serializable
    json_str = report.to_json()
    parsed = json.loads(json_str)
    assert parsed == data


# Property 29: Serialization Round-Trip
# Validates: Requirements 9.4

@given(violation=continuity_violation_strategy())
@settings(max_examples=50)
def test_continuity_violation_round_trip(violation):
    """
    Feature: professional-video-audio-quality
    Property 29: For any valid quality data object, serializing then 
    deserializing should produce an equivalent object (parse(serialize(x)) == x).
    
    Validates: Requirements 9.4
    """
    # Serialize
    data = violation.to_dict()
    
    # Deserialize
    restored = ContinuityViolation.from_dict(data)
    
    # Should be equivalent
    assert restored == violation


@given(result=continuity_result_strategy())
@settings(max_examples=50)
def test_continuity_result_round_trip(result):
    """
    Feature: professional-video-audio-quality
    Property 29: For any valid quality data object, serializing then 
    deserializing should produce an equivalent object.
    
    Validates: Requirements 9.4
    """
    data = result.to_dict()
    restored = ContinuityResult.from_dict(data)
    assert restored == result


@given(segment=voice_segment_strategy())
@settings(max_examples=50)
def test_voice_segment_round_trip(segment):
    """
    Feature: professional-video-audio-quality
    Property 29: For any valid quality data object, serializing then 
    deserializing should produce an equivalent object.
    
    Validates: Requirements 9.4
    """
    data = segment.to_dict()
    restored = VoiceSegment.from_dict(data)
    assert restored == segment


@given(keyframe=audio_keyframe_strategy())
@settings(max_examples=50)
def test_audio_keyframe_round_trip(keyframe):
    """
    Feature: professional-video-audio-quality
    Property 29: For any valid quality data object, serializing then 
    deserializing should produce an equivalent object.
    
    Validates: Requirements 9.4
    """
    data = keyframe.to_dict()
    restored = AudioKeyframe.from_dict(data)
    assert restored == keyframe


@given(issue=quality_issue_strategy())
@settings(max_examples=50)
def test_quality_issue_round_trip(issue):
    """
    Feature: professional-video-audio-quality
    Property 29: For any valid quality data object, serializing then 
    deserializing should produce an equivalent object.
    
    Validates: Requirements 9.4
    """
    data = issue.to_dict()
    restored = QualityIssue.from_dict(data)
    assert restored == issue


@given(suggestion=improvement_suggestion_strategy())
@settings(max_examples=50)
def test_improvement_suggestion_round_trip(suggestion):
    """
    Feature: professional-video-audio-quality
    Property 29: For any valid quality data object, serializing then 
    deserializing should produce an equivalent object.
    
    Validates: Requirements 9.4
    """
    data = suggestion.to_dict()
    restored = ImprovementSuggestion.from_dict(data)
    assert restored == suggestion


@given(score=quality_score_strategy())
@settings(max_examples=50)
def test_quality_score_round_trip(score):
    """
    Feature: professional-video-audio-quality
    Property 29: For any valid quality data object, serializing then 
    deserializing should produce an equivalent object.
    
    Validates: Requirements 9.4
    """
    # Test dict round-trip
    data = score.to_dict()
    restored = QualityScore.from_dict(data)
    assert restored == score
    
    # Test JSON round-trip
    json_str = score.to_json()
    restored_from_json = QualityScore.from_json(json_str)
    assert restored_from_json == score


@given(report=quality_report_strategy())
@settings(max_examples=50)
def test_quality_report_round_trip(report):
    """
    Feature: professional-video-audio-quality
    Property 29: For any valid quality data object, serializing then 
    deserializing should produce an equivalent object.
    
    Validates: Requirements 9.4
    """
    # Test dict round-trip
    data = report.to_dict()
    restored = QualityReport.from_dict(data)
    assert restored == report
    
    # Test JSON round-trip
    json_str = report.to_json()
    restored_from_json = QualityReport.from_json(json_str)
    assert restored_from_json == report
