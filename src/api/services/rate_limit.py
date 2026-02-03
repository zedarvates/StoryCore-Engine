"""
Rate Limiting Service

This module provides rate limiting functionality using the token bucket algorithm.
"""

from dataclasses import dataclass
from typing import Dict, Optional
from datetime import datetime, timedelta
import logging
import threading


logger = logging.getLogger(__name__)


@dataclass
class RateLimitStatus:
    """Status of rate limiting for a user/endpoint."""
    
    allowed: bool
    remaining: int
    reset_at: datetime
    retry_after_seconds: Optional[int] = None
    
    def to_dict(self) -> Dict[str, any]:
        """Convert to dictionary for API responses."""
        result = {
            "allowed": self.allowed,
            "remaining": self.remaining,
            "reset_at": self.reset_at.isoformat(),
        }
        if self.retry_after_seconds is not None:
            result["retry_after_seconds"] = self.retry_after_seconds
        return result


class TokenBucket:
    """
    Token bucket implementation for rate limiting.
    
    The token bucket algorithm allows bursts while maintaining an average rate.
    """
    
    def __init__(
        self,
        capacity: int,
        refill_rate: float,
        refill_period_seconds: float = 60.0,
    ):
        """
        Initialize token bucket.
        
        Args:
            capacity: Maximum number of tokens (burst size)
            refill_rate: Number of tokens to add per refill period
            refill_period_seconds: How often to refill tokens (default: 60 seconds)
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.refill_period_seconds = refill_period_seconds
        self.tokens = float(capacity)
        self.last_refill = datetime.now()
        self.lock = threading.Lock()
    
    def consume(self, tokens: int = 1) -> bool:
        """
        Try to consume tokens from the bucket.
        
        Args:
            tokens: Number of tokens to consume
            
        Returns:
            True if tokens were consumed, False if insufficient tokens
        """
        with self.lock:
            self._refill()
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            
            return False
    
    def peek(self) -> float:
        """
        Get current token count without consuming.
        
        Returns:
            Current number of tokens
        """
        with self.lock:
            self._refill()
            return self.tokens
    
    def reset_at(self) -> datetime:
        """
        Calculate when the bucket will be full again.
        
        Returns:
            Datetime when bucket will be full
        """
        with self.lock:
            self._refill()
            
            if self.tokens >= self.capacity:
                return datetime.now()
            
            tokens_needed = self.capacity - self.tokens
            periods_needed = tokens_needed / self.refill_rate
            seconds_needed = periods_needed * self.refill_period_seconds
            
            return datetime.now() + timedelta(seconds=seconds_needed)
    
    def _refill(self) -> None:
        """Refill tokens based on elapsed time."""
        now = datetime.now()
        elapsed = (now - self.last_refill).total_seconds()
        
        if elapsed >= self.refill_period_seconds:
            periods = elapsed / self.refill_period_seconds
            tokens_to_add = periods * self.refill_rate
            self.tokens = min(self.capacity, self.tokens + tokens_to_add)
            self.last_refill = now


class RateLimitService:
    """
    Service for rate limiting API requests.
    
    Uses token bucket algorithm to allow bursts while maintaining average rate.
    Supports per-user and per-endpoint rate limiting.
    """
    
    def __init__(
        self,
        default_requests_per_minute: int = 60,
        burst_multiplier: float = 1.5,
    ):
        """
        Initialize rate limiting service.
        
        Args:
            default_requests_per_minute: Default rate limit
            burst_multiplier: Multiplier for burst capacity (e.g., 1.5 = 50% burst)
        """
        self.default_requests_per_minute = default_requests_per_minute
        self.burst_multiplier = burst_multiplier
        
        # Storage for token buckets
        # Key format: "user:{user_id}" or "user:{user_id}:endpoint:{endpoint}"
        self.buckets: Dict[str, TokenBucket] = {}
        
        # Custom limits per user or endpoint
        self.custom_limits: Dict[str, int] = {}
        
        self.logger = logging.getLogger(self.__class__.__name__)
        self.lock = threading.Lock()
    
    def check_limit(
        self,
        user_id: str,
        endpoint: Optional[str] = None,
    ) -> RateLimitStatus:
        """
        Check if request is allowed under rate limit.
        
        Args:
            user_id: User identifier
            endpoint: Optional endpoint for per-endpoint limits
            
        Returns:
            Rate limit status
        """
        bucket = self._get_or_create_bucket(user_id, endpoint)
        
        # Check if we can consume a token
        allowed = bucket.consume(1)
        remaining = int(bucket.peek())
        reset_at = bucket.reset_at()
        
        retry_after = None
        if not allowed:
            retry_after = int((reset_at - datetime.now()).total_seconds())
            self.logger.warning(
                f"Rate limit exceeded: user={user_id}, endpoint={endpoint}, "
                f"retry_after={retry_after}s"
            )
        
        return RateLimitStatus(
            allowed=allowed,
            remaining=remaining,
            reset_at=reset_at,
            retry_after_seconds=retry_after,
        )
    
    def record_request(
        self,
        user_id: str,
        endpoint: Optional[str] = None,
    ) -> None:
        """
        Record an API request (consumes a token).
        
        This is called after check_limit returns allowed=True.
        Note: check_limit already consumes a token, so this is a no-op
        unless you want to track additional metrics.
        
        Args:
            user_id: User identifier
            endpoint: Optional endpoint
        """
        # Token already consumed in check_limit
        pass
    
    def set_custom_limit(
        self,
        user_id: str,
        requests_per_minute: int,
        endpoint: Optional[str] = None,
    ) -> None:
        """
        Set a custom rate limit for a user or user+endpoint.
        
        Args:
            user_id: User identifier
            requests_per_minute: Custom rate limit
            endpoint: Optional endpoint for per-endpoint limit
        """
        key = self._get_bucket_key(user_id, endpoint)
        self.custom_limits[key] = requests_per_minute
        
        # Remove existing bucket so it gets recreated with new limit
        with self.lock:
            if key in self.buckets:
                del self.buckets[key]
        
        self.logger.info(
            f"Set custom rate limit: user={user_id}, endpoint={endpoint}, "
            f"limit={requests_per_minute}/min"
        )
    
    def reset_limit(
        self,
        user_id: str,
        endpoint: Optional[str] = None,
    ) -> None:
        """
        Reset rate limit for a user or user+endpoint.
        
        Args:
            user_id: User identifier
            endpoint: Optional endpoint
        """
        key = self._get_bucket_key(user_id, endpoint)
        
        with self.lock:
            if key in self.buckets:
                # Reset bucket to full capacity
                self.buckets[key].tokens = float(self.buckets[key].capacity)
                self.buckets[key].last_refill = datetime.now()
        
        self.logger.info(
            f"Reset rate limit: user={user_id}, endpoint={endpoint}"
        )
    
    def get_status(
        self,
        user_id: str,
        endpoint: Optional[str] = None,
    ) -> RateLimitStatus:
        """
        Get current rate limit status without consuming a token.
        
        Args:
            user_id: User identifier
            endpoint: Optional endpoint
            
        Returns:
            Rate limit status
        """
        bucket = self._get_or_create_bucket(user_id, endpoint)
        
        remaining = int(bucket.peek())
        reset_at = bucket.reset_at()
        
        return RateLimitStatus(
            allowed=remaining > 0,
            remaining=remaining,
            reset_at=reset_at,
        )
    
    def _get_or_create_bucket(
        self,
        user_id: str,
        endpoint: Optional[str] = None,
    ) -> TokenBucket:
        """Get or create a token bucket for user/endpoint."""
        key = self._get_bucket_key(user_id, endpoint)
        
        with self.lock:
            if key not in self.buckets:
                # Get rate limit (custom or default)
                limit = self.custom_limits.get(key, self.default_requests_per_minute)
                capacity = int(limit * self.burst_multiplier)
                
                self.buckets[key] = TokenBucket(
                    capacity=capacity,
                    refill_rate=limit,
                    refill_period_seconds=60.0,
                )
                
                self.logger.debug(
                    f"Created token bucket: key={key}, capacity={capacity}, "
                    f"refill_rate={limit}/min"
                )
            
            return self.buckets[key]
    
    def _get_bucket_key(self, user_id: str, endpoint: Optional[str] = None) -> str:
        """Generate bucket key for user/endpoint combination."""
        if endpoint:
            return f"user:{user_id}:endpoint:{endpoint}"
        return f"user:{user_id}"
    
    def cleanup_inactive_buckets(self, inactive_minutes: int = 60) -> int:
        """
        Remove buckets that haven't been used recently.
        
        Args:
            inactive_minutes: Minutes of inactivity before cleanup
            
        Returns:
            Number of buckets removed
        """
        cutoff = datetime.now() - timedelta(minutes=inactive_minutes)
        
        with self.lock:
            inactive = [
                key for key, bucket in self.buckets.items()
                if bucket.last_refill < cutoff
            ]
            
            for key in inactive:
                del self.buckets[key]
        
        if inactive:
            self.logger.info(f"Cleaned up {len(inactive)} inactive rate limit buckets")
        
        return len(inactive)
