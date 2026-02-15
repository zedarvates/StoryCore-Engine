"""
Centralized Authentication Module

Provides JWT token verification for all API endpoints.
Implements secure JWT validation with signature verification and claim validation.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def get_jwt_secret() -> str:
    """
    Get JWT secret from centralized configuration.
    
    Uses backend.config.settings.get_jwt_secret() which ensures:
    - Environment variable is set in production
    - Proper error handling for missing secrets
    
    Returns:
        str: JWT secret key
        
    Raises:
        ValueError: If JWT_SECRET is not configured
    """
    # Import from centralized config which handles production safety
    try:
        from backend.config import settings
        return settings.get_jwt_secret()
    except ImportError:
        # Fallback to environment variable if config not available
        jwt_secret = os.getenv("JWT_SECRET")
        if not jwt_secret:
            raise ValueError(
                "JWT_SECRET environment variable is not configured. "
                "Please set JWT_SECRET for production use."
            )
        return jwt_secret


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify JWT token with full validation.
    
    Args:
        token: JWT token string
        
    Returns:
        Dict[str, Any]: Decoded payload
        
    Raises:
        HTTPException: 401 if token is invalid
    """
    secret_key = get_jwt_secret()
    
    try:
        # Decode with verification
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=["HS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "require": ["exp", "iat", "sub"]
            }
        )
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Verify JWT token from Authorization header with full signature verification.
    
    This function implements comprehensive JWT validation:
    - Verifies token signature using HMAC-SHA256
    - Validates expiration time (exp claim)
    - Validates issued-at time (iat claim)
    - Ensures subject (sub claim) is present
    
    Args:
        credentials: HTTP Bearer credentials from Authorization header
        
    Returns:
        Dict[str, Any]: Verified and decoded JWT payload
        
    Raises:
        HTTPException: 401 if token is missing, invalid, expired, or has invalid signature
    """
    token = credentials.credentials
    
    # Basic validation first
    if not token or len(token) < 10:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token format"
        )
    
    # Full JWT verification with signature and claims validation
    try:
        payload = decode_jwt_token(token)
        return payload
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[int] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode
        expires_delta: Optional expiration time in minutes
        
    Returns:
        str: Encoded JWT token
    """
    import secrets
    
    secret_key = get_jwt_secret()
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + timedelta(minutes=expires_delta)
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": "storycore-api"
    })
    
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm="HS256")
    return encoded_jwt
