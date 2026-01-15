#!/usr/bin/env python3
"""
StoryCore-Engine Video Engine
Transforms static keyframes into animated video sequences with camera movement and temporal coherence.
"""

import logging
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import time

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import circuit breaker for anti-blocking protection
try:
    from circuit_breaker import circuit_manager, CircuitBreakerConfig, CircuitBreakerError
    CIRCUIT_BREAKER_AVAILABLE = True
except ImportError:
    logger.warning("Circuit breaker not available - operations may be vulnerable to blocking")
    CIRCUIT_BREAKER_AVAILABLE = False

# Import performance monitoring
try:
    from video_performance_monitor import VideoPerformanceMonitor, OptimizationStrategy
    PERFORMANCE_MONITORING_AVAILABLE = True
except ImportError:
    logger.warning("Performance monitoring not available - using basic monitoring")
    PERFORMANCE_MONITORING_AVAILABLE = False

# Import cross-platform compatibility
try:
    from cross_platform_compatibility import CrossPlatformManager
    CROSS_PLATFORM_AVAILABLE = True
except ImportError:
    logger.warning("Cross-platform compatibility not available - using basic configuration")
    CROSS_PLATFORM_AVAILABLE = False


class InterpolationAlgorithm(Enum):
    """Available frame interpolation algorithms."""
    LINEAR = "linear"
    OPTICAL_FLOW = "optical_flow"
    DEPTH_AWARE = "depth_aware"


class CameraMovement(Enum):
    """Available camera movement types."""
    PAN = "pan"
    TILT = "tilt"
    ZOOM = "zoom"
    DOLLY = "dolly"
    TRACK = "track"
    STATIC = "static"


class EasingType(Enum):
    """Available easing curve types for smooth motion."""
    LINEAR = "linear"
    EASE_IN = "ease_in"
    EASE_OUT = "ease_out"
    EASE_IN_OUT = "ease_in_out"


@dataclass
class VideoConfig:
    """Configuration for video generation."""
    frame_rate: int = 24
    resolution: Tuple[int, int] = (1920, 1080)
    interpolation_algorithm: InterpolationAlgorithm = InterpolationAlgorithm.OPTICAL_FLOW
    quality: str = "high"  # low, medium, high, ultra
    enable_motion_blur: bool = True
    enable_depth_awareness: bool = True
    enable_character_preservation: bool = True
    output_format: str = "png"
    parallel_processing: bool = True
    gpu_acceleration: bool = True


@dataclass
class KeyframeData:
    """Data structure for keyframe information."""
    frame_id: str
    image_path: str
    timestamp: float
    shot_id: str
    metadata: Dict[str, Any]


@dataclass
class CameraMovementSpec:
    """Specification for camera movement."""
    movement_type: CameraMovement
    start_position: Dict[str, float]
    end_position: Dict[str, float]
    duration: float
    easing: EasingType = EasingType.EASE_IN_OUT
    compound_movements: Optional[List['CameraMovementSpec']] = None


@dataclass
class ShotData:
    """Data structure for shot information."""
    shot_id: str
    keyframes: List[KeyframeData]
    camera_movement: Optional[CameraMovementSpec]
    duration: float
    frame_count: int
    metadata: Dict[str, Any]


@dataclass
class VideoGenerationResult:
    """Result of video generation process."""
    success: bool
    shot_id: str
    frame_sequence_path: str
    frame_count: int
    duration: float
    quality_metrics: Dict[str, float]
    timeline_metadata: Dict[str, Any]
    processing_time: float
    error_message: Optional[str] = None


class VideoEngine:
    """
    Main Video Engine class for transforming keyframes into animated sequences.
    
    This engine handles:
    - Frame interpolation between keyframes
    - Camera movement application
    - Temporal coherence maintenance
    - Quality validation and reporting
    - Timeline management for audio synchronization
    """
    
    def __init__(self, config: Optional[VideoConfig] = None):
        """Initialize Video Engine with configuration."""
        self.config = config or VideoConfig()
        self.project_path: Optional[Path] = None
        self.shots: List[ShotData] = []
        
        # Initialize circuit breakers for anti-blocking protection
        if CIRCUIT_BREAKER_AVAILABLE:
            # Configure circuit breakers for different operations
            self.frame_processing_breaker = circuit_manager.get_breaker(
                "video_frame_processing",
                CircuitBreakerConfig(
                    failure_threshold=3,
                    recovery_timeout=30.0,
                    success_threshold=2,
                    timeout=60.0,  # 1 minute timeout for frame processing
                    max_concurrent=4
                )
            )
            
            self.interpolation_breaker = circuit_manager.get_breaker(
                "video_interpolation",
                CircuitBreakerConfig(
                    failure_threshold=5,
                    recovery_timeout=45.0,
                    success_threshold=3,
                    timeout=120.0,  # 2 minute timeout for interpolation
                    max_concurrent=2
                )
            )
            
            self.export_breaker = circuit_manager.get_breaker(
                "video_export",
                CircuitBreakerConfig(
                    failure_threshold=2,
                    recovery_timeout=60.0,
                    success_threshold=1,
                    timeout=300.0,  # 5 minute timeout for export
                    max_concurrent=1
                )
            )
            
            logger.info("Circuit breakers initialized for video operations")
        else:
            self.frame_processing_breaker = None
            self.interpolation_breaker = None
            self.export_breaker = None
        
        # Initialize cross-platform compatibility
        if CROSS_PLATFORM_AVAILABLE:
            self.platform_manager = CrossPlatformManager()
            
            # Adapt configuration for current platform
            platform_config = self.platform_manager.get_optimal_config()
            self._adapt_config_for_platform(platform_config)
            
            logger.info(f"Cross-platform support initialized for {platform_config['platform']['type']}")
        else:
            self.platform_manager = None
            logger.warning("Cross-platform compatibility not available")
        
        # Initialize performance monitoring
        if PERFORMANCE_MONITORING_AVAILABLE:
            optimization_strategy = OptimizationStrategy.BALANCED
            if hasattr(self.config, 'optimization_strategy'):
                optimization_strategy = self.config.optimization_strategy
            
            self.performance_monitor = VideoPerformanceMonitor(optimization_strategy)
            self.performance_monitor.start_monitoring()
            logger.info("Performance monitoring enabled")
        else:
            self.performance_monitor = None
        
        # Initialize components (will be implemented in subsequent tasks)
        self.frame_interpolator = None
        self.camera_movement_system = None
        self.timeline_manager = None
        self.motion_coherence_engine = None
        self.quality_validator = None
        self.export_manager = None
        
        logger.info(f"Video Engine initialized with config: {self.config}")
    
    def _adapt_config_for_platform(self, platform_config: Dict[str, Any]) -> None:
        """Adapt video configuration for current platform capabilities."""
        if not platform_config:
            return
        
        # Adapt parallel processing based on CPU cores
        processing_config = platform_config.get('processing', {})
        max_workers = processing_config.get('max_workers', 4)
        
        if max_workers <= 2:
            self.config.parallel_processing = False
            logger.info("Disabled parallel processing due to limited CPU cores")
        
        # Adapt GPU acceleration based on hardware
        hardware = platform_config.get('hardware', {})
        if not hardware.get('gpu_available', False):
            self.config.gpu_acceleration = False
            logger.info("Disabled GPU acceleration - no compatible GPU found")
        
        # Adapt memory usage based on available memory
        memory_gb = hardware.get('memory_gb', 8.0)
        if memory_gb < 4.0:
            # Low memory - reduce quality and disable some features
            if self.config.quality == "ultra":
                self.config.quality = "high"
            elif self.config.quality == "high":
                self.config.quality = "medium"
            
            self.config.enable_depth_awareness = False
            logger.info(f"Adapted configuration for low memory ({memory_gb:.1f}GB)")
        
        # Platform-specific optimizations
        platform_type = platform_config.get('platform', {}).get('type', 'unknown')
        if platform_type == 'windows':
            # Windows-specific optimizations
            pass
        elif platform_type == 'linux':
            # Linux-specific optimizations
            pass
        elif platform_type == 'macos':
            # macOS-specific optimizations
            if hardware.get('gpu_type') == 'metal':
                logger.info("Metal GPU support detected on macOS")
    
    def get_platform_info(self) -> Dict[str, Any]:
        """Get current platform information and capabilities."""
        if self.platform_manager:
            return self.platform_manager.get_compatibility_report()
        else:
            # Fallback basic platform info
            import platform
            return {
                "platform_info": {
                    "type": platform.system().lower(),
                    "architecture": platform.machine(),
                    "python_version": platform.python_version()
                },
                "validation": {
                    "is_compatible": True,
                    "issues": ["Cross-platform compatibility module not available"]
                }
            }
    
    def validate_platform_compatibility(self) -> Tuple[bool, List[str]]:
        """Validate that the current platform is compatible with video generation."""
        if self.platform_manager:
            return self.platform_manager.validate_dependencies()
        else:
            # Basic validation without platform manager
            issues = []
            
            try:
                import cv2
            except ImportError:
                issues.append("OpenCV not available - required for image processing")
            
            import platform
            python_version = tuple(map(int, platform.python_version().split('.')))
            if python_version < (3, 9):
                issues.append(f"Python 3.9+ required, found {platform.python_version()}")
            
            return len(issues) == 0, issues
    
    def get_optimized_processing_config(self) -> Dict[str, Any]:
        """Get processing configuration optimized for current platform."""
        if self.platform_manager:
            # Use platform manager for optimal configuration
            base_config = {
                "parallel_processing": self.config.parallel_processing,
                "gpu_acceleration": self.config.gpu_acceleration,
                "max_workers": 4,
                "batch_size": 4
            }
            return self.platform_manager.adapt_for_hardware(base_config)
        else:
            # Fallback configuration
            return {
                "parallel_processing": self.config.parallel_processing,
                "gpu_acceleration": False,  # Conservative default
                "max_workers": 2,
                "batch_size": 1
            }
    
    def load_project(self, project_path: str) -> bool:
        """
        Load project data and keyframes for video generation.
        
        Args:
            project_path: Path to the StoryCore project directory
            
        Returns:
            bool: True if project loaded successfully
        """
        try:
            self.project_path = Path(project_path)
            
            # Load project.json for metadata
            project_file = self.project_path / "project.json"
            if not project_file.exists():
                logger.error(f"Project file not found: {project_file}")
                return False
            
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            
            # Load keyframes from ComfyUI Image Engine output
            keyframes_dir = self.project_path / "assets" / "images" / "generated"
            if not keyframes_dir.exists():
                logger.warning(f"Generated images directory not found: {keyframes_dir}")
                logger.info("Creating mock keyframes for demonstration")
                # Still load shots from project data, but with mock keyframes
                self._load_shots_and_keyframes(project_data)
                self._create_mock_keyframes()
                return True
            
            # Load shot data and keyframes
            self._load_shots_and_keyframes(project_data)
            
            logger.info(f"Project loaded successfully: {len(self.shots)} shots found")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load project: {e}")
            return False
    
    def generate_video_sequence(self, shot_id: str) -> VideoGenerationResult:
        """
        Generate video sequence for a specific shot with circuit breaker protection.
        
        Args:
            shot_id: Identifier for the shot to process
            
        Returns:
            VideoGenerationResult: Result of video generation
        """
        start_time = time.time()
        
        try:
            # Find shot data
            shot = self._find_shot(shot_id)
            if not shot:
                return VideoGenerationResult(
                    success=False,
                    shot_id=shot_id,
                    frame_sequence_path="",
                    frame_count=0,
                    duration=0.0,
                    quality_metrics={},
                    timeline_metadata={},
                    processing_time=0.0,
                    error_message=f"Shot not found: {shot_id}"
                )
            
            logger.info(f"Generating video sequence for shot: {shot_id}")
            
            # Use circuit breaker protection if available
            if CIRCUIT_BREAKER_AVAILABLE and self.frame_processing_breaker:
                try:
                    # Protected video generation with circuit breaker
                    result = self.frame_processing_breaker.call(
                        self._protected_generate_video_sequence, shot
                    )
                except CircuitBreakerError as e:
                    logger.error(f"Circuit breaker prevented video generation: {e}")
                    return VideoGenerationResult(
                        success=False,
                        shot_id=shot_id,
                        frame_sequence_path="",
                        frame_count=0,
                        duration=0.0,
                        quality_metrics={},
                        timeline_metadata={},
                        processing_time=time.time() - start_time,
                        error_message=f"Operation blocked by circuit breaker: {e}"
                    )
            else:
                # Fallback without circuit breaker protection
                result = self._protected_generate_video_sequence(shot)
            
            processing_time = time.time() - start_time
            result.processing_time = processing_time
            
            logger.info(f"Video sequence generated in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Video generation failed: {e}")
            return VideoGenerationResult(
                success=False,
                shot_id=shot_id,
                frame_sequence_path="",
                frame_count=0,
                duration=0.0,
                quality_metrics={},
                timeline_metadata={},
                processing_time=processing_time,
                error_message=str(e)
            )
    
    def _protected_generate_video_sequence(self, shot: ShotData) -> VideoGenerationResult:
        """Protected video generation method that can be wrapped by circuit breaker."""
        # Use performance monitoring if available
        if self.performance_monitor:
            with self.performance_monitor.monitor_operation(f"video_generation_{shot.shot_id}", shot.frame_count) as operation_id:
                # Optimize processing settings
                settings = self.performance_monitor.optimize_processing_settings(shot.frame_count, self.config.quality)
                logger.info(f"Using optimized settings: {settings}")
                
                # Generate video with monitoring
                result = self._generate_video_sequence_with_monitoring(shot, operation_id, settings)
        else:
            # Generate without monitoring
            result = self._generate_mock_video_sequence(shot)
        
        return result
    
    def generate_all_sequences(self) -> List[VideoGenerationResult]:
        """
        Generate video sequences for all shots in the project.
        
        Returns:
            List[VideoGenerationResult]: Results for all shots
        """
        results = []
        
        for shot in self.shots:
            result = self.generate_video_sequence(shot.shot_id)
            results.append(result)
        
        return results
    
    def get_timeline_metadata(self) -> Dict[str, Any]:
        """
        Generate timeline metadata for audio synchronization.
        
        Returns:
            Dict containing timeline information
        """
        timeline_data = {
            "total_duration": sum(shot.duration for shot in self.shots),
            "frame_rate": self.config.frame_rate,
            "total_frames": sum(shot.frame_count for shot in self.shots),
            "shots": []
        }
        
        current_time = 0.0
        for shot in self.shots:
            shot_timeline = {
                "shot_id": shot.shot_id,
                "start_time": current_time,
                "end_time": current_time + shot.duration,
                "duration": shot.duration,
                "frame_count": shot.frame_count,
                "keyframes": len(shot.keyframes)
            }
            timeline_data["shots"].append(shot_timeline)
            current_time += shot.duration
        
        return timeline_data
    
    def validate_configuration(self) -> Tuple[bool, List[str]]:
        """
        Validate current configuration for video generation.
        
        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []
        
        # Validate frame rate
        if self.config.frame_rate not in [24, 25, 30, 60]:
            issues.append(f"Unsupported frame rate: {self.config.frame_rate}")
        
        # Validate resolution
        width, height = self.config.resolution
        if width < 640 or height < 480:
            issues.append(f"Resolution too low: {width}x{height}")
        
        # Validate aspect ratio (should be close to 16:9)
        aspect_ratio = width / height
        if abs(aspect_ratio - 16/9) > 0.1:
            issues.append(f"Non-standard aspect ratio: {aspect_ratio:.2f} (expected ~1.78)")
        
        # Validate output format
        if self.config.output_format not in ['png', 'jpeg', 'exr']:
            issues.append(f"Unsupported output format: {self.config.output_format}")
        
        return len(issues) == 0, issues
    
    def _find_shot(self, shot_id: str) -> Optional[ShotData]:
        """Find shot data by ID."""
        for shot in self.shots:
            if shot.shot_id == shot_id:
                return shot
        return None
    
    def get_shot(self, shot_id: str) -> Optional[ShotData]:
        """Get shot data by ID (public interface)."""
        return self._find_shot(shot_id)
    
    def list_shots(self) -> List[str]:
        """List all available shot IDs."""
        return [shot.shot_id for shot in self.shots]
    
    def add_shot(self, shot: ShotData) -> None:
        """Add a shot to the video engine."""
        # Remove existing shot with same ID if it exists
        self.shots = [s for s in self.shots if s.shot_id != shot.shot_id]
        self.shots.append(shot)
        logger.info(f"Added shot: {shot.shot_id}")
    
    def remove_shot(self, shot_id: str) -> bool:
        """Remove a shot by ID."""
        original_count = len(self.shots)
        self.shots = [s for s in self.shots if s.shot_id != shot_id]
        removed = len(self.shots) < original_count
        if removed:
            logger.info(f"Removed shot: {shot_id}")
        return removed
    
    def _load_shots_and_keyframes(self, project_data: Dict[str, Any]):
        """Load shots and keyframes from project data."""
        # Parse shots from project data
        shots_data = project_data.get("shots", [])
        
        if not shots_data:
            # Create default mock shots if none specified
            shots_data = [
                {"id": "shot_001", "duration": 5.0, "keyframes": 2},
                {"id": "shot_002", "duration": 3.0, "keyframes": 2},
                {"id": "shot_003", "duration": 4.0, "keyframes": 3}
            ]
        
        self.shots = []
        
        for shot_info in shots_data:
            shot_id = shot_info.get("id", f"shot_{len(self.shots)+1:03d}")
            duration = shot_info.get("duration", 3.0)
            keyframe_count = shot_info.get("keyframes", 2)
            
            # Create keyframes for this shot
            keyframes = []
            for i in range(keyframe_count):
                timestamp = (duration / keyframe_count) * i
                keyframe = KeyframeData(
                    frame_id=f"{shot_id}_frame_{i+1:03d}",
                    image_path=f"assets/images/generated/{shot_id}_frame_{i+1:03d}.png",
                    timestamp=timestamp,
                    shot_id=shot_id,
                    metadata={"quality_score": 0.95 - (i * 0.01)}
                )
                keyframes.append(keyframe)
            
            # Create camera movement for this shot
            camera_movement = CameraMovementSpec(
                movement_type=CameraMovement.PAN if len(self.shots) % 2 == 0 else CameraMovement.ZOOM,
                start_position={"x": 0, "y": 0, "z": 0},
                end_position={"x": 100, "y": 0, "z": 0} if len(self.shots) % 2 == 0 else {"x": 0, "y": 0, "z": 50},
                duration=duration,
                easing=EasingType.EASE_IN_OUT
            )
            
            # Create shot data
            shot = ShotData(
                shot_id=shot_id,
                keyframes=keyframes,
                camera_movement=camera_movement,
                duration=duration,
                frame_count=int(duration * self.config.frame_rate),
                metadata={"shot_type": "establishing" if len(self.shots) == 0 else "action"}
            )
            
            self.shots.append(shot)
            logger.info(f"Loaded shot: {shot_id} ({duration}s, {keyframe_count} keyframes)")
        
        logger.info(f"Loaded {len(self.shots)} shots total")
    
    def _create_mock_keyframes(self):
        """Create mock keyframes for demonstration."""
        logger.info("Creating mock keyframes for demonstration")
        # This would create placeholder keyframe data
        pass
    
    def _generate_mock_video_sequence(self, shot: ShotData) -> VideoGenerationResult:
        """Generate mock video sequence for demonstration."""
        # Create output directory
        output_dir = self.project_path / "assets" / "video" / "sequences" / shot.shot_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Mock quality metrics
        quality_metrics = {
            "visual_quality": 0.95,
            "motion_smoothness": 0.92,
            "temporal_coherence": 0.94,
            "overall_score": 0.94
        }
        
        # Mock timeline metadata
        timeline_metadata = {
            "shot_id": shot.shot_id,
            "start_frame": 0,
            "end_frame": shot.frame_count - 1,
            "keyframe_positions": [0, shot.frame_count - 1],
            "camera_movement": asdict(shot.camera_movement) if shot.camera_movement else None
        }
        
        return VideoGenerationResult(
            success=True,
            shot_id=shot.shot_id,
            frame_sequence_path=str(output_dir),
            frame_count=shot.frame_count,
            duration=shot.duration,
            quality_metrics=quality_metrics,
            timeline_metadata=timeline_metadata,
            processing_time=0.0  # Will be set by caller
        )
    
    def _generate_video_sequence_with_monitoring(self, shot: ShotData, operation_id: str, settings: Dict[str, Any]) -> VideoGenerationResult:
        """Generate video sequence with performance monitoring."""
        # Create output directory
        output_dir = self.project_path / "assets" / "video" / "sequences" / shot.shot_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Simulate frame processing with progress updates
        total_frames = shot.frame_count
        for i in range(total_frames):
            # Simulate frame processing time
            import time
            time.sleep(0.01)  # Simulate processing
            
            # Update progress
            if self.performance_monitor:
                self.performance_monitor.progress_tracker.update_progress(
                    operation_id, 
                    i + 1,
                    {"current_frame": i + 1, "processing_stage": "interpolation"}
                )
        
        # Mock quality metrics with performance considerations
        quality_metrics = {
            "visual_quality": 0.95 if settings.get('quality_level') == 'ultra' else 0.90,
            "motion_smoothness": 0.92,
            "temporal_coherence": 0.94,
            "overall_score": 0.94,
            "processing_settings": settings
        }
        
        # Mock timeline metadata
        timeline_metadata = {
            "shot_id": shot.shot_id,
            "start_frame": 0,
            "end_frame": shot.frame_count - 1,
            "keyframe_positions": [0, shot.frame_count - 1],
            "camera_movement": asdict(shot.camera_movement) if shot.camera_movement else None,
            "performance_optimized": True
        }
        
        return VideoGenerationResult(
            success=True,
            shot_id=shot.shot_id,
            frame_sequence_path=str(output_dir),
            frame_count=shot.frame_count,
            duration=shot.duration,
            quality_metrics=quality_metrics,
            timeline_metadata=timeline_metadata,
            processing_time=0.0  # Will be set by caller
        )
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report."""
        if self.performance_monitor:
            return self.performance_monitor.get_performance_report()
        else:
            return {"message": "Performance monitoring not available"}
    
    def export_performance_data(self, output_path: str):
        """Export performance data to file."""
        if self.performance_monitor:
            self.performance_monitor.export_performance_data(output_path)
            logger.info(f"Performance data exported to: {output_path}")
        else:
            logger.warning("Performance monitoring not available - cannot export data")
    
    def optimize_for_hardware(self) -> Dict[str, Any]:
        """Optimize video engine settings for current hardware."""
        if self.performance_monitor:
            # Get current system resources
            resources = self.performance_monitor.resource_monitor.get_current_resources()
            
            # Optimize configuration based on available resources
            optimizations = {
                "parallel_processing": self.config.parallel_processing,
                "gpu_acceleration": self.config.gpu_acceleration and resources.gpu_available,
                "recommended_batch_size": 4 if resources.memory_available_gb > 8 else 2,
                "recommended_workers": min(8, resources.cpu_count),
                "memory_optimization": resources.memory_usage_percent > 70
            }
            
            # Apply optimizations to config
            if optimizations["memory_optimization"]:
                self.config.parallel_processing = False
                logger.info("Disabled parallel processing due to high memory usage")
            
            if not optimizations["gpu_acceleration"]:
                logger.info("GPU acceleration not available or disabled")
            
            return optimizations
        else:
            return {"message": "Performance monitoring not available for optimization"}
    
    def cleanup_resources(self):
        """Clean up resources and stop monitoring."""
        if self.performance_monitor:
            self.performance_monitor.stop_monitoring()
            logger.info("Performance monitoring stopped")
        
        # Get circuit breaker statistics before cleanup
        if CIRCUIT_BREAKER_AVAILABLE:
            stats = self.get_circuit_breaker_stats()
            logger.info(f"Circuit breaker statistics: {stats}")
    
    def get_circuit_breaker_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics for all video operations."""
        if not CIRCUIT_BREAKER_AVAILABLE:
            return {"message": "Circuit breaker not available"}
        
        return circuit_manager.get_all_stats()
    
    def reset_circuit_breakers(self):
        """Reset all circuit breakers to closed state (for recovery)."""
        if CIRCUIT_BREAKER_AVAILABLE:
            circuit_manager.force_close_all()
            logger.info("All circuit breakers reset to closed state")
    
    def emergency_stop_all_operations(self):
        """Emergency stop - open all circuit breakers to prevent new operations."""
        if CIRCUIT_BREAKER_AVAILABLE:
            circuit_manager.force_open_all()
            logger.warning("Emergency stop activated - all circuit breakers opened")


def main():
    """Main function for testing Video Engine."""
    # Create test configuration
    config = VideoConfig(
        frame_rate=24,
        resolution=(1920, 1080),
        quality="high"
    )
    
    # Initialize engine
    engine = VideoEngine(config)
    
    # Validate configuration
    is_valid, issues = engine.validate_configuration()
    if not is_valid:
        print("Configuration issues:")
        for issue in issues:
            print(f"  - {issue}")
        return
    
    print("Video Engine initialized successfully")
    print(f"Configuration: {config}")


if __name__ == "__main__":
    main()