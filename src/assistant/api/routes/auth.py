"""
Authentication endpoints for StoryCore AI Assistant API.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from ...auth import AuthenticationMiddleware, UserService, User
from ...usage_tracker import UsageTracker
from ..dependencies import get_current_user
from ..models import (
    LoginRequest, LoginResponse,
    RefreshTokenRequest, RefreshTokenResponse,
    UsageStatsResponse
)
from ...logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

# These will be injected from app.py
auth_middleware: AuthenticationMiddleware = None
user_service: UserService = None
usage_tracker: UsageTracker = None


def init_auth_routes(auth_mw: AuthenticationMiddleware, user_svc: UserService, usage_trk: UsageTracker):
    """Initialize route dependencies"""
    global auth_middleware, user_service, usage_tracker
    auth_middleware = auth_mw
    user_service = user_svc
    usage_tracker = usage_trk


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return access and refresh tokens.
    
    Args:
        request: Login credentials
        
    Returns:
        Access and refresh tokens
        
    Raises:
        HTTPException: If authentication fails
    """
    logger.info(f"Login attempt for user: {request.username}")
    
    # Authenticate user
    user = user_service.authenticate(request.username, request.password)
    if not user:
        logger.warning(f"Failed login attempt for user: {request.username}")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Generate tokens
    access_token = auth_middleware.generate_access_token(user)
    refresh_token = auth_middleware.generate_refresh_token(user)
    
    logger.info(f"User logged in successfully: {request.username}")
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=auth_middleware.access_token_expire_minutes * 60
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh an access token using a refresh token.
    
    Args:
        request: Refresh token
        
    Returns:
        New access token
        
    Raises:
        HTTPException: If refresh token is invalid
    """
    logger.info("Token refresh attempt")
    
    try:
        # Validate refresh token
        user_id = auth_middleware.validate_refresh_token(request.refresh_token)
        
        # Get user
        user = user_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Generate new access token
        access_token = auth_middleware.generate_access_token(user)
        
        logger.info(f"Token refreshed for user: {user.username}")
        
        return RefreshTokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=auth_middleware.access_token_expire_minutes * 60
        )
    except Exception as e:
        logger.warning(f"Token refresh failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.get("/usage/stats", response_model=UsageStatsResponse)
async def get_usage_stats(user: User = Depends(get_current_user)):
    """
    Get usage statistics for the authenticated user.
    
    Args:
        user: Authenticated user (from dependency)
        
    Returns:
        Usage statistics
    """
    # Note: user dependency will be properly injected from app.py
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"Usage stats requested for user: {user.username}")
    
    # Get usage stats
    stats = usage_tracker.get_user_stats(user.id)
    
    return UsageStatsResponse(
        user_id=stats.user_id,
        total_requests=stats.total_requests,
        successful_requests=stats.successful_requests,
        failed_requests=stats.failed_requests,
        total_data_transferred_mb=stats.total_data_transferred_mb,
        average_response_time_ms=stats.average_response_time_ms,
        operation_counts=stats.operation_counts,
        endpoint_counts=stats.endpoint_counts,
        first_request_time=datetime.fromtimestamp(stats.first_request_time) if stats.first_request_time else None,
        last_request_time=datetime.fromtimestamp(stats.last_request_time) if stats.last_request_time else None
    )
