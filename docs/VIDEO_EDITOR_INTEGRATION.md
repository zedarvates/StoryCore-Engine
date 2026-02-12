# Video Editor Integration Guide

This document outlines the integration steps to connect the frontend video editor to the backend API.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ VideoEditor │◄─┤ Context      │◄─┤ videoEditorAPI      │  │
│  └──────┬──────┘  └──────────────┘  └──────────┬──────────┘  │
│         │                                         │              │
│         │         ┌─────────────────────┐        │              │
│         └────────►│  components/       │◄───────┘              │
│                   │  MediaLibrary      │                       │
│                   │  EffectsPanel     │                       │
│                   │  ExportDialog     │                       │
│                   │  ...              │                       │
│                   └───────────────────┘                       │
└────────────────────────────┬──────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼──────────────────────────────────┐
│                    Backend (FastAPI)                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ video_editor │──┤ FFmpeg      │──┤ video_editor        │  │
│  │ _api.py     │  │ Service      │  │ _ai_service.py       │  │
│  └─────────────┘  └──────────────┘  └─────────────────────┘  │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────┐                                               │
│  │ Database    │                                               │
│  │ (projects)  │                                               │
│  └─────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Steps

### 1. Backend Integration Points

#### FFmpeg Service (`backend/ffmpeg_service.py`)
- Already exists with comprehensive video processing
- Can be used for thumbnail generation
- Can be used for video transcoding

#### New Endpoints to Implement

```python
# In backend/video_editor_api.py

@router.post("/projects")
async def create_project(request: CreateProjectRequest):
    """Create a new video editing project"""
    pass

@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get project details with timeline"""
    pass

@router.put("/projects/{project_id}")
async def update_project(project_id: str, request: UpdateProjectRequest):
    """Update project (clips, tracks, settings)"""
    pass

@router.post("/projects/{project_id}/media")
async def import_media(project_id: str, file: UploadFile):
    """Import media file and generate thumbnail"""
    pass

@router.post("/projects/{project_id}/export")
async def export_project(project_id: str, request: ExportRequest):
    """Start export job"""
    pass

@router.get("/export/{job_id}/progress")
async def get_export_progress(job_id: str):
    """Get export job progress"""
    pass
```

### 2. Frontend Integration Points

#### API Client Updates

Update `src/services/videoEditorAPI.ts` to handle:

1. **Authentication** - Add JWT token handling
2. **File uploads** - Use FormData for media import
3. **Progress tracking** - Poll for export progress
4. **Error handling** - Consistent error responses

#### Example Integration Code

```typescript
// src/services/videoEditorAPI.ts

class VideoEditorAPI {
  private baseUrl = '/api/video-editor';
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  async createProject(name: string, resolution: {width: number, height: number}): Promise<EditorProject> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, resolution }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create project: ${response.statusText}`);
    }
    
    return response.json();
  }

  async importMedia(projectId: string, file: File): Promise<MediaFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : '',
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to import media: ${response.statusText}`);
    }
    
    return response.json();
  }

  async exportProject(projectId: string, settings: ExportSettings): Promise<ExportJob> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/export`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to start export: ${response.statusText}`);
    }
    
    return response.json();
  }

  async waitForExport(jobId: string, onProgress: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await fetch(`${this.baseUrl}/export/${jobId}/progress`, {
            headers: this.getHeaders(),
          });
          
          if (!response.ok) {
            throw new Error('Failed to get export progress');
          }
          
          const job = await response.json();
          onProgress(job.progress);
          
          if (job.status === 'completed') {
            resolve(job.output_url);
          } else if (job.status === 'failed') {
            reject(new Error(job.error || 'Export failed'));
          } else {
            setTimeout(poll, 1000);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  }
}
```

### 3. WebSocket for Real-time Progress

For real-time export progress, implement WebSocket connection:

```typescript
// src/services/exportProgressSocket.ts

import { EventEmitter } from 'events';

class ExportProgressSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(jobId: string, accessToken: string) {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/video-editor/export/${jobId}/ws?token=${accessToken}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.emit('progress', data);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(jobId, accessToken);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private attemptReconnect(jobId: string, accessToken: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
        this.connect(jobId, accessToken);
      }, 2000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const exportProgressSocket = new ExportProgressSocket();
```

### 4. Database Schema Integration

Update the database to store video editor projects:

```python
# backend/database_models.py

from sqlalchemy import Column, String, Integer, Float, JSON, ForeignKey, DateTime
from datetime import datetime
from .base import Base

class VideoEditorProject(Base):
    __tablename__ = "video_editor_projects"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    
    # Project settings
    resolution_width = Column(Integer, default=1920)
    resolution_height = Column(Integer, default=1080)
    frame_rate = Column(Integer, default=30)
    
    # Timeline data (stored as JSON)
    timeline = Column(JSON, default=dict)
    tracks = Column(JSON, default=list)
    clips = Column(JSON, default=list)
    media = Column(JSON, default=list)
    
    # Status
    status = Column(String(50), default="draft")  # draft, exporting, completed, failed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="video_projects")
    export_jobs = relationship("ExportJob", back_populates="project")

class ExportJob(Base):
    __tablename__ = "export_jobs"
    
    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("video_editor_projects.id"), nullable=False)
    
    # Export settings
    format = Column(String(10), default="mp4")
    codec = Column(String(20), default="h264")
    resolution = Column(String(20), default="1920x1080")
    quality = Column(Integer, default=80)
    
    # Progress
    progress = Column(Float, default=0.0)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    error_message = Column(String(1000), nullable=True)
    output_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    project = relationship("VideoEditorProject", back_populates="export_jobs")
```

### 5. File Storage Integration

Media files should be stored in:

```
projects/
└── {project_id}/
    ├── media/
    │   ├── {media_id}/
    │   │   ├── original.ext
    │   │   └── thumbnail.jpg
    │   └── ...
    ├── cache/
    │   └── proxies/
    └── exports/
        └── {export_id}/
            └── output.mp4
```

### 6. FFmpeg Command Builder

For export rendering:

```python
# backend/export_renderer.py

from backend.ffmpeg_service import FFmpegService, ExportSettings, VideoFormat

class ExportRenderer:
    def __init__(self):
        self.ffmpeg = FFmpegService()
    
    def build_export_command(
        self,
        project: dict,
        settings: ExportSettings,
        output_path: str
    ) -> list:
        """Build FFmpeg command for exporting project"""
        
        # Build filter_complex for timeline concatenation
        filter_parts = []
        
        # Add video tracks
        for i, track in enumerate(project.tracks):
            if track.type == "video":
                for clip in track.clips:
                    # Scale and pad clips
                    filter_parts.append(
                        f"[{i}:v]scale={settings.resolution[0]}:{settings.resolution[1]}:"
                        f"force_original_aspect_ratio=decrease,"
                        f"pad={settings.resolution[0]}:{settings.resolution[1]}:"
                        f"(ow-iw)/2:(oh-ih)/2,setsar=1[v{i}]"
                    )
        
        # Add audio tracks
        for i, track in enumerate(project.tracks):
            if track.type == "audio":
                filter_parts.append(f"[{i}:a][{i+1}:a]amix=inputs=2:duration=first[a]")
        
        # Build command
        cmd = [
            self.ffmpeg.ffmpeg_path,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", "concat_list.txt",
            "-c:v", settings.codec.value,
            "-preset", "fast",
            "-crf", str(settings.quality),
            "-c:a", "aac",
            "-b:a", "192k",
            output_path,
        ]
        
        return cmd
```

### 7. Integration Checklist

- [ ] **Backend**
  - [ ] Implement video_editor_api.py endpoints
  - [ ] Add database models
  - [ ] Set up file storage structure
  - [ ] Implement FFmpeg export queue
  - [ ] Add WebSocket for progress updates
  
- [ ] **Frontend**
  - [ ] Update API client with auth
  - [ ] Implement file upload handling
  - [ ] Add progress polling/WebSocket
  - [ ] Connect MediaLibrary to backend
  - [ ] Connect ExportDialog to backend
  
- [ ] **Testing**
  - [ ] Test project CRUD
  - [ ] Test media import
  - [ ] Test export with progress
  - [ ] Test error handling

### 8. Running the Integration

```bash
# Start backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Start frontend
cd creative-studio-ui
npm run dev

# Access editor at
# http://localhost:5173/video-editor
```

## Troubleshooting

### Common Issues

1. **CORS errors**
   - Ensure CORS middleware is configured in FastAPI
   - Add frontend origin to allowed origins

2. **FFmpeg not found**
   - Install FFmpeg on system
   - Or use bundled FFmpeg binary

3. **File upload too large**
   - Increase max file size in FastAPI
   - Configure nginx/frontend proxy

4. **Export taking too long**
   - Use proxy files for preview
   - Implement background processing

