# Security and Validation System - User Guide

## Overview

The Security and Validation System provides comprehensive protection for Advanced ComfyUI Workflows in StoryCore-Engine. It ensures that all workflow requests are validated, models are verified, and user actions are audited.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Features](#core-features)
3. [Usage Examples](#usage-examples)
4. [Configuration](#configuration)
5. [Access Control](#access-control)
6. [Audit Logging](#audit-logging)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Installation

The security system is included with StoryCore-Engine. No additional installation required.

### Basic Usage

```python
from src.security_validation_system import SecurityValidationSystem, SecurityLevel

# Initialize the security system
security = SecurityValidationSystem()

# Set user access level
security.access_control.set_user_level('user123', SecurityLevel.AUTHENTICATED)

# Validate a workflow request
request = {
    'workflow_type': 'advanced_video',
    'prompt': 'A beautiful sunset over the ocean',
    'image_path': 'input_image.jpg'
}

is_valid, results = security.validate_workflow_request(request, user_id='user123')

if is_valid:
    print("Request validated successfully!")
else:
    print("Validation failed:")
    for result in results:
        if not result.is_valid:
            print(f"  - {result.message}")
```

## Core Features

### 1. Input Validation

Validates all user inputs to prevent security vulnerabilities:

- **Text Prompts:** Length limits, injection detection
- **Image Files:** Format, size, existence validation
- **Video Files:** Format, size, existence validation
- **Trajectory Data:** JSON structure, coordinate validation
- **Filenames:** Path traversal prevention

#### Example: Validate Text Prompt

```python
validator = security.input_validator

result = validator.validate_text_prompt("A serene mountain landscape")
if result.is_valid:
    print("Prompt is safe to use")
else:
    print(f"Validation failed: {result.message}")
```

#### Example: Validate Image File

```python
result = validator.validate_image_input("path/to/image.jpg")
if result.is_valid:
    print(f"Image validated: {result.details['size_mb']:.2f}MB")
```

### 2. Model Integrity Checking

Verifies model files haven't been corrupted or tampered with:

```python
# Register a model's checksum
security.model_integrity_checker.register_model_checksum(model_path)

# Verify model integrity
result = security.validate_model_file(model_path)
if result.is_valid:
    print("Model integrity verified")
else:
    print(f"Integrity check failed: {result.message}")
```

### 3. Secure Model Downloads

Validates download URLs before fetching models:

```python
url = "https://huggingface.co/models/test-model/model.safetensors"
result = security.validate_download_request(url, user_id='user123')

if result.is_valid:
    # Proceed with download
    print("URL validated, safe to download")
else:
    print(f"Download blocked: {result.message}")
```

**Trusted Domains:**
- huggingface.co
- civitai.com
- github.com
- githubusercontent.com

### 4. Access Control

Four-level security hierarchy:

| Level | Access |
|-------|--------|
| **Public** | Basic generation only |
| **Authenticated** | Advanced video/image workflows |
| **Privileged** | Model management |
| **Admin** | System configuration, audit logs |

#### Example: Check Permissions

```python
# Set user level
security.access_control.set_user_level('user123', SecurityLevel.AUTHENTICATED)

# Check permission
result = security.access_control.check_permission('user123', 'advanced_video')
if result.is_valid:
    print("Access granted")
else:
    print(f"Access denied: {result.message}")
```

### 5. Audit Logging

Comprehensive logging of all security events:

```python
# Log workflow execution
security.audit_logger.log_workflow_execution(
    user_id='user123',
    workflow_type='advanced_video',
    success=True,
    details={'duration': 5, 'resolution': '720p'}
)

# Retrieve audit logs
logs = security.audit_logger.get_audit_logs(
    user_id='user123',
    action='workflow_execution'
)

for log in logs:
    print(f"{log['timestamp']}: {log['action']} - {log['result']}")
```

### 6. Privacy Protection

Detects and redacts personally identifiable information (PII):

```python
text = "Contact me at user@example.com or call 555-123-4567"

# Detect PII
detected = security.privacy_protector.detect_pii(text)
print(f"Detected PII: {detected}")

# Redact PII
redacted = security.privacy_protector.redact_pii(text)
print(f"Redacted: {redacted}")
```

**Detected PII Types:**
- Email addresses
- Phone numbers
- Social Security Numbers
- Credit card numbers
- IP addresses

### 7. Data Sanitization

Prevents injection attacks:

```python
sanitizer = security.data_sanitizer

# Sanitize HTML
safe_html = sanitizer.sanitize_html('<script>alert("xss")</script>')

# Sanitize SQL
safe_sql = sanitizer.sanitize_sql("'; DROP TABLE users; --")

# Sanitize file paths
safe_path = sanitizer.sanitize_path("../../../etc/passwd")
```

## Usage Examples

### Example 1: Complete Workflow Validation

```python
from src.security_validation_system import SecurityValidationSystem, SecurityLevel

# Initialize
security = SecurityValidationSystem()
security.access_control.set_user_level('user123', SecurityLevel.AUTHENTICATED)

# Create request
request = {
    'workflow_type': 'advanced_video',
    'prompt': 'A beautiful sunset over the ocean',
    'image_path': 'input.jpg',
    'trajectory': [[{"x": 100, "y": 200}, {"x": 150, "y": 250}]]
}

# Validate
is_valid, results = security.validate_workflow_request(request, 'user123')

if is_valid:
    # Proceed with workflow execution
    print("✓ Request validated, executing workflow...")
else:
    # Handle validation errors
    print("✗ Validation failed:")
    for result in results:
        if not result.is_valid:
            print(f"  [{result.severity.value}] {result.message}")
```

### Example 2: Model Management with Security

```python
from pathlib import Path

# Download and verify model
model_url = "https://huggingface.co/models/test/model.safetensors"
model_path = Path("models/test_model.safetensors")

# Validate download URL
url_result = security.validate_download_request(model_url, 'admin_user')
if not url_result.is_valid:
    raise SecurityError(f"Download blocked: {url_result.message}")

# Download model (your download logic here)
# download_model(model_url, model_path)

# Register checksum
security.model_integrity_checker.register_model_checksum(model_path)

# Verify integrity before use
integrity_result = security.validate_model_file(model_path)
if not integrity_result.is_valid:
    raise SecurityError(f"Model integrity check failed: {integrity_result.message}")

print("✓ Model downloaded and verified successfully")
```

### Example 3: Security Monitoring

```python
from datetime import datetime, timedelta

# Generate security report for last 24 hours
start_time = datetime.now() - timedelta(days=1)
report = security.get_security_report(start_time=start_time)

print(f"Security Report (Last 24 Hours)")
print(f"  Total Events: {report['total_events']}")
print(f"  Unique Users: {report['unique_users']}")
print(f"  Failed Access Attempts: {report['failed_access_attempts']}")

print("\n  Events by Action:")
for action, count in report['events_by_action'].items():
    print(f"    {action}: {count}")

print("\n  Events by Result:")
for result, count in report['events_by_result'].items():
    print(f"    {result}: {count}")
```

## Configuration

### Custom Configuration

```python
config = {
    'max_prompt_length': 10000,
    'max_image_size_mb': 50,
    'max_video_size_mb': 500,
    'allowed_domains': ['huggingface.co', 'github.com'],
    'enable_audit_logging': True,
    'enable_pii_detection': True
}

security = SecurityValidationSystem(config=config)
```

### Environment Variables

Set environment variables for configuration:

```bash
export SECURITY_MAX_PROMPT_LENGTH=10000
export SECURITY_MAX_IMAGE_SIZE_MB=50
export SECURITY_ENABLE_AUDIT_LOGGING=true
```

## Access Control

### Setting User Levels

```python
from src.security_validation_system import SecurityLevel

# Public user (default)
# No explicit setting needed

# Authenticated user
security.access_control.set_user_level('user123', SecurityLevel.AUTHENTICATED)

# Privileged user
security.access_control.set_user_level('power_user', SecurityLevel.PRIVILEGED)

# Admin user
security.access_control.set_user_level('admin', SecurityLevel.ADMIN)
```

### Custom Permissions

```python
# Add custom resource with specific permissions
security.access_control.add_custom_permission(
    resource='custom_workflow',
    allowed_levels={SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
)

# Check permission
result = security.access_control.check_permission('user123', 'custom_workflow')
```

## Audit Logging

### Log Locations

- Default: `logs/security_audit.jsonl`
- Custom: Specify in `AuditLogger(log_file=Path('custom/path.jsonl'))`

### Log Format

Each log entry is a JSON object:

```json
{
  "timestamp": "2026-01-14T10:30:00.123456",
  "user_id": "user123",
  "action": "workflow_execution",
  "resource": "advanced_video",
  "result": "success",
  "details": {"duration": 5, "resolution": "720p"},
  "ip_address": "192.168.1.100"
}
```

### Querying Logs

```python
# Get all logs
all_logs = security.audit_logger.get_audit_logs()

# Filter by user
user_logs = security.audit_logger.get_audit_logs(user_id='user123')

# Filter by action
action_logs = security.audit_logger.get_audit_logs(action='workflow_execution')

# Filter by time range
from datetime import datetime, timedelta
start = datetime.now() - timedelta(hours=24)
recent_logs = security.audit_logger.get_audit_logs(start_time=start)
```

## Best Practices

### 1. Always Validate Inputs

```python
# ✓ Good: Validate before processing
is_valid, results = security.validate_workflow_request(request, user_id)
if is_valid:
    process_workflow(request)

# ✗ Bad: Process without validation
process_workflow(request)  # Dangerous!
```

### 2. Check Model Integrity

```python
# ✓ Good: Verify before loading
result = security.validate_model_file(model_path)
if result.is_valid:
    model = load_model(model_path)

# ✗ Bad: Load without verification
model = load_model(model_path)  # Could be corrupted!
```

### 3. Use Appropriate Access Levels

```python
# ✓ Good: Principle of least privilege
security.access_control.set_user_level('user', SecurityLevel.AUTHENTICATED)

# ✗ Bad: Giving unnecessary admin access
security.access_control.set_user_level('user', SecurityLevel.ADMIN)
```

### 4. Monitor Security Events

```python
# ✓ Good: Regular security monitoring
report = security.get_security_report()
if report['failed_access_attempts'] > 10:
    alert_security_team()

# ✗ Bad: Ignoring security events
# No monitoring = no visibility into attacks
```

### 5. Sanitize User Data

```python
# ✓ Good: Sanitize before storage/display
safe_prompt = security.data_sanitizer.sanitize_html(user_prompt)
store_in_database(safe_prompt)

# ✗ Bad: Store raw user input
store_in_database(user_prompt)  # XSS vulnerability!
```

## Troubleshooting

### Common Issues

#### Issue: "Access denied" for valid user

**Solution:** Check user security level

```python
# Check current level
result = security.access_control.check_permission('user123', 'advanced_video')
print(result.details)  # Shows current level and required levels

# Set appropriate level
security.access_control.set_user_level('user123', SecurityLevel.AUTHENTICATED)
```

#### Issue: "Model integrity check failed"

**Solution:** Re-download or re-register model

```python
# Option 1: Re-register checksum
security.model_integrity_checker.register_model_checksum(model_path)

# Option 2: Re-download model
# download_model(url, model_path)
# security.model_integrity_checker.register_model_checksum(model_path)
```

#### Issue: "Prompt contains dangerous content"

**Solution:** Remove dangerous patterns

```python
# Check what was detected
result = security.input_validator.validate_text_prompt(prompt)
if not result.is_valid:
    print(f"Detected pattern: {result.details['pattern']}")
    
# Sanitize the prompt
safe_prompt = security.data_sanitizer.sanitize_html(prompt)
```

#### Issue: Audit logs growing too large

**Solution:** Implement log rotation

```python
# Archive old logs
from datetime import datetime, timedelta
import shutil

cutoff = datetime.now() - timedelta(days=30)
logs = security.audit_logger.get_audit_logs(end_time=cutoff)

# Save to archive
archive_path = Path(f"logs/archive_{cutoff.strftime('%Y%m%d')}.jsonl")
# ... save logs to archive ...

# Clear old entries from main log
# ... implement log rotation logic ...
```

## API Reference

### SecurityValidationSystem

Main security system class.

**Methods:**
- `validate_workflow_request(request, user_id)` - Validate complete workflow request
- `validate_model_file(model_path)` - Verify model integrity
- `validate_download_request(url, user_id)` - Validate download URL
- `get_security_report(start_time, end_time)` - Generate security report

### InputValidator

Input validation component.

**Methods:**
- `validate_text_prompt(prompt)` - Validate text prompt
- `validate_image_input(image_path)` - Validate image file
- `validate_video_input(video_path)` - Validate video file
- `validate_trajectory_json(trajectory_data)` - Validate trajectory JSON
- `sanitize_filename(filename)` - Sanitize filename

### ModelIntegrityChecker

Model integrity verification.

**Methods:**
- `calculate_checksum(file_path, algorithm)` - Calculate file checksum
- `verify_model_integrity(model_path)` - Verify model integrity
- `register_model_checksum(model_path, checksum)` - Register model checksum

### AccessControlManager

Access control management.

**Methods:**
- `set_user_level(user_id, level)` - Set user security level
- `check_permission(user_id, resource)` - Check access permission
- `add_custom_permission(resource, allowed_levels)` - Add custom permission

### AuditLogger

Security event logging.

**Methods:**
- `log_workflow_execution(user_id, workflow_type, success, details)` - Log workflow
- `log_model_download(user_id, model_name, url, success)` - Log download
- `log_access_attempt(user_id, resource, granted, ip_address)` - Log access
- `get_audit_logs(start_time, end_time, user_id, action)` - Query logs

## Support

For issues or questions:
1. Check this documentation
2. Review examples in `examples/security_validation_example.py`
3. Run tests: `pytest tests/test_security_validation_system.py`
4. Contact: StoryCore-Engine Team

## License

Part of StoryCore-Engine. See main project license.
