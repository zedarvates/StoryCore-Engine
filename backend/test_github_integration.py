"""
Integration test for GitHub API integration with feedback proxy endpoint.

This test verifies that the /report endpoint correctly integrates with
the GitHub API module to create issues.
"""

import pytest
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from datetime import datetime

# Import the FastAPI app
from backend.feedback_proxy import app

# Create test client
client = TestClient(app)


def create_valid_payload():
    """Create a valid report payload for testing"""
    return {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.utcnow().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux",
            "os_version": "Ubuntu 22.04",
            "language": "en-US"
        },
        "module_context": {
            "active_module": "promotion-engine",
            "module_state": {"status": "processing"}
        },
        "user_input": {
            "description": "This is a test bug report with sufficient length to pass validation",
            "reproduction_steps": "1. Open app\n2. Click button\n3. See error"
        },
        "diagnostics": {
            "stacktrace": "Traceback (most recent call last):\n  File test.py, line 10\n    raise Exception('Test')",
            "logs": ["Log line 1", "Log line 2", "Log line 3"],
            "memory_usage_mb": 256.5,
            "process_state": {"cpu_percent": 15.2}
        },
        "screenshot_base64": None
    }


class TestGitHubIntegration:
    """Test GitHub API integration with feedback proxy"""
    
    @patch('backend.feedback_proxy.settings.github_api_token', 'test_token_123')
    @patch('backend.github_api.requests.post')
    def test_successful_issue_creation_via_endpoint(self, mock_post):
        """Test that the endpoint successfully creates a GitHub issue"""
        # Mock successful GitHub API response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "number": 123,
            "html_url": "https://github.com/zedarvates/StoryCore-Engine/issues/123"
        }
        mock_post.return_value = mock_response
        
        # Send request to endpoint
        payload = create_valid_payload()
        response = client.post("/api/v1/report", json=payload)
        
        # Verify response
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["status"] == "success"
        assert response_data["issue_number"] == 123
        assert "github.com" in response_data["issue_url"]
        assert "/issues/123" in response_data["issue_url"]
        
        # Verify GitHub API was called
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        
        # Verify API endpoint
        assert "api.github.com" in call_args[0][0]
        assert "/repos/zedarvates/StoryCore-Engine/issues" in call_args[0][0]
        
        # Verify request includes labels
        request_body = call_args[1]["json"]
        assert "labels" in request_body
        assert "from-storycore" in request_body["labels"]
        assert "bug" in request_body["labels"]
    
    @patch('backend.feedback_proxy.settings.github_api_token', 'test_token_123')
    @patch('backend.github_api.requests.post')
    def test_github_authentication_failure(self, mock_post):
        """Test handling of GitHub authentication failures"""
        # Mock authentication failure
        mock_response = Mock()
        mock_response.status_code = 401
        mock_post.return_value = mock_response
        
        # Send request to endpoint
        payload = create_valid_payload()
        response = client.post("/api/v1/report", json=payload)
        
        # Verify error response
        assert response.status_code == 502  # Bad Gateway
        response_data = response.json()
        assert response_data["status"] == "error"
        assert "authentication" in response_data["message"].lower()
        assert response_data["fallback_mode"] == "manual"
    
    @patch('backend.feedback_proxy.settings.github_api_token', 'test_token_123')
    @patch('backend.github_api.requests.post')
    def test_github_rate_limit(self, mock_post):
        """Test handling of GitHub rate limit errors"""
        # Mock rate limit error
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.json.return_value = {
            "message": "API rate limit exceeded"
        }
        mock_post.return_value = mock_response
        
        # Send request to endpoint
        payload = create_valid_payload()
        response = client.post("/api/v1/report", json=payload)
        
        # Verify error response
        assert response.status_code == 502
        response_data = response.json()
        assert response_data["status"] == "error"
        assert "rate limit" in response_data["message"].lower()
    
    @patch('backend.feedback_proxy.settings.github_api_token', 'test_token_123')
    @patch('backend.github_api.requests.post')
    def test_github_network_timeout(self, mock_post):
        """Test handling of network timeouts"""
        import requests
        mock_post.side_effect = requests.exceptions.Timeout()
        
        # Send request to endpoint
        payload = create_valid_payload()
        response = client.post("/api/v1/report", json=payload)
        
        # Verify error response
        assert response.status_code == 502
        response_data = response.json()
        assert response_data["status"] == "error"
        assert "timed out" in response_data["message"].lower()
    
    @patch('backend.feedback_proxy.settings.github_api_token', 'test_token_123')
    @patch('backend.github_api.requests.post')
    def test_enhancement_request_labels(self, mock_post):
        """Test that enhancement requests get correct labels"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "number": 456,
            "html_url": "https://github.com/zedarvates/StoryCore-Engine/issues/456"
        }
        mock_post.return_value = mock_response
        
        # Create enhancement payload
        payload = create_valid_payload()
        payload["report_type"] = "enhancement"
        payload["system_info"]["os_platform"] = "Darwin"
        
        # Send request
        response = client.post("/api/v1/report", json=payload)
        
        # Verify success
        assert response.status_code == 200
        
        # Verify labels
        call_args = mock_post.call_args
        request_body = call_args[1]["json"]
        labels = request_body["labels"]
        
        assert "from-storycore" in labels
        assert "enhancement" in labels
        assert "os:macos" in labels
    
    @patch('backend.feedback_proxy.settings.github_api_token', 'test_token_123')
    @patch('backend.github_api.requests.post')
    def test_question_with_windows_os(self, mock_post):
        """Test question report with Windows OS"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "number": 789,
            "html_url": "https://github.com/zedarvates/StoryCore-Engine/issues/789"
        }
        mock_post.return_value = mock_response
        
        # Create question payload
        payload = create_valid_payload()
        payload["report_type"] = "question"
        payload["system_info"]["os_platform"] = "Windows"
        payload["module_context"]["active_module"] = "qa-engine"
        
        # Send request
        response = client.post("/api/v1/report", json=payload)
        
        # Verify success
        assert response.status_code == 200
        
        # Verify labels
        call_args = mock_post.call_args
        request_body = call_args[1]["json"]
        labels = request_body["labels"]
        
        assert "from-storycore" in labels
        assert "question" in labels
        assert "os:windows" in labels
        assert "module:qa-engine" in labels
    
    @patch('backend.feedback_proxy.settings.github_api_token', 'test_token_123')
    @patch('backend.github_api.requests.post')
    def test_issue_body_contains_diagnostics(self, mock_post):
        """Test that issue body includes diagnostic information"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "number": 999,
            "html_url": "https://github.com/zedarvates/StoryCore-Engine/issues/999"
        }
        mock_post.return_value = mock_response
        
        # Send request
        payload = create_valid_payload()
        response = client.post("/api/v1/report", json=payload)
        
        # Verify success
        assert response.status_code == 200
        
        # Verify issue body contains expected sections
        call_args = mock_post.call_args
        request_body = call_args[1]["json"]
        issue_body = request_body["body"]
        
        # Check for required sections
        assert "## Report Type" in issue_body
        assert "## System Context" in issue_body
        assert "## Description" in issue_body
        assert "## Diagnostics" in issue_body
        
        # Check for diagnostic details
        assert "StoryCore Version" in issue_body
        assert "1.0.0" in issue_body
        assert "promotion-engine" in issue_body
        assert "Traceback" in issue_body


def test_health_check():
    """Test that health check endpoint works"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "StoryCore" in data["service"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
