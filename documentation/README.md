# StoryCore-Engine Documentation

Welcome to the StoryCore-Engine documentation! This is the comprehensive documentation for the advanced AI content creation platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Guide](#user-guide)
3. [Technical Documentation](#technical-documentation)
4. [API Reference](#api-reference)
5. [Security](#security)
6. [Troubleshooting](#troubleshooting)
7. [Development](#development)

---

## Getting Started

### Quick Start

1. **Installation**: Follow the [Getting Started Guide](GETTING_STARTED_DEV.md) for installation instructions
2. **First Project**: Create your first project using the [User Guide](USER_GUIDE.md)
3. **Configuration**: Set up your environment and preferences

### Prerequisites

- **CPU**: 4 cores, 2.5GHz+
- **RAM**: 8GB (32GB recommended)
- **Storage**: 20GB free space
- **GPU**: Optional but recommended for AI processing
- **OS**: Windows 10/11, macOS 10.14+, Ubuntu 18.04+

---

## User Guide

### Interface Overview

- **Toolbar**: Quick access to main functions (File, Edit, View, Project, AI, Export)
- **Project Panel**: Project and asset management
- **Timeline**: Video and audio editing
- **Properties Panel**: Asset and project properties
- **AI Panel**: AI tools and features
- **Preview Window**: Preview your work

- **UI Improvements**: See [`UI_IMPROVEMENTS_PLAN.md`](UI_IMPROVEMENTS_PLAN.md) for details.

#### UI Usage
- Access new buttons via the toolbar.
- Toggle dark mode using the moon icon.
- Use side panels for assets and AI settings.
- UI components are lazy‑loaded; no extra steps needed.
- **UI Tests**: Run `npm run test:ui` to execute UI unit tests. See [`TESTS_STATUS.md`](TESTS_STATUS.md) for details.

### Project Management

#### Creating Projects

```python
import requests

# Create a new project
project_data = {
    "name": "My New Project",
    "description": "A test project",
    "template": "video_editor",
    "settings": {
        "resolution": "1920x1080",
        "frame_rate": 30,
        "duration": 300
    }
}

response = requests.post("http://localhost:3000/api/projects", json=project_data)
project = response.json()
```

#### Managing Assets

- **Import**: Add files to your project
- **Organize**: Sort assets into folders
- **Preview**: Preview assets before use
- **Metadata**: Add descriptions and tags

### AI Features

#### Text Generation

Available models:
- **Gemma 3**: General text generation
- **Qwen 3**: Multilingual text generation
- **Custom Models**: Your trained models

#### Image Generation

Available models:
- **Stable Diffusion**: High-quality image generation
- **DALL-E**: Creative image generation
- **Custom Models**: Your trained models

#### Video Processing

- **Scene Detection**: Automatically detect scene changes
- **Object Recognition**: Identify objects in videos
- **Content Analysis**: Analyze video content
- **Audio Transcription**: Transcribe speech to text

---

## Technical Documentation

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Presentation Layer                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Electron (Desktop)    │  React Web (Client)    │  Mobile (React Native)         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Application Layer                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  StoryCore API (Node.js)    │  Services (Python)    │  ComfyUI (AI)                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Services Layer                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│  File Storage    │  Message Queue    │  Cache    │  Monitoring    │  Security   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Infrastructure Layer                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL    │  Redis    │  Object Storage    │  Load Balancer    │  CDN        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Frontend Layer

**Electron Application**
- Rich desktop user interface
- Local file management
- System integration
- Native notifications

**Web Client**
- Lightweight web interface
- Real-time collaboration
- Mobile access

#### 2. Backend API Layer

**StoryCore API**
- User management
- Project management
- Workflow orchestration
- Asset management

**Key Endpoints**:
```typescript
// Authentication
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout

// Projects
GET /api/projects
POST /api/projects
GET /api/projects/:id
PUT /api/projects/:id
DELETE /api/projects/:id

// Assets
POST /api/assets/upload
GET /api/assets/:id
DELETE /api/assets/:id

// Jobs
POST /api/jobs
GET /api/jobs/:id
POST /api/jobs/:id/cancel
```

#### 3. ComfyUI Integration

- Advanced AI processing
- Workflow execution
- Model management
- Job monitoring

**Workflow Types**:
```python
# Text Generation Workflow
{
    "type": "text_generation",
    "model": "gemma3",
    "parameters": {
        "temperature": 0.7,
        "max_tokens": 1000
    }
}

# Image Generation Workflow
{
    "type": "image_generation",
    "model": "stable_diffusion",
    "parameters": {
        "resolution": "512x512",
        "steps": 20
    }
}
```

### Data Flow

#### Project Creation
```
User → Electron API → StoryCore API → Database
                              ↓
                            Redis Cache
                              ↓
                          Message Queue
                              ↓
                            ComfyUI Service
                              ↓
                          File Storage
                              ↓
                          Notification
```

#### Video Processing
```
Video File → File Storage → Video Processing Service
                            ↓
                      Message Queue (Celery)
                            ↓
                      ComfyUI (GPU Processing)
                            ↓
                      File Storage (Output)
                            ↓
                      Database (Update Metadata)
                            ↓
                      Notification (User)
```

---

## API Reference

### AI Enhancement API

See [AI_ENHANCEMENT_API_REFERENCE.md](AI_ENHANCEMENT_API_REFERENCE.md) for complete API documentation.

### Error Handling API

See [api/error-handling-api.md](api/error-handling-api.md) for error handling patterns.

### Security Validation API

See [api/security-validation-api.md](api/security-validation-api.md) for security features.

### Advanced Workflows API

See [advanced-workflows/](advanced-workflows/) directory for:
- [API Reference](advanced-workflows/api-reference.md)
- [User Guide](advanced-workflows/user-guide.md)
- [Configuration Guide](advanced-workflows/configuration-guide.md)
- [Examples & Tutorials](advanced-workflows/examples-tutorials.md)

---

## Security

### Security Overview

StoryCore implements multiple layers of security:

1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimal required permissions
3. **Zero Trust**: Verify everything
4. **Security by Design**: Security built into architecture
5. **Continuous Monitoring**: Ongoing security assessment

### Authentication & Authorization

#### JWT Authentication

```python
from datetime import timedelta
import jwt

class JWTManager:
    def __init__(self, secret_key):
        self.secret_key = secret_key
        self.algorithm = "HS256"
        self.access_token_expire = timedelta(hours=1)
    
    def create_access_token(self, user_id):
        payload = {
            'user_id': user_id,
            'type': 'access',
            'exp': datetime.utcnow() + self.access_token_expire,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
```

#### Role-Based Access Control

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
        return required_permission in self.roles.get(user_role, [])
```

### Data Security

#### Encryption at Rest

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
```

### Security Enhancements

#### AES-256 Encrypted Audit Logs

- **Algorithm**: AES-256-GCM for authenticated encryption
- **Key Management**: PBKDF2 key derivation with automatic rotation every 30 days
- **Storage**: Encrypted keys stored separately with master key protection

#### SSL Certificate Pinning for Model Downloads

- **Protocol Enforcement**: Only HTTPS URLs accepted
- **Certificate Pinning**: SHA256 fingerprint validation for trusted domains
- **Domain Allowlist**: Restricted to known AI/ML hosting services

#### Download Size Limits

- **Maximum Size Limit**: 50GB per download
- **Size Validation**: Content-Length header validation
- **Real-time Monitoring**: Size checked during download progress

---

## Troubleshooting

### Common Issues

#### 1. Performance Issues

```bash
# Check system performance
storycore performance check

# Optimize performance
storycore performance optimize

# Clear cache
storycore cache clear
```

#### 2. Export Problems

```bash
# Check export settings
storycore export validate

# Test export
storycore export test

# Check available formats
storycore export formats
```

#### 3. AI Model Issues

```bash
# Check AI models
storycore ai models

# Verify model integrity
storycore ai verify

# Re-download models
storycore ai download --all
```

#### 4. Database Connection Issues

```bash
# Test database connection
python manage.py dbshell

# Check database logs
tail -f /var/log/postgresql/postgresql-15-main.log

# Reset database connection
python manage.py flush --noinput
```

#### 5. Model Loading Issues

```bash
# Check model files
ls -la models/

# Verify model integrity
storycore model verify gemma3

# Re-download models
storycore model download --force gemma3:latest
```

#### 6. Port Conflicts

```bash
# Check port usage
netstat -an | grep :3000

# Change port
export PORT=3001
python manage.py runserver $PORT
```

### Video Engine Issues

#### GPU Acceleration Not Working

```python
import cv2

# Check OpenCV GPU support
print(f"CUDA support: {cv2.cuda.getCudaEnabledDeviceCount() > 0}")

# Test GPU availability
import torch
print(f"PyTorch CUDA available: {torch.cuda.is_available()}")
```

#### Out of Memory Errors

```python
import psutil
import gc

def diagnose_memory_usage():
    memory = psutil.virtual_memory()
    print(f"Available memory: {memory.available / 1024**3:.1f} GB")
    
    # Force garbage collection
    gc.collect()
```

### Getting Help

- **Built-in Help**: Access via Help menu
- **Documentation**: Read complete documentation
- **GitHub Issues**: Report bugs and request features
- **Discord**: Join our community server

---

## Development

### Contributing

We appreciate all contributions! To contribute to the documentation:

1. **Fork** the repository
2. **Create** a branch for your contribution
3. **Make** your changes
4. **Submit** a Pull Request

### Coding Guidelines

See [CODING_GUIDELINES_LARGE_FILES.md](CODING_GUIDELINES_LARGE_FILES.md) for best practices.

### Testing

#### UI Tests
Run `npm run test:ui` to execute UI unit tests. See [`TESTS_STATUS.md`](TESTS_STATUS.md) for details.

See [TESTS_STATUS.md](TESTS_STATUS.md) for testing documentation.

### Migration Guide

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for migration instructions.

---

## Additional Documentation

### Installation & Setup

- [Installation Scripts](SCRIPTS_INSTALLATION_MISE_A_JOUR.md) - Installation and update scripts
- [Deployment Guide](deployment_guide.md) - Production deployment
- [ComfyUI Multi-Instance Guide](comfyui-multi-instance-user-guide.md) - Multi-instance setup
- [ComfyUI Troubleshooting](comfyui-instance-troubleshooting.md) - Common issues and solutions

### Core Features

- [Quality Validation User Guide](quality_validation_user_guide.md) - Quality validation features
- [Video Engine API](video_engine_api.md) - Video engine documentation
- [Video Engine Examples](video_engine_examples.md) - Usage examples
- [Video Engine Performance](video_engine_performance.md) - Performance optimization

### Character Wizard

- [AI Name Generation](character_wizard/ai_name_generation.md) - Character name generation
- [Personality Generation](character_wizard/personality_generation.md) - Character personality system

### Developer Documentation

- [CLI Architecture](CLI_ARCHITECTURE.md) - Command-line interface design
- [CLI Extensibility](CLI_EXTENSIBILITY.md) - Extending the CLI
- [Technical Roadmap](technical-roadmap.md) - Future development plans
- [Structure](STRUCTURE.md) - Project structure
- [Tech Stack](tech.md) - Technology stack details

### Guides

- [ComfyUI Setup](guides/COMFYUI_SETUP.md) - ComfyUI installation guide
- [Multi-Instance Guide](guides/MULTI_INSTANCE_GUIDE.md) - Multi-instance configuration
- [Wizards Guide](guides/WIZARDS_GUIDE.md) - Wizards usage guide

### Product & Design

- [Product Overview](product.md) - Product vision and goals
- [UI Improvement Roadmap](ui-improvement-roadmap.md) - UI/UX improvements
- [Storytelling & Prompting Techniques](TECHNIQUES_STORYTELLING_PROMPTING.md) - Creative techniques
- [Prompt Examples](EXEMPLES_PROMPTS_AVANT_APRES.md) - Before/after examples

### Project Management

- [Changelog](CHANGELOG.md) - Version history
- [Lessons Learned](Lessons_Learned.md) - Project insights
- [Steering](steering.md) - Project direction

### Research & Analysis

- [JSON Schema Validation Research](json_schema_validation_research.md) - Schema validation
- [Python CLI Research](python_cli_research.md) - CLI research
- [Model Requirements Matrix](MODEL_REQUIREMENTS_MATRIX.md) - Model requirements

---

## Support

If you have questions or encounter issues:

- **Documentation**: Check the documentation first
- **GitHub Issues**: [Open an issue](https://github.com/storycore/storycore-engine/issues)
- **Discord**: [Join our Discord server](https://discord.gg/storycore)
- **Email**: [support@storycore.io](mailto:support@storycore.io)

---

## License

This documentation is licensed under MIT. See the [LICENSE](../LICENSE) file for more information.

---

*Last Updated: January 2026*

