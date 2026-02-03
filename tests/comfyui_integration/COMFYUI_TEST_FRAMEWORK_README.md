# ComfyUI Real Integration Testing Framework

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Command-Line Usage](#command-line-usage)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Expected Outputs](#expected-outputs)
- [Advanced Usage](#advanced-usage)

## Overview

The ComfyUI Real Integration Testing Framework provides comprehensive testing capabilities for validating image generation using Flux Turbo and image-to-video conversion using LTX2 with a real ComfyUI backend. This framework ensures that the StoryCore pipeline can reliably integrate with ComfyUI for production-quality multimodal content generation.

### Key Features

✅ **Flux Turbo Image Generation Testing** - Validate text-to-image workflows  
✅ **LTX2 Video Generation Testing** - Validate image-to-video workflows  
✅ **End-to-End Pipeline Testing** - Test complete text → image → video pipeline  
✅ **Quality Validation** - Automated quality checks for outputs  
✅ **Error Handling** - Comprehensive error scenario testing  
✅ **Flexible Configuration** - Command-line and environment variable support  

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Runner (CLI)                        │
│  - Parse command-line arguments                              │
│  - Orchestrate test execution                                │
│  - Generate test reports                                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──────────────────────────────────────────┐
                 │                                          │
    ┌────────────▼──────────┐              ┌───────────────▼──────────┐
    │  Connection Manager   │              │   Workflow Executor      │
    │  - Health checks      │              │   - Load workflow JSON   │
    │  - Authentication     │◄─────────────┤   - Inject parameters    │
    │  - Error handling     │              │   - Queue prompts        │
    └────────────┬──────────┘              │   - Poll for completion  │
                 │                         └───────────────┬──────────┘
                 │                                         │
    ┌────────────▼──────────┐              ┌───────────────▼──────────┐
    │   Quality Validator   │              │   Output Manager         │
    │  - File validation    │              │   - Save outputs         │
    │  - Format checks      │              │   - Generate reports     │
    │  - Size verification  │              │   - Organize files       │
    └───────────────────────┘              └──────────────────────────┘
```

## Prerequisites

### 1. ComfyUI Installation

**Required:** ComfyUI must be installed and running before executing tests.

**Installation Options:**

**Option A: Portable Installation (Recommended for Windows)**
```bash
# Download ComfyUI portable from:
# https://github.com/comfyanonymous/ComfyUI/releases

# Extract and run:
cd ComfyUI_windows_portable
run_nvidia_gpu.bat  # or run_cpu.bat
```

**Option B: Manual Installation**
```bash
# Clone ComfyUI repository
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Install dependencies
pip install -r requirements.txt

# Start ComfyUI
python main.py --listen 0.0.0.0 --port 8000
```

**Verify ComfyUI is Running:**
```bash
# Should return system stats JSON
curl http://localhost:8000/system_stats
```

### 2. Required Models

The framework requires specific models to be installed in ComfyUI:

#### Flux Turbo Model (Image Generation)
- **Model:** `z_image_turbo_bf16.safetensors`
- **Location:** `ComfyUI/models/checkpoints/`
- **Download:** [Hugging Face - Flux Turbo](https://huggingface.co/black-forest-labs/FLUX.1-schnell)
- **Size:** ~23 GB

**Installation:**
```bash
cd ComfyUI/models/checkpoints
# Download using wget or browser
wget https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors
# Rename to expected name
mv flux1-schnell.safetensors z_image_turbo_bf16.safetensors
```

#### LTX2 Models (Video Generation)
- **Model:** LTX2 checkpoint and related files
- **Location:** `ComfyUI/models/checkpoints/` and related directories
- **Download:** [Hugging Face - LTX2](https://huggingface.co/Lightricks/LTX-Video)
- **Size:** ~10 GB

**Required Files:**
- `ltx-2-19b-dev-fp8.safetensors` - Main checkpoint (place in `models/checkpoints/`)
- `gemma_3_12B_it_fp4_mixed.safetensors` - Text encoder (place in `models/text_encoders/`)
- `ltx-2-19b-distilled-lora-384.safetensors` - Distilled LoRA (place in `models/loras/`)
- `ltx-2-spatial-upscaler-x2-1.0.safetensors` - Spatial upscaler (place in `models/upscale_models/`)

**Installation:**
```bash
# Install LTX2 custom nodes
cd ComfyUI/custom_nodes
git clone https://github.com/Lightricks/ComfyUI-LTX2

# Download models from Hugging Face
# Follow instructions from Lightricks/LTX-Video repository
# Place models in appropriate directories as listed above
```

**Note:** The framework uses the **i2v (image-to-video)** workflow which requires standard LTX2 custom nodes. See [LTX2 Workflow Guide](../../assets/workflows/LTX2_WORKFLOW_GUIDE.md) for details on workflow differences.

### 3. Python Environment

**Required Python Version:** 3.9 or higher

**Check Python Version:**
```bash
python --version  # Should show Python 3.9.x or higher
```

### 4. Workflow Files

The framework requires workflow JSON files to be present:

**Required Files:**
- `assets/workflows/z_image_turbo_generation.json` - Flux Turbo workflow
- `assets/workflows/ltx2_image_to_video_i2v.json` - LTX2 i2v workflow (recommended)
- `assets/workflows/ltx2_image_to_video.json` - LTX2 t2v workflow (deprecated)

**Verify Files Exist:**
```bash
ls -la assets/workflows/
# Should show workflow files
```

**Note:** Use `ltx2_image_to_video_i2v.json` for image-to-video conversion. The older `ltx2_image_to_video.json` requires additional custom nodes. See [LTX2 Workflow Guide](../../assets/workflows/LTX2_WORKFLOW_GUIDE.md) for details.

## Installation

### Step 1: Install Python Dependencies

```bash
# From the project root directory
pip install -r requirements.txt
```

**Required Dependencies:**
- `pytest>=8.0.0` - Testing framework
- `pytest-asyncio>=0.23.0` - Async test support
- `hypothesis>=6.100.0` - Property-based testing
- `aiohttp>=3.10.0` - Async HTTP client
- `Pillow>=10.4.0` - Image processing and validation
- `ffmpeg-python>=0.2.0` - Video processing and validation

### Step 2: Install FFmpeg (for video validation)

**Windows:**
```bash
# Download from https://ffmpeg.org/download.html
# Add to PATH environment variable
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Verify FFmpeg Installation:**
```bash
ffmpeg -version
```

### Step 3: Verify Installation

```bash
# Run a quick connection test
python run_comfyui_tests.py --test-type connection-only
```

## Quick Start

### 1. Start ComfyUI

```bash
# Navigate to ComfyUI directory
cd comfyui_portable/ComfyUI

# Start ComfyUI on port 8000
python main.py --listen 0.0.0.0 --port 8000
```

**Wait for ComfyUI to fully start** (you should see "To see the GUI go to: http://127.0.0.1:8000")

### 2. Run Basic Tests

**Test Connection Only:**
```bash
python run_comfyui_tests.py --test-type connection-only
```

**Run Image Generation Test:**
```bash
python run_comfyui_tests.py --test-type image-only
```

**Run Video Generation Test:**
```bash
python run_comfyui_tests.py --test-type video-only
```

**Run Full Pipeline Test:**
```bash
python run_comfyui_tests.py --test-type full-pipeline
```

**Run All Tests:**
```bash
python run_comfyui_tests.py
```

### 3. Check Outputs

Generated files are saved to:
```
temp_comfyui_export_test/
└── <timestamp>/
    ├── flux_turbo_<timestamp>.png
    ├── ltx2_video_<timestamp>.mp4
    └── test_report.json
```

## Command-Line Usage

### Basic Syntax

```bash
python run_comfyui_tests.py [OPTIONS]
```

### Available Options

| Option | Description | Default |
|--------|-------------|---------|
| `--comfyui-url` | ComfyUI server URL | `http://localhost:8000` |
| `--output-dir` | Output directory for test results | `temp_comfyui_export_test` |
| `--workflows-dir` | Directory containing workflow JSON files | `assets/workflows` |
| `--timeout` | Timeout for workflow execution (seconds) | `300` |
| `--test-type` | Type of test to run | `all` |
| `--prompt` | Custom text prompt for generation | (default prompts) |
| `--verbose` | Enable verbose logging | `False` |

### Test Types

- `connection-only` - Test connection to ComfyUI only
- `image-only` - Run image generation tests only
- `video-only` - Run video generation tests only
- `full-pipeline` - Run complete pipeline test
- `all` - Run all tests (default)

### Examples

**Custom ComfyUI URL:**
```bash
python run_comfyui_tests.py --comfyui-url http://192.168.1.100:8188
```

**Custom Output Directory:**
```bash
python run_comfyui_tests.py --output-dir my_test_results
```

**Custom Timeout (for slow systems):**
```bash
python run_comfyui_tests.py --timeout 600
```

**Custom Prompt:**
```bash
python run_comfyui_tests.py --test-type image-only --prompt "A beautiful sunset over mountains"
```

**Verbose Output:**
```bash
python run_comfyui_tests.py --verbose
```

**Combined Options:**
```bash
python run_comfyui_tests.py \
  --comfyui-url http://localhost:8000 \
  --output-dir test_outputs \
  --timeout 600 \
  --test-type full-pipeline \
  --verbose
```

## Configuration

### Environment Variables

You can configure the test framework using environment variables:

**Linux/macOS:**
```bash
export COMFYUI_URL="http://localhost:8000"
export COMFYUI_TIMEOUT="300"
export COMFYUI_OUTPUT_DIR="temp_comfyui_export_test"
export COMFYUI_WORKFLOWS_DIR="assets/workflows"

# Run tests
python run_comfyui_tests.py
```

**Windows (PowerShell):**
```powershell
$env:COMFYUI_URL="http://localhost:8000"
$env:COMFYUI_TIMEOUT="300"
$env:COMFYUI_OUTPUT_DIR="temp_comfyui_export_test"
$env:COMFYUI_WORKFLOWS_DIR="assets/workflows"

# Run tests
python run_comfyui_tests.py
```

**Windows (CMD):**
```cmd
set COMFYUI_URL=http://localhost:8000
set COMFYUI_TIMEOUT=300
set COMFYUI_OUTPUT_DIR=temp_comfyui_export_test
set COMFYUI_WORKFLOWS_DIR=assets/workflows

REM Run tests
python run_comfyui_tests.py
```

### Configuration Priority

Configuration is applied in the following order (highest to lowest priority):
1. Command-line arguments
2. Environment variables
3. Default values

## Troubleshooting

### Common Issues and Solutions

#### 1. ComfyUI Not Running

**Error:**
```
ConnectionError: Cannot connect to ComfyUI at http://localhost:8000
Please ensure ComfyUI is running.
```

**Solution:**
- Start ComfyUI: `python main.py --listen 0.0.0.0 --port 8000`
- Verify it's running: `curl http://localhost:8000/system_stats`
- Check firewall settings if using remote ComfyUI

#### 1.5. ManualSigmaSchedule Node Not Found

**Error:**
```
invalid_prompt: Cannot execute because node ManualSigmaSchedule does not exist.
Node ID '#92:113'
```

**Cause:** You're using the old text-to-video (t2v) workflow that requires a custom node not in standard ComfyUI.

**Solution:**
Update your code to use the **image-to-video (i2v)** workflow instead:

```python
# OLD (causes error)
workflow = executor.load_workflow("ltx2_image_to_video.json")

# NEW (works correctly)  
workflow = executor.load_workflow("ltx2_image_to_video_i2v.json")
```

The i2v workflow uses standard LTX2 custom nodes and `ManualSigmas` instead of `ManualSigmaSchedule`.

See the [LTX2 Workflow Guide](../../assets/workflows/LTX2_WORKFLOW_GUIDE.md) for detailed information about workflow differences.

#### 2. Models Missing

**Error:**
```
ModelNotFoundError: Required model not found: z_image_turbo_bf16.safetensors
Expected location: ComfyUI/models/checkpoints/z_image_turbo_bf16.safetensors
```

**Solution:**
- Download the required model (see [Prerequisites](#2-required-models))
- Place it in the correct directory
- Restart ComfyUI after adding models

#### 3. Workflow File Not Found

**Error:**
```
FileNotFoundError: Workflow file not found: assets/workflows/z_image_turbo_generation.json
```

**Solution:**
- Verify workflow files exist in `assets/workflows/`
- Use `--workflows-dir` to specify custom location
- Check file permissions

#### 4. Timeout Errors

**Error:**
```
TimeoutError: Workflow execution timed out after 300 seconds
```

**Solution:**
- Increase timeout: `--timeout 600`
- Check ComfyUI performance (GPU/CPU usage)
- Verify models are loaded correctly
- Consider using faster hardware or smaller models

#### 5. Invalid Output Format

**Error:**
```
ValidationError: Output file has invalid format. Expected: ['png', 'jpg'], Got: webp
```

**Solution:**
- Check ComfyUI workflow configuration
- Verify SaveImage nodes use correct format
- Update workflow JSON if needed

#### 6. FFmpeg Not Found

**Error:**
```
FileNotFoundError: ffmpeg not found. Please install ffmpeg for video validation.
```

**Solution:**
- Install FFmpeg (see [Installation](#step-2-install-ffmpeg-for-video-validation))
- Add FFmpeg to system PATH
- Restart terminal/command prompt

#### 7. Permission Errors

**Error:**
```
PermissionError: [Errno 13] Permission denied: 'temp_comfyui_export_test'
```

**Solution:**
- Check directory permissions
- Run with appropriate user permissions
- Use a different output directory: `--output-dir ~/my_tests`

### Debug Mode

Enable verbose logging for detailed debugging:

```bash
python run_comfyui_tests.py --verbose
```

This will show:
- Connection attempts and responses
- Workflow loading details
- Parameter injection
- Polling status updates
- Validation checks
- Error stack traces

### Getting Help

If you encounter issues not covered here:

1. Check the logs in the output directory
2. Review the test report JSON for error details
3. Verify all prerequisites are met
4. Check ComfyUI logs for backend errors
5. Consult the [Developer Documentation](DEVELOPER_DOCUMENTATION.md)

## Expected Outputs

### Successful Test Run

```
=== ComfyUI Integration Test Runner ===

Configuration:
  ComfyUI URL: http://localhost:8000
  Output Directory: temp_comfyui_export_test
  Workflows Directory: assets/workflows
  Timeout: 300 seconds

[1/3] Testing connection to ComfyUI...
✓ Connection successful
✓ Health check passed

[2/3] Running image generation test...
✓ Workflow loaded: z_image_turbo_generation.json
✓ Parameters injected
✓ Workflow submitted (prompt_id: abc123)
✓ Generation completed in 15.3 seconds
✓ Output downloaded: flux_turbo_20260128_143022.png
✓ Quality validation passed

[3/3] Running video generation test...
✓ Workflow loaded: ltx2_image_to_video.json
✓ Parameters injected
✓ Workflow submitted (prompt_id: def456)
✓ Generation completed in 45.7 seconds
✓ Output downloaded: ltx2_video_20260128_143108.mp4
✓ Quality validation passed

=== Test Summary ===
Total Tests: 3
Passed: 3
Failed: 0
Total Duration: 61.0 seconds

Outputs saved to: temp_comfyui_export_test/20260128_143022/

Exit code: 0
```

### Output Directory Structure

```
temp_comfyui_export_test/
└── 20260128_143022/              # Timestamped directory
    ├── flux_turbo_20260128_143022.png      # Generated image
    ├── ltx2_video_20260128_143108.mp4      # Generated video
    ├── test_report.json                     # Detailed test report
    └── logs/
        └── test_execution.log               # Execution logs
```

### Test Report Format

The `test_report.json` file contains detailed information:

```json
{
  "test_run_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-01-28T14:30:22Z",
  "config": {
    "comfyui_url": "http://localhost:8000",
    "timeout": 300,
    "workflows_dir": "assets/workflows"
  },
  "tests": [
    {
      "test_name": "flux_turbo_image_generation",
      "test_type": "image",
      "success": true,
      "duration": 15.3,
      "outputs": {
        "image": "temp_comfyui_export_test/20260128_143022/flux_turbo_20260128_143022.png"
      },
      "validation": {
        "format_check": true,
        "size_check": true,
        "dimensions_check": true
      },
      "metadata": {
        "prompt": "A beautiful landscape",
        "file_size": 2458624,
        "dimensions": [1024, 784]
      }
    }
  ],
  "summary": {
    "total_tests": 3,
    "passed": 3,
    "failed": 0,
    "total_duration": 61.0
  }
}
```

## Advanced Usage

### Running with pytest

The framework can also be run using pytest for more control:

**Run all integration tests:**
```bash
pytest tests/comfyui_integration/test_integration_real_comfyui.py -m integration -v
```

**Run specific test class:**
```bash
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestFluxTurboImageGeneration -v
```

**Run with custom markers:**
```bash
# Run only slow tests
pytest tests/comfyui_integration/ -m slow

# Run everything except slow tests
pytest tests/comfyui_integration/ -m "not slow"
```

### Custom Test Prompts

Create a file with custom prompts:

**prompts.txt:**
```
A futuristic city at night
A serene forest landscape
An abstract geometric pattern
```

**Run with custom prompts:**
```bash
python run_comfyui_tests.py --prompts-file prompts.txt
```

### Batch Testing

Run multiple test configurations:

**batch_test.sh:**
```bash
#!/bin/bash

# Test with different timeouts
for timeout in 300 600 900; do
  echo "Testing with timeout: $timeout"
  python run_comfyui_tests.py --timeout $timeout --output-dir "results_${timeout}"
done

# Test with different prompts
for prompt in "landscape" "portrait" "abstract"; do
  echo "Testing with prompt: $prompt"
  python run_comfyui_tests.py --prompt "$prompt" --output-dir "results_${prompt}"
done
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: ComfyUI Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Install ComfyUI
        run: |
          git clone https://github.com/comfyanonymous/ComfyUI.git
          cd ComfyUI
          pip install -r requirements.txt
      
      - name: Download models
        run: |
          # Add model download scripts
          ./scripts/download_models.sh
      
      - name: Start ComfyUI
        run: |
          cd ComfyUI
          python main.py --listen 0.0.0.0 --port 8000 &
          sleep 30  # Wait for startup
      
      - name: Run tests
        run: python run_comfyui_tests.py --verbose
      
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: temp_comfyui_export_test/
```

## Performance Expectations

### Typical Execution Times

| Test Type | GPU (RTX 3090) | GPU (RTX 4090) | CPU Only |
|-----------|----------------|----------------|----------|
| Connection Test | < 1s | < 1s | < 1s |
| Image Generation | 10-20s | 5-10s | 120-180s |
| Video Generation | 30-60s | 15-30s | 300-600s |
| Full Pipeline | 40-80s | 20-40s | 420-780s |

### Hardware Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 16 GB
- GPU: 8 GB VRAM (or CPU mode)
- Storage: 50 GB free space

**Recommended:**
- CPU: 8+ cores
- RAM: 32 GB
- GPU: 16+ GB VRAM (RTX 3090 or better)
- Storage: 100 GB free space (SSD)

## Next Steps

1. **Run the Quick Start tests** to verify your setup
2. **Review the test outputs** in the output directory
3. **Explore the Developer Documentation** for extending the framework
4. **Integrate into your CI/CD pipeline** for automated testing
5. **Customize workflows** for your specific use cases

## Additional Resources

- [Developer Documentation](DEVELOPER_DOCUMENTATION.md) - Architecture and extension guide
- [Integration Tests README](INTEGRATION_TESTS_README.md) - Detailed test documentation
- [CLI README](CLI_README.md) - Command-line interface details
- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI) - ComfyUI official docs

---

**Version:** 1.0.0  
**Last Updated:** January 28, 2026  
**Maintained by:** StoryCore-Engine Team
