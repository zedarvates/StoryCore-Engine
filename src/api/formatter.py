"""
Response Formatter

This module provides consistent response formatting for all API endpoints.
"""

from typing import Any, Dict
import json
import logging

from .models import APIResponse, HTTP_STATUS_CODES


logger = logging.getLogger(__name__)


class ResponseFormatter:
    """
    Formats API responses consistently.
    
    Handles:
    - JSON serialization
    - HTTP status code mapping
    - Response structure standardization
    """
    
    def __init__(self):
        """Initialize the formatter."""
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def format(self, response: APIResponse) -> Dict[str, Any]:
        """
        Format an API response for transmission.
        
        Args:
            response: API response object
            
        Returns:
            Dictionary ready for JSON serialization
        """
        try:
            return response.to_dict()
        except Exception as e:
            self.logger.exception(f"Error formatting response: {str(e)}")
            # Return a minimal error response
            return {
                "status": "error",
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Failed to format response",
                },
            }
    
    def get_http_status_code(self, response: APIResponse) -> int:
        """
        Get the appropriate HTTP status code for a response.
        
        Args:
            response: API response object
            
        Returns:
            HTTP status code
        """
        if response.status == "success":
            return HTTP_STATUS_CODES["success"]
        elif response.status == "pending":
            return HTTP_STATUS_CODES["pending"]
        elif response.error:
            return HTTP_STATUS_CODES.get(
                response.error.code,
                HTTP_STATUS_CODES["INTERNAL_ERROR"]
            )
        else:
            return HTTP_STATUS_CODES["INTERNAL_ERROR"]
    
    def to_json(self, response: APIResponse, indent: bool = False) -> str:
        """
        Convert response to JSON string.
        
        Args:
            response: API response object
            indent: Whether to indent the JSON for readability
            
        Returns:
            JSON string
        """
        formatted = self.format(response)
        return json.dumps(
            formatted,
            indent=2 if indent else None,
            default=str,  # Handle datetime and other non-serializable types
        )
