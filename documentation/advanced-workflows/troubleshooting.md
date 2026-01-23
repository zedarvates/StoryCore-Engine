# Troubleshooting Guide - Advanced ComfyUI Workflows

## Overview

This comprehensive troubleshooting guide helps you diagnose and resolve common issues with advanced ComfyUI workflows. Find solutions for installation problems, generation errors, performance issues, and quality concerns.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Installation Problems](#installation-problems)
3. [Model Loading Issues](#model-loading-issues)
4. [Generation Errors](#generation-errors)
5. [Performance Problems](#performance-problems)
6. [Quality Issues](#quality-issues)
7. [Memory and VRAM Issues](#memory-and-vram-issues)
8. [Configuration Problems](#configuration-problems)
9. [Diagnostic Tools](#diagnostic-tools)

## Common Issues

### Quick Diagnostic Checklist

Before diving into specific issues, run this quick diagnostic:

```bash
# Check system status
python storycore.py status --advanced

# Validate configuration
python storycore.py config --validate --advanced

# Test basic functionality
python storycore.py test --quick --advanced

# Check model availability
python storycore.py models --list --status
```

### Most Common Issues

| Issue | Frequency | Severity | Quick Fix |
|-------|-----------|----------|-----------|
| Model not found | 35% | High | Download missing models |
| Out of VRAM | 25% | High | Reduce batch size/precision |
| Configuration error | 20% | Medium | Validate config file |
| Generation timeout | 10% | Medium | Increase timeout settings |
| Quality below threshold | 10% | Low | Adjust quality settings |

## Installation Problems

### Issue: Advanced workflows not available

**Symptoms:**
- `AdvancedWorkflowManager not found` error
- Missing workflow options in CLI
- Import errors for advanced modules

**Diagnosis:**
```bash
python -c "from src.advanced_workflow_manager import AdvancedWorkflowManager; print('OK')"
```

**Solutions:**

1. **Verify Installation:**
   ```bash
   # Check if advanced modules are installed
   ls src/advanced_*
   
   # Reinstall if missing
   python setup.py install --advanced
   ```

2. **Check Python Path:**
   ```bash
   export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"
   python storycore.py --help
   ```

3. **Dependency Issues:**
   ```bash
   pip install -r requirements-advanced.txt
   ```

### Issue: ComfyUI integration failure

**Symptoms:**
- `ComfyUI not found` error
- Workflow execution fails
- Node loading errors

**Diagnosis:**
```bash
python storycore.py comfyui --test-connection
```

**Solutions:**

1. **Install ComfyUI:**
   ```bash
   git clone https://github.com/comfyanonymous/ComfyUI.git
   cd ComfyUI
   pip install -r requirements.txt
   ```

2. **Configure ComfyUI Path:**
   ```json
   {
       "comfyui_config": {
           "installation_path": "/path/to/ComfyUI",
           "python_executable": "python",
           "auto_start": true
       }
   }
   ```

3. **Custom Nodes Installation:**
   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/Comfy-Org/ComfyUI-Manager.git
   ```

## Model Loading Issues

### Issue: Model not found errors

**Symptoms:**
- `ModelNotFoundError: hunyuan_t2v_720p not found`
- Missing model files
- Download failures

**Diagnosis:**
```bash
python storycore.py models --check --workflow hunyuan
```

**Solutions:**

1. **Download Missing Models:**
   ```bash
   # Download all advanced models
   python storycore.py models --download-advanced --all
   
   # Download specific workflow models
   python storycore.py models --download --workflow hunyuan
   ```

2. **Manual Model Download:**
   ```bash
   # Create model directory
   mkdir -p models/hunyuan
   
   # Download from Hugging Face
   huggingface-cli download Comfy-Org/HunyuanVideo_comfyui \
       --local-dir models/hunyuan
   ```

3. **Verify Model Integrity:**
   ```bash
   python storycore.py models --verify --workflow hunyuan
   ```

### Issue: Model loading timeout

**Symptoms:**
- Long loading times (>5 minutes)
- Timeout errors during model loading
- System becomes unresponsive

**Diagnosis:**
```bash
python storycore.py debug --model-loading --workflow hunyuan
```

**Solutions:**

1. **Increase Timeout:**
   ```json
   {
       "model_loading": {
           "timeout_seconds": 600,
           "retry_attempts": 3,
           "enable_progress_bar": true
       }
   }
   ```

2. **Enable Model Caching:**
   ```json
   {
       "model_management": {
           "enable_caching": true,
           "cache_size_gb": 12.0,
           "preload_models": ["hunyuan_t2v_720p"]
       }
   }
   ```

3. **Use Faster Storage:**
   ```bash
   # Move models to SSD
   mv models /fast_ssd/models
   ln -s /fast_ssd/models models
   ```

### Issue: Model precision/quantization errors

**Symptoms:**
- `Unsupported precision: fp8` error
- Quantization failures
- Model corruption warnings

**Diagnosis:**
```bash
python storycore.py models --check-precision --workflow all
```

**Solutions:**

1. **Check GPU Compatibility:**
   ```python
   import torch
   print(f"CUDA version: {torch.version.cuda}")
   print(f"GPU: {torch.cuda.get_device_name()}")
   print(f"FP8 support: {torch.cuda.is_available() and torch.version.cuda >= '11.8'}")
   ```

2. **Fallback to FP16:**
   ```json
   {
       "advanced_workflows": {
           "model_precision": "fp16",
           "enable_quantization": false
       }
   }
   ```

3. **Update PyTorch:**
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

## Generation Errors

### Issue: Workflow execution failure

**Symptoms:**
- `WorkflowExecutionError` during generation
- Incomplete outputs
- Process crashes

**Diagnosis:**
```bash
python storycore.py debug --workflow-execution --verbose
```

**Solutions:**

1. **Check Workflow Configuration:**
   ```bash
   python storycore.py workflow --validate --name hunyuan_t2v
   ```

2. **Enable Debug Mode:**
   ```json
   {
       "debug": {
           "enable_workflow_debugging": true,
           "save_intermediate_results": true,
           "log_level": "DEBUG"
       }
   }
   ```

3. **Use Fallback Workflow:**
   ```python
   try:
       result = engine.generate_video(request)
   except WorkflowExecutionError:
       request.workflow_preference = "fallback"
       result = engine.generate_video(request)
   ```

### Issue: Generation produces no output

**Symptoms:**
- Process completes but no files generated
- Empty output directories
- Success status but missing results

**Diagnosis:**
```bash
# Check output directory permissions
ls -la outputs/
# Check disk space
df -h
# Check generation logs
tail -f logs/generation.log
```

**Solutions:**

1. **Fix Output Directory:**
   ```bash
   mkdir -p outputs
   chmod 755 outputs
   ```

2. **Check Disk Space:**
   ```bash
   # Free up space if needed
   python storycore.py cleanup --temp-files --old-outputs
   ```

3. **Verify Generation Parameters:**
   ```python
   request = VideoGenerationRequest(
       prompt="Test generation",
       duration=2.0,  # Short test
       quality_level="draft",  # Fast generation
       output_path="outputs/test.mp4"  # Explicit path
   )
   ```

### Issue: Generation quality below threshold

**Symptoms:**
- `QualityValidationError` exceptions
- Automatic retries triggered
- Low quality scores in reports

**Diagnosis:**
```bash
python storycore.py analyze --input outputs/video.mp4 --detailed
```

**Solutions:**

1. **Adjust Quality Threshold:**
   ```json
   {
       "quality_settings": {
           "quality_threshold": 0.6,  # Lower threshold
           "auto_retry_on_failure": true,
           "max_retry_attempts": 2
       }
   }
   ```

2. **Improve Generation Parameters:**
   ```python
   request = VideoGenerationRequest(
       prompt="Detailed, high-quality prompt with specific descriptions",
       quality_level="high",  # Higher quality
       num_inference_steps=50,  # More steps
       guidance_scale=8.0  # Stronger guidance
   )
   ```

3. **Enable Quality Enhancement:**
   ```json
   {
       "quality_enhancement": {
           "enable_auto_enhancement": true,
           "enhancement_threshold": 0.7,
           "upscaling_enabled": true
       }
   }
   ```

## Performance Problems

### Issue: Slow generation times

**Symptoms:**
- Generation takes much longer than expected
- System becomes unresponsive
- High CPU/GPU usage

**Diagnosis:**
```bash
python storycore.py benchmark --workflow hunyuan_t2v --detailed
```

**Solutions:**

1. **Enable Performance Optimization:**
   ```json
   {
       "performance_optimization": {
           "strategy": "speed_first",
           "enable_model_sharing": true,
           "enable_batching": true,
           "use_lightning_lora": true
       }
   }
   ```

2. **Reduce Quality for Speed:**
   ```python
   request = VideoGenerationRequest(
       prompt="Your prompt here",
       quality_level="draft",  # Faster generation
       num_inference_steps=20,  # Fewer steps
       resolution=(512, 512)  # Lower resolution
   )
   ```

3. **Optimize System Settings:**
   ```bash
   # Set GPU performance mode
   nvidia-smi -pm 1
   nvidia-smi -pl 400  # Set power limit
   
   # Optimize CPU governor
   echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
   ```

### Issue: High memory usage

**Symptoms:**
- System RAM usage near 100%
- Swap file usage
- System slowdown

**Diagnosis:**
```bash
python storycore.py monitor --memory --real-time
```

**Solutions:**

1. **Enable Memory Optimization:**
   ```json
   {
       "memory_optimization": {
           "enable_cpu_offload": true,
           "enable_sequential_cpu_offload": true,
           "aggressive_cleanup": true,
           "max_ram_usage_gb": 16.0
       }
   }
   ```

2. **Reduce Batch Size:**
   ```json
   {
       "advanced_workflows": {
           "batch_size": 1,
           "parallel_execution": false
       }
   }
   ```

3. **Clear Memory Regularly:**
   ```python
   import gc
   import torch
   
   # Clear GPU memory
   torch.cuda.empty_cache()
   
   # Force garbage collection
   gc.collect()
   ```

## Quality Issues

### Issue: Poor video temporal consistency

**Symptoms:**
- Flickering between frames
- Inconsistent character appearance
- Temporal artifacts

**Diagnosis:**
```bash
python storycore.py analyze --input video.mp4 --metric temporal_consistency
```

**Solutions:**

1. **Improve Prompt Consistency:**
   ```python
   # Use consistent, detailed prompts
   prompt = "A consistent character: young woman with long brown hair, " \
            "wearing a blue dress, walking through a garden, " \
            "maintaining the same appearance throughout"
   ```

2. **Adjust Generation Parameters:**
   ```python
   request = VideoGenerationRequest(
       prompt=prompt,
       guidance_scale=8.5,  # Higher guidance
       num_inference_steps=50,  # More steps
       enable_temporal_consistency=True
   )
   ```

3. **Use I2V for Better Consistency:**
   ```python
   # Generate reference frame first
   reference_result = image_engine.generate_image(ImageGenerationRequest(
       prompt="Character reference: young woman with brown hair in blue dress"
   ))
   
   # Use for I2V generation
   video_result = video_engine.generate_video(VideoGenerationRequest(
       prompt="The character walks through the garden",
       reference_image=reference_result.image_path,
       mode="i2v_specialized"
   ))
   ```

### Issue: Anime images don't match style

**Symptoms:**
- Generated images look realistic instead of anime
- Wrong art style
- Poor character consistency

**Diagnosis:**
```bash
python storycore.py analyze --input image.jpg --metric style_consistency
```

**Solutions:**

1. **Use Proper Anime Prompts:**
   ```python
   # Good anime prompt
   prompt = "anime, masterpiece, best quality, 1girl, silver hair, blue eyes, " \
            "school uniform, detailed face, soft lighting, anime art style"
   
   # Avoid realistic terms
   # Bad: "photorealistic, photograph, real person"
   ```

2. **Use NewBie Workflow Explicitly:**
   ```python
   request = ImageGenerationRequest(
       prompt=anime_prompt,
       mode="anime",  # Force anime workflow
       workflow_preference="newbie_anime"
   )
   ```

3. **Use XML Character Definition:**
   ```xml
   <character>
       <appearance>
           <hair color="silver" style="long" texture="silky" />
           <eyes color="blue" shape="large" expression="gentle" />
           <face shape="oval" features="delicate" />
       </appearance>
       <style type="anime" quality="masterpiece" />
   </character>
   ```

### Issue: Image relighting looks unnatural

**Symptoms:**
- Harsh lighting transitions
- Unrealistic shadows
- Color distortion

**Diagnosis:**
```bash
python storycore.py analyze --input relit_image.jpg --metric lighting_quality
```

**Solutions:**

1. **Use Appropriate Lighting Presets:**
   ```python
   # Choose realistic lighting
   result = qwen.relight_image(
       image_path="portrait.jpg",
       lighting_type="natural_daylight",  # More natural
       intensity=0.8,  # Subtle change
       preserve_shadows=True
   )
   ```

2. **Gradual Lighting Changes:**
   ```python
   # Make incremental adjustments
   for intensity in [0.2, 0.4, 0.6, 0.8]:
       result = qwen.relight_image(
           image_path="previous_result.jpg",
           lighting_type="golden_hour",
           intensity=intensity
       )
   ```

3. **Use Reference Images:**
   ```python
   result = qwen.edit_image_multimodal(
       image_path="source.jpg",
       reference_images=["lighting_reference.jpg"],
       edit_prompt="Apply the lighting style from the reference image"
   )
   ```

## Memory and VRAM Issues

### Issue: Out of VRAM errors

**Symptoms:**
- `CUDA out of memory` errors
- `RuntimeError: out of memory`
- Generation fails to start

**Diagnosis:**
```bash
nvidia-smi
python storycore.py monitor --vram --real-time
```

**Solutions:**

1. **Reduce VRAM Usage:**
   ```json
   {
       "advanced_workflows": {
           "model_precision": "fp8",
           "max_memory_usage_gb": 12.0,
           "batch_size": 1
       }
   }
   ```

2. **Enable Memory Optimizations:**
   ```json
   {
       "memory_optimization": {
           "enable_attention_slicing": true,
           "attention_slice_size": 1,
           "enable_cpu_offload": true,
           "enable_vae_slicing": true
       }
   }
   ```

3. **Use Sequential Processing:**
   ```python
   # Process one at a time instead of batch
   results = []
   for request in requests:
       torch.cuda.empty_cache()  # Clear between generations
       result = engine.generate_video(request)
       results.append(result)
   ```

### Issue: Memory leaks

**Symptoms:**
- Memory usage increases over time
- System becomes slower with each generation
- Eventually runs out of memory

**Diagnosis:**
```bash
python storycore.py debug --memory-leaks --duration 3600
```

**Solutions:**

1. **Enable Aggressive Cleanup:**
   ```json
   {
       "memory_management": {
           "aggressive_cleanup": true,
           "cleanup_interval": 60,
           "force_garbage_collection": true
       }
   }
   ```

2. **Manual Memory Management:**
   ```python
   import gc
   import torch
   
   def cleanup_memory():
       """Manual memory cleanup"""
       torch.cuda.empty_cache()
       gc.collect()
       
   # Call after each generation
   result = engine.generate_video(request)
   cleanup_memory()
   ```

3. **Restart Process Periodically:**
   ```python
   # For long-running processes
   generation_count = 0
   for request in requests:
       result = engine.generate_video(request)
       generation_count += 1
       
       if generation_count % 10 == 0:
           # Restart engine every 10 generations
           engine.restart()
   ```

## Configuration Problems

### Issue: Invalid configuration file

**Symptoms:**
- `ConfigurationError` on startup
- JSON parsing errors
- Missing required fields

**Diagnosis:**
```bash
python storycore.py config --validate --verbose
```

**Solutions:**

1. **Validate JSON Syntax:**
   ```bash
   python -m json.tool config.json
   ```

2. **Use Configuration Schema:**
   ```bash
   python storycore.py config --validate --schema
   ```

3. **Reset to Defaults:**
   ```bash
   python storycore.py config --reset --backup-current
   ```

### Issue: Environment variable conflicts

**Symptoms:**
- Configuration not taking effect
- Unexpected behavior
- Settings being overridden

**Diagnosis:**
```bash
python storycore.py config --show-effective --source
```

**Solutions:**

1. **Check Environment Variables:**
   ```bash
   env | grep STORYCORE
   ```

2. **Clear Conflicting Variables:**
   ```bash
   unset STORYCORE_MODEL_PRECISION
   unset STORYCORE_MAX_MEMORY_GB
   ```

3. **Use Explicit Configuration:**
   ```python
   config = AdvancedWorkflowConfig(
       model_precision="fp16",  # Explicit setting
       max_memory_usage_gb=20.0,
       ignore_environment=True  # Ignore env vars
   )
   ```

## Diagnostic Tools

### Built-in Diagnostics

```bash
# Comprehensive system check
python storycore.py doctor --advanced

# Performance benchmarking
python storycore.py benchmark --all-workflows

# Memory profiling
python storycore.py profile --memory --duration 300

# Quality analysis
python storycore.py analyze --input outputs/ --recursive
```

### Custom Diagnostic Scripts

**Memory Monitor:**
```python
import psutil
import torch
import time

def monitor_memory(duration=300):
    """Monitor memory usage over time"""
    start_time = time.time()
    
    while time.time() - start_time < duration:
        # System memory
        ram = psutil.virtual_memory()
        print(f"RAM: {ram.percent}% ({ram.used/1e9:.1f}GB/{ram.total/1e9:.1f}GB)")
        
        # GPU memory
        if torch.cuda.is_available():
            gpu_mem = torch.cuda.memory_stats()
            allocated = gpu_mem['allocated_bytes.all.current'] / 1e9
            reserved = gpu_mem['reserved_bytes.all.current'] / 1e9
            print(f"VRAM: {allocated:.1f}GB allocated, {reserved:.1f}GB reserved")
        
        time.sleep(10)

# Run monitoring
monitor_memory(300)  # Monitor for 5 minutes
```

**Performance Profiler:**
```python
import cProfile
import pstats
from src.enhanced_video_engine import EnhancedVideoEngine

def profile_generation():
    """Profile video generation performance"""
    
    profiler = cProfile.Profile()
    profiler.enable()
    
    # Run generation
    engine = EnhancedVideoEngine(config)
    result = engine.generate_video(request)
    
    profiler.disable()
    
    # Analyze results
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(20)  # Top 20 functions

profile_generation()
```

### Log Analysis

**Enable Detailed Logging:**
```json
{
    "logging": {
        "level": "DEBUG",
        "enable_file_logging": true,
        "log_file": "logs/advanced_workflows.log",
        "enable_performance_logging": true,
        "enable_memory_logging": true
    }
}
```

**Analyze Logs:**
```bash
# Check for errors
grep -i error logs/advanced_workflows.log

# Check memory usage patterns
grep -i "memory\|vram" logs/advanced_workflows.log

# Check performance metrics
grep -i "generation_time\|fps" logs/advanced_workflows.log

# Monitor model loading
grep -i "loading\|loaded" logs/advanced_workflows.log
```

### Getting Help

**Community Support:**
- GitHub Issues: Report bugs and request features
- Discord: Real-time community support
- Documentation: Comprehensive guides and examples

**Professional Support:**
- Enterprise support available
- Custom workflow development
- Performance optimization consulting

**Reporting Issues:**
```bash
# Generate diagnostic report
python storycore.py report --issue --include-logs --include-config

# This creates a comprehensive report with:
# - System information
# - Configuration details
# - Recent logs
# - Performance metrics
# - Error traces
```

---

*This troubleshooting guide covers the most common issues with advanced workflows. For additional help, consult the [User Guide](user-guide.md) or reach out to the community.*