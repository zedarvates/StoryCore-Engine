"""
ComfyUI Configuration Management
Handles configuration for ComfyUI integration with flexible environment support.
"""

import os
import json
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional
import platform


@dataclass
class ComfyUIConfig:
    """Configuration for ComfyUI service integration."""
    
    # Service configuration
    installation_path: Path
    server_host: str = "127.0.0.1"
    server_port: int = 8188
    startup_timeout: float = 60.0
    health_check_interval: float = 5.0
    max_retry_attempts: int = 3
    
    # Process management
    process_timeout: float = 300.0  # 5 minutes for generation
    graceful_shutdown_timeout: float = 30.0
    force_kill_timeout: float = 10.0
    
    # Performance settings
    enable_gpu: bool = True
    memory_limit_gb: Optional[float] = None
    worker_threads: int = 1
    
    # Logging and monitoring
    log_level: str = "INFO"
    enable_metrics: bool = True
    metrics_interval: float = 10.0
    
    @classmethod
    def default(cls) -> 'ComfyUIConfig':
        """Create default configuration."""
        default_path = Path("C:\\storycore-engine\\comfyui_portable")
        
        # Adjust for different platforms
        if platform.system() != "Windows":
            default_path = Path.home() / "comfyui_portable"
        
        return cls(installation_path=default_path)
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> 'ComfyUIConfig':
        """Create configuration from dictionary."""
        # Convert path strings to Path objects
        if 'installation_path' in config_dict:
            config_dict['installation_path'] = Path(config_dict['installation_path'])
        
        return cls(**config_dict)
    
    @classmethod
    def from_file(cls, config_path: Path) -> 'ComfyUIConfig':
        """Load configuration from JSON file."""
        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        
        with open(config_path, 'r') as f:
            config_dict = json.load(f)
        
        return cls.from_dict(config_dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        config_dict = asdict(self)
        # Convert Path objects to strings for JSON serialization
        config_dict['installation_path'] = str(self.installation_path)
        return config_dict
    
    def save_to_file(self, config_path: Path) -> None:
        """Save configuration to JSON file."""
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(config_path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    def validate(self) -> Dict[str, str]:
        """Validate configuration and return any errors."""
        errors = {}
        
        # Validate installation path
        if not self.installation_path.exists():
            errors['installation_path'] = f"ComfyUI installation path does not exist: {self.installation_path}"
        
        # Validate network settings
        if not (1 <= self.server_port <= 65535):
            errors['server_port'] = f"Invalid port number: {self.server_port}"
        
        # Validate timeouts
        if self.startup_timeout <= 0:
            errors['startup_timeout'] = "Startup timeout must be positive"
        
        if self.health_check_interval <= 0:
            errors['health_check_interval'] = "Health check interval must be positive"
        
        # Validate retry attempts
        if self.max_retry_attempts < 0:
            errors['max_retry_attempts'] = "Max retry attempts cannot be negative"
        
        # Validate memory limit
        if self.memory_limit_gb is not None and self.memory_limit_gb <= 0:
            errors['memory_limit_gb'] = "Memory limit must be positive"
        
        # Validate log level
        valid_log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if self.log_level not in valid_log_levels:
            errors['log_level'] = f"Invalid log level: {self.log_level}. Must be one of {valid_log_levels}"
        
        return errors
    
    @property
    def server_url(self) -> str:
        """Get the HTTP server URL."""
        return f"http://{self.server_host}:{self.server_port}"
    
    @property
    def websocket_url(self) -> str:
        """Get the WebSocket server URL."""
        return f"ws://{self.server_host}:{self.server_port}/ws"
    
    @property
    def executable_path(self) -> Path:
        """Get the path to the ComfyUI executable."""
        if platform.system() == "Windows":
            return self.installation_path / "python_embeded" / "python.exe"
        else:
            return self.installation_path / "python" / "bin" / "python"
    
    @property
    def main_script_path(self) -> Path:
        """Get the path to the main ComfyUI script."""
        return self.installation_path / "main.py"


@dataclass
class ControlNetConfig:
    """Configuration for ControlNet conditioning."""
    
    model_name: str
    strength: float = 1.0
    preprocessing: bool = True
    control_image_path: Optional[Path] = None
    
    def validate(self) -> Dict[str, str]:
        """Validate ControlNet configuration."""
        errors = {}
        
        if not (0.0 <= self.strength <= 2.0):
            errors['strength'] = f"ControlNet strength must be between 0.0 and 2.0, got {self.strength}"
        
        if self.control_image_path and not self.control_image_path.exists():
            errors['control_image_path'] = f"Control image not found: {self.control_image_path}"
        
        return errors


@dataclass
class IPAdapterConfig:
    """Configuration for IP-Adapter conditioning."""
    
    model_name: str
    reference_image_path: Path
    weight: float = 0.7
    noise: float = 0.0
    
    def validate(self) -> Dict[str, str]:
        """Validate IP-Adapter configuration."""
        errors = {}
        
        if not (0.0 <= self.weight <= 2.0):
            errors['weight'] = f"IP-Adapter weight must be between 0.0 and 2.0, got {self.weight}"
        
        if not (0.0 <= self.noise <= 1.0):
            errors['noise'] = f"IP-Adapter noise must be between 0.0 and 1.0, got {self.noise}"
        
        if not self.reference_image_path.exists():
            errors['reference_image_path'] = f"Reference image not found: {self.reference_image_path}"
        
        return errors


class ConfigManager:
    """Manages ComfyUI configuration loading and validation."""
    
    def __init__(self, config_dir: Optional[Path] = None):
        self.config_dir = config_dir or Path.cwd() / ".kiro" / "comfyui"
        self.config_file = self.config_dir / "config.json"
        self._config: Optional[ComfyUIConfig] = None
    
    def load_config(self) -> ComfyUIConfig:
        """Load configuration from file or create default."""
        if self.config_file.exists():
            try:
                self._config = ComfyUIConfig.from_file(self.config_file)
            except Exception as e:
                print(f"Warning: Failed to load config from {self.config_file}: {e}")
                print("Using default configuration")
                self._config = ComfyUIConfig.default()
        else:
            self._config = ComfyUIConfig.default()
            # Save default config for future use
            self.save_config()
        
        return self._config
    
    def save_config(self) -> None:
        """Save current configuration to file."""
        if self._config is None:
            raise ValueError("No configuration loaded")
        
        self._config.save_to_file(self.config_file)
    
    def validate_config(self) -> Dict[str, str]:
        """Validate current configuration."""
        if self._config is None:
            return {"config": "No configuration loaded"}
        
        return self._config.validate()
    
    def update_config(self, **kwargs) -> None:
        """Update configuration parameters."""
        if self._config is None:
            self._config = ComfyUIConfig.default()
        
        for key, value in kwargs.items():
            if hasattr(self._config, key):
                setattr(self._config, key, value)
            else:
                raise ValueError(f"Unknown configuration parameter: {key}")
    
    @property
    def config(self) -> ComfyUIConfig:
        """Get current configuration."""
        if self._config is None:
            return self.load_config()
        return self._config