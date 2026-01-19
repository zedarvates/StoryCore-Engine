# StoryCore-Engine Test Suite

This directory contains the comprehensive test suite for the StoryCore-Engine technical debt remediation project.

## Directory Structure

```
tests/
├── unit/              # Unit tests for individual components
├── property/          # Property-based tests using Hypothesis
├── integration/       # Integration tests for multiple components
└── llm/              # LLM-specific tests
```

## Test Organization

### Unit Tests (`unit/`)
Unit tests focus on testing individual functions, classes, and modules in isolation. They verify:
- Specific examples and concrete cases
- Edge cases (empty inputs, boundary values, error conditions)
- Individual component behavior

### Property-Based Tests (`property/`)
Property-based tests use Hypothesis to verify universal properties across randomized inputs. They validate:
- Correctness properties that should hold for all valid inputs
- Invariants that must be maintained
- System behavior across diverse scenarios
- Each property test runs 100+ iterations (configured in pytest.ini)

### Integration Tests (`integration/`)
Integration tests verify that multiple components work together correctly. They test:
- End-to-end workflows
- Component interactions
- System-level behavior
- API contracts

## Running Tests

### Run All Tests
```bash
pytest
```

### Run Specific Test Categories
```bash
# Unit tests only
pytest tests/unit/

# Property-based tests only
pytest tests/property/

# Integration tests only
pytest tests/integration/

# Tests by marker
pytest -m unit
pytest -m property
pytest -m integration
```

### Run with Coverage
```bash
# Coverage is enabled by default in pytest.ini
pytest

# Generate HTML coverage report
pytest --cov-report=html
# Open htmlcov/index.html in browser
```

### Run Specific Tests
```bash
# Run a specific test file
pytest tests/unit/test_credential_manager.py

# Run a specific test function
pytest tests/unit/test_credential_manager.py::test_load_credentials

# Run tests matching a pattern
pytest -k "credential"
```

## Test Markers

Tests can be marked with the following markers (defined in pytest.ini):

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.property` - Property-based tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Tests that take significant time
- `@pytest.mark.security` - Security-related tests
- `@pytest.mark.async` - Asynchronous operation tests
- `@pytest.mark.credential` - Credential security tests
- `@pytest.mark.documentation` - Documentation translation tests
- `@pytest.mark.refactoring` - Module refactoring tests
- `@pytest.mark.cicd` - CI/CD pipeline tests
- `@pytest.mark.monitoring` - Monitoring and alerting tests
- `@pytest.mark.compatibility` - Backward compatibility tests
- `@pytest.mark.performance` - Performance baseline tests

### Using Markers
```python
import pytest

@pytest.mark.unit
@pytest.mark.security
def test_credential_scanner():
    """Test credential scanner detects hardcoded secrets."""
    pass
```

## Coverage Requirements

- **Minimum Coverage**: 80% (enforced by pytest.ini)
- **Coverage Reports**: Generated in multiple formats
  - Terminal output (with missing lines)
  - HTML report in `htmlcov/`
  - XML report in `coverage.xml`

## Property-Based Testing with Hypothesis

Property tests use Hypothesis to generate diverse test inputs. Configuration:
- **Max Examples**: 100 iterations per test (minimum)
- **Deadline**: 5000ms per test case
- **Verbosity**: Verbose output for failures
- **Database**: `.hypothesis/examples` for example tracking

### Example Property Test
```python
from hypothesis import given, strategies as st, settings

@settings(max_examples=100)
@given(st.text(min_size=1, max_size=1000))
@pytest.mark.property
def test_property_credential_detection(code_content: str):
    """
    Feature: technical-debt-remediation, Property 15
    For any code file, should not contain hardcoded credentials.
    """
    violations = credential_scanner.scan_content(code_content)
    assert len(violations) == 0
```

## Async Testing

Async tests are supported via pytest-asyncio. The asyncio mode is set to "auto" in pytest.ini.

```python
import pytest

@pytest.mark.async
async def test_async_operation():
    """Test asynchronous operation."""
    result = await some_async_function()
    assert result is not None
```

## Mocking

Use pytest-mock for mocking in tests:

```python
def test_with_mock(mocker):
    """Test using pytest-mock."""
    mock_function = mocker.patch('module.function')
    mock_function.return_value = 'mocked'
    
    result = call_function_that_uses_mock()
    assert result == 'mocked'
```

## Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Test Isolation**: Each test should be independent and not rely on other tests
3. **Minimal Tests**: Focus on core functionality, avoid over-testing edge cases
4. **Real Validation**: Don't use mocks to make tests pass - validate real functionality
5. **Clear Assertions**: Use clear, specific assertions with helpful error messages
6. **Documentation**: Include docstrings explaining what each test validates

## Continuous Integration

All tests run automatically in the CI/CD pipeline:
1. **Pre-commit**: Fast unit tests and linting
2. **Pull Request**: Full unit test suite + property tests
3. **Main Branch**: Complete test suite + integration tests
4. **Nightly**: Extended property tests (1000+ iterations) + performance tests

## Troubleshooting

### Tests Not Found
- Ensure test files start with `test_`
- Ensure test functions start with `test_`
- Check that `__init__.py` exists in test directories if needed

### Coverage Too Low
- Run `pytest --cov-report=html` to see which lines are missing
- Add tests for uncovered code paths
- Check that source paths are correct in pytest.ini

### Hypothesis Failures
- Review the failing example in the output
- Check if the property is correctly specified
- Adjust strategies if needed to generate valid inputs

### Async Test Issues
- Ensure `@pytest.mark.async` is used for async tests
- Check that asyncio mode is set correctly in pytest.ini
- Verify async/await syntax is correct

## Additional Resources

- [pytest documentation](https://docs.pytest.org/)
- [Hypothesis documentation](https://hypothesis.readthedocs.io/)
- [pytest-cov documentation](https://pytest-cov.readthedocs.io/)
- [pytest-asyncio documentation](https://pytest-asyncio.readthedocs.io/)
- [pytest-mock documentation](https://pytest-mock.readthedocs.io/)
