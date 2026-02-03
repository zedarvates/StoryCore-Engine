# Getting Started - StoryCore

This comprehensive guide will help you configure and migrate to StoryCore, covering installation, configuration, and advanced setup options.

## Installation Overview

StoryCore can be installed in several ways depending on your needs:

### Supported Installation Methods

- **Local Development** - For developers and testing
- **Docker** - For containerized deployment
- **Binary Installation** - For quick setup on Windows, macOS, and Linux
- **Source Installation** - For custom builds and development

## System Requirements

### Minimum Requirements
- **CPU**: 4 cores, 2.5GHz+
- **RAM**: 8GB
- **Storage**: 20GB free space
- **GPU**: Optional but recommended for AI processing
- **OS**: Windows 10/11, macOS 10.14+, Ubuntu 18.04+

### Recommended Requirements
- **CPU**: 8 cores, 3.0GHz+
- **RAM**: 32GB
- **Storage**: 100GB SSD
- **GPU**: NVIDIA GPU with 8GB VRAM
- **OS**: Windows 11, macOS 12+, Ubuntu 20.04+

## Installation Methods

### 1. Local Development Installation

#### Prerequisites
```bash
# Install system dependencies
# Ubuntu/Debian
sudo apt update
sudo apt install python3.9 python3.9-venv python3-pip git nodejs npm

# macOS
brew install python@3.9 nodejs npm git

# Windows (using Chocolatey)
choco install python nodejs git
```

#### Installation Steps
```bash
# Clone the repository
git clone https://github.com/storycore/storycore.git
cd storycore

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install

# Copy environment configuration
cp .env.example .env
nano .env  # Edit your configuration
```

#### Configuration
```bash
# Set up environment variables
export DEBUG=True
export SECRET_KEY=your-secret-key-here
export DATABASE_URL=sqlite:///storycore.db
export COMFYUI_URL=http://localhost:8000

# Initialize database
python manage.py migrate
python manage.py collectstatic

# Create superuser
python manage.py createsuperuser
```

### 2. Docker Installation

#### Prerequisites
```bash
# Install Docker
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose

# macOS
brew install docker docker-compose

# Windows
# Download Docker Desktop from https://www.docker.com/products/docker-desktop
```

#### Installation Steps
```bash
# Clone the repository
git clone https://github.com/storycore/storycore.git
cd storycore

# Copy environment configuration
cp .env.example .env
nano .env  # Edit your configuration

# Build and start services
docker-compose build
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs
```

#### Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  storycore-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://storycore:storycore@db:5432/storycore
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=your-secret-key
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules
    command: >
      sh -c "python manage.py migrate &&
             python manage.py runserver 0.0.0.0:3000"

  storycore-frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "8080:3000"
    depends_on:
      - storycore-api
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=storycore
      - POSTGRES_USER=storycore
      - POSTGRES_PASSWORD=storycore
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  comfyui:
    image: storycore/comfyui:latest
    ports:
      - "8000:8000"
    environment:
      - STORYCORE_API=http://storycore-api:3000
      - MODEL_PATH=/models
    volumes:
      - comfyui_models:/models

volumes:
  postgres_data:
  redis_data:
  comfyui_models:
```

### 3. Binary Installation

#### Windows
```bash
# Download the installer
Invoke-WebRequest -Uri "https://github.com/storycore/storycore/releases/latest/download/storycore-installer.exe" -OutFile "storycore-installer.exe"

# Run installer
.\storycore-installer.exe

# Or use winget
winget install StoryCore.StoryCore
```

#### macOS
```bash
# Download the installer
curl -L -o storycore-installer.pkg "https://github.com/storycore/storycore/releases/latest/download/storycore-installer-macos.pkg"

# Install
sudo installer -pkg storycore-installer.pkg -target /
```

#### Linux
```bash
# Download the installer
wget https://github.com/storycore/storycore/releases/latest/download/storycore-installer-linux

# Make executable
chmod +x storycore-installer-linux

# Run installer
sudo ./storycore-installer-linux
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Application Settings
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
TIME_ZONE=UTC

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/storycore
DATABASE_SSL_MODE=require

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=your-redis-password

# AI/ML Configuration
COMFYUI_URL=http://localhost:8000
ENABLE_GPU=True
DEFAULT_MODEL=gemma3

# Security Settings
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# File Storage
STORAGE_TYPE=s3
STORAGE_BUCKET=storycore-assets
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-1

# Monitoring
ENABLE_METRICS=True
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO
```

### Database Configuration

#### PostgreSQL
```sql
-- Create database
CREATE DATABASE storycore;

-- Create user
CREATE USER storycore WITH PASSWORD 'your-password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE storycore TO storycore;

-- Optional: Configure connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
```

#### SQLite (Development)
```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### AI Model Configuration

#### Model Download
```bash
# Download models using CLI
storycore model download gemma3:latest
storycore model download qwen3:latest
storycore model download llava:latest

# Check downloaded models
storycore model list

# Verify model integrity
storycore model verify gemma3
```

#### Model Configuration File
```json
// models.json
{
  "models": {
    "gemma3": {
      "name": "Gemma 3",
      "path": "models/gemma3/gemma3-7b.Q4_0.gguf",
      "type": "llama",
      "parameters": {
        "n_ctx": 8192,
        "n_gpu_layers": 40,
        "temperature": 0.7,
        "top_p": 0.9
      },
      "enabled": true
    },
    "qwen3": {
      "name": "Qwen 3",
      "path": "models/qwen3/qwen3-14b-instruct.Q4_0.gguf",
      "type": "llama",
      "parameters": {
        "n_ctx": 8192,
        "n_gpu_layers": 40,
        "temperature": 0.7,
        "top_p": 0.9
      },
      "enabled": true
    },
    "llava": {
      "name": "LLava",
      "path": "models/llava/llava-v1.5-7b.Q4_0.gguf",
      "type": "llava",
      "parameters": {
        "n_ctx": 8192,
        "n_gpu_layers": 40
      },
      "enabled": true
    }
  }
}
```

## Migration from Previous Versions

### From StoryCore 2.x

#### Step 1: Backup
```bash
# Create backup
storycore backup create

# Verify backup
storycore backup verify backup-20260123.tar.gz
```

#### Step 2: Install StoryCore 3.0
```bash
# Follow installation steps above
# Use the same database if possible
```

#### Step 3: Migration Script
```bash
# Run migration
storycore migrate from-v2

# Check migration status
storycore migration status

# Verify data integrity
storycore data check
```

#### Step 4: Configuration Update
```bash
# Update configuration files
storycore config update --from-v2

# Validate configuration
storycore config validate
```

### From Other Platforms

#### Adobe Premiere Pro
```python
# Migration script for Adobe projects
class AdobePremiereMigrator:
    def __init__(self, adobe_project_path):
        self.project_path = adobe_project_path
        self.storycore_client = StoryCoreClient()
    
    def migrate_project(self):
        """Convert Adobe project to StoryCore format"""
        # Parse Adobe project
        adobe_project = self.parse_adobe_project()
        
        # Create StoryCore project
        storycore_project = self.storycore_client.projects.create(
            name=adobe_project['name'],
            description=adobe_project['description'],
            settings=adobe_project['settings']
        )
        
        # Migrate assets
        for asset in adobe_project['assets']:
            self.migrate_asset(asset, storycore_project['id'])
        
        return storycore_project
```

#### Final Cut Pro
```python
# Migration script for Final Cut projects
class FinalCutMigrator:
    def __init__(self, fcp_project_path):
        self.project_path = fcp_project_path
        self.storycore_client = StoryCoreClient()
    
    def migrate_sequence(self, sequence_data):
        """Convert Final Cut sequence to StoryCore format"""
        # Extract video clips
        clips = self.extract_clips(sequence_data)
        
        # Create StoryCore sequence
        sequence = {
            'name': sequence_data['name'],
            'clips': clips,
            'settings': sequence_data['settings']
        }
        
        return sequence
```

## Advanced Configuration

### Multi-Instance Setup

#### Load Balancer Configuration
```nginx
# nginx.conf
upstream storycore_backend {
    least_conn;
    server 192.168.1.10:3000 weight=3;
    server 192.168.1.11:3000 weight=2;
    server 192.168.1.12:3000 weight=1;
}

server {
    listen 80;
    server_name storycore.example.com;

    location / {
        proxy_pass http://storycore_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### GPU Configuration

#### NVIDIA GPU Setup
```bash
# Check GPU availability
nvidia-smi

# Install CUDA
# Download from https://developer.nvidia.com/cuda-downloads

# Verify CUDA installation
nvcc --version

# Install PyTorch with CUDA support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

#### GPU Memory Management
```json
// gpu-config.json
{
  "gpu": {
    "enabled": true,
    "memory_limit": 0.8,
    "precision": "fp16",
    "optimization": {
      "batch_size": 1,
      "max_tokens": 8192,
      "temperature": 0.7
    }
  }
}
```

### Security Configuration

#### SSL/TLS Setup
```bash
# Generate SSL certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configure Nginx
server {
    listen 443 ssl;
    server_name storycore.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
}
```

#### Authentication Setup
```python
# Configure JWT
JWT_CONFIG = {
    'SECRET_KEY': 'your-secret-key',
    'ALGORITHM': 'HS256',
    'ACCESS_TOKEN_EXPIRE_MINUTES': 30,
    'REFRESH_TOKEN_EXPIRE_DAYS': 7
}

# Configure OAuth 2.0
OAUTH2_CONFIG = {
    'GOOGLE_CLIENT_ID': 'your-google-client-id',
    'GOOGLE_CLIENT_SECRET': 'your-google-client-secret',
    'GITHUB_CLIENT_ID': 'your-github-client-id',
    'GITHUB_CLIENT_SECRET': 'your-github-client-secret'
}
```

## Testing Your Installation

### Health Check
```bash
# Check system health
curl http://localhost:3000/health

# Run diagnostic tests
storycore diagnose

# Verify all services
storycore health-check --all
```

### Functional Tests
```python
# Test basic functionality
import requests

# Test API connectivity
response = requests.get("http://localhost:3000/api/health")
assert response.status_code == 200

# Test user authentication
response = requests.post("http://localhost:3000/api/auth/login", json={
    "email": "test@example.com",
    "password": "password"
})
assert response.status_code == 200

# Test project creation
response = requests.post("http://localhost:3000/api/projects", json={
    "name": "Test Project",
    "description": "A test project"
})
assert response.status_code == 201
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Test database connection
python manage.py dbshell

# Check database logs
tail -f /var/log/postgresql/postgresql-15-main.log

# Reset database connection
python manage.py flush --noinput
```

#### 2. Model Loading Issues
```bash
# Check model files
ls -la models/

# Verify model integrity
storycore model verify gemma3

# Re-download models
storycore model download --force gemma3:latest
```

#### 3. Port Conflicts
```bash
# Check port usage
netstat -an | grep :3000

# Change port
export PORT=3001
python manage.py runserver $PORT
```

#### 4. Memory Issues
```bash
# Check memory usage
free -h

# Increase swap size
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Configure memory limits
storycore config set memory.limit 16GiB
```

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_projects_user_status ON projects(user_id, status);
CREATE INDEX idx_assets_project_type ON assets(project_id, type);
CREATE INDEX idx_jobs_project_status ON jobs(project_id, status);

-- Configure connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
```

#### Caching Configuration
```python
# Redis caching setup
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

## Next Steps

### 1. Explore the Interface
- Take the [User Guide](USER_GUIDE.md)
- Learn about project management
- Explore AI features

### 2. Advanced Features
- Configure multi-instance setup
- Set up custom AI models
- Integrate with external services

### 3. Community and Support
- Join our Discord community
- Read the complete documentation
- Report issues on GitHub

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `python manage.py runserver` | Start development server |
| `docker-compose up -d` | Start Docker containers |
| `storycore health-check` | Check system health |
| `storycore model download` | Download AI models |
| `storycore backup create` | Create backup |

---

*For more information, see the [Complete Documentation](README.md).*