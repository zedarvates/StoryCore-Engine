"""
Feedback Configuration Manager

Manages configuration settings for the Feedback & Diagnostics module.
Provides default configuration and allows users to customize settings.

Requirements: 7.3
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional


class FeedbackConfig:
    """
    Configuration manager for Feedback & Diagnostics module.
    
    Handles loading, saving, and accessing configuration settings
    from ~/.storycore/config.json
    
    Requirements: 7.3
    """
    
    # Default configuration values
    DEFAULT_CONFIG = {
        "feedback": {
            "backend_proxy_url": "http://localhost:3000",
            "default_mode": "manual",
            "auto_collect_logs": True,
            "max_log_lines": 500,
            "screenshot_max_size_mb": 5,
            "enable_crash_reports": True,
            "privacy_consent_given": False
        }
    }
    
    def __init__(self, config_path: Optional[Path] = None):
        """
        Initialize configuration manager.
        
        Args:
            config_path: Optional custom path to config file.
                        Defaults to ~/.storycore/config.json
        """
        if config_path is None:
            # Use default location: ~/.storycore/config.json
            home_dir = Path.home()
            self.config_dir = home_dir / ".storycore"
            self.config_path = self.config_dir / "config.json"
        else:
            self.config_path = config_path
            self.config_dir = config_path.parent
        
        # Ensure config directory exists
        self._ensure_config_directory()
        
        # Load configuration
        self.config = self._load_config()
    
    def _ensure_config_directory(self) -> None:
        """
        Ensure the configuration directory exists.
        Creates ~/.storycore/ if it doesn't exist.
        """
        try:
            self.config_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Warning: Failed to create config directory: {e}")
    
    def _load_config(self) -> Dict[str, Any]:
        """
        Load configuration from file.
        
        If the file doesn't exist or is invalid, returns default configuration
        and creates the config file with defaults.
        
        Returns:
            Configuration dictionary
        """
        # If config file doesn't exist, create it with defaults
        if not self.config_path.exists():
            print(f"Config file not found at {self.config_path}, creating with defaults...")
            self._save_config(self.DEFAULT_CONFIG)
            return self.DEFAULT_CONFIG.copy()
        
        # Try to load existing config
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Merge with defaults to ensure all keys exist
            merged_config = self._merge_with_defaults(config)
            
            # Save merged config back to file if it was updated
            if merged_config != config:
                self._save_config(merged_config)
            
            return merged_config
        
        except json.JSONDecodeError as e:
            print(f"Warning: Invalid JSON in config file: {e}")
            print("Using default configuration...")
            return self.DEFAULT_CONFIG.copy()
        
        except Exception as e:
            print(f"Warning: Failed to load config file: {e}")
            print("Using default configuration...")
            return self.DEFAULT_CONFIG.copy()
    
    def _merge_with_defaults(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge loaded config with defaults to ensure all keys exist.
        
        Args:
            config: Loaded configuration
        
        Returns:
            Merged configuration with all default keys
        """
        merged = self.DEFAULT_CONFIG.copy()
        
        # Deep merge feedback section
        if "feedback" in config and isinstance(config["feedback"], dict):
            merged["feedback"].update(config["feedback"])
        
        # Preserve other top-level keys from loaded config
        for key, value in config.items():
            if key != "feedback":
                merged[key] = value
        
        return merged
    
    def _save_config(self, config: Dict[str, Any]) -> None:
        """
        Save configuration to file.
        
        Args:
            config: Configuration dictionary to save
        """
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: Failed to save config file: {e}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value from the feedback section.
        
        Args:
            key: Configuration key (e.g., "backend_proxy_url")
            default: Default value if key not found
        
        Returns:
            Configuration value or default
        """
        return self.config.get("feedback", {}).get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """
        Set a configuration value in the feedback section.
        
        Args:
            key: Configuration key
            value: Value to set
        """
        if "feedback" not in self.config:
            self.config["feedback"] = {}
        
        self.config["feedback"][key] = value
        self._save_config(self.config)
    
    def get_all(self) -> Dict[str, Any]:
        """
        Get all feedback configuration values.
        
        Returns:
            Dictionary of all feedback configuration
        """
        return self.config.get("feedback", {}).copy()
    
    def update(self, updates: Dict[str, Any]) -> None:
        """
        Update multiple configuration values at once.
        
        Args:
            updates: Dictionary of key-value pairs to update
        """
        if "feedback" not in self.config:
            self.config["feedback"] = {}
        
        self.config["feedback"].update(updates)
        self._save_config(self.config)
    
    def reset_to_defaults(self) -> None:
        """
        Reset configuration to default values.
        """
        self.config = self.DEFAULT_CONFIG.copy()
        self._save_config(self.config)
    
    # Convenience properties for common settings
    
    @property
    def backend_proxy_url(self) -> str:
        """Get backend proxy URL."""
        return self.get("backend_proxy_url", self.DEFAULT_CONFIG["feedback"]["backend_proxy_url"])
    
    @backend_proxy_url.setter
    def backend_proxy_url(self, value: str) -> None:
        """Set backend proxy URL."""
        self.set("backend_proxy_url", value)
    
    @property
    def default_mode(self) -> str:
        """Get default submission mode (manual/automatic)."""
        return self.get("default_mode", self.DEFAULT_CONFIG["feedback"]["default_mode"])
    
    @default_mode.setter
    def default_mode(self, value: str) -> None:
        """Set default submission mode."""
        if value not in ["manual", "automatic"]:
            raise ValueError("default_mode must be 'manual' or 'automatic'")
        self.set("default_mode", value)
    
    @property
    def auto_collect_logs(self) -> bool:
        """Get auto-collect logs preference."""
        return self.get("auto_collect_logs", self.DEFAULT_CONFIG["feedback"]["auto_collect_logs"])
    
    @auto_collect_logs.setter
    def auto_collect_logs(self, value: bool) -> None:
        """Set auto-collect logs preference."""
        self.set("auto_collect_logs", value)
    
    @property
    def max_log_lines(self) -> int:
        """Get maximum log lines to collect."""
        return self.get("max_log_lines", self.DEFAULT_CONFIG["feedback"]["max_log_lines"])
    
    @max_log_lines.setter
    def max_log_lines(self, value: int) -> None:
        """Set maximum log lines to collect."""
        if value < 0:
            raise ValueError("max_log_lines must be non-negative")
        self.set("max_log_lines", value)
    
    @property
    def screenshot_max_size_mb(self) -> int:
        """Get maximum screenshot size in MB."""
        return self.get("screenshot_max_size_mb", self.DEFAULT_CONFIG["feedback"]["screenshot_max_size_mb"])
    
    @screenshot_max_size_mb.setter
    def screenshot_max_size_mb(self, value: int) -> None:
        """Set maximum screenshot size in MB."""
        if value < 1:
            raise ValueError("screenshot_max_size_mb must be at least 1")
        self.set("screenshot_max_size_mb", value)
    
    @property
    def enable_crash_reports(self) -> bool:
        """Get enable crash reports preference."""
        return self.get("enable_crash_reports", self.DEFAULT_CONFIG["feedback"]["enable_crash_reports"])
    
    @enable_crash_reports.setter
    def enable_crash_reports(self, value: bool) -> None:
        """Set enable crash reports preference."""
        self.set("enable_crash_reports", value)
    
    @property
    def privacy_consent_given(self) -> bool:
        """Get privacy consent status."""
        return self.get("privacy_consent_given", self.DEFAULT_CONFIG["feedback"]["privacy_consent_given"])
    
    @privacy_consent_given.setter
    def privacy_consent_given(self, value: bool) -> None:
        """Set privacy consent status."""
        self.set("privacy_consent_given", value)


# Global configuration instance
_global_config: Optional[FeedbackConfig] = None


def get_config() -> FeedbackConfig:
    """
    Get the global configuration instance.
    
    Creates the instance on first call (lazy initialization).
    
    Returns:
        Global FeedbackConfig instance
    """
    global _global_config
    if _global_config is None:
        _global_config = FeedbackConfig()
    return _global_config


def initialize_config(config_path: Optional[Path] = None) -> FeedbackConfig:
    """
    Initialize the global configuration instance.
    
    This should be called at application startup to ensure
    configuration is loaded early.
    
    Args:
        config_path: Optional custom path to config file
    
    Returns:
        Initialized FeedbackConfig instance
    """
    global _global_config
    _global_config = FeedbackConfig(config_path)
    return _global_config


# Example usage:
if __name__ == "__main__":
    # Initialize configuration
    config = get_config()
    
    # Print current configuration
    print("Current Feedback Configuration:")
    print(json.dumps(config.get_all(), indent=2))
    
    # Example: Update backend URL
    # config.backend_proxy_url = "https://storycore-feedback.example.com/api/v1/report"
    
    # Example: Enable automatic mode by default
    # config.default_mode = "automatic"
    
    # Example: Update privacy consent
    # config.privacy_consent_given = True
