"""
Log Anonymizer Module

Removes sensitive information from logs while preserving debugging information.
Implements privacy protection for the Feedback & Diagnostics system.
"""

import re
import hashlib
from pathlib import Path
from typing import List
from feedback_error_logger import log_diagnostic_error, log_error


class LogAnonymizer:
    """Anonymizes sensitive information in log files for safe sharing."""
    
    def __init__(self, project_root: str = None):
        """
        Initialize the log anonymizer.
        
        Requirements: 8.3
        
        Args:
            project_root: Root directory of the project for path anonymization.
                         If None, will attempt to detect automatically.
        """
        try:
            if project_root:
                self.project_root = Path(project_root).resolve()
            else:
                # Try to detect project root (directory containing setup.py or pyproject.toml)
                current = Path(__file__).resolve()
                for parent in [current.parent.parent] + list(current.parents):
                    if (parent / "setup.py").exists() or (parent / "pyproject.toml").exists():
                        self.project_root = parent
                        break
                else:
                    self.project_root = Path.cwd()
        except Exception as e:
            # If project root detection fails, use current directory
            log_diagnostic_error(
                component="log_anonymizer_init",
                error=e,
                context={"fallback": "current_directory"}
            )
            self.project_root = Path.cwd()
        
        # Cache for consistent ID hashing within a session
        self._id_hash_cache = {}
    
    def anonymize_path(self, path: str) -> str:
        """
        Convert absolute paths to relative paths from project root.
        
        Requirements: 4.1
        
        Args:
            path: Absolute or relative file path
            
        Returns:
            Relative path from project root, or just filename if not in project
            
        Examples:
            "/home/user/storycore/src/module.py" -> "src/module.py"
            "C:\\Users\\user\\storycore\\src\\module.py" -> "src/module.py"
            "/home/user/other/file.py" -> "file.py"
        """
        try:
            # Try to create a Path object
            path_obj = Path(path)
            
            # If it's an absolute path, make it relative to project root
            if path_obj.is_absolute():
                try:
                    relative = path_obj.relative_to(self.project_root)
                    return str(relative).replace('\\', '/')
                except (ValueError, TypeError):
                    # Path is not relative to project root, just return filename
                    return path_obj.name
            
            # Already relative or not a valid path
            return str(path).replace('\\', '/')
        except Exception:
            # If path processing fails, try to extract just the filename
            try:
                return Path(path).name
            except Exception:
                return path
    
    def anonymize_username(self, text: str) -> str:
        """
        Replace usernames with "USER" placeholder.
        
        Requirements: 4.2
        
        Args:
            text: Text potentially containing usernames
            
        Returns:
            Text with usernames replaced by "USER"
            
        Examples:
            "/home/john/project" -> "/home/USER/project"
            "C:\\Users\\alice\\Documents" -> "C:\\Users\\USER\\Documents"
        """
        # Common username patterns in paths
        patterns = [
            # Unix-style home directories
            (r'/home/([^/\s]+)', r'/home/USER'),
            (r'/Users/([^/\s]+)', r'/Users/USER'),
            # Windows-style user directories
            (r'C:\\Users\\([^\\]+)', r'C:\\Users\\USER'),
            (r'C:/Users/([^/]+)', r'C:/Users/USER'),
            # Generic user references
            (r'\buser[_-]?name[:\s=]+["\']?([^\s"\']+)', r'username: USER'),
            (r'\bUser:\s*([^\s]+)', r'User: USER'),
        ]
        
        result = text
        for pattern, replacement in patterns:
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        
        return result
    
    def redact_credentials(self, text: str) -> str:
        """
        Remove emails, API keys, passwords, and other credentials.
        
        Requirements: 4.3
        
        Args:
            text: Text potentially containing credentials
            
        Returns:
            Text with credentials redacted
            
        Examples:
            "email: user@example.com" -> "email: [EMAIL_REDACTED]"
            "api_key: sk-1234567890abcdef" -> "api_key: [TOKEN_REDACTED]"
            "password=secret123" -> "password=[PASSWORD_REDACTED]"
        """
        # Email addresses
        text = re.sub(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            '[EMAIL_REDACTED]',
            text
        )
        
        # API keys and tokens (various formats)
        # OpenAI-style keys (sk- prefix with alphanumeric and hyphens)
        text = re.sub(r'\bsk-[A-Za-z0-9\-]{8,}\b', '[TOKEN_REDACTED]', text)
        # Generic API keys
        text = re.sub(
            r'\b(api[_-]?key|token|secret[_-]?key)[:\s=]+["\']?([A-Za-z0-9_\-]{8,})["\']?',
            r'\1: [TOKEN_REDACTED]',
            text,
            flags=re.IGNORECASE
        )
        
        # Passwords
        text = re.sub(
            r'\b(password|passwd|pwd)[:\s=]+["\']?([^\s"\']+)["\']?',
            r'\1: [PASSWORD_REDACTED]',
            text,
            flags=re.IGNORECASE
        )
        
        # Bearer tokens
        text = re.sub(
            r'\bBearer\s+[A-Za-z0-9_\-\.]+',
            'Bearer [TOKEN_REDACTED]',
            text,
            flags=re.IGNORECASE
        )
        
        # AWS access keys
        text = re.sub(r'\bAKIA[0-9A-Z]{16}\b', '[AWS_KEY_REDACTED]', text)
        
        # Generic secrets in key=value format
        text = re.sub(
            r'\b(secret|credential|auth)[:\s=]+["\']?([^\s"\']{8,})["\']?',
            r'\1: [SECRET_REDACTED]',
            text,
            flags=re.IGNORECASE
        )
        
        return text
    
    def hash_internal_id(self, id_value: str) -> str:
        """
        Create consistent hashes for internal IDs.
        
        Requirements: 4.4
        
        Same IDs produce same hashes within a single report session.
        
        Args:
            id_value: Internal ID to hash
            
        Returns:
            Consistent hash string (first 8 characters of SHA256)
            
        Examples:
            "user_12345" -> "a1b2c3d4" (consistent within session)
            "session_xyz789" -> "e5f6g7h8" (consistent within session)
        """
        # Check cache first for consistency
        if id_value in self._id_hash_cache:
            return self._id_hash_cache[id_value]
        
        # Create hash
        hash_obj = hashlib.sha256(id_value.encode('utf-8'))
        hash_str = hash_obj.hexdigest()[:8]
        
        # Cache for consistency
        self._id_hash_cache[id_value] = hash_str
        
        return hash_str
    
    def anonymize_logs(self, logs: List[str]) -> List[str]:
        """
        Process list of log lines and apply all anonymization rules.
        
        Requirements: 4.5, 8.3
        
        Applies anonymization rules in sequence while preserving:
        - Stacktrace line numbers
        - Error messages
        - Module names
        - Timestamps
        
        Args:
            logs: List of log line strings
            
        Returns:
            List of anonymized log lines
            
        Examples:
            Input: ["ERROR: /home/john/project/src/module.py:42 - Failed to connect"]
            Output: ["ERROR: src/module.py:42 - Failed to connect"]
        """
        anonymized_logs = []
        
        for log_line in logs:
            try:
                # Apply anonymization rules in sequence
                anonymized = log_line
                
                # 1. Redact credentials first (most sensitive)
                try:
                    anonymized = self.redact_credentials(anonymized)
                except Exception as e:
                    log_diagnostic_error(
                        component="redact_credentials",
                        error=e,
                        context={"log_line_preview": log_line[:100], "action": "skipping_redaction"}
                    )
                
                # 2. Replace usernames
                try:
                    anonymized = self.anonymize_username(anonymized)
                except Exception as e:
                    log_diagnostic_error(
                        component="anonymize_username",
                        error=e,
                        context={"log_line_preview": log_line[:100], "action": "skipping_username_anonymization"}
                    )
                
                # 3. Anonymize file paths
                # Find all path-like strings and anonymize them
                # Match common path patterns
                path_patterns = [
                    # Unix absolute paths
                    r'(/[a-zA-Z0-9_\-./]+\.py)',
                    r'(/[a-zA-Z0-9_\-./]+\.js)',
                    r'(/[a-zA-Z0-9_\-./]+\.ts)',
                    r'(/[a-zA-Z0-9_\-./]+\.json)',
                    # Windows absolute paths
                    r'([A-Z]:\\[a-zA-Z0-9_\-\\./]+\.py)',
                    r'([A-Z]:\\[a-zA-Z0-9_\-\\./]+\.js)',
                    r'([A-Z]:\\[a-zA-Z0-9_\-\\./]+\.ts)',
                    r'([A-Z]:\\[a-zA-Z0-9_\-\\./]+\.json)',
                ]
                
                try:
                    for pattern in path_patterns:
                        matches = re.finditer(pattern, anonymized)
                        for match in matches:
                            original_path = match.group(1)
                            anonymized_path = self.anonymize_path(original_path)
                            anonymized = anonymized.replace(original_path, anonymized_path)
                except Exception as e:
                    log_diagnostic_error(
                        component="anonymize_paths",
                        error=e,
                        context={"log_line_preview": log_line[:100], "action": "skipping_path_anonymization"}
                    )
                
                # 4. Hash internal IDs (UUIDs, session IDs, etc.)
                try:
                    # Match UUID patterns
                    uuid_pattern = r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b'
                    matches = re.finditer(uuid_pattern, anonymized, re.IGNORECASE)
                    for match in matches:
                        original_id = match.group(0)
                        hashed_id = self.hash_internal_id(original_id)
                        anonymized = anonymized.replace(original_id, f'ID_{hashed_id}')
                    
                    # Match session/request ID patterns
                    id_patterns = [
                        r'\b(session[_-]?id|request[_-]?id|trace[_-]?id)[:\s=]+([a-zA-Z0-9_\-]{8,})',
                        r'\b(sid|rid|tid)[:\s=]+([a-zA-Z0-9_\-]{8,})',
                    ]
                    
                    for pattern in id_patterns:
                        matches = re.finditer(pattern, anonymized, re.IGNORECASE)
                        for match in matches:
                            prefix = match.group(1)
                            original_id = match.group(2)
                            hashed_id = self.hash_internal_id(original_id)
                            anonymized = anonymized.replace(
                                f'{prefix}{match.group(0)[len(prefix):len(prefix)+1]}{original_id}',
                                f'{prefix}{match.group(0)[len(prefix):len(prefix)+1]}ID_{hashed_id}'
                            )
                except Exception as e:
                    log_diagnostic_error(
                        component="hash_internal_ids",
                        error=e,
                        context={"log_line_preview": log_line[:100], "action": "skipping_id_hashing"}
                    )
                
                anonymized_logs.append(anonymized)
            
            except Exception as e:
                # If anonymization of a single line fails completely, skip it for safety
                log_diagnostic_error(
                    component="anonymize_log_line",
                    error=e,
                    context={"log_line_preview": log_line[:100], "action": "skipping_line"}
                )
                # Don't include the line if we can't anonymize it safely
                continue
        
        return anonymized_logs
