"""
GitHub API Integration Module

Provides functions for creating GitHub issues via the REST API v3.
This module handles authentication, request formatting, and error handling
for GitHub API interactions.

Requirements: 5.3, 5.4, 5.7
"""

import logging
from typing import Dict, Any, Tuple, Optional
import requests

# Import the template generator for label generation
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.github_template_generator import GitHubTemplateGenerator

logger = logging.getLogger(__name__)


class GitHubAPIError(Exception):
    """Exception raised for GitHub API errors.
    
    Provides comprehensive error handling with error codes, detailed messages,
    and recovery suggestions for debugging GitHub integration issues.
    
    Attributes:
        message: Detailed error message describing what went wrong
        error_code: Error identifier string (e.g., 'RATE_LIMIT', 'AUTH_FAILED')
        status_code: HTTP status code from the API response
        recovery_suggestions: List of suggestions for recovering from the error
        response_details: Raw API response details for debugging
    """
    
    # Error code constants
    RATE_LIMIT = 'RATE_LIMIT'
    AUTH_FAILED = 'AUTH_FAILED'
    NOT_FOUND = 'NOT_FOUND'
    NETWORK_ERROR = 'NETWORK_ERROR'
    PERMISSION_DENIED = 'PERMISSION_DENIED'
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    SERVER_ERROR = 'SERVER_ERROR'
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    
    # Error code display names
    ERROR_NAMES = {
        RATE_LIMIT: "Rate Limit Exceeded",
        AUTH_FAILED: "Authentication Failed",
        NOT_FOUND: "Resource Not Found",
        NETWORK_ERROR: "Network Error",
        PERMISSION_DENIED: "Permission Denied",
        VALIDATION_ERROR: "Validation Error",
        SERVER_ERROR: "Server Error",
        UNKNOWN_ERROR: "Unknown Error"
    }
    
    # Recovery suggestions by error code
    RECOVERY_SUGGESTIONS = {
        RATE_LIMIT: [
            "Wait 60 minutes before retrying",
            "Check your rate limit status at https://api.github.com/rate_limit",
            "Consider using a different API token with higher rate limits",
            "Reduce the frequency of API requests"
        ],
        AUTH_FAILED: [
            "Check your GitHub token is valid",
            "Ensure the token is not expired or revoked",
            "Verify the token has the required scopes (repo, user)",
            "Check the GITHUB_API_TOKEN environment variable is set correctly"
        ],
        NOT_FOUND: [
            "Verify the repository/issue exists",
            "Check the repository owner and name are correct",
            "Ensure you have access to the repository",
            "Verify the resource hasn't been deleted or made private"
        ],
        NETWORK_ERROR: [
            "Check your internet connection",
            "Verify GitHub API is accessible (status.github.com)",
            "Try again in a few minutes",
            "Check for any firewall or proxy issues"
        ],
        PERMISSION_DENIED: [
            "Check your token has the necessary permissions",
            "Verify you have write access to the repository",
            "Ensure the token has 'repo' scope for private repositories",
            "Check if 2FA is required for the operation"
        ],
        VALIDATION_ERROR: [
            "Check the error details for specific field requirements",
            "Ensure all required fields are provided",
            "Verify field values match GitHub's validation rules",
            "Check for invalid characters or formatting in input"
        ],
        SERVER_ERROR: [
            "Wait a few minutes and try again",
            "Check GitHub's status page at status.github.com",
            "Retry with exponential backoff",
            "Report the issue if it persists"
        ],
        UNKNOWN_ERROR: [
            "Check the error details for more information",
            "Try the operation again",
            "Report the issue with error details if it persists"
        ]
    }
    
    # HTTP status code to error code mapping
    STATUS_CODE_MAP = {
        401: AUTH_FAILED,
        403: PERMISSION_DENIED,  # Could also be RATE_LIMIT, handled separately
        404: NOT_FOUND,
        422: VALIDATION_ERROR,
    }
    
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        recovery_suggestions: Optional[list] = None,
        response_details: Optional[Dict[str, Any]] = None
    ):
        """Initialize GitHubAPIError with comprehensive error details.
        
        Args:
            message: Detailed error message
            error_code: Error identifier string (e.g., 'RATE_LIMIT', 'AUTH_FAILED')
            status_code: HTTP status code from the API response
            recovery_suggestions: List of recovery suggestions (uses defaults if not provided)
            response_details: Raw API response details for debugging
        """
        self.message = message
        self.error_code = error_code or self._determine_error_code(status_code)
        self.status_code = status_code
        self.recovery_suggestions = recovery_suggestions or self.RECOVERY_SUGGESTIONS.get(
            self.error_code, self.RECOVERY_SUGGESTIONS[self.UNKNOWN_ERROR]
        )
        self.response_details = response_details or {}
        
        # Call parent with formatted message
        super().__init__(self._format_message())
    
    def _determine_error_code(self, status_code: Optional[int]) -> str:
        """Determine error code from HTTP status code.
        
        Args:
            status_code: HTTP status code
            
        Returns:
            Error code string
        """
        if status_code is None:
            return self.UNKNOWN_ERROR
        
        if status_code in self.STATUS_CODE_MAP:
            return self.STATUS_CODE_MAP[status_code]
        
        if 500 <= status_code < 600:
            return self.SERVER_ERROR
        
        if 400 <= status_code < 500:
            return self.VALIDATION_ERROR
        
        return self.UNKNOWN_ERROR
    
    def _format_message(self) -> str:
        """Format the error message with all available details.
        
        Returns:
            Formatted error message string
        """
        parts = [self.message]
        
        if self.error_code and self.error_code != self.UNKNOWN_ERROR:
            error_name = self.ERROR_NAMES.get(self.error_code, self.error_code)
            parts.append(f" [{error_name}]")
        
        if self.status_code:
            parts.append(f" (HTTP {self.status_code})")
        
        return "".join(parts)
    
    def __str__(self) -> str:
        """String representation of the error.
        
        Returns:
            Formatted error message with recovery suggestions
        """
        base_message = self._format_message()
        
        if self.recovery_suggestions:
            suggestions_text = "\n".join(
                f"  - {suggestion}" for suggestion in self.recovery_suggestions
            )
            return f"{base_message}\n\nRecovery suggestions:\n{suggestions_text}"
        
        return base_message
    
    def __repr__(self) -> str:
        """Debug representation of the error.
        
        Returns:
            Detailed string representation for debugging
        """
        return (
            f"GitHubAPIError("
            f"message={repr(self.message)}, "
            f"error_code={repr(self.error_code)}, "
            f"status_code={self.status_code}, "
            f"recovery_suggestions={repr(self.recovery_suggestions)}, "
            f"response_details={repr(self.response_details)}"
            f")"
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for serialization.
        
        Returns:
            Dictionary containing all error details
        """
        return {
            "error": {
                "message": self.message,
                "error_code": self.error_code,
                "error_name": self.ERROR_NAMES.get(self.error_code, self.error_code),
                "status_code": self.status_code,
                "recovery_suggestions": self.recovery_suggestions,
                "response_details": self.response_details
            }
        }
    
    @property
    def error_name(self) -> str:
        """Get the human-readable error name.
        
        Returns:
            Human-readable error name
        """
        return self.ERROR_NAMES.get(self.error_code, self.error_code)


def create_github_issue(
    payload: Dict[str, Any],
    github_token: str,
    repo_owner: str = "zedarvates",
    repo_name: str = "StoryCore-Engine"
) -> Dict[str, Any]:
    """
    Create a GitHub issue using the REST API v3.
    
    This function:
    1. Generates the issue title and body from the payload
    2. Generates appropriate labels based on report type, module, and OS
    3. Makes an authenticated POST request to the GitHub API
    4. Returns the created issue URL and number
    
    Requirements: 5.3
    
    Args:
        payload: Report payload dictionary containing all report data
        github_token: GitHub personal access token for authentication
        repo_owner: GitHub repository owner (default: "zedarvates")
        repo_name: GitHub repository name (default: "StoryCore-Engine")
    
    Returns:
        Dictionary containing:
        - issue_url: Full URL to the created issue
        - issue_number: GitHub issue number
        - html_url: HTML URL to view the issue
    
    Raises:
        GitHubAPIError: If the API request fails
        ValueError: If required parameters are missing or invalid
    
    Example:
        >>> result = create_github_issue(payload, "ghp_token123")
        >>> print(result['issue_url'])
        https://github.com/zedarvates/StoryCore-Engine/issues/42
    """
    # Validate inputs
    if not payload:
        raise ValueError("Payload cannot be empty")
    
    if not github_token or github_token == "PLACEHOLDER_TOKEN":
        raise GitHubAPIError(
            message="GitHub API token not configured. "
                   "Set the GITHUB_API_TOKEN environment variable.",
            error_code=GitHubAPIError.AUTH_FAILED,
            recovery_suggestions=[
                "Set the GITHUB_API_TOKEN environment variable with a valid GitHub token",
                "Create a personal access token at https://github.com/settings/tokens",
                "Ensure the token has 'repo' scope for repository access"
            ]
        )
    
    if not repo_owner or not repo_name:
        raise ValueError("Repository owner and name are required")
    
    logger.info(f"Creating GitHub issue in {repo_owner}/{repo_name}")
    
    try:
        # Initialize template generator
        template_generator = GitHubTemplateGenerator(
            repository=f"{repo_owner}/{repo_name}"
        )
        
        # Generate issue body using the template generator
        issue_body = template_generator.format_issue_body(payload)
        
        # Generate issue title
        issue_title = _generate_issue_title(payload)
        
        # Generate labels
        labels = _generate_issue_labels(payload)
        
        logger.info(f"Issue title: {issue_title}")
        logger.info(f"Issue labels: {labels}")
        
        # Prepare the API request
        api_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/issues"
        
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {github_token}",
            "Content-Type": "application/json",
            "User-Agent": "StoryCore-Engine-Feedback-Proxy/1.0"
        }
        
        request_body = {
            "title": issue_title,
            "body": issue_body,
            "labels": labels
        }
        
        # Make the API request
        logger.info(f"Sending POST request to {api_url}")
        response = requests.post(
            api_url,
            json=request_body,
            headers=headers,
            timeout=30  # 30 second timeout
        )
        
        # Handle response
        if response.status_code == 201:
            # Success - issue created
            response_data = response.json()
            issue_number = response_data.get("number")
            html_url = response_data.get("html_url")
            
            logger.info(f"Successfully created issue #{issue_number}: {html_url}")
            
            return {
                "issue_url": html_url,
                "issue_number": issue_number,
                "html_url": html_url
            }
        
        elif response.status_code == 401:
            # Authentication failed
            error_msg = "GitHub authentication failed. Check your API token."
            logger.error(f"{error_msg} Status: {response.status_code}")
            try:
                response_details = response.json()
            except:
                response_details = {"text": response.text[:200]}
            raise GitHubAPIError(
                message=error_msg,
                error_code=GitHubAPIError.AUTH_FAILED,
                status_code=response.status_code,
                response_details=response_details
            )
        
        elif response.status_code == 403:
            # Forbidden - might be rate limited or insufficient permissions
            try:
                error_data = response.json()
            except:
                error_data = {"message": "Forbidden", "details": response.text[:200]}
            
            error_message = error_data.get("message", "Forbidden")
            
            if "rate limit" in error_message.lower():
                error_msg = "GitHub API rate limit exceeded. Please try again later."
                error_code = GitHubAPIError.RATE_LIMIT
            else:
                error_msg = f"GitHub API access forbidden: {error_message}"
                error_code = GitHubAPIError.PERMISSION_DENIED
            
            logger.error(f"{error_msg} Status: {response.status_code}")
            raise GitHubAPIError(
                message=error_msg,
                error_code=error_code,
                status_code=response.status_code,
                response_details=error_data
            )
        
        elif response.status_code == 404:
            # Repository not found
            error_msg = f"Repository {repo_owner}/{repo_name} not found or not accessible."
            logger.error(f"{error_msg} Status: {response.status_code}")
            try:
                response_details = response.json()
            except:
                response_details = {"text": response.text[:200]}
            raise GitHubAPIError(
                error_message=error_msg,
                error_code=response.status_code,
                response_details=response_details,
                error_category="not_found"
            )
        
        elif response.status_code == 422:
            # Validation failed
            try:
                error_data = response.json()
            except:
                error_data = {"message": "Validation failed", "details": response.text[:200], "errors": []}
            
            error_message = error_data.get("message", "Validation failed")
            errors = error_data.get("errors", [])
            
            error_details = []
            for error in errors:
                field = error.get("field", "unknown")
                code = error.get("code", "unknown")
                error_details.append(f"{field}: {code}")
            
            error_msg = f"GitHub validation failed: {error_message}"
            if error_details:
                error_msg += f" - {', '.join(error_details)}"
            
            logger.error(f"{error_msg} Status: {response.status_code}")
            raise GitHubAPIError(
                error_message=error_msg,
                error_code=response.status_code,
                response_details=error_data,
                error_category="validation"
            )
        
        else:
            # Other error
            error_msg = f"GitHub API request failed with status {response.status_code}"
            try:
                error_data = response.json()
                error_message = error_data.get("message", "Unknown error")
                error_msg += f": {error_message}"
            except:
                error_data = {"text": response.text[:200]}
                error_msg += f": {response.text[:200]}"
            
            logger.error(error_msg)
            raise GitHubAPIError(
                error_message=error_msg,
                error_code=response.status_code,
                response_details=error_data
            )
    
    except requests.exceptions.Timeout:
        error_msg = "GitHub API request timed out after 30 seconds"
        logger.error(error_msg)
        raise GitHubAPIError(
            error_message=error_msg,
            error_category="timeout"
        )
    
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Failed to connect to GitHub API: {str(e)}"
        logger.error(error_msg)
        raise GitHubAPIError(
            error_message=error_msg,
            error_category="connection"
        )
    
    except requests.exceptions.RequestException as e:
        error_msg = f"GitHub API request failed: {str(e)}"
        logger.error(error_msg)
        raise GitHubAPIError(
            error_message=error_msg,
            error_category="unknown"
        )
    
    except GitHubAPIError:
        # Re-raise our custom errors
        raise
    
    except Exception as e:
        error_msg = f"Unexpected error creating GitHub issue: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise GitHubAPIError(
            error_message=error_msg,
            error_category="unknown"
        )


def _generate_issue_title(payload: Dict[str, Any]) -> str:
    """
    Generate a concise issue title from the payload.
    
    Args:
        payload: Report payload dictionary
    
    Returns:
        Issue title string (max 80 characters + prefix)
    """
    report_type = payload.get("report_type", "bug")
    description = payload.get("user_input", {}).get("description", "No description")
    
    # Create title prefix based on report type
    title_prefix = {
        "bug": "[Bug]",
        "enhancement": "[Feature Request]",
        "question": "[Question]"
    }.get(report_type, "[Bug]")
    
    # Truncate description for title (max 80 chars)
    title_description = description[:80] + "..." if len(description) > 80 else description
    
    # Remove newlines and extra whitespace
    title_description = " ".join(title_description.split())
    
    return f"{title_prefix} {title_description}"


def _generate_issue_labels(payload: Dict[str, Any]) -> list:
    """
    Generate issue labels based on payload context.
    
    This function applies labels for:
    - Source identifier ("from-storycore")
    - Report type ("bug", "enhancement", "question")
    - Active module ("module:X")
    - OS platform ("os:windows", "os:macos", "os:linux")
    
    Requirements: 5.4, 6.2, 6.3, 6.4, 6.5, 6.6
    
    Args:
        payload: Report payload dictionary
    
    Returns:
        List of label strings
    """
    labels = ["from-storycore"]
    
    # Add report type label
    report_type = payload.get("report_type", "bug")
    if report_type == "bug":
        labels.append("bug")
    elif report_type == "enhancement":
        labels.append("enhancement")
    elif report_type == "question":
        labels.append("question")
    
    # Add module label
    module_context = payload.get("module_context", {})
    active_module = module_context.get("active_module")
    if active_module and active_module != "unknown":
        labels.append(f"module:{active_module}")
    
    # Add OS label
    system_info = payload.get("system_info", {})
    os_platform = system_info.get("os_platform", "").lower()
    if "windows" in os_platform:
        labels.append("os:windows")
    elif "darwin" in os_platform or "macos" in os_platform:
        labels.append("os:macos")
    elif "linux" in os_platform:
        labels.append("os:linux")
    
    return labels


def generate_issue_labels(payload: Dict[str, Any]) -> list:
    """
    Public function to generate issue labels.
    
    This is exposed for testing and external use.
    
    Requirements: 5.4, 6.2, 6.3, 6.4, 6.5, 6.6
    
    Args:
        payload: Report payload dictionary
    
    Returns:
        List of label strings
    """
    return _generate_issue_labels(payload)
