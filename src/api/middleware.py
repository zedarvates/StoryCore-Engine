"""
API Middleware

This module provides middleware functions for the API router.
"""

from typing import Any, Dict, Optional
from datetime import datetime
import logging
import re

from .models import APIResponse, RequestContext, ErrorDetails, ErrorCodes, ResponseMetadata
from .services.auth import AuthenticationService
from .services.rate_limit import RateLimitService
from .services.cache import CacheService, get_ttl_for_endpoint


logger = logging.getLogger(__name__)


def create_auth_middleware(auth_service: AuthenticationService):
    """
    Create authentication middleware.
    
    This middleware extracts and validates authentication tokens from requests.
    
    Args:
        auth_service: Authentication service instance
        
    Returns:
        Middleware function
    """
    def auth_middleware(context: RequestContext, params: Dict[str, Any]) -> Optional[APIResponse]:
        """
        Authenticate requests using bearer tokens.
        
        Looks for 'Authorization' in params with format: "Bearer <token>"
        If found and valid, sets context.user
        """
        # Check for authorization header
        auth_header = params.get("Authorization") or params.get("authorization")
        
        if not auth_header:
            # No auth provided - this is OK for endpoints that don't require auth
            return None
        
        # Parse bearer token
        if not auth_header.startswith("Bearer "):
            error = ErrorDetails(
                code=ErrorCodes.AUTHENTICATION_REQUIRED,
                message="Invalid authorization header format",
                remediation="Use format: Authorization: Bearer <token>",
            )
            
            return APIResponse(
                status="error",
                error=error,
                metadata=ResponseMetadata(
                    request_id=context.request_id,
                    timestamp=datetime.now(),
                    duration_ms=context.get_duration_ms(),
                    api_version="v1",
                ),
            )
        
        token = auth_header[7:]  # Remove "Bearer " prefix
        
        # Verify token
        user = auth_service.verify_token(token)
        
        if not user:
            error = ErrorDetails(
                code=ErrorCodes.AUTHENTICATION_REQUIRED,
                message="Invalid or expired authentication token",
                remediation="Obtain a new token by authenticating",
            )
            
            return APIResponse(
                status="error",
                error=error,
                metadata=ResponseMetadata(
                    request_id=context.request_id,
                    timestamp=datetime.now(),
                    duration_ms=context.get_duration_ms(),
                    api_version="v1",
                ),
            )
        
        # Set user in context
        context.user = user
        logger.debug(f"Authenticated user: {user.username}")
        
        return None  # Continue to next middleware/handler
    
    return auth_middleware


def create_rate_limit_middleware(
    rate_limit_service: RateLimitService,
    api_version: str = "v1",
):
    """
    Create rate limiting middleware.
    
    This middleware enforces rate limits on API requests.
    
    Args:
        rate_limit_service: Rate limiting service instance
        api_version: API version for responses
        
    Returns:
        Middleware function
    """
    def rate_limit_middleware(
        context: RequestContext,
        params: Dict[str, Any],
    ) -> Optional[APIResponse]:
        """
        Enforce rate limits on requests.
        
        Requires context.user to be set (run after auth middleware).
        """
        # Skip if no user (anonymous requests)
        if not context.user:
            # Could implement IP-based rate limiting here
            return None
        
        # Check rate limit
        status = rate_limit_service.check_limit(
            user_id=context.user.user_id,
            endpoint=context.endpoint,
        )
        
        if not status.allowed:
            error = ErrorDetails(
                code=ErrorCodes.RATE_LIMIT_EXCEEDED,
                message="Rate limit exceeded",
                details={
                    "remaining": status.remaining,
                    "reset_at": status.reset_at.isoformat(),
                    "retry_after_seconds": status.retry_after_seconds,
                },
                remediation=f"Wait {status.retry_after_seconds} seconds before retrying",
            )
            
            return APIResponse(
                status="error",
                error=error,
                metadata=ResponseMetadata(
                    request_id=context.request_id,
                    timestamp=datetime.now(),
                    duration_ms=context.get_duration_ms(),
                    api_version=api_version,
                ),
            )
        
        logger.debug(
            f"Rate limit check passed: user={context.user.username}, "
            f"remaining={status.remaining}"
        )
        
        return None  # Continue to next middleware/handler
    
    return rate_limit_middleware


def create_logging_middleware(api_version: str = "v1"):
    """
    Create logging middleware.
    
    This middleware logs all API requests and responses.
    
    Args:
        api_version: API version for responses
        
    Returns:
        Middleware function
    """
    def logging_middleware(
        context: RequestContext,
        params: Dict[str, Any],
    ) -> Optional[APIResponse]:
        """
        Log API requests.
        
        This runs before the handler, so we only log the request here.
        Response logging should be done in the router after handler execution.
        """
        logger.info(
            f"API Request: {context.method} {context.endpoint}",
            extra={
                "request_id": context.request_id,
                "endpoint": context.endpoint,
                "method": context.method,
                "user": context.user.username if context.user else None,
            }
        )
        
        return None  # Continue to next middleware/handler
    
    return logging_middleware



def create_cache_middleware(
    cache_service: CacheService,
    api_version: str = "v1",
):
    """
    Create caching middleware.
    
    This middleware caches responses for GET requests to metadata endpoints.
    
    Args:
        cache_service: Cache service instance
        api_version: API version for responses
        
    Returns:
        Middleware function
    """
    # Define cacheable endpoint patterns (metadata operations)
    CACHEABLE_PATTERNS = [
        r"\.list$",           # List operations
        r"\.get$",            # Get operations
        r"\.status$",         # Status checks
        r"\.search$",         # Search operations
        r"\.analyze$",        # Analysis operations
        r"\.schema$",         # Schema retrieval
        r"\.config$",         # Configuration retrieval
        r"\.health\.check$",  # Health checks
        r"\.metrics\.get$",   # Metrics retrieval
    ]
    
    def is_cacheable(endpoint: str, method: str) -> bool:
        """Check if an endpoint should be cached."""
        # Only cache GET-like operations
        if method not in ["GET", "POST"]:
            return False
        
        # Check if endpoint matches cacheable patterns
        for pattern in CACHEABLE_PATTERNS:
            if re.search(pattern, endpoint):
                return True
        
        return False
    
    def cache_middleware(
        context: RequestContext,
        params: Dict[str, Any],
    ) -> Optional[APIResponse]:
        """
        Cache responses for metadata endpoints.
        
        This middleware:
        1. Checks if the endpoint is cacheable
        2. For cacheable endpoints, checks if response is in cache
        3. Returns cached response if found
        4. Otherwise, allows request to proceed (handler will cache result)
        """
        endpoint = context.endpoint
        method = context.method
        
        # Check if endpoint is cacheable
        if not is_cacheable(endpoint, method):
            return None  # Not cacheable, continue to handler
        
        # Generate cache key
        user_id = context.user.user_id if context.user else None
        cache_key = CacheService.generate_cache_key(endpoint, params, user_id)
        
        # Try to get from cache
        cached_response = cache_service.get(cache_key)
        
        if cached_response is not None:
            logger.info(
                f"Cache hit for {endpoint}",
                extra={
                    "request_id": context.request_id,
                    "cache_key": cache_key,
                }
            )
            
            # Update metadata with current request info
            if isinstance(cached_response, dict) and "metadata" in cached_response:
                # Cached response is a dict, convert to APIResponse
                from .models import ResponseMetadata
                cached_response["metadata"]["request_id"] = context.request_id
                cached_response["metadata"]["timestamp"] = datetime.now()
                cached_response["metadata"]["from_cache"] = True
                
                return APIResponse(**cached_response)
            elif isinstance(cached_response, APIResponse):
                # Update metadata
                cached_response.metadata.request_id = context.request_id
                cached_response.metadata.timestamp = datetime.now()
                # Add cache indicator
                if not hasattr(cached_response.metadata, "from_cache"):
                    cached_response.metadata.from_cache = True
                
                return cached_response
        
        logger.debug(
            f"Cache miss for {endpoint}",
            extra={
                "request_id": context.request_id,
                "cache_key": cache_key,
            }
        )
        
        # Store cache key in context so handler can cache the response
        context.cache_key = cache_key
        context.cache_ttl = get_ttl_for_endpoint(endpoint)
        
        return None  # Continue to handler
    
    return cache_middleware


def create_cache_invalidation_middleware(
    cache_service: CacheService,
):
    """
    Create cache invalidation middleware for mutation operations.
    
    This middleware invalidates cache entries when resources are modified.
    
    Args:
        cache_service: Cache service instance
        
    Returns:
        Middleware function
    """
    # Define mutation operations and their invalidation patterns
    MUTATION_PATTERNS = {
        r"\.create$": lambda endpoint: endpoint.rsplit(".", 1)[0] + ".*",
        r"\.update$": lambda endpoint: endpoint.rsplit(".", 1)[0] + ".*",
        r"\.delete$": lambda endpoint: endpoint.rsplit(".", 1)[0] + ".*",
        r"\.add$": lambda endpoint: endpoint.rsplit(".", 1)[0] + ".*",
        r"\.remove$": lambda endpoint: endpoint.rsplit(".", 1)[0] + ".*",
        r"\.clear$": lambda endpoint: endpoint.rsplit(".", 1)[0] + ".*",
        r"\.execute$": lambda endpoint: endpoint.rsplit(".", 1)[0] + ".*",
        r"\.generate$": lambda endpoint: endpoint.rsplit(".", 1)[0] + ".*",
    }
    
    def is_mutation(endpoint: str) -> bool:
        """Check if an endpoint is a mutation operation."""
        for pattern in MUTATION_PATTERNS.keys():
            if re.search(pattern, endpoint):
                return True
        return False
    
    def get_invalidation_pattern(endpoint: str) -> Optional[str]:
        """Get the cache invalidation pattern for an endpoint."""
        for pattern, pattern_fn in MUTATION_PATTERNS.items():
            if re.search(pattern, endpoint):
                return pattern_fn(endpoint)
        return None
    
    def cache_invalidation_middleware(
        context: RequestContext,
        params: Dict[str, Any],
    ) -> Optional[APIResponse]:
        """
        Invalidate cache entries for mutation operations.
        
        This middleware runs BEFORE the handler to invalidate stale cache entries.
        """
        endpoint = context.endpoint
        
        # Check if this is a mutation operation
        if not is_mutation(endpoint):
            return None  # Not a mutation, continue
        
        # Get invalidation pattern
        pattern = get_invalidation_pattern(endpoint)
        
        if pattern:
            # Invalidate matching cache entries
            count = cache_service.invalidate(pattern)
            
            logger.info(
                f"Cache invalidation for {endpoint}: {count} entries removed",
                extra={
                    "request_id": context.request_id,
                    "pattern": pattern,
                    "count": count,
                }
            )
        
        return None  # Continue to handler
    
    return cache_invalidation_middleware
