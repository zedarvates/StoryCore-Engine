"""
Validator Service for Interactive Project Setup Wizard (MVP)

This module provides validation functions for user inputs with
clear error messages.
"""

import re
import os
from typing import Tuple
from pathlib import Path
from .definitions import FORMAT_DEFINITIONS


class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass


class ValidatorService:
    """
    Provides validation methods for wizard inputs (MVP version)
    
    Simplified for MVP - basic validation only.
    """
    
    @staticmethod
    def validate_project_name(name: str) -> Tuple[bool, str]:
        """
        Validate project name
        
        Rules (MVP):
        - Must not be empty
        - Must be 3-50 characters
        - Only alphanumeric, hyphens, and underscores
        - Must not start with hyphen or underscore
        
        Args:
            name: The project name to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if empty
        if not name or not name.strip():
            return (False, "Project name cannot be empty")
        
        name = name.strip()
        
        # Check length
        if len(name) < 3:
            return (False, "Project name must be at least 3 characters")
        
        if len(name) > 50:
            return (False, "Project name must be 50 characters or less")
        
        # Check characters (alphanumeric, hyphens, underscores only)
        if not re.match(r'^[a-zA-Z0-9_-]+$', name):
            return (False, "Project name can only contain letters, numbers, hyphens, and underscores")
        
        # Check first character (must be alphanumeric)
        if not name[0].isalnum():
            return (False, "Project name must start with a letter or number")
        
        return (True, "")
    
    @staticmethod
    def validate_project_name_unique(name: str, projects_dir: str = ".") -> Tuple[bool, str]:
        """
        Validate that project name is unique (doesn't already exist)
        
        Args:
            name: The project name to check
            projects_dir: Directory where projects are stored
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        project_path = Path(projects_dir) / name
        
        if project_path.exists():
            return (False, f"Project '{name}' already exists. Choose a different name or delete the existing project.")
        
        return (True, "")
    
    @staticmethod
    def validate_duration(duration_str: str, format_key: str) -> Tuple[bool, str]:
        """
        Validate duration against format range
        
        Args:
            duration_str: The duration as string (should be integer)
            format_key: The format key to check range against
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if it's a valid integer
        try:
            duration = int(duration_str)
        except ValueError:
            return (False, "Duration must be a whole number (integer)")
        
        # Check if positive
        if duration <= 0:
            return (False, "Duration must be greater than 0")
        
        # Check against format range
        if format_key not in FORMAT_DEFINITIONS:
            return (False, f"Invalid format key: {format_key}")
        
        format_def = FORMAT_DEFINITIONS[format_key]
        min_duration, max_duration = format_def.duration_range
        
        if duration < min_duration:
            return (False, f"Duration must be at least {min_duration} minutes for {format_def.name}")
        
        if duration > max_duration:
            return (False, f"Duration must be at most {max_duration} minutes for {format_def.name}")
        
        return (True, "")
    
    @staticmethod
    def validate_story_content(story: str) -> Tuple[bool, str]:
        """
        Validate story content
        
        Rules (MVP):
        - Must not be empty
        - Must be at least 10 characters
        - Must be at most 10000 characters
        
        Args:
            story: The story content to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if empty
        if not story or not story.strip():
            return (False, "Story cannot be empty")
        
        story = story.strip()
        
        # Check minimum length
        if len(story) < 10:
            return (False, "Story must be at least 10 characters")
        
        # Check maximum length
        if len(story) > 10000:
            return (False, "Story must be 10,000 characters or less")
        
        return (True, "")


# Convenience functions for direct use
_validator = ValidatorService()


def validate_project_name(name: str) -> Tuple[bool, str]:
    """Convenience function for project name validation"""
    return _validator.validate_project_name(name)


def validate_project_name_unique(name: str, projects_dir: str = ".") -> Tuple[bool, str]:
    """Convenience function for project name uniqueness check"""
    return _validator.validate_project_name_unique(name, projects_dir)


def validate_duration(duration_str: str, format_key: str) -> Tuple[bool, str]:
    """Convenience function for duration validation"""
    return _validator.validate_duration(duration_str, format_key)


def validate_story_content(story: str) -> Tuple[bool, str]:
    """Convenience function for story validation"""
    return _validator.validate_story_content(story)


def create_project_name_validator(projects_dir: str = "."):
    """
    Create a validator function for project names that can be used with InputHandler
    
    Args:
        projects_dir: Directory where projects are stored
        
    Returns:
        Validator function that returns (is_valid, error_message)
    """
    def validator(name: str) -> Tuple[bool, str]:
        # First validate format
        is_valid, error = validate_project_name(name)
        if not is_valid:
            return (is_valid, error)
        
        # Then check uniqueness
        return validate_project_name_unique(name, projects_dir)
    
    return validator


def create_duration_validator(format_key: str):
    """
    Create a validator function for duration that can be used with InputHandler
    
    Args:
        format_key: The format key to validate against
        
    Returns:
        Validator function that returns (is_valid, error_message)
    """
    def validator(duration_str: str) -> Tuple[bool, str]:
        return validate_duration(duration_str, format_key)
    
    return validator


def create_story_validator():
    """
    Create a validator function for story content that can be used with InputHandler
    
    Returns:
        Validator function that returns (is_valid, error_message)
    """
    def validator(story: str) -> Tuple[bool, str]:
        return validate_story_content(story)
    
    return validator
