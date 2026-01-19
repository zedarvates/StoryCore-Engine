"""
Tests for security enhancements: SSL pinning, download limits, and encrypted logging.

This module tests the security enhancements implemented for production deployment.
"""

import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

from src.security_validation_system import SecureModelDownloader
from src.advanced_security_validation import AuditLogger, SecurityConfig
from src.secure_logging import SecureAuditLogger


class TestSecureModelDownloader:
    """Test suite for secure model downloader enhancements"""

    def setup_method(self):
        """Setup test instance"""
        self.downloader = SecureModelDownloader()

    def test_https_only_validation(self):
        """Test that only HTTPS URLs are accepted"""
        # Valid HTTPS URL
        result = self.downloader.validate_download_url("https://huggingface.co/model.safetensors")
        assert result.is_valid
        assert result.severity.name == "INFO"

        # Invalid HTTP URL
        result = self.downloader.validate_download_url("http://huggingface.co/model.safetensors")
        assert not result.is_valid
        assert result.severity.name == "CRITICAL"
        assert "Only HTTPS protocol allowed" in result.message

    def test_domain_validation(self):
        """Test domain allowlist validation"""
        # Valid domain
        result = self.downloader.validate_download_url("https://huggingface.co/model.safetensors")
        assert result.is_valid

        # Invalid domain
        result = self.downloader.validate_download_url("https://malicious-site.com/model.safetensors")
        assert not result.is_valid
        assert "Untrusted domain" in result.message

    def test_download_size_validation(self):
        """Test download size limits"""
        # Size within limit
        result = self.downloader.validate_download_size(1024 * 1024 * 1024)  # 1GB
        assert result.is_valid

        # Size exceeding limit
        result = self.downloader.validate_download_size(60 * 1024**3)  # 60GB
        assert not result.is_valid
        assert result.severity.name == "CRITICAL"
        assert "exceeds maximum" in result.message

    def test_expected_size_validation(self):
        """Test validation against expected file size"""
        # Size within tolerance
        result = self.downloader.validate_download_size(1024 * 1024 * 100, 0.1)  # 100MB for 100MB expected
        assert result.is_valid

        # Size outside tolerance
        result = self.downloader.validate_download_size(1024 * 1024 * 200, 0.1)  # 200MB for 100MB expected
        assert not result.is_valid
        assert result.severity.name == "WARNING"
        assert "size mismatch" in result.message

    def test_ssl_context_creation(self):
        """Test SSL context creation with pinning"""
        context = self.downloader.create_ssl_context("huggingface.co")
        assert context is not None
        assert context.check_hostname is True
        assert context.verify_mode == 2  # ssl.CERT_REQUIRED

        # Test with unknown domain (no pinning)
        context = self.downloader.create_ssl_context("unknown-domain.com")
        assert context is not None


class TestAuditLoggerEncryption:
    """Test suite for encrypted audit logging"""

    def test_encrypted_audit_logger_creation(self):
        """Test encrypted audit logger initialization"""
        config = SecurityConfig(encrypt_audit_logs=True)

        # Should create encrypted logger when enabled
        logger = AuditLogger(config)

        # Check that encrypted logger is used
        assert hasattr(logger, '_is_encrypted')
        assert logger._is_encrypted is True
        assert hasattr(logger, 'secure_logger')

    def test_plain_audit_logger_creation(self):
        """Test plain text audit logger initialization"""
        config = SecurityConfig(encrypt_audit_logs=False)

        # Should create plain logger when disabled
        logger = AuditLogger(config)

        # Check that plain logger is used
        assert hasattr(logger, '_is_encrypted')
        assert logger._is_encrypted is False
        assert hasattr(logger, 'log_file')

    def test_encrypted_log_entry(self):
        """Test logging with encryption"""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = SecurityConfig(encrypt_audit_logs=True)
            logger = AuditLogger(config)

            # Mock the secure logger to avoid actual file operations
            with patch.object(logger.secure_logger, 'log_entry') as mock_log:
                logger.log_action(
                    user_id="test_user",
                    action="test_action",
                    resource="test_resource",
                    result="success"
                )

                # Verify secure logger was called
                assert mock_log.called
                call_args = mock_log.call_args[0][0]
                assert "user_id" in call_args
                assert call_args["user_id"] == "test_user"

    def test_encrypted_log_report(self):
        """Test audit report generation with encrypted logs"""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = SecurityConfig(encrypt_audit_logs=True)
            logger = AuditLogger(config)

            # Mock secure logger to return sample entries
            mock_entries = [
                {"action": "login", "result": "success"},
                {"action": "download", "result": "success"},
                {"action": "validation", "result": "failed"}
            ]

            with patch.object(logger.secure_logger, 'read_entries', return_value=mock_entries):
                report = logger.get_audit_report(hours=24)

                assert report["total_entries"] >= 3
                assert "login" in report["actions_summary"]
                assert "success" in report["results_summary"]
                assert "failed" in report["results_summary"]
                assert report["encryption_enabled"] is True


class TestSecurityIntegration:
    """Test integration of security enhancements"""

    def test_secure_download_workflow(self):
        """Test complete secure download workflow"""
        downloader = SecureModelDownloader()

        # Valid URL
        url_result = downloader.validate_download_url("https://huggingface.co/model.safetensors")
        assert url_result.is_valid

        # Valid size
        size_result = downloader.validate_download_size(1024 * 1024 * 1024, 1.0)
        assert size_result.is_valid

        # SSL context
        ssl_context = downloader.create_ssl_context("huggingface.co")
        assert ssl_context is not None

    def test_audit_log_security_levels(self):
        """Test audit logging respects security configuration"""
        config = SecurityConfig(
            encrypt_audit_logs=True,
            enable_audit_logging=True,
            anonymize_user_data=True
        )

        with patch('src.advanced_security_validation.SecureAuditLogger') as mock_secure:
            logger = AuditLogger(config)

            logger.log_action(
                user_id="sensitive_user_123",
                action="model_download",
                resource="secret_model",
                result="success"
            )

            # Verify anonymization happened
            call_args = mock_secure.return_value.log_entry.call_args[0][0]
            assert call_args["user_id"] != "sensitive_user_123"  # Should be hashed

    @patch('src.secure_logging.secrets.token_bytes')
    @patch('src.secure_logging.secrets.token_hex')
    def test_secure_logger_key_management(self, mock_token_hex, mock_token_bytes):
        """Test secure logger key management"""
        mock_token_hex.return_value = "test_key_id_1234567890ab"
        mock_token_bytes.side_effect = [
            b"master_key_32_bytes_long!!!",  # Master key
            b"key_data_32_bytes_exact!!!",     # Key data
            b"salt_16_bytes_exact!!"          # Salt
        ]

        with tempfile.TemporaryDirectory() as temp_dir:
            log_dir = Path(temp_dir) / "logs"
            logger = SecureAuditLogger(log_dir)

            # Test key generation
            assert logger.keystore.get_active_key() is not None

            # Test log stats
            stats = logger.get_log_stats()
            assert "total_entries" in stats
            assert "active_key_id" in stats

    def test_security_config_defaults(self):
        """Test security configuration defaults"""
        config = SecurityConfig()

        # Check encryption is enabled by default
        assert config.encrypt_audit_logs is True

        # Test with audit logger
        logger = AuditLogger(config)
        assert logger._is_encrypted is True


if __name__ == "__main__":
    pytest.main([__file__])