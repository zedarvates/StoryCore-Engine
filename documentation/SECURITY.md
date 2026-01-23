# Security Documentation - StoryCore

This comprehensive security guide covers best practices, configuration, and implementation of security features in StoryCore.

## Security Overview

StoryCore integrates multiple layers of security to protect data, ensure privacy, and maintain system integrity.

### Security Principles

1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimal required permissions
3. **Zero Trust**: Verify everything
4. **Security by Design**: Security built into architecture
5. **Continuous Monitoring**: Ongoing security assessment

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

## Authentication & Authorization

### Authentication Methods

#### 1. JWT (JSON Web Tokens)

StoryCore uses JWT for stateless authentication:

```python
# jwt_manager.py
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
# oauth_provider.py
class OAuthProvider:
    def __init__(self, provider_name, client_id, client_secret, redirect_uri):
        self.provider_name = provider_name
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
    
    def get_authorization_url(self):
        auth_url = f"{self.get_base_url()}/auth/oauth/authorize"
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': 'openid profile email'
        }
        return f"{auth_url}?{urlencode(params)}"
    
    def exchange_code_for_token(self, code):
        token_url = f"{self.get_base_url()}/auth/oauth/token"
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
# api_key_manager.py
class APIKeyManager:
    def __init__(self, db_connection):
        self.db = db_connection
    
    def create_api_key(self, user_id, name, permissions, expires_in=None):
        import secrets
        
        key = secrets.token_urlsafe(32)
        hashed_key = self._hash_key(key)
        
        # Store in database
        self.db.execute(
            "INSERT INTO api_keys (user_id, name, key_hash, permissions, expires_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, name, hashed_key, permissions, expires_in)
        )
        
        return key
    
    def validate_api_key(self, key):
        hashed_key = self._hash_key(key)
        
        # Query database
        result = self.db.execute(
            "SELECT * FROM api_keys WHERE key_hash = ? AND expires_at > NOW()",
            (hashed_key,)
        )
        
        if not result:
            return None
        
        return result[0]
    
    def revoke_api_key(self, key_id):
        self.db.execute(
            "UPDATE api_keys SET revoked_at = NOW() WHERE id = ?",
            (key_id,)
        )
    
    def _hash_key(self, key):
        import hashlib
        
        return hashlib.sha256(key.encode()).hexdigest()
```

### Authorization System

#### Role-Based Access Control (RBAC)

```python
# rbac_system.py
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
# permission_middleware.py
class PermissionMiddleware:
    def __init__(self, rbac_system):
        self.rbac = rbac_system
    
    def require_permission(self, required_permission):
        def decorator(func):
            def wrapper(*args, **kwargs):
                # Get user role from request
                user_role = kwargs.get('user_role', 'viewer')
                
                if not self.rbac.check_permission(user_role, required_permission):
                    raise PermissionError(f"Permission '{required_permission}' required")
                
                return func(*args, **kwargs)
            return wrapper
        return decorator
```

## Data Security

### Encryption

#### Data Encryption at Rest

```python
# encryption_manager.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os

class EncryptionManager:
    def __init__(self, password):
        # Generate key from password
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
# ssl_config.py
import ssl

class SSLConfig:
    def __init__(self, cert_file, key_file):
        self.cert_file = cert_file
        self.key_file = key_file
    
    def create_ssl_context(self):
        context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        context.load_cert_chain(self.cert_file, self.key_file)
        
        # Security settings
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.set_ciphers('ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384')
        
        return context
    
    def configure_server(self, server):
        ssl_context = self.create_ssl_context()
        server.ssl_context = ssl_context
        server.ssl_certfile = self.cert_file
        server.ssl_keyfile = self.key_file
```

### Data Protection

#### Data Masking

```python
# data_masking.py
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
                    # Keep first letter and domain
                    parts = match.split('@')
                    if len(parts) == 2:
                        username = parts[0][0] + '*' * (len(parts[0]) - 1)
                        domain = parts[1]
                        masked_match = f"{username}@{domain}"
                    else:
                        masked_match = mask_char * len(match)
                elif pattern_name == 'phone':
                    # Keep area code
                    if len(match) >= 10:
                        masked_match = match[:3] + mask_char * (len(match) - 3)
                    else:
                        masked_match = mask_char * len(match)
                elif pattern_name == 'ssn':
                    masked_match = '***-**-' + match[-4:]
                elif pattern_name == 'credit_card':
                    # Keep last 4 digits
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
# data_validation.py
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
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>"\'&]', '', input_text)
        return sanitized.strip()
    
    def validate_file_type(self, filename, allowed_extensions):
        extension = filename.split('.')[-1].lower()
        return extension in allowed_extensions
```

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

# Enable firewall
sudo ufw enable
```

#### iptables Configuration

```bash
# iptables configuration
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

# Allow PostgreSQL (only from specific IPs)
iptables -A INPUT -p tcp -s 192.168.1.0/24 --dport 5432 -j ACCEPT

# Allow Redis (only from specific IPs)
iptables -A INPUT -p tcp -s 192.168.1.0/24 --dport 6379 -j ACCEPT

# Log dropped packets
iptables -A INPUT -j LOG --log-prefix "DROP: " --log-level 7

# Save rules
iptables-save > /etc/iptables/rules.v4
```

### Network Segmentation

#### Docker Network Configuration

```yaml
# docker-compose-security.yml
version: '3.8'
services:
  storycore:
    image: storycore:latest
    networks:
      - storycore-internal
      - storycore-external
    environment:
      - DATABASE_HOST=postgres
      - REDIS_HOST=redis
    volumes:
      - ./config:/app/config:ro
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    networks:
      - storycore-internal
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    networks:
      - storycore-internal
    volumes:
      - redis_data:/data

networks:
  storycore-internal:
    internal: true
  storycore-external:
    driver: bridge
```

### SSL/TLS Configuration

#### Nginx SSL Configuration

```nginx
# nginx-ssl.conf
server {
    listen 443 ssl http2;
    server_name storycore.example.com;

    # SSL Configuration
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
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
```

## Application Security

### Input Validation

#### API Input Validation

```python
# api_validation.py
from flask import request, jsonify
from functools import wraps

def validate_json(schema):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No JSON data provided'}), 400
            
            # Validate against schema
            errors = schema.validate(data)
            if errors:
                return jsonify({'error': 'Validation failed', 'details': errors}), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Example schema
from pydantic import BaseModel, EmailStr, constr

class UserCreateSchema(BaseModel):
    email: EmailStr
    password: constr(min_length=8, regex=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$')
    name: constr(min_length=2, max_length=50)
    role: constr(regex=r'^(admin|editor|viewer)$')

# Usage
@app.route('/api/users', methods=['POST'])
@validate_json(UserCreateSchema)
def create_user():
    data = request.get_json()
    # Process user creation
    return jsonify({'message': 'User created successfully'})
```

#### File Upload Security

```python
# file_security.py
import os
import hashlib
from werkzeug.utils import secure_filename

class FileSecurity:
    def __init__(self, upload_folder, allowed_extensions, max_size=16*1024*1024):
        self.upload_folder = upload_folder
        self.allowed_extensions = allowed_extensions
        self.max_size = max_size
    
    def secure_filename(self, filename):
        return secure_filename(filename)
    
    def validate_file(self, file):
        # Check file size
        if file.content_length > self.max_size:
            return False, "File too large"
        
        # Check file extension
        if not self.validate_file_type(file.filename):
            return False, "File type not allowed"
        
        # Check file content (basic magic number check)
        file_content = file.read(1024)  # Read first 1KB
        file.seek(0)  # Reset file pointer
        
        if self.is_malicious_content(file_content):
            return False, "File contains malicious content"
        
        return True, "File valid"
    
    def validate_file_type(self, filename):
        extension = filename.split('.')[-1].lower()
        return extension in self.allowed_extensions
    
    def is_malicious_content(self, content):
        # Basic signature checking
        malicious_signatures = [
            b'<script', b'javascript:', b'eval(', b'exec(',
            b'system(', b'passthru(', b'shell_exec(',
            b'base64_decode(', b'file_get_contents(',
            b'fopen(', b'fwrite(', b'fputs('
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
# session_config.py
from flask_session import Session

class SecureSession:
    def __init__(self, app):
        self.app = app
        self.configure_session()
    
    def configure_session(self):
        Session(self.app)
        
        # Session configuration
        self.app.config.update(
            SESSION_TYPE='filesystem',
            SESSION_FILE_DIR='/tmp/flask_session',
            SESSION_FILE_THRESHOLD=500,
            SESSION_FILE_MODE=0o600,
            SESSION_COOKIE_SECURE=True,
            SESSION_COOKIE_HTTPONLY=True,
            SESSION_COOKIE_SAMESITE='Lax',
            PERMANENT_SESSION_LIFETIME=1800,  # 30 minutes
            SESSION_REFRESH_EACH_REQUEST=True
        )
    
    def create_session(self, user_id):
        from flask import session
        session['user_id'] = user_id
        session['ip_address'] = request.remote_addr
        session['user_agent'] = request.headers.get('User-Agent')
    
    def validate_session(self):
        from flask import session
        current_ip = request.remote_addr
        current_user_agent = request.headers.get('User-Agent')
        
        if 'user_id' not in session:
            return False
        
        if session.get('ip_address') != current_ip:
            return False
        
        if session.get('user_agent') != current_user_agent:
            return False
        
        return True
    
    def destroy_session(self):
        from flask import session
        session.clear()
```

## Monitoring & Logging

### Security Logging

```python
# security_logger.py
import logging
import json
from datetime import datetime

class SecurityLogger:
    def __init__(self, log_file='security.log'):
        self.logger = logging.getLogger('security')
        self.logger.setLevel(logging.INFO)
        
        # File handler
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.WARNING)
        
        # Formatter
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
    
    def log_security_event(self, event_type, details, severity='INFO'):
        log_data = {
            'event': event_type,
            'details': details,
            'severity': severity,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if severity == 'CRITICAL':
            self.logger.critical(f"Security event: {json.dumps(log_data)}")
        elif severity == 'ERROR':
            self.logger.error(f"Security event: {json.dumps(log_data)}")
        else:
            self.logger.info(f"Security event: {json.dumps(log_data)}")
```

### Intrusion Detection

```python
# intrusion_detection.py
import time
from collections import defaultdict

class IntrusionDetection:
    def __init__(self):
        self.failed_logins = defaultdict(list)
        self.suspicious_activities = []
        self.thresholds = {
            'failed_logins': 5,  # Max failed logins per minute
            'api_requests': 100,  # Max API requests per minute
            'file_access': 50    # Max file accesses per minute
        }
    
    def track_failed_login(self, username, ip_address):
        current_time = time.time()
        self.failed_logins[ip_address].append(current_time)
        
        # Remove old entries (older than 1 minute)
        self.failed_logins[ip_address] = [
            t for t in self.failed_logins[ip_address] 
            if current_time - t < 60
        ]
        
        # Check threshold
        if len(self.failed_logins[ip_address]) > self.thresholds['failed_logins']:
            self.trigger_alert('brute_force', {
                'ip_address': ip_address,
                'username': username,
                'attempts': len(self.failed_logins[ip_address])
            })
    
    def track_api_requests(self, ip_address, endpoint):
        current_time = time.time()
        
        # Track requests per endpoint
        key = f"{ip_address}:{endpoint}"
        if not hasattr(self, 'api_requests'):
            self.api_requests = defaultdict(list)
        
        self.api_requests[key].append(current_time)
        
        # Remove old entries
        self.api_requests[key] = [
            t for t in self.api_requests[key] 
            if current_time - t < 60
        ]
        
        # Check threshold
        if len(self.api_requests[key]) > self.thresholds['api_requests']:
            self.trigger_alert('api_flood', {
                'ip_address': ip_address,
                'endpoint': endpoint,
                'requests': len(self.api_requests[key])
            })
    
    def track_file_access(self, user_id, file_path, action):
        current_time = time.time()
        
        # Track file access
        if not hasattr(self, 'file_access'):
            self.file_access = defaultdict(list)
        
        key = f"{user_id}:{file_path}"
        self.file_access[key].append((current_time, action))
        
        # Remove old entries
        self.file_access[key] = [
            (t, a) for t, a in self.file_access[key] 
            if current_time - t < 60
        ]
        
        # Check threshold
        if len(self.file_access[key]) > self.thresholds['file_access']:
            self.trigger_alert('suspicious_file_access', {
                'user_id': user_id,
                'file_path': file_path,
                'actions': len(self.file_access[key])
            })
    
    def trigger_alert(self, alert_type, details):
        alert = {
            'type': alert_type,
            'details': details,
            'timestamp': time.time(),
            'severity': 'HIGH'
        }
        
        self.suspicious_activities.append(alert)
        
        # Log the alert
        logger = logging.getLogger('security')
        logger.critical(f"Intrusion detection alert: {alert}")
        
        # Could trigger additional actions like:
        # - IP blocking
        # - User suspension
        # - Email notification
        # - System lockdown
```

## Security Best Practices

### 1. Regular Security Audits

```bash
# Security audit script
#!/bin/bash

echo "=== Security Audit Report ==="
echo "Date: $(date)"
echo ""

# Check system updates
echo "1. System Updates:"
apt list --upgradable 2>/dev/null | wc -l
echo ""

# Check user accounts
echo "2. User Accounts:"
echo "Total users: $(cat /etc/passwd | wc -l)"
echo "Root users: $(grep ':0:' /etc/passwd | wc -l)"
echo "Passwordless users: $(sudo grep -n ':\$' /etc/shadow | wc -l)"
echo ""

# Check open ports
echo "3. Open Ports:"
netstat -tuln | grep LISTEN | wc -l
netstat -tuln | grep LISTEN
echo ""

# Check disk space
echo "4. Disk Space:"
df -h | grep -E '^/dev/' | awk '{print $1 ": " $5 " used"}'
echo ""

# Check log files
echo "5. Log Files:"
find /var/log -name "*.log" -size +10M -exec ls -lh {} \;
echo ""
```

### 2. Security Hardening

#### System Hardening

```bash
# System hardening script
#!/bin/bash

echo "=== System Hardening ==="

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Disable password authentication (use SSH keys)
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Set SSH port to non-standard
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# Configure fail2ban
sudo tee -a /etc/fail2ban/jail.local > /dev/null <<EOL
[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 1h
EOL

# Configure automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# Enable firewall
sudo ufw enable

echo "System hardening completed"
```

#### Application Hardening

```python
# application_hardening.py
import subprocess
import os

class ApplicationHardener:
    def __init__(self, app_config):
        self.app_config = app_config
    
    def harden_django_settings(self):
        """Harden Django application settings"""
        settings = {
            'DEBUG': False,
            'SECRET_KEY': self.generate_secret_key(),
            'ALLOWED_HOSTS': ['example.com', 'www.example.com'],
            'SECURE_SSL_REDIRECT': True,
            'SESSION_COOKIE_SECURE': True,
            'CSRF_COOKIE_SECURE': True,
            'SECURE_BROWSER_XSS_FILTER': True,
            'SECURE_CONTENT_TYPE_NOSNIFF': True,
            'X_FRAME_OPTIONS': 'DENY',
            'SECURE_HSTS_SECONDS': 31536000,
            'SECURE_HSTS_INCLUDE_SUBDOMAINS': True,
            'SECURE_HSTS_PRELOAD': True,
            'SECURE_PROXY_SSL_HEADER': ('HTTP_X_FORWARDED_PROTO', 'https'),
            'SECURE_REFERRER_POLICY': 'strict-origin-when-cross-origin'
        }
        
        return settings
    
    def harden_nodejs_settings(self):
        """Harden Node.js application settings"""
        settings = {
            'NODE_ENV': 'production',
            'PORT': 3000,
            'HOST': '0.0.0.0',
            'TRUST_PROXY': True,
            'HEALTH_CHECK_PATH': '/health',
            'RATE_LIMIT_WINDOW_MS': 900000,  # 15 minutes
            'RATE_LIMIT_MAX': 100  # requests per window
        }
        
        return settings
    
    def generate_secret_key(self):
        """Generate a secure secret key"""
        import secrets
        return secrets.token_urlsafe(32)
    
    def configure_cors(self):
        """Configure CORS settings"""
        cors_settings = {
            'ALLOWED_ORIGINS': [
                'https://example.com',
                'https://www.example.com'
            ],
            'ALLOWED_METHODS': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'ALLOWED_HEADERS': ['Content-Type', 'Authorization'],
            'ALLOW_CREDENTIALS': True,
            'MAX_AGE': 3600
        }
        
        return cors_settings
    
    def configure_logging(self):
        """Configure secure logging"""
        logging_settings = {
            'LOG_LEVEL': 'INFO',
            'LOG_FILE': '/var/log/storycore/application.log',
            'LOG_FORMAT': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            'LOG_MAX_SIZE': '10MB',
            'LOG_BACKUP_COUNT': 5,
            'LOG_SECURE': True  # Ensure log files are not world-readable
        }
        
        return logging_settings
```

### 3. Incident Response

#### Incident Response Plan

```python
# incident_response.py
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
        self.response_plan = {
            IncidentSeverity.LOW: self.handle_low_severity,
            IncidentSeverity.MEDIUM: self.handle_medium_severity,
            IncidentSeverity.HIGH: self.handle_high_severity,
            IncidentSeverity.CRITICAL: self.handle_critical_severity
        }
    
    def create_incident(self, incident_type, severity, description, affected_systems):
        incident = {
            'id': self.generate_incident_id(),
            'type': incident_type,
            'severity': severity,
            'description': description,
            'affected_systems': affected_systems,
            'status': 'open',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'assigned_to': None,
            'resolution': None
        }
        
        self.incidents.append(incident)
        self.notify_team(incident)
        
        return incident['id']
    
    def handle_incident(self, incident_id):
        incident = self.get_incident(incident_id)
        if not incident:
            return False
        
        response_handler = self.response_plan[incident['severity']]
        response_handler(incident)
        
        return True
    
    def handle_low_severity(self, incident):
        """Handle low severity incidents"""
        print(f"Handling low severity incident: {incident['id']}")
        # Log the incident
        self.log_incident(incident)
        
        # Basic investigation
        self.investigate_incident(incident)
        
        # Resolution
        incident['status'] = 'resolved'
        incident['resolution'] = 'Low severity incident resolved'
        incident['updated_at'] = datetime.utcnow()
    
    def handle_medium_severity(self, incident):
        """Handle medium severity incidents"""
        print(f"Handling medium severity incident: {incident['id']}")
        
        # Escalate to security team
        self.escalate_incident(incident, 'security_team')
        
        # Contain the incident
        self.contain_incident(incident)
        
        # Investigate
        self.investigate_incident(incident)
        
        # Resolve
        incident['status'] = 'resolved'
        incident['resolution'] = 'Medium severity incident resolved'
        incident['updated_at'] = datetime.utcnow()
    
    def handle_high_severity(self, incident):
        """Handle high severity incidents"""
        print(f"Handling high severity incident: {incident['id']}")
        
        # Escalate to security team and management
        self.escalate_incident(incident, 'security_team')
        self.escalate_incident(incident, 'management')
        
        # Immediate containment
        self.immediate_containment(incident)
        
        # Full investigation
        self.full_investigation(incident)
        
        # Resolve with documentation
        incident['status'] = 'resolved'
        incident['resolution'] = 'High severity incident resolved with post-mortem'
        incident['updated_at'] = datetime.utcnow()
        
        # Schedule review
        self.schedule_review(incident)
    
    def handle_critical_severity(self, incident):
        """Handle critical severity incidents"""
        print(f"Handling critical severity incident: {incident['id']}")
        
        # Full escalation
        self.escalate_incident(incident, 'security_team')
        self.escalate_incident(incident, 'management')
        self.escalate_incident(incident, 'executive')
        
        # Emergency response
        self.emergency_response(incident)
        
        # Full investigation with external support if needed
        self.full_investigation(incident, external_support=True)
        
        # Resolution with comprehensive documentation
        incident['status'] = 'resolved'
        incident['resolution'] = 'Critical severity incident resolved with comprehensive post-mortem'
        incident['updated_at'] = datetime.utcnow()
        
        # Mandatory review
        self.mandatory_review(incident)
    
    def generate_incident_id(self):
        """Generate unique incident ID"""
        import uuid
        return f"INC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    def get_incident(self, incident_id):
        """Get incident by ID"""
        for incident in self.incidents:
            if incident['id'] == incident_id:
                return incident
        return None
    
    def log_incident(self, incident):
        """Log incident to security logs"""
        logger = logging.getLogger('security')
        logger.info(f"Incident logged: {incident}")
    
    def notify_team(self, incident):
        """Notify response team"""
        # Implementation for team notification
        print(f"Notifying team about incident: {incident['id']}")
    
    def escalate_incident(self, incident, team):
        """Escalate incident to specific team"""
        print(f"Escalating incident {incident['id']} to {team}")
    
    def contain_incident(self, incident):
        """Contain the incident"""
        print(f"Containing incident: {incident['id']}")
    
    def immediate_containment(self, incident):
        """Immediate containment for high severity incidents"""
        print(f"Immediate containment for incident: {incident['id']}")
    
    def investigate_incident(self, incident):
        """Investigate the incident"""
        print(f"Investigating incident: {incident['id']}")
    
    def full_investigation(self, incident, external_support=False):
        """Full investigation with optional external support"""
        print(f"Full investigation for incident: {incident['id']}")
        if external_support:
            print("Engaging external security support")
    
    def emergency_response(self, incident):
        """Emergency response for critical incidents"""
        print(f"Emergency response for incident: {incident['id']}")
    
    def schedule_review(self, incident):
        """Schedule incident review"""
        print(f"Scheduling review for incident: {incident['id']}")
    
    def mandatory_review(self, incident):
        """Mandatory review for critical incidents"""
        print(f"Mandatory review for incident: {incident['id']}")
```

## Security Testing

### Penetration Testing

```python
# penetration_testing.py
import requests
import subprocess
import time
from datetime import datetime

class PenetrationTester:
    def __init__(self, target_url):
        self.target_url = target_url
        self.session = requests.Session()
        self.results = []
    
    def run_security_tests(self):
        """Run comprehensive security tests"""
        print("Starting penetration testing...")
        
        tests = [
            self.test_sql_injection,
            self.test_xss,
            self.test_csrf,
            self.test_authentication_bypass,
            self.test_directory_traversal,
            self.test_file_upload,
            self.test_rate_limiting,
            self.test_information_disclosure
        ]
        
        for test in tests:
            try:
                test()
                time.sleep(1)  # Rate limiting
            except Exception as e:
                print(f"Test {test.__name__} failed: {e}")
        
        return self.generate_report()
    
    def test_sql_injection(self):
        """Test for SQL injection vulnerabilities"""
        print("Testing SQL injection...")
        
        sql_payloads = [
            "' OR '1'='1",
            "' OR 1=1--",
            "' UNION SELECT NULL--",
            "'; DROP TABLE users--"
        ]
        
        for payload in sql_payloads:
            try:
                response = self.session.post(
                    f"{self.target_url}/api/login",
                    data={"username": payload, "password": "test"}
                )
                
                if "error" in response.text.lower() or "sql" in response.text.lower():
                    self.log_vulnerability("SQL Injection", payload, response)
                    return True
            except Exception as e:
                print(f"SQL injection test error: {e}")
        
        return False
    
    def test_xss(self):
        """Test for XSS vulnerabilities"""
        print("Testing XSS...")
        
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg onload=alert('XSS')>"
        ]
        
        for payload in xss_payloads:
            try:
                response = self.session.post(
                    f"{self.target_url}/api/submit",
                    data={"content": payload}
                )
                
                if payload in response.text:
                    self.log_vulnerability("XSS", payload, response)
                    return True
            except Exception as e:
                print(f"XSS test error: {e}")
        
        return False
    
    def test_csrf(self):
        """Test for CSRF vulnerabilities"""
        print("Testing CSRF...")
        
        try:
            # Get CSRF token if available
            response = self.session.get(f"{self.target_url}/api/csrf-token")
            csrf_token = response.json().get('csrf_token')
            
            # Test without CSRF token
            response = self.session.post(
                f"{self.target_url}/api/submit",
                data={"action": "delete", "id": "123"}
            )
            
            if response.status_code == 200:
                self.log_vulnerability("CSRF", "Missing CSRF protection", response)
                return True
            
        except Exception as e:
            print(f"CSRF test error: {e}")
        
        return False
    
    def test_authentication_bypass(self):
        """Test for authentication bypass"""
        print("Testing authentication bypass...")
        
        bypass_payloads = [
            {"username": "admin'--", "password": "anything"},
            {"username": "admin' OR '1'='1", "password": "anything"},
            {"username": "admin'/*", "password": "*/admin'--"},
            {"username": "admin", "password": "password' OR '1'='1"}
        ]
        
        for payload in bypass_payloads:
            try:
                response = self.session.post(
                    f"{self.target_url}/api/login",
                    data=payload
                )
                
                if "success" in response.text.lower() or "token" in response.text.lower():
                    self.log_vulnerability("Authentication Bypass", str(payload), response)
                    return True
            except Exception as e:
                print(f"Authentication bypass test error: {e}")
        
        return False
    
    def test_directory_traversal(self):
        """Test for directory traversal vulnerabilities"""
        print("Testing directory traversal...")
        
        traversal_payloads = [
            "../../../etc/passwd",
            "..%2f..%2f..%2fetc%2fpasswd",
            "..%2f..%2f..%2f..%2fetc%2fpasswd",
            "....//....//....//etc//passwd",
            "....\\\\....\\\\....\\\\etc\\\\passwd"
        ]
        
        for payload in traversal_payloads:
            try:
                response = self.session.get(
                    f"{self.target_url}/api/file?path={payload}"
                )
                
                if "root:" in response.text or "daemon:" in response.text:
                    self.log_vulnerability("Directory Traversal", payload, response)
                    return True
            except Exception as e:
                print(f"Directory traversal test error: {e}")
        
        return False
    
    def test_file_upload(self):
        """Test for file upload vulnerabilities"""
        print("Testing file upload...")
        
        malicious_files = [
            ("test.php", "<?php system($_GET['cmd']); ?>"),
            ("test.jsp", "<%@ page import=\"java.io.*\" %> <% out.println(new java.io.File(request.getParameter(\"cmd\")).exec()); %>"),
            ("test.aspx", "<%@ Page Language=\"C#\" %> <% System.Diagnostics.Process.Start(Request[\"cmd\"]); %>"),
            ("test.html", "<script>alert('XSS')</script>")
        ]
        
        for filename, content in malicious_files:
            try:
                files = {'file': (filename, content, 'text/plain')}
                response = self.session.post(
                    f"{self.target_url}/api/upload",
                    files=files
                )
                
                if response.status_code == 200:
                    # Check if file was uploaded and accessible
                    response = self.session.get(f"{self.target_url}/uploads/{filename}")
                    if response.status_code == 200:
                        self.log_vulnerability("Insecure File Upload", filename, response)
                        return True
            except Exception as e:
                print(f"File upload test error: {e}")
        
        return False
    
    def test_rate_limiting(self):
        """Test for rate limiting"""
        print("Testing rate limiting...")
        
        requests_made = 0
        start_time = time.time()
        
        while time.time() - start_time < 60:  # Test for 1 minute
            try:
                response = self.session.get(f"{self.target_url}/api/public")
                requests_made += 1
                
                if response.status_code == 429:  # Too Many Requests
                    self.log_vulnerability("Missing Rate Limiting", f"Made {requests_made} requests", response)
                    return True
                    
            except Exception as e:
                print(f"Rate limiting test error: {e}")
                break
        
        print(f"Rate limiting test: Made {requests_made} requests in 1 minute")
        return False
    
    def test_information_disclosure(self):
        """Test for information disclosure"""
        print("Testing information disclosure...")
        
        sensitive_paths = [
            "/api/config",
            "/api/debug",
            "/api/internal",
            "/.env",
            "/config.php",
            "/web.config",
            "/.git/config",
            "/README.md"
        ]
        
        for path in sensitive_paths:
            try:
                response = self.session.get(f"{self.target_url}{path}")
                
                if response.status_code == 200:
                    content = response.text.lower()
                    sensitive_keywords = [
                        "password", "secret", "key", "token", "api_key",
                        "database", "connection", "config", "settings"
                    ]
                    
                    if any(keyword in content for keyword in sensitive_keywords):
                        self.log_vulnerability("Information Disclosure", path, response)
                        return True
            except Exception as e:
                print(f"Information disclosure test error: {e}")
        
        return False
    
    def log_vulnerability(self, vulnerability_type, payload, response):
        """Log found vulnerability"""
        vulnerability = {
            'type': vulnerability_type,
            'payload': payload,
            'url': response.url,
            'status_code': response.status_code,
            'response_length': len(response.text),
            'timestamp': datetime.now().isoformat()
        }
        
        self.results.append(vulnerability)
        print(f"VULNERABILITY FOUND: {vulnerability_type}")
        print(f"URL: {vulnerability['url']}")
        print(f"Status: {vulnerability['status_code']}")
        print(f"Payload: {vulnerability['payload']}")
        print("-" * 50)
    
    def generate_report(self):
        """Generate penetration testing report"""
        report = {
            'test_date': datetime.now().isoformat(),
            'target_url': self.target_url,
            'total_tests': len(self.results),
            'vulnerabilities': self.results,
            'summary': {
                'critical': len([r for r in self.results if r['type'] in ['SQL Injection', 'Authentication Bypass']]),
                'high': len([r for r in self.results if r['type'] in ['XSS', 'CSRF', 'Directory Traversal']]),
                'medium': len([r for r in self.results if r['type'] in ['File Upload', 'Information Disclosure']]),
                'low': len([r for r in self.results if r['type'] == 'Missing Rate Limiting'])
            }
        }
        
        return report
```

---

*For more information on deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).*