"""
StoryCore-Engine Payload Size Validator

This module provides comprehensive payload size validation for Report_Payload.
It handles:
- Actual request body size validation
- Base64-encoded screenshot size calculation
- Detailed size breakdown for debugging
- HTTP 413 error responses for oversized payloads

Requirements: 7.2 - Payload Size Limits (max 10MB)
"""

import logging
import json
import base64
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)


# Constants
MAX_PAYLOAD_SIZE_MB = 10
MAX_PAYLOAD_SIZE_BYTES = MAX_PAYLOAD_SIZE_MB * 1024 * 1024  # 10MB in bytes
BASE64_OVERHEAD_RATIO = 4 / 3  # Base64 encoding increases size by ~33%


def calculate_json_size(payload: Dict[str, Any]) -> int:
    """
    Calculate the actual size of a JSON payload in bytes.
    
    This function serializes the payload to JSON and measures the resulting
    byte size, which is more accurate than estimating based on string length.
    
    Args:
        payload: The payload dictionary to measure
    
    Returns:
        int: Size of the payload in bytes
    
    Example:
        >>> payload = {"key": "value"}
        >>> size = calculate_json_size(payload)
        >>> print(f"Payload size: {size} bytes")
    """
    try:
        # Serialize to JSON with no extra whitespace
        json_str = json.dumps(payload, separators=(',', ':'))
        # Encode to UTF-8 bytes and measure
        json_bytes = json_str.encode('utf-8')
        return len(json_bytes)
    except Exception as e:
        logger.error(f"Error calculating JSON size: {e}")
        # Return a conservative estimate if serialization fails
        return len(str(payload).encode('utf-8'))


def calculate_screenshot_decoded_size(screenshot_base64: Optional[str]) -> int:
    """
    Calculate the decoded size of a base64-encoded screenshot.
    
    Base64 encoding increases the size by approximately 33% (4/3 ratio).
    This function calculates the original (decoded) size of the image.
    
    Args:
        screenshot_base64: Base64-encoded screenshot string, or None
    
    Returns:
        int: Decoded size in bytes, or 0 if no screenshot
    
    Example:
        >>> screenshot = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        >>> size = calculate_screenshot_decoded_size(screenshot)
        >>> print(f"Decoded size: {size} bytes")
    """
    if not screenshot_base64:
        return 0
    
    try:
        # Remove padding characters to get accurate length
        screenshot_clean = screenshot_base64.rstrip('=')
        # Calculate decoded size: (base64_length * 3) / 4
        decoded_size = (len(screenshot_clean) * 3) // 4
        return decoded_size
    except Exception as e:
        logger.error(f"Error calculating screenshot decoded size: {e}")
        return 0


def get_payload_size_breakdown(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get a detailed breakdown of payload size by component.
    
    This function analyzes the payload and provides size information for:
    - Total payload size
    - Screenshot size (base64 and decoded)
    - Logs size
    - Stacktrace size
    - Other fields size
    
    Args:
        payload: The payload dictionary to analyze
    
    Returns:
        Dict[str, Any]: Size breakdown with the following keys:
            - total_bytes: Total payload size in bytes
            - total_mb: Total payload size in MB
            - screenshot_base64_bytes: Screenshot size in base64 encoding
            - screenshot_decoded_bytes: Screenshot size when decoded
            - logs_bytes: Size of log data
            - stacktrace_bytes: Size of stacktrace data
            - other_bytes: Size of all other fields
            - exceeds_limit: Boolean indicating if size exceeds limit
            - max_allowed_bytes: Maximum allowed size in bytes
    
    Example:
        >>> breakdown = get_payload_size_breakdown(payload)
        >>> print(f"Total: {breakdown['total_mb']:.2f} MB")
        >>> if breakdown['exceeds_limit']:
        ...     print("Payload exceeds size limit!")
    
    Requirements: 7.2
    """
    # Calculate total size
    total_bytes = calculate_json_size(payload)
    
    # Calculate screenshot size
    screenshot_base64 = payload.get('screenshot_base64')
    screenshot_base64_bytes = len(screenshot_base64.encode('utf-8')) if screenshot_base64 else 0
    screenshot_decoded_bytes = calculate_screenshot_decoded_size(screenshot_base64)
    
    # Calculate logs size
    logs = payload.get('diagnostics', {}).get('logs', []) if isinstance(payload.get('diagnostics'), dict) else []
    logs_bytes = sum(len(log.encode('utf-8')) for log in logs) if logs else 0
    
    # Calculate stacktrace size
    stacktrace = payload.get('diagnostics', {}).get('stacktrace') if isinstance(payload.get('diagnostics'), dict) else None
    stacktrace_bytes = len(stacktrace.encode('utf-8')) if stacktrace else 0
    
    # Calculate other fields size (approximate)
    other_bytes = total_bytes - screenshot_base64_bytes - logs_bytes - stacktrace_bytes
    
    return {
        'total_bytes': total_bytes,
        'total_mb': total_bytes / (1024 * 1024),
        'screenshot_base64_bytes': screenshot_base64_bytes,
        'screenshot_decoded_bytes': screenshot_decoded_bytes,
        'logs_bytes': logs_bytes,
        'stacktrace_bytes': stacktrace_bytes,
        'other_bytes': other_bytes,
        'exceeds_limit': total_bytes > MAX_PAYLOAD_SIZE_BYTES,
        'max_allowed_bytes': MAX_PAYLOAD_SIZE_BYTES,
        'max_allowed_mb': MAX_PAYLOAD_SIZE_MB
    }


def validate_payload_size(payload: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Validate that a payload does not exceed the maximum allowed size.
    
    This function performs comprehensive size validation:
    1. Calculates actual JSON serialized size
    2. Checks against the 10MB limit
    3. Provides detailed size breakdown for debugging
    4. Returns appropriate error messages for oversized payloads
    
    Args:
        payload: The payload dictionary to validate
    
    Returns:
        Tuple[bool, Optional[str], Optional[Dict[str, Any]]]: A tuple of:
            - is_valid: True if size is within limits, False otherwise
            - error_message: Error message if invalid, None if valid
            - size_breakdown: Detailed size breakdown dictionary
    
    Example:
        >>> is_valid, error, breakdown = validate_payload_size(payload)
        >>> if not is_valid:
        ...     print(f"Error: {error}")
        ...     print(f"Size: {breakdown['total_mb']:.2f} MB")
    
    Requirements: 7.2
    """
    try:
        # Get detailed size breakdown
        breakdown = get_payload_size_breakdown(payload)
        
        # Check if size exceeds limit
        if breakdown['exceeds_limit']:
            error_message = (
                f"Payload size ({breakdown['total_mb']:.2f} MB) exceeds "
                f"maximum allowed size of {MAX_PAYLOAD_SIZE_MB} MB. "
                f"Size breakdown: "
                f"screenshot={breakdown['screenshot_base64_bytes'] / (1024*1024):.2f} MB, "
                f"logs={breakdown['logs_bytes'] / (1024*1024):.2f} MB, "
                f"stacktrace={breakdown['stacktrace_bytes'] / (1024*1024):.2f} MB, "
                f"other={breakdown['other_bytes'] / (1024*1024):.2f} MB"
            )
            logger.warning(f"Payload size validation failed: {error_message}")
            return False, error_message, breakdown
        
        # Size is within limits
        logger.info(
            f"Payload size validation passed: {breakdown['total_mb']:.2f} MB "
            f"(limit: {MAX_PAYLOAD_SIZE_MB} MB)"
        )
        return True, None, breakdown
        
    except Exception as e:
        error_message = f"Error validating payload size: {str(e)}"
        logger.error(error_message, exc_info=True)
        # Return failure on error to be safe
        return False, error_message, None


def validate_raw_request_size(content_length: Optional[int]) -> Tuple[bool, Optional[str]]:
    """
    Validate the raw request size from Content-Length header.
    
    This provides an early check before parsing the request body,
    allowing us to reject oversized requests immediately.
    
    Args:
        content_length: The Content-Length header value in bytes, or None
    
    Returns:
        Tuple[bool, Optional[str]]: A tuple of:
            - is_valid: True if size is within limits, False otherwise
            - error_message: Error message if invalid, None if valid
    
    Example:
        >>> is_valid, error = validate_raw_request_size(5242880)  # 5MB
        >>> if is_valid:
        ...     print("Request size is acceptable")
    
    Requirements: 7.2
    """
    if content_length is None:
        # If Content-Length is not provided, we can't validate early
        # This is acceptable - we'll validate after parsing
        logger.debug("Content-Length header not provided, skipping early size check")
        return True, None
    
    if content_length > MAX_PAYLOAD_SIZE_BYTES:
        size_mb = content_length / (1024 * 1024)
        error_message = (
            f"Request size ({size_mb:.2f} MB) exceeds "
            f"maximum allowed size of {MAX_PAYLOAD_SIZE_MB} MB"
        )
        logger.warning(f"Raw request size validation failed: {error_message}")
        return False, error_message
    
    logger.debug(f"Raw request size validation passed: {content_length} bytes")
    return True, None


def validate_screenshot_size(screenshot_base64: Optional[str]) -> Tuple[bool, Optional[str]]:
    """
    Validate that a base64-encoded screenshot is within acceptable size limits.
    
    Screenshots should not exceed 5MB when decoded (as per requirements 3.5).
    This function validates the screenshot size independently of the total
    payload size.
    
    Args:
        screenshot_base64: Base64-encoded screenshot string, or None
    
    Returns:
        Tuple[bool, Optional[str]]: A tuple of:
            - is_valid: True if size is within limits, False otherwise
            - error_message: Error message if invalid, None if valid
    
    Example:
        >>> is_valid, error = validate_screenshot_size(screenshot_data)
        >>> if not is_valid:
        ...     print(f"Screenshot too large: {error}")
    
    Requirements: 3.5
    """
    if not screenshot_base64:
        # No screenshot is valid
        return True, None
    
    # Calculate decoded size
    decoded_size = calculate_screenshot_decoded_size(screenshot_base64)
    max_screenshot_size = 5 * 1024 * 1024  # 5MB
    
    if decoded_size > max_screenshot_size:
        size_mb = decoded_size / (1024 * 1024)
        error_message = (
            f"Screenshot size ({size_mb:.2f} MB) exceeds "
            f"maximum allowed size of 5 MB"
        )
        logger.warning(f"Screenshot size validation failed: {error_message}")
        return False, error_message
    
    logger.debug(f"Screenshot size validation passed: {decoded_size} bytes")
    return True, None


# Export public API
__all__ = [
    'validate_payload_size',
    'validate_raw_request_size',
    'validate_screenshot_size',
    'get_payload_size_breakdown',
    'calculate_json_size',
    'calculate_screenshot_decoded_size',
    'MAX_PAYLOAD_SIZE_MB',
    'MAX_PAYLOAD_SIZE_BYTES'
]
