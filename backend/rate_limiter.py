"""
Rate Limiter Middleware for StoryCore-Engine Feedback Proxy

This module implements rate limiting to prevent abuse of the feedback submission
endpoint. It tracks requests per IP address and enforces a configurable limit.

Requirements: 5.5 - Rate Limiting

Enhanced: Priority 1 - Multi-tier Rate Limiting with Token Bucket Algorithm
- Token bucket algorithm for smooth rate limiting
- Multi-tier limits: Global, User, Feature, Provider
- Configuration from YAML/JSON file
- Standard rate limit response headers
"""

import time
import logging
import ipaddress
import json
import os
from typing import Dict, Tuple, Optional, Any, List
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from threading import Lock
from enum import Enum

logger = logging.getLogger(__name__)


class RateLimitTier(str, Enum):
    """Rate limit tier types"""
    GLOBAL = "global"
    USER = "user"
    FEATURE = "feature"
    PROVIDER = "provider"


@dataclass
class TokenBucket:
    """
    Token bucket for rate limiting.
    
    Implements the token bucket algorithm where tokens are added at a fixed
    rate up to a maximum capacity. Each request consumes tokens.
    """
    capacity: float
    tokens: float
    refill_rate: float  # tokens per second
    last_refill: float
    
    def refill(self, current_time: float) -> None:
        """Refill tokens based on elapsed time"""
        elapsed = current_time - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = current_time
    
    def consume(self, tokens: float = 1.0) -> bool:
        """Try to consume tokens, returns True if successful"""
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def time_until_available(self, tokens: float = 1.0) -> float:
        """Calculate time until requested tokens are available"""
        if self.tokens >= tokens:
            return 0.0
        needed = tokens - self.tokens
        return needed / self.refill_rate


@dataclass
class RateLimitConfig:
    """Configuration for a single rate limit tier"""
    requests_per_minute: int = 60
    tokens_per_minute: int = 10000
    requests_per_hour: int = 1000
    tokens_per_hour: int = 100000
    description: str = ""
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RateLimitConfig':
        """Create config from dictionary"""
        return cls(
            requests_per_minute=data.get('requests_per_minute', 60),
            tokens_per_minute=data.get('tokens_per_minute', 10000),
            requests_per_hour=data.get('requests_per_hour', 1000),
            tokens_per_hour=data.get('tokens_per_hour', 100000),
            description=data.get('description', '')
        )


@dataclass
class RateLimitResult:
    """Result of a rate limit check"""
    allowed: bool
    limit_type: str
    limit_value: int
    current_value: int
    retry_after: float  # seconds
    reset_at: datetime
    headers: Dict[str, str] = field(default_factory=dict)


class TokenBucketRateLimiter:
    """
    Token bucket-based rate limiter with multi-tier support.
    
    Supports multiple tiers of rate limiting:
    - Global: System-wide limits
    - User: Per-user limits
    - Feature: Per-feature limits
    - Provider: Per-provider limits
    
    Each tier can have both request and token limits.
    """
    
    DEFAULT_CONFIG_PATH = "config/llm_rate_limits.yaml"
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the token bucket rate limiter.
        
        Args:
            config_path: Path to YAML configuration file
        """
        self.lock = Lock()
        self.config_path = config_path or self.DEFAULT_CONFIG_PATH
        
        # Configuration
        self.config: Dict[str, Any] = {}
        self.global_config = RateLimitConfig()
        self.user_configs: Dict[str, RateLimitConfig] = {}
        self.feature_configs: Dict[str, RateLimitConfig] = {}
        self.provider_configs: Dict[str, RateLimitConfig] = {}
        
        # Token buckets for each tier
        # Key format: "tier:identifier:limit_type" (e.g., "user:123:requests")
        self.buckets: Dict[str, TokenBucket] = {}
        
        # Load configuration
        self._load_config()
        
        logger.info(f"TokenBucketRateLimiter initialized with config from {self.config_path}")
    
    def _load_config(self) -> None:
        """Load configuration from YAML file"""
        try:
            import yaml
            with open(self.config_path, 'r') as f:
                self.config = yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Config file not found: {self.config_path}, using defaults")
            self._set_default_config()
            return
        except Exception as e:
            logger.error(f"Error loading config: {e}, using defaults")
            self._set_default_config()
            return
        
        # Parse configuration
        rate_limits = self.config.get('rate_limits', {})
        
        # Global config
        if 'global' in rate_limits:
            self.global_config = RateLimitConfig.from_dict(rate_limits['global'])
        
        # User configs
        if 'per_user' in rate_limits:
            for tier_name, tier_config in rate_limits['per_user'].items():
                self.user_configs[tier_name] = RateLimitConfig.from_dict(tier_config)
        
        # Feature configs
        if 'per_feature' in rate_limits:
            for feature_name, feature_config in rate_limits['per_feature'].items():
                self.feature_configs[feature_name] = RateLimitConfig.from_dict(feature_config)
        
        # Provider configs
        if 'per_provider' in rate_limits:
            for provider_name, provider_config in rate_limits['per_provider'].items():
                self.provider_configs[provider_name] = RateLimitConfig.from_dict(provider_config)
    
    def _set_default_config(self) -> None:
        """Set default configuration when config file is not available"""
        self.global_config = RateLimitConfig(
            requests_per_minute=100,
            tokens_per_minute=100000,
            requests_per_hour=1000,
            tokens_per_hour=1000000
        )
        self.user_configs = {
            'default': RateLimitConfig(
                requests_per_minute=20,
                tokens_per_minute=20000,
                requests_per_hour=200,
                tokens_per_hour=200000
            )
        }
        self.feature_configs = {
            'general': RateLimitConfig(
                requests_per_minute=15,
                tokens_per_minute=5000
            )
        }
        self.provider_configs = {
            'openai': RateLimitConfig(requests_per_minute=30, tokens_per_minute=50000),
            'anthropic': RateLimitConfig(requests_per_minute=30, tokens_per_minute=50000),
            'ollama': RateLimitConfig(requests_per_minute=60, tokens_per_minute=100000)
        }
    
    def _get_bucket(self, key: str, capacity: float, refill_rate: float) -> TokenBucket:
        """Get or create a token bucket"""
        current_time = time.time()
        
        if key not in self.buckets:
            self.buckets[key] = TokenBucket(
                capacity=capacity,
                tokens=capacity,  # Start full
                refill_rate=refill_rate,
                last_refill=current_time
            )
        
        bucket = self.buckets[key]
        bucket.refill(current_time)
        return bucket
    
    def _get_user_tier(self, user_id: str) -> str:
        """Determine user tier (default, premium, developer)"""
        # This could be enhanced to check user metadata
        # For now, return 'default'
        return 'default'
    
    def check_rate_limit(
        self,
        user_id: str,
        feature: str = "general",
        provider: str = "default",
        tokens_requested: int = 0
    ) -> RateLimitResult:
        """
        Check if a request should be allowed based on all rate limit tiers.
        
        Args:
            user_id: User making the request
            feature: Feature being used
            provider: LLM provider being used
            tokens_requested: Number of tokens requested (for token-based limits)
        
        Returns:
            RateLimitResult with allow/deny decision and metadata
        """
        current_time = time.time()
        
        with self.lock:
            # Check all tiers in order of priority
            checks = []
            
            # 1. Global limits
            global_check = self._check_tier(
                "global", "all", self.global_config, tokens_requested
            )
            checks.append(("global", global_check))
            
            # 2. User limits
            user_tier = self._get_user_tier(user_id)
            user_config = self.user_configs.get(user_tier, self.user_configs.get('default'))
            user_check = self._check_tier(
                "user", user_id, user_config, tokens_requested
            )
            checks.append(("user", user_check))
            
            # 3. Feature limits
            feature_config = self.feature_configs.get(feature, self.feature_configs.get('general'))
            if feature_config:
                feature_check = self._check_tier(
                    "feature", feature, feature_config, tokens_requested
                )
                checks.append(("feature", feature_check))
            
            # 4. Provider limits
            provider_config = self.provider_configs.get(provider)
            if provider_config:
                provider_check = self._check_tier(
                    "provider", provider, provider_config, tokens_requested
                )
                checks.append(("provider", provider_check))
            
            # Find the most restrictive limit
            for tier_name, (allowed, bucket, retry_after) in checks:
                if not allowed:
                    # Rate limited!
                    config = self.global_config
                    if tier_name == "user":
                        config = user_config
                    elif tier_name == "feature":
                        config = feature_config
                    elif tier_name == "provider":
                        config = provider_config
                    
                    reset_at = datetime.utcnow() + timedelta(seconds=retry_after)
                    
                    return RateLimitResult(
                        allowed=False,
                        limit_type=tier_name,
                        limit_value=int(bucket.capacity),
                        current_value=int(bucket.capacity - bucket.tokens),
                        retry_after=retry_after,
                        reset_at=reset_at,
                        headers=self._generate_headers(bucket, tier_name)
                    )
            
            # All checks passed - consume tokens
            for tier_name, (allowed, bucket, _) in checks:
                # Consume request token
                bucket.consume(1.0)
                # Consume token budget if specified
                if tokens_requested > 0:
                    token_key = tier_name + ":tokens"
                    if tier_name == "global":
                        token_config = self.global_config
                        token_bucket = self._get_bucket(
                            "global:tokens",
                            token_config.tokens_per_minute,
                            token_config.tokens_per_minute / 60.0
                        )
                    elif tier_name == "user":
                        token_bucket = self._get_bucket(
                            f"user:{user_id}:tokens",
                            user_config.tokens_per_minute,
                            user_config.tokens_per_minute / 60.0
                        )
                    else:
                        continue
                    token_bucket.consume(tokens_requested)
            
            # Generate success headers
            _, (_, bucket, _) = checks[1] if len(checks) > 1 else checks[0]
            return RateLimitResult(
                allowed=True,
                limit_type="combined",
                limit_value=int(bucket.capacity),
                current_value=int(bucket.capacity - bucket.tokens),
                retry_after=0,
                reset_at=datetime.utcnow() + timedelta(minutes=1),
                headers=self._generate_headers(bucket, "user")
            )
    
    def _check_tier(
        self,
        tier: str,
        identifier: str,
        config: RateLimitConfig,
        tokens_requested: int
    ) -> Tuple[bool, TokenBucket, float]:
        """
        Check rate limit for a specific tier.
        
        Returns:
            Tuple of (allowed, bucket, retry_after)
        """
        # Get request bucket
        key = f"{tier}:{identifier}:requests"
        bucket = self._get_bucket(
            key,
            capacity=config.requests_per_minute,
            refill_rate=config.requests_per_minute / 60.0
        )
        
        # Check if request can be made
        if not bucket.consume(0):  # Just check, don't consume yet
            retry_after = bucket.time_until_available(1.0)
            return False, bucket, retry_after
        
        return True, bucket, 0.0
    
    def _generate_headers(self, bucket: TokenBucket, limit_type: str) -> Dict[str, str]:
        """Generate rate limit headers for response"""
        reset_timestamp = int(time.time() + bucket.time_until_available(bucket.capacity))
        
        return {
            "X-RateLimit-Limit": str(int(bucket.capacity)),
            "X-RateLimit-Remaining": str(int(bucket.tokens)),
            "X-RateLimit-Reset": str(reset_timestamp),
            "X-RateLimit-Reset-After": str(int(bucket.time_until_available(1.0))),
            "X-RateLimit-Type": limit_type
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the rate limiter"""
        with self.lock:
            return {
                "total_buckets": len(self.buckets),
                "config_loaded": bool(self.config),
                "tiers": {
                    "global": self.global_config.__dict__,
                    "user_tiers": {k: v.__dict__ for k, v in self.user_configs.items()},
                    "features": list(self.feature_configs.keys()),
                    "providers": list(self.provider_configs.keys())
                }
            }
    
    def reset_user(self, user_id: str) -> None:
        """Reset rate limits for a specific user"""
        with self.lock:
            keys_to_remove = [k for k in self.buckets if f"user:{user_id}" in k]
            for key in keys_to_remove:
                del self.buckets[key]
            logger.info(f"Reset rate limits for user {user_id}")
    
    def cleanup_expired(self, max_age_seconds: int = 3600) -> int:
        """Clean up expired buckets that haven't been used recently"""
        current_time = time.time()
        removed = 0
        
        with self.lock:
            keys_to_remove = []
            for key, bucket in self.buckets.items():
                if current_time - bucket.last_refill > max_age_seconds:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self.buckets[key]
                removed += 1
        
        if removed > 0:
            logger.debug(f"Cleaned up {removed} expired rate limit buckets")
        
        return removed


def validate_ip_address(ip_str: str) -> bool:
    """
    Validate that a string is a valid IP address (IPv4 or IPv6).
    
    Security Fix: This prevents IP spoofing attacks where malicious actors
    might try to inject fake IP addresses to bypass rate limiting.
    
    Args:
        ip_str: The IP address string to validate
        
    Returns:
        True if valid IP address, False otherwise
    """
    try:
        ipaddress.ip_address(ip_str)
        return True
    except ValueError:
        return False


class RateLimiter:
    """
    In-memory rate limiter that tracks requests per IP address.
    
    This implementation uses a sliding window approach to track requests
    within a time window. It's thread-safe and automatically cleans up
    old entries to prevent memory leaks.
    
    Performance Fix: Added periodic global cleanup to prevent memory leak
    from IPs that stop making requests. The cleanup runs every cleanup_interval
    seconds and removes all expired entries across all IPs.
    
    Attributes:
        max_requests: Maximum number of requests allowed per IP per time window
        time_window_seconds: Time window in seconds (default: 3600 = 1 hour)
        request_log: Dictionary mapping IP addresses to lists of request timestamps
        lock: Thread lock for thread-safe operations
        cleanup_interval: Interval in seconds between global cleanups (default: 60)
        last_cleanup: Timestamp of the last global cleanup
    """
    
    # Performance Fix: Default cleanup interval of 60 seconds
    # This ensures stale IP entries are removed even if the IP never returns
    DEFAULT_CLEANUP_INTERVAL = 60
    
    def __init__(self, max_requests: int = 10, time_window_seconds: int = 3600, 
                 cleanup_interval: int = DEFAULT_CLEANUP_INTERVAL):
        """
        Initialize the rate limiter.
        
        Args:
            max_requests: Maximum requests per IP per time window (default: 10)
            time_window_seconds: Time window in seconds (default: 3600 = 1 hour)
            cleanup_interval: Interval in seconds between global cleanups (default: 60)
        """
        self.max_requests = max_requests
        self.time_window_seconds = time_window_seconds
        self.request_log: Dict[str, list[float]] = defaultdict(list)
        self.lock = Lock()
        self.cleanup_interval = cleanup_interval
        self.last_cleanup: float = time.time()
        
        logger.info(
            f"Rate limiter initialized: {max_requests} requests per "
            f"{time_window_seconds} seconds, cleanup interval: {cleanup_interval}s"
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
    
    def _global_cleanup(self, current_time: float) -> None:
        """
        Performance Fix: Perform a global cleanup of all stale IP entries.
        
        This method is called periodically to clean up entries from IPs that
        have stopped making requests. Without this, the request_log would grow
        indefinitely as IPs accumulate and never get cleaned up if they don't
        make further requests.
        
        Args:
            current_time: Current timestamp in seconds since epoch
        """
        cutoff_time = current_time - self.time_window_seconds
        ips_to_check = list(self.request_log.keys())
        cleaned_ips = 0
        
        for ip in ips_to_check:
            # Filter out requests older than the time window
            self.request_log[ip] = [
                timestamp for timestamp in self.request_log[ip]
                if timestamp > cutoff_time
            ]
            
            # Remove the IP entry entirely if no requests remain
            if not self.request_log[ip]:
                del self.request_log[ip]
                cleaned_ips += 1
        
        self.last_cleanup = current_time
        
        if cleaned_ips > 0:
            logger.debug(
                f"Global cleanup completed: removed {cleaned_ips} stale IP entries, "
                f"{len(self.request_log)} IPs remaining"
            )
    
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
        # Security Fix: Validate IP address format to prevent IP spoofing
        # Invalid IP addresses are rejected to prevent bypass attempts
        if not validate_ip_address(ip_address):
            logger.warning(f"Invalid IP address format rejected: {ip_address}")
            # Deny request with invalid IP - use a default retry time
            return False, self.time_window_seconds
        
        with self.lock:
            current_time = time.time()
            
            # Performance Fix: Periodic global cleanup to prevent memory leak
            # from IPs that stop making requests. Runs every cleanup_interval seconds.
            if current_time - self.last_cleanup >= self.cleanup_interval:
                self._global_cleanup(current_time)
            
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


def initialize_rate_limiter(max_requests: int = 10, time_window_seconds: int = 3600,
                           cleanup_interval: int = RateLimiter.DEFAULT_CLEANUP_INTERVAL) -> RateLimiter:
    """
    Initialize the global rate limiter instance.
    
    This should be called once when the FastAPI application starts.
    
    Args:
        max_requests: Maximum requests per IP per time window
        time_window_seconds: Time window in seconds
        cleanup_interval: Interval in seconds between global cleanups (default: 60)
    
    Returns:
        The initialized RateLimiter instance
    """
    global _rate_limiter
    _rate_limiter = RateLimiter(max_requests, time_window_seconds, cleanup_interval)
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
