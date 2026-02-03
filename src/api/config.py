"""
API Configuration System

This module provides configuration management for the StoryCore API system.
"""

from dataclasses import dataclass, field
from typing import List, Optional
import os


@dataclass
class APIConfig:
    """Configuration for the StoryCore API system."""
    
    # API Version
    version: str = "v1"
    
    # Server Configuration
    host: str = "localhost"
    port: int = 8000
    
    # Security Configuration
    enable_auth: bool = False
    enable_rate_limiting: bool = True
    rate_limit_requests_per_minute: int = 60
    
    # Performance Configuration
    cache_ttl_seconds: int = 300
    async_task_timeout_seconds: int = 3600
    max_concurrent_tasks: int = 10
    
    # Logging Configuration
    log_level: str = "INFO"
    log_api_calls: bool = True
    log_sanitize_params: bool = True
    
    # CORS Configuration
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    
    # Backend Service Configuration
    comfyui_url: Optional[str] = None
    llm_service_url: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> "APIConfig":
        """Create configuration from environment variables."""
        return cls(
            version=os.getenv("API_VERSION", "v1"),
            host=os.getenv("API_HOST", "localhost"),
            port=int(os.getenv("API_PORT", "8000")),
            enable_auth=os.getenv("API_ENABLE_AUTH", "false").lower() == "true",
            enable_rate_limiting=os.getenv("API_ENABLE_RATE_LIMITING", "true").lower() == "true",
            rate_limit_requests_per_minute=int(os.getenv("API_RATE_LIMIT_RPM", "60")),
            cache_ttl_seconds=int(os.getenv("API_CACHE_TTL", "300")),
            async_task_timeout_seconds=int(os.getenv("API_TASK_TIMEOUT", "3600")),
            max_concurrent_tasks=int(os.getenv("API_MAX_CONCURRENT_TASKS", "10")),
            log_level=os.getenv("API_LOG_LEVEL", "INFO"),
            log_api_calls=os.getenv("API_LOG_CALLS", "true").lower() == "true",
            log_sanitize_params=os.getenv("API_LOG_SANITIZE", "true").lower() == "true",
            cors_origins=os.getenv("API_CORS_ORIGINS", "*").split(","),
            comfyui_url=os.getenv("COMFYUI_URL"),
            llm_service_url=os.getenv("LLM_SERVICE_URL"),
        )
    
    def to_dict(self) -> dict:
        """Convert configuration to dictionary."""
        return {
            "version": self.version,
            "host": self.host,
            "port": self.port,
            "enable_auth": self.enable_auth,
            "enable_rate_limiting": self.enable_rate_limiting,
            "rate_limit_requests_per_minute": self.rate_limit_requests_per_minute,
            "cache_ttl_seconds": self.cache_ttl_seconds,
            "async_task_timeout_seconds": self.async_task_timeout_seconds,
            "max_concurrent_tasks": self.max_concurrent_tasks,
            "log_level": self.log_level,
            "log_api_calls": self.log_api_calls,
            "log_sanitize_params": self.log_sanitize_params,
            "cors_origins": self.cors_origins,
            "comfyui_url": self.comfyui_url,
            "llm_service_url": self.llm_service_url,
        }
