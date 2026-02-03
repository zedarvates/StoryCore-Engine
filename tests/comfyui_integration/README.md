# ComfyUI Integration Tests

This directory contains integration tests for validating ComfyUI workflows including:
- Flux Turbo image generation
- LTX2 image-to-video conversion
- End-to-end pipeline testing

## Directory Structure

```
tests/comfyui_integration/
├── __init__.py                 # Package initialization
└── README.md                   # This file
```

## Running Tests

### Run all ComfyUI integration tests:
```bash
pytest tests/comfyui_integration/ -m comfyui
```

### Run with verbose output:
```bash
pytest tests/comfyui_integration/ -v
```

### Run specific test types:
```bash
# Unit tests only
pytest tests/comfyui_integration/ -m unit

# Property-based tests only
pytest tests/comfyui_integration/ -m property

# Integration tests (requires running ComfyUI)
pytest tests/comfyui_integration/ -m "integration and comfyui"
```

## Prerequisites

- Python 3.9+
- Running ComfyUI instance (for integration tests)
- Required models:
  - z_image_turbo_bf16.safetensors (Flux Turbo)
  - LTX2 models

## Test Markers

- `@pytest.mark.unit` - Unit tests for individual components
- `@pytest.mark.integration` - Integration tests requiring external services
- `@pytest.mark.property` - Property-based tests using Hypothesis
- `@pytest.mark.comfyui` - Tests requiring a running ComfyUI instance
- `@pytest.mark.slow` - Tests that take significant time to run
