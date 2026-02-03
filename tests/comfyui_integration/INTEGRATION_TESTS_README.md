# ComfyUI Integration Tests

This directory contains integration tests that validate the ComfyUI test framework against a real ComfyUI backend.

## Prerequisites

### 1. ComfyUI Installation

You need a running ComfyUI instance with the required models installed.

**Required Models:**
- `z_image_turbo_bf16.safetensors` - Flux Turbo model for image generation
- LTX2 models - For image-to-video conversion

**Model Installation:**
1. Download models from their respective sources
2. Place them in ComfyUI's `models/checkpoints/` directory
3. Restart ComfyUI to load the models

### 2. ComfyUI Server

Start ComfyUI on the default port (8000) or configure a custom URL:

```bash
# Default: http://localhost:8000
python main.py --listen 0.0.0.0 --port 8000

# Or use the provided startup script
cd comfyui_portable/ComfyUI
python main.py
```

### 3. Python Dependencies

Install the test framework dependencies:

```bash
pip install -r requirements.txt
```

Required packages:
- pytest
- pytest-asyncio
- aiohttp
- Pillow
- ffmpeg-python

## Running the Tests

### Run All Integration Tests

```bash
# Run all integration tests
pytest tests/comfyui_integration/test_integration_real_comfyui.py -m integration -v

# Run with detailed output
pytest tests/comfyui_integration/test_integration_real_comfyui.py -m integration -v -s
```

### Run Specific Test Classes

```bash
# Test Flux Turbo image generation only
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestFluxTurboImageGeneration -m integration -v

# Test LTX2 video generation only
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestLTX2VideoGeneration -m integration -v

# Test full pipeline only
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestFullPipeline -m integration -v

# Test error scenarios only
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestErrorScenarios -m integration -v
```

### Run Specific Tests

```bash
# Test basic image generation
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestFluxTurboImageGeneration::test_flux_turbo_image_generation_basic -m integration -v

# Test full pipeline
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestFullPipeline::test_full_pipeline_text_to_video -m integration -v
```

## Configuration

### Environment Variables

Configure the tests using environment variables:

```bash
# ComfyUI server URL (default: http://localhost:8000)
export COMFYUI_URL=http://localhost:8000

# Test timeout in seconds (default: 300)
export TEST_TIMEOUT=300

# Run tests
pytest tests/comfyui_integration/test_integration_real_comfyui.py -m integration
```

### Custom Configuration

You can also configure via pytest command line:

```bash
pytest tests/comfyui_integration/test_integration_real_comfyui.py \
  -m integration \
  --comfyui-url=http://localhost:8000 \
  --timeout=300
```

## Test Structure

### TestFluxTurboImageGeneration

Tests image generation using Flux Turbo model.

**Tests:**
- `test_flux_turbo_image_generation_basic` - Basic image generation workflow
- `test_flux_turbo_multiple_prompts` - Multiple prompts with different seeds
- `test_flux_turbo_with_test_runner` - High-level test runner interface

**Requirements Validated:** 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7

### TestLTX2VideoGeneration

Tests video generation using LTX2 model.

**Tests:**
- `test_ltx2_video_generation_basic` - Basic video generation from image
- `test_ltx2_with_different_prompts` - Different camera movement prompts
- `test_ltx2_with_test_runner` - High-level test runner interface
- `test_ltx2_video_format_validation` - Output format validation

**Requirements Validated:** 3.1, 3.2, 3.3, 3.6, 3.7, 3.8

### TestFullPipeline

Tests complete pipeline from text to video.

**Tests:**
- `test_full_pipeline_text_to_video` - Complete text → image → video pipeline
- `test_full_pipeline_with_test_runner` - High-level pipeline test
- `test_pipeline_execution_order` - Verify correct execution order
- `test_pipeline_output_chaining` - Verify image is used as video input
- `test_pipeline_all_outputs_saved` - Verify all outputs are saved

**Requirements Validated:** 4.1, 4.2, 4.3, 4.4, 4.5

### TestErrorScenarios

Tests error handling and recovery.

**Tests:**
- `test_comfyui_not_running` - Behavior when server is unreachable
- `test_workflow_file_not_found` - Missing workflow file handling
- `test_invalid_workflow_json` - Invalid JSON handling
- `test_workflow_execution_timeout` - Timeout handling
- `test_missing_model_error_message` - Missing model error reporting
- `test_error_logging_completeness` - Error logging verification
- `test_connection_error_recovery` - Connection error recovery
- `test_validation_error_messages` - Validation error clarity
- `test_workflow_submission_error_handling` - Submission error handling
- `test_output_download_error_handling` - Download error handling

**Requirements Validated:** 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

## Output Files

Test outputs are saved to:
```
temp_comfyui_export_test/integration_tests/
├── <timestamp>/
│   ├── flux_turbo_test.png
│   ├── ltx2_test.mp4
│   ├── pipeline_image.png
│   ├── pipeline_video.mp4
│   └── ...
```

Each test run creates a timestamped subdirectory to organize outputs.

## Troubleshooting

### ComfyUI Connection Failed

**Error:** `Cannot connect to ComfyUI at http://localhost:8000`

**Solutions:**
1. Verify ComfyUI is running: `curl http://localhost:8000/system_stats`
2. Check the port number matches your ComfyUI configuration
3. Ensure no firewall is blocking the connection
4. Try using `127.0.0.1` instead of `localhost`

### Model Not Found

**Error:** `Required model not found: z_image_turbo_bf16.safetensors`

**Solutions:**
1. Download the required model
2. Place it in `ComfyUI/models/checkpoints/`
3. Restart ComfyUI
4. Verify model appears in ComfyUI's model list

### Workflow File Not Found

**Error:** `Workflow file not found: assets/workflows/z_image_turbo_generation.json`

**Solutions:**
1. Verify you're running tests from the project root directory
2. Check that workflow files exist in `assets/workflows/`
3. Ensure workflow filenames match exactly (case-sensitive)

### Test Timeout

**Error:** `TimeoutError: Workflow execution timed out after 300 seconds`

**Solutions:**
1. Increase timeout: `export TEST_TIMEOUT=600`
2. Check ComfyUI is not overloaded
3. Verify GPU is available and working
4. Check ComfyUI logs for errors

### Import Errors

**Error:** `ModuleNotFoundError: No module named 'src.comfyui_test_framework'`

**Solutions:**
1. Ensure you're in the project root directory
2. Install dependencies: `pip install -r requirements.txt`
3. Verify Python path includes the project root

## Performance Expectations

**Typical execution times:**
- Image generation (Flux Turbo): 10-30 seconds
- Video generation (LTX2): 60-120 seconds
- Full pipeline: 70-150 seconds
- Error scenario tests: < 10 seconds each

**Note:** Times vary based on:
- GPU performance
- Image/video resolution
- ComfyUI server load
- Network latency (if remote)

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
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
      
      - name: Start ComfyUI
        run: |
          # Install and start ComfyUI
          ./scripts/install_comfyui.sh
          ./scripts/start_comfyui.sh &
          ./scripts/wait_for_comfyui.sh
      
      - name: Run integration tests
        run: |
          pytest tests/comfyui_integration/test_integration_real_comfyui.py \
            -m integration \
            -v \
            --junitxml=test-results.xml
      
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results.xml
```

## Best Practices

1. **Run tests sequentially** - Integration tests can be resource-intensive
2. **Clean output directory** - Remove old test outputs periodically
3. **Monitor ComfyUI logs** - Check for errors during test execution
4. **Use consistent seeds** - For reproducible results
5. **Verify models first** - Ensure all required models are installed
6. **Check disk space** - Tests generate large image/video files

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review ComfyUI logs for backend errors
3. Verify all prerequisites are met
4. Check the main README for framework documentation
