"""
Unit tests for test removal functionality.
"""

import pytest
from pathlib import Path
from datetime import datetime
import tempfile
import os
from test_cleanup.cleanup.test_removal import (
    safe_remove_test_file,
    create_removal_log_entry,
    remove_obsolete_test,
    remove_obsolete_tests_batch,
    create_backup,
    remove_with_backup
)
from test_cleanup.models import CleanupLog, TestMetrics


class TestSafeRemoveTestFile:
    """Tests for safe_remove_test_file function."""
    
    def test_remove_existing_file(self, tmp_path):
        """Test removing an existing file."""
        test_file = tmp_path / "test_example.py"
        test_file.write_text("def test_something(): pass")
        
        success, error = safe_remove_test_file(test_file, "Test reason")
        
        assert success is True
        assert error is None
        assert not test_file.exists()
    
    def test_remove_nonexistent_file(self, tmp_path):
        """Test attempting to remove a non-existent file."""
        test_file = tmp_path / "nonexistent.py"
        
        success, error = safe_remove_test_file(test_file, "Test reason")
        
        assert success is False
        assert "does not exist" in error
    
    def test_remove_file_without_permission(self, tmp_path):
        """Test removing a file without write permission."""
        test_file = tmp_path / "readonly.py"
        test_file.write_text("def test_something(): pass")
        
        # Make file read-only
        os.chmod(test_file, 0o444)
        
        success, error = safe_remove_test_file(test_file, "Test reason")
        
        # Cleanup: restore permissions
        os.chmod(test_file, 0o644)
        
        # On some systems this might succeed, on others it fails
        # Just verify we get a boolean and appropriate error handling
        assert isinstance(success, bool)
        if not success:
            assert error is not None


class TestCreateRemovalLogEntry:
    """Tests for create_removal_log_entry function."""
    
    def test_create_basic_log_entry(self):
        """Test creating a basic log entry."""
        action = create_removal_log_entry("test_example.py", "Obsolete test")
        
        assert action.action_type == "remove"
        assert action.test_name == "test_example.py"
        assert action.reason == "Obsolete test"
        assert isinstance(action.timestamp, datetime)
        assert action.before_metrics is None
        assert action.after_metrics is None
    
    def test_create_log_entry_with_metrics(self):
        """Test creating a log entry with metrics."""
        metrics = TestMetrics(
            name="test_example.py",
            file_path=Path("tests/test_example.py"),
            failure_rate=0.1,
            execution_time=1.5,
            last_modified=datetime.now(),
            lines_of_code=50
        )
        
        action = create_removal_log_entry(
            "test_example.py",
            "High failure rate",
            before_metrics=metrics
        )
        
        assert action.before_metrics == metrics
        assert action.after_metrics is None


class TestRemoveObsoleteTest:
    """Tests for remove_obsolete_test function."""
    
    def test_remove_test_successfully(self, tmp_path):
        """Test successfully removing a test."""
        test_file = tmp_path / "test_obsolete.py"
        test_file.write_text("def test_old(): pass")
        
        cleanup_log = CleanupLog()
        
        success = remove_obsolete_test(
            test_file,
            "References non-existent module",
            cleanup_log
        )
        
        assert success is True
        assert not test_file.exists()
        assert len(cleanup_log.actions) == 1
        assert cleanup_log.actions[0].action_type == "remove"
        assert cleanup_log.total_removed == 1
    
    def test_remove_test_dry_run(self, tmp_path):
        """Test removing a test in dry run mode."""
        test_file = tmp_path / "test_example.py"
        test_file.write_text("def test_something(): pass")
        
        cleanup_log = CleanupLog()
        
        success = remove_obsolete_test(
            test_file,
            "Test reason",
            cleanup_log,
            dry_run=True
        )
        
        assert success is True
        assert test_file.exists()  # File should still exist
        assert len(cleanup_log.actions) == 1
        assert "[DRY RUN]" in cleanup_log.actions[0].reason
        assert cleanup_log.total_removed == 0  # Not counted in dry run
    
    def test_remove_nonexistent_test(self, tmp_path):
        """Test attempting to remove a non-existent test."""
        test_file = tmp_path / "nonexistent.py"
        cleanup_log = CleanupLog()
        
        success = remove_obsolete_test(
            test_file,
            "Test reason",
            cleanup_log
        )
        
        assert success is False
        assert len(cleanup_log.actions) == 1
        assert "FAILED" in cleanup_log.actions[0].reason
        assert cleanup_log.total_removed == 0


class TestRemoveObsoleteTestsBatch:
    """Tests for remove_obsolete_tests_batch function."""
    
    def test_batch_remove_multiple_tests(self, tmp_path):
        """Test removing multiple tests in batch."""
        # Create test files
        test_files = []
        for i in range(3):
            test_file = tmp_path / f"test_{i}.py"
            test_file.write_text(f"def test_{i}(): pass")
            test_files.append(test_file)
        
        reasons = {
            str(test_files[0]): "Obsolete module",
            str(test_files[1]): "Deprecated functionality",
            str(test_files[2]): "No longer needed"
        }
        
        cleanup_log = CleanupLog()
        
        results = remove_obsolete_tests_batch(
            test_files,
            reasons,
            cleanup_log
        )
        
        assert results['total_attempted'] == 3
        assert results['success_count'] == 3
        assert results['failure_count'] == 0
        assert len(results['successful']) == 3
        assert len(results['failed']) == 0
        assert cleanup_log.total_removed == 3
    
    def test_batch_remove_with_failures(self, tmp_path):
        """Test batch removal with some failures."""
        # Create one existing file and reference one non-existent
        test_file1 = tmp_path / "test_1.py"
        test_file1.write_text("def test_1(): pass")
        test_file2 = tmp_path / "nonexistent.py"
        
        test_files = [test_file1, test_file2]
        reasons = {
            str(test_file1): "Reason 1",
            str(test_file2): "Reason 2"
        }
        
        cleanup_log = CleanupLog()
        
        results = remove_obsolete_tests_batch(
            test_files,
            reasons,
            cleanup_log
        )
        
        assert results['total_attempted'] == 2
        assert results['success_count'] == 1
        assert results['failure_count'] == 1
        assert len(results['successful']) == 1
        assert len(results['failed']) == 1
    
    def test_batch_remove_dry_run(self, tmp_path):
        """Test batch removal in dry run mode."""
        test_files = []
        for i in range(2):
            test_file = tmp_path / f"test_{i}.py"
            test_file.write_text(f"def test_{i}(): pass")
            test_files.append(test_file)
        
        reasons = {str(f): "Test reason" for f in test_files}
        cleanup_log = CleanupLog()
        
        results = remove_obsolete_tests_batch(
            test_files,
            reasons,
            cleanup_log,
            dry_run=True
        )
        
        assert results['success_count'] == 2
        assert all(f.exists() for f in test_files)  # Files still exist
        assert cleanup_log.total_removed == 0  # Not counted in dry run


class TestCreateBackup:
    """Tests for create_backup function."""
    
    def test_create_backup_successfully(self, tmp_path):
        """Test creating a backup of a test file."""
        test_file = tmp_path / "test_example.py"
        test_file.write_text("def test_something(): pass")
        
        backup_dir = tmp_path / "backups"
        
        backup_path = create_backup(test_file, backup_dir)
        
        assert backup_path is not None
        assert backup_path.exists()
        assert backup_dir.exists()
        assert backup_path.read_text() == test_file.read_text()
    
    def test_create_backup_nonexistent_file(self, tmp_path):
        """Test creating backup of non-existent file."""
        test_file = tmp_path / "nonexistent.py"
        backup_dir = tmp_path / "backups"
        
        backup_path = create_backup(test_file, backup_dir)
        
        assert backup_path is None


class TestRemoveWithBackup:
    """Tests for remove_with_backup function."""
    
    def test_remove_with_backup_successfully(self, tmp_path):
        """Test removing a file after creating backup."""
        test_file = tmp_path / "test_example.py"
        test_file.write_text("def test_something(): pass")
        
        backup_dir = tmp_path / "backups"
        cleanup_log = CleanupLog()
        
        success = remove_with_backup(
            test_file,
            "Obsolete test",
            cleanup_log,
            backup_dir
        )
        
        assert success is True
        assert not test_file.exists()
        assert backup_dir.exists()
        assert len(list(backup_dir.glob("*.py"))) == 1
        assert "Backup:" in cleanup_log.actions[0].reason
