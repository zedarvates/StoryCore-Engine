# Quick Start Guide - StoryCore

Get up and running with StoryCore in minutes. This guide will help you install, configure, and create your first AI-powered content project.

## Prerequisites

Before you begin, ensure you have:

### System Requirements
- **Operating System**: Windows 10/11, macOS 10.14+, Ubuntu 18.04+
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 20GB free space
- **Internet Connection**: Required for model downloads

### Software Requirements
- **Python**: 3.8+ (included with StoryCore)
- **Node.js**: 16+ (included with StoryCore)
- **Git**: Latest version

## Installation

### 1. Download StoryCore

```bash
# Clone the repository
git clone https://github.com/storycore/storycore.git
cd storycore

# Or download the latest release from GitHub
# https://github.com/storycore/storycore/releases
```

### 2. Install Dependencies

```bash
# Install Python dependencies
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install Node.js dependencies
npm install
```

### 3. Initial Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env  # or your preferred editor
```

### 4. Database Setup

```bash
# Run database migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

### 5. Start the Application

```bash
# Start the development server
python manage.py runserver
npm run dev
```

## First Project Setup

### 1. Launch StoryCore

- Open your web browser
- Navigate to `http://localhost:3000`
- You should see the StoryCore interface

### 2. Create Your First Project

1. Click "Create New Project"
2. Enter a project name and description
3. Choose your project template
4. Click "Create Project"

### 3. Configure AI Models

1. Go to Settings → AI Models
2. Download the default models:
   - Gemma 3 (text generation)
   - Qwen 3 (multilingual)
   - LLava (vision)
3. Configure model settings

### 4. Test Your Setup

1. Create a simple text prompt
2. Generate content using AI
3. Verify the output appears correctly

## Basic Workflow

### 1. Project Creation

```python
# Using the StoryCore API
import requests

# Create a new project
project_data = {
    "name": "My First Project",
    "description": "A test project",
    "settings": {
        "ai_model": "gemma3",
        "language": "en"
    }
}

response = requests.post("http://localhost:3000/api/projects", json=project_data)
project = response.json()
print(f"Created project: {project['id']}")
```

### 2. Asset Upload

```python
# Upload a video file
with open('my_video.mp4', 'rb') as f:
    files = {'file': f}
    data = {
        'project_id': project['id'],
        'type': 'video',
        'name': 'My Video'
    }
    
    response = requests.post(
        "http://localhost:3000/api/assets/upload",
        files=files,
        data=data
    )
    asset = response.json()
    print(f"Uploaded asset: {asset['id']}")
```

### 3. AI Processing

```python
# Process video with AI
processing_data = {
    "type": "video_analysis",
    "parameters": {
        "input": asset['id'],
        "analysis": ["content", "scenes", "objects"]
    }
}

response = requests.post(
    "http://localhost:3000/api/jobs",
    json=processing_data
)
job = response.json()
print(f"Processing job: {job['id']}")
```

### 4. Monitor Progress

```python
# Check job status
response = requests.get(f"http://localhost:3000/api/jobs/{job['id']}")
status = response.json()
print(f"Job status: {status['status']}")

# Wait for completion
import time
while status['status'] != 'completed':
    time.sleep(5)
    response = requests.get(f"http://localhost:3000/api/jobs/{job['id']}")
    status = response.json()
    
print("Processing completed!")
```

## Configuration

### Environment Variables

```bash
# .env file
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///storycore.db
COMFYUI_URL=http://localhost:8000
ENABLE_METRICS=True
```

### Model Configuration

```json
// models.json
{
  "models": {
    "gemma3": {
      "path": "models/gemma3/gemma3-7b.Q4_0.gguf",
      "type": "llama",
      "parameters": {
        "n_ctx": 8192,
        "n_gpu_layers": 40
      }
    },
    "qwen3": {
      "path": "models/qwen3/qwen3-14b-instruct.Q4_0.gguf",
      "type": "llama",
      "parameters": {
        "n_ctx": 8192,
        "n_gpu_layers": 40
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check port usage
netstat -an | grep :3000  # Windows
lsof -i :3000             # Linux/macOS

# Change port
export PORT=3001
python manage.py runserver $PORT
```

#### 2. Model Loading Issues

```bash
# Check model files
ls -la models/

# Verify model paths
cat models.json | python -m json.tool

# Re-download models
storycore model download --all
```

#### 3. Database Connection Issues

```bash
# Test database connection
python manage.py dbshell

# Reset database
python manage.py reset_db
python manage.py migrate
```

### Health Check

```bash
# Run health check
curl http://localhost:3000/health

# Check system status
storycore health-check

# Verify all services
storycore diagnose
```

## Next Steps

### 1. Explore Features

- **Video Processing**: Learn about video analysis and editing
- **AI Generation**: Explore text, image, and video generation
- **Project Management**: Understand project organization and sharing

### 2. Advanced Configuration

- **Multi-Instance Setup**: Configure multiple StoryCore instances
- **Custom Models**: Integrate your own AI models
- **API Integration**: Connect with external services

### 3. Community and Support

- **Documentation**: Read the complete documentation
- **GitHub**: Report issues and contribute
- **Discord**: Join the community discussions

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `python manage.py runserver` | Start development server |
| `npm run dev` | Start frontend development |
| `storycore health-check` | Check system health |
| `storycore model list` | List available models |
| `storycore comfyui status` | Check ComfyUI status |

---

*For detailed information, see the [Complete Documentation](README.md).*