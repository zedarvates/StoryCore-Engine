"""
Integration tests for Security API endpoints.

Tests all 4 security endpoints:
- storycore.security.auth.validate
- storycore.security.permissions.check
- storycore.security.rate.limit
- storycore.security.audit.log
"""

import pytest
from datetime import datetime, timedelta

from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext
from src.api.categories.security import SecurityCategoryHandler


@pytest.fixture
def api_config():
    """Create API configuration for testing."""
    return APIConfig(
        version="1.0.0",
        log_api_calls=True,
        log_sanitize_params=True,
    )


@pytest.fixture
def api_router(api_config):
    """Create API router for testing."""
    return APIRouter(api_config)


@pytest.fixture
def security_handler(api_config, api_router):
    """Create security handler for testing."""
    return SecurityCategoryHandler(api_config, api_router)


@pytest.fixture
def request_context():
    """Create request context for testing."""
    return RequestContext()


@pytest.fixture
def valid_token(security_handler):
    """Generate a valid test token."""
    return security_handler._generate_token("user_001", "bearer", 3600)



class TestAuthValidateEndpoint:
    """Tests for storycore.security.auth.validate endpoint."""
    
    def test_auth_validate_valid_token(self, security_handler, request_context, valid_token):
        """Test authentication validation with valid token."""
        params = {"token": valid_token}
        
        response = security_handler.auth_validate(params, request_context)
        
        assert response.status == "success"
        assert response.data["valid"] is True
        assert response.data["user_id"] == "user_001"
        assert response.data["token_type"] == "bearer"
        assert response.data["expires_at"] is not None
        assert "permissions" in response.data
        assert response.data["validation_time_ms"] >= 0
    
    def test_auth_validate_invalid_token(self, security_handler, request_context):
        """Test authentication validation with invalid token."""
        params = {"token": "invalid_token_12345"}
        
        response = security_handler.auth_validate(params, request_context)
        
        assert response.status == "success"
        assert response.data["valid"] is False
        assert response.data["error_message"] is not None
    
    def test_auth_validate_with_token_type(self, security_handler, request_context):
        """Test authentication validation with specific token type."""
        token = security_handler._generate_token("user_002", "api_key", 7200)
        params = {
            "token": token,
            "token_type": "api_key",
        }
        
        response = security_handler.auth_validate(params, request_context)
        
        assert response.status == "success"
        assert response.data["valid"] is True
        assert response.data["token_type"] == "api_key"
    
    def test_auth_validate_with_required_permissions(self, security_handler, request_context, valid_token):
        """Test authentication validation with required permissions."""
        params = {
            "token": valid_token,
            "validate_permissions": True,
            "required_permissions": ["read", "write"],
        }
        
        response = security_handler.auth_validate(params, request_context)
        
        assert response.status == "success"
        assert response.data["valid"] is True
        assert "read" in response.data["permissions"]
        assert "write" in response.data["permissions"]
    
    def test_auth_validate_missing_permissions(self, security_handler, request_context):
        """Test authentication validation with missing permissions."""
        token = security_handler._generate_token("user_002", "bearer", 3600)
        params = {
            "token": token,
            "validate_permissions": True,
            "required_permissions": ["admin"],
        }
        
        response = security_handler.auth_validate(params, request_context)
        
        assert response.status == "success"
        assert response.data["valid"] is False
        assert "Missing required permissions" in response.data["error_message"]
    
    def test_auth_validate_without_expiry_check(self, security_handler, request_context):
        """Test authentication validation without expiry check."""
        # Create an expired token
        token = security_handler._generate_token("user_001", "bearer", -3600)
        params = {
            "token": token,
            "validate_expiry": False,
        }
        
        response = security_handler.auth_validate(params, request_context)
        
        assert response.status == "success"
        # Should be valid since we're not checking expiry
        assert response.data["valid"] is True
    
    def test_auth_validate_missing_token(self, security_handler, request_context):
        """Test authentication validation without token parameter."""
        params = {}
        
        response = security_handler.auth_validate(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_auth_validate_invalid_token_type(self, security_handler, request_context, valid_token):
        """Test authentication validation with invalid token type."""
        params = {
            "token": valid_token,
            "token_type": "invalid_type",
        }
        
        response = security_handler.auth_validate(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_auth_validate_invalid_permission_type(self, security_handler, request_context, valid_token):
        """Test authentication validation with invalid permission type."""
        params = {
            "token": valid_token,
            "validate_permissions": True,
            "required_permissions": ["invalid_permission"],
        }
        
        response = security_handler.auth_validate(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"



class TestPermissionsCheckEndpoint:
    """Tests for storycore.security.permissions.check endpoint."""
    
    def test_permissions_check_allowed(self, security_handler, request_context):
        """Test permission check for allowed action."""
        params = {
            "user_id": "user_001",
            "resource": "project_123",
            "action": "read",
        }
        
        response = security_handler.permissions_check(params, request_context)
        
        assert response.status == "success"
        assert response.data["allowed"] is True
        assert response.data["user_id"] == "user_001"
        assert response.data["resource"] == "project_123"
        assert response.data["action"] == "read"
        assert len(response.data["matched_policies"]) > 0
        assert response.data["reason"] is not None
    
    def test_permissions_check_denied(self, security_handler, request_context):
        """Test permission check for denied action."""
        params = {
            "user_id": "user_002",
            "resource": "project_123",
            "action": "delete",
        }
        
        response = security_handler.permissions_check(params, request_context)
        
        assert response.status == "success"
        assert response.data["allowed"] is False
        assert response.data["reason"] is not None
    
    def test_permissions_check_admin_user(self, security_handler, request_context):
        """Test permission check for admin user."""
        params = {
            "user_id": "admin_001",
            "resource": "project_123",
            "action": "delete",
        }
        
        response = security_handler.permissions_check(params, request_context)
        
        assert response.status == "success"
        assert response.data["allowed"] is True
        assert "admin_policy" in response.data["matched_policies"]
    
    def test_permissions_check_with_context(self, security_handler, request_context):
        """Test permission check with additional context."""
        params = {
            "user_id": "user_001",
            "resource": "project_123",
            "action": "write",
            "context": {
                "ip_address": "192.168.1.1",
                "timestamp": datetime.now().isoformat(),
            },
        }
        
        response = security_handler.permissions_check(params, request_context)
        
        assert response.status == "success"
    
    def test_permissions_check_nonexistent_user(self, security_handler, request_context):
        """Test permission check for nonexistent user."""
        params = {
            "user_id": "nonexistent_user",
            "resource": "project_123",
            "action": "read",
        }
        
        response = security_handler.permissions_check(params, request_context)
        
        assert response.status == "success"
        assert response.data["allowed"] is False
        assert "User not found" in response.data["reason"]
    
    def test_permissions_check_missing_user_id(self, security_handler, request_context):
        """Test permission check without user_id parameter."""
        params = {
            "resource": "project_123",
            "action": "read",
        }
        
        response = security_handler.permissions_check(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_permissions_check_missing_resource(self, security_handler, request_context):
        """Test permission check without resource parameter."""
        params = {
            "user_id": "user_001",
            "action": "read",
        }
        
        response = security_handler.permissions_check(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_permissions_check_missing_action(self, security_handler, request_context):
        """Test permission check without action parameter."""
        params = {
            "user_id": "user_001",
            "resource": "project_123",
        }
        
        response = security_handler.permissions_check(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_permissions_check_invalid_action(self, security_handler, request_context):
        """Test permission check with invalid action."""
        params = {
            "user_id": "user_001",
            "resource": "project_123",
            "action": "invalid_action",
        }
        
        response = security_handler.permissions_check(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"



class TestRateLimitEndpoint:
    """Tests for storycore.security.rate.limit endpoint."""
    
    def test_rate_limit_basic(self, security_handler, request_context):
        """Test basic rate limit status check."""
        params = {}
        
        response = security_handler.rate_limit(params, request_context)
        
        assert response.status == "success"
        assert "overall_status" in response.data
        assert "limits" in response.data
        assert "check_time_ms" in response.data
        assert len(response.data["limits"]) > 0
    
    def test_rate_limit_for_user(self, security_handler, request_context):
        """Test rate limit status for specific user."""
        params = {"user_id": "user_001"}
        
        response = security_handler.rate_limit(params, request_context)
        
        assert response.status == "success"
        assert response.data["user_id"] == "user_001"
        assert len(response.data["limits"]) > 0
    
    def test_rate_limit_for_endpoint(self, security_handler, request_context):
        """Test rate limit status for specific endpoint."""
        params = {"endpoint": "storycore.narration.generate"}
        
        response = security_handler.rate_limit(params, request_context)
        
        assert response.status == "success"
        assert len(response.data["limits"]) > 0
        assert response.data["limits"][0]["endpoint"] == "storycore.narration.generate"
    
    def test_rate_limit_for_user_and_endpoint(self, security_handler, request_context):
        """Test rate limit status for specific user and endpoint."""
        params = {
            "user_id": "user_001",
            "endpoint": "storycore.image.generate",
        }
        
        response = security_handler.rate_limit(params, request_context)
        
        assert response.status == "success"
        assert response.data["user_id"] == "user_001"
        assert len(response.data["limits"]) == 1
        assert response.data["limits"][0]["endpoint"] == "storycore.image.generate"
    
    def test_rate_limit_with_history(self, security_handler, request_context):
        """Test rate limit status with request history."""
        # Record some requests
        security_handler._record_request("user_001", "storycore.test.endpoint")
        security_handler._record_request("user_001", "storycore.test.endpoint")
        
        params = {
            "user_id": "user_001",
            "endpoint": "storycore.test.endpoint",
            "include_history": True,
        }
        
        response = security_handler.rate_limit(params, request_context)
        
        assert response.status == "success"
        assert "request_history" in response.data
        assert len(response.data["request_history"]) > 0
    
    def test_rate_limit_with_custom_window(self, security_handler, request_context):
        """Test rate limit status with custom time window."""
        params = {"time_window_seconds": 300}
        
        response = security_handler.rate_limit(params, request_context)
        
        assert response.status == "success"
        assert response.data["limits"][0]["window_seconds"] == 300
    
    def test_rate_limit_structure(self, security_handler, request_context):
        """Test rate limit response structure."""
        params = {"user_id": "user_001"}
        
        response = security_handler.rate_limit(params, request_context)
        
        assert response.status == "success"
        limit_info = response.data["limits"][0]
        assert "endpoint" in limit_info
        assert "limit" in limit_info
        assert "remaining" in limit_info
        assert "reset_at" in limit_info
        assert "status" in limit_info
        assert "window_seconds" in limit_info
    
    def test_rate_limit_invalid_time_window(self, security_handler, request_context):
        """Test rate limit with invalid time window."""
        params = {"time_window_seconds": 5000}
        
        response = security_handler.rate_limit(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_rate_limit_status_values(self, security_handler, request_context):
        """Test that rate limit status is valid."""
        params = {}
        
        response = security_handler.rate_limit(params, request_context)
        
        assert response.status == "success"
        assert response.data["overall_status"] in ["ok", "warning", "exceeded"]
        for limit in response.data["limits"]:
            assert limit["status"] in ["ok", "warning", "exceeded"]



class TestAuditLogEndpoint:
    """Tests for storycore.security.audit.log endpoint."""
    
    def test_audit_log_basic(self, security_handler, request_context):
        """Test basic audit log creation."""
        params = {"event_type": "auth_success"}
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "success"
        assert response.data["logged"] is True
        assert "event_id" in response.data
        assert response.data["event_type"] == "auth_success"
        assert "timestamp" in response.data
    
    def test_audit_log_with_user(self, security_handler, request_context):
        """Test audit log with user information."""
        params = {
            "event_type": "auth_success",
            "user_id": "user_001",
        }
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "success"
        assert response.data["logged"] is True
    
    def test_audit_log_with_resource_and_action(self, security_handler, request_context):
        """Test audit log with resource and action."""
        params = {
            "event_type": "data_access",
            "user_id": "user_001",
            "resource": "project_123",
            "action": "read",
        }
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "success"
        assert response.data["logged"] is True
    
    def test_audit_log_with_result(self, security_handler, request_context):
        """Test audit log with result status."""
        params = {
            "event_type": "auth_failure",
            "user_id": "user_001",
            "result": "failure",
        }
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "success"
        assert response.data["logged"] is True
    
    def test_audit_log_with_details(self, security_handler, request_context):
        """Test audit log with additional details."""
        params = {
            "event_type": "permission_denied",
            "user_id": "user_002",
            "resource": "admin_panel",
            "action": "access",
            "result": "denied",
            "details": {
                "ip_address": "192.168.1.100",
                "user_agent": "Mozilla/5.0",
                "reason": "Insufficient permissions",
            },
        }
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "success"
        assert response.data["logged"] is True
    
    def test_audit_log_with_severity(self, security_handler, request_context):
        """Test audit log with severity level."""
        params = {
            "event_type": "suspicious_activity",
            "user_id": "user_001",
            "severity": "warning",
        }
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "success"
        assert response.data["logged"] is True
    
    def test_audit_log_critical_severity(self, security_handler, request_context):
        """Test audit log with critical severity (should save to file)."""
        params = {
            "event_type": "config_change",
            "user_id": "admin_001",
            "resource": "system_config",
            "action": "modify",
            "severity": "critical",
        }
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "success"
        assert response.data["logged"] is True
        # Critical events should be saved to file
        assert response.data["log_path"] is not None
    
    def test_audit_log_missing_event_type(self, security_handler, request_context):
        """Test audit log without event_type parameter."""
        params = {}
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_audit_log_invalid_event_type(self, security_handler, request_context):
        """Test audit log with invalid event type."""
        params = {"event_type": "invalid_event"}
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_audit_log_invalid_result(self, security_handler, request_context):
        """Test audit log with invalid result."""
        params = {
            "event_type": "auth_success",
            "result": "invalid_result",
        }
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_audit_log_invalid_severity(self, security_handler, request_context):
        """Test audit log with invalid severity."""
        params = {
            "event_type": "auth_success",
            "severity": "invalid_severity",
        }
        
        response = security_handler.audit_log(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestSecurityEndpointIntegration:
    """Integration tests across multiple security endpoints."""
    
    def test_auth_and_permissions_flow(self, security_handler, request_context, valid_token):
        """Test complete authentication and permission check flow."""
        # Validate token
        auth_response = security_handler.auth_validate(
            {"token": valid_token},
            request_context
        )
        assert auth_response.status == "success"
        assert auth_response.data["valid"] is True
        
        user_id = auth_response.data["user_id"]
        
        # Check permissions
        perm_response = security_handler.permissions_check(
            {
                "user_id": user_id,
                "resource": "project_123",
                "action": "read",
            },
            request_context
        )
        assert perm_response.status == "success"
        assert perm_response.data["allowed"] is True
    
    def test_rate_limit_and_audit_flow(self, security_handler, request_context):
        """Test rate limit check and audit logging flow."""
        # Check rate limit
        rate_response = security_handler.rate_limit(
            {"user_id": "user_001"},
            request_context
        )
        assert rate_response.status == "success"
        
        # Log the rate limit check
        audit_response = security_handler.audit_log(
            {
                "event_type": "rate_limit_exceeded",
                "user_id": "user_001",
                "severity": "warning",
            },
            request_context
        )
        assert audit_response.status == "success"
    
    def test_failed_auth_audit_log(self, security_handler, request_context):
        """Test logging failed authentication attempts."""
        # Try to validate invalid token
        auth_response = security_handler.auth_validate(
            {"token": "invalid_token"},
            request_context
        )
        assert auth_response.data["valid"] is False
        
        # Log the failed attempt
        audit_response = security_handler.audit_log(
            {
                "event_type": "auth_failure",
                "result": "failure",
                "severity": "warning",
                "details": {"reason": "Invalid token"},
            },
            request_context
        )
        assert audit_response.status == "success"
    
    def test_permission_denied_audit_log(self, security_handler, request_context):
        """Test logging permission denied events."""
        # Check permission (should be denied)
        perm_response = security_handler.permissions_check(
            {
                "user_id": "user_002",
                "resource": "admin_panel",
                "action": "admin",
            },
            request_context
        )
        assert perm_response.data["allowed"] is False
        
        # Log the denial
        audit_response = security_handler.audit_log(
            {
                "event_type": "permission_denied",
                "user_id": "user_002",
                "resource": "admin_panel",
                "action": "admin",
                "result": "denied",
                "severity": "info",
            },
            request_context
        )
        assert audit_response.status == "success"
