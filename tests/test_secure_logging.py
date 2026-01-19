"""
Tests for secure logging system with AES encryption.

This module tests the encrypted audit logging functionality to ensure
security, integrity, and proper key management.
"""

import pytest
import json
import tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import patch

from src.secure_logging import (
    SecureAuditLogger,
    KeyStore,
    EncryptionKey,
    generate_encryption_key,
    encrypt_data,
    decrypt_data
)


class TestSecureLogging:
    """Test suite for secure logging functionality"""

    def test_generate_encryption_key(self):
        """Test key generation"""
        key = generate_encryption_key()

        assert len(key.key_id) == 16  # 8 bytes hex
        assert len(key.key_data) == 32  # AES-256
        assert len(key.salt) == 16
        assert key.is_active is True
        assert not key.is_expired()

    def test_encrypt_decrypt_data(self):
        """Test basic encryption/decryption"""
        key = generate_encryption_key()
        test_data = b"Hello, secure world!"

        encrypted = encrypt_data(test_data, key.key_data)
        decrypted = decrypt_data(encrypted, key.key_data)

        assert decrypted == test_data
        assert encrypted != test_data

    def test_keystore_operations(self):
        """Test key store functionality"""
        keystore = KeyStore()

        # Add a key
        key = generate_encryption_key()
        keystore.add_key(key)

        assert keystore.get_active_key() is not None
        assert keystore.current_key_id == key.key_id
        assert len(keystore.keys) == 1

    def test_secure_audit_logger_basic(self):
        """Test basic secure logger operations"""
        with tempfile.TemporaryDirectory() as temp_dir:
            log_dir = Path(temp_dir) / "logs"
            key_file = log_dir / "test_keys.json"

            logger = SecureAuditLogger(log_dir, key_file)

            # Log some entries
            test_entry = {
                "timestamp": datetime.now().isoformat(),
                "user_id": "test_user",
                "action": "test_action",
                "resource": "test_resource",
                "result": "success"
            }

            logger.log_entry(test_entry)

            # Read back entries
            entries = logger.read_entries(limit=10)

            assert len(entries) >= 1
            # The entry should contain our test data
            found = False
            for entry in entries:
                if entry.get("action") == "test_action":
                    found = True
                    assert entry["user_id"] == "test_user"
                    break
            assert found, "Test entry not found in logs"

    def test_secure_audit_logger_stats(self):
        """Test logger statistics"""
        with tempfile.TemporaryDirectory() as temp_dir:
            log_dir = Path(temp_dir) / "logs"

            logger = SecureAuditLogger(log_dir)

            # Log multiple entries
            for i in range(5):
                logger.log_entry({
                    "timestamp": datetime.now().isoformat(),
                    "user_id": f"user_{i}",
                    "action": "test_action",
                    "resource": f"resource_{i}",
                    "result": "success"
                })

            stats = logger.get_log_stats()
            assert stats["total_entries"] >= 5
            assert stats["total_keys"] >= 1

    def test_key_rotation(self):
        """Test automatic key rotation"""
        keystore = KeyStore(key_rotation_days=0)  # Immediate rotation

        key1 = generate_encryption_key()
        keystore.add_key(key1)

        # Force rotation (simulate time passing)
        key2 = keystore.rotate_key()

        assert keystore.current_key_id == key2.key_id
        assert key2.key_id != key1.key_id
        assert len(keystore.keys) == 2

    def test_keystore_persistence(self):
        """Test keystore save/load"""
        with tempfile.TemporaryDirectory() as temp_dir:
            key_file = Path(temp_dir) / "keystore.json"
            master_key = b"test_master_key_32_bytes_long!!"

            # Create and save keystore
            keystore1 = KeyStore()
            key = generate_encryption_key()
            keystore1.add_key(key)
            keystore1.save_to_file(key_file, master_key)

            # Load keystore
            keystore2 = KeyStore.load_from_file(key_file, master_key)

            assert keystore2.current_key_id == keystore1.current_key_id
            assert len(keystore2.keys) == len(keystore1.keys)

            # Verify key data
            loaded_key = keystore2.get_active_key()
            original_key = keystore1.get_active_key()
            assert loaded_key.key_data == original_key.key_data

    def test_corrupted_log_handling(self):
        """Test handling of corrupted log entries"""
        with tempfile.TemporaryDirectory() as temp_dir:
            log_dir = Path(temp_dir) / "logs"

            logger = SecureAuditLogger(log_dir)

            # Manually write corrupted data to log file
            with open(logger.log_file, 'w') as f:
                f.write("corrupted_data\n")
                f.write("more_corrupted_data\n")

            # Should handle gracefully
            entries = logger.read_entries(limit=10)
            assert isinstance(entries, list)
            # Should skip corrupted entries but not crash

    def test_large_log_entries(self):
        """Test handling of large log entries"""
        with tempfile.TemporaryDirectory() as temp_dir:
            log_dir = Path(temp_dir) / "logs"

            logger = SecureAuditLogger(log_dir)

            # Create large entry
            large_data = "x" * 10000
            test_entry = {
                "timestamp": datetime.now().isoformat(),
                "user_id": "test_user",
                "action": "large_test",
                "resource": "test_resource",
                "result": "success",
                "large_field": large_data
            }

            logger.log_entry(test_entry)

            # Read back
            entries = logger.read_entries(limit=10)
            found = False
            for entry in entries:
                if entry.get("action") == "large_test":
                    found = True
                    assert entry["large_field"] == large_data
                    break
            assert found

    @patch('src.secure_logging.secrets.token_bytes')
    def test_key_generation_determinism(self, mock_token_bytes):
        """Test that key generation uses proper randomness"""
        # Ensure different calls produce different keys
        mock_token_bytes.side_effect = [b'key1' + b'\x00'*27, b'salt1' + b'\x00'*11]

        key1 = generate_encryption_key()

        mock_token_bytes.side_effect = [b'key2' + b'\x00'*27, b'salt2' + b'\x00'*11]

        key2 = generate_encryption_key()

        assert key1.key_data != key2.key_data
        assert key1.salt != key2.salt
        assert key1.key_id != key2.key_id


if __name__ == "__main__":
    pytest.main([__file__])