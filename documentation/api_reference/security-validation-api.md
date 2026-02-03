# Security Validation API Reference

**Module:** `src.security_validation`  
**Version:** 1.0  
**Date:** January 14, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Enums](#enums)
3. [Data Classes](#data-classes)
4. [InputValidator](#inputvalidator)
5. [ModelIntegrityChecker](#modelintegritychecker)
6. [SecureDownloadManager](#securedownloadmanager)
7. [AccessControl](#accesscontrol)
8. [AuditLogger](#auditlogger)
9. [SecurityValidationSystem](#securityvalidationsystem)

---

## Overview

The Security Validation module provides comprehensive security and validation capabilities for the StoryCore-Engine advanced workflows.

### Module Import

```python
from src.security_validation import (
    InputValidator,
    ModelIntegrityChecker,
    SecureDownloadManager,
    AccessControl,
    AuditLogger,
    SecurityValidationSystem,
    ValidationResult,
    SecurityLevel
)
```

---

## Enums

### SecurityLevel

Security levels for operations.

```python
class SecurityLevel(Enum):
    PUBLIC = "public"
    AUTHENTICATED = "authenticated"
    AUTHORIZED = "authorized"
    ADMIN = "admin"
```

**Values:**
- `PUBLIC`: No authentication required
- `AUTHENTICATED`: User must be authenticated
- `AUTHORIZED`: User must have specific permissions
- `ADMIN`: Administrator access required

### ValidationResult

Validation result status.

```python
class ValidationResult(Enum):
    VALID = "valid"
    INVALID = "invalid"
    SUSPICIOUS = "suspicious"
    BLOCKED = "blocked"
```

**Values:**
- `VALID`: Input passed all validation checks
- `INVALID`: Input failed validation (non-malicious)
- `SUSPICIOUS`: Input contains suspicious patterns
- `BLOCKED`: Input blocked due to security threat

---

## Data Classes

### ValidationError

Information about a validation error.

```python
@dataclass
class ValidationError:
    timestamp: datetime
    error_type: str
    error_message: str
    field_name: Optional[str] = None
    severity: str = "medium"
    context: Optional[Dict[str, Any]] = None
```

**Attributes:**
- `timestamp`: When the error occurred
- `error_type`: Type of validation error
- `error_message`: Human-readable error message
- `field_name`: Name of the field that failed validation
- `severity`: Error severity (low, medium, high, critical)
- `context`: Additional context information

### AuditEvent

Audit event information.

```python
@dataclass
class AuditEvent:
    timestamp: datetime
    event_type: str
    user: str
    resource: str
    action: str
    result: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
```

**Attributes:**
- `timestamp`: When the event occurred
- `event_type`: Type of audit event
- `user`: User who triggered the event
- `resource`: Resource being accessed
- `action`: Action being performed
- `result`: Result of the action
- `details`: Additional event details
- `ip_address`: IP address of the user

---

## InputValidator

Validates and sanitizes all user inputs.

### Constructor

```python
InputValidator(config: Optional[Dict[str, Any]] = None)
```

**Parameters:**
- `config`: Configuration dictionary

**Configuration Options:**
```python
{
    'max_prompt_length': 10000,  # Maximum prompt length
    'max_path_length': 4096,     # Maximum path length
    'allowed_extensions': {'.png', '.jpg', '.mp4'},  # Allowed file extensions
    'blocked_paths': {'/etc', '/sys'}  # Blocked system paths
}
```

### Methods

#### validate_prompt

Validate prompt text.

```python
def validate_prompt(self, prompt: str) -> Tuple[ValidationResult, Optional[str]]
```

**Parameters:**
- `prompt`: Prompt text to validate

**Returns:**
- Tuple of (ValidationResult, error_message)

**Example:**
```python
validator = InputValidator()
result, error = validator.validate_prompt("A beautiful sunset")

if result == ValidationResult.VALID:
    print("Prompt is safe")
```

#### validate_path

Validate file path.

```python
def validate_path(self, path: Union[str, Path]) -> Tuple[ValidationResult, Optional[str]]
```

**Parameters:**
- `path`: File path to validate

**Returns:**
- Tuple of (ValidationResult, error_message)

**Example:**
```python
result, error = validator.validate_path("/path/to/file.png")

if result == ValidationResult.VALID:
    print("Path is safe")
```

#### validate_config

Validate configuration dictionary.

```python
def validate_config(self, config: Dict[str, Any]) -> Tuple[ValidationResult, List[str]]
```

**Parameters:**
- `config`: Configuration dictionary to validate

**Returns:**
- Tuple of (ValidationResult, list of error messages)

**Example:**
```python
config = {'steps': 50, 'cfg_scale': 7.5}
result, errors = validator.validate_config(config)

if result == ValidationResult.VALID:
    print("Configuration is valid")
```

#### sanitize_input

Sanitize user input.

```python
def sanitize_input(self, input_str: str) -> str
```

**Parameters:**
- `input_str`: Input string to sanitize

**Returns:**
- Sanitized string

**Example:**
```python
clean = validator.sanitize_input("dirty\x00input")
```

#### check_injection_attacks

Check for various injection attacks.

```python
def check_injection_attacks(self, input_str: str) -> Tuple[bool, List[str]]
```

**Parameters:**
- `input_str`: Input string to check

**Returns:**
- Tuple of (has_threat, list of threat types)

**Example:**
```python
has_threat, threats = validator.check_injection_attacks(user_input)

if has_threat:
    print(f"Threats detected: {threats}")
```

#### get_validation_errors

Get recorded validation errors.

```python
def get_validation_errors(self) -> List[ValidationError]
```

**Returns:**
- List of ValidationError objects

---

## ModelIntegrityChecker

Verifies model integrity and authenticity.

### Constructor

```python
ModelIntegrityChecker(config: Optional[Dict[str, Any]] = None)
```

**Parameters:**
- `config`: Configuration dictionary

### Methods

#### verify_checksum

Verify model file checksum.

```python
def verify_checksum(
    self,
    model_path: Path,
    expected_checksum: Optional[str] = None,
    algorithm: str = 'sha256'
) -> Tuple[bool, Optional[str]]
```

**Parameters:**
- `model_path`: Path to model file
- `expected_checksum`: Expected checksum value
- `algorithm`: Hash algorithm (default: 'sha256')

**Returns:**
- Tuple of (is_valid, checksum_or_error)

**Example:**
```python
checker = ModelIntegrityChecker()
valid, checksum = checker.verify_checksum(
    Path("model.safetensors"),
    "abc123..."
)

if valid:
    print(f"Model verified: {checksum}")
```

#### verify_signature

Verify model digital signature.

```python
def verify_signature(
    self,
    model_path: Path,
    signature: str
) -> Tuple[bool, Optional[str]]
```

**Parameters:**
- `model_path`: Path to model file
- `signature`: Digital signature

**Returns:**
- Tuple of (is_valid, error_message)

**Note:** Currently a placeholder for future implementation.

#### scan_for_malware

Scan model file for malware.

```python
def scan_for_malware(self, model_path: Path) -> Tuple[bool, Optional[str]]
```

**Parameters:**
- `model_path`: Path to model file

**Returns:**
- Tuple of (is_safe, error_message)

**Example:**
```python
valid, error = checker.scan_for_malware(Path("model.safetensors"))

if valid:
    print("No malware detected")
```

#### validate_model_format

Validate model file format.

```python
def validate_model_format(self, model_path: Path) -> Tuple[bool, Optional[str]]
```

**Parameters:**
- `model_path`: Path to model file

**Returns:**
- Tuple of (is_valid, error_message)

#### is_model_verified

Check if model has been verified.

```python
def is_model_verified(self, model_path: Path) -> bool
```

**Parameters:**
- `model_path`: Path to model file

**Returns:**
- True if model has been verified

#### get_model_checksum

Get stored checksum for model.

```python
def get_model_checksum(self, model_path: Path) -> Optional[str]
```

**Parameters:**
- `model_path`: Path to model file

**Returns:**
- Stored checksum or None

---

## SecureDownloadManager

Manages secure model downloads.

### Constructor

```python
SecureDownloadManager(config: Optional[Dict[str, Any]] = None)
```

**Parameters:**
- `config`: Configuration dictionary

**Configuration Options:**
```python
{
    'quarantine_dir': 'quarantine',  # Quarantine directory
    'allowed_domains': ['huggingface.co']  # Allowed download domains
}
```

### Methods

#### validate_download_source

Validate download URL.

```python
def validate_download_source(self, url: str) -> Tuple[bool, Optional[str]]
```

**Parameters:**
- `url`: Download URL to validate

**Returns:**
- Tuple of (is_valid, error_message)

**Example:**
```python
manager = SecureDownloadManager()
valid, error = manager.validate_download_source("https://example.com/model.safetensors")

if valid:
    print("URL is safe")
```

#### download_model

Download model securely.

```python
async def download_model(
    self,
    url: str,
    destination: Path,
    expected_checksum: Optional[str] = None,
    verify_ssl: bool = True
) -> Tuple[bool, Optional[str]]
```

**Parameters:**
- `url`: Download URL
- `destination`: Destination path
- `expected_checksum`: Expected checksum
- `verify_ssl`: Verify SSL certificate

**Returns:**
- Tuple of (success, message)

**Example:**
```python
import asyncio

async def download():
    success, message = await manager.download_model(
        "https://example.com/model.safetensors",
        Path("model.safetensors"),
        "abc123..."
    )
    return success

asyncio.run(download())
```

#### verify_download_integrity

Verify downloaded file integrity.

```python
def verify_download_integrity(
    self,
    path: Path,
    expected_checksum: str
) -> Tuple[bool, Optional[str]]
```

**Parameters:**
- `path`: Path to downloaded file
- `expected_checksum`: Expected checksum

**Returns:**
- Tuple of (is_valid, error_message)

#### quarantine_suspicious_file

Move suspicious file to quarantine.

```python
def quarantine_suspicious_file(self, path: Path, reason: str) -> Path
```

**Parameters:**
- `path`: Path to suspicious file
- `reason`: Reason for quarantine

**Returns:**
- Path to quarantined file

**Example:**
```python
quarantine_path = manager.quarantine_suspicious_file(
    Path("suspicious.safetensors"),
    "Failed checksum verification"
)
```

#### get_download_history

Get download history.

```python
def get_download_history(self) -> List[Dict[str, Any]]
```

**Returns:**
- List of download history entries

---

## AccessControl

Manages access control and permissions.

### Constructor

```python
AccessControl(config: Optional[Dict[str, Any]] = None)
```

**Parameters:**
- `config`: Configuration dictionary

### Methods

#### grant_permission

Grant permission to user.

```python
def grant_permission(self, user: str, resource: str)
```

**Parameters:**
- `user`: User identifier
- `resource`: Resource identifier

**Example:**
```python
ac = AccessControl()
ac.grant_permission("user1", "hunyuan_video_t2v")
```

#### revoke_permission

Revoke permission from user.

```python
def revoke_permission(self, user: str, resource: str)
```

**Parameters:**
- `user`: User identifier
- `resource`: Resource identifier

#### check_permission

Check if user has permission.

```python
def check_permission(self, user: str, resource: str) -> bool
```

**Parameters:**
- `user`: User identifier
- `resource`: Resource identifier

**Returns:**
- True if user has permission

**Example:**
```python
if ac.check_permission("user1", "workflow1"):
    # Allow access
    pass
```

#### require_authentication

Decorator to require authentication.

```python
def require_authentication(self, func: Callable) -> Callable
```

**Parameters:**
- `func`: Function to wrap

**Returns:**
- Wrapped function

**Example:**
```python
@ac.require_authentication
def protected_function(user=None):
    return f"Hello {user}"
```

#### rate_limit

Check rate limit for user.

```python
def rate_limit(
    self,
    user: str,
    max_requests: int = 100,
    window_seconds: int = 3600
) -> bool
```

**Parameters:**
- `user`: User identifier
- `max_requests`: Maximum requests allowed
- `window_seconds`: Time window in seconds

**Returns:**
- True if request allowed

**Example:**
```python
if ac.rate_limit("user1", max_requests=100, window_seconds=3600):
    # Process request
    pass
```

#### audit_access

Log access attempt.

```python
def audit_access(self, user: str, resource: str, action: str, result: str)
```

**Parameters:**
- `user`: User identifier
- `resource`: Resource identifier
- `action`: Action performed
- `result`: Result of action

#### get_access_log

Get access log.

```python
def get_access_log(
    self,
    user: Optional[str] = None,
    limit: int = 100
) -> List[AuditEvent]
```

**Parameters:**
- `user`: Filter by user (optional)
- `limit`: Maximum number of entries

**Returns:**
- List of AuditEvent objects

---

## AuditLogger

Comprehensive audit logging system.

### Constructor

```python
AuditLogger(log_dir: Optional[Path] = None)
```

**Parameters:**
- `log_dir`: Directory for audit logs (default: 'logs/audit')

### Methods

#### log_workflow_execution

Log workflow execution.

```python
def log_workflow_execution(
    self,
    workflow: str,
    user: str,
    params: Dict[str, Any]
)
```

**Parameters:**
- `workflow`: Workflow identifier
- `user`: User identifier
- `params`: Workflow parameters

**Example:**
```python
logger = AuditLogger()
logger.log_workflow_execution(
    "hunyuan_video_t2v",
    "user1",
    {'prompt': "A sunset", 'steps': 50}
)
```

#### log_security_event

Log security event.

```python
def log_security_event(
    self,
    event_type: str,
    user: str,
    severity: str,
    details: Optional[Dict[str, Any]] = None
)
```

**Parameters:**
- `event_type`: Type of security event
- `user`: User identifier
- `severity`: Event severity
- `details`: Additional details

**Example:**
```python
logger.log_security_event(
    "intrusion_attempt",
    "attacker",
    "high",
    {'ip': '192.168.1.100'}
)
```

#### log_access_attempt

Log access attempt.

```python
def log_access_attempt(
    self,
    user: str,
    resource: str,
    action: str,
    result: str
)
```

**Parameters:**
- `user`: User identifier
- `resource`: Resource identifier
- `action`: Action attempted
- `result`: Result of attempt

#### generate_audit_report

Generate audit report for time period.

```python
def generate_audit_report(
    self,
    start: datetime,
    end: datetime
) -> Dict[str, Any]
```

**Parameters:**
- `start`: Start of time period
- `end`: End of time period

**Returns:**
- Audit report dictionary

**Example:**
```python
from datetime import datetime, timedelta

now = datetime.now()
report = logger.generate_audit_report(
    now - timedelta(days=7),
    now
)

print(f"Total events: {report['total_events']}")
```

---

## SecurityValidationSystem

Main security and validation system.

### Constructor

```python
SecurityValidationSystem(config: Optional[Dict[str, Any]] = None)
```

**Parameters:**
- `config`: Configuration dictionary

**Configuration Structure:**
```python
{
    'input_validation': {
        'max_prompt_length': 10000,
        'allowed_extensions': {'.png', '.jpg'}
    },
    'model_integrity': {},
    'downloads': {
        'quarantine_dir': 'quarantine',
        'allowed_domains': ['huggingface.co']
    },
    'access_control': {},
    'audit_log_dir': 'logs/audit'
}
```

### Attributes

- `input_validator`: InputValidator instance
- `model_integrity`: ModelIntegrityChecker instance
- `download_manager`: SecureDownloadManager instance
- `access_control`: AccessControl instance
- `audit_logger`: AuditLogger instance

### Methods

#### validate_workflow_request

Validate complete workflow request.

```python
def validate_workflow_request(
    self,
    user: str,
    workflow: str,
    params: Dict[str, Any]
) -> Tuple[bool, List[str]]
```

**Parameters:**
- `user`: User identifier
- `workflow`: Workflow identifier
- `params`: Workflow parameters

**Returns:**
- Tuple of (is_valid, list of errors)

**Example:**
```python
security = SecurityValidationSystem()

# Grant permission
security.access_control.grant_permission("user1", "workflow1")

# Validate request
valid, errors = security.validate_workflow_request(
    "user1",
    "workflow1",
    {
        'prompt': "A beautiful sunset",
        'steps': 50,
        'resolution': '720p'
    }
)

if valid:
    # Process workflow
    pass
else:
    print(f"Validation failed: {errors}")
```

#### verify_model_security

Verify model security.

```python
def verify_model_security(
    self,
    model_path: Path,
    expected_checksum: Optional[str] = None
) -> Tuple[bool, List[str]]
```

**Parameters:**
- `model_path`: Path to model file
- `expected_checksum`: Expected checksum

**Returns:**
- Tuple of (is_valid, list of issues)

**Example:**
```python
valid, issues = security.verify_model_security(
    Path("model.safetensors"),
    "abc123..."
)

if valid:
    print("Model is secure")
else:
    print(f"Security issues: {issues}")
```

#### get_security_report

Generate security report.

```python
def get_security_report(self) -> Dict[str, Any]
```

**Returns:**
- Security report dictionary

**Example:**
```python
report = security.get_security_report()

print(f"Validation errors: {report['validation_errors']}")
print(f"Verified models: {report['verified_models']}")
print(f"Audit report: {report['audit_report']}")
```

---

## Complete Example

```python
from src.security_validation import SecurityValidationSystem
from pathlib import Path

# Initialize security system
security = SecurityValidationSystem({
    'input_validation': {
        'max_prompt_length': 10000,
        'allowed_extensions': {'.png', '.jpg', '.mp4', '.safetensors'}
    },
    'downloads': {
        'quarantine_dir': 'quarantine',
        'allowed_domains': ['huggingface.co']
    },
    'audit_log_dir': 'logs/audit'
})

# Grant permissions
security.access_control.grant_permission("user1", "hunyuan_video_t2v")

# Validate workflow request
valid, errors = security.validate_workflow_request(
    user="user1",
    workflow="hunyuan_video_t2v",
    params={
        'prompt': "A beautiful sunset over mountains",
        'steps': 50,
        'cfg_scale': 7.5,
        'resolution': '720p',
        'output_path': 'outputs/video.mp4'
    }
)

if not valid:
    print(f"Validation failed: {errors}")
    exit(1)

# Verify model security
model_path = Path("models/hunyuan_video.safetensors")
valid, issues = security.verify_model_security(
    model_path,
    expected_checksum="abc123..."
)

if not valid:
    print(f"Model verification failed: {issues}")
    exit(1)

# Generate security report
report = security.get_security_report()
print(f"Security status: {report}")
```

---

**Document Version:** 1.0  
**Last Updated:** January 14, 2026  
**Author:** StoryCore-Engine Team
