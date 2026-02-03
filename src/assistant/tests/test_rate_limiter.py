"""
Unit tests for rate limiting middleware.

Tests sliding window rate limiting, warning headers, and limit enforcement.
"""

import pytest
import time

from ..rate_limiter import RateLimiter, RateLimitExceededError, RateLimitInfo


@pytest.fixture
def rate_limiter():
    """Create rate limiter for testing"""
    return RateLimiter(
        max_requests=100,
        window_seconds=60,
        warning_threshold=0.9
    )


@pytest.fixture
def small_rate_limiter():
    """Create rate limiter with small limits for testing"""
    return RateLimiter(
        max_requests=5,
        window_seconds=1,
        warning_threshold=0.9
    )


class TestRateLimiter:
    """Test rate limiter functionality"""
    
    def test_requests_within_limit_succeed(self, rate_limiter):
        """Test requests within limit succeed"""
        user_id = "test_user"
        
        # Make 50 requests (well within limit of 100)
        for i in range(50):
            limit_info = rate_limiter.check_limit(user_id)
            assert limit_info.allowed is True
            assert limit_info.remaining == 100 - i
            rate_limiter.record_request(user_id)
        
        # Verify final state
        limit_info = rate_limiter.check_limit(user_id)
        assert limit_info.allowed is True
        assert limit_info.remaining == 50
    
    def test_101st_request_fails_with_429(self, rate_limiter):
        """Test 101st request fails with 429"""
        user_id = "test_user"
        
        # Make 100 requests (at limit)
        for i in range(100):
            limit_info = rate_limiter.enforce_limit(user_id)
            assert limit_info.allowed is True
        
        # 101st request should fail
        with pytest.raises(RateLimitExceededError) as exc_info:
            rate_limiter.enforce_limit(user_id)
        
        error = exc_info.value
        assert error.code == "RATE_LIMIT_EXCEEDED"
        assert error.category == "resource"
        assert "Rate limit exceeded" in error.message
        assert error.details["limit"] == 100
        assert error.details["window_seconds"] == 60
    
    def test_warning_header_at_90_requests(self, rate_limiter):
        """Test warning header at 90 requests"""
        user_id = "test_user"
        
        # Make 89 requests (below warning threshold)
        for i in range(89):
            limit_info = rate_limiter.check_limit(user_id)
            assert limit_info.warning is None
            rate_limiter.record_request(user_id)
        
        # Record the 90th request
        rate_limiter.record_request(user_id)
        
        # Now check - should trigger warning
        limit_info = rate_limiter.check_limit(user_id)
        assert limit_info.warning is not None
        assert "Approaching rate limit" in limit_info.warning
        assert "90/100" in limit_info.warning
    
    def test_sliding_window_behavior(self, small_rate_limiter):
        """Test sliding window allows new requests after old ones expire"""
        user_id = "test_user"
        
        # Make 5 requests (at limit)
        for i in range(5):
            limit_info = small_rate_limiter.enforce_limit(user_id)
            assert limit_info.allowed is True
        
        # 6th request should fail
        with pytest.raises(RateLimitExceededError):
            small_rate_limiter.enforce_limit(user_id)
        
        # Wait for window to expire
        time.sleep(1.1)
        
        # Should be able to make requests again (full limit restored)
        # enforce_limit records the request, so we get back the state before recording
        limit_info = small_rate_limiter.enforce_limit(user_id)
        assert limit_info.allowed is True
        # The returned limit_info shows state before recording, so it shows 5 remaining
        # But after recording, we should have 4 remaining
        # Let's check the actual state after
        limit_info_after = small_rate_limiter.check_limit(user_id)
        assert limit_info_after.remaining == 4
    
    def test_multiple_users_independent_limits(self, rate_limiter):
        """Test that different users have independent rate limits"""
        user1 = "user_1"
        user2 = "user_2"
        
        # User 1 makes 50 requests
        for i in range(50):
            rate_limiter.enforce_limit(user1)
        
        # User 2 should still have full limit
        limit_info = rate_limiter.check_limit(user2)
        assert limit_info.remaining == 100
        
        # User 1 should have 50 remaining
        limit_info = rate_limiter.check_limit(user1)
        assert limit_info.remaining == 50
    
    def test_reset_user_limit(self, rate_limiter):
        """Test resetting rate limit for a specific user"""
        user_id = "test_user"
        
        # Make 50 requests
        for i in range(50):
            rate_limiter.enforce_limit(user_id)
        
        # Verify limit is reduced
        limit_info = rate_limiter.check_limit(user_id)
        assert limit_info.remaining == 50
        
        # Reset limit
        rate_limiter.reset_user_limit(user_id)
        
        # Verify limit is restored
        limit_info = rate_limiter.check_limit(user_id)
        assert limit_info.remaining == 100
    
    def test_reset_all_limits(self, rate_limiter):
        """Test resetting all rate limits"""
        # Multiple users make requests
        for user_num in range(5):
            user_id = f"user_{user_num}"
            for i in range(20):
                rate_limiter.enforce_limit(user_id)
        
        # Reset all limits
        rate_limiter.reset_all_limits()
        
        # Verify all users have full limits
        for user_num in range(5):
            user_id = f"user_{user_num}"
            limit_info = rate_limiter.check_limit(user_id)
            assert limit_info.remaining == 100
    
    def test_get_headers(self, rate_limiter):
        """Test getting HTTP headers for rate limit info"""
        user_id = "test_user"
        
        # Make some requests
        for i in range(30):
            rate_limiter.enforce_limit(user_id)
        
        # Get limit info and headers
        limit_info = rate_limiter.check_limit(user_id)
        headers = rate_limiter.get_headers(limit_info)
        
        assert "X-RateLimit-Limit" in headers
        assert headers["X-RateLimit-Limit"] == "100"
        assert "X-RateLimit-Remaining" in headers
        assert headers["X-RateLimit-Remaining"] == "70"
        assert "X-RateLimit-Reset" in headers
    
    def test_get_headers_with_warning(self, rate_limiter):
        """Test headers include warning when approaching limit"""
        user_id = "test_user"
        
        # Make 90 requests to trigger warning
        for i in range(90):
            rate_limiter.enforce_limit(user_id)
        
        # Get headers
        limit_info = rate_limiter.check_limit(user_id)
        headers = rate_limiter.get_headers(limit_info)
        
        assert "X-RateLimit-Warning" in headers
        assert "Approaching rate limit" in headers["X-RateLimit-Warning"]
    
    def test_get_headers_when_exceeded(self, small_rate_limiter):
        """Test headers include Retry-After when limit exceeded"""
        user_id = "test_user"
        
        # Exhaust limit
        for i in range(5):
            small_rate_limiter.enforce_limit(user_id)
        
        # Check limit (should be exceeded)
        limit_info = small_rate_limiter.check_limit(user_id)
        headers = small_rate_limiter.get_headers(limit_info)
        
        assert "Retry-After" in headers
        retry_after = int(headers["Retry-After"])
        assert 0 <= retry_after <= 1
    
    def test_get_user_stats(self, rate_limiter):
        """Test getting user statistics"""
        user_id = "test_user"
        
        # Make 75 requests
        for i in range(75):
            rate_limiter.enforce_limit(user_id)
        
        # Get stats
        stats = rate_limiter.get_user_stats(user_id)
        
        assert stats["user_id"] == user_id
        assert stats["requests_made"] == 75
        assert stats["requests_remaining"] == 25
        assert stats["limit"] == 100
        assert stats["window_seconds"] == 60
        assert stats["usage_percent"] == 75.0
        assert stats["at_warning_threshold"] is False
    
    def test_get_user_stats_at_warning_threshold(self, rate_limiter):
        """Test user stats show warning threshold status"""
        user_id = "test_user"
        
        # Make 90 requests (at warning threshold)
        for i in range(90):
            rate_limiter.enforce_limit(user_id)
        
        # Get stats
        stats = rate_limiter.get_user_stats(user_id)
        
        assert stats["at_warning_threshold"] is True
        assert stats["usage_percent"] == 90.0


class TestRateLimitInfo:
    """Test RateLimitInfo dataclass"""
    
    def test_rate_limit_info_creation(self):
        """Test creating RateLimitInfo"""
        info = RateLimitInfo(
            allowed=True,
            remaining=50,
            reset_time=time.time() + 60,
            warning="Test warning"
        )
        
        assert info.allowed is True
        assert info.remaining == 50
        assert info.reset_time > time.time()
        assert info.warning == "Test warning"
    
    def test_rate_limit_info_without_warning(self):
        """Test RateLimitInfo without warning"""
        info = RateLimitInfo(
            allowed=True,
            remaining=50,
            reset_time=time.time() + 60
        )
        
        assert info.warning is None


class TestRateLimitExceededError:
    """Test RateLimitExceededError exception"""
    
    def test_error_creation(self):
        """Test creating RateLimitExceededError"""
        reset_time = time.time() + 60
        error = RateLimitExceededError(
            user_id="test_user",
            limit=100,
            window_seconds=60,
            reset_time=reset_time
        )
        
        assert error.code == "RATE_LIMIT_EXCEEDED"
        assert error.category == "resource"
        assert "Rate limit exceeded" in error.message
        assert error.details["user_id"] == "test_user"
        assert error.details["limit"] == 100
        assert error.details["window_seconds"] == 60
        assert error.details["reset_time"] == reset_time
        assert "retry_after" in error.details
    
    def test_error_to_dict(self):
        """Test converting error to dictionary"""
        reset_time = time.time() + 60
        error = RateLimitExceededError(
            user_id="test_user",
            limit=100,
            window_seconds=60,
            reset_time=reset_time
        )
        
        error_dict = error.to_dict()
        
        assert "error" in error_dict
        assert error_dict["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert error_dict["error"]["category"] == "resource"
        assert "details" in error_dict["error"]


class TestRateLimiterEdgeCases:
    """Test edge cases and boundary conditions"""
    
    def test_exactly_at_limit(self, rate_limiter):
        """Test behavior when exactly at limit"""
        user_id = "test_user"
        
        # Make exactly 100 requests
        for i in range(100):
            limit_info = rate_limiter.enforce_limit(user_id)
            assert limit_info.allowed is True
        
        # Check that we're at limit
        limit_info = rate_limiter.check_limit(user_id)
        assert limit_info.allowed is False
        assert limit_info.remaining == 0
    
    def test_zero_remaining(self, rate_limiter):
        """Test that remaining never goes negative"""
        user_id = "test_user"
        
        # Exhaust limit
        for i in range(100):
            rate_limiter.enforce_limit(user_id)
        
        # Check remaining
        limit_info = rate_limiter.check_limit(user_id)
        assert limit_info.remaining == 0
        
        # Try to make more requests
        for i in range(10):
            try:
                rate_limiter.enforce_limit(user_id)
            except RateLimitExceededError:
                pass
        
        # Remaining should still be 0, not negative
        limit_info = rate_limiter.check_limit(user_id)
        assert limit_info.remaining == 0
    
    def test_new_user_has_full_limit(self, rate_limiter):
        """Test that new users start with full limit"""
        user_id = "new_user"
        
        limit_info = rate_limiter.check_limit(user_id)
        
        assert limit_info.allowed is True
        assert limit_info.remaining == 100
    
    def test_concurrent_users_dont_interfere(self, rate_limiter):
        """Test that concurrent users don't interfere with each other"""
        users = [f"user_{i}" for i in range(10)]
        
        # Each user makes 50 requests
        for user_id in users:
            for i in range(50):
                rate_limiter.enforce_limit(user_id)
        
        # Verify each user has 50 remaining
        for user_id in users:
            limit_info = rate_limiter.check_limit(user_id)
            assert limit_info.remaining == 50
