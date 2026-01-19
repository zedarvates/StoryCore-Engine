# Video Engine Examples and Workflows

## Overview

This document provides comprehensive examples and workflows for using the Video Engine in various production scenarios. Each example includes complete code, configuration options, and expected outcomes.

## Table of Contents

1. [Basic Video Generation](#basic-video-generation)
2. [Advanced Cinematic Effects](#advanced-cinematic-effects)
3. [Production Workflows](#production-workflows)
4. [Integration Patterns](#integration-patterns)
5. [Performance Optimization](#performance-optimization)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Basic Video Generation

### Example 1: Simple Keyframe Interpolation

Generate a basic video sequence from two keyframes with smooth interpolation.

```python
from video_engine import VideoEngine, VideoConfig
import numpy as np

# 1. Create basic configuration
config = VideoConfig(
    frame_rate=24,
    resolution=(1920, 1080),
    quality="high"
)

# 2. Initialize engine
engine = VideoEngine(config)

# 3. Load project
project_path = "/path/to/your/project"
if not engine.load_project(project_path):
    raise RuntimeError("Failed to load project")

# 4. Generate video sequence
result = engine.generate_video_sequence("shot_001")

if result.success:
    print(f"✅ Generated {result.frame_count} frames")
    print(f"📁 Output: {result.output_path}")
    print(f"⏱️  Duration: {result.duration:.2f} seconds")
else:
    print(f"❌ Generation failed: {result.error_message}")
```

**Expected Output:**
```
✅ Generated 120 frames
📁 Output: /path/to/project/video_output/shot_001/
⏱️  Duration: 5.00 seconds
```

### Example 2: Custom Frame Rate and Resolution

Create a video with specific technical requirements.

```python
from video_engine import VideoEngine, VideoConfig

# Configuration for 30fps HD video
config = VideoConfig(
    frame_rate=30,           # 30 fps for smooth motion
    resolution=(1280, 720),  # HD resolution
    quality="medium",        # Balance quality vs speed
    parallel_processing=True,
    gpu_acceleration=True
)

engine = VideoEngine(config)

# Validate configuration
is_valid, issues = engine.validate_configuration()
if not is_valid:
    print(f"⚠️  Configuration issues: {issues}")
    # Fix issues or use different settings

# Generate with custom settings
engine.load_project("/path/to/project")
result = engine.generate_video_sequence("shot_002")
```

## Advanced Cinematic Effects

### Example 3: Cinematic Camera Movement

Create professional camera movements with smooth interpolation.

```python
from advanced_interpolation_engine import (
    AdvancedInterpolationEngine,
    create_cinematic_preset
)
import numpy as np

# 1. Create cinematic configuration
config = create_cinematic_preset("cinematic")

# 2. Initialize advanced engine
engine = AdvancedInterpolationEngine(config)

# 3. Prepare keyframes (example with numpy arrays)
keyframe1 = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
keyframe2 = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
keyframes = [keyframe1, keyframe2]

# 4. Define camera movement
camera_movement = {
    "type": "dolly",         # Dolly in movement
    "direction": "in",       # Move toward subject
    "amount": 0.3,          # 30% movement
    "duration": 3.0,        # 3 second duration
    "easing": "ease_in_out" # Smooth acceleration/deceleration
}

# 5. Generate interpolated frames
interpolated_frames = engine.interpolate_frames(
    keyframes,
    target_frame_count=72,  # 3 seconds at 24fps
    camera_movement=camera_movement
)

print(f"🎬 Generated {len(interpolated_frames)} cinematic frames")
print(f"📐 Frame dimensions: {interpolated_frames[0].shape}")
```

### Example 4: Multiple Camera Movements

Combine different camera movements for complex cinematography.

```python
from advanced_interpolation_engine import AdvancedInterpolationEngine, create_cinematic_preset

# Create configuration with enhanced effects
config = create_cinematic_preset("action")
config.motion_blur.intensity = 0.8  # Strong motion blur for action
config.depth_of_field.mode = "shallow"  # Shallow depth of field

engine = AdvancedInterpolationEngine(config)

# Define complex camera movement sequence
movements = [
    {
        "type": "pan",
        "direction": "right",
        "amount": 0.2,
        "duration": 2.0,
        "easing": "ease_in"
    },
    {
        "type": "tilt",
        "direction": "up",
        "amount": 0.1,
        "duration": 1.5,
        "easing": "linear"
    },
    {
        "type": "zoom",
        "direction": "in",
        "amount": 0.15,
        "duration": 2.5,
        "easing": "ease_out"
    }
]

# Process each movement
all_frames = []
for i, movement in enumerate(movements):
    frames = engine.interpolate_frames(
        keyframes,
        target_frame_count=int(movement["duration"] * 24),
        camera_movement=movement
    )
    all_frames.extend(frames)
    print(f"🎥 Completed movement {i+1}: {len(frames)} frames")

print(f"🎬 Total sequence: {len(all_frames)} frames")
```
## Production Workflows

### Example 5: Documentary Production Workflow

Complete workflow for documentary-style content with natural camera movements.

```python
from video_configuration_manager import VideoConfigurationManager
from video_engine import VideoEngine
from advanced_interpolation_engine import AdvancedInterpolationEngine

class DocumentaryWorkflow:
    def __init__(self, project_path: str):
        self.project_path = project_path
        self.config_manager = VideoConfigurationManager()
        self.setup_engines()
    
    def setup_engines(self):
        """Initialize engines with documentary preset"""
        # Load documentary configuration
        self.video_config = self.config_manager.load_preset("documentary")
        self.video_engine = VideoEngine(self.video_config)
        
        # Setup advanced interpolation for natural movement
        self.advanced_config = self.config_manager.load_preset("documentary")
        self.advanced_config.motion_blur.intensity = 0.3  # Subtle motion blur
        self.advanced_config.depth_of_field.mode = "natural"  # Natural depth
        self.advanced_engine = AdvancedInterpolationEngine(self.advanced_config)
    
    def process_interview_shot(self, shot_id: str):
        """Process interview shot with minimal camera movement"""
        # Load project
        if not self.video_engine.load_project(self.project_path):
            raise RuntimeError("Failed to load project")
        
        # Generate base sequence
        result = self.video_engine.generate_video_sequence(shot_id)
        
        if result.success:
            # Apply subtle camera movement for natural feel
            camera_movement = {
                "type": "pan",
                "direction": "right",
                "amount": 0.05,  # Very subtle movement
                "duration": result.duration,
                "easing": "linear"
            }
            
            # Load keyframes and enhance
            keyframes = self._load_keyframes(shot_id)
            enhanced_frames = self.advanced_engine.interpolate_frames(
                keyframes,
                result.frame_count,
                camera_movement
            )
            
            return enhanced_frames
        
        return None
    
    def process_broll_shot(self, shot_id: str):
        """Process B-roll shot with dynamic camera movement"""
        # More dynamic movement for B-roll
        camera_movement = {
            "type": "dolly",
            "direction": "in",
            "amount": 0.2,
            "duration": 4.0,
            "easing": "ease_in_out"
        }
        
        result = self.video_engine.generate_video_sequence(shot_id)
        if result.success:
            keyframes = self._load_keyframes(shot_id)
            return self.advanced_engine.interpolate_frames(
                keyframes,
                result.frame_count,
                camera_movement
            )
        return None
    
    def _load_keyframes(self, shot_id: str):
        """Load keyframes for shot (implementation specific)"""
        # Implementation would load actual keyframes from project
        import numpy as np
        # Placeholder keyframes
        return [
            np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8),
            np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8)
        ]

# Usage
workflow = DocumentaryWorkflow("/path/to/documentary/project")

# Process different shot types
interview_frames = workflow.process_interview_shot("interview_001")
broll_frames = workflow.process_broll_shot("broll_001")

print(f"📺 Interview: {len(interview_frames)} frames")
print(f"🎬 B-roll: {len(broll_frames)} frames")
```

### Example 6: Action Sequence Production

High-energy action sequence with dynamic camera movements and effects.

```python
from advanced_interpolation_engine import create_cinematic_preset, MotionBlurType, LensType

class ActionSequenceWorkflow:
    def __init__(self):
        # Create high-energy action configuration
        self.config = create_cinematic_preset("action")
        
        # Enhance for action sequences
        self.config.motion_blur.blur_type = MotionBlurType.DIRECTIONAL
        self.config.motion_blur.intensity = 0.9  # Strong motion blur
        self.config.lens_simulation.lens_type = LensType.WIDE_ANGLE
        self.config.depth_of_field.mode = "deep"  # Keep action in focus
        
        self.engine = AdvancedInterpolationEngine(self.config)
    
    def create_chase_sequence(self, keyframes: list):
        """Create dynamic chase sequence"""
        movements = [
            # Quick pan following action
            {
                "type": "pan",
                "direction": "right",
                "amount": 0.4,
                "duration": 1.0,
                "easing": "ease_in"
            },
            # Dramatic tilt
            {
                "type": "tilt",
                "direction": "down",
                "amount": 0.2,
                "duration": 0.8,
                "easing": "linear"
            },
            # Zoom in for impact
            {
                "type": "zoom",
                "direction": "in",
                "amount": 0.3,
                "duration": 1.2,
                "easing": "ease_out"
            }
        ]
        
        sequence_frames = []
        for movement in movements:
            frames = self.engine.interpolate_frames(
                keyframes,
                target_frame_count=int(movement["duration"] * 24),
                camera_movement=movement
            )
            sequence_frames.extend(frames)
        
        return sequence_frames
    
    def create_impact_shot(self, keyframes: list):
        """Create dramatic impact shot with zoom"""
        impact_movement = {
            "type": "zoom",
            "direction": "in",
            "amount": 0.5,  # Dramatic zoom
            "duration": 0.5,  # Quick impact
            "easing": "ease_in"
        }
        
        return self.engine.interpolate_frames(
            keyframes,
            target_frame_count=12,  # Half second at 24fps
            camera_movement=impact_movement
        )

# Usage
action_workflow = ActionSequenceWorkflow()

# Create sample keyframes
import numpy as np
keyframes = [
    np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8),
    np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
]

chase_frames = action_workflow.create_chase_sequence(keyframes)
impact_frames = action_workflow.create_impact_shot(keyframes)

print(f"🏃 Chase sequence: {len(chase_frames)} frames")
print(f"💥 Impact shot: {len(impact_frames)} frames")
```

## Integration Patterns

### Example 7: Pipeline Integration with StoryCore

Complete integration with the StoryCore pipeline system.

```python
import json
from pathlib import Path
from video_engine import VideoEngine, VideoConfig

class StoryCoreVideoIntegration:
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.project_data = self._load_project_data()
        self.video_engine = None
        self._setup_video_engine()
    
    def _load_project_data(self):
        """Load StoryCore project data"""
        project_file = self.project_path / "project.json"
        if project_file.exists():
            with open(project_file, 'r') as f:
                return json.load(f)
        return {}
    
    def _setup_video_engine(self):
        """Setup video engine based on project requirements"""
        # Extract video requirements from project
        video_settings = self.project_data.get("video_settings", {})
        
        config = VideoConfig(
            frame_rate=video_settings.get("frame_rate", 24),
            resolution=tuple(video_settings.get("resolution", [1920, 1080])),
            quality=video_settings.get("quality", "high")
        )
        
        self.video_engine = VideoEngine(config)
        self.video_engine.load_project(str(self.project_path))
    
    def process_storyboard(self):
        """Process entire storyboard into video sequences"""
        storyboard_file = self.project_path / "storyboard.json"
        if not storyboard_file.exists():
            raise FileNotFoundError("Storyboard file not found")
        
        with open(storyboard_file, 'r') as f:
            storyboard = json.load(f)
        
        results = {}
        for shot in storyboard.get("shots", []):
            shot_id = shot["id"]
            print(f"🎬 Processing shot: {shot_id}")
            
            result = self.video_engine.generate_video_sequence(shot_id)
            if result.success:
                results[shot_id] = {
                    "frame_count": result.frame_count,
                    "duration": result.duration,
                    "output_path": result.output_path,
                    "success": True
                }
                print(f"✅ Shot {shot_id}: {result.frame_count} frames")
            else:
                results[shot_id] = {
                    "success": False,
                    "error": result.error_message
                }
                print(f"❌ Shot {shot_id}: {result.error_message}")
        
        return results
    
    def generate_timeline_metadata(self):
        """Generate timeline metadata for audio synchronization"""
        timeline = self.video_engine.get_timeline_metadata()
        
        # Save timeline metadata
        timeline_file = self.project_path / "video_timeline_metadata.json"
        with open(timeline_file, 'w') as f:
            json.dump(timeline, f, indent=2)
        
        print(f"📊 Timeline metadata saved: {timeline_file}")
        return timeline

# Usage
integration = StoryCoreVideoIntegration("/path/to/storycore/project")

# Process entire storyboard
results = integration.process_storyboard()

# Generate timeline for audio sync
timeline = integration.generate_timeline_metadata()

# Print summary
successful_shots = sum(1 for r in results.values() if r["success"])
total_shots = len(results)
print(f"📈 Success rate: {successful_shots}/{total_shots} ({successful_shots/total_shots*100:.1f}%)")
```

### Example 8: Batch Processing Multiple Projects

Efficient batch processing for multiple projects.

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from video_engine import VideoEngine, VideoConfig
import time
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BatchVideoProcessor:
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="medium",  # Balance speed vs quality for batch processing
            parallel_processing=True,
            gpu_acceleration=True
        )
    
    def process_single_project(self, project_info: dict):
        """Process a single project"""
        project_path = project_info["path"]
        project_name = project_info["name"]
        shots = project_info.get("shots", [])
        
        start_time = time.time()
        logger.info(f"🚀 Starting project: {project_name}")
        
        try:
            # Initialize engine for this project
            engine = VideoEngine(self.config)
            if not engine.load_project(project_path):
                raise RuntimeError(f"Failed to load project: {project_path}")
            
            # Process all shots
            results = {}
            for shot_id in shots:
                result = engine.generate_video_sequence(shot_id)
                results[shot_id] = result
                
                if result.success:
                    logger.info(f"✅ {project_name}/{shot_id}: {result.frame_count} frames")
                else:
                    logger.error(f"❌ {project_name}/{shot_id}: {result.error_message}")
            
            duration = time.time() - start_time
            successful_shots = sum(1 for r in results.values() if r.success)
            
            return {
                "project_name": project_name,
                "success": True,
                "duration": duration,
                "shots_processed": len(shots),
                "shots_successful": successful_shots,
                "results": results
            }
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"💥 Project {project_name} failed: {e}")
            return {
                "project_name": project_name,
                "success": False,
                "duration": duration,
                "error": str(e)
            }
    
    def process_projects(self, projects: list):
        """Process multiple projects in parallel"""
        logger.info(f"🎬 Starting batch processing: {len(projects)} projects")
        
        results = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all projects
            future_to_project = {
                executor.submit(self.process_single_project, project): project
                for project in projects
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_project):
                project = future_to_project[future]
                try:
                    result = future.result()
                    results.append(result)
                    
                    if result["success"]:
                        logger.info(f"🎉 Completed: {result['project_name']} "
                                  f"({result['shots_successful']}/{result['shots_processed']} shots, "
                                  f"{result['duration']:.1f}s)")
                    else:
                        logger.error(f"💔 Failed: {result['project_name']}")
                        
                except Exception as e:
                    logger.error(f"💥 Exception processing {project['name']}: {e}")
        
        return results

# Usage
processor = BatchVideoProcessor(max_workers=2)

# Define projects to process
projects = [
    {
        "name": "Documentary_Episode_1",
        "path": "/projects/documentary/ep1",
        "shots": ["interview_001", "broll_001", "broll_002"]
    },
    {
        "name": "Commercial_Product_A",
        "path": "/projects/commercial/product_a",
        "shots": ["hero_shot", "detail_001", "lifestyle_001"]
    },
    {
        "name": "Music_Video_Chorus",
        "path": "/projects/music_video/chorus",
        "shots": ["wide_shot", "close_up", "performance"]
    }
]

# Process all projects
batch_results = processor.process_projects(projects)

# Print summary
successful_projects = sum(1 for r in batch_results if r["success"])
total_duration = sum(r["duration"] for r in batch_results)

print(f"\n📊 Batch Processing Summary:")
print(f"✅ Successful projects: {successful_projects}/{len(projects)}")
print(f"⏱️  Total processing time: {total_duration:.1f} seconds")
print(f"📈 Average time per project: {total_duration/len(projects):.1f} seconds")
```
## Performance Optimization

### Example 9: Memory-Efficient Processing

Handle large projects with optimized memory usage.

```python
import gc
import psutil
from video_engine import VideoEngine, VideoConfig

class MemoryEfficientProcessor:
    def __init__(self, memory_limit_gb: float = 8.0):
        self.memory_limit_bytes = memory_limit_gb * 1024 * 1024 * 1024
        self.config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="medium",
            parallel_processing=False,  # Reduce memory usage
            gpu_acceleration=True
        )
        self.engine = VideoEngine(self.config)
    
    def get_memory_usage(self):
        """Get current memory usage in bytes"""
        process = psutil.Process()
        return process.memory_info().rss
    
    def process_with_memory_management(self, project_path: str, shot_ids: list):
        """Process shots with memory monitoring and cleanup"""
        if not self.engine.load_project(project_path):
            raise RuntimeError("Failed to load project")
        
        results = []
        
        for i, shot_id in enumerate(shot_ids):
            # Check memory before processing
            memory_before = self.get_memory_usage()
            
            if memory_before > self.memory_limit_bytes:
                print(f"⚠️  Memory limit exceeded before shot {shot_id}")
                print(f"💾 Current usage: {memory_before / 1024**3:.2f} GB")
                
                # Force garbage collection
                gc.collect()
                
                memory_after_gc = self.get_memory_usage()
                print(f"🧹 After cleanup: {memory_after_gc / 1024**3:.2f} GB")
                
                if memory_after_gc > self.memory_limit_bytes:
                    print(f"❌ Cannot proceed with shot {shot_id} - insufficient memory")
                    continue
            
            # Process shot
            print(f"🎬 Processing shot {i+1}/{len(shot_ids)}: {shot_id}")
            result = self.engine.generate_video_sequence(shot_id)
            
            if result.success:
                # Process frames immediately and release memory
                self._process_frames_immediately(result.frames, shot_id)
                
                # Clear frames from result to free memory
                result.frames = None
                
                results.append({
                    "shot_id": shot_id,
                    "success": True,
                    "frame_count": result.frame_count,
                    "memory_used_gb": (self.get_memory_usage() - memory_before) / 1024**3
                })
                
                print(f"✅ Completed {shot_id}: {result.frame_count} frames")
            else:
                results.append({
                    "shot_id": shot_id,
                    "success": False,
                    "error": result.error_message
                })
                print(f"❌ Failed {shot_id}: {result.error_message}")
            
            # Force cleanup after each shot
            gc.collect()
            
            # Memory status
            current_memory = self.get_memory_usage()
            print(f"💾 Memory usage: {current_memory / 1024**3:.2f} GB")
        
        return results
    
    def _process_frames_immediately(self, frames: list, shot_id: str):
        """Process frames immediately to avoid memory accumulation"""
        # Example: Save frames to disk immediately
        import os
        from PIL import Image
        
        output_dir = f"output/{shot_id}"
        os.makedirs(output_dir, exist_ok=True)
        
        for i, frame in enumerate(frames):
            # Convert numpy array to PIL Image and save
            if frame is not None:
                image = Image.fromarray(frame)
                image.save(f"{output_dir}/frame_{i:06d}.png")
        
        print(f"💾 Saved {len(frames)} frames for {shot_id}")

# Usage
processor = MemoryEfficientProcessor(memory_limit_gb=6.0)

shot_ids = ["shot_001", "shot_002", "shot_003", "shot_004", "shot_005"]
results = processor.process_with_memory_management("/path/to/project", shot_ids)

# Print memory efficiency summary
successful_shots = [r for r in results if r["success"]]
if successful_shots:
    avg_memory = sum(r["memory_used_gb"] for r in successful_shots) / len(successful_shots)
    print(f"📊 Average memory per shot: {avg_memory:.2f} GB")
```

### Example 10: GPU Acceleration Optimization

Optimize GPU usage for maximum performance.

```python
from video_engine import VideoEngine, VideoConfig
from advanced_interpolation_engine import AdvancedInterpolationEngine, create_cinematic_preset
import time

class GPUOptimizedProcessor:
    def __init__(self):
        # Configure for maximum GPU utilization
        self.video_config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="high",
            parallel_processing=True,
            gpu_acceleration=True
        )
        
        # Advanced config with GPU optimization
        self.advanced_config = create_cinematic_preset("cinematic")
        self.advanced_config.gpu_acceleration = True
        self.advanced_config.parallel_processing = True
        self.advanced_config.memory_limit_gb = 12.0  # Use more GPU memory
        
        self.video_engine = VideoEngine(self.video_config)
        self.advanced_engine = AdvancedInterpolationEngine(self.advanced_config)
    
    def benchmark_performance(self, project_path: str, shot_id: str):
        """Benchmark GPU vs CPU performance"""
        if not self.video_engine.load_project(project_path):
            raise RuntimeError("Failed to load project")
        
        # Test GPU performance
        print("🚀 Testing GPU performance...")
        start_time = time.time()
        
        self.video_config.gpu_acceleration = True
        self.video_engine = VideoEngine(self.video_config)
        self.video_engine.load_project(project_path)
        
        gpu_result = self.video_engine.generate_video_sequence(shot_id)
        gpu_time = time.time() - start_time
        
        # Test CPU performance
        print("🐌 Testing CPU performance...")
        start_time = time.time()
        
        self.video_config.gpu_acceleration = False
        self.video_engine = VideoEngine(self.video_config)
        self.video_engine.load_project(project_path)
        
        cpu_result = self.video_engine.generate_video_sequence(shot_id)
        cpu_time = time.time() - start_time
        
        # Calculate speedup
        if cpu_time > 0:
            speedup = cpu_time / gpu_time
            print(f"\n📊 Performance Comparison:")
            print(f"🚀 GPU time: {gpu_time:.2f} seconds")
            print(f"🐌 CPU time: {cpu_time:.2f} seconds")
            print(f"⚡ GPU speedup: {speedup:.1f}x faster")
            
            if gpu_result.success and cpu_result.success:
                gpu_fps = gpu_result.frame_count / gpu_time
                cpu_fps = cpu_result.frame_count / cpu_time
                print(f"🎬 GPU FPS: {gpu_fps:.1f}")
                print(f"🎬 CPU FPS: {cpu_fps:.1f}")
        
        return {
            "gpu_time": gpu_time,
            "cpu_time": cpu_time,
            "speedup": speedup if cpu_time > 0 else 0,
            "gpu_success": gpu_result.success,
            "cpu_success": cpu_result.success
        }
    
    def process_with_gpu_batching(self, project_path: str, shot_ids: list, batch_size: int = 3):
        """Process shots in GPU-optimized batches"""
        if not self.video_engine.load_project(project_path):
            raise RuntimeError("Failed to load project")
        
        results = []
        
        # Process in batches to maximize GPU utilization
        for i in range(0, len(shot_ids), batch_size):
            batch = shot_ids[i:i + batch_size]
            print(f"🔥 Processing GPU batch {i//batch_size + 1}: {batch}")
            
            batch_start = time.time()
            batch_results = []
            
            for shot_id in batch:
                result = self.video_engine.generate_video_sequence(shot_id)
                batch_results.append(result)
                
                if result.success:
                    print(f"✅ {shot_id}: {result.frame_count} frames")
                else:
                    print(f"❌ {shot_id}: {result.error_message}")
            
            batch_time = time.time() - batch_start
            successful_in_batch = sum(1 for r in batch_results if r.success)
            
            print(f"⚡ Batch completed in {batch_time:.2f}s ({successful_in_batch}/{len(batch)} successful)")
            results.extend(batch_results)
        
        return results

# Usage
gpu_processor = GPUOptimizedProcessor()

# Benchmark performance
benchmark = gpu_processor.benchmark_performance("/path/to/project", "shot_001")

# Process multiple shots with GPU optimization
shot_ids = ["shot_001", "shot_002", "shot_003", "shot_004", "shot_005", "shot_006"]
results = gpu_processor.process_with_gpu_batching("/path/to/project", shot_ids, batch_size=3)

print(f"\n🎯 Final Results:")
successful = sum(1 for r in results if r.success)
print(f"✅ Success rate: {successful}/{len(results)} ({successful/len(results)*100:.1f}%)")
```

## Troubleshooting Common Issues

### Example 11: Error Handling and Recovery

Comprehensive error handling for production environments.

```python
from video_engine import VideoEngine, VideoConfig
from advanced_interpolation_engine import AdvancedInterpolationEngine
import logging
import traceback
import time

# Setup comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('video_engine.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class RobustVideoProcessor:
    def __init__(self):
        self.config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="medium"
        )
        self.engine = None
        self.max_retries = 3
        self.retry_delay = 2.0
    
    def safe_initialize(self):
        """Safely initialize the video engine with error handling"""
        try:
            # Validate configuration first
            temp_engine = VideoEngine(self.config)
            is_valid, issues = temp_engine.validate_configuration()
            
            if not is_valid:
                logger.error(f"Configuration validation failed: {issues}")
                
                # Try to fix common configuration issues
                self.config = self._fix_configuration_issues(self.config, issues)
                
                # Re-validate
                temp_engine = VideoEngine(self.config)
                is_valid, issues = temp_engine.validate_configuration()
                
                if not is_valid:
                    raise ValueError(f"Cannot fix configuration issues: {issues}")
            
            self.engine = VideoEngine(self.config)
            logger.info("✅ Video engine initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize video engine: {e}")
            logger.error(traceback.format_exc())
            return False
    
    def _fix_configuration_issues(self, config: VideoConfig, issues: list):
        """Attempt to fix common configuration issues"""
        logger.info(f"🔧 Attempting to fix configuration issues: {issues}")
        
        # Create a copy to avoid modifying original
        fixed_config = VideoConfig(
            frame_rate=config.frame_rate,
            resolution=config.resolution,
            quality=config.quality,
            parallel_processing=config.parallel_processing,
            gpu_acceleration=config.gpu_acceleration
        )
        
        for issue in issues:
            if "frame_rate" in issue.lower():
                # Fix invalid frame rates
                if fixed_config.frame_rate <= 0 or fixed_config.frame_rate > 120:
                    fixed_config.frame_rate = 24
                    logger.info(f"🔧 Fixed frame rate to 24 fps")
            
            elif "resolution" in issue.lower():
                # Fix invalid resolutions
                width, height = fixed_config.resolution
                if width <= 0 or height <= 0 or width > 7680 or height > 4320:
                    fixed_config.resolution = (1920, 1080)
                    logger.info(f"🔧 Fixed resolution to 1920x1080")
            
            elif "quality" in issue.lower():
                # Fix invalid quality settings
                valid_qualities = ["low", "medium", "high", "ultra"]
                if fixed_config.quality not in valid_qualities:
                    fixed_config.quality = "medium"
                    logger.info(f"🔧 Fixed quality to medium")
        
        return fixed_config
    
    def safe_load_project(self, project_path: str):
        """Safely load project with error handling and retries"""
        for attempt in range(self.max_retries):
            try:
                logger.info(f"📁 Loading project (attempt {attempt + 1}): {project_path}")
                
                if self.engine.load_project(project_path):
                    logger.info(f"✅ Project loaded successfully: {project_path}")
                    return True
                else:
                    logger.warning(f"⚠️  Project load returned False: {project_path}")
                    
            except FileNotFoundError:
                logger.error(f"❌ Project not found: {project_path}")
                return False
                
            except PermissionError:
                logger.error(f"❌ Permission denied: {project_path}")
                return False
                
            except Exception as e:
                logger.warning(f"⚠️  Project load attempt {attempt + 1} failed: {e}")
                
                if attempt < self.max_retries - 1:
                    logger.info(f"⏳ Retrying in {self.retry_delay} seconds...")
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"❌ All project load attempts failed: {e}")
                    logger.error(traceback.format_exc())
        
        return False
    
    def safe_generate_video(self, shot_id: str):
        """Safely generate video with comprehensive error handling"""
        for attempt in range(self.max_retries):
            try:
                logger.info(f"🎬 Generating video (attempt {attempt + 1}): {shot_id}")
                
                result = self.engine.generate_video_sequence(shot_id)
                
                if result.success:
                    logger.info(f"✅ Video generated successfully: {shot_id} "
                              f"({result.frame_count} frames, {result.duration:.2f}s)")
                    return result
                else:
                    logger.warning(f"⚠️  Video generation failed: {shot_id} - {result.error_message}")
                    
                    # Try to recover from specific errors
                    if "memory" in result.error_message.lower():
                        logger.info("🧹 Attempting memory cleanup...")
                        import gc
                        gc.collect()
                        
                    elif "gpu" in result.error_message.lower():
                        logger.info("🔄 Falling back to CPU processing...")
                        self.config.gpu_acceleration = False
                        self.engine = VideoEngine(self.config)
                        
            except Exception as e:
                logger.warning(f"⚠️  Video generation attempt {attempt + 1} failed: {e}")
                
                if attempt < self.max_retries - 1:
                    logger.info(f"⏳ Retrying in {self.retry_delay} seconds...")
                    time.sleep(self.retry_delay)
                else:
                    logger.error(f"❌ All video generation attempts failed: {e}")
                    logger.error(traceback.format_exc())
        
        return None
    
    def process_with_full_error_handling(self, project_path: str, shot_ids: list):
        """Process shots with comprehensive error handling"""
        logger.info(f"🚀 Starting robust video processing: {len(shot_ids)} shots")
        
        # Initialize safely
        if not self.safe_initialize():
            return {"success": False, "error": "Failed to initialize video engine"}
        
        # Load project safely
        if not self.safe_load_project(project_path):
            return {"success": False, "error": f"Failed to load project: {project_path}"}
        
        # Process shots
        results = []
        successful_shots = 0
        
        for i, shot_id in enumerate(shot_ids):
            logger.info(f"📊 Processing shot {i+1}/{len(shot_ids)}: {shot_id}")
            
            result = self.safe_generate_video(shot_id)
            
            if result and result.success:
                results.append({
                    "shot_id": shot_id,
                    "success": True,
                    "frame_count": result.frame_count,
                    "duration": result.duration,
                    "output_path": result.output_path
                })
                successful_shots += 1
            else:
                results.append({
                    "shot_id": shot_id,
                    "success": False,
                    "error": result.error_message if result else "Unknown error"
                })
        
        success_rate = successful_shots / len(shot_ids) * 100
        logger.info(f"🎯 Processing complete: {successful_shots}/{len(shot_ids)} "
                   f"shots successful ({success_rate:.1f}%)")
        
        return {
            "success": True,
            "shots_processed": len(shot_ids),
            "shots_successful": successful_shots,
            "success_rate": success_rate,
            "results": results
        }

# Usage
processor = RobustVideoProcessor()

shot_ids = ["shot_001", "shot_002", "shot_003"]
final_result = processor.process_with_full_error_handling("/path/to/project", shot_ids)

if final_result["success"]:
    print(f"🎉 Processing completed successfully!")
    print(f"📊 Success rate: {final_result['success_rate']:.1f}%")
else:
    print(f"💔 Processing failed: {final_result['error']}")
```