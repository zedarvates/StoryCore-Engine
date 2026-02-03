"""
Integration Test for Schema Version Handling in Backend Proxy

Tests that the backend proxy correctly handles and migrates payloads
from different schema versions.

Requirements: 9.5 (Backward Compatibility), 23.1 (Schema Version Handling)
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.feedback_proxy import app, initialize_rate_limiter


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset rate limiter before each test."""
    # Re-initialize with high limits for testing
    initialize_rate_limiter(max_requests=1000, time_window_seconds=3600)
    yield


@pytest.fixture
def mock_github_api():
    """Mock the GitHub API to avoid actual API calls."""
    with patch('backend.feedback_proxy.create_github_issue') as mock:
        mock.return_value = {
            "issue_url": "https://github.com/zedarvates/StoryCore-Engine/issues/123",
            "issue_number": 123
        }
        yield mock


class TestSchemaVersionHandling:
    """Test schema version handling in the backend proxy."""
    
    def test_current_version_payload_accepted(self, client, mock_github_api):
        """Test that current version (1.0) payloads are accepted."""
        payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Test bug report with current schema version"
            },
            "module_context": {
                "active_module": "grid-generator",
                "module_state": {}
            },
            "diagnostics": {
                "stacktrace": None,
                "logs": [],
                "memory_usage_mb": 100,
                "process_state": {}
            },
            "screenshot_base64": None
        }
        
        response = client.post("/api/v1/report", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "issue_url" in data
        assert mock_github_api.called
    
    def test_phase1_payload_migrated_and_accepted(self, client, mock_github_api):
        """Test that Phase 1 payloads (no schema_version) are migrated and accepted."""
        # Phase 1 payload - missing schema_version, module_context, diagnostics, screenshot
        phase1_payload = {
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Darwin"
            },
            "user_input": {
                "description": "Bug report from Phase 1 implementation without schema version"
            }
        }
        
        response = client.post("/api/v1/report", json=phase1_payload)
        
        # Should succeed after migration
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "issue_url" in data
        
        # Verify GitHub API was called with migrated payload
        assert mock_github_api.called
        call_args = mock_github_api.call_args
        migrated_payload = call_args.kwargs["payload"]
        
        # Check that migration added missing fields
        assert migrated_payload["schema_version"] == "1.0"
        assert "module_context" in migrated_payload
        assert "diagnostics" in migrated_payload
        assert "screenshot_base64" in migrated_payload
    
    def test_version_0_9_payload_migrated(self, client, mock_github_api):
        """Test that version 0.9 payloads are migrated to 1.0."""
        old_payload = {
            "schema_version": "0.9",
            "report_type": "enhancement",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Windows"
            },
            "user_input": {
                "description": "Feature request from version 0.9 of the system"
            }
        }
        
        response = client.post("/api/v1/report", json=old_payload)
        
        # Should succeed after migration
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        # Verify migration occurred
        assert mock_github_api.called
        call_args = mock_github_api.call_args
        migrated_payload = call_args.kwargs["payload"]
        assert migrated_payload["schema_version"] == "1.0"
    
    def test_unsupported_version_rejected(self, client, mock_github_api):
        """Test that unsupported schema versions are rejected."""
        future_payload = {
            "schema_version": "2.0",  # Future version not yet supported
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Report with unsupported schema version"
            }
        }
        
        response = client.post("/api/v1/report", json=future_payload)
        
        # Should be rejected
        assert response.status_code == 400
        data = response.json()
        assert data["status"] == "error"
        assert "unsupported" in data["message"].lower() or "2.0" in data["message"]
        
        # GitHub API should not be called
        assert not mock_github_api.called
    
    def test_migration_preserves_data(self, client, mock_github_api):
        """Test that migration preserves existing data in the payload."""
        payload_with_data = {
            "schema_version": "0.9",
            "report_type": "question",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Darwin",
                "os_version": "14.0",
                "language": "en_US"
            },
            "user_input": {
                "description": "Question with detailed information that should be preserved",
                "reproduction_steps": "Step 1\nStep 2\nStep 3"
            },
            "module_context": {
                "active_module": "promotion-engine",
                "module_state": {"key": "value"}
            }
        }
        
        response = client.post("/api/v1/report", json=payload_with_data)
        
        assert response.status_code == 200
        
        # Verify data was preserved
        assert mock_github_api.called
        call_args = mock_github_api.call_args
        migrated_payload = call_args.kwargs["payload"]
        
        # Check preserved data
        assert migrated_payload["system_info"]["os_version"] == "14.0"
        assert migrated_payload["system_info"]["language"] == "en_US"
        assert migrated_payload["user_input"]["reproduction_steps"] == "Step 1\nStep 2\nStep 3"
        assert migrated_payload["module_context"]["active_module"] == "promotion-engine"
        assert migrated_payload["module_context"]["module_state"]["key"] == "value"
    
    def test_partial_1_0_payload_completed(self, client, mock_github_api):
        """Test that partial 1.0 payloads have missing fields added."""
        partial_payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Bug report with some missing optional fields"
            }
            # Missing: module_context, diagnostics, screenshot_base64
        }
        
        response = client.post("/api/v1/report", json=partial_payload)
        
        assert response.status_code == 200
        
        # Verify missing fields were added
        assert mock_github_api.called
        call_args = mock_github_api.call_args
        completed_payload = call_args.kwargs["payload"]
        
        assert "module_context" in completed_payload
        assert "diagnostics" in completed_payload
        assert "screenshot_base64" in completed_payload


class TestSchemaVersionLogging:
    """Test that schema version information is properly logged."""
    
    def test_schema_version_logged(self, client, mock_github_api, caplog):
        """Test that schema version is logged during processing."""
        import logging
        caplog.set_level(logging.INFO)
        
        payload = {
            "schema_version": "1.0",
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Linux"
            },
            "user_input": {
                "description": "Test for schema version logging"
            },
            "module_context": None,
            "diagnostics": None,
            "screenshot_base64": None
        }
        
        response = client.post("/api/v1/report", json=payload)
        
        assert response.status_code == 200
        
        # Check that schema version was logged
        log_messages = [record.message for record in caplog.records]
        assert any("schema version" in msg.lower() and "1.0" in msg for msg in log_messages)
    
    def test_migration_logged(self, client, mock_github_api, caplog):
        """Test that migration is logged when it occurs."""
        import logging
        caplog.set_level(logging.INFO)
        
        phase1_payload = {
            "report_type": "bug",
            "timestamp": "2024-01-01T00:00:00Z",
            "system_info": {
                "storycore_version": "0.1.0",
                "python_version": "3.9.0",
                "os_platform": "Darwin"
            },
            "user_input": {
                "description": "Test for migration logging"
            }
        }
        
        response = client.post("/api/v1/report", json=phase1_payload)
        
        assert response.status_code == 200
        
        # Check that migration was logged
        log_messages = [record.message for record in caplog.records]
        assert any("migrat" in msg.lower() for msg in log_messages)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
