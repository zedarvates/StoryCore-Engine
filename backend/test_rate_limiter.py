"""
Unit tests for the rate limiter middleware.

These tests verify that the rate limiter correctly:
- Tracks requests per IP address
- Enforces the configured rate limit
- Returns appropriate retry-after values
- Cleans up old request data
- Handles concurrent requests safely

Requirements: 5.5 - Rate Limiting
"""

import time
import pytest
from threading import Thread
from backend.rate_limiter import RateLimiter, initialize_rate_limiter, get_rate_limiter


class TestRateLimiter:
    """Test suite for the RateLimiter class"""
    
    def test_initialization(self):
        """Test that rate limiter initializes with correct parameters"""
        limiter = RateLimiter(max_requests=5, time_window_seconds=60)
        
        assert limiter.max_requests == 5
        assert limiter.time_window_seconds == 60
        assert len(limiter.request_log) == 0
    
    def test_allows_requests_under_limit(self):
        """Test that requests under the limit are allowed"""
        limiter = RateLimiter(max_requests=3, time_window_seconds=60)
        ip = "192.168.1.1"
        
        # First request should be allowed
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is True
        assert retry_after is None
        
        # Second request should be allowed
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is True
        assert retry_after is None
        
        # Third request should be allowed
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is True
        assert retry_after is None
    
    def test_blocks_requests_over_limit(self):
        """Test that requests over the limit are blocked"""
        limiter = RateLimiter(max_requests=2, time_window_seconds=60)
        ip = "192.168.1.2"
        
        # First two requests should be allowed
        limiter.check_rate_limit(ip)
        limiter.check_rate_limit(ip)
        
        # Third request should be blocked
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is False
        assert retry_after is not None
        assert retry_after > 0
        assert retry_after <= 60
    
    def test_retry_after_calculation(self):
        """Test that retry-after is calculated correctly"""
        limiter = RateLimiter(max_requests=1, time_window_seconds=10)
        ip = "192.168.1.3"
        
        # First request allowed
        limiter.check_rate_limit(ip)
        
        # Second request blocked
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is False
        assert retry_after is not None
        # Should be close to 10 seconds (within 1 second tolerance)
        assert 9 <= retry_after <= 10
    
    def test_different_ips_tracked_separately(self):
        """Test that different IP addresses are tracked independently"""
        limiter = RateLimiter(max_requests=2, time_window_seconds=60)
        ip1 = "192.168.1.4"
        ip2 = "192.168.1.5"
        
        # IP1 makes 2 requests (at limit)
        limiter.check_rate_limit(ip1)
        limiter.check_rate_limit(ip1)
        
        # IP1 should be blocked
        is_allowed, _ = limiter.check_rate_limit(ip1)
        assert is_allowed is False
        
        # IP2 should still be allowed
        is_allowed, _ = limiter.check_rate_limit(ip2)
        assert is_allowed is True
    
    def test_cleanup_old_requests(self):
        """Test that old requests are cleaned up after time window expires"""
        limiter = RateLimiter(max_requests=2, time_window_seconds=1)
        ip = "192.168.1.6"
        
        # Make 2 requests (at limit)
        limiter.check_rate_limit(ip)
        limiter.check_rate_limit(ip)
        
        # Should be blocked
        is_allowed, _ = limiter.check_rate_limit(ip)
        assert is_allowed is False
        
        # Wait for time window to expire
        time.sleep(1.1)
        
        # Should be allowed again after cleanup
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is True
        assert retry_after is None
    
    def test_get_request_count(self):
        """Test that request count is tracked correctly"""
        limiter = RateLimiter(max_requests=5, time_window_seconds=60)
        ip = "192.168.1.7"
        
        # Initially 0 requests
        assert limiter.get_request_count(ip) == 0
        
        # After 1 request
        limiter.check_rate_limit(ip)
        assert limiter.get_request_count(ip) == 1
        
        # After 3 requests
        limiter.check_rate_limit(ip)
        limiter.check_rate_limit(ip)
        assert limiter.get_request_count(ip) == 3
    
    def test_reset_ip(self):
        """Test that resetting an IP clears its request history"""
        limiter = RateLimiter(max_requests=2, time_window_seconds=60)
        ip = "192.168.1.8"
        
        # Make 2 requests (at limit)
        limiter.check_rate_limit(ip)
        limiter.check_rate_limit(ip)
        
        # Should be blocked
        is_allowed, _ = limiter.check_rate_limit(ip)
        assert is_allowed is False
        
        # Reset the IP
        limiter.reset_ip(ip)
        
        # Should be allowed again
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is True
        assert retry_after is None
    
    def test_get_stats(self):
        """Test that statistics are returned correctly"""
        limiter = RateLimiter(max_requests=5, time_window_seconds=60)
        ip1 = "192.168.1.9"
        ip2 = "192.168.1.10"
        
        # Make some requests
        limiter.check_rate_limit(ip1)
        limiter.check_rate_limit(ip1)
        limiter.check_rate_limit(ip2)
        
        # Get stats
        stats = limiter.get_stats()
        
        assert stats["total_ips"] == 2
        assert stats["max_requests"] == 5
        assert stats["time_window_seconds"] == 60
        assert stats["tracked_ips"][ip1] == 2
        assert stats["tracked_ips"][ip2] == 1
    
    def test_concurrent_requests(self):
        """Test that rate limiter is thread-safe"""
        limiter = RateLimiter(max_requests=10, time_window_seconds=60)
        ip = "192.168.1.11"
        results = []
        
        def make_request():
            is_allowed, _ = limiter.check_rate_limit(ip)
            results.append(is_allowed)
        
        # Create 15 threads making concurrent requests
        threads = [Thread(target=make_request) for _ in range(15)]
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Exactly 10 should be allowed, 5 should be blocked
        allowed_count = sum(1 for r in results if r is True)
        blocked_count = sum(1 for r in results if r is False)
        
        assert allowed_count == 10
        assert blocked_count == 5
    
    def test_edge_case_zero_requests(self):
        """Test edge case where max_requests is 0"""
        limiter = RateLimiter(max_requests=0, time_window_seconds=60)
        ip = "192.168.1.12"
        
        # All requests should be blocked
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is False
        assert retry_after is not None
    
    def test_edge_case_very_short_window(self):
        """Test edge case with very short time window"""
        limiter = RateLimiter(max_requests=1, time_window_seconds=0.1)
        ip = "192.168.1.13"
        
        # First request allowed
        is_allowed, _ = limiter.check_rate_limit(ip)
        assert is_allowed is True
        
        # Second request blocked
        is_allowed, _ = limiter.check_rate_limit(ip)
        assert is_allowed is False
        
        # Wait for window to expire
        time.sleep(0.15)
        
        # Should be allowed again
        is_allowed, _ = limiter.check_rate_limit(ip)
        assert is_allowed is True
    
    def test_requirement_5_5_ten_requests_per_hour(self):
        """
        Test that the default configuration matches requirement 5.5:
        10 requests per IP per hour
        
        Requirements: 5.5
        """
        limiter = RateLimiter(max_requests=10, time_window_seconds=3600)
        ip = "192.168.1.14"
        
        # Make 10 requests (should all be allowed)
        for i in range(10):
            is_allowed, retry_after = limiter.check_rate_limit(ip)
            assert is_allowed is True, f"Request {i+1} should be allowed"
            assert retry_after is None
        
        # 11th request should be blocked
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is False
        assert retry_after is not None
        
        # Retry-after should be close to 3600 seconds (1 hour)
        assert 3595 <= retry_after <= 3600
    
    def test_requirement_5_5_retry_after_header(self):
        """
        Test that retry-after value is provided when rate limit exceeded.
        
        Requirements: 5.5
        """
        limiter = RateLimiter(max_requests=1, time_window_seconds=100)
        ip = "192.168.1.15"
        
        # First request allowed
        limiter.check_rate_limit(ip)
        
        # Second request blocked with retry-after
        is_allowed, retry_after = limiter.check_rate_limit(ip)
        assert is_allowed is False
        assert retry_after is not None
        assert isinstance(retry_after, int)
        assert retry_after > 0


class TestRateLimiterGlobalInstance:
    """Test suite for global rate limiter instance management"""
    
    def test_initialize_and_get_rate_limiter(self):
        """Test that global rate limiter can be initialized and retrieved"""
        limiter = initialize_rate_limiter(max_requests=5, time_window_seconds=60)
        
        assert limiter is not None
        assert limiter.max_requests == 5
        assert limiter.time_window_seconds == 60
        
        # Get the same instance
        retrieved_limiter = get_rate_limiter()
        assert retrieved_limiter is limiter
    
    def test_get_rate_limiter_before_initialization(self):
        """Test that getting rate limiter before initialization raises error"""
        # Reset global instance
        import backend.rate_limiter as rl_module
        rl_module._rate_limiter = None
        
        with pytest.raises(RuntimeError, match="Rate limiter not initialized"):
            get_rate_limiter()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
