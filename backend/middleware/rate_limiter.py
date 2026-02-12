"""
Rate Limiter Middleware
Provides rate limiting for API endpoints to prevent abuse
"""

import time
import threading
from collections import defaultdict
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, field
from functools import wraps


@dataclass
class RateLimitConfig:
    """Rate limit configuration for an endpoint"""
    requests_per_window: int = 100
    window_seconds: int = 60
    burst_size: int = 10


@dataclass
class RateLimitResult:
    """Result of rate limit check"""
    allowed: bool
    remaining: int
    reset_time: float
    retry_after: Optional[float] = None


class RateLimiter:
    """Thread-safe rate limiter using sliding window algorithm"""
    
    def __init__(self):
        self._locks: Dict[str, threading.Lock] = defaultdict(threading.Lock)
        self._requests: Dict[str, list] = defaultdict(list)
        self._configs: Dict[str, RateLimitConfig] = {}
        self._default_config = RateLimitConfig()
    
    def configure(self, endpoint: str, config: RateLimitConfig) -> None:
        """Configure rate limit for an endpoint"""
        self._configs[endpoint] = config
    
    def set_default_config(self, config: RateLimitConfig) -> None:
        """Set default rate limit configuration"""
        self._default_config = config
    
    def check(self, endpoint: str, client_id: str) -> RateLimitResult:
        """Check if request is allowed and record it if so"""
        config = self._configs.get(endpoint, self._default_config)
        key = f"{endpoint}:{client_id}"
        
        with self._locks[key]:
            current_time = time.time()
            
            # Clean old requests outside the window
            cutoff_time = current_time - config.window_seconds
            self._requests[key] = [
                req_time for req_time in self._requests[key]
                if req_time > cutoff_time
            ]
            
            # Check if under limit
            current_count = len(self._requests[key])
            remaining = config.requests_per_window - current_count
            
            if current_count >= config.requests_per_window:
                # Calculate retry after
                oldest_request = min(self._requests[key])
                retry_after = config.window_seconds - (current_time - oldest_request)
                
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=current_time + config.window_seconds,
                    retry_after=max(0, retry_after)
                )
            
            # Record this request
            self._requests[key].append(current_time)
            
            return RateLimitResult(
                allowed=True,
                remaining=remaining - 1,
                reset_time=current_time + config.window_seconds
            )
    
    def get_status(self, endpoint: str, client_id: str) -> RateLimitResult:
        """Get current rate limit status without recording a request"""
        config = self._configs.get(endpoint, self._default_config)
        key = f"{endpoint}:{client_id}"
        
        with self._locks[key]:
            current_time = time.time()
            
            # Clean old requests
            cutoff_time = current_time - config.window_seconds
            self._requests[key] = [
                req_time for req_time in self._requests[key]
                if req_time > cutoff_time
            ]
            
            current_count = len(self._requests[key])
            remaining = config.requests_per_window - current_count
            
            if current_count >= config.requests_per_window:
                oldest_request = min(self._requests[key])
                retry_after = config.window_seconds - (current_time - oldest_request)
                
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_time=current_time + config.window_seconds,
                    retry_after=max(0, retry_after)
                )
            
            return RateLimitResult(
                allowed=True,
                remaining=remaining,
                reset_time=current_time + config.window_seconds
            )


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(endpoint: str, config: Optional[RateLimitConfig] = None):
    """Decorator for rate limiting API endpoints"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract client_id from request (this would be implemented per-framework)
            client_id = kwargs.get('client_id', 'anonymous')
            
            if config:
                rate_limiter.configure(endpoint, config)
            
            result = rate_limiter.check(endpoint, client_id)
            
            if not result.allowed:
                return {
                    "error": "Rate limit exceeded",
                    "retry_after": result.retry_after,
                    "remaining": 0
                }, 429
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def setup_rate_limits():
    """Setup default rate limits for common endpoints"""
    # Default config
    rate_limiter.set_default_config(RateLimitConfig(
        requests_per_window=100,
        window_seconds=60,
        burst_size=10
    ))
    
    # Specific endpoint configurations
    rate_limiter.configure('/api/generate', RateLimitConfig(
        requests_per_window=10,
        window_seconds=60,
        burst_size=2
    ))
    
    rate_limiter.configure('/api/comfyui/workflow', RateLimitConfig(
        requests_per_window=5,
        window_seconds=60,
        burst_size=1
    ))
    
    rate_limiter.configure('/api/tasks', RateLimitConfig(
        requests_per_window=50,
        window_seconds=60,
        burst_size=5
    ))


# Initialize rate limits on module load
setup_rate_limits()
