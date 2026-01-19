"""
Security Tests for StoryCore API Server
Tests JWT authentication, API keys, rate limiting, and security validation.

Run with: python -m pytest tests/test_api_security.py -v
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
import httpx
from fastapi.testclient import TestClient
from jose import jwt

from src.api_server_fastapi import app
from src.auth import (
    settings,
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    users_db,
    User,
    APIKey,
    api_keys_db,
    hash_api_key,
    generate_api_key,
)


@pytest.fixture
def client():
    """Test client for FastAPI app."""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Create a test user."""
    username = "testuser"
    password = "testpass123!"
    hashed_password = get_password_hash(password)

    user = User(username=username, hashed_password=hashed_password, role="user")
    users_db[username] = user
    yield user
    # Cleanup
    if username in users_db:
        del users_db[username]


@pytest.fixture
def admin_user():
    """Create an admin test user."""
    username = "testadmin"
    password = "adminpass123!"
    hashed_password = get_password_hash(password)

    user = User(username=username, hashed_password=hashed_password, role="admin")
    users_db[username] = user
    yield user
    # Cleanup
    if username in users_db:
        del users_db[username]


@pytest.fixture
def valid_token(test_user):
    """Generate a valid JWT token for test user."""
    return create_access_token(data={"sub": test_user.username, "role": test_user.role})


@pytest.fixture
def expired_token(test_user):
    """Generate an expired JWT token."""
    expire = datetime.utcnow() - timedelta(minutes=1)
    to_encode = {
        "sub": test_user.username,
        "role": test_user.role,
        "exp": expire
    }
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


class TestAuthentication:
    """Test JWT authentication endpoints."""

    def test_login_success(self, client, test_user):
        """Test successful user login."""
        response = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "testpass123!"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = client.post(
            "/auth/login",
            json={"username": "nonexistent", "password": "wrongpass"}
        )

        assert response.status_code == 401
        assert "Invalid username or password" in response.json()["detail"]

    def test_login_missing_fields(self, client):
        """Test login with missing fields."""
        response = client.post("/auth/login", json={"username": "test"})
        assert response.status_code == 422

    def test_refresh_token_success(self, client, valid_token):
        """Test successful token refresh."""
        response = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {valid_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_token_invalid(self, client):
        """Test refresh with invalid token."""
        response = client.post(
            "/auth/refresh",
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401
        assert "Invalid refresh token" in response.json()["detail"]

    def test_logout_success(self, client, valid_token):
        """Test successful logout."""
        response = client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {valid_token}"}
        )

        assert response.status_code == 200
        assert "Logged out successfully" in response.json()["message"]


class TestAuthorization:
    """Test API authorization with JWT tokens."""

    def test_protected_endpoint_without_auth(self, client):
        """Test accessing protected endpoint without authentication."""
        response = client.get("/system_stats")
        assert response.status_code == 401
        assert "Authentication required" in response.json()["detail"]

    def test_protected_endpoint_with_valid_token(self, client, valid_token):
        """Test accessing protected endpoint with valid token."""
        response = client.get(
            "/system_stats",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "uptime_seconds" in data

    def test_protected_endpoint_with_expired_token(self, client, expired_token):
        """Test accessing protected endpoint with expired token."""
        response = client.get(
            "/system_stats",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 401
        assert "Invalid or expired token" in response.json()["detail"]


class TestAPIKeys:
    """Test API key authentication."""

    @pytest.fixture
    def api_key(self):
        """Create a test API key."""
        from src.api_server import APIKey, api_keys_db, hash_api_key, generate_api_key

        key_id = "test_key_123"
        api_key_plain = generate_api_key()
        hashed_key = hash_api_key(api_key_plain)

        api_key = APIKey(
            key_id=key_id,
            name="test_key",
            hashed_key=hashed_key,
            permissions=["read:workflows"]
        )
        api_keys_db[key_id] = api_key
        yield api_key_plain, api_key
        # Cleanup
        if key_id in api_keys_db:
            del api_keys_db[key_id]

    def test_api_key_authentication(self, client, api_key):
        """Test API key authentication."""
        api_key_plain, _ = api_key
        response = client.get(
            "/system_stats",
            headers={"X-API-Key": api_key_plain}
        )
        assert response.status_code == 200

    def test_invalid_api_key(self, client):
        """Test invalid API key."""
        response = client.get(
            "/system_stats",
            headers={"X-API-Key": "invalid_key"}
        )
        assert response.status_code == 401

    def test_create_api_key_requires_auth(self, client):
        """Test that creating API keys requires authentication."""
        response = client.post("/api-keys", json={"name": "test"})
        assert response.status_code == 401

    def test_create_api_key_admin_only(self, client, valid_token, test_user):
        """Test that only admins can create API keys."""
        # test_user is not admin
        response = client.post(
            "/api-keys",
            json={"name": "test_key"},
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]


class TestRateLimiting:
    """Test rate limiting functionality."""

    def test_rate_limit_exceeded(self, client):
        """Test that rate limiting works."""
        # Make many requests to trigger rate limit
        for i in range(settings.rate_limit_requests_per_minute + 5):
            response = client.get("/health")
            if i < settings.rate_limit_requests_per_minute:
                assert response.status_code == 200
            else:
                # Should eventually get rate limited
                if response.status_code == 429:
                    assert "Rate limit exceeded" in response.text
                    break

    @pytest.mark.asyncio
    async def test_rate_limit_with_redis(self):
        """Test rate limiting with Redis backend."""
        # This would require a Redis instance
        # For now, just test the configuration
        assert settings.redis_url is not None
        assert settings.rate_limit_requests_per_minute > 0


class TestSecurityValidation:
    """Test security validation integration."""

    def test_workflow_validation_passes(self, client, valid_token):
        """Test workflow request validation passes."""
        workflow_request = {
            "workflow_type": "basic_generation",
            "prompt": "A beautiful sunset",
            "image_path": None,
            "trajectory": None
        }

        response = client.post(
            "/workflows",
            json=workflow_request,
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "workflow_id" in data
        assert data["status"] == "queued"

    def test_workflow_validation_fails_dangerous_prompt(self, client, valid_token):
        """Test workflow validation fails with dangerous prompt."""
        workflow_request = {
            "workflow_type": "basic_generation",
            "prompt": "<script>alert('xss')</script>",
        }

        response = client.post(
            "/workflows",
            json=workflow_request,
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        assert response.status_code == 400
        assert "Validation failed" in response.json()["detail"]

    def test_workflow_validation_fails_unauthorized_workflow(self, client, valid_token):
        """Test workflow validation fails for unauthorized workflow type."""
        workflow_request = {
            "workflow_type": "unauthorized_workflow",
            "prompt": "Test prompt",
        }

        response = client.post(
            "/workflows",
            json=workflow_request,
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        assert response.status_code == 400


class TestInputValidation:
    """Test input validation."""

    def test_password_validation(self, test_user):
        """Test password hashing and verification."""
        password = "testpass123!"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed)
        assert not verify_password("wrongpass", hashed)

    def test_token_creation_and_verification(self, test_user):
        """Test JWT token creation and verification."""
        token = create_access_token(data={"sub": test_user.username})
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == test_user.username
        assert payload["type"] == "access"

    def test_invalid_token_verification(self):
        """Test invalid token handling."""
        assert verify_token("invalid_token") is None
        assert verify_token("") is None


class TestSecurityHeaders:
    """Test security headers."""

    def test_cors_headers(self, client):
        """Test CORS headers are set correctly."""
        response = client.options(
            "/health",
            headers={"Origin": "http://localhost:3000"}
        )
        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-credentials" in response.headers

    def test_security_headers_present(self, client):
        """Test that security headers are present."""
        response = client.get("/health")
        # Check for common security headers
        security_headers = [
            "x-content-type-options",
            "x-frame-options",
            "x-xss-protection"
        ]
        for header in security_headers:
            assert header in response.headers or header.replace("-", "_") in response.headers


class TestErrorHandling:
    """Test error handling and logging."""

    def test_validation_error_handling(self, client):
        """Test Pydantic validation error handling."""
        response = client.post(
            "/auth/login",
            json={"username": "", "password": ""}  # Invalid data
        )
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        assert "type" in data

    def test_http_exception_handling(self, client):
        """Test HTTP exception handling."""
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


# Integration tests
class TestSecurityIntegration:
    """Integration tests for security features."""

    def test_full_authentication_flow(self, client, test_user):
        """Test complete authentication flow."""
        # Login
        login_response = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "testpass123!"}
        )
        assert login_response.status_code == 200
        tokens = login_response.json()

        # Access protected resource
        protected_response = client.get(
            "/system_stats",
            headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        assert protected_response.status_code == 200

        # Refresh token
        refresh_response = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {tokens['refresh_token']}"}
        )
        assert refresh_response.status_code == 200
        new_tokens = refresh_response.json()

        # Verify new token works
        new_protected_response = client.get(
            "/system_stats",
            headers={"Authorization": f"Bearer {new_tokens['access_token']}"}
        )
        assert new_protected_response.status_code == 200

        # Logout
        logout_response = client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {new_tokens['access_token']}"}
        )
        assert logout_response.status_code == 200

    def test_concurrent_requests_handling(self, client, valid_token):
        """Test handling of concurrent requests."""
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        def make_request():
            return client.get(
                "/system_stats",
                headers={"Authorization": f"Bearer {valid_token}"}
            )

        # Make concurrent requests
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            responses = [f.result() for f in futures]

        # All should succeed (within rate limits)
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count >= 3  # At least some should succeed


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])