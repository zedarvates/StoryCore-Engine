"""
Verification script for rate limiter integration with FastAPI endpoint.

This script demonstrates that the /api/v1/report endpoint:
1. Returns HTTP 429 when rate limit is exceeded
2. Includes Retry-After header in the response
3. Returns appropriate error message with fallback mode

Requirements: 5.5 - Rate Limiting
"""

from fastapi.testclient import TestClient
from datetime import datetime


def verify_endpoint_integration():
    """Verify rate limiter integration with FastAPI endpoint"""
    print("=" * 70)
    print("Rate Limiter Endpoint Integration Verification")
    print("=" * 70)
    
    # Import and initialize
    from backend.feedback_proxy import app
    from backend.rate_limiter import initialize_rate_limiter
    
    # Initialize with low limit for testing
    limiter = initialize_rate_limiter(max_requests=3, time_window_seconds=60)
    limiter.request_log.clear()  # Clean state
    
    client = TestClient(app)
    
    # Create test payload
    payload = {
        "schema_version": "1.0",
        "report_type": "bug",
        "timestamp": datetime.utcnow().isoformat(),
        "system_info": {
            "storycore_version": "1.0.0",
            "python_version": "3.9.0",
            "os_platform": "Linux",
            "os_version": "Ubuntu 20.04",
            "language": "en-US"
        },
        "module_context": {
            "active_module": "promotion-engine",
            "module_state": {}
        },
        "user_input": {
            "description": "This is a test bug report for rate limiting verification",
            "reproduction_steps": "1. Submit multiple requests\n2. Observe rate limiting"
        },
        "diagnostics": {
            "stacktrace": None,
            "logs": ["Test log line 1", "Test log line 2"],
            "memory_usage_mb": 256.5,
            "process_state": {}
        },
        "screenshot_base64": None
    }
    
    print(f"\n✓ Test setup:")
    print(f"  - Rate limit: 3 requests per 60 seconds")
    print(f"  - Endpoint: POST /api/v1/report")
    
    # Test 1: Make requests up to limit
    print(f"\n✓ Test 1: Requests under limit")
    for i in range(3):
        response = client.post("/api/v1/report", json=payload)
        # May succeed (200) or fail (502) depending on GitHub API, but should not be rate limited
        assert response.status_code in [200, 502], f"Request {i+1} should not be rate limited"
        print(f"  Request {i+1}/3: Status {response.status_code} (Not rate limited)")
    
    # Test 2: Verify 4th request returns HTTP 429
    print(f"\n✓ Test 2: Request over limit returns HTTP 429")
    response = client.post("/api/v1/report", json=payload)
    assert response.status_code == 429, "Request 4 should return HTTP 429"
    print(f"  Request 4/3: Status {response.status_code} ✓ (Rate limited)")
    
    # Test 3: Verify Retry-After header is present
    print(f"\n✓ Test 3: Retry-After header present")
    retry_after = response.headers.get("retry-after")
    assert retry_after is not None, "Retry-After header should be present"
    retry_after_int = int(retry_after)
    assert retry_after_int > 0, "Retry-After should be positive"
    assert retry_after_int <= 60, "Retry-After should be within time window"
    print(f"  Retry-After header: {retry_after} seconds ✓")
    
    # Test 4: Verify error response format
    print(f"\n✓ Test 4: Error response format")
    data = response.json()
    assert data["status"] == "error", "Status should be 'error'"
    assert "rate limit" in data["message"].lower(), "Message should mention rate limit"
    assert data["fallback_mode"] == "manual", "Should suggest manual fallback"
    print(f"  Status: {data['status']} ✓")
    print(f"  Message: {data['message'][:60]}... ✓")
    print(f"  Fallback mode: {data['fallback_mode']} ✓")
    
    # Test 5: Verify rate limit stats endpoint
    print(f"\n✓ Test 5: Rate limit stats endpoint")
    stats_response = client.get("/api/v1/rate-limit-stats")
    assert stats_response.status_code == 200, "Stats endpoint should work"
    stats_data = stats_response.json()
    assert stats_data["status"] == "success", "Stats should return success"
    assert "stats" in stats_data, "Stats should be present"
    print(f"  Stats endpoint: Status {stats_response.status_code} ✓")
    print(f"  Total IPs tracked: {stats_data['stats']['total_ips']}")
    print(f"  Max requests: {stats_data['stats']['max_requests']}")
    
    # Test 6: Verify health check not affected
    print(f"\n✓ Test 6: Health check not affected by rate limiting")
    health_response = client.get("/health")
    assert health_response.status_code == 200, "Health check should work"
    health_data = health_response.json()
    assert health_data["status"] == "healthy", "Health should be healthy"
    print(f"  Health check: Status {health_response.status_code} ✓")
    print(f"  Status: {health_data['status']} ✓")
    
    print("\n" + "=" * 70)
    print("✓ All endpoint integration tests passed!")
    print("=" * 70)
    
    print("\n✓ Rate limiter endpoint integration verified:")
    print("  ✓ Returns HTTP 429 when rate limit exceeded")
    print("  ✓ Includes Retry-After header with correct value")
    print("  ✓ Returns error message with fallback mode")
    print("  ✓ Rate limit stats endpoint works correctly")
    print("  ✓ Health check not affected by rate limiting")
    print("\n✓ Task 16.1 (Create rate limiter middleware) is COMPLETE")
    print("✓ Integration with /api/v1/report endpoint is VERIFIED")


if __name__ == "__main__":
    verify_endpoint_integration()
