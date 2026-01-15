#!/usr/bin/env python3
"""
Video Engine Configuration Management
Handles configuration validation, loading, and management for video generation.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# Import VideoConfig from video_engine for compatibility
try:
    from .video_engine import VideoConfig
except ImportError:
    from video_engine import VideoConfig

logger = logging.getLogger(__name__)


class VideoQuality(Enum):
    """Video quality presets."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    ULTRA = "ultra"


class ProcessingMode(Enum):
    """Processing mode options."""
    CPU_ONLY = "cpu_only"
    GPU_ACCELERATED = "gpu_accelerated"
    AUTO = "auto"


@dataclass
class InterpolationConfig:
    """Configuration for frame interpolation."""
    algorithm: str = "optical_flow"
    quality: VideoQuality = VideoQuality.HIGH
    depth_awareness: bool = True
    character_preservation: bool = True
    motion_blur_strength: float = 0.5
    smoothing_factor: float = 0.8


@dataclass
class CameraConfig:
    """Configuration for camera movement."""
    enable_motion_blur: bool = True
    motion_blur_samples: int = 16
    easing_type: str = "ease_in_out"
    smoothing_factor: float = 0.9
    lens_simulation: bool = False
    focal_length: float = 50.0
    aperture: float = 2.8


@dataclass
class OutputConfig:
    """Configuration for output generation."""
    frame_rate: int = 24
    resolution: Tuple[int, int] = (1920, 1080)
    format: str = "png"
    quality: int = 95
    bit_depth: int = 8
    color_space: str = "sRGB"


@dataclass
class PerformanceConfig:
    """Configuration for performance optimization."""
    processing_mode: ProcessingMode = ProcessingMode.AUTO
    parallel_processing: bool = True
    max_threads: int = 0  # 0 = auto-detect
    memory_limit_gb: float = 8.0
    gpu_memory_fraction: float = 0.8
    enable_caching: bool = True
    cache_size_gb: float = 2.0


@dataclass
class QualityConfig:
    """Configuration for quality validation."""
    minimum_visual_quality: float = 0.85
    minimum_motion_smoothness: float = 0.80
    minimum_temporal_coherence: float = 0.90
    enable_auto_correction: bool = True
    quality_report_generation: bool = True


@dataclass
class VideoEngineConfig:
    """Complete configuration for Video Engine."""
    interpolation: InterpolationConfig
    camera: CameraConfig
    output: OutputConfig
    performance: PerformanceConfig
    quality: QualityConfig
    
    def __init__(self):
        """Initialize with default configurations."""
        self.interpolation = InterpolationConfig()
        self.camera = CameraConfig()
        self.output = OutputConfig()
        self.performance = PerformanceConfig()
        self.quality = QualityConfig()


class VideoConfigManager:
    """Manages Video Engine configuration loading, validation, and saving."""
    
    def __init__(self):
        """Initialize configuration manager."""
        self.config = VideoEngineConfig()
        self.config_path: Optional[Path] = None
    
    def load_config(self, config_path: str) -> bool:
        """
        Load configuration from JSON file.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            bool: True if loaded successfully
        """
        try:
            self.config_path = Path(config_path)
            
            if not self.config_path.exists():
                logger.warning(f"Config file not found: {config_path}, using defaults")
                return True
            
            with open(self.config_path, 'r') as f:
                config_data = json.load(f)
            
            # Load each configuration section
            if 'interpolation' in config_data:
                self._load_interpolation_config(config_data['interpolation'])
            
            if 'camera' in config_data:
                self._load_camera_config(config_data['camera'])
            
            if 'output' in config_data:
                self._load_output_config(config_data['output'])
            
            if 'performance' in config_data:
                self._load_performance_config(config_data['performance'])
            
            if 'quality' in config_data:
                self._load_quality_config(config_data['quality'])
            
            logger.info(f"Configuration loaded from: {config_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            return False
    
    def save_config(self, config_path: Optional[str] = None) -> bool:
        """
        Save current configuration to JSON file.
        
        Args:
            config_path: Optional path to save to (uses loaded path if None)
            
        Returns:
            bool: True if saved successfully
        """
        try:
            save_path = Path(config_path) if config_path else self.config_path
            if not save_path:
                logger.error("No config path specified for saving")
                return False
            
            # Create directory if it doesn't exist
            save_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Convert configuration to dictionary
            config_dict = {
                'interpolation': asdict(self.config.interpolation),
                'camera': asdict(self.config.camera),
                'output': asdict(self.config.output),
                'performance': asdict(self.config.performance),
                'quality': asdict(self.config.quality)
            }
            
            # Convert enums to strings
            config_dict = self._serialize_enums(config_dict)
            
            with open(save_path, 'w') as f:
                json.dump(config_dict, f, indent=2)
            
            logger.info(f"Configuration saved to: {save_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save configuration: {e}")
            return False
    
    def validate_config(self) -> Tuple[bool, List[str]]:
        """
        Validate current configuration.
        
        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []
        
        # Validate interpolation config
        interp_issues = self._validate_interpolation_config()
        issues.extend(interp_issues)
        
        # Validate camera config
        camera_issues = self._validate_camera_config()
        issues.extend(camera_issues)
        
        # Validate output config
        output_issues = self._validate_output_config()
        issues.extend(output_issues)
        
        # Validate performance config
        perf_issues = self._validate_performance_config()
        issues.extend(perf_issues)
        
        # Validate quality config
        quality_issues = self._validate_quality_config()
        issues.extend(quality_issues)
        
        return len(issues) == 0, issues
    
    def get_preset_config(self, preset_name: str) -> Optional[VideoEngineConfig]:
        """
        Get predefined configuration preset.
        
        Args:
            preset_name: Name of preset (fast, balanced, quality, ultra)
            
        Returns:
            VideoEngineConfig or None if preset not found
        """
        presets = {
            'fast': self._create_fast_preset(),
            'balanced': self._create_balanced_preset(),
            'quality': self._create_quality_preset(),
            'ultra': self._create_ultra_preset()
        }
        
        return presets.get(preset_name.lower())
    
    def apply_preset(self, preset_name: str) -> bool:
        """
        Apply a predefined configuration preset.
        
        Args:
            preset_name: Name of preset to apply
            
        Returns:
            bool: True if preset applied successfully
        """
        preset_config = self.get_preset_config(preset_name)
        if preset_config:
            self.config = preset_config
            logger.info(f"Applied preset: {preset_name}")
            return True
        
        logger.error(f"Unknown preset: {preset_name}")
        return False
    
    def _load_interpolation_config(self, data: Dict[str, Any]):
        """Load interpolation configuration from data."""
        if 'algorithm' in data:
            self.config.interpolation.algorithm = data['algorithm']
        if 'quality' in data:
            self.config.interpolation.quality = VideoQuality(data['quality'])
        if 'depth_awareness' in data:
            self.config.interpolation.depth_awareness = data['depth_awareness']
        if 'character_preservation' in data:
            self.config.interpolation.character_preservation = data['character_preservation']
        if 'motion_blur_strength' in data:
            self.config.interpolation.motion_blur_strength = data['motion_blur_strength']
        if 'smoothing_factor' in data:
            self.config.interpolation.smoothing_factor = data['smoothing_factor']
    
    def _load_camera_config(self, data: Dict[str, Any]):
        """Load camera configuration from data."""
        if 'enable_motion_blur' in data:
            self.config.camera.enable_motion_blur = data['enable_motion_blur']
        if 'motion_blur_samples' in data:
            self.config.camera.motion_blur_samples = data['motion_blur_samples']
        if 'easing_type' in data:
            self.config.camera.easing_type = data['easing_type']
        if 'smoothing_factor' in data:
            self.config.camera.smoothing_factor = data['smoothing_factor']
        if 'lens_simulation' in data:
            self.config.camera.lens_simulation = data['lens_simulation']
        if 'focal_length' in data:
            self.config.camera.focal_length = data['focal_length']
        if 'aperture' in data:
            self.config.camera.aperture = data['aperture']
    
    def _load_output_config(self, data: Dict[str, Any]):
        """Load output configuration from data."""
        if 'frame_rate' in data:
            self.config.output.frame_rate = data['frame_rate']
        if 'resolution' in data:
            self.config.output.resolution = tuple(data['resolution'])
        if 'format' in data:
            self.config.output.format = data['format']
        if 'quality' in data:
            self.config.output.quality = data['quality']
        if 'bit_depth' in data:
            self.config.output.bit_depth = data['bit_depth']
        if 'color_space' in data:
            self.config.output.color_space = data['color_space']
    
    def _load_performance_config(self, data: Dict[str, Any]):
        """Load performance configuration from data."""
        if 'processing_mode' in data:
            self.config.performance.processing_mode = ProcessingMode(data['processing_mode'])
        if 'parallel_processing' in data:
            self.config.performance.parallel_processing = data['parallel_processing']
        if 'max_threads' in data:
            self.config.performance.max_threads = data['max_threads']
        if 'memory_limit_gb' in data:
            self.config.performance.memory_limit_gb = data['memory_limit_gb']
        if 'gpu_memory_fraction' in data:
            self.config.performance.gpu_memory_fraction = data['gpu_memory_fraction']
        if 'enable_caching' in data:
            self.config.performance.enable_caching = data['enable_caching']
        if 'cache_size_gb' in data:
            self.config.performance.cache_size_gb = data['cache_size_gb']
    
    def _load_quality_config(self, data: Dict[str, Any]):
        """Load quality configuration from data."""
        if 'minimum_visual_quality' in data:
            self.config.quality.minimum_visual_quality = data['minimum_visual_quality']
        if 'minimum_motion_smoothness' in data:
            self.config.quality.minimum_motion_smoothness = data['minimum_motion_smoothness']
        if 'minimum_temporal_coherence' in data:
            self.config.quality.minimum_temporal_coherence = data['minimum_temporal_coherence']
        if 'enable_auto_correction' in data:
            self.config.quality.enable_auto_correction = data['enable_auto_correction']
        if 'quality_report_generation' in data:
            self.config.quality.quality_report_generation = data['quality_report_generation']
    
    def _validate_interpolation_config(self) -> List[str]:
        """Validate interpolation configuration."""
        issues = []
        
        if self.config.interpolation.algorithm not in ['linear', 'optical_flow', 'depth_aware']:
            issues.append(f"Invalid interpolation algorithm: {self.config.interpolation.algorithm}")
        
        if not 0.0 <= self.config.interpolation.motion_blur_strength <= 1.0:
            issues.append(f"Motion blur strength must be 0.0-1.0: {self.config.interpolation.motion_blur_strength}")
        
        if not 0.0 <= self.config.interpolation.smoothing_factor <= 1.0:
            issues.append(f"Smoothing factor must be 0.0-1.0: {self.config.interpolation.smoothing_factor}")
        
        return issues
    
    def _validate_camera_config(self) -> List[str]:
        """Validate camera configuration."""
        issues = []
        
        if self.config.camera.motion_blur_samples < 1:
            issues.append(f"Motion blur samples must be >= 1: {self.config.camera.motion_blur_samples}")
        
        if self.config.camera.easing_type not in ['linear', 'ease_in', 'ease_out', 'ease_in_out']:
            issues.append(f"Invalid easing type: {self.config.camera.easing_type}")
        
        if not 0.0 <= self.config.camera.smoothing_factor <= 1.0:
            issues.append(f"Camera smoothing factor must be 0.0-1.0: {self.config.camera.smoothing_factor}")
        
        if self.config.camera.focal_length <= 0:
            issues.append(f"Focal length must be positive: {self.config.camera.focal_length}")
        
        if self.config.camera.aperture <= 0:
            issues.append(f"Aperture must be positive: {self.config.camera.aperture}")
        
        return issues
    
    def _validate_output_config(self) -> List[str]:
        """Validate output configuration."""
        issues = []
        
        if self.config.output.frame_rate not in [24, 25, 30, 60]:
            issues.append(f"Unsupported frame rate: {self.config.output.frame_rate}")
        
        width, height = self.config.output.resolution
        if width < 640 or height < 480:
            issues.append(f"Resolution too low: {width}x{height}")
        
        if self.config.output.format not in ['png', 'jpeg', 'exr']:
            issues.append(f"Unsupported format: {self.config.output.format}")
        
        if not 1 <= self.config.output.quality <= 100:
            issues.append(f"Quality must be 1-100: {self.config.output.quality}")
        
        if self.config.output.bit_depth not in [8, 16, 32]:
            issues.append(f"Unsupported bit depth: {self.config.output.bit_depth}")
        
        return issues
    
    def _validate_performance_config(self) -> List[str]:
        """Validate performance configuration."""
        issues = []
        
        if self.config.performance.max_threads < 0:
            issues.append(f"Max threads must be >= 0: {self.config.performance.max_threads}")
        
        if self.config.performance.memory_limit_gb <= 0:
            issues.append(f"Memory limit must be positive: {self.config.performance.memory_limit_gb}")
        
        if not 0.1 <= self.config.performance.gpu_memory_fraction <= 1.0:
            issues.append(f"GPU memory fraction must be 0.1-1.0: {self.config.performance.gpu_memory_fraction}")
        
        if self.config.performance.cache_size_gb < 0:
            issues.append(f"Cache size must be >= 0: {self.config.performance.cache_size_gb}")
        
        return issues
    
    def _validate_quality_config(self) -> List[str]:
        """Validate quality configuration."""
        issues = []
        
        if not 0.0 <= self.config.quality.minimum_visual_quality <= 1.0:
            issues.append(f"Visual quality threshold must be 0.0-1.0: {self.config.quality.minimum_visual_quality}")
        
        if not 0.0 <= self.config.quality.minimum_motion_smoothness <= 1.0:
            issues.append(f"Motion smoothness threshold must be 0.0-1.0: {self.config.quality.minimum_motion_smoothness}")
        
        if not 0.0 <= self.config.quality.minimum_temporal_coherence <= 1.0:
            issues.append(f"Temporal coherence threshold must be 0.0-1.0: {self.config.quality.minimum_temporal_coherence}")
        
        return issues
    
    def _serialize_enums(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert enum values to strings for JSON serialization."""
        if isinstance(data, dict):
            return {k: self._serialize_enums(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._serialize_enums(item) for item in data]
        elif isinstance(data, Enum):
            return data.value
        else:
            return data
    
    def _create_fast_preset(self) -> VideoEngineConfig:
        """Create fast processing preset."""
        config = VideoEngineConfig()
        config.interpolation.algorithm = "linear"
        config.interpolation.quality = VideoQuality.LOW
        config.camera.enable_motion_blur = False
        config.output.resolution = (1280, 720)
        config.performance.processing_mode = ProcessingMode.CPU_ONLY
        return config
    
    def _create_balanced_preset(self) -> VideoEngineConfig:
        """Create balanced quality/speed preset."""
        config = VideoEngineConfig()
        config.interpolation.algorithm = "optical_flow"
        config.interpolation.quality = VideoQuality.MEDIUM
        config.camera.enable_motion_blur = True
        config.output.resolution = (1920, 1080)
        config.performance.processing_mode = ProcessingMode.AUTO
        return config
    
    def _create_quality_preset(self) -> VideoEngineConfig:
        """Create high quality preset."""
        config = VideoEngineConfig()
        config.interpolation.algorithm = "depth_aware"
        config.interpolation.quality = VideoQuality.HIGH
        config.camera.enable_motion_blur = True
        config.camera.lens_simulation = True
        config.output.resolution = (1920, 1080)
        config.performance.processing_mode = ProcessingMode.GPU_ACCELERATED
        return config
    
    def _create_ultra_preset(self) -> VideoEngineConfig:
        """Create ultra quality preset."""
        config = VideoEngineConfig()
        config.interpolation.algorithm = "depth_aware"
        config.interpolation.quality = VideoQuality.ULTRA
        config.camera.enable_motion_blur = True
        config.camera.lens_simulation = True
        config.camera.motion_blur_samples = 32
        config.output.resolution = (3840, 2160)  # 4K
        config.output.bit_depth = 16
        config.performance.processing_mode = ProcessingMode.GPU_ACCELERATED
        return config


def main():
    """Test configuration management."""
    config_manager = VideoConfigManager()
    
    # Test validation
    is_valid, issues = config_manager.validate_config()
    print(f"Default config valid: {is_valid}")
    if issues:
        for issue in issues:
            print(f"  - {issue}")
    
    # Test presets
    presets = ['fast', 'balanced', 'quality', 'ultra']
    for preset in presets:
        config = config_manager.get_preset_config(preset)
        if config:
            print(f"{preset.title()} preset: {config.output.resolution}, {config.interpolation.algorithm}")


if __name__ == "__main__":
    main()