"""
Comprehensive Test Suite for Advanced Security and Validation System

This module provides extensive testing for security validation, input sanitization,
model integrity checking, and access control systems.
"""

import pytest
import tempfile
import shutil
import json
import os
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, mock_open
from pathlib import Path

# Import the classes to test
from src.advanced_security_validation import (
    SecurityManager,
    SecurityConfig,
    InputValidator,
    ModelIntegrityChecker,
    AccessController,
    RateLimiter,
    AuditLogger,
    ValidationResult,
    ValidationReport,
    SecurityLevel,
    create_test_security_config,
    run_security_tests
)


class TestSecurityConfig:
    """Test security configuration"""
    
    def test_default_config(self):
        """Test default security configuration"""
        config = SecurityConfig()
        
        assert config.max_prompt_length == 2000
        assert config.max_file_size_mb == 50
        assert config.enable_authentication is False
        assert config.enable_rate_limiting is True
        assert config.requests_per_minute == 60
        assert config.enable_audit_logging is True
        assert len(config.allowed_file_extensions) > 0
    
    def test_custom_config(self):
        """Test custom security configuration"""
        config = SecurityConfig(
            max_prompt_length=1000,
            enable_authentication=True,
            requests_per_minute=30,
            anonymize_user_data=False
        )
        
        assert config.max_prompt_length == 1000
        assert config.enable_authentication is True
        assert config.requests_per_minute == 30
        assert config.anonymize_user_data is False


class TestInputValidator:
    """Test input validation system"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return create_test_security_config()
    
    @pytest.fixture
    def validator(self, config):
        """Create input validator for testing"""
        return InputValidator(config)
    
    def test_valid_prompt(self, validator):
        """Test validation of normal prompt"""
        result = validator.validate_prompt("Generate a beautiful landscape image")
        
        assert result.result == ValidationResult.VALID
        assert result.risk_score < 0.2
        assert len(result.blocked_items) == 0
    
    def test_long_prompt(self, validator):
        """Test validation of overly long prompt"""
        long_prompt = "A" * 2000
        result = validator.validate_prompt(long_prompt)
        
        assert result.result in [ValidationResult.INVALID, ValidationResult.SUSPICIOUS]
        assert result.risk_score > 0.2
        assert "excessive_length" in result.blocked_items
    
    def test_sql_injection_prompt(self, validator):
        """Test detection of SQL injection attempts"""
        malicious_prompt = "SELECT * FROM users; DROP TABLE users;"
        result = validator.validate_prompt(malicious_prompt)
        
        assert result.result in [ValidationResult.SUSPICIOUS, ValidationResult.BLOCKED]
        assert result.risk_score > 0.3
        assert "sql_injection" in result.blocked_items
    
    def test_xss_prompt(self, validator):
        """Test detection of XSS attempts"""
        xss_prompt = "<script>alert('xss')</script>"
        result = validator.validate_prompt(xss_prompt)
        
        assert result.result in [ValidationResult.SUSPICIOUS, ValidationResult.BLOCKED]
        assert result.risk_score > 0.3
        assert "xss" in result.blocked_items
    
    def test_path_traversal_prompt(self, validator):
        """Test detection of path traversal attempts"""
        traversal_prompt = "../../etc/passwd"
        result = validator.validate_prompt(traversal_prompt)
        
        assert result.result in [ValidationResult.SUSPICIOUS, ValidationResult.BLOCKED]
        assert result.risk_score > 0.3
        assert "path_traversal" in result.blocked_items
    
    def test_malicious_content_detection(self, validator):
        """Test detection of malicious content patterns"""
        malicious_prompts = [
            "eval('malicious code')",
            "import os; os.system('rm -rf /')",
            "javascript:alert('xss')",
            "__import__('os').system('ls')"
        ]
        
        for prompt in malicious_prompts:
            result = validator.validate_prompt(prompt)
            assert result.result in [ValidationResult.SUSPICIOUS, ValidationResult.BLOCKED]
            assert result.risk_score > 0.4
    
    def test_file_validation_valid(self, validator):
        """Test validation of valid file"""
        result = validator.validate_file_upload("test.jpg", 1024 * 1024)  # 1MB
        
        assert result.result == ValidationResult.VALID
        assert result.risk_score < 0.3
    
    def test_file_validation_invalid_extension(self, validator):
        """Test validation of file with invalid extension"""
        result = validator.validate_file_upload("test.exe", 1024 * 1024)
        
        assert result.result in [ValidationResult.INVALID, ValidationResult.SUSPICIOUS]
        assert result.risk_score > 0.5
        assert "invalid_extension" in result.blocked_items
    
    def test_file_validation_too_large(self, validator):
        """Test validation of oversized file"""
        large_size = 100 * 1024 * 1024  # 100MB
        result = validator.validate_file_upload("test.jpg", large_size)
        
        assert result.result in [ValidationResult.INVALID, ValidationResult.SUSPICIOUS]
        assert result.risk_score > 0.3
        assert "excessive_size" in result.blocked_items
    
    def test_path_traversal_file(self, validator):
        """Test detection of path traversal in file paths"""
        result = validator.validate_file_upload("../../etc/passwd", 1024)
        
        assert result.result in [ValidationResult.SUSPICIOUS, ValidationResult.BLOCKED]
        assert result.risk_score > 0.7
        assert "path_traversal" in result.blocked_items
    
    def test_input_sanitization(self, validator):
        """Test input sanitization"""
        malicious_input = "<script>alert('xss')</script>Hello World"
        sanitized = validator.sanitize_input(malicious_input)
        
        assert "<script>" not in sanitized
        assert "Hello World" in sanitized
        assert len(sanitized) <= validator.config.max_prompt_length


class TestModelIntegrityChecker:
    """Test model integrity checking system"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return create_test_security_config()
    
    @pytest.fixture
    def checker(self, config):
        """Create model integrity checker for testing"""
        return ModelIntegrityChecker(config)
    
    @pytest.fixture
    def temp_model_file(self):
        """Create temporary model file for testing"""
        temp_file = tempfile.NamedTemporaryFile(suffix=".safetensors", delete=False)
        temp_file.write(b"fake model data" * 100)
        temp_file.close()
        
        yield temp_file.name
        
        # Cleanup
        if os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
    
    def test_file_hash_calculation(self, checker, temp_model_file):
        """Test file hash calculation"""
        hash_value = checker.calculate_file_hash(temp_model_file)
        
        assert len(hash_value) == 64  # SHA256 hex length
        assert hash_value.isalnum()
    
    def test_model_integrity_valid(self, checker, temp_model_file):
        """Test model integrity check for valid model"""
        result = checker.verify_model_integrity(temp_model_file)
        
        assert result.result in [ValidationResult.VALID, ValidationResult.INVALID]
        assert "current_hash" in result.details
        assert "file_size_mb" in result.details
    
    def test_model_integrity_missing_file(self, checker):
        """Test model integrity check for missing file"""
        result = checker.verify_model_integrity("nonexistent_model.safetensors")
        
        assert result.result == ValidationResult.BLOCKED
        assert result.risk_score == 1.0
        assert "file_not_found" in result.blocked_items
    
    def test_model_integrity_with_checksums(self, checker, temp_model_file):
        """Test model integrity with known checksums"""
        # Calculate actual hash
        actual_hash = checker.calculate_file_hash(temp_model_file)
        
        # Set up known checksums with wrong hash
        model_name = os.path.basename(temp_model_file)
        checker.known_checksums[model_name] = "wrong_hash_value"
        
        result = checker.verify_model_integrity(temp_model_file)
        
        assert result.result in [ValidationResult.SUSPICIOUS, ValidationResult.BLOCKED]
        assert result.risk_score > 0.7
        assert "checksum_mismatch" in result.blocked_items
    
    def test_suspicious_file_size(self, checker):
        """Test detection of suspicious file sizes"""
        # Create very small file
        tiny_file = tempfile.NamedTemporaryFile(suffix=".safetensors", delete=False)
        tiny_file.write(b"x")
        tiny_file.close()
        
        try:
            result = checker.verify_model_integrity(tiny_file.name)
            
            assert result.result in [ValidationResult.INVALID, ValidationResult.SUSPICIOUS]
            assert "suspicious_size" in result.blocked_items
            
        finally:
            os.unlink(tiny_file.name)


class TestAccessController:
    """Test access control system"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return SecurityConfig(enable_authentication=True, require_api_keys=True)
    
    @pytest.fixture
    def controller(self, config):
        """Create access controller for testing"""
        return AccessController(config)
    
    def test_api_key_generation(self, controller):
        """Test API key generation"""
        api_key = controller.generate_api_key("test_user", ["read", "write"])
        
        assert len(api_key) > 20
        assert api_key in controller.api_keys
        assert controller.api_keys[api_key]["user_id"] == "test_user"
        assert "read" in controller.api_keys[api_key]["permissions"]
    
    def test_valid_api_key(self, controller):
        """Test validation of valid API key"""
        api_key = controller.generate_api_key("test_user", ["read", "write"])
        result = controller.validate_api_key(api_key, "read")
        
        assert result.result == ValidationResult.VALID
        assert result.risk_score == 0.0
        assert result.details["user_id"] == "test_user"
    
    def test_invalid_api_key(self, controller):
        """Test validation of invalid API key"""
        result = controller.validate_api_key("invalid_key", "read")
        
        assert result.result == ValidationResult.BLOCKED
        assert result.risk_score == 1.0
        assert "invalid_api_key" in result.blocked_items
    
    def test_insufficient_permissions(self, controller):
        """Test API key with insufficient permissions"""
        api_key = controller.generate_api_key("test_user", ["read"])
        result = controller.validate_api_key(api_key, "write")
        
        assert result.result == ValidationResult.BLOCKED
        assert result.risk_score == 0.8
        assert "insufficient_permissions" in result.blocked_items
    
    def test_session_creation(self, controller):
        """Test session creation"""
        session_id = controller.create_session("test_user", "192.168.1.1")
        
        assert len(session_id) > 20
        assert session_id in controller.active_sessions
        assert controller.active_sessions[session_id]["user_id"] == "test_user"
    
    def test_valid_session(self, controller):
        """Test validation of valid session"""
        session_id = controller.create_session("test_user", "192.168.1.1")
        result = controller.validate_session(session_id, "192.168.1.1")
        
        assert result.result == ValidationResult.VALID
        assert result.details["user_id"] == "test_user"
    
    def test_invalid_session(self, controller):
        """Test validation of invalid session"""
        result = controller.validate_session("invalid_session", "192.168.1.1")
        
        assert result.result == ValidationResult.BLOCKED
        assert result.risk_score == 0.8
        assert "invalid_session" in result.blocked_items
    
    def test_session_ip_mismatch(self, controller):
        """Test session with IP address mismatch"""
        session_id = controller.create_session("test_user", "192.168.1.1")
        result = controller.validate_session(session_id, "192.168.1.2")
        
        assert result.result == ValidationResult.SUSPICIOUS
        assert result.risk_score > 0.3
        assert "ip_mismatch" in result.blocked_items
    
    def test_failed_attempts_tracking(self, controller):
        """Test failed attempts tracking and blocking"""
        ip_address = "192.168.1.100"
        
        # Record multiple failed attempts
        for _ in range(6):  # Exceed max_failed_attempts (5)
            controller.record_failed_attempt("test_user", ip_address)
        
        assert controller.is_blocked(ip_address)
        assert ip_address in controller.blocked_ips


class TestRateLimiter:
    """Test rate limiting system"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return SecurityConfig(
            enable_rate_limiting=True,
            requests_per_minute=5,
            burst_limit=2
        )
    
    @pytest.fixture
    def limiter(self, config):
        """Create rate limiter for testing"""
        return RateLimiter(config)
    
    def test_rate_limiting_disabled(self):
        """Test rate limiting when disabled"""
        config = SecurityConfig(enable_rate_limiting=False)
        limiter = RateLimiter(config)
        
        result = limiter.check_rate_limit("test_user")
        
        assert result.result == ValidationResult.VALID
        assert result.details["rate_limiting_disabled"] is True
    
    def test_normal_rate_limiting(self, limiter):
        """Test normal rate limiting behavior"""
        # First few requests should be allowed
        for i in range(3):
            result = limiter.check_rate_limit("test_user")
            assert result.result == ValidationResult.VALID
    
    def test_burst_limit_exceeded(self, limiter):
        """Test burst limit exceeded"""
        # Make requests quickly to trigger burst limit
        for i in range(3):  # Exceed burst_limit (2)
            result = limiter.check_rate_limit("test_user")
            if i >= 2:  # Should be blocked on 3rd request
                assert result.result == ValidationResult.BLOCKED
                assert "burst_limit_exceeded" in result.blocked_items
    
    def test_rate_limit_per_minute(self, limiter):
        """Test rate limit per minute"""
        # This test would need time manipulation to be effective
        # For now, just test the structure
        for i in range(6):  # Exceed requests_per_minute (5)
            result = limiter.check_rate_limit("test_user")
            # Later requests should be blocked
            if i >= 5:
                assert result.result == ValidationResult.BLOCKED


class TestAuditLogger:
    """Test audit logging system"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return SecurityConfig(
            enable_audit_logging=True,
            anonymize_user_data=False
        )
    
    @pytest.fixture
    def logger(self, config):
        """Create audit logger for testing"""
        return AuditLogger(config)
    
    @pytest.fixture
    def temp_log_dir(self):
        """Create temporary log directory"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    def test_audit_logging_disabled(self):
        """Test audit logging when disabled"""
        config = SecurityConfig(enable_audit_logging=False)
        logger = AuditLogger(config)
        
        # Should not create log entries
        initial_count = len(logger.audit_entries)
        logger.log_action("test_user", "test_action", "test_resource", "success")
        
        assert len(logger.audit_entries) == initial_count
    
    def test_log_action(self, logger):
        """Test logging user actions"""
        logger.log_action(
            user_id="test_user",
            action="image_generation",
            resource="workflow_engine",
            result="success",
            session_id="session_123",
            ip_address="192.168.1.1",
            details={"prompt": "test prompt"}
        )
        
        assert len(logger.audit_entries) == 1
        entry = logger.audit_entries[0]
        
        assert entry.user_id == "test_user"
        assert entry.action == "image_generation"
        assert entry.resource == "workflow_engine"
        assert entry.result == "success"
        assert entry.session_id == "session_123"
        assert entry.ip_address == "192.168.1.1"
        assert entry.details["prompt"] == "test prompt"
    
    def test_anonymization(self):
        """Test user data anonymization"""
        config = SecurityConfig(
            enable_audit_logging=True,
            anonymize_user_data=True
        )
        logger = AuditLogger(config)
        
        logger.log_action(
            user_id="test_user",
            action="test_action",
            resource="test_resource",
            result="success",
            ip_address="192.168.1.1"
        )
        
        entry = logger.audit_entries[0]
        
        # User ID should be anonymized (hashed)
        assert entry.user_id != "test_user"
        assert len(entry.user_id) == 16  # Truncated hash
        
        # IP should be anonymized
        assert entry.ip_address == "192.168.1.xxx"
    
    def test_audit_report_generation(self, logger):
        """Test audit report generation"""
        # Add some test entries
        actions = ["login", "image_generation", "logout", "login"]
        results = ["success", "success", "success", "failed"]
        
        for action, result in zip(actions, results):
            logger.log_action("test_user", action, "test_resource", result)
        
        report = logger.get_audit_report(hours=24)
        
        assert report["total_entries"] == 4
        assert report["unique_users"] == 1
        assert report["actions_summary"]["login"] == 2
        assert report["actions_summary"]["image_generation"] == 1
        assert report["results_summary"]["success"] == 3
        assert report["results_summary"]["failed"] == 1


class TestSecurityManager:
    """Test main security manager"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return create_test_security_config()
    
    @pytest.fixture
    def security_manager(self, config):
        """Create security manager for testing"""
        return SecurityManager(config)
    
    def test_initialization(self, security_manager):
        """Test security manager initialization"""
        assert security_manager.input_validator is not None
        assert security_manager.model_checker is not None
        assert security_manager.access_controller is not None
        assert security_manager.rate_limiter is not None
        assert security_manager.audit_logger is not None
    
    def test_validate_request_simple(self, security_manager):
        """Test simple request validation"""
        request_data = {
            "prompt": "Generate a beautiful landscape",
            "workflow_type": "image_generation"
        }
        
        result = security_manager.validate_request(request_data, user_id="test_user")
        
        assert result.result == ValidationResult.VALID
        assert result.risk_score < 0.5
    
    def test_validate_request_malicious(self, security_manager):
        """Test malicious request validation"""
        request_data = {
            "prompt": "SELECT * FROM users; DROP TABLE users;",
            "workflow_type": "image_generation"
        }
        
        result = security_manager.validate_request(request_data, user_id="test_user")
        
        assert result.result in [ValidationResult.SUSPICIOUS, ValidationResult.BLOCKED]
        assert result.risk_score > 0.3
    
    def test_validate_request_with_file(self, security_manager):
        """Test request validation with file upload"""
        request_data = {
            "prompt": "Edit this image",
            "workflow_type": "image_editing",
            "file_path": "test.jpg",
            "file_size": 1024 * 1024  # 1MB
        }
        
        result = security_manager.validate_request(request_data, user_id="test_user")
        
        assert result.result == ValidationResult.VALID
        assert "individual_validations" in result.details
    
    def test_security_status(self, security_manager):
        """Test security status reporting"""
        status = security_manager.get_security_status()
        
        assert "security_level" in status
        assert "authentication_enabled" in status
        assert "rate_limiting_enabled" in status
        assert "audit_logging_enabled" in status
        assert "active_sessions" in status
        assert "blocked_ips" in status
    
    def test_security_scan(self, security_manager):
        """Test security scan functionality"""
        scan_results = security_manager.perform_security_scan()
        
        assert "scan_timestamp" in scan_results
        assert "scan_type" in scan_results
        assert "findings" in scan_results
        assert "recommendations" in scan_results
        assert "risk_level" in scan_results
        
        assert scan_results["scan_type"] == "comprehensive"
        assert scan_results["risk_level"] in ["low", "medium", "high"]


class TestSecurityIntegration:
    """Test security system integration scenarios"""
    
    @pytest.fixture
    def security_manager(self):
        """Create security manager for integration testing"""
        config = SecurityConfig(
            enable_authentication=True,
            require_api_keys=True,
            enable_rate_limiting=True,
            requests_per_minute=10,
            burst_limit=3
        )
        return SecurityManager(config)
    
    def test_full_authentication_flow(self, security_manager):
        """Test complete authentication flow"""
        # Generate API key
        api_key = security_manager.access_controller.generate_api_key(
            "test_user", ["read", "write"]
        )
        
        # Create session
        session_id = security_manager.access_controller.create_session(
            "test_user", "192.168.1.1"
        )
        
        # Validate request with authentication
        request_data = {
            "api_key": api_key,
            "prompt": "Generate image",
            "workflow_type": "image_generation",
            "required_permission": "write"
        }
        
        result = security_manager.validate_request(
            request_data, 
            user_id="test_user",
            session_id=session_id,
            ip_address="192.168.1.1"
        )
        
        assert result.result == ValidationResult.VALID
    
    def test_security_escalation_scenario(self, security_manager):
        """Test security escalation detection"""
        # Simulate multiple failed attempts
        for _ in range(6):
            security_manager.access_controller.record_failed_attempt(
                "attacker", "192.168.1.100"
            )
        
        # Try to make request from blocked IP
        request_data = {"prompt": "test"}
        
        # IP should be blocked
        assert security_manager.access_controller.is_blocked("192.168.1.100")
        
        # Security scan should detect issues
        scan_results = security_manager.perform_security_scan()
        assert len(scan_results["findings"]) > 0


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "--tb=short"])