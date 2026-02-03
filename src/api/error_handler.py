"""
Error Handler

This module provides centralized error handling and exception-to-error conversion.
"""

from typing import Optional
import logging
import traceback

from .models import APIResponse, ErrorDetails, ErrorCodes, RequestContext
from .validator import ValidationError


logger = logging.getLogger(__name__)


class ErrorHandler:
    """
    Handles exceptions and converts them to standardized error responses.
    
    Provides:
    - Exception type mapping to error codes
    - Error message formatting
    - Stack trace logging
    - Remediation suggestions
    """
    
    def __init__(self, debug_mode: bool = False):
        """
        Initialize the error handler.
        
        Args:
            debug_mode: Whether to include stack traces in responses
        """
        self.debug_mode = debug_mode
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def handle_exception(
        self,
        exception: Exception,
        context: RequestContext,
        api_version: str = "v1",
    ) -> APIResponse:
        """
        Handle an exception and convert to error response.
        
        Args:
            exception: The exception that occurred
            context: Request context
            api_version: API version string
            
        Returns:
            Formatted error response
        """
        # Log the exception with full traceback
        self.logger.exception(
            f"Exception in API handler: {str(exception)}",
            extra={
                "request_id": context.request_id,
                "endpoint": context.endpoint,
                "exception_type": type(exception).__name__,
            }
        )
        
        # Convert exception to error details
        error_details = self._exception_to_error(exception)
        
        # Add stack trace in debug mode
        if self.debug_mode:
            if error_details.details is None:
                error_details.details = {}
            error_details.details["stack_trace"] = traceback.format_exc()
        
        # Create response metadata
        from .models import ResponseMetadata
        from datetime import datetime
        
        metadata = ResponseMetadata(
            request_id=context.request_id,
            timestamp=datetime.now(),
            duration_ms=context.get_duration_ms(),
            api_version=api_version,
        )
        
        return APIResponse(
            status="error",
            error=error_details,
            metadata=metadata,
        )
    
    def _exception_to_error(self, exception: Exception) -> ErrorDetails:
        """
        Convert an exception to error details.
        
        Args:
            exception: The exception to convert
            
        Returns:
            Error details
        """
        # Handle validation errors
        if isinstance(exception, ValidationError):
            return ErrorDetails(
                code=ErrorCodes.VALIDATION_ERROR,
                message=exception.message,
                details=exception.details,
                remediation="Check the request parameters and try again",
            )
        
        # Handle value errors
        if isinstance(exception, ValueError):
            return ErrorDetails(
                code=ErrorCodes.VALIDATION_ERROR,
                message=str(exception),
                details={"exception_type": "ValueError"},
                remediation="Provide valid parameter values",
            )
        
        # Handle key errors (missing resources)
        if isinstance(exception, KeyError):
            return ErrorDetails(
                code=ErrorCodes.NOT_FOUND,
                message=f"Resource not found: {str(exception)}",
                details={"exception_type": "KeyError"},
                remediation="Check that the requested resource exists",
            )
        
        # Handle file not found errors
        if isinstance(exception, FileNotFoundError):
            return ErrorDetails(
                code=ErrorCodes.NOT_FOUND,
                message=f"File not found: {str(exception)}",
                details={"exception_type": "FileNotFoundError"},
                remediation="Check the file path and try again",
            )
        
        # Handle permission errors
        if isinstance(exception, PermissionError):
            return ErrorDetails(
                code=ErrorCodes.AUTHORIZATION_DENIED,
                message=f"Permission denied: {str(exception)}",
                details={"exception_type": "PermissionError"},
                remediation="Check your permissions and try again",
            )
        
        # Handle timeout errors
        if isinstance(exception, TimeoutError):
            return ErrorDetails(
                code=ErrorCodes.TIMEOUT,
                message="Operation timed out",
                details={"exception_type": "TimeoutError"},
                remediation="Try again or increase the timeout limit",
            )
        
        # Handle connection errors
        if isinstance(exception, ConnectionError):
            return ErrorDetails(
                code=ErrorCodes.SERVICE_UNAVAILABLE,
                message=f"Service unavailable: {str(exception)}",
                details={"exception_type": "ConnectionError"},
                remediation="Check that the backend service is running",
            )
        
        # Handle type errors
        if isinstance(exception, TypeError):
            return ErrorDetails(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f"Type error: {str(exception)}",
                details={"exception_type": "TypeError"},
                remediation="Check parameter types and try again",
            )
        
        # Default to internal error
        return ErrorDetails(
            code=ErrorCodes.INTERNAL_ERROR,
            message="An internal error occurred",
            details={
                "exception_type": type(exception).__name__,
                "exception_message": str(exception),
            },
            remediation="Contact support if the problem persists",
        )
    
    def create_validation_error(
        self,
        message: str,
        field: Optional[str] = None,
        remediation: Optional[str] = None,
    ) -> ErrorDetails:
        """
        Create a validation error.
        
        Args:
            message: Error message
            field: Field that failed validation
            remediation: Suggestion for fixing the error
            
        Returns:
            Error details
        """
        details = {}
        if field:
            details["field"] = field
        
        return ErrorDetails(
            code=ErrorCodes.VALIDATION_ERROR,
            message=message,
            details=details if details else None,
            remediation=remediation,
        )
    
    def create_not_found_error(
        self,
        resource_type: str,
        resource_id: str,
    ) -> ErrorDetails:
        """
        Create a not found error.
        
        Args:
            resource_type: Type of resource (e.g., "project", "task")
            resource_id: ID of the resource
            
        Returns:
            Error details
        """
        return ErrorDetails(
            code=ErrorCodes.NOT_FOUND,
            message=f"{resource_type.capitalize()} not found: {resource_id}",
            details={
                "resource_type": resource_type,
                "resource_id": resource_id,
            },
            remediation=f"Check that the {resource_type} exists and try again",
        )
    
    def create_rate_limit_error(
        self,
        limit: int,
        window: str,
        retry_after: Optional[int] = None,
    ) -> ErrorDetails:
        """
        Create a rate limit error.
        
        Args:
            limit: Rate limit threshold
            window: Time window (e.g., "minute", "hour")
            retry_after: Seconds until retry is allowed
            
        Returns:
            Error details
        """
        details = {
            "limit": limit,
            "window": window,
        }
        if retry_after:
            details["retry_after_seconds"] = retry_after
        
        return ErrorDetails(
            code=ErrorCodes.RATE_LIMIT_EXCEEDED,
            message=f"Rate limit exceeded: {limit} requests per {window}",
            details=details,
            remediation=f"Wait {retry_after} seconds before retrying" if retry_after else "Reduce request rate",
        )
