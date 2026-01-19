# Error Handling API Reference

This document provides comprehensive API reference for StoryCore's error handling and resilience systems.

## Table of Contents

- [Overview](#overview)
- [Advanced Error Handling System](#advanced-error-handling-system)
  - [ErrorAnalyzer](#erroranalyzer)
  - [RetryManager](#retrymanager)
  - [CircuitBreaker](#circuitbreaker)
  - [FallbackManager](#fallbackmanager)
  - [ErrorRecoveryManager](#errorrecoverymanager)
  - [ErrorReporter](#errorreporter)
  - [ResilienceManager](#resiliencemanager)
  - [Decorators](#decorators)
- [AI Error Handler](#ai-error-handler)
  - [AIError Classes](#aierror-classes)
  - [ErrorRecoveryResult](#errorrecoveryresult)
  - [ErrorHandlerConfig](#errorhandlerconfig)
  - [AIErrorHandler](#aierrorhandler)
- [AI User Error Handler](#ai-user-error-handler)
  - [UserErrorType](#usererrortype)
  - [UserFriendlyError](#userfriendlyerror)
  - [ParameterValidationResult](#parametervalidationresult)
  - [AIUserErrorHandler](#aiusererrorhandler)
- [Wizard Error Handler](#wizard-error-handler)
  - [Error Classes](#error-classes)
  - [ErrorHandler](#errorhandler)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

## Overview

StoryCore provides multiple layers of error handling to ensure robust operation across different subsystems:

1. **Advanced Error Handling System** (`src/advanced_error_handling.py`) - Core resilience mechanisms
2. **AI Error Handler** (`src/ai_error_handler.py`) - AI-specific error handling with fallback strategies
3. **AI User Error Handler** (`src/ai_user_error_handler.py`) - User-friendly error messages and validation
4. **Wizard Error Handler** (`src/wizard/error_handler.py`) - Interactive setup error handling

## Advanced Error Handling System

### ErrorAnalyzer

Analyzes errors and categorizes them for appropriate handling.

```python
from src.advanced_error_handling import ErrorAnalyzer, ErrorCategory, ErrorSeverity

analyzer = ErrorAnalyzer()
error_info = analyzer.analyze_error(exception, context={"component": "VideoEngine"})
```

**Methods:**

- `analyze_error(error: Exception, context: Dict[str, Any] = None) -> ErrorInfo` - Analyze and categorize an error

**Attributes:**

- `error_patterns` - Dictionary mapping ErrorCategory to pattern lists
- `severity_indicators` - Dictionary mapping ErrorSeverity to pattern lists

### RetryManager

Manages retry logic with different strategies.

```python
from src.advanced_error_handling import RetryManager, RetryConfig, RetryStrategy

manager = RetryManager()
config = RetryConfig(
    max_attempts=3,
    strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
    base_delay=1.0
)

result = await manager.retry_async(operation, config)
```

**Methods:**

- `retry_async(func: Callable, config: RetryConfig, *args, **kwargs) -> Any` - Retry async function
- `retry_sync(func: Callable, config: RetryConfig, *args, **kwargs) -> Any` - Retry sync function
- `get_retry_stats() -> Dict[str, Dict[str, int]]` - Get retry statistics

### CircuitBreaker

Implements circuit breaker pattern to prevent cascading failures.

```python
from src.advanced_error_handling import CircuitBreaker, CircuitBreakerConfig

config = CircuitBreakerConfig(
    failure_threshold=5,
    recovery_timeout=60,
    name="api_breaker"
)
breaker = CircuitBreaker(config)

@breaker
async def api_call():
    # Your API call here
    pass
```

**Methods:**

- `get_state() -> Dict[str, Any]` - Get circuit breaker state

### FallbackManager

Manages fallback chains for graceful degradation.

```python
from src.advanced_error_handling import FallbackManager, FallbackChain

manager = FallbackManager()
chain = FallbackChain(
    primary_function=primary_func,
    fallback_functions=[fallback1, fallback2],
    max_fallback_attempts=3
)

result = await manager.execute_with_fallback(chain)
```

**Methods:**

- `execute_with_fallback(chain: FallbackChain, *args, **kwargs) -> Any` - Execute with fallback chain
- `get_fallback_stats() -> Dict[str, Dict[str, int]]` - Get fallback statistics

### ErrorRecoveryManager

Manages error recovery procedures.

```python
from src.advanced_error_handling import ErrorRecoveryManager, ErrorCategory

manager = ErrorRecoveryManager()

async def gpu_recovery(error_info):
    # Clear GPU cache
    return True

manager.register_recovery_procedure(ErrorCategory.GPU, gpu_recovery)
success = await manager.attempt_recovery(error_info)
```

**Methods:**

- `register_recovery_procedure(category: ErrorCategory, func: Callable, conditions: List[Callable] = None)` - Register recovery procedure
- `attempt_recovery(error_info: ErrorInfo) -> bool` - Attempt recovery
- `get_recovery_stats() -> Dict[str, Dict[str, int]]` - Get recovery statistics

### ErrorReporter

Reports and analyzes error patterns.

```python
from src.advanced_error_handling import ErrorReporter

reporter = ErrorReporter()
reporter.report_error(error_info)
summary = reporter.get_error_summary(hours=24)
```

**Methods:**

- `report_error(error_info: ErrorInfo)` - Report error for analysis
- `get_error_summary(hours: int = 24) -> Dict[str, Any]` - Get error summary
- `detect_error_patterns() -> List[Dict[str, Any]]` - Detect error patterns

### ResilienceManager

Main resilience management system combining all components.

```python
from src.advanced_error_handling import ResilienceManager

manager = ResilienceManager()
error_info = await manager.handle_error(exception, context)
status = manager.get_resilience_status()
```

**Methods:**

- `create_circuit_breaker(name: str, config: CircuitBreakerConfig = None) -> CircuitBreaker` - Create circuit breaker
- `handle_error(error: Exception, context: Dict[str, Any] = None) -> ErrorInfo` - Handle error comprehensively
- `get_resilience_status() -> Dict[str, Any]` - Get comprehensive status
- `perform_chaos_test(component: str, error_type: str = "random") -> Dict[str, Any]` - Perform chaos test

### Decorators

```python
from src.advanced_error_handling import with_retry, with_circuit_breaker, with_fallback

@with_retry(RetryConfig(max_attempts=3))
async def operation():
    pass

@with_circuit_breaker(CircuitBreakerConfig(name="my_breaker"))
async def protected_operation():
    pass

@with_fallback(fallback_func1, fallback_func2)
async def resilient_operation():
    pass
```

## AI Error Handler

### AIError Classes

Base class and specialized error types for AI operations.

```python
from src.ai_error_handler import AIError, ModelLoadingError, InferenceError

# Base AI error
error = AIError(
    message="Model failed to load",
    category=AIErrorCategory.MODEL_LOADING,
    severity=ErrorSeverity.HIGH,
    component="ModelManager",
    operation="load_model"
)

# Specialized errors
model_error = ModelLoadingError("Model file corrupted", model_id="sdxl-1.0")
inference_error = InferenceError("GPU out of memory", model_id="sdxl-1.0")
```

**Classes:**

- `AIError` - Base AI error class
- `ModelLoadingError` - Model loading specific error
- `InferenceError` - Model inference specific error
- `ResourceExhaustionError` - Resource exhaustion error
- `TimeoutError` - Operation timeout error
- `ValidationError` - Input/output validation error

### ErrorRecoveryResult

Result of error recovery attempts.

```python
@dataclass
class ErrorRecoveryResult:
    success: bool
    strategy_used: FallbackStrategy
    result: Optional[Any] = None
    error: Optional[AIError] = None
    recovery_time_ms: float = 0.0
    attempts: int = 1
```

### ErrorHandlerConfig

Configuration for AI error handler.

```python
@dataclass
class ErrorHandlerConfig:
    # Retry settings
    max_retries: int = 3
    retry_delay_seconds: float = 1.0
    exponential_backoff: bool = True

    # Fallback settings
    enable_cpu_fallback: bool = True
    enable_quality_degradation: bool = True
    enable_cached_fallback: bool = True

    # Timeout settings
    default_timeout_seconds: float = 30.0
    enable_timeout_extension: bool = True
    max_timeout_extensions: int = 2

    # Logging settings
    log_all_errors: bool = True
    log_recoveries: bool = True
    detailed_logging: bool = False

    # Analytics settings
    track_error_patterns: bool = True
    error_history_size: int = 1000
```

### AIErrorHandler

Comprehensive AI error handler.

```python
from src.ai_error_handler import AIErrorHandler, ErrorHandlerConfig

config = ErrorHandlerConfig(max_retries=5, enable_cpu_fallback=True)
handler = AIErrorHandler(config)

# Handle error with automatic fallback
result = await handler.handle_error(ai_error, fallback_context)

# Retry with timeout
result = await handler.handle_with_retry(operation, max_retries=3)

# Execute with timeout
result = await handler.handle_with_timeout(operation, timeout_seconds=60)
```

**Methods:**

- `register_fallback_handler(strategy: FallbackStrategy, handler: Callable)` - Register fallback handler
- `handle_error(error: AIError, fallback_context: Optional[Dict[str, Any]] = None) -> ErrorRecoveryResult` - Handle AI error
- `handle_with_retry(operation: Callable, max_retries: Optional[int] = None, error_types: Optional[List[Type[Exception]]] = None) -> Any` - Execute with retry
- `handle_with_timeout(operation: Callable, timeout_seconds: Optional[float] = None, allow_extension: bool = True) -> Any` - Execute with timeout

## AI User Error Handler

### UserErrorType

Enumeration of user-facing error types.

```python
class UserErrorType(Enum):
    INVALID_PARAMETER = "invalid_parameter"
    UNSUPPORTED_CONTENT = "unsupported_content"
    MISSING_REQUIREMENT = "missing_requirement"
    OFFLINE_MODE = "offline_mode"
    QUOTA_EXCEEDED = "quota_exceeded"
    PERMISSION_DENIED = "permission_denied"
```

### UserFriendlyError

User-friendly error representation.

```python
@dataclass
class UserFriendlyError:
    title: str
    message: str
    error_type: UserErrorType
    suggestions: List[str] = field(default_factory=list)
    details: Optional[str] = None
    recovery_actions: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
```

### ParameterValidationResult

Result of parameter validation.

```python
@dataclass
class ParameterValidationResult:
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    corrected_parameters: Optional[Dict[str, Any]] = None
```

### AIUserErrorHandler

User-friendly AI error handler.

```python
from src.ai_user_error_handler import AIUserErrorHandler

handler = AIUserErrorHandler()

# Validate parameters
schema = {
    'strength': {'type': 'float', 'min': 0.0, 'max': 1.0, 'required': True},
    'steps': {'type': 'int', 'min': 1, 'max': 100, 'required': True}
}
result = handler.validate_parameters(parameters, schema)

# Create user-friendly errors
error = handler.create_invalid_parameter_error('strength', 1.5, 'float', (0.0, 1.0))
content_error = handler.create_unsupported_content_error('mp3', ['wav', 'flac'])
```

**Methods:**

- `validate_parameters(parameters: Dict[str, Any], schema: Dict[str, Dict[str, Any]]) -> ParameterValidationResult` - Validate parameters
- `create_invalid_parameter_error(parameter_name: str, provided_value: Any, expected_type: str, valid_range: Optional[Tuple[Any, Any]] = None) -> UserFriendlyError` - Create parameter error
- `create_unsupported_content_error(content_type: str, supported_types: List[str]) -> UserFriendlyError` - Create content error
- `create_missing_requirement_error(requirement_name: str, requirement_type: str) -> UserFriendlyError` - Create requirement error
- `create_offline_mode_error(operation_name: str, cached_available: bool = False) -> UserFriendlyError` - Create offline error
- `enable_offline_mode(cached_models: List[str])` - Enable offline mode
- `disable_offline_mode()` - Disable offline mode
- `is_offline_mode() -> bool` - Check offline mode status
- `format_error_for_display(error: UserFriendlyError) -> str` - Format error for display

## Wizard Error Handler

### Error Classes

Wizard-specific error classes.

```python
from src.wizard.error_handler import WizardError, ValidationError, FileSystemError

# Base wizard error
raise WizardError("Wizard operation failed")

# Specific errors
raise ValidationError("Invalid project name")
raise FileSystemError("Cannot create directory")
```

### ErrorHandler

Wizard error handler with user-friendly messages.

```python
from src.wizard.error_handler import ErrorHandler

# Handle validation error
retry = ErrorHandler.handle_validation_error(error, context="project setup")

# Handle filesystem error
retry = ErrorHandler.handle_filesystem_error(error, operation="create project")

# Handle keyboard interrupt
ErrorHandler.handle_keyboard_interrupt()

# Handle unexpected error
retry = ErrorHandler.handle_unexpected_error(error, context="wizard execution")
```

**Methods:**

- `handle_validation_error(error: Exception, context: str = "") -> bool` - Handle validation error
- `handle_filesystem_error(error: Exception, operation: str = "") -> bool` - Handle filesystem error
- `handle_keyboard_interrupt()` - Handle Ctrl+C
- `handle_unexpected_error(error: Exception, context: str = "") -> bool` - Handle unexpected error
- `validate_project_directory(project_path: Path) -> tuple[bool, str]` - Validate project directory
- `safe_create_directory(dir_path: Path) -> tuple[bool, str]` - Create directory safely
- `safe_write_file(file_path: Path, content: str) -> tuple[bool, str]` - Write file safely

## Integration Examples

### Basic Error Handling

```python
from src.advanced_error_handling import ResilienceManager
from src.ai_error_handler import AIErrorHandler, ErrorHandlerConfig

# Initialize error handling systems
resilience_manager = ResilienceManager()
ai_handler = AIErrorHandler(ErrorHandlerConfig())

# Handle AI operation with comprehensive error handling
async def process_ai_request(request):
    try:
        result = await ai_handler.handle_with_retry(
            lambda: ai_model.generate(request),
            max_retries=3
        )
        return result
    except Exception as e:
        error_info = await resilience_manager.handle_error(e, {
            "component": "AIProcessor",
            "operation": "generate"
        })
        # Log and potentially recover
        return await resilience_manager.recovery_manager.attempt_recovery(error_info)
```

### Circuit Breaker Pattern

```python
from src.advanced_error_handling import CircuitBreakerConfig

# Create circuit breaker for external API calls
api_breaker = resilience_manager.create_circuit_breaker(
    "external_api",
    CircuitBreakerConfig(failure_threshold=5, recovery_timeout=60)
)

@api_breaker
async def call_external_api(data):
    response = await requests.post("https://api.example.com", json=data)
    response.raise_for_status()
    return response.json()
```

### Fallback Chains

```python
from src.advanced_error_handling import FallbackChain

async def primary_ai_generation(prompt):
    return await high_quality_model.generate(prompt)

async def fallback_cpu_generation(prompt):
    return await cpu_model.generate(prompt)

async def fallback_cached_generation(prompt):
    return await cache.get_similar_result(prompt)

chain = FallbackChain(
    primary_function=primary_ai_generation,
    fallback_functions=[fallback_cpu_generation, fallback_cached_generation],
    max_fallback_attempts=2
)

result = await resilience_manager.fallback_manager.execute_with_fallback(chain, prompt)
```

### User-Friendly Error Handling

```python
from src.ai_user_error_handler import AIUserErrorHandler

user_handler = AIUserErrorHandler()

# Validate user parameters
validation = user_handler.validate_parameters(user_input, parameter_schema)
if not validation.valid:
    error = user_handler.create_invalid_parameter_error(
        'quality', user_input.get('quality'), 'int', (1, 10)
    )
    print(user_handler.format_error_for_display(error))
    return

# Process with error recovery
try:
    result = await process_with_error_handling(user_input)
except Exception as e:
    recovery_result = await ai_handler.handle_error(e)
    if not recovery_result.success:
        user_error = user_handler.create_missing_requirement_error(
            'GPU memory', 'resource'
        )
        display_user_error(user_error)
```

## Best Practices

1. **Layered Error Handling**: Use appropriate error handler for each layer (AI, User, Wizard)

2. **Context Information**: Always provide context when handling errors for better diagnostics

3. **Graceful Degradation**: Implement fallback strategies to maintain basic functionality

4. **Circuit Breakers**: Use circuit breakers to prevent cascading failures

5. **Retry Logic**: Implement exponential backoff for transient failures

6. **User Communication**: Provide clear, actionable error messages to users

7. **Monitoring**: Track error patterns and recovery effectiveness

8. **Testing**: Regularly test error scenarios and recovery mechanisms

9. **Resource Cleanup**: Ensure proper cleanup in error scenarios

10. **Documentation**: Document expected errors and recovery behaviors