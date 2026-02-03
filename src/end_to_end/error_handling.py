"""
Error Handling and Recovery System for ComfyUI Integration.

Provides structured error categorization, error-specific guidance,
retry functionality, and comprehensive error logging.

Validates: Requirements 12.1-12.7
"""

import logging
import time
import json
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Callable
from functools import wraps

logger = logging.getLogger(__name__)


class ErrorCategory(str, Enum):
    """
    Error categories for ComfyUI integration.
    
    Categorizes errors to provide appropriate guidance and recovery actions.
    
    Validates: Requirement 12.2
    """
    CONNECTION = "CONNECTION"
    MODEL = "MODEL"
    WORKFLOW = "WORKFLOW"
    GENERATION = "GENERATION"
    CORS = "CORS"
    CONFIGURATION = "CONFIGURATION"


@dataclass
class CategorizedError:
    """
    Structured error with category, message, and recovery action.
    
    Provides detailed error information with actionable recovery guidance.
    
    Attributes:
        category: Error category
        message: Human-readable error message
        details: Additional error details
        recovery_action: Suggested action to recover from error
        timestamp: When the error occurred
        context: Additional context information
        
    Validates: Requirement 12.2
    """
    category: ErrorCategory
    message: str
    details: str
    recovery_action: str
    timestamp: datetime = field(default_factory=datetime.now)
    context: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "category": self.category.value,
            "message": self.message,
            "details": self.details,
            "recovery_action": self.recovery_action,
            "timestamp": self.timestamp.isoformat(),
            "context": self.context
        }
    
    def __str__(self) -> str:
        """String representation for logging"""
        return (
            f"[{self.category.value}] {self.message}\n"
            f"Details: {self.details}\n"
            f"Recovery: {self.recovery_action}"
        )


class ErrorCategorizer:
    """
    Categorizes errors and provides appropriate guidance.
    
    Analyzes exceptions and error messages to determine category
    and provide specific recovery guidance.
    
    Validates: Requirements 12.2, 12.3, 12.4, 12.5
    """
    
    @staticmethod
    def categorize_error(
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ) -> CategorizedError:
        """
        Categorize an error and provide recovery guidance.
        
        Args:
            error: Exception to categorize
            context: Additional context information
            
        Returns:
            CategorizedError with category and guidance
            
        Validates: Requirements 12.2, 12.3, 12.4, 12.5
        """
        context = context or {}
        error_str = str(error).lower()
        error_type = type(error).__name__
        
        # Connection errors
        if ErrorCategorizer._is_connection_error(error_str, error_type):
            return ErrorCategorizer._create_connection_error(error, context)
        
        # Model errors
        if ErrorCategorizer._is_model_error(error_str, error_type):
            return ErrorCategorizer._create_model_error(error, context)
        
        # Workflow errors
        if ErrorCategorizer._is_workflow_error(error_str, error_type):
            return ErrorCategorizer._create_workflow_error(error, context)
        
        # CORS errors
        if ErrorCategorizer._is_cors_error(error_str, error_type):
            return ErrorCategorizer._create_cors_error(error, context)
        
        # Configuration errors
        if ErrorCategorizer._is_configuration_error(error_str, error_type):
            return ErrorCategorizer._create_configuration_error(error, context)
        
        # Default to generation error
        return ErrorCategorizer._create_generation_error(error, context)
    
    @staticmethod
    def _is_connection_error(error_str: str, error_type: str) -> bool:
        """Check if error is a connection error"""
        connection_keywords = [
            "connection", "refused", "timeout", "unreachable",
            "network", "socket", "connect", "unavailable"
        ]
        connection_types = [
            "ConnectionError", "TimeoutError", "ConnectionRefusedError",
            "ConnectionResetError", "ConnectionAbortedError"
        ]
        
        return (
            any(keyword in error_str for keyword in connection_keywords) or
            error_type in connection_types
        )
    
    @staticmethod
    def _is_model_error(error_str: str, error_type: str) -> bool:
        """Check if error is a model error"""
        model_keywords = [
            "model not found", "missing model", "model file",
            "checkpoint", "safetensors", "model load", "model error"
        ]
        
        return any(keyword in error_str for keyword in model_keywords)
    
    @staticmethod
    def _is_workflow_error(error_str: str, error_type: str) -> bool:
        """Check if error is a workflow error"""
        workflow_keywords = [
            "workflow", "node not found", "missing node",
            "custom node", "node error", "invalid workflow"
        ]
        
        return any(keyword in error_str for keyword in workflow_keywords)
    
    @staticmethod
    def _is_cors_error(error_str: str, error_type: str) -> bool:
        """Check if error is a CORS error"""
        cors_keywords = [
            "cors", "cross-origin", "access-control",
            "origin not allowed", "cors policy"
        ]
        
        return any(keyword in error_str for keyword in cors_keywords)
    
    @staticmethod
    def _is_configuration_error(error_str: str, error_type: str) -> bool:
        """Check if error is a configuration error"""
        config_keywords = [
            "configuration", "config", "invalid setting",
            "missing setting", "invalid port", "invalid host"
        ]
        config_types = ["ValueError", "KeyError", "AttributeError"]
        
        return (
            any(keyword in error_str for keyword in config_keywords) or
            error_type in config_types
        )
    
    @staticmethod
    def _create_connection_error(
        error: Exception,
        context: Dict[str, Any]
    ) -> CategorizedError:
        """
        Create connection error with guidance.
        
        Validates: Requirement 12.3
        """
        url = context.get("url", "localhost:8000")
        
        return CategorizedError(
            category=ErrorCategory.CONNECTION,
            message=f"Failed to connect to ComfyUI at {url}",
            details=str(error),
            recovery_action=(
                "1. Check if ComfyUI Desktop is running\n"
                "2. Verify the URL and port are correct\n"
                "3. Check firewall settings\n"
                "4. Try restarting ComfyUI Desktop"
            ),
            context=context
        )
    
    @staticmethod
    def _create_model_error(
        error: Exception,
        context: Dict[str, Any]
    ) -> CategorizedError:
        """
        Create model error with guidance.
        
        Validates: Requirement 12.4
        """
        model_name = context.get("model_name", "unknown model")
        
        return CategorizedError(
            category=ErrorCategory.MODEL,
            message=f"Model error: {model_name}",
            details=str(error),
            recovery_action=(
                f"1. Download the missing model: {model_name}\n"
                "2. Use the automatic model download feature\n"
                "3. Verify model files are in the correct directory\n"
                "4. Check model file integrity (size and hash)"
            ),
            context=context
        )
    
    @staticmethod
    def _create_workflow_error(
        error: Exception,
        context: Dict[str, Any]
    ) -> CategorizedError:
        """
        Create workflow error with guidance.
        
        Validates: Requirement 12.5
        """
        workflow_name = context.get("workflow_name", "unknown workflow")
        missing_node = context.get("missing_node", "unknown node")
        
        return CategorizedError(
            category=ErrorCategory.WORKFLOW,
            message=f"Workflow error in {workflow_name}",
            details=str(error),
            recovery_action=(
                f"1. Install missing custom node: {missing_node}\n"
                "2. Update ComfyUI to latest version\n"
                "3. Check workflow compatibility\n"
                "4. Verify all required nodes are installed"
            ),
            context=context
        )
    
    @staticmethod
    def _create_cors_error(
        error: Exception,
        context: Dict[str, Any]
    ) -> CategorizedError:
        """Create CORS error with guidance"""
        return CategorizedError(
            category=ErrorCategory.CORS,
            message="CORS configuration error",
            details=str(error),
            recovery_action=(
                "1. Start ComfyUI with --enable-cors-header flag\n"
                "2. Or enable CORS in ComfyUI settings\n"
                "3. Restart ComfyUI after enabling CORS\n"
                "4. Verify CORS headers are present in responses"
            ),
            context=context
        )
    
    @staticmethod
    def _create_configuration_error(
        error: Exception,
        context: Dict[str, Any]
    ) -> CategorizedError:
        """Create configuration error with guidance"""
        return CategorizedError(
            category=ErrorCategory.CONFIGURATION,
            message="Configuration error",
            details=str(error),
            recovery_action=(
                "1. Check configuration file syntax\n"
                "2. Verify all required settings are present\n"
                "3. Use default configuration as reference\n"
                "4. Check environment variable values"
            ),
            context=context
        )
    
    @staticmethod
    def _create_generation_error(
        error: Exception,
        context: Dict[str, Any]
    ) -> CategorizedError:
        """Create generation error with guidance"""
        shot_id = context.get("shot_id", "unknown shot")
        
        return CategorizedError(
            category=ErrorCategory.GENERATION,
            message=f"Generation failed for {shot_id}",
            details=str(error),
            recovery_action=(
                "1. Check ComfyUI logs for detailed error\n"
                "2. Verify generation parameters are valid\n"
                "3. Try reducing image resolution\n"
                "4. Check available GPU memory"
            ),
            context=context
        )


class RetryManager:
    """
    Manages retry functionality for failed operations.
    
    Tracks retry attempts and provides retry logic with exponential backoff.
    
    Validates: Requirement 12.6
    """
    
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0):
        """
        Initialize RetryManager.
        
        Args:
            max_retries: Maximum number of retry attempts
            base_delay: Base delay in seconds for exponential backoff
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self._retry_counts: Dict[str, int] = {}
    
    def should_retry(self, operation_id: str) -> bool:
        """
        Check if operation should be retried.
        
        Args:
            operation_id: Unique identifier for the operation
            
        Returns:
            True if should retry, False otherwise
            
        Validates: Requirement 12.6
        """
        retry_count = self._retry_counts.get(operation_id, 0)
        return retry_count < self.max_retries
    
    def get_retry_count(self, operation_id: str) -> int:
        """Get current retry count for operation"""
        return self._retry_counts.get(operation_id, 0)
    
    def increment_retry(self, operation_id: str) -> int:
        """
        Increment retry count for operation.
        
        Args:
            operation_id: Unique identifier for the operation
            
        Returns:
            New retry count
        """
        current_count = self._retry_counts.get(operation_id, 0)
        new_count = current_count + 1
        self._retry_counts[operation_id] = new_count
        
        logger.info(
            f"Retry attempt {new_count}/{self.max_retries} for {operation_id}"
        )
        
        return new_count
    
    def reset_retry(self, operation_id: str):
        """Reset retry count for operation"""
        if operation_id in self._retry_counts:
            del self._retry_counts[operation_id]
    
    def get_retry_delay(self, operation_id: str) -> float:
        """
        Calculate retry delay with exponential backoff.
        
        Args:
            operation_id: Unique identifier for the operation
            
        Returns:
            Delay in seconds before next retry
        """
        retry_count = self._retry_counts.get(operation_id, 0)
        delay = self.base_delay * (2 ** retry_count)
        
        logger.debug(
            f"Retry delay for {operation_id}: {delay:.2f}s "
            f"(attempt {retry_count + 1})"
        )
        
        return delay
    
    def with_retry(
        self,
        func: Callable,
        operation_id: str,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with retry logic.
        
        Args:
            func: Function to execute
            operation_id: Unique identifier for the operation
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function
            
        Returns:
            Function result
            
        Raises:
            Last exception if all retries exhausted
            
        Validates: Requirement 12.6
        """
        last_error = None
        
        while self.should_retry(operation_id):
            try:
                result = func(*args, **kwargs)
                # Success - reset retry count
                self.reset_retry(operation_id)
                return result
                
            except Exception as e:
                last_error = e
                retry_count = self.increment_retry(operation_id)
                
                if self.should_retry(operation_id):
                    delay = self.get_retry_delay(operation_id)
                    logger.warning(
                        f"Operation {operation_id} failed (attempt {retry_count}). "
                        f"Retrying in {delay:.2f}s. Error: {str(e)}"
                    )
                    time.sleep(delay)
                else:
                    logger.error(
                        f"Operation {operation_id} failed after {retry_count} attempts. "
                        f"Final error: {str(e)}"
                    )
                    break
        
        # All retries exhausted
        if last_error:
            raise last_error
        else:
            raise RuntimeError(f"Operation {operation_id} failed with no error captured")


class ErrorLogger:
    """
    Comprehensive error logging with structured format.
    
    Logs errors with timestamp, category, message, and context for debugging.
    Implements log rotation and size limits.
    
    Validates: Requirement 12.7
    """
    
    def __init__(
        self,
        log_dir: Path,
        max_log_size_mb: int = 10,
        max_log_files: int = 5
    ):
        """
        Initialize ErrorLogger.
        
        Args:
            log_dir: Directory for error logs
            max_log_size_mb: Maximum size of each log file in MB
            max_log_files: Maximum number of log files to keep
        """
        self.log_dir = Path(log_dir)
        self.max_log_size_bytes = max_log_size_mb * 1024 * 1024
        self.max_log_files = max_log_files
        
        # Ensure log directory exists
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Current log file
        self.current_log_file = self.log_dir / "comfyui_errors.log"
    
    def log_error(
        self,
        error: CategorizedError,
        additional_context: Optional[Dict[str, Any]] = None
    ):
        """
        Log error with structured format.
        
        Args:
            error: Categorized error to log
            additional_context: Additional context information
            
        Validates: Requirement 12.7
        """
        # Create log entry
        log_entry = {
            "timestamp": error.timestamp.isoformat(),
            "category": error.category.value,
            "message": error.message,
            "details": error.details,
            "recovery_action": error.recovery_action,
            "context": error.context
        }
        
        if additional_context:
            log_entry["additional_context"] = additional_context
        
        # Write to log file
        try:
            # Check if rotation needed
            self._rotate_logs_if_needed()
            
            # Append to current log file
            with open(self.current_log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry) + "\n")
            
            # Also log to Python logger
            logger.error(
                f"[{error.category.value}] {error.message} | "
                f"Details: {error.details}"
            )
            
        except Exception as e:
            logger.error(f"Failed to write error log: {e}")
    
    def _rotate_logs_if_needed(self):
        """
        Rotate logs if current log file exceeds size limit.
        
        Validates: Requirement 12.7
        """
        if not self.current_log_file.exists():
            return
        
        # Check file size
        file_size = self.current_log_file.stat().st_size
        
        if file_size >= self.max_log_size_bytes:
            # Rotate logs
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            rotated_file = self.log_dir / f"comfyui_errors_{timestamp}.log"
            
            # Rename current log
            self.current_log_file.rename(rotated_file)
            
            logger.info(f"Rotated error log to {rotated_file}")
            
            # Clean up old logs
            self._cleanup_old_logs()
    
    def _cleanup_old_logs(self):
        """Remove old log files exceeding max_log_files limit"""
        log_files = sorted(
            self.log_dir.glob("comfyui_errors_*.log"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        
        # Remove excess log files
        for old_log in log_files[self.max_log_files:]:
            try:
                old_log.unlink()
                logger.debug(f"Removed old log file: {old_log}")
            except Exception as e:
                logger.warning(f"Failed to remove old log {old_log}: {e}")
    
    def get_recent_errors(
        self,
        count: int = 10,
        category: Optional[ErrorCategory] = None
    ) -> list:
        """
        Get recent errors from log file.
        
        Args:
            count: Number of recent errors to retrieve
            category: Optional category filter
            
        Returns:
            List of recent error entries
        """
        if not self.current_log_file.exists():
            return []
        
        errors = []
        
        try:
            with open(self.current_log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            # Parse log entries in reverse order (most recent first)
            for line in reversed(lines):
                try:
                    entry = json.loads(line.strip())
                    
                    # Filter by category if specified
                    if category and entry.get("category") != category.value:
                        continue
                    
                    errors.append(entry)
                    
                    if len(errors) >= count:
                        break
                        
                except json.JSONDecodeError:
                    continue
            
        except Exception as e:
            logger.error(f"Failed to read error log: {e}")
        
        return errors
    
    def clear_logs(self):
        """Clear all error logs"""
        try:
            # Remove all log files
            for log_file in self.log_dir.glob("comfyui_errors*.log"):
                log_file.unlink()
            
            logger.info("Cleared all error logs")
            
        except Exception as e:
            logger.error(f"Failed to clear logs: {e}")


def with_error_handling(
    error_logger: Optional[ErrorLogger] = None,
    retry_manager: Optional[RetryManager] = None
):
    """
    Decorator that adds error handling and retry logic to functions.
    
    Args:
        error_logger: Optional ErrorLogger instance
        retry_manager: Optional RetryManager instance
        
    Returns:
        Decorated function with error handling
        
    Example:
        @with_error_handling(error_logger=logger, retry_manager=retry_mgr)
        async def generate_image(shot_config):
            # Function that may fail
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            operation_id = f"{func.__name__}_{id(args)}"
            
            try:
                # Use retry manager if provided
                if retry_manager:
                    return retry_manager.with_retry(
                        func, operation_id, *args, **kwargs
                    )
                else:
                    return func(*args, **kwargs)
                    
            except Exception as e:
                # Categorize error
                context = {
                    "function": func.__name__,
                    "args": str(args)[:100],  # Truncate for logging
                    "kwargs": str(kwargs)[:100]
                }
                
                categorized_error = ErrorCategorizer.categorize_error(e, context)
                
                # Log error if logger provided
                if error_logger:
                    error_logger.log_error(categorized_error)
                
                # Re-raise with categorized error
                raise RuntimeError(str(categorized_error)) from e
        
        return wrapper
    return decorator
