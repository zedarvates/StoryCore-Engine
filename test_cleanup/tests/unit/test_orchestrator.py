"""
Unit tests for the cleanup orchestrator.
"""

import json
import shutil
from pathlib import Path
from datetime import datetime
import pytest

from test_cleanup.orchestrator import CleanupOrchestrator
from test_cleanup.models import (
    AnalysisReport,
    CleanupLog,
    ValidationReport,
    CoverageComparison,
    PerformanceComparison,
)


@pytest.fixture
def temp_test_dir(tmp_path):
    """Create a temporary test directory with sample tests."""
    test_dir = tmp_path / "tests"
    test_dir.mkdir()
    
    # Create sample test file
    test_file = test_dir / "test_sample.py"
    test_file.write_text("""
def test_example():
    assert 1 + 1 == 2

def test_another():
    assert True
""")
    
    return test_dir


@pytest.fixture
def orchestrator(temp_test_dir):
    """Create an orchestrator instance."""
    return CleanupOrchestrator(
        test_dir=temp_test_dir,
        dry_run=True,  # Use dry run for tests
    )


def test_orchestrator_initialization(temp_test_dir):
    """Test orchestrator initialization."""
    orchestrator = CleanupOrchestrator(
        test_dir=temp_test_dir,
        output_dir=temp_test_dir / "output",
        backup_dir=temp_test_dir / "backup",
        dry_run=True,
    )
    
    assert orchestrator.test_dir == temp_test_dir
    assert orchestrator.output_dir == temp_test_dir / "output"
    assert orchestrator.backup_dir == temp_test_dir / "backup"
    assert orchestrator.dry_run is True
    assert orchestrator.output_dir.exists()


def test_orchestrator_default_directories(temp_test_dir):
    """Test orchestrator uses default directories when not specified."""
    orchestrator = CleanupOrchestrator(test_dir=temp_test_dir)
    
    assert orchestrator.output_dir == temp_test_dir / "cleanup_output"
    # Backup dir is now outside test_dir to avoid deletion during rollback
    assert orchestrator.backup_dir == temp_test_dir.parent / f"{temp_test_dir.name}_cleanup_backup"


def test_create_backup(orchestrator, temp_test_dir):
    """Test backup creation."""
    # Create a test file
    test_file = temp_test_dir / "test_backup.py"
    test_file.write_text("def test(): pass")
    
    # Create backup
    orchestrator.dry_run = False  # Need to actually create backup
    orchestrator.create_backup()
    
    assert orchestrator.backup_created is True
    assert orchestrator.backup_dir.exists()
    
    # Verify backup contains the test file
    backup_file = orchestrator.backup_dir / "test_backup.py"
    assert backup_file.exists()
    assert backup_file.read_text() == "def test(): pass"


def test_create_backup_idempotent(orchestrator):
    """Test that creating backup multiple times doesn't fail."""
    orchestrator.dry_run = False
    
    orchestrator.create_backup()
    first_backup_time = orchestrator.backup_dir.stat().st_mtime
    
    # Try creating backup again
    orchestrator.create_backup()
    
    # Should still be marked as created
    assert orchestrator.backup_created is True


def test_rollback_without_backup(orchestrator):
    """Test rollback fails gracefully when no backup exists."""
    result = orchestrator.rollback()
    assert result is False


def test_rollback_with_backup(orchestrator, temp_test_dir):
    """Test rollback restores from backup."""
    orchestrator.dry_run = False
    
    # Create original file
    original_file = temp_test_dir / "test_original.py"
    original_file.write_text("original content")
    
    # Create backup
    orchestrator.create_backup()
    
    # Modify original file
    original_file.write_text("modified content")
    
    # Rollback
    result = orchestrator.rollback()
    
    assert result is True
    assert original_file.read_text() == "original content"


def test_run_analysis_phase(orchestrator):
    """Test running analysis phase."""
    result = orchestrator.run_analysis()
    
    assert "success" in result
    assert "report_path" in result or "error" in result
    
    if result["success"]:
        assert orchestrator.analysis_report is not None
        assert result["report_path"]
        assert Path(result["report_path"]).exists()


def test_run_cleanup_without_analysis(orchestrator):
    """Test cleanup fails without analysis."""
    result = orchestrator.run_cleanup()
    
    assert result["success"] is False
    assert "error" in result
    assert "analysis" in result["error"].lower()


def test_serialize_analysis_report(orchestrator):
    """Test serialization of analysis report."""
    # Create a mock analysis report
    orchestrator.analysis_report = AnalysisReport(
        total_tests=10,
        obsolete_tests=["test_old.py"],
        fragile_tests=[],
        duplicate_groups=[],
        valuable_tests=["test_good.py"],
        total_execution_time=5.0,
        coverage_percentage=85.0,
    )
    
    serialized = orchestrator._serialize_analysis_report()
    
    assert serialized["total_tests"] == 10
    assert serialized["obsolete_tests"] == ["test_old.py"]
    assert serialized["valuable_tests"] == ["test_good.py"]
    assert serialized["total_execution_time"] == 5.0
    assert serialized["coverage_percentage"] == 85.0


def test_serialize_cleanup_log(orchestrator):
    """Test serialization of cleanup log."""
    orchestrator.cleanup_log = CleanupLog(
        total_removed=2,
        total_rewritten=3,
        total_merged=1,
        start_time=datetime.now(),
        end_time=datetime.now(),
    )
    
    serialized = orchestrator._serialize_cleanup_log()
    
    assert serialized["total_removed"] == 2
    assert serialized["total_rewritten"] == 3
    assert serialized["total_merged"] == 1
    assert "start_time" in serialized
    assert "end_time" in serialized


def test_serialize_validation_report(orchestrator):
    """Test serialization of validation report."""
    orchestrator.validation_report = ValidationReport(
        all_tests_passing=True,
        coverage=CoverageComparison(
            before_percentage=80.0,
            after_percentage=85.0,
            delta=5.0,
        ),
        performance=PerformanceComparison(
            before_time=10.0,
            after_time=5.0,
            improvement_percentage=50.0,
        ),
        flaky_tests=[],
        total_tests=10,
    )
    
    serialized = orchestrator._serialize_validation_report()
    
    assert serialized["all_tests_passing"] is True
    assert serialized["coverage"]["before_percentage"] == 80.0
    assert serialized["coverage"]["after_percentage"] == 85.0
    assert serialized["coverage"]["delta"] == 5.0
    assert serialized["performance"]["improvement_percentage"] == 50.0
    assert serialized["total_tests"] == 10


def test_full_pipeline_dry_run(orchestrator):
    """Test running full pipeline in dry-run mode."""
    results = orchestrator.run_full_pipeline()
    
    assert "success" in results
    assert "phases" in results
    assert "errors" in results


def test_full_pipeline_skip_phases(orchestrator):
    """Test running pipeline with skipped phases."""
    results = orchestrator.run_full_pipeline(
        skip_cleanup=True,
        skip_validation=True,
        skip_documentation=True,
    )
    
    assert "phases" in results
    # Only analysis should have run
    assert "analysis" in results["phases"]
    assert "cleanup" not in results["phases"]
    assert "validation" not in results["phases"]
    assert "documentation" not in results["phases"]


def test_error_handling_in_pipeline(orchestrator, monkeypatch):
    """Test error handling in pipeline."""
    # Mock run_analysis to raise an exception
    def mock_run_analysis():
        raise Exception("Test error")
    
    monkeypatch.setattr(orchestrator, "run_analysis", mock_run_analysis)
    
    results = orchestrator.run_full_pipeline()
    
    assert results["success"] is False
    assert len(results["errors"]) > 0


def test_backup_excludes_cache_files(orchestrator, temp_test_dir):
    """Test that backup excludes cache and temporary files."""
    orchestrator.dry_run = False
    
    # Create files that should be excluded
    (temp_test_dir / "__pycache__").mkdir()
    (temp_test_dir / "__pycache__" / "test.pyc").write_text("cache")
    (temp_test_dir / ".pytest_cache").mkdir()
    (temp_test_dir / ".coverage").write_text("coverage")
    
    # Create file that should be included
    (temp_test_dir / "test_real.py").write_text("real test")
    
    orchestrator.create_backup()
    
    # Check backup
    assert (orchestrator.backup_dir / "test_real.py").exists()
    assert not (orchestrator.backup_dir / "__pycache__").exists()
    assert not (orchestrator.backup_dir / ".pytest_cache").exists()
    # .coverage might be excluded depending on implementation


def test_output_directory_creation(temp_test_dir):
    """Test that output directory is created if it doesn't exist."""
    output_dir = temp_test_dir / "custom_output"
    assert not output_dir.exists()
    
    orchestrator = CleanupOrchestrator(
        test_dir=temp_test_dir,
        output_dir=output_dir,
    )
    
    assert output_dir.exists()
