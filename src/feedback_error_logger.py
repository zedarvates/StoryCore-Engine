"""
Feedback Error Logger Module

Provides comprehensive error logging for the Feedback & Diagnostics system.
Logs errors to ~/.storycore/logs/feedback_errors.log with daily rotation
and 7-day retention.

Requirements: 8.3 - Error logging with timestamp, error type, context, and stacktrace
"""

import logging
import sys
import traceback
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
from typing import Optional, Dict, Any


class FeedbackErrorLogger:
    """
    Manages error logging for the Feedback & Diagnostics module.
    
    Features:
    - Logs to ~/.storycore/logs/feedback_errors.log
    - Daily log rotation with 7-day retention
    - Includes timestamp, error type, context, and stacktrace
    - Thread-safe logging
    """
    
    # Class-level logger instance (singleton pattern)
    _logger: Optional[logging.Logger] = None
    _log_file_path: Optional[Path] = None
    
    @classmethod
    def get_logger(cls, log_dir: Optional[str] = None) -> logging.Logger:
        """
        Get or create the feedback error logger instance.
        
        This method implements a singleton pattern to ensure only one logger
        instance is created for the feedback module.
        
        Args:
            log_dir: Optional custom log directory path.
                    Defaults to ~/.storycore/logs/
        
        Returns:
            logging.Logger: Configured logger instance
        """
        if cls._logger is not None:
            return cls._logger
        
        # Determine log directory
        if log_dir:
            log_directory = Path(log_dir)
        else:
            log_directory = Path.home() / ".storycore" / "logs"
        
        # Ensure log directory exists
        try:
            log_directory.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            # If we can't create the log directory, fall back to stderr
            print(f"Warning: Failed to create log directory {log_directory}: {e}", 
                  file=sys.stderr)
            # Create a basic logger that only logs to stderr
            logger = logging.getLogger("feedback_errors")
            logger.setLevel(logging.ERROR)
            if not logger.handlers:
                stderr_handler = logging.StreamHandler(sys.stderr)
                stderr_handler.setFormatter(
                    logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
                )
                logger.addHandler(stderr_handler)
            cls._logger = logger
            return logger
        
        # Set log file path
        cls._log_file_path = log_directory / "feedback_errors.log"
        
        # Create logger
        logger = logging.getLogger("feedback_errors")
        logger.setLevel(logging.ERROR)
        
        # Prevent duplicate handlers if logger already configured
        if logger.handlers:
            cls._logger = logger
            return logger
        
        # Create rotating file handler
        # Daily rotation, keep 7 days of logs
        try:
            file_handler = TimedRotatingFileHandler(
                filename=str(cls._log_file_path),
                when='midnight',  # Rotate at midnight
                interval=1,       # Every 1 day
                backupCount=7,    # Keep 7 days of logs
                encoding='utf-8',
                delay=False,
                utc=True          # Use UTC for consistency
            )
            
            # Set log format with timestamp, level, error type, and message
            formatter = logging.Formatter(
                fmt='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            file_handler.setFormatter(formatter)
            
            # Add handler to logger
            logger.addHandler(file_handler)
            
        except Exception as e:
            # If file handler creation fails, add stderr handler as fallback
            print(f"Warning: Failed to create file handler for {cls._log_file_path}: {e}",
                  file=sys.stderr)
            stderr_handler = logging.StreamHandler(sys.stderr)
            stderr_handler.setFormatter(
                logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            )
            logger.addHandler(stderr_handler)
        
        # Also add console handler for immediate visibility during development
        console_handler = logging.StreamHandler(sys.stderr)
        console_handler.setLevel(logging.ERROR)
        console_formatter = logging.Formatter(
            fmt='%(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        cls._logger = logger
        return logger
    
    @classmethod
    def log_error(
        cls,
        error_type: str,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        exception: Optional[Exception] = None,
        include_stacktrace: bool = True
    ) -> None:
        """
        Log an error with full context and optional stacktrace.
        
        Args:
            error_type: Type/category of error (e.g., "ValidationError", "NetworkError")
            message: Human-readable error message
            context: Optional dictionary with additional context information
            exception: Optional exception object to log
            include_stacktrace: Whether to include full stacktrace (default: True)
        
        Requirements: 8.3
        
        Examples:
            >>> FeedbackErrorLogger.log_error(
            ...     error_type="ValidationError",
            ...     message="Invalid screenshot format",
            ...     context={"file_path": "/path/to/file.txt", "expected": "PNG/JPG/GIF"}
            ... )
            
            >>> try:
            ...     # Some operation
            ...     raise ValueError("Invalid payload")
            ... except Exception as e:
            ...     FeedbackErrorLogger.log_error(
            ...         error_type="PayloadError",
            ...         message="Failed to process payload",
            ...         context={"payload_size": 1024},
            ...         exception=e
            ...     )
        """
        logger = cls.get_logger()
        
        # Build error message with context
        log_parts = [
            f"[{error_type}] {message}"
        ]
        
        # Add context information if provided
        if context:
            context_str = ", ".join(f"{k}={v}" for k, v in context.items())
            log_parts.append(f"Context: {context_str}")
        
        # Add exception information if provided
        if exception:
            log_parts.append(f"Exception: {type(exception).__name__}: {str(exception)}")
        
        # Combine all parts
        full_message = " | ".join(log_parts)
        
        # Log the error
        if include_stacktrace and exception:
            # Log with full stacktrace
            logger.error(full_message, exc_info=exception)
        elif include_stacktrace:
            # Log with current stacktrace
            logger.error(full_message, exc_info=True)
        else:
            # Log without stacktrace
            logger.error(full_message)
        
        # Flush all handlers to ensure logs are written immediately
        for handler in logger.handlers:
            handler.flush()
    
    @classmethod
    def log_validation_error(
        cls,
        field: str,
        value: Any,
        reason: str,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log a validation error with field-specific information.
        
        Args:
            field: Name of the field that failed validation
            value: The invalid value (will be truncated if too long)
            reason: Reason for validation failure
            context: Optional additional context
        
        Requirements: 8.3
        """
        # Truncate value if it's too long
        value_str = str(value)
        if len(value_str) > 100:
            value_str = value_str[:97] + "..."
        
        error_context = {
            "field": field,
            "value": value_str,
            "reason": reason
        }
        
        if context:
            error_context.update(context)
        
        cls.log_error(
            error_type="ValidationError",
            message=f"Validation failed for field '{field}'",
            context=error_context,
            include_stacktrace=False
        )
    
    @classmethod
    def log_network_error(
        cls,
        operation: str,
        url: str,
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log a network-related error.
        
        Args:
            operation: The operation being performed (e.g., "submit_report", "retry_report")
            url: The URL that was being accessed
            error: The exception that occurred
            context: Optional additional context
        
        Requirements: 8.3
        """
        error_context = {
            "operation": operation,
            "url": url,
            "error_type": type(error).__name__
        }
        
        if context:
            error_context.update(context)
        
        cls.log_error(
            error_type="NetworkError",
            message=f"Network error during {operation}",
            context=error_context,
            exception=error,
            include_stacktrace=True
        )
    
    @classmethod
    def log_storage_error(
        cls,
        operation: str,
        file_path: str,
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log a file storage error.
        
        Args:
            operation: The operation being performed (e.g., "save", "load", "delete")
            file_path: The file path involved
            error: The exception that occurred
            context: Optional additional context
        
        Requirements: 8.3
        """
        error_context = {
            "operation": operation,
            "file_path": file_path,
            "error_type": type(error).__name__
        }
        
        if context:
            error_context.update(context)
        
        cls.log_error(
            error_type="StorageError",
            message=f"Storage error during {operation}",
            context=error_context,
            exception=error,
            include_stacktrace=True
        )
    
    @classmethod
    def log_diagnostic_error(
        cls,
        component: str,
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log an error during diagnostic collection.
        
        Args:
            component: The diagnostic component that failed (e.g., "logs", "memory", "screenshot")
            error: The exception that occurred
            context: Optional additional context
        
        Requirements: 8.3
        """
        error_context = {
            "component": component,
            "error_type": type(error).__name__
        }
        
        if context:
            error_context.update(context)
        
        cls.log_error(
            error_type="DiagnosticError",
            message=f"Failed to collect {component} diagnostics",
            context=error_context,
            exception=error,
            include_stacktrace=True
        )
    
    @classmethod
    def log_github_api_error(
        cls,
        operation: str,
        status_code: Optional[int],
        response_text: Optional[str],
        context: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log a GitHub API error.
        
        Args:
            operation: The operation being performed (e.g., "create_issue")
            status_code: HTTP status code if available
            response_text: Response text from GitHub API
            context: Optional additional context
        
        Requirements: 8.3
        """
        error_context = {
            "operation": operation,
            "status_code": status_code
        }
        
        # Truncate response text if too long
        if response_text:
            if len(response_text) > 500:
                error_context["response"] = response_text[:497] + "..."
            else:
                error_context["response"] = response_text
        
        if context:
            error_context.update(context)
        
        cls.log_error(
            error_type="GitHubAPIError",
            message=f"GitHub API error during {operation}",
            context=error_context,
            include_stacktrace=False
        )
    
    @classmethod
    def get_log_file_path(cls) -> Optional[Path]:
        """
        Get the path to the current log file.
        
        Returns:
            Path to the log file, or None if not initialized
        """
        return cls._log_file_path
    
    @classmethod
    def get_recent_errors(cls, max_lines: int = 100) -> list:
        """
        Read recent error log entries.
        
        Args:
            max_lines: Maximum number of recent log lines to return
        
        Returns:
            List of recent log line strings
        """
        if cls._log_file_path is None or not cls._log_file_path.exists():
            return []
        
        try:
            with open(cls._log_file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                return [line.rstrip('\n\r') for line in lines[-max_lines:]]
        except Exception as e:
            print(f"Warning: Failed to read log file: {e}", file=sys.stderr)
            return []
    
    @classmethod
    def close_handlers(cls) -> None:
        """
        Close all log handlers and reset the logger.
        
        This is useful for testing and cleanup to ensure log files
        are properly closed and can be deleted.
        """
        if cls._logger is not None:
            # Flush and close all handlers
            for handler in cls._logger.handlers[:]:
                handler.flush()
                handler.close()
                cls._logger.removeHandler(handler)
            
            # Reset logger
            cls._logger = None
            cls._log_file_path = None


# Convenience functions for direct usage
def log_error(
    error_type: str,
    message: str,
    context: Optional[Dict[str, Any]] = None,
    exception: Optional[Exception] = None,
    include_stacktrace: bool = True
) -> None:
    """
    Convenience function to log an error.
    
    See FeedbackErrorLogger.log_error() for full documentation.
    """
    FeedbackErrorLogger.log_error(
        error_type=error_type,
        message=message,
        context=context,
        exception=exception,
        include_stacktrace=include_stacktrace
    )


def log_validation_error(
    field: str,
    value: Any,
    reason: str,
    context: Optional[Dict[str, Any]] = None
) -> None:
    """
    Convenience function to log a validation error.
    
    See FeedbackErrorLogger.log_validation_error() for full documentation.
    """
    FeedbackErrorLogger.log_validation_error(
        field=field,
        value=value,
        reason=reason,
        context=context
    )


def log_network_error(
    operation: str,
    url: str,
    error: Exception,
    context: Optional[Dict[str, Any]] = None
) -> None:
    """
    Convenience function to log a network error.
    
    See FeedbackErrorLogger.log_network_error() for full documentation.
    """
    FeedbackErrorLogger.log_network_error(
        operation=operation,
        url=url,
        error=error,
        context=context
    )


def log_storage_error(
    operation: str,
    file_path: str,
    error: Exception,
    context: Optional[Dict[str, Any]] = None
) -> None:
    """
    Convenience function to log a storage error.
    
    See FeedbackErrorLogger.log_storage_error() for full documentation.
    """
    FeedbackErrorLogger.log_storage_error(
        operation=operation,
        file_path=file_path,
        error=error,
        context=context
    )


def log_diagnostic_error(
    component: str,
    error: Exception,
    context: Optional[Dict[str, Any]] = None
) -> None:
    """
    Convenience function to log a diagnostic error.
    
    See FeedbackErrorLogger.log_diagnostic_error() for full documentation.
    """
    FeedbackErrorLogger.log_diagnostic_error(
        component=component,
        error=error,
        context=context
    )


def log_github_api_error(
    operation: str,
    status_code: Optional[int],
    response_text: Optional[str],
    context: Optional[Dict[str, Any]] = None
) -> None:
    """
    Convenience function to log a GitHub API error.
    
    See FeedbackErrorLogger.log_github_api_error() for full documentation.
    """
    FeedbackErrorLogger.log_github_api_error(
        operation=operation,
        status_code=status_code,
        response_text=response_text,
        context=context
    )


# Example usage and testing
if __name__ == "__main__":
    print("Testing Feedback Error Logger...")
    
    # Test basic error logging
    print("\n1. Testing basic error logging...")
    log_error(
        error_type="TestError",
        message="This is a test error message",
        context={"test_id": "001", "component": "logger_test"}
    )
    
    # Test validation error
    print("\n2. Testing validation error logging...")
    log_validation_error(
        field="screenshot",
        value="/path/to/invalid/file.txt",
        reason="Invalid file format. Expected PNG, JPG, or GIF",
        context={"max_size_mb": 5}
    )
    
    # Test network error
    print("\n3. Testing network error logging...")
    try:
        raise ConnectionError("Failed to connect to backend proxy")
    except Exception as e:
        log_network_error(
            operation="submit_report",
            url="http://localhost:8000/api/v1/report",
            error=e,
            context={"retry_count": 3}
        )
    
    # Test storage error
    print("\n4. Testing storage error logging...")
    try:
        raise IOError("Permission denied")
    except Exception as e:
        log_storage_error(
            operation="save",
            file_path="/path/to/report.json",
            error=e,
            context={"report_id": "report_20240101_abc123"}
        )
    
    # Test diagnostic error
    print("\n5. Testing diagnostic error logging...")
    try:
        raise RuntimeError("psutil not available")
    except Exception as e:
        log_diagnostic_error(
            component="memory",
            error=e,
            context={"fallback": "minimal_info"}
        )
    
    # Test GitHub API error
    print("\n6. Testing GitHub API error logging...")
    log_github_api_error(
        operation="create_issue",
        status_code=403,
        response_text='{"message": "API rate limit exceeded"}',
        context={"repository": "zedarvates/StoryCore-Engine"}
    )
    
    # Display log file location
    log_path = FeedbackErrorLogger.get_log_file_path()
    print(f"\n✓ All test errors logged successfully!")
    print(f"✓ Log file location: {log_path}")
    
    # Display recent errors
    print("\n7. Reading recent errors from log file...")
    recent_errors = FeedbackErrorLogger.get_recent_errors(max_lines=10)
    print(f"✓ Found {len(recent_errors)} recent log entries")
    
    if recent_errors:
        print("\nMost recent log entries:")
        for i, line in enumerate(recent_errors[-3:], 1):
            print(f"  {i}. {line[:100]}...")
