"""
Secure Logging System with AES Encryption
Provides encrypted audit logging with secure key management for production security.

This module implements:
- AES-256-GCM encryption for log data
- Secure key derivation using PBKDF2
- Key rotation and management
- Tamper detection with HMAC

Author: StoryCore-Engine Security Team
Date: 2026-01-15
"""

import os
import json
import base64
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, BinaryIO
from dataclasses import dataclass, field

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import hmac
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature


@dataclass
class EncryptionKey:
    """Represents an encryption key with metadata"""
    key_id: str
    key_data: bytes
    salt: bytes
    created_at: datetime
    expires_at: datetime
    is_active: bool = True

    def is_expired(self) -> bool:
        """Check if key is expired"""
        return datetime.now() > self.expires_at


@dataclass
class KeyStore:
    """Secure key storage and management"""
    keys: Dict[str, EncryptionKey] = field(default_factory=dict)
    current_key_id: Optional[str] = None
    key_rotation_days: int = 30

    def add_key(self, key: EncryptionKey):
        """Add a new key to the store"""
        self.keys[key.key_id] = key
        if key.is_active and not self.current_key_id:
            self.current_key_id = key.key_id

    def get_active_key(self) -> Optional[EncryptionKey]:
        """Get the currently active key"""
        if not self.current_key_id:
            return None
        key = self.keys.get(self.current_key_id)
        if key and key.is_active and not key.is_expired():
            return key
        return None

    def rotate_key(self) -> EncryptionKey:
        """Generate and activate a new key"""
        new_key = generate_encryption_key()
        self.add_key(new_key)
        self.current_key_id = new_key.key_id
        return new_key

    def cleanup_expired_keys(self):
        """Remove expired keys (keep last 3 for decryption)"""
        expired_keys = [k for k in self.keys.values() if k.is_expired()]
        if len(expired_keys) > 3:
            for key in expired_keys[:-3]:
                del self.keys[key.key_id]

    def save_to_file(self, file_path: Path, master_key: bytes):
        """Save keystore encrypted to file"""
        data = {
            'keys': {
                kid: {
                    'key_id': k.key_id,
                    'encrypted_key': encrypt_data(k.key_data, master_key),
                    'salt': base64.b64encode(k.salt).decode(),
                    'created_at': k.created_at.isoformat(),
                    'expires_at': k.expires_at.isoformat(),
                    'is_active': k.is_active
                } for kid, k in self.keys.items()
            },
            'current_key_id': self.current_key_id,
            'key_rotation_days': self.key_rotation_days
        }
        file_path.write_text(json.dumps(data, indent=2))

    @classmethod
    def load_from_file(cls, file_path: Path, master_key: bytes) -> 'KeyStore':
        """Load keystore from encrypted file"""
        if not file_path.exists():
            return cls()

        data = json.loads(file_path.read_text())
        keystore = cls(
            current_key_id=data.get('current_key_id'),
            key_rotation_days=data.get('key_rotation_days', 30)
        )

        for kid, kdata in data.get('keys', {}).items():
            try:
                key_data = decrypt_data(kdata['encrypted_key'], master_key)
                key = EncryptionKey(
                    key_id=kdata['key_id'],
                    key_data=key_data,
                    salt=base64.b64decode(kdata['salt']),
                    created_at=datetime.fromisoformat(kdata['created_at']),
                    expires_at=datetime.fromisoformat(kdata['expires_at']),
                    is_active=kdata['is_active']
                )
                keystore.add_key(key)
            except Exception:
                # Skip corrupted keys
                continue

        return keystore


class SecureLogEncryptor:
    """Handles encryption/decryption of log data"""

    def __init__(self, keystore: KeyStore):
        self.keystore = keystore
        self.backend = default_backend()

    def encrypt_log_entry(self, data: Dict[str, Any]) -> str:
        """Encrypt a log entry"""
        key = self.keystore.get_active_key()
        if not key:
            raise ValueError("No active encryption key available")

        # Serialize data
        json_data = json.dumps(data, separators=(',', ':'))
        plaintext = json_data.encode('utf-8')

        # Generate nonce
        nonce = secrets.token_bytes(12)

        # Create cipher
        cipher = Cipher(algorithms.AES(key.key_data), modes.GCM(nonce), backend=self.backend)
        encryptor = cipher.encryptor()

        # Encrypt
        ciphertext = encryptor.update(plaintext) + encryptor.finalize()

        # Create encrypted package
        package = {
            'key_id': key.key_id,
            'nonce': base64.b64encode(nonce).decode(),
            'ciphertext': base64.b64encode(ciphertext).decode(),
            'tag': base64.b64encode(encryptor.tag).decode()
        }

        return base64.b64encode(json.dumps(package, separators=(',', ':')).encode()).decode()

    def decrypt_log_entry(self, encrypted_data: str) -> Dict[str, Any]:
        """Decrypt a log entry"""
        try:
            # Decode base64
            package_data = base64.b64decode(encrypted_data)
            package = json.loads(package_data.decode())

            # Get decryption key
            key = self.keystore.keys.get(package['key_id'])
            if not key:
                raise ValueError(f"Decryption key {package['key_id']} not found")

            # Extract components
            nonce = base64.b64decode(package['nonce'])
            ciphertext = base64.b64decode(package['ciphertext'])
            tag = base64.b64decode(package['tag'])

            # Create cipher
            cipher = Cipher(algorithms.AES(key.key_data), modes.GCM(nonce, tag), backend=self.backend)
            decryptor = cipher.decryptor()

            # Decrypt
            plaintext = decryptor.update(ciphertext) + decryptor.finalize()

            # Parse JSON
            return json.loads(plaintext.decode())

        except Exception as e:
            raise ValueError(f"Failed to decrypt log entry: {e}")


class SecureAuditLogger:
    """Encrypted audit logger with secure key management"""

    def __init__(self, log_dir: Path = None, key_file: Path = None):
        self.log_dir = log_dir or Path("logs")
        self.key_file = key_file or self.log_dir / "encryption_keys.json"
        self.log_file = self.log_dir / "security_audit.encrypted"

        # Initialize directories
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Load or create master key
        self.master_key = self._load_master_key()

        # Load or create keystore
        self.keystore = KeyStore.load_from_file(self.key_file, self.master_key)

        # Ensure we have an active key
        if not self.keystore.get_active_key():
            self.keystore.rotate_key()
            self._save_keystore()

        # Initialize encryptor
        self.encryptor = SecureLogEncryptor(self.keystore)

    def _load_master_key(self) -> bytes:
        """Load or generate master key"""
        key_file = self.log_dir / "master_key.bin"

        if key_file.exists():
            return key_file.read_bytes()
        else:
            # Generate new master key
            master_key = secrets.token_bytes(32)
            key_file.write_bytes(master_key)
            # Set restrictive permissions
            try:
                os.chmod(key_file, 0o600)
            except OSError:
                pass  # Windows may not support chmod
            return master_key

    def _save_keystore(self):
        """Save keystore to disk"""
        self.keystore.save_to_file(self.key_file, self.master_key)

    def log_entry(self, entry: Dict[str, Any]):
        """Log an encrypted entry"""
        # Check if key rotation needed
        active_key = self.keystore.get_active_key()
        if not active_key or (datetime.now() - active_key.created_at).days >= self.keystore.key_rotation_days:
            self.keystore.rotate_key()
            self._save_keystore()

        # Encrypt and write
        encrypted_data = self.encryptor.encrypt_log_entry(entry)

        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(encrypted_data + '\n')

    def read_entries(self, limit: int = 1000) -> list[Dict[str, Any]]:
        """Read and decrypt recent log entries"""
        entries = []

        if not self.log_file.exists():
            return entries

        with open(self.log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()[-limit:]  # Get last N lines

        for line in lines:
            try:
                entry = self.encryptor.decrypt_log_entry(line.strip())
                entries.append(entry)
            except ValueError:
                # Skip corrupted entries
                continue

        return entries

    def get_log_stats(self) -> Dict[str, Any]:
        """Get log statistics"""
        if not self.log_file.exists():
            return {'total_entries': 0, 'file_size_mb': 0}

        file_size = self.log_file.stat().st_size
        entries = self.read_entries(10000)  # Sample for stats

        return {
            'total_entries': len(entries),
            'file_size_mb': file_size / (1024 * 1024),
            'active_key_id': self.keystore.current_key_id,
            'total_keys': len(self.keystore.keys)
        }


def generate_encryption_key() -> EncryptionKey:
    """Generate a new encryption key"""
    key_id = secrets.token_hex(8)
    salt = secrets.token_bytes(16)
    created_at = datetime.now()
    expires_at = created_at + timedelta(days=30)

    # Derive key from random seed using PBKDF2
    seed = secrets.token_bytes(32)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    key_data = kdf.derive(seed)

    return EncryptionKey(
        key_id=key_id,
        key_data=key_data,
        salt=salt,
        created_at=created_at,
        expires_at=expires_at,
        is_active=True
    )


def encrypt_data(data: bytes, key: bytes) -> str:
    """Encrypt arbitrary data"""
    backend = default_backend()
    nonce = secrets.token_bytes(12)

    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce), backend=backend)
    encryptor = cipher.encryptor()

    ciphertext = encryptor.update(data) + encryptor.finalize()

    package = {
        'nonce': base64.b64encode(nonce).decode(),
        'ciphertext': base64.b64encode(ciphertext).decode(),
        'tag': base64.b64encode(encryptor.tag).decode()
    }

    return base64.b64encode(json.dumps(package, separators=(',', ':')).encode()).decode()


def decrypt_data(encrypted_data: str, key: bytes) -> bytes:
    """Decrypt arbitrary data"""
    backend = default_backend()

    package_data = base64.b64decode(encrypted_data)
    package = json.loads(package_data.decode())

    nonce = base64.b64decode(package['nonce'])
    ciphertext = base64.b64decode(package['ciphertext'])
    tag = base64.b64decode(package['tag'])

    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag), backend=backend)
    decryptor = cipher.decryptor()

    return decryptor.update(ciphertext) + decryptor.finalize()