"""
Verification Test for Core API Services

This script runs comprehensive tests to verify all core services are working correctly.
"""

import sys
import time
from typing import List, Tuple

from .auth import AuthenticationService, AuthorizationService, Permission
from .rate_limit import RateLimitService
from .observability import ObservabilityService


class TestResult:
    """Test result container."""
    def __init__(self, name: str, passed: bool, message: str = ""):
        self.name = name
        self.passed = passed
        self.message = message


def run_test(name: str, test_func) -> TestResult:
    """Run a test and return result."""
    try:
        test_func()
        return TestResult(name, True)
    except AssertionError as e:
        return TestResult(name, False, str(e))
    except Exception as e:
        return TestResult(name, False, f"Unexpected error: {str(e)}")


def test_auth_user_registration():
    """Test user registration."""
    auth = AuthenticationService()
    user = auth.register_user("u1", "alice", "pass123", permissions={Permission("test", "read")})
    assert user.username == "alice"
    assert user.user_id == "u1"
    assert len(user.permissions) == 1


def test_auth_credential_validation():
    """Test credential validation."""
    auth = AuthenticationService()
    auth.register_user("u1", "alice", "pass123")
    
    # Valid credentials
    token = auth.validate_credentials("alice", "pass123")
    assert token is not None
    assert token.is_valid()
    
    # Invalid credentials
    token = auth.validate_credentials("alice", "wrongpass")
    assert token is None


def test_auth_token_verification():
    """Test token verification."""
    auth = AuthenticationService()
    auth.register_user("u1", "alice", "pass123")
    token = auth.validate_credentials("alice", "pass123")
    
    # Valid token
    user = auth.verify_token(token.token)
    assert user is not None
    assert user.username == "alice"
    
    # Invalid token
    user = auth.verify_token("invalid_token")
    assert user is None


def test_auth_token_revocation():
    """Test token revocation."""
    auth = AuthenticationService()
    auth.register_user("u1", "alice", "pass123")
    token = auth.validate_credentials("alice", "pass123")
    
    # Revoke token
    revoked = auth.revoke_token(token.token)
    assert revoked is True
    
    # Token should no longer work
    user = auth.verify_token(token.token)
    assert user is None


def test_authz_permission_checking():
    """Test permission checking."""
    auth = AuthenticationService()
    authz = AuthorizationService()
    
    user = auth.register_user("u1", "alice", "pass123", permissions={
        Permission("resource1", "read"),
        Permission("resource2", "*"),
    })
    
    # Exact match
    assert authz.check_permission(user, "resource1", "read") is True
    assert authz.check_permission(user, "resource1", "write") is False
    
    # Wildcard action
    assert authz.check_permission(user, "resource2", "read") is True
    assert authz.check_permission(user, "resource2", "write") is True
    
    # No permission
    assert authz.check_permission(user, "resource3", "read") is False


def test_authz_grant_revoke():
    """Test granting and revoking permissions."""
    auth = AuthenticationService()
    authz = AuthorizationService()
    
    user = auth.register_user("u1", "alice", "pass123")
    
    # Initially no permission
    assert authz.check_permission(user, "resource1", "read") is False
    
    # Grant permission
    authz.grant_permission(user, "resource1", "read")
    assert authz.check_permission(user, "resource1", "read") is True
    
    # Revoke permission
    revoked = authz.revoke_permission(user, "resource1", "read")
    assert revoked is True
    assert authz.check_permission(user, "resource1", "read") is False


def test_rate_limit_basic():
    """Test basic rate limiting."""
    rate_limit = RateLimitService(default_requests_per_minute=5, burst_multiplier=1.0)
    
    # Should allow up to capacity
    for i in range(5):
        status = rate_limit.check_limit("user1")
        assert status.allowed is True, f"Request {i+1} should be allowed"
    
    # Should deny after capacity
    status = rate_limit.check_limit("user1")
    assert status.allowed is False
    assert status.retry_after_seconds is not None


def test_rate_limit_per_endpoint():
    """Test per-endpoint rate limiting."""
    rate_limit = RateLimitService(default_requests_per_minute=10)
    
    # Different endpoints should have separate limits
    status1 = rate_limit.check_limit("user1", "endpoint1")
    status2 = rate_limit.check_limit("user1", "endpoint2")
    
    assert status1.allowed is True
    assert status2.allowed is True


def test_rate_limit_custom_limits():
    """Test custom rate limits."""
    rate_limit = RateLimitService(default_requests_per_minute=10)
    
    # Set custom limit
    rate_limit.set_custom_limit("user1", requests_per_minute=100)
    
    # Should use custom limit
    status = rate_limit.get_status("user1")
    assert status.remaining > 10  # Should have more than default


def test_rate_limit_reset():
    """Test rate limit reset."""
    rate_limit = RateLimitService(default_requests_per_minute=5, burst_multiplier=1.0)
    
    # Consume all tokens
    for _ in range(5):
        rate_limit.check_limit("user1")
    
    # Should be rate limited
    status = rate_limit.get_status("user1")
    assert status.remaining == 0
    
    # Reset
    rate_limit.reset_limit("user1")
    
    # Should have full capacity again
    status = rate_limit.get_status("user1")
    assert status.remaining == 5


def test_obs_request_id_generation():
    """Test request ID generation."""
    obs = ObservabilityService()
    
    id1 = obs.generate_request_id()
    id2 = obs.generate_request_id()
    
    assert id1 != id2
    assert id1.startswith("req_")
    assert id2.startswith("req_")


def test_obs_request_logging():
    """Test request logging."""
    obs = ObservabilityService()
    
    request_id = obs.generate_request_id()
    obs.log_request(
        request_id=request_id,
        endpoint="test.endpoint",
        method="POST",
        params={"key": "value"},
        user_id="user1",
    )
    
    # Should not raise any errors
    assert True


def test_obs_response_logging():
    """Test response logging."""
    obs = ObservabilityService()
    
    request_id = obs.generate_request_id()
    obs.log_response(
        request_id=request_id,
        endpoint="test.endpoint",
        method="POST",
        user_id="user1",
        params={"key": "value"},
        status="success",
        duration_ms=100.5,
    )
    
    # Should have one log entry
    logs = obs.get_logs()
    assert len(logs) == 1
    assert logs[0].request_id == request_id
    assert logs[0].status == "success"


def test_obs_parameter_sanitization():
    """Test parameter sanitization."""
    obs = ObservabilityService(sanitize_params=True)
    
    request_id = obs.generate_request_id()
    obs.log_response(
        request_id=request_id,
        endpoint="test.endpoint",
        method="POST",
        user_id="user1",
        params={"username": "alice", "password": "secret123"},
        status="success",
        duration_ms=50.0,
    )
    
    logs = obs.get_logs()
    assert len(logs) == 1
    # Password should be redacted
    assert logs[0].params["password"] == "***REDACTED***"
    # Username should not be redacted
    assert logs[0].params["username"] == "alice"


def test_obs_tracing():
    """Test distributed tracing."""
    obs = ObservabilityService()
    
    # Start trace
    trace = obs.start_trace("test_operation")
    assert trace.trace_id is not None
    assert trace.span_id is not None
    
    # Simulate work
    time.sleep(0.01)
    
    # End trace
    obs.end_trace(trace)
    duration = trace.get_duration_ms()
    assert duration >= 10  # At least 10ms


def test_obs_metrics():
    """Test metrics recording."""
    obs = ObservabilityService()
    
    # Record metrics
    obs.record_metric("test.metric", 42.0, {"tag1": "value1"})
    obs.record_metric("test.metric", 43.0, {"tag1": "value2"})
    
    # Get all metrics
    metrics = obs.get_metrics()
    assert len(metrics) == 2
    
    # Filter by name
    metrics = obs.get_metrics(metric_name="test.metric")
    assert len(metrics) == 2
    
    # Filter by tags
    metrics = obs.get_metrics(tags={"tag1": "value1"})
    assert len(metrics) == 1
    assert metrics[0].value == 42.0


def test_obs_log_filtering():
    """Test log filtering."""
    obs = ObservabilityService()
    
    # Create multiple logs
    for i in range(5):
        request_id = obs.generate_request_id()
        obs.log_response(
            request_id=request_id,
            endpoint=f"endpoint{i % 2}",
            method="POST",
            user_id=f"user{i % 2}",
            params={},
            status="success" if i % 2 == 0 else "error",
            duration_ms=100.0,
        )
    
    # Filter by endpoint
    logs = obs.get_logs(endpoint="endpoint0")
    assert len(logs) == 3
    
    # Filter by user
    logs = obs.get_logs(user_id="user1")
    assert len(logs) == 2
    
    # Filter by status
    logs = obs.get_logs(status="error")
    assert len(logs) == 2


def main():
    """Run all verification tests."""
    print("=" * 70)
    print("Core API Services - Verification Tests")
    print("=" * 70)
    
    tests = [
        # Authentication tests
        ("Auth: User Registration", test_auth_user_registration),
        ("Auth: Credential Validation", test_auth_credential_validation),
        ("Auth: Token Verification", test_auth_token_verification),
        ("Auth: Token Revocation", test_auth_token_revocation),
        
        # Authorization tests
        ("Authz: Permission Checking", test_authz_permission_checking),
        ("Authz: Grant/Revoke", test_authz_grant_revoke),
        
        # Rate limiting tests
        ("Rate Limit: Basic", test_rate_limit_basic),
        ("Rate Limit: Per Endpoint", test_rate_limit_per_endpoint),
        ("Rate Limit: Custom Limits", test_rate_limit_custom_limits),
        ("Rate Limit: Reset", test_rate_limit_reset),
        
        # Observability tests
        ("Obs: Request ID Generation", test_obs_request_id_generation),
        ("Obs: Request Logging", test_obs_request_logging),
        ("Obs: Response Logging", test_obs_response_logging),
        ("Obs: Parameter Sanitization", test_obs_parameter_sanitization),
        ("Obs: Tracing", test_obs_tracing),
        ("Obs: Metrics", test_obs_metrics),
        ("Obs: Log Filtering", test_obs_log_filtering),
    ]
    
    results: List[TestResult] = []
    
    print("\nRunning tests...\n")
    
    for name, test_func in tests:
        result = run_test(name, test_func)
        results.append(result)
        
        status = "✓ PASS" if result.passed else "✗ FAIL"
        print(f"{status} - {name}")
        if not result.passed:
            print(f"       {result.message}")
    
    # Summary
    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)
    total = len(results)
    
    print("\n" + "=" * 70)
    print(f"Results: {passed}/{total} passed, {failed}/{total} failed")
    print("=" * 70)
    
    if failed == 0:
        print("\n✓ All verification tests passed!")
        return 0
    else:
        print(f"\n✗ {failed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
