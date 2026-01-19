"""
Unit tests for CLI error handling system.
Tests error categorization, formatting, and logging.
"""

import logging
import pytest
import sys
from io import StringIO
from pathlib import Path
from unittest.mock import Mock, patch

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.errors import (
    CLIError,
    UserError,
    SystemError,
    ConfigurationError,
    ErrorHandler
)


class TestCLIErrorClasses:
    """Test cases for CLI error classes."""
    
    def test_cli_error_basic(self):
        """Test basic CLIError creation."""
        error = CLIError("Test message")
        
        assert str(error) == "Test message"
        assert error.message == "Test message"
        assert error.suggestion is None
    
    def test_cli_error_with_suggestion(self):
        """Test CLIError with suggestion."""
        error = CLIError("Test message", "Test suggestion")
        
        assert error.message == "Test message"
        assert error.suggestion == "Test suggestion"
    
    def test_user_error(self):
        """Test UserError creation."""
        error = UserError("Invalid argument", "Check the command syntax")
        
        assert isinstance(error, CLIError)
        assert error.message == "Invalid argument"
        assert error.suggestion == "Check the command syntax"
    
    def test_system_error(self):
        """Test SystemError creation."""
        error = SystemError("Engine failure", "Check system logs")
        
        assert isinstance(error, CLIError)
        assert error.message == "Engine failure"
        assert error.suggestion == "Check system logs"
    
    def test_configuration_error(self):
        """Test ConfigurationError creation."""
        error = ConfigurationError("Invalid config", "Check config file syntax")
        
        assert isinstance(error, CLIError)
        assert error.message == "Invalid config"
        assert error.suggestion == "Check config file syntax"


class TestErrorHandler:
    """Test cases for ErrorHandler class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.logger = logging.getLogger("test")
        self.handler = ErrorHandler(self.logger)
    
    def test_initialization(self):
        """Test ErrorHandler initialization."""
        assert self.handler.logger is self.logger
    
    @patch('sys.stderr', new_callable=StringIO)
    def test_handle_user_error(self, mock_stderr):
        """Test handling of user errors."""
        error = UserError("Test user error", "Test suggestion")
        
        exit_code = self.handler.handle_exception(error, "test_context")
        
        assert exit_code == 1
        output = mock_stderr.getvalue()
        assert "Test user error" in output
        assert "Test suggestion" in output
    
    @patch('sys.stderr', new_callable=StringIO)
    def test_handle_system_error(self, mock_stderr):
        """Test handling of system errors."""
        error = SystemError("Test system error", "Test suggestion")
        
        exit_code = self.handler.handle_exception(error, "test_context")
        
        assert exit_code == 2
        output = mock_stderr.getvalue()
        assert "System error" in output
        assert "Test system error" in output
    
    @patch('sys.stderr', new_callable=StringIO)
    def test_handle_configuration_error(self, mock_stderr):
        """Test handling of configuration errors."""
        error = ConfigurationError("Test config error", "Test suggestion")
        
        exit_code = self.handler.handle_exception(error, "test_context")
        
        assert exit_code == 3
        output = mock_stderr.getvalue()
        assert "Configuration error" in output
        assert "Test config error" in output
    
    @patch('sys.stderr', new_callable=StringIO)
    def test_handle_unknown_error(self, mock_stderr):
        """Test handling of unknown errors."""
        error = Exception("Test unknown error")
        
        exit_code = self.handler.handle_exception(error, "test_context")
        
        assert exit_code == 2
        output = mock_stderr.getvalue()
        assert "Unexpected error" in output
        assert "Test unknown error" in output
    
    def test_format_error_message_basic(self):
        """Test error message formatting without suggestion."""
        error = CLIError("Test message")
        
        formatted = self.handler.format_error_message(error)
        
        assert "✗" in formatted
        assert "Test message" in formatted
    
    def test_format_error_message_with_suggestion(self):
        """Test error message formatting with suggestion."""
        error = CLIError("Test message", "Test suggestion")
        
        formatted = self.handler.format_error_message(error)
        
        assert "✗" in formatted
        assert "Test message" in formatted
        assert "💡" in formatted
        assert "Test suggestion" in formatted
    
    def test_log_error_user_error(self, caplog):
        """Test logging of user errors."""
        error = UserError("Test user error")
        
        with caplog.at_level(logging.INFO):
            self.handler.log_error(error, "test_context")
        
        assert "User error" in caplog.text
        assert "test_context" in caplog.text
    
    def test_log_error_system_error(self, caplog):
        """Test logging of system errors."""
        error = SystemError("Test system error")
        
        with caplog.at_level(logging.ERROR):
            self.handler.log_error(error, "test_context")
        
        assert "Error" in caplog.text
        assert "test_context" in caplog.text
    
    def test_log_error_configuration_error(self, caplog):
        """Test logging of configuration errors."""
        error = ConfigurationError("Test config error")
        
        with caplog.at_level(logging.WARNING):
            self.handler.log_error(error, "test_context")
        
        assert "Configuration error" in caplog.text
        assert "test_context" in caplog.text


class TestErrorHandlerIntegration:
    """Integration tests for error handler."""
    
    def test_error_categorization(self):
        """Test that errors are correctly categorized."""
        logger = logging.getLogger("test")
        handler = ErrorHandler(logger)
        
        # Test each error type returns correct exit code
        user_error = UserError("Test")
        assert handler.handle_exception(user_error, "test") == 1
        
        system_error = SystemError("Test")
        assert handler.handle_exception(system_error, "test") == 2
        
        config_error = ConfigurationError("Test")
        assert handler.handle_exception(config_error, "test") == 3
        
        unknown_error = Exception("Test")
        assert handler.handle_exception(unknown_error, "test") == 2
    
    @patch('sys.stderr', new_callable=StringIO)
    def test_consistent_error_formatting(self, mock_stderr):
        """Test that all errors have consistent formatting."""
        logger = logging.getLogger("test")
        handler = ErrorHandler(logger)
        
        errors = [
            UserError("User error", "User suggestion"),
            SystemError("System error", "System suggestion"),
            ConfigurationError("Config error", "Config suggestion")
        ]
        
        for error in errors:
            mock_stderr.truncate(0)
            mock_stderr.seek(0)
            
            handler.handle_exception(error, "test")
            output = mock_stderr.getvalue()
            
            # All errors should have consistent formatting
            assert "✗" in output
            assert error.message in output
            if error.suggestion:
                assert "💡" in output
                assert error.suggestion in output
    
    def test_error_logging_levels(self, caplog):
        """Test that errors are logged at appropriate levels."""
        logger = logging.getLogger("test")
        handler = ErrorHandler(logger)
        
        # User errors logged at INFO
        with caplog.at_level(logging.INFO):
            handler.log_error(UserError("Test"), "test")
            assert any(record.levelname == "INFO" for record in caplog.records)
        
        caplog.clear()
        
        # System errors logged at ERROR
        with caplog.at_level(logging.ERROR):
            handler.log_error(SystemError("Test"), "test")
            assert any(record.levelname == "ERROR" for record in caplog.records)
        
        caplog.clear()
        
        # Configuration errors logged at WARNING
        with caplog.at_level(logging.WARNING):
            handler.log_error(ConfigurationError("Test"), "test")
            assert any(record.levelname == "WARNING" for record in caplog.records)


class TestErrorRecoveryStrategies:
    """Test error recovery and graceful degradation."""
    
    def test_error_with_helpful_suggestion(self):
        """Test that errors provide helpful suggestions."""
        error = UserError(
            "Project directory not found",
            "Check the project path or create a new project with 'storycore init'"
        )
        
        assert error.suggestion is not None
        assert "storycore init" in error.suggestion
    
    def test_error_context_preservation(self):
        """Test that error context is preserved."""
        logger = logging.getLogger("test")
        handler = ErrorHandler(logger)
        
        error = SystemError("Test error")
        context = "command 'test'"
        
        # Context should be used in logging
        with patch.object(logger, 'error') as mock_log:
            handler.log_error(error, context)
            mock_log.assert_called_once()
            call_args = str(mock_log.call_args)
            assert context in call_args


class TestErrorHandlerEdgeCases:
    """Test edge cases and error conditions."""
    
    def test_error_without_message(self):
        """Test handling of errors without messages."""
        logger = logging.getLogger("test")
        handler = ErrorHandler(logger)
        
        error = Exception()
        exit_code = handler.handle_exception(error, "test")
        
        assert exit_code == 2  # Should still return system error code
    
    def test_error_with_empty_suggestion(self):
        """Test error with empty suggestion."""
        error = CLIError("Test message", "")
        
        assert error.suggestion == ""
        assert error.message == "Test message"
    
    def test_nested_error_handling(self):
        """Test handling of nested exceptions."""
        logger = logging.getLogger("test")
        handler = ErrorHandler(logger)
        
        try:
            try:
                raise ValueError("Inner error")
            except ValueError as e:
                raise SystemError("Outer error") from e
        except SystemError as e:
            exit_code = handler.handle_exception(e, "test")
            assert exit_code == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
