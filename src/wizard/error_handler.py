"""
Error Handler for Interactive Project Setup Wizard (MVP)

This module provides error handling for wizard operations with
clear user messages and recovery options.
"""

import os
import sys
from pathlib import Path
from typing import Optional, Any
from .input_handler import display_error, display_message


class WizardError(Exception):
    """Base exception for wizard errors"""
    pass


class ValidationError(WizardError):
    """Exception for validation errors"""
    pass


class FileSystemError(WizardError):
    """Exception for file system errors"""
    pass


class ErrorHandler:
    """
    Handles errors in the wizard with user-friendly messages (MVP version)
    
    Simplified for MVP - basic error handling with clear messages.
    """
    
    @staticmethod
    def handle_validation_error(error: Exception, context: str = "") -> bool:
        """
        Handle validation errors with user-friendly messages
        
        Args:
            error: The validation error
            context: Additional context about where the error occurred
            
        Returns:
            True if user wants to retry, False to abort
        """
        if context:
            display_error(f"Validation error in {context}: {error}")
        else:
            display_error(f"Validation error: {error}")
        
        display_message("Please check your input and try again.")
        return True  # Always allow retry for validation errors
    
    @staticmethod
    def handle_filesystem_error(error: Exception, operation: str = "") -> bool:
        """
        Handle file system errors with recovery suggestions
        
        Args:
            error: The file system error
            operation: Description of the operation that failed
            
        Returns:
            True if user wants to retry, False to abort
        """
        error_msg = str(error)
        
        if operation:
            display_error(f"File system error during {operation}: {error_msg}")
        else:
            display_error(f"File system error: {error_msg}")
        
        # Provide specific guidance based on error type
        if "Permission denied" in error_msg or "PermissionError" in error_msg:
            display_message("This appears to be a permission error.")
            display_message("Suggestions:")
            display_message("  • Check that you have write permissions to the directory")
            display_message("  • Try running from a different directory")
            display_message("  • On Windows, try running as Administrator")
            
        elif "File exists" in error_msg or "FileExistsError" in error_msg:
            display_message("A file or directory with this name already exists.")
            display_message("Suggestions:")
            display_message("  • Choose a different project name")
            display_message("  • Delete the existing project if you want to replace it")
            
        elif "No space left" in error_msg or "disk full" in error_msg.lower():
            display_message("There is not enough disk space.")
            display_message("Suggestions:")
            display_message("  • Free up disk space")
            display_message("  • Try creating the project in a different location")
            
        elif "No such file or directory" in error_msg or "FileNotFoundError" in error_msg:
            display_message("A required file or directory was not found.")
            display_message("Suggestions:")
            display_message("  • Check that the path exists")
            display_message("  • Try using an absolute path")
            
        else:
            display_message("An unexpected file system error occurred.")
            display_message("Suggestions:")
            display_message("  • Check file and directory permissions")
            display_message("  • Verify the path is correct")
            display_message("  • Try a different location")
        
        return False  # Don't retry filesystem errors automatically
    
    @staticmethod
    def handle_keyboard_interrupt() -> None:
        """Handle Ctrl+C gracefully"""
        display_message("\n\nOperation cancelled by user (Ctrl+C).")
        display_message("No files were created or modified.")
    
    @staticmethod
    def handle_unexpected_error(error: Exception, context: str = "") -> bool:
        """
        Handle unexpected errors with debugging information
        
        Args:
            error: The unexpected error
            context: Context about where the error occurred
            
        Returns:
            False (don't retry unexpected errors)
        """
        if context:
            display_error(f"Unexpected error in {context}: {error}")
        else:
            display_error(f"Unexpected error: {error}")
        
        display_message("This is an unexpected error. Please report this issue.")
        display_message(f"Error type: {type(error).__name__}")
        display_message(f"Error details: {error}")
        
        # In development, show more details
        if os.getenv("STORYCORE_DEBUG"):
            import traceback
            display_message("\nFull traceback (debug mode):")
            traceback.print_exc()
        
        return False
    
    @staticmethod
    def validate_project_directory(project_path: Path) -> tuple[bool, str]:
        """
        Validate that a project directory can be created
        
        Args:
            project_path: Path where project will be created
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check if parent directory exists and is writable
            parent_dir = project_path.parent
            
            if not parent_dir.exists():
                return (False, f"Parent directory does not exist: {parent_dir}")
            
            if not os.access(parent_dir, os.W_OK):
                return (False, f"No write permission to parent directory: {parent_dir}")
            
            # Check if project directory already exists
            if project_path.exists():
                return (False, f"Project directory already exists: {project_path}")
            
            return (True, "")
            
        except Exception as e:
            return (False, f"Error validating project directory: {e}")
    
    @staticmethod
    def safe_create_directory(dir_path: Path) -> tuple[bool, str]:
        """
        Safely create a directory with error handling
        
        Args:
            dir_path: Directory path to create
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            dir_path.mkdir(parents=True, exist_ok=False)
            return (True, "")
            
        except FileExistsError:
            return (False, f"Directory already exists: {dir_path}")
        except PermissionError:
            return (False, f"Permission denied creating directory: {dir_path}")
        except OSError as e:
            return (False, f"OS error creating directory: {e}")
        except Exception as e:
            return (False, f"Unexpected error creating directory: {e}")
    
    @staticmethod
    def safe_write_file(file_path: Path, content: str) -> tuple[bool, str]:
        """
        Safely write a file with error handling
        
        Args:
            file_path: File path to write
            content: Content to write
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return (True, "")
            
        except PermissionError:
            return (False, f"Permission denied writing file: {file_path}")
        except OSError as e:
            return (False, f"OS error writing file: {e}")
        except Exception as e:
            return (False, f"Unexpected error writing file: {e}")


# Convenience functions for direct use
def handle_validation_error(error: Exception, context: str = "") -> bool:
    """Convenience function for validation error handling"""
    return ErrorHandler.handle_validation_error(error, context)


def handle_filesystem_error(error: Exception, operation: str = "") -> bool:
    """Convenience function for filesystem error handling"""
    return ErrorHandler.handle_filesystem_error(error, operation)


def handle_keyboard_interrupt() -> None:
    """Convenience function for keyboard interrupt handling"""
    ErrorHandler.handle_keyboard_interrupt()


def handle_unexpected_error(error: Exception, context: str = "") -> bool:
    """Convenience function for unexpected error handling"""
    return ErrorHandler.handle_unexpected_error(error, context)


def validate_project_directory(project_path: Path) -> tuple[bool, str]:
    """Convenience function for project directory validation"""
    return ErrorHandler.validate_project_directory(project_path)


def safe_create_directory(dir_path: Path) -> tuple[bool, str]:
    """Convenience function for safe directory creation"""
    return ErrorHandler.safe_create_directory(dir_path)


def safe_write_file(file_path: Path, content: str) -> tuple[bool, str]:
    """Convenience function for safe file writing"""
    return ErrorHandler.safe_write_file(file_path, content)