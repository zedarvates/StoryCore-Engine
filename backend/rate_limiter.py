"""
Rate Limiter Middleware for StoryCore-Engine Feedback Proxy

This module implements rate limiting to prevent abuse of the feedback submission
endpoint. It tracks requests per IP address and enforces a configurable limit.

Requirements: 5.5 - Rate Limiting
"""

import time
import logging
from typing import Dict, Tuple, Optional
from collections import defaultdict
from datetime import datetime, timedelta
from threading import Lock

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    In-memory rate limiter that tracks requests per IP address.
    
    This implementation uses a sliding window approach to track requests
    within a time window. It's thread-safe and automatically cleans up
    old entries to prevent memory leaks.
    
    Attributes:
        max_requests: Maximum number of requests allowed per IP per time window
        time_window_seconds: Time window in seconds (default: 3600 = 1 hour)
        request_log: Dictionary mapping IP addresses to lists of request timestamps
        lock: Thread lock for thread-safe operations
    """
    
    def __init__(self, max_requests: int = 10, time_window_seconds: int = 3600):
        """
        Initialize the rate limiter.
        
        Args:
            max_requests: Maximum requests per IP per time window (default: 10)
            time_window_seconds: Time window in seconds (default: 3600 = 1 hour)
        """
        self.max_requests = max_requests
        self.time_window_seconds = time_window_seconds
        self.request_log: Dict[str, list[float]] = defaultdict(list)
        self.lock = Lock()
        
        logger.info(
            f"Rate limiter initialized: {max_requests} requests per "
            f"{time_window_seconds} seconds"
        )
    
    def _cleanup_old_requests(self, ip_address: str, current_time: float) -> None:
        """
        Remove request timestamps that are outside the time window.
        
        This prevents the request log from growing indefinitely and ensures
        accurate rate limiting based on the sliding window.
        
        Args:
            ip_address: The IP address to clean up
            current_time: Current timestamp in seconds since epoch
        """
        cutoff_time = current_time - self.time_window_seconds
        
        # Filter out requests older than the time window
        self.request_log[ip_address] = [
            timestamp for timestamp in self.request_log[ip_address]
            if timestamp > cutoff_time
        ]
        
        # Remove the IP entry entirely if no requests remain
        if not self.request_log[ip_address]:
            del self.request_log[ip_address]
    
    def check_rate_limit(self, ip_address: str) -> Tuple[bool, Optional[int]]:
        """
        Check if a request from the given IP address should be allowed.
        
        This method:
        1. Cleans up old request timestamps
        2. Checks if the IP has exceeded the rate limit
        3. Records the new request if allowed
        4. Calculates retry-after time if rate limit exceeded
        
        Args:
            ip_address: The IP address making the request
        
        Returns:
            Tuple of (is_allowed, retry_after_seconds):
                - is_allowed: True if request should be allowed, False otherwise
                - retry_after_seconds: Seconds until rate limit resets (None if allowed)
        
        Requirements: 5.5
        """
        with self.lock:
            current_time = time.time()
            
            # Clean up old requests for this IP
            self._cleanup_old_requests(ip_address, current_time)
            
            # Get current request count for this IP
            request_count = len(self.request_log[ip_address])
            
            # Check if rate limit exceeded
            if request_count >= self.max_requests:
                # Calculate when the oldest request will expire
                # Handle edge case where request_log might be empty (max_requests = 0)
                if self.request_log[ip_address]:
                    oldest_request = min(self.request_log[ip_address])
                    retry_after = int(oldest_request + self.time_window_seconds - current_time)
                else:
                    # If no requests logged yet but limit is 0, use full time window
                    retry_after = self.time_window_seconds
                
                # Ensure retry_after is at least 1 second
                retry_after = max(1, retry_after)
                
                logger.warning(
                    f"Rate limit exceeded for IP {ip_address}: "
                    f"{request_count}/{self.max_requests} requests. "
                    f"Retry after {retry_after} seconds"
                )
                
                return False, retry_after
            
            # Allow the request and record it
            self.request_log[ip_address].append(current_time)
            
            logger.debug(
                f"Request allowed for IP {ip_address}: "
                f"{request_count + 1}/{self.max_requests} requests"
            )
            
            return True, None
    
    def get_request_count(self, ip_address: str) -> int:
        """
        Get the current request count for an IP address.
        
        This is useful for monitoring and debugging purposes.
        
        Args:
            ip_address: The IP address to check
        
        Returns:
            Number of requests from this IP in the current time window
        """
        with self.lock:
            current_time = time.time()
            self._cleanup_old_requests(ip_address, current_time)
            return len(self.request_log[ip_address])
    
    def reset_ip(self, ip_address: str) -> None:
        """
        Reset the rate limit for a specific IP address.
        
        This is useful for testing or administrative purposes.
        
        Args:
            ip_address: The IP address to reset
        """
        with self.lock:
            if ip_address in self.request_log:
                del self.request_log[ip_address]
                logger.info(f"Rate limit reset for IP {ip_address}")
    
    def get_stats(self) -> Dict[str, any]:
        """
        Get statistics about the rate limiter.
        
        Returns:
            Dictionary containing:
                - total_ips: Number of IPs currently being tracked
                - max_requests: Maximum requests allowed per time window
                - time_window_seconds: Time window in seconds
                - tracked_ips: List of IPs with their request counts
        """
        with self.lock:
            current_time = time.time()
            
            # Clean up all IPs
            for ip in list(self.request_log.keys()):
                self._cleanup_old_requests(ip, current_time)
            
            tracked_ips = {
                ip: len(timestamps)
                for ip, timestamps in self.request_log.items()
            }
            
            return {
                "total_ips": len(self.request_log),
                "max_requests": self.max_requests,
                "time_window_seconds": self.time_window_seconds,
                "tracked_ips": tracked_ips
            }


# Global rate limiter instance
# This will be initialized by the FastAPI application
_rate_limiter: Optional[RateLimiter] = None


def initialize_rate_limiter(max_requests: int = 10, time_window_seconds: int = 3600) -> RateLimiter:
    """
    Initialize the global rate limiter instance.
    
    This should be called once when the FastAPI application starts.
    
    Args:
        max_requests: Maximum requests per IP per time window
        time_window_seconds: Time window in seconds
    
    Returns:
        The initialized RateLimiter instance
    """
    global _rate_limiter
    _rate_limiter = RateLimiter(max_requests, time_window_seconds)
    return _rate_limiter


def get_rate_limiter() -> RateLimiter:
    """
    Get the global rate limiter instance.
    
    Returns:
        The global RateLimiter instance
    
    Raises:
        RuntimeError: If rate limiter has not been initialized
    """
    if _rate_limiter is None:
        raise RuntimeError("Rate limiter not initialized. Call initialize_rate_limiter() first.")
    return _rate_limiter
