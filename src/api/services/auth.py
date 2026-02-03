"""
Authentication and Authorization Services

This module provides authentication and authorization functionality for the API system.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
import hashlib
import secrets
import logging


logger = logging.getLogger(__name__)


@dataclass
class Permission:
    """Represents a permission for a resource and action."""
    
    resource: str  # e.g., "storycore.narration", "storycore.pipeline"
    action: str    # e.g., "read", "write", "execute"
    
    def __str__(self) -> str:
        return f"{self.resource}:{self.action}"
    
    def __hash__(self) -> int:
        return hash((self.resource, self.action))


@dataclass
class User:
    """Represents an authenticated user."""
    
    user_id: str
    username: str
    email: Optional[str] = None
    permissions: Set[Permission] = field(default_factory=set)
    metadata: Dict[str, any] = field(default_factory=dict)
    
    def has_permission(self, resource: str, action: str) -> bool:
        """
        Check if user has a specific permission.
        
        Args:
            resource: Resource identifier
            action: Action to perform
            
        Returns:
            True if user has permission
        """
        # Check exact match
        if Permission(resource, action) in self.permissions:
            return True
        
        # Check wildcard permissions
        if Permission(resource, "*") in self.permissions:
            return True
        
        if Permission("*", action) in self.permissions:
            return True
        
        if Permission("*", "*") in self.permissions:
            return True
        
        return False


@dataclass
class AuthToken:
    """Represents an authentication token."""
    
    token: str
    user_id: str
    created_at: datetime
    expires_at: datetime
    metadata: Dict[str, any] = field(default_factory=dict)
    
    def is_expired(self) -> bool:
        """Check if token is expired."""
        return datetime.now() >= self.expires_at
    
    def is_valid(self) -> bool:
        """Check if token is valid (not expired)."""
        return not self.is_expired()


class AuthenticationService:
    """
    Service for authenticating users and managing tokens.
    
    This is a basic implementation suitable for local/development use.
    For production, integrate with proper identity providers (OAuth, SAML, etc.).
    """
    
    def __init__(self, token_ttl_seconds: int = 3600):
        """
        Initialize authentication service.
        
        Args:
            token_ttl_seconds: Time-to-live for tokens in seconds (default: 1 hour)
        """
        self.token_ttl_seconds = token_ttl_seconds
        self.tokens: Dict[str, AuthToken] = {}
        self.users: Dict[str, User] = {}
        self.credentials: Dict[str, str] = {}  # username -> hashed_password
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def register_user(
        self,
        user_id: str,
        username: str,
        password: str,
        email: Optional[str] = None,
        permissions: Optional[Set[Permission]] = None,
    ) -> User:
        """
        Register a new user.
        
        Args:
            user_id: Unique user identifier
            username: Username
            password: Plain text password (will be hashed)
            email: User email
            permissions: Set of permissions
            
        Returns:
            Created user
        """
        if username in self.credentials:
            raise ValueError(f"User {username} already exists")
        
        # Hash password
        hashed_password = self._hash_password(password)
        self.credentials[username] = hashed_password
        
        # Create user
        user = User(
            user_id=user_id,
            username=username,
            email=email,
            permissions=permissions or set(),
        )
        self.users[user_id] = user
        
        self.logger.info(f"Registered user: {username} (ID: {user_id})")
        return user
    
    def validate_credentials(self, username: str, password: str) -> Optional[AuthToken]:
        """
        Validate user credentials and return auth token.
        
        Args:
            username: Username
            password: Plain text password
            
        Returns:
            Auth token if credentials are valid, None otherwise
        """
        # Check if user exists
        if username not in self.credentials:
            self.logger.warning(f"Authentication failed: user not found: {username}")
            return None
        
        # Verify password
        hashed_password = self._hash_password(password)
        if self.credentials[username] != hashed_password:
            self.logger.warning(f"Authentication failed: invalid password for user: {username}")
            return None
        
        # Find user
        user = next((u for u in self.users.values() if u.username == username), None)
        if not user:
            self.logger.error(f"User found in credentials but not in users: {username}")
            return None
        
        # Generate token
        token = self._generate_token()
        auth_token = AuthToken(
            token=token,
            user_id=user.user_id,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(seconds=self.token_ttl_seconds),
        )
        
        self.tokens[token] = auth_token
        self.logger.info(f"Generated token for user: {username}")
        
        return auth_token
    
    def verify_token(self, token: str) -> Optional[User]:
        """
        Verify auth token and return user.
        
        Args:
            token: Authentication token
            
        Returns:
            User if token is valid, None otherwise
        """
        auth_token = self.tokens.get(token)
        
        if not auth_token:
            self.logger.warning("Token verification failed: token not found")
            return None
        
        if auth_token.is_expired():
            self.logger.warning("Token verification failed: token expired")
            # Clean up expired token
            del self.tokens[token]
            return None
        
        user = self.users.get(auth_token.user_id)
        if not user:
            self.logger.error(f"Token valid but user not found: {auth_token.user_id}")
            return None
        
        return user
    
    def revoke_token(self, token: str) -> bool:
        """
        Revoke an authentication token.
        
        Args:
            token: Token to revoke
            
        Returns:
            True if token was revoked, False if not found
        """
        if token in self.tokens:
            del self.tokens[token]
            self.logger.info("Token revoked")
            return True
        return False
    
    def cleanup_expired_tokens(self) -> int:
        """
        Remove expired tokens from storage.
        
        Returns:
            Number of tokens removed
        """
        expired = [
            token for token, auth_token in self.tokens.items()
            if auth_token.is_expired()
        ]
        
        for token in expired:
            del self.tokens[token]
        
        if expired:
            self.logger.info(f"Cleaned up {len(expired)} expired tokens")
        
        return len(expired)
    
    def _generate_token(self) -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)
    
    def _hash_password(self, password: str) -> str:
        """Hash a password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()


class AuthorizationService:
    """
    Service for checking user permissions and authorization.
    """
    
    def __init__(self):
        """Initialize authorization service."""
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def check_permission(
        self,
        user: User,
        resource: str,
        action: str,
    ) -> bool:
        """
        Check if user has permission for action on resource.
        
        Args:
            user: User to check
            resource: Resource identifier (e.g., "storycore.narration.generate")
            action: Action to perform (e.g., "execute", "read", "write")
            
        Returns:
            True if user has permission
        """
        has_permission = user.has_permission(resource, action)
        
        if has_permission:
            self.logger.debug(
                f"Authorization granted: user={user.username}, "
                f"resource={resource}, action={action}"
            )
        else:
            self.logger.warning(
                f"Authorization denied: user={user.username}, "
                f"resource={resource}, action={action}"
            )
        
        return has_permission
    
    def grant_permission(
        self,
        user: User,
        resource: str,
        action: str,
    ) -> None:
        """
        Grant a permission to a user.
        
        Args:
            user: User to grant permission to
            resource: Resource identifier
            action: Action to allow
        """
        permission = Permission(resource, action)
        user.permissions.add(permission)
        
        self.logger.info(
            f"Permission granted: user={user.username}, "
            f"resource={resource}, action={action}"
        )
    
    def revoke_permission(
        self,
        user: User,
        resource: str,
        action: str,
    ) -> bool:
        """
        Revoke a permission from a user.
        
        Args:
            user: User to revoke permission from
            resource: Resource identifier
            action: Action to revoke
            
        Returns:
            True if permission was revoked, False if user didn't have it
        """
        permission = Permission(resource, action)
        
        if permission in user.permissions:
            user.permissions.remove(permission)
            self.logger.info(
                f"Permission revoked: user={user.username}, "
                f"resource={resource}, action={action}"
            )
            return True
        
        return False
    
    def list_permissions(self, user: User) -> List[Permission]:
        """
        List all permissions for a user.
        
        Args:
            user: User to list permissions for
            
        Returns:
            List of permissions
        """
        return list(user.permissions)
