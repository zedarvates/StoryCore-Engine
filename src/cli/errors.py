"""
Centralized error handling for StoryCore-Engine CLI.
Provides consistent error categorization, formatting, and logging.
"""

import logging
import sys
from typing import Optional


class CLIError(Exception):
    """Base exception for CLI errors with optional suggestions."""
    
    def __init__(self, message: str, suggestion: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.suggestion = suggestion


class UserError(CLIError):
    """User input errors - invalid arguments, missing files, etc."""
    pass


class SystemError(CLIError):
    """System errors - engine failures, I/O errors, permission issues."""
    pass


class ConfigurationError(CLIError):
    """Configuration errors - invalid config files, missing settings."""
    pass


class ErrorHandler:
    """Centralized error handling with consistent user experience."""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def handle_exception(self, exc: Exception, context: str) -> int:
        """Handle exception and return appropriate exit code."""
        if isinstance(exc, UserError):
            return self._handle_user_error(exc, context)
        elif isinstance(exc, SystemError):
            return self._handle_system_error(exc, context)
        elif isinstance(exc, ConfigurationError):
            return self._handle_config_error(exc, context)
        else:
            return self._handle_unknown_error(exc, context)
    
    def _handle_user_error(self, error: UserError, context: str) -> int:
        """Handle user errors with helpful messages."""
        print(f"✗ {error.message}", file=sys.stderr)
        if error.suggestion:
            print(f"💡 {error.suggestion}", file=sys.stderr)
        
        self.logger.info(f"User error in {context}: {error.message}")
        return 1
    
    def _handle_system_error(self, error: SystemError, context: str) -> int:
        """Handle system errors with technical details."""
        print(f"✗ System error: {error.message}", file=sys.stderr)
        if error.suggestion:
            print(f"💡 {error.suggestion}", file=sys.stderr)
        
        self.logger.error(f"System error in {context}: {error.message}")
        return 2
    
    def _handle_config_error(self, error: ConfigurationError, context: str) -> int:
        """Handle configuration errors with validation details."""
        print(f"✗ Configuration error: {error.message}", file=sys.stderr)
        if error.suggestion:
            print(f"💡 {error.suggestion}", file=sys.stderr)
        
        self.logger.warning(f"Configuration error in {context}: {error.message}")
        return 3
    
    def _handle_unknown_error(self, error: Exception, context: str) -> int:
        """Handle unexpected errors with debugging info."""
        print(f"✗ Unexpected error: {error}", file=sys.stderr)
        print("💡 Please report this issue with the command you ran", file=sys.stderr)
        
        self.logger.error(f"Unexpected error in {context}: {error}", exc_info=True)
        return 2
    
    def format_error_message(self, error: CLIError) -> str:
        """Format error message for display."""
        message = f"✗ {error.message}"
        if error.suggestion:
            message += f"\n💡 {error.suggestion}"
        return message
    
    def log_error(self, error: Exception, context: str) -> None:
        """Log error with appropriate level."""
        if isinstance(error, UserError):
            self.logger.info(f"User error in {context}: {error}")
        elif isinstance(error, ConfigurationError):
            self.logger.warning(f"Configuration error in {context}: {error}")
        elif isinstance(error, (SystemError, Exception)):
            self.logger.error(f"Error in {context}: {error}", exc_info=True)