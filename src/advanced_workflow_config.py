"""
Advanced Workflow Configuration System

This module provides comprehensive configuration management for advanced ComfyUI workflows,
including workflow-specific settings, environment detection, validation, and migration support.

Author: Kiro AI Assistant
Date: January 14, 2026
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional, List
from pathlib import Path
from enum import Enum
import json
import yaml
import os
import logging
from copy import deepcopy

logger = logging.getLogger(__name__)


# ============================================================================
# Enums and Constants
# ============================================================================

class ModelPrecision(Enum):
    """Model precision options"""
    FP32 = "fp32"
    FP16 = "fp16"
    FP8 = "fp8"
    INT8 = "int8"
    BF16 = "bf16"


class QualityLevel(Enum):
    """Quality level presets"""
    DRAFT = "draft"
    STANDARD = "standard"
    HIGH = "high"
    ULTRA = "ultra"


class Environment(Enum):
    """Deployment environment types"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    LOCAL = "local"


# ============================================================================
# Workflow-Specific Configuration Classes
# ============================================================================

@dataclass
class HunyuanVideoConfig:
    """Configuration for HunyuanVideo workflows"""
    
    # Model settings
    model_path: str = "models/hunyuanvideo1.5_720p_i2v_fp16.safetensors"
    text_encoder_path: str = "models/qwen2.5_vl_7b_fp16.safetensors"
    vae_path: str = "models/hunyuanvideo_vae.safetensors"
    clip_vision_path: str = "models/clip_vision_h.safetensors"
    
    # Generation parameters
    width: int = 720
    height: int = 480
    num_frames: int = 121
    fps: int = 24
    
    # Sampling parameters
    steps: int = 50
    cfg_scale: float = 7.0
    sampler: str = "euler_ancestral"
    scheduler: str = "normal"
    
    # Super-resolution settings
    enable_upscaling: bool = True
    upscale_factor: float = 1.5
    upscale_model: str = "models/realesrgan_x2.pth"
    
    # Performance settings
    enable_fp8: bool = False
    enable_caching: bool = True
    batch_size: int = 1
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        if self.width <= 0 or self.height <= 0:
            errors.append("Width and height must be positive")
        
        if self.num_frames < 1:
            errors.append("Number of frames must be at least 1")
        
        if self.steps < 1:
            errors.append("Steps must be at least 1")
        
        if self.cfg_scale < 0:
            errors.append("CFG scale must be non-negative")
        
        return errors


@dataclass
class WanVideoConfig:
    """Configuration for Wan Video workflows"""
    
    # Model settings
    model_path: str = "models/wan2.2_fun_inpaint_high_noise_14B_fp8_scaled.safetensors"
    text_encoder_path: str = "models/umt5_xxl_fp8_e4m3fn_scaled.safetensors"
    vae_path: str = "models/wan_2.1_vae.safetensors"
    lora_path: Optional[str] = "models/wan_lightning_lora.safetensors"
    
    # Generation parameters
    width: int = 720
    height: int = 480
    num_frames: int = 81
    fps: int = 24
    
    # Sampling parameters
    steps: int = 20
    cfg_scale: float = 3.0
    sampler: str = "uni_pc"
    scheduler: str = "simple"
    
    # Inpainting settings
    enable_inpainting: bool = True
    inpaint_strength: float = 0.8
    mask_blur: int = 4
    
    # Alpha channel settings
    enable_alpha: bool = False
    alpha_threshold: float = 0.5
    
    # LoRA settings
    enable_lora: bool = True
    lora_strength: float = 1.0
    
    # Performance settings
    enable_fp8: bool = True
    enable_caching: bool = True
    batch_size: int = 1
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        if self.width <= 0 or self.height <= 0:
            errors.append("Width and height must be positive")
        
        if self.num_frames < 1:
            errors.append("Number of frames must be at least 1")
        
        if not 0 <= self.inpaint_strength <= 1:
            errors.append("Inpaint strength must be between 0 and 1")
        
        if not 0 <= self.alpha_threshold <= 1:
            errors.append("Alpha threshold must be between 0 and 1")
        
        return errors


@dataclass
class NewBieImageConfig:
    """Configuration for NewBie anime-style image generation"""
    
    # Model settings
    model_path: str = "models/NewBie-Image-Exp0.1-bf16.safetensors"
    text_encoder_gemma_path: str = "models/gemma_2_9b_it_fp16.safetensors"
    text_encoder_jina_path: str = "models/jina_clip_v2_fp16.safetensors"
    vae_path: str = "models/sdxl_vae.safetensors"
    
    # Generation parameters
    width: int = 1024
    height: int = 1536
    
    # Sampling parameters
    steps: int = 28
    cfg_scale: float = 5.0
    sampler: str = "dpmpp_2m"
    scheduler: str = "karras"
    
    # Anime-specific settings
    enable_structured_prompts: bool = True
    character_consistency_threshold: float = 0.85
    style_strength: float = 0.9
    
    # Performance settings
    enable_bf16: bool = True
    enable_caching: bool = True
    batch_size: int = 1
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        if self.width <= 0 or self.height <= 0:
            errors.append("Width and height must be positive")
        
        if self.steps < 1:
            errors.append("Steps must be at least 1")
        
        if not 0 <= self.character_consistency_threshold <= 1:
            errors.append("Character consistency threshold must be between 0 and 1")
        
        if not 0 <= self.style_strength <= 1:
            errors.append("Style strength must be between 0 and 1")
        
        return errors


@dataclass
class QwenImageConfig:
    """Configuration for Qwen image editing and generation"""
    
    # Model settings
    model_2509_path: str = "models/qwen_image_edit_2509_fp8_e4m3fn.safetensors"
    model_2511_path: str = "models/qwen_image_edit_2511_fp8_e4m3fn.safetensors"
    text_encoder_path: str = "models/qwen2_vl_7b_fp16.safetensors"
    vae_path: str = "models/sdxl_vae.safetensors"
    lora_path: Optional[str] = "models/qwen_lightning_lora.safetensors"
    
    # Generation parameters
    width: int = 1024
    height: int = 1024
    
    # Sampling parameters
    steps: int = 20
    cfg_scale: float = 4.0
    sampler: str = "euler"
    scheduler: str = "simple"
    
    # Editing settings
    edit_strength: float = 0.75
    preserve_structure: bool = True
    enable_relighting: bool = False
    lighting_type: str = "natural"  # natural, studio, dramatic, soft
    
    # Layered generation settings
    enable_layered: bool = False
    num_layers: int = 3
    layer_blend_mode: str = "normal"  # normal, multiply, screen, overlay
    
    # LoRA settings
    enable_lora: bool = True
    lora_strength: float = 1.0
    
    # Performance settings
    enable_fp8: bool = True
    enable_caching: bool = True
    batch_size: int = 1
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        if self.width <= 0 or self.height <= 0:
            errors.append("Width and height must be positive")
        
        if self.steps < 1:
            errors.append("Steps must be at least 1")
        
        if not 0 <= self.edit_strength <= 1:
            errors.append("Edit strength must be between 0 and 1")
        
        if self.num_layers < 1:
            errors.append("Number of layers must be at least 1")
        
        valid_lighting = ["natural", "studio", "dramatic", "soft"]
        if self.lighting_type not in valid_lighting:
            errors.append(f"Lighting type must be one of {valid_lighting}")
        
        valid_blend_modes = ["normal", "multiply", "screen", "overlay"]
        if self.layer_blend_mode not in valid_blend_modes:
            errors.append(f"Layer blend mode must be one of {valid_blend_modes}")
        
        return errors


# ============================================================================
# Main Configuration Class
# ============================================================================

@dataclass
class AdvancedWorkflowConfig:
    """Main configuration for advanced ComfyUI workflows"""
    
    # Schema version for migration support
    schema_version: str = "1.0"
    
    # Environment settings
    environment: Environment = Environment.LOCAL
    debug_mode: bool = False
    log_level: str = "INFO"
    
    # Model settings
    models_directory: Path = field(default_factory=lambda: Path("models"))
    cache_directory: Path = field(default_factory=lambda: Path("cache"))
    model_precision: ModelPrecision = ModelPrecision.FP16
    enable_quantization: bool = True
    max_memory_usage_gb: float = 20.0
    
    # Performance settings
    batch_size: int = 1
    enable_caching: bool = True
    parallel_execution: bool = False
    num_workers: int = 1
    gpu_memory_fraction: float = 0.9
    
    # Quality settings
    quality_level: QualityLevel = QualityLevel.STANDARD
    quality_threshold: float = 0.8
    enable_quality_monitoring: bool = True
    auto_retry_on_failure: bool = True
    max_retries: int = 3
    
    # Workflow routing settings
    enable_auto_routing: bool = True
    fallback_to_basic: bool = True
    prefer_speed_over_quality: bool = False
    
    # Workflow-specific configurations
    hunyuan_config: HunyuanVideoConfig = field(default_factory=HunyuanVideoConfig)
    wan_config: WanVideoConfig = field(default_factory=WanVideoConfig)
    newbie_config: NewBieImageConfig = field(default_factory=NewBieImageConfig)
    qwen_config: QwenImageConfig = field(default_factory=QwenImageConfig)
    
    # Feature flags
    enable_hunyuan: bool = True
    enable_wan: bool = True
    enable_newbie: bool = True
    enable_qwen: bool = True
    
    def validate(self) -> List[str]:
        """Validate entire configuration and return list of errors"""
        errors = []
        
        # Validate basic settings
        if self.max_memory_usage_gb <= 0:
            errors.append("Max memory usage must be positive")
        
        if self.batch_size < 1:
            errors.append("Batch size must be at least 1")
        
        if not 0 <= self.quality_threshold <= 1:
            errors.append("Quality threshold must be between 0 and 1")
        
        if not 0 < self.gpu_memory_fraction <= 1:
            errors.append("GPU memory fraction must be between 0 and 1")
        
        if self.max_retries < 0:
            errors.append("Max retries must be non-negative")
        
        # Validate workflow-specific configs
        if self.enable_hunyuan:
            hunyuan_errors = self.hunyuan_config.validate()
            errors.extend([f"HunyuanVideo: {e}" for e in hunyuan_errors])
        
        if self.enable_wan:
            wan_errors = self.wan_config.validate()
            errors.extend([f"WanVideo: {e}" for e in wan_errors])
        
        if self.enable_newbie:
            newbie_errors = self.newbie_config.validate()
            errors.extend([f"NewBie: {e}" for e in newbie_errors])
        
        if self.enable_qwen:
            qwen_errors = self.qwen_config.validate()
            errors.extend([f"Qwen: {e}" for e in qwen_errors])
        
        return errors
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        data = asdict(self)
        
        # Convert enums to strings
        data['environment'] = self.environment.value
        data['model_precision'] = self.model_precision.value
        data['quality_level'] = self.quality_level.value
        
        # Convert paths to strings
        data['models_directory'] = str(self.models_directory)
        data['cache_directory'] = str(self.cache_directory)
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AdvancedWorkflowConfig':
        """Create configuration from dictionary"""
        # Create a copy to avoid modifying original
        data = deepcopy(data)
        
        # Convert string enums back to enum objects
        if 'environment' in data and isinstance(data['environment'], str):
            data['environment'] = Environment(data['environment'])
        
        if 'model_precision' in data and isinstance(data['model_precision'], str):
            data['model_precision'] = ModelPrecision(data['model_precision'])
        
        if 'quality_level' in data and isinstance(data['quality_level'], str):
            data['quality_level'] = QualityLevel(data['quality_level'])
        
        # Convert string paths back to Path objects
        if 'models_directory' in data:
            data['models_directory'] = Path(data['models_directory'])
        
        if 'cache_directory' in data:
            data['cache_directory'] = Path(data['cache_directory'])
        
        # Handle nested configs
        if 'hunyuan_config' in data and isinstance(data['hunyuan_config'], dict):
            data['hunyuan_config'] = HunyuanVideoConfig(**data['hunyuan_config'])
        
        if 'wan_config' in data and isinstance(data['wan_config'], dict):
            data['wan_config'] = WanVideoConfig(**data['wan_config'])
        
        if 'newbie_config' in data and isinstance(data['newbie_config'], dict):
            data['newbie_config'] = NewBieImageConfig(**data['newbie_config'])
        
        if 'qwen_config' in data and isinstance(data['qwen_config'], dict):
            data['qwen_config'] = QwenImageConfig(**data['qwen_config'])
        
        return cls(**data)


# ============================================================================
# Configuration Manager
# ============================================================================

class ConfigurationManager:
    """Manages loading, saving, and validation of configurations"""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """
        Initialize configuration manager
        
        Args:
            config_dir: Directory for configuration files (default: .storycore/config)
        """
        self.config_dir = config_dir or Path.home() / ".storycore" / "config"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        self.config_file = self.config_dir / "advanced_workflows.yaml"
        self.backup_dir = self.config_dir / "backups"
        self.backup_dir.mkdir(exist_ok=True)
        
        logger.info(f"Configuration manager initialized with directory: {self.config_dir}")
    
    def load_config(self, config_path: Optional[Path] = None) -> AdvancedWorkflowConfig:
        """
        Load configuration from file
        
        Args:
            config_path: Path to configuration file (default: use default config file)
        
        Returns:
            Loaded configuration
        """
        config_path = config_path or self.config_file
        
        if not config_path.exists():
            logger.warning(f"Configuration file not found: {config_path}, using defaults")
            return AdvancedWorkflowConfig()
        
        try:
            with open(config_path, 'r') as f:
                if config_path.suffix == '.json':
                    data = json.load(f)
                elif config_path.suffix in ['.yaml', '.yml']:
                    data = yaml.safe_load(f)
                else:
                    raise ValueError(f"Unsupported config format: {config_path.suffix}")
            
            config = AdvancedWorkflowConfig.from_dict(data)
            
            # Validate loaded configuration
            errors = config.validate()
            if errors:
                logger.warning(f"Configuration validation errors: {errors}")
            
            logger.info(f"Configuration loaded from: {config_path}")
            return config
            
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            logger.info("Using default configuration")
            return AdvancedWorkflowConfig()
    
    def save_config(self, config: AdvancedWorkflowConfig, config_path: Optional[Path] = None, 
                   create_backup: bool = True) -> bool:
        """
        Save configuration to file
        
        Args:
            config: Configuration to save
            config_path: Path to save configuration (default: use default config file)
            create_backup: Whether to create backup of existing config
        
        Returns:
            True if successful, False otherwise
        """
        config_path = config_path or self.config_file
        
        try:
            # Validate before saving
            errors = config.validate()
            if errors:
                logger.error(f"Cannot save invalid configuration: {errors}")
                return False
            
            # Create backup if requested and file exists
            if create_backup and config_path.exists():
                self._create_backup(config_path)
            
            # Save configuration
            data = config.to_dict()
            
            with open(config_path, 'w') as f:
                if config_path.suffix == '.json':
                    json.dump(data, f, indent=2)
                elif config_path.suffix in ['.yaml', '.yml']:
                    yaml.dump(data, f, default_flow_style=False, sort_keys=False)
                else:
                    raise ValueError(f"Unsupported config format: {config_path.suffix}")
            
            logger.info(f"Configuration saved to: {config_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving configuration: {e}")
            return False
    
    def _create_backup(self, config_path: Path):
        """Create backup of configuration file"""
        from datetime import datetime
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{config_path.stem}_{timestamp}{config_path.suffix}"
        backup_path = self.backup_dir / backup_name
        
        try:
            import shutil
            shutil.copy2(config_path, backup_path)
            logger.info(f"Configuration backup created: {backup_path}")
        except Exception as e:
            logger.warning(f"Failed to create backup: {e}")
    
    def load_from_environment(self) -> AdvancedWorkflowConfig:
        """
        Load configuration from environment variables
        
        Environment variables should be prefixed with STORYCORE_
        Example: STORYCORE_MAX_MEMORY_USAGE_GB=24.0
        
        Returns:
            Configuration with environment overrides
        """
        config = self.load_config()
        
        # Override with environment variables
        env_prefix = "STORYCORE_"
        
        for key, value in os.environ.items():
            if key.startswith(env_prefix):
                config_key = key[len(env_prefix):].lower()
                
                # Handle nested configs
                if '.' in config_key:
                    parts = config_key.split('.')
                    if len(parts) == 2:
                        workflow, attr = parts
                        workflow_config = getattr(config, f"{workflow}_config", None)
                        if workflow_config and hasattr(workflow_config, attr):
                            # Convert value to appropriate type
                            current_value = getattr(workflow_config, attr)
                            converted_value = self._convert_env_value(value, type(current_value))
                            setattr(workflow_config, attr, converted_value)
                            logger.info(f"Environment override: {workflow}_config.{attr} = {converted_value}")
                else:
                    if hasattr(config, config_key):
                        # Convert value to appropriate type
                        current_value = getattr(config, config_key)
                        converted_value = self._convert_env_value(value, type(current_value))
                        setattr(config, config_key, converted_value)
                        logger.info(f"Environment override: {config_key} = {converted_value}")
        
        return config
    
    def _convert_env_value(self, value: str, target_type: type) -> Any:
        """Convert environment variable string to target type"""
        if target_type == bool:
            return value.lower() in ('true', '1', 'yes', 'on')
        elif target_type == int:
            return int(value)
        elif target_type == float:
            return float(value)
        elif target_type == Path:
            return Path(value)
        else:
            return value
    
    def migrate_config(self, old_config: Dict[str, Any], from_version: str, 
                      to_version: str) -> Dict[str, Any]:
        """
        Migrate configuration from one schema version to another
        
        Args:
            old_config: Configuration in old format
            from_version: Source schema version
            to_version: Target schema version
        
        Returns:
            Migrated configuration
        """
        logger.info(f"Migrating configuration from v{from_version} to v{to_version}")
        
        # Currently only version 1.0 exists, but this provides framework for future migrations
        if from_version == "1.0" and to_version == "1.0":
            return old_config
        
        # Add migration logic for future versions here
        # Example:
        # if from_version == "1.0" and to_version == "2.0":
        #     return self._migrate_1_0_to_2_0(old_config)
        
        logger.warning(f"No migration path from v{from_version} to v{to_version}")
        return old_config
    
    def get_quality_preset(self, quality_level: QualityLevel) -> Dict[str, Any]:
        """
        Get quality preset configuration
        
        Args:
            quality_level: Desired quality level
        
        Returns:
            Dictionary of quality settings
        """
        presets = {
            QualityLevel.DRAFT: {
                'steps': 10,
                'cfg_scale': 3.0,
                'quality_threshold': 0.6,
                'enable_upscaling': False,
            },
            QualityLevel.STANDARD: {
                'steps': 20,
                'cfg_scale': 5.0,
                'quality_threshold': 0.8,
                'enable_upscaling': False,
            },
            QualityLevel.HIGH: {
                'steps': 35,
                'cfg_scale': 7.0,
                'quality_threshold': 0.9,
                'enable_upscaling': True,
            },
            QualityLevel.ULTRA: {
                'steps': 50,
                'cfg_scale': 9.0,
                'quality_threshold': 0.95,
                'enable_upscaling': True,
            },
        }
        
        return presets.get(quality_level, presets[QualityLevel.STANDARD])
    
    def apply_quality_preset(self, config: AdvancedWorkflowConfig, 
                            quality_level: QualityLevel) -> AdvancedWorkflowConfig:
        """
        Apply quality preset to configuration
        
        Args:
            config: Configuration to modify
            quality_level: Quality level to apply
        
        Returns:
            Modified configuration
        """
        preset = self.get_quality_preset(quality_level)
        
        # Apply to main config
        config.quality_level = quality_level
        config.quality_threshold = preset['quality_threshold']
        
        # Apply to workflow configs
        for workflow_config in [config.hunyuan_config, config.wan_config, 
                               config.newbie_config, config.qwen_config]:
            if hasattr(workflow_config, 'steps'):
                workflow_config.steps = preset['steps']
            if hasattr(workflow_config, 'cfg_scale'):
                workflow_config.cfg_scale = preset['cfg_scale']
            if hasattr(workflow_config, 'enable_upscaling'):
                workflow_config.enable_upscaling = preset['enable_upscaling']
        
        logger.info(f"Applied {quality_level.value} quality preset")
        return config


# ============================================================================
# Utility Functions
# ============================================================================

def create_default_config() -> AdvancedWorkflowConfig:
    """Create default configuration with sensible defaults"""
    return AdvancedWorkflowConfig()


def load_config_from_file(config_path: Path) -> AdvancedWorkflowConfig:
    """
    Load configuration from file (convenience function)
    
    Args:
        config_path: Path to configuration file
    
    Returns:
        Loaded configuration
    """
    manager = ConfigurationManager()
    return manager.load_config(config_path)


def save_config_to_file(config: AdvancedWorkflowConfig, config_path: Path) -> bool:
    """
    Save configuration to file (convenience function)
    
    Args:
        config: Configuration to save
        config_path: Path to save configuration
    
    Returns:
        True if successful, False otherwise
    """
    manager = ConfigurationManager()
    return manager.save_config(config, config_path)
