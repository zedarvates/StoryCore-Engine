"""
Configuration management for end-to-end project creation.

Handles loading, validation, and access to configuration settings.
"""

import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from src.end_to_end.data_models import OrchestratorConfig


class ConfigurationManager:
    """Manages configuration for the end-to-end workflow"""
    
    DEFAULT_CONFIG = {
        "projects_directory": "~/Documents/StoryCore Projects",
        "comfyui_backend_url": "http://localhost:8188",
        "storycore_cli_path": "storycore.py",
        "default_quality_tier": "preview",
        "max_retry_attempts": 3,
        "checkpoint_enabled": True,
        "auto_cleanup_enabled": True,
        "parallel_generation": True,
        "max_concurrent_shots": 4
    }
    
    def __init__(self, config_path: Optional[Path] = None):
        """
        Initialize configuration manager.
        
        Args:
            config_path: Path to configuration file (optional)
        """
        self.config_path = config_path or Path("storycore_config.json")
        self.config = self._load_config()
    
    def _load_config(self) -> OrchestratorConfig:
        """Load configuration from file or environment"""
        config_dict = self.DEFAULT_CONFIG.copy()
        
        # Load from file if exists
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    file_config = json.load(f)
                    config_dict.update(file_config)
            except Exception as e:
                print(f"Warning: Could not load config file: {e}")
        
        # Override with environment variables
        env_overrides = {
            "projects_directory": os.getenv("STORYCORE_PROJECTS_DIR"),
            "comfyui_backend_url": os.getenv("COMFYUI_BACKEND_URL"),
            "storycore_cli_path": os.getenv("STORYCORE_CLI_PATH"),
        }
        
        for key, value in env_overrides.items():
            if value is not None:
                config_dict[key] = value
        
        # Expand paths
        config_dict["projects_directory"] = os.path.expanduser(
            config_dict["projects_directory"]
        )
        
        return OrchestratorConfig(**config_dict)
    
    def save_config(self, config_path: Optional[Path] = None) -> bool:
        """
        Save current configuration to file.
        
        Args:
            config_path: Path to save configuration (optional)
            
        Returns:
            True if successful, False otherwise
        """
        save_path = config_path or self.config_path
        
        try:
            config_dict = {
                "projects_directory": self.config.projects_directory,
                "comfyui_backend_url": self.config.comfyui_backend_url,
                "storycore_cli_path": self.config.storycore_cli_path,
                "default_quality_tier": self.config.default_quality_tier,
                "max_retry_attempts": self.config.max_retry_attempts,
                "checkpoint_enabled": self.config.checkpoint_enabled,
                "auto_cleanup_enabled": self.config.auto_cleanup_enabled,
                "parallel_generation": self.config.parallel_generation,
                "max_concurrent_shots": self.config.max_concurrent_shots,
            }
            
            with open(save_path, 'w') as f:
                json.dump(config_dict, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving config: {e}")
            return False
    
    def get_config(self) -> OrchestratorConfig:
        """Get current configuration"""
        return self.config
    
    def update_config(self, updates: Dict[str, Any]) -> None:
        """
        Update configuration with new values.
        
        Args:
            updates: Dictionary of configuration updates
        """
        for key, value in updates.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
    
    def validate_config(self) -> tuple:
        """
        Validate configuration.
        
        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []
        
        # Check projects directory
        projects_dir = Path(self.config.projects_directory)
        if not projects_dir.exists():
            try:
                projects_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                errors.append(f"Cannot create projects directory: {e}")
        
        # Check CLI path
        cli_path = Path(self.config.storycore_cli_path)
        if not cli_path.exists() and not cli_path.is_absolute():
            # Try to find it in current directory
            if not Path.cwd().joinpath(cli_path).exists():
                errors.append(f"StoryCore CLI not found at: {cli_path}")
        
        # Validate numeric values
        if self.config.max_retry_attempts < 1:
            errors.append("max_retry_attempts must be >= 1")
        
        if self.config.max_concurrent_shots < 1:
            errors.append("max_concurrent_shots must be >= 1")
        
        return (len(errors) == 0, errors)
