"""
Unit tests for the Feedback Error Logger module.

Tests the error logging system including:
- Log file creation and rotation
- Error logging with context and stacktraces
- Specialized error logging methods
- Log file reading
"""

import unittest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import time

from src.feedback_error_logger import (
    FeedbackErrorLogger,
    log_error,
    log_validation_error,
    log_network_error,
    log_storage_error,
    log_diagnostic_error,
    log_github_api_error
)


class TestFeedbackErrorLogger(unittest.TestCase):
    """Test cases for FeedbackErrorLogger."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create a temporary directory for test logs
        self.test_log_dir = tempfile.mkdtemp()
        
        # Reset the logger singleton for each test
        FeedbackErrorLogger._logger = None
        FeedbackErrorLogger._log_file_path = None
    
    def tearDown(self):
        """Clean up test fixtures."""
        # Close all handlers before cleanup
        FeedbackErrorLogger.close_handlers()
        
        # Small delay to ensure file handles are released on Windows
        import time
        time.sleep(0.1)
        
        # Remove temporary log directory
        if Path(self.test_log_dir).exists():
            try:
                shutil.rmtree(self.test_log_dir)
            except PermissionError:
                # On Windows, sometimes files are still locked
                # Try again after a short delay
                time.sleep(0.2)
                try:
                    shutil.rmtree(self.test_log_dir)
                except Exception:
                    # If still fails, just skip cleanup
                    pass
        
        # Reset logger singleton
        FeedbackErrorLogger._logger = None
        FeedbackErrorLogger._log_file_path = None
    
    def test_logger_initialization(self):
        """Test that logger is properly initialized."""
        logger = FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Check logger exists
        self.assertIsNotNone(logger)
        self.assertEqual(logger.name, "feedback_errors")
        
        # Check log file was created
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        self.assertIsNotNone(log_file_path)
        self.assertTrue(log_file_path.exists())
        self.assertEqual(log_file_path.name, "feedback_errors.log")
    
    def test_logger_singleton(self):
        """Test that logger follows singleton pattern."""
        logger1 = FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        logger2 = FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Should return the same instance
        self.assertIs(logger1, logger2)
    
    def test_basic_error_logging(self):
        """Test basic error logging with context."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Log an error
        log_error(
            error_type="TestError",
            message="Test error message",
            context={"test_id": "001", "component": "test"}
        )
        
        # Read log file
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # Verify log content
        self.assertIn("TestError", log_content)
        self.assertIn("Test error message", log_content)
        self.assertIn("test_id=001", log_content)
        self.assertIn("component=test", log_content)
    
    def test_error_logging_with_exception(self):
        """Test error logging with exception and stacktrace."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Create and log an exception
        try:
            raise ValueError("Test exception")
        except Exception as e:
            log_error(
                error_type="ExceptionTest",
                message="Exception occurred",
                exception=e,
                include_stacktrace=True
            )
        
        # Read log file
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # Verify exception details are logged
        self.assertIn("ExceptionTest", log_content)
        self.assertIn("Exception occurred", log_content)
        self.assertIn("ValueError", log_content)
        self.assertIn("Test exception", log_content)
        self.assertIn("Traceback", log_content)
    
    def test_validation_error_logging(self):
        """Test validation error logging."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Log validation error
        log_validation_error(
            field="screenshot",
            value="/path/to/file.txt",
            reason="Invalid format",
            context={"max_size": 5}
        )
        
        # Read log file
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # Verify validation error details
        self.assertIn("ValidationError", log_content)
        self.assertIn("screenshot", log_content)
        self.assertIn("Invalid format", log_content)
    
    def test_network_error_logging(self):
        """Test network error logging."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Create and log network error
        try:
            raise ConnectionError("Connection failed")
        except Exception as e:
            log_network_error(
                operation="submit_report",
                url="http://example.com/api",
                error=e,
                context={"retry_count": 3}
            )
        
        # Read log file
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # Verify network error details
        self.assertIn("NetworkError", log_content)
        self.assertIn("submit_report", log_content)
        self.assertIn("http://example.com/api", log_content)
        self.assertIn("ConnectionError", log_content)
    
    def test_storage_error_logging(self):
        """Test storage error logging."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Create and log storage error
        try:
            raise IOError("Permission denied")
        except Exception as e:
            log_storage_error(
                operation="save",
                file_path="/path/to/report.json",
                error=e,
                context={"report_id": "test_001"}
            )
        
        # Read log file
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # Verify storage error details
        self.assertIn("StorageError", log_content)
        self.assertIn("save", log_content)
        self.assertIn("/path/to/report.json", log_content)
        self.assertIn("OSError", log_content)
    
    def test_diagnostic_error_logging(self):
        """Test diagnostic error logging."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Create and log diagnostic error
        try:
            raise RuntimeError("Component unavailable")
        except Exception as e:
            log_diagnostic_error(
                component="memory",
                error=e,
                context={"fallback": "minimal"}
            )
        
        # Read log file
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # Verify diagnostic error details
        self.assertIn("DiagnosticError", log_content)
        self.assertIn("memory", log_content)
        self.assertIn("RuntimeError", log_content)
    
    def test_github_api_error_logging(self):
        """Test GitHub API error logging."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Log GitHub API error
        log_github_api_error(
            operation="create_issue",
            status_code=403,
            response_text='{"message": "Rate limit exceeded"}',
            context={"repository": "test/repo"}
        )
        
        # Read log file
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # Verify GitHub API error details
        self.assertIn("GitHubAPIError", log_content)
        self.assertIn("create_issue", log_content)
        self.assertIn("403", log_content)
        self.assertIn("Rate limit exceeded", log_content)
    
    def test_get_recent_errors(self):
        """Test reading recent errors from log file."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Log multiple errors
        for i in range(5):
            log_error(
                error_type="TestError",
                message=f"Test error {i}",
                context={"index": i}
            )
        
        # Get recent errors
        recent_errors = FeedbackErrorLogger.get_recent_errors(max_lines=10)
        
        # Verify we got errors back
        self.assertGreater(len(recent_errors), 0)
        
        # Verify content
        log_content = "\n".join(recent_errors)
        self.assertIn("TestError", log_content)
    
    def test_log_file_format(self):
        """Test that log entries have correct format."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Log an error
        log_error(
            error_type="FormatTest",
            message="Testing log format",
            context={"key": "value"}
        )
        
        # Read log file
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_lines = f.readlines()
        
        # Get first log line
        self.assertGreater(len(log_lines), 0)
        first_line = log_lines[0]
        
        # Verify format: YYYY-MM-DD HH:MM:SS - LEVEL - NAME - MESSAGE
        # Example: 2026-01-26 07:37:57 - ERROR - feedback_errors - [FormatTest] ...
        parts = first_line.split(" - ", 3)
        self.assertEqual(len(parts), 4)
        
        # Verify timestamp format
        timestamp_str = parts[0]
        try:
            datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            self.fail(f"Invalid timestamp format: {timestamp_str}")
        
        # Verify level
        self.assertEqual(parts[1], "ERROR")
        
        # Verify logger name
        self.assertEqual(parts[2], "feedback_errors")
        
        # Verify message contains error type
        self.assertIn("FormatTest", parts[3])
    
    def test_value_truncation(self):
        """Test that long values are truncated in validation errors."""
        # Initialize logger with test directory
        FeedbackErrorLogger.get_logger(log_dir=self.test_log_dir)
        
        # Create a very long value
        long_value = "x" * 200
        
        # Log validation error with long value
        log_validation_error(
            field="test_field",
            value=long_value,
            reason="Too long"
        )
        
        # Read log file
        log_file_path = FeedbackErrorLogger.get_log_file_path()
        with open(log_file_path, 'r', encoding='utf-8') as f:
            log_content = f.read()
        
        # Verify value was truncated (should end with ...)
        self.assertIn("xxx...", log_content)
        # Verify full value is not in log
        self.assertNotIn(long_value, log_content)


if __name__ == "__main__":
    # Run tests
    unittest.main(verbosity=2)
