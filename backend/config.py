"""
Centralized Configuration for StoryCore Engine
==============================================

This module provides a centralized configuration management system using Pydantic BaseSettings.
All service URLs, database connections, and feature flags should be configured here.

Environment Variables:
    API_URL - Backend API URL (default: http://localhost:8080)
    JWT_SECRET - Secret key for JWT tokens
    DATABASE_URL - PostgreSQL connection string
    OLLAMA_URL - Ollama LLM service URL
    OLLAMA_MODEL - Default Ollama model to use
    COMFYUI_URL - ComfyUI service URL
    REDIS_URL - Redis connection URL
    GITHUB_TOKEN - GitHub API token (optional)
    USE_MOCK_LLM - Use mock LLM responses instead of real API
    DEBUG - Enable debug mode

Usage:
    from backend.config import settings
    
    # Access configuration
    print(settings.OLLAMA_BASE_URL)
    print(settings.DATABASE_URL)
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    """
    StoryCore Engine Settings
    
    All configuration values are loaded from environment variables or .env file.
    Defaults are provided for local development.
    """
    
    # =======================
    # API Server Configuration
    # =======================
    API_HOST: str = Field(default="0.0.0.0", description="Host to bind API server")
    API_PORT: int = Field(default=8080, description="Port for API server")
    API_URL: str = Field(default="http://localhost:8080", description="Full API URL")
    API_VERSION: str = Field(default="v1", description="API version prefix")
    
    # =======================
    # JWT Authentication
    # =======================
    # SECURITY: JWT_SECRET must be set via environment variable in production
    # The default None ensures we fail fast if not configured properly
    JWT_SECRET: Optional[str] = Field(
        default=None,
        description="Secret key for JWT token generation (MUST be set in production)"
    )
    
    def get_jwt_secret(self) -> str:
        """
        Get JWT secret with production safety check.
        
        Returns:
            str: JWT secret key
            
        Raises:
            ValueError: If JWT_SECRET is not set (required for production)
        """
        if not self.JWT_SECRET:
            # Allow None only in development mode with explicit warning
            if self.is_development():
                import warnings
                warnings.warn(
                    "JWT_SECRET not set. Using insecure default for development only. "
                    "Set JWT_SECRET environment variable for production!",
                    UserWarning
                )
                return "dev-only-insecure-secret-key-do-not-use-in-production"
            raise ValueError(
                "JWT_SECRET environment variable must be set for production use. "
                "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        return self.JWT_SECRET
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Token expiration time")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, description="Refresh token expiration")
    
    # =======================
    # Database Configuration
    # =======================
    DATABASE_URL: str = Field(
        default="postgresql://user:password@localhost/video_editor",
        description="PostgreSQL connection URL"
    )
    DATABASE_POOL_SIZE: int = Field(default=10, description="Connection pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=20, description="Max overflow connections")
    
    # =======================
    # Redis Configuration
    # =======================
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    REDIS_DB: int = Field(default=0, description="Redis database number")
    
    # =======================
    # Ollama LLM Configuration
    # =======================
    OLLAMA_BASE_URL: str = Field(
        default="http://localhost:11434",
        description="Ollama LLM service base URL"
    )
    OLLAMA_MODEL: str = Field(
        default="qwen3:8b",
        description="Default Ollama model"
    )
    OLLAMA_TIMEOUT: int = Field(
        default=300,
        description="Ollama request timeout in seconds"
    )
    OLLAMA_EMBEDDING_MODEL: str = Field(
        default="nomic-embed-text",
        description="Embedding model for vector operations"
    )
    
    # =======================
    # ComfyUI Configuration
    # =======================
    COMFYUI_BASE_URL: str = Field(
        default="http://127.0.0.1:7860",
        description="ComfyUI service base URL"
    )
    COMFYUI_TIMEOUT: int = Field(
        default=600,
        description="ComfyUI request timeout in seconds"
    )
    COMFYUI_WORKFLOW_FOLDER: str = Field(
        default="workflows",
        description="Folder for ComfyUI workflows"
    )
    
    # =======================
    # GitHub API Configuration
    # =======================
    GITHUB_API_TOKEN: Optional[str] = Field(
        default=None,
        description="GitHub API token for authenticated requests"
    )
    GITHUB_API_URL: str = Field(
        default="https://api.github.com",
        description="GitHub API base URL"
    )
    GITHUB_ORG: Optional[str] = Field(
        default=None,
        description="GitHub organization name"
    )
    GITHUB_REPO: Optional[str] = Field(
        default=None,
        description="GitHub repository name"
    )
    
    # =======================
    # Feature Flags
    # =======================
    USE_MOCK_LLM: bool = Field(
        default=False,
        description="Use mock LLM responses instead of real API"
    )
    USE_MOCK_COMFYUI: bool = Field(
        default=False,
        description="Use mock ComfyUI responses"
    )
    USE_MOCK_REDIS: bool = Field(
        default=False,
        description="Use mock Redis (for testing)"
    )
    DEBUG: bool = Field(
        default=False,
        description="Enable debug mode with verbose logging"
    )
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level (DEBUG, INFO, WARNING, ERROR)"
    )
    
    # =======================
    # CORS Configuration
    # =======================
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173",
        description="Comma-separated list of allowed CORS origins"
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        description="Allow credentials in CORS requests"
    )
    
    # =======================
    # File Storage Configuration
    # =======================
    UPLOAD_FOLDER: str = Field(
        default="uploads",
        description="Folder for uploaded files"
    )
    OUTPUT_FOLDER: str = Field(
        default="output",
        description="Folder for generated output"
    )
    MAX_UPLOAD_SIZE: int = Field(
        default=100 * 1024 * 1024,  # 100MB
        description="Maximum upload size in bytes"
    )
    
    # =======================
    # Audio/Video Processing
    # =======================
    AUDIO_SAMPLE_RATE: int = Field(
        default=44100,
        description="Audio sample rate"
    )
    VIDEO_QUALITY: str = Field(
        default="high",
        description="Video quality preset"
    )
    FFMPEG_PATH: Optional[str] = Field(
        default=None,
        description="Custom FFmpeg path"
    )
    
    # Audio/Video timeouts
    AUDIO_GENERATION_TIMEOUT: int = Field(
        default=300,
        description="Timeout for audio generation in seconds"
    )
    AUDIO_MIX_TIMEOUT: int = Field(
        default=180,
        description="Timeout for audio mixing in seconds"
    )
    VIDEO_EXPORT_TIMEOUT: int = Field(
        default=1800,
        description="Timeout for video export in seconds"
    )
    
    # =======================
    # Rate Limiting
    # =======================
    RATE_LIMIT_ENABLED: bool = Field(
        default=True,
        description="Enable rate limiting"
    )
    RATE_LIMIT_REQUESTS: int = Field(
        default=100,
        description="Maximum requests per window"
    )
    RATE_LIMIT_WINDOW: int = Field(
        default=60,
        description="Rate limit window in seconds"
    )
    
    class Config:
        """Pydantic configuration"""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        validate_assignment = True
        extra = "ignore"  # Ignore extra environment variables
    
    def get_cors_origins_list(self) -> list:
        """Parse CORS_ORIGINS string into a list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.DEBUG or "localhost" in self.API_URL
    
    def get_database_driver(self) -> str:
        """Get database driver from DATABASE_URL"""
        if "postgresql" in self.DATABASE_URL:
            return "postgresql"
        elif "sqlite" in self.DATABASE_URL:
            return "sqlite"
        return "unknown"


# Global settings instance
settings = Settings()


def reload_settings() -> Settings:
    """
    Reload settings from environment variables.
    Useful when environment variables change at runtime.
    """
    return Settings()


# Convenience functions for common operations
def get_ollama_url(endpoint: str = "") -> str:
    """Get full Ollama URL for an endpoint"""
    base = settings.OLLAMA_BASE_URL.rstrip("/")
    return f"{base}/{endpoint.lstrip('/')}" if endpoint else base


def get_comfyui_url(endpoint: str = "") -> str:
    """Get full ComfyUI URL for an endpoint"""
    base = settings.COMFYUI_BASE_URL.rstrip("/")
    return f"{base}/{endpoint.lstrip('/')}" if endpoint else base


def get_api_url(endpoint: str = "") -> str:
    """Get full API URL for an endpoint"""
    base = settings.API_URL.rstrip("/")
    return f"{base}/{endpoint.lstrip('/')}" if endpoint else base


def get_redis_url() -> str:
    """Get Redis connection URL"""
    return settings.REDIS_URL


def get_database_url() -> str:
    """Get database connection URL"""
    return settings.DATABASE_URL


def get_github_api_url(endpoint: str = "") -> str:
    """Get full GitHub API URL for an endpoint"""
    base = settings.GITHUB_API_URL.rstrip("/")
    return f"{base}/{endpoint.lstrip('/')}" if endpoint else base


# Export commonly used settings
__all__ = [
    "settings",
    "Settings",
    "reload_settings",
    "get_ollama_url",
    "get_comfyui_url",
    "get_api_url",
    "get_redis_url",
    "get_database_url",
    "get_github_api_url",
]
