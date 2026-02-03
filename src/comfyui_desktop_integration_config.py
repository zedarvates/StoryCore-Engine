"""
ComfyUI Desktop Integration Configuration Management

This module provides configuration management for ComfyUI Desktop integration,
including default values, file loading, environment variable overrides, and validation.

Designed for the ComfyUI Desktop Default Integration feature.
"""

import os
import json
import logging
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import Dict, Any, List, Optional
from enum import Enum


logger = logging.getLogger(__name__)


class FallbackMode(Enum):
    """Fallback mode when ComfyUI Desktop is unavailable"""
    PLACEHOLDER = "placeholder"
    SKIP = "skip"
    ABORT = "abort"


@dataclass
class ComfyUIConfig:
    """
    Configuration for ComfyUI Desktop integration.
    
    This configuration manages connection settings, retry behavior, timeouts,
    and fallback modes for the ComfyUI Desktop backend integration.
    
    Default values are optimized for ComfyUI Desktop running on localhost:8000.
    """
    
    # Connection settings
    host: str = "localhost"
    port: int = 8000
    
    # Timeout settings (in seconds)
    timeout: int = 30
    connection_timeout: int = 10
    generation_timeout: int = 300  # 5 minutes for generation
    
    # Retry settings
    max_retries: int = 3
    retry_backoff: float = 2.0  # Exponential backoff multiplier
    
    # Feature flags
    enable_cors_check: bool = True
    auto_download_models: bool = True
    auto_deploy_workflows: bool = True
    
    # Fallback configuration
    fallback_mode: str = "placeholder"  # "placeholder", "skip", or "abort"
    
    # Health monitoring
    health_check_interval: int = 5  # seconds
    
    # Model management
    models_directory: Optional[str] = None
    workflows_directory: Optional[str] = None
    
    def __post_init__(self):
        """Validate and normalize configuration after initialization"""
        # Normalize fallback_mode to lowercase
        if isinstance(self.fallback_mode, str):
            self.fallback_mode = self.fallback_mode.lower()
    
    @classmethod
    def default(cls) -> 'ComfyUIConfig':
        """
        Create configuration with default values.
        
        Returns:
            ComfyUIConfig with default settings optimized for ComfyUI Desktop
        """
        return cls()
    
    @classmethod
    def from_file(cls, config_path: Path) -> 'ComfyUIConfig':
        """
        Load configuration from JSON file.
        
        Args:
            config_path: Path to configuration JSON file
            
        Returns:
            ComfyUIConfig loaded from file
            
        Raises:
            FileNotFoundError: If configuration file doesn't exist
            json.JSONDecodeError: If file contains invalid JSON
            ValueError: If configuration contains invalid values
        """
        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_dict = json.load(f)
            
            # Create config from dictionary
            config = cls(**config_dict)
            
            # Validate the loaded configuration
            errors = config.validate()
            if errors:
                logger.warning(f"Configuration validation warnings: {errors}")
            
            return config
            
        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(
                f"Invalid JSON in configuration file: {e.msg}",
                e.doc,
                e.pos
            )
        except TypeError as e:
            raise ValueError(f"Invalid configuration parameters: {e}")
    
    @classmethod
    def from_env(cls) -> 'ComfyUIConfig':
        """
        Load configuration from environment variables.
        
        Environment variables:
            COMFYUI_HOST: Override host (default: localhost)
            COMFYUI_PORT: Override port (default: 8000)
            COMFYUI_TIMEOUT: Override timeout in seconds
            COMFYUI_CONNECTION_TIMEOUT: Override connection timeout
            COMFYUI_GENERATION_TIMEOUT: Override generation timeout
            COMFYUI_MAX_RETRIES: Override max retry attempts
            COMFYUI_RETRY_BACKOFF: Override retry backoff multiplier
            COMFYUI_AUTO_DOWNLOAD: Enable/disable auto model download (true/false)
            COMFYUI_AUTO_DEPLOY_WORKFLOWS: Enable/disable auto workflow deployment
            COMFYUI_FALLBACK_MODE: Set fallback mode (placeholder/skip/abort)
            COMFYUI_HEALTH_CHECK_INTERVAL: Override health check interval
            COMFYUI_MODELS_DIRECTORY: Override models directory path
            COMFYUI_WORKFLOWS_DIRECTORY: Override workflows directory path
            
        Returns:
            ComfyUIConfig with values from environment variables
        """
        config = cls.default()
        
        # String values
        if 'COMFYUI_HOST' in os.environ:
            config.host = os.environ['COMFYUI_HOST']
        
        if 'COMFYUI_FALLBACK_MODE' in os.environ:
            config.fallback_mode = os.environ['COMFYUI_FALLBACK_MODE'].lower()
        
        if 'COMFYUI_MODELS_DIRECTORY' in os.environ:
            config.models_directory = os.environ['COMFYUI_MODELS_DIRECTORY']
        
        if 'COMFYUI_WORKFLOWS_DIRECTORY' in os.environ:
            config.workflows_directory = os.environ['COMFYUI_WORKFLOWS_DIRECTORY']
        
        # Integer values
        if 'COMFYUI_PORT' in os.environ:
            try:
                config.port = int(os.environ['COMFYUI_PORT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_PORT value: {os.environ['COMFYUI_PORT']}, using default")
        
        if 'COMFYUI_TIMEOUT' in os.environ:
            try:
                config.timeout = int(os.environ['COMFYUI_TIMEOUT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_TIMEOUT value: {os.environ['COMFYUI_TIMEOUT']}, using default")
        
        if 'COMFYUI_CONNECTION_TIMEOUT' in os.environ:
            try:
                config.connection_timeout = int(os.environ['COMFYUI_CONNECTION_TIMEOUT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_CONNECTION_TIMEOUT value, using default")
        
        if 'COMFYUI_GENERATION_TIMEOUT' in os.environ:
            try:
                config.generation_timeout = int(os.environ['COMFYUI_GENERATION_TIMEOUT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_GENERATION_TIMEOUT value, using default")
        
        if 'COMFYUI_MAX_RETRIES' in os.environ:
            try:
                config.max_retries = int(os.environ['COMFYUI_MAX_RETRIES'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_MAX_RETRIES value, using default")
        
        if 'COMFYUI_HEALTH_CHECK_INTERVAL' in os.environ:
            try:
                config.health_check_interval = int(os.environ['COMFYUI_HEALTH_CHECK_INTERVAL'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_HEALTH_CHECK_INTERVAL value, using default")
        
        # Float values
        if 'COMFYUI_RETRY_BACKOFF' in os.environ:
            try:
                config.retry_backoff = float(os.environ['COMFYUI_RETRY_BACKOFF'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_RETRY_BACKOFF value, using default")
        
        # Boolean values
        if 'COMFYUI_AUTO_DOWNLOAD' in os.environ:
            config.auto_download_models = os.environ['COMFYUI_AUTO_DOWNLOAD'].lower() in ('true', '1', 'yes', 'on')
        
        if 'COMFYUI_AUTO_DEPLOY_WORKFLOWS' in os.environ:
            config.auto_deploy_workflows = os.environ['COMFYUI_AUTO_DEPLOY_WORKFLOWS'].lower() in ('true', '1', 'yes', 'on')
        
        if 'COMFYUI_ENABLE_CORS_CHECK' in os.environ:
            config.enable_cors_check = os.environ['COMFYUI_ENABLE_CORS_CHECK'].lower() in ('true', '1', 'yes', 'on')
        
        # Validate the configuration
        errors = config.validate()
        if errors:
            logger.warning(f"Configuration validation warnings from environment: {errors}")
        
        return config
    
    def validate(self) -> List[str]:
        """
        Validate configuration values.
        
        Returns:
            List of validation error/warning messages. Empty list if all valid.
        """
        errors = []
        
        # Validate host
        if not self.host or not isinstance(self.host, str):
            errors.append("host must be a non-empty string")
        
        # Validate port
        if not isinstance(self.port, int) or not (1 <= self.port <= 65535):
            errors.append(f"port must be between 1 and 65535, got {self.port}")
        
        # Validate timeouts
        if not isinstance(self.timeout, (int, float)) or self.timeout <= 0:
            errors.append(f"timeout must be positive, got {self.timeout}")
        
        if not isinstance(self.connection_timeout, (int, float)) or self.connection_timeout <= 0:
            errors.append(f"connection_timeout must be positive, got {self.connection_timeout}")
        
        if not isinstance(self.generation_timeout, (int, float)) or self.generation_timeout <= 0:
            errors.append(f"generation_timeout must be positive, got {self.generation_timeout}")
        
        # Validate retry settings
        if not isinstance(self.max_retries, int) or self.max_retries < 0:
            errors.append(f"max_retries must be non-negative integer, got {self.max_retries}")
        
        if not isinstance(self.retry_backoff, (int, float)) or self.retry_backoff < 1.0:
            errors.append(f"retry_backoff must be >= 1.0, got {self.retry_backoff}")
        
        # Validate fallback mode
        valid_fallback_modes = ['placeholder', 'skip', 'abort']
        if self.fallback_mode not in valid_fallback_modes:
            errors.append(f"fallback_mode must be one of {valid_fallback_modes}, got '{self.fallback_mode}'")
        
        # Validate health check interval
        if not isinstance(self.health_check_interval, (int, float)) or self.health_check_interval <= 0:
            errors.append(f"health_check_interval must be positive, got {self.health_check_interval}")
        
        # Validate directory paths if provided
        if self.models_directory is not None:
            models_path = Path(self.models_directory)
            if not models_path.exists():
                errors.append(f"models_directory does not exist: {self.models_directory}")
        
        if self.workflows_directory is not None:
            workflows_path = Path(self.workflows_directory)
            if not workflows_path.exists():
                errors.append(f"workflows_directory does not exist: {self.workflows_directory}")
        
        return errors
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert configuration to dictionary.
        
        Returns:
            Dictionary representation of configuration
        """
        return asdict(self)
    
    def save_to_file(self, config_path: Path) -> None:
        """
        Save configuration to JSON file.
        
        Args:
            config_path: Path where configuration should be saved
        """
        # Ensure parent directory exists
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert to dictionary and save
        config_dict = self.to_dict()
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config_dict, f, indent=2)
        
        logger.info(f"Configuration saved to {config_path}")
    
    @property
    def url(self) -> str:
        """
        Get full ComfyUI URL.
        
        Returns:
            Full HTTP URL for ComfyUI backend
        """
        return f"http://{self.host}:{self.port}"
    
    @property
    def websocket_url(self) -> str:
        """
        Get WebSocket URL for ComfyUI.
        
        Returns:
            Full WebSocket URL for ComfyUI backend
        """
        return f"ws://{self.host}:{self.port}/ws"
    
    def get_fallback_mode_enum(self) -> FallbackMode:
        """
        Get fallback mode as enum.
        
        Returns:
            FallbackMode enum value
        """
        mode_map = {
            'placeholder': FallbackMode.PLACEHOLDER,
            'skip': FallbackMode.SKIP,
            'abort': FallbackMode.ABORT
        }
        return mode_map.get(self.fallback_mode, FallbackMode.PLACEHOLDER)


class ConfigurationManager:
    """
    Manages ComfyUI Desktop configuration with precedence handling.
    
    Configuration precedence (highest to lowest):
    1. Environment variables
    2. Configuration file
    3. Default values
    """
    
    def __init__(self, config_dir: Optional[Path] = None):
        """
        Initialize configuration manager.
        
        Args:
            config_dir: Directory for configuration files.
                       Defaults to .storycore/config/
        """
        if config_dir is None:
            config_dir = Path.cwd() / ".storycore" / "config"
        
        self.config_dir = config_dir
        self.config_file = self.config_dir / "comfyui.json"
        self._config: Optional[ComfyUIConfig] = None
    
    def ensure_config_exists(self) -> Path:
        """
        Ensure configuration file exists, creating default if needed.
        
        This method is idempotent - it's safe to call multiple times.
        
        Returns:
            Path to the configuration file
        """
        if not self.config_file.exists():
            self.create_default_config_file()
            logger.info(f"Created default configuration at {self.config_file}")
        return self.config_file
    
    def load_config(self, use_env: bool = True) -> ComfyUIConfig:
        """
        Load configuration with precedence handling.
        
        Precedence order:
        1. Environment variables (if use_env=True)
        2. Configuration file (if exists)
        3. Default values
        
        Args:
            use_env: Whether to apply environment variable overrides
            
        Returns:
            ComfyUIConfig with merged configuration
        """
        # Start with defaults
        config = ComfyUIConfig.default()
        
        # Override with file if exists
        if self.config_file.exists():
            try:
                file_config = ComfyUIConfig.from_file(self.config_file)
                # Merge file config into default
                config = file_config
                logger.info(f"Loaded configuration from {self.config_file}")
            except Exception as e:
                logger.warning(f"Failed to load config from {self.config_file}: {e}")
                logger.info("Using default configuration")
        else:
            logger.info(f"No configuration file found at {self.config_file}, using defaults")
        
        # Override with environment variables if requested
        if use_env:
            # Apply environment variable overrides directly
            env_overrides = self._get_env_overrides()
            for key, value in env_overrides.items():
                setattr(config, key, value)
                logger.debug(f"Applied environment override: {key}={value}")
        
        # Validate final configuration
        errors = config.validate()
        if errors:
            logger.warning(f"Configuration validation issues: {errors}")
            # Use defaults for invalid values
            for error in errors:
                logger.warning(f"Using default for invalid configuration: {error}")
        
        self._config = config
        return config
    
    def _get_env_overrides(self) -> Dict[str, Any]:
        """
        Extract environment variable overrides.
        
        Returns:
            Dictionary of configuration keys and their environment-provided values
        """
        overrides = {}
        
        # String values
        if 'COMFYUI_HOST' in os.environ:
            overrides['host'] = os.environ['COMFYUI_HOST']
        
        if 'COMFYUI_FALLBACK_MODE' in os.environ:
            overrides['fallback_mode'] = os.environ['COMFYUI_FALLBACK_MODE'].lower()
        
        if 'COMFYUI_MODELS_DIRECTORY' in os.environ:
            overrides['models_directory'] = os.environ['COMFYUI_MODELS_DIRECTORY']
        
        if 'COMFYUI_WORKFLOWS_DIRECTORY' in os.environ:
            overrides['workflows_directory'] = os.environ['COMFYUI_WORKFLOWS_DIRECTORY']
        
        # Integer values
        if 'COMFYUI_PORT' in os.environ:
            try:
                overrides['port'] = int(os.environ['COMFYUI_PORT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_PORT value: {os.environ['COMFYUI_PORT']}, ignoring")
        
        if 'COMFYUI_TIMEOUT' in os.environ:
            try:
                overrides['timeout'] = int(os.environ['COMFYUI_TIMEOUT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_TIMEOUT value: {os.environ['COMFYUI_TIMEOUT']}, ignoring")
        
        if 'COMFYUI_CONNECTION_TIMEOUT' in os.environ:
            try:
                overrides['connection_timeout'] = int(os.environ['COMFYUI_CONNECTION_TIMEOUT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_CONNECTION_TIMEOUT value, ignoring")
        
        if 'COMFYUI_GENERATION_TIMEOUT' in os.environ:
            try:
                overrides['generation_timeout'] = int(os.environ['COMFYUI_GENERATION_TIMEOUT'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_GENERATION_TIMEOUT value, ignoring")
        
        if 'COMFYUI_MAX_RETRIES' in os.environ:
            try:
                overrides['max_retries'] = int(os.environ['COMFYUI_MAX_RETRIES'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_MAX_RETRIES value, ignoring")
        
        if 'COMFYUI_HEALTH_CHECK_INTERVAL' in os.environ:
            try:
                overrides['health_check_interval'] = int(os.environ['COMFYUI_HEALTH_CHECK_INTERVAL'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_HEALTH_CHECK_INTERVAL value, ignoring")
        
        # Float values
        if 'COMFYUI_RETRY_BACKOFF' in os.environ:
            try:
                overrides['retry_backoff'] = float(os.environ['COMFYUI_RETRY_BACKOFF'])
            except ValueError:
                logger.warning(f"Invalid COMFYUI_RETRY_BACKOFF value, ignoring")
        
        # Boolean values
        if 'COMFYUI_AUTO_DOWNLOAD' in os.environ:
            overrides['auto_download_models'] = os.environ['COMFYUI_AUTO_DOWNLOAD'].lower() in ('true', '1', 'yes', 'on')
        
        if 'COMFYUI_AUTO_DEPLOY_WORKFLOWS' in os.environ:
            overrides['auto_deploy_workflows'] = os.environ['COMFYUI_AUTO_DEPLOY_WORKFLOWS'].lower() in ('true', '1', 'yes', 'on')
        
        if 'COMFYUI_ENABLE_CORS_CHECK' in os.environ:
            overrides['enable_cors_check'] = os.environ['COMFYUI_ENABLE_CORS_CHECK'].lower() in ('true', '1', 'yes', 'on')
        
        return overrides
        
        self._config = config
        return config
    
    def save_config(self, config: Optional[ComfyUIConfig] = None) -> None:
        """
        Save configuration to file.
        
        Args:
            config: Configuration to save. If None, saves current config.
        """
        if config is None:
            if self._config is None:
                raise ValueError("No configuration to save")
            config = self._config
        
        config.save_to_file(self.config_file)
    
    def create_default_config_file(self) -> None:
        """
        Create default configuration file if it doesn't exist.
        """
        if not self.config_file.exists():
            default_config = ComfyUIConfig.default()
            default_config.save_to_file(self.config_file)
            logger.info(f"Created default configuration file at {self.config_file}")
    
    @property
    def config(self) -> ComfyUIConfig:
        """
        Get current configuration.
        
        Returns:
            Current ComfyUIConfig instance
        """
        if self._config is None:
            return self.load_config()
        return self._config
