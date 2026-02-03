"""
API Router

This module provides the central routing system for all API endpoints.
"""

from typing import Any, Callable, Dict, Optional, List
import logging
from datetime import datetime

from .models import APIResponse, RequestContext, ErrorCodes
from .config import APIConfig
from .validator import RequestValidator
from .formatter import ResponseFormatter
from .error_handler import ErrorHandler


logger = logging.getLogger(__name__)


# Type alias for middleware functions
Middleware = Callable[[RequestContext, Dict[str, Any]], Optional[APIResponse]]


class DeprecationInfo:
    """Information about endpoint deprecation."""
    
    def __init__(
        self,
        deprecated_date: str,
        removal_date: Optional[str] = None,
        alternative: Optional[str] = None,
        reason: Optional[str] = None,
    ):
        """
        Initialize deprecation info.
        
        Args:
            deprecated_date: Date when endpoint was deprecated (YYYY-MM-DD)
            removal_date: Date when endpoint will be removed (YYYY-MM-DD)
            alternative: Alternative endpoint to use
            reason: Reason for deprecation
        """
        self.deprecated_date = deprecated_date
        self.removal_date = removal_date
        self.alternative = alternative
        self.reason = reason
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "deprecated_date": self.deprecated_date,
            "removal_date": self.removal_date,
            "alternative": self.alternative,
            "reason": self.reason,
        }


class EndpointDefinition:
    """Definition of an API endpoint."""
    
    def __init__(
        self,
        path: str,
        method: str,
        handler: Callable,
        schema: Optional[Dict[str, Any]] = None,
        async_capable: bool = False,
        requires_auth: bool = False,
        description: Optional[str] = None,
        deprecation: Optional[DeprecationInfo] = None,
    ):
        """
        Initialize endpoint definition.
        
        Args:
            path: Endpoint path (e.g., "storycore.narration.generate")
            method: HTTP method (e.g., "POST", "GET")
            handler: Handler function
            schema: JSON schema for request validation
            async_capable: Whether endpoint supports async operations
            requires_auth: Whether endpoint requires authentication
            description: Human-readable description
            deprecation: Deprecation information (if deprecated)
        """
        self.path = path
        self.method = method
        self.handler = handler
        self.schema = schema
        self.async_capable = async_capable
        self.requires_auth = requires_auth
        self.description = description
        self.deprecation = deprecation


class APIRouter:
    """
    Central router for all API endpoints.
    
    Provides:
    - Endpoint registration
    - Request routing
    - Request validation
    - Response formatting
    - Error handling
    """
    
    def __init__(self, config: APIConfig):
        """
        Initialize the router.
        
        Args:
            config: API configuration
        """
        self.config = config
        self.endpoints: Dict[str, EndpointDefinition] = {}
        self.validator = RequestValidator()
        self.formatter = ResponseFormatter()
        self.error_handler = ErrorHandler(debug_mode=(config.log_level == "DEBUG"))
        self.logger = logging.getLogger(self.__class__.__name__)
        self.middleware: List[Middleware] = []
    
    def register_endpoint(
        self,
        path: str,
        method: str,
        handler: Callable,
        schema: Optional[Dict[str, Any]] = None,
        async_capable: bool = False,
        requires_auth: bool = False,
        description: Optional[str] = None,
        deprecation: Optional[DeprecationInfo] = None,
    ) -> None:
        """
        Register an API endpoint.
        
        Args:
            path: Endpoint path (e.g., "storycore.narration.generate")
            method: HTTP method (e.g., "POST", "GET")
            handler: Handler function
            schema: JSON schema for request validation
            async_capable: Whether endpoint supports async operations
            requires_auth: Whether endpoint requires authentication
            description: Human-readable description
            deprecation: Deprecation information (if deprecated)
        """
        endpoint_key = f"{method}:{path}"
        
        if endpoint_key in self.endpoints:
            self.logger.warning(f"Overwriting existing endpoint: {endpoint_key}")
        
        self.endpoints[endpoint_key] = EndpointDefinition(
            path=path,
            method=method,
            handler=handler,
            schema=schema,
            async_capable=async_capable,
            requires_auth=requires_auth,
            description=description,
            deprecation=deprecation,
        )
        
        self.logger.info(f"Registered endpoint: {endpoint_key}")
    
    def add_middleware(self, middleware: Middleware) -> None:
        """
        Add middleware to the router.
        
        Middleware functions are called before the endpoint handler.
        They can inspect/modify the request or return an error response.
        
        Args:
            middleware: Middleware function that takes (context, params) and
                       returns None to continue or APIResponse to short-circuit
        """
        self.middleware.append(middleware)
        self.logger.info(f"Added middleware: {middleware.__name__}")
    
    def route_request(
        self,
        path: str,
        method: str,
        params: Dict[str, Any],
        context: Optional[RequestContext] = None,
    ) -> APIResponse:
        """
        Route and execute an API request.
        
        Args:
            path: Endpoint path
            method: HTTP method
            params: Request parameters
            context: Request context (created if not provided)
            
        Returns:
            API response
        """
        # Create context if not provided
        if context is None:
            context = RequestContext(
                endpoint=path,
                method=method,
            )
        else:
            context.endpoint = path
            context.method = method
        
        try:
            # Find endpoint
            endpoint_key = f"{method}:{path}"
            endpoint = self.endpoints.get(endpoint_key)
            
            if endpoint is None:
                return self._create_not_found_response(path, context)
            
            # Validate request
            if endpoint.schema:
                validation_error = self.validator.validate(params, endpoint.schema)
                if validation_error:
                    from .models import ResponseMetadata
                    return APIResponse(
                        status="error",
                        error=validation_error,
                        metadata=ResponseMetadata(
                            request_id=context.request_id,
                            timestamp=datetime.now(),
                            duration_ms=context.get_duration_ms(),
                            api_version=self.config.version,
                        ),
                    )
            
            # Run middleware (this sets context.user if auth is provided)
            for mw in self.middleware:
                mw_response = mw(context, params)
                if mw_response is not None:
                    # Middleware returned a response, short-circuit
                    return mw_response
            
            # Check authentication if required (after middleware has run)
            if endpoint.requires_auth and not context.user:
                return self._create_auth_required_response(context)
            
            # Execute handler
            self.logger.info(
                f"Executing endpoint: {endpoint_key}",
                extra={"request_id": context.request_id}
            )
            
            response = endpoint.handler(params, context)
            
            # Ensure response is an APIResponse
            if not isinstance(response, APIResponse):
                # Handler returned raw data, wrap it
                from .models import ResponseMetadata
                response = APIResponse(
                    status="success",
                    data=response if isinstance(response, dict) else {"result": response},
                    metadata=ResponseMetadata(
                        request_id=context.request_id,
                        timestamp=datetime.now(),
                        duration_ms=context.get_duration_ms(),
                        api_version=self.config.version,
                    ),
                )
            
            # Add deprecation warning if endpoint is deprecated
            if endpoint.deprecation:
                # Ensure metadata exists
                if response.metadata is None:
                    from .models import ResponseMetadata
                    response.metadata = ResponseMetadata(
                        request_id=context.request_id,
                        timestamp=datetime.now(),
                        duration_ms=context.get_duration_ms(),
                        api_version=self.config.version,
                    )
                
                # Add deprecation info to response metadata
                response.metadata.deprecation = endpoint.deprecation.to_dict()
                
                # Log deprecation warning
                self.logger.warning(
                    f"Deprecated endpoint called: {endpoint_key}",
                    extra={
                        "request_id": context.request_id,
                        "deprecation": endpoint.deprecation.to_dict(),
                    }
                )
            
            return response
            
        except Exception as e:
            # Handle any exceptions
            return self.error_handler.handle_exception(
                e,
                context,
                self.config.version,
            )
    
    def get_endpoint(self, path: str, method: str) -> Optional[EndpointDefinition]:
        """
        Get an endpoint definition.
        
        Args:
            path: Endpoint path
            method: HTTP method
            
        Returns:
            Endpoint definition or None if not found
        """
        endpoint_key = f"{method}:{path}"
        return self.endpoints.get(endpoint_key)
    
    def list_endpoints(self) -> list[EndpointDefinition]:
        """
        List all registered endpoints.
        
        Returns:
            List of endpoint definitions
        """
        return list(self.endpoints.values())
    
    def _create_not_found_response(
        self,
        path: str,
        context: RequestContext,
    ) -> APIResponse:
        """Create a not found error response."""
        from .models import ResponseMetadata
        
        error = self.error_handler.create_not_found_error(
            resource_type="endpoint",
            resource_id=path,
        )
        
        return APIResponse(
            status="error",
            error=error,
            metadata=ResponseMetadata(
                request_id=context.request_id,
                timestamp=datetime.now(),
                duration_ms=context.get_duration_ms(),
                api_version=self.config.version,
            ),
        )
    
    def _create_auth_required_response(
        self,
        context: RequestContext,
    ) -> APIResponse:
        """Create an authentication required error response."""
        from .models import ResponseMetadata, ErrorDetails
        
        error = ErrorDetails(
            code=ErrorCodes.AUTHENTICATION_REQUIRED,
            message="Authentication required",
            remediation="Provide valid authentication credentials",
        )
        
        return APIResponse(
            status="error",
            error=error,
            metadata=ResponseMetadata(
                request_id=context.request_id,
                timestamp=datetime.now(),
                duration_ms=context.get_duration_ms(),
                api_version=self.config.version,
            ),
        )
