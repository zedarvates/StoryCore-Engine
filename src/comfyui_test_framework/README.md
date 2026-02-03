# ComfyUI Test Framework

A comprehensive testing framework for ComfyUI integration testing in StoryCore-Engine.

## Overview

This framework provides:
- **Connection Management**: Handles ComfyUI server connectivity, health checks, and authentication
- **Workflow Execution**: Loads workflow JSON files, injects parameters, and manages job execution
- **Quality Validation**: Verifies output files meet expected quality criteria
- **Test Orchestration**: Coordinates test execution and generates reports

## Components

### Core Modules (to be implemented)

- `connection_manager.py` - ComfyUI server connection and health checks
- `workflow_executor.py` - Workflow loading, parameter injection, and execution
- `quality_validator.py` - Output validation and quality checks
- `output_manager.py` - Output file organization and report generation
- `test_runner.py` - Test orchestration and execution
- `cli.py` - Command-line interface for running tests

## Installation

The framework is installed as part of the StoryCore-Engine package:

```bash
pip install -e .
```

## Dependencies

- `pytest>=8.0.0` - Testing framework
- `pytest-asyncio>=0.23.0` - Async test support
- `hypothesis>=6.100.0` - Property-based testing
- `aiohttp>=3.10.0` - Async HTTP client
- `Pillow>=10.4.0` - Image processing
- `ffmpeg-python>=0.2.0` - Video processing

## Usage

```python
from comfyui_test_framework import ComfyUITestRunner, TestConfig

# Configure test runner
config = TestConfig(
    comfyui_url="http://localhost:8188",
    workflows_dir="assets/workflows",
    output_dir="temp_comfyui_export_test"
)

# Run tests
runner = ComfyUITestRunner(config)
results = await runner.run_all_tests()
```

## Development

This framework follows the StoryCore-Engine architecture and coding standards:
- Python 3.9+ with type hints
- Async/await for I/O operations
- Comprehensive error handling
- Detailed logging
- Property-based testing for correctness validation
