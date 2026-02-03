# StoryCore LLM Memory System - Testing Guide

## Overview

This guide describes the testing strategy, test organization, and best practices for the StoryCore LLM Memory System.

## Testing Philosophy

The system uses a dual testing approach:

1. **Unit Tests**: Validate specific behaviors and edge cases
2. **Property-Based Tests**: Verify universal correctness properties

This combination ensures both specific functionality and general correctness across all input spaces.

## Test Organization

```
tests/
├── unit/                    # Unit tests for specific behaviors
│   ├── test_directory_manager.py
│   ├── test_discussion_manager.py
│   ├── test_memory_manager.py
│   ├── test_asset_manager.py
│   ├── test_build_logger.py
│   ├── test_error_detector.py
│   ├── test_recovery_engine.py
│   └── test_memory_system_core.py
├── property/                # Property-based tests
│   ├── test_directory_properties.py
│   ├── test_discussion_properties.py
│   ├── test_memory_properties.py
│   ├── test_asset_properties.py
│   ├── test_logging_properties.py
│   ├── test_error_properties.py
│   └── test_qa_properties.py
└── integration/             # Integration tests
    ├── test_end_to_end.py
    ├── test_storycore_integration.py
    └── test_recovery_workflows.py
```

## Property-Based Testing

### Configuration

- **Framework**: Hypothesis
- **Minimum Iterations**: 100 per property test
- **Tag Format**: `# Feature: storycore-llm-memory-system, Property {number}: {property_text}`

### Example Property Test

```python
from hypothesis import given, strategies as st
import pytest

# Feature: storycore-llm-memory-system, Property 1: Complete Directory Structure Creation
@given(project_name=st.text(min_size=1, max_size=50, alphabet=st.characters(blacklist_characters='/')))
def test_complete_directory_creation(project_name, tmp_path):
    """For any valid project name, all required directories and files shall be created."""
    memory_system = MemorySystemCore(tmp_path, default_config)
    
    result = memory_system.initialize_project(project_name, "video", ["test objective"])
    
    assert result == True
    assert all_required_directories_exist(tmp_path / project_name)
    assert all_required_files_exist(tmp_path / project_name)
    assert all_json_files_valid(tmp_path / project_name)
```

## Running Tests

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest --cov=src/memory_system --cov-report=html tests/

# Run specific test category
pytest tests/unit/
pytest tests/property/
pytest tests/integration/

# Run with verbose output
pytest -v tests/

# Run property tests with more iterations
pytest tests/property/ --hypothesis-iterations=1000
```

## Coverage Requirements

- **Minimum Overall Coverage**: 85%
- **Critical Paths**: 100% (initialization, error detection, recovery)
- **Utility Functions**: 80%
- **UI/Formatting**: 70%

## Test Data Management

### Fixtures

Located in `tests/conftest.py`:
- `tmp_project_path`: Temporary project directory
- `sample_conversation`: Sample conversation data
- `sample_assets`: Sample asset files
- `default_config`: Default project configuration

### Cleanup

All tests use temporary directories that are automatically cleaned up after test execution.

