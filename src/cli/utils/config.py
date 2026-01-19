"""
Configuration management utilities.
Handle project-level and global configuration files with environment variable support.

This module provides comprehensive configuration management including:
- Project-level configuration (.storycore/config.json in project directory)
- Global configuration (~/.storycore/config.json in user home)
- Environment variable overrides (STORYCORE_* prefix)
- Configuration validation and merging
- Configuration profiles for different environments
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ..errors import ConfigurationError, SystemError


def get_config_path(project_path: Optional[str] = None, global_config: bool = False) -> Path:
    """Get configuration file path for project or global config."""
    if global_config:
        # Global config in user home directory
        home_dir = Path.home()
        config_dir = home_dir / ".storycore"
        config_dir.mkdir(exist_ok=True)
        return config_dir / "config.json"
    
    elif project_path:
        # Project-specific config
        project_dir = Path(project_path)
        return project_dir / ".storycore" / "config.json"
    
    else:
        # Current directory project config
        return Path(".storycore") / "config.json"


def load_config(project_path: Optional[str] = None, global_config: bool = False) -> Dict[str, Any]:
    """Load configuration from file."""
    config_path = get_config_path(project_path, global_config)
    
    if not config_path.exists():
        return {}  # Return empty config if file doesn't exist
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        if not isinstance(config, dict):
            raise ConfigurationError(f"Configuration file must contain a JSON object: {config_path}")
        
        return config
        
    except json.JSONDecodeError as e:
        raise ConfigurationError(f"Invalid JSON in configuration file {config_path}: {e}")
    except Exception as e:
        raise SystemError(f"Failed to load configuration from {config_path}: {e}")


def save_config(config: Dict[str, Any], project_path: Optional[str] = None, global_config: bool = False) -> None:
    """Save configuration to file."""
    config_path = get_config_path(project_path, global_config)
    
    # Ensure directory exists
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, sort_keys=True)
            
    except Exception as e:
        raise SystemError(f"Failed to save configuration to {config_path}: {e}")


def merge_configs(project_config: Dict[str, Any], global_config: Dict[str, Any]) -> Dict[str, Any]:
    """Merge project and global configurations, with project taking precedence."""
    merged = global_config.copy()
    
    def deep_merge(base: dict, override: dict) -> dict:
        """Recursively merge dictionaries."""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    return deep_merge(merged, project_config)


def get_merged_config(project_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Get merged configuration from global, project, and environment sources.
    
    Configuration precedence (highest to lowest):
    1. Environment variables (STORYCORE_*)
    2. Project configuration (.storycore/config.json in project)
    3. Global configuration (~/.storycore/config.json)
    
    Args:
        project_path: Optional project path
        
    Returns:
        Dict containing merged configuration
    """
    global_config = load_config(global_config=True)
    project_config = load_config(project_path)
    env_config = get_environment_overrides()
    
    # Merge in order: global < project < environment
    merged = merge_configs(project_config, global_config)
    merged = merge_configs(env_config, merged)
    
    return merged


def validate_config(config: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate configuration structure and values.
    
    Args:
        config: Configuration dictionary to validate
        
    Returns:
        Tuple of (is_valid, error_messages)
    """
    errors = []
    
    # Check it's a dictionary
    if not isinstance(config, dict):
        errors.append("Configuration must be a dictionary")
        return False, errors
    
    # Validate ComfyUI configuration if present
    if "comfyui" in config:
        comfyui_config = config["comfyui"]
        if not isinstance(comfyui_config, dict):
            errors.append("'comfyui' configuration must be a dictionary")
        else:
            # Validate URL format if present
            if "url" in comfyui_config:
                url = comfyui_config["url"]
                if not isinstance(url, str):
                    errors.append("'comfyui.url' must be a string")
                elif not url.startswith(("http://", "https://")):
                    errors.append("'comfyui.url' must start with http:// or https://")
    
    # Validate logging configuration if present
    if "logging" in config:
        logging_config = config["logging"]
        if not isinstance(logging_config, dict):
            errors.append("'logging' configuration must be a dictionary")
        else:
            # Validate log level if present
            if "level" in logging_config:
                level = logging_config["level"]
                valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
                if level not in valid_levels:
                    errors.append(f"'logging.level' must be one of: {', '.join(valid_levels)}")
    
    # Validate general configuration if present
    if "general" in config:
        general_config = config["general"]
        if not isinstance(general_config, dict):
            errors.append("'general' configuration must be a dictionary")
        else:
            # Validate mock_mode if present
            if "mock_mode" in general_config:
                if not isinstance(general_config["mock_mode"], bool):
                    errors.append("'general.mock_mode' must be a boolean")
    
    # Validate profiles if present
    if "profiles" in config:
        profiles = config["profiles"]
        if not isinstance(profiles, dict):
            errors.append("'profiles' must be a dictionary")
        else:
            # Each profile should be a dictionary
            for profile_name, profile_config in profiles.items():
                if not isinstance(profile_config, dict):
                    errors.append(f"Profile '{profile_name}' must be a dictionary")
    
    is_valid = len(errors) == 0
    return is_valid, errors


def get_active_profile() -> str:
    """
    Get the active configuration profile name.
    
    Checks environment variable STORYCORE_PROFILE first, then returns 'default'.
    
    Returns:
        str: Active profile name
    """
    return os.getenv("STORYCORE_PROFILE", "default")


def load_profile_config(profile_name: str, project_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load configuration for a specific profile.
    
    Args:
        profile_name: Name of the profile to load
        project_path: Optional project path for project-specific profiles
        
    Returns:
        Dict containing profile configuration
    """
    # Load base configuration
    config = get_merged_config(project_path)
    
    # Check if profile exists
    if "profiles" in config and profile_name in config["profiles"]:
        profile_config = config["profiles"][profile_name]
        
        # Merge profile config with base config
        return merge_configs(profile_config, config)
    
    # Return base config if profile not found
    return config


def save_profile_config(
    profile_name: str,
    profile_config: Dict[str, Any],
    project_path: Optional[str] = None,
    global_config: bool = False
) -> None:
    """
    Save configuration for a specific profile.
    
    Args:
        profile_name: Name of the profile
        profile_config: Configuration for the profile
        project_path: Optional project path for project-specific profiles
        global_config: Whether to save to global config
    """
    # Load existing config
    config = load_config(project_path, global_config)
    
    # Ensure profiles section exists
    if "profiles" not in config:
        config["profiles"] = {}
    
    # Save profile
    config["profiles"][profile_name] = profile_config
    
    # Save config
    save_config(config, project_path, global_config)


def list_profiles(project_path: Optional[str] = None) -> List[str]:
    """
    List all available configuration profiles.
    
    Args:
        project_path: Optional project path
        
    Returns:
        List of profile names
    """
    config = get_merged_config(project_path)
    
    if "profiles" in config:
        return list(config["profiles"].keys())
    
    return []


def get_environment_overrides() -> Dict[str, Any]:
    """
    Get configuration overrides from environment variables.
    
    Supports the following environment variables:
    - STORYCORE_COMFYUI_URL: ComfyUI server URL
    - STORYCORE_LOG_LEVEL: Logging level (DEBUG, INFO, WARNING, ERROR)
    - STORYCORE_MOCK_MODE: Enable mock mode (true/false)
    - STORYCORE_PROFILE: Active configuration profile
    - STORYCORE_OUTPUT_DIR: Default output directory
    - STORYCORE_CACHE_DIR: Cache directory location
    
    Returns:
        Dict containing environment variable overrides
    """
    env_config = {}
    
    # Define environment variable mappings
    env_mappings = {
        'STORYCORE_COMFYUI_URL': ['comfyui', 'url'],
        'STORYCORE_LOG_LEVEL': ['logging', 'level'],
        'STORYCORE_MOCK_MODE': ['general', 'mock_mode'],
        'STORYCORE_OUTPUT_DIR': ['general', 'output_dir'],
        'STORYCORE_CACHE_DIR': ['general', 'cache_dir'],
        'STORYCORE_MAX_WORKERS': ['general', 'max_workers'],
        'STORYCORE_TIMEOUT': ['general', 'timeout']
    }
    
    for env_var, config_path in env_mappings.items():
        env_value = os.getenv(env_var)
        if env_value:
            # Set nested config value
            current = env_config
            for key in config_path[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
            
            # Convert boolean strings
            if env_value.lower() in ('true', 'false'):
                env_value = env_value.lower() == 'true'
            # Convert integer strings
            elif env_value.isdigit():
                env_value = int(env_value)
            # Convert float strings
            elif env_value.replace('.', '', 1).isdigit():
                env_value = float(env_value)
            
            current[config_path[-1]] = env_value
    
    return env_config


def inspect_config(project_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Inspect and return detailed configuration information for debugging.
    
    Args:
        project_path: Optional project path
        
    Returns:
        Dict containing configuration sources and merged result
    """
    global_config = load_config(global_config=True)
    project_config = load_config(project_path) if project_path else {}
    env_overrides = get_environment_overrides()
    merged_config = get_merged_config(project_path)
    active_profile = get_active_profile()
    
    return {
        "sources": {
            "global": global_config,
            "project": project_config,
            "environment": env_overrides
        },
        "merged": merged_config,
        "active_profile": active_profile,
        "profiles_available": list_profiles(project_path),
        "config_paths": {
            "global": str(get_config_path(global_config=True)),
            "project": str(get_config_path(project_path)) if project_path else None
        }
    }


def create_default_config() -> Dict[str, Any]:
    """
    Create a default configuration structure.
    
    Returns:
        Dict containing default configuration
    """
    return {
        "comfyui": {
            "url": "http://127.0.0.1:8188",
            "timeout": 300,
            "retry_attempts": 3
        },
        "logging": {
            "level": "INFO",
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        },
        "general": {
            "mock_mode": False,
            "output_dir": "exports",
            "cache_dir": "cache",
            "max_workers": 4,
            "timeout": 600
        },
        "profiles": {
            "default": {
                "description": "Default production configuration"
            },
            "development": {
                "description": "Development configuration with mock mode",
                "general": {
                    "mock_mode": True
                },
                "logging": {
                    "level": "DEBUG"
                }
            },
            "production": {
                "description": "Production configuration with optimizations",
                "general": {
                    "mock_mode": False,
                    "max_workers": 8
                },
                "logging": {
                    "level": "WARNING"
                }
            }
        }
    }


def initialize_config(project_path: Optional[str] = None, global_config: bool = False) -> None:
    """
    Initialize configuration with default values if it doesn't exist.
    
    Args:
        project_path: Optional project path
        global_config: Whether to initialize global config
    """
    config_path = get_config_path(project_path, global_config)
    
    if not config_path.exists():
        default_config = create_default_config()
        save_config(default_config, project_path, global_config)
