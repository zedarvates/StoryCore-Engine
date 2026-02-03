"""
Security API Data Models

This module defines data models for security operations including authentication
validation, permission checking, rate limiting, and audit logging.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum


class TokenType(str, Enum):
    """Authentication token types."""
    BEARER = "bearer"
    API_KEY = "api_key"
    SESSION = "session"
    JWT = "jwt"


class PermissionType(str, Enum):
    """Permission types for operations."""
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    DELETE = "delete"
    ADMIN = "admin"


class AuditEventType(str, Enum):
    """Types of security audit events."""
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_DENIED = "permission_denied"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    CONFIG_CHANGE = "config_change"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"


class RateLimitStatus(str, Enum):
    """Rate limit status."""
    OK = "ok"
    WARNING = "warning"
    EXCEEDED = "exceeded"


@dataclass
class AuthValidateRequest:
    """Request for authentication token validation."""
    token: str
    token_type: str = "bearer"
    validate_expiry: bool = True
    validate_permissions: bool = False
    required_permissions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AuthValidateResult:
    """Result of authentication validation."""
    valid: bool
    user_id: Optional[str] = None
    username: Optional[str] = None
    token_type: str = "bearer"
    expires_at: Optional[datetime] = None
    permissions: List[str] = field(default_factory=list)
    validation_time_ms: float = 0.0
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PermissionsCheckRequest:
    """Request for permission checking."""
    user_id: str
    resource: str
    action: str
    context: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PermissionsCheckResult:
    """Result of permission check."""
    allowed: bool
    user_id: str
    resource: str
    action: str
    matched_policies: List[str] = field(default_factory=list)
    reason: Optional[str] = None
    check_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RateLimitRequest:
    """Request for rate limit status."""
    user_id: Optional[str] = None
    endpoint: Optional[str] = None
    include_history: bool = False
    time_window_seconds: int = 60
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RateLimitInfo:
    """Rate limit information for a specific endpoint."""
    endpoint: str
    limit: int
    remaining: int
    reset_at: datetime
    status: str  # "ok", "warning", "exceeded"
    window_seconds: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "endpoint": self.endpoint,
            "limit": self.limit,
            "remaining": self.remaining,
            "reset_at": self.reset_at.isoformat(),
            "status": self.status,
            "window_seconds": self.window_seconds,
        }


@dataclass
class RateLimitResult:
    """Result of rate limit status check."""
    user_id: Optional[str] = None
    overall_status: str = "ok"  # "ok", "warning", "exceeded"
    limits: List[RateLimitInfo] = field(default_factory=list)
    request_history: List[Dict[str, Any]] = field(default_factory=list)
    check_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AuditLogRequest:
    """Request to log security audit event."""
    event_type: str
    user_id: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None
    result: str = "success"  # "success", "failure", "denied"
    details: Dict[str, Any] = field(default_factory=dict)
    severity: str = "info"  # "info", "warning", "critical"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AuditLogResult:
    """Result of audit log operation."""
    logged: bool
    event_id: str
    event_type: str
    timestamp: datetime
    log_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# Supported token types
SUPPORTED_TOKEN_TYPES = [token_type.value for token_type in TokenType]

# Supported permission types
SUPPORTED_PERMISSION_TYPES = [perm_type.value for perm_type in PermissionType]

# Supported audit event types
SUPPORTED_AUDIT_EVENT_TYPES = [event_type.value for event_type in AuditEventType]

# Supported audit severities
SUPPORTED_AUDIT_SEVERITIES = ["info", "warning", "critical"]

# Supported audit results
SUPPORTED_AUDIT_RESULTS = ["success", "failure", "denied"]


def validate_token_type(token_type: str) -> bool:
    """Validate if token type is supported."""
    return token_type.lower() in SUPPORTED_TOKEN_TYPES


def validate_permission_type(permission: str) -> bool:
    """Validate if permission type is supported."""
    return permission.lower() in SUPPORTED_PERMISSION_TYPES


def validate_audit_event_type(event_type: str) -> bool:
    """Validate if audit event type is supported."""
    return event_type.lower() in SUPPORTED_AUDIT_EVENT_TYPES


def validate_audit_severity(severity: str) -> bool:
    """Validate if audit severity is supported."""
    return severity.lower() in SUPPORTED_AUDIT_SEVERITIES


def validate_audit_result(result: str) -> bool:
    """Validate if audit result is supported."""
    return result.lower() in SUPPORTED_AUDIT_RESULTS
