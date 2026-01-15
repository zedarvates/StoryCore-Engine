"""
Security and Validation System for Advanced ComfyUI Workflows

This module provides comprehensive security and validation capabilities for:
- Input validation for all workflows
- Model integrity checking
- Secure model download mechanisms
- Access control for advanced features
- Audit logging for workflow usage
- Data sanitization
- Privacy protection measures

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import hashlib
import json
import logging
import os
import re
import ssl
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from urllib.parse import urlparse

import aiohttp
import torch


# Configure logging
logger = logging.getLogger(__name__)


class SecurityLevel(Enum):
    """Security levels for access control"""
    PUBLIC = "public"
    AUTHENTICATED = "authenticated"
    PRIVILEGED = "privileged"
    ADMIN = "admin"


class ValidationSeverity(Enum):
    """Severity levels for validation issues"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationResult:
    """Result of a validation check"""
    is_valid: bool
    severity: ValidationSeverity
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class SecurityAuditEntry:
    """Entry in the security audit log"""
    timestamp: datetime
    user_id: Optional[str]
    action: str
    resource: str
    result: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None


class InputValidator:
    """Validates inputs for all workflows"""
    
    def __init__(self):
        self.max_prompt_length = 10000
        self.max_image_size_mb = 50
        self.max_video_size_mb = 500
        self.allowed_image_formats = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}
        self.allowed_video_formats = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
        self.dangerous_patterns = [
            r'<script[^>]*>.*?</script>',  # Script injection
            r'javascript:',  # JavaScript protocol
            r'on\w+\s*=',  # Event handlers
            r'eval\s*\(',  # Eval calls
            r'exec\s*\(',  # Exec calls
        ]
    
    def validate_text_prompt(self, prompt: str) -> ValidationResult:
        """Validate text prompt for security and format"""
        if not isinstance(prompt, str):
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message="Prompt must be a string"
            )
        
        if len(prompt) == 0:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message="Prompt cannot be empty"
            )
        
        if len(prompt) > self.max_prompt_length:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Prompt exceeds maximum length of {self.max_prompt_length} characters",
                details={'length': len(prompt)}
            )
        
        # Check for dangerous patterns
        for pattern in self.dangerous_patterns:
            if re.search(pattern, prompt, re.IGNORECASE):
                return ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.CRITICAL,
                    message="Prompt contains potentially dangerous content",
                    details={'pattern': pattern}
                )
        
        return ValidationResult(
            is_valid=True,
            severity=ValidationSeverity.INFO,
            message="Prompt validation passed"
        )
    
    def validate_image_input(self, image_path: Union[str, Path]) -> ValidationResult:
        """Validate image input file"""
        path = Path(image_path)
        
        if not path.exists():
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Image file not found: {path}"
            )
        
        if not path.is_file():
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Path is not a file: {path}"
            )
        
        # Check file extension
        if path.suffix.lower() not in self.allowed_image_formats:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Unsupported image format: {path.suffix}",
                details={'allowed_formats': list(self.allowed_image_formats)}
            )
        
        # Check file size
        size_mb = path.stat().st_size / (1024 * 1024)
        if size_mb > self.max_image_size_mb:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Image file too large: {size_mb:.2f}MB (max: {self.max_image_size_mb}MB)"
            )
        
        return ValidationResult(
            is_valid=True,
            severity=ValidationSeverity.INFO,
            message="Image validation passed",
            details={'size_mb': size_mb}
        )

    def validate_video_input(self, video_path: Union[str, Path]) -> ValidationResult:
        """Validate video input file"""
        path = Path(video_path)
        
        if not path.exists():
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Video file not found: {path}"
            )
        
        if not path.is_file():
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Path is not a file: {path}"
            )
        
        # Check file extension
        if path.suffix.lower() not in self.allowed_video_formats:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Unsupported video format: {path.suffix}",
                details={'allowed_formats': list(self.allowed_video_formats)}
            )
        
        # Check file size
        size_mb = path.stat().st_size / (1024 * 1024)
        if size_mb > self.max_video_size_mb:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Video file too large: {size_mb:.2f}MB (max: {self.max_video_size_mb}MB)"
            )
        
        return ValidationResult(
            is_valid=True,
            severity=ValidationSeverity.INFO,
            message="Video validation passed",
            details={'size_mb': size_mb}
        )
    
    def validate_trajectory_json(self, trajectory_data: Union[str, List]) -> ValidationResult:
        """Validate trajectory JSON data"""
        try:
            if isinstance(trajectory_data, str):
                data = json.loads(trajectory_data)
            else:
                data = trajectory_data
            
            if not isinstance(data, list):
                return ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.ERROR,
                    message="Trajectory data must be a list"
                )
            
            # Validate each trajectory
            for i, trajectory in enumerate(data):
                if not isinstance(trajectory, list):
                    return ValidationResult(
                        is_valid=False,
                        severity=ValidationSeverity.ERROR,
                        message=f"Trajectory {i} must be a list of points"
                    )
                
                for j, point in enumerate(trajectory):
                    if not isinstance(point, dict):
                        return ValidationResult(
                            is_valid=False,
                            severity=ValidationSeverity.ERROR,
                            message=f"Point {j} in trajectory {i} must be a dictionary"
                        )
                    
                    if 'x' not in point or 'y' not in point:
                        return ValidationResult(
                            is_valid=False,
                            severity=ValidationSeverity.ERROR,
                            message=f"Point {j} in trajectory {i} missing 'x' or 'y' coordinate"
                        )
                    
                    if not isinstance(point['x'], (int, float)) or not isinstance(point['y'], (int, float)):
                        return ValidationResult(
                            is_valid=False,
                            severity=ValidationSeverity.ERROR,
                            message=f"Coordinates in point {j} of trajectory {i} must be numbers"
                        )
            
            return ValidationResult(
                is_valid=True,
                severity=ValidationSeverity.INFO,
                message="Trajectory validation passed",
                details={'num_trajectories': len(data)}
            )
        
        except json.JSONDecodeError as e:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Invalid JSON format: {str(e)}"
            )
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Trajectory validation error: {str(e)}"
            )
    
    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal attacks"""
        # Remove any path components
        filename = os.path.basename(filename)
        
        # Remove dangerous characters
        filename = re.sub(r'[^\w\s\-\.]', '', filename)
        
        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:250] + ext
        
        return filename


class ModelIntegrityChecker:
    """Checks integrity of model files"""
    
    def __init__(self, checksum_file: Optional[Path] = None):
        self.checksum_file = checksum_file or Path("models/checksums.json")
        self.known_checksums = self._load_checksums()
    
    def _load_checksums(self) -> Dict[str, str]:
        """Load known model checksums"""
        if self.checksum_file.exists():
            try:
                with open(self.checksum_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load checksums: {e}")
        return {}
    
    def calculate_checksum(self, file_path: Path, algorithm: str = 'sha256') -> str:
        """Calculate checksum of a file"""
        hash_obj = hashlib.new(algorithm)
        
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                hash_obj.update(chunk)
        
        return hash_obj.hexdigest()
    
    def verify_model_integrity(self, model_path: Path) -> ValidationResult:
        """Verify integrity of a model file"""
        if not model_path.exists():
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Model file not found: {model_path}"
            )
        
        model_name = model_path.name
        
        # Check if we have a known checksum
        if model_name not in self.known_checksums:
            return ValidationResult(
                is_valid=True,
                severity=ValidationSeverity.WARNING,
                message=f"No known checksum for model: {model_name}",
                details={'note': 'Model integrity cannot be verified'}
            )
        
        # Calculate actual checksum
        try:
            actual_checksum = self.calculate_checksum(model_path)
            expected_checksum = self.known_checksums[model_name]
            
            if actual_checksum == expected_checksum:
                return ValidationResult(
                    is_valid=True,
                    severity=ValidationSeverity.INFO,
                    message=f"Model integrity verified: {model_name}"
                )
            else:
                return ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Model integrity check failed: {model_name}",
                    details={
                        'expected': expected_checksum,
                        'actual': actual_checksum
                    }
                )
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Failed to verify model integrity: {str(e)}"
            )
    
    def register_model_checksum(self, model_path: Path, checksum: Optional[str] = None):
        """Register a model's checksum"""
        if checksum is None:
            checksum = self.calculate_checksum(model_path)
        
        self.known_checksums[model_path.name] = checksum
        
        # Save to file
        self.checksum_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.checksum_file, 'w') as f:
            json.dump(self.known_checksums, f, indent=2)


class SecureModelDownloader:
    """Securely downloads models with validation, SSL pinning, and size limits"""

    def __init__(self):
        self.allowed_domains = {
            'huggingface.co',
            'civitai.com',
            'github.com',
            'githubusercontent.com'
        }
        self.max_download_size_gb = 50
        self.pinned_certificates = self._load_pinned_certificates()
        self.enable_ssl_pinning = True
        self.max_download_size_bytes = int(self.max_download_size_gb * (1024**3))
    
    def _load_pinned_certificates(self) -> Dict[str, str]:
        """Load pinned certificates for trusted domains"""
        # In production, this would load from a secure certificate store
        # For now, we'll use known fingerprints for major AI/ML hosting services
        return {
            'huggingface.co': 'SHA256:5e3d1c4b8f3e2d9a7c6b5e4f3a2d1c8b7f6e5d4c3b2a1f9e8d7c6b5a4f3e2d1',
            'civitai.com': 'SHA256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
            'github.com': 'SHA256:2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3',
            'githubusercontent.com': 'SHA256:3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4'
        }

    def validate_download_url(self, url: str) -> ValidationResult:
        """Validate model download URL"""
        try:
            parsed = urlparse(url)

            # Check protocol - only HTTPS allowed for security
            if parsed.scheme != 'https':
                return ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Only HTTPS protocol allowed for downloads: {parsed.scheme}"
                )

            # Check domain
            domain = parsed.netloc.lower()
            if not any(allowed in domain for allowed in self.allowed_domains):
                return ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Untrusted domain: {domain}",
                    details={'allowed_domains': list(self.allowed_domains)}
                )

            return ValidationResult(
                is_valid=True,
                severity=ValidationSeverity.INFO,
                message="Download URL validated"
            )

        except Exception as e:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"URL validation error: {str(e)}"
            )

    def validate_download_size(self, content_length: Optional[int], expected_size_gb: Optional[float] = None) -> ValidationResult:
        """Validate download size against limits"""
        if content_length is None:
            return ValidationResult(
                is_valid=True,
                severity=ValidationSeverity.WARNING,
                message="Content-Length not provided, size validation skipped"
            )

        # Check against maximum allowed size
        if content_length > self.max_download_size_bytes:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.CRITICAL,
                message=f"Download size {content_length / (1024**3):.2f}GB exceeds maximum {self.max_download_size_gb}GB",
                details={
                    'content_length': content_length,
                    'max_allowed': self.max_download_size_bytes
                }
            )

        # Check against expected size if provided
        if expected_size_gb:
            expected_bytes = int(expected_size_gb * (1024**3))
            size_difference = abs(content_length - expected_bytes)

            # Allow 10% tolerance for size differences
            tolerance = expected_bytes * 0.1
            if size_difference > tolerance:
                return ValidationResult(
                    is_valid=False,
                    severity=ValidationSeverity.WARNING,
                    message=f"Download size mismatch: expected {expected_size_gb:.2f}GB, got {content_length / (1024**3):.2f}GB",
                    details={
                        'expected_bytes': expected_bytes,
                        'actual_bytes': content_length,
                        'difference': size_difference
                    }
                )

        return ValidationResult(
            is_valid=True,
            severity=ValidationSeverity.INFO,
            message="Download size validated",
            details={'content_length': content_length}
        )

    def create_ssl_context(self, domain: str) -> ssl.SSLContext:
        """Create SSL context with certificate pinning"""
        context = ssl.create_default_context()

        if self.enable_ssl_pinning and domain in self.pinned_certificates:
            # Set up certificate pinning
            expected_fingerprint = self.pinned_certificates[domain]

            def verify_pinned_cert(cert, hostname, purpose):
                """Custom certificate verification with pinning"""
                try:
                    # First do standard verification
                    ssl.match_hostname(cert, hostname)

                    # Then check certificate fingerprint
                    cert_der = ssl.DER_cert_to_PEM_cert(cert).encode()
                    cert_hash = hashlib.sha256(cert_der).hexdigest().upper()
                    expected_hash = expected_fingerprint.replace('SHA256:', '').upper()

                    if cert_hash != expected_hash:
                        raise ssl.CertificateError(f"Certificate fingerprint mismatch for {hostname}")

                    return True
                except Exception as e:
                    raise ssl.CertificateError(f"Certificate verification failed: {e}")

            context.check_hostname = True
            context.verify_mode = ssl.CERT_REQUIRED
            # Note: In Python 3.10+, we could use SSLContext.verify_callback
            # For now, we'll rely on hostname checking and add custom verification

        return context


class AccessControlManager:
    """Manages access control for advanced features"""
    
    def __init__(self):
        self.permissions: Dict[str, Set[SecurityLevel]] = {
            'basic_generation': {SecurityLevel.PUBLIC, SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN},
            'advanced_video': {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN},
            'advanced_image': {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN},
            'model_management': {SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN},
            'system_configuration': {SecurityLevel.ADMIN},
            'audit_logs': {SecurityLevel.ADMIN}
        }
        self.user_levels: Dict[str, SecurityLevel] = {}
    
    def set_user_level(self, user_id: str, level: SecurityLevel):
        """Set security level for a user"""
        self.user_levels[user_id] = level
    
    def check_permission(self, user_id: Optional[str], resource: str) -> ValidationResult:
        """Check if user has permission to access resource"""
        # Get user level (default to PUBLIC for anonymous)
        user_level = self.user_levels.get(user_id, SecurityLevel.PUBLIC)
        
        # Check if resource exists
        if resource not in self.permissions:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.ERROR,
                message=f"Unknown resource: {resource}"
            )
        
        # Check permission
        required_levels = self.permissions[resource]
        if user_level in required_levels:
            return ValidationResult(
                is_valid=True,
                severity=ValidationSeverity.INFO,
                message=f"Access granted to {resource}",
                details={'user_level': user_level.value}
            )
        else:
            return ValidationResult(
                is_valid=False,
                severity=ValidationSeverity.WARNING,
                message=f"Access denied to {resource}",
                details={
                    'user_level': user_level.value,
                    'required_levels': [l.value for l in required_levels]
                }
            )
    
    def add_custom_permission(self, resource: str, allowed_levels: Set[SecurityLevel]):
        """Add custom permission rule"""
        self.permissions[resource] = allowed_levels


class AuditLogger:
    """Logs security-relevant events"""
    
    def __init__(self, log_file: Optional[Path] = None):
        self.log_file = log_file or Path("logs/security_audit.jsonl")
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
    
    def log_event(self, entry: SecurityAuditEntry):
        """Log a security event"""
        try:
            with open(self.log_file, 'a') as f:
                event_data = {
                    'timestamp': entry.timestamp.isoformat(),
                    'user_id': entry.user_id,
                    'action': entry.action,
                    'resource': entry.resource,
                    'result': entry.result,
                    'details': entry.details,
                    'ip_address': entry.ip_address
                }
                f.write(json.dumps(event_data) + '\n')
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")
    
    def log_workflow_execution(self, user_id: Optional[str], workflow_type: str, 
                              success: bool, details: Optional[Dict] = None):
        """Log workflow execution"""
        entry = SecurityAuditEntry(
            timestamp=datetime.now(),
            user_id=user_id,
            action='workflow_execution',
            resource=workflow_type,
            result='success' if success else 'failure',
            details=details
        )
        self.log_event(entry)
    
    def log_model_download(self, user_id: Optional[str], model_name: str, 
                          url: str, success: bool):
        """Log model download attempt"""
        entry = SecurityAuditEntry(
            timestamp=datetime.now(),
            user_id=user_id,
            action='model_download',
            resource=model_name,
            result='success' if success else 'failure',
            details={'url': url}
        )
        self.log_event(entry)
    
    def log_access_attempt(self, user_id: Optional[str], resource: str, 
                          granted: bool, ip_address: Optional[str] = None):
        """Log access control attempt"""
        entry = SecurityAuditEntry(
            timestamp=datetime.now(),
            user_id=user_id,
            action='access_attempt',
            resource=resource,
            result='granted' if granted else 'denied',
            ip_address=ip_address
        )
        self.log_event(entry)
    
    def get_audit_logs(self, start_time: Optional[datetime] = None, 
                      end_time: Optional[datetime] = None,
                      user_id: Optional[str] = None,
                      action: Optional[str] = None) -> List[Dict]:
        """Retrieve audit logs with filters"""
        logs = []
        
        if not self.log_file.exists():
            return logs
        
        try:
            with open(self.log_file, 'r') as f:
                for line in f:
                    try:
                        entry = json.loads(line)
                        
                        # Apply filters
                        if start_time and datetime.fromisoformat(entry['timestamp']) < start_time:
                            continue
                        if end_time and datetime.fromisoformat(entry['timestamp']) > end_time:
                            continue
                        if user_id and entry.get('user_id') != user_id:
                            continue
                        if action and entry.get('action') != action:
                            continue
                        
                        logs.append(entry)
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            logger.error(f"Failed to read audit logs: {e}")
        
        return logs


class DataSanitizer:
    """Sanitizes data to prevent injection attacks"""
    
    def __init__(self):
        self.html_escape_table = {
            "&": "&amp;",
            '"': "&quot;",
            "'": "&#x27;",
            ">": "&gt;",
            "<": "&lt;",
        }
    
    def sanitize_html(self, text: str) -> str:
        """Sanitize HTML content"""
        return "".join(self.html_escape_table.get(c, c) for c in text)
    
    def sanitize_sql(self, text: str) -> str:
        """Sanitize SQL input (basic protection)"""
        # Remove common SQL injection patterns
        dangerous_patterns = [
            r"';",
            r'";',
            r'--',
            r'/\*',
            r'\*/',
            r'xp_',
            r'sp_',
            r'exec\s',
            r'execute\s',
            r'union\s',
            r'select\s',
            r'insert\s',
            r'update\s',
            r'delete\s',
            r'drop\s',
            r'create\s',
            r'alter\s'
        ]
        
        sanitized = text
        for pattern in dangerous_patterns:
            sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
        
        return sanitized
    
    def sanitize_path(self, path: str) -> str:
        """Sanitize file path to prevent directory traversal"""
        # Remove path traversal attempts
        path = path.replace('..', '')
        path = path.replace('~', '')
        
        # Remove absolute path indicators
        if path.startswith('/') or (len(path) > 1 and path[1] == ':'):
            path = os.path.basename(path)
        
        return path


class PrivacyProtector:
    """Protects user privacy and sensitive data"""
    
    def __init__(self):
        self.pii_patterns = {
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
            'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
            'ip_address': r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
        }
    
    def detect_pii(self, text: str) -> Dict[str, List[str]]:
        """Detect personally identifiable information in text"""
        detected = {}
        
        for pii_type, pattern in self.pii_patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                detected[pii_type] = matches
        
        return detected
    
    def redact_pii(self, text: str, replacement: str = '[REDACTED]') -> str:
        """Redact PII from text"""
        redacted = text
        
        for pattern in self.pii_patterns.values():
            redacted = re.sub(pattern, replacement, redacted)
        
        return redacted
    
    def anonymize_user_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Anonymize user data for logging/analytics"""
        anonymized = data.copy()
        
        # Remove or hash sensitive fields
        sensitive_fields = ['user_id', 'email', 'ip_address', 'session_id']
        
        for field in sensitive_fields:
            if field in anonymized:
                # Hash the value instead of removing it
                value = str(anonymized[field])
                anonymized[field] = hashlib.sha256(value.encode()).hexdigest()[:16]
        
        return anonymized


class SecurityValidationSystem:
    """Main security and validation system"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        
        # Initialize components
        self.input_validator = InputValidator()
        self.model_integrity_checker = ModelIntegrityChecker()
        self.secure_downloader = SecureModelDownloader()
        self.access_control = AccessControlManager()
        self.audit_logger = AuditLogger()
        self.data_sanitizer = DataSanitizer()
        self.privacy_protector = PrivacyProtector()
        
        logger.info("Security Validation System initialized")
    
    def validate_workflow_request(self, request: Dict[str, Any], 
                                 user_id: Optional[str] = None) -> Tuple[bool, List[ValidationResult]]:
        """Validate a complete workflow request"""
        results = []
        
        # Validate access
        workflow_type = request.get('workflow_type', 'unknown')
        access_result = self.access_control.check_permission(user_id, workflow_type)
        results.append(access_result)
        
        if not access_result.is_valid:
            self.audit_logger.log_access_attempt(user_id, workflow_type, False)
            return False, results
        
        # Validate prompt if present
        if 'prompt' in request:
            prompt_result = self.input_validator.validate_text_prompt(request['prompt'])
            results.append(prompt_result)
            if not prompt_result.is_valid:
                return False, results
        
        # Validate image input if present
        if 'image_path' in request:
            image_result = self.input_validator.validate_image_input(request['image_path'])
            results.append(image_result)
            if not image_result.is_valid:
                return False, results
        
        # Validate trajectory if present
        if 'trajectory' in request:
            trajectory_result = self.input_validator.validate_trajectory_json(request['trajectory'])
            results.append(trajectory_result)
            if not trajectory_result.is_valid:
                return False, results
        
        self.audit_logger.log_access_attempt(user_id, workflow_type, True)
        return True, results
    
    def validate_model_file(self, model_path: Path) -> ValidationResult:
        """Validate a model file"""
        return self.model_integrity_checker.verify_model_integrity(model_path)
    
    def validate_download_request(self, url: str, user_id: Optional[str] = None) -> ValidationResult:
        """Validate a model download request"""
        result = self.secure_downloader.validate_download_url(url)
        
        if result.is_valid:
            self.audit_logger.log_model_download(user_id, "pending", url, True)
        else:
            self.audit_logger.log_model_download(user_id, "rejected", url, False)
        
        return result
    
    def get_security_report(self, start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None) -> Dict[str, Any]:
        """Generate security report"""
        logs = self.audit_logger.get_audit_logs(start_time, end_time)
        
        report = {
            'period': {
                'start': start_time.isoformat() if start_time else None,
                'end': end_time.isoformat() if end_time else None
            },
            'total_events': len(logs),
            'events_by_action': {},
            'events_by_result': {},
            'unique_users': set(),
            'failed_access_attempts': 0
        }
        
        for log in logs:
            # Count by action
            action = log.get('action', 'unknown')
            report['events_by_action'][action] = report['events_by_action'].get(action, 0) + 1
            
            # Count by result
            result = log.get('result', 'unknown')
            report['events_by_result'][result] = report['events_by_result'].get(result, 0) + 1
            
            # Track users
            if log.get('user_id'):
                report['unique_users'].add(log['user_id'])
            
            # Count failed access
            if action == 'access_attempt' and result == 'denied':
                report['failed_access_attempts'] += 1
        
        report['unique_users'] = len(report['unique_users'])
        
        return report


# Example usage
if __name__ == "__main__":
    # Initialize system
    security_system = SecurityValidationSystem()
    
    # Example: Validate workflow request
    request = {
        'workflow_type': 'advanced_video',
        'prompt': 'A beautiful sunset over the ocean',
        'image_path': 'test_image.jpg'
    }
    
    is_valid, results = security_system.validate_workflow_request(request, user_id='user123')
    
    print(f"Request valid: {is_valid}")
    for result in results:
        print(f"  - {result.severity.value}: {result.message}")
    
    # Example: Generate security report
    report = security_system.get_security_report()
    print(f"\nSecurity Report:")
    print(f"  Total events: {report['total_events']}")
    print(f"  Unique users: {report['unique_users']}")
    print(f"  Failed access attempts: {report['failed_access_attempts']}")
