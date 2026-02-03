# ComfyUI Integration Test Runner - CLI Documentation

## Overview

The `run_comfyui_tests.py` script provides a command-line interface for running ComfyUI integration tests. It supports flexible configuration through command-line arguments and environment variables, with multiple test execution modes.

## Requirements

- Python 3.9+
- ComfyUI server running (default: http://localhost:8000)
- Required Python packages (see requirements.txt)
- Workflow JSON files in assets/workflows/

## Quick Start

### Basic Usage

```bash
# Run all tests with default settings
python run_comfyui_tests.py

# Run only image generation tests
python run_comfyui_tests.py --test-type image

# Run with custom ComfyUI URL
python run_comfyui_tests.py --url http://localhost:8188

# Run with verbose logging
python run_comfyui_tests.py --verbose
```

## Command-Line Arguments

### Connection Configuration

**`--url URL`**
- ComfyUI server URL
- Default: `http://localhost:8000`
- Environment variable: `COMFYUI_URL`
- Example: `--url http://localhost:8188`

**`--timeout SECONDS`**
- Test timeout in seconds
- Default: `300` (5 minutes)
- Environment variable: `COMFYUI_TIMEOUT`
- Example: `--timeout 600`

### Directory Configuration

**`--output-dir PATH`**
- Output directory for test results
- Default: `temp_comfyui_export_test`
- Environment variable: `COMFYUI_OUTPUT_DIR`
- Example: `--output-dir ./my_test_results`

**`--workflows-dir PATH`**
- Directory containing workflow JSON files
- Default: `assets/workflows`
- Environment variable: `COMFYUI_WORKFLOWS_DIR`
- Example: `--workflows-dir ./custom_workflows`

### Test Selection

**`--test-type {image,video,pipeline,all}`**
- Type of test to run
- Default: `all`
- Environment variable: `COMFYUI_TEST_TYPE`
- Options:
  - `image`: Image generation tests only (Flux Turbo)
  - `video`: Video generation tests only (LTX2)
  - `pipeline`: Full pipeline tests (image → video)
  - `all`: All test types
- Example: `--test-type pipeline`

### Test Parameters

**`--prompt TEXT`**
- Test prompt for generation
- Can be specified multiple times
- Default: Two built-in test prompts
- Example: `--prompt "A sunset" --prompt "A city"`

**`--poll-interval SECONDS`**
- Polling interval for checking test progress
- Default: `5` seconds
- Example: `--poll-interval 10`

### Output Control

**`--no-report`**
- Skip generating JSON test report
- Default: Report is generated
- Example: `--no-report`

**`--verbose`**
- Enable verbose logging (DEBUG level)
- Default: INFO level logging
- Example: `--verbose`

## Environment Variables

Environment variables provide an alternative way to configure the test runner. Command-line arguments take precedence over environment variables.

```bash
# Set environment variables
export COMFYUI_URL=http://localhost:8188
export COMFYUI_TIMEOUT=600
export COMFYUI_OUTPUT_DIR=./test_results
export COMFYUI_WORKFLOWS_DIR=./workflows
export COMFYUI_TEST_TYPE=pipeline

# Run tests (uses environment variables)
python run_comfyui_tests.py
```

## Configuration Priority

Configuration values are resolved in the following order (highest to lowest priority):

1. Command-line arguments
2. Environment variables
3. Default values

Example:
```bash
# Environment variable sets URL to localhost:8188
export COMFYUI_URL=http://localhost:8188

# Command-line argument overrides to localhost:8000
python run_comfyui_tests.py --url http://localhost:8000
# Result: Uses http://localhost:8000
```

## Test Types

### Image Generation Tests (`--test-type image`)

Tests image generation using Flux Turbo workflow:
- Loads `z_image_turbo_generation.json`
- Generates images from text prompts
- Validates image quality (format, size, dimensions)
- Saves outputs to organized directory

### Video Generation Tests (`--test-type video`)

Tests video generation using LTX2 workflow:
- First generates input images using Flux Turbo
- Loads `ltx2_image_to_video.json`
- Generates videos from images and prompts
- Validates video quality (format, size, duration)
- Saves outputs to organized directory

### Pipeline Tests (`--test-type pipeline`)

Tests complete pipeline from text to video:
- Generates image using Flux Turbo
- Uses generated image as input for LTX2
- Validates both intermediate and final outputs
- Verifies proper chaining of outputs
- Saves all outputs to organized directory

### All Tests (`--test-type all`)

Runs both image generation and pipeline tests for comprehensive validation.

## Exit Codes

The script returns standard exit codes:

- `0`: All tests passed successfully
- `1`: One or more tests failed, or execution error occurred
- `130`: Execution interrupted by user (Ctrl+C)

Example usage in scripts:
```bash
python run_comfyui_tests.py
if [ $? -eq 0 ]; then
    echo "All tests passed!"
else
    echo "Tests failed!"
fi
```

## Output Organization

Test outputs are organized in the output directory:

```
temp_comfyui_export_test/
├── 20260128_143022/              # Timestamped directory
│   ├── image/                    # Image outputs
│   │   └── image_test_1_*.png
│   ├── video/                    # Video outputs
│   │   └── video_test_1_*.mp4
│   └── test_report.json          # Test results report
└── comfyui_tests.log             # Execution log
```

## Test Report Format

The JSON test report contains:

```json
{
  "test_run_id": "uuid",
  "timestamp": "2026-01-28T14:30:22Z",
  "config": {
    "comfyui_url": "http://localhost:8000",
    "timeout": 300,
    "workflows_dir": "assets/workflows"
  },
  "tests": [
    {
      "test_name": "image_test_1",
      "test_type": "image",
      "success": true,
      "duration": 12.5,
      "outputs": {
        "image": "path/to/output.png"
      },
      "validation": {
        "format_check": true,
        "size_check": true,
        "dimensions_check": true
      },
      "metadata": {
        "prompt": "A beautiful landscape",
        "prompt_id": "abc123"
      }
    }
  ],
  "summary": {
    "total_tests": 3,
    "passed": 3,
    "failed": 0,
    "total_duration": 45.2
  }
}
```

## Examples

### Run Quick Image Test

```bash
python run_comfyui_tests.py \
  --test-type image \
  --prompt "A beautiful sunset" \
  --timeout 60
```

### Run Full Pipeline with Custom Settings

```bash
python run_comfyui_tests.py \
  --test-type pipeline \
  --url http://localhost:8188 \
  --output-dir ./pipeline_results \
  --timeout 600 \
  --prompt "A futuristic city" \
  --verbose
```

### Run All Tests with Environment Variables

```bash
export COMFYUI_URL=http://localhost:8188
export COMFYUI_OUTPUT_DIR=./test_results
export COMFYUI_TIMEOUT=900

python run_comfyui_tests.py --test-type all
```

### Run Tests Without Report Generation

```bash
python run_comfyui_tests.py \
  --test-type image \
  --no-report
```

### Run Multiple Prompts

```bash
python run_comfyui_tests.py \
  --prompt "A mountain landscape" \
  --prompt "A city at night" \
  --prompt "An abstract pattern" \
  --test-type pipeline
```

## Logging

The script generates two types of logs:

1. **Console Output**: Real-time progress and results
2. **Log File**: `comfyui_tests.log` with detailed execution information

Log levels:
- Default: INFO level (general progress)
- Verbose: DEBUG level (detailed debugging information)

Example log output:
```
2026-01-28 14:30:22,123 - __main__ - INFO - ComfyUI Integration Test Runner
2026-01-28 14:30:22,124 - __main__ - INFO - ComfyUI URL: http://localhost:8000
2026-01-28 14:30:22,125 - __main__ - INFO - Test type: image
2026-01-28 14:30:23,456 - comfyui_test_framework.test_runner - INFO - Starting image generation test: image_test_1
2026-01-28 14:30:35,789 - comfyui_test_framework.test_runner - INFO - Test completed in 12.33 seconds
```

## Troubleshooting

### ComfyUI Not Running

**Error**: `Cannot connect to ComfyUI at http://localhost:8000`

**Solution**: Ensure ComfyUI is running on the specified URL
```bash
# Check if ComfyUI is running
curl http://localhost:8000/system_stats

# Start ComfyUI if needed
cd /path/to/ComfyUI
python main.py --port 8000
```

### Workflow Files Not Found

**Error**: `Workflow file not found: assets/workflows/z_image_turbo_generation.json`

**Solution**: Ensure workflow files exist in the workflows directory
```bash
# Check workflows directory
ls assets/workflows/

# Use custom workflows directory
python run_comfyui_tests.py --workflows-dir /path/to/workflows
```

### Timeout Errors

**Error**: `Workflow execution timed out after 300 seconds`

**Solution**: Increase timeout for longer-running tests
```bash
python run_comfyui_tests.py --timeout 600
```

### Permission Errors

**Error**: `Permission denied: temp_comfyui_export_test`

**Solution**: Ensure write permissions for output directory
```bash
# Create directory with proper permissions
mkdir -p temp_comfyui_export_test
chmod 755 temp_comfyui_export_test

# Or use a different output directory
python run_comfyui_tests.py --output-dir ~/test_results
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: ComfyUI Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Start ComfyUI
        run: |
          # Start ComfyUI in background
          python /path/to/ComfyUI/main.py --port 8000 &
          sleep 30  # Wait for startup
      
      - name: Run tests
        run: |
          python run_comfyui_tests.py \
            --test-type all \
            --timeout 600
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: temp_comfyui_export_test/
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    
    environment {
        COMFYUI_URL = 'http://localhost:8000'
        COMFYUI_TIMEOUT = '600'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'pip install -r requirements.txt'
            }
        }
        
        stage('Test') {
            steps {
                sh 'python run_comfyui_tests.py --test-type all'
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'temp_comfyui_export_test/**/*'
            junit 'test_report.json'
        }
    }
}
```

## Best Practices

1. **Use Environment Variables for CI/CD**: Set configuration via environment variables in CI/CD pipelines
2. **Increase Timeouts for Slow Systems**: Adjust timeout based on hardware capabilities
3. **Use Specific Test Types**: Run only needed test types to save time
4. **Monitor Logs**: Check `comfyui_tests.log` for detailed debugging information
5. **Organize Outputs**: Use timestamped directories to keep test runs separate
6. **Validate Workflows**: Ensure workflow JSON files are valid before running tests

## Support

For issues or questions:
- Check the troubleshooting section above
- Review logs in `comfyui_tests.log`
- Ensure ComfyUI is running and accessible
- Verify workflow files exist and are valid JSON
