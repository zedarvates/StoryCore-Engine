"""
Argument validation utilities.
Common validation functions used across command handlers.
"""

import re
from pathlib import Path
from typing import List

from ..errors import UserError


def validate_path_exists(path: str) -> bool:
    """Validate that a path exists."""
    return Path(path).exists()


def validate_file_extension(path: str, extensions: List[str]) -> bool:
    """Validate that a file has one of the allowed extensions."""
    file_path = Path(path)
    return file_path.suffix.lower() in [ext.lower() for ext in extensions]


def validate_positive_int(value: str) -> int:
    """Validate and convert string to positive integer."""
    try:
        int_value = int(value)
        if int_value <= 0:
            raise UserError(f"Value must be positive, got: {int_value}")
        return int_value
    except ValueError:
        raise UserError(f"Invalid integer value: {value}")


def validate_choice(value: str, choices: List[str]) -> str:
    """Validate that value is one of the allowed choices."""
    if value not in choices:
        raise UserError(
            f"Invalid choice: {value}",
            f"Must be one of: {', '.join(choices)}"
        )
    return value


def validate_project_name(name: str) -> str:
    """Validate project name format."""
    if not name:
        raise UserError("Project name cannot be empty")
    
    # Allow alphanumeric, hyphens, underscores
    if not re.match(r'^[a-zA-Z0-9_-]+$', name):
        raise UserError(
            f"Invalid project name: {name}",
            "Project names can only contain letters, numbers, hyphens, and underscores"
        )
    
    if len(name) > 50:
        raise UserError(
            f"Project name too long: {len(name)} characters",
            "Project names must be 50 characters or less"
        )
    
    return name


def validate_grid_format(grid_format: str) -> str:
    """Validate grid format specification."""
    valid_formats = ["3x3", "1x2", "1x4", "2x2", "4x1", "2x1"]
    
    if grid_format not in valid_formats:
        raise UserError(
            f"Invalid grid format: {grid_format}",
            f"Must be one of: {', '.join(valid_formats)}"
        )
    
    return grid_format


def validate_scale_factor(scale: int) -> int:
    """Validate image scale factor."""
    if scale < 1 or scale > 8:
        raise UserError(
            f"Invalid scale factor: {scale}",
            "Scale factor must be between 1 and 8"
        )
    
    return scale


def validate_quality_level(quality: str) -> str:
    """Validate quality level specification."""
    valid_levels = ["draft", "standard", "professional", "broadcast"]
    
    if quality not in valid_levels:
        raise UserError(
            f"Invalid quality level: {quality}",
            f"Must be one of: {', '.join(valid_levels)}"
        )
    
    return quality


def validate_url(url: str) -> str:
    """Validate URL format."""
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    if not url_pattern.match(url):
        raise UserError(
            f"Invalid URL format: {url}",
            "URL must be in format: http://hostname:port or https://hostname:port"
        )
    
    return url


def validate_port(port: int) -> int:
    """Validate port number."""
    if port < 1 or port > 65535:
        raise UserError(
            f"Invalid port number: {port}",
            "Port must be between 1 and 65535"
        )
    
    return port


def validate_range(value: int, min_val: int, max_val: int, name: str = "Value") -> int:
    """Validate that value is within specified range."""
    if value < min_val or value > max_val:
        raise UserError(
            f"{name} out of range: {value}",
            f"{name} must be between {min_val} and {max_val}"
        )
    
    return value


def validate_float_range(value: float, min_val: float, max_val: float, name: str = "Value") -> float:
    """Validate that float value is within specified range."""
    if value < min_val or value > max_val:
        raise UserError(
            f"{name} out of range: {value}",
            f"{name} must be between {min_val} and {max_val}"
        )
    
    return value


def validate_directory_exists(path: str) -> Path:
    """Validate that a directory exists and return Path object."""
    dir_path = Path(path)
    
    if not dir_path.exists():
        raise UserError(
            f"Directory not found: {path}",
            "Check the path or create the directory"
        )
    
    if not dir_path.is_dir():
        raise UserError(
            f"Path is not a directory: {path}",
            "Provide a valid directory path"
        )
    
    return dir_path


def validate_file_exists(path: str) -> Path:
    """Validate that a file exists and return Path object."""
    file_path = Path(path)
    
    if not file_path.exists():
        raise UserError(
            f"File not found: {path}",
            "Check the file path"
        )
    
    if not file_path.is_file():
        raise UserError(
            f"Path is not a file: {path}",
            "Provide a valid file path"
        )
    
    return file_path


def validate_writable_path(path: str) -> Path:
    """Validate that a path is writable."""
    file_path = Path(path)
    
    # Check if parent directory exists and is writable
    parent = file_path.parent
    
    if not parent.exists():
        raise UserError(
            f"Parent directory does not exist: {parent}",
            "Create the parent directory first"
        )
    
    # Try to check write permissions
    if parent.exists() and not parent.is_dir():
        raise UserError(
            f"Parent path is not a directory: {parent}",
            "Provide a valid directory path"
        )
    
    return file_path


def validate_json_string(json_str: str) -> dict:
    """Validate and parse JSON string."""
    import json
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        raise UserError(
            f"Invalid JSON: {e}",
            "Check the JSON syntax"
        )


def validate_regex_pattern(pattern: str) -> re.Pattern:
    """Validate regex pattern and return compiled pattern."""
    try:
        return re.compile(pattern)
    except re.error as e:
        raise UserError(
            f"Invalid regex pattern: {e}",
            "Check the regular expression syntax"
        )


def validate_non_empty_string(value: str, name: str = "Value") -> str:
    """Validate that string is not empty."""
    if not value or not value.strip():
        raise UserError(
            f"{name} cannot be empty",
            f"Provide a valid {name.lower()}"
        )
    
    return value.strip()


def validate_email(email: str) -> str:
    """Validate email address format."""
    email_pattern = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    if not email_pattern.match(email):
        raise UserError(
            f"Invalid email format: {email}",
            "Provide a valid email address"
        )
    
    return email


def validate_duration(duration: str) -> int:
    """Validate and convert duration string to seconds.
    
    Supports formats: '30s', '5m', '2h', '90' (seconds)
    """
    if duration.isdigit():
        return int(duration)
    
    match = re.match(r'^(\d+)([smh])$', duration.lower())
    
    if not match:
        raise UserError(
            f"Invalid duration format: {duration}",
            "Use format: 30s, 5m, 2h, or just seconds (90)"
        )
    
    value, unit = match.groups()
    value = int(value)
    
    multipliers = {'s': 1, 'm': 60, 'h': 3600}
    return value * multipliers[unit]


def validate_percentage(value: float) -> float:
    """Validate percentage value (0-100)."""
    if value < 0 or value > 100:
        raise UserError(
            f"Invalid percentage: {value}",
            "Percentage must be between 0 and 100"
        )
    
    return value