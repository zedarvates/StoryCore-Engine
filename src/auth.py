"""
Authentication and Authorization Module for StoryCore API Server

Provides JWT authentication, role-based authorization, API key authentication,
password hashing, and rate limiting setup.

Author: StoryCore-Engine Team
Date: 2026-01-15
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from passlib.context import CryptContext
from jose import JWTError, jwt
import secrets
import hashlib
import os


# Settings
class Settings(BaseSettings):
    """Application settings for authentication."""
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    rate_limit_requests_per_minute: int = 60
    redis_url: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Models
class User(BaseModel):
    """User model for authentication."""
    username: str
    hashed_password: str
    role: str  # "user" or "admin"


class APIKey(BaseModel):
    """API Key model for authentication."""
    key_id: str
    name: str
    hashed_key: str
    permissions: List[str]  # e.g., ["read:workflows", "write:projects"]


class TokenData(BaseModel):
    """Data extracted from JWT token."""
    username: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None  # "access" or "refresh"


# In-memory databases (in production, use proper database)
users_db: Dict[str, User] = {}
api_keys_db: Dict[str, APIKey] = {}


# Password functions
def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


# API Key functions
def generate_api_key() -> str:
    """Generate a new API key."""
    return secrets.token_urlsafe(32)


def hash_api_key(api_key: str) -> str:
    """Hash an API key using SHA-256."""
    return hashlib.sha256(api_key.encode()).hexdigest()


# JWT functions
def create_access_token(data: Dict[str, Any]) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None


# Dependency functions for auth checks
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter


# Security schemes
security = HTTPBearer()
api_key_header = APIKeyHeader(name="X-API-Key")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    user = users_db.get(username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user (placeholder for future is_active check)."""
    # In current model, no is_active, but structure for future
    return current_user


async def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Get current admin user."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user


async def authenticate_api_key(api_key: str = Depends(api_key_header)) -> APIKey:
    """Authenticate API key."""
    hashed_key = hash_api_key(api_key)
    for key_obj in api_keys_db.values():
        if key_obj.hashed_key == hashed_key:
            return key_obj
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key"
    )


# Rate limiting dependency
# Note: FastAPILimiter must be initialized in the app startup
rate_limiter = RateLimiter(times=settings.rate_limit_requests_per_minute, minutes=1)


# Combined auth dependency (JWT or API key)
async def get_current_auth_user(
    jwt_user: Optional[User] = Depends(get_current_user),
    api_key: Optional[APIKey] = Depends(authenticate_api_key)
) -> Dict[str, Any]:
    """Get current authenticated user from JWT or API key."""
    if jwt_user:
        return {"user": jwt_user, "via": "jwt"}
    elif api_key:
        # For API key, create a pseudo-user or return key info
        return {"api_key": api_key, "via": "api_key"}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )