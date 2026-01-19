# Property-based tests for Quality Feedback System.
# Tests universal properties that should hold for quality feedback components.

import pytest
import numpy as np
from pathlib import Path
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from quality_feedback import QualityFeedback, IssueReport, SuggestionWithImpact, ImprovementTracking
from quality_validator import QualityIssue, ImprovementSuggestion, QualityScore


@composite
def quality_issue(draw):
    """Generate random QualityIssue for testing."""
    issue_type = draw(st.sampled_from(["low_sharpness", "unnatural_motion", "metallic_voice", "audio_gap"]))
    severity = draw(st.sampled_from(["low", "medium", "high", "critical"]))
    description = draw(st.text(min_size=10, max_size=100))
    timestamp = draw(st.floats(min_value=0.0, max_value=10.0))
    frame_number = draw(st.one_of(st.none(), st.integers(min_value=0, max_value=300)))
    metric_value = draw(st.floats(min_value=0.0, max_value=100.0))
    threshold_value = draw(st.floats(min_value=0.0, max_value=100.0))

    return QualityIssue(
        issue_type=issue_type,
        severity=severity,
        description=description,
        timestamp=timestamp,
        frame_number=frame_number,
        metric_value=metric_value,
        threshold_value=threshold_value
    )


@composite
def improvement_suggestion(draw):
    """Generate random ImprovementSuggestion for testing."""
    suggestion_id = draw(st.text(min_size=5, max_size=20))
    priority = draw(st.integers(min_value=1, max_value=5))
    action = draw(st.text(min_size=10, max_size=50))
    parameters = draw(st.dictionaries(
        keys=st.text(min_size=3, max_size=10),
        values=st.one_of(st.floats(), st.integers(), st.text())
    ))
    expected_improvement = draw(st.floats(min_value=0.0, max_value=50.0))
    related_issue_ids = draw(st.lists(st.text(min_size=5, max_size=20), min_size=0, max_size=5))

    return ImprovementSuggestion(
        suggestion_id=suggestion_id,
        priority=priority,
        action=action,
        parameters=parameters,
        expected_improvement=expected_improvement,
        related_issue_ids=related_issue_ids
    )


@composite
def corrective_actions(draw):
    """Generate list of corrective actions."""
    num_actions = draw(st.integers(min_value=1, max_value=3))
    actions = []
    for _ in range(num_actions):
        action = {
            "action": draw(st.text(min_size=10, max_size=50)),
            "parameters": draw(st.dictionaries(
                keys=st.text(min_size=3, max_size=10),
                values=st.one_of(st.floats(), st.integers(), st.text())
            )),
            "expected_impact": draw(st.floats(min_value=0.0, max_value=100.0))
        }
        actions.append(action)
    return actions


@composite
def parameter_adjustments(draw):
    """Generate parameter adjustments dict."""
    return draw(st.dictionaries(
        keys=st.text(min_size=3, max_size=10),
        values=st.one_of(st.floats(min_value=-1.0, max_value=1.0), st.integers(min_value=-10, max_value=10)),
        min_size=1,
        max_size=5
    ))


@composite
def quality_score(draw):
    """Generate random QualityScore for testing."""
    overall = draw(st.floats(min_value=0.0, max_value=100.0))
    sharpness = draw(st.floats(min_value=0.0, max_value=100.0))
    motion = draw(st.floats(min_value=0.0, max_value=100.0))
    audio = draw(st.floats(min_value=0.0, max_value=100.0))
    continuity = draw(st.floats(min_value=0.0, max_value=100.0))

    num_issues = draw(st.integers(min_value=0, max_value=3))
    issues = [draw(quality_issue()) for _ in range(num_issues)]

    num_suggestions = draw(st.integers(min_value=0, max_value=3))
    suggestions = [draw(improvement_suggestion()) for _ in range(num_suggestions)]

    return QualityScore(
        overall_score=overall,
        sharpness_score=sharpness,
        motion_score=motion,
        audio_score=audio,
        continuity_score=continuity,
        issues=issues,
        suggestions=suggestions
    )


class TestQualityFeedbackProperties:
    """Property-based tests for Quality Feedback System."""

    @given(quality_issue(), corrective_actions(), parameter_adjustments())
    @settings(max_examples=10, deadline=2000)
    def test_property_18_issue_reporting_completeness(self, issue, actions, adjustments):
        """
        Property 18: Issue Reporting Completeness
        For any quality issue, issue reporting should include timestamps, frame numbers,
        and parameter adjustments with complete corrective actions.
        Validates: Requirements 6.1, 6.3, 6.4
        """
        feedback = QualityFeedback()

        # Generate issue report
        report = feedback.generate_issue_report(issue, actions, adjustments)

        # Verify report structure
        assert isinstance(report, IssueReport), "Should return IssueReport object"
        assert report.issue == issue, "Issue should be preserved"
        assert report.corrective_actions == actions, "Corrective actions should be preserved"
        assert report.timestamp == issue.timestamp, "Timestamp should match issue timestamp"
        assert report.frame_number == issue.frame_number, "Frame number should match issue frame number"
        assert report.parameter_adjustments == adjustments, "Parameter adjustments should be preserved"

        # Verify serialization
        report_dict = report.to_dict()
        assert 'issue' in report_dict, "Serialized report should contain issue"
        assert 'corrective_actions' in report_dict, "Serialized report should contain corrective_actions"
        assert 'timestamp' in report_dict, "Serialized report should contain timestamp"
        assert 'frame_number' in report_dict, "Serialized report should contain frame_number"
        assert 'parameter_adjustments' in report_dict, "Serialized report should contain parameter_adjustments"

        # Verify corrective actions structure
        for action in actions:
            assert 'action' in action, "Each corrective action should have 'action'"
            assert 'parameters' in action, "Each corrective action should have 'parameters'"
            assert 'expected_impact' in action, "Each corrective action should have 'expected_impact'"
            assert isinstance(action['expected_impact'], float), "Expected impact should be float"
            assert 0.0 <= action['expected_impact'] <= 100.0, "Expected impact should be 0-100"

    @given(st.lists(improvement_suggestion(), min_size=1, max_size=5))
    @settings(max_examples=10, deadline=2000)
    def test_property_19_suggestion_prioritization(self, suggestions):
        """
        Property 19: Suggestion Prioritization
        For any list of suggestions, prioritization should be based on viewer impact
        with higher impact suggestions ranked first.
        Validates: Requirements 6.2
        """
        feedback = QualityFeedback()

        # Prioritize suggestions
        prioritized = feedback.prioritize_suggestions(suggestions)

        # Verify structure
        assert len(prioritized) == len(suggestions), "Should return same number of suggestions"
        for item in prioritized:
            assert isinstance(item, SuggestionWithImpact), "Should return SuggestionWithImpact objects"
            assert hasattr(item, 'suggestion'), "Should have suggestion attribute"
            assert hasattr(item, 'viewer_impact_score'), "Should have viewer_impact_score attribute"
            assert 0.0 <= item.viewer_impact_score <= 100.0, "Impact score should be 0-100"

        # Verify sorting by impact (descending)
        for i in range(len(prioritized) - 1):
            assert prioritized[i].viewer_impact_score >= prioritized[i + 1].viewer_impact_score, \
                "Suggestions should be sorted by impact score descending"

        # Verify serialization
        for item in prioritized:
            item_dict = item.to_dict()
            assert 'suggestion' in item_dict, "Serialized item should contain suggestion"
            assert 'viewer_impact_score' in item_dict, "Serialized item should contain viewer_impact_score"

    @given(quality_score(), quality_score(), st.lists(st.text(min_size=5, max_size=20), min_size=0, max_size=3), st.floats(min_value=0.0, max_value=10.0))
    @settings(max_examples=10, deadline=2000)
    def test_property_20_suggestion_tracking(self, initial_score, current_score, applied_ids, tracked_at):
        """
        Property 20: Suggestion Tracking
        For any initial and current quality scores, improvement tracking should
        measure delta in quality scores accurately.
        Validates: Requirements 6.5
        """
        feedback = QualityFeedback()

        # Track improvement
        tracking = feedback.track_improvement(initial_score, current_score, applied_ids, tracked_at)

        # Verify structure
        assert isinstance(tracking, ImprovementTracking), "Should return ImprovementTracking object"
        assert tracking.initial_score == initial_score.overall_score, "Initial score should match"
        assert tracking.current_score == current_score.overall_score, "Current score should match"
        assert tracking.delta == current_score.overall_score - initial_score.overall_score, "Delta should be calculated correctly"
        assert tracking.applied_suggestions == applied_ids, "Applied suggestions should be preserved"
        assert tracking.tracked_at == tracked_at, "Tracked at should match"

        # Verify delta calculation
        expected_delta = current_score.overall_score - initial_score.overall_score
        assert tracking.delta == expected_delta, f"Delta calculation incorrect: expected {expected_delta}, got {tracking.delta}"

        # Verify serialization
        tracking_dict = tracking.to_dict()
        assert 'initial_score' in tracking_dict, "Serialized tracking should contain initial_score"
        assert 'current_score' in tracking_dict, "Serialized tracking should contain current_score"
        assert 'delta' in tracking_dict, "Serialized tracking should contain delta"
        assert 'applied_suggestions' in tracking_dict, "Serialized tracking should contain applied_suggestions"
        assert 'tracked_at' in tracking_dict, "Serialized tracking should contain tracked_at"


def test_quality_feedback_basic_functionality():
    """Test basic functionality of quality feedback system."""
    feedback = QualityFeedback()

    # Create test data
    issue = QualityIssue(
        issue_type="low_sharpness",
        severity="medium",
        description="Sharpness below threshold",
        timestamp=1.5,
        frame_number=45,
        metric_value=50.0,
        threshold_value=60.0
    )

    actions = [
        {
            "action": "Increase sharpness parameter",
            "parameters": {"sharpness_boost": 0.2},
            "expected_impact": 15.0
        }
    ]

    adjustments = {"sharpness": 0.2, "contrast": 0.1}

    # Test issue reporting
    report = feedback.generate_issue_report(issue, actions, adjustments)
    assert isinstance(report, IssueReport)
    assert report.timestamp == 1.5
    assert report.frame_number == 45

    # Test prioritization
    suggestions = [
        ImprovementSuggestion(
            suggestion_id="sharp1",
            priority=1,
            action="Boost sharpness",
            parameters={"sharpness": 0.3},
            expected_improvement=20.0,
            related_issue_ids=["low_sharpness"]
        ),
        ImprovementSuggestion(
            suggestion_id="sharp2",
            priority=3,
            action="Minor sharpness adjustment",
            parameters={"sharpness": 0.1},
            expected_improvement=5.0,
            related_issue_ids=["low_sharpness"]
        )
    ]

    prioritized = feedback.prioritize_suggestions(suggestions)
    assert len(prioritized) == 2
    assert prioritized[0].viewer_impact_score >= prioritized[1].viewer_impact_score

    # Test tracking
    initial = QualityScore(60.0, 50.0, 70.0, 80.0, 90.0, [], [])
    current = QualityScore(75.0, 65.0, 70.0, 80.0, 90.0, [], [])
    applied = ["sharp1"]

    tracking = feedback.track_improvement(initial, current, applied, 2.0)
    assert tracking.delta == 15.0
    assert tracking.applied_suggestions == applied

    print("✓ Quality feedback basic tests passed")


if __name__ == "__main__":
    # Run basic functionality test
    test_quality_feedback_basic_functionality()

    # Run a few property tests manually for verification
    test_instance = TestQualityFeedbackProperties()

    print("Quality feedback property tests ready for execution")