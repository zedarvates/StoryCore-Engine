# Next Steps - Video Editor Wizard Integration

## Overview
This document outlines the integration steps to connect the backend API with the frontend and complete the MVP.

## Current Status

### ✅ Completed
- [x] Planning document (VIDEO_EDITOR_WIZARD_PLAN.md)
- [x] Backend API (video_editor_api.py) - Auth, Projects, Media, Export, AI endpoints
- [x] AI Services (video_editor_ai_service.py) - Transcription, TTS, Translation, Smart Crop
- [x] Frontend HTML (video-editor-wizard.html) - Landing page + Editor mockup

### ⏳ Pending
- [ ] Database integration
- [ ] API integration with frontend
- [ ] Celery workers for async jobs
- [ ] AI model integration
- [ ] Testing & validation

---

## Step 1: Database Integration

### Install Dependencies
```bash
pip install sqlalchemy asyncpg alembic redis celery
```

### Create Database Models (backend/database.py)
```python
"""Database models for Video Editor."""
from sqlalchemy import Column, String, DateTime, Float, Boolean, Integer, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    plan = Column(String(50), default="free")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    aspect_ratio = Column(String(10), default="16:9")
    resolution = Column(String(20), default="1920x1080")
    frame_rate = Column(Float, default=30.0)
    duration = Column(Float, default=0.0)
    thumbnail_path = Column(String(500), nullable=True)
    settings = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Media(Base):
    __tablename__ = "media"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), nullable=True, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    media_type = Column(String(50), nullable=False)  # video, audio, image
    path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    duration = Column(Float, nullable=True)
    resolution = Column(String(20), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ExportJob(Base):
    __tablename__ = "export_jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    progress = Column(Float, default=0.0)
    format = Column(String(20), default="mp4")
    preset = Column(String(50), default="custom")
    resolution = Column(String(20), nullable=True)
    quality = Column(String(20), default="high")
    download_url = Column(String(500), nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class AIJob(Base):
    __tablename__ = "ai_jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    job_type = Column(String(50), nullable=False)  # transcription, tts, translate, smart_crop
    status = Column(String(50), default="pending")
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    progress = Column(Float, default=0.0)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
```

---

## Step 2: Celery Configuration

### Create celery_config.py
```python
"""Celery configuration for async AI jobs."""
from celery import Celery
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "video_editor",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    worker_prefetch_multiplier=1,
    worker_concurrency=4
)

# Import tasks
from . import ai_tasks
```

### Create ai_tasks.py
```python
"""Celery tasks for AI processing."""
from .celery_config import celery_app
from .video_editor_ai_service import (
    create_transcription_service,
    create_tts_service,
    create_translation_service,
    create_smart_crop_service
)
import asyncio

@celery_app.task(bind=True)
def transcribe_media(self, media_path: str, language: str = None):
    """Transcribe media file."""
    async def _transcribe():
        service = create_transcription_service()
        return await service.transcribe(media_path, language)
    
    loop = asyncio.new_event_loop()
    return loop.run_until_complete(_transcribe())

@celery_app.task(bind=True)
def text_to_speech(self, text: str, voice: str, speed: float = 1.0):
    """Generate speech from text."""
    async def _tts():
        service = create_tts_service()
        return await service.text_to_speech(text, voice, speed)
    
    loop = asyncio.new_event_loop()
    return loop.run_until_complete(_tts())

@celery_app.task(bind=True)
def smart_crop_video(self, video_path: str, target_ratio: str):
    """Smart crop video."""
    async def _crop():
        service = create_smart_crop_service()
        return await service.smart_crop(video_path, target_ratio)
    
    loop = asyncio.new_event_loop()
    return loop.run_until_complete(_crop())

@celery_app.task(bind=True)
def clean_audio(self, audio_path: str, remove_noise: bool = True):
    """Clean audio file."""
    from .video_editor_ai_service import AudioCleaningService
    
    async def _clean():
        service = AudioCleaningService()
        return await service.clean_audio(audio_path, remove_noise=remove_noise)
    
    loop = asyncio.new_event_loop()
    return loop.run_until_complete(_clean())
```

---

## Step 3: Frontend Integration

### API Client (creative-studio-ui/js/api-client.js)
```javascript
class VideoEditorAPI {
    constructor(baseUrl = '/api/video-editor') {
        this.baseUrl = baseUrl;
        this.accessToken = localStorage.getItem('access_token');
    }
    
    setToken(token) {
        this.accessToken = token;
        localStorage.setItem('access_token', token);
    }
    
    async request(method, endpoint, data = null) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        const options = { method, headers };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, options);
        
        if (response.status === 401) {
            // Handle token refresh
            await this.refreshToken();
            return this.request(method, endpoint, data);
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Request failed');
        }
        
        return response.json();
    }
    
    // Auth
    async register(email, password, name) {
        return this.request('POST', '/auth/register', { email, password, name });
    }
    
    async login(email, password) {
        const response = await this.request('POST', '/auth/login', { email, password });
        this.setToken(response.access_token);
        return response;
    }
    
    async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await this.request('POST', '/auth/refresh', refreshToken);
        this.setToken(response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        return response;
    }
    
    async getProfile() {
        return this.request('GET', '/auth/me');
    }
    
    // Projects
    async createProject(name, description, aspectRatio = '16:9') {
        return this.request('POST', '/projects', {
            name,
            description,
            aspect_ratio: aspectRatio
        });
    }
    
    async getProjects() {
        return this.request('GET', '/projects');
    }
    
    async getProject(id) {
        return this.request('GET', `/projects/${id}`);
    }
    
    async updateProject(id, data) {
        return this.request('PUT', `/projects/${id}`, data);
    }
    
    async deleteProject(id) {
        return this.request('DELETE', `/projects/${id}`);
    }
    
    // Media
    async uploadMedia(file, projectId, mediaType) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);
        formData.append('media_type', mediaType);
        
        const headers = {};
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        const response = await fetch(`${this.baseUrl}/media/upload`, {
            method: 'POST',
            headers,
            body: formData
        });
        
        return response.json();
    }
    
    // Export
    async startExport(projectId, format = 'mp4', preset = 'custom') {
        return this.request('POST', '/export', {
            project_id: projectId,
            format,
            preset
        });
    }
    
    async getExportStatus(jobId) {
        return this.request('GET', `/export/${jobId}/status`);
    }
    
    // AI
    async transcribe(mediaId, language = null) {
        return this.request('POST', '/ai/transcribe', {
            media_id: mediaId,
            language
        });
    }
    
    async textToSpeech(text, voice = 'fr-FR-Denise') {
        return this.request('POST', '/ai/tts', {
            text,
            voice
        });
    }
    
    async smartCrop(mediaId, targetRatio = '9:16') {
        return this.request('POST', '/ai/smart-crop', {
            media_id: mediaId,
            target_ratio: targetRatio
        });
    }
    
    // Presets
    async getPresets() {
        return this.request('GET', '/presets');
    }
    
    async getAspectRatios() {
        return this.request('GET', '/aspect-ratios');
    }
}

export const api = new VideoEditorAPI();
```

---

## Step 4: Editor Component Integration

### Editor Component (creative-studio-ui/js/editor.js)
```javascript
class VideoEditor {
    constructor(container, projectId) {
        this.container = container;
        this.projectId = projectId;
        this.api = window.editorAPI;
        this.timeline = new Timeline();
        this.preview = new Preview();
        this.mediaLibrary = new MediaLibrary();
        this.properties = new PropertiesPanel();
    }
    
    async init() {
        // Load project
        const project = await this.api.getProject(this.projectId);
        
        // Initialize components
        await this.timeline.init(project);
        await this.preview.init(project);
        await this.mediaLibrary.load(project.id);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Auto-save every 30 seconds
        setInterval(() => this.autoSave(), 30000);
    }
    
    setupEventListeners() {
        // Timeline events
        this.timeline.on('clip:select', (clip) => {
            this.preview.seek(clip.startTime);
            this.properties.show(clip);
        });
        
        this.timeline.on('clip:move', (clip, newStart) => {
            this.autoSave();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete') {
                this.timeline.deleteSelected();
            } else if (e.key === 's' && e.ctrlKey) {
                e.preventDefault();
                this.autoSave();
            }
        });
    }
    
    async autoSave() {
        const state = this.timeline.getState();
        await this.api.updateProject(this.projectId, {
            settings: state
        });
        this.showNotification('Sauvegardé');
    }
    
    showNotification(message) {
        // Show toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
    
    async export(format = 'mp4', preset = 'custom') {
        const result = await this.api.startExport(this.projectId, format, preset);
        
        // Poll for status
        const poll = setInterval(async () => {
            const status = await this.api.getExportStatus(result.job_id);
            
            this.updateExportProgress(status.progress);
            
            if (status.status === 'completed') {
                clearInterval(poll);
                window.open(status.download_url, '_blank');
                this.showNotification('Export terminé !');
            } else if (status.status === 'failed') {
                clearInterval(poll);
                this.showNotification('Export échoué: ' + status.error);
            }
        }, 1000);
    }
}

// Initialize editor
const editor = new VideoEditor(
    document.getElementById('editor-container'),
    projectId
);
editor.init();
```

---

## Step 5: Run the Application

### Development Server
```bash
# Terminal 1 - Backend
cd backend
uvicorn video_editor_api:app --reload --port 8000

# Terminal 2 - Celery Worker
celery -A ai_tasks worker --loglevel=info

# Terminal 3 - Frontend
cd creative-studio-ui
python -m http.server 3000
```

### Environment Variables
```bash
# .env
REDIS_URL=redis://localhost:6379/0
DATABASE_URL=postgresql://user:password@localhost/video_editor
JWT_SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-key  # Optional
```

---

## Testing Checklist

- [ ] Auth flow (register, login, refresh, logout)
- [ ] Project CRUD operations
- [ ] Media upload and management
- [ ] Timeline editing (add, move, delete clips)
- [ ] AI transcription (upload audio/video)
- [ ] TTS generation
- [ ] Smart crop functionality
- [ ] Export workflow
- [ ] Auto-save and recovery
- [ ] Performance testing (large files)
- [ ] Cross-browser testing

---

*Last updated: 2026-02-11*
