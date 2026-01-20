"""
Unit tests for BackupManager

Tests backup creation, verification, restoration, and metadata management.
"""

import pytest
import tempfile
import shutil
import tarfile
from pathlib import Path
from datetime import datetime

from src.migration.backup_manager import BackupManager, BackupInfo


@pytest.fixture
def temp_project():
    """Create a temporary project directory with sample files"""
    temp_dir = tempfile.mkdtemp()
    project_dir = Path(temp_dir) / "test-project"
    project_dir.mkdir()
    
    # Create sample project structure
    (project_dir / "README.md").write_text("# Test Project")
    (project_dir / "src").mkdir()
    (project_dir / "src" / "main.py").write_text("print('hello')")
    (project_dir / "src" / "utils.py").write_text("def helper(): pass")
    (project_dir / "tests").mkdir()
    (project_dir / "tests" / "test_main.py").write_text("def test_main(): pass")
    (project_dir / "config.json").write_text('{"key": "value"}')
    
    yield project_dir
    
    # Cleanup
    shutil.rmtree(temp_dir)


@pytest.fixture
def temp_backup_dir():
    """Create a temporary backup directory"""
    temp_dir = tempfile.mkdtemp()
    backup_dir = Path(temp_dir) / "backups"
    backup_dir.mkdir()
    
    yield backup_dir
    
    # Cleanup
    shutil.rmtree(temp_dir)


@pytest.fixture
def backup_manager(temp_backup_dir):
    """Create a BackupManager instance with temporary backup directory"""
    return BackupManager(backup_dir=temp_backup_dir)


class TestBackupCreation:
    """Tests for backup creation functionality"""
    
    def test_create_backup_success(self, backup_manager, temp_project):
        """Test successful backup creation"""
        backup_info = backup_manager.create_backup(temp_project)
        
        assert backup_info.backup_path.exists()
        assert backup_info.project_root == temp_project
        assert backup_info.file_count == 5  # 5 files in test project
        assert backup_info.size_bytes > 0
        assert len(backup_info.checksum) == 64  # SHA256 hex length
        assert backup_info.timestamp is not None
    
    def test_create_backup_nonexistent_project(self, backup_manager):
        """Test backup creation with nonexistent project"""
        nonexistent = Path("/nonexistent/project")
        
        with pytest.raises(FileNotFoundError):
            backup_manager.create_backup(nonexistent)
    
    def test_backup_archive_structure(self, backup_manager, temp_project):
        """Test that backup archive contains correct files"""
        backup_info = backup_manager.create_backup(temp_project)
        
        # Open and inspect archive
        with tarfile.open(backup_info.backup_path, "r:gz") as tar:
            members = tar.getmembers()
            member_names = [m.name for m in members]
            
            # Check that all files are included
            assert any("README.md" in name for name in member_names)
            assert any("main.py" in name for name in member_names)
            assert any("utils.py" in name for name in member_names)
            assert any("test_main.py" in name for name in member_names)
            assert any("config.json" in name for name in member_names)
    
    def test_backup_timestamp_format(self, backup_manager, temp_project):
        """Test that backup timestamp is in correct format"""
        backup_info = backup_manager.create_backup(temp_project)
        
        # Timestamp should be in format YYYYMMDD_HHMMSS
        assert len(backup_info.timestamp) == 15
        assert backup_info.timestamp[8] == '_'
        
        # Should be parseable as datetime
        datetime.strptime(backup_info.timestamp, "%Y%m%d_%H%M%S")
    
    def test_multiple_backups(self, backup_manager, temp_project):
        """Test creating multiple backups of same project"""
        import time
        
        backup1 = backup_manager.create_backup(temp_project)
        
        # Wait to ensure different timestamp
        time.sleep(1.1)
        
        backup2 = backup_manager.create_backup(temp_project)
        
        # Both backups should exist
        assert backup1.backup_path.exists()
        assert backup2.backup_path.exists()
        
        # Should have different timestamps
        assert backup1.timestamp != backup2.timestamp
        
        # Should have different filenames
        assert backup1.backup_path != backup2.backup_path


class TestBackupVerification:
    """Tests for backup verification functionality"""
    
    def test_verify_valid_backup(self, backup_manager, temp_project):
        """Test verification of valid backup"""
        backup_info = backup_manager.create_backup(temp_project)
        
        assert backup_manager.verify_backup(backup_info.backup_path) is True
    
    def test_verify_nonexistent_backup(self, backup_manager):
        """Test verification of nonexistent backup"""
        nonexistent = Path("/nonexistent/backup.tar.gz")
        
        assert backup_manager.verify_backup(nonexistent) is False
    
    def test_verify_corrupted_backup(self, backup_manager, temp_project, temp_backup_dir):
        """Test verification of corrupted backup"""
        backup_info = backup_manager.create_backup(temp_project)
        
        # Corrupt the backup by truncating it
        with open(backup_info.backup_path, 'ab') as f:
            f.write(b'corrupted data')
        
        # Verification should fail due to checksum mismatch
        assert backup_manager.verify_backup(backup_info.backup_path) is False
    
    def test_verify_backup_without_metadata(self, backup_manager, temp_project, temp_backup_dir):
        """Test verification of backup without metadata"""
        # Create backup
        backup_info = backup_manager.create_backup(temp_project)
        
        # Delete metadata file
        backup_manager.metadata_file.unlink()
        
        # Should still verify using basic integrity check
        assert backup_manager.verify_backup(backup_info.backup_path) is True


class TestBackupRestoration:
    """Tests for backup restoration functionality"""
    
    def test_restore_to_original_location(self, backup_manager, temp_project):
        """Test restoring backup to original location"""
        # Create backup
        backup_info = backup_manager.create_backup(temp_project)
        
        # Delete original project
        shutil.rmtree(temp_project)
        assert not temp_project.exists()
        
        # Restore backup
        success = backup_manager.restore_backup(backup_info.backup_path)
        
        assert success is True
        assert temp_project.exists()
        assert (temp_project / "README.md").exists()
        assert (temp_project / "src" / "main.py").exists()
    
    def test_restore_to_custom_location(self, backup_manager, temp_project):
        """Test restoring backup to custom location"""
        # Create backup
        backup_info = backup_manager.create_backup(temp_project)
        
        # Create custom target directory
        # Note: archive contains the project folder with its original name
        # So if we want to restore to a different location, we specify the new project path
        # But the archive will extract with the original folder name
        original_name = temp_project.name
        custom_parent = temp_project.parent / "custom_restore_location"
        custom_parent.mkdir(exist_ok=True)
        custom_target = custom_parent / original_name
        
        # Restore to custom location
        success = backup_manager.restore_backup(backup_info.backup_path, custom_target)
        
        assert success is True
        # The archive extracts the project folder to the parent directory
        assert custom_target.exists()
        assert (custom_target / "README.md").exists()
        assert (custom_target / "src" / "main.py").exists()
        
        # Cleanup
        shutil.rmtree(custom_parent)
    
    def test_restore_nonexistent_backup(self, backup_manager):
        """Test restoring nonexistent backup"""
        nonexistent = Path("/nonexistent/backup.tar.gz")
        
        success = backup_manager.restore_backup(nonexistent)
        
        assert success is False
    
    def test_restore_preserves_content(self, backup_manager, temp_project):
        """Test that restoration preserves file content"""
        # Read original content
        original_content = (temp_project / "README.md").read_text()
        
        # Create backup
        backup_info = backup_manager.create_backup(temp_project)
        
        # Modify original
        (temp_project / "README.md").write_text("Modified content")
        
        # Restore backup
        backup_manager.restore_backup(backup_info.backup_path)
        
        # Content should be restored
        restored_content = (temp_project / "README.md").read_text()
        assert restored_content == original_content


class TestBackupListing:
    """Tests for backup listing functionality"""
    
    def test_list_empty_backups(self, backup_manager):
        """Test listing when no backups exist"""
        backups = backup_manager.list_backups()
        
        assert backups == []
    
    def test_list_single_backup(self, backup_manager, temp_project):
        """Test listing single backup"""
        backup_info = backup_manager.create_backup(temp_project)
        
        backups = backup_manager.list_backups()
        
        assert len(backups) == 1
        assert backups[0].backup_path == backup_info.backup_path
    
    def test_list_multiple_backups(self, backup_manager, temp_project):
        """Test listing multiple backups"""
        backup1 = backup_manager.create_backup(temp_project)
        backup2 = backup_manager.create_backup(temp_project)
        
        backups = backup_manager.list_backups()
        
        assert len(backups) == 2
        # Should be sorted by creation time (newest first)
        assert backups[0].created_at >= backups[1].created_at
    
    def test_list_excludes_deleted_backups(self, backup_manager, temp_project):
        """Test that listing excludes deleted backup files"""
        import time
        
        backup1 = backup_manager.create_backup(temp_project)
        
        # Wait to ensure different timestamp
        time.sleep(1.1)
        
        backup2 = backup_manager.create_backup(temp_project)
        
        # Delete first backup file
        backup1.backup_path.unlink()
        
        backups = backup_manager.list_backups()
        
        # Should only list existing backup
        assert len(backups) == 1
        assert backups[0].backup_path == backup2.backup_path


class TestBackupInfo:
    """Tests for BackupInfo dataclass"""
    
    def test_backup_info_to_dict(self, temp_project):
        """Test BackupInfo serialization to dict"""
        backup_info = BackupInfo(
            backup_path=Path("/tmp/backup.tar.gz"),
            timestamp="20260119_120000",
            project_root=temp_project,
            size_bytes=1024,
            checksum="abc123",
            file_count=10,
            created_at=datetime.now()
        )
        
        data = backup_info.to_dict()
        
        assert isinstance(data['backup_path'], str)
        assert isinstance(data['project_root'], str)
        assert isinstance(data['created_at'], str)
        assert data['size_bytes'] == 1024
        assert data['file_count'] == 10
    
    def test_backup_info_from_dict(self):
        """Test BackupInfo deserialization from dict"""
        data = {
            'backup_path': '/tmp/backup.tar.gz',
            'timestamp': '20260119_120000',
            'project_root': '/tmp/project',
            'size_bytes': 1024,
            'checksum': 'abc123',
            'file_count': 10,
            'created_at': '2026-01-19T12:00:00'
        }
        
        backup_info = BackupInfo.from_dict(data)
        
        assert isinstance(backup_info.backup_path, Path)
        assert isinstance(backup_info.project_root, Path)
        assert isinstance(backup_info.created_at, datetime)
        assert backup_info.size_bytes == 1024


class TestChecksumCalculation:
    """Tests for checksum calculation"""
    
    def test_checksum_consistency(self, backup_manager, temp_project):
        """Test that checksum is consistent for same file"""
        backup_info = backup_manager.create_backup(temp_project)
        
        checksum1 = backup_manager._calculate_checksum(backup_info.backup_path)
        checksum2 = backup_manager._calculate_checksum(backup_info.backup_path)
        
        assert checksum1 == checksum2
    
    def test_checksum_changes_with_content(self, backup_manager, temp_project):
        """Test that checksum changes when file content changes"""
        backup1 = backup_manager.create_backup(temp_project)
        checksum1 = backup1.checksum
        
        # Modify project
        (temp_project / "new_file.txt").write_text("new content")
        
        backup2 = backup_manager.create_backup(temp_project)
        checksum2 = backup2.checksum
        
        assert checksum1 != checksum2


class TestMetadataManagement:
    """Tests for backup metadata management"""
    
    def test_metadata_persistence(self, backup_manager, temp_project):
        """Test that metadata persists across manager instances"""
        # Create backup with first manager
        backup_info = backup_manager.create_backup(temp_project)
        
        # Create new manager instance
        new_manager = BackupManager(backup_dir=backup_manager.backup_dir)
        
        # Should be able to list backup
        backups = new_manager.list_backups()
        assert len(backups) == 1
        assert backups[0].backup_path == backup_info.backup_path
    
    def test_metadata_file_creation(self, backup_manager, temp_project):
        """Test that metadata file is created"""
        backup_manager.create_backup(temp_project)
        
        assert backup_manager.metadata_file.exists()
    
    def test_metadata_handles_missing_file(self, backup_manager):
        """Test that missing metadata file is handled gracefully"""
        # Should not raise error
        backups = backup_manager.list_backups()
        assert backups == []
