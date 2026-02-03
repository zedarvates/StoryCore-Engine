"""
Configuration management for the fact-checking system.

This module handles loading, validating, and managing configuration settings
for the fact-checking system. It supports:
- JSON Schema validation for config files
- Environment-specific configurations (development, production)
- Safe defaults for invalid configurations
- Configuration file discovery and loading

Requirements: 10.1, 10.2, 10.7, 10.8
"""

import json
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import asdict

from .models import Configuration
from .schemas import CONFIG_SCHEMA
from .validators import validate_configuration


logger = logging.getLogger(__name__)


class ConfigurationError(Exception):
    """Raised when configuration loading or validation fails."""
    pass


class ConfigurationManager:
    """
    Manages configuration loading, validation, and access.
    
    The ConfigurationManager handles:
    - Loading configuration from JSON files
    - Validating configuration against JSON Schema
    - Providing safe defaults for invalid settings
    - Supporting environment-specific configurations
    - Logging configuration issues
    """
    
    DEFAULT_CONFIG_FILENAME = "fact_checker_config.json"
    VALID_ENVIRONMENTS = ["development", "production", "testing"]
    
    def __init__(self, config_path: Optional[str] = None, environment: str = "production"):
        """
        Initialize the configuration manager.
        
        Args:
            config_path: Optional path to configuration file
            environment: Environment name (development, production, testing)
        """
        self.environment = environment if environment in self.VALID_ENVIRONMENTS else "production"
        self.config_path = config_path
        self._config: Optional[Configuration] = None
        self._raw_config: Optional[Dict[str, Any]] = None
        
    def load_config(self, config_path: Optional[str] = None) -> Configuration:
        """
        Load configuration from file with validation and safe defaults.
        
        This method:
        1. Discovers configuration file if not specified
        2. Loads and parses JSON
        3. Validates against JSON Schema
        4. Applies environment-specific overrides
        5. Falls back to safe defaults for invalid settings
        6. Logs warnings for configuration issues
        
        Args:
            config_path: Optional path to configuration file
            
        Returns:
            Configuration object with validated settings
            
        Raises:
            ConfigurationError: If configuration file cannot be read
        """
        # Use provided path or discover config file
        path = config_path or self.config_path or self._discover_config_file()
        
        if path and os.path.exists(path):
            try:
                self._raw_config = self._load_json_file(path)
                logger.info(f"Loaded configuration from {path}")
            except Exception as e:
                logger.warning(f"Failed to load configuration from {path}: {e}")
                logger.warning("Using default configuration")
                self._raw_config = {}
        else:
            logger.info("No configuration file found, using defaults")
            self._raw_config = {}
        
        # Validate configuration
        validation_errors = self._validate_config(self._raw_config)
        if validation_errors:
            logger.warning(f"Configuration validation errors found:")
            for error in validation_errors:
                logger.warning(f"  - {error}")
            logger.warning("Invalid settings will use default values")
        
        # Apply environment-specific overrides
        if self.environment in self._raw_config.get("environments", {}):
            env_config = self._raw_config["environments"][self.environment]
            logger.info(f"Applying {self.environment} environment overrides")
            self._raw_config.update(env_config)
        
        # Build configuration with safe defaults
        self._config = self._build_config_with_defaults(self._raw_config)
        
        return self._config
    
    def get_config(self) -> Configuration:
        """
        Get the current configuration.
        
        If configuration hasn't been loaded yet, loads it with defaults.
        
        Returns:
            Configuration object
        """
        if self._config is None:
            self._config = self.load_config()
        return self._config
    
    def reload_config(self) -> Configuration:
        """
        Reload configuration from file.
        
        Returns:
            Reloaded Configuration object
        """
        self._config = None
        return self.load_config()
    
    def save_config(self, config: Configuration, path: Optional[str] = None) -> None:
        """
        Save configuration to file.
        
        Args:
            config: Configuration object to save
            path: Optional path to save to (defaults to current config path)
            
        Raises:
            ConfigurationError: If configuration cannot be saved
        """
        save_path = path or self.config_path or self.DEFAULT_CONFIG_FILENAME
        
        try:
            config_dict = asdict(config)
            with open(save_path, 'w') as f:
                json.dump(config_dict, f, indent=2)
            logger.info(f"Configuration saved to {save_path}")
        except Exception as e:
            raise ConfigurationError(f"Failed to save configuration: {e}")
    
    def _discover_config_file(self) -> Optional[str]:
        """
        Discover configuration file in standard locations.
        
        Searches in order:
        1. Current directory
        2. Project root (if in src/ subdirectory)
        3. User home directory
        
        Returns:
            Path to configuration file if found, None otherwise
        """
        search_paths = [
            Path.cwd() / self.DEFAULT_CONFIG_FILENAME,
            Path.cwd().parent / self.DEFAULT_CONFIG_FILENAME,  # For src/ subdirectory
            Path.home() / ".config" / "fact_checker" / self.DEFAULT_CONFIG_FILENAME,
        ]
        
        for path in search_paths:
            if path.exists():
                logger.debug(f"Found configuration file at {path}")
                return str(path)
        
        return None
    
    def _load_json_file(self, path: str) -> Dict[str, Any]:
        """
        Load and parse JSON file.
        
        Args:
            path: Path to JSON file
            
        Returns:
            Parsed JSON as dictionary
            
        Raises:
            ConfigurationError: If file cannot be read or parsed
        """
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise ConfigurationError(f"Invalid JSON in configuration file: {e}")
        except Exception as e:
            raise ConfigurationError(f"Failed to read configuration file: {e}")
    
    def _validate_config(self, config: Dict[str, Any]) -> List[str]:
        """
        Validate configuration against JSON Schema.
        
        Args:
            config: Configuration dictionary to validate
            
        Returns:
            List of validation error messages (empty if valid)
        """
        result = validate_configuration(config)
        if result.is_valid:
            return []
        return result.errors
    
    def _build_config_with_defaults(self, raw_config: Dict[str, Any]) -> Configuration:
        """
        Build Configuration object with safe defaults for invalid settings.
        
        This method validates each setting individually and falls back to
        defaults for invalid values, logging warnings for each issue.
        
        Args:
            raw_config: Raw configuration dictionary
            
        Returns:
            Configuration object with validated settings
        """
        # Start with default configuration
        default_config = Configuration()
        
        # Confidence threshold
        confidence_threshold = self._validate_confidence_threshold(
            raw_config.get("confidence_threshold", default_config.confidence_threshold)
        )
        
        # Risk level mappings
        risk_level_mappings = self._validate_risk_level_mappings(
            raw_config.get("risk_level_mappings", default_config.risk_level_mappings)
        )
        
        # Trusted sources
        trusted_sources = self._validate_trusted_sources(
            raw_config.get("trusted_sources", default_config.trusted_sources)
        )
        
        # Custom domains
        custom_domains = self._validate_custom_domains(
            raw_config.get("custom_domains", default_config.custom_domains)
        )
        
        # Cache settings
        cache_enabled = self._validate_boolean(
            raw_config.get("cache_enabled", default_config.cache_enabled),
            "cache_enabled"
        )
        
        cache_ttl_seconds = self._validate_positive_int(
            raw_config.get("cache_ttl_seconds", default_config.cache_ttl_seconds),
            "cache_ttl_seconds"
        )
        
        # Concurrency and timeout settings
        max_concurrent_verifications = self._validate_positive_int(
            raw_config.get("max_concurrent_verifications", default_config.max_concurrent_verifications),
            "max_concurrent_verifications"
        )
        
        timeout_seconds = self._validate_positive_int(
            raw_config.get("timeout_seconds", default_config.timeout_seconds),
            "timeout_seconds"
        )
        
        return Configuration(
            confidence_threshold=confidence_threshold,
            risk_level_mappings=risk_level_mappings,
            trusted_sources=trusted_sources,
            custom_domains=custom_domains,
            cache_enabled=cache_enabled,
            cache_ttl_seconds=cache_ttl_seconds,
            max_concurrent_verifications=max_concurrent_verifications,
            timeout_seconds=timeout_seconds
        )
    
    def _validate_confidence_threshold(self, value: Any) -> float:
        """Validate confidence threshold (0-100)."""
        default = 70.0
        
        if not isinstance(value, (int, float)):
            logger.warning(f"confidence_threshold: Expected number, got {type(value).__name__}. Using default: {default}")
            return default
        
        if not 0 <= value <= 100:
            logger.warning(f"confidence_threshold: Value {value} out of range [0, 100]. Using default: {default}")
            return default
        
        return float(value)
    
    def _validate_risk_level_mappings(self, value: Any) -> Dict[str, Tuple[float, float]]:
        """Validate risk level mappings."""
        default = {
            "critical": (0, 30),
            "high": (30, 50),
            "medium": (50, 70),
            "low": (70, 100)
        }
        
        if not isinstance(value, dict):
            logger.warning(f"risk_level_mappings: Expected object, got {type(value).__name__}. Using defaults")
            return default
        
        # Validate each mapping
        valid_mappings = {}
        for level, range_tuple in value.items():
            if not isinstance(range_tuple, (list, tuple)) or len(range_tuple) != 2:
                logger.warning(f"risk_level_mappings.{level}: Expected [min, max] tuple. Skipping")
                continue
            
            min_val, max_val = range_tuple
            if not isinstance(min_val, (int, float)) or not isinstance(max_val, (int, float)):
                logger.warning(f"risk_level_mappings.{level}: Expected numeric values. Skipping")
                continue
            
            if not (0 <= min_val <= 100 and 0 <= max_val <= 100 and min_val < max_val):
                logger.warning(f"risk_level_mappings.{level}: Invalid range [{min_val}, {max_val}]. Skipping")
                continue
            
            valid_mappings[level] = (float(min_val), float(max_val))
        
        # If no valid mappings, use defaults
        if not valid_mappings:
            logger.warning("risk_level_mappings: No valid mappings found. Using defaults")
            return default
        
        return valid_mappings
    
    def _validate_trusted_sources(self, value: Any) -> Dict[str, List[str]]:
        """Validate trusted sources dictionary."""
        default = {}
        
        if not isinstance(value, dict):
            logger.warning(f"trusted_sources: Expected object, got {type(value).__name__}. Using defaults")
            return default
        
        # Validate each domain's sources
        valid_sources = {}
        for domain, sources in value.items():
            if not isinstance(sources, list):
                logger.warning(f"trusted_sources.{domain}: Expected list, got {type(sources).__name__}. Skipping")
                continue
            
            # Filter to string sources only
            string_sources = [s for s in sources if isinstance(s, str)]
            if len(string_sources) != len(sources):
                logger.warning(f"trusted_sources.{domain}: Some non-string sources removed")
            
            if string_sources:
                valid_sources[domain] = string_sources
        
        return valid_sources
    
    def _validate_custom_domains(self, value: Any) -> List[str]:
        """Validate custom domains list."""
        default = []
        
        if not isinstance(value, list):
            logger.warning(f"custom_domains: Expected list, got {type(value).__name__}. Using defaults")
            return default
        
        # Filter to string domains only
        string_domains = [d for d in value if isinstance(d, str)]
        if len(string_domains) != len(value):
            logger.warning(f"custom_domains: Some non-string domains removed")
        
        return string_domains
    
    def _validate_boolean(self, value: Any, field_name: str) -> bool:
        """Validate boolean field."""
        if not isinstance(value, bool):
            default = True if field_name == "cache_enabled" else False
            logger.warning(f"{field_name}: Expected boolean, got {type(value).__name__}. Using default: {default}")
            return default
        return value
    
    def _validate_positive_int(self, value: Any, field_name: str) -> int:
        """Validate positive integer field."""
        defaults = {
            "cache_ttl_seconds": 86400,
            "max_concurrent_verifications": 5,
            "timeout_seconds": 60
        }
        default = defaults.get(field_name, 60)
        
        if not isinstance(value, int):
            logger.warning(f"{field_name}: Expected integer, got {type(value).__name__}. Using default: {default}")
            return default
        
        if value <= 0:
            logger.warning(f"{field_name}: Expected positive value, got {value}. Using default: {default}")
            return default
        
        return value


# Global configuration manager instance
_config_manager: Optional[ConfigurationManager] = None


def get_config_manager(
    config_path: Optional[str] = None,
    environment: Optional[str] = None
) -> ConfigurationManager:
    """
    Get or create the global configuration manager instance.
    
    Args:
        config_path: Optional path to configuration file
        environment: Optional environment name
        
    Returns:
        ConfigurationManager instance
    """
    global _config_manager
    
    if _config_manager is None:
        env = environment or os.getenv("FACT_CHECKER_ENV", "production")
        _config_manager = ConfigurationManager(config_path=config_path, environment=env)
    
    return _config_manager


def load_config(config_path: Optional[str] = None) -> Configuration:
    """
    Load configuration using the global configuration manager.
    
    Args:
        config_path: Optional path to configuration file
        
    Returns:
        Configuration object
    """
    manager = get_config_manager(config_path=config_path)
    return manager.load_config(config_path)


def get_config() -> Configuration:
    """
    Get the current configuration.
    
    Returns:
        Configuration object
    """
    manager = get_config_manager()
    return manager.get_config()
