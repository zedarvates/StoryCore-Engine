"""
Custom exception classes for StoryCore AI Assistant
"""

from typing import Optional, Dict, Any
from datetime import datetime


class AssistantError(Exception):
    """Base exception for all assistant errors"""
    
    def __init__(
        self,
        message: str,
        code: str,
        category: str,
        details: Optional[Dict[str, Any]] = None,
        suggested_action: Optional[str] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.category = category
        self.details = details or {}
        self.suggested_action = suggested_action
        self.timestamp = datetime.utcnow().isoformat() + "Z"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "category": self.category,
                "details": self.details,
                "suggestedAction": self.suggested_action,
                "timestamp": self.timestamp
            }
        }


class SecurityError(AssistantError):
    """Security-related errors (path validation, authentication, authorization)"""
    
    def __init__(
        self,
        message: str,
        code: str = "SECURITY_ERROR",
        details: Optional[Dict[str, Any]] = None,
        suggested_action: Optional[str] = None
    ):
        super().__init__(
            message=message,
            code=code,
            category="security",
            details=details,
            suggested_action=suggested_action
        )


class ValidationError(AssistantError):
    """Data validation errors (Data Contract violations, invalid modifications)"""
    
    def __init__(
        self,
        message: str,
        code: str = "VALIDATION_ERROR",
        details: Optional[Dict[str, Any]] = None,
        suggested_action: Optional[str] = None
    ):
        super().__init__(
            message=message,
            code=code,
            category="validation",
            details=details,
            suggested_action=suggested_action
        )


class ResourceError(AssistantError):
    """Resource-related errors (storage limits, file not found, disk full)"""
    
    def __init__(
        self,
        message: str,
        code: str = "RESOURCE_ERROR",
        details: Optional[Dict[str, Any]] = None,
        suggested_action: Optional[str] = None
    ):
        super().__init__(
            message=message,
            code=code,
            category="resource",
            details=details,
            suggested_action=suggested_action
        )


class SystemError(AssistantError):
    """System-level errors (internal failures, external service unavailable)"""
    
    def __init__(
        self,
        message: str,
        code: str = "SYSTEM_ERROR",
        details: Optional[Dict[str, Any]] = None,
        suggested_action: Optional[str] = None
    ):
        super().__init__(
            message=message,
            code=code,
            category="system",
            details=details,
            suggested_action=suggested_action
        )


class ConfirmationRequiredError(AssistantError):
    """Error raised when user confirmation is required for destructive operations"""
    
    def __init__(
        self,
        message: str,
        file_path: str,
        file_size: Optional[int] = None
    ):
        details = {"file_path": file_path}
        if file_size is not None:
            details["file_size_bytes"] = file_size
        
        super().__init__(
            message=message,
            code="CONFIRMATION_REQUIRED",
            category="validation",
            details=details,
            suggested_action="Provide explicit confirmation to proceed with deletion"
        )


class ProjectNotFoundError(ResourceError):
    """Error raised when a project cannot be found"""
    
    def __init__(self, project_name: str, available_projects: Optional[list] = None):
        details = {"project_name": project_name}
        if available_projects:
            details["available_projects"] = available_projects
        
        super().__init__(
            message=f"Project '{project_name}' not found",
            code="PROJECT_NOT_FOUND",
            details=details,
            suggested_action="Check project name or list available projects"
        )


class StorageLimitExceededError(ResourceError):
    """Error raised when storage limits are exceeded"""
    
    def __init__(
        self,
        limit_type: str,
        current_value: float,
        limit_value: float
    ):
        super().__init__(
            message=f"Storage limit exceeded: {limit_type}",
            code="STORAGE_LIMIT_EXCEEDED",
            details={
                "limit_type": limit_type,
                "current_value": current_value,
                "limit_value": limit_value
            },
            suggested_action="Delete unused files or increase storage limit"
        )


class PathValidationError(SecurityError):
    """Error raised when path validation fails"""
    
    def __init__(self, path: str, reason: str):
        super().__init__(
            message=f"Path validation failed: {reason}",
            code="PATH_VALIDATION_ERROR",
            details={"path": path, "reason": reason},
            suggested_action="Ensure path is within the project directory"
        )


class DataContractViolationError(ValidationError):
    """Error raised when Data Contract v1 is violated"""
    
    def __init__(self, violations: list):
        super().__init__(
            message="Data Contract v1 validation failed",
            code="DATA_CONTRACT_VIOLATION",
            details={"violations": violations},
            suggested_action="Fix validation errors and try again"
        )


class ProjectError(AssistantError):
    """Project-related errors (corrupted project, invalid state)"""
    
    def __init__(
        self,
        message: str,
        code: str = "PROJECT_ERROR",
        details: Optional[Dict[str, Any]] = None,
        suggested_action: Optional[str] = None
    ):
        super().__init__(
            message=message,
            code=code,
            category="resource",
            details=details,
            suggested_action=suggested_action
        )


class AuthenticationError(SecurityError):
    """Authentication-related errors (invalid token, expired token, missing token)"""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            details=details,
            suggested_action="Provide valid authentication credentials"
        )


class AuthorizationError(SecurityError):
    """Authorization-related errors (insufficient permissions, forbidden access)"""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            details=details,
            suggested_action="Contact administrator for required permissions"
        )
