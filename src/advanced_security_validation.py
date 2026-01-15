"""
Advanced Security and Validation System for ComfyUI Workflows

This module provides comprehensive security validation, input sanitization,
model integrity checking, and access control for advanced workflows.
"""

import os
import json
import hashlib
import logging
import re
import time
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from pathlib import Path
from enum import Enum
import base64
import urllib.parse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import secure logging
from .secure_logging import SecureAuditLogger


class SecurityLevel(Enum):
    """Security levels for different operations"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ValidationResult(Enum):
    """Validation result types"""
    VALID = "valid"
    INVALID = "invalid"
    SUSPICIOUS = "suspicious"
    BLOCKED = "blocked"


@dataclass
class SecurityConfig:
    """Security configuration settings"""
    
    # Input validation settings
    max_prompt_length: int = 2000
    max_file_size_mb: int = 50
    allowed_file_extensions: List[str] = field(default_factory=lambda: [
        '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'
    ])
    
    # Model security settings
    verify_model_checksums: bool = True
    require_signed_models: bool = False
    model_quarantine_enabled: bool = True
    
    # Access control settings
    enable_authentication: bool = False
    require_api_keys: bool = False
    session_timeout_minutes: int = 60
    max_failed_attempts: int = 5
    
    # Rate limiting settings
    enable_rate_limiting: bool = True
    requests_per_minute: int = 60
    burst_limit: int = 10
    
    # Audit logging settings
    enable_audit_logging: bool = True
    log_all_requests: bool = True
    log_sensitive_data: bool = False
    audit_retention_days: int = 90
    
    # Privacy settings
    anonymize_user_data: bool = True
    encrypt_stored_data: bool = False
    encrypt_audit_logs: bool = True  # Enable AES encryption for audit logs
    data_retention_days: int = 30
    
    # Security thresholds
    suspicious_activity_threshold: int = 10
    auto_block_threshold: int = 20
    security_scan_interval: int = 3600  # seconds


@dataclass
class ValidationReport:
    """Security validation report"""
    timestamp: datetime
    validation_type: str
    result: ValidationResult
    details: Dict[str, Any]
    risk_score: float
    recommendations: List[str] = field(default_factory=list)
    blocked_items: List[str] = field(default_factory=list)


@dataclass
class AuditLogEntry:
    """Audit log entry"""
    timestamp: datetime
    user_id: Optional[str]
    session_id: Optional[str]
    action: str
    resource: str
    result: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


class InputValidator:
    """Comprehensive input validation system"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        
        # Compile regex patterns for efficiency
        self.patterns = {
            'sql_injection': re.compile(r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)', re.IGNORECASE),
            'xss': re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
            'path_traversal': re.compile(r'\.\.[\\/]'),
            'command_injection': re.compile(r'[;&|`$(){}[\]<>]'),
            'suspicious_chars': re.compile(r'[^\w\s\-.,!?@#$%^&*()+={}[\]:";\'<>?/~`]'),
        }
        
        # Known malicious patterns
        self.malicious_patterns = [
            'eval(', 'exec(', 'import os', 'subprocess', '__import__',
            'file://', 'ftp://', 'data:', 'javascript:', 'vbscript:',
            'onload=', 'onerror=', 'onclick=', 'onmouseover='
        ]
    
    def validate_prompt(self, prompt: str, user_id: str = None) -> ValidationReport:
        """Validate user prompt input"""
        details = {}
        risk_score = 0.0
        recommendations = []
        blocked_items = []
        
        # Length validation
        if len(prompt) > self.config.max_prompt_length:
            risk_score += 0.3
            recommendations.append(f"Prompt exceeds maximum length ({self.config.max_prompt_length} chars)")
            blocked_items.append("excessive_length")
        
        # Pattern matching
        for pattern_name, pattern in self.patterns.items():
            matches = pattern.findall(prompt)
            if matches:
                risk_score += 0.4
                details[f"{pattern_name}_matches"] = len(matches)
                recommendations.append(f"Detected {pattern_name} patterns")
                blocked_items.append(pattern_name)
        
        # Malicious content detection
        malicious_found = []
        for malicious in self.malicious_patterns:
            if malicious.lower() in prompt.lower():
                malicious_found.append(malicious)
                risk_score += 0.5
        
        if malicious_found:
            details["malicious_patterns"] = malicious_found
            recommendations.append("Detected potentially malicious content")
            blocked_items.extend(malicious_found)
        
        # Determine result
        if risk_score >= 0.8:
            result = ValidationResult.BLOCKED
        elif risk_score >= 0.5:
            result = ValidationResult.SUSPICIOUS
        elif risk_score >= 0.2:
            result = ValidationResult.INVALID
        else:
            result = ValidationResult.VALID
        
        details.update({
            "prompt_length": len(prompt),
            "risk_score": risk_score,
            "user_id": user_id
        })
        
        return ValidationReport(
            timestamp=datetime.now(),
            validation_type="prompt_validation",
            result=result,
            details=details,
            risk_score=risk_score,
            recommendations=recommendations,
            blocked_items=blocked_items
        )
    
    def validate_file_upload(self, file_path: str, file_size: int, user_id: str = None) -> ValidationReport:
        """Validate file upload"""
        details = {}
        risk_score = 0.0
        recommendations = []
        blocked_items = []
        
        # File extension validation
        file_ext = Path(file_path).suffix.lower()
        if file_ext not in self.config.allowed_file_extensions:
            risk_score += 0.6
            recommendations.append(f"File extension '{file_ext}' not allowed")
            blocked_items.append("invalid_extension")
        
        # File size validation
        file_size_mb = file_size / (1024 * 1024)
        if file_size_mb > self.config.max_file_size_mb:
            risk_score += 0.4
            recommendations.append(f"File size ({file_size_mb:.1f}MB) exceeds limit ({self.config.max_file_size_mb}MB)")
            blocked_items.append("excessive_size")
        
        # Path traversal check
        if self.patterns['path_traversal'].search(file_path):
            risk_score += 0.8
            recommendations.append("Path traversal attempt detected")
            blocked_items.append("path_traversal")
        
        # File content validation (if file exists)
        if os.path.exists(file_path):
            try:
                # Check file magic bytes for image files
                with open(file_path, 'rb') as f:
                    magic_bytes = f.read(16)
                
                if not self._validate_image_magic_bytes(magic_bytes, file_ext):
                    risk_score += 0.5
                    recommendations.append("File content doesn't match extension")
                    blocked_items.append("content_mismatch")
                    
            except Exception as e:
                risk_score += 0.3
                recommendations.append(f"File validation error: {str(e)}")
                blocked_items.append("validation_error")
        
        # Determine result
        if risk_score >= 0.8:
            result = ValidationResult.BLOCKED
        elif risk_score >= 0.5:
            result = ValidationResult.SUSPICIOUS
        elif risk_score >= 0.2:
            result = ValidationResult.INVALID
        else:
            result = ValidationResult.VALID
        
        details.update({
            "file_path": file_path,
            "file_size_mb": file_size_mb,
            "file_extension": file_ext,
            "risk_score": risk_score,
            "user_id": user_id
        })
        
        return ValidationReport(
            timestamp=datetime.now(),
            validation_type="file_validation",
            result=result,
            details=details,
            risk_score=risk_score,
            recommendations=recommendations,
            blocked_items=blocked_items
        )
    
    def _validate_image_magic_bytes(self, magic_bytes: bytes, expected_ext: str) -> bool:
        """Validate image file magic bytes"""
        magic_signatures = {
            '.jpg': [b'\xff\xd8\xff'],
            '.jpeg': [b'\xff\xd8\xff'],
            '.png': [b'\x89PNG\r\n\x1a\n'],
            '.webp': [b'RIFF', b'WEBP'],
            '.bmp': [b'BM'],
            '.tiff': [b'II*\x00', b'MM\x00*']
        }
        
        if expected_ext not in magic_signatures:
            return True  # Unknown format, skip validation
        
        for signature in magic_signatures[expected_ext]:
            if magic_bytes.startswith(signature):
                return True
        
        return False
    
    def sanitize_input(self, input_data: str) -> str:
        """Sanitize input data"""
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>"\']', '', input_data)
        
        # Normalize whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized).strip()
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        # Limit length
        if len(sanitized) > self.config.max_prompt_length:
            sanitized = sanitized[:self.config.max_prompt_length]
        
        return sanitized


class ModelIntegrityChecker:
    """Model integrity and security validation"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.known_checksums = {}
        self.quarantine_dir = Path("quarantine")
        self.quarantine_dir.mkdir(exist_ok=True)
    
    def load_known_checksums(self, checksums_file: str = "model_checksums.json"):
        """Load known model checksums"""
        try:
            if os.path.exists(checksums_file):
                with open(checksums_file, 'r') as f:
                    self.known_checksums = json.load(f)
                logger.info(f"Loaded {len(self.known_checksums)} known model checksums")
        except Exception as e:
            logger.error(f"Failed to load model checksums: {e}")
    
    def calculate_file_hash(self, file_path: str, algorithm: str = "sha256") -> str:
        """Calculate file hash"""
        hash_func = hashlib.new(algorithm)
        
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    hash_func.update(chunk)
            return hash_func.hexdigest()
        except Exception as e:
            logger.error(f"Failed to calculate hash for {file_path}: {e}")
            return ""
    
    def verify_model_integrity(self, model_path: str) -> ValidationReport:
        """Verify model file integrity"""
        details = {}
        risk_score = 0.0
        recommendations = []
        blocked_items = []
        
        model_name = os.path.basename(model_path)
        
        # Check if file exists
        if not os.path.exists(model_path):
            risk_score = 1.0
            recommendations.append("Model file not found")
            blocked_items.append("file_not_found")
            result = ValidationResult.BLOCKED
        else:
            # Calculate current hash
            current_hash = self.calculate_file_hash(model_path)
            details["current_hash"] = current_hash
            
            # Check against known checksums
            if self.config.verify_model_checksums and model_name in self.known_checksums:
                expected_hash = self.known_checksums[model_name]
                details["expected_hash"] = expected_hash
                
                if current_hash != expected_hash:
                    risk_score += 0.8
                    recommendations.append("Model checksum mismatch - possible tampering")
                    blocked_items.append("checksum_mismatch")
                    
                    # Quarantine suspicious model
                    if self.config.model_quarantine_enabled:
                        self._quarantine_model(model_path, "checksum_mismatch")
                        recommendations.append("Model moved to quarantine")
            
            # Check file size (basic sanity check)
            file_size = os.path.getsize(model_path)
            details["file_size_mb"] = file_size / (1024 * 1024)
            
            # Very small or very large files might be suspicious
            if file_size < 1024:  # Less than 1KB
                risk_score += 0.3
                recommendations.append("Model file suspiciously small")
                blocked_items.append("suspicious_size")
            elif file_size > 50 * (1024**3):  # Larger than 50GB
                risk_score += 0.2
                recommendations.append("Model file very large")
            
            # Check file permissions
            if os.access(model_path, os.X_OK):
                risk_score += 0.4
                recommendations.append("Model file has execute permissions")
                blocked_items.append("executable_model")
            
            # Determine result
            if risk_score >= 0.8:
                result = ValidationResult.BLOCKED
            elif risk_score >= 0.5:
                result = ValidationResult.SUSPICIOUS
            elif risk_score >= 0.2:
                result = ValidationResult.INVALID
            else:
                result = ValidationResult.VALID
        
        details.update({
            "model_path": model_path,
            "model_name": model_name,
            "risk_score": risk_score
        })
        
        return ValidationReport(
            timestamp=datetime.now(),
            validation_type="model_integrity",
            result=result,
            details=details,
            risk_score=risk_score,
            recommendations=recommendations,
            blocked_items=blocked_items
        )
    
    def _quarantine_model(self, model_path: str, reason: str):
        """Move suspicious model to quarantine"""
        try:
            model_name = os.path.basename(model_path)
            quarantine_path = self.quarantine_dir / f"{model_name}.{int(time.time())}"
            
            import shutil
            shutil.move(model_path, quarantine_path)
            
            # Create quarantine report
            quarantine_report = {
                "original_path": model_path,
                "quarantine_path": str(quarantine_path),
                "reason": reason,
                "timestamp": datetime.now().isoformat()
            }
            
            report_path = self.quarantine_dir / f"{model_name}.report.json"
            with open(report_path, 'w') as f:
                json.dump(quarantine_report, f, indent=2)
            
            logger.warning(f"Model quarantined: {model_path} -> {quarantine_path}")
            
        except Exception as e:
            logger.error(f"Failed to quarantine model {model_path}: {e}")


class AccessController:
    """Access control and authentication system"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.active_sessions = {}
        self.failed_attempts = {}
        self.api_keys = {}
        self.blocked_ips = set()
        
        # Load API keys if authentication is enabled
        if config.enable_authentication:
            self._load_api_keys()
    
    def _load_api_keys(self, keys_file: str = "api_keys.json"):
        """Load API keys from file"""
        try:
            if os.path.exists(keys_file):
                with open(keys_file, 'r') as f:
                    self.api_keys = json.load(f)
                logger.info(f"Loaded {len(self.api_keys)} API keys")
        except Exception as e:
            logger.error(f"Failed to load API keys: {e}")
    
    def generate_api_key(self, user_id: str, permissions: List[str] = None) -> str:
        """Generate new API key for user"""
        api_key = secrets.token_urlsafe(32)
        
        self.api_keys[api_key] = {
            "user_id": user_id,
            "permissions": permissions or ["read", "write"],
            "created_at": datetime.now().isoformat(),
            "last_used": None,
            "usage_count": 0
        }
        
        return api_key
    
    def validate_api_key(self, api_key: str, required_permission: str = None) -> ValidationReport:
        """Validate API key and permissions"""
        details = {}
        risk_score = 0.0
        recommendations = []
        blocked_items = []
        
        if not self.config.require_api_keys:
            result = ValidationResult.VALID
        elif api_key not in self.api_keys:
            risk_score = 1.0
            recommendations.append("Invalid API key")
            blocked_items.append("invalid_api_key")
            result = ValidationResult.BLOCKED
        else:
            key_info = self.api_keys[api_key]
            
            # Check permissions
            if required_permission and required_permission not in key_info.get("permissions", []):
                risk_score = 0.8
                recommendations.append(f"Insufficient permissions for {required_permission}")
                blocked_items.append("insufficient_permissions")
                result = ValidationResult.BLOCKED
            else:
                # Update usage
                key_info["last_used"] = datetime.now().isoformat()
                key_info["usage_count"] = key_info.get("usage_count", 0) + 1
                result = ValidationResult.VALID
                
                details["user_id"] = key_info["user_id"]
                details["permissions"] = key_info["permissions"]
        
        details.update({
            "api_key_provided": bool(api_key),
            "required_permission": required_permission,
            "risk_score": risk_score
        })
        
        return ValidationReport(
            timestamp=datetime.now(),
            validation_type="api_key_validation",
            result=result,
            details=details,
            risk_score=risk_score,
            recommendations=recommendations,
            blocked_items=blocked_items
        )
    
    def create_session(self, user_id: str, ip_address: str = None) -> str:
        """Create new user session"""
        session_id = secrets.token_urlsafe(32)
        
        self.active_sessions[session_id] = {
            "user_id": user_id,
            "created_at": datetime.now(),
            "last_activity": datetime.now(),
            "ip_address": ip_address,
            "request_count": 0
        }
        
        return session_id
    
    def validate_session(self, session_id: str, ip_address: str = None) -> ValidationReport:
        """Validate user session"""
        details = {}
        risk_score = 0.0
        recommendations = []
        blocked_items = []
        
        if session_id not in self.active_sessions:
            risk_score = 0.8
            recommendations.append("Invalid session ID")
            blocked_items.append("invalid_session")
            result = ValidationResult.BLOCKED
        else:
            session = self.active_sessions[session_id]
            
            # Check session timeout
            time_since_activity = datetime.now() - session["last_activity"]
            if time_since_activity.total_seconds() > (self.config.session_timeout_minutes * 60):
                risk_score = 0.6
                recommendations.append("Session expired")
                blocked_items.append("session_expired")
                result = ValidationResult.INVALID
                
                # Clean up expired session
                del self.active_sessions[session_id]
            else:
                # Check IP address consistency
                if ip_address and session.get("ip_address") != ip_address:
                    risk_score = 0.4
                    recommendations.append("IP address mismatch")
                    blocked_items.append("ip_mismatch")
                
                # Update session activity
                session["last_activity"] = datetime.now()
                session["request_count"] = session.get("request_count", 0) + 1
                
                result = ValidationResult.VALID if risk_score < 0.3 else ValidationResult.SUSPICIOUS
                details["user_id"] = session["user_id"]
        
        details.update({
            "session_id_provided": bool(session_id),
            "ip_address": ip_address,
            "risk_score": risk_score
        })
        
        return ValidationReport(
            timestamp=datetime.now(),
            validation_type="session_validation",
            result=result,
            details=details,
            risk_score=risk_score,
            recommendations=recommendations,
            blocked_items=blocked_items
        )
    
    def record_failed_attempt(self, identifier: str, ip_address: str = None):
        """Record failed authentication attempt"""
        key = ip_address or identifier
        
        if key not in self.failed_attempts:
            self.failed_attempts[key] = {
                "count": 0,
                "first_attempt": datetime.now(),
                "last_attempt": datetime.now()
            }
        
        self.failed_attempts[key]["count"] += 1
        self.failed_attempts[key]["last_attempt"] = datetime.now()
        
        # Auto-block after too many failures
        if self.failed_attempts[key]["count"] >= self.config.max_failed_attempts:
            if ip_address:
                self.blocked_ips.add(ip_address)
            logger.warning(f"Blocked {key} after {self.failed_attempts[key]['count']} failed attempts")
    
    def is_blocked(self, ip_address: str) -> bool:
        """Check if IP address is blocked"""
        return ip_address in self.blocked_ips


class RateLimiter:
    """Rate limiting system"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.request_counts = {}
        self.burst_counts = {}
    
    def check_rate_limit(self, identifier: str, ip_address: str = None) -> ValidationReport:
        """Check rate limiting for identifier"""
        if not self.config.enable_rate_limiting:
            return ValidationReport(
                timestamp=datetime.now(),
                validation_type="rate_limit",
                result=ValidationResult.VALID,
                details={"rate_limiting_disabled": True},
                risk_score=0.0
            )
        
        key = ip_address or identifier
        current_time = datetime.now()
        
        # Initialize tracking if needed
        if key not in self.request_counts:
            self.request_counts[key] = []
            self.burst_counts[key] = []
        
        # Clean old requests (older than 1 minute)
        cutoff_time = current_time - timedelta(minutes=1)
        self.request_counts[key] = [
            req_time for req_time in self.request_counts[key] 
            if req_time > cutoff_time
        ]
        
        # Clean old burst requests (older than 10 seconds)
        burst_cutoff = current_time - timedelta(seconds=10)
        self.burst_counts[key] = [
            req_time for req_time in self.burst_counts[key]
            if req_time > burst_cutoff
        ]
        
        # Check limits
        requests_per_minute = len(self.request_counts[key])
        burst_requests = len(self.burst_counts[key])
        
        details = {
            "requests_per_minute": requests_per_minute,
            "burst_requests": burst_requests,
            "limit_per_minute": self.config.requests_per_minute,
            "burst_limit": self.config.burst_limit
        }
        
        risk_score = 0.0
        recommendations = []
        blocked_items = []
        
        if burst_requests >= self.config.burst_limit:
            risk_score = 0.8
            recommendations.append("Burst limit exceeded")
            blocked_items.append("burst_limit_exceeded")
            result = ValidationResult.BLOCKED
        elif requests_per_minute >= self.config.requests_per_minute:
            risk_score = 0.6
            recommendations.append("Rate limit exceeded")
            blocked_items.append("rate_limit_exceeded")
            result = ValidationResult.BLOCKED
        else:
            # Record this request
            self.request_counts[key].append(current_time)
            self.burst_counts[key].append(current_time)
            result = ValidationResult.VALID
        
        return ValidationReport(
            timestamp=current_time,
            validation_type="rate_limit",
            result=result,
            details=details,
            risk_score=risk_score,
            recommendations=recommendations,
            blocked_items=blocked_items
        )


class AuditLogger:
    """Comprehensive audit logging system"""

    def __init__(self, config: SecurityConfig):
        self.config = config
        self.audit_entries = []

        if config.enable_audit_logging:
            if config.encrypt_audit_logs:
                # Use encrypted logging
                self.secure_logger = SecureAuditLogger()
                self._is_encrypted = True
            else:
                # Use legacy plain text logging
                self.log_file = "audit.log"
                self._is_encrypted = False
                self._setup_audit_log()
        else:
            self._is_encrypted = False
    
    def _setup_audit_log(self):
        """Setup audit log file"""
        try:
            # Create audit log directory
            log_dir = Path("logs")
            log_dir.mkdir(exist_ok=True)
            
            self.log_file = log_dir / "security_audit.log"
            
            # Write header if new file
            if not self.log_file.exists():
                with open(self.log_file, 'w') as f:
                    f.write("# Security Audit Log\n")
                    f.write(f"# Started: {datetime.now().isoformat()}\n")
                    f.write("# Format: JSON per line\n\n")
                    
        except Exception as e:
            logger.error(f"Failed to setup audit log: {e}")
    
    def log_action(self, user_id: str, action: str, resource: str, result: str,
                   session_id: str = None, ip_address: str = None,
                   user_agent: str = None, details: Dict[str, Any] = None):
        """Log user action"""
        if not self.config.enable_audit_logging:
            return

        entry = AuditLogEntry(
            timestamp=datetime.now(),
            user_id=user_id if not self.config.anonymize_user_data else self._anonymize_user_id(user_id),
            session_id=session_id,
            action=action,
            resource=resource,
            result=result,
            ip_address=ip_address if not self.config.anonymize_user_data else self._anonymize_ip(ip_address),
            user_agent=user_agent,
            details=details or {}
        )

        # Store in memory
        self.audit_entries.append(entry)

        # Write to file (encrypted or plain text)
        try:
            if self._is_encrypted:
                # Use secure encrypted logging
                log_data = {
                    "timestamp": entry.timestamp.isoformat(),
                    "user_id": entry.user_id,
                    "session_id": entry.session_id,
                    "action": entry.action,
                    "resource": entry.resource,
                    "result": entry.result,
                    "ip_address": entry.ip_address,
                    "user_agent": entry.user_agent,
                    "details": entry.details
                }
                self.secure_logger.log_entry(log_data)
            else:
                # Use legacy plain text logging
                with open(self.log_file, 'a') as f:
                    log_data = {
                        "timestamp": entry.timestamp.isoformat(),
                        "user_id": entry.user_id,
                        "session_id": entry.session_id,
                        "action": entry.action,
                        "resource": entry.resource,
                        "result": entry.result,
                        "ip_address": entry.ip_address,
                        "user_agent": entry.user_agent,
                        "details": entry.details
                    }
                    f.write(json.dumps(log_data) + "\n")

        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

        # Cleanup old entries
        self._cleanup_old_entries()
    
    def _anonymize_user_id(self, user_id: str) -> str:
        """Anonymize user ID"""
        if not user_id:
            return None
        return hashlib.sha256(user_id.encode()).hexdigest()[:16]
    
    def _anonymize_ip(self, ip_address: str) -> str:
        """Anonymize IP address"""
        if not ip_address:
            return None
        # Keep first 3 octets, anonymize last
        parts = ip_address.split('.')
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.{parts[2]}.xxx"
        return "anonymized"
    
    def _cleanup_old_entries(self):
        """Clean up old audit entries"""
        cutoff_date = datetime.now() - timedelta(days=self.config.audit_retention_days)
        
        # Clean memory entries
        self.audit_entries = [
            entry for entry in self.audit_entries
            if entry.timestamp > cutoff_date
        ]
    
    def get_audit_report(self, hours: int = 24) -> Dict[str, Any]:
        """Generate audit report"""
        cutoff_time = datetime.now() - timedelta(hours=hours)

        # Get entries from memory and file
        all_entries = list(self.audit_entries)

        # Load additional entries from encrypted logs if needed
        if self._is_encrypted and hasattr(self, 'secure_logger'):
            try:
                file_entries = self.secure_logger.read_entries(limit=10000)
                # Convert dict entries to AuditLogEntry objects for consistency
                for entry_dict in file_entries:
                    if isinstance(entry_dict, dict):
                        entry = AuditLogEntry(
                            timestamp=datetime.fromisoformat(entry_dict.get('timestamp', datetime.now().isoformat())),
                            user_id=entry_dict.get('user_id'),
                            session_id=entry_dict.get('session_id'),
                            action=entry_dict.get('action', 'unknown'),
                            resource=entry_dict.get('resource', 'unknown'),
                            result=entry_dict.get('result', 'unknown'),
                            ip_address=entry_dict.get('ip_address'),
                            user_agent=entry_dict.get('user_agent'),
                            details=entry_dict.get('details', {})
                        )
                        all_entries.append(entry)
            except Exception as e:
                logger.error(f"Failed to read encrypted logs: {e}")

        recent_entries = [
            entry for entry in all_entries
            if entry.timestamp > cutoff_time
        ]

        # Analyze entries
        actions = {}
        results = {}
        users = set()

        for entry in recent_entries:
            actions[entry.action] = actions.get(entry.action, 0) + 1
            results[entry.result] = results.get(entry.result, 0) + 1
            if entry.user_id:
                users.add(entry.user_id)

        return {
            "report_period_hours": hours,
            "total_entries": len(recent_entries),
            "unique_users": len(users),
            "actions_summary": actions,
            "results_summary": results,
            "generated_at": datetime.now().isoformat(),
            "encryption_enabled": self._is_encrypted
        }


class SecurityManager:
    """Main security management system"""
    
    def __init__(self, config: SecurityConfig = None):
        self.config = config or SecurityConfig()
        
        # Initialize components
        self.input_validator = InputValidator(self.config)
        self.model_checker = ModelIntegrityChecker(self.config)
        self.access_controller = AccessController(self.config)
        self.rate_limiter = RateLimiter(self.config)
        self.audit_logger = AuditLogger(self.config)
        
        # Security state
        self.security_alerts = []
        self.last_security_scan = None
        
        logger.info("Security Manager initialized")
    
    def validate_request(self, request_data: Dict[str, Any], 
                        user_id: str = None, session_id: str = None,
                        ip_address: str = None) -> ValidationReport:
        """Comprehensive request validation"""
        validation_results = []
        overall_risk_score = 0.0
        all_recommendations = []
        all_blocked_items = []
        
        # Rate limiting check
        rate_limit_result = self.rate_limiter.check_rate_limit(
            user_id or ip_address or "anonymous", ip_address
        )
        validation_results.append(rate_limit_result)
        
        if rate_limit_result.result == ValidationResult.BLOCKED:
            # If rate limited, don't proceed with other validations
            return rate_limit_result
        
        # Session validation
        if session_id:
            session_result = self.access_controller.validate_session(session_id, ip_address)
            validation_results.append(session_result)
        
        # API key validation
        if request_data.get("api_key"):
            api_key_result = self.access_controller.validate_api_key(
                request_data["api_key"], request_data.get("required_permission")
            )
            validation_results.append(api_key_result)
        
        # Input validation
        if "prompt" in request_data:
            prompt_result = self.input_validator.validate_prompt(
                request_data["prompt"], user_id
            )
            validation_results.append(prompt_result)
        
        # File validation
        if "file_path" in request_data and "file_size" in request_data:
            file_result = self.input_validator.validate_file_upload(
                request_data["file_path"], request_data["file_size"], user_id
            )
            validation_results.append(file_result)
        
        # Aggregate results
        for result in validation_results:
            overall_risk_score = max(overall_risk_score, result.risk_score)
            all_recommendations.extend(result.recommendations)
            all_blocked_items.extend(result.blocked_items)
        
        # Determine overall result
        if any(r.result == ValidationResult.BLOCKED for r in validation_results):
            overall_result = ValidationResult.BLOCKED
        elif any(r.result == ValidationResult.SUSPICIOUS for r in validation_results):
            overall_result = ValidationResult.SUSPICIOUS
        elif any(r.result == ValidationResult.INVALID for r in validation_results):
            overall_result = ValidationResult.INVALID
        else:
            overall_result = ValidationResult.VALID
        
        # Log the request
        self.audit_logger.log_action(
            user_id=user_id or "anonymous",
            action="request_validation",
            resource=request_data.get("workflow_type", "unknown"),
            result=overall_result.value,
            session_id=session_id,
            ip_address=ip_address,
            details={
                "risk_score": overall_risk_score,
                "validation_count": len(validation_results),
                "blocked_items": all_blocked_items
            }
        )
        
        return ValidationReport(
            timestamp=datetime.now(),
            validation_type="comprehensive_request",
            result=overall_result,
            details={
                "individual_validations": len(validation_results),
                "overall_risk_score": overall_risk_score,
                "request_data_keys": list(request_data.keys())
            },
            risk_score=overall_risk_score,
            recommendations=list(set(all_recommendations)),
            blocked_items=list(set(all_blocked_items))
        )
    
    def validate_model_security(self, model_path: str) -> ValidationReport:
        """Validate model security"""
        result = self.model_checker.verify_model_integrity(model_path)
        
        # Log model validation
        self.audit_logger.log_action(
            user_id="system",
            action="model_validation",
            resource=model_path,
            result=result.result.value,
            details=result.details
        )
        
        return result
    
    def perform_security_scan(self) -> Dict[str, Any]:
        """Perform comprehensive security scan"""
        scan_results = {
            "scan_timestamp": datetime.now().isoformat(),
            "scan_type": "comprehensive",
            "findings": [],
            "recommendations": [],
            "risk_level": "low"
        }
        
        try:
            # Check for suspicious activity
            audit_report = self.audit_logger.get_audit_report(hours=24)
            
            # Analyze failed attempts
            failed_attempts = sum(1 for entry in self.audit_logger.audit_entries 
                                if entry.result == "failed" and 
                                entry.timestamp > datetime.now() - timedelta(hours=24))
            
            if failed_attempts > self.config.suspicious_activity_threshold:
                scan_results["findings"].append(f"High number of failed attempts: {failed_attempts}")
                scan_results["recommendations"].append("Review authentication logs")
                scan_results["risk_level"] = "medium"
            
            # Check blocked IPs
            if len(self.access_controller.blocked_ips) > 0:
                scan_results["findings"].append(f"Blocked IPs: {len(self.access_controller.blocked_ips)}")
                scan_results["recommendations"].append("Review blocked IP addresses")
            
            # Check active sessions
            active_sessions = len(self.access_controller.active_sessions)
            if active_sessions > 100:  # Arbitrary threshold
                scan_results["findings"].append(f"High number of active sessions: {active_sessions}")
                scan_results["recommendations"].append("Monitor session activity")
            
            # Update scan timestamp
            self.last_security_scan = datetime.now()
            
            # Log security scan
            self.audit_logger.log_action(
                user_id="system",
                action="security_scan",
                resource="system",
                result="completed",
                details=scan_results
            )
            
        except Exception as e:
            scan_results["findings"].append(f"Security scan error: {str(e)}")
            scan_results["risk_level"] = "high"
            logger.error(f"Security scan failed: {e}")
        
        return scan_results
    
    def get_security_status(self) -> Dict[str, Any]:
        """Get current security status"""
        return {
            "security_level": "high" if self.config.enable_authentication else "medium",
            "authentication_enabled": self.config.enable_authentication,
            "rate_limiting_enabled": self.config.enable_rate_limiting,
            "audit_logging_enabled": self.config.enable_audit_logging,
            "model_verification_enabled": self.config.verify_model_checksums,
            "active_sessions": len(self.access_controller.active_sessions),
            "blocked_ips": len(self.access_controller.blocked_ips),
            "last_security_scan": self.last_security_scan.isoformat() if self.last_security_scan else None,
            "audit_entries_24h": len([
                e for e in self.audit_logger.audit_entries
                if e.timestamp > datetime.now() - timedelta(hours=24)
            ])
        }


# Utility functions for security testing
def create_test_security_config() -> SecurityConfig:
    """Create test security configuration"""
    return SecurityConfig(
        max_prompt_length=1000,
        max_file_size_mb=10,
        enable_authentication=False,
        enable_rate_limiting=True,
        requests_per_minute=30,
        enable_audit_logging=True,
        anonymize_user_data=False  # For testing
    )


def run_security_tests():
    """Run basic security tests"""
    print("Running Security System Tests...")
    
    config = create_test_security_config()
    security_manager = SecurityManager(config)
    
    # Test input validation
    print("\n1. Testing Input Validation:")
    test_prompts = [
        "Normal prompt for image generation",
        "SELECT * FROM users; DROP TABLE users;",  # SQL injection
        "<script>alert('xss')</script>",  # XSS
        "../../etc/passwd",  # Path traversal
        "A" * 2000  # Too long
    ]
    
    for prompt in test_prompts:
        result = security_manager.input_validator.validate_prompt(prompt)
        print(f"  Prompt: '{prompt[:50]}...' -> {result.result.value} (risk: {result.risk_score:.2f})")
    
    # Test rate limiting
    print("\n2. Testing Rate Limiting:")
    for i in range(5):
        result = security_manager.rate_limiter.check_rate_limit("test_user")
        print(f"  Request {i+1}: {result.result.value}")
    
    # Test model validation
    print("\n3. Testing Model Validation:")
    # Create a dummy model file for testing
    test_model_path = "test_model.safetensors"
    with open(test_model_path, 'wb') as f:
        f.write(b"fake model data" * 100)
    
    result = security_manager.validate_model_security(test_model_path)
    print(f"  Model validation: {result.result.value} (risk: {result.risk_score:.2f})")
    
    # Cleanup
    os.remove(test_model_path)
    
    # Test comprehensive request validation
    print("\n4. Testing Comprehensive Request Validation:")
    test_request = {
        "prompt": "Generate a beautiful landscape",
        "workflow_type": "image_generation",
        "file_path": "test.jpg",
        "file_size": 1024 * 1024  # 1MB
    }
    
    result = security_manager.validate_request(test_request, user_id="test_user")
    print(f"  Request validation: {result.result.value} (risk: {result.risk_score:.2f})")
    
    # Security status
    print("\n5. Security Status:")
    status = security_manager.get_security_status()
    for key, value in status.items():
        print(f"  {key}: {value}")
    
    print("\n✅ Security system tests completed!")


if __name__ == "__main__":
    run_security_tests()