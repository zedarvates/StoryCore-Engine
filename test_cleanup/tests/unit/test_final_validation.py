"""
Unit tests for final validation functionality
"""

import json
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from test_cleanup.final_validation import (
    FinalValidator,
    ValidationMetrics,
    FinalReport
)


@pytest.fixture
def temp_project(tmp_path):
    """Create temporary project structure"""
    project_root = tmp_path / "project"
    project_root.mkdir()
    
    # Create test directories
    (project_root / "tests").mkdir()
    (project_root / "creative-studio-ui").mkdir()
    (project_root / "test_cleanup").mkdir()
    
    return project_root


@pytest.fixture
def validator(temp_project):
    """Create validator instance"""
    return FinalValidator(temp_project)


def test_validator_initialization(validator, temp_project):
    """Test validator initializes correctly"""
    assert validator.project_root == temp_project
    assert validator.test_cleanup_dir == temp_project / "test_cleanup"
    assert validator.report_dir.exists()


def test_create_backup(validator, temp_project):
    """Test backup creation"""
    # Create some test files
    tests_dir = temp_project / "tests"
    test_file = tests_dir / "test_example.py"
    test_file.write_text("def test_something(): pass")
    
    validator._create_backup()
    
    # Verify backup was created
    backup_file = validator.backup_dir / "tests_python" / "test_example.py"
    assert backup_file.exists()
    assert backup_file.read_text() == "def test_something(): pass"


def test_measure_baseline_no_tests(validator):
    """Test baseline measurement with no tests"""
    with patch.object(validator, '_run_python_tests') as mock_python, \
         patch.object(validator, '_run_typescript_tests') as mock_ts:
        
        mock_python.return_value = {
            "count": 0, "passing": 0, "failing": 0,
            "time": 0.0, "coverage": 0.0
        }
        mock_ts.return_value = {
            "count": 0, "passing": 0, "failing": 0,
            "time": 0.0, "coverage": 0.0
        }
        
        metrics = validator._measure_baseline()
        
        assert metrics["test_count"] == 0
        assert metrics["execution_time"] == 0.0
        assert metrics["coverage"] == 0.0


def test_measure_baseline_with_tests(validator):
    """Test baseline measurement with tests"""
    with patch.object(validator, '_run_python_tests') as mock_python, \
         patch.object(validator, '_run_typescript_tests') as mock_ts:
        
        mock_python.return_value = {
            "count": 50, "passing": 48, "failing": 2,
            "time": 30.0, "coverage": 85.0
        }
        mock_ts.return_value = {
            "count": 30, "passing": 30, "failing": 0,
            "time": 20.0, "coverage": 90.0
        }
        
        metrics = validator._measure_baseline()
        
        assert metrics["test_count"] == 80
        assert metrics["passing_tests"] == 78
        assert metrics["failing_tests"] == 2
        assert metrics["execution_time"] == 50.0
        # Weighted average: (85*50 + 90*30) / 80 = 86.875
        assert abs(metrics["coverage"] - 86.875) < 0.01


def test_validate_criteria_all_passing(validator):
    """Test validation when all criteria pass"""
    baseline = {
        "test_count": 100,
        "passing_tests": 95,
        "failing_tests": 5,
        "execution_time": 100.0,
        "coverage": 80.0
    }
    
    final = {
        "test_count": 80,
        "passing_tests": 80,
        "failing_tests": 0,
        "execution_time": 40.0,
        "coverage": 82.0
    }
    
    results = validator._validate_criteria(baseline, final)
    
    assert results["all_tests_passing"] is True
    assert results["coverage_maintained"] is True
    assert results["performance_target_met"] is True
    assert results["overall_success"] is True
    assert results["performance_improvement"] == 60.0
    assert len(results["issues"]) == 0


def test_validate_criteria_tests_failing(validator):
    """Test validation when tests are failing"""
    baseline = {
        "test_count": 100,
        "passing_tests": 100,
        "failing_tests": 0,
        "execution_time": 100.0,
        "coverage": 80.0
    }
    
    final = {
        "test_count": 90,
        "passing_tests": 85,
        "failing_tests": 5,
        "execution_time": 45.0,
        "coverage": 81.0
    }
    
    results = validator._validate_criteria(baseline, final)
    
    assert results["all_tests_passing"] is False
    assert results["overall_success"] is False
    assert any("5 tests still failing" in issue for issue in results["issues"])


def test_validate_criteria_coverage_decreased(validator):
    """Test validation when coverage decreases"""
    baseline = {
        "test_count": 100,
        "passing_tests": 100,
        "failing_tests": 0,
        "execution_time": 100.0,
        "coverage": 85.0
    }
    
    final = {
        "test_count": 80,
        "passing_tests": 80,
        "failing_tests": 0,
        "execution_time": 40.0,
        "coverage": 80.0
    }
    
    results = validator._validate_criteria(baseline, final)
    
    assert results["coverage_maintained"] is False
    assert results["overall_success"] is False
    assert any("Coverage decreased" in issue for issue in results["issues"])


def test_validate_criteria_performance_target_not_met(validator):
    """Test validation when performance target not met"""
    baseline = {
        "test_count": 100,
        "passing_tests": 100,
        "failing_tests": 0,
        "execution_time": 100.0,
        "coverage": 80.0
    }
    
    final = {
        "test_count": 90,
        "passing_tests": 90,
        "failing_tests": 0,
        "execution_time": 60.0,  # Only 40% improvement
        "coverage": 82.0
    }
    
    results = validator._validate_criteria(baseline, final)
    
    assert results["performance_target_met"] is False
    assert results["overall_success"] is False
    assert results["performance_improvement"] == 40.0
    assert any("did not meet 50% target" in issue for issue in results["issues"])


def test_generate_report_success(validator):
    """Test report generation for successful validation"""
    baseline = {
        "test_count": 100,
        "passing_tests": 95,
        "failing_tests": 5,
        "execution_time": 100.0,
        "coverage": 80.0
    }
    
    final = {
        "test_count": 80,
        "passing_tests": 80,
        "failing_tests": 0,
        "execution_time": 40.0,
        "coverage": 82.0
    }
    
    cleanup_summary = {
        "tests_removed": 15,
        "tests_rewritten": 3,
        "tests_consolidated": 2,
        "actions_taken": 20
    }
    
    validation = {
        "all_tests_passing": True,
        "coverage_maintained": True,
        "performance_target_met": True,
        "performance_improvement": 60.0,
        "overall_success": True,
        "issues": []
    }
    
    report = validator._generate_report(baseline, final, cleanup_summary, validation)
    
    assert report.validation_metrics.overall_success is True
    assert report.validation_metrics.tests_removed == 15
    assert report.validation_metrics.tests_rewritten == 3
    assert report.validation_metrics.tests_consolidated == 2
    assert report.validation_metrics.execution_time_improvement_percentage == 60.0
    assert len(report.issues_found) == 0
    assert len(report.recommendations) > 0
    
    # Check that recommendations include deployment suggestion
    assert any("deploy" in rec.lower() for rec in report.recommendations)


def test_generate_report_failure(validator):
    """Test report generation for failed validation"""
    baseline = {
        "test_count": 100,
        "passing_tests": 100,
        "failing_tests": 0,
        "execution_time": 100.0,
        "coverage": 85.0
    }
    
    final = {
        "test_count": 90,
        "passing_tests": 85,
        "failing_tests": 5,
        "execution_time": 60.0,
        "coverage": 80.0
    }
    
    cleanup_summary = {
        "tests_removed": 10,
        "tests_rewritten": 0,
        "tests_consolidated": 0,
        "actions_taken": 10
    }
    
    validation = {
        "all_tests_passing": False,
        "coverage_maintained": False,
        "performance_target_met": False,
        "performance_improvement": 40.0,
        "overall_success": False,
        "issues": [
            "5 tests still failing",
            "Coverage decreased by 5.0%",
            "Performance improvement (40.0%) did not meet 50% target"
        ]
    }
    
    report = validator._generate_report(baseline, final, cleanup_summary, validation)
    
    assert report.validation_metrics.overall_success is False
    assert len(report.issues_found) == 3
    assert len(report.recommendations) > 0
    
    # Check that recommendations include fixes
    assert any("fix" in rec.lower() for rec in report.recommendations)


def test_generate_markdown_report(validator, temp_project):
    """Test markdown report generation"""
    metrics = ValidationMetrics(
        initial_test_count=100,
        initial_passing_tests=95,
        initial_failing_tests=5,
        initial_execution_time=100.0,
        initial_coverage_percentage=80.0,
        final_test_count=80,
        final_passing_tests=80,
        final_failing_tests=0,
        final_execution_time=40.0,
        final_coverage_percentage=82.0,
        tests_removed=15,
        tests_rewritten=3,
        tests_consolidated=2,
        execution_time_improvement_percentage=60.0,
        coverage_delta=2.0,
        all_tests_passing=True,
        coverage_maintained=True,
        performance_target_met=True,
        overall_success=True
    )
    
    report = FinalReport(
        validation_metrics=metrics,
        cleanup_summary={"actions_taken": 20},
        issues_found=[],
        recommendations=["Deploy changes"],
        timestamp="2024-01-01 12:00:00"
    )
    
    validator._generate_markdown_report(report)
    
    report_file = validator.report_dir / "FINAL_VALIDATION_REPORT.md"
    assert report_file.exists()
    
    content = report_file.read_text()
    assert "VALIDATION SUCCESSFUL" in content
    assert "100 tests" in content
    assert "80 tests" in content
    assert "60.0%" in content
    assert "Deploy changes" in content


def test_run_cleanup_pipeline_success(validator, temp_project):
    """Test cleanup pipeline execution"""
    # Create mock cleanup log
    cleanup_log = temp_project / "test_cleanup" / "cleanup_log.json"
    cleanup_log.parent.mkdir(parents=True, exist_ok=True)
    cleanup_log.write_text(json.dumps({
        "total_removed": 10,
        "total_rewritten": 5,
        "total_merged": 3
    }))
    
    with patch('subprocess.run') as mock_run:
        mock_run.return_value = Mock(returncode=0)
        
        summary = validator._run_cleanup_pipeline()
        
        assert summary["tests_removed"] == 10
        assert summary["tests_rewritten"] == 5
        assert summary["tests_consolidated"] == 3
        assert summary["actions_taken"] == 18


def test_validation_metrics_dataclass():
    """Test ValidationMetrics dataclass"""
    metrics = ValidationMetrics(
        initial_test_count=100,
        initial_passing_tests=95,
        initial_failing_tests=5,
        initial_execution_time=100.0,
        initial_coverage_percentage=80.0,
        final_test_count=80,
        final_passing_tests=80,
        final_failing_tests=0,
        final_execution_time=40.0,
        final_coverage_percentage=82.0,
        tests_removed=15,
        tests_rewritten=3,
        tests_consolidated=2,
        execution_time_improvement_percentage=60.0,
        coverage_delta=2.0,
        all_tests_passing=True,
        coverage_maintained=True,
        performance_target_met=True,
        overall_success=True
    )
    
    assert metrics.initial_test_count == 100
    assert metrics.final_test_count == 80
    assert metrics.overall_success is True


def test_final_report_dataclass():
    """Test FinalReport dataclass"""
    metrics = ValidationMetrics(
        initial_test_count=100,
        initial_passing_tests=100,
        initial_failing_tests=0,
        initial_execution_time=100.0,
        initial_coverage_percentage=80.0,
        final_test_count=80,
        final_passing_tests=80,
        final_failing_tests=0,
        final_execution_time=40.0,
        final_coverage_percentage=82.0,
        tests_removed=15,
        tests_rewritten=3,
        tests_consolidated=2,
        execution_time_improvement_percentage=60.0,
        coverage_delta=2.0,
        all_tests_passing=True,
        coverage_maintained=True,
        performance_target_met=True,
        overall_success=True
    )
    
    report = FinalReport(
        validation_metrics=metrics,
        cleanup_summary={"actions": 20},
        issues_found=[],
        recommendations=["Deploy"],
        timestamp="2024-01-01"
    )
    
    assert report.validation_metrics.overall_success is True
    assert len(report.recommendations) == 1
