"""
Configuration settings for StoryCore AI Assistant
"""

from pathlib import Path
from typing import Optional
import os
from dataclasses import dataclass


@dataclass
class AssistantConfig:
    """Configuration for the StoryCore AI Assistant"""
    
    # Project directory settings
    project_directory: Path = Path.home() / "Documents" / "StoryCore Projects"
    storage_limit_gb: int = 50
    file_limit: int = 248
    warning_threshold: float = 0.9
    
    # Auto-save settings
    auto_save_interval_seconds: int = 300  # 5 minutes
    backup_count: int = 3
    
    # API settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_rate_limit_requests: int = 100
    api_rate_limit_window_seconds: int = 60
    
    # Authentication settings
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60
    
    # LLM settings
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai")
    llm_api_key: Optional[str] = os.getenv("LLM_API_KEY")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4")
    llm_temperature: float = 0.7
    llm_max_tokens: int = 2000
    
    # Logging settings
    log_level: str = "INFO"
    log_file: Optional[Path] = None
    
    def __post_init__(self):
        """Ensure project directory exists"""
        self.project_directory = Path(self.project_directory)
        self.project_directory.mkdir(parents=True, exist_ok=True)


# Global configuration instance
config = AssistantConfig()
