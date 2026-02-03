"""
Unit tests for data models.

Tests the core data structures used in the test cleanup tool.
"""

from datetime import datetime
from pathlib import Path

import pytest

from test_cleanup.models import (
    AnalysisReport,
    CleanupAction,
    CleanupLog,
    CoverageComparison,
    PerformanceComparison,
    TestGroup,
    TestMetrics,
    ValidationReport,
)


class TestTestMetrics:
    """Tests for TestMetrics data model."""

    def test_create_test_metrics(self):
        """Test creating a TestMetrics instance."""
        metrics = TestMetrics(
            name="test_example",
            file_path=Path("tests/test_example.py"),
            failure_rate=0.05,
            execution_time=1.5,
            last_modified=datetime.now(),
            lines_of_code=50,
        )
        
        assert metrics.name == "test_example"
        assert metrics.file_path == Path("tests/test_example.py")
        assert metrics.failure_rate == 0.05
        assert metrics.execution_time == 1.5
        assert metrics.lines_of_code == 50


class TestTestGroup:
    """Tests for TestGroup data model."""

    def test_create_test_group(self):
        """Test creating a TestGroup instance."""
        group = TestGroup(
            tests=["test_a", "test_b"],
            similarity_score=0.95,
            shared_assertions=["assert x == 1", "assert y == 2"],
        )
        
        assert len(group.tests) == 2
        assert group.similarity_score == 0.95
        assert len(group.shared_assertions) == 2


class TestAnalysisReport:
    """Tests for AnalysisReport data model."""

    def test_create_analysis_report(self):
        """Test creating an AnalysisReport instance."""
        report = AnalysisReport(
            total_tests=100,
            obsolete_tests=["test_old"],
            fragile_tests=[],
            duplicate_groups=[],
            valuable_tests=["test_important"],
            total_execution_time=120.5,
            coverage_percentage=85.5,
        )
        
        assert report.total_tests == 100
        assert len(report.obsolete_tests) == 1
        assert report.coverage_percentage == 85.5


class TestCleanupAction:
    """Tests for CleanupAction data model."""

    def test_create_cleanup_action(self):
        """Test creating a CleanupAction instance."""
        action = CleanupAction(
            action_type="remove",
            test_name="test_obsolete",
            reason="Test references non-existent code",
            timestamp=datetime.now(),
        )
        
        assert action.action_type == "remove"
        assert action.test_name == "test_obsolete"
        assert "non-existent" in action.reason


class TestCleanupLog:
    """Tests for CleanupLog data model."""

    def test_create_cleanup_log(self):
        """Test creating a CleanupLog instance."""
        log = CleanupLog()
        
        assert len(log.actions) == 0
        assert log.total_removed == 0
        assert log.total_rewritten == 0
        assert log.total_merged == 0
        assert log.end_time is None

    def test_add_action_to_log(self):
        """Test adding actions to cleanup log."""
        log = CleanupLog()
        action = CleanupAction(
            action_type="remove",
            test_name="test_old",
            reason="Obsolete",
            timestamp=datetime.now(),
        )
        log.actions.append(action)
        
        assert len(log.actions) == 1
        assert log.actions[0].test_name == "test_old"


class TestCoverageComparison:
    """Tests for CoverageComparison data model."""

    def test_create_coverage_comparison(self):
        """Test creating a CoverageComparison instance."""
        comparison = CoverageComparison(
            before_percentage=85.0,
            after_percentage=87.5,
            delta=2.5,
        )
        
        assert comparison.before_percentage == 85.0
        assert comparison.after_percentage == 87.5
        assert comparison.delta == 2.5


class TestPerformanceComparison:
    """Tests for PerformanceComparison data model."""

    def test_create_performance_comparison(self):
        """Test creating a PerformanceComparison instance."""
        comparison = PerformanceComparison(
            before_time=120.0,
            after_time=60.0,
            improvement_percentage=50.0,
        )
        
        assert comparison.before_time == 120.0
        assert comparison.after_time == 60.0
        assert comparison.improvement_percentage == 50.0


class TestValidationReport:
    """Tests for ValidationReport data model."""

    def test_create_validation_report(self):
        """Test creating a ValidationReport instance."""
        coverage = CoverageComparison(
            before_percentage=85.0,
            after_percentage=87.5,
            delta=2.5,
        )
        performance = PerformanceComparison(
            before_time=120.0,
            after_time=60.0,
            improvement_percentage=50.0,
        )
        report = ValidationReport(
            all_tests_passing=True,
            coverage=coverage,
            performance=performance,
            flaky_tests=[],
            total_tests=95,
        )
        
        assert report.all_tests_passing is True
        assert report.total_tests == 95
        assert len(report.flaky_tests) == 0
        assert report.coverage.delta == 2.5
