"""
Error Handling Framework

This module provides structured error handling with error categories,
retry logic with exponential backoff, and circuit breaker pattern.

Requirements: 6.8
"""

import time
import logging
from typing import Any, Callable, Dict, Optional, TypeVar, Union
from enum import Enum
from datetime import datetime, timedelta
from functools import wraps


# Configure logging
logger = logging.getLogger(__name__)


class ErrorCategory(str, Enum):
    """Error categories for structured error handling."""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    PROCESSING_ERROR = "PROCESSING_ERROR"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
    SAFETY_CONSTRAINT_VIOLATION = "SAFETY_CONSTRAINT_VIOLATION"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
    RESOURCE_ERROR = "RESOURCE_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"


class FactCheckerError(Exception):
    """
    Base exception for fact-checking system errors.
    
    Attributes:
        category: Error category
        message: Error message
        details: Additional error details
        request_id: Optional request identifier
        retry_after: Optional retry delay in seconds
    """
    def __init__(
        self,
        category: ErrorCategory,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        retry_after: Optional[int] = None
    ):
        self.category = category
        self.message = message
        self.details = details or {}
        self.request_id = request_id
        self.retry_after = retry_after
        super().__init__(message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Converts error to dictionary format for API responses."""
        error_dict = {
            "error": {
                "code": self.category.value,
                "message": self.message
            }
        }
        
        if self.details:
            error_dict["error"]["details"] = self.details
        
        if self.request_id:
            error_dict["request_id"] = self.request_id
        
        if self.retry_after:
            error_dict["retry_after"] = self.retry_after
        
        return error_dict
    
    def get_http_status(self) -> int:
        """Returns appropriate HTTP status code for the error."""
        status_map = {
            ErrorCategory.VALIDATION_ERROR: 400,
            ErrorCategory.PROCESSING_ERROR: 500,
            ErrorCategory.CONFIGURATION_ERROR: 500,
            ErrorCategory.SAFETY_CONSTRAINT_VIOLATION: 403,
            ErrorCategory.TIMEOUT_ERROR: 504,
            ErrorCategory.RESOURCE_ERROR: 503,
            ErrorCategory.NETWORK_ERROR: 502
        }
        return status_map.get(self.category, 500)


class ValidationError(FactCheckerError):
    """Error raised for input validation failures."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            category=ErrorCategory.VALIDATION_ERROR,
            message=message,
            details=details
        )


class ProcessingError(FactCheckerError):
    """Error raised for processing failures."""
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        retry_after: Optional[int] = None
    ):
        super().__init__(
            category=ErrorCategory.PROCESSING_ERROR,
            message=message,
            details=details,
            request_id=request_id,
            retry_after=retry_after
        )


class ConfigurationError(FactCheckerError):
    """Error raised for configuration issues."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            category=ErrorCategory.CONFIGURATION_ERROR,
            message=message,
            details=details
        )


class SafetyConstraintViolation(FactCheckerError):
    """Error raised when safety constraints are violated."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            category=ErrorCategory.SAFETY_CONSTRAINT_VIOLATION,
            message=message,
            details=details
        )


class TimeoutError(FactCheckerError):
    """Error raised when operations timeout."""
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        retry_after: Optional[int] = None
    ):
        super().__init__(
            category=ErrorCategory.TIMEOUT_ERROR,
            message=message,
            details=details,
            retry_after=retry_after
        )


class ResourceError(FactCheckerError):
    """Error raised for resource exhaustion."""
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        retry_after: Optional[int] = None
    ):
        super().__init__(
            category=ErrorCategory.RESOURCE_ERROR,
            message=message,
            details=details,
            retry_after=retry_after
        )


class NetworkError(FactCheckerError):
    """Error raised for network-related failures."""
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        retry_after: Optional[int] = None
    ):
        super().__init__(
            category=ErrorCategory.NETWORK_ERROR,
            message=message,
            details=details,
            retry_after=retry_after
        )


# Type variable for generic retry decorator
T = TypeVar('T')


class RetryConfig:
    """
    Configuration for retry logic.
    
    Attributes:
        max_attempts: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential backoff
        jitter: Whether to add random jitter to delays
    """
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter


def with_retry(
    config: Optional[RetryConfig] = None,
    retryable_errors: Optional[tuple] = None
) -> Callable:
    """
    Decorator that adds retry logic with exponential backoff.
    
    Args:
        config: Retry configuration
        retryable_errors: Tuple of exception types to retry on
        
    Returns:
        Decorated function with retry logic
        
    Example:
        @with_retry(config=RetryConfig(max_attempts=3))
        def fetch_evidence(claim):
            # Function that may fail transiently
            pass
    """
    if config is None:
        config = RetryConfig()
    
    if retryable_errors is None:
        retryable_errors = (NetworkError, TimeoutError, ResourceError)
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(config.max_attempts):
                try:
                    return func(*args, **kwargs)
                except retryable_errors as e:
                    last_exception = e
                    
                    if attempt < config.max_attempts - 1:
                        # Calculate delay with exponential backoff
                        delay = min(
                            config.initial_delay * (config.exponential_base ** attempt),
                            config.max_delay
                        )
                        
                        # Add jitter if enabled
                        if config.jitter:
                            import random
                            delay *= (0.5 + random.random())
                        
                        logger.warning(
                            f"Attempt {attempt + 1}/{config.max_attempts} failed for {func.__name__}. "
                            f"Retrying in {delay:.2f}s. Error: {str(e)}"
                        )
                        
                        time.sleep(delay)
                    else:
                        logger.error(
                            f"All {config.max_attempts} attempts failed for {func.__name__}. "
                            f"Final error: {str(e)}"
                        )
                except Exception as e:
                    # Non-retryable error, raise immediately
                    logger.error(f"Non-retryable error in {func.__name__}: {str(e)}")
                    raise
            
            # All retries exhausted
            if last_exception:
                raise last_exception
            
            raise ProcessingError(
                message=f"Function {func.__name__} failed after {config.max_attempts} attempts",
                details={"function": func.__name__, "attempts": config.max_attempts}
            )
        
        return wrapper
    return decorator


class CircuitBreaker:
    """
    Circuit breaker pattern implementation.
    
    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Failure threshold exceeded, requests fail immediately
    - HALF_OPEN: Testing if service recovered, limited requests allowed
    
    Attributes:
        failure_threshold: Number of failures before opening circuit
        success_threshold: Number of successes to close circuit from half-open
        timeout: Time in seconds before attempting recovery
        window_size: Time window for counting failures
    """
    
    class State(str, Enum):
        CLOSED = "closed"
        OPEN = "open"
        HALF_OPEN = "half_open"
    
    def __init__(
        self,
        failure_threshold: int = 5,
        success_threshold: int = 2,
        timeout: float = 60.0,
        window_size: float = 60.0
    ):
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout = timeout
        self.window_size = window_size
        
        self.state = self.State.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.opened_at: Optional[datetime] = None
        self.failures_in_window: list = []
    
    def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """
        Executes function with circuit breaker protection.
        
        Args:
            func: Function to execute
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function
            
        Returns:
            Function result
            
        Raises:
            ResourceError: If circuit is open
        """
        # Check if circuit should transition to half-open
        if self.state == self.State.OPEN:
            if self._should_attempt_reset():
                self.state = self.State.HALF_OPEN
                self.success_count = 0
                logger.info("Circuit breaker transitioning to HALF_OPEN state")
            else:
                raise ResourceError(
                    message="Circuit breaker is OPEN",
                    details={
                        "state": self.state.value,
                        "failure_count": self.failure_count,
                        "opened_at": self.opened_at.isoformat() if self.opened_at else None
                    },
                    retry_after=int(self.timeout)
                )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _should_attempt_reset(self) -> bool:
        """Checks if enough time has passed to attempt reset."""
        if not self.opened_at:
            return False
        
        elapsed = (datetime.now() - self.opened_at).total_seconds()
        return elapsed >= self.timeout
    
    def _on_success(self):
        """Handles successful execution."""
        if self.state == self.State.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self._close_circuit()
        elif self.state == self.State.CLOSED:
            # Reset failure count on success
            self.failure_count = 0
            self.failures_in_window = []
    
    def _on_failure(self):
        """Handles failed execution."""
        now = datetime.now()
        self.last_failure_time = now
        
        # Add failure to window
        self.failures_in_window.append(now)
        
        # Remove old failures outside window
        cutoff = now - timedelta(seconds=self.window_size)
        self.failures_in_window = [
            f for f in self.failures_in_window if f > cutoff
        ]
        
        # Count failures in window
        self.failure_count = len(self.failures_in_window)
        
        # Check if threshold exceeded
        if self.state == self.State.HALF_OPEN:
            # Any failure in half-open state reopens circuit
            self._open_circuit()
        elif self.failure_count >= self.failure_threshold:
            self._open_circuit()
    
    def _open_circuit(self):
        """Opens the circuit."""
        self.state = self.State.OPEN
        self.opened_at = datetime.now()
        logger.warning(
            f"Circuit breaker OPENED after {self.failure_count} failures "
            f"in {self.window_size}s window"
        )
    
    def _close_circuit(self):
        """Closes the circuit."""
        self.state = self.State.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.failures_in_window = []
        self.opened_at = None
        logger.info("Circuit breaker CLOSED - service recovered")
    
    def reset(self):
        """Manually resets the circuit breaker."""
        self._close_circuit()
        logger.info("Circuit breaker manually reset")


def handle_error(
    error: Exception,
    context: Optional[Dict[str, Any]] = None,
    log_level: str = "error"
) -> Dict[str, Any]:
    """
    Handles errors and returns structured error response.
    
    Args:
        error: Exception to handle
        context: Additional context information
        log_level: Logging level (debug, info, warning, error, critical)
        
    Returns:
        Structured error response dictionary
    """
    context = context or {}
    
    # Convert to FactCheckerError if not already
    if isinstance(error, FactCheckerError):
        fact_error = error
    elif isinstance(error, ValueError):
        fact_error = ValidationError(
            message=str(error),
            details=context
        )
    elif isinstance(error, Exception):
        fact_error = ProcessingError(
            message=str(error),
            details=context
        )
    else:
        fact_error = ProcessingError(
            message="Unknown error occurred",
            details={"original_error": str(error), **context}
        )
    
    # Log the error
    log_message = f"{fact_error.category.value}: {fact_error.message}"
    if context:
        log_message += f" | Context: {context}"
    
    log_func = getattr(logger, log_level, logger.error)
    log_func(log_message)
    
    # Return structured response
    return fact_error.to_dict()


def graceful_degradation(
    fallback_value: T,
    error_message: str = "Operation failed, using fallback"
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator that provides graceful degradation on errors.
    
    Args:
        fallback_value: Value to return on error
        error_message: Message to log on error
        
    Returns:
        Decorator function
        
    Example:
        @graceful_degradation(fallback_value=[], error_message="Evidence retrieval failed")
        def retrieve_evidence(claim):
            # Function that may fail
            pass
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.warning(
                    f"{error_message}: {str(e)}. "
                    f"Returning fallback value for {func.__name__}"
                )
                return fallback_value
        
        return wrapper
    
    return decorator


class ErrorLogger:
    """
    Structured error logger for monitoring and debugging.
    
    Logs errors with metadata for analysis and monitoring.
    """
    
    @staticmethod
    def log_error(
        error: Exception,
        request_id: Optional[str] = None,
        input_hash: Optional[str] = None,
        agent: Optional[str] = None,
        processing_time_ms: Optional[float] = None,
        retry_count: int = 0,
        additional_context: Optional[Dict[str, Any]] = None
    ):
        """
        Logs error with structured metadata.
        
        Args:
            error: Exception that occurred
            request_id: Request identifier
            input_hash: Hash of input data
            agent: Agent that encountered the error
            processing_time_ms: Processing time before error
            retry_count: Number of retries attempted
            additional_context: Additional context information
        """
        error_data = {
            "timestamp": datetime.now().isoformat(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "request_id": request_id,
            "input_hash": input_hash,
            "agent": agent,
            "processing_time_ms": processing_time_ms,
            "retry_count": retry_count
        }
        
        if isinstance(error, FactCheckerError):
            error_data["error_category"] = error.category.value
            error_data["error_code"] = error.category.value
            if error.details:
                error_data["details"] = error.details
        
        if additional_context:
            error_data["context"] = additional_context
        
        logger.error(f"Structured error log: {error_data}")
        
        return error_data
