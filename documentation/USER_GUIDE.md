# User Guide - StoryCore Engine

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Main Features](#main-features)
5. [AI Assistant Prompt Examples](#ai-assistant-prompt-examples)
6. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is StoryCore Engine?

StoryCore Engine is a self-correcting multimodal video production platform that transforms your scripts into finished videos in minutes. Through AI and local processing, you get guaranteed visual coherence and complete data sovereignty.

### Key Features

- **100% Local Processing** - All your data stays on your machine
- **Visual Coherence** - Consistent style across all scenes
- **Self-Correcting Pipeline** - Guaranteed quality without manual intervention
- **Native ComfyUI Integration** - Optimized professional workflows

---

## Installation

### System Requirements

| Component | Minimum | Recommended |
|----------|---------|-------------|
| GPU | NVIDIA RTX 3060 (12GB VRAM) | RTX 4090+ |
| RAM | 32GB | 64GB |
| Storage | 500GB SSD | 1TB NVMe |
| OS | Windows 10/11 | Windows 11 |

### Installation Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/zedarvates/StoryCore-Engine.git
cd storycore-engine
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
npm install
```

#### 3. Install ComfyUI (Optional but Recommended)

```bash
# Download from https://github.com/comfyanonymous/ComfyUI
# Default port: 8188
```

#### 4. Launch the Application

```bash
# Electron Mode (Desktop Application)
python storycore.py

# OR in development mode
npm run dev
```

### Electron Application Installation

For the best experience, install the Electron version:

```bash
# Build the application
npm run build

# Create Windows package
npm run package:win
```

The executable will be available in `dist-electron/`

---

## Getting Started

### Creating a New Project

1. **Launch the application** → Home screen
2. **Click "New Project"**
3. **Configure your project**:
   - Project name
   - Genre (Fantasy, Sci-Fi, Horror, etc.)
   - Content type
4. **Validate** → Project created!

### User Interface

```
┌─────────────────────────────────────────────────────────────┐
│ Menu Bar: File | Edit | View | Project | Help               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │             │  │                                     │   │
│  │  Sidebar    │  │         Work Area                   │   │
│  │             │  │                                     │   │
│  │ - Projects  │  │  - Sequence Editor                  │   │
│  │ - Wizards   │  │  - Image Generation                 │   │
│  │ - Assets    │  │  - Video Editor                     │   │
│  │             │  │                                     │   │
│  └─────────────┘  └─────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Toolbar: Generate | Export | Settings                       │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
my_project/
├── characters/           # Generated characters
├── sequences/           # Video sequences
├── assets/              # Visual resources
├── output/              # Exported files
└── project.json         # Project metadata
```

---

## Main Features

### 1. Wizards (Assistants)

Wizards are guided assistants for creating specific elements:

| Wizard | Function | Quick Access |
|--------|----------|--------------|
| **Character Wizard** | Create characters | Menu → Wizards → Characters |
| **World Builder** | Build universes | Menu → Wizards → World |
| **Storyteller** | Generate sequences | Menu → Wizards → Sequences |
| **LipSync** | Lip synchronization | Menu → Wizards → LipSync |

### 2. Image Generation

- **Supported Models**: Flux, SDXL, NewBie, Qwen, HunyuanVideo, Wan Video
- **Visual Coherence**: Master coherence sheet
- **Auto-correction**: Automatic problem detection

### 3. Audio Processing

- **AI Dialogue**: Natural voice generation with emotional control
- **Background Music**: Automatic composition based on mood
- **Sound Effects**: Integrated SFX library

### 4. Sequence Editing

- **Timeline**: Professional video/audio editing
- **Transitions**: Dissolve, Wipe, Cut, etc.
- **Preview**: Real-time rendering

### 5. Add-on System

Extend functionality with add-ons:

```bash
# List available add-ons
storycore addon list

# Install an add-on
storycore addon install addon_name
```

---

## AI Assistant Prompt Examples

This section contains prompt examples for effectively using the StoryCore Engine AI assistant.

### 1. Character Creation

#### Character Description Generation

```
Create a character with the following characteristics:
- Name: Elena Shadowmend
- Archetype: The Mentor
- Role: Main protagonist

Personality Profile (Big Five Model 0-1 scale):
- Openness: 0.85 (creative, curious)
- Conscientiousness: 0.90 (organized, disciplined)
- Extraversion: 0.60 (sociable but thoughtful)
- Agreeableness: 0.75 (cooperative, empathetic)
- Neuroticism: 0.30 (calm, emotionally stable)

Main traits: intelligent, loyal, mysterious
Genre: Fantasy
Tone: Epic
```

#### Dialogue Generation

```
Write a dialogue for this character in this situation:

Character: Elena Shadowmend
Archetype: The Mentor

Profile:
- Extraversion: 0.60 | Agreeableness: 0.75
- Neuroticism: 0.30 | Openness: 0.85

Communication style: Direct but diplomatic
Situation: She discovers her apprentice has betrayed her
Emotional state: Shock, disappointment, but self-controlled

The dialogue should reveal her personality through her word choice and rhythm.
```

### 2. World Building

#### Creating a Fantasy Universe

```
Generate a world with these parameters:

Genre: Fantasy
Type: High Fantasy
Scale: Large (entire world)
Technology level: Medieval with magic
Atmosphere: Epic and mysterious

The world must include:
- Varied geography (mountains, forests, deserts)
- At least 3 distinct societies
- Coherent magic system
- Distinctive visual palette
- Potential central conflict
```

#### Extraction from Text

```
Extract world elements from this text:

"In the shadowed valleys of Eldoria, where crystal spires pierced the 
eternal mist, the elf-lord Elandor ruled from his floating citadel. 
The ancient magic flowed through ley lines of pure diamond, powering 
the great forges where star-metal was crafted into legendary blades."

Identify:
- Locations
- Magical/technological elements
- Society and culture
- General atmosphere
```

### 3. Sequence Generation

#### Sequence Planning

```
Generate a video sequence for this scene:

Scene: "The hero discovers the legendary sword"
Genre: Epic Fantasy
Duration: 15-30 seconds
Format: 16:9

Elements to include:
- Opening shot (establishing shot)
- Discovery moment
- Hero's emotional reaction
- Closing shot (transition)

Visual style: Epic, dramatic, warm colors
Suggested music: Orchestral, building up
```

#### Shot Description

```
Describe this shot for image generation:

Shot: Emotional close-up
Character: Elena, expressions of surprise and wonder
Moment: She touches the sword for the first time
Lighting: Mysterious golden light coming from the sword
Composition: Character in foreground third, sword in center
Atmosphere: Revelation, magical moment

Format: Portrait 9:16 for social media
```

### 4. Scripts and Dialogues

#### Dialogue Writing

```
Write the following dialogue:

Characters:
- ALEX (protagonist, 25 years old, stubborn investigator)
- SARAH (ally, 28 years old, sarcastic hacker)

Situation: They discover their contact has been eliminated
Tension: Rising
Tone: Dark, humorous at times

Context: In a shady cybercafé in a futuristic city
```

#### Script Analysis

```
Analyze this script for narrative coherence:

[Script to analyze]

Provide:
- Narrative structure (acts, beats)
- Character consistency
- Pacing and rhythm
- Tension points
- Improvement suggestions
```

### 5. Audio Content Generation

#### Music Description

```
Generate a description for a music track:

Type: Background music for action scene
Genre: Sci-Fi
Atmosphere: Rising tension, approaching danger
Duration: 60 seconds
Emotion: Urgency, determination

Include:
- Suggested instruments
- Tempo and rhythm
- Structure (intro, development, climax)
- Recommended transition
```

### 6. Quality Control

#### Consistency Check

```
Check consistency of these elements:

Characters:
- Marc: described as having green eyes in scene 1
- In scene 3: "his hazel eyes"

Environment:
- Scene 1: Dark and dangerous forest
- Scene 2: Description mentions "bright sunshine"

Time:
- Scene 1: Morning
- Scene 3: Character talks about "sunset"

Identify inconsistencies and propose corrections.
```

### 7. Prompt Optimization

#### Prompt Improvement

```
Optimize this prompt for image generation:

Original prompt: "a beautiful woman warrior"

Improve by:
- Adding specific visual details
- Defining artistic style
- Specifying lighting and atmosphere
- Adding composition elements
```

### 8. Special Commands

#### Project Creation from Prompt

```
Create a complete project from this idea:

"A team of scientists discovers alien technology 
in the ruins of an ancient civilization. They must 
escape a corporation that wants to claim the discovery."

Include:
- Project name
- Genre and sub-genre
- List of main characters
- Act structure
- Recommended generation parameters
```

#### Export and Transformation

```
Transform this project to a different format:

Project: "my_fantasy_project"
Current format: StoryCore JSON

Options:
- PDF export with images
- Markdown export for documentation
- MP4 video export (with generated assets)
```

---

## Troubleshooting

### Common Issues

#### Application won't start

**Solutions**:
1. Verify Python 3.11+ is installed: `python --version`
2. Reinstall dependencies: `pip install -r requirements.txt`
3. Check logs in `logs/`

#### ComfyUI connection error

**Solutions**:
1. Verify ComfyUI is running
2. Check the port (default: 8188)
3. Update configuration in Settings → ComfyUI

#### Image generation problems

**Solutions**:
1. Check available GPU memory
2. Reduce generation resolution
3. Use a lighter model

#### Project won't save

**Solutions**:
1. Check write permissions
2. Enough disk space?
3. Try administrator mode

### Key Shortcuts

| Action | Shortcut |
|--------|----------|
| New project | Ctrl+N |
| Open project | Ctrl+O |
| Save | Ctrl+S |
| Generate | Ctrl+G |
| Export | Ctrl+E |
| Settings | Ctrl+, |
| Full screen | F11 |

### Getting Help

- **Online documentation**: Menu → Help → Documentation
- **Report a bug**: Menu → Help → Report Issue
- **Check for updates**: Menu → Help → Updates

---

## Glossary

| Term | Definition |
|------|------------|
| **Wizard** | Guided assistant for creating specific elements |
| **Coherence Sheet** | Document defining the project's visual style |
| **Pipeline** | Complete generation workflow |
| **Shot** | Individual video shot |
| **Sequence** | Set of shots forming a scene |
| **Asset** | Visual or audio resource |
| **Add-on** | Extension adding functionality |

---

## Appendix: Advanced Configuration

### Environment Variables

```bash
# ComfyUI Configuration
export COMFYUI_PORT=8188
export COMFYUI_HOST=localhost

# LLM Configuration
export OLLAMA_HOST=localhost:11434
export DEFAULT_MODEL=llama3

# Paths
export STORYCORE_PROJECTS=./projects
export STORYCORE_CACHE=./cache
```

### Configuration File

Create `config/storycore.json`:

```json
{
  "comfyui": {
    "host": "localhost",
    "port": 8188
  },
  "llm": {
    "provider": "ollama",
    "default_model": "llama3"
  },
  "projects": {
    "default_path": "./projects",
    "auto_save": true,
    "auto_save_interval": 300
  }
}
```

---

**Version**: 1.0.0  
**Last Updated**: 2026  
**StoryCore Engine** - From Script to Screen in Minutes

