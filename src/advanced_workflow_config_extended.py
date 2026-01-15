"""
Extended Configuration System for Advanced ComfyUI Workflows

This module provides a comprehensive configuration system that supports:
- Environment-based configuration loading
- Workflow-specific configuration classes
- Configuration validation and migration
- Dynamic configuration updates
- Configuration documentation and schema generation

Key Features:
- Hierarchical configuration with inheritance
- Environment detection and adaptation
- Configuration validation with detailed error reporting
- Migration system for configuration updates
- Auto-documentation generation
- Type-safe configuration with dataclasses
"""

import json
import os
import yaml
from dataclasses import dataclass, field, fields, asdict
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Type, get_type_hints
import logging
from datetime import datetime
import platform
import psutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConfigurationError(Exception):
    """Raised when configuration is invalid or cannot be loaded"""
    pass


class ConfigurationMigrationError(Exception):
    """Raised when configuration migration fails"""
    pass


class EnvironmentType(Enum):
    """Types of deployment environments"""
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"
    LOCAL = "local"


class ConfigurationFormat(Enum):
    """Supported configuration file formats"""
    JSON = "json"
    YAML = "yaml"
    TOML = "toml"


class ValidationLevel(Enum):
    """Configuration validation levels"""
    STRICT = "strict"      # All fields must be valid
    LENIENT = "lenient"    # Allow some invalid fields with warnings
    PERMISSIVE = "permissive"  # Minimal validation


@dataclass
class SystemInfo:
    """System information for environment detection"""
    platform: str = field(default_factory=lambda: platform.system())
    architecture: str = field(default_factory=lambda: platform.machine())
    python_version: str = field(default_factory=lambda: platform.python_version())
    cpu_count: int = field(default_factory=lambda: os.cpu_count())
    memory_gb: float = field(default_factory=lambda: psutil.virtual_memory().total / (1024**3))
    gpu_available: bool = False
    gpu_memory_gb: float = 0.0
    
    def __post_init__(self):
        """Detect GPU information"""
        try:
            import torch
            if torch.cuda.is_available():
                self.gpu_available = True
                self.gpu_memory_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        except ImportError:
            pass


@dataclass
class PerformanceConfig:
    """Performance-related configuration"""
    max_batch_size: int = 4
    enable_mixed_precision: bool = True
    gradient_checkpointing: bool = True
    memory_efficient_attention: bool = True
    compile_models: bool = False
    use_flash_attention: bool = True
    enable_cpu_offload: bool = False
    max_memory_usage_percent: float = 80.0
    
    def validate(self) -> List[str]:
        """Validate performance configuration"""
        errors = []
        
        if self.max_batch_size < 1:
            errors.append("max_batch_size must be at least 1")
        
        if not 0 < self.max_memory_usage_percent <= 100:
            errors.append("max_memory_usage_percent must be between 0 and 100")
        
        return errors


@dataclass
class QualityConfig:
    """Quality control configuration"""
    enable_quality_monitoring: bool = True
    quality_threshold: float = 0.8
    enable_autofix: bool = True
    max_autofix_attempts: int = 3
    quality_metrics: List[str] = field(default_factory=lambda: [
        "sharpness", "color_accuracy", "artifact_detection"
    ])
    temporal_consistency_weight: float = 0.3
    visual_quality_weight: float = 0.4
    motion_smoothness_weight: float = 0.3
    
    def validate(self) -> List[str]:
        """Validate quality configuration"""
        errors = []
        
        if not 0 <= self.quality_threshold <= 1:
            errors.append("quality_threshold must be between 0 and 1")
        
        if self.max_autofix_attempts < 0:
            errors.append("max_autofix_attempts must be non-negative")
        
        # Validate weights sum to 1.0 for video quality
        weight_sum = (self.temporal_consistency_weight + 
                     self.visual_quality_weight + 
                     self.motion_smoothness_weight)
        if abs(weight_sum - 1.0) > 0.01:
            errors.append("Video quality weights must sum to 1.0")
        
        return errors


@dataclass
class HunyuanVideoConfig:
    """Configuration for HunyuanVideo workflows"""
    model_variant: str = "1.5"
    default_resolution: str = "720p"
    enable_super_resolution: bool = True
    target_fps: int = 24
    max_frames: int = 121
    guidance_scale: float = 7.5
    num_inference_steps: int = 50
    enable_temporal_consistency: bool = True
    motion_strength: float = 0.8
    
    # Model-specific settings
    i2v_strength: float = 0.8
    t2v_creativity: float = 0.7
    sr_upscale_factor: float = 1.5
    
    def validate(self) -> List[str]:
        """Validate HunyuanVideo configuration"""
        errors = []
        
        if self.default_resolution not in ["720p", "1080p"]:
            errors.append("default_resolution must be '720p' or '1080p'")
        
        if not 1 <= self.guidance_scale <= 20:
            errors.append("guidance_scale must be between 1 and 20")
        
        if not 10 <= self.num_inference_steps <= 100:
            errors.append("num_inference_steps must be between 10 and 100")
        
        if not 0 <= self.motion_strength <= 1:
            errors.append("motion_strength must be between 0 and 1")
        
        return errors


@dataclass
class WanVideoConfig:
    """Configuration for Wan Video workflows"""
    model_variant: str = "2.2"
    enable_lightning_lora: bool = True
    lightning_steps: int = 4
    high_noise_threshold: float = 0.7
    low_noise_threshold: float = 0.3
    enable_alpha_channel: bool = True
    inpainting_strength: float = 0.8
    guidance_scale: float = 8.0
    
    # Multi-stage processing
    enable_multi_stage: bool = True
    stage_overlap_frames: int = 5
    temporal_blending_strength: float = 0.5
    
    def validate(self) -> List[str]:
        """Validate Wan Video configuration"""
        errors = []
        
        if not 2 <= self.lightning_steps <= 8:
            errors.append("lightning_steps must be between 2 and 8")
        
        if not 0 <= self.high_noise_threshold <= 1:
            errors.append("high_noise_threshold must be between 0 and 1")
        
        if not 0 <= self.low_noise_threshold <= 1:
            errors.append("low_noise_threshold must be between 0 and 1")
        
        if self.high_noise_threshold <= self.low_noise_threshold:
            errors.append("high_noise_threshold must be greater than low_noise_threshold")
        
        return errors


@dataclass
class NewBieImageConfig:
    """Configuration for NewBie Image workflows"""
    model_variant: str = "exp0.1"
    default_resolution: str = "1024x1536"
    enable_structured_prompts: bool = True
    character_consistency_weight: float = 0.8
    style_consistency_weight: float = 0.7
    guidance_scale: float = 7.0
    num_inference_steps: int = 30
    
    # Anime-specific settings
    enable_anime_enhancement: bool = True
    character_detail_level: str = "high"  # low, medium, high
    background_detail_level: str = "medium"
    color_saturation: float = 1.1
    
    def validate(self) -> List[str]:
        """Validate NewBie Image configuration"""
        errors = []
        
        valid_resolutions = ["512x768", "768x1024", "1024x1536"]
        if self.default_resolution not in valid_resolutions:
            errors.append(f"default_resolution must be one of {valid_resolutions}")
        
        valid_detail_levels = ["low", "medium", "high"]
        if self.character_detail_level not in valid_detail_levels:
            errors.append(f"character_detail_level must be one of {valid_detail_levels}")
        
        if self.background_detail_level not in valid_detail_levels:
            errors.append(f"background_detail_level must be one of {valid_detail_levels}")
        
        if not 0.5 <= self.color_saturation <= 2.0:
            errors.append("color_saturation must be between 0.5 and 2.0")
        
        return errors


@dataclass
class QwenImageConfig:
    """Configuration for Qwen Image workflows"""
    model_variant: str = "2.5"
    enable_lightning_lora: bool = True
    lightning_steps: int = 4
    enable_layered_generation: bool = True
    max_layers: int = 4
    guidance_scale: float = 6.0
    num_inference_steps: int = 25
    
    # Editing-specific settings
    edit_strength: float = 0.7
    preserve_original_ratio: float = 0.3
    enable_material_transfer: bool = True
    lighting_adaptation_strength: float = 0.8
    
    # Multi-modal settings
    max_reference_images: int = 3
    reference_weight: float = 0.6
    
    def validate(self) -> List[str]:
        """Validate Qwen Image configuration"""
        errors = []
        
        if not 2 <= self.lightning_steps <= 8:
            errors.append("lightning_steps must be between 2 and 8")
        
        if not 1 <= self.max_layers <= 8:
            errors.append("max_layers must be between 1 and 8")
        
        if not 0 <= self.edit_strength <= 1:
            errors.append("edit_strength must be between 0 and 1")
        
        if not 1 <= self.max_reference_images <= 5:
            errors.append("max_reference_images must be between 1 and 5")
        
        return errors


@dataclass
class AdvancedWorkflowConfig:
    """
    Comprehensive configuration for advanced ComfyUI workflows
    
    This is the main configuration class that combines all workflow-specific
    configurations with system-wide settings.
    """
    
    # Metadata
    config_version: str = "1.0"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    environment: EnvironmentType = EnvironmentType.LOCAL
    
    # System configuration
    system_info: SystemInfo = field(default_factory=SystemInfo)
    performance_config: PerformanceConfig = field(default_factory=PerformanceConfig)
    quality_config: QualityConfig = field(default_factory=QualityConfig)
    
    # Workflow-specific configurations
    hunyuan_config: HunyuanVideoConfig = field(default_factory=HunyuanVideoConfig)
    wan_config: WanVideoConfig = field(default_factory=WanVideoConfig)
    newbie_config: NewBieImageConfig = field(default_factory=NewBieImageConfig)
    qwen_config: QwenImageConfig = field(default_factory=QwenImageConfig)
    
    # Global workflow settings
    enable_model_sharing: bool = True
    enable_memory_optimization: bool = True
    enable_performance_monitoring: bool = True
    enable_automatic_fallback: bool = True
    
    # Paths and directories
    models_directory: str = "models"
    cache_directory: str = "cache"
    output_directory: str = "outputs"
    logs_directory: str = "logs"
    
    # Advanced settings
    experimental_features: List[str] = field(default_factory=list)
    custom_settings: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Post-initialization processing"""
        self.updated_at = datetime.now().isoformat()
        
        # Auto-detect environment if not set
        if self.environment == EnvironmentType.LOCAL:
            self.environment = self._detect_environment()
        
        # Apply environment-specific optimizations
        self._apply_environment_optimizations()
    
    def _detect_environment(self) -> EnvironmentType:
        """Detect the deployment environment"""
        # Check environment variables
        env_var = os.getenv('STORYCORE_ENV', '').lower()
        if env_var in [e.value for e in EnvironmentType]:
            return EnvironmentType(env_var)
        
        # Check for common CI/CD indicators
        ci_indicators = ['CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS', 'JENKINS_URL']
        if any(os.getenv(indicator) for indicator in ci_indicators):
            return EnvironmentType.TESTING
        
        # Check for production indicators
        prod_indicators = ['PRODUCTION', 'PROD', 'DEPLOY_ENV']
        if any(os.getenv(indicator, '').lower() in ['production', 'prod'] for indicator in prod_indicators):
            return EnvironmentType.PRODUCTION
        
        # Default to development
        return EnvironmentType.DEVELOPMENT
    
    def _apply_environment_optimizations(self):
        """Apply environment-specific optimizations"""
        if self.environment == EnvironmentType.PRODUCTION:
            # Production optimizations
            self.performance_config.enable_mixed_precision = True
            self.performance_config.compile_models = True
            self.quality_config.enable_autofix = True
            
        elif self.environment == EnvironmentType.DEVELOPMENT:
            # Development optimizations
            self.performance_config.max_batch_size = 2
            self.enable_performance_monitoring = True
            
        elif self.environment == EnvironmentType.TESTING:
            # Testing optimizations
            self.performance_config.max_batch_size = 1
            self.quality_config.enable_quality_monitoring = False
    
    def validate(self, validation_level: ValidationLevel = ValidationLevel.STRICT) -> Dict[str, List[str]]:
        """
        Validate the entire configuration
        
        Args:
            validation_level: Level of validation strictness
            
        Returns:
            Dictionary mapping component names to lists of validation errors
        """
        all_errors = {}
        
        # Validate each component
        components = {
            'performance_config': self.performance_config,
            'quality_config': self.quality_config,
            'hunyuan_config': self.hunyuan_config,
            'wan_config': self.wan_config,
            'newbie_config': self.newbie_config,
            'qwen_config': self.qwen_config
        }
        
        for name, component in components.items():
            if hasattr(component, 'validate'):
                errors = component.validate()
                if errors:
                    all_errors[name] = errors
        
        # Global validation
        global_errors = self._validate_global_settings()
        if global_errors:
            all_errors['global'] = global_errors
        
        # Cross-component validation
        cross_errors = self._validate_cross_component()
        if cross_errors:
            all_errors['cross_component'] = cross_errors
        
        return all_errors
    
    def _validate_global_settings(self) -> List[str]:
        """Validate global settings"""
        errors = []
        
        # Validate directories
        for dir_attr in ['models_directory', 'cache_directory', 'output_directory', 'logs_directory']:
            dir_path = getattr(self, dir_attr)
            if not isinstance(dir_path, str) or not dir_path.strip():
                errors.append(f"{dir_attr} must be a non-empty string")
        
        return errors
    
    def _validate_cross_component(self) -> List[str]:
        """Validate cross-component consistency"""
        errors = []
        
        # Check memory requirements vs system capabilities
        if self.system_info.gpu_available:
            total_memory_needed = self._estimate_memory_requirements()
            if total_memory_needed > self.system_info.gpu_memory_gb:
                errors.append(
                    f"Estimated memory requirement ({total_memory_needed:.1f}GB) "
                    f"exceeds available GPU memory ({self.system_info.gpu_memory_gb:.1f}GB)"
                )
        
        return errors
    
    def _estimate_memory_requirements(self) -> float:
        """Estimate total memory requirements for current configuration"""
        # This is a simplified estimation
        base_memory = 2.0  # Base overhead
        
        # Add model-specific memory estimates
        if self.hunyuan_config.enable_super_resolution:
            base_memory += 6.0  # HunyuanVideo + SR models
        else:
            base_memory += 4.5  # Just HunyuanVideo
        
        # Add batch size multiplier
        batch_multiplier = self.performance_config.max_batch_size * 0.5
        
        return base_memory * (1 + batch_multiplier)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return asdict(self)
    
    def to_json(self, indent: int = 2) -> str:
        """Convert configuration to JSON string"""
        return json.dumps(self.to_dict(), indent=indent, default=str)
    
    def to_yaml(self) -> str:
        """Convert configuration to YAML string"""
        return yaml.dump(self.to_dict(), default_flow_style=False, sort_keys=False)


class ConfigurationManager:
    """
    Manages configuration loading, validation, and migration
    
    Features:
    - Multi-format support (JSON, YAML)
    - Environment-based configuration
    - Configuration validation
    - Migration system
    - Configuration documentation
    """
    
    def __init__(self, config_dir: Path = Path("config")):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        # Configuration file paths
        self.default_config_path = self.config_dir / "default.yaml"
        self.environment_configs = {
            EnvironmentType.DEVELOPMENT: self.config_dir / "development.yaml",
            EnvironmentType.TESTING: self.config_dir / "testing.yaml",
            EnvironmentType.STAGING: self.config_dir / "staging.yaml",
            EnvironmentType.PRODUCTION: self.config_dir / "production.yaml"
        }
        
        # Migration tracking
        self.migration_log_path = self.config_dir / "migrations.json"
        self.current_version = "1.0"
    
    def load_configuration(
        self, 
        environment: Optional[EnvironmentType] = None,
        config_path: Optional[Path] = None,
        validation_level: ValidationLevel = ValidationLevel.STRICT
    ) -> AdvancedWorkflowConfig:
        """
        Load configuration with environment detection and validation
        
        Args:
            environment: Target environment (auto-detected if None)
            config_path: Specific config file path (overrides environment detection)
            validation_level: Level of validation strictness
            
        Returns:
            Loaded and validated configuration
        """
        try:
            # Determine configuration source
            if config_path:
                config_data = self._load_config_file(config_path)
            else:
                config_data = self._load_environment_config(environment)
            
            # Create configuration object
            config = self._create_config_from_dict(config_data)
            
            # Validate configuration
            validation_errors = config.validate(validation_level)
            if validation_errors and validation_level == ValidationLevel.STRICT:
                error_msg = self._format_validation_errors(validation_errors)
                raise ConfigurationError(f"Configuration validation failed:\n{error_msg}")
            elif validation_errors:
                logger.warning(f"Configuration validation warnings: {validation_errors}")
            
            # Check for migrations
            self._check_and_apply_migrations(config)
            
            logger.info(f"Configuration loaded successfully for environment: {config.environment.value}")
            return config
            
        except Exception as e:
            logger.error(f"Failed to load configuration: {str(e)}")
            raise ConfigurationError(f"Configuration loading failed: {str(e)}")
    
    def save_configuration(
        self, 
        config: AdvancedWorkflowConfig, 
        config_path: Optional[Path] = None,
        format_type: ConfigurationFormat = ConfigurationFormat.YAML
    ):
        """
        Save configuration to file
        
        Args:
            config: Configuration to save
            config_path: Target file path (uses environment default if None)
            format_type: File format to use
        """
        try:
            # Determine save path
            if not config_path:
                config_path = self.environment_configs.get(
                    config.environment, 
                    self.default_config_path
                )
            
            # Update timestamp
            config.updated_at = datetime.now().isoformat()
            
            # Save in specified format
            if format_type == ConfigurationFormat.JSON:
                with open(config_path, 'w') as f:
                    f.write(config.to_json())
            elif format_type == ConfigurationFormat.YAML:
                with open(config_path, 'w') as f:
                    f.write(config.to_yaml())
            else:
                raise ConfigurationError(f"Unsupported format: {format_type}")
            
            logger.info(f"Configuration saved to {config_path}")
            
        except Exception as e:
            logger.error(f"Failed to save configuration: {str(e)}")
            raise ConfigurationError(f"Configuration saving failed: {str(e)}")
    
    def create_default_configuration(self, environment: EnvironmentType) -> AdvancedWorkflowConfig:
        """Create a default configuration for the specified environment"""
        config = AdvancedWorkflowConfig(environment=environment)
        
        # Apply environment-specific defaults
        if environment == EnvironmentType.PRODUCTION:
            config.performance_config.max_batch_size = 8
            config.performance_config.compile_models = True
            config.quality_config.quality_threshold = 0.9
        elif environment == EnvironmentType.DEVELOPMENT:
            config.performance_config.max_batch_size = 2
            config.enable_performance_monitoring = True
        
        return config
    
    def migrate_configuration(self, old_config_path: Path, target_version: str = None) -> AdvancedWorkflowConfig:
        """
        Migrate configuration from older version
        
        Args:
            old_config_path: Path to old configuration file
            target_version: Target version (current if None)
            
        Returns:
            Migrated configuration
        """
        if not target_version:
            target_version = self.current_version
        
        try:
            # Load old configuration
            old_data = self._load_config_file(old_config_path)
            old_version = old_data.get('config_version', '0.1')
            
            logger.info(f"Migrating configuration from version {old_version} to {target_version}")
            
            # Apply migrations
            migrated_data = self._apply_migrations(old_data, old_version, target_version)
            
            # Create new configuration
            new_config = self._create_config_from_dict(migrated_data)
            
            # Log migration
            self._log_migration(old_version, target_version, old_config_path)
            
            logger.info("Configuration migration completed successfully")
            return new_config
            
        except Exception as e:
            logger.error(f"Configuration migration failed: {str(e)}")
            raise ConfigurationMigrationError(f"Migration failed: {str(e)}")
    
    def generate_documentation(self, output_path: Path = None) -> str:
        """
        Generate configuration documentation
        
        Args:
            output_path: Path to save documentation (optional)
            
        Returns:
            Documentation as markdown string
        """
        doc_lines = [
            "# Advanced Workflow Configuration Documentation",
            "",
            "This document describes the configuration options for StoryCore-Engine advanced workflows.",
            "",
            "## Configuration Structure",
            ""
        ]
        
        # Generate documentation for each configuration class
        config_classes = [
            (AdvancedWorkflowConfig, "Main Configuration"),
            (PerformanceConfig, "Performance Settings"),
            (QualityConfig, "Quality Control Settings"),
            (HunyuanVideoConfig, "HunyuanVideo Workflow Settings"),
            (WanVideoConfig, "Wan Video Workflow Settings"),
            (NewBieImageConfig, "NewBie Image Workflow Settings"),
            (QwenImageConfig, "Qwen Image Workflow Settings")
        ]
        
        for config_class, title in config_classes:
            doc_lines.extend(self._generate_class_documentation(config_class, title))
        
        # Add examples
        doc_lines.extend([
            "## Configuration Examples",
            "",
            "### Development Environment",
            "```yaml"
        ])
        
        dev_config = self.create_default_configuration(EnvironmentType.DEVELOPMENT)
        doc_lines.extend(dev_config.to_yaml().split('\n'))
        doc_lines.append("```")
        
        documentation = '\n'.join(doc_lines)
        
        # Save to file if path provided
        if output_path:
            with open(output_path, 'w') as f:
                f.write(documentation)
            logger.info(f"Configuration documentation saved to {output_path}")
        
        return documentation
    
    def _load_config_file(self, config_path: Path) -> Dict[str, Any]:
        """Load configuration from file"""
        if not config_path.exists():
            raise ConfigurationError(f"Configuration file not found: {config_path}")
        
        try:
            with open(config_path, 'r') as f:
                if config_path.suffix.lower() == '.json':
                    return json.load(f)
                elif config_path.suffix.lower() in ['.yaml', '.yml']:
                    return yaml.safe_load(f)
                else:
                    raise ConfigurationError(f"Unsupported file format: {config_path.suffix}")
        except Exception as e:
            raise ConfigurationError(f"Failed to parse configuration file {config_path}: {str(e)}")
    
    def _load_environment_config(self, environment: Optional[EnvironmentType]) -> Dict[str, Any]:
        """Load configuration for specific environment"""
        # Auto-detect environment if not provided
        if not environment:
            temp_config = AdvancedWorkflowConfig()
            environment = temp_config.environment
        
        # Try environment-specific config first
        env_config_path = self.environment_configs.get(environment)
        if env_config_path and env_config_path.exists():
            return self._load_config_file(env_config_path)
        
        # Fall back to default config
        if self.default_config_path.exists():
            return self._load_config_file(self.default_config_path)
        
        # Create default configuration
        logger.info("No configuration file found, creating default configuration")
        default_config = self.create_default_configuration(environment)
        self.save_configuration(default_config, self.default_config_path)
        return default_config.to_dict()
    
    def _create_config_from_dict(self, config_data: Dict[str, Any]) -> AdvancedWorkflowConfig:
        """Create configuration object from dictionary"""
        try:
            # Handle nested dataclass creation
            if 'system_info' in config_data:
                config_data['system_info'] = SystemInfo(**config_data['system_info'])
            
            if 'performance_config' in config_data:
                config_data['performance_config'] = PerformanceConfig(**config_data['performance_config'])
            
            if 'quality_config' in config_data:
                config_data['quality_config'] = QualityConfig(**config_data['quality_config'])
            
            if 'hunyuan_config' in config_data:
                config_data['hunyuan_config'] = HunyuanVideoConfig(**config_data['hunyuan_config'])
            
            if 'wan_config' in config_data:
                config_data['wan_config'] = WanVideoConfig(**config_data['wan_config'])
            
            if 'newbie_config' in config_data:
                config_data['newbie_config'] = NewBieImageConfig(**config_data['newbie_config'])
            
            if 'qwen_config' in config_data:
                config_data['qwen_config'] = QwenImageConfig(**config_data['qwen_config'])
            
            # Handle enum conversion
            if 'environment' in config_data and isinstance(config_data['environment'], str):
                config_data['environment'] = EnvironmentType(config_data['environment'])
            
            return AdvancedWorkflowConfig(**config_data)
            
        except Exception as e:
            raise ConfigurationError(f"Failed to create configuration object: {str(e)}")
    
    def _format_validation_errors(self, errors: Dict[str, List[str]]) -> str:
        """Format validation errors for display"""
        formatted_lines = []
        for component, error_list in errors.items():
            formatted_lines.append(f"{component}:")
            for error in error_list:
                formatted_lines.append(f"  - {error}")
        return '\n'.join(formatted_lines)
    
    def _check_and_apply_migrations(self, config: AdvancedWorkflowConfig):
        """Check if configuration needs migration and apply if necessary"""
        if config.config_version != self.current_version:
            logger.info(f"Configuration version mismatch: {config.config_version} -> {self.current_version}")
            # Migration logic would go here
    
    def _apply_migrations(self, config_data: Dict[str, Any], from_version: str, to_version: str) -> Dict[str, Any]:
        """Apply configuration migrations"""
        # This is a placeholder for migration logic
        # In a real implementation, you would have version-specific migration functions
        
        migrated_data = config_data.copy()
        migrated_data['config_version'] = to_version
        migrated_data['updated_at'] = datetime.now().isoformat()
        
        return migrated_data
    
    def _log_migration(self, from_version: str, to_version: str, config_path: Path):
        """Log migration for tracking"""
        migration_entry = {
            'timestamp': datetime.now().isoformat(),
            'from_version': from_version,
            'to_version': to_version,
            'config_path': str(config_path)
        }
        
        # Load existing migration log
        migrations = []
        if self.migration_log_path.exists():
            try:
                with open(self.migration_log_path, 'r') as f:
                    migrations = json.load(f)
            except Exception:
                pass
        
        # Add new migration
        migrations.append(migration_entry)
        
        # Save updated log
        with open(self.migration_log_path, 'w') as f:
            json.dump(migrations, f, indent=2)
    
    def _generate_class_documentation(self, config_class: Type, title: str) -> List[str]:
        """Generate documentation for a configuration class"""
        lines = [f"### {title}", ""]
        
        if config_class.__doc__:
            lines.extend([config_class.__doc__.strip(), ""])
        
        lines.append("| Field | Type | Default | Description |")
        lines.append("|-------|------|---------|-------------|")
        
        # Get field information
        for field_info in fields(config_class):
            field_name = field_info.name
            field_type = field_info.type
            default_value = field_info.default if field_info.default != field_info.default_factory else "auto"
            
            # Simplify type display
            type_str = str(field_type).replace('typing.', '').replace('<class \'', '').replace('\'>', '')
            
            lines.append(f"| `{field_name}` | {type_str} | {default_value} | - |")
        
        lines.extend(["", ""])
        return lines


def create_default_configuration_manager(config_dir: str = "config") -> ConfigurationManager:
    """Create a configuration manager with default settings"""
    return ConfigurationManager(Path(config_dir))


if __name__ == "__main__":
    # Example usage
    def main():
        # Create configuration manager
        config_manager = create_default_configuration_manager()
        
        # Create and save default configurations for all environments
        for env in EnvironmentType:
            config = config_manager.create_default_configuration(env)
            config_path = config_manager.config_dir / f"{env.value}.yaml"
            config_manager.save_configuration(config, config_path)
            print(f"Created configuration for {env.value}: {config_path}")
        
        # Generate documentation
        doc_path = config_manager.config_dir / "README.md"
        config_manager.generate_documentation(doc_path)
        print(f"Generated documentation: {doc_path}")
        
        # Load and validate configuration
        try:
            config = config_manager.load_configuration(EnvironmentType.DEVELOPMENT)
            print(f"Loaded configuration for {config.environment.value}")
            print(f"System info: {config.system_info.platform}, {config.system_info.memory_gb:.1f}GB RAM")
        except Exception as e:
            print(f"Error loading configuration: {e}")
    
    main()