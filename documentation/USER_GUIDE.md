# User Guide - StoryCore

Master StoryCore with this comprehensive user guide. Learn to create, manage, and enhance your AI-powered content projects.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Interface Overview](#interface-overview)
3. [Project Management](#project-management)
4. [Content Creation](#content-creation)
5. [AI Features](#ai-features)
6. [Collaboration](#collaboration)
7. [Export and Sharing](#export-and-sharing)
8. [Settings and Preferences](#settings-and-preferences)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### First Launch

When you first launch StoryCore, you'll see the welcome screen:

1. **Welcome Screen**: Introduction to StoryCore features
2. **Quick Start**: Tutorial for new users
3. **Projects**: Access your existing projects
4. **Settings**: Configure your preferences

### Creating Your First Project

1. Click "Create New Project"
2. Enter a project name and description
3. Choose a project template:
   - **Blank Project**: Start from scratch
   - **Video Editor**: Video-focused project
   - **Content Creator**: General content creation
   - **AI Assistant**: AI-powered workflow
4. Click "Create Project"

### Interface Tour

#### Main Components

- **Toolbar**: Quick access to main functions
- **Project Panel**: Project and asset management
- **Timeline**: Video and audio editing
- **Properties**: Asset and project properties
- **AI Panel**: AI tools and features
- **Preview**: Preview your work

## Interface Overview

### Main Window Layout

```
┌─────────────────────────────────────────────────────────┐
│ Toolbar: File | Edit | View | Project | AI | Export     │
├─────────────────────────────────────────────────────────┤
│ Project Panel │ Timeline │ Properties │ AI Panel        │
├─────────────────────────────────────────────────────────┤
│ Preview Window │ Status Bar │ Quick Actions             │
└─────────────────────────────────────────────────────────┘
```

### Toolbar

The toolbar provides quick access to essential functions:

- **File**: New, Open, Save, Import, Export
- **Edit**: Undo, Redo, Cut, Copy, Paste
- **View**: Zoom, Grid, Snap, Guides
- **Project**: New Project, Open Project, Save Project
- **AI**: Generate Content, Analyze, Enhance
- **Export**: Render, Share, Publish

### Project Panel

The Project Panel organizes your project assets:

#### Projects Tab
- List of all your projects
- Search and filter options
- Project actions (duplicate, delete, share)

#### Assets Tab
- **Videos**: Video files and clips
- **Images**: Images and graphics
- **Audio**: Music and sound effects
- **Text**: Text and subtitles
- **Effects**: Visual effects and filters

#### Media Library
- Pre-built assets and templates
- Stock footage and music
- AI-generated content

### Timeline

The timeline is where you edit your content:

#### Timeline Tracks
- **Video Track**: Main video content
- **Audio Track**: Background music
- **Voice Track**: Narration and dialogue
- **Text Track**: Subtitles and titles
- **Effects Track**: Visual effects

#### Timeline Controls
- **Play/Pause**: Preview your work
- **Timeline Scrubber**: Navigate through your project
- **Zoom In/Out**: Adjust timeline scale
- **Snap**: Enable/disable snapping

### Properties Panel

The Properties Panel shows detailed information about selected items:

#### Video Properties
- Duration, resolution, frame rate
- Color settings and effects
- Audio levels and filters

#### Text Properties
- Font, size, color
- Animation and effects
- Timing and positioning

#### AI Properties
- Model selection
- Generation parameters
- Quality settings

### AI Panel

The AI Panel provides access to AI-powered features:

#### AI Tools
- **Text Generation**: Create text content
- **Image Generation**: Generate images
- **Video Analysis**: Analyze video content
- **Audio Enhancement**: Improve audio quality
- **Content Suggestions**: Get creative ideas

#### AI Models
- **Gemma 3**: Text generation
- **Qwen 3**: Multilingual support
- **LLava**: Vision analysis
- **Custom Models**: Your own models

## Project Management

### Creating Projects

#### Basic Project Creation
```python
# Using StoryCore API
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
print(f"Created project: {project['id']}")
```

#### Project Templates
```python
# Create project from template
template_data = {
    "template_id": "youtube_shorts",
    "name": "YouTube Shorts Project",
    "custom_settings": {
        "aspect_ratio": "9:16",
        "max_duration": 60
    }
}

response = requests.post("http://localhost:3000/api/projects/from-template", json=template_data)
```

### Managing Projects

#### Project Organization
- **Folders**: Organize projects by category
- **Tags**: Add tags for easy searching
- **Metadata**: Set project descriptions and notes
- **Version Control**: Track project changes

#### Project Settings
```python
# Update project settings
update_data = {
    "name": "Updated Project Name",
    "description": "Updated description",
    "settings": {
        "resolution": "3840x2160",
        "frame_rate": 60,
        "audio_channels": 2
    }
}

response = requests.put(f"http://localhost:3000/api/projects/{project['id']}", json=update_data)
```

#### Project Sharing
```python
# Share project with team members
share_data = {
    "project_id": project['id'],
    "users": ["user1@example.com", "user2@example.com"],
    "permissions": ["read", "write"]
}

response = requests.post("http://localhost:3000/api/projects/share", json=share_data)
```

### Working with Assets

#### Asset Management
- **Import**: Add files to your project
- **Organize**: Sort assets into folders
- **Preview**: Preview assets before use
- **Metadata**: Add descriptions and tags

#### Asset Import
```python
# Import video file
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
```

#### Asset Processing
```python
# Process asset with AI
processing_data = {
    "asset_id": asset['id'],
    "operations": [
        {
            "type": "transcription",
            "parameters": {
                "language": "en",
                "format": "srt"
            }
        },
        {
            "type": "analysis",
            "parameters": {
                "content_analysis": true,
                "scene_detection": true
            }
        }
    ]
}

response = requests.post("http://localhost:3000/api/assets/process", json=processing_data)
```

## Content Creation

### Video Editing

#### Basic Editing
1. **Import Media**: Add video files to your project
2. **Arrange Clips**: Drag clips to the timeline
3. **Trim Clips**: Adjust clip start and end points
4. **Add Transitions**: Apply transitions between clips
5. **Adjust Audio**: Balance audio levels

#### Advanced Editing
- **Multi-track Editing**: Work with multiple video and audio tracks
- **Keyframing**: Animate properties over time
- **Effects**: Apply visual effects and filters
- **Color Correction**: Adjust color and lighting

#### Video Export
```python
# Export video project
export_data = {
    "project_id": project['id'],
    "format": "mp4",
    "resolution": "1920x1080",
    "frame_rate": 30,
    "quality": "high",
    "include_audio": True
}

response = requests.post("http://localhost:3000/api/projects/export", json=export_data)
export_job = response.json()
```

### Image Creation

#### Image Generation
```python
# Generate image using AI
generation_data = {
    "type": "image_generation",
    "model": "stable_diffusion",
    "parameters": {
        "prompt": "A beautiful landscape with mountains and lake",
        "resolution": "1024x1024",
        "steps": 20,
        "guidance_scale": 7.5
    }
}

response = requests.post("http://localhost:3000/api/generate/image", json=generation_data)
image = response.json()
```

#### Image Editing
- **Crop and Resize**: Adjust image dimensions
- **Filters and Effects**: Apply visual effects
- **Text Overlay**: Add text to images
- **Color Correction**: Adjust colors and tones

### Text Creation

#### Text Generation
```python
# Generate text using AI
text_data = {
    "type": "text_generation",
    "model": "gemma3",
    "parameters": {
        "prompt": "Write a product description for a smartphone",
        "length": "medium",
        "tone": "professional"
    }
}

response = requests.post("http://localhost:3000/api/generate/text", json=text_data)
text = response.json()
```

#### Text Editing
- **Font Selection**: Choose from various fonts
- **Text Effects**: Apply animations and styles
- **Text Animation**: Animate text over time
- **Subtitle Generation**: Create subtitles automatically

## AI Features

### Text Generation

#### Available Models
- **Gemma 3**: General text generation
- **Qwen 3**: Multilingual text generation
- **Custom Models**: Your trained models

#### Text Generation Parameters
```python
# Advanced text generation parameters
text_params = {
    "model": "gemma3",
    "prompt": "Create a engaging product description",
    "parameters": {
        "temperature": 0.7,
        "max_tokens": 1000,
        "top_p": 0.9,
        "top_k": 50,
        "frequency_penalty": 0.1,
        "presence_penalty": 0.1
    }
}
```

### Image Generation

#### Image Models
- **Stable Diffusion**: High-quality image generation
- **DALL-E**: Creative image generation
- **Custom Models**: Your trained models

#### Image Generation Workflow
1. **Prompt Engineering**: Write effective prompts
2. **Parameter Tuning**: Adjust generation parameters
3. **Batch Generation**: Generate multiple images
4. **Post-processing**: Edit and refine generated images

### Video Analysis

#### Video Analysis Features
- **Scene Detection**: Automatically detect scene changes
- **Object Recognition**: Identify objects in videos
- **Content Analysis**: Analyze video content
- **Audio Transcription**: Transcribe speech to text

#### Video Analysis Example
```python
# Analyze video content
analysis_data = {
    "video_id": asset['id'],
    "analysis_type": "comprehensive",
    "parameters": {
        "scene_detection": True,
        "object_recognition": True,
        "face_detection": True,
        "audio_analysis": True,
        "content_classification": True
    }
}

response = requests.post("http://localhost:3000/api/analyze/video", json=analysis_data)
analysis = response.json()
```

### Audio Enhancement

#### Audio Processing
- **Noise Reduction**: Remove background noise
- **Volume Normalization**: Balance audio levels
- **Audio Enhancement**: Improve audio quality
- **Voice Isolation**: Separate voice from background

#### Audio Enhancement Example
```python
# Enhance audio quality
enhancement_data = {
    "audio_id": asset['id'],
    "enhancement_type": "comprehensive",
    "parameters": {
        "noise_reduction": 0.8,
        "volume_normalization": True,
        "echo_removal": True,
        "voice_enhancement": True
    }
}

response = requests.post("http://localhost:3000/api/enhance/audio", json=enhancement_data)
```

## Collaboration

### Team Collaboration

#### User Management
- **Add Team Members**: Invite collaborators
- **Permission Levels**: Set access permissions
- **Activity Tracking**: Monitor project activity
- **Communication**: Built-in chat and comments

#### Collaboration Example
```python
# Invite team member
invite_data = {
    "project_id": project['id'],
    "email": "team@example.com",
    "role": "editor",
    "message": "Please help with this project"
}

response = requests.post("http://localhost:3000/api/collaboration/invite", json=invite_data)
```

### Real-time Collaboration

#### Live Editing
- **Simultaneous Editing**: Multiple users can edit together
- **Conflict Resolution**: Automatic conflict resolution
- **Live Preview**: See changes in real-time
- **Version Control**: Track all changes

#### Real-time Features
```python
# Enable real-time collaboration
collaboration_data = {
    "project_id": project['id'],
    "real_time": True,
    "auto_save": True,
    "conflict_resolution": "automatic"
}

response = requests.patch("http://localhost:3000/api/projects/collaboration", json=collaboration_data)
```

### Review and Feedback

#### Review System
- **Comments**: Add comments to specific elements
- **Annotations**: Highlight areas for review
- **Version Comparison**: Compare different versions
- **Approval Workflow**: Set up approval processes

#### Feedback Example
```python
# Add comment to project element
comment_data = {
    "project_id": project['id'],
    "element_id": "timeline_001",
    "comment": "This scene needs more color correction",
    "timestamp": "00:01:23",
    "user_id": "user123"
}

response = requests.post("http://localhost:3000/api/comments", json=comment_data)
```

## Export and Sharing

### Export Options

#### Video Export
- **Formats**: MP4, MOV, AVI, WebM
- **Resolutions**: 720p, 1080p, 4K
- **Frame Rates**: 24, 30, 60 fps
- **Quality Settings**: Low, Medium, High, Lossless

#### Image Export
- **Formats**: JPEG, PNG, WebP, SVG
- **Resolutions**: Various sizes available
- **Quality Settings**: Adjustable quality
- **Batch Export**: Export multiple images

#### Text Export
- **Formats**: TXT, DOCX, PDF, SRT
- **Subtitles**: SRT, VTT, ASS formats
- **Export Options**: Plain text, formatted text

### Sharing Options

#### Direct Sharing
- **Share Links**: Generate shareable links
- **Email Sharing**: Share via email
- **Social Media**: Share to social platforms
- **Embed Codes**: Get embed codes for websites

#### Platform Integration
- **YouTube**: Direct upload to YouTube
- **Vimeo**: Direct upload to Vimeo
- **Social Media**: Share to Instagram, TikTok, etc.
- **Cloud Storage**: Save to Google Drive, Dropbox, etc.

### Export Example
```python
# Export project with advanced settings
export_data = {
    "project_id": project['id'],
    "export_type": "video",
    "settings": {
        "format": "mp4",
        "resolution": "1920x1080",
        "frame_rate": 30,
        "bitrate": "8000k",
        "audio_codec": "aac",
        "audio_bitrate": "192k",
        "quality": "high",
        "include_metadata": True
    }
}

response = requests.post("http://localhost:3000/api/export/video", json=export_data)
export_job = response.json()
```

## Settings and Preferences

### Application Settings

#### General Settings
```python
# Update general settings
settings_data = {
    "general": {
        "language": "en",
        "theme": "dark",
        "auto_save": True,
        "backup_interval": 300,
        "default_resolution": "1920x1080"
    }
}

response = requests.patch("http://localhost:3000/api/settings/general", json=settings_data)
```

#### AI Settings
```python
# Configure AI settings
ai_settings = {
    "ai": {
        "default_model": "gemma3",
        "temperature": 0.7,
        "max_tokens": 1000,
        "auto_generate": True,
        "suggestions": True
    }
}

response = requests.patch("http://localhost:3000/api/settings/ai", json=ai_settings)
```

### Project Settings

#### Default Project Settings
```python
# Set default project settings
default_settings = {
    "default_project": {
        "resolution": "1920x1080",
        "frame_rate": 30,
        "duration": 300,
        "audio_channels": 2,
        "aspect_ratio": "16:9"
    }
}

response = requests.patch("http://localhost:3000/api/settings/default-project", json=default_settings)
```

### User Preferences

#### Interface Preferences
```python
# Customize interface
interface_settings = {
    "interface": {
        "toolbar_position": "top",
        "panel_layout": "horizontal",
        "timeline_style": "compact",
        "preview_size": "medium",
        "color_scheme": "dark"
    }
}

response = requests.patch("http://localhost:3000/api/settings/interface", json=interface_settings)
```

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

### Getting Help

#### Built-in Help
- **Help Menu**: Access help documentation
- **Keyboard Shortcuts**: View all shortcuts
- **Tutorial System**: Interactive tutorials
- **FAQ**: Frequently asked questions

#### Community Support
- **Discord**: Join our community server
- **GitHub**: Report issues and contribute
- **Documentation**: Read complete documentation
- **Support**: Contact support team

### System Requirements Check

```bash
# Run system check
storycore system check

# Verify dependencies
storycore dependencies check

# Check hardware compatibility
storycore hardware check
```

## Keyboard Shortcuts

### General Shortcuts
- **Ctrl+N**: New project
- **Ctrl+O**: Open project
- **Ctrl+S**: Save project
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+C**: Copy
- **Ctrl+V**: Paste

### Timeline Shortcuts
- **Space**: Play/Pause
- **Ctrl+B**: Split clip
- **Ctrl+J**: Join clips
- **Ctrl+D**: Duplicate clip
- **Delete**: Delete selected
- **Ctrl++**: Zoom in
- **Ctrl+-**: Zoom out

### AI Shortcuts
- **Ctrl+G**: Generate content
- **Ctrl+A**: Analyze content
- **Ctrl+E**: Enhance content
- **Ctrl+I**: Image generation
- **Ctrl+T**: Text generation

---

## Quick Reference

| Task | Shortcut | Description |
|------|----------|-------------|
| New Project | Ctrl+N | Create new project |
| Open Project | Ctrl+O | Open existing project |
| Save Project | Ctrl+S | Save current project |
| Play/Pause | Space | Preview timeline |
| Generate Content | Ctrl+G | Open AI generation |
| Export | Ctrl+Shift+E | Export project |

---

*For more information, see the [Complete Documentation](README.md).*