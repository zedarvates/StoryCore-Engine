# Video Engine Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when using the Video Engine. Each section includes problem identification, root cause analysis, and step-by-step solutions.

## Table of Contents

1. [Installation and Setup Issues](#installation-and-setup-issues)
2. [Configuration Problems](#configuration-problems)
3. [Performance Issues](#performance-issues)
4. [Memory and Resource Problems](#memory-and-resource-problems)
5. [Quality and Output Issues](#quality-and-output-issues)
6. [Integration Problems](#integration-problems)
7. [Error Messages and Solutions](#error-messages-and-solutions)

## Installation and Setup Issues

### Problem: Video Engine fails to initialize

**Symptoms:**
- ImportError when importing video_engine modules
- "Module not found" errors
- Initialization fails with configuration errors

**Diagnosis:**
```python
# Test basic imports
try:
    from video_engine import VideoEngine, VideoConfig
    print("✅ Basic imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")

try:
    from advanced_interpolation_engine import AdvancedInterpolationEngine
    print("✅ Advanced engine imports successful")
except ImportError as e:
    print(f"❌ Advanced engine import error: {e}")
```

**Solutions:**

1. **Check Python Environment:**
```bash
# Verify Python version (3.8+ required)
python --version

# Check installed packages
pip list | grep -E "(numpy|opencv|pillow)"
```

2. **Install Missing Dependencies:**
```bash
# Install core dependencies
pip install numpy>=1.19.0
pip install opencv-python>=4.5.0
pip install Pillow>=8.0.0

# For advanced features
pip install scipy>=1.7.0
pip install scikit-image>=0.18.0
```

3. **Verify Installation:**
```python
# Test basic functionality
from video_engine import VideoEngine, VideoConfig

config = VideoConfig()
engine = VideoEngine(config)
is_valid, issues = engine.validate_configuration()

if is_valid:
    print("✅ Video Engine setup successful")
else:
    print(f"⚠️  Configuration issues: {issues}")
```

### Problem: GPU acceleration not working

**Symptoms:**
- GPU acceleration setting ignored
- Processing falls back to CPU
- CUDA/OpenCL errors

**Diagnosis:**
```python
import cv2

# Check OpenCV GPU support
print(f"OpenCV version: {cv2.__version__}")
print(f"CUDA support: {cv2.cuda.getCudaEnabledDeviceCount() > 0}")

# Test GPU availability
try:
    import torch
    print(f"PyTorch CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU device: {torch.cuda.get_device_name(0)}")
except ImportError:
    print("PyTorch not available")
```

**Solutions:**

1. **Install GPU-enabled OpenCV:**
```bash
# Uninstall CPU-only version
pip uninstall opencv-python

# Install GPU-enabled version
pip install opencv-contrib-python
```

2. **Verify GPU Drivers:**
```bash
# Check NVIDIA drivers (Linux/Windows)
nvidia-smi

# Check CUDA installation
nvcc --version
```

3. **Configure GPU Settings:**
```python
from video_engine import VideoConfig

config = VideoConfig(
    gpu_acceleration=True,
    parallel_processing=True
)

# Test GPU configuration
engine = VideoEngine(config)
is_valid, issues = engine.validate_configuration()
```

## Configuration Problems

### Problem: Invalid configuration parameters

**Symptoms:**
- Configuration validation fails
- "Invalid frame rate" or "Invalid resolution" errors
- Engine initialization fails

**Common Invalid Configurations:**
```python
# ❌ Invalid configurations
bad_configs = [
    VideoConfig(frame_rate=0),           # Invalid frame rate
    VideoConfig(frame_rate=200),         # Too high frame rate
    VideoConfig(resolution=(0, 0)),      # Invalid resolution
    VideoConfig(resolution=(10000, 10000)), # Too high resolution
    VideoConfig(quality="invalid"),      # Invalid quality setting
]
```

**Solutions:**

1. **Use Configuration Validation:**
```python
from video_engine import VideoConfig

def create_safe_config(**kwargs):
    """Create configuration with validation"""
    try:
        config = VideoConfig(**kwargs)
        
        # Validate configuration
        temp_engine = VideoEngine(config)
        is_valid, issues = temp_engine.validate_configuration()
        
        if not is_valid:
            print(f"⚠️  Configuration issues found: {issues}")
            
            # Apply fixes
            if config.frame_rate <= 0 or config.frame_rate > 120:
                config.frame_rate = 24
                print("🔧 Fixed frame rate to 24 fps")
            
            width, height = config.resolution
            if width <= 0 or height <= 0:
                config.resolution = (1920, 1080)
                print("🔧 Fixed resolution to 1920x1080")
            
            if config.quality not in ["low", "medium", "high", "ultra"]:
                config.quality = "medium"
                print("🔧 Fixed quality to medium")
        
        return config
        
    except Exception as e:
        print(f"❌ Configuration creation failed: {e}")
        return VideoConfig()  # Return default config

# Usage
config = create_safe_config(
    frame_rate=24,
    resolution=(1920, 1080),
    quality="high"
)
```

2. **Use Preset Configurations:**
```python
from video_configuration_manager import VideoConfigurationManager

config_manager = VideoConfigurationManager()

# Use tested presets
presets = ["documentary", "cinematic", "action", "portrait"]
for preset_name in presets:
    try:
        config = config_manager.load_preset(preset_name)
        is_valid, issues = config_manager.validate_configuration(config)
        
        if is_valid:
            print(f"✅ {preset_name} preset is valid")
        else:
            print(f"⚠️  {preset_name} preset issues: {issues}")
            
    except Exception as e:
        print(f"❌ Failed to load {preset_name}: {e}")
```

### Problem: Preset configuration not working

**Symptoms:**
- Preset loading fails
- Unexpected behavior with presets
- Performance issues with certain presets

**Diagnosis:**
```python
from video_configuration_manager import VideoConfigurationManager

config_manager = VideoConfigurationManager()

# Test all available presets
available_presets = [
    "documentary", "cinematic", "action", "portrait",
    "broadcast", "web", "mobile", "ultra_hq"
]

for preset in available_presets:
    try:
        config = config_manager.load_preset(preset)
        is_valid, issues = config_manager.validate_configuration(config)
        
        print(f"{preset}: {'✅ Valid' if is_valid else '❌ Invalid'}")
        if not is_valid:
            print(f"  Issues: {issues}")
            
    except Exception as e:
        print(f"{preset}: ❌ Load failed - {e}")
```

**Solutions:**

1. **Customize Presets for Your System:**
```python
# Load base preset and customize
config = config_manager.load_preset("cinematic")

# Adjust for your hardware
config.gpu_acceleration = True  # Enable if you have GPU
config.parallel_processing = True  # Enable for multi-core
config.resolution = (1280, 720)  # Lower if needed

# Validate customized config
is_valid, issues = config_manager.validate_configuration(config)
if is_valid:
    print("✅ Customized configuration is valid")
```

2. **Create Custom Preset:**
```python
# Create your own optimized preset
custom_config = VideoConfig(
    frame_rate=30,
    resolution=(1920, 1080),
    quality="high",
    parallel_processing=True,
    gpu_acceleration=True
)

# Save as JSON for reuse
json_data = config_manager.serialize_configuration(custom_config, "json")
with open("my_preset.json", "w") as f:
    f.write(json_data)

# Load custom preset
with open("my_preset.json", "r") as f:
    loaded_data = f.read()
loaded_config = config_manager.deserialize_configuration(loaded_data, "json")
```

## Performance Issues

### Problem: Slow video generation

**Symptoms:**
- Processing takes much longer than expected
- Low FPS during generation
- System becomes unresponsive

**Performance Diagnosis:**
```python
import time
import psutil
from video_engine import VideoEngine, VideoConfig

def diagnose_performance(project_path: str, shot_id: str):
    """Diagnose performance issues"""
    
    # Test different configurations
    configs = {
        "basic": VideoConfig(quality="low", gpu_acceleration=False),
        "gpu": VideoConfig(quality="medium", gpu_acceleration=True),
        "parallel": VideoConfig(quality="medium", parallel_processing=True),
        "optimized": VideoConfig(
            quality="medium",
            gpu_acceleration=True,
            parallel_processing=True
        )
    }
    
    results = {}
    
    for name, config in configs.items():
        print(f"🧪 Testing {name} configuration...")
        
        try:
            engine = VideoEngine(config)
            engine.load_project(project_path)
            
            # Monitor system resources
            cpu_before = psutil.cpu_percent()
            memory_before = psutil.virtual_memory().percent
            
            start_time = time.time()
            result = engine.generate_video_sequence(shot_id)
            end_time = time.time()
            
            cpu_after = psutil.cpu_percent()
            memory_after = psutil.virtual_memory().percent
            
            if result.success:
                fps = result.frame_count / (end_time - start_time)
                results[name] = {
                    "success": True,
                    "duration": end_time - start_time,
                    "fps": fps,
                    "cpu_usage": cpu_after - cpu_before,
                    "memory_usage": memory_after - memory_before
                }
                print(f"✅ {name}: {fps:.1f} FPS, {end_time - start_time:.1f}s")
            else:
                results[name] = {"success": False, "error": result.error_message}
                print(f"❌ {name}: {result.error_message}")
                
        except Exception as e:
            results[name] = {"success": False, "error": str(e)}
            print(f"❌ {name}: {e}")
    
    return results

# Usage
performance_results = diagnose_performance("/path/to/project", "shot_001")
```

**Solutions:**

1. **Enable GPU Acceleration:**
```python
# Optimal GPU configuration
config = VideoConfig(
    frame_rate=24,
    resolution=(1920, 1080),
    quality="medium",  # Balance quality vs speed
    gpu_acceleration=True,
    parallel_processing=True
)
```

2. **Optimize for Speed:**
```python
# Speed-optimized configuration
speed_config = VideoConfig(
    frame_rate=24,
    resolution=(1280, 720),  # Lower resolution
    quality="low",           # Lower quality
    gpu_acceleration=True,
    parallel_processing=True
)

# Process in batches
def process_shots_fast(engine, shot_ids, batch_size=3):
    results = []
    
    for i in range(0, len(shot_ids), batch_size):
        batch = shot_ids[i:i + batch_size]
        print(f"⚡ Processing batch: {batch}")
        
        for shot_id in batch:
            result = engine.generate_video_sequence(shot_id)
            results.append(result)
    
    return results
```

3. **Monitor and Optimize System Resources:**
```python
import gc
import psutil

def optimize_system_resources():
    """Optimize system for video processing"""
    
    # Clear memory
    gc.collect()
    
    # Check available resources
    memory = psutil.virtual_memory()
    cpu_count = psutil.cpu_count()
    
    print(f"💾 Available memory: {memory.available / 1024**3:.1f} GB")
    print(f"🔥 CPU cores: {cpu_count}")
    
    # Recommend optimal settings
    if memory.available < 4 * 1024**3:  # Less than 4GB
        print("⚠️  Low memory detected - use lower resolution")
        recommended_resolution = (1280, 720)
    else:
        recommended_resolution = (1920, 1080)
    
    recommended_parallel = cpu_count > 2
    
    return {
        "resolution": recommended_resolution,
        "parallel_processing": recommended_parallel,
        "quality": "medium" if memory.available > 8 * 1024**3 else "low"
    }

# Apply optimizations
optimizations = optimize_system_resources()
optimized_config = VideoConfig(**optimizations)
```
## Memory and Resource Problems

### Problem: Out of memory errors

**Symptoms:**
- "Out of memory" or "Memory allocation failed" errors
- System becomes unresponsive during processing
- Process killed by system (OOM killer on Linux)

**Memory Diagnosis:**
```python
import psutil
import gc
from video_engine import VideoEngine

def diagnose_memory_usage():
    """Diagnose memory usage patterns"""
    
    process = psutil.Process()
    
    print(f"💾 System Memory:")
    memory = psutil.virtual_memory()
    print(f"  Total: {memory.total / 1024**3:.1f} GB")
    print(f"  Available: {memory.available / 1024**3:.1f} GB")
    print(f"  Used: {memory.percent:.1f}%")
    
    print(f"\n🔍 Process Memory:")
    process_memory = process.memory_info()
    print(f"  RSS: {process_memory.rss / 1024**2:.1f} MB")
    print(f"  VMS: {process_memory.vms / 1024**2:.1f} MB")
    
    return {
        "system_available_gb": memory.available / 1024**3,
        "process_rss_mb": process_memory.rss / 1024**2,
        "system_usage_percent": memory.percent
    }

# Monitor memory during processing
def process_with_memory_monitoring(engine, shot_id):
    """Process shot with memory monitoring"""
    
    print("📊 Memory before processing:")
    before = diagnose_memory_usage()
    
    result = engine.generate_video_sequence(shot_id)
    
    print("\n📊 Memory after processing:")
    after = diagnose_memory_usage()
    
    memory_increase = after["process_rss_mb"] - before["process_rss_mb"]
    print(f"\n📈 Memory increase: {memory_increase:.1f} MB")
    
    return result, memory_increase
```

**Solutions:**

1. **Implement Memory-Efficient Processing:**
```python
import gc
from video_engine import VideoEngine, VideoConfig

class MemoryEfficientEngine:
    def __init__(self, memory_limit_gb=4.0):
        self.memory_limit_gb = memory_limit_gb
        
        # Configure for low memory usage
        self.config = VideoConfig(
            frame_rate=24,
            resolution=(1280, 720),  # Lower resolution
            quality="medium",
            parallel_processing=False,  # Reduce memory usage
            gpu_acceleration=True  # GPU memory separate from system
        )
        
        self.engine = VideoEngine(self.config)
    
    def process_shot_memory_safe(self, project_path: str, shot_id: str):
        """Process shot with memory safety"""
        
        # Check available memory
        memory = psutil.virtual_memory()
        available_gb = memory.available / 1024**3
        
        if available_gb < self.memory_limit_gb:
            print(f"⚠️  Low memory: {available_gb:.1f} GB available")
            
            # Force garbage collection
            gc.collect()
            
            # Check again after cleanup
            memory = psutil.virtual_memory()
            available_gb = memory.available / 1024**3
            
            if available_gb < self.memory_limit_gb:
                raise MemoryError(f"Insufficient memory: {available_gb:.1f} GB available, "
                                f"{self.memory_limit_gb} GB required")
        
        # Load project
        if not self.engine.load_project(project_path):
            raise RuntimeError("Failed to load project")
        
        # Process with memory monitoring
        try:
            result = self.engine.generate_video_sequence(shot_id)
            
            # Immediate cleanup
            if result.success and hasattr(result, 'frames'):
                # Process frames immediately
                self._process_frames_immediately(result.frames, shot_id)
                # Clear from memory
                result.frames = None
            
            # Force cleanup
            gc.collect()
            
            return result
            
        except MemoryError as e:
            print(f"💥 Memory error during processing: {e}")
            gc.collect()
            raise
    
    def _process_frames_immediately(self, frames, shot_id):
        """Process frames immediately to avoid memory accumulation"""
        # Save frames to disk immediately
        import os
        from PIL import Image
        
        output_dir = f"output/{shot_id}"
        os.makedirs(output_dir, exist_ok=True)
        
        for i, frame in enumerate(frames):
            if frame is not None:
                image = Image.fromarray(frame)
                image.save(f"{output_dir}/frame_{i:06d}.png")
                
        print(f"💾 Saved {len(frames)} frames to disk")

# Usage
memory_engine = MemoryEfficientEngine(memory_limit_gb=6.0)

try:
    result = memory_engine.process_shot_memory_safe("/path/to/project", "shot_001")
    if result.success:
        print(f"✅ Processed successfully: {result.frame_count} frames")
except MemoryError as e:
    print(f"❌ Memory error: {e}")
```

2. **Batch Processing for Large Projects:**
```python
def process_large_project_safely(project_path: str, shot_ids: list, max_memory_gb=8.0):
    """Process large projects with memory management"""
    
    config = VideoConfig(
        resolution=(1280, 720),  # Conservative resolution
        quality="medium",
        parallel_processing=False
    )
    
    engine = VideoEngine(config)
    engine.load_project(project_path)
    
    results = []
    
    for i, shot_id in enumerate(shot_ids):
        print(f"🎬 Processing shot {i+1}/{len(shot_ids)}: {shot_id}")
        
        # Check memory before each shot
        memory = psutil.virtual_memory()
        available_gb = memory.available / 1024**3
        
        if available_gb < 2.0:  # Less than 2GB available
            print("🧹 Low memory detected, forcing cleanup...")
            gc.collect()
            
            # Wait for cleanup
            import time
            time.sleep(1)
            
            memory = psutil.virtual_memory()
            available_gb = memory.available / 1024**3
            
            if available_gb < 1.0:  # Still less than 1GB
                print(f"❌ Insufficient memory for {shot_id}: {available_gb:.1f} GB")
                results.append({
                    "shot_id": shot_id,
                    "success": False,
                    "error": "Insufficient memory"
                })
                continue
        
        # Process shot
        try:
            result = engine.generate_video_sequence(shot_id)
            
            if result.success:
                results.append({
                    "shot_id": shot_id,
                    "success": True,
                    "frame_count": result.frame_count
                })
                print(f"✅ {shot_id}: {result.frame_count} frames")
            else:
                results.append({
                    "shot_id": shot_id,
                    "success": False,
                    "error": result.error_message
                })
                print(f"❌ {shot_id}: {result.error_message}")
                
        except Exception as e:
            results.append({
                "shot_id": shot_id,
                "success": False,
                "error": str(e)
            })
            print(f"💥 {shot_id}: {e}")
        
        # Cleanup after each shot
        gc.collect()
    
    return results
```

### Problem: GPU memory issues

**Symptoms:**
- CUDA out of memory errors
- GPU processing falls back to CPU
- Inconsistent GPU performance

**GPU Memory Diagnosis:**
```python
def diagnose_gpu_memory():
    """Diagnose GPU memory availability"""
    
    try:
        import torch
        if torch.cuda.is_available():
            device = torch.cuda.current_device()
            gpu_memory = torch.cuda.get_device_properties(device).total_memory
            gpu_allocated = torch.cuda.memory_allocated(device)
            gpu_reserved = torch.cuda.memory_reserved(device)
            
            print(f"🎮 GPU Memory Status:")
            print(f"  Total: {gpu_memory / 1024**3:.1f} GB")
            print(f"  Allocated: {gpu_allocated / 1024**3:.1f} GB")
            print(f"  Reserved: {gpu_reserved / 1024**3:.1f} GB")
            print(f"  Available: {(gpu_memory - gpu_reserved) / 1024**3:.1f} GB")
            
            return {
                "total_gb": gpu_memory / 1024**3,
                "available_gb": (gpu_memory - gpu_reserved) / 1024**3
            }
        else:
            print("❌ CUDA not available")
            return None
            
    except ImportError:
        print("❌ PyTorch not available for GPU diagnosis")
        return None

# Check GPU memory before processing
gpu_info = diagnose_gpu_memory()
if gpu_info and gpu_info["available_gb"] < 2.0:
    print("⚠️  Low GPU memory - consider reducing resolution or disabling GPU")
```

**Solutions:**

1. **Optimize GPU Memory Usage:**
```python
from video_engine import VideoConfig

def create_gpu_optimized_config(available_gpu_memory_gb):
    """Create GPU-optimized configuration based on available memory"""
    
    if available_gpu_memory_gb >= 8.0:
        # High-end GPU
        return VideoConfig(
            resolution=(1920, 1080),
            quality="high",
            gpu_acceleration=True,
            parallel_processing=True
        )
    elif available_gpu_memory_gb >= 4.0:
        # Mid-range GPU
        return VideoConfig(
            resolution=(1280, 720),
            quality="medium",
            gpu_acceleration=True,
            parallel_processing=True
        )
    elif available_gpu_memory_gb >= 2.0:
        # Low-end GPU
        return VideoConfig(
            resolution=(854, 480),
            quality="medium",
            gpu_acceleration=True,
            parallel_processing=False
        )
    else:
        # Very low GPU memory - use CPU
        return VideoConfig(
            resolution=(1280, 720),
            quality="medium",
            gpu_acceleration=False,
            parallel_processing=True
        )

# Auto-configure based on GPU memory
gpu_info = diagnose_gpu_memory()
if gpu_info:
    config = create_gpu_optimized_config(gpu_info["available_gb"])
else:
    config = VideoConfig(gpu_acceleration=False)  # CPU fallback
```

2. **GPU Memory Cleanup:**
```python
def cleanup_gpu_memory():
    """Clean up GPU memory"""
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            print("🧹 GPU memory cache cleared")
    except ImportError:
        pass
    
    # Force garbage collection
    import gc
    gc.collect()

# Use cleanup between shots
def process_with_gpu_cleanup(engine, shot_ids):
    """Process shots with GPU memory cleanup"""
    
    results = []
    
    for shot_id in shot_ids:
        # Clean GPU memory before each shot
        cleanup_gpu_memory()
        
        try:
            result = engine.generate_video_sequence(shot_id)
            results.append(result)
            
        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                print(f"💥 GPU out of memory for {shot_id}, trying CPU fallback...")
                
                # Fallback to CPU
                cpu_config = VideoConfig(gpu_acceleration=False)
                cpu_engine = VideoEngine(cpu_config)
                cpu_engine.load_project(engine.project_path)
                
                result = cpu_engine.generate_video_sequence(shot_id)
                results.append(result)
            else:
                raise
        
        # Cleanup after each shot
        cleanup_gpu_memory()
    
    return results
```

## Quality and Output Issues

### Problem: Poor interpolation quality

**Symptoms:**
- Visible artifacts in interpolated frames
- Jerky or unnatural motion
- Character inconsistency across frames

**Quality Diagnosis:**
```python
from quality_validator import QualityValidator
import numpy as np

def diagnose_interpolation_quality(frames):
    """Diagnose interpolation quality issues"""
    
    validator = QualityValidator()
    
    # Analyze frame sequence
    quality_metrics = []
    
    for i in range(len(frames) - 1):
        frame1 = frames[i]
        frame2 = frames[i + 1]
        
        # Calculate quality metrics
        metrics = validator.analyze_frame_pair(frame1, frame2)
        quality_metrics.append(metrics)
        
        if metrics["temporal_coherence"] < 0.7:
            print(f"⚠️  Low temporal coherence at frame {i}: {metrics['temporal_coherence']:.3f}")
        
        if metrics["motion_smoothness"] < 0.8:
            print(f"⚠️  Poor motion smoothness at frame {i}: {metrics['motion_smoothness']:.3f}")
    
    # Overall quality assessment
    avg_coherence = np.mean([m["temporal_coherence"] for m in quality_metrics])
    avg_smoothness = np.mean([m["motion_smoothness"] for m in quality_metrics])
    
    print(f"\n📊 Overall Quality Assessment:")
    print(f"  Average temporal coherence: {avg_coherence:.3f}")
    print(f"  Average motion smoothness: {avg_smoothness:.3f}")
    
    if avg_coherence < 0.7:
        print("❌ Poor temporal coherence detected")
    if avg_smoothness < 0.8:
        print("❌ Poor motion smoothness detected")
    
    return {
        "temporal_coherence": avg_coherence,
        "motion_smoothness": avg_smoothness,
        "frame_metrics": quality_metrics
    }
```

**Solutions:**

1. **Optimize Interpolation Settings:**
```python
from advanced_interpolation_engine import (
    AdvancedInterpolationEngine,
    create_cinematic_preset,
    InterpolationMethod
)

def create_quality_optimized_config():
    """Create configuration optimized for quality"""
    
    config = create_cinematic_preset("cinematic")
    
    # Optimize for quality
    config.method = InterpolationMethod.OPTICAL_FLOW  # Best quality
    config.quality_vs_speed = 0.9  # Favor quality over speed
    
    # Enable quality features
    config.motion_blur.intensity = 0.5  # Moderate motion blur
    config.depth_of_field.mode = "natural"  # Natural depth
    
    return config

# Use quality-optimized interpolation
quality_config = create_quality_optimized_config()
engine = AdvancedInterpolationEngine(quality_config)
```

2. **Adjust Camera Movement for Better Quality:**
```python
def create_smooth_camera_movement(movement_type, duration):
    """Create smooth camera movement for better quality"""
    
    # Optimize movement parameters for quality
    movements = {
        "pan": {
            "type": "pan",
            "direction": "right",
            "amount": 0.15,  # Moderate movement
            "duration": duration,
            "easing": "ease_in_out"  # Smooth acceleration
        },
        "dolly": {
            "type": "dolly",
            "direction": "in",
            "amount": 0.2,  # Subtle movement
            "duration": duration,
            "easing": "ease_in_out"
        },
        "zoom": {
            "type": "zoom",
            "direction": "in",
            "amount": 0.1,  # Very subtle zoom
            "duration": duration,
            "easing": "linear"  # Constant speed for zoom
        }
    }
    
    return movements.get(movement_type, movements["pan"])

# Use smooth movements
smooth_movement = create_smooth_camera_movement("dolly", 3.0)
```

### Problem: Inconsistent output quality

**Symptoms:**
- Quality varies between different shots
- Some frames much better/worse than others
- Inconsistent processing results

**Solutions:**

1. **Standardize Processing Pipeline:**
```python
class StandardizedProcessor:
    def __init__(self):
        # Use consistent configuration
        self.config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="high",
            gpu_acceleration=True,
            parallel_processing=True
        )
        
        self.engine = VideoEngine(self.config)
        self.quality_validator = QualityValidator()
    
    def process_shot_with_validation(self, project_path: str, shot_id: str):
        """Process shot with quality validation"""
        
        if not self.engine.load_project(project_path):
            raise RuntimeError("Failed to load project")
        
        # Generate video
        result = self.engine.generate_video_sequence(shot_id)
        
        if not result.success:
            return result
        
        # Validate quality
        quality_score = self.quality_validator.validate_sequence(result.frames)
        
        if quality_score < 0.8:  # Quality threshold
            print(f"⚠️  Quality below threshold for {shot_id}: {quality_score:.3f}")
            
            # Try to improve quality
            improved_result = self._improve_quality(project_path, shot_id)
            if improved_result and improved_result.success:
                return improved_result
        
        return result
    
    def _improve_quality(self, project_path: str, shot_id: str):
        """Attempt to improve quality with different settings"""
        
        # Try higher quality settings
        high_quality_config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="ultra",  # Highest quality
            gpu_acceleration=True,
            parallel_processing=False  # More careful processing
        )
        
        improved_engine = VideoEngine(high_quality_config)
        improved_engine.load_project(project_path)
        
        return improved_engine.generate_video_sequence(shot_id)

# Usage
processor = StandardizedProcessor()
result = processor.process_shot_with_validation("/path/to/project", "shot_001")
```

2. **Quality Monitoring and Adjustment:**
```python
def monitor_quality_across_shots(engine, project_path: str, shot_ids: list):
    """Monitor and maintain quality across multiple shots"""
    
    quality_validator = QualityValidator()
    results = []
    quality_scores = []
    
    for shot_id in shot_ids:
        result = engine.generate_video_sequence(shot_id)
        
        if result.success:
            # Validate quality
            quality_score = quality_validator.validate_sequence(result.frames)
            quality_scores.append(quality_score)
            
            results.append({
                "shot_id": shot_id,
                "success": True,
                "quality_score": quality_score,
                "frame_count": result.frame_count
            })
            
            print(f"✅ {shot_id}: Quality {quality_score:.3f}")
            
        else:
            results.append({
                "shot_id": shot_id,
                "success": False,
                "error": result.error_message
            })
            print(f"❌ {shot_id}: {result.error_message}")
    
    # Analyze quality consistency
    if quality_scores:
        avg_quality = np.mean(quality_scores)
        quality_std = np.std(quality_scores)
        
        print(f"\n📊 Quality Analysis:")
        print(f"  Average quality: {avg_quality:.3f}")
        print(f"  Quality std dev: {quality_std:.3f}")
        
        if quality_std > 0.1:
            print("⚠️  High quality variation detected")
            
            # Identify problematic shots
            for result in results:
                if result["success"] and result["quality_score"] < avg_quality - quality_std:
                    print(f"🔍 Low quality shot: {result['shot_id']} ({result['quality_score']:.3f})")
    
    return results
```