# Video Engine API Documentation

## Overview

The Video Engine is a sophisticated frame interpolation and camera movement system that transforms static keyframes into professional cinematic sequences. This document provides comprehensive API documentation for developers integrating the Video Engine into their applications.

## Table of Contents

1. [Core Components](#core-components)
2. [API Reference](#api-reference)
3. [Configuration Options](#configuration-options)
4. [Integration Patterns](#integration-patterns)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)

## Core Components

### VideoEngine

The main engine class that orchestrates the entire video generation pipeline.

```python
from video_engine import VideoEngine, VideoConfig

# Initialize with configuration
config = VideoConfig(
    frame_rate=24,
    resolution=(1920, 1080),
    quality="high"
)
engine = VideoEngine(config)
```

### AdvancedInterpolationEngine

Handles advanced frame interpolation with cinematic effects.

```python
from advanced_interpolation_engine import (
    AdvancedInterpolationEngine,
    create_cinematic_preset
)

# Create with preset
config = create_cinematic_preset("cinematic")
interpolator = AdvancedInterpolationEngine(config)
```

### VideoConfigurationManager

Manages video configurations and presets.

```python
from video_configuration_manager import VideoConfigurationManager

config_manager = VideoConfigurationManager()
config = config_manager.load_preset("documentary")
```

## API Reference

### VideoEngine Class

#### Constructor

```python
VideoEngine(config: VideoConfig = None)
```

**Parameters:**
- `config` (VideoConfig, optional): Video configuration object

#### Methods

##### `validate_configuration() -> Tuple[bool, List[str]]`

Validates the current configuration against professional standards.

**Returns:**
- `bool`: True if configuration is valid
- `List[str]`: List of validation issues (empty if valid)

**Example:**
```python
engine = VideoEngine(config)
is_valid, issues = engine.validate_configuration()
if not is_valid:
    print(f"Configuration issues: {issues}")
```

##### `load_project(project_path: str) -> bool`

Loads a project from the specified path.

**Parameters:**
- `project_path` (str): Path to the project directory

**Returns:**
- `bool`: True if project loaded successfully

**Example:**
```python
success = engine.load_project("/path/to/project")
if success:
    print("Project loaded successfully")
```

##### `generate_video_sequence(shot_id: str) -> VideoGenerationResult`

Generates a video sequence for the specified shot.

**Parameters:**
- `shot_id` (str): Identifier for the shot to generate

**Returns:**
- `VideoGenerationResult`: Result object with success status and metadata

**Example:**
```python
result = engine.generate_video_sequence("shot_001")
if result.success:
    print(f"Generated {result.frame_count} frames")
else:
    print(f"Generation failed: {result.error_message}")
```

##### `get_timeline_metadata() -> Dict`

Retrieves timeline metadata for the current project.

**Returns:**
- `Dict`: Timeline metadata including duration, frame count, etc.

**Example:**
```python
timeline = engine.get_timeline_metadata()
print(f"Total duration: {timeline['total_duration']} seconds")
```

### AdvancedInterpolationEngine Class

#### Constructor

```python
AdvancedInterpolationEngine(config: AdvancedInterpolationConfig)
```

**Parameters:**
- `config` (AdvancedInterpolationConfig): Advanced interpolation configuration

#### Methods

##### `interpolate_frames(keyframes: List[np.ndarray], target_frame_count: int, camera_movement: Dict = None) -> List[np.ndarray]`

Interpolates frames between keyframes with advanced algorithms and effects.

**Parameters:**
- `keyframes` (List[np.ndarray]): List of keyframe images
- `target_frame_count` (int): Number of frames to generate
- `camera_movement` (Dict, optional): Camera movement parameters

**Returns:**
- `List[np.ndarray]`: List of interpolated frames

**Example:**
```python
keyframes = [frame1, frame2]  # numpy arrays
camera_movement = {
    "type": "pan",
    "direction": "right",
    "amount": 0.2
}
interpolated = engine.interpolate_frames(keyframes, 24, camera_movement)
```

##### `validate_configuration() -> Tuple[bool, List[str]]`

Validates the interpolation configuration.

**Returns:**
- `bool`: True if configuration is valid
- `List[str]`: List of validation issues

### VideoConfigurationManager Class

#### Methods

##### `load_preset(preset_name: str) -> VideoConfig`

Loads a built-in configuration preset.

**Parameters:**
- `preset_name` (str): Name of the preset to load

**Available Presets:**
- `"documentary"`: Optimized for documentary-style content
- `"cinematic"`: High-quality cinematic production
- `"action"`: Fast-paced action sequences
- `"portrait"`: Portrait and interview content
- `"broadcast"`: Broadcast television standards
- `"web"`: Web and streaming optimization
- `"mobile"`: Mobile device optimization
- `"ultra_hq"`: Ultra high-quality production

**Example:**
```python
config_manager = VideoConfigurationManager()
config = config_manager.load_preset("cinematic")
```

##### `validate_configuration(config: VideoConfig) -> Tuple[bool, List[str]]`

Validates a configuration object.

**Parameters:**
- `config` (VideoConfig): Configuration to validate

**Returns:**
- `bool`: True if valid
- `List[str]`: Validation issues

##### `serialize_configuration(config: VideoConfig, format: str) -> str`

Serializes a configuration to string format.

**Parameters:**
- `config` (VideoConfig): Configuration to serialize
- `format` (str): Output format ("json", "yaml", "toml")

**Returns:**
- `str`: Serialized configuration

##### `deserialize_configuration(data: str, format: str) -> VideoConfig`

Deserializes a configuration from string format.

**Parameters:**
- `data` (str): Serialized configuration data
- `format` (str): Input format ("json", "yaml", "toml")

**Returns:**
- `VideoConfig`: Deserialized configuration

## Configuration Options

### VideoConfig

Main configuration class for the Video Engine.

```python
@dataclass
class VideoConfig:
    frame_rate: int = 24                    # Frames per second
    resolution: Tuple[int, int] = (1920, 1080)  # Width x Height
    quality: str = "high"                   # "low", "medium", "high", "ultra"
    parallel_processing: bool = True        # Enable parallel processing
    gpu_acceleration: bool = True           # Enable GPU acceleration
    interpolation_algorithm: InterpolationAlgorithm = InterpolationAlgorithm.OPTICAL_FLOW
    enable_motion_blur: bool = True         # Enable motion blur effects
    enable_depth_awareness: bool = True     # Enable depth-aware interpolation
    enable_character_preservation: bool = True  # Preserve character consistency
    output_format: str = "png"              # Output image format
```

### AdvancedInterpolationConfig

Configuration for advanced interpolation features.

```python
@dataclass
class AdvancedInterpolationConfig:
    method: InterpolationMethod = InterpolationMethod.OPTICAL_FLOW
    motion_blur: MotionBlurConfig = field(default_factory=MotionBlurConfig)
    depth_of_field: DepthOfFieldConfig = field(default_factory=DepthOfFieldConfig)
    lens_simulation: LensSimulationConfig = field(default_factory=LensSimulationConfig)
    ai_model_path: Optional[str] = None     # Path to AI model (optional)
    ai_quality: str = "medium"              # AI quality setting
    gpu_acceleration: bool = True           # Enable GPU acceleration
    parallel_processing: bool = True        # Enable parallel processing
    memory_limit_gb: float = 8.0           # Memory usage limit
    quality_vs_speed: float = 0.7          # Quality vs speed trade-off
```

### Camera Movement Configuration

```python
camera_movement = {
    "type": "pan",              # Movement type: pan, tilt, zoom, dolly, track
    "direction": "right",       # Direction: left, right, up, down, in, out
    "amount": 0.2,             # Movement amount (0.0 to 1.0)
    "duration": 5.0,           # Duration in seconds
    "easing": "ease_in_out"    # Easing function: linear, ease_in, ease_out, ease_in_out
}
```

## Integration Patterns

### Basic Video Generation

```python
from video_engine import VideoEngine, VideoConfig
from advanced_interpolation_engine import create_cinematic_preset

# 1. Create configuration
config = VideoConfig(
    frame_rate=24,
    resolution=(1920, 1080),
    quality="high"
)

# 2. Initialize engine
engine = VideoEngine(config)

# 3. Validate configuration
is_valid, issues = engine.validate_configuration()
if not is_valid:
    raise ValueError(f"Invalid configuration: {issues}")

# 4. Load project
if not engine.load_project("/path/to/project"):
    raise RuntimeError("Failed to load project")

# 5. Generate video
result = engine.generate_video_sequence("shot_001")
if not result.success:
    raise RuntimeError(f"Video generation failed: {result.error_message}")

print(f"Generated {result.frame_count} frames successfully")
```

### Advanced Interpolation with Effects

```python
from advanced_interpolation_engine import (
    AdvancedInterpolationEngine,
    create_cinematic_preset,
    MotionBlurType,
    DepthOfFieldMode,
    LensType
)
import numpy as np

# 1. Create advanced configuration
config = create_cinematic_preset("cinematic")

# 2. Customize effects
config.motion_blur.blur_type = MotionBlurType.RADIAL
config.motion_blur.intensity = 0.7
config.depth_of_field.mode = DepthOfFieldMode.SHALLOW
config.lens_simulation.lens_type = LensType.ANAMORPHIC

# 3. Initialize engine
engine = AdvancedInterpolationEngine(config)

# 4. Prepare keyframes
keyframes = [
    np.array(...),  # First keyframe
    np.array(...),  # Second keyframe
]

# 5. Define camera movement
camera_movement = {
    "type": "dolly",
    "direction": "in",
    "amount": 0.3,
    "duration": 3.0,
    "easing": "ease_in_out"
}

# 6. Generate interpolated frames
interpolated_frames = engine.interpolate_frames(
    keyframes, 
    target_frame_count=72,  # 3 seconds at 24fps
    camera_movement=camera_movement
)

print(f"Generated {len(interpolated_frames)} interpolated frames")
```

### Configuration Management

```python
from video_configuration_manager import VideoConfigurationManager

# 1. Initialize manager
config_manager = VideoConfigurationManager()

# 2. Load and customize preset
config = config_manager.load_preset("documentary")
config.frame_rate = 30  # Override frame rate
config.resolution = (1280, 720)  # Override resolution

# 3. Validate customized configuration
is_valid, issues = config_manager.validate_configuration(config)
if not is_valid:
    print(f"Configuration issues: {issues}")

# 4. Save configuration
json_data = config_manager.serialize_configuration(config, "json")
with open("custom_config.json", "w") as f:
    f.write(json_data)

# 5. Load saved configuration
with open("custom_config.json", "r") as f:
    loaded_data = f.read()
restored_config = config_manager.deserialize_configuration(loaded_data, "json")
```

### Pipeline Integration

```python
from video_engine import VideoEngine
from advanced_interpolation_engine import AdvancedInterpolationEngine, create_cinematic_preset

class VideoProductionPipeline:
    def __init__(self, project_path: str):
        self.project_path = project_path
        self.video_engine = None
        self.advanced_engine = None
    
    def initialize(self, preset: str = "cinematic"):
        """Initialize the video production pipeline"""
        # Setup basic video engine
        from video_engine import VideoConfig
        video_config = VideoConfig(frame_rate=24, resolution=(1920, 1080))
        self.video_engine = VideoEngine(video_config)
        
        # Setup advanced interpolation
        advanced_config = create_cinematic_preset(preset)
        self.advanced_engine = AdvancedInterpolationEngine(advanced_config)
        
        # Load project
        if not self.video_engine.load_project(self.project_path):
            raise RuntimeError("Failed to load project")
    
    def process_shot(self, shot_id: str, effects: dict = None):
        """Process a single shot with optional effects"""
        # Generate base video sequence
        result = self.video_engine.generate_video_sequence(shot_id)
        if not result.success:
            raise RuntimeError(f"Failed to generate shot {shot_id}")
        
        # Apply advanced effects if specified
        if effects and self.advanced_engine:
            # Load keyframes for the shot
            keyframes = self._load_shot_keyframes(shot_id)
            
            # Apply advanced interpolation
            enhanced_frames = self.advanced_engine.interpolate_frames(
                keyframes,
                result.frame_count,
                effects.get("camera_movement")
            )
            
            return enhanced_frames
        
        return result.frames
    
    def _load_shot_keyframes(self, shot_id: str):
        """Load keyframes for a specific shot"""
        # Implementation would load actual keyframes
        pass

# Usage
pipeline = VideoProductionPipeline("/path/to/project")
pipeline.initialize("cinematic")

effects = {
    "camera_movement": {
        "type": "pan",
        "direction": "right",
        "amount": 0.2
    }
}

frames = pipeline.process_shot("shot_001", effects)
```

## Error Handling

### Common Error Types

#### ConfigurationError
Raised when configuration validation fails.

```python
from video_engine import VideoEngine, VideoConfig, ConfigurationError

try:
    config = VideoConfig(frame_rate=-1)  # Invalid frame rate
    engine = VideoEngine(config)
    engine.validate_configuration()
except ConfigurationError as e:
    print(f"Configuration error: {e}")
```

#### ProjectLoadError
Raised when project loading fails.

```python
from video_engine import VideoEngine, ProjectLoadError

try:
    engine = VideoEngine()
    engine.load_project("/nonexistent/path")
except ProjectLoadError as e:
    print(f"Project load error: {e}")
```

#### InterpolationError
Raised when frame interpolation fails.

```python
from advanced_interpolation_engine import AdvancedInterpolationEngine, InterpolationError

try:
    engine = AdvancedInterpolationEngine(config)
    engine.interpolate_frames([], 24)  # Empty keyframes
except InterpolationError as e:
    print(f"Interpolation error: {e}")
```

### Error Handling Best Practices

```python
import logging
from video_engine import VideoEngine, VideoConfig

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def safe_video_generation(project_path: str, shot_id: str):
    """Safely generate video with comprehensive error handling"""
    try:
        # Initialize with validation
        config = VideoConfig()
        engine = VideoEngine(config)
        
        is_valid, issues = engine.validate_configuration()
        if not is_valid:
            logger.error(f"Configuration validation failed: {issues}")
            return None
        
        # Load project with error handling
        if not engine.load_project(project_path):
            logger.error(f"Failed to load project: {project_path}")
            return None
        
        # Generate video with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                result = engine.generate_video_sequence(shot_id)
                if result.success:
                    logger.info(f"Successfully generated {result.frame_count} frames")
                    return result
                else:
                    logger.warning(f"Generation attempt {attempt + 1} failed: {result.error_message}")
            except Exception as e:
                logger.warning(f"Generation attempt {attempt + 1} exception: {e}")
                if attempt == max_retries - 1:
                    raise
        
        return None
        
    except Exception as e:
        logger.error(f"Unexpected error in video generation: {e}")
        return None

# Usage
result = safe_video_generation("/path/to/project", "shot_001")
if result:
    print("Video generation successful")
else:
    print("Video generation failed")
```

## Performance Optimization

### Configuration Optimization

```python
from video_engine import VideoConfig

# High-performance configuration
high_perf_config = VideoConfig(
    frame_rate=24,
    resolution=(1920, 1080),
    quality="medium",           # Balance quality vs speed
    parallel_processing=True,   # Enable parallelization
    gpu_acceleration=True,      # Use GPU when available
)

# Memory-optimized configuration
memory_config = VideoConfig(
    frame_rate=24,
    resolution=(1280, 720),     # Lower resolution
    quality="medium",
    parallel_processing=True,
    gpu_acceleration=False,     # Reduce GPU memory usage
)
```

### Batch Processing

```python
from concurrent.futures import ThreadPoolExecutor
from video_engine import VideoEngine

def process_shots_parallel(engine: VideoEngine, shot_ids: list, max_workers: int = 4):
    """Process multiple shots in parallel"""
    def process_single_shot(shot_id):
        try:
            result = engine.generate_video_sequence(shot_id)
            return shot_id, result
        except Exception as e:
            return shot_id, None
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(process_single_shot, shot_id) for shot_id in shot_ids]
        results = [future.result() for future in futures]
    
    return results

# Usage
engine = VideoEngine()
engine.load_project("/path/to/project")

shot_ids = ["shot_001", "shot_002", "shot_003"]
results = process_shots_parallel(engine, shot_ids)

for shot_id, result in results:
    if result and result.success:
        print(f"Shot {shot_id}: {result.frame_count} frames generated")
    else:
        print(f"Shot {shot_id}: Generation failed")
```

### Memory Management

```python
import gc
from video_engine import VideoEngine

def memory_efficient_processing(engine: VideoEngine, shot_ids: list):
    """Process shots with memory management"""
    for shot_id in shot_ids:
        try:
            # Process shot
            result = engine.generate_video_sequence(shot_id)
            
            if result.success:
                # Process frames immediately
                process_frames(result.frames)
                
                # Clear frames from memory
                del result.frames
                
            # Force garbage collection
            gc.collect()
            
        except Exception as e:
            print(f"Error processing {shot_id}: {e}")
            gc.collect()  # Clean up on error too

def process_frames(frames):
    """Process frames (placeholder)"""
    # Your frame processing logic here
    pass
```

### Performance Monitoring

```python
import time
import psutil
from video_engine import VideoEngine

class PerformanceMonitor:
    def __init__(self):
        self.start_time = None
        self.start_memory = None
    
    def start_monitoring(self):
        """Start performance monitoring"""
        self.start_time = time.time()
        self.start_memory = psutil.Process().memory_info().rss
    
    def stop_monitoring(self, frame_count: int):
        """Stop monitoring and return metrics"""
        end_time = time.time()
        end_memory = psutil.Process().memory_info().rss
        
        duration = end_time - self.start_time
        memory_used = end_memory - self.start_memory
        fps = frame_count / duration if duration > 0 else 0
        
        return {
            "duration": duration,
            "fps": fps,
            "memory_used_mb": memory_used / 1024 / 1024,
            "frames_generated": frame_count
        }

# Usage
monitor = PerformanceMonitor()
engine = VideoEngine()

monitor.start_monitoring()
result = engine.generate_video_sequence("shot_001")
metrics = monitor.stop_monitoring(result.frame_count if result.success else 0)

print(f"Performance: {metrics['fps']:.1f} fps, {metrics['memory_used_mb']:.1f} MB used")
```

## Best Practices

### 1. Configuration Management
- Always validate configurations before use
- Use presets as starting points for customization
- Save and version control custom configurations
- Test configurations with small samples first

### 2. Error Handling
- Implement comprehensive error handling for all operations
- Use logging for debugging and monitoring
- Implement retry logic for transient failures
- Validate inputs before processing

### 3. Performance Optimization
- Enable parallel processing for multi-core systems
- Use GPU acceleration when available
- Monitor memory usage for large projects
- Process shots in batches for efficiency

### 4. Quality Assurance
- Validate output quality using built-in metrics
- Test with representative content samples
- Monitor temporal coherence across sequences
- Verify professional standards compliance

### 5. Integration
- Use the pipeline pattern for complex workflows
- Implement proper resource cleanup
- Handle project state management carefully
- Provide progress feedback for long operations

This API documentation provides comprehensive guidance for integrating and using the Video Engine effectively in production environments.