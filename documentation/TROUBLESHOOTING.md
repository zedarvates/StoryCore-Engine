# Troubleshooting Guide - StoryCore

This comprehensive troubleshooting guide covers common issues, their diagnosis, and solutions for StoryCore-Engine.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation Issues](#installation-issues)
3. [Configuration Problems](#configuration-problems)
4. [Performance Issues](#performance-issues)
5. [Memory and Resource Problems](#memory-and-resource-problems)
6. [Video Engine Issues](#video-engine-issues)
7. [AI Model Issues](#ai-model-issues)
8. [ComfyUI Issues](#comfyui-issues)
9. [Network and Connection Issues](#network-and-connection-issues)
10. [Security Issues](#security-issues)
11. [Diagnostic Scripts](#diagnostic-scripts)

---

## Quick Diagnostics

### System Health Check

```bash
# Check overall system health
storycore health-check

# Check version information
storycore version

# Run full diagnostic
storycore diagnose

# Generate diagnostic report
storycore diagnose --output report.json

# Check logs
storycore logs
```

### CLI Diagnostics

```bash
# Verify CLI installation
where storycore  # Windows
which storycore  # Unix/Mac

# Test basic functionality
storycore --help

# Verify Python environment
python --version
pip list | grep storycore
```

---

## Installation Issues

### 1. Installation Fails

**Symptoms**: Installation process fails with an error

**Diagnosis**:
```bash
# Check Python version (requires 3.8+)
python --version

# Check Node.js version (requires 16+)
node --version

# Check disk space
df -h
```

**Solutions**:

#### Verify Prerequisites
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.9 python3.9-venv python3-pip git nodejs npm

# macOS
brew install python@3.9 nodejs npm git

# Windows (using Chocolatey)
choco install python nodejs git
```

#### Fix Permissions
```bash
# Windows: Run as administrator

# Linux/macOS
sudo chmod +x storycore-installer.sh
sudo ./storycore-installer.sh
```

#### Reinstall Dependencies
```bash
# Reinstall Python dependencies
pip install -r requirements.txt --force-reinstall

# Reinstall Node.js
npm install --force
```

### 2. Startup Problems

**Symptoms**: StoryCore doesn't start properly

**Diagnosis**:
```bash
# Check port usage
netstat -an | findstr :3000  # Windows
lsof -i :3000  # Linux/macOS

# Check configuration file
cat ~/.storycore/config.json

# Check error logs
tail -f ~/.storycore/logs/app.log  # Linux/macOS
Get-Content ~\.storycore\logs\app.log -Wait  # Windows
```

**Solutions**:
```bash
# Reset configuration
storycore config reset

# Restore defaults
storycore config restore-default

# Restart service
storycore restart
```

---

## Configuration Problems

### 1. Invalid Configuration Parameters

**Symptoms**: Configuration validation fails with "Invalid frame rate" or "Invalid resolution" errors

**Diagnosis**:
```bash
# Validate configuration
storycore config validate
```

**Solutions**:

#### Use Configuration Validation
```python
from video_engine import VideoConfig, VideoEngine

def create_safe_config(**kwargs):
    try:
        config = VideoConfig(**kwargs)
        temp_engine = VideoEngine(config)
        is_valid, issues = temp_engine.validate_configuration()
        
        if not is_valid:
            print(f"Configuration issues: {issues}")
        
        return config
    except Exception as e:
        print(f"Configuration creation failed: {e}")
        return VideoConfig()  # Return default config

# Safe configuration creation
config = create_safe_config(
    frame_rate=24,
    resolution=(1920, 1080),
    quality="high"
)
```

#### Use Preset Configurations
```python
from video_configuration_manager import VideoConfigurationManager

config_manager = VideoConfigurationManager()

# Load tested preset
config = config_manager.load_preset("cinematic")
is_valid, issues = config_manager.validate_configuration(config)
```

### 2. Configuration File Issues

**Symptoms**: Configuration changes not being applied

**Solutions**:
```bash
# Validate JSON syntax
cat ~/.storycore/config.json | python -m json.tool

# Fix permissions
chmod 644 ~/.storycore/config.json  # Linux/macOS

# Reset to defaults
storycore config reset
```

---

## Performance Issues

### 1. Slow Performance

**Symptoms**: Application runs slowly, processing takes too long

**Diagnosis**:
```bash
# Check CPU usage
top

# Check memory usage
free -h

# Check disk I/O
df -h

# Monitor network
iftop

# Check GPU usage
nvidia-smi
```

**Solutions**:
```bash
# Optimize configuration
storycore config set performance.optimization true

# Clear cache
storycore cache clean

# Restart service
storycore restart

# Configure GPU
storycore config set rendering.gpu true
storycore config set rendering.gpu_memory 0.8
```

### 2. Performance Diagnosis Code

```python
import time
import psutil
from video_engine import VideoEngine, VideoConfig

def diagnose_performance(project_path: str, shot_id: str):
    """Diagnose performance issues"""
    
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
        try:
            engine = VideoEngine(config)
            engine.load_project(project_path)
            
            start_time = time.time()
            result = engine.generate_video_sequence(shot_id)
            end_time = time.time()
            
            if result.success:
                fps = result.frame_count / (end_time - start_time)
                results[name] = {
                    "success": True,
                    "duration": end_time - start_time,
                    "fps": fps
                }
        
        except Exception as e:
            results[name] = {"success": False, "error": str(e)}
    
    return results
```

---

## Memory and Resource Problems

### 1. Out of Memory Errors

**Symptoms**: "Out of memory" errors, system becomes unresponsive

**Diagnosis**:
```python
import psutil
import gc

def diagnose_memory_usage():
    process = psutil.Process()
    memory = psutil.virtual_memory()
    
    print(f"System Memory:")
    print(f"  Total: {memory.total / 1024**3:.1f} GB")
    print(f"  Available: {memory.available / 1024**3:.1f} GB")
    print(f"  Used: {memory.percent:.1f}%")
    
    process_memory = process.memory_info()
    print(f"Process Memory:")
    print(f"  RSS: {process_memory.rss / 1024**2:.1f} MB")
    
    return {
        "system_available_gb": memory.available / 1024**3,
        "process_rss_mb": process_memory.rss / 1024**2
    }
```

**Solutions**:

#### Memory-Efficient Processing
```python
import gc
from video_engine import VideoEngine, VideoConfig

class MemoryEfficientEngine:
    def __init__(self, memory_limit_gb=4.0):
        self.memory_limit_gb = memory_limit_gb
        self.config = VideoConfig(
            frame_rate=24,
            resolution=(1280, 720),
            quality="medium",
            parallel_processing=False,
            gpu_acceleration=True
        )
        self.engine = VideoEngine(self.config)
    
    def process_shot_memory_safe(self, project_path: str, shot_id: str):
        memory = psutil.virtual_memory()
        available_gb = memory.available / 1024**3
        
        if available_gb < self.memory_limit_gb:
            print(f"Low memory: {available_gb:.1f} GB available")
            gc.collect()
        
        self.engine.load_project(project_path)
        result = self.engine.generate_video_sequence(shot_id)
        gc.collect()
        return result
```

#### Batch Processing
```python
def process_large_project_safely(project_path: str, shot_ids: list):
    config = VideoConfig(
        resolution=(1280, 720),
        quality="medium",
        parallel_processing=False
    )
    
    engine = VideoEngine(config)
    engine.load_project(project_path)
    
    results = []
    
    for shot_id in shot_ids:
        memory = psutil.virtual_memory()
        available_gb = memory.available / 1024**3
        
        if available_gb < 2.0:
            print("Low memory, forcing cleanup...")
            gc.collect()
        
        try:
            result = engine.generate_video_sequence(shot_id)
            results.append({
                "shot_id": shot_id,
                "success": result.success
            })
        except Exception as e:
            results.append({
                "shot_id": shot_id,
                "success": False,
                "error": str(e)
            })
        
        gc.collect()
    
    return results
```

### 2. GPU Memory Issues

**Symptoms**: CUDA out of memory errors, GPU processing falls back to CPU

**Diagnosis**:
```python
def diagnose_gpu_memory():
    try:
        import torch
        if torch.cuda.is_available():
            device = torch.cuda.current_device()
            gpu_memory = torch.cuda.get_device_properties(device).total_memory
            gpu_reserved = torch.cuda.memory_reserved(device)
            
            print(f"GPU Memory:")
            print(f"  Total: {gpu_memory / 1024**3:.1f} GB")
            print(f"  Reserved: {gpu_reserved / 1024**3:.1f} GB")
            print(f"  Available: {(gpu_memory - gpu_reserved) / 1024**3:.1f} GB")
            
            return {"available_gb": (gpu_memory - gpu_reserved) / 1024**3}
    except ImportError:
        print("PyTorch not available for GPU diagnosis")
    return None
```

**Solutions**:
```python
def create_gpu_optimized_config(available_gpu_memory_gb):
    if available_gpu_memory_gb >= 8.0:
        return VideoConfig(
            resolution=(1920, 1080),
            quality="high",
            gpu_acceleration=True,
            parallel_processing=True
        )
    elif available_gpu_memory_gb >= 4.0:
        return VideoConfig(
            resolution=(1280, 720),
            quality="medium",
            gpu_acceleration=True,
            parallel_processing=True
        )
    else:
        return VideoConfig(
            resolution=(854, 480),
            quality="medium",
            gpu_acceleration=False,
            parallel_processing=True
        )

def cleanup_gpu_memory():
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
    except ImportError:
        pass
    gc.collect()
```

---

## Video Engine Issues

### 1. Video Engine Fails to Initialize

**Symptoms**: ImportError, "Module not found" errors

**Diagnosis**:
```python
try:
    from video_engine import VideoEngine, VideoConfig
    print("Basic imports successful")
except ImportError as e:
    print(f"Import error: {e}")
```

**Solutions**:
```bash
# Install core dependencies
pip install numpy>=1.19.0
pip install opencv-python>=4.5.0
pip install Pillow>=8.0.0

# For advanced features
pip install scipy>=1.7.0
pip install scikit-image>=0.18.0
```

### 2. GPU Acceleration Not Working

**Symptoms**: GPU acceleration setting ignored, processing falls back to CPU

**Diagnosis**:
```python
import cv2
import torch

print(f"OpenCV version: {cv2.__version__}")
print(f"CUDA support: {cv2.cuda.getCudaEnabledDeviceCount() > 0}")
print(f"PyTorch CUDA available: {torch.cuda.is_available()}")
```

**Solutions**:
```bash
# Install GPU-enabled OpenCV
pip uninstall opencv-python
pip install opencv-contrib-python

# Verify GPU drivers
nvidia-smi
nvcc --version
```

### 3. Poor Interpolation Quality

**Symptoms**: Visible artifacts, jerky motion, character inconsistency

**Solutions**:
```python
from advanced_interpolation_engine import (
    AdvancedInterpolationEngine,
    create_cinematic_preset,
    InterpolationMethod
)

def create_quality_optimized_config():
    config = create_cinematic_preset("cinematic")
    config.method = InterpolationMethod.OPTICAL_FLOW
    config.quality_vs_speed = 0.9
    return config

engine = AdvancedInterpolationEngine(create_quality_optimized_config())
```

---

## AI Model Issues

### 1. Model Loading Issues

**Symptoms**: Models not loaded, errors during processing

**Solutions**:
```bash
# List installed models
storycore model list

# Verify model paths
ls -la ~/.storycore/models/

# Force model download
storycore model download --force gemma3:latest

# Check disk space
df -h ~/.storycore/models/

# Verify model integrity
storycore model verify gemma3
```

### 2. Model Configuration

```json
// models.json
{
  "models": {
    "gemma3": {
      "name": "Gemma 3",
      "path": "models/gemma3/gemma3-7b.Q4_0.gguf",
      "type": "llama",
      "parameters": {
        "n_ctx": 8192,
        "n_gpu_layers": 40,
        "temperature": 0.7,
        "top_p": 0.9
      },
      "enabled": true
    }
  }
}
```

---

## ComfyUI Issues

### 1. ComfyUI Doesn't Start

**Symptoms**: Error when starting ComfyUI

**Solutions**:
```bash
# Check port usage
netstat -tlnp | grep :8000

# Change port
storycore config set comfyui.port 8001

# Verify Python environment
python -c "import torch; print(torch.__version__)"

# Reinstall PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Check models
ls -la ~/.storycore/comfyui/models/

# Download models
storycore comfyui download-models
```

### 2. AI Processing Errors

**Solutions**:
```bash
# Check GPU
nvidia-smi

# Configure GPU
storycore config set comfyui.gpu.enabled true
storycore config set comfyui.gpu.memory_limit 0.8

# Optimize performance
storycore config set comfyui.performance.batch_size 1

# List models
storycore comfyui list-models

# Test model
storycore comfyui test-model gemma3 "Hello, world!"
```

---

## Network and Connection Issues

### 1. Authentication Problems

**Solutions**:
```bash
# Test login manually
curl -X POST https://api.storycore.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Validate token
storycore auth validate-token

# Refresh token
storycore auth refresh
```

### 2. Network Connectivity

**Solutions**:
```bash
# Test connectivity
ping api.storycore.io

# Check DNS
nslookup api.storycore.io

# Test HTTPS
curl -I https://api.storycore.io

# Configure proxy
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# Configure firewall
sudo ufw allow 3000
sudo ufw allow 8000
```

---

## Security Issues

### 1. Account Locked

**Solutions**:
```bash
# Reset password
storycore auth reset-password

# Check account security
storycore security check-account

# List active sessions
storycore auth list-sessions

# Invalidate all sessions
storycore auth invalidate-sessions
```

### 2. Data Issues

**Solutions**:
```bash
# Create backup
storycore backup create

# Restore backup
storycore backup restore backup-20260123.tar.gz

# Check data integrity
storycore data integrity-check

# Repair data
storycore data repair
```

---

## Diagnostic Scripts

### Complete Diagnostic Script

```bash
#!/bin/bash
echo "=== StoryCore Diagnostic Report ==="
echo "Date: $(date)"

echo "1. System Health:"
storycore health-check

echo "2. Version Info:"
storycore version

echo "3. Configuration:"
storycore config validate

echo "4. Models:"
storycore model list

echo "5. ComfyUI Status:"
storycore comfyui status

echo "6. Generating Report:"
storycore diagnose --output diagnostic-report-$(date +%Y%m%d-%H%M%S).json

echo "=== Diagnostic Complete ==="
```

### Automated Repair Script

```bash
#!/bin/bash
echo "=== StoryCore Repair ==="
echo "Date: $(date)"

echo "1. Stopping services..."
storycore stop

echo "2. Cleaning cache..."
storycore cache clean

echo "3. Resetting configuration..."
storycore config reset
storycore config restore-default

echo "4. Checking models..."
storycore model check
storycore model repair

echo "5. Starting services..."
storycore start

echo "6. Verifying health..."
storycore health-check

echo "=== Repair Complete ==="
```

---

## Getting Help

If you cannot resolve your issue:

1. **Check Documentation**: Review the Complete Documentation
2. **Check Changelog**: See CHANGELOG.md for known issues
3. **GitHub Issues**: Report issues on GitHub
4. **Discord**: Join our Discord server
5. **Email**: support@storycore.io

### Information to Provide

When contacting support, include:

- **Version**: `storycore version`
- **OS**: Operating system and version
- **Hardware**: CPU, RAM, GPU, disk space
- **Error Message**: Exact error text
- **Logs**: Relevant log files
- **Steps to Reproduce**: Exact reproduction steps

---

## Related Documentation

- [User Guide](USER_GUIDE.md) - User documentation
- [Technical Guide](TECHNICAL_GUIDE.md) - Technical documentation
- [Security Documentation](SECURITY.md) - Security features
- [API Documentation](api/OVERVIEW.md) - API reference

---

*Last Updated: January 2026*
