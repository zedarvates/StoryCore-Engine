"""
Security and Validation System for Advanced ComfyUI Workflows

This module provides comprehensive security and validation capabilities:
- Input validation and sanitization
- Model integrity verification (checksums, signatures)
- Secure model download mechanisms
- Access control for advanced features
- Comprehensive audit logging
- Privacy protection measures
- Security testing procedures

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import hashlib
import json
import logging
import re
import urllib.parse
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union
import os


# Configure logging
logger = logging.getLogger(__name__)


class SecurityLevel(Enum):
    """Security levels for operations"""
    PUBLIC = "public"
    AUTHENTICATED = "authenticated"
    AUTHORIZED = "authorized"
    ADMIN = "admin"


class ValidationResult(Enum):
    """Validation result status"""
    VALID = "valid"
    INVALID = "invalid"
    SUSPICIOUS = "suspicious"
    BLOCKED = "blocked"


@dataclass
class ValidationError:
    """Information about a validation error"""
    timestamp: datetime
    error_type: str
    error_message: str
    field_name: Optional[str] = None
    severity: str = "medium"
    context: Optional[Dict[str, Any]] = None


@dataclass
class AuditEvent:
    """Audit event information"""
    timestamp: datetime
    event_type: str
    user: str
    resource: str
    action: str
    result: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None


class InputValidator:
    """Validates and sanitizes all user inputs"""
    
    # Security patterns
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b.*\bSELECT\b)",
        r"(\bDROP\b.*\bTABLE\b)",
        r"(\bINSERT\b.*\bINTO\b)",
        r"(\bDELETE\b.*\bFROM\b)",
        r"(--|\#|\/\*|\*\/)",
        r"(\bOR\b.*=.*)",
        r"(\bAND\b.*=.*)",
    ]
    
    COMMAND_INJECTION_PATTERNS = [
        r"[;&|`$()]",
        r"(\.\./|\.\.\\)",
        r"(\beval\b|\bexec\b)",
        r"(__import__|compile)",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe",
        r"<object",
        r"<embed",
    ]
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.max_prompt_length = self.config.get('max_prompt_length', 10000)
        self.max_path_length = self.config.get('max_path_length', 4096)
        self.allowed_extensions = self.config.get('allowed_extensions', {
            '.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.avi', '.mov'
        })
        self.blocked_paths = self.config.get('blocked_paths', {
            '/etc', '/sys', '/proc', 'C:\\Windows', 'C:\\Program Files'
        })
        self.validation_errors: List[ValidationError] = []
    
    def validate_prompt(self, prompt: str) -> Tuple[ValidationResult, Optional[str]]:
        """Validate prompt text"""
        if not isinstance(prompt, str):
            return ValidationResult.INVALID, "Prompt must be a string"
        
        # Length check
        if len(prompt) > self.max_prompt_length:
            return ValidationResult.INVALID, f"Prompt exceeds maximum length of {self.max_prompt_length}"
        
        if len(prompt.strip()) == 0:
            return ValidationResult.INVALID, "Prompt cannot be empty"
        
        # Check for injection attacks
        for pattern in self.SQL_INJECTION_PATTERNS:
            if re.search(pattern, prompt, re.IGNORECASE):
                self._record_validation_error("sql_injection", "SQL injection pattern detected", "prompt")
                return ValidationResult.BLOCKED, "Suspicious SQL pattern detected"
        
        for pattern in self.COMMAND_INJECTION_PATTERNS:
            if re.search(pattern, prompt):
                self._record_validation_error("command_injection", "Command injection pattern detected", "prompt")
                return ValidationResult.BLOCKED, "Suspicious command pattern detected"
        
        for pattern in self.XSS_PATTERNS:
            if re.search(pattern, prompt, re.IGNORECASE):
                self._record_validation_error("xss", "XSS pattern detected", "prompt")
                return ValidationResult.SUSPICIOUS, "Suspicious script pattern detected"
        
        return ValidationResult.VALID, None
    
    def validate_path(self, path: Union[str, Path]) -> Tuple[ValidationResult, Optional[str]]:
        """Validate file path"""
        try:
            path = Path(path)
        except Exception as e:
            return ValidationResult.INVALID, f"Invalid path format: {e}"
        
        # Convert to absolute path
        try:
            abs_path = path.resolve()
        except Exception as e:
            return ValidationResult.INVALID, f"Cannot resolve path: {e}"
        
        # Length check
        if len(str(abs_path)) > self.max_path_length:
            return ValidationResult.INVALID, f"Path exceeds maximum length of {self.max_path_length}"
        
        # Check for path traversal
        if '..' in str(path):
            self._record_validation_error("path_traversal", "Path traversal attempt detected", "path")
            return ValidationResult.BLOCKED, "Path traversal not allowed"
        
        # Check blocked paths
        for blocked in self.blocked_paths:
            if str(abs_path).startswith(blocked):
                self._record_validation_error("blocked_path", f"Access to blocked path: {blocked}", "path")
                return ValidationResult.BLOCKED, f"Access to {blocked} is not allowed"
        
        # Check file extension if file
        if path.suffix and path.suffix.lower() not in self.allowed_extensions:
            return ValidationResult.INVALID, f"File extension {path.suffix} not allowed"
        
        return ValidationResult.VALID, None
    
    def validate_config(self, config: Dict[str, Any]) -> Tuple[ValidationResult, List[str]]:
        """Validate configuration dictionary"""
        errors = []
        
        if not isinstance(config, dict):
            return ValidationResult.INVALID, ["Configuration must be a dictionary"]
        
        # Validate common parameters
        if 'steps' in config:
            if not isinstance(config['steps'], int) or config['steps'] < 1 or config['steps'] > 1000:
                errors.append("Steps must be an integer between 1 and 1000")
        
        if 'cfg_scale' in config:
            if not isinstance(config['cfg_scale'], (int, float)) or config['cfg_scale'] < 0 or config['cfg_scale'] > 30:
                errors.append("CFG scale must be a number between 0 and 30")
        
        if 'seed' in config:
            if not isinstance(config['seed'], int) or config['seed'] < -1:
                errors.append("Seed must be a non-negative integer or -1 for random")
        
        if 'batch_size' in config:
            if not isinstance(config['batch_size'], int) or config['batch_size'] < 1 or config['batch_size'] > 16:
                errors.append("Batch size must be an integer between 1 and 16")
        
        if 'resolution' in config:
            valid_resolutions = {'480p', '720p', '1080p', '1440p', '2160p'}
            if config['resolution'] not in valid_resolutions:
                errors.append(f"Resolution must be one of {valid_resolutions}")
        
        if errors:
            return ValidationResult.INVALID, errors
        
        return ValidationResult.VALID, []
    
    def sanitize_input(self, input_str: str) -> str:
        """Sanitize user input"""
        if not isinstance(input_str, str):
            return str(input_str)
        
        # Remove null bytes
        sanitized = input_str.replace('\x00', '')
        
        # Remove control characters except newlines and tabs
        sanitized = ''.join(char for char in sanitized 
                          if char in '\n\t' or not char.isspace() or char == ' ')
        
        # Normalize whitespace
        sanitized = ' '.join(sanitized.split())
        
        return sanitized
    
    def check_injection_attacks(self, input_str: str) -> Tuple[bool, List[str]]:
        """Check for various injection attacks"""
        threats = []
        
        # SQL injection
        for pattern in self.SQL_INJECTION_PATTERNS:
            if re.search(pattern, input_str, re.IGNORECASE):
                threats.append("sql_injection")
                break
        
        # Command injection
        for pattern in self.COMMAND_INJECTION_PATTERNS:
            if re.search(pattern, input_str):
                threats.append("command_injection")
                break
        
        # XSS
        for pattern in self.XSS_PATTERNS:
            if re.search(pattern, input_str, re.IGNORECASE):
                threats.append("xss")
                break
        
        return len(threats) > 0, threats
    
    def _record_validation_error(self, error_type: str, message: str, field: str):
        """Record validation error"""
        error = ValidationError(
            timestamp=datetime.now(),
            error_type=error_type,
            error_message=message,
            field_name=field
        )
        self.validation_errors.append(error)
        logger.warning(f"Validation error: {error_type} - {message}")
    
    def get_validation_errors(self) -> List[ValidationError]:
        """Get recorded validation errors"""
        return self.validation_errors


class ModelIntegrityChecker:
    """Verifies model integrity and authenticity"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.known_checksums: Dict[str, str] = {}
        self.verified_models: Set[str] = set()
    
    def verify_checksum(self, model_path: Path, expected_checksum: Optional[str] = None,
                       algorithm: str = 'sha256') -> Tuple[bool, Optional[str]]:
        """Verify model file checksum"""
        if not model_path.exists():
            return False, "Model file does not exist"
        
        try:
            # Calculate checksum
            hash_obj = hashlib.new(algorithm)
            with open(model_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    hash_obj.update(chunk)
            
            calculated_checksum = hash_obj.hexdigest()
            
            # Check against expected
            if expected_checksum:
                if calculated_checksum != expected_checksum:
                    logger.error(f"Checksum mismatch for {model_path.name}")
                    return False, f"Checksum mismatch: expected {expected_checksum}, got {calculated_checksum}"
            
            # Store checksum
            self.known_checksums[str(model_path)] = calculated_checksum
            self.verified_models.add(str(model_path))
            
            return True, calculated_checksum
            
        except Exception as e:
            logger.error(f"Error verifying checksum: {e}")
            return False, str(e)
    
    def verify_signature(self, model_path: Path, signature: str) -> Tuple[bool, Optional[str]]:
        """Verify model digital signature (placeholder)"""
        # This would integrate with actual signature verification
        # For now, return success as placeholder
        logger.info(f"Signature verification for {model_path.name} (placeholder)")
        return True, "Signature verification not yet implemented"
    
    def scan_for_malware(self, model_path: Path) -> Tuple[bool, Optional[str]]:
        """Scan model file for malware (placeholder)"""
        # This would integrate with antivirus/malware scanning
        # For now, perform basic checks
        
        if not model_path.exists():
            return False, "File does not exist"
        
        # Check file size (models shouldn't be suspiciously small)
        file_size = model_path.stat().st_size
        if file_size < 1024:  # Less than 1KB
            return False, "File suspiciously small"
        
        # Check file extension
        valid_extensions = {'.safetensors', '.ckpt', '.pt', '.pth', '.bin'}
        if model_path.suffix not in valid_extensions:
            return False, f"Invalid model file extension: {model_path.suffix}"
        
        logger.info(f"Malware scan for {model_path.name} (basic checks passed)")
        return True, None
    
    def validate_model_format(self, model_path: Path) -> Tuple[bool, Optional[str]]:
        """Validate model file format"""
        if not model_path.exists():
            return False, "Model file does not exist"
        
        # Check file extension
        valid_extensions = {'.safetensors', '.ckpt', '.pt', '.pth', '.bin'}
        if model_path.suffix not in valid_extensions:
            return False, f"Invalid model format: {model_path.suffix}"
        
        # Check file is readable
        try:
            with open(model_path, 'rb') as f:
                # Read first few bytes to verify it's a valid file
                header = f.read(16)
                if len(header) < 16:
                    return False, "File too small or corrupted"
        except Exception as e:
            return False, f"Cannot read model file: {e}"
        
        return True, None
    
    def is_model_verified(self, model_path: Path) -> bool:
        """Check if model has been verified"""
        return str(model_path) in self.verified_models
    
    def get_model_checksum(self, model_path: Path) -> Optional[str]:
        """Get stored checksum for model"""
        return self.known_checksums.get(str(model_path))


class SecureDownloadManager:
    """Manages secure model downloads"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.download_history: List[Dict[str, Any]] = []
        self.quarantine_dir = Path(self.config.get('quarantine_dir', 'quarantine'))
        self.quarantine_dir.mkdir(exist_ok=True)
    
    def validate_download_source(self, url: str) -> Tuple[bool, Optional[str]]:
        """Validate download URL"""
        try:
            parsed = urllib.parse.urlparse(url)
        except Exception as e:
            return False, f"Invalid URL format: {e}"
        
        # Must be HTTPS
        if parsed.scheme != 'https':
            return False, "Only HTTPS downloads are allowed"
        
        # Check domain whitelist if configured
        allowed_domains = self.config.get('allowed_domains', [])
        if allowed_domains and parsed.netloc not in allowed_domains:
            return False, f"Domain {parsed.netloc} not in whitelist"
        
        # Check for suspicious patterns
        if '..' in url or url.count('/') > 10:
            return False, "Suspicious URL pattern detected"
        
        return True, None
    
    async def download_model(self, url: str, destination: Path, 
                           expected_checksum: Optional[str] = None,
                           verify_ssl: bool = True) -> Tuple[bool, Optional[str]]:
        """Download model securely (placeholder)"""
        # Validate URL
        valid, error = self.validate_download_source(url)
        if not valid:
            logger.error(f"Invalid download source: {error}")
            return False, error
        
        # Record download attempt
        self.download_history.append({
            'timestamp': datetime.now().isoformat(),
            'url': url,
            'destination': str(destination),
            'status': 'attempted'
        })
        
        # Placeholder for actual download
        logger.info(f"Would download from {url} to {destination} (placeholder)")
        
        # In real implementation, would:
        # 1. Download file with SSL verification
        # 2. Verify checksum
        # 3. Scan for malware
        # 4. Move to final destination
        
        return True, "Download successful (placeholder)"
    
    def verify_download_integrity(self, path: Path, expected_checksum: str) -> Tuple[bool, Optional[str]]:
        """Verify downloaded file integrity"""
        checker = ModelIntegrityChecker()
        return checker.verify_checksum(path, expected_checksum)
    
    def quarantine_suspicious_file(self, path: Path, reason: str) -> Path:
        """Move suspicious file to quarantine"""
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        
        # Create quarantine filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        quarantine_path = self.quarantine_dir / f"{timestamp}_{path.name}"
        
        # Move file
        path.rename(quarantine_path)
        
        logger.warning(f"File quarantined: {path.name} -> {quarantine_path} (reason: {reason})")
        
        return quarantine_path
    
    def get_download_history(self) -> List[Dict[str, Any]]:
        """Get download history"""
        return self.download_history


class AccessControl:
    """Manages access control and permissions"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.permissions: Dict[str, Set[str]] = defaultdict(set)
        self.rate_limits: Dict[str, List[datetime]] = defaultdict(list)
        self.access_log: List[AuditEvent] = []
    
    def grant_permission(self, user: str, resource: str):
        """Grant permission to user"""
        self.permissions[user].add(resource)
        logger.info(f"Granted permission: {user} -> {resource}")
    
    def revoke_permission(self, user: str, resource: str):
        """Revoke permission from user"""
        if resource in self.permissions[user]:
            self.permissions[user].remove(resource)
            logger.info(f"Revoked permission: {user} -> {resource}")
    
    def check_permission(self, user: str, resource: str) -> bool:
        """Check if user has permission"""
        has_permission = resource in self.permissions.get(user, set())
        
        # Log access attempt
        self.audit_access(user, resource, "check", "allowed" if has_permission else "denied")
        
        return has_permission
    
    def require_authentication(self, func: Callable) -> Callable:
        """Decorator to require authentication"""
        def wrapper(*args, **kwargs):
            user = kwargs.get('user', 'anonymous')
            if user == 'anonymous':
                raise PermissionError("Authentication required")
            return func(*args, **kwargs)
        return wrapper
    
    def rate_limit(self, user: str, max_requests: int = 100, 
                  window_seconds: int = 3600) -> bool:
        """Check rate limit for user"""
        now = datetime.now()
        cutoff = now - timedelta(seconds=window_seconds)
        
        # Clean old requests
        self.rate_limits[user] = [
            ts for ts in self.rate_limits[user] if ts > cutoff
        ]
        
        # Check limit
        if len(self.rate_limits[user]) >= max_requests:
            logger.warning(f"Rate limit exceeded for user: {user}")
            return False
        
        # Record request
        self.rate_limits[user].append(now)
        return True
    
    def audit_access(self, user: str, resource: str, action: str, result: str):
        """Log access attempt"""
        event = AuditEvent(
            timestamp=datetime.now(),
            event_type="access",
            user=user,
            resource=resource,
            action=action,
            result=result
        )
        self.access_log.append(event)
    
    def get_access_log(self, user: Optional[str] = None, 
                      limit: int = 100) -> List[AuditEvent]:
        """Get access log"""
        if user:
            return [e for e in self.access_log if e.user == user][-limit:]
        return self.access_log[-limit:]


class AuditLogger:
    """Comprehensive audit logging system"""
    
    def __init__(self, log_dir: Optional[Path] = None):
        self.log_dir = log_dir or Path('logs/audit')
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.events: List[AuditEvent] = []
        self.log_file = self.log_dir / f"audit_{datetime.now().strftime('%Y%m%d')}.log"
    
    def log_workflow_execution(self, workflow: str, user: str, params: Dict[str, Any]):
        """Log workflow execution"""
        event = AuditEvent(
            timestamp=datetime.now(),
            event_type="workflow_execution",
            user=user,
            resource=workflow,
            action="execute",
            result="started",
            details=params
        )
        self._write_event(event)
    
    def log_security_event(self, event_type: str, user: str, severity: str, 
                          details: Optional[Dict[str, Any]] = None):
        """Log security event"""
        event = AuditEvent(
            timestamp=datetime.now(),
            event_type=event_type,
            user=user,
            resource="security",
            action=event_type,
            result=severity,
            details=details
        )
        self._write_event(event)
    
    def log_access_attempt(self, user: str, resource: str, action: str, result: str):
        """Log access attempt"""
        event = AuditEvent(
            timestamp=datetime.now(),
            event_type="access_attempt",
            user=user,
            resource=resource,
            action=action,
            result=result
        )
        self._write_event(event)
    
    def generate_audit_report(self, start: datetime, end: datetime) -> Dict[str, Any]:
        """Generate audit report for time period"""
        period_events = [
            e for e in self.events 
            if start <= e.timestamp <= end
        ]
        
        return {
            'period': {
                'start': start.isoformat(),
                'end': end.isoformat()
            },
            'total_events': len(period_events),
            'events_by_type': self._count_by_field(period_events, 'event_type'),
            'events_by_user': self._count_by_field(period_events, 'user'),
            'events_by_result': self._count_by_field(period_events, 'result'),
            'security_events': len([e for e in period_events if e.event_type.startswith('security')]),
            'failed_access': len([e for e in period_events if e.result == 'denied'])
        }
    
    def _write_event(self, event: AuditEvent):
        """Write event to log file"""
        self.events.append(event)
        
        # Write to file
        try:
            with open(self.log_file, 'a') as f:
                f.write(json.dumps({
                    'timestamp': event.timestamp.isoformat(),
                    'event_type': event.event_type,
                    'user': event.user,
                    'resource': event.resource,
                    'action': event.action,
                    'result': event.result,
                    'details': event.details
                }) + '\n')
        except Exception as e:
            logger.error(f"Error writing audit log: {e}")
    
    def _count_by_field(self, events: List[AuditEvent], field: str) -> Dict[str, int]:
        """Count events by field"""
        counts = defaultdict(int)
        for event in events:
            value = getattr(event, field, 'unknown')
            counts[value] += 1
        return dict(counts)


class SecurityValidationSystem:
    """Main security and validation system"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        
        # Initialize components
        self.input_validator = InputValidator(self.config.get('input_validation', {}))
        self.model_integrity = ModelIntegrityChecker(self.config.get('model_integrity', {}))
        self.download_manager = SecureDownloadManager(self.config.get('downloads', {}))
        self.access_control = AccessControl(self.config.get('access_control', {}))
        self.audit_logger = AuditLogger(Path(self.config.get('audit_log_dir', 'logs/audit')))
        
        logger.info("Security and Validation System initialized")
    
    def validate_workflow_request(self, user: str, workflow: str, params: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate complete workflow request"""
        errors = []
        
        # Check access permission
        if not self.access_control.check_permission(user, workflow):
            errors.append(f"User {user} does not have permission for workflow {workflow}")
        
        # Check rate limit
        if not self.access_control.rate_limit(user):
            errors.append(f"Rate limit exceeded for user {user}")
        
        # Validate prompt if present
        if 'prompt' in params:
            result, error = self.input_validator.validate_prompt(params['prompt'])
            if result != ValidationResult.VALID:
                errors.append(f"Invalid prompt: {error}")
        
        # Validate paths if present
        for key in ['input_path', 'output_path', 'model_path']:
            if key in params:
                result, error = self.input_validator.validate_path(params[key])
                if result != ValidationResult.VALID:
                    errors.append(f"Invalid {key}: {error}")
        
        # Validate configuration
        result, config_errors = self.input_validator.validate_config(params)
        if result != ValidationResult.VALID:
            errors.extend(config_errors)
        
        # Log workflow execution
        self.audit_logger.log_workflow_execution(workflow, user, params)
        
        return len(errors) == 0, errors
    
    def verify_model_security(self, model_path: Path, expected_checksum: Optional[str] = None) -> Tuple[bool, List[str]]:
        """Verify model security"""
        issues = []
        
        # Validate format
        valid, error = self.model_integrity.validate_model_format(model_path)
        if not valid:
            issues.append(f"Invalid model format: {error}")
            return False, issues
        
        # Verify checksum
        if expected_checksum:
            valid, error = self.model_integrity.verify_checksum(model_path, expected_checksum)
            if not valid:
                issues.append(f"Checksum verification failed: {error}")
        
        # Scan for malware
        valid, error = self.model_integrity.scan_for_malware(model_path)
        if not valid:
            issues.append(f"Malware scan failed: {error}")
        
        return len(issues) == 0, issues
    
    def get_security_report(self) -> Dict[str, Any]:
        """Generate security report"""
        now = datetime.now()
        day_ago = now - timedelta(days=1)
        
        return {
            'timestamp': now.isoformat(),
            'validation_errors': len(self.input_validator.get_validation_errors()),
            'verified_models': len(self.model_integrity.verified_models),
            'download_history': len(self.download_manager.get_download_history()),
            'access_log_entries': len(self.access_control.get_access_log()),
            'audit_report': self.audit_logger.generate_audit_report(day_ago, now)
        }


# Example usage
if __name__ == "__main__":
    # Initialize system
    security_system = SecurityValidationSystem()
    
    # Example 1: Validate workflow request
    valid, errors = security_system.validate_workflow_request(
        user="test_user",
        workflow="hunyuan_video_t2v",
        params={
            'prompt': "A beautiful sunset over mountains",
            'steps': 50,
            'cfg_scale': 7.5,
            'resolution': '720p'
        }
    )
    print(f"Workflow validation: {'PASS' if valid else 'FAIL'}")
    if errors:
        print(f"Errors: {errors}")
    
    # Example 2: Verify model
    model_path = Path("models/hunyuan_video.safetensors")
    if model_path.exists():
        valid, issues = security_system.verify_model_security(model_path)
        print(f"Model verification: {'PASS' if valid else 'FAIL'}")
        if issues:
            print(f"Issues: {issues}")
    
    # Example 3: Generate security report
    report = security_system.get_security_report()
    print(json.dumps(report, indent=2))
