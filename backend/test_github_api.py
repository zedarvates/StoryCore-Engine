"""
Unit tests for GitHub API integration module.

Tests the create_github_issue function and label generation logic.
"""

import pytest
from unittest.mock import patch, Mock
from backend.github_api import (
    create_github_issue,
    generate_issue_labels,
    GitHubAPIError,
    _generate_issue_title
)


# Sample test payload
SAMPLE_PAYLOAD = {
    "schema_version": "1.0",
    "report_type": "bug",
    "timestamp": "2024-01-15T10:30:00Z",
    "system_info": {
        "storycore_version": "1.0.0",
        "python_version": "3.9.0",
        "os_platform": "Linux",
        "os_version": "Ubuntu 22.04",
        "language": "en_US"
    },
    "module_context": {
        "active_module": "promotion-engine",
        "module_state": {}
    },
    "user_input": {
        "description": "The promotion engine crashes when processing large images",
        "reproduction_steps": "1. Load image > 10MB\n2. Run promotion\n3. Observe crash"
    },
    "diagnostics": {
        "stacktrace": "Traceback (most recent call last)...",
        "logs": ["Log line 1", "Log line 2"],
        "memory_usage_mb": 512.5,
        "process_state": {}
    },
    "screenshot_base64": None
}


class TestLabelGeneration:
    """Test label generation logic"""
    
    def test_bug_report_labels(self):
        """Test labels for bug reports"""
        payload = {
            "report_type": "bug",
            "system_info": {"os_platform": "Linux"},
            "module_context": {"active_module": "promotion-engine"}
        }
        
        labels = generate_issue_labels(payload)
        
        assert "from-storycore" in labels
        assert "bug" in labels
        assert "module:promotion-engine" in labels
        assert "os:linux" in labels
    
    def test_enhancement_labels(self):
        """Test labels for feature requests"""
        payload = {
            "report_type": "enhancement",
            "system_info": {"os_platform": "Darwin"},
            "module_context": {"active_module": "qa-engine"}
        }
        
        labels = generate_issue_labels(payload)
        
        assert "from-storycore" in labels
        assert "enhancement" in labels
        assert "module:qa-engine" in labels
        assert "os:macos" in labels
    
    def test_question_labels(self):
        """Test labels for questions"""
        payload = {
            "report_type": "question",
            "system_info": {"os_platform": "Windows"},
            "module_context": {"active_module": "grid-generator"}
        }
        
        labels = generate_issue_labels(payload)
        
        assert "from-storycore" in labels
        assert "question" in labels
        assert "module:grid-generator" in labels
        assert "os:windows" in labels
    
    def test_labels_without_module(self):
        """Test labels when module is unknown"""
        payload = {
            "report_type": "bug",
            "system_info": {"os_platform": "Linux"},
            "module_context": {"active_module": "unknown"}
        }
        
        labels = generate_issue_labels(payload)
        
        assert "from-storycore" in labels
        assert "bug" in labels
        assert "os:linux" in labels
        # Should not include module label for "unknown"
        assert not any(label.startswith("module:") for label in labels)
    
    def test_labels_without_os(self):
        """Test labels when OS is not recognized"""
        payload = {
            "report_type": "bug",
            "system_info": {"os_platform": "Unknown OS"},
            "module_context": {"active_module": "promotion-engine"}
        }
        
        labels = generate_issue_labels(payload)
        
        assert "from-storycore" in labels
        assert "bug" in labels
        assert "module:promotion-engine" in labels
        # Should not include OS label for unknown platform
        assert not any(label.startswith("os:") for label in labels)


class TestIssueTitleGeneration:
    """Test issue title generation"""
    
    def test_bug_title(self):
        """Test title generation for bug reports"""
        payload = {
            "report_type": "bug",
            "user_input": {"description": "Application crashes on startup"}
        }
        
        title = _generate_issue_title(payload)
        
        assert title.startswith("[Bug]")
        assert "Application crashes on startup" in title
    
    def test_enhancement_title(self):
        """Test title generation for feature requests"""
        payload = {
            "report_type": "enhancement",
            "user_input": {"description": "Add dark mode support"}
        }
        
        title = _generate_issue_title(payload)
        
        assert title.startswith("[Feature Request]")
        assert "Add dark mode support" in title
    
    def test_long_description_truncation(self):
        """Test that long descriptions are truncated"""
        long_description = "A" * 100
        payload = {
            "report_type": "bug",
            "user_input": {"description": long_description}
        }
        
        title = _generate_issue_title(payload)
        
        assert title.startswith("[Bug]")
        assert "..." in title
        assert len(title) < len(long_description) + 20  # Should be truncated


class TestGitHubIssueCreation:
    """Test GitHub issue creation function"""
    
    @patch('backend.github_api.requests.post')
    def test_successful_issue_creation(self, mock_post):
        """Test successful GitHub issue creation"""
        # Mock successful API response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "number": 42,
            "html_url": "https://github.com/zedarvates/StoryCore-Engine/issues/42"
        }
        mock_post.return_value = mock_response
        
        # Call the function
        result = create_github_issue(
            payload=SAMPLE_PAYLOAD,
            github_token="test_token",
            repo_owner="zedarvates",
            repo_name="StoryCore-Engine"
        )
        
        # Verify result
        assert result["issue_number"] == 42
        assert result["issue_url"] == "https://github.com/zedarvates/StoryCore-Engine/issues/42"
        
        # Verify API was called correctly
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        
        # Check URL
        assert call_args[0][0] == "https://api.github.com/repos/zedarvates/StoryCore-Engine/issues"
        
        # Check headers
        headers = call_args[1]["headers"]
        assert "Bearer test_token" in headers["Authorization"]
        assert headers["Accept"] == "application/vnd.github.v3+json"
        
        # Check request body
        request_body = call_args[1]["json"]
        assert "title" in request_body
        assert "body" in request_body
        assert "labels" in request_body
        assert "from-storycore" in request_body["labels"]
    
    @patch('backend.github_api.requests.post')
    def test_authentication_failure(self, mock_post):
        """Test handling of authentication failures"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_post.return_value = mock_response
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="invalid_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "authentication failed" in str(exc_info.value).lower()
    
    @patch('backend.github_api.requests.post')
    def test_rate_limit_error(self, mock_post):
        """Test handling of rate limit errors"""
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.json.return_value = {
            "message": "API rate limit exceeded"
        }
        mock_post.return_value = mock_response
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="test_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "rate limit" in str(exc_info.value).lower()
    
    @patch('backend.github_api.requests.post')
    def test_repository_not_found(self, mock_post):
        """Test handling of repository not found errors"""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_post.return_value = mock_response
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="test_token",
                repo_owner="invalid",
                repo_name="invalid"
            )
        
        assert "not found" in str(exc_info.value).lower()
    
    @patch('backend.github_api.requests.post')
    def test_validation_error(self, mock_post):
        """Test handling of validation errors"""
        mock_response = Mock()
        mock_response.status_code = 422
        mock_response.json.return_value = {
            "message": "Validation Failed",
            "errors": [
                {"field": "title", "code": "missing"}
            ]
        }
        mock_post.return_value = mock_response
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="test_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "validation failed" in str(exc_info.value).lower()
    
    def test_missing_token(self):
        """Test error when token is missing"""
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="PLACEHOLDER_TOKEN",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "not configured" in str(exc_info.value).lower()
    
    def test_empty_payload(self):
        """Test error when payload is empty"""
        with pytest.raises(ValueError) as exc_info:
            create_github_issue(
                payload={},
                github_token="test_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "cannot be empty" in str(exc_info.value).lower()
    
    @patch('backend.github_api.requests.post')
    def test_network_timeout(self, mock_post):
        """Test handling of network timeouts"""
        import requests
        mock_post.side_effect = requests.exceptions.Timeout()
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="test_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "timed out" in str(exc_info.value).lower()
    
    @patch('backend.github_api.requests.post')
    def test_connection_error(self, mock_post):
        """Test handling of connection errors"""
        import requests
        mock_post.side_effect = requests.exceptions.ConnectionError()
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="test_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "connect" in str(exc_info.value).lower()


class TestGitHubAPIError:
    """Test the enhanced GitHubAPIError class"""
    
    def test_error_creation_basic(self):
        """Test basic error creation"""
        error = GitHubAPIError("Test error message")
        
        assert str(error) == "Test error message"
        assert error.error_message == "Test error message"
        assert error.error_code is None
        assert error.error_category == "unknown"
        assert error.recovery_suggestion is not None
        assert len(error.response_details) == 0
    
    def test_error_with_code(self):
        """Test error with status code"""
        error = GitHubAPIError("Test error", error_code=404)
        
        assert str(error) == "Test error (Code: 404) [Category: Resource Not Found]"
        assert error.error_code == 404
        assert error.error_category == "not_found"
    
    def test_error_with_category(self):
        """Test error with explicit category"""
        error = GitHubAPIError("Test error", error_category="rate_limit")
        
        assert str(error) == "Test error [Category: Rate Limit Exceeded]"
        assert error.error_category == "rate_limit"
        assert "rate limit" in error.recovery_suggestion.lower()
    
    def test_error_with_response_details(self):
        """Test error with response details"""
        response_details = {
            "message": "API rate limit exceeded",
            "documentation_url": "https://docs.github.com/en/rest/overview/resources-in-the-rest-api"
        }
        error = GitHubAPIError("Rate limit error", error_code=403, response_details=response_details)
        
        assert error.response_details == response_details
        assert error.error_category == "forbidden"
    
    def test_error_to_dict(self):
        """Test converting error to dictionary"""
        response_details = {"message": "Not found"}
        error = GitHubAPIError(
            "Resource not found",
            error_code=404,
            response_details=response_details
        )
        
        error_dict = error.to_dict()
        
        assert "error" in error_dict
        assert error_dict["error"]["code"] == 404
        assert error_dict["error"]["message"] == "Resource not found"
        assert error_dict["error"]["category"] == "not_found"
        assert error_dict["error"]["category_name"] == "Resource Not Found"
        assert "recovery_suggestion" in error_dict["error"]
        assert error_dict["error"]["response_details"] == response_details
    
    def test_error_category_determination(self):
        """Test error category determination from status code"""
        # Test 401 - Authentication
        error = GitHubAPIError("Auth failed", error_code=401)
        assert error.error_category == "authentication"
        
        # Test 403 - Forbidden
        error = GitHubAPIError("Forbidden", error_code=403)
        assert error.error_category == "forbidden"
        
        # Test 404 - Not Found
        error = GitHubAPIError("Not found", error_code=404)
        assert error.error_category == "not_found"
        
        # Test 422 - Validation
        error = GitHubAPIError("Validation failed", error_code=422)
        assert error.error_category == "validation"
        
        # Test 500 - Server Error
        error = GitHubAPIError("Server error", error_code=500)
        assert error.error_category == "server"
        
        # Test unknown code
        error = GitHubAPIError("Unknown error", error_code=999)
        assert error.error_category == "unknown"
    
    def test_recovery_suggestions(self):
        """Test recovery suggestions for different categories"""
        categories = [
            ("authentication", "Check that your GitHub API token is valid"),
            ("rate_limit", "GitHub API rate limit exceeded"),
            ("not_found", "The specified repository or resource was not found"),
            ("validation", "The request data failed GitHub API validation"),
            ("forbidden", "Access to the GitHub API is forbidden"),
            ("timeout", "The request to GitHub API timed out"),
            ("connection", "Failed to connect to GitHub API"),
            ("server", "GitHub API server error"),
            ("unknown", "An unexpected error occurred")
        ]
        
        for category, expected in categories:
            error = GitHubAPIError("Test error", error_category=category)
            assert expected in error.recovery_suggestion
    
    def test_error_repr(self):
        """Test error representation"""
        error = GitHubAPIError(
            "Test error",
            error_code=404,
            error_category="not_found",
            response_details={"message": "Not found"}
        )
        
        repr_str = repr(error)
        assert "GitHubAPIError" in repr_str
        assert "Test error" in repr_str
        assert "404" in repr_str
        assert "not_found" in repr_str
        assert "Not found" in repr_str


class TestEnhancedErrorHandling:
    """Test enhanced error handling in create_github_issue"""
    
    @patch('backend.github_api.requests.post')
    def test_error_with_response_details_401(self, mock_post):
        """Test authentication error includes response details"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.json.return_value = {
            "message": "Bad credentials",
            "documentation_url": "https://docs.github.com/rest"
        }
        mock_post.return_value = mock_response
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="invalid_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "authentication failed" in str(exc_info.value).lower()
        assert exc_info.value.error_code == 401
        assert exc_info.value.error_category == "authentication"
        assert "Bad credentials" in exc_info.value.response_details.get("message", "")
    
    @patch('backend.github_api.requests.post')
    def test_error_with_response_details_422(self, mock_post):
        """Test validation error includes detailed response"""
        mock_response = Mock()
        mock_response.status_code = 422
        mock_response.json.return_value = {
            "message": "Validation Failed",
            "errors": [
                {"field": "title", "code": "missing"}
            ]
        }
        mock_post.return_value = mock_response
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="test_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "validation failed" in str(exc_info.value).lower()
        assert exc_info.value.error_code == 422
        assert exc_info.value.error_category == "validation"
        assert len(exc_info.value.response_details.get("errors", [])) == 1
    
    @patch('backend.github_api.requests.post')
    def test_timeout_error_category(self, mock_post):
        """Test timeout error has correct category"""
        import requests
        mock_post.side_effect = requests.exceptions.Timeout()
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="test_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "timed out" in str(exc_info.value).lower()
        assert exc_info.value.error_category == "timeout"
        assert exc_info.value.error_code is None
    
    @patch('backend.github_api.requests.post')
    def test_connection_error_category(self, mock_post):
        """Test connection error has correct category"""
        import requests
        mock_post.side_effect = requests.exceptions.ConnectionError()
        
        with pytest.raises(GitHubAPIError) as exc_info:
            create_github_issue(
                payload=SAMPLE_PAYLOAD,
                github_token="test_token",
                repo_owner="zedarvates",
                repo_name="StoryCore-Engine"
            )
        
        assert "connect" in str(exc_info.value).lower()
        assert exc_info.value.error_category == "connection"
        assert exc_info.value.error_code is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
