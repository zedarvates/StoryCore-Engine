"""
Unit tests for rollback functionality.
"""

import json
import shutil
from pathlib import Path
import pytest

from test_cleanup.rollback import (
    BackupManager,
    create_backup_before_cleanup,
    restore_from_backup,
    manual_rollback,
)


@pytest.fixture
def temp_test_dir(tmp_path):
    """Create a temporary test directory with sample files."""
    test_dir = tmp_path / "tests"
    test_dir.mkdir()
    
    # Create sample test files
    (test_dir / "test_sample.py").write_text("def test_example(): pass")
    (test_dir / "test_another.py").write_text("def test_another(): pass")
    
    # Create subdirectory
    subdir = test_dir / "subdir"
    subdir.mkdir()
    (subdir / "test_sub.py").write_text("def test_sub(): pass")
    
    return test_dir


@pytest.fixture
def backup_manager(temp_test_dir):
    """Create a backup manager instance."""
    return BackupManager(temp_test_dir)


def test_backup_manager_initialization(temp_test_dir):
    """Test backup manager initialization."""
    manager = BackupManager(temp_test_dir)
    
    assert manager.test_dir == temp_test_dir
    # Backup dir is now outside test_dir to avoid deletion during rollback
    assert manager.backup_dir == temp_test_dir.parent / f"{temp_test_dir.name}_cleanup_backup"
    assert manager.metadata_file == temp_test_dir.parent / f"{temp_test_dir.name}_cleanup_backup" / "backup_metadata.json"


def test_backup_manager_custom_backup_dir(temp_test_dir, tmp_path):
    """Test backup manager with custom backup directory."""
    custom_backup = tmp_path / "custom_backup"
    manager = BackupManager(temp_test_dir, custom_backup)
    
    assert manager.backup_dir == custom_backup


def test_create_backup(backup_manager, temp_test_dir):
    """Test creating a backup."""
    result = backup_manager.create_backup("Test backup")
    
    assert result["success"] is True
    assert backup_manager.backup_dir.exists()
    assert backup_manager.metadata_file.exists()
    
    # Verify backup contains files
    assert (backup_manager.backup_dir / "test_sample.py").exists()
    assert (backup_manager.backup_dir / "test_another.py").exists()
    assert (backup_manager.backup_dir / "subdir" / "test_sub.py").exists()


def test_create_backup_metadata(backup_manager):
    """Test backup metadata creation."""
    result = backup_manager.create_backup("Test backup")
    
    assert result["success"] is True
    
    metadata = result["metadata"]
    assert "created_at" in metadata
    assert metadata["description"] == "Test backup"
    assert metadata["test_dir"] == str(backup_manager.test_dir)
    assert metadata["file_count"] > 0


def test_create_backup_excludes_cache(temp_test_dir):
    """Test that backup excludes cache and temporary files."""
    # Create cache directories
    (temp_test_dir / "__pycache__").mkdir()
    (temp_test_dir / "__pycache__" / "test.pyc").write_text("cache")
    (temp_test_dir / ".pytest_cache").mkdir()
    (temp_test_dir / "node_modules").mkdir()
    
    manager = BackupManager(temp_test_dir)
    result = manager.create_backup()
    
    assert result["success"] is True
    
    # Verify cache directories are excluded
    assert not (manager.backup_dir / "__pycache__").exists()
    assert not (manager.backup_dir / ".pytest_cache").exists()
    assert not (manager.backup_dir / "node_modules").exists()


def test_restore_backup(backup_manager, temp_test_dir):
    """Test restoring from backup."""
    # Create backup
    backup_manager.create_backup()
    
    # Modify original files
    (temp_test_dir / "test_sample.py").write_text("def test_modified(): pass")
    (temp_test_dir / "test_new.py").write_text("def test_new(): pass")
    
    # Restore backup
    result = backup_manager.restore_backup()
    
    assert result["success"] is True
    
    # Verify original content is restored
    assert (temp_test_dir / "test_sample.py").read_text() == "def test_example(): pass"
    
    # Verify new file is removed
    assert not (temp_test_dir / "test_new.py").exists()


def test_restore_backup_without_backup(backup_manager):
    """Test restore fails gracefully when no backup exists."""
    result = backup_manager.restore_backup()
    
    assert result["success"] is False
    assert "error" in result


def test_list_backups(backup_manager):
    """Test listing available backups."""
    # No backups initially
    backups = backup_manager.list_backups()
    assert len(backups) == 0
    
    # Create backup
    backup_manager.create_backup("Test backup")
    
    # List backups
    backups = backup_manager.list_backups()
    assert len(backups) == 1
    assert backups[0]["description"] == "Test backup"


def test_delete_backup(backup_manager):
    """Test deleting a backup."""
    # Create backup
    backup_manager.create_backup()
    assert backup_manager.backup_dir.exists()
    
    # Delete backup
    result = backup_manager.delete_backup()
    
    assert result is True
    assert not backup_manager.backup_dir.exists()


def test_delete_nonexistent_backup(backup_manager):
    """Test deleting a backup that doesn't exist."""
    result = backup_manager.delete_backup()
    assert result is False


def test_verify_backup(backup_manager):
    """Test backup verification."""
    # Create backup
    backup_manager.create_backup()
    
    # Verify backup
    verification = backup_manager.verify_backup()
    
    assert verification["valid"] is True
    assert "metadata" in verification
    assert verification["expected_files"] > 0
    assert verification["actual_files"] > 0


def test_verify_backup_without_backup(backup_manager):
    """Test verification fails when no backup exists."""
    verification = backup_manager.verify_backup()
    
    assert verification["valid"] is False
    assert "error" in verification


def test_verify_backup_with_corrupted_metadata(backup_manager):
    """Test verification fails with corrupted metadata."""
    # Create backup
    backup_manager.create_backup()
    
    # Corrupt metadata
    backup_manager.metadata_file.write_text("invalid json")
    
    # Verify backup
    verification = backup_manager.verify_backup()
    
    assert verification["valid"] is False


def test_create_backup_before_cleanup_function(temp_test_dir):
    """Test create_backup_before_cleanup function."""
    result = create_backup_before_cleanup(temp_test_dir, description="Pre-cleanup")
    
    assert result["success"] is True
    assert Path(result["backup_dir"]).exists()


def test_restore_from_backup_function(temp_test_dir):
    """Test restore_from_backup function."""
    # Create backup
    create_backup_before_cleanup(temp_test_dir)
    
    # Modify files
    (temp_test_dir / "test_sample.py").write_text("modified")
    
    # Restore
    result = restore_from_backup(temp_test_dir)
    
    assert result["success"] is True
    assert (temp_test_dir / "test_sample.py").read_text() == "def test_example(): pass"


def test_manual_rollback_with_verification(temp_test_dir):
    """Test manual rollback with verification."""
    # Create backup
    create_backup_before_cleanup(temp_test_dir)
    
    # Modify files
    (temp_test_dir / "test_sample.py").write_text("modified")
    
    # Manual rollback
    result = manual_rollback(temp_test_dir, verify_first=True)
    
    assert result["success"] is True
    assert (temp_test_dir / "test_sample.py").read_text() == "def test_example(): pass"


def test_manual_rollback_without_verification(temp_test_dir):
    """Test manual rollback without verification."""
    # Create backup
    create_backup_before_cleanup(temp_test_dir)
    
    # Modify files
    (temp_test_dir / "test_sample.py").write_text("modified")
    
    # Manual rollback
    result = manual_rollback(temp_test_dir, verify_first=False)
    
    assert result["success"] is True


def test_manual_rollback_deletes_backup_on_success(temp_test_dir):
    """Test that manual rollback deletes backup after successful restoration."""
    # Backup dir is now outside test_dir
    backup_dir = temp_test_dir.parent / f"{temp_test_dir.name}_cleanup_backup"
    
    # Create backup
    create_backup_before_cleanup(temp_test_dir)
    assert backup_dir.exists()
    
    # Manual rollback
    result = manual_rollback(temp_test_dir)
    
    assert result["success"] is True
    assert not backup_dir.exists()


def test_manual_rollback_fails_with_invalid_backup(temp_test_dir):
    """Test manual rollback fails with invalid backup."""
    # Create some test files first
    test_file = temp_test_dir / "test_example.py"
    test_file.write_text("def test_something(): pass")
    
    # Create backup
    manager = BackupManager(temp_test_dir)
    manager.create_backup()
    
    # Corrupt backup by deleting metadata file
    metadata_file = manager.backup_dir / "backup_metadata.json"
    if metadata_file.exists():
        metadata_file.unlink()
    
    # Manual rollback with verification
    result = manual_rollback(temp_test_dir, verify_first=True)
    
    assert result["success"] is False
    assert "verification" in result


def test_backup_preserves_directory_structure(temp_test_dir):
    """Test that backup preserves directory structure."""
    # Create nested directories
    nested = temp_test_dir / "level1" / "level2" / "level3"
    nested.mkdir(parents=True)
    (nested / "test_deep.py").write_text("def test_deep(): pass")
    
    manager = BackupManager(temp_test_dir)
    manager.create_backup()
    
    # Verify structure is preserved
    backup_nested = manager.backup_dir / "level1" / "level2" / "level3"
    assert backup_nested.exists()
    assert (backup_nested / "test_deep.py").exists()


def test_restore_handles_missing_test_dir(backup_manager, temp_test_dir):
    """Test restore handles case where test directory is missing."""
    # Create backup
    backup_manager.create_backup()
    
    # Remove test directory
    shutil.rmtree(temp_test_dir)
    
    # Restore
    result = backup_manager.restore_backup()
    
    assert result["success"] is True
    assert temp_test_dir.exists()
