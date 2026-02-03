"""
Unit tests for FeedbackStorage class

Tests the local storage functionality for failed feedback report submissions.

Requirements: 8.2 - Local storage on failure with retry capability
"""

import json
import os
import pytest
import tempfile
from datetime import datetime
from pathlib import Path
from src.feedback_storage import FeedbackStorage


@pytest.fixture
def temp_storage_dir():
    """Create a temporary directory for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def storage(temp_storage_dir):
    """Create a FeedbackStorage instance with temporary directory."""
    return FeedbackStorage(storage_dir=temp_storage_dir)


@pytest.fixture
def sample_payload():
    """Create a sample report payload for testing."""
    return {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.now().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux",
            "os_version": "Ubuntu 20.04",
            "language": "en"
        },
        "module_context": {
            "active_module": "promotion-engine",
            "module_state": {}
        },
        "user_input": {
            "description": "Test bug report description",
            "reproduction_steps": "Step 1\nStep 2\nStep 3"
        },
        "diagnostics": {
            "stacktrace": None,
            "logs": [],
            "memory_usage_mb": 256,
            "process_state": {}
        },
        "screenshot_base64": None
    }


class TestFeedbackStorageInitialization:
    """Test FeedbackStorage initialization and directory creation."""
    
    def test_init_with_custom_dir(self, temp_storage_dir):
        """Test initialization with custom storage directory."""
        storage = FeedbackStorage(storage_dir=temp_storage_dir)
        assert storage.storage_dir == Path(temp_storage_dir)
        assert storage.storage_dir.exists()
    
    def test_init_with_default_dir(self):
        """Test initialization with default storage directory."""
        storage = FeedbackStorage()
        expected_dir = Path.home() / ".storycore" / "feedback" / "pending"
        assert storage.storage_dir == expected_dir
        assert storage.storage_dir.exists()
    
    def test_storage_dir_creation(self, temp_storage_dir):
        """Test that storage directory is created if it doesn't exist."""
        nested_dir = Path(temp_storage_dir) / "nested" / "path"
        storage = FeedbackStorage(storage_dir=str(nested_dir))
        assert nested_dir.exists()


class TestSaveFailedReport:
    """Test save_failed_report functionality."""
    
    def test_save_valid_payload(self, storage, sample_payload):
        """Test saving a valid payload returns a report ID."""
        report_id = storage.save_failed_report(sample_payload)
        
        # Check report ID format (report_YYYYMMDD_HHMMSS_uuid)
        assert report_id.startswith("report_")
        parts = report_id.split('_')
        assert len(parts) == 4  # report, date, time, uuid
        
        # Check file was created
        filepath = storage.storage_dir / f"{report_id}.json"
        assert filepath.exists()
    
    def test_save_creates_json_file(self, storage, sample_payload):
        """Test that saved file contains valid JSON."""
        report_id = storage.save_failed_report(sample_payload)
        filepath = storage.storage_dir / f"{report_id}.json"
        
        # Read and verify JSON
        with open(filepath, 'r', encoding='utf-8') as f:
            loaded_payload = json.load(f)
        
        assert loaded_payload == sample_payload
    
    def test_save_unique_filenames(self, storage, sample_payload):
        """Test that multiple saves create unique filenames."""
        report_id1 = storage.save_failed_report(sample_payload)
        report_id2 = storage.save_failed_report(sample_payload)
        
        assert report_id1 != report_id2
    
    def test_save_empty_payload_raises_error(self, storage):
        """Test that saving empty payload raises ValueError."""
        with pytest.raises(ValueError, match="Payload cannot be None or empty"):
            storage.save_failed_report({})
    
    def test_save_none_payload_raises_error(self, storage):
        """Test that saving None payload raises ValueError."""
        with pytest.raises(ValueError, match="Payload cannot be None or empty"):
            storage.save_failed_report(None)
    
    def test_save_with_special_characters(self, storage):
        """Test saving payload with special characters."""
        payload = {
            "description": "Test with special chars: é, ñ, 中文, 🎬",
            "unicode_test": "Unicode: \u2764\ufe0f"
        }
        report_id = storage.save_failed_report(payload)
        
        # Verify file was created and can be read
        loaded = storage.get_report_payload(report_id)
        assert loaded == payload


class TestListPendingReports:
    """Test list_pending_reports functionality."""
    
    def test_list_empty_storage(self, storage):
        """Test listing reports when storage is empty."""
        reports = storage.list_pending_reports()
        assert reports == []
    
    def test_list_single_report(self, storage, sample_payload):
        """Test listing a single saved report."""
        report_id = storage.save_failed_report(sample_payload)
        reports = storage.list_pending_reports()
        
        assert len(reports) == 1
        assert reports[0]['report_id'] == report_id
        assert reports[0]['filename'] == f"{report_id}.json"
        assert 'filepath' in reports[0]
        assert 'timestamp' in reports[0]
        assert reports[0]['size_bytes'] > 0
    
    def test_list_multiple_reports(self, storage, sample_payload):
        """Test listing multiple saved reports."""
        report_ids = []
        for i in range(3):
            payload = sample_payload.copy()
            payload['user_input']['description'] = f"Report {i}"
            report_id = storage.save_failed_report(payload)
            report_ids.append(report_id)
        
        reports = storage.list_pending_reports()
        assert len(reports) == 3
        
        # Check all report IDs are present
        listed_ids = [r['report_id'] for r in reports]
        for report_id in report_ids:
            assert report_id in listed_ids
    
    def test_list_sorted_by_timestamp(self, storage, sample_payload):
        """Test that reports are sorted by timestamp (most recent first)."""
        import time
        
        report_ids = []
        for i in range(3):
            report_id = storage.save_failed_report(sample_payload)
            report_ids.append(report_id)
            time.sleep(1.1)  # Delay to ensure different timestamps (1 second resolution)
        
        reports = storage.list_pending_reports()
        
        # Most recent should be first
        assert reports[0]['report_id'] == report_ids[-1]
        assert reports[-1]['report_id'] == report_ids[0]


class TestGetReportPayload:
    """Test get_report_payload functionality."""
    
    def test_get_existing_report(self, storage, sample_payload):
        """Test retrieving an existing report payload."""
        report_id = storage.save_failed_report(sample_payload)
        loaded_payload = storage.get_report_payload(report_id)
        
        assert loaded_payload == sample_payload
    
    def test_get_nonexistent_report_raises_error(self, storage):
        """Test that getting non-existent report raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError, match="Report .* not found"):
            storage.get_report_payload("nonexistent_report")
    
    def test_get_corrupted_json_raises_error(self, storage):
        """Test that corrupted JSON raises ValueError."""
        # Create a corrupted JSON file
        report_id = "report_20260125_000000_corrupted"
        filepath = storage.storage_dir / f"{report_id}.json"
        with open(filepath, 'w') as f:
            f.write("{ invalid json }")
        
        with pytest.raises(ValueError, match="Invalid JSON"):
            storage.get_report_payload(report_id)


class TestDeleteReport:
    """Test delete_report functionality."""
    
    def test_delete_existing_report(self, storage, sample_payload):
        """Test deleting an existing report."""
        report_id = storage.save_failed_report(sample_payload)
        
        # Verify file exists
        filepath = storage.storage_dir / f"{report_id}.json"
        assert filepath.exists()
        
        # Delete report
        result = storage.delete_report(report_id)
        assert result is True
        
        # Verify file is gone
        assert not filepath.exists()
    
    def test_delete_nonexistent_report(self, storage):
        """Test deleting non-existent report returns False."""
        result = storage.delete_report("nonexistent_report")
        assert result is False
    
    def test_delete_removes_from_list(self, storage, sample_payload):
        """Test that deleted report is removed from pending list."""
        report_id = storage.save_failed_report(sample_payload)
        
        # Verify it's in the list
        reports = storage.list_pending_reports()
        assert len(reports) == 1
        
        # Delete it
        storage.delete_report(report_id)
        
        # Verify it's gone from the list
        reports = storage.list_pending_reports()
        assert len(reports) == 0


class TestRetryReport:
    """Test retry_report functionality."""
    
    def test_retry_existing_report(self, storage, sample_payload):
        """Test retry attempt on existing report."""
        report_id = storage.save_failed_report(sample_payload)
        
        # Note: retry_report is a placeholder that returns False
        # This test verifies it doesn't crash
        result = storage.retry_report(report_id)
        assert result is False  # Placeholder implementation
    
    def test_retry_nonexistent_report(self, storage):
        """Test retry attempt on non-existent report."""
        result = storage.retry_report("nonexistent_report")
        assert result is False


class TestGetStorageStats:
    """Test get_storage_stats functionality."""
    
    def test_stats_empty_storage(self, storage):
        """Test statistics for empty storage."""
        stats = storage.get_storage_stats()
        
        assert stats['total_reports'] == 0
        assert stats['total_size_bytes'] == 0
        assert 'storage_dir' in stats
    
    def test_stats_with_reports(self, storage, sample_payload):
        """Test statistics with saved reports."""
        # Save multiple reports
        for i in range(3):
            storage.save_failed_report(sample_payload)
        
        stats = storage.get_storage_stats()
        
        assert stats['total_reports'] == 3
        assert stats['total_size_bytes'] > 0
        assert stats['storage_dir'] == str(storage.storage_dir.absolute())
    
    def test_stats_total_size_calculation(self, storage, sample_payload):
        """Test that total size is calculated correctly."""
        report_id = storage.save_failed_report(sample_payload)
        
        # Get file size directly
        filepath = storage.storage_dir / f"{report_id}.json"
        actual_size = filepath.stat().st_size
        
        # Compare with stats
        stats = storage.get_storage_stats()
        assert stats['total_size_bytes'] == actual_size


class TestEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_large_payload(self, storage):
        """Test saving a large payload."""
        large_payload = {
            "large_data": "x" * 1000000,  # 1MB of data
            "schema_version": "1.0"
        }
        
        report_id = storage.save_failed_report(large_payload)
        loaded = storage.get_report_payload(report_id)
        
        assert loaded == large_payload
    
    def test_nested_payload_structure(self, storage):
        """Test saving deeply nested payload structure."""
        nested_payload = {
            "level1": {
                "level2": {
                    "level3": {
                        "level4": {
                            "data": "deep nesting test"
                        }
                    }
                }
            }
        }
        
        report_id = storage.save_failed_report(nested_payload)
        loaded = storage.get_report_payload(report_id)
        
        assert loaded == nested_payload
    
    def test_concurrent_saves(self, storage, sample_payload):
        """Test multiple concurrent saves don't conflict."""
        report_ids = []
        
        # Simulate concurrent saves
        for i in range(10):
            report_id = storage.save_failed_report(sample_payload)
            report_ids.append(report_id)
        
        # All should have unique IDs
        assert len(report_ids) == len(set(report_ids))
        
        # All should be retrievable
        reports = storage.list_pending_reports()
        assert len(reports) == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
