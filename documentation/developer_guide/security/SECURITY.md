# Security Documentation - StoryCore

This comprehensive security guide covers best practices, configuration, and implementation of security features in StoryCore.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Security Principles](#security-principles)
3. [Authentication & Authorization](#authentication--authorization)
4. [Data Security](#data-security)
5. [Network Security](#network-security)
6. [Application Security](#application-security)
7. [Security Enhancements](#security-enhancements)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security Best Practices](#security-best-practices)
10. [Security Testing](#security-testing)

---

## Security Overview

StoryCore integrates multiple layers of security to protect data, ensure privacy, and maintain system integrity.

### Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Network Security                     │
├─────────────────────────────────────────────────────────┤
│                  Application Security                   │
├─────────────────────────────────────────────────────────┤
│                   Data Security                        │
├─────────────────────────────────────────────────────────┤
│                   Infrastructure Security               │
└─────────────────────────────────────────────────────────┘
```

---

## Security Principles

1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimal required permissions
3. **Zero Trust**: Verify everything
4. **Security by Design**: Security built into architecture
5. **Continuous Monitoring**: Ongoing security assessment

---

## Authentication & Authorization

### Authentication Methods

#### 1. JWT (JSON Web Tokens)

StoryCore uses JWT for stateless authentication:

```python
from datetime import timedelta, datetime
import jwt

class JWTManager:
    def __init__(self, secret_key):
        self.secret_key = secret_key
        self.algorithm = "HS256"
        self.access_token_expire = timedelta(hours=1)
        self.refresh_token_expire = timedelta(days=30)
    
    def create_access_token(self, user_id):
        payload = {
            'user_id': user_id,
            'type': 'access',
            'exp': datetime.utcnow() + self.access_token_expire,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id):
        payload = {
            'user_id': user_id,
            'type': 'refresh',
            'exp': datetime.utcnow() + self.refresh_token_expire,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token):
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError()
        except jwt.InvalidTokenError:
            raise InvalidTokenError()
```

#### 2. OAuth 2.0

Support for OAuth 2.0 providers:

```python
from urllib.parse import urlencode

class OAuthProvider:
    def __init__(self, provider_name, client_id, client_secret, redirect_uri):
        self.provider_name = provider_name
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
    
    def get_authorization_url(self):
        auth_url = f"https://{self.provider_name}.com/auth/oauth/authorize"
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': 'openid profile email'
        }
        return f"{auth_url}?{urlencode(params)}"
    
    def exchange_code_for_token(self, code):
        token_url = f"https://{self.provider_name}.com/auth/oauth/token"
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri,
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }
        response = requests.post(token_url, data=data)
        return response.json()
```

#### 3. API Keys

API key management for programmatic access:

```python
import hashlib
import secrets

class APIKeyManager:
    def __init__(self, db_connection):
        self.db = db_connection
    
    def create_api_key(self, user_id, name, permissions, expires_in=None):
        key = secrets.token_urlsafe(32)
        hashed_key = self._hash_key(key)
        
        self.db.execute(
            "INSERT INTO api_keys (user_id, name, key_hash, permissions, expires_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, name, hashed_key, permissions, expires_in)
        )
        
        return key
    
    def validate_api_key(self, key):
        hashed_key = self._hash_key(key)
        
        result = self.db.execute(
            "SELECT * FROM api_keys WHERE key_hash = ? AND expires_at > NOW()",
            (hashed_key,)
        )
        
        return result[0] if result else None
    
    def revoke_api_key(self, key_id):
        self.db.execute(
            "UPDATE api_keys SET revoked_at = NOW() WHERE id = ?",
            (key_id,)
        )
    
    def _hash_key(self, key):
        return hashlib.sha256(key.encode()).hexdigest()
```

### Authorization System

#### Role-Based Access Control (RBAC)

```python
class RBACSystem:
    def __init__(self):
        self.roles = {
            'admin': ['read', 'write', 'delete', 'manage_users', 'manage_system'],
            'editor': ['read', 'write', 'delete'],
            'viewer': ['read'],
            'api_user': ['read', 'write']
        }
    
    def check_permission(self, user_role, required_permission):
        if user_role in self.roles:
            return required_permission in self.roles[user_role]
        return False
    
    def get_user_permissions(self, user_role):
        return self.roles.get(user_role, [])
    
    def add_custom_role(self, role_name, permissions):
        self.roles[role_name] = permissions
```

#### Permission Middleware

```python
class PermissionMiddleware:
    def __init__(self, rbac_system):
        self.rbac = rbac_system
    
    def require_permission(self, required_permission):
        def decorator(func):
            def wrapper(*args, **kwargs):
                user_role = kwargs.get('user_role', 'viewer')
                
                if not self.rbac.check_permission(user_role, required_permission):
                    raise PermissionError(f"Permission '{required_permission}' required")
                
                return func(*args, **kwargs)
            return wrapper
        return decorator
```

---

## Data Security

### Encryption

#### Data Encryption at Rest

```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os

class EncryptionManager:
    def __init__(self, password):
        salt = os.urandom(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = kdf.derive(password.encode())
        self.cipher = Fernet(key)
    
    def encrypt(self, data):
        return self.cipher.encrypt(data.encode())
    
    def decrypt(self, encrypted_data):
        return self.cipher.decrypt(encrypted_data).decode()
    
    def encrypt_file(self, input_path, output_path):
        with open(input_path, 'rb') as f:
            data = f.read()
        
        encrypted_data = self.cipher.encrypt(data)
        
        with open(output_path, 'wb') as f:
            f.write(encrypted_data)
    
    def decrypt_file(self, input_path, output_path):
        with open(input_path, 'rb') as f:
            encrypted_data = f.read()
        
        decrypted_data = self.cipher.decrypt(encrypted_data)
        
        with open(output_path, 'wb') as f:
            f.write(decrypted_data)
```

#### Data Encryption in Transit

```python
import ssl

class SSLConfig:
    def __init__(self, cert_file, key_file):
        self.cert_file = cert_file
        self.key_file = key_file
    
    def create_ssl_context(self):
        context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        context.load_cert_chain(self.cert_file, self.key_file)
        
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.set_ciphers('ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384')
        
        return context
```

### Data Protection

#### Data Masking

```python
import re

class DataMasker:
    def __init__(self):
        self.patterns = {
            'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            'phone': r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
            'ssn': r'\d{3}-\d{2}-\d{4}',
            'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'
        }
    
    def mask_data(self, text, mask_char='*'):
        masked_text = text
        
        for pattern_name, pattern in self.patterns.items():
            matches = re.findall(pattern, text)
            for match in matches:
                if pattern_name == 'email':
                    parts = match.split('@')
                    if len(parts) == 2:
                        username = parts[0][0] + '*' * (len(parts[0]) - 1)
                        masked_match = f"{username}@{parts[1]}"
                    else:
                        masked_match = mask_char * len(match)
                elif pattern_name == 'ssn':
                    masked_match = '***-**-' + match[-4:]
                elif pattern_name == 'credit_card':
                    digits = re.sub(r'[^\d]', '', match)
                    if len(digits) >= 4:
                        masked_match = mask_char * (len(digits) - 4) + digits[-4:]
                    else:
                        masked_match = mask_char * len(match)
                else:
                    masked_match = mask_char * len(match)
                
                masked_text = masked_text.replace(match, masked_match)
        
        return masked_text
```

#### Data Validation

```python
import re
from datetime import datetime

class DataValidator:
    def __init__(self):
        self.email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        self.password_pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    
    def validate_email(self, email):
        return bool(re.match(self.email_pattern, email))
    
    def validate_password(self, password):
        return bool(re.match(self.password_pattern, password))
    
    def validate_date(self, date_string, date_format='%Y-%m-%d'):
        try:
            datetime.strptime(date_string, date_format)
            return True
        except ValueError:
            return False
    
    def sanitize_input(self, input_text):
        sanitized = re.sub(r'[<>"\'&]', '', input_text)
        return sanitized.strip()
    
    def validate_file_type(self, filename, allowed_extensions):
        extension = filename.split('.')[-1].lower()
        return extension in allowed_extensions
```

---

## Network Security

### Firewall Configuration

#### UFW Configuration

```bash
# Basic UFW configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential services
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # StoryCore API
sudo ufw allow 8000/tcp  # ComfyUI
sudo ufw allow 5432/tcp  # PostgreSQL
sudo ufw allow 6379/tcp  # Redis

sudo ufw enable
```

#### iptables Configuration

```bash
#!/bin/bash

# Set default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow StoryCore API
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT

# Allow ComfyUI
iptables -A INPUT -p tcp --dport 8000 -j ACCEPT

# Log dropped packets
iptables -A INPUT -j LOG --log-prefix "DROP: " --log-level 7

iptables-save > /etc/iptables/rules.v4
```

### SSL/TLS Configuration

#### Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name storycore.example.com;

    ssl_certificate /etc/ssl/certs/storycore.crt;
    ssl_certificate_key /etc/ssl/private/storycore.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req zone=api burst=20 nodelay;

    location /api/ {
        proxy_pass http://storycore_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Application Security

### Input Validation

#### API Input Validation

```python
from flask import request, jsonify
from functools import wraps

def validate_json(schema):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No JSON data provided'}), 400
            
            errors = schema.validate(data)
            if errors:
                return jsonify({'error': 'Validation failed', 'details': errors}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

#### File Upload Security

```python
import os
import hashlib
from werkzeug.utils import secure_filename

class FileSecurity:
    def __init__(self, upload_folder, allowed_extensions, max_size=16*1024*1024):
        self.upload_folder = upload_folder
        self.allowed_extensions = allowed_extensions
        self.max_size = max_size
    
    def validate_file(self, file):
        # Check file size
        if file.content_length > self.max_size:
            return False, "File too large"
        
        # Check file extension
        if not self.validate_file_type(file.filename):
            return False, "File type not allowed"
        
        # Check file content
        file_content = file.read(1024)
        file.seek(0)
        
        if self.is_malicious_content(file_content):
            return False, "File contains malicious content"
        
        return True, "File valid"
    
    def validate_file_type(self, filename):
        extension = filename.split('.')[-1].lower()
        return extension in self.allowed_extensions
    
    def is_malicious_content(self, content):
        malicious_signatures = [
            b'<script', b'javascript:', b'eval(', b'exec(',
            b'system(', b'passthru(', b'shell_exec(',
            b'base64_decode(', b'file_get_contents('
        ]
        
        for signature in malicious_signatures:
            if signature in content.lower():
                return True
        
        return False
    
    def generate_file_hash(self, file_path):
        hash_sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
```

### Session Management

#### Secure Session Configuration

```python
from flask_session import Session

class SecureSession:
    def __init__(self, app):
        self.app = app
        self.configure_session()
    
    def configure_session(self):
        Session(self.app)
        
        self.app.config.update(
            SESSION_TYPE='filesystem',
            SESSION_FILE_DIR='/tmp/flask_session',
            SESSION_COOKIE_SECURE=True,
            SESSION_COOKIE_HTTPONLY=True,
            SESSION_COOKIE_SAMESITE='Lax',
            PERMANENT_SESSION_LIFETIME=1800,
            SESSION_REFRESH_EACH_REQUEST=True
        )
```

---

## Security Enhancements

### 1. AES-256 Encrypted Audit Logs

#### Description
All audit logs are now encrypted using AES-256-GCM encryption with secure key management and automatic key rotation.

#### Technical Implementation
- **Algorithm**: AES-256-GCM (Galois/Counter Mode) for authenticated encryption
- **Key Management**: PBKDF2 key derivation with automatic rotation every 30 days
- **Storage**: Encrypted keys stored separately with master key protection
- **Backwards Compatibility**: Plain text logging available as fallback

#### Configuration
```python
# In SecurityConfig
encrypt_audit_logs: bool = True  # Enable encryption (default: True)
```

#### Security Benefits
- **Confidentiality**: Logs cannot be read without encryption keys
- **Integrity**: GCM mode provides authentication and prevents tampering
- **Key Rotation**: Automatic key renewal prevents long-term compromise
- **Compliance**: Meets enterprise security standards for log protection

### 2. SSL Certificate Pinning for Model Downloads

#### Description
Model downloads now require SSL certificate pinning to trusted domains, preventing man-in-the-middle attacks.

#### Technical Implementation
- **Protocol Enforcement**: Only HTTPS URLs accepted
- **Certificate Pinning**: SHA256 fingerprint validation for trusted domains
- **Domain Allowlist**: Restricted to known AI/ML hosting services
- **Trusted Domains**:
  - huggingface.co
  - civitai.com
  - github.com
  - githubusercontent.com

#### Configuration
```python
# In SecureModelDownloader
allowed_domains = {'huggingface.co', 'civitai.com', 'github.com', 'githubusercontent.com'}
enable_ssl_pinning = True
```

#### Security Benefits
- **MITM Protection**: Certificate pinning prevents SSL interception
- **Domain Restriction**: Only trusted sources allowed
- **Protocol Security**: HTTPS-only enforcement

### 3. Download Size Limits and Validation

#### Description
Model downloads now include comprehensive size validation and limits to prevent resource exhaustion attacks.

#### Technical Implementation
- **Maximum Size Limit**: 50GB per download
- **Size Validation**: Content-Length header validation
- **Expected Size Check**: Comparison with model metadata
- **Real-time Monitoring**: Size checked during download progress

#### Configuration
```python
# In SecureModelDownloader
max_download_size_gb = 50
max_download_size_bytes = 50 * (1024**3)
```

#### Security Benefits
- **Resource Protection**: Prevents disk space exhaustion
- **Bandwidth Control**: Limits network usage from malicious downloads
- **Integrity Validation**: Ensures downloaded size matches expectations

### 4. Dependency Security Updates

#### Updated Dependencies

| Package | Previous | Updated | Security Impact |
|---------|----------|---------|----------------|
| cryptography | >=42.0.0 | >=43.0.0 | Critical security fixes |
| certifi | >=2023.7.22 | >=2024.8.30 | Updated CA certificates |
| aiohttp | >=3.8.0 | >=3.10.0 | HTTP client security fixes |
| websockets | >=11.0.0 | >=13.0.0 | WebSocket security fixes |
| Pillow | >=10.0.0 | >=10.4.0 | Image processing fixes |

---

## Monitoring & Logging

### Security Logging

```python
import logging
import json
from datetime import datetime

class SecurityLogger:
    def __init__(self, log_file='security.log'):
        self.logger = logging.getLogger('security')
        self.logger.setLevel(logging.INFO)
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)
        
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.WARNING)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
    
    def log_authentication_attempt(self, username, success, ip_address, user_agent):
        log_data = {
            'event': 'authentication_attempt',
            'username': username,
            'success': success,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if success:
            self.logger.info(f"Authentication successful: {json.dumps(log_data)}")
        else:
            self.logger.warning(f"Authentication failed: {json.dumps(log_data)}")
    
    def log_authorization_failure(self, user_id, resource, permission, ip_address):
        log_data = {
            'event': 'authorization_failure',
            'user_id': user_id,
            'resource': resource,
            'permission': permission,
            'ip_address': ip_address,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.warning(f"Authorization failure: {json.dumps(log_data)}")
```

### Intrusion Detection

```python
import time
from collections import defaultdict

class IntrusionDetection:
    def __init__(self):
        self.failed_logins = defaultdict(list)
        self.thresholds = {
            'failed_logins': 5,
            'api_requests': 100,
            'file_access': 50
        }
    
    def track_failed_login(self, username, ip_address):
        current_time = time.time()
        self.failed_logins[ip_address].append(current_time)
        
        self.failed_logins[ip_address] = [
            t for t in self.failed_logins[ip_address] 
            if current_time - t < 60
        ]
        
        if len(self.failed_logins[ip_address]) > self.thresholds['failed_logins']:
            self.trigger_alert('brute_force', {
                'ip_address': ip_address,
                'username': username,
                'attempts': len(self.failed_logins[ip_address])
            })
    
    def trigger_alert(self, alert_type, details):
        alert = {
            'type': alert_type,
            'details': details,
            'timestamp': time.time(),
            'severity': 'HIGH'
        }
        
        logger = logging.getLogger('security')
        logger.critical(f"Intrusion detection alert: {alert}")
```

---

## Security Best Practices

### 1. Regular Security Audits

```bash
#!/bin/bash

echo "=== Security Audit Report ==="
echo "Date: $(date)"
echo ""

echo "1. System Updates:"
apt list --upgradable 2>/dev/null | wc -l
echo ""

echo "2. User Accounts:"
echo "Total users: $(cat /etc/passwd | wc -l)"
echo "Root users: $(grep ':0:' /etc/passwd | wc -l)"
echo ""

echo "3. Open Ports:"
netstat -tuln | grep LISTEN | wc -l
echo ""

echo "4. Disk Space:"
df -h | grep -E '^/dev/' | awk '{print $1 ": " $5 " used"}'
echo ""
```

### 2. Security Hardening

#### System Hardening

```bash
#!/bin/bash

echo "=== System Hardening ==="

sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

sudo ufw enable

echo "System hardening completed"
```

#### Application Hardening

```python
class ApplicationHardener:
    def __init__(self, app_config):
        self.app_config = app_config
    
    def harden_django_settings(self):
        return {
            'DEBUG': False,
            'SECURE_SSL_REDIRECT': True,
            'SESSION_COOKIE_SECURE': True,
            'CSRF_COOKIE_SECURE': True,
            'SECURE_BROWSER_XSS_FILTER': True,
            'SECURE_CONTENT_TYPE_NOSNIFF': True,
            'X_FRAME_OPTIONS': 'DENY',
            'SECURE_HSTS_SECONDS': 31536000,
            'SECURE_HSTS_INCLUDE_SUBDOMAINS': True,
            'SECURE_HSTS_PRELOAD': True
        }
```

### 3. Incident Response

```python
from enum import Enum
from datetime import datetime

class IncidentSeverity(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

class IncidentResponse:
    def __init__(self):
        self.incidents = []
    
    def create_incident(self, incident_type, severity, description, affected_systems):
        incident = {
            'id': f"INC-{datetime.now().strftime('%Y%m%d')}-{len(self.incidents)}",
            'type': incident_type,
            'severity': severity,
            'description': description,
            'affected_systems': affected_systems,
            'status': 'open',
            'created_at': datetime.utcnow()
        }
        
        self.incidents.append(incident)
        return incident['id']
```

---

## Security Testing

### Penetration Testing

```python
import requests
import time

class PenetrationTester:
    def __init__(self, target_url):
        self.target_url = target_url
        self.session = requests.Session()
        self.results = []
    
    def run_security_tests(self):
        tests = [
            self.test_sql_injection,
            self.test_xss,
            self.test_csrf,
            self.test_authentication_bypass,
            self.test_directory_traversal,
            self.test_file_upload,
            self.test_rate_limiting
        ]
        
        for test in tests:
            try:
                test()
                time.sleep(1)
            except Exception as e:
                print(f"Test failed: {e}")
        
        return self.generate_report()
    
    def test_sql_injection(self):
        sql_payloads = [
            "' OR '1'='1",
            "' OR 1=1--",
            "' UNION SELECT NULL--"
        ]
        
        for payload in sql_payloads:
            try:
                response = self.session.post(
                    f"{self.target_url}/api/login",
                    data={"username": payload, "password": "test"}
                )
                
                if "error" in response.text.lower():
                    self.log_vulnerability("SQL Injection", payload)
                    return True
            except Exception:
                pass
        
        return False
    
    def test_xss(self):
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>"
        ]
        
        for payload in xss_payloads:
            try:
                response = self.session.post(
                    f"{self.target_url}/api/submit",
                    data={"content": payload}
                )
                
                if payload in response.text:
                    self.log_vulnerability("XSS", payload)
                    return True
            except Exception:
                pass
        
        return False
    
    def log_vulnerability(self, vulnerability_type, payload):
        self.results.append({
            'type': vulnerability_type,
            'payload': payload,
            'timestamp': datetime.now().isoformat()
        })
        print(f"VULNERABILITY FOUND: {vulnerability_type}")
    
    def generate_report(self):
        return {
            'test_date': datetime.now().isoformat(),
            'target_url': self.target_url,
            'vulnerabilities': self.results
        }
```

---

## Risk Assessment

### Threat Mitigation

| Threat | Mitigation | Effectiveness |
|--------|------------|---------------|
| Log tampering | AES-GCM encryption | High |
| MITM attacks | SSL pinning | High |
| Resource exhaustion | Size limits | High |
| Malicious downloads | Domain restrictions | Medium |
| Dependency exploits | Updated versions | High |

### Performance Impact

- **Encryption**: ~2-5% overhead for log operations
- **SSL Pinning**: Minimal impact on download speed
- **Size Validation**: Negligible performance cost

---

## Compliance and Standards

### Security Standards Met

- **Data Protection**: Encrypted sensitive log data
- **Network Security**: HTTPS-only with certificate pinning
- **Access Control**: Restricted download sources
- **Audit Requirements**: Tamper-proof audit trails

### Recommendations

1. **Regular Updates**: Keep dependencies updated
2. **Key Backup**: Maintain secure key backups
3. **Monitoring**: Implement security event monitoring
4. **Testing**: Run security tests before deployment

---

## Maintenance Guide

### Key Rotation

Keys rotate automatically every 30 days. Manual rotation:

```python
# Force key rotation
keystore.rotate_key()
keystore.save_to_file(key_file, master_key)
```

### Certificate Updates

When trusted domain certificates change:
1. Update fingerprints in `SecureModelDownloader._load_pinned_certificates()`
2. Test downloads to affected domains
3. Deploy updated version

---

## Support

For security-related questions or concerns:

- **GitHub Issues**: Report security vulnerabilities
- **Email**: [security@storycore.io](mailto:security@storycore.io)

---

*For more information on deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).*

*Last Updated: January 2026*

