# ComfyUI Integration Test Suite

This directory contains comprehensive integration tests for the ComfyUI Desktop integration with StoryCore-Engine. These tests validate the complete end-to-end workflows with real ComfyUI backend.

## Test Files

### 1. `test_comfyui_master_coherence_sheet.py`
Tests Master Coherence Sheet (3x3 grid) generation with real ComfyUI backend.

**Coverage:**
- Complete 3x3 grid generation
- Panel dimension validation
- Quality threshold verification
- Fallback mode behavior
- Progress tracking

**Requirements Tested:** 5.3

**Key Tests:**
- `test_master_coherence_sheet_generation_real_backend` - Validates all 9 panels are generated correctly
- `test_master_coherence_sheet_quality_thresholds` - Ensures panels meet minimum quality standards
- `test_master_coherence_sheet_fallback_mode` - Tests graceful fallback to mock mode
- `test_master_coherence_sheet_progress_tracking` - Validates progress callbacks

### 2. `test_comfyui_shot_generation.py`
Tests individual shot generation with various resolutions and style references.

**Coverage:**
- Shot generation with Master Coherence Sheet reference
- Multiple resolution support (HD, Full HD, 4K, etc.)
- Output format validation
- Progress tracking
- Batch generation

**Requirements Tested:** 5.4

**Key Tests:**
- `test_shot_generation_with_style_reference` - Validates style reference application
- `test_shot_generation_various_resolutions` - Tests 7 different resolutions
- `test_shot_generation_output_format_validation` - Ensures correct file formats
- `test_multiple_shots_generation` - Tests sequential shot generation

### 3. `test_comfyui_backend_unavailability.py`
Tests graceful handling of backend unavailability and recovery mechanisms.

**Coverage:**
- Fallback to mock mode on connection failure
- Automatic reconnection attempts
- Error message handling
- Timeout handling
- Partial generation recovery
- Status transitions

**Requirements Tested:** 5.5

**Key Tests:**
- `test_fallback_to_mock_mode_on_connection_failure` - Validates automatic fallback
- `test_automatic_reconnection_attempts` - Tests periodic reconnection
- `test_timeout_handling` - Ensures timeouts are respected
- `test_partial_generation_recovery` - Tests recovery from partial failures

### 4. `test_comfyui_performance_benchmarks.py`
Performance benchmark tests measuring generation times and resource usage.

**Coverage:**
- Single image generation time
- Master Coherence Sheet generation time
- Queue depth tracking
- Batch generation performance
- Resolution impact on performance
- Comprehensive metrics collection

**Requirements Tested:** 5.6

**Key Tests:**
- `test_single_image_generation_time` - Measures individual shot generation
- `test_master_coherence_sheet_generation_time` - Measures 9-panel generation
- `test_queue_depth_tracking` - Monitors ComfyUI queue
- `test_batch_generation_performance` - Tests multiple shot generation
- `test_resolution_impact_on_performance` - Compares HD, Full HD, 2K performance

## Running the Tests

### Prerequisites

1. **ComfyUI Desktop** must be running on `localhost:8000` (or set `COMFYUI_URL` environment variable)
2. **Required models** must be downloaded and available
3. **CORS** must be enabled in ComfyUI Desktop (`--enable-cors-header` flag)
4. **Python dependencies** must be installed:
   ```bash
   pip install pytest pytest-asyncio pillow aiohttp
   ```

### Running All Integration Tests

```bash
# Run all integration tests
pytest tests/integration/test_comfyui_*.py -v

# Run with detailed output
pytest tests/integration/test_comfyui_*.py -v -s

# Run only integration tests (skip unit tests)
pytest tests/integration/ -m integration -v
```

### Running Specific Test Files

```bash
# Master Coherence Sheet tests
pytest tests/integration/test_comfyui_master_coherence_sheet.py -v

# Shot generation tests
pytest tests/integration/test_comfyui_shot_generation.py -v

# Backend unavailability tests
pytest tests/integration/test_comfyui_backend_unavailability.py -v

# Performance benchmarks
pytest tests/integration/test_comfyui_performance_benchmarks.py -v -m benchmark
```

### Running Specific Tests

```bash
# Run a specific test
pytest tests/integration/test_comfyui_shot_generation.py::TestShotGeneration::test_shot_generation_with_style_reference -v

# Run tests matching a pattern
pytest tests/integration/ -k "fallback" -v

# Run only benchmark tests
pytest tests/integration/ -m benchmark -v
```

### Environment Configuration

Set environment variables to customize test behavior:

```bash
# Custom ComfyUI URL
export COMFYUI_URL="http://localhost:8188"

# Run tests
pytest tests/integration/test_comfyui_*.py -v
```

## Test Markers

Tests are marked with pytest markers for selective execution:

- `@pytest.mark.integration` - Integration tests requiring real backend
- `@pytest.mark.asyncio` - Async tests using asyncio
- `@pytest.mark.benchmark` - Performance benchmark tests
- `@pytest.mark.parametrize` - Parameterized tests with multiple inputs

### Running Tests by Marker

```bash
# Run only integration tests
pytest tests/integration/ -m integration -v

# Run only benchmark tests
pytest tests/integration/ -m benchmark -v

# Run integration tests but skip benchmarks
pytest tests/integration/ -m "integration and not benchmark" -v
```

## Test Output

### Success Output
```
tests/integration/test_comfyui_master_coherence_sheet.py::TestMasterCoherenceSheetGeneration::test_master_coherence_sheet_generation_real_backend PASSED
tests/integration/test_comfyui_shot_generation.py::TestShotGeneration::test_shot_generation_with_style_reference PASSED
```

### Performance Benchmark Output
```
============================================================
Master Coherence Sheet Generation Performance
============================================================
Total Time: 245.32 seconds
Average Time per Panel: 27.26 seconds
Panels Generated: 9
============================================================
```

### Skip Output (Backend Unavailable)
```
tests/integration/test_comfyui_master_coherence_sheet.py::TestMasterCoherenceSheetGeneration::test_master_coherence_sheet_generation_real_backend SKIPPED (ComfyUI backend not available at http://localhost:8000)
```

## Troubleshooting

### Backend Not Available

**Symptom:** Tests are skipped with "ComfyUI backend not available"

**Solutions:**
1. Ensure ComfyUI Desktop is running: `http://localhost:8000`
2. Check ComfyUI is accessible: `curl http://localhost:8000/system_stats`
3. Verify CORS is enabled: Start ComfyUI with `--enable-cors-header` flag
4. Check firewall settings allow localhost connections

### Tests Timeout

**Symptom:** Tests hang or timeout

**Solutions:**
1. Increase timeout in test fixtures (default: 60-120 seconds)
2. Check ComfyUI queue is not blocked
3. Verify models are loaded correctly
4. Check system resources (GPU memory, disk space)

### Import Errors

**Symptom:** `ModuleNotFoundError` or import failures

**Solutions:**
1. Install required dependencies: `pip install -r requirements.txt`
2. Ensure `src/` directory is in Python path
3. Check all required modules exist in `src/end_to_end/`

### Quality Validation Failures

**Symptom:** Tests fail on quality checks (color distribution, sharpness)

**Solutions:**
1. Verify models are correctly downloaded
2. Check ComfyUI workflows are properly configured
3. Review generated images manually to confirm quality
4. Adjust quality thresholds if needed (in test code)

## Test Data

Tests use temporary directories for output:
- Created with `tempfile.mkdtemp()`
- Automatically cleaned up after tests
- Prefix: `test_coherence_sheet_`, `test_shot_gen_`, `test_perf_`, etc.

To preserve test outputs for inspection:
```python
# Comment out cleanup in fixture
# shutil.rmtree(temp_dir, ignore_errors=True)
```

## Performance Expectations

Based on typical hardware (NVIDIA RTX 3080, 32GB RAM):

| Operation | Expected Time | Max Time |
|-----------|--------------|----------|
| Single Shot (1920x1080) | 20-60s | 300s |
| Master Coherence Sheet (9 panels) | 180-540s | 3000s |
| Batch (5 shots) | 100-300s | 1500s |
| 4K Shot (3840x2160) | 60-180s | 600s |

Actual times vary based on:
- GPU model and memory
- Model complexity (FLUX vs SDXL)
- Queue depth
- System load

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  env:
    COMFYUI_URL: http://localhost:8000
  run: |
    # Start ComfyUI in background
    ./start_comfyui.sh &
    
    # Wait for ComfyUI to be ready
    sleep 30
    
    # Run tests
    pytest tests/integration/test_comfyui_*.py -v -m "integration and not benchmark"
```

**Note:** Performance benchmarks are typically excluded from CI due to time constraints.

## Contributing

When adding new integration tests:

1. Follow existing test structure and naming conventions
2. Use appropriate pytest markers (`@pytest.mark.integration`, etc.)
3. Include docstrings explaining what is tested
4. Add cleanup code for temporary files
5. Handle backend unavailability gracefully (skip tests)
6. Update this README with new test descriptions

## Related Documentation

- [ComfyUI Desktop Integration Design](../../.kiro/specs/comfyui-desktop-default-integration/design.md)
- [Requirements Document](../../.kiro/specs/comfyui-desktop-default-integration/requirements.md)
- [Quick Start Guide](../../.kiro/specs/comfyui-desktop-default-integration/QUICK_START_GUIDE.md)
- [Troubleshooting Guide](../../.kiro/specs/comfyui-desktop-default-integration/TROUBLESHOOTING_GUIDE.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review ComfyUI Desktop logs
3. Verify system requirements are met
4. Consult the main project documentation
