"""
API Data Models

This module defines the core data models for API requests and responses.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from datetime import datetime
import uuid


@dataclass
class ResponseMetadata:
    """Metadata included in all API responses."""
    
    request_id: str
    timestamp: datetime
    duration_ms: float
    api_version: str
    deprecation: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "request_id": self.request_id,
            "timestamp": self.timestamp.isoformat(),
            "duration_ms": self.duration_ms,
            "api_version": self.api_version,
        }
        if self.deprecation is not None:
            result["deprecation"] = self.deprecation
        return result


@dataclass
class ErrorDetails:
    """Details about an error that occurred during API processing."""
    
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    remediation: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "code": self.code,
            "message": self.message,
        }
        if self.details is not None:
            result["details"] = self.details
        if self.remediation is not None:
            result["remediation"] = self.remediation
        return result


@dataclass
class APIResponse:
    """Standard API response structure."""
    
    status: str  # "success" | "error" | "pending"
    data: Optional[Dict[str, Any]] = None
    error: Optional[ErrorDetails] = None
    metadata: Optional[ResponseMetadata] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {"status": self.status}
        
        if self.data is not None:
            result["data"] = self.data
        
        if self.error is not None:
            result["error"] = self.error.to_dict()
        
        if self.metadata is not None:
            result["metadata"] = self.metadata.to_dict()
        
        return result


@dataclass
class RequestContext:
    """Context information for an API request."""
    
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user: Optional[Any] = None
    start_time: datetime = field(default_factory=datetime.now)
    endpoint: Optional[str] = None
    method: Optional[str] = None
    
    def get_duration_ms(self) -> float:
        """Calculate request duration in milliseconds."""
        duration = datetime.now() - self.start_time
        return duration.total_seconds() * 1000


@dataclass
class TaskResponse:
    """Response for asynchronous task operations."""
    
    task_id: str
    status: str  # "pending" | "running" | "completed" | "failed" | "cancelled"
    progress: Optional[float] = None  # 0.0 to 1.0
    result: Optional[Any] = None
    error: Optional[ErrorDetails] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "task_id": self.task_id,
            "status": self.status,
        }
        
        if self.progress is not None:
            result["progress"] = self.progress
        
        if self.result is not None:
            result["result"] = self.result
        
        if self.error is not None:
            result["error"] = self.error.to_dict()
        
        if self.created_at is not None:
            result["created_at"] = self.created_at.isoformat()
        
        if self.updated_at is not None:
            result["updated_at"] = self.updated_at.isoformat()
        
        return result


# Error code constants
class ErrorCodes:
    """Standard error codes for the API system."""
    
    # Client Errors (4xx)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED"
    AUTHORIZATION_DENIED = "AUTHORIZATION_DENIED"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Server Errors (5xx)
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    TIMEOUT = "TIMEOUT"
    DEPENDENCY_ERROR = "DEPENDENCY_ERROR"


# HTTP status code mapping
HTTP_STATUS_CODES = {
    "success": 200,
    "pending": 202,
    ErrorCodes.VALIDATION_ERROR: 400,
    ErrorCodes.AUTHENTICATION_REQUIRED: 401,
    ErrorCodes.AUTHORIZATION_DENIED: 403,
    ErrorCodes.NOT_FOUND: 404,
    ErrorCodes.CONFLICT: 409,
    ErrorCodes.RATE_LIMIT_EXCEEDED: 429,
    ErrorCodes.INTERNAL_ERROR: 500,
    ErrorCodes.SERVICE_UNAVAILABLE: 503,
    ErrorCodes.TIMEOUT: 504,
    ErrorCodes.DEPENDENCY_ERROR: 502,
}
