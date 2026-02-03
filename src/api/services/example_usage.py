"""
Example Usage of Core API Services

This module demonstrates how to use the authentication, rate limiting,
and observability services together.
"""

from datetime import datetime
import time

from .auth import AuthenticationService, AuthorizationService, Permission
from .rate_limit import RateLimitService
from .observability import ObservabilityService


def example_authentication():
    """Example: Authentication and authorization."""
    print("\n=== Authentication Example ===")
    
    # Create services
    auth_service = AuthenticationService(token_ttl_seconds=3600)
    authz_service = AuthorizationService()
    
    # Register a user
    user = auth_service.register_user(
        user_id="user_001",
        username="alice",
        password="secret123",
        email="alice@example.com",
        permissions={
            Permission("storycore.narration", "execute"),
            Permission("storycore.pipeline", "read"),
        }
    )
    print(f"✓ Registered user: {user.username}")
    
    # Authenticate and get token
    token = auth_service.validate_credentials("alice", "secret123")
    if token:
        print(f"✓ Authentication successful, token: {token.token[:16]}...")
    
    # Verify token
    verified_user = auth_service.verify_token(token.token)
    if verified_user:
        print(f"✓ Token verified for user: {verified_user.username}")
    
    # Check permissions
    has_perm = authz_service.check_permission(
        user,
        "storycore.narration",
        "execute"
    )
    print(f"✓ Permission check (narration.execute): {has_perm}")
    
    has_perm = authz_service.check_permission(
        user,
        "storycore.pipeline",
        "write"
    )
    print(f"✓ Permission check (pipeline.write): {has_perm}")


def example_rate_limiting():
    """Example: Rate limiting."""
    print("\n=== Rate Limiting Example ===")
    
    # Create service with low limit for demo
    rate_limit_service = RateLimitService(
        default_requests_per_minute=5,
        burst_multiplier=1.5,
    )
    
    user_id = "user_001"
    
    # Make several requests
    for i in range(8):
        status = rate_limit_service.check_limit(user_id)
        
        if status.allowed:
            print(f"✓ Request {i+1}: Allowed (remaining: {status.remaining})")
        else:
            print(f"✗ Request {i+1}: Rate limited (retry after: {status.retry_after_seconds}s)")
    
    # Check status without consuming
    status = rate_limit_service.get_status(user_id)
    print(f"\n✓ Current status: {status.remaining} requests remaining")
    print(f"  Reset at: {status.reset_at.strftime('%H:%M:%S')}")
    
    # Set custom limit
    rate_limit_service.set_custom_limit(user_id, requests_per_minute=100)
    print(f"\n✓ Set custom limit: 100 requests/minute")
    
    # Reset limit
    rate_limit_service.reset_limit(user_id)
    status = rate_limit_service.get_status(user_id)
    print(f"✓ After reset: {status.remaining} requests remaining")


def example_observability():
    """Example: Logging and observability."""
    print("\n=== Observability Example ===")
    
    # Create service
    obs_service = ObservabilityService(
        log_level="INFO",
        sanitize_params=True,
    )
    
    # Generate request ID
    request_id = obs_service.generate_request_id()
    print(f"✓ Generated request ID: {request_id}")
    
    # Log a request
    obs_service.log_request(
        request_id=request_id,
        endpoint="storycore.narration.generate",
        method="POST",
        params={"prompt": "Once upon a time", "password": "secret"},
        user_id="user_001",
    )
    print(f"✓ Logged request (params sanitized)")
    
    # Simulate processing
    time.sleep(0.1)
    
    # Log response
    obs_service.log_response(
        request_id=request_id,
        endpoint="storycore.narration.generate",
        method="POST",
        user_id="user_001",
        params={"prompt": "Once upon a time"},
        status="success",
        duration_ms=100.5,
    )
    print(f"✓ Logged response")
    
    # Start a trace
    trace = obs_service.start_trace("narration_generation")
    print(f"✓ Started trace: {trace.trace_id[:16]}...")
    
    # Simulate work
    time.sleep(0.05)
    
    # End trace
    obs_service.end_trace(trace)
    print(f"✓ Ended trace (duration: {trace.get_duration_ms():.2f}ms)")
    
    # Record metrics
    obs_service.record_metric("api.request.duration", 100.5, {"endpoint": "narration.generate"})
    obs_service.record_metric("api.request.count", 1, {"status": "success"})
    print(f"✓ Recorded metrics")
    
    # Get logs
    logs = obs_service.get_logs(limit=10)
    print(f"\n✓ Retrieved {len(logs)} log entries")
    
    # Get metrics
    metrics = obs_service.get_metrics(limit=10)
    print(f"✓ Retrieved {len(metrics)} metrics")


def example_integrated():
    """Example: All services working together."""
    print("\n=== Integrated Example ===")
    
    # Create all services
    auth_service = AuthenticationService()
    authz_service = AuthorizationService()
    rate_limit_service = RateLimitService(default_requests_per_minute=60)
    obs_service = ObservabilityService()
    
    # Register user
    user = auth_service.register_user(
        user_id="user_002",
        username="bob",
        password="password123",
        permissions={Permission("*", "*")}  # Admin user
    )
    print(f"✓ Registered user: {user.username}")
    
    # Authenticate
    token = auth_service.validate_credentials("bob", "password123")
    print(f"✓ Authenticated, token: {token.token[:16]}...")
    
    # Simulate API request
    request_id = obs_service.generate_request_id()
    endpoint = "storycore.pipeline.execute"
    
    # Log request
    obs_service.log_request(
        request_id=request_id,
        endpoint=endpoint,
        method="POST",
        params={"stages": ["grid", "promote"]},
        user_id=user.user_id,
    )
    
    # Check rate limit
    rate_status = rate_limit_service.check_limit(user.user_id, endpoint)
    if not rate_status.allowed:
        print(f"✗ Rate limited!")
        return
    print(f"✓ Rate limit check passed (remaining: {rate_status.remaining})")
    
    # Check authorization
    has_permission = authz_service.check_permission(user, endpoint, "execute")
    if not has_permission:
        print(f"✗ Permission denied!")
        return
    print(f"✓ Authorization check passed")
    
    # Start trace
    trace = obs_service.start_trace("pipeline_execution")
    
    # Simulate work
    print(f"✓ Executing pipeline...")
    time.sleep(0.1)
    
    # End trace
    obs_service.end_trace(trace)
    
    # Log response
    obs_service.log_response(
        request_id=request_id,
        endpoint=endpoint,
        method="POST",
        user_id=user.user_id,
        params={"stages": ["grid", "promote"]},
        status="success",
        duration_ms=trace.get_duration_ms(),
    )
    
    # Record metrics
    obs_service.record_metric(
        "api.request.duration",
        trace.get_duration_ms(),
        {"endpoint": endpoint, "status": "success"}
    )
    
    print(f"✓ Request completed successfully ({trace.get_duration_ms():.2f}ms)")


if __name__ == "__main__":
    """Run all examples."""
    print("=" * 60)
    print("Core API Services - Example Usage")
    print("=" * 60)
    
    example_authentication()
    example_rate_limiting()
    example_observability()
    example_integrated()
    
    print("\n" + "=" * 60)
    print("All examples completed successfully!")
    print("=" * 60)
