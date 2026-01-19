"""
Security and Validation System - Usage Examples

This example demonstrates how to use the Security and Validation System
to protect advanced ComfyUI workflows.

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.security_validation_system import (
    SecurityValidationSystem,
    SecurityLevel,
)


def example_1_basic_validation():
    """Example 1: Basic workflow request validation"""
    print("=" * 60)
    print("Example 1: Basic Workflow Request Validation")
    print("=" * 60)
    
    # Initialize security system
    security = SecurityValidationSystem()
    
    # Set up user with authenticated access
    security.access_control.set_user_level('user123', SecurityLevel.AUTHENTICATED)
    
    # Create a workflow request
    request = {
        'workflow_type': 'advanced_video',
        'prompt': 'A beautiful sunset over the ocean with gentle waves',
        'resolution': '720p',
        'duration': 5
    }
    
    # Validate the request
    is_valid, results = security.validate_workflow_request(request, user_id='user123')
    
    print(f"\nRequest: {request}")
    print(f"Valid: {is_valid}")
    print("\nValidation Results:")
    for result in results:
        print(f"  [{result.severity.value.upper()}] {result.message}")
    
    return is_valid


def example_2_dangerous_input_detection():
    """Example 2: Detecting dangerous input"""
    print("\n" + "=" * 60)
    print("Example 2: Dangerous Input Detection")
    print("=" * 60)
    
    security = SecurityValidationSystem()
    security.access_control.set_user_level('user456', SecurityLevel.AUTHENTICATED)
    
    # Try to inject malicious script
    dangerous_request = {
        'workflow_type': 'advanced_image',
        'prompt': '<script>alert("XSS Attack")</script> Generate an image'
    }
    
    is_valid, results = security.validate_workflow_request(dangerous_request, user_id='user456')
    
    print(f"\nDangerous Request: {dangerous_request}")
    print(f"Valid: {is_valid}")
    print("\nValidation Results:")
    for result in results:
        print(f"  [{result.severity.value.upper()}] {result.message}")
        if result.details:
            print(f"    Details: {result.details}")
    
    return is_valid


def example_3_access_control():
    """Example 3: Access control enforcement"""
    print("\n" + "=" * 60)
    print("Example 3: Access Control Enforcement")
    print("=" * 60)
    
    security = SecurityValidationSystem()
    
    # Test different user levels
    users = [
        ('anonymous', None),
        ('regular_user', SecurityLevel.AUTHENTICATED),
        ('power_user', SecurityLevel.PRIVILEGED),
        ('admin_user', SecurityLevel.ADMIN)
    ]
    
    for user_id, level in users:
        if level:
            security.access_control.set_user_level(user_id, level)
        
        print(f"\nUser: {user_id} (Level: {level.value if level else 'PUBLIC'})")
        
        # Try to access different resources
        resources = ['basic_generation', 'advanced_video', 'model_management', 'system_configuration']
        
        for resource in resources:
            result = security.access_control.check_permission(user_id if level else None, resource)
            status = "✓ GRANTED" if result.is_valid else "✗ DENIED"
            print(f"  {resource:25s} {status}")


def example_4_model_integrity():
    """Example 4: Model integrity checking"""
    print("\n" + "=" * 60)
    print("Example 4: Model Integrity Checking")
    print("=" * 60)
    
    security = SecurityValidationSystem()
    
    # Create a test model file
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.safetensors', delete=False) as f:
        f.write(b'fake model data for testing')
        model_path = Path(f.name)
    
    try:
        print(f"\nTest Model: {model_path.name}")
        
        # First verification (no known checksum)
        result1 = security.validate_model_file(model_path)
        print(f"\nFirst Verification (no checksum):")
        print(f"  Valid: {result1.is_valid}")
        print(f"  Severity: {result1.severity.value}")
        print(f"  Message: {result1.message}")
        
        # Register the model
        security.model_integrity_checker.register_model_checksum(model_path)
        print(f"\n✓ Model checksum registered")
        
        # Second verification (with checksum)
        result2 = security.validate_model_file(model_path)
        print(f"\nSecond Verification (with checksum):")
        print(f"  Valid: {result2.is_valid}")
        print(f"  Severity: {result2.severity.value}")
        print(f"  Message: {result2.message}")
        
        # Modify the file to simulate corruption
        with open(model_path, 'ab') as f:
            f.write(b'corrupted data')
        
        # Third verification (corrupted file)
        result3 = security.validate_model_file(model_path)
        print(f"\nThird Verification (corrupted file):")
        print(f"  Valid: {result3.is_valid}")
        print(f"  Severity: {result3.severity.value}")
        print(f"  Message: {result3.message}")
        
    finally:
        model_path.unlink()


def example_5_secure_downloads():
    """Example 5: Secure model download validation"""
    print("\n" + "=" * 60)
    print("Example 5: Secure Model Download Validation")
    print("=" * 60)
    
    security = SecurityValidationSystem()
    
    # Test various download URLs
    test_urls = [
        ("https://huggingface.co/models/test/model.safetensors", "Valid Hugging Face URL"),
        ("https://github.com/user/repo/releases/download/v1.0/model.safetensors", "Valid GitHub URL"),
        ("http://untrusted-site.com/model.safetensors", "Untrusted Domain"),
        ("ftp://example.com/model.safetensors", "Invalid Protocol"),
    ]
    
    for url, description in test_urls:
        result = security.validate_download_request(url, user_id='user123')
        status = "✓ VALID" if result.is_valid else "✗ INVALID"
        print(f"\n{description}:")
        print(f"  URL: {url}")
        print(f"  Status: {status}")
        print(f"  Message: {result.message}")


def example_6_privacy_protection():
    """Example 6: Privacy protection and PII detection"""
    print("\n" + "=" * 60)
    print("Example 6: Privacy Protection and PII Detection")
    print("=" * 60)
    
    security = SecurityValidationSystem()
    
    # Test text with PII
    text_with_pii = """
    Please contact me at john.doe@example.com or call 555-123-4567.
    My credit card is 1234-5678-9012-3456.
    """
    
    print("\nOriginal Text:")
    print(text_with_pii)
    
    # Detect PII
    detected = security.privacy_protector.detect_pii(text_with_pii)
    print("\nDetected PII:")
    for pii_type, values in detected.items():
        print(f"  {pii_type}: {values}")
    
    # Redact PII
    redacted = security.privacy_protector.redact_pii(text_with_pii)
    print("\nRedacted Text:")
    print(redacted)


def example_7_audit_logging():
    """Example 7: Audit logging and security reports"""
    print("\n" + "=" * 60)
    print("Example 7: Audit Logging and Security Reports")
    print("=" * 60)
    
    security = SecurityValidationSystem()
    
    # Simulate various activities
    print("\nSimulating workflow activities...")
    
    security.audit_logger.log_workflow_execution('user1', 'advanced_video', True, 
                                                 {'duration': 5, 'resolution': '720p'})
    security.audit_logger.log_workflow_execution('user2', 'advanced_image', True,
                                                 {'resolution': '1024x1024'})
    security.audit_logger.log_workflow_execution('user1', 'advanced_video', False,
                                                 {'error': 'Out of memory'})
    security.audit_logger.log_access_attempt('user3', 'system_configuration', False, '192.168.1.100')
    security.audit_logger.log_model_download('user2', 'hunyuan_video', 
                                            'https://huggingface.co/model', True)
    
    # Generate security report
    report = security.get_security_report()
    
    print("\nSecurity Report:")
    print(f"  Total Events: {report['total_events']}")
    print(f"  Unique Users: {report['unique_users']}")
    print(f"  Failed Access Attempts: {report['failed_access_attempts']}")
    
    print("\n  Events by Action:")
    for action, count in report['events_by_action'].items():
        print(f"    {action}: {count}")
    
    print("\n  Events by Result:")
    for result, count in report['events_by_result'].items():
        print(f"    {result}: {count}")


def example_8_trajectory_validation():
    """Example 8: Trajectory JSON validation"""
    print("\n" + "=" * 60)
    print("Example 8: Trajectory JSON Validation")
    print("=" * 60)
    
    security = SecurityValidationSystem()
    
    # Valid trajectory
    valid_trajectory = [
        [{"x": 100, "y": 200}, {"x": 150, "y": 250}, {"x": 200, "y": 300}],
        [{"x": 300, "y": 400}, {"x": 350, "y": 450}]
    ]
    
    result1 = security.input_validator.validate_trajectory_json(valid_trajectory)
    print("\nValid Trajectory:")
    print(f"  Valid: {result1.is_valid}")
    print(f"  Message: {result1.message}")
    if result1.details:
        print(f"  Details: {result1.details}")
    
    # Invalid trajectory (missing coordinates)
    invalid_trajectory = [
        [{"x": 100}, {"y": 200}]  # Missing y in first point, missing x in second
    ]
    
    result2 = security.input_validator.validate_trajectory_json(invalid_trajectory)
    print("\nInvalid Trajectory:")
    print(f"  Valid: {result2.is_valid}")
    print(f"  Message: {result2.message}")


def main():
    """Run all examples"""
    print("\n" + "=" * 60)
    print("SECURITY AND VALIDATION SYSTEM - EXAMPLES")
    print("=" * 60)
    
    try:
        example_1_basic_validation()
        example_2_dangerous_input_detection()
        example_3_access_control()
        example_4_model_integrity()
        example_5_secure_downloads()
        example_6_privacy_protection()
        example_7_audit_logging()
        example_8_trajectory_validation()
        
        print("\n" + "=" * 60)
        print("ALL EXAMPLES COMPLETED SUCCESSFULLY")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
