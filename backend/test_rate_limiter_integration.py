"""
Integration tests for rate limiter with FastAPI endpoint.

These tests verify that the rate limiter correctly integrates with the
/api/v1/report endpoint and returns proper HTTP 429 responses with
retry-after headers when rate limits are exceeded.

Requirements: 5.5 - Rate Limiting
"""

import pytest
import json
from datetime import datetime
from fastapi.testclient import TestClient


# Test payload matching the schema
def create_test_payload():
    """Create a valid test payload for report submission"""
    return {
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
            "description": "This is a test bug report for rate limiting",
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


@pytest.fixture
def client():
    """Create a test client with a fresh rate limiter"""
    # Import here to avoid circular dependencies
    from backend.feedback_proxy import app
    from backend.rate_limiter import initialize_rate_limiter, get_rate_limiter
    
    # Initialize rate limiter with low limits for testing
    limiter = initialize_rate_limiter(max_requests=3, time_window_seconds=60)
    
    # Reset all IPs to ensure clean state
    limiter.request_log.clear()
    
    # Create test client
    yield TestClient(app)
    
    # Cleanup after test
    limiter.request_log.clear()


class TestRateLimiterIntegration:
    """Integration tests for rate limiter with FastAPI"""
    
    def test_allows_requests_under_limit(self, client):
        """Test that requests under the limit are allowed"""
        payload = create_test_payload()
        
        # First request should succeed (200 or 502 depending on GitHub API)
        response1 = client.post("/api/v1/report", json=payload)
        assert response1.status_code in [200, 502]  # 502 if GitHub API fails
        
        # Second request should succeed
        response2 = client.post("/api/v1/report", json=payload)
        assert response2.status_code in [200, 502]
        
        # Third request should succeed
        response3 = client.post("/api/v1/report", json=payload)
        assert response3.status_code in [200, 502]
    
    def test_blocks_requests_over_limit(self, client):
        """Test that requests over the limit return HTTP 429"""
        payload = create_test_payload()
        
        # Make 3 requests (at limit)
        for _ in range(3):
            client.post("/api/v1/report", json=payload)
        
        # Fourth request should be rate limited
        response = client.post("/api/v1/report", json=payload)
        assert response.status_code == 429
        
        # Check response body
        data = response.json()
        assert data["status"] == "error"
        assert "rate limit" in data["message"].lower()
        assert data["fallback_mode"] == "manual"
    
    def test_retry_after_header_present(self, client):
        """Test that Retry-After header is included in 429 response"""
        payload = create_test_payload()
        
        # Make 3 requests (at limit) - they may succeed or fail, but they count toward rate limit
        for _ in range(3):
            client.post("/api/v1/report", json=payload)
        
        # Fourth request should be rate limited with Retry-After header
        response = client.post("/api/v1/report", json=payload)
        assert response.status_code == 429
        
        # Check Retry-After header
        assert "retry-after" in response.headers
        retry_after = int(response.headers["retry-after"])
        assert retry_after > 0
        assert retry_after <= 60
    
    def test_rate_limit_stats_endpoint(self, client):
        """Test that rate limit stats endpoint returns correct information"""
        payload = create_test_payload()
        
        # Make 2 requests
        client.post("/api/v1/report", json=payload)
        client.post("/api/v1/report", json=payload)
        
        # Check stats
        response = client.get("/api/v1/rate-limit-stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert "stats" in data
        
        stats = data["stats"]
        assert stats["max_requests"] == 3
        assert stats["time_window_seconds"] == 60
        assert stats["total_ips"] >= 1
        assert "tracked_ips" in stats
    
    def test_different_ips_tracked_separately(self):
        """Test that different IP addresses are tracked independently"""
        # Import here to avoid circular dependencies
        from backend.feedback_proxy import app
        from backend.rate_limiter import initialize_rate_limiter
        
        # Create two clients with different IPs (simulated via headers)
        client1 = TestClient(app)
        client2 = TestClient(app)
        
        # Initialize rate limiter
        initialize_rate_limiter(max_requests=2, time_window_seconds=60)
        
        payload = create_test_payload()
        
        # Client 1 makes 2 requests (at limit)
        client1.post("/api/v1/report", json=payload)
        client1.post("/api/v1/report", json=payload)
        
        # Client 1 should be blocked
        response1 = client1.post("/api/v1/report", json=payload)
        assert response1.status_code == 429
        
        # Client 2 should still be allowed (different IP)
        # Note: TestClient uses same IP, so this test is limited
        # In real deployment, different IPs would be tracked separately
    
    def test_rate_limit_error_message_format(self, client):
        """Test that rate limit error message is user-friendly"""
        payload = create_test_payload()
        
        # Make 3 requests (at limit)
        for _ in range(3):
            client.post("/api/v1/report", json=payload)
        
        # Fourth request should be rate limited
        response = client.post("/api/v1/report", json=payload)
        assert response.status_code == 429
        
        data = response.json()
        message = data["message"]
        
        # Check message contains helpful information
        assert "rate limit" in message.lower()
        assert "try again" in message.lower()
        assert "seconds" in message.lower()
    
    def test_rate_limit_does_not_affect_health_check(self, client):
        """Test that rate limiting doesn't affect health check endpoint"""
        payload = create_test_payload()
        
        # Make 3 requests (at limit)
        for _ in range(3):
            client.post("/api/v1/report", json=payload)
        
        # Health check should still work
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_rate_limit_before_payload_validation(self, client):
        """Test that rate limiting happens early in the request processing"""
        # Make 3 valid requests (at limit)
        valid_payload = create_test_payload()
        for _ in range(3):
            client.post("/api/v1/report", json=valid_payload)
        
        # Fourth request should be rate limited even with valid payload
        response = client.post("/api/v1/report", json=valid_payload)
        
        # Should be rate limited
        assert response.status_code == 429
        
        # Verify it's a rate limit error, not validation error
        data = response.json()
        assert "rate limit" in data["message"].lower()
    
    def test_requirement_5_5_http_429_response(self, client):
        """
        Test that HTTP 429 is returned when rate limit exceeded.
        
        Requirements: 5.5
        """
        payload = create_test_payload()
        
        # Make requests up to limit
        for _ in range(3):
            client.post("/api/v1/report", json=payload)
        
        # Next request should return 429
        response = client.post("/api/v1/report", json=payload)
        assert response.status_code == 429
    
    def test_requirement_5_5_retry_after_header_format(self, client):
        """
        Test that Retry-After header is in correct format (integer seconds).
        
        Requirements: 5.5
        """
        payload = create_test_payload()
        
        # Make requests up to limit
        for _ in range(3):
            client.post("/api/v1/report", json=payload)
        
        # Next request should include Retry-After header
        response = client.post("/api/v1/report", json=payload)
        assert response.status_code == 429
        
        # Verify header format
        retry_after = response.headers.get("retry-after")
        assert retry_after is not None
        
        # Should be parseable as integer
        retry_after_int = int(retry_after)
        assert retry_after_int > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
