"""
Test suite for pending reports retry endpoints

This test suite verifies:
- Listing pending reports
- Retrying pending reports (Automatic Mode)
- Deleting pending reports
- Fallback to Manual Mode when backend unavailable

Requirements: 8.2 - Local storage on failure with retry capability
Task: 20.2 - Implement retry logic
"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Import the FastAPI app
from backend.feedback_proxy import app, settings
from src.feedback_storage import FeedbackStorage


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


@pytest.fixture
def temp_storage_dir():
    """Create a temporary storage directory for testing"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    # Cleanup after test
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def storage(temp_storage_dir):
    """Create a FeedbackStorage instance with temporary directory"""
    return FeedbackStorage(storage_dir=temp_storage_dir)


@pytest.fixture
def sample_payload():
    """Create a sample report payload for testing"""
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
            "description": "This is a test bug report for retry functionality",
            "reproduction_steps": "Step 1: Do something\nStep 2: See error"
        },
        "diagnostics": {
            "stacktrace": "Traceback (most recent call last)...",
            "logs": ["Log line 1", "Log line 2"],
            "memory_usage_mb": 256.5,
            "process_state": {}
        },
        "screenshot_base64": None
    }


class TestListPendingReports:
    """Test the /api/feedback/pending endpoint"""
    
    def test_list_empty_pending_reports(self, client, temp_storage_dir):
        """Test listing when no pending reports exist"""
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class:
            mock_storage = MagicMock()
            mock_storage.list_pending_reports.return_value = []
            mock_storage_class.return_value = mock_storage
            
            response = client.get("/api/feedback/pending")
            
            assert response.status_code == 200
            assert response.json() == []
    
    def test_list_pending_reports_with_data(self, client, storage, sample_payload):
        """Test listing when pending reports exist"""
        # Save a report to storage
        report_id = storage.save_failed_report(sample_payload)
        
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class:
            mock_storage_class.return_value = storage
            
            response = client.get("/api/feedback/pending")
            
            assert response.status_code == 200
            reports = response.json()
            assert len(reports) == 1
            assert reports[0]['report_id'] == report_id
            assert 'filename' in reports[0]
            assert 'timestamp' in reports[0]
            assert 'size_bytes' in reports[0]
    
    def test_list_pending_reports_error_handling(self, client):
        """Test error handling when listing fails"""
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class:
            mock_storage = MagicMock()
            mock_storage.list_pending_reports.side_effect = Exception("Storage error")
            mock_storage_class.return_value = mock_storage
            
            response = client.get("/api/feedback/pending")
            
            assert response.status_code == 500
            # The error handler wraps the response
            response_data = response.json()
            assert "Failed to list pending reports" in response_data.get('detail', response_data.get('message', ''))


class TestRetryPendingReport:
    """Test the /api/feedback/retry/{report_id} endpoint"""
    
    def test_retry_report_success(self, client, storage, sample_payload):
        """Test successful retry of a pending report"""
        # Save a report to storage
        report_id = storage.save_failed_report(sample_payload)
        
        # Mock the GitHub API to return success
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class, \
             patch('backend.feedback_proxy.create_github_issue') as mock_github:
            
            mock_storage_class.return_value = storage
            mock_github.return_value = {
                "issue_url": "https://github.com/zedarvates/StoryCore-Engine/issues/123",
                "issue_number": 123
            }
            
            response = client.post(f"/api/feedback/retry/{report_id}")
            
            assert response.status_code == 200
            result = response.json()
            assert result['success'] is True
            assert 'issue_url' in result
            assert 'issue_number' in result
            
            # Verify report was deleted from storage
            pending = storage.list_pending_reports()
            assert len(pending) == 0
    
    def test_retry_report_not_found(self, client, storage):
        """Test retry when report doesn't exist"""
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class:
            mock_storage_class.return_value = storage
            
            response = client.post("/api/feedback/retry/nonexistent_report")
            
            assert response.status_code == 404
            response_data = response.json()
            assert "not found" in response_data.get('detail', response_data.get('message', '')).lower()
    
    def test_retry_report_github_api_error(self, client, storage, sample_payload):
        """Test retry when GitHub API fails"""
        # Save a report to storage
        report_id = storage.save_failed_report(sample_payload)
        
        # Mock the GitHub API to raise an error
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class, \
             patch('backend.feedback_proxy.create_github_issue') as mock_github:
            
            mock_storage_class.return_value = storage
            from backend.github_api import GitHubAPIError
            mock_github.side_effect = GitHubAPIError("API rate limit exceeded")
            
            response = client.post(f"/api/feedback/retry/{report_id}")
            
            assert response.status_code == 200
            result = response.json()
            assert result['success'] is False
            assert 'error' in result
            assert result['fallback_mode'] == 'manual'
            
            # Verify report was NOT deleted from storage (for manual retry)
            pending = storage.list_pending_reports()
            assert len(pending) == 1
    
    def test_retry_report_rate_limit_exceeded(self, client, storage, sample_payload):
        """Test retry when rate limit is exceeded"""
        # Save a report to storage
        report_id = storage.save_failed_report(sample_payload)
        
        # Mock rate limiter to return rate limit exceeded
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class, \
             patch('backend.feedback_proxy.get_rate_limiter') as mock_limiter:
            
            mock_storage_class.return_value = storage
            mock_rate_limiter = MagicMock()
            mock_rate_limiter.check_rate_limit.return_value = (False, 3600)  # Not allowed, retry after 1 hour
            mock_limiter.return_value = mock_rate_limiter
            
            response = client.post(f"/api/feedback/retry/{report_id}")
            
            assert response.status_code == 200
            result = response.json()
            assert result['success'] is False
            assert 'rate limit' in result['error'].lower()
            assert result['fallback_mode'] == 'manual'
    
    def test_retry_report_invalid_payload(self, client, storage):
        """Test retry when report payload is invalid"""
        # Create an invalid payload (missing required fields)
        invalid_payload = {
            "schema_version": "1.0",
            "report_type": "bug"
            # Missing required fields
        }
        
        report_id = storage.save_failed_report(invalid_payload)
        
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class:
            mock_storage_class.return_value = storage
            
            response = client.post(f"/api/feedback/retry/{report_id}")
            
            assert response.status_code == 400
            response_data = response.json()
            assert "invalid" in response_data.get('detail', response_data.get('message', '')).lower()


class TestDeletePendingReport:
    """Test the /api/feedback/delete/{report_id} endpoint"""
    
    def test_delete_report_success(self, client, storage, sample_payload):
        """Test successful deletion of a pending report"""
        # Save a report to storage
        report_id = storage.save_failed_report(sample_payload)
        
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class:
            mock_storage_class.return_value = storage
            
            response = client.delete(f"/api/feedback/delete/{report_id}")
            
            assert response.status_code == 200
            assert response.json()['success'] is True
            
            # Verify report was deleted
            pending = storage.list_pending_reports()
            assert len(pending) == 0
    
    def test_delete_report_not_found(self, client, storage):
        """Test deletion when report doesn't exist"""
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class:
            mock_storage_class.return_value = storage
            
            response = client.delete("/api/feedback/delete/nonexistent_report")
            
            assert response.status_code == 404
            response_data = response.json()
            assert "not found" in response_data.get('detail', response_data.get('message', '')).lower()
    
    def test_delete_report_error_handling(self, client):
        """Test error handling when deletion fails"""
        with patch('src.feedback_storage.FeedbackStorage') as mock_storage_class:
            mock_storage = MagicMock()
            mock_storage.delete_report.side_effect = Exception("Storage error")
            mock_storage_class.return_value = mock_storage
            
            response = client.delete("/api/feedback/delete/some_report")
            
            assert response.status_code == 500
            response_data = response.json()
            assert "Failed to delete report" in response_data.get('detail', response_data.get('message', ''))


class TestFeedbackStorageRetryMethod:
    """Test the FeedbackStorage.retry_report method"""
    
    def test_retry_report_automatic_mode_success(self, storage, sample_payload):
        """Test retry via Automatic Mode with successful submission"""
        # Save a report
        report_id = storage.save_failed_report(sample_payload)
        
        # Mock successful backend response
        with patch('requests.post') as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "status": "success",
                "issue_url": "https://github.com/zedarvates/StoryCore-Engine/issues/123",
                "issue_number": 123
            }
            mock_post.return_value = mock_response
            
            success, error, result = storage.retry_report(report_id)
            
            assert success is True
            assert error is None
            assert result['mode'] == 'automatic'
            assert 'issue_url' in result
            assert 'issue_number' in result
            
            # Verify report was deleted
            pending = storage.list_pending_reports()
            assert len(pending) == 0
    
    def test_retry_report_backend_unavailable(self, storage, sample_payload):
        """Test retry when backend is unavailable (fallback to Manual Mode)"""
        # Save a report
        report_id = storage.save_failed_report(sample_payload)
        
        # Mock connection error
        with patch('requests.post') as mock_post:
            import requests
            mock_post.side_effect = requests.exceptions.ConnectionError("Connection refused")
            
            success, error, result = storage.retry_report(report_id)
            
            assert success is False
            assert "unavailable" in error.lower()
            assert result['fallback_mode'] == 'manual'
            
            # Verify report was NOT deleted (for manual retry)
            pending = storage.list_pending_reports()
            assert len(pending) == 1
    
    def test_retry_report_rate_limit(self, storage, sample_payload):
        """Test retry when rate limit is exceeded"""
        # Save a report
        report_id = storage.save_failed_report(sample_payload)
        
        # Mock rate limit response
        with patch('requests.post') as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 429
            mock_response.text = "Rate limit exceeded"
            mock_post.return_value = mock_response
            
            success, error, result = storage.retry_report(report_id)
            
            assert success is False
            assert "rate limit" in error.lower()
            assert result['fallback_mode'] == 'manual'
    
    def test_retry_report_payload_too_large(self, storage, sample_payload):
        """Test retry when payload is too large"""
        # Save a report
        report_id = storage.save_failed_report(sample_payload)
        
        # Mock payload too large response
        with patch('requests.post') as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 413
            mock_response.text = "Payload too large"
            mock_post.return_value = mock_response
            
            success, error, result = storage.retry_report(report_id)
            
            assert success is False
            assert "too large" in error.lower()
            assert result['fallback_mode'] == 'manual'
    
    def test_retry_report_not_found(self, storage):
        """Test retry when report doesn't exist"""
        success, error, result = storage.retry_report("nonexistent_report")
        
        assert success is False
        assert "not found" in error.lower() or "failed to load" in error.lower()
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
