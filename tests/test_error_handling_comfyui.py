"""
Tests for ComfyUI Error Handling and Recovery System.

Validates error categorization, guidance, retry logic, and logging.
"""

import pytest
import time
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import Mock, patch

from src.end_to_end.error_handling import (
    ErrorCategory,
    CategorizedError,
    ErrorCategorizer,
    RetryManager,
    ErrorLogger,
    with_error_handling
)


class TestErrorCategory:
    """Test ErrorCategory enum"""
    
    def test_error_categories_exist(self):
        """Test all required error categories are defined"""
        assert ErrorCategory.CONNECTION == "CONNECTION"
        assert ErrorCategory.MODEL == "MODEL"
        assert ErrorCategory.WORKFLOW == "WORKFLOW"
        assert ErrorCategory.GENERATION == "GENERATION"
        assert ErrorCategory.CORS == "CORS"
        assert ErrorCategory.CONFIGURATION == "CONFIGURATION"


class TestCategorizedError:
    """Test CategorizedError dataclass"""
    
    def test_create_categorized_error(self):
        """Test creating a categorized error"""
        error = CategorizedError(
            category=ErrorCategory.CONNECTION,
            message="Connection failed",
            details="Could not connect to localhost:8000",
            recovery_action="Check if ComfyUI is running"
        )
        
        assert error.category == ErrorCategory.CONNECTION
        assert error.message == "Connection failed"
        assert error.details == "Could not connect to localhost:8000"
        assert error.recovery_action == "Check if ComfyUI is running"
        assert isinstance(error.timestamp, datetime)
    
    def test_categorized_error_to_dict(self):
        """Test converting categorized error to dictionary"""
        error = CategorizedError(
            category=ErrorCategory.MODEL,
            message="Model not found",
            details="FLUX Dev model missing",
            recovery_action="Download the model",
            context={"model_name": "FLUX Dev"}
        )
        
        error_dict = error.to_dict()
        
        assert error_dict["category"] == "MODEL"
        assert error_dict["message"] == "Model not found"
        assert error_dict["details"] == "FLUX Dev model missing"
        assert error_dict["recovery_action"] == "Download the model"
        assert "timestamp" in error_dict
        assert error_dict["context"]["model_name"] == "FLUX Dev"
    
    def test_categorized_error_str(self):
        """Test string representation of categorized error"""
        error = CategorizedError(
            category=ErrorCategory.WORKFLOW,
            message="Workflow error",
            details="Node not found",
            recovery_action="Install missing node"
        )
        
        error_str = str(error)
        
        assert "[WORKFLOW]" in error_str
        assert "Workflow error" in error_str
        assert "Node not found" in error_str
        assert "Install missing node" in error_str


class TestErrorCategorizer:
    """Test ErrorCategorizer class"""
    
    def test_categorize_connection_error(self):
        """Test categorizing connection errors"""
        error = ConnectionError("Connection refused")
        
        categorized = ErrorCategorizer.categorize_error(
            error,
            context={"url": "localhost:8000"}
        )
        
        assert categorized.category == ErrorCategory.CONNECTION
        assert "ComfyUI" in categorized.message
        assert "localhost:8000" in categorized.message
        assert "Check if ComfyUI Desktop is running" in categorized.recovery_action
    
    def test_categorize_model_error(self):
        """Test categorizing model errors"""
        error = FileNotFoundError("Model not found: FLUX Dev")
        
        categorized = ErrorCategorizer.categorize_error(
            error,
            context={"model_name": "FLUX Dev"}
        )
        
        assert categorized.category == ErrorCategory.MODEL
        assert "FLUX Dev" in categorized.message
        assert "Download the missing model" in categorized.recovery_action
    
    def test_categorize_workflow_error(self):
        """Test categorizing workflow errors"""
        error = ValueError("Node not found in workflow")
        
        categorized = ErrorCategorizer.categorize_error(
            error,
            context={
                "workflow_name": "flux_basic",
                "missing_node": "FluxSampler"
            }
        )
        
        assert categorized.category == ErrorCategory.WORKFLOW
        assert "flux_basic" in categorized.message
        assert "Install missing custom node" in categorized.recovery_action
        assert "FluxSampler" in categorized.recovery_action
    
    def test_categorize_cors_error(self):
        """Test categorizing CORS errors"""
        error = RuntimeError("CORS policy blocked request")
        
        categorized = ErrorCategorizer.categorize_error(error)
        
        assert categorized.category == ErrorCategory.CORS
        assert "CORS" in categorized.message
        assert "--enable-cors-header" in categorized.recovery_action
    
    def test_categorize_configuration_error(self):
        """Test categorizing configuration errors"""
        error = ValueError("Invalid port number")
        
        categorized = ErrorCategorizer.categorize_error(error)
        
        assert categorized.category == ErrorCategory.CONFIGURATION
        assert "Configuration error" in categorized.message
        assert "Check configuration file" in categorized.recovery_action
    
    def test_categorize_generation_error(self):
        """Test categorizing generation errors (default)"""
        error = RuntimeError("Generation failed")
        
        categorized = ErrorCategorizer.categorize_error(
            error,
            context={"shot_id": "shot_001"}
        )
        
        assert categorized.category == ErrorCategory.GENERATION
        assert "shot_001" in categorized.message
        assert "Check ComfyUI logs" in categorized.recovery_action


class TestRetryManager:
    """Test RetryManager class"""
    
    def test_create_retry_manager(self):
        """Test creating retry manager"""
        retry_mgr = RetryManager(max_retries=3, base_delay=1.0)
        
        assert retry_mgr.max_retries == 3
        assert retry_mgr.base_delay == 1.0
    
    def test_should_retry_initial(self):
        """Test should_retry returns True initially"""
        retry_mgr = RetryManager(max_retries=3)
        
        assert retry_mgr.should_retry("operation_1") is True
    
    def test_should_retry_after_max_attempts(self):
        """Test should_retry returns False after max attempts"""
        retry_mgr = RetryManager(max_retries=2)
        
        retry_mgr.increment_retry("operation_1")
        retry_mgr.increment_retry("operation_1")
        
        assert retry_mgr.should_retry("operation_1") is False
    
    def test_get_retry_count(self):
        """Test getting retry count"""
        retry_mgr = RetryManager()
        
        assert retry_mgr.get_retry_count("operation_1") == 0
        
        retry_mgr.increment_retry("operation_1")
        assert retry_mgr.get_retry_count("operation_1") == 1
        
        retry_mgr.increment_retry("operation_1")
        assert retry_mgr.get_retry_count("operation_1") == 2
    
    def test_increment_retry(self):
        """Test incrementing retry count"""
        retry_mgr = RetryManager()
        
        count = retry_mgr.increment_retry("operation_1")
        assert count == 1
        
        count = retry_mgr.increment_retry("operation_1")
        assert count == 2
    
    def test_reset_retry(self):
        """Test resetting retry count"""
        retry_mgr = RetryManager()
        
        retry_mgr.increment_retry("operation_1")
        retry_mgr.increment_retry("operation_1")
        
        retry_mgr.reset_retry("operation_1")
        
        assert retry_mgr.get_retry_count("operation_1") == 0
    
    def test_get_retry_delay_exponential_backoff(self):
        """Test retry delay uses exponential backoff"""
        retry_mgr = RetryManager(base_delay=1.0)
        
        # First retry: 1.0 * 2^0 = 1.0
        delay1 = retry_mgr.get_retry_delay("operation_1")
        assert delay1 == 1.0
        
        # Second retry: 1.0 * 2^1 = 2.0
        retry_mgr.increment_retry("operation_1")
        delay2 = retry_mgr.get_retry_delay("operation_1")
        assert delay2 == 2.0
        
        # Third retry: 1.0 * 2^2 = 4.0
        retry_mgr.increment_retry("operation_1")
        delay3 = retry_mgr.get_retry_delay("operation_1")
        assert delay3 == 4.0
    
    def test_with_retry_success_on_first_attempt(self):
        """Test with_retry succeeds on first attempt"""
        retry_mgr = RetryManager()
        
        mock_func = Mock(return_value="success")
        
        result = retry_mgr.with_retry(mock_func, "operation_1", "arg1", kwarg1="value1")
        
        assert result == "success"
        assert mock_func.call_count == 1
        assert retry_mgr.get_retry_count("operation_1") == 0  # Reset after success
    
    def test_with_retry_success_after_failures(self):
        """Test with_retry succeeds after some failures"""
        retry_mgr = RetryManager(max_retries=3, base_delay=0.01)
        
        # Fail twice, then succeed
        mock_func = Mock(side_effect=[
            RuntimeError("Fail 1"),
            RuntimeError("Fail 2"),
            "success"
        ])
        
        result = retry_mgr.with_retry(mock_func, "operation_1")
        
        assert result == "success"
        assert mock_func.call_count == 3
    
    def test_with_retry_exhausts_retries(self):
        """Test with_retry raises error after exhausting retries"""
        retry_mgr = RetryManager(max_retries=2, base_delay=0.01)
        
        mock_func = Mock(side_effect=RuntimeError("Always fails"))
        
        with pytest.raises(RuntimeError, match="Always fails"):
            retry_mgr.with_retry(mock_func, "operation_1")
        
        assert mock_func.call_count == 2


class TestErrorLogger:
    """Test ErrorLogger class"""
    
    def test_create_error_logger(self, tmp_path):
        """Test creating error logger"""
        log_dir = tmp_path / "logs"
        
        error_logger = ErrorLogger(
            log_dir=log_dir,
            max_log_size_mb=1,
            max_log_files=3
        )
        
        assert error_logger.log_dir == log_dir
        assert log_dir.exists()
        assert error_logger.max_log_size_bytes == 1 * 1024 * 1024
        assert error_logger.max_log_files == 3
    
    def test_log_error(self, tmp_path):
        """Test logging an error"""
        log_dir = tmp_path / "logs"
        error_logger = ErrorLogger(log_dir=log_dir)
        
        error = CategorizedError(
            category=ErrorCategory.CONNECTION,
            message="Connection failed",
            details="Timeout",
            recovery_action="Retry connection"
        )
        
        error_logger.log_error(error)
        
        # Check log file was created
        log_file = log_dir / "comfyui_errors.log"
        assert log_file.exists()
        
        # Check log content
        with open(log_file, "r") as f:
            log_content = f.read()
        
        assert "CONNECTION" in log_content
        assert "Connection failed" in log_content
        assert "Timeout" in log_content
    
    def test_log_error_with_additional_context(self, tmp_path):
        """Test logging error with additional context"""
        log_dir = tmp_path / "logs"
        error_logger = ErrorLogger(log_dir=log_dir)
        
        error = CategorizedError(
            category=ErrorCategory.MODEL,
            message="Model error",
            details="Missing model",
            recovery_action="Download model"
        )
        
        error_logger.log_error(
            error,
            additional_context={"user": "test_user", "session": "abc123"}
        )
        
        log_file = log_dir / "comfyui_errors.log"
        with open(log_file, "r") as f:
            log_entry = json.loads(f.read())
        
        assert log_entry["additional_context"]["user"] == "test_user"
        assert log_entry["additional_context"]["session"] == "abc123"
    
    def test_get_recent_errors(self, tmp_path):
        """Test getting recent errors from log"""
        log_dir = tmp_path / "logs"
        error_logger = ErrorLogger(log_dir=log_dir)
        
        # Log multiple errors
        for i in range(5):
            error = CategorizedError(
                category=ErrorCategory.GENERATION,
                message=f"Error {i}",
                details=f"Details {i}",
                recovery_action="Retry"
            )
            error_logger.log_error(error)
        
        # Get recent errors
        recent = error_logger.get_recent_errors(count=3)
        
        assert len(recent) == 3
        # Should be in reverse order (most recent first)
        assert recent[0]["message"] == "Error 4"
        assert recent[1]["message"] == "Error 3"
        assert recent[2]["message"] == "Error 2"
    
    def test_get_recent_errors_with_category_filter(self, tmp_path):
        """Test getting recent errors filtered by category"""
        log_dir = tmp_path / "logs"
        error_logger = ErrorLogger(log_dir=log_dir)
        
        # Log errors of different categories
        for i in range(3):
            error = CategorizedError(
                category=ErrorCategory.CONNECTION,
                message=f"Connection error {i}",
                details="Details",
                recovery_action="Retry"
            )
            error_logger.log_error(error)
        
        for i in range(2):
            error = CategorizedError(
                category=ErrorCategory.MODEL,
                message=f"Model error {i}",
                details="Details",
                recovery_action="Download"
            )
            error_logger.log_error(error)
        
        # Get only connection errors
        connection_errors = error_logger.get_recent_errors(
            count=10,
            category=ErrorCategory.CONNECTION
        )
        
        assert len(connection_errors) == 3
        for error in connection_errors:
            assert error["category"] == "CONNECTION"
    
    def test_clear_logs(self, tmp_path):
        """Test clearing all logs"""
        log_dir = tmp_path / "logs"
        error_logger = ErrorLogger(log_dir=log_dir)
        
        # Log some errors
        error = CategorizedError(
            category=ErrorCategory.GENERATION,
            message="Test error",
            details="Details",
            recovery_action="Retry"
        )
        error_logger.log_error(error)
        
        # Verify log file exists
        log_file = log_dir / "comfyui_errors.log"
        assert log_file.exists()
        
        # Clear logs
        error_logger.clear_logs()
        
        # Verify log file is removed
        assert not log_file.exists()


class TestWithErrorHandlingDecorator:
    """Test with_error_handling decorator"""
    
    def test_decorator_without_error(self, tmp_path):
        """Test decorator passes through successful function calls"""
        log_dir = tmp_path / "logs"
        error_logger = ErrorLogger(log_dir=log_dir)
        
        @with_error_handling(error_logger=error_logger)
        def successful_function(x, y):
            return x + y
        
        result = successful_function(2, 3)
        assert result == 5
    
    def test_decorator_with_error_logging(self, tmp_path):
        """Test decorator logs errors"""
        log_dir = tmp_path / "logs"
        error_logger = ErrorLogger(log_dir=log_dir)
        
        @with_error_handling(error_logger=error_logger)
        def failing_function():
            raise ConnectionError("Connection failed")
        
        with pytest.raises(RuntimeError):
            failing_function()
        
        # Check error was logged
        log_file = log_dir / "comfyui_errors.log"
        assert log_file.exists()
        
        with open(log_file, "r") as f:
            log_content = f.read()
        
        assert "CONNECTION" in log_content
    
    def test_decorator_with_retry(self, tmp_path):
        """Test decorator with retry manager"""
        retry_mgr = RetryManager(max_retries=3, base_delay=0.01)
        
        call_count = 0
        
        @with_error_handling(retry_manager=retry_mgr)
        def function_with_retries():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise RuntimeError("Temporary failure")
            return "success"
        
        result = function_with_retries()
        
        assert result == "success"
        assert call_count == 3


class TestErrorHandlingIntegration:
    """Integration tests for error handling system"""
    
    def test_complete_error_handling_flow(self, tmp_path):
        """Test complete error handling flow"""
        log_dir = tmp_path / "logs"
        error_logger = ErrorLogger(log_dir=log_dir)
        retry_mgr = RetryManager(max_retries=2, base_delay=0.01)
        
        # Simulate a function that fails with connection error
        attempt_count = 0
        
        def connect_to_comfyui():
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count < 2:
                raise ConnectionError("Connection refused")
            return "connected"
        
        # Use retry manager
        try:
            result = retry_mgr.with_retry(
                connect_to_comfyui,
                "connect_operation"
            )
            assert result == "connected"
        except Exception as e:
            # Categorize and log error
            categorized = ErrorCategorizer.categorize_error(
                e,
                context={"url": "localhost:8000"}
            )
            error_logger.log_error(categorized)
        
        # Verify error was logged
        recent_errors = error_logger.get_recent_errors(count=1)
        if recent_errors:
            assert recent_errors[0]["category"] == "CONNECTION"
    
    def test_error_recovery_guidance(self):
        """Test error recovery guidance is appropriate"""
        # Connection error
        conn_error = ConnectionError("Connection refused")
        categorized = ErrorCategorizer.categorize_error(conn_error)
        
        assert "Check if ComfyUI Desktop is running" in categorized.recovery_action
        
        # Model error
        model_error = FileNotFoundError("Model not found: FLUX Dev")
        categorized = ErrorCategorizer.categorize_error(
            model_error,
            context={"model_name": "FLUX Dev"}
        )
        
        assert "Download the missing model" in categorized.recovery_action
        assert "FLUX Dev" in categorized.recovery_action
        
        # Workflow error
        workflow_error = ValueError("Node not found in workflow")
        categorized = ErrorCategorizer.categorize_error(
            workflow_error,
            context={"missing_node": "FluxSampler"}
        )
        
        assert "Install missing custom node" in categorized.recovery_action
        assert "FluxSampler" in categorized.recovery_action


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
