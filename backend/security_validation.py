"""
Enhanced Security Validation Module

Provides comprehensive security validation for API endpoints including:
- Input sanitization and validation
- Path traversal protection
- SQL injection prevention
- XSS protection
- Command injection prevention
- Rate limiting integration
"""

import re
import os
import logging
from typing import Any, Dict, List, Optional, Union
from pathlib import Path
from fastapi import HTTPException, status
from pydantic import BaseModel, validator

logger = logging.getLogger(__name__)


class SecurityValidationError(Exception):
    """Custom exception for security validation failures"""
    pass


class InputValidationConfig(BaseModel):
    """Configuration for input validation"""
    max_length: int = 1000
    allowed_patterns: List[str] = []
    blocked_patterns: List[str] = []
    require_https: bool = True
    allowed_domains: List[str] = []


class SecurityValidator:
    """Centralized security validation for API inputs"""
    
    def __init__(self):
        # Common malicious patterns to block
        self.blocked_patterns = [
            r'<script[^>]*>.*?</script>',  # Script tags
            r'javascript:',  # JavaScript protocols
            r'on\w+\s*=',  # Event handlers
            r'eval\s*\(',  # eval() function
            r'document\.',  # Document access
            r'window\.',  # Window access
            r'<iframe[^>]*>',  # Iframes
            r'<object[^>]*>',  # Objects
            r'<embed[^>]*>',  # Embeds
            r'<link[^>]*>',  # Links
            r'<meta[^>]*>',  # Meta tags
            r'<style[^>]*>.*?</style>',  # Style tags
            r'<\?php',  # PHP tags
            r'<%.*?%>',  # ASP tags
            r'{{.*?}}',  # Template injection
            r'\$\{.*?\}',  # Template injection
            r'exec\s*\(',  # exec() function
            r'system\s*\(',  # system() function
            r'passthru\s*\(',  # passthru() function
            r'shell_exec\s*\(',  # shell_exec() function
            r'proc_open\s*\(',  # proc_open() function
            r'popen\s*\(',  # popen() function
            r'fsockopen\s*\(',  # fsockopen() function
            r'pfsockopen\s*\(',  # pfsockopen() function
            r'curl_exec\s*\(',  # curl_exec() function
            r'curl_multi_exec\s*\(',  # curl_multi_exec() function
            r'parse_ini_file\s*\(',  # parse_ini_file() function
            r'show_source\s*\(',  # show_source() function
            r'file_get_contents\s*\(',  # file_get_contents() function
            r'file_put_contents\s*\(',  # file_put_contents() function
            r'fopen\s*\(',  # fopen() function
            r'file\s*\(',  # file() function
            r'readfile\s*\(',  # readfile() function
            r'include\s*\(',  # include() function
            r'include_once\s*\(',  # include_once() function
            r'require\s*\(',  # require() function
            r'require_once\s*\(',  # require_once() function
            r'assert\s*\(',  # assert() function
            r'preg_replace\s*\/.*?e',  # preg_replace with e modifier
            r'create_function\s*\(',  # create_function() function
            
            # AI Prompt Injection detection
            r'ignore\s+previous\s+instructions',
            r'you\s+are\s+now\s+a\s+.*',
            r'system\s+role:\s+.*',
            r'DAN\s+mode',
            r'jailbreak',
            r'bypass\s+filter',
            
            # ComfyUI-specific node injection prevention
            r'SaveImage',
            r'SaveAudio',
            r'SaveVideo',
            r'HTTPPost',
            r'WebsocketSend',
            r'ExecuteSystemCommand'
        ]
        
        # SQL injection patterns
        self.sql_patterns = [
            r'\bUNION\s+SELECT\b',
            r'\bSELECT\b.*\bFROM\b',
            r'\bINSERT\s+INTO\b',
            r'\bUPDATE\b.*\bSET\b',
            r'\bDELETE\s+FROM\b',
            r'\bDROP\s+TABLE\b',
            r'\bALTER\s+TABLE\b',
            r'\bCREATE\s+TABLE\b',
            r'\bEXEC\b',
            r'\bEXECUTE\b',
            r'--',
            r'/\*',
            r'\*/',
            r'@@',
            r'@',
            r'CHAR\s*\(',
            r'ASCII\s*\(',
            r'CONCAT\s*\(',
        ]
        
        # Path traversal patterns
        self.path_traversal_patterns = [
            r'\.\.\/',
            r'\.\.\\',
            r'\.\.%2f',
            r'\.\.%5c',
            r'%2e%2e%2f',
            r'%2e%2e%5c',
            r'\/etc\/passwd',
            r'\/etc\/shadow',
            r'\/proc\/',
            r'\/sys\/',
            r'C:\\Windows\\',
            r'C:\\Program Files\\',
            r'\.\.\/\.\.\/',
            r'\.\.\\\.\.\\',
        ]
        
        # UUID pattern (v4)
        self.uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        
        # Base64 data pattern
        self.base64_pattern = r'^data:([a-zA-Z0-9]+\/[a-zA-Z0-9\-\+\.]+);base64,([a-zA-Z0-9\+\/]*={0,2})$'
    
    def sanitize_input(self, value: Any, max_length: int = 1000) -> str:
        """
        Sanitize user input to prevent injection attacks.
        
        Args:
            value: Input value to sanitize
            max_length: Maximum allowed length
            
        Returns:
            str: Sanitized value
            
        Raises:
            SecurityValidationError: If input contains malicious patterns
        """
        if value is None:
            return ""
        
        # Convert to string
        value_str = str(value)
        
        # Check length
        if len(value_str) > max_length:
            raise SecurityValidationError(f"Input too long (max {max_length} characters)")
        
        # Check for blocked patterns
        for pattern in self.blocked_patterns:
            if re.search(pattern, value_str, re.IGNORECASE):
                logger.warning(f"Blocked pattern detected: {pattern}")
                raise SecurityValidationError("Input contains potentially malicious content")
        
        # Check for SQL injection patterns
        for pattern in self.sql_patterns:
            if re.search(pattern, value_str, re.IGNORECASE):
                logger.warning(f"SQL injection pattern detected: {pattern}")
                raise SecurityValidationError("Input contains SQL injection pattern")
        
        # Basic sanitization - remove control characters
        value_str = ''.join(char for char in value_str if ord(char) >= 32 or ord(char) == 9)
        
        return value_str.strip()
    
    def validate_file_path(self, path: str, allowed_dirs: List[str]) -> str:
        """
        Validate file path to prevent directory traversal attacks.
        
        Args:
            path: File path to validate
            allowed_dirs: List of allowed base directories
            
        Returns:
            str: Resolved absolute path
            
        Raises:
            SecurityValidationError: If path is invalid or attempts traversal
        """
        try:
            # Convert to Path object
            path_obj = Path(path).resolve()
            
            # Check if path attempts traversal
            for pattern in self.path_traversal_patterns:
                if re.search(pattern, str(path_obj), re.IGNORECASE):
                    logger.warning(f"Path traversal attempt detected: {pattern}")
                    raise SecurityValidationError("Invalid file path")
            
            # Check if path is within allowed directories
            allowed = False
            for allowed_dir in allowed_dirs:
                allowed_dir_path = Path(allowed_dir).resolve()
                try:
                    path_obj.relative_to(allowed_dir_path)
                    allowed = True
                    break
                except ValueError:
                    continue
            
            if not allowed:
                logger.warning(f"Path outside allowed directories: {path}")
                raise SecurityValidationError("Access to specified path is not allowed")
            
            return str(path_obj)
            
        except Exception as e:
            logger.error(f"Path validation error: {e}")
            raise SecurityValidationError(f"Invalid path: {str(e)}")
    
    def validate_url(self, url: str, allowed_domains: Optional[List[str]] = None) -> str:
        """
        Validate URL to prevent SSRF and other attacks.
        
        Args:
            url: URL to validate
            allowed_domains: Optional list of allowed domains
            
        Returns:
            str: Validated URL
            
        Raises:
            SecurityValidationError: If URL is invalid or dangerous
        """
        import urllib.parse
        
        try:
            parsed = urllib.parse.urlparse(url)
            
            # Check scheme
            if parsed.scheme not in ['http', 'https']:
                raise SecurityValidationError("Only HTTP/HTTPS URLs are allowed")
            
            # Check for private IP ranges (SSRF protection)
            hostname = parsed.hostname
            if hostname:
                import socket
                import ipaddress
                try:
                    # Resolve hostname to all available IP addresses
                    infos = socket.getaddrinfo(hostname, None)
                    for family, _, _, _, sockaddr in infos:
                        ip_str = sockaddr[0]
                        ip = ipaddress.ip_address(ip_str)
                        
                        # Check for private, loopback, link-local, or reserved IP ranges
                        if (ip.is_private or 
                            ip.is_loopback or 
                            ip.is_link_local or 
                            ip.is_multicast or 
                            ip.is_reserved or
                            ip.is_unspecified):
                            raise SecurityValidationError(f"Access to internal IP address {ip_str} is not allowed")
                except (socket.gaierror, ValueError) as e:
                    # If we can't resolve or parse, and it's not a valid hostname/IP, block it if it looks suspicious
                    if re.search(r'localhost|127\.0\.0\.1|::1', hostname, re.I):
                         raise SecurityValidationError("Access to local addresses is not allowed")
                    pass 
            
            # Check allowed domains if specified
            if allowed_domains and hostname:
                if hostname not in allowed_domains:
                    raise SecurityValidationError(f"Domain '{hostname}' is not in allowed list")
            
            return url
            
        except Exception as e:
            logger.error(f"URL validation error: {e}")
            raise SecurityValidationError(f"Invalid URL: {str(e)}")
    
    def validate_json_payload(self, payload: Dict[str, Any], max_depth: int = 10) -> bool:
        """
        Validate JSON payload structure to prevent DoS attacks.
        
        Args:
            payload: JSON payload to validate
            max_depth: Maximum nesting depth
            
        Returns:
            bool: True if valid
            
        Raises:
            SecurityValidationError: If payload is invalid
        """
        def check_depth(obj, current_depth=0):
            if current_depth > max_depth:
                raise SecurityValidationError(f"JSON nesting too deep (max {max_depth})")
            
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if not isinstance(key, str):
                        raise SecurityValidationError("JSON keys must be strings")
                    check_depth(value, current_depth + 1)
            elif isinstance(obj, list):
                for item in obj:
                    check_depth(item, current_depth + 1)
        
        try:
            check_depth(payload)
            return True
        except Exception as e:
            logger.error(f"JSON payload validation error: {e}")
            raise SecurityValidationError(str(e))
    
    def validate_content_type(self, content_type: str, allowed_types: List[str]) -> bool:
        """Validate Content-Type header."""
        if content_type not in allowed_types:
            raise SecurityValidationError(
                f"Content-Type '{content_type}' is not allowed. "
                f"Allowed types: {', '.join(allowed_types)}"
            )
        return True

    def validate_uuid(self, uuid_str: str) -> str:
        """
        Validate if a string is a valid UUID v4.
        """
        if not re.match(self.uuid_pattern, uuid_str, re.IGNORECASE):
            raise SecurityValidationError("Invalid UUID format")
        return uuid_str

    def validate_base64_data(self, data: str, max_size_mb: int = 10) -> str:
        """
        Validate base64 encoded data (e.g. images).
        """
        match = re.match(self.base64_pattern, data)
        if not match:
            raise SecurityValidationError("Invalid Base64 data format")
        
        # Estimate size (3/4 of string length)
        estimated_size = (len(data) - len(match.group(1)) - 13) * 0.75
        if estimated_size > max_size_mb * 1024 * 1024:
            raise SecurityValidationError(f"Base64 data too large (max {max_size_mb}MB)")
            
        return data


# Global security validator instance
security_validator = SecurityValidator()


def validate_input(value: Any, max_length: int = 1000) -> str:
    """Convenience function for input validation"""
    return security_validator.sanitize_input(value, max_length)


def validate_file_path(path: str, allowed_dirs: List[str]) -> str:
    """Convenience function for file path validation"""
    return security_validator.validate_file_path(path, allowed_dirs)


def validate_url(url: str, allowed_domains: Optional[List[str]] = None) -> str:
    """Convenience function for URL validation"""
    return security_validator.validate_url(url, allowed_domains)


def validate_json_payload(payload: Dict[str, Any], max_depth: int = 10) -> bool:
    """Convenience function for JSON payload validation"""
    return security_validator.validate_json_payload(payload, max_depth)


def validate_uuid(uuid_str: str) -> str:
    """Convenience function for UUID validation"""
    return security_validator.validate_uuid(uuid_str)


def validate_base64_data(data: str, max_size_mb: int = 10) -> str:
    """Convenience function for Base64 data validation"""
    return security_validator.validate_base64_data(data, max_size_mb)