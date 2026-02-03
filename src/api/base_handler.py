"""
Base API Handler

This module provides the base handler class with common middleware functionality.
"""

from typing import Any, Callable, Dict, Optional
import logging
import time
from datetime import datetime

from .models import (
    APIResponse,
    ErrorDetails,
    ErrorCodes,
    ResponseMetadata,
    RequestContext,
)
from .config import APIConfig
from .services.cache import CacheService


logger = logging.getLogger(__name__)


class BaseAPIHandler:
    """
    Base class for all API handlers.
    
    Provides common middleware functionality including:
    - Request validation
    - Error handling
    - Response formatting
    - Logging
    - Authentication/authorization hooks
    """
    
    def __init__(self, config: APIConfig, cache_service: Optional[CacheService] = None):
        """
        Initialize the base handler.
        
        Args:
            config: API configuration
            cache_service: Optional cache service for response caching
        """
        self.config = config
        self.cache_service = cache_service
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def create_success_response(
        self,
        data: Dict[str, Any],
        context: RequestContext,
    ) -> APIResponse:
        """
        Create a successful API response.
        
        Args:
            data: Response data
            context: Request context
            
        Returns:
            Formatted API response
        """
        metadata = ResponseMetadata(
            request_id=context.request_id,
            timestamp=datetime.now(),
            duration_ms=context.get_duration_ms(),
            api_version=self.config.version,
        )
        
        return APIResponse(
            status="success",
            data=data,
            metadata=metadata,
        )
    
    def create_error_response(
        self,
        error_code: str,
        message: str,
        context: RequestContext,
        details: Optional[Dict[str, Any]] = None,
        remediation: Optional[str] = None,
    ) -> APIResponse:
        """
        Create an error API response.
        
        Args:
            error_code: Error code from ErrorCodes
            message: Human-readable error message
            context: Request context
            details: Additional error details
            remediation: Suggestion for fixing the error
            
        Returns:
            Formatted error response
        """
        error = ErrorDetails(
            code=error_code,
            message=message,
            details=details,
            remediation=remediation,
        )
        
        metadata = ResponseMetadata(
            request_id=context.request_id,
            timestamp=datetime.now(),
            duration_ms=context.get_duration_ms(),
            api_version=self.config.version,
        )
        
        return APIResponse(
            status="error",
            error=error,
            metadata=metadata,
        )
    
    def create_pending_response(
        self,
        task_id: str,
        context: RequestContext,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> APIResponse:
        """
        Create a pending (async) API response.
        
        Args:
            task_id: ID of the async task
            context: Request context
            additional_data: Additional data to include
            
        Returns:
            Formatted pending response
        """
        data = {"task_id": task_id}
        if additional_data:
            data.update(additional_data)
        
        metadata = ResponseMetadata(
            request_id=context.request_id,
            timestamp=datetime.now(),
            duration_ms=context.get_duration_ms(),
            api_version=self.config.version,
        )
        
        return APIResponse(
            status="pending",
            data=data,
            metadata=metadata,
        )
    
    def validate_required_params(
        self,
        params: Dict[str, Any],
        required: list[str],
        context: RequestContext,
    ) -> Optional[APIResponse]:
        """
        Validate that required parameters are present.
        
        Args:
            params: Request parameters
            required: List of required parameter names
            context: Request context
            
        Returns:
            Error response if validation fails, None if successful
        """
        missing = [key for key in required if key not in params or params[key] is None]
        
        if missing:
            return self.create_error_response(
                error_code=ErrorCodes.VALIDATION_ERROR,
                message=f"Missing required parameters: {', '.join(missing)}",
                context=context,
                details={"missing_fields": missing},
                remediation=f"Provide values for: {', '.join(missing)}",
            )
        
        return None
    
    def log_request(
        self,
        endpoint: str,
        params: Dict[str, Any],
        context: RequestContext,
    ) -> None:
        """
        Log an API request.
        
        Args:
            endpoint: Endpoint path
            params: Request parameters (will be sanitized if configured)
            context: Request context
        """
        if not self.config.log_api_calls:
            return
        
        # Sanitize sensitive parameters if configured
        logged_params = params
        if self.config.log_sanitize_params:
            logged_params = self._sanitize_params(params)
        
        self.logger.info(
            f"API Request: {endpoint}",
            extra={
                "request_id": context.request_id,
                "endpoint": endpoint,
                "params": logged_params,
                "user": str(context.user) if context.user else None,
            }
        )
    
    def log_response(
        self,
        endpoint: str,
        response: APIResponse,
        context: RequestContext,
    ) -> None:
        """
        Log an API response.
        
        Args:
            endpoint: Endpoint path
            response: API response
            context: Request context
        """
        if not self.config.log_api_calls:
            return
        
        log_level = logging.INFO if response.status == "success" else logging.ERROR
        
        self.logger.log(
            log_level,
            f"API Response: {endpoint} - {response.status}",
            extra={
                "request_id": context.request_id,
                "endpoint": endpoint,
                "status": response.status,
                "duration_ms": context.get_duration_ms(),
                "error_code": response.error.code if response.error else None,
            }
        )
    
    def _sanitize_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize sensitive parameters for logging.
        
        Args:
            params: Original parameters
            
        Returns:
            Sanitized parameters
        """
        sensitive_keys = {
            "password", "token", "api_key", "secret", "credential",
            "auth", "authorization", "private_key", "access_token",
        }
        
        sanitized = {}
        for key, value in params.items():
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = "***REDACTED***"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_params(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    def handle_exception(
        self,
        exception: Exception,
        context: RequestContext,
    ) -> APIResponse:
        """
        Handle an exception and convert to error response.
        
        Args:
            exception: The exception that occurred
            context: Request context
            
        Returns:
            Error response
        """
        self.logger.exception(
            f"Exception in API handler: {str(exception)}",
            extra={"request_id": context.request_id}
        )
        
        # Map common exceptions to error codes
        if isinstance(exception, ValueError):
            error_code = ErrorCodes.VALIDATION_ERROR
            message = str(exception)
        elif isinstance(exception, KeyError):
            error_code = ErrorCodes.NOT_FOUND
            message = f"Resource not found: {str(exception)}"
        elif isinstance(exception, TimeoutError):
            error_code = ErrorCodes.TIMEOUT
            message = "Operation timed out"
        else:
            error_code = ErrorCodes.INTERNAL_ERROR
            message = "An internal error occurred"
        
        return self.create_error_response(
            error_code=error_code,
            message=message,
            context=context,
            details={"exception_type": type(exception).__name__},
        )

    
    def cache_response(
        self,
        response: APIResponse,
        context: RequestContext,
    ) -> APIResponse:
        """
        Cache a response if caching is enabled for this request.
        
        This should be called by handlers after creating a successful response.
        The cache middleware sets context.cache_key and context.cache_ttl if
        the endpoint is cacheable.
        
        Args:
            response: The response to cache
            context: Request context
            
        Returns:
            The same response (for chaining)
        """
        # Check if caching is enabled and configured for this request
        if (
            self.cache_service is not None
            and hasattr(context, "cache_key")
            and hasattr(context, "cache_ttl")
            and response.status == "success"
        ):
            cache_key = context.cache_key
            cache_ttl = context.cache_ttl
            
            # Cache the response
            self.cache_service.set(cache_key, response, ttl=cache_ttl)
            
            self.logger.debug(
                f"Cached response for {context.endpoint}",
                extra={
                    "request_id": context.request_id,
                    "cache_key": cache_key,
                    "ttl": cache_ttl,
                }
            )
        
        return response
