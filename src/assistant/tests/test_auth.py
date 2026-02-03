"""
Unit tests for authentication and authorization middleware.

Tests JWT token generation, validation, expiration, and user authentication.
"""

import pytest
import time
from jose import jwt
from datetime import datetime, timedelta

from ..auth import AuthenticationMiddleware, UserService, User
from ..exceptions import AuthenticationError, AuthorizationError


@pytest.fixture
def auth_middleware():
    """Create authentication middleware for testing"""
    return AuthenticationMiddleware(
        secret_key="test_secret_key_12345",
        access_token_expire_minutes=60,  # Longer expiration for tests
        refresh_token_expire_days=7
    )


@pytest.fixture
def short_expire_middleware():
    """Create authentication middleware with very short expiration for testing"""
    return AuthenticationMiddleware(
        secret_key="test_secret_key_12345",
        access_token_expire_minutes=0,  # Expires immediately
        refresh_token_expire_days=0
    )


@pytest.fixture
def user_service():
    """Create user service for testing"""
    return UserService()


@pytest.fixture
def test_user():
    """Create a test user"""
    return User(
        id="user_1",
        username="test_user",
        email="test@example.com",
        roles=["user"]
    )


@pytest.fixture
def admin_user():
    """Create an admin user"""
    return User(
        id="user_2",
        username="admin_user",
        email="admin@example.com",
        roles=["user", "admin"]
    )


class TestAuthenticationMiddleware:
    """Test authentication middleware functionality"""
    
    def test_generate_access_token(self, auth_middleware, test_user):
        """Test generating a valid access token"""
        token = auth_middleware.generate_access_token(test_user)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode token to verify contents (without validation)
        payload = jwt.decode(
            token,
            auth_middleware.secret_key,
            algorithms=[auth_middleware.algorithm],
            options={"verify_exp": False}  # Don't verify expiration for inspection
        )
        
        assert payload["sub"] == test_user.id
        assert payload["username"] == test_user.username
        assert payload["email"] == test_user.email
        assert payload["roles"] == test_user.roles
        assert payload["type"] == "access"
        assert "iat" in payload
        assert "exp" in payload
    
    def test_generate_refresh_token(self, auth_middleware, test_user):
        """Test generating a valid refresh token"""
        token = auth_middleware.generate_refresh_token(test_user)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode token to verify contents (without validation)
        payload = jwt.decode(
            token,
            auth_middleware.secret_key,
            algorithms=[auth_middleware.algorithm],
            options={"verify_exp": False}  # Don't verify expiration for inspection
        )
        
        assert payload["sub"] == test_user.id
        assert payload["type"] == "refresh"
        assert "iat" in payload
        assert "exp" in payload
    
    def test_validate_valid_token(self, auth_middleware, test_user):
        """Test valid token acceptance"""
        # Generate token
        token = auth_middleware.generate_access_token(test_user)
        
        # Validate token
        user = auth_middleware.validate_token(token)
        
        assert user is not None
        assert user.id == test_user.id
        assert user.username == test_user.username
        assert user.email == test_user.email
        assert user.roles == test_user.roles
    
    def test_validate_invalid_token_rejection(self, auth_middleware):
        """Test invalid token rejection (401)"""
        invalid_token = "invalid.token.string"
        
        with pytest.raises(AuthenticationError) as exc_info:
            auth_middleware.validate_token(invalid_token)
        
        assert "Invalid token" in str(exc_info.value)
    
    def test_validate_missing_token_rejection(self, auth_middleware):
        """Test missing token rejection (401)"""
        with pytest.raises(AuthenticationError) as exc_info:
            auth_middleware.validate_token("")
        
        assert "Missing authentication token" in str(exc_info.value)
        
        with pytest.raises(AuthenticationError) as exc_info:
            auth_middleware.validate_token(None)
        
        assert "Missing authentication token" in str(exc_info.value)
    
    def test_validate_expired_token_rejection(self, short_expire_middleware, test_user):
        """Test expired token rejection (401)"""
        # Generate token with very short expiration
        token = short_expire_middleware.generate_access_token(test_user)
        
        # Wait a moment to ensure expiration
        time.sleep(0.1)
        
        # Try to validate expired token
        with pytest.raises(AuthenticationError) as exc_info:
            short_expire_middleware.validate_token(token)
        
        assert "expired" in str(exc_info.value).lower()
    
    def test_validate_wrong_token_type(self, auth_middleware, test_user):
        """Test that refresh tokens are rejected for access validation"""
        # Generate refresh token
        refresh_token = auth_middleware.generate_refresh_token(test_user)
        
        # Try to validate as access token
        with pytest.raises(AuthenticationError) as exc_info:
            auth_middleware.validate_token(refresh_token)
        
        assert "Invalid token type" in str(exc_info.value)
    
    def test_validate_token_with_wrong_secret(self, test_user):
        """Test that tokens signed with different secret are rejected"""
        # Create two middlewares with different secrets
        middleware1 = AuthenticationMiddleware(secret_key="secret1")
        middleware2 = AuthenticationMiddleware(secret_key="secret2")
        
        # Generate token with first middleware
        token = middleware1.generate_access_token(test_user)
        
        # Try to validate with second middleware
        with pytest.raises(AuthenticationError) as exc_info:
            middleware2.validate_token(token)
        
        assert "Invalid token" in str(exc_info.value)
    
    def test_validate_refresh_token(self, auth_middleware, test_user):
        """Test refresh token validation"""
        # Generate refresh token
        refresh_token = auth_middleware.generate_refresh_token(test_user)
        
        # Validate refresh token
        user_id = auth_middleware.validate_refresh_token(refresh_token)
        
        assert user_id == test_user.id
    
    def test_validate_expired_refresh_token(self, short_expire_middleware, test_user):
        """Test expired refresh token rejection"""
        # Generate refresh token with very short expiration
        refresh_token = short_expire_middleware.generate_refresh_token(test_user)
        
        # Wait a moment to ensure expiration
        time.sleep(0.1)
        
        # Try to validate expired refresh token
        with pytest.raises(AuthenticationError) as exc_info:
            short_expire_middleware.validate_refresh_token(refresh_token)
        
        assert "expired" in str(exc_info.value).lower()
    
    def test_revoke_token(self, auth_middleware, test_user):
        """Test token revocation"""
        # Generate token
        token = auth_middleware.generate_access_token(test_user)
        
        # Validate token (should work)
        user = auth_middleware.validate_token(token)
        assert user is not None
        
        # Revoke token
        auth_middleware.revoke_token(token)
        
        # Try to validate revoked token (should fail)
        with pytest.raises(AuthenticationError) as exc_info:
            auth_middleware.validate_token(token)
        
        assert "revoked" in str(exc_info.value).lower()
    
    def test_require_auth_decorator(self, auth_middleware, test_user):
        """Test require_auth decorator"""
        # Generate token
        token = auth_middleware.generate_access_token(test_user)
        
        # Create a test handler
        @auth_middleware.require_auth
        def test_handler(token=None, user=None):
            return {"user_id": user.id}
        
        # Call handler with token
        result = test_handler(token=token)
        
        assert result["user_id"] == test_user.id
    
    def test_require_auth_decorator_without_token(self, auth_middleware):
        """Test require_auth decorator without token"""
        # Create a test handler
        @auth_middleware.require_auth
        def test_handler(token=None, user=None):
            return {"user_id": user.id}
        
        # Call handler without token
        with pytest.raises(AuthenticationError) as exc_info:
            test_handler()
        
        assert "Authentication required" in str(exc_info.value)
    
    def test_require_role_decorator(self, auth_middleware, admin_user):
        """Test require_role decorator"""
        # Create a test handler
        @auth_middleware.require_role("admin")
        def test_handler(user=None):
            return {"success": True}
        
        # Call handler with admin user
        result = test_handler(user=admin_user)
        
        assert result["success"] is True
    
    def test_require_role_decorator_insufficient_permissions(
        self, auth_middleware, test_user
    ):
        """Test require_role decorator with insufficient permissions"""
        # Create a test handler requiring admin role
        @auth_middleware.require_role("admin")
        def test_handler(user=None):
            return {"success": True}
        
        # Call handler with regular user (no admin role)
        with pytest.raises(AuthorizationError) as exc_info:
            test_handler(user=test_user)
        
        assert "Insufficient permissions" in str(exc_info.value)
        assert "admin" in str(exc_info.value)


class TestUserService:
    """Test user service functionality"""
    
    def test_authenticate_valid_credentials(self, user_service):
        """Test authentication with valid credentials"""
        user = user_service.authenticate("test_user", "test_password")
        
        assert user is not None
        assert user.username == "test_user"
        assert user.email == "test@example.com"
        assert "user" in user.roles
    
    def test_authenticate_invalid_username(self, user_service):
        """Test authentication with invalid username"""
        user = user_service.authenticate("nonexistent_user", "test_password")
        
        assert user is None
    
    def test_authenticate_invalid_password(self, user_service):
        """Test authentication with invalid password"""
        user = user_service.authenticate("test_user", "wrong_password")
        
        assert user is None
    
    def test_authenticate_admin_user(self, user_service):
        """Test authentication with admin user"""
        user = user_service.authenticate("admin_user", "admin_password")
        
        assert user is not None
        assert user.username == "admin_user"
        assert "user" in user.roles
        assert "admin" in user.roles
    
    def test_get_user_by_id(self, user_service):
        """Test getting user by ID"""
        user = user_service.get_user_by_id("user_1")
        
        assert user is not None
        assert user.id == "user_1"
        assert user.username == "test_user"
    
    def test_get_user_by_invalid_id(self, user_service):
        """Test getting user with invalid ID"""
        user = user_service.get_user_by_id("nonexistent_id")
        
        assert user is None


class TestTokenExpiration:
    """Test token expiration behavior"""
    
    def test_access_token_expiration_time(self, auth_middleware, test_user):
        """Test that access token has correct expiration time"""
        token = auth_middleware.generate_access_token(test_user)
        
        # Decode without validation to inspect payload
        payload = jwt.decode(
            token,
            auth_middleware.secret_key,
            algorithms=[auth_middleware.algorithm],
            options={"verify_exp": False}  # Don't verify expiration for inspection
        )
        
        # Check expiration is approximately 60 minutes from now (as per fixture)
        exp_time = datetime.fromtimestamp(payload["exp"])
        iat_time = datetime.fromtimestamp(payload["iat"])
        
        time_diff = exp_time - iat_time
        
        # Should be 60 minutes (with small tolerance)
        assert 59 * 60 < time_diff.total_seconds() < 61 * 60
    
    def test_refresh_token_expiration_time(self, auth_middleware, test_user):
        """Test that refresh token has correct expiration time"""
        token = auth_middleware.generate_refresh_token(test_user)
        
        # Decode without validation to inspect payload
        payload = jwt.decode(
            token,
            auth_middleware.secret_key,
            algorithms=[auth_middleware.algorithm],
            options={"verify_exp": False}  # Don't verify expiration for inspection
        )
        
        # Check expiration is approximately 7 days from now
        exp_time = datetime.fromtimestamp(payload["exp"])
        iat_time = datetime.fromtimestamp(payload["iat"])
        
        time_diff = exp_time - iat_time
        
        # Should be 7 days (with small tolerance)
        assert 6.9 * 24 * 60 * 60 < time_diff.total_seconds() < 7.1 * 24 * 60 * 60


class TestAuthenticationErrorMessages:
    """Test authentication error messages are descriptive"""
    
    def test_missing_token_error_message(self, auth_middleware):
        """Test missing token error has clear message"""
        with pytest.raises(AuthenticationError) as exc_info:
            auth_middleware.validate_token("")
        
        error = exc_info.value
        assert error.code == "AUTHENTICATION_ERROR"
        assert error.category == "security"
        assert "Missing authentication token" in error.message
    
    def test_invalid_token_error_message(self, auth_middleware):
        """Test invalid token error has clear message"""
        with pytest.raises(AuthenticationError) as exc_info:
            auth_middleware.validate_token("invalid.token")
        
        error = exc_info.value
        assert error.code == "AUTHENTICATION_ERROR"
        assert error.category == "security"
        assert "Invalid token" in error.message
    
    def test_expired_token_error_message(self, short_expire_middleware, test_user):
        """Test expired token error has clear message"""
        token = short_expire_middleware.generate_access_token(test_user)
        time.sleep(0.1)
        
        with pytest.raises(AuthenticationError) as exc_info:
            short_expire_middleware.validate_token(token)
        
        error = exc_info.value
        assert error.code == "AUTHENTICATION_ERROR"
        assert error.category == "security"
        assert "expired" in error.message.lower()
    
    def test_authorization_error_message(self, auth_middleware, test_user):
        """Test authorization error has clear message"""
        @auth_middleware.require_role("admin")
        def test_handler(user=None):
            return True
        
        with pytest.raises(AuthorizationError) as exc_info:
            test_handler(user=test_user)
        
        error = exc_info.value
        assert error.code == "AUTHORIZATION_ERROR"
        assert error.category == "security"
        assert "Insufficient permissions" in error.message
        assert "admin" in error.message
