# Quick Start: Running ComfyUI Integration Tests

## Prerequisites Checklist

- [ ] ComfyUI installed and running on http://localhost:8000
- [ ] Required models installed (z_image_turbo_bf16.safetensors, LTX2)
- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] Workflow files present in `assets/workflows/`

## Quick Test Commands

### 1. Verify Setup
```bash
# Check if ComfyUI is running
curl http://localhost:8000/system_stats

# Check if tests can be discovered
pytest tests/comfyui_integration/test_integration_real_comfyui.py --collect-only
```

### 2. Run All Integration Tests
```bash
pytest tests/comfyui_integration/test_integration_real_comfyui.py -m integration -v
```

### 3. Run Specific Test Categories

**Image Generation Tests:**
```bash
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestFluxTurboImageGeneration -m integration -v
```

**Video Generation Tests:**
```bash
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestLTX2VideoGeneration -m integration -v
```

**Full Pipeline Tests:**
```bash
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestFullPipeline -m integration -v
```

**Error Handling Tests:**
```bash
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestErrorScenarios -m integration -v
```

### 4. Run Single Test
```bash
# Example: Run basic image generation test
pytest tests/comfyui_integration/test_integration_real_comfyui.py::TestFluxTurboImageGeneration::test_flux_turbo_image_generation_basic -m integration -v -s
```

## Configuration

### Environment Variables
```bash
# Set ComfyUI URL (if not default)
export COMFYUI_URL=http://localhost:8000

# Set timeout (if tests are slow)
export TEST_TIMEOUT=600

# Run tests
pytest tests/comfyui_integration/test_integration_real_comfyui.py -m integration -v
```

### Windows (PowerShell)
```powershell
$env:COMFYUI_URL="http://localhost:8000"
$env:TEST_TIMEOUT="600"
pytest tests/comfyui_integration/test_integration_real_comfyui.py -m integration -v
```

## Expected Output

### Successful Test Run
```
tests/comfyui_integration/test_integration_real_comfyui.py::TestFluxTurboImageGeneration::test_flux_turbo_image_generation_basic PASSED
tests/comfyui_integration/test_integration_real_comfyui.py::TestFluxTurboImageGeneration::test_flux_turbo_multiple_prompts PASSED
...
===================== 22 passed in 180.45s =====================
```

### Test Outputs
Generated files will be in:
```
temp_comfyui_export_test/integration_tests/<timestamp>/
```

## Troubleshooting

### ComfyUI Not Running
```
Error: Cannot connect to ComfyUI at http://localhost:8000
```
**Solution:** Start ComfyUI first:
```bash
cd comfyui_portable/ComfyUI
python main.py --listen 0.0.0.0 --port 8000
```

### Models Missing
```
Error: Required model not found
```
**Solution:** Install required models in ComfyUI's models directory

### Tests Timeout
```
Error: TimeoutError: Workflow execution timed out
```
**Solution:** Increase timeout:
```bash
export TEST_TIMEOUT=600
```

## Test Summary

- **22 integration tests** covering all requirements
- **4 test classes** for different scenarios
- **~3-5 minutes** total execution time (with GPU)
- **Validates:** Image generation, video generation, full pipeline, error handling

## Next Steps

1. Run tests to verify your ComfyUI setup
2. Check generated outputs in `temp_comfyui_export_test/`
3. Review test results for any failures
4. See `INTEGRATION_TESTS_README.md` for detailed documentation
