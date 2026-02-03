"""
Rate limiting module for the fact-checking system.

This module provides request tracking and rate limiting to prevent API abuse.
It implements configurable rate limits with 429 error responses and retry-after
information.

Requirements: 9.7
"""

import time
import logging
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, field
from collections import deque
from threading import Lock

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """
    Configuration for rate limiting.
    
    Attributes:
        requests_per_minute: Maximum requests allowed per minute
        requests_per_hour: Maximum requests allowed per hour
        burst_size: Maximum burst size (requests in short time)
        enabled: Whether rate limiting is enabled
    """
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    burst_size: int = 10
    enabled: bool = True


@dataclass
class RateLimitStatus:
    """
    Current status of rate limiting for a client.
    
    Attributes:
        allowed: Whether the request is allowed
        retry_after: Seconds to wait before retrying (if not allowed)
        remaining_minute: Remaining requests in current minute
        remaining_hour: Remaining requests in current hour
        reset_time_minute: When the minute window resets
        reset_time_hour: When the hour window resets
    """
    allowed: bool
    retry_after: Optional[int] = None
    remaining_minute: Optional[int] = None
    remaining_hour: Optional[int] = None
    reset_time_minute: Optional[float] = None
    reset_time_hour: Optional[float] = None
    
    def to_dict(self) -> Dict[str, any]:
        """Convert to dictionary for API responses."""
        return {
            "allowed": self.allowed,
            "retry_after": self.retry_after,
            "remaining_minute": self.remaining_minute,
            "remaining_hour": self.remaining_hour,
            "reset_time_minute": self.reset_time_minute,
            "reset_time_hour": self.reset_time_hour
        }


class RateLimitError(Exception):
    """
    Exception raised when rate limit is exceeded.
    
    Attributes:
        retry_after: Seconds to wait before retrying
        status: Rate limit status information
    """
    
    def __init__(self, retry_after: int, status: RateLimitStatus):
        """
        Initialize rate limit error.
        
        Args:
            retry_after: Seconds to wait before retrying
            status: Rate limit status
        """
        self.retry_after = retry_after
        self.status = status
        super().__init__(
            f"Rate limit exceeded. Retry after {retry_after} seconds."
        )


class ClientRateLimiter:
    """
    Rate limiter for a single client.
    
    Tracks requests in sliding windows for minute and hour periods,
    and enforces burst limits.
    """
    
    def __init__(self, config: RateLimitConfig):
        """
        Initialize client rate limiter.
        
        Args:
            config: Rate limit configuration
        """
        self.config = config
        self.minute_requests: deque = deque()
        self.hour_requests: deque = deque()
        self.lock = Lock()
    
    def _cleanup_old_requests(self, current_time: float) -> None:
        """
        Remove requests outside the tracking windows.
        
        Args:
            current_time: Current timestamp
        """
        # Remove requests older than 1 minute
        minute_cutoff = current_time - 60
        while self.minute_requests and self.minute_requests[0] < minute_cutoff:
            self.minute_requests.popleft()
        
        # Remove requests older than 1 hour
        hour_cutoff = current_time - 3600
        while self.hour_requests and self.hour_requests[0] < hour_cutoff:
            self.hour_requests.popleft()
    
    def check_rate_limit(self) -> RateLimitStatus:
        """
        Check if a request is allowed under current rate limits.
        
        Returns:
            RateLimitStatus indicating whether request is allowed
        """
        with self.lock:
            current_time = time.time()
            
            # Clean up old requests
            self._cleanup_old_requests(current_time)
            
            # Check minute limit
            minute_count = len(self.minute_requests)
            minute_remaining = self.config.requests_per_minute - minute_count
            
            # Check hour limit
            hour_count = len(self.hour_requests)
            hour_remaining = self.config.requests_per_hour - hour_count
            
            # Check burst limit (last 10 seconds)
            burst_cutoff = current_time - 10
            burst_count = sum(1 for t in self.minute_requests if t >= burst_cutoff)
            
            # Determine if request is allowed
            allowed = True
            retry_after = None
            
            if minute_count >= self.config.requests_per_minute:
                allowed = False
                # Calculate retry time based on oldest request in minute window
                oldest_minute_request = self.minute_requests[0]
                retry_after = int(60 - (current_time - oldest_minute_request)) + 1
                
            elif hour_count >= self.config.requests_per_hour:
                allowed = False
                # Calculate retry time based on oldest request in hour window
                oldest_hour_request = self.hour_requests[0]
                retry_after = int(3600 - (current_time - oldest_hour_request)) + 1
                
            elif burst_count >= self.config.burst_size:
                allowed = False
                # Calculate retry time for burst limit
                retry_after = 10  # Wait 10 seconds for burst to clear
            
            # Calculate reset times
            reset_time_minute = None
            reset_time_hour = None
            
            if self.minute_requests:
                reset_time_minute = self.minute_requests[0] + 60
            
            if self.hour_requests:
                reset_time_hour = self.hour_requests[0] + 3600
            
            return RateLimitStatus(
                allowed=allowed,
                retry_after=retry_after,
                remaining_minute=minute_remaining,
                remaining_hour=hour_remaining,
                reset_time_minute=reset_time_minute,
                reset_time_hour=reset_time_hour
            )
    
    def record_request(self) -> None:
        """Record a new request in the tracking windows."""
        with self.lock:
            current_time = time.time()
            self.minute_requests.append(current_time)
            self.hour_requests.append(current_time)
    
    def get_statistics(self) -> Dict[str, any]:
        """
        Get current rate limiting statistics.
        
        Returns:
            Dictionary with statistics
        """
        with self.lock:
            current_time = time.time()
            self._cleanup_old_requests(current_time)
            
            return {
                "requests_last_minute": len(self.minute_requests),
                "requests_last_hour": len(self.hour_requests),
                "limit_per_minute": self.config.requests_per_minute,
                "limit_per_hour": self.config.requests_per_hour,
                "burst_size": self.config.burst_size
            }


class RateLimiter:
    """
    Global rate limiter managing multiple clients.
    
    This class tracks rate limits for multiple clients (identified by client_id)
    and enforces configured limits.
    """
    
    def __init__(self, config: Optional[RateLimitConfig] = None):
        """
        Initialize the rate limiter.
        
        Args:
            config: Rate limit configuration (uses defaults if None)
        """
        self.config = config or RateLimitConfig()
        self.clients: Dict[str, ClientRateLimiter] = {}
        self.lock = Lock()
        
        logger.info(
            f"Rate limiter initialized: {self.config.requests_per_minute} req/min, "
            f"{self.config.requests_per_hour} req/hour, "
            f"burst: {self.config.burst_size}"
        )
    
    def _get_or_create_client(self, client_id: str) -> ClientRateLimiter:
        """
        Get or create a client rate limiter.
        
        Args:
            client_id: Client identifier
            
        Returns:
            ClientRateLimiter for the client
        """
        with self.lock:
            if client_id not in self.clients:
                self.clients[client_id] = ClientRateLimiter(self.config)
                logger.debug(f"Created rate limiter for client: {client_id}")
            return self.clients[client_id]
    
    def check_rate_limit(self, client_id: str = "default") -> RateLimitStatus:
        """
        Check if a request from a client is allowed.
        
        Args:
            client_id: Client identifier (default: "default")
            
        Returns:
            RateLimitStatus indicating whether request is allowed
            
        Raises:
            RateLimitError: If rate limit is exceeded
        """
        if not self.config.enabled:
            # Rate limiting disabled
            return RateLimitStatus(allowed=True)
        
        client = self._get_or_create_client(client_id)
        status = client.check_rate_limit()
        
        if not status.allowed:
            logger.warning(
                f"Rate limit exceeded for client {client_id}. "
                f"Retry after {status.retry_after}s"
            )
            raise RateLimitError(status.retry_after, status)
        
        return status
    
    def record_request(self, client_id: str = "default") -> None:
        """
        Record a request from a client.
        
        Args:
            client_id: Client identifier (default: "default")
        """
        if not self.config.enabled:
            return
        
        client = self._get_or_create_client(client_id)
        client.record_request()
        logger.debug(f"Recorded request for client {client_id}")
    
    def allow_request(self, client_id: str = "default") -> Tuple[bool, Optional[int]]:
        """
        Check and record a request in one operation.
        
        Args:
            client_id: Client identifier
            
        Returns:
            Tuple of (allowed, retry_after)
        """
        try:
            status = self.check_rate_limit(client_id)
            self.record_request(client_id)
            return True, None
        except RateLimitError as e:
            return False, e.retry_after
    
    def get_client_statistics(self, client_id: str = "default") -> Dict[str, any]:
        """
        Get statistics for a specific client.
        
        Args:
            client_id: Client identifier
            
        Returns:
            Dictionary with client statistics
        """
        client = self._get_or_create_client(client_id)
        return client.get_statistics()
    
    def get_global_statistics(self) -> Dict[str, any]:
        """
        Get global rate limiting statistics.
        
        Returns:
            Dictionary with global statistics
        """
        with self.lock:
            return {
                "enabled": self.config.enabled,
                "total_clients": len(self.clients),
                "config": {
                    "requests_per_minute": self.config.requests_per_minute,
                    "requests_per_hour": self.config.requests_per_hour,
                    "burst_size": self.config.burst_size
                }
            }
    
    def reset_client(self, client_id: str) -> bool:
        """
        Reset rate limiting for a specific client.
        
        Args:
            client_id: Client identifier
            
        Returns:
            True if client was found and reset, False otherwise
        """
        with self.lock:
            if client_id in self.clients:
                del self.clients[client_id]
                logger.info(f"Reset rate limiter for client {client_id}")
                return True
            return False
    
    def reset_all(self) -> int:
        """
        Reset rate limiting for all clients.
        
        Returns:
            Number of clients reset
        """
        with self.lock:
            count = len(self.clients)
            self.clients.clear()
            logger.info(f"Reset rate limiters for {count} clients")
            return count


# Global rate limiter instance
_global_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter(config: Optional[RateLimitConfig] = None) -> RateLimiter:
    """
    Get or create the global rate limiter instance.
    
    Args:
        config: Rate limit configuration (only used on first call)
        
    Returns:
        Global rate limiter instance
    """
    global _global_rate_limiter
    if _global_rate_limiter is None:
        _global_rate_limiter = RateLimiter(config)
    return _global_rate_limiter


def reset_rate_limiter() -> None:
    """Reset the global rate limiter instance (mainly for testing)."""
    global _global_rate_limiter
    _global_rate_limiter = None


def create_429_response(retry_after: int, status: RateLimitStatus) -> Dict[str, any]:
    """
    Create a 429 (Too Many Requests) error response.
    
    Args:
        retry_after: Seconds to wait before retrying
        status: Rate limit status
        
    Returns:
        Dictionary with error response
    """
    return {
        "error": {
            "code": "RATE_LIMIT_EXCEEDED",
            "message": f"Rate limit exceeded. Please retry after {retry_after} seconds.",
            "retry_after": retry_after,
            "rate_limit_status": status.to_dict()
        },
        "status": "error"
    }
