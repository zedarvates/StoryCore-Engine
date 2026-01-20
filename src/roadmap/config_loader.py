"""
Configuration loader for the Public Roadmap System.

This module handles loading and merging configuration from multiple sources:
1. Default configuration (from RoadmapConfig dataclass)
2. YAML configuration file (.kiro/roadmap-config.yaml)
3. CLI flag overrides

Configuration precedence (highest to lowest):
- CLI flags
- YAML config file
- Default values
"""

import logging
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

from .models import FeatureStatus, Priority, RoadmapConfig


logger = logging.getLogger(__name__)


class ConfigLoader:
    """
    Loads and merges roadmap configuration from multiple sources.
    
    This class handles:
    - Loading default configuration
    - Reading YAML configuration files
    - Merging configurations with proper precedence
    - Validating configuration values
    """
    
    DEFAULT_CONFIG_PATH = Path(".kiro/roadmap-config.yaml")
    
    @staticmethod
    def load_config(
        config_path: Optional[Path] = None,
        cli_overrides: Optional[Dict[str, Any]] = None
    ) -> RoadmapConfig:
        """
        Load configuration from all sources and merge with proper precedence.
        
        Args:
            config_path: Path to YAML config file (uses default if None)
            cli_overrides: Dictionary of CLI flag overrides
            
        Returns:
            RoadmapConfig object with merged configuration
            
        Example:
            >>> config = ConfigLoader.load_config()
            >>> config = ConfigLoader.load_config(
            ...     config_path=Path("custom-config.yaml"),
            ...     cli_overrides={"output_path": "docs/ROADMAP.md"}
            ... )
        """
        # Start with default configuration
        config_dict = ConfigLoader._get_default_config_dict()
        
        # Load and merge YAML configuration
        yaml_config = ConfigLoader._load_yaml_config(config_path)
        if yaml_config:
            config_dict = ConfigLoader._merge_configs(config_dict, yaml_config)
        
        # Apply CLI overrides
        if cli_overrides:
            config_dict = ConfigLoader._merge_configs(config_dict, cli_overrides)
        
        # Convert to RoadmapConfig object
        return ConfigLoader._dict_to_config(config_dict)
    
    @staticmethod
    def _get_default_config_dict() -> Dict[str, Any]:
        """
        Get default configuration as a dictionary.
        
        Returns:
            Dictionary representation of default RoadmapConfig
        """
        default_config = RoadmapConfig()
        
        return {
            "specs_directory": str(default_config.specs_directory),
            "output_path": str(default_config.output_path),
            "changelog_path": str(default_config.changelog_path),
            "include_future": default_config.include_future,
            "max_description_length": default_config.max_description_length,
            "status_emoji": {
                status.value: emoji
                for status, emoji in default_config.status_emoji.items()
            },
            "priority_emoji": {
                priority.value: emoji
                for priority, emoji in default_config.priority_emoji.items()
            }
        }

    
    @staticmethod
    def _load_yaml_config(config_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
        """
        Load configuration from YAML file.
        
        Args:
            config_path: Path to YAML config file (uses default if None)
            
        Returns:
            Dictionary of configuration values or None if file doesn't exist
        """
        # Use default path if not specified
        if config_path is None:
            config_path = ConfigLoader.DEFAULT_CONFIG_PATH
        
        # Check if file exists
        if not config_path.exists():
            logger.debug("Config file not found: %s (using defaults)", config_path)
            return None
        
        # Load YAML file
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                yaml_config = yaml.safe_load(f)
            
            if not isinstance(yaml_config, dict):
                logger.warning(
                    "Config file %s does not contain a dictionary, ignoring",
                    config_path
                )
                return None
            
            logger.info("Loaded configuration from %s", config_path)
            return yaml_config
            
        except yaml.YAMLError as e:
            logger.error(
                "Failed to parse YAML config file %s: %s",
                config_path,
                e
            )
            return None
        except Exception as e:
            logger.error(
                "Failed to read config file %s: %s",
                config_path,
                e
            )
            return None
    
    @staticmethod
    def _merge_configs(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge two configuration dictionaries.
        
        Override values take precedence over base values.
        Nested dictionaries are merged recursively.
        
        Args:
            base: Base configuration dictionary
            override: Override configuration dictionary
            
        Returns:
            Merged configuration dictionary
        """
        merged = base.copy()
        
        for key, value in override.items():
            if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
                # Recursively merge nested dictionaries
                merged[key] = ConfigLoader._merge_configs(merged[key], value)
            else:
                # Override value
                merged[key] = value
        
        return merged

    
    @staticmethod
    def _dict_to_config(config_dict: Dict[str, Any]) -> RoadmapConfig:
        """
        Convert configuration dictionary to RoadmapConfig object.
        
        Args:
            config_dict: Configuration dictionary
            
        Returns:
            RoadmapConfig object
            
        Raises:
            ValueError: If configuration values are invalid
        """
        # Convert path strings to Path objects
        specs_directory = Path(config_dict.get("specs_directory", ".kiro/specs"))
        output_path = Path(config_dict.get("output_path", "ROADMAP.md"))
        changelog_path = Path(config_dict.get("changelog_path", "CHANGELOG.md"))
        
        # Get boolean and integer values
        include_future = config_dict.get("include_future", True)
        max_description_length = config_dict.get("max_description_length", 300)
        
        # Validate max_description_length
        if not isinstance(max_description_length, int) or max_description_length <= 0:
            logger.warning(
                "Invalid max_description_length: %s, using default (300)",
                max_description_length
            )
            max_description_length = 300
        
        # Convert emoji dictionaries
        status_emoji = ConfigLoader._parse_status_emoji(
            config_dict.get("status_emoji", {})
        )
        priority_emoji = ConfigLoader._parse_priority_emoji(
            config_dict.get("priority_emoji", {})
        )
        
        return RoadmapConfig(
            specs_directory=specs_directory,
            output_path=output_path,
            changelog_path=changelog_path,
            include_future=include_future,
            max_description_length=max_description_length,
            status_emoji=status_emoji,
            priority_emoji=priority_emoji
        )
    
    @staticmethod
    def _parse_status_emoji(emoji_dict: Dict[str, str]) -> Dict[FeatureStatus, str]:
        """
        Parse status emoji dictionary from config.
        
        Args:
            emoji_dict: Dictionary mapping status strings to emoji
            
        Returns:
            Dictionary mapping FeatureStatus enums to emoji
        """
        default_emoji = RoadmapConfig().status_emoji
        result = {}
        
        for status in FeatureStatus:
            # Try to get emoji from config
            emoji = emoji_dict.get(status.value)
            
            if emoji:
                result[status] = emoji
            else:
                # Use default emoji
                result[status] = default_emoji[status]
        
        return result
    
    @staticmethod
    def _parse_priority_emoji(emoji_dict: Dict[str, str]) -> Dict[Priority, str]:
        """
        Parse priority emoji dictionary from config.
        
        Args:
            emoji_dict: Dictionary mapping priority strings to emoji
            
        Returns:
            Dictionary mapping Priority enums to emoji
        """
        default_emoji = RoadmapConfig().priority_emoji
        result = {}
        
        for priority in Priority:
            # Try to get emoji from config
            emoji = emoji_dict.get(priority.value)
            
            if emoji:
                result[priority] = emoji
            else:
                # Use default emoji
                result[priority] = default_emoji[priority]
        
        return result
    
    @staticmethod
    def create_default_config_file(output_path: Optional[Path] = None) -> None:
        """
        Create a default configuration file with all available options.
        
        This is useful for users who want to customize their configuration.
        
        Args:
            output_path: Path where to create the config file (uses default if None)
        """
        if output_path is None:
            output_path = ConfigLoader.DEFAULT_CONFIG_PATH
        
        # Ensure parent directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Create default config content
        config_content = """# Roadmap Generator Configuration
# This file configures the public roadmap generation system.

# Path to internal specs directory
specs_directory: .kiro/specs

# Path for generated ROADMAP.md file
output_path: ROADMAP.md

# Path for generated CHANGELOG.md file
changelog_path: CHANGELOG.md

# Whether to include "Future Considerations" section for undated features
include_future: true

# Maximum length for feature descriptions (in characters)
max_description_length: 300

# Emoji for feature statuses
status_emoji:
  completed: "✅"
  in-progress: "🚧"
  planned: "📋"
  future: "💡"

# Emoji for priority levels
priority_emoji:
  High: "🔴"
  Medium: "🟡"
  Low: "🟢"
"""
        
        # Write to file
        output_path.write_text(config_content, encoding='utf-8')
        logger.info("Created default config file at %s", output_path)
