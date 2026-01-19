"""
Tests for Security and Validation System

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import json
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch

from src.security_validation_system import (
    AccessControlManager,
    AuditLogger,
    DataSanitizer,
    InputValidator,
    ModelIntegrityChecker,
    PrivacyProtector,
    SecureModelDownloader,
    SecurityAuditEntry,
    SecurityLevel,
    SecurityValidationSystem,
    ValidationResult,
    ValidationSeverity,
)


class TestInputValidator(unittest.TestCase):
    """Test input validation"""
    
    def setUp(self):
        self.validator = InputValidator()
    
    def test_valid_text_prompt(self):
        """Test validation of valid text prompt"""
        result = self.validator.validate_text_prompt("A beautiful sunset")
        self.assertTrue(result.is_valid)
        self.assertEqual(result.severity, ValidationSeverity.INFO)
    
    def test_empty_prompt(self):
        """Test validation of empty prompt"""
        result = self.validator.validate_text_prompt("")
        self.assertFalse(result.is_valid)
        self.assertEqual(result.severity, ValidationSeverity.ERROR)
    
    def test_prompt_too_long(self):
        """Test validation of overly long prompt"""
        long_prompt = "A" * 20000
        result = self.validator.validate_text_prompt(long_prompt)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.severity, ValidationSeverity.ERROR)
    
    def test_dangerous_script_injection(self):
        """Test detection of script injection"""
        dangerous_prompt = "Hello <script>alert('xss')</script>"
        result = self.validator.validate_text_prompt(dangerous_prompt)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.severity, ValidationSeverity.CRITICAL)
    
    def test_javascript_protocol(self):
        """Test detection of javascript protocol"""
        dangerous_prompt = "Click here: javascript:alert('xss')"
        result = self.validator.validate_text_prompt(dangerous_prompt)
        self.assertFalse(result.is_valid)

    
    def test_valid_image_input(self):
        """Test validation of valid image file"""
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            f.write(b'fake image data')
            temp_path = Path(f.name)
        
        try:
            result = self.validator.validate_image_input(temp_path)
            self.assertTrue(result.is_valid)
        finally:
            temp_path.unlink()
    
    def test_image_not_found(self):
        """Test validation of non-existent image"""
        result = self.validator.validate_image_input("nonexistent.jpg")
        self.assertFalse(result.is_valid)
    
    def test_unsupported_image_format(self):
        """Test validation of unsupported image format"""
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
            f.write(b'not an image')
            temp_path = Path(f.name)
        
        try:
            result = self.validator.validate_image_input(temp_path)
            self.assertFalse(result.is_valid)
        finally:
            temp_path.unlink()
    
    def test_valid_trajectory_json(self):
        """Test validation of valid trajectory JSON"""
        trajectory = [
            [{"x": 100, "y": 200}, {"x": 150, "y": 250}],
            [{"x": 300, "y": 400}, {"x": 350, "y": 450}]
        ]
        result = self.validator.validate_trajectory_json(trajectory)
        self.assertTrue(result.is_valid)
    
    def test_invalid_trajectory_format(self):
        """Test validation of invalid trajectory format"""
        trajectory = "not a list"
        result = self.validator.validate_trajectory_json(trajectory)
        self.assertFalse(result.is_valid)
    
    def test_trajectory_missing_coordinates(self):
        """Test validation of trajectory with missing coordinates"""
        trajectory = [[{"x": 100}]]  # Missing 'y'
        result = self.validator.validate_trajectory_json(trajectory)
        self.assertFalse(result.is_valid)
    
    def test_sanitize_filename(self):
        """Test filename sanitization"""
        dangerous_name = "../../../etc/passwd"
        safe_name = self.validator.sanitize_filename(dangerous_name)
        self.assertNotIn("..", safe_name)
        self.assertNotIn("/", safe_name)


class TestModelIntegrityChecker(unittest.TestCase):
    """Test model integrity checking"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.checksum_file = Path(self.temp_dir) / "checksums.json"
        self.checker = ModelIntegrityChecker(self.checksum_file)
    
    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_calculate_checksum(self):
        """Test checksum calculation"""
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b'test data')
            temp_path = Path(f.name)
        
        try:
            checksum = self.checker.calculate_checksum(temp_path)
            self.assertIsInstance(checksum, str)
            self.assertEqual(len(checksum), 64)  # SHA256 hex length
        finally:
            temp_path.unlink()
    
    def test_verify_model_with_no_checksum(self):
        """Test verification when no checksum is known"""
        with tempfile.NamedTemporaryFile(suffix='.safetensors', delete=False) as f:
            f.write(b'model data')
            temp_path = Path(f.name)
        
        try:
            result = self.checker.verify_model_integrity(temp_path)
            self.assertTrue(result.is_valid)
            self.assertEqual(result.severity, ValidationSeverity.WARNING)
        finally:
            temp_path.unlink()
    
    def test_verify_model_with_matching_checksum(self):
        """Test verification with matching checksum"""
        with tempfile.NamedTemporaryFile(suffix='.safetensors', delete=False) as f:
            f.write(b'model data')
            temp_path = Path(f.name)
        
        try:
            # Register checksum
            self.checker.register_model_checksum(temp_path)
            
            # Verify
            result = self.checker.verify_model_integrity(temp_path)
            self.assertTrue(result.is_valid)
            self.assertEqual(result.severity, ValidationSeverity.INFO)
        finally:
            temp_path.unlink()
    
    def test_verify_model_with_mismatched_checksum(self):
        """Test verification with mismatched checksum"""
        with tempfile.NamedTemporaryFile(suffix='.safetensors', delete=False) as f:
            f.write(b'model data')
            temp_path = Path(f.name)
        
        try:
            # Register wrong checksum
            self.checker.known_checksums[temp_path.name] = "wrong_checksum"
            
            # Verify
            result = self.checker.verify_model_integrity(temp_path)
            self.assertFalse(result.is_valid)
            self.assertEqual(result.severity, ValidationSeverity.CRITICAL)
        finally:
            temp_path.unlink()


class TestSecureModelDownloader(unittest.TestCase):
    """Test secure model downloading"""
    
    def setUp(self):
        self.downloader = SecureModelDownloader()
    
    def test_valid_huggingface_url(self):
        """Test validation of valid Hugging Face URL"""
        url = "https://huggingface.co/models/test-model/resolve/main/model.safetensors"
        result = self.downloader.validate_download_url(url)
        self.assertTrue(result.is_valid)
    
    def test_valid_github_url(self):
        """Test validation of valid GitHub URL"""
        url = "https://github.com/user/repo/releases/download/v1.0/model.safetensors"
        result = self.downloader.validate_download_url(url)
        self.assertTrue(result.is_valid)
    
    def test_invalid_protocol(self):
        """Test rejection of invalid protocol"""
        url = "ftp://example.com/model.safetensors"
        result = self.downloader.validate_download_url(url)
        self.assertFalse(result.is_valid)
    
    def test_untrusted_domain(self):
        """Test rejection of untrusted domain"""
        url = "https://malicious-site.com/model.safetensors"
        result = self.downloader.validate_download_url(url)
        self.assertFalse(result.is_valid)


class TestAccessControlManager(unittest.TestCase):
    """Test access control"""
    
    def setUp(self):
        self.access_control = AccessControlManager()
    
    def test_public_access(self):
        """Test public access to basic features"""
        result = self.access_control.check_permission(None, 'basic_generation')
        self.assertTrue(result.is_valid)
    
    def test_authenticated_access_denied(self):
        """Test authenticated access denied for public user"""
        result = self.access_control.check_permission('user123', 'advanced_video')
        self.assertFalse(result.is_valid)
    
    def test_authenticated_access_granted(self):
        """Test authenticated access granted"""
        self.access_control.set_user_level('user123', SecurityLevel.AUTHENTICATED)
        result = self.access_control.check_permission('user123', 'advanced_video')
        self.assertTrue(result.is_valid)
    
    def test_admin_access(self):
        """Test admin access to all resources"""
        self.access_control.set_user_level('admin', SecurityLevel.ADMIN)
        
        for resource in self.access_control.permissions.keys():
            result = self.access_control.check_permission('admin', resource)
            self.assertTrue(result.is_valid, f"Admin should have access to {resource}")
    
    def test_unknown_resource(self):
        """Test access to unknown resource"""
        result = self.access_control.check_permission('user123', 'unknown_resource')
        self.assertFalse(result.is_valid)


class TestAuditLogger(unittest.TestCase):
    """Test audit logging"""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.log_file = Path(self.temp_dir) / "audit.jsonl"
        self.logger = AuditLogger(self.log_file)
    
    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_log_workflow_execution(self):
        """Test logging workflow execution"""
        self.logger.log_workflow_execution('user123', 'advanced_video', True)
        
        logs = self.logger.get_audit_logs()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]['action'], 'workflow_execution')
        self.assertEqual(logs[0]['result'], 'success')
    
    def test_log_model_download(self):
        """Test logging model download"""
        self.logger.log_model_download('user123', 'test_model', 'https://example.com/model', True)
        
        logs = self.logger.get_audit_logs()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]['action'], 'model_download')
    
    def test_log_access_attempt(self):
        """Test logging access attempt"""
        self.logger.log_access_attempt('user123', 'advanced_video', False, '192.168.1.1')
        
        logs = self.logger.get_audit_logs()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]['result'], 'denied')
        self.assertEqual(logs[0]['ip_address'], '192.168.1.1')
    
    def test_filter_logs_by_user(self):
        """Test filtering logs by user"""
        self.logger.log_workflow_execution('user1', 'workflow1', True)
        self.logger.log_workflow_execution('user2', 'workflow2', True)
        
        logs = self.logger.get_audit_logs(user_id='user1')
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]['user_id'], 'user1')
    
    def test_filter_logs_by_action(self):
        """Test filtering logs by action"""
        self.logger.log_workflow_execution('user1', 'workflow1', True)
        self.logger.log_model_download('user1', 'model1', 'url', True)
        
        logs = self.logger.get_audit_logs(action='workflow_execution')
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]['action'], 'workflow_execution')


class TestDataSanitizer(unittest.TestCase):
    """Test data sanitization"""
    
    def setUp(self):
        self.sanitizer = DataSanitizer()
    
    def test_sanitize_html(self):
        """Test HTML sanitization"""
        html = '<script>alert("xss")</script>'
        sanitized = self.sanitizer.sanitize_html(html)
        self.assertNotIn('<script>', sanitized)
        self.assertIn('&lt;script&gt;', sanitized)
    
    def test_sanitize_sql(self):
        """Test SQL sanitization"""
        sql = "'; DROP TABLE users; --"
        sanitized = self.sanitizer.sanitize_sql(sql)
        self.assertNotIn('DROP', sanitized)
        self.assertNotIn('--', sanitized)
    
    def test_sanitize_path(self):
        """Test path sanitization"""
        path = "../../../etc/passwd"
        sanitized = self.sanitizer.sanitize_path(path)
        self.assertNotIn('..', sanitized)


class TestPrivacyProtector(unittest.TestCase):
    """Test privacy protection"""
    
    def setUp(self):
        self.protector = PrivacyProtector()
    
    def test_detect_email(self):
        """Test email detection"""
        text = "Contact me at user@example.com"
        detected = self.protector.detect_pii(text)
        self.assertIn('email', detected)
        self.assertEqual(detected['email'], ['user@example.com'])
    
    def test_detect_phone(self):
        """Test phone number detection"""
        text = "Call me at 555-123-4567"
        detected = self.protector.detect_pii(text)
        self.assertIn('phone', detected)
    
    def test_redact_pii(self):
        """Test PII redaction"""
        text = "Email: user@example.com, Phone: 555-123-4567"
        redacted = self.protector.redact_pii(text)
        self.assertNotIn('user@example.com', redacted)
        self.assertNotIn('555-123-4567', redacted)
        self.assertIn('[REDACTED]', redacted)
    
    def test_anonymize_user_data(self):
        """Test user data anonymization"""
        data = {
            'user_id': 'user123',
            'email': 'user@example.com',
            'prompt': 'test prompt'
        }
        anonymized = self.protector.anonymize_user_data(data)
        
        self.assertNotEqual(anonymized['user_id'], 'user123')
        self.assertNotEqual(anonymized['email'], 'user@example.com')
        self.assertEqual(anonymized['prompt'], 'test prompt')


class TestSecurityValidationSystem(unittest.TestCase):
    """Test complete security validation system"""
    
    def setUp(self):
        self.system = SecurityValidationSystem()
        self.system.access_control.set_user_level('user123', SecurityLevel.AUTHENTICATED)
    
    def test_validate_valid_workflow_request(self):
        """Test validation of valid workflow request"""
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            f.write(b'fake image')
            temp_path = Path(f.name)
        
        try:
            request = {
                'workflow_type': 'advanced_video',
                'prompt': 'A beautiful sunset',
                'image_path': str(temp_path)
            }
            
            is_valid, results = self.system.validate_workflow_request(request, 'user123')
            self.assertTrue(is_valid)
        finally:
            temp_path.unlink()
    
    def test_validate_workflow_request_access_denied(self):
        """Test validation with access denied"""
        request = {
            'workflow_type': 'system_configuration',
            'prompt': 'Test'
        }
        
        is_valid, results = self.system.validate_workflow_request(request, 'user123')
        self.assertFalse(is_valid)
    
    def test_validate_workflow_request_invalid_prompt(self):
        """Test validation with invalid prompt"""
        request = {
            'workflow_type': 'advanced_video',
            'prompt': '<script>alert("xss")</script>'
        }
        
        is_valid, results = self.system.validate_workflow_request(request, 'user123')
        self.assertFalse(is_valid)
    
    def test_generate_security_report(self):
        """Test security report generation"""
        # Generate some audit logs
        self.system.audit_logger.log_workflow_execution('user1', 'workflow1', True)
        self.system.audit_logger.log_workflow_execution('user2', 'workflow2', False)
        self.system.audit_logger.log_access_attempt('user3', 'resource1', False)
        
        report = self.system.get_security_report()
        
        self.assertEqual(report['total_events'], 3)
        self.assertEqual(report['unique_users'], 3)
        self.assertEqual(report['failed_access_attempts'], 1)


if __name__ == '__main__':
    unittest.main()
