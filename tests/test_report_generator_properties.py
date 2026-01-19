#!/usr/bin/env python3
"""
Property-based tests for Report Generator.
Tests universal properties that should hold for report generation and visualization.
"""

import pytest
import numpy as np
from pathlib import Path
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from quality_validator import QualityScore, QualityIssue, ImprovementSuggestion
from report_generator import (
    JSONReportGenerator,
    AutofixComparisonGenerator,
    VisualizationGenerator,
    HTMLReportGenerator,
    AutofixComparison
)


# Strategy generators for property-based testing
@composite
def valid_quality_issue(draw):
    """Generate valid quality issues."""
    issue_type = draw(st.sampled_from([
        "low_sharpness", "unnatural_motion", "metallic_voice",
        "audio_gap", "sudden_change", "low_contrast"
    ]))
    severity = draw(st.sampled_from(["low", "medium", "high", "critical"]))
    description = draw(st.text(min_size=10, max_size=100))
    timestamp = draw(st.floats(min_value=0.0, max_value=3600.0))  # up to 1 hour
    frame_number = draw(st.one_of(st.none(), st.integers(min_value=0, max_value=10000)))
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
def valid_improvement_suggestion(draw):
    """Generate valid improvement suggestions."""
    suggestion_id = draw(st.text(min_size=5, max_size=20, alphabet=st.characters(whitelist_categories=('L', 'N', 'P'))))
    priority = draw(st.integers(min_value=1, max_value=5))
    action = draw(st.text(min_size=10, max_size=100))
    parameters = draw(st.dictionaries(
        keys=st.text(min_size=3, max_size=10),
        values=st.one_of(st.floats(), st.integers(), st.text(max_size=20))
    ))
    expected_improvement = draw(st.floats(min_value=0.0, max_value=50.0))
    related_issue_ids = draw(st.lists(st.text(min_size=3, max_size=15), min_size=0, max_size=5))

    return ImprovementSuggestion(
        suggestion_id=suggestion_id,
        priority=priority,
        action=action,
        parameters=parameters,
        expected_improvement=expected_improvement,
        related_issue_ids=related_issue_ids
    )


@composite
def valid_quality_score(draw):
    """Generate valid quality scores."""
    overall_score = draw(st.floats(min_value=0.0, max_value=100.0))
    sharpness_score = draw(st.floats(min_value=0.0, max_value=100.0))
    motion_score = draw(st.floats(min_value=0.0, max_value=100.0))
    audio_score = draw(st.floats(min_value=0.0, max_value=100.0))
    continuity_score = draw(st.floats(min_value=0.0, max_value=100.0))

    num_issues = draw(st.integers(min_value=0, max_value=10))
    issues = draw(st.lists(valid_quality_issue(), min_size=num_issues, max_size=num_issues))

    num_suggestions = draw(st.integers(min_value=0, max_value=5))
    suggestions = draw(st.lists(valid_improvement_suggestion(), min_size=num_suggestions, max_size=num_suggestions))

    return QualityScore(
        overall_score=overall_score,
        sharpness_score=sharpness_score,
        motion_score=motion_score,
        audio_score=audio_score,
        continuity_score=continuity_score,
        issues=issues,
        suggestions=suggestions
    )


@composite
def valid_autofix_comparison(draw):
    """Generate valid autofix comparisons."""
    shot_id = draw(st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('L', 'N', 'P'))))
    before_score = draw(valid_quality_score())
    after_score = draw(valid_quality_score())

    # Ensure improvement delta is calculated correctly
    improvement_delta = after_score.overall_score - before_score.overall_score

    applied_fixes = draw(st.lists(
        st.text(min_size=5, max_size=30),
        min_size=0, max_size=5
    ))
    timestamp = draw(st.floats(min_value=0.0, max_value=3600.0))

    return AutofixComparison(
        shot_id=shot_id,
        before_score=before_score,
        after_score=after_score,
        applied_fixes=applied_fixes,
        improvement_delta=improvement_delta,
        timestamp=timestamp
    )


class TestReportGeneratorProperties:
    """Property-based tests for Report Generators."""

    @given(st.lists(valid_quality_score(), min_size=1, max_size=20))
    @settings(max_examples=10, deadline=3000, suppress_health_check=[HealthCheck.data_too_large])
    def test_property_24_comprehensive_report_generation(self, quality_scores):
        """
        Property 24: Comprehensive Report Generation
        For any list of valid quality scores, comprehensive report generation should produce
        valid JSON with correct aggregate statistics, issue summaries, and suggestion summaries.
        Validates: Requirements 8.1, 8.2, 8.3
        """
        generator = JSONReportGenerator()
        project_name = "Test Project"

        # Generate report
        report_json = generator.generate_comprehensive_report(quality_scores, project_name)
        report_data = generator._parse_json_report(report_json)  # We'll need to add this helper

        # Verify report structure
        assert "report_type" in report_data
        assert report_data["report_type"] == "comprehensive_quality_validation"
        assert "project_name" in report_data
        assert report_data["project_name"] == project_name
        assert "generation_timestamp" in report_data
        assert "generation_datetime" in report_data
        assert "metrics" in report_data
        assert "quality_scores" in report_data
        assert "issues_summary" in report_data
        assert "suggestions_summary" in report_data

        # Verify metrics
        metrics = report_data["metrics"]
        assert "total_shots" in metrics
        assert metrics["total_shots"] == len(quality_scores)
        assert "average_overall_score" in metrics
        assert 0.0 <= metrics["average_overall_score"] <= 100.0
        assert "pass_rate" in metrics
        assert 0.0 <= metrics["pass_rate"] <= 100.0

        # Verify quality scores serialization
        assert len(report_data["quality_scores"]) == len(quality_scores)
        for score_data in report_data["quality_scores"]:
            assert "overall_score" in score_data
            assert "issues" in score_data
            assert "suggestions" in score_data

        # Verify issues summary
        issues_summary = report_data["issues_summary"]
        assert "by_type" in issues_summary
        assert "by_severity" in issues_summary
        assert "total_unique_types" in issues_summary

        # Verify suggestions summary
        suggestions_summary = report_data["suggestions_summary"]
        assert "by_priority" in suggestions_summary
        assert "total_expected_improvement" in suggestions_summary

    @given(st.lists(valid_autofix_comparison(), min_size=1, max_size=10))
    @settings(max_examples=8, deadline=3000)
    def test_property_25_autofix_comparison_generation(self, comparisons):
        """
        Property 25: Autofix Comparison Generation
        For any list of valid autofix comparisons, comparison report generation should produce
        valid JSON with accurate improvement calculations and comparison data.
        Validates: Requirements 8.4
        """
        generator = AutofixComparisonGenerator()
        project_name = "Test Project"

        # Generate report
        report_json = generator.generate_comparison_report(comparisons, project_name)
        report_data = generator._parse_json_report(report_json)  # We'll need to add this helper

        # Verify report structure
        assert "report_type" in report_data
        assert report_data["report_type"] == "autofix_comparison"
        assert "project_name" in report_data
        assert report_data["project_name"] == project_name
        assert "generation_timestamp" in report_data
        assert "summary" in report_data
        assert "comparisons" in report_data

        # Verify summary calculations
        summary = report_data["summary"]
        assert "total_comparisons" in summary
        assert summary["total_comparisons"] == len(comparisons)
        assert "total_improvement" in summary
        assert "average_improvement" in summary
        assert "successful_fixes" in summary
        assert "success_rate" in summary

        # Verify improvement calculations
        expected_total_improvement = sum(comp.improvement_delta for comp in comparisons)
        assert abs(summary["total_improvement"] - expected_total_improvement) < 0.01

        expected_successful = sum(1 for comp in comparisons if comp.improvement_delta > 0)
        assert summary["successful_fixes"] == expected_successful

        expected_success_rate = (expected_successful / len(comparisons) * 100) if comparisons else 0.0
        assert abs(summary["success_rate"] - expected_success_rate) < 0.01

        # Verify comparisons data
        assert len(report_data["comparisons"]) == len(comparisons)
        for comp_data in report_data["comparisons"]:
            assert "shot_id" in comp_data
            assert "before" in comp_data
            assert "after" in comp_data
            assert "applied_fixes" in comp_data
            assert "improvement_delta" in comp_data
            assert "timestamp" in comp_data

    @given(st.lists(valid_quality_score(), min_size=1, max_size=15))
    @settings(max_examples=5, deadline=5000)
    def test_property_26_visualization_generation(self, quality_scores):
        """
        Property 26: Visualization Generation
        For any list of valid quality scores, visualization generation should produce
        valid base64-encoded image data for quality trends charts.
        Validates: Requirements 8.5
        """
        generator = VisualizationGenerator()

        # Generate quality trends chart
        chart_data = generator.generate_quality_trends_chart(quality_scores)

        # Verify chart generation
        if quality_scores:  # Only test if we have scores
            assert chart_data.startswith("data:image/png;base64,")
            # Verify it's valid base64 (basic check)
            import base64
            base64_part = chart_data.split(",")[1]
            try:
                decoded = base64.b64decode(base64_part)
                assert len(decoded) > 0
            except Exception:
                pytest.fail("Generated chart is not valid base64 data")

        # Test with empty list
        empty_chart = generator.generate_quality_trends_chart([])
        assert empty_chart == ""

    @given(st.lists(valid_autofix_comparison(), min_size=1, max_size=10))
    @settings(max_examples=5, deadline=5000)
    def test_property_26_comparison_chart_generation(self, comparisons):
        """
        Property 26 (continued): Comparison Chart Generation
        For any list of valid autofix comparisons, comparison chart generation should produce
        valid base64-encoded image data.
        """
        generator = VisualizationGenerator()

        # Generate comparison chart
        chart_data = generator.generate_comparison_chart(comparisons)

        # Verify chart generation
        if comparisons:  # Only test if we have comparisons
            assert chart_data.startswith("data:image/png;base64,")
            # Verify it's valid base64 (basic check)
            import base64
            base64_part = chart_data.split(",")[1]
            try:
                decoded = base64.b64decode(base64_part)
                assert len(decoded) > 0
            except Exception:
                pytest.fail("Generated comparison chart is not valid base64 data")

        # Test with empty list
        empty_chart = generator.generate_comparison_chart([])
        assert empty_chart == ""

    @given(st.lists(valid_quality_score(), min_size=1, max_size=10))
    @settings(max_examples=5, deadline=5000)
    def test_property_24_html_report_generation(self, quality_scores):
        """
        Property 24 (continued): HTML Report Generation
        For any list of valid quality scores, HTML report generation should produce
        valid HTML with embedded visualizations and correct data.
        """
        generator = HTMLReportGenerator()
        project_name = "Test Project"

        # Generate HTML report
        html_report = generator.generate_comprehensive_report(quality_scores, project_name)

        # Verify HTML structure
        assert "<!DOCTYPE html>" in html_report
        assert "<html" in html_report
        assert "</html>" in html_report
        assert project_name in html_report
        assert "StoryCore Quality Validation Report" in html_report

        # Verify data inclusion
        for score in quality_scores:
            assert str(int(score.overall_score)) in html_report  # At least the integer part

        # Verify table structure
        assert "<table" in html_report
        assert "</table>" in html_report

    @given(st.lists(valid_autofix_comparison(), min_size=1, max_size=8))
    @settings(max_examples=5, deadline=5000)
    def test_property_25_html_comparison_report_generation(self, comparisons):
        """
        Property 25 (continued): HTML Comparison Report Generation
        For any list of valid autofix comparisons, HTML comparison report generation should produce
        valid HTML with comparison data and charts.
        """
        generator = HTMLReportGenerator()
        project_name = "Test Project"

        # Generate HTML report
        html_report = generator.generate_autofix_comparison_report(comparisons, project_name)

        # Verify HTML structure
        assert "<!DOCTYPE html>" in html_report
        assert "<html" in html_report
        assert "</html>" in html_report
        assert project_name in html_report
        assert "StoryCore Autofix Comparison Report" in html_report

        # Verify comparison data inclusion
        for comp in comparisons:
            assert comp.shot_id in html_report
            assert f"{comp.improvement_delta:+.1f}" in html_report

        # Verify table structure
        assert "<table" in html_report
        assert "</table>" in html_report


# Add helper methods to the generators for testing
def _parse_json_report(self, report_json):
    """Helper method to parse JSON report for testing."""
    import json
    return json.loads(report_json)

# Monkey patch the methods for testing
JSONReportGenerator._parse_json_report = _parse_json_report
AutofixComparisonGenerator._parse_json_report = _parse_json_report


def test_report_generator_basic_functionality():
    """Test basic functionality of report generators."""
    # Test JSON generator
    json_gen = JSONReportGenerator()
    scores = [
        QualityScore(
            overall_score=85.0,
            sharpness_score=90.0,
            motion_score=80.0,
            audio_score=85.0,
            continuity_score=90.0,
            issues=[],
            suggestions=[]
        )
    ]
    report = json_gen.generate_comprehensive_report(scores)
    assert isinstance(report, str)
    assert "comprehensive_quality_validation" in report

    # Test Autofix generator
    autofix_gen = AutofixComparisonGenerator()
    comparisons = [
        AutofixComparison(
            shot_id="shot1",
            before_score=QualityScore(70.0, 70.0, 70.0, 70.0, 70.0, [], []),
            after_score=QualityScore(85.0, 80.0, 85.0, 85.0, 85.0, [], []),
            applied_fixes=["sharpen_image", "fix_audio"],
            improvement_delta=15.0,
            timestamp=1000.0
        )
    ]
    report = autofix_gen.generate_comparison_report(comparisons)
    assert isinstance(report, str)
    assert "autofix_comparison" in report

    # Test Visualization generator
    viz_gen = VisualizationGenerator()
    chart = viz_gen.generate_quality_trends_chart(scores)
    assert isinstance(chart, str)
    if scores:
        assert chart.startswith("data:image/png;base64,")

    # Test HTML generator
    html_gen = HTMLReportGenerator()
    html_report = html_gen.generate_comprehensive_report(scores)
    assert isinstance(html_report, str)
    assert "<!DOCTYPE html>" in html_report

    print("Report generator basic tests passed")


if __name__ == "__main__":
    # Run basic functionality test
    test_report_generator_basic_functionality()

    # Run a few property tests manually for verification
    test_instance = TestReportGeneratorProperties()

    print("Report generator property tests ready for execution")