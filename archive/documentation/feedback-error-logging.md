# Feedback Error Logging System

## Overview

The Feedback Error Logging system provides comprehensive error logging for the Feedback & Diagnostics module. It logs errors to `~/.storycore/logs/feedback_errors.log` with daily rotation and 7-day retention.

## Features

- ✅ **Automatic log rotation**: Daily rotation at midnight (UTC)
- ✅ **7-day retention**: Keeps last 7 days of logs
- ✅ **Structured logging**: Includes timestamp, error type, context, and stacktrace
- ✅ **Thread-safe**: Safe for concurrent use
- ✅ **Specialized error types**: Validation, Network, Storage, Diagnostic, and GitHub API errors
- ✅ **Singleton pattern**: Single logger instance across the application

## Log Format

Each log entry follows this format:

```
YYYY-MM-DD HH:MM:SS - LEVEL - LOGGER_NAME - [ERROR_TYPE] Message | Context: key=value | Exception: ExceptionType: message
Traceback (most recent call last):
  ...stacktrace...
```

Example:
```
2026-01-26 07:37:57 - ERROR - feedback_errors - [ValidationError] Validation failed for field 'screenshot' | Context: field=screenshot, value=/path/to/file.txt, reason=Invalid format
```

## Usage

### Basic Error Logging

```python
from src.feedback_error_logger import log_error

# Log a simple error
log_error(
    error_type="CustomError",
    message="Something went wrong",
    context={"user_id": "123", "action": "submit_report"}
)

# Log an error with exception
try:
    # Some operation
    raise ValueError("Invalid input")
except Exception as e:
    log_error(
        error_type="InputError",
        message="Failed to process input",
        context={"input_value": "abc"},
        exception=e,
        include_stacktrace=True
    )
```

### Validation Errors

```python
from src.feedback_error_logger import log_validation_error

log_validation_error(
    field="screenshot",
    value="/path/to/invalid/file.txt",
    reason="Invalid file format. Expected PNG, JPG, or GIF",
    context={"max_size_mb": 5}
)
```

### Network Errors

```python
from src.feedback_error_logger import log_network_error

try:
    response = requests.post(url, json=payload)
except requests.exceptions.ConnectionError as e:
    log_network_error(
        operation="submit_report",
        url="http://backend.example.com/api/v1/report",
        error=e,
        context={"retry_count": 3, "timeout": 30}
    )
```

### Storage Errors

```python
from src.feedback_error_logger import log_storage_error

try:
    with open(file_path, 'w') as f:
        json.dump(data, f)
except IOError as e:
    log_storage_error(
        operation="save",
        file_path="/path/to/report.json",
        error=e,
        context={"report_id": "report_20240101_abc123"}
    )
```

### Diagnostic Errors

```python
from src.feedback_error_logger import log_diagnostic_error

try:
    memory_info = collect_memory_state()
except Exception as e:
    log_diagnostic_error(
        component="memory",
        error=e,
        context={"fallback": "minimal_info"}
    )
```

### GitHub API Errors

```python
from src.feedback_error_logger import log_github_api_error

response = requests.post(github_api_url, json=issue_data)
if response.status_code != 200:
    log_github_api_error(
        operation="create_issue",
        status_code=response.status_code,
        response_text=response.text,
        context={"repository": "zedarvates/StoryCore-Engine"}
    )
```

## Advanced Usage

### Using the Logger Class Directly

```python
from src.feedback_error_logger import FeedbackErrorLogger

# Get logger instance
logger = FeedbackErrorLogger.get_logger()

# Log custom error
FeedbackErrorLogger.log_error(
    error_type="CustomError",
    message="Custom error message",
    context={"key": "value"}
)

# Get log file path
log_path = FeedbackErrorLogger.get_log_file_path()
print(f"Logs are stored at: {log_path}")

# Read recent errors
recent_errors = FeedbackErrorLogger.get_recent_errors(max_lines=50)
for error in recent_errors:
    print(error)

# Close handlers (useful for testing/cleanup)
FeedbackErrorLogger.close_handlers()
```

### Custom Log Directory

```python
from src.feedback_error_logger import FeedbackErrorLogger

# Use custom log directory
logger = FeedbackErrorLogger.get_logger(log_dir="/custom/log/path")
```

## Log File Location

By default, logs are stored at:
- **Linux/macOS**: `~/.storycore/logs/feedback_errors.log`
- **Windows**: `C:\Users\<username>\.storycore\logs\feedback_errors.log`

Rotated logs are named with date suffixes:
- `feedback_errors.log` (current)
- `feedback_errors.log.2026-01-25` (yesterday)
- `feedback_errors.log.2026-01-24` (2 days ago)
- etc.

## Log Rotation

- **Rotation Schedule**: Daily at midnight (UTC)
- **Retention Period**: 7 days
- **Automatic Cleanup**: Old logs are automatically deleted after 7 days

## Integration with Feedback Module

The error logging system is integrated throughout the feedback module:

### Diagnostic Collector
```python
from src.diagnostic_collector import DiagnosticCollector
from src.feedback_error_logger import log_diagnostic_error

collector = DiagnosticCollector()

try:
    logs = collector.collect_logs()
except Exception as e:
    log_diagnostic_error(
        component="logs",
        error=e,
        context={"max_lines": 500}
    )
```

### Feedback Storage
```python
from src.feedback_storage import FeedbackStorage
from src.feedback_error_logger import log_storage_error

storage = FeedbackStorage()

try:
    report_id = storage.save_failed_report(payload)
except Exception as e:
    log_storage_error(
        operation="save",
        file_path=str(storage.storage_dir),
        error=e,
        context={"payload_size": len(str(payload))}
    )
```

### Backend Proxy
```python
from src.feedback_error_logger import log_network_error, log_github_api_error

# Network errors
try:
    response = requests.post(backend_url, json=payload)
except requests.exceptions.RequestException as e:
    log_network_error(
        operation="submit_report",
        url=backend_url,
        error=e
    )

# GitHub API errors
if response.status_code != 200:
    log_github_api_error(
        operation="create_issue",
        status_code=response.status_code,
        response_text=response.text
    )
```

## Testing

Run the test suite:

```bash
python3 -m pytest src/test_feedback_error_logger.py -v
```

Test coverage includes:
- Logger initialization and singleton pattern
- Basic error logging with context
- Error logging with exceptions and stacktraces
- All specialized error types (validation, network, storage, diagnostic, GitHub API)
- Log file format validation
- Recent error retrieval
- Value truncation for long values

## Requirements

- Python 3.9+
- Standard library only (no external dependencies)

## Requirements Validation

This implementation satisfies **Requirement 8.3**:

> **Requirement 8.3**: Error Handling and Recovery
> 
> WHEN a critical error occurs during feedback submission, THE System SHALL log the error details and display a user-friendly message without crashing.
>
> Implementation:
> - ✅ Logs to `~/.storycore/logs/feedback_errors.log`
> - ✅ Includes timestamp, error type, context, and stacktrace
> - ✅ Daily log rotation with 7-day retention
> - ✅ Thread-safe logging
> - ✅ Graceful error handling (no crashes)

## Best Practices

1. **Always include context**: Provide relevant context information to help with debugging
2. **Use appropriate error types**: Choose the specialized logging function that matches your error category
3. **Include exceptions**: Pass exception objects when available for full stacktraces
4. **Truncate sensitive data**: The logger automatically truncates long values, but be mindful of sensitive information
5. **Monitor log size**: Check log files periodically to ensure rotation is working correctly

## Troubleshooting

### Log file not created

If the log file is not being created:
1. Check directory permissions for `~/.storycore/logs/`
2. Verify the logger is initialized: `FeedbackErrorLogger.get_logger()`
3. Check stderr for initialization errors

### Logs not rotating

If logs are not rotating after 7 days:
1. Verify the application runs continuously or at least once per day
2. Check that the `TimedRotatingFileHandler` is properly configured
3. Manually check for rotated log files with date suffixes

### Permission errors on Windows

On Windows, log files may be locked by the process:
1. Use `FeedbackErrorLogger.close_handlers()` before cleanup
2. Add a small delay after closing handlers
3. Ensure no other processes are reading the log file

## Future Enhancements

Potential improvements for future versions:
- Configurable log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Remote log shipping to centralized logging service
- Log compression for rotated files
- Email alerts for critical errors
- Integration with monitoring dashboards
- Structured logging (JSON format) for easier parsing
