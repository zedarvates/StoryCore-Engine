"""
Unit tests for quality data models.

These tests verify specific examples and edge cases for the data models.
"""

import json
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


class TestContinuityViolation:
    """Test ContinuityViolation edge cases."""
    
    def test_empty_description(self):
        """Test violation with empty description."""
        violation = ContinuityViolation(
            violation_type="180_rule",
            severity="high",
            description="",
            timestamp_a=1.0,
            timestamp_b=2.0,
            suggested_fix="Adjust camera angle"
        )
        
        data = violation.to_dict()
        assert data["description"] == ""
        
        # Should round-trip correctly
        restored = ContinuityViolation.from_dict(data)
        assert restored == violation
    
    def test_zero_timestamps(self):
        """Test violation with zero timestamps."""
        violation = ContinuityViolation(
            violation_type="jump_cut",
            severity="low",
            description="Test",
            timestamp_a=0.0,
            timestamp_b=0.0,
            suggested_fix="Fix"
        )
        
        assert violation.timestamp_a == 0.0
        assert violation.timestamp_b == 0.0


class TestContinuityResult:
    """Test ContinuityResult edge cases."""
    
    def test_empty_violations_list(self):
        """Test result with no violations (passed)."""
        result = ContinuityResult(
            passed=True,
            violations=[],
            shot_a_id="shot_001",
            shot_b_id="shot_002",
            timestamp=5.0
        )
        
        assert result.passed
        assert len(result.violations) == 0
        
        data = result.to_dict()
        assert data["violations"] == []
        
        restored = ContinuityResult.from_dict(data)
        assert restored == result
    
    def test_multiple_violations(self):
        """Test result with multiple violations."""
        violations = [
            ContinuityViolation("180_rule", "high", "Test 1", 1.0, 2.0, "Fix 1"),
            ContinuityViolation("jump_cut", "medium", "Test 2", 2.0, 3.0, "Fix 2"),
            ContinuityViolation("spatial_inconsistency", "low", "Test 3", 3.0, 4.0, "Fix 3")
        ]
        
        result = ContinuityResult(
            passed=False,
            violations=violations,
            shot_a_id="shot_001",
            shot_b_id="shot_002",
            timestamp=5.0
        )
        
        assert not result.passed
        assert len(result.violations) == 3
        
        data = result.to_dict()
        assert len(data["violations"]) == 3


class TestVoiceSegment:
    """Test VoiceSegment edge cases."""
    
    def test_zero_duration(self):
        """Test voice segment with zero duration."""
        segment = VoiceSegment(
            start_time=5.0,
            end_time=5.0,
            confidence=0.9,
            rms_level=0.5
        )
        
        assert segment.duration == 0.0
        
        data = segment.to_dict()
        assert data["duration"] == 0.0
    
    def test_zero_confidence(self):
        """Test voice segment with zero confidence."""
        segment = VoiceSegment(
            start_time=0.0,
            end_time=1.0,
            confidence=0.0,
            rms_level=0.1
        )
        
        assert segment.confidence == 0.0
        assert segment.duration == 1.0
    
    def test_max_confidence(self):
        """Test voice segment with maximum confidence."""
        segment = VoiceSegment(
            start_time=0.0,
            end_time=10.0,
            confidence=1.0,
            rms_level=0.8
        )
        
        assert segment.confidence == 1.0
        assert segment.duration == 10.0


class TestAudioKeyframe:
    """Test AudioKeyframe edge cases."""
    
    def test_minimum_volume(self):
        """Test keyframe with minimum volume."""
        keyframe = AudioKeyframe(
            timestamp=1.0,
            volume_db=-100.0,
            curve_type="linear"
        )
        
        assert keyframe.volume_db == -100.0
        
        data = keyframe.to_dict()
        assert data["volume_db"] == -100.0
    
    def test_maximum_volume(self):
        """Test keyframe with maximum volume."""
        keyframe = AudioKeyframe(
            timestamp=1.0,
            volume_db=30.0,
            curve_type="exponential"
        )
        
        assert keyframe.volume_db == 30.0
    
    def test_zero_timestamp(self):
        """Test keyframe at time zero."""
        keyframe = AudioKeyframe(
            timestamp=0.0,
            volume_db=0.0,
            curve_type="logarithmic"
        )
        
        assert keyframe.timestamp == 0.0


class TestQualityIssue:
    """Test QualityIssue edge cases."""
    
    def test_missing_frame_number(self):
        """Test issue without frame number (audio issue)."""
        issue = QualityIssue(
            issue_type="audio_gap",
            severity="medium",
            description="Gap detected",
            timestamp=5.0,
            frame_number=None,
            metric_value=150.0,
            threshold_value=100.0
        )
        
        assert issue.frame_number is None
        
        data = issue.to_dict()
        assert data["frame_number"] is None
        
        restored = QualityIssue.from_dict(data)
        assert restored == issue
    
    def test_zero_metric_value(self):
        """Test issue with zero metric value."""
        issue = QualityIssue(
            issue_type="low_sharpness",
            severity="critical",
            description="Completely blurry",
            timestamp=10.0,
            frame_number=300,
            metric_value=0.0,
            threshold_value=100.0
        )
        
        assert issue.metric_value == 0.0
        assert issue.threshold_value == 100.0


class TestImprovementSuggestion:
    """Test ImprovementSuggestion edge cases."""
    
    def test_empty_parameters(self):
        """Test suggestion with no parameters."""
        suggestion = ImprovementSuggestion(
            suggestion_id="sug_001",
            priority=1,
            action="Review manually",
            parameters={},
            expected_improvement=5.0,
            related_issue_ids=[]
        )
        
        assert len(suggestion.parameters) == 0
        assert len(suggestion.related_issue_ids) == 0
        
        data = suggestion.to_dict()
        assert data["parameters"] == {}
        assert data["related_issues"] == []
    
    def test_zero_expected_improvement(self):
        """Test suggestion with zero expected improvement."""
        suggestion = ImprovementSuggestion(
            suggestion_id="sug_002",
            priority=5,
            action="Minor adjustment",
            parameters={"param1": 1.0},
            expected_improvement=0.0,
            related_issue_ids=["issue_001"]
        )
        
        assert suggestion.expected_improvement == 0.0
    
    def test_multiple_related_issues(self):
        """Test suggestion related to multiple issues."""
        suggestion = ImprovementSuggestion(
            suggestion_id="sug_003",
            priority=1,
            action="Major fix",
            parameters={"param1": 10.0, "param2": 20.0},
            expected_improvement=50.0,
            related_issue_ids=["issue_001", "issue_002", "issue_003"]
        )
        
        assert len(suggestion.related_issue_ids) == 3


class TestQualityScore:
    """Test QualityScore edge cases."""
    
    def test_zero_scores(self):
        """Test quality score with all zeros."""
        score = QualityScore(
            overall_score=0.0,
            sharpness_score=0.0,
            motion_score=0.0,
            audio_score=0.0,
            continuity_score=0.0,
            issues=[],
            suggestions=[]
        )
        
        assert score.overall_score == 0.0
        assert not score.passed()  # Should fail with default threshold (70.0)
        assert score.passed(threshold=0.0)  # Should pass with 0 threshold (>= comparison)
    
    def test_perfect_scores(self):
        """Test quality score with perfect 100s."""
        score = QualityScore(
            overall_score=100.0,
            sharpness_score=100.0,
            motion_score=100.0,
            audio_score=100.0,
            continuity_score=100.0,
            issues=[],
            suggestions=[]
        )
        
        assert score.overall_score == 100.0
        assert score.passed()
        assert score.passed(threshold=100.0)
    
    def test_threshold_boundary(self):
        """Test quality score at threshold boundary."""
        score = QualityScore(
            overall_score=70.0,
            sharpness_score=70.0,
            motion_score=70.0,
            audio_score=70.0,
            continuity_score=70.0,
            issues=[],
            suggestions=[]
        )
        
        assert score.passed(threshold=70.0)  # Exactly at threshold
        assert not score.passed(threshold=70.1)  # Just below threshold
    
    def test_empty_issues_and_suggestions(self):
        """Test quality score with no issues or suggestions."""
        score = QualityScore(
            overall_score=85.0,
            sharpness_score=80.0,
            motion_score=90.0,
            audio_score=85.0,
            continuity_score=85.0,
            issues=[],
            suggestions=[]
        )
        
        assert len(score.issues) == 0
        assert len(score.suggestions) == 0
        assert score.passed()
    
    def test_json_serialization(self):
        """Test JSON serialization of quality score."""
        score = QualityScore(
            overall_score=75.0,
            sharpness_score=70.0,
            motion_score=80.0,
            audio_score=75.0,
            continuity_score=75.0,
            issues=[],
            suggestions=[]
        )
        
        json_str = score.to_json()
        assert isinstance(json_str, str)
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        assert parsed["overall_score"] == 75.0
        assert parsed["passed"] is True


class TestQualityReport:
    """Test QualityReport edge cases."""
    
    def test_empty_report(self):
        """Test report with no shots."""
        report = QualityReport(
            project_name="test_project",
            timestamp="2024-01-01T00:00:00",
            total_shots=0,
            passed_shots=0,
            failed_shots=0,
            average_quality_score=0.0,
            shot_scores=[],
            continuity_results=[],
            audio_analysis={},
            aggregate_stats={},
            visualizations={}
        )
        
        assert report.total_shots == 0
        assert len(report.shot_scores) == 0
        assert len(report.continuity_results) == 0
    
    def test_all_passed(self):
        """Test report where all shots passed."""
        report = QualityReport(
            project_name="test_project",
            timestamp="2024-01-01T00:00:00",
            total_shots=10,
            passed_shots=10,
            failed_shots=0,
            average_quality_score=85.0,
            shot_scores=[],
            continuity_results=[],
            audio_analysis={},
            aggregate_stats={},
            visualizations={}
        )
        
        assert report.passed_shots == report.total_shots
        assert report.failed_shots == 0
    
    def test_all_failed(self):
        """Test report where all shots failed."""
        report = QualityReport(
            project_name="test_project",
            timestamp="2024-01-01T00:00:00",
            total_shots=10,
            passed_shots=0,
            failed_shots=10,
            average_quality_score=45.0,
            shot_scores=[],
            continuity_results=[],
            audio_analysis={},
            aggregate_stats={},
            visualizations={}
        )
        
        assert report.passed_shots == 0
        assert report.failed_shots == report.total_shots
    
    def test_json_serialization(self):
        """Test JSON serialization of quality report."""
        report = QualityReport(
            project_name="test_project",
            timestamp="2024-01-01T00:00:00",
            total_shots=5,
            passed_shots=3,
            failed_shots=2,
            average_quality_score=72.5,
            shot_scores=[],
            continuity_results=[],
            audio_analysis={"total_duration": 27.0},
            aggregate_stats={"avg_sharpness": 85.0},
            visualizations={"chart1": "/path/to/chart.png"}
        )
        
        json_str = report.to_json()
        assert isinstance(json_str, str)
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        assert parsed["project_name"] == "test_project"
        assert parsed["total_shots"] == 5
        assert parsed["audio_analysis"]["total_duration"] == 27.0
    
    def test_html_generation(self):
        """Test HTML report generation."""
        report = QualityReport(
            project_name="test_project",
            timestamp="2024-01-01T00:00:00",
            total_shots=5,
            passed_shots=4,
            failed_shots=1,
            average_quality_score=78.5,
            shot_scores=[],
            continuity_results=[],
            audio_analysis={},
            aggregate_stats={},
            visualizations={}
        )
        
        html = report.to_html()
        assert isinstance(html, str)
        assert "<!DOCTYPE html>" in html
        assert "test_project" in html
        assert "78.5" in html
        assert "4/5" in html
