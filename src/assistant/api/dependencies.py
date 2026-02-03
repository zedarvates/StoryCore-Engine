"""
Shared dependencies for API routes.
"""

from fastapi import Header, HTTPException
from typing import Optional

from ..auth import AuthenticationMiddleware, User
from ..exceptions import AuthenticationError

# Global auth middleware (will be set by app.py)
_auth_middleware: Optional[AuthenticationMiddleware] = None


def set_auth_middleware(auth_mw: AuthenticationMiddleware):
    """Set the global auth middleware"""
    global _auth_middleware
    _auth_middleware = auth_mw


async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    """
    Dependency to get current authenticated user.
    
    Args:
        authorization: Authorization header with Bearer token
        
    Returns:
        Authenticated User object
        
    Raises:
        HTTPException: If authentication fails
    """
    if not _auth_middleware:
        raise HTTPException(status_code=500, detail="Authentication not configured")
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    token = parts[1]
    
    try:
        user = _auth_middleware.validate_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e))
