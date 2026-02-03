"""
Unit tests for error handling framework.

Tests error categories, retry logic, circuit breaker, and error handling utilities.
"""

import pytest
import time
from unittest.mock import Mock, patch
from src.fact_checker.error_handling import (
    ErrorCategory,
    FactCheckerError,
    ValidationError,
    ProcessingError,
    ConfigurationError,
    SafetyConstraintViolation,
    TimeoutError,
    ResourceError,
    NetworkError,
    RetryConfig,
    with_retry,
    CircuitBreaker,
    handle_error,
    graceful_degradation,
    ErrorLogger
)


class TestErrorCategories:
    """Tests for error category classes."""
    
    def test_fact_checker_error_to_dict(self):
        """Test FactCheckerError converts to dictionary correctly."""
        error = FactCheckerError(
            category=ErrorCategory.PROCESSING_ERROR,
            message="Test error",
            details={"key": "value"},
            request_id="req-123",
            retry_after=60
        )
        error_dict = error.to_dict()
        
        assert error_dict["error"]["code"] == "PROCESSING_ERROR"
        assert error_dict["error"]["message"] == "Test error"
        assert error_dict["error"]["details"]["key"] == "value"
        assert error_dict["request_id"] == "req-123"
        assert error_dict["retry_after"] == 60
    
    def test_validation_error_http_status(self):
        """Test ValidationError returns correct HTTP status."""
        error = ValidationError("Invalid input")
        assert error.get_http_status() == 400
    
    def test_processing_error_http_status(self):
        """Test ProcessingError returns correct HTTP status."""
        error = ProcessingError("Processing failed")
        assert error.get_http_status() == 500
    
    def test_timeout_error_http_status(self):
        """Test TimeoutError returns correct HTTP status."""
        error = TimeoutError("Operation timed out")
        assert error.get_http_status() == 504
    
    def test_resource_error_http_status(self):
        """Test ResourceError returns correct HTTP status."""
        error = ResourceError("Resource exhausted")
        assert error.get_http_status() == 503
    
    def test_network_error_http_status(self):
        """Test NetworkError returns correct HTTP status."""
        error = NetworkError("Network failure")
        assert error.get_http_status() == 502
    
    def test_safety_constraint_violation_http_status(self):
        """Test SafetyConstraintViolation returns correct HTTP status."""
        error = SafetyConstraintViolation("Safety constraint violated")
        assert error.get_http_status() == 403


class TestRetryLogic:
    """Tests for retry logic with exponential backoff."""
    
    def test_retry_succeeds_on_first_attempt(self):
        """Test function succeeds on first attempt without retry."""
        mock_func = Mock(return_value="success")
        
        @with_retry(config=RetryConfig(max_attempts=3))
        def test_func():
            return mock_func()
        
        result = test_func()
        assert result == "success"
        assert mock_func.call_count == 1
    
    def test_retry_succeeds_after_failures(self):
        """Test function succeeds after transient failures."""
        mock_func = Mock(side_effect=[
            NetworkError("Network error"),
            NetworkError("Network error"),
            "success"
        ])
        
        @with_retry(config=RetryConfig(max_attempts=3, initial_delay=0.01))
        def test_func():
            result = mock_func()
            if isinstance(result, Exception):
                raise result
            return result
        
        result = test_func()
        assert result == "success"
        assert mock_func.call_count == 3
    
    def test_retry_exhausts_attempts(self):
        """Test retry exhausts all attempts and raises error."""
        mock_func = Mock(side_effect=NetworkError("Network error"))
        
        @with_retry(config=RetryConfig(max_attempts=3, initial_delay=0.01))
        def test_func():
            raise mock_func()
        
        with pytest.raises(NetworkError):
            test_func()
        
        assert mock_func.call_count == 3
    
    def test_retry_non_retryable_error(self):
        """Test non-retryable error raises immediately without retry."""
        mock_func = Mock(side_effect=ValueError("Invalid value"))
        
        @with_retry(config=RetryConfig(max_attempts=3))
        def test_func():
            raise mock_func()
        
        with pytest.raises(ValueError):
            test_func()
        
        # Should only be called once (no retries for non-retryable errors)
        assert mock_func.call_count == 1
    
    def test_retry_exponential_backoff(self):
        """Test retry uses exponential backoff."""
        call_times = []
        
        def failing_func():
            call_times.append(time.time())
            raise NetworkError("Network error")
        
        @with_retry(config=RetryConfig(
            max_attempts=3,
            initial_delay=0.1,
            exponential_base=2.0,
            jitter=False
        ))
        def test_func():
            failing_func()
        
        with pytest.raises(NetworkError):
            test_func()
        
        # Check that delays increase exponentially
        assert len(call_times) == 3
        delay1 = call_times[1] - call_times[0]
        delay2 = call_times[2] - call_times[1]
        
        # Second delay should be roughly 2x first delay (exponential base = 2)
        assert delay2 > delay1
        assert delay2 >= 0.15  # Should be at least 0.2s (0.1 * 2^1)


class TestCircuitBreaker:
    """Tests for circuit breaker pattern."""
    
    def test_circuit_closed_allows_requests(self):
        """Test circuit in CLOSED state allows requests through."""
        breaker = CircuitBreaker(failure_threshold=3)
        mock_func = Mock(return_value="success")
        
        result = breaker.call(mock_func)
        assert result == "success"
        assert breaker.state == CircuitBreaker.State.CLOSED
    
    def test_circuit_opens_after_threshold(self):
        """Test circuit opens after failure threshold is exceeded."""
        breaker = CircuitBreaker(failure_threshold=3, window_size=10.0)
        mock_func = Mock(side_effect=Exception("Error"))
        
        # Trigger failures to exceed threshold
        for _ in range(3):
            with pytest.raises(Exception):
                breaker.call(mock_func)
        
        assert breaker.state == CircuitBreaker.State.OPEN
    
    def test_circuit_open_rejects_requests(self):
        """Test circuit in OPEN state rejects requests immediately."""
        breaker = CircuitBreaker(failure_threshold=2, window_size=10.0)
        mock_func = Mock(side_effect=Exception("Error"))
        
        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(mock_func)
        
        assert breaker.state == CircuitBreaker.State.OPEN
        
        # Next request should be rejected without calling function
        call_count_before = mock_func.call_count
        with pytest.raises(ResourceError):
            breaker.call(mock_func)
        
        assert mock_func.call_count == call_count_before  # Function not called
    
    def test_circuit_transitions_to_half_open(self):
        """Test circuit transitions to HALF_OPEN after timeout."""
        breaker = CircuitBreaker(
            failure_threshold=2,
            timeout=0.1,  # Short timeout for testing
            window_size=10.0
        )
        mock_func = Mock(side_effect=Exception("Error"))
        
        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(mock_func)
        
        assert breaker.state == CircuitBreaker.State.OPEN
        
        # Wait for timeout
        time.sleep(0.15)
        
        # Next request should transition to HALF_OPEN
        mock_func.side_effect = None
        mock_func.return_value = "success"
        result = breaker.call(mock_func)
        
        assert result == "success"
        # State should be HALF_OPEN or CLOSED depending on success threshold
    
    def test_circuit_closes_after_successes(self):
        """Test circuit closes after success threshold in HALF_OPEN state."""
        breaker = CircuitBreaker(
            failure_threshold=2,
            success_threshold=2,
            timeout=0.1,
            window_size=10.0
        )
        
        # Open the circuit
        mock_func = Mock(side_effect=Exception("Error"))
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(mock_func)
        
        assert breaker.state == CircuitBreaker.State.OPEN
        
        # Wait for timeout
        time.sleep(0.15)
        
        # Succeed enough times to close circuit
        mock_func.side_effect = None
        mock_func.return_value = "success"
        
        for _ in range(2):
            breaker.call(mock_func)
        
        assert breaker.state == CircuitBreaker.State.CLOSED
    
    def test_circuit_reopens_on_failure_in_half_open(self):
        """Test circuit reopens if failure occurs in HALF_OPEN state."""
        breaker = CircuitBreaker(
            failure_threshold=2,
            timeout=0.1,
            window_size=10.0
        )
        
        # Open the circuit
        mock_func = Mock(side_effect=Exception("Error"))
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(mock_func)
        
        assert breaker.state == CircuitBreaker.State.OPEN
        
        # Wait for timeout
        time.sleep(0.15)
        
        # Fail in HALF_OPEN state
        with pytest.raises(Exception):
            breaker.call(mock_func)
        
        assert breaker.state == CircuitBreaker.State.OPEN
    
    def test_circuit_manual_reset(self):
        """Test circuit can be manually reset."""
        breaker = CircuitBreaker(failure_threshold=2, window_size=10.0)
        mock_func = Mock(side_effect=Exception("Error"))
        
        # Open the circuit
        for _ in range(2):
            with pytest.raises(Exception):
                breaker.call(mock_func)
        
        assert breaker.state == CircuitBreaker.State.OPEN
        
        # Manual reset
        breaker.reset()
        
        assert breaker.state == CircuitBreaker.State.CLOSED
        assert breaker.failure_count == 0


class TestHandleError:
    """Tests for error handling utility."""
    
    def test_handle_fact_checker_error(self):
        """Test handling FactCheckerError returns structured response."""
        error = ProcessingError("Processing failed", details={"key": "value"})
        result = handle_error(error)
        
        assert result["error"]["code"] == "PROCESSING_ERROR"
        assert result["error"]["message"] == "Processing failed"
        assert result["error"]["details"]["key"] == "value"
    
    def test_handle_value_error(self):
        """Test handling ValueError converts to ValidationError."""
        error = ValueError("Invalid value")
        result = handle_error(error)
        
        assert result["error"]["code"] == "VALIDATION_ERROR"
        assert "Invalid value" in result["error"]["message"]
    
    def test_handle_generic_exception(self):
        """Test handling generic exception converts to ProcessingError."""
        error = Exception("Generic error")
        result = handle_error(error)
        
        assert result["error"]["code"] == "PROCESSING_ERROR"
        assert "Generic error" in result["error"]["message"]
    
    def test_handle_error_with_context(self):
        """Test handling error includes context in details."""
        error = Exception("Error")
        context = {"request_id": "req-123", "user": "test"}
        result = handle_error(error, context=context)
        
        assert result["error"]["details"]["request_id"] == "req-123"
        assert result["error"]["details"]["user"] == "test"


class TestGracefulDegradation:
    """Tests for graceful degradation decorator."""
    
    def test_graceful_degradation_success(self):
        """Test graceful degradation returns result on success."""
        @graceful_degradation(fallback_value=[], error_message="Failed")
        def test_func():
            return ["success"]
        
        result = test_func()
        assert result == ["success"]
    
    def test_graceful_degradation_failure(self):
        """Test graceful degradation returns fallback on failure."""
        @graceful_degradation(fallback_value=[], error_message="Failed")
        def test_func():
            raise Exception("Error")
        
        result = test_func()
        assert result == []
    
    def test_graceful_degradation_with_different_fallback(self):
        """Test graceful degradation with different fallback value."""
        @graceful_degradation(fallback_value={"default": True}, error_message="Failed")
        def test_func():
            raise Exception("Error")
        
        result = test_func()
        assert result == {"default": True}


class TestErrorLogger:
    """Tests for structured error logger."""
    
    @patch('src.fact_checker.error_handling.logger')
    def test_log_error_basic(self, mock_logger):
        """Test basic error logging."""
        error = Exception("Test error")
        ErrorLogger.log_error(error)
        
        # Verify logger was called
        assert mock_logger.error.called
    
    @patch('src.fact_checker.error_handling.logger')
    def test_log_error_with_metadata(self, mock_logger):
        """Test error logging with metadata."""
        error = ProcessingError("Processing failed")
        error_data = ErrorLogger.log_error(
            error,
            request_id="req-123",
            input_hash="hash-456",
            agent="scientific_audit",
            processing_time_ms=1500.0,
            retry_count=2
        )
        
        assert error_data["request_id"] == "req-123"
        assert error_data["input_hash"] == "hash-456"
        assert error_data["agent"] == "scientific_audit"
        assert error_data["processing_time_ms"] == 1500.0
        assert error_data["retry_count"] == 2
        assert error_data["error_category"] == "PROCESSING_ERROR"
    
    @patch('src.fact_checker.error_handling.logger')
    def test_log_error_with_context(self, mock_logger):
        """Test error logging with additional context."""
        error = Exception("Test error")
        context = {"custom_field": "custom_value"}
        error_data = ErrorLogger.log_error(
            error,
            additional_context=context
        )
        
        assert error_data["context"]["custom_field"] == "custom_value"


class TestRetryConfig:
    """Tests for RetryConfig class."""
    
    def test_default_config(self):
        """Test default retry configuration."""
        config = RetryConfig()
        assert config.max_attempts == 3
        assert config.initial_delay == 1.0
        assert config.max_delay == 60.0
        assert config.exponential_base == 2.0
        assert config.jitter is True
    
    def test_custom_config(self):
        """Test custom retry configuration."""
        config = RetryConfig(
            max_attempts=5,
            initial_delay=2.0,
            max_delay=120.0,
            exponential_base=3.0,
            jitter=False
        )
        assert config.max_attempts == 5
        assert config.initial_delay == 2.0
        assert config.max_delay == 120.0
        assert config.exponential_base == 3.0
        assert config.jitter is False
