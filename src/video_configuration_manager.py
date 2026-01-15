#!/usr/bin/env python3
"""
Video Configuration Manager for Video Engine

This module implements comprehensive configuration and customization system including:
- Configurable interpolation algorithms (VE-8.1)
- Custom frame rates and resolution settings (VE-8.2)
- Motion blur and depth-of-field controls (VE-8.3)
- Quality vs speed trade-off settings (VE-8.4)
- Manual camera movement override (VE-8.5)
- Custom motion curves and timing (VE-8.6)
- Cinematic presets for common shot types (VE-8.8)

Requirements: VE-8.1, VE-8.2, VE-8.3, VE-8.4, VE-8.5, VE-8.6, VE-8.8
"""

import logging
import json
import yaml
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
import numpy as np
from copy import deepcopy

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConfigurationFormat(Enum):
    """Configuration file formats."""
    JSON = "json"
    YAML = "yaml"
    TOML = "toml"


class QualityPreset(Enum):
    """Quality vs speed presets."""
    DRAFT = "draft"          # Maximum speed, minimum quality
    PREVIEW = "preview"      # Balanced for preview
    PRODUCTION = "production" # High quality for final output
    BROADCAST = "broadcast"   # Maximum quality for broadcast
    CUSTOM = "custom"        # User-defined settings


class ResolutionPreset(Enum):
    """Standard resolution presets."""
    HD_720P = "720p"         # 1280x720
    HD_1080P = "1080p"       # 1920x1080
    UHD_4K = "4k"           # 3840x2160
    UHD_8K = "8k"           # 7680x4320
    CINEMA_2K = "2k_cinema"  # 2048x1080
    CINEMA_4K = "4k_cinema"  # 4096x2160
    CUSTOM = "custom"        # User-defined


class FrameRatePreset(Enum):
    """Standard frame rate presets."""
    FILM_24 = "24fps"        # 24 fps (cinema standard)
    PAL_25 = "25fps"         # 25 fps (PAL standard)
    NTSC_30 = "30fps"        # 30 fps (NTSC standard)
    SMOOTH_60 = "60fps"      # 60 fps (smooth motion)
    HIGH_120 = "120fps"      # 120 fps (high frame rate)
    CUSTOM = "custom"        # User-defined


class MotionCurveType(Enum):
    """Motion curve types for camera movement."""
    LINEAR = "linear"
    EASE_IN = "ease_in"
    EASE_OUT = "ease_out"
    EASE_IN_OUT = "ease_in_out"
    BOUNCE = "bounce"
    ELASTIC = "elastic"
    CUSTOM_BEZIER = "custom_bezier"


@dataclass
class ResolutionConfig:
    """Resolution configuration."""
    width: int = 1920
    height: int = 1080
    aspect_ratio: str = "16:9"
    pixel_aspect_ratio: float = 1.0
    preset: ResolutionPreset = ResolutionPreset.HD_1080P
    
    def validate(self) -> Tuple[bool, List[str]]:
        """Validate resolution configuration."""
        issues = []
        
        if self.width <= 0 or self.height <= 0:
            issues.append("Width and height must be positive")
        
        if self.width % 2 != 0 or self.height % 2 != 0:
            issues.append("Width and height should be even numbers for video compatibility")
        
        if self.pixel_aspect_ratio <= 0:
            issues.append("Pixel aspect ratio must be positive")
        
        # Check common aspect ratios
        calculated_ratio = self.width / self.height
        common_ratios = {
            "16:9": 16/9,
            "4:3": 4/3,
            "21:9": 21/9,
            "2.35:1": 2.35,
            "1.85:1": 1.85
        }
        
        if self.aspect_ratio in common_ratios:
            expected_ratio = common_ratios[self.aspect_ratio]
            if abs(calculated_ratio - expected_ratio) > 0.01:
                issues.append(f"Aspect ratio mismatch: {self.aspect_ratio} expected {expected_ratio:.3f}, got {calculated_ratio:.3f}")
        
        return len(issues) == 0, issues


@dataclass
class FrameRateConfig:
    """Frame rate configuration."""
    fps: float = 24.0
    preset: FrameRatePreset = FrameRatePreset.FILM_24
    drop_frame: bool = False  # For NTSC compatibility
    pulldown: Optional[str] = None  # 3:2 pulldown, etc.
    
    def validate(self) -> Tuple[bool, List[str]]:
        """Validate frame rate configuration."""
        issues = []
        
        if self.fps <= 0:
            issues.append("Frame rate must be positive")
        
        if self.fps > 240:
            issues.append("Frame rate above 240 fps may not be supported")
        
        # Check for common frame rates
        common_fps = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60, 120]
        if not any(abs(self.fps - common) < 0.01 for common in common_fps):
            logger.warning(f"Unusual frame rate: {self.fps} fps")
        
        return len(issues) == 0, issues


@dataclass
class QualityConfig:
    """Quality vs speed configuration."""
    preset: QualityPreset = QualityPreset.PRODUCTION
    quality_level: float = 0.8  # 0.0 (speed) to 1.0 (quality)
    
    # Interpolation quality settings
    interpolation_samples: int = 16
    motion_estimation_accuracy: float = 0.8
    temporal_consistency_weight: float = 0.7
    
    # Performance settings
    parallel_processing: bool = True
    gpu_acceleration: bool = True
    memory_limit_gb: float = 8.0
    cache_intermediate_results: bool = True
    
    # Output quality settings
    compression_quality: float = 0.95
    color_depth: int = 8  # 8, 10, or 16 bit
    chroma_subsampling: str = "4:2:0"  # 4:4:4, 4:2:2, 4:2:0
    
    def validate(self) -> Tuple[bool, List[str]]:
        """Validate quality configuration."""
        issues = []
        
        if not 0 <= self.quality_level <= 1:
            issues.append("Quality level must be between 0 and 1")
        
        if self.interpolation_samples < 1:
            issues.append("Interpolation samples must be at least 1")
        
        if not 0 <= self.motion_estimation_accuracy <= 1:
            issues.append("Motion estimation accuracy must be between 0 and 1")
        
        if not 0 <= self.temporal_consistency_weight <= 1:
            issues.append("Temporal consistency weight must be between 0 and 1")
        
        if self.memory_limit_gb <= 0:
            issues.append("Memory limit must be positive")
        
        if not 0 <= self.compression_quality <= 1:
            issues.append("Compression quality must be between 0 and 1")
        
        if self.color_depth not in [8, 10, 16]:
            issues.append("Color depth must be 8, 10, or 16 bits")
        
        if self.chroma_subsampling not in ["4:4:4", "4:2:2", "4:2:0"]:
            issues.append("Invalid chroma subsampling format")
        
        return len(issues) == 0, issues


@dataclass
class MotionCurveConfig:
    """Motion curve configuration for camera movement."""
    curve_type: MotionCurveType = MotionCurveType.EASE_IN_OUT
    
    # Bezier curve control points (for custom curves)
    control_points: List[Tuple[float, float]] = field(default_factory=lambda: [(0.0, 0.0), (0.33, 0.0), (0.67, 1.0), (1.0, 1.0)])
    
    # Easing parameters
    ease_strength: float = 2.0  # For power-based easing
    bounce_amplitude: float = 0.1  # For bounce easing
    elastic_amplitude: float = 1.0  # For elastic easing
    elastic_period: float = 0.3
    
    # Timing parameters
    hold_start_frames: int = 0  # Frames to hold at start
    hold_end_frames: int = 0    # Frames to hold at end
    acceleration_frames: int = 6  # Frames for acceleration
    deceleration_frames: int = 6  # Frames for deceleration
    
    def validate(self) -> Tuple[bool, List[str]]:
        """Validate motion curve configuration."""
        issues = []
        
        if self.ease_strength <= 0:
            issues.append("Ease strength must be positive")
        
        if not 0 <= self.bounce_amplitude <= 1:
            issues.append("Bounce amplitude must be between 0 and 1")
        
        if self.elastic_amplitude <= 0:
            issues.append("Elastic amplitude must be positive")
        
        if self.elastic_period <= 0:
            issues.append("Elastic period must be positive")
        
        if self.hold_start_frames < 0 or self.hold_end_frames < 0:
            issues.append("Hold frames must be non-negative")
        
        if self.acceleration_frames < 0 or self.deceleration_frames < 0:
            issues.append("Acceleration/deceleration frames must be non-negative")
        
        # Validate control points for Bezier curves
        if self.curve_type == MotionCurveType.CUSTOM_BEZIER:
            if len(self.control_points) < 2:
                issues.append("Bezier curve needs at least 2 control points")
            
            for i, (x, y) in enumerate(self.control_points):
                if not 0 <= x <= 1:
                    issues.append(f"Control point {i} x-coordinate must be between 0 and 1")
                if not 0 <= y <= 1:
                    issues.append(f"Control point {i} y-coordinate must be between 0 and 1")
        
        return len(issues) == 0, issues


@dataclass
class CameraOverrideConfig:
    """Manual camera movement override configuration."""
    enable_override: bool = False
    
    # Manual keyframe positions
    position_keyframes: List[Tuple[float, float, float]] = field(default_factory=list)  # (time, x, y)
    rotation_keyframes: List[Tuple[float, float, float, float]] = field(default_factory=list)  # (time, pitch, yaw, roll)
    zoom_keyframes: List[Tuple[float, float]] = field(default_factory=list)  # (time, zoom_factor)
    
    # Override specific movements
    override_pan: bool = False
    override_tilt: bool = False
    override_zoom: bool = False
    override_dolly: bool = False
    override_track: bool = False
    
    # Manual timing control
    custom_timing: bool = False
    timing_keyframes: List[Tuple[float, float]] = field(default_factory=list)  # (original_time, new_time)
    
    def validate(self) -> Tuple[bool, List[str]]:
        """Validate camera override configuration."""
        issues = []
        
        # Validate position keyframes
        for i, (time, x, y) in enumerate(self.position_keyframes):
            if not 0 <= time <= 1:
                issues.append(f"Position keyframe {i} time must be between 0 and 1")
        
        # Validate rotation keyframes
        for i, (time, pitch, yaw, roll) in enumerate(self.rotation_keyframes):
            if not 0 <= time <= 1:
                issues.append(f"Rotation keyframe {i} time must be between 0 and 1")
            if not -180 <= pitch <= 180:
                issues.append(f"Rotation keyframe {i} pitch must be between -180 and 180 degrees")
            if not -180 <= yaw <= 180:
                issues.append(f"Rotation keyframe {i} yaw must be between -180 and 180 degrees")
            if not -180 <= roll <= 180:
                issues.append(f"Rotation keyframe {i} roll must be between -180 and 180 degrees")
        
        # Validate zoom keyframes
        for i, (time, zoom) in enumerate(self.zoom_keyframes):
            if not 0 <= time <= 1:
                issues.append(f"Zoom keyframe {i} time must be between 0 and 1")
            if zoom <= 0:
                issues.append(f"Zoom keyframe {i} zoom factor must be positive")
        
        # Validate timing keyframes
        if self.custom_timing:
            for i, (orig_time, new_time) in enumerate(self.timing_keyframes):
                if not 0 <= orig_time <= 1:
                    issues.append(f"Timing keyframe {i} original time must be between 0 and 1")
                if not 0 <= new_time <= 1:
                    issues.append(f"Timing keyframe {i} new time must be between 0 and 1")
        
        return len(issues) == 0, issues


@dataclass
class VideoConfiguration:
    """Complete video engine configuration."""
    # Basic settings
    resolution: ResolutionConfig = field(default_factory=ResolutionConfig)
    frame_rate: FrameRateConfig = field(default_factory=FrameRateConfig)
    quality: QualityConfig = field(default_factory=QualityConfig)
    
    # Advanced interpolation settings (from existing engine)
    interpolation_method: str = "optical_flow"
    motion_blur_enabled: bool = True
    motion_blur_intensity: float = 0.5
    depth_of_field_enabled: bool = True
    depth_of_field_mode: str = "shallow"
    lens_simulation_enabled: bool = True
    lens_type: str = "standard"
    
    # Camera movement settings
    motion_curves: MotionCurveConfig = field(default_factory=MotionCurveConfig)
    camera_override: CameraOverrideConfig = field(default_factory=CameraOverrideConfig)
    
    # Cinematic presets
    cinematic_preset: Optional[str] = None
    
    # Metadata
    config_version: str = "1.0"
    created_timestamp: Optional[str] = None
    modified_timestamp: Optional[str] = None
    
    def validate(self) -> Tuple[bool, List[str]]:
        """Validate complete configuration."""
        all_issues = []
        
        # Validate each component
        valid, issues = self.resolution.validate()
        all_issues.extend(issues)
        
        valid, issues = self.frame_rate.validate()
        all_issues.extend(issues)
        
        valid, issues = self.quality.validate()
        all_issues.extend(issues)
        
        valid, issues = self.motion_curves.validate()
        all_issues.extend(issues)
        
        valid, issues = self.camera_override.validate()
        all_issues.extend(issues)
        
        # Cross-validation
        if self.quality.quality_level < 0.3 and self.motion_blur_enabled:
            logger.warning("Motion blur may impact performance at low quality settings")
        
        if self.quality.quality_level < 0.5 and self.depth_of_field_enabled:
            logger.warning("Depth of field may impact performance at low quality settings")
        
        return len(all_issues) == 0, all_issues


class VideoConfigurationManager:
    """Manager for video engine configuration and presets."""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize configuration manager."""
        self.config_dir = config_dir or Path.cwd() / ".storycore" / "video_config"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        
        self.presets_dir = self.config_dir / "presets"
        self.presets_dir.mkdir(exist_ok=True)
        
        self.current_config = VideoConfiguration()
        
        logger.info(f"Video Configuration Manager initialized with config dir: {self.config_dir}")
        
        # Load built-in presets
        self._create_builtin_presets()
    
    def _create_builtin_presets(self):
        """Create built-in cinematic presets."""
        presets = {
            "documentary": self._create_documentary_preset(),
            "cinematic": self._create_cinematic_preset(),
            "action": self._create_action_preset(),
            "portrait": self._create_portrait_preset(),
            "broadcast": self._create_broadcast_preset(),
            "web_video": self._create_web_video_preset(),
            "social_media": self._create_social_media_preset(),
            "animation": self._create_animation_preset()
        }
        
        for name, config in presets.items():
            preset_file = self.presets_dir / f"{name}.json"
            if not preset_file.exists():
                self.save_configuration(config, preset_file)
                logger.info(f"Created built-in preset: {name}")
    
    def _create_documentary_preset(self) -> VideoConfiguration:
        """Create documentary preset configuration."""
        return VideoConfiguration(
            resolution=ResolutionConfig(
                width=1920, height=1080,
                preset=ResolutionPreset.HD_1080P
            ),
            frame_rate=FrameRateConfig(
                fps=25.0,
                preset=FrameRatePreset.PAL_25
            ),
            quality=QualityConfig(
                preset=QualityPreset.PRODUCTION,
                quality_level=0.8,
                interpolation_samples=12,
                motion_estimation_accuracy=0.7
            ),
            interpolation_method="optical_flow",
            motion_blur_enabled=True,
            motion_blur_intensity=0.3,
            depth_of_field_enabled=True,
            depth_of_field_mode="deep",
            lens_simulation_enabled=True,
            lens_type="standard",
            motion_curves=MotionCurveConfig(
                curve_type=MotionCurveType.EASE_IN_OUT,
                ease_strength=1.5
            ),
            cinematic_preset="documentary"
        )
    
    def _create_cinematic_preset(self) -> VideoConfiguration:
        """Create cinematic preset configuration."""
        return VideoConfiguration(
            resolution=ResolutionConfig(
                width=3840, height=2160,
                preset=ResolutionPreset.UHD_4K
            ),
            frame_rate=FrameRateConfig(
                fps=24.0,
                preset=FrameRatePreset.FILM_24
            ),
            quality=QualityConfig(
                preset=QualityPreset.BROADCAST,
                quality_level=0.95,
                interpolation_samples=24,
                motion_estimation_accuracy=0.9,
                color_depth=10
            ),
            interpolation_method="depth_aware",
            motion_blur_enabled=True,
            motion_blur_intensity=0.6,
            depth_of_field_enabled=True,
            depth_of_field_mode="shallow",
            lens_simulation_enabled=True,
            lens_type="anamorphic",
            motion_curves=MotionCurveConfig(
                curve_type=MotionCurveType.EASE_IN_OUT,
                ease_strength=2.5
            ),
            cinematic_preset="cinematic"
        )
    
    def _create_action_preset(self) -> VideoConfiguration:
        """Create action preset configuration."""
        return VideoConfiguration(
            resolution=ResolutionConfig(
                width=1920, height=1080,
                preset=ResolutionPreset.HD_1080P
            ),
            frame_rate=FrameRateConfig(
                fps=60.0,
                preset=FrameRatePreset.SMOOTH_60
            ),
            quality=QualityConfig(
                preset=QualityPreset.PRODUCTION,
                quality_level=0.85,
                interpolation_samples=20,
                motion_estimation_accuracy=0.85
            ),
            interpolation_method="motion_compensated",
            motion_blur_enabled=True,
            motion_blur_intensity=0.8,
            depth_of_field_enabled=True,
            depth_of_field_mode="focus_pull",
            lens_simulation_enabled=True,
            lens_type="wide_angle",
            motion_curves=MotionCurveConfig(
                curve_type=MotionCurveType.EASE_OUT,
                ease_strength=3.0
            ),
            cinematic_preset="action"
        )
    
    def _create_portrait_preset(self) -> VideoConfiguration:
        """Create portrait preset configuration."""
        return VideoConfiguration(
            resolution=ResolutionConfig(
                width=1920, height=1080,
                preset=ResolutionPreset.HD_1080P
            ),
            frame_rate=FrameRateConfig(
                fps=24.0,
                preset=FrameRatePreset.FILM_24
            ),
            quality=QualityConfig(
                preset=QualityPreset.PRODUCTION,
                quality_level=0.9,
                interpolation_samples=16,
                motion_estimation_accuracy=0.8
            ),
            interpolation_method="ai_based",
            motion_blur_enabled=True,
            motion_blur_intensity=0.2,
            depth_of_field_enabled=True,
            depth_of_field_mode="shallow",
            lens_simulation_enabled=True,
            lens_type="telephoto",
            motion_curves=MotionCurveConfig(
                curve_type=MotionCurveType.EASE_IN_OUT,
                ease_strength=1.8
            ),
            cinematic_preset="portrait"
        )
    
    def _create_broadcast_preset(self) -> VideoConfiguration:
        """Create broadcast preset configuration."""
        return VideoConfiguration(
            resolution=ResolutionConfig(
                width=1920, height=1080,
                preset=ResolutionPreset.HD_1080P
            ),
            frame_rate=FrameRateConfig(
                fps=29.97,
                preset=FrameRatePreset.NTSC_30,
                drop_frame=True
            ),
            quality=QualityConfig(
                preset=QualityPreset.BROADCAST,
                quality_level=1.0,
                interpolation_samples=32,
                motion_estimation_accuracy=0.95,
                color_depth=10,
                chroma_subsampling="4:2:2"
            ),
            interpolation_method="depth_aware",
            motion_blur_enabled=True,
            motion_blur_intensity=0.4,
            depth_of_field_enabled=False,  # Broadcast typically avoids heavy DOF
            lens_simulation_enabled=True,
            lens_type="standard",
            motion_curves=MotionCurveConfig(
                curve_type=MotionCurveType.LINEAR  # Broadcast prefers predictable motion
            ),
            cinematic_preset="broadcast"
        )
    
    def _create_web_video_preset(self) -> VideoConfiguration:
        """Create web video preset configuration."""
        return VideoConfiguration(
            resolution=ResolutionConfig(
                width=1280, height=720,
                preset=ResolutionPreset.HD_720P
            ),
            frame_rate=FrameRateConfig(
                fps=30.0,
                preset=FrameRatePreset.NTSC_30
            ),
            quality=QualityConfig(
                preset=QualityPreset.PREVIEW,
                quality_level=0.6,
                interpolation_samples=8,
                motion_estimation_accuracy=0.6,
                compression_quality=0.8
            ),
            interpolation_method="linear",
            motion_blur_enabled=False,  # Reduce processing for web
            depth_of_field_enabled=False,
            lens_simulation_enabled=False,
            motion_curves=MotionCurveConfig(
                curve_type=MotionCurveType.EASE_IN_OUT,
                ease_strength=1.2
            ),
            cinematic_preset="web_video"
        )
    
    def _create_social_media_preset(self) -> VideoConfiguration:
        """Create social media preset configuration."""
        return VideoConfiguration(
            resolution=ResolutionConfig(
                width=1080, height=1920,  # Vertical format
                aspect_ratio="9:16",
                preset=ResolutionPreset.CUSTOM
            ),
            frame_rate=FrameRateConfig(
                fps=30.0,
                preset=FrameRatePreset.NTSC_30
            ),
            quality=QualityConfig(
                preset=QualityPreset.PREVIEW,
                quality_level=0.7,
                interpolation_samples=10,
                motion_estimation_accuracy=0.7
            ),
            interpolation_method="optical_flow",
            motion_blur_enabled=True,
            motion_blur_intensity=0.4,
            depth_of_field_enabled=True,
            depth_of_field_mode="shallow",
            lens_simulation_enabled=True,
            lens_type="standard",
            motion_curves=MotionCurveConfig(
                curve_type=MotionCurveType.BOUNCE,
                bounce_amplitude=0.05
            ),
            cinematic_preset="social_media"
        )
    
    def _create_animation_preset(self) -> VideoConfiguration:
        """Create animation preset configuration."""
        return VideoConfiguration(
            resolution=ResolutionConfig(
                width=1920, height=1080,
                preset=ResolutionPreset.HD_1080P
            ),
            frame_rate=FrameRateConfig(
                fps=24.0,
                preset=FrameRatePreset.FILM_24
            ),
            quality=QualityConfig(
                preset=QualityPreset.PRODUCTION,
                quality_level=0.9,
                interpolation_samples=20,
                motion_estimation_accuracy=0.85,
                temporal_consistency_weight=0.9  # High consistency for animation
            ),
            interpolation_method="motion_compensated",
            motion_blur_enabled=True,
            motion_blur_intensity=0.5,
            depth_of_field_enabled=True,
            depth_of_field_mode="rack_focus",
            lens_simulation_enabled=True,
            lens_type="standard",
            motion_curves=MotionCurveConfig(
                curve_type=MotionCurveType.ELASTIC,
                elastic_amplitude=0.8,
                elastic_period=0.4
            ),
            cinematic_preset="animation"
        )
    
    def load_configuration(self, config_path: Path) -> VideoConfiguration:
        """Load configuration from file."""
        try:
            with open(config_path, 'r') as f:
                if config_path.suffix.lower() == '.json':
                    data = json.load(f)
                elif config_path.suffix.lower() in ['.yml', '.yaml']:
                    data = yaml.safe_load(f)
                else:
                    raise ValueError(f"Unsupported configuration format: {config_path.suffix}")
            
            # Convert dict to VideoConfiguration
            config = self._dict_to_config(data)
            
            # Validate configuration
            is_valid, issues = config.validate()
            if not is_valid:
                logger.warning(f"Configuration validation issues: {issues}")
            
            logger.info(f"Loaded configuration from {config_path}")
            return config
            
        except Exception as e:
            logger.error(f"Failed to load configuration from {config_path}: {e}")
            raise
    
    def save_configuration(self, config: VideoConfiguration, config_path: Path, 
                          format_type: ConfigurationFormat = ConfigurationFormat.JSON):
        """Save configuration to file."""
        try:
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Convert config to dict
            data = asdict(config)
            
            # Convert enums to their values for serialization
            self._convert_enums_to_values(data)
            
            # Add metadata
            import datetime
            data['modified_timestamp'] = datetime.datetime.now().isoformat()
            
            with open(config_path, 'w') as f:
                if format_type == ConfigurationFormat.JSON:
                    json.dump(data, f, indent=2, default=str)
                elif format_type == ConfigurationFormat.YAML:
                    yaml.dump(data, f, default_flow_style=False)
                else:
                    raise ValueError(f"Unsupported format: {format_type}")
            
            logger.info(f"Saved configuration to {config_path}")
            
        except Exception as e:
            logger.error(f"Failed to save configuration to {config_path}: {e}")
            raise
    
    def _convert_enums_to_values(self, data: Dict[str, Any]):
        """Convert enum objects to their string values for serialization."""
        if isinstance(data, dict):
            for key, value in data.items():
                if hasattr(value, 'value'):  # It's an enum
                    data[key] = value.value
                elif isinstance(value, dict):
                    self._convert_enums_to_values(value)
                elif isinstance(value, list):
                    for i, item in enumerate(value):
                        if isinstance(item, dict):
                            self._convert_enums_to_values(item)
                        elif hasattr(item, 'value'):
                            value[i] = item.value
                        elif isinstance(item, tuple):
                            # Convert tuples to lists for YAML compatibility
                            value[i] = list(item)
                elif isinstance(value, tuple):
                    # Convert tuples to lists for YAML compatibility
                    data[key] = list(value)
    
    def _dict_to_config(self, data: Dict[str, Any]) -> VideoConfiguration:
        """Convert dictionary to VideoConfiguration."""
        # Handle nested dataclass conversion
        if 'resolution' in data and isinstance(data['resolution'], dict):
            # Convert enum strings back to enums
            if 'preset' in data['resolution'] and isinstance(data['resolution']['preset'], str):
                data['resolution']['preset'] = ResolutionPreset(data['resolution']['preset'])
            data['resolution'] = ResolutionConfig(**data['resolution'])
        
        if 'frame_rate' in data and isinstance(data['frame_rate'], dict):
            # Convert enum strings back to enums
            if 'preset' in data['frame_rate'] and isinstance(data['frame_rate']['preset'], str):
                data['frame_rate']['preset'] = FrameRatePreset(data['frame_rate']['preset'])
            data['frame_rate'] = FrameRateConfig(**data['frame_rate'])
        
        if 'quality' in data and isinstance(data['quality'], dict):
            # Convert enum strings back to enums
            if 'preset' in data['quality'] and isinstance(data['quality']['preset'], str):
                data['quality']['preset'] = QualityPreset(data['quality']['preset'])
            data['quality'] = QualityConfig(**data['quality'])
        
        if 'motion_curves' in data and isinstance(data['motion_curves'], dict):
            # Convert enum strings back to enums
            if 'curve_type' in data['motion_curves'] and isinstance(data['motion_curves']['curve_type'], str):
                data['motion_curves']['curve_type'] = MotionCurveType(data['motion_curves']['curve_type'])
            # Convert lists back to tuples for control points
            if 'control_points' in data['motion_curves'] and isinstance(data['motion_curves']['control_points'], list):
                data['motion_curves']['control_points'] = [tuple(point) if isinstance(point, list) else point 
                                                          for point in data['motion_curves']['control_points']]
            data['motion_curves'] = MotionCurveConfig(**data['motion_curves'])
        
        if 'camera_override' in data and isinstance(data['camera_override'], dict):
            # Convert lists back to tuples for keyframes
            for keyframe_field in ['position_keyframes', 'rotation_keyframes', 'zoom_keyframes', 'timing_keyframes']:
                if keyframe_field in data['camera_override'] and isinstance(data['camera_override'][keyframe_field], list):
                    data['camera_override'][keyframe_field] = [tuple(keyframe) if isinstance(keyframe, list) else keyframe 
                                                              for keyframe in data['camera_override'][keyframe_field]]
            data['camera_override'] = CameraOverrideConfig(**data['camera_override'])
        
        return VideoConfiguration(**data)
    
    def get_preset_names(self) -> List[str]:
        """Get list of available preset names."""
        preset_files = list(self.presets_dir.glob("*.json")) + list(self.presets_dir.glob("*.yml"))
        return [f.stem for f in preset_files]
    
    def load_preset(self, preset_name: str) -> VideoConfiguration:
        """Load a preset configuration."""
        preset_file = self.presets_dir / f"{preset_name}.json"
        if not preset_file.exists():
            preset_file = self.presets_dir / f"{preset_name}.yml"
        
        if not preset_file.exists():
            raise ValueError(f"Preset '{preset_name}' not found")
        
        return self.load_configuration(preset_file)
    
    def save_preset(self, config: VideoConfiguration, preset_name: str):
        """Save configuration as a preset."""
        preset_file = self.presets_dir / f"{preset_name}.json"
        config.cinematic_preset = preset_name
        self.save_configuration(config, preset_file)
    
    def create_custom_configuration(self, base_preset: str = "cinematic", **overrides) -> VideoConfiguration:
        """Create custom configuration based on preset with overrides."""
        config = self.load_preset(base_preset)
        
        # Apply overrides
        for key, value in overrides.items():
            if hasattr(config, key):
                setattr(config, key, value)
            else:
                logger.warning(f"Unknown configuration parameter: {key}")
        
        # Mark as custom
        config.cinematic_preset = "custom"
        
        return config
    
    def optimize_for_hardware(self, config: VideoConfiguration, 
                             gpu_available: bool = True, 
                             memory_gb: float = 8.0,
                             cpu_cores: int = 4) -> VideoConfiguration:
        """Optimize configuration for available hardware."""
        optimized = deepcopy(config)
        
        # Adjust quality based on hardware
        if not gpu_available:
            optimized.quality.gpu_acceleration = False
            optimized.quality.quality_level = min(optimized.quality.quality_level, 0.7)
            optimized.quality.interpolation_samples = min(optimized.quality.interpolation_samples, 12)
        
        # Adjust memory usage
        optimized.quality.memory_limit_gb = min(memory_gb * 0.8, optimized.quality.memory_limit_gb)
        
        # Adjust parallel processing
        if cpu_cores < 4:
            optimized.quality.parallel_processing = False
        
        # Reduce effects for low-end hardware
        if memory_gb < 4:
            optimized.motion_blur_enabled = False
            optimized.depth_of_field_enabled = False
            optimized.lens_simulation_enabled = False
        
        logger.info(f"Optimized configuration for hardware: GPU={gpu_available}, RAM={memory_gb}GB, CPU={cpu_cores} cores")
        
        return optimized
    
    def validate_configuration(self, config: VideoConfiguration) -> Tuple[bool, List[str]]:
        """Validate a video configuration."""
        try:
            return config.validate()
        except Exception as e:
            logger.error(f"Configuration validation failed: {e}")
            return False, [f"Validation error: {str(e)}"]
    
    def serialize_configuration(self, config: VideoConfiguration, format_type: str) -> str:
        """Serialize configuration to string format."""
        try:
            # Convert config to dict
            data = asdict(config)
            
            # Convert enums to their values for serialization
            self._convert_enums_to_values(data)
            
            # Add metadata
            import datetime
            data['serialized_timestamp'] = datetime.datetime.now().isoformat()
            
            if format_type.lower() == "json":
                return json.dumps(data, indent=2, default=str)
            elif format_type.lower() in ["yaml", "yml"]:
                return yaml.dump(data, default_flow_style=False)
            else:
                raise ValueError(f"Unsupported serialization format: {format_type}")
                
        except Exception as e:
            logger.error(f"Configuration serialization failed: {e}")
            raise
    
    def deserialize_configuration(self, data: str, format_type: str) -> VideoConfiguration:
        """Deserialize configuration from string format."""
        try:
            if format_type.lower() == "json":
                config_dict = json.loads(data)
            elif format_type.lower() in ["yaml", "yml"]:
                config_dict = yaml.safe_load(data)
            else:
                raise ValueError(f"Unsupported deserialization format: {format_type}")
            
            # Remove metadata fields if present
            config_dict.pop('serialized_timestamp', None)
            config_dict.pop('modified_timestamp', None)
            
            # Convert dict to VideoConfiguration
            return self._dict_to_config(config_dict)
            
        except Exception as e:
            logger.error(f"Configuration deserialization failed: {e}")
            raise

    def get_configuration_summary(self, config: VideoConfiguration) -> Dict[str, Any]:
        """Get human-readable configuration summary."""
        # Handle curve_type which might be string or enum
        curve_type_value = config.motion_curves.curve_type
        if hasattr(curve_type_value, 'value'):
            curve_type_str = curve_type_value.value
        else:
            curve_type_str = str(curve_type_value)
        
        return {
            "preset": config.cinematic_preset or "custom",
            "resolution": f"{config.resolution.width}x{config.resolution.height} ({config.resolution.aspect_ratio})",
            "frame_rate": f"{config.frame_rate.fps} fps",
            "quality_level": f"{config.quality.quality_level:.1%}",
            "interpolation_method": config.interpolation_method,
            "effects": {
                "motion_blur": config.motion_blur_enabled,
                "depth_of_field": config.depth_of_field_enabled,
                "lens_simulation": config.lens_simulation_enabled
            },
            "motion_curve": curve_type_str,
            "camera_override": config.camera_override.enable_override,
            "estimated_memory_usage": f"{config.quality.memory_limit_gb:.1f} GB",
            "gpu_acceleration": config.quality.gpu_acceleration
        }


# Example usage and testing
if __name__ == "__main__":
    # Test configuration manager
    manager = VideoConfigurationManager()
    
    # Test preset loading
    print("Available presets:", manager.get_preset_names())
    
    # Load and test cinematic preset
    cinematic_config = manager.load_preset("cinematic")
    is_valid, issues = cinematic_config.validate()
    print(f"Cinematic preset valid: {is_valid}")
    if issues:
        print(f"Issues: {issues}")
    
    # Test configuration summary
    summary = manager.get_configuration_summary(cinematic_config)
    print(f"Configuration summary: {json.dumps(summary, indent=2)}")
    
    # Test custom configuration
    custom_config = manager.create_custom_configuration(
        "documentary",
        motion_blur_intensity=0.8,
        interpolation_method="ai_based"
    )
    
    # Test hardware optimization
    optimized_config = manager.optimize_for_hardware(
        custom_config,
        gpu_available=False,
        memory_gb=4.0,
        cpu_cores=2
    )
    
    print("Configuration system test completed successfully")