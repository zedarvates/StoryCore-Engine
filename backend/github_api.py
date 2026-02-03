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
    """Custom exception for GitHub API errors with enhanced details
    
    Attributes:
        error_code: HTTP status code or error identifier
        error_message: Detailed error message
        response_details: Raw API response details
        error_category: Categorization of the error (e.g., authentication, rate_limit)
        recovery_suggestion: Suggestion for how to recover from the error
    """
    
    # Error categories
    CATEGORIES = {
        "authentication": "Authentication Error",
        "rate_limit": "Rate Limit Exceeded",
        "not_found": "Resource Not Found",
        "validation": "Validation Error",
        "forbidden": "Access Forbidden",
        "timeout": "Request Timeout",
        "connection": "Connection Error",
        "server": "Server Error",
        "unknown": "Unknown Error"
    }
    
    # Recovery suggestions by error category
    RECOVERY_SUGGESTIONS = {
        "authentication": "Check that your GitHub API token is valid and has the necessary permissions. "
                         "Ensure the token is properly configured in the GITHUB_API_TOKEN environment variable.",
        "rate_limit": "GitHub API rate limit exceeded. Wait a few minutes and try again. "
                     "Consider using a different API token or reducing the frequency of requests.",
        "not_found": "The specified repository or resource was not found. Verify the repository owner "
                    "and name are correct, and that the resource exists and is accessible.",
        "validation": "The request data failed GitHub API validation. Check the error details for "
                     "specific fields that need correction.",
        "forbidden": "Access to the GitHub API is forbidden. Check that your API token has the "
                    "necessary permissions and that you're not violating any GitHub policies.",
        "timeout": "The request to GitHub API timed out. Try again with a longer timeout or check "
                  "your network connectivity.",
        "connection": "Failed to connect to GitHub API. Check your network connectivity and try again.",
        "server": "GitHub API server error. Try again later as this may be a temporary issue.",
        "unknown": "An unexpected error occurred. Check the error details and try again."
    }
    
    def __init__(
        self,
        error_message: str,
        error_code: Optional[int] = None,
        response_details: Optional[Dict[str, Any]] = None,
        error_category: Optional[str] = None
    ):
        self.error_code = error_code
        self.error_message = error_message
        self.response_details = response_details or {}
        self.error_category = error_category or self._determine_category(error_code)
        self.recovery_suggestion = self.RECOVERY_SUGGESTIONS.get(self.error_category, self.RECOVERY_SUGGESTIONS["unknown"])
        
        super().__init__(self._format_message())
    
    def _determine_category(self, error_code: Optional[int]) -> str:
        """Determine error category based on HTTP status code"""
        if error_code is None:
            return "unknown"
        elif error_code == 401:
            return "authentication"
        elif error_code == 403:
            return "forbidden"
        elif error_code == 404:
            return "not_found"
        elif error_code == 422:
            return "validation"
        elif 400 <= error_code < 500:
            return "validation"
        elif 500 <= error_code < 600:
            return "server"
        else:
            return "unknown"
    
    def _format_message(self) -> str:
        """Format the error message with all available details"""
        parts = [self.error_message]
        
        if self.error_code:
            parts.append(f" (Code: {self.error_code})")
        
        if self.error_category and self.error_category != "unknown":
            category_name = self.CATEGORIES.get(self.error_category, self.error_category)
            parts.append(f" [Category: {category_name}]")
        
        return "".join(parts)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for serialization"""
        return {
            "error": {
                "code": self.error_code,
                "message": self.error_message,
                "category": self.error_category,
                "category_name": self.CATEGORIES.get(self.error_category, self.error_category),
                "recovery_suggestion": self.recovery_suggestion,
                "response_details": self.response_details
            }
        }
    
    def __str__(self) -> str:
        """String representation of the error"""
        return self._format_message()
    
    def __repr__(self) -> str:
        """Debug representation of the error"""
        return (
            f"GitHubAPIError("
            f"error_message={repr(self.error_message)}, "
            f"error_code={self.error_code}, "
            f"error_category={repr(self.error_category)}, "
            f"response_details={repr(self.response_details)}"
            f")"
        )


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
            "GitHub API token not configured. "
            "Set the GITHUB_API_TOKEN environment variable."
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
                error_message=error_msg,
                error_code=response.status_code,
                response_details=response_details,
                error_category="authentication"
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
                category = "rate_limit"
            else:
                error_msg = f"GitHub API access forbidden: {error_message}"
                category = "forbidden"
            
            logger.error(f"{error_msg} Status: {response.status_code}")
            raise GitHubAPIError(
                error_message=error_msg,
                error_code=response.status_code,
                response_details=error_data,
                error_category=category
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
