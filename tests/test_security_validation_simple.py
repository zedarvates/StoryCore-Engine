"""
Simple Test Suite for Security and Validation System

Tests all security components with realistic scenarios.

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import pytest
import tempfile
from pathlib import Path
from datetime import datetime, timedelta
import hashlib

# Import with fallback
try:
    from src.security_validation import (
        InputValidator, ModelIntegrityChecker, SecureDownloadManager,
        AccessControl, AuditLogger, SecurityValidationSystem,
        ValidationResult, SecurityLevel
    )
except ImportError:
    from security_validation import (
        InputValidator, ModelIntegrityChecker, SecureDownloadManager,
        AccessControl, AuditLogger, SecurityValidationSystem,
        ValidationResult, SecurityLevel
    )


class TestInputValidator:
    """Test input validation"""
    
    def test_valid_prompt(self):
        """Test valid prompt validation"""
        validator = InputValidator()
        result, error = validator.validate_prompt("A beautiful sunset over mountains")
        assert result == ValidationResult.VALID
        assert error is None
    
    def test_empty_prompt(self):
        """Test empty prompt rejection"""
        validator = InputValidator()
        result, error = validator.validate_prompt("")
        assert result == ValidationResult.INVALID
        assert "empty" in error.lower()
    
    def test_long_prompt(self):
        """Test overly long prompt rejection"""
        validator = InputValidator({'max_prompt_length': 100})
        long_prompt = "A" * 200
        result, error = validator.validate_prompt(long_prompt)
        assert result == ValidationResult.INVALID
        assert "length" in error.lower()
    
    def test_sql_injection_detection(self):
        """Test SQL injection pattern detection"""
        validator = InputValidator()
        malicious_prompt = "'; DROP TABLE users; --"
        result, error = validator.validate_prompt(malicious_prompt)
        assert result == ValidationResult.BLOCKED
        assert "SQL" in error or "pattern" in error
    
    def test_command_injection_detection(self):
        """Test command injection pattern detection"""
        validator = InputValidator()
        malicious_prompt = "test; rm -rf /"
        result, error = validator.validate_prompt(malicious_prompt)
        assert result == ValidationResult.BLOCKED
        assert "command" in error.lower() or "pattern" in error.lower()
    
    def test_xss_detection(self):
        """Test XSS pattern detection"""
        validator = InputValidator()
        malicious_prompt = "<script>alert('xss')</script>"
        result, error = validator.validate_prompt(malicious_prompt)
        assert result in [ValidationResult.BLOCKED, ValidationResult.SUSPICIOUS]
    
    def test_valid_path(self):
        """Test valid path validation"""
        validator = InputValidator()
        with tempfile.TemporaryDirectory() as tmpdir:
            test_path = Path(tmpdir) / "test.png"
            result, error = validator.validate_path(test_path)
            assert result == ValidationResult.VALID
    
    def test_path_traversal_detection(self):
        """Test path traversal detection"""
        validator = InputValidator()
        malicious_path = "../../../etc/passwd"
        result, error = validator.validate_path(malicious_path)
        assert result == ValidationResult.BLOCKED
        assert "traversal" in error.lower()
    
    def test_blocked_path_detection(self):
        """Test blocked path detection"""
        # Use Windows-compatible blocked paths for testing
        import platform
        if platform.system() == 'Windows':
            blocked_paths = {'C:\\Windows', 'C:\\Program Files'}
            test_path = "C:\\Windows\\System32\\config"
        else:
            blocked_paths = {'/etc', '/sys'}
            test_path = "/etc/passwd"
        
        validator = InputValidator({'blocked_paths': blocked_paths})
        result, error = validator.validate_path(test_path)
        assert result == ValidationResult.BLOCKED
    
    def test_invalid_extension(self):
        """Test invalid file extension rejection"""
        validator = InputValidator()
        result, error = validator.validate_path("test.exe")
        assert result == ValidationResult.INVALID
        assert "extension" in error.lower()
    
    def test_valid_config(self):
        """Test valid configuration validation"""
        validator = InputValidator()
        config = {
            'steps': 50,
            'cfg_scale': 7.5,
            'seed': 42,
            'batch_size': 4,
            'resolution': '720p'
        }
        result, errors = validator.validate_config(config)
        assert result == ValidationResult.VALID
        assert len(errors) == 0
    
    def test_invalid_config_steps(self):
        """Test invalid steps in configuration"""
        validator = InputValidator()
        config = {'steps': 2000}  # Too high
        result, errors = validator.validate_config(config)
        assert result == ValidationResult.INVALID
        assert any('steps' in e.lower() for e in errors)
    
    def test_invalid_config_cfg_scale(self):
        """Test invalid CFG scale in configuration"""
        validator = InputValidator()
        config = {'cfg_scale': 50}  # Too high
        result, errors = validator.validate_config(config)
        assert result == ValidationResult.INVALID
        assert any('cfg' in e.lower() for e in errors)
    
    def test_sanitize_input(self):
        """Test input sanitization"""
        validator = InputValidator()
        dirty_input = "test\x00string\n\twith\r\nweird   spaces"
        clean = validator.sanitize_input(dirty_input)
        assert '\x00' not in clean
        assert '  ' not in clean  # Multiple spaces normalized
    
    def test_injection_check(self):
        """Test injection attack checking"""
        validator = InputValidator()
        has_threat, threats = validator.check_injection_attacks("'; DROP TABLE users;")
        assert has_threat
        assert 'sql_injection' in threats


class TestModelIntegrityChecker:
    """Test model integrity checking"""
    
    def test_verify_checksum_valid(self):
        """Test valid checksum verification"""
        checker = ModelIntegrityChecker()
        
        # Create test file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.safetensors') as f:
            f.write(b"test model data")
            test_file = Path(f.name)
        
        try:
            # Calculate expected checksum
            with open(test_file, 'rb') as f:
                expected = hashlib.sha256(f.read()).hexdigest()
            
            # Verify
            valid, checksum = checker.verify_checksum(test_file, expected)
            assert valid
            assert checksum == expected
        finally:
            test_file.unlink()
    
    def test_verify_checksum_mismatch(self):
        """Test checksum mismatch detection"""
        checker = ModelIntegrityChecker()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.safetensors') as f:
            f.write(b"test model data")
            test_file = Path(f.name)
        
        try:
            # Use wrong checksum
            valid, error = checker.verify_checksum(test_file, "wrong_checksum")
            assert not valid
            assert "mismatch" in error.lower()
        finally:
            test_file.unlink()
    
    def test_verify_nonexistent_file(self):
        """Test verification of nonexistent file"""
        checker = ModelIntegrityChecker()
        valid, error = checker.verify_checksum(Path("nonexistent.safetensors"))
        assert not valid
        assert "not exist" in error.lower()
    
    def test_validate_model_format_valid(self):
        """Test valid model format validation"""
        checker = ModelIntegrityChecker()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.safetensors') as f:
            f.write(b"test model data with sufficient length")
            test_file = Path(f.name)
        
        try:
            valid, error = checker.validate_model_format(test_file)
            assert valid
        finally:
            test_file.unlink()
    
    def test_validate_model_format_invalid_extension(self):
        """Test invalid model format rejection"""
        checker = ModelIntegrityChecker()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as f:
            f.write(b"not a model")
            test_file = Path(f.name)
        
        try:
            valid, error = checker.validate_model_format(test_file)
            assert not valid
            assert "format" in error.lower() or "extension" in error.lower()
        finally:
            test_file.unlink()
    
    def test_scan_for_malware_valid(self):
        """Test malware scan on valid file"""
        checker = ModelIntegrityChecker()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.safetensors') as f:
            f.write(b"test model data" * 100)  # Make it larger
            test_file = Path(f.name)
        
        try:
            valid, error = checker.scan_for_malware(test_file)
            assert valid
        finally:
            test_file.unlink()
    
    def test_scan_for_malware_suspicious_size(self):
        """Test malware scan on suspiciously small file"""
        checker = ModelIntegrityChecker()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.safetensors') as f:
            f.write(b"x")  # Very small
            test_file = Path(f.name)
        
        try:
            valid, error = checker.scan_for_malware(test_file)
            assert not valid
            assert "small" in error.lower()
        finally:
            test_file.unlink()
    
    def test_is_model_verified(self):
        """Test model verification tracking"""
        checker = ModelIntegrityChecker()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.safetensors') as f:
            f.write(b"test model data")
            test_file = Path(f.name)
        
        try:
            # Initially not verified
            assert not checker.is_model_verified(test_file)
            
            # Verify
            checker.verify_checksum(test_file)
            
            # Now verified
            assert checker.is_model_verified(test_file)
        finally:
            test_file.unlink()


class TestSecureDownloadManager:
    """Test secure download management"""
    
    def test_validate_https_url(self):
        """Test HTTPS URL validation"""
        manager = SecureDownloadManager()
        valid, error = manager.validate_download_source("https://example.com/model.safetensors")
        assert valid
    
    def test_reject_http_url(self):
        """Test HTTP URL rejection"""
        manager = SecureDownloadManager()
        valid, error = manager.validate_download_source("http://example.com/model.safetensors")
        assert not valid
        assert "HTTPS" in error
    
    def test_reject_invalid_url(self):
        """Test invalid URL rejection"""
        manager = SecureDownloadManager()
        valid, error = manager.validate_download_source("not a url")
        assert not valid
    
    def test_domain_whitelist(self):
        """Test domain whitelist enforcement"""
        manager = SecureDownloadManager({'allowed_domains': ['trusted.com']})
        
        # Allowed domain
        valid, _ = manager.validate_download_source("https://trusted.com/model.safetensors")
        assert valid
        
        # Disallowed domain
        valid, error = manager.validate_download_source("https://untrusted.com/model.safetensors")
        assert not valid
        assert "whitelist" in error.lower()
    
    def test_suspicious_url_pattern(self):
        """Test suspicious URL pattern detection"""
        manager = SecureDownloadManager()
        valid, error = manager.validate_download_source("https://example.com/../../../etc/passwd")
        assert not valid
        assert "suspicious" in error.lower()
    
    def test_quarantine_file(self):
        """Test file quarantine"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = SecureDownloadManager({'quarantine_dir': tmpdir})
            
            # Create test file
            test_file = Path(tmpdir) / "suspicious.safetensors"
            test_file.write_text("suspicious content")
            
            # Quarantine
            quarantine_path = manager.quarantine_suspicious_file(test_file, "test reason")
            
            # Verify
            assert quarantine_path.exists()
            assert not test_file.exists()
            assert "suspicious" in quarantine_path.name
    
    def test_download_history(self):
        """Test download history tracking"""
        manager = SecureDownloadManager()
        
        # Initially empty
        assert len(manager.get_download_history()) == 0
        
        # Attempt download (placeholder)
        import asyncio
        asyncio.run(manager.download_model(
            "https://example.com/model.safetensors",
            Path("test.safetensors")
        ))
        
        # History recorded
        assert len(manager.get_download_history()) == 1


class TestAccessControl:
    """Test access control"""
    
    def test_grant_and_check_permission(self):
        """Test permission granting and checking"""
        ac = AccessControl()
        
        # Initially no permission
        assert not ac.check_permission("user1", "workflow1")
        
        # Grant permission
        ac.grant_permission("user1", "workflow1")
        
        # Now has permission
        assert ac.check_permission("user1", "workflow1")
    
    def test_revoke_permission(self):
        """Test permission revocation"""
        ac = AccessControl()
        
        # Grant and verify
        ac.grant_permission("user1", "workflow1")
        assert ac.check_permission("user1", "workflow1")
        
        # Revoke
        ac.revoke_permission("user1", "workflow1")
        
        # No longer has permission
        assert not ac.check_permission("user1", "workflow1")
    
    def test_rate_limiting(self):
        """Test rate limiting"""
        ac = AccessControl()
        
        # Should allow initial requests
        for i in range(5):
            assert ac.rate_limit("user1", max_requests=10, window_seconds=60)
        
        # Should block after limit
        for i in range(10):
            ac.rate_limit("user1", max_requests=10, window_seconds=60)
        
        # Should be blocked now
        assert not ac.rate_limit("user1", max_requests=10, window_seconds=60)
    
    def test_access_logging(self):
        """Test access logging"""
        ac = AccessControl()
        
        # Log some accesses
        ac.audit_access("user1", "workflow1", "execute", "allowed")
        ac.audit_access("user2", "workflow2", "execute", "denied")
        
        # Check log
        log = ac.get_access_log()
        assert len(log) >= 2
        
        # Check user-specific log
        user_log = ac.get_access_log(user="user1")
        assert all(e.user == "user1" for e in user_log)


class TestAuditLogger:
    """Test audit logging"""
    
    def test_log_workflow_execution(self):
        """Test workflow execution logging"""
        with tempfile.TemporaryDirectory() as tmpdir:
            logger = AuditLogger(Path(tmpdir))
            
            logger.log_workflow_execution(
                "test_workflow",
                "test_user",
                {'param1': 'value1'}
            )
            
            assert len(logger.events) == 1
            assert logger.events[0].event_type == "workflow_execution"
    
    def test_log_security_event(self):
        """Test security event logging"""
        with tempfile.TemporaryDirectory() as tmpdir:
            logger = AuditLogger(Path(tmpdir))
            
            logger.log_security_event(
                "intrusion_attempt",
                "test_user",
                "high",
                {'details': 'test'}
            )
            
            assert len(logger.events) == 1
            assert logger.events[0].event_type == "intrusion_attempt"
    
    def test_log_access_attempt(self):
        """Test access attempt logging"""
        with tempfile.TemporaryDirectory() as tmpdir:
            logger = AuditLogger(Path(tmpdir))
            
            logger.log_access_attempt("test_user", "test_resource", "read", "allowed")
            
            assert len(logger.events) == 1
            assert logger.events[0].event_type == "access_attempt"
    
    def test_generate_audit_report(self):
        """Test audit report generation"""
        with tempfile.TemporaryDirectory() as tmpdir:
            logger = AuditLogger(Path(tmpdir))
            
            # Log some events
            logger.log_workflow_execution("workflow1", "user1", {})
            logger.log_security_event("event1", "user1", "low")
            logger.log_access_attempt("user1", "resource1", "read", "denied")
            
            # Generate report
            now = datetime.now()
            report = logger.generate_audit_report(
                now - timedelta(hours=1),
                now + timedelta(hours=1)
            )
            
            assert report['total_events'] == 3
            assert 'events_by_type' in report
            assert 'security_events' in report


class TestSecurityValidationSystem:
    """Test integrated security system"""
    
    def test_validate_workflow_request_valid(self):
        """Test valid workflow request validation"""
        system = SecurityValidationSystem()
        
        # Grant permission
        system.access_control.grant_permission("test_user", "test_workflow")
        
        # Validate request
        valid, errors = system.validate_workflow_request(
            "test_user",
            "test_workflow",
            {
                'prompt': "A beautiful sunset",
                'steps': 50,
                'cfg_scale': 7.5,
                'resolution': '720p'
            }
        )
        
        assert valid
        assert len(errors) == 0
    
    def test_validate_workflow_request_no_permission(self):
        """Test workflow request without permission"""
        system = SecurityValidationSystem()
        
        # Don't grant permission
        valid, errors = system.validate_workflow_request(
            "test_user",
            "test_workflow",
            {'prompt': "test"}
        )
        
        assert not valid
        assert any('permission' in e.lower() for e in errors)
    
    def test_validate_workflow_request_invalid_prompt(self):
        """Test workflow request with invalid prompt"""
        system = SecurityValidationSystem()
        
        # Grant permission
        system.access_control.grant_permission("test_user", "test_workflow")
        
        # Validate with malicious prompt
        valid, errors = system.validate_workflow_request(
            "test_user",
            "test_workflow",
            {'prompt': "'; DROP TABLE users;"}
        )
        
        assert not valid
        assert any('prompt' in e.lower() for e in errors)
    
    def test_verify_model_security(self):
        """Test model security verification"""
        system = SecurityValidationSystem()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.safetensors') as f:
            f.write(b"test model data" * 100)
            test_file = Path(f.name)
        
        try:
            valid, issues = system.verify_model_security(test_file)
            assert valid
            assert len(issues) == 0
        finally:
            test_file.unlink()
    
    def test_get_security_report(self):
        """Test security report generation"""
        system = SecurityValidationSystem()
        
        # Generate some activity
        system.access_control.grant_permission("user1", "workflow1")
        system.audit_logger.log_workflow_execution("workflow1", "user1", {})
        
        # Get report
        report = system.get_security_report()
        
        assert 'timestamp' in report
        assert 'validation_errors' in report
        assert 'verified_models' in report
        assert 'audit_report' in report


def run_tests():
    """Run all tests"""
    print("=" * 80)
    print("SECURITY VALIDATION SYSTEM - TEST SUITE")
    print("=" * 80)
    
    test_classes = [
        TestInputValidator,
        TestModelIntegrityChecker,
        TestSecureDownloadManager,
        TestAccessControl,
        TestAuditLogger,
        TestSecurityValidationSystem
    ]
    
    total_tests = 0
    passed_tests = 0
    failed_tests = []
    
    for test_class in test_classes:
        print(f"\n{test_class.__name__}")
        print("-" * 80)
        
        test_instance = test_class()
        test_methods = [m for m in dir(test_instance) if m.startswith('test_')]
        
        for method_name in test_methods:
            total_tests += 1
            try:
                method = getattr(test_instance, method_name)
                method()
                print(f"  ✓ {method_name}")
                passed_tests += 1
            except Exception as e:
                print(f"  ✗ {method_name}: {e}")
                failed_tests.append((test_class.__name__, method_name, str(e)))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
    print(f"Failed: {len(failed_tests)}")
    
    if failed_tests:
        print("\nFailed Tests:")
        for class_name, method_name, error in failed_tests:
            print(f"  - {class_name}.{method_name}: {error}")
    
    print("=" * 80)
    
    return passed_tests == total_tests


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
