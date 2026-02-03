"""
Rate limiting middleware for StoryCore AI Assistant API.

Implements sliding window rate limiting with configurable limits per user.
Provides warning headers when approaching limits.
"""

import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from collections import defaultdict

from .exceptions import ResourceError


@dataclass
class RateLimitInfo:
    """Information about rate limit status"""
    allowed: bool
    remaining: int
    reset_time: float
    warning: Optional[str] = None


class RateLimitExceededError(ResourceError):
    """Error raised when rate limit is exceeded"""
    
    def __init__(
        self,
        user_id: str,
        limit: int,
        window_seconds: int,
        reset_time: float
    ):
        super().__init__(
            message=f"Rate limit exceeded: {limit} requests per {window_seconds} seconds",
            code="RATE_LIMIT_EXCEEDED",
            details={
                "user_id": user_id,
                "limit": limit,
                "window_seconds": window_seconds,
                "reset_time": reset_time,
                "retry_after": int(reset_time - time.time())
            },
            suggested_action=f"Wait {int(reset_time - time.time())} seconds before retrying"
        )


class RateLimiter:
    """
    Sliding window rate limiter.
    
    Enforces a maximum number of requests per time window per user.
    Provides warning headers when approaching the limit (90% threshold).
    """
    
    def __init__(
        self,
        max_requests: int = 100,
        window_seconds: int = 60,
        warning_threshold: float = 0.9
    ):
        """
        Initialize rate limiter.
        
        Args:
            max_requests: Maximum requests allowed per window
            window_seconds: Time window in seconds
            warning_threshold: Threshold (0.0-1.0) for warning headers
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.warning_threshold = warning_threshold
        
        # Track request timestamps per user
        # Key: user_id, Value: list of request timestamps
        self.request_history: Dict[str, List[float]] = defaultdict(list)
    
    def _clean_old_requests(self, user_id: str, current_time: float) -> None:
        """
        Remove requests outside the current window.
        
        Args:
            user_id: User ID
            current_time: Current timestamp
        """
        if user_id not in self.request_history:
            return
        
        window_start = current_time - self.window_seconds
        
        # Keep only requests within the current window
        self.request_history[user_id] = [
            timestamp for timestamp in self.request_history[user_id]
            if timestamp > window_start
        ]
        
        # Clean up empty entries
        if not self.request_history[user_id]:
            del self.request_history[user_id]
    
    def check_limit(self, user_id: str) -> RateLimitInfo:
        """
        Check if user is within rate limit.
        
        Args:
            user_id: User ID to check
            
        Returns:
            RateLimitInfo with status and remaining requests
        """
        current_time = time.time()
        
        # Clean old requests
        self._clean_old_requests(user_id, current_time)
        
        # Count requests in current window
        request_count = len(self.request_history.get(user_id, []))
        remaining = max(0, self.max_requests - request_count)
        
        # Calculate reset time (end of current window)
        if request_count > 0:
            oldest_request = min(self.request_history[user_id])
            reset_time = oldest_request + self.window_seconds
        else:
            reset_time = current_time + self.window_seconds
        
        # Check if limit exceeded
        allowed = request_count < self.max_requests
        
        # Generate warning if approaching limit
        warning = None
        if request_count >= self.max_requests * self.warning_threshold:
            warning = (
                f"Approaching rate limit: {request_count}/{self.max_requests} "
                f"requests used in current window"
            )
        
        return RateLimitInfo(
            allowed=allowed,
            remaining=remaining,
            reset_time=reset_time,
            warning=warning
        )
    
    def record_request(self, user_id: str) -> None:
        """
        Record a request for rate limiting.
        
        Args:
            user_id: User ID making the request
        """
        current_time = time.time()
        
        # Clean old requests first
        self._clean_old_requests(user_id, current_time)
        
        # Add new request
        self.request_history[user_id].append(current_time)
    
    def enforce_limit(self, user_id: str) -> RateLimitInfo:
        """
        Check rate limit and raise exception if exceeded.
        
        Args:
            user_id: User ID to check
            
        Returns:
            RateLimitInfo if within limit
            
        Raises:
            RateLimitExceededError: If rate limit is exceeded
        """
        limit_info = self.check_limit(user_id)
        
        if not limit_info.allowed:
            raise RateLimitExceededError(
                user_id=user_id,
                limit=self.max_requests,
                window_seconds=self.window_seconds,
                reset_time=limit_info.reset_time
            )
        
        # Record the request
        self.record_request(user_id)
        
        return limit_info
    
    def get_headers(self, limit_info: RateLimitInfo) -> Dict[str, str]:
        """
        Get HTTP headers for rate limit information.
        
        Args:
            limit_info: Rate limit information
            
        Returns:
            Dictionary of HTTP headers
        """
        headers = {
            "X-RateLimit-Limit": str(self.max_requests),
            "X-RateLimit-Remaining": str(limit_info.remaining),
            "X-RateLimit-Reset": str(int(limit_info.reset_time))
        }
        
        if limit_info.warning:
            headers["X-RateLimit-Warning"] = limit_info.warning
        
        if not limit_info.allowed:
            retry_after = int(limit_info.reset_time - time.time())
            headers["Retry-After"] = str(max(0, retry_after))
        
        return headers
    
    def reset_user_limit(self, user_id: str) -> None:
        """
        Reset rate limit for a specific user.
        
        Args:
            user_id: User ID to reset
        """
        if user_id in self.request_history:
            del self.request_history[user_id]
    
    def reset_all_limits(self) -> None:
        """Reset rate limits for all users"""
        self.request_history.clear()
    
    def get_user_stats(self, user_id: str) -> Dict[str, any]:
        """
        Get rate limit statistics for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with statistics
        """
        current_time = time.time()
        self._clean_old_requests(user_id, current_time)
        
        request_count = len(self.request_history.get(user_id, []))
        remaining = max(0, self.max_requests - request_count)
        usage_percent = (request_count / self.max_requests) * 100
        
        return {
            "user_id": user_id,
            "requests_made": request_count,
            "requests_remaining": remaining,
            "limit": self.max_requests,
            "window_seconds": self.window_seconds,
            "usage_percent": usage_percent,
            "at_warning_threshold": request_count >= self.max_requests * self.warning_threshold
        }
