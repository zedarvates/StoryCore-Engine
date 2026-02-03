"""
Authentication and authorization middleware for StoryCore AI Assistant API.

This module provides JWT-based authentication with token generation, validation,
expiration, and refresh mechanisms.
"""

from jose import jwt, JWTError
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Callable
from functools import wraps
from dataclasses import dataclass

from .exceptions import AuthenticationError, AuthorizationError


@dataclass
class User:
    """User model for authentication"""
    id: str
    username: str
    email: str
    roles: list[str]


class AuthenticationMiddleware:
    """
    JWT-based authentication middleware.
    
    Provides token generation, validation, expiration checking, and refresh logic.
    Validates authentication tokens on every request and enforces authentication
    requirements.
    """
    
    def __init__(
        self,
        secret_key: str,
        algorithm: str = "HS256",
        access_token_expire_minutes: int = 30,
        refresh_token_expire_days: int = 7
    ):
        """
        Initialize authentication middleware.
        
        Args:
            secret_key: Secret key for JWT signing
            algorithm: JWT algorithm (default: HS256)
            access_token_expire_minutes: Access token expiration in minutes
            refresh_token_expire_days: Refresh token expiration in days
        """
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_expire_days
        
        # In-memory token blacklist (in production, use Redis or database)
        self.blacklisted_tokens: set[str] = set()
    
    def generate_access_token(self, user: User) -> str:
        """
        Generate a new access token for a user.
        
        Args:
            user: User to generate token for
            
        Returns:
            JWT access token string
        """
        now = datetime.utcnow()
        expire = now + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            "sub": user.id,
            "username": user.username,
            "email": user.email,
            "roles": user.roles,
            "type": "access",
            "iat": now.timestamp(),
            "exp": expire.timestamp()
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token
    
    def generate_refresh_token(self, user: User) -> str:
        """
        Generate a new refresh token for a user.
        
        Args:
            user: User to generate token for
            
        Returns:
            JWT refresh token string
        """
        now = datetime.utcnow()
        expire = now + timedelta(days=self.refresh_token_expire_days)
        
        payload = {
            "sub": user.id,
            "type": "refresh",
            "iat": now.timestamp(),
            "exp": expire.timestamp()
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        return token
    
    def validate_token(self, token: str) -> Optional[User]:
        """
        Validate a JWT token and return the user if valid.
        
        Args:
            token: JWT token string to validate
            
        Returns:
            User object if token is valid, None otherwise
            
        Raises:
            AuthenticationError: If token is invalid, expired, or blacklisted
        """
        if not token:
            raise AuthenticationError("Missing authentication token")
        
        # Check if token is blacklisted
        if token in self.blacklisted_tokens:
            raise AuthenticationError("Token has been revoked")
        
        try:
            # Decode and verify token
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Check token type
            if payload.get("type") != "access":
                raise AuthenticationError("Invalid token type")
            
            # Create user from payload
            user = User(
                id=payload.get("sub"),
                username=payload.get("username"),
                email=payload.get("email"),
                roles=payload.get("roles", [])
            )
            
            return user
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except JWTError as e:
            raise AuthenticationError(f"Invalid token: {str(e)}")
        except Exception as e:
            raise AuthenticationError(f"Token validation failed: {str(e)}")
    
    def validate_refresh_token(self, token: str) -> Optional[str]:
        """
        Validate a refresh token and return the user ID if valid.
        
        Args:
            token: JWT refresh token string to validate
            
        Returns:
            User ID if token is valid
            
        Raises:
            AuthenticationError: If token is invalid or expired
        """
        if not token:
            raise AuthenticationError("Missing refresh token")
        
        # Check if token is blacklisted
        if token in self.blacklisted_tokens:
            raise AuthenticationError("Token has been revoked")
        
        try:
            # Decode and verify token
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Check token type
            if payload.get("type") != "refresh":
                raise AuthenticationError("Invalid token type")
            
            return payload.get("sub")
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Refresh token has expired")
        except JWTError as e:
            raise AuthenticationError(f"Invalid refresh token: {str(e)}")
        except Exception as e:
            raise AuthenticationError(f"Refresh token validation failed: {str(e)}")
    
    def revoke_token(self, token: str) -> None:
        """
        Revoke a token by adding it to the blacklist.
        
        Args:
            token: Token to revoke
        """
        self.blacklisted_tokens.add(token)
    
    def require_auth(self, handler: Callable) -> Callable:
        """
        Decorator to require authentication for a handler function.
        
        Args:
            handler: Handler function to wrap
            
        Returns:
            Wrapped handler that requires authentication
        """
        @wraps(handler)
        def wrapper(*args, **kwargs):
            # Extract token from kwargs (FastAPI dependency injection)
            token = kwargs.get("token")
            if not token:
                raise AuthenticationError("Authentication required")
            
            # Validate token
            user = self.validate_token(token)
            
            # Add user to kwargs
            kwargs["user"] = user
            
            # Call handler
            return handler(*args, **kwargs)
        
        return wrapper
    
    def require_role(self, required_role: str) -> Callable:
        """
        Decorator to require a specific role for a handler function.
        
        Args:
            required_role: Role required to access the handler
            
        Returns:
            Decorator function
        """
        def decorator(handler: Callable) -> Callable:
            @wraps(handler)
            def wrapper(*args, **kwargs):
                # Get user from kwargs (should be set by require_auth)
                user = kwargs.get("user")
                if not user:
                    raise AuthenticationError("Authentication required")
                
                # Check if user has required role
                if required_role not in user.roles:
                    raise AuthorizationError(
                        f"Insufficient permissions. Required role: {required_role}"
                    )
                
                # Call handler
                return handler(*args, **kwargs)
            
            return wrapper
        return decorator


class UserService:
    """
    Service for user management and authentication.
    
    In production, this would interface with a database.
    For now, uses in-memory storage for demonstration.
    """
    
    def __init__(self):
        """Initialize user service with demo users"""
        # In-memory user storage (in production, use database)
        self.users: Dict[str, Dict[str, Any]] = {
            "test_user": {
                "id": "user_1",
                "username": "test_user",
                "email": "test@example.com",
                "password_hash": self._hash_password("test_password"),
                "roles": ["user"]
            },
            "admin_user": {
                "id": "user_2",
                "username": "admin_user",
                "email": "admin@example.com",
                "password_hash": self._hash_password("admin_password"),
                "roles": ["user", "admin"]
            }
        }
    
    def _hash_password(self, password: str) -> str:
        """
        Hash a password (simplified for demo).
        
        In production, use bcrypt or argon2.
        """
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()
    
    def authenticate(self, username: str, password: str) -> Optional[User]:
        """
        Authenticate a user with username and password.
        
        Args:
            username: Username
            password: Password
            
        Returns:
            User object if authentication succeeds, None otherwise
        """
        user_data = self.users.get(username)
        if not user_data:
            return None
        
        # Check password
        password_hash = self._hash_password(password)
        if password_hash != user_data["password_hash"]:
            return None
        
        # Create user object
        return User(
            id=user_data["id"],
            username=user_data["username"],
            email=user_data["email"],
            roles=user_data["roles"]
        )
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Get a user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User object if found, None otherwise
        """
        for user_data in self.users.values():
            if user_data["id"] == user_id:
                return User(
                    id=user_data["id"],
                    username=user_data["username"],
                    email=user_data["email"],
                    roles=user_data["roles"]
                )
        return None
