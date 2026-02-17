# 🎬 StoryCore-Engine
### The Self-Correcting Multimodal Production Pipeline

**From Script to Screen in Minutes — With  Visual Coherence**

![Hackathon 2026](https://img.shields.io/badge/Hackathon-2026-blue) ![Python](https://img.shields.io/badge/Python-3.9+-green) ![React](https://img.shields.io/badge/React-18+-blue) ![ComfyUI](https://img.shields.io/badge/ComfyUI-Ready-orange) ![Deterministic AI](https://img.shields.io/badge/Deterministic-AI-purple) ![Security](https://img.shields.io/badge/Security-Validated-green) ![Resilience](https://img.shields.io/badge/Resilience-Enterprise-blue)![Python](https://img.shields.io/badge/python-3.11+-blue)
![License](https://img.shields.io/github/license/zedarvates/StoryCore-Engine)
![Repo size](https://img.shields.io/github/repo-size/zedarvates/StoryCore-Engine)

---

![StoryCore-Engine Preview](assets/Screenshot%202026-02-15%20060825.png)

---

> **A Message from the Creator**
StoryCore is more than just a pipeline.
It’s a system that lets you control ComfyUI or other tools through add‑ons.
It helps you organize your entire workflow for video creation — from the written story, to the script, to the dialogue.
From 3D scene creation, to image generation, to text‑to‑image, to video, all the way to your cinematic work.
From long takes to individual shots, from visual planning to music.
From style to theme to genre — whatever you want to use.
Automation or semi‑automation powered by AI accelerates your entire creative process.

>The future of the internet? And of cinema? It’s on‑demand videos built according to people’s tastes. According to each customer. Directly on their TV. Basically, it’s instant, made‑to‑order cinema. But we’ll only really see that in five to ten years, I think.
For now, in any video you create, you have to tell a story. If it’s sloppy, meaningless content or just random life footage with no intention behind it, there’s no real reason for anyone to watch your video—except maybe for the emotional manipulation, where you’re really trying to influence the viewer’s mind

> I wanted to create a tool that modernizes long‑form video production without losing the soul of the craft. We start from the classic storyboard methods—the ones that shaped generations of creators—and we bring them into the present with the tools of our era.
>
> This isn't just another AI generator. It's a complete production pipeline: storyboard, visual coherence, narrative continuity, scene organization, character tracking, location consistency. The system remembers the entire project, just like a full team dedicated to artistic supervision.
>
> But above all, it respects the creators. The goal is not to replace artists, but to give them back time, freedom, and control. AI handles the repetitive tasks, while humans keep the vision, the emotion, and the direction. With this approach, a project that once required thirty people can now be handled by six to eight, allowing the rest of the team to focus on more creative, more human, and more meaningful work.
>
> And everything runs locally. Your data, your images, your scripts, your industrial secrets—everything stays on your machine. It's a sovereign tool, designed for studios, agencies, and independent creators who must protect their work. In a world where uploading a single file online is already a risk, I wanted to offer a safer, modern, and respectful alternative.
>
> In short, I wanted to build a bridge between yesterday and today: the rigor and poetry of traditional methods, combined with the speed and power of modern tools. A tool that accelerates production, secures your workflow, and frees creativity.

On top of all that, I’ve added an automated system for scientific checks.
If you’re working on documentaries, this can be extremely useful — or even for science‑fiction projects.
There are still a few adjustments to make to make the output a bit less strictly scientific, because right now it tends to be a little rigid on that part.
These refinements will be handled in future versions.

---

[![StoryCore Presentation Video](assets/Screenshot%202026-02-15%20060805.png)](https://www.youtube.com/watch?v=P0K7DueyICo)

---

## 📋 System Requirements

### Minimum Hardware
- **Display**: 1 screen, mouse, keyboard (microphone optional)
- **GPU**: NVIDIA RTX 3060 with 12GB VRAM (RTX 4070+ recommended)
- **RAM**: 32GB system memory
- **Storage**: ~500GB (includes ComfyUI models)
- **Software**: CUDA, PyTorch, Python 3.11+, latest GPU drivers

note : Be careful: even with an RTX 5060 and 32 GB of RAM — a fairly recent PC — generating a single image can take around 5 minutes. Generating a video can take anywhere from 15 to 30 minutes. Creating background music can take about 5 minutes.
As for dialogue generation, it will obviously depend on the length of the dialogue and the variables you apply. And on top of that, you might also add filters. As of right now, I’m not even sure if I’ve already integrated those filters into the user interface.

---
![StoryCore Interface](assets/Screenshot%202026-02-15%20060805.png)

![StoryCore Dashboard](assets/Screenshot%202026-02-15%20060909.png)

![StoryCore Editor](assets/Screenshot%202026-02-15%20060938.png)


---
## 🚀 Quick Start

> **New to the project?** Start with [START_HERE.md](START_HERE.md) for guided navigation based on your role.

### Prerequisites

**Required Components:**
- **Graphics Card** - Minimum RTX 3060 with 12GB VRAM (recommended RTX 4070+ for optimal performance)
- **ComfyUI** - For AI image/video generation (download from [comfyanonymous.github.io](https://comfyanonymous.github.io/ComfyUI_get/))

Key Info:

ComfyUI Desktop uses port 8000
Manual ComfyUI uses port 8188
Full guides: Quick Start | Desktop Setup



- **Ollama** - For local LLM processing (download from [ollama.com](https://ollama.com/))

Both tools run locally and keep all your data secure on your machine.

### Installation

```bash
# Clone the repository
git clone https://github.com/zedarvates/StoryCore-Engine.git
cd storycore-engine

# Install dependencies
pip install -r requirements.txt
npm install

# Run the application
python storycore.py
```

### Basic Usage

```bash
# Initialize a new project
python storycore.py init my-project

# Generate visual coherence grid
python storycore.py grid --project my-project

# Run the full pipeline
python storycore.py promote --project my-project
```

---

## ✨ Key Features

### Core Features
- **Visual Coherence System** - Master Coherence Sheet ensures consistent style across all frames
- **Story Builder System** - Master story ensures coherence across video projects
- **Self-Correcting Pipeline** - Automatic quality detection and fixing during generation
- **Deterministic Output** - Reproducible results with seed control
- **Complete Local Processing** - No cloud dependencies, all data stays on your machine
- **Production-Ready** - Security validation, error handling, and resilience patterns

### AI Integration
- **ComfyUI Integration** - Full support for ComfyUI Desktop (port 8000) and Manual (port 8188)
- **LLM Support** - Ollama integration for local LLM processing (Qwen, Gemma, etc.)
- **Image Generation** - NewBie, Qwen models via ComfyUI workflows
- **Video Generation** - HunyuanVideo, Wan Video integration
- **Audio Processing** - Dialogue generation, background music, audio effects

### Creative Tools
- **Wizard System** - Modular wizards for characters, locations, objects, scenes
- **Sequence Editor** - Video and audio timeline editing
- **Character Portraits** - AI-powered character generation with consistency
- **Camera Angles** - Camera movement planning and transitions
- **3D Scene Creation** - Integration with 3D tools for scene planning

### Add-on System
- **Extensible Architecture** - Control ComfyUI and other tools through add-ons
- **Custom Workflows** - Create and share custom ComfyUI workflows
- **Plugin Support** - Extend functionality with community plugins

---

## 🏗️ Architecture

```
📝 Input (Script/Prompt)
    ↓
🧠 Story Engine
    ├── LLM Processing (Ollama)
    ├── Scene Breakdown
    ├── Character Development
    └── Dialogue Generation
    ↓
🎨 Visual Planning
    ├── Visual Coherence Grid (ComfyUI)
    ├── Character Portraits
    ├── Location Design
    └── Shot Planning
    ↓
🎬 Production Pipeline
    ├── Image Generation (NewBie, Qwen, Flux)
    ├── Video Generation (HunyuanVideo, Wan Video)
    ├── Audio Generation (Music, Dialogue, Effects)
    └── Quality Check & Auto-fix
    ↓
📦 Export
    ├── Video Output (MP4, WebM)
    ├── Audio Tracks
    └── Project Files
```

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18+, TypeScript, Tailwind CSS, Electron, Vite |
| **Backend** | FastAPI, Python 3.11+, Pydantic, Uvicorn |
| **AI/ML** | ComfyUI, Ollama, PyTorch, CUDA, NumPy |
| **Video** | FFmpeg, HunyuanVideo, Wan Video, OpenCV |
| **Audio** | Custom audio processing, TTS integration, Audio remix engine |
| **3D** | Panda3D, Open3D, OpenGL (optional) |
| **Storage** | Local filesystem, SQLite, JSON |
| **State Management** | Zustand, Redux Toolkit |

### ComfyUI Integration Layer

**Production-Ready Features:**
- ✅ Advanced Workflows with 8+ AI Models
- ✅ Circuit Breaker for fault tolerance
- ✅ Fallback Chains for graceful degradation
- ✅ Error Analytics for monitoring
- ✅ Validated Performance Metrics
- ✅ WebSocket real-time communication
- ✅ Automatic retry with exponential backoff
- ✅ GPU memory management

**Supported Models:**

| Type | Models |
|------|--------|
| **Image Generation** | Flux, SDXL, NewBie, Qwen, Stable Diffusion |
| **Video Generation** | HunyuanVideo, Wan Video, LTX2 |
| **LLM** | Qwen, Gemma, Llama (via Ollama) |
| **Audio** | Custom TTS models, Music generation |

---
note : If you’re really in a hurry and you have Grok accounts, a Seeddance King account, and all the rest of that ecosystem — and if your video is just for testing and not a production at the peak of your capabilities — then it’s better to use those tools.
You can still rely on StoryCore to build the foundation, the story, and all that, because as of right now, they don’t yet have all the features I’ve added for creating long‑form videos. So you take the pre‑generated prompts from StoryCore, and you can run everything on their platform as your project progresses. That’s also a valid workflow.

---
## 🛡️ Error Handling & Resilience

StoryCore-Engine includes comprehensive error handling and resilience patterns for production reliability.

**Resilience Patterns:**
- Retry Mechanism with exponential backoff
- Circuit Breaker for fault tolerance
- Fallback Chains for graceful degradation
- Error Analytics for monitoring

---

## 📁 Project Structure

```
storycore-engine/
├── README.md                 # This file
├── storycore.py              # Main CLI entry point
├── backend/                  # FastAPI backend services
│   ├── main_api.py           # API server entry point
│   ├── llm_api.py            # LLM integration endpoints
│   ├── project_api.py        # Project management API
│   ├── video_editor_api.py   # Video editing endpoints
│   └── ...                   # Additional API modules
├── src/                      # Core engine modules
│   ├── grid_generator.py     # Visual coherence generation
│   ├── promotion_engine.py   # Content promotion pipeline
│   ├── qa_engine.py          # Quality assessment
│   ├── video_engine.py       # Video processing
│   ├── comfyui_manager.py    # ComfyUI integration
│   ├── narrative_engine.py   # Story processing
│   └── ...                   # Additional engine modules
├── creative-studio-ui/       # React/TypeScript frontend
├── workflows/                # ComfyUI workflow definitions
├── docs/                     # Documentation
├── documentation/            # Technical documentation
└── tests/                    # Test suite
```

---

## 🔧 Development

### Building the Application

**Production Build:**
```bash
# Build UI and Electron app
npm run build

# Package for distribution
npm run package:win   # Windows
npm run package:mac   # macOS
npm run package:linux # Linux
```

**Build Status:** ✅ All builds passing
- UI Build: ~8s
- Electron Build: Complete
- TypeScript: No errors
- Bundle Size: 1.38 MB (356 KB gzipped)

**For detailed build information, see:** [BUILD_REPORT.md](documentation/reports/BUILD_REPORT.md)


---

## 🎯 Future Roadmap

### 📊 Current Status (February 2026)

**Completed Features:**
- ✅ Visual Coherence System
- ✅ Story Builder System
- ✅ ComfyUI Integration (Desktop & Manual)
- ✅ Wizard System (Characters, Locations, Objects, Scenes)
- ✅ Sequence Editor
- ✅ LLM Integration (Ollama)
- ✅ Image Generation (Flux, SDXL, NewBie, Qwen)
- ✅ Video Generation (HunyuanVideo, Wan Video)
- ✅ Audio Processing & Dialogue Generation
- ✅ Add-on System
- ✅ Security Validation & Error Handling

### 📊 Visual Roadmap

| Phase | Feature | Status | Description |
|-------|---------|--------|-------------|
| **Q1 2026** | Image Generation Dialog Enhancement | 🔄 In Progress | Improved UI for image generation |
| **Q1 2026** | Dashboard Wizard Addon | 🔄 In Progress | Enhanced dashboard functionality |
| **Q1 2026** | Advanced Camera Movements | 🔜 Planned | Bezier curves and complex transitions |
| **Q2 2026** | Multi-format Export | 🔜 Planned | MP4 generation from video plans |
| **Q2 2026** | Performance Optimization | 🔜 Planned | Parallel processing and caching |
| **Q3 2026** | Collaborative Features | 📋 Backlog | Multi-user project management |
| **Q3 2026** | Plugin Architecture | 📋 Backlog | Custom engine extensions |
| **Q4 2026** | Cloud Deployment | 📋 Backlog | Scalable cloud infrastructure |
| **Q4 2026** | Real-time Monitoring | 📋 Backlog | Enhanced monitoring with alerting |
| **2027** | Multi-character Scenes | 📋 Backlog | Advanced scene composition |
| **2027** | Studio Integration | 📋 Backlog | Enterprise deployment and scaling |

### 📋 Milestone List

1. **v1.1.0** - Image Generation Dialog & Dashboard Enhancements (Q1 2026)
2. **v1.2.0** - Advanced Camera Movements & Transitions (Q1 2026)
3. **v1.3.0** - Multi-format Export (MP4) (Q2 2026)
4. **v1.4.0** - Performance Optimization (Q2 2026)
5. **v2.0.0** - Collaborative Features & Plugin Architecture (Q3-Q4 2026)

---

**Focus Areas for 2026:**
- 🎨 **UI/UX Improvements** - Enhanced wizards, better dialogs, improved accessibility
- ⚡ **Performance** - Faster generation, better caching, GPU optimization
- 🔌 **Extensibility** - Plugin system, custom workflows, API expansion
- 🤝 **Collaboration** - Multi-user support, project sharing, team features

---

## 📚 Documentation

### Getting Started
- [Quick Start Guide](documentation/user_guide/comfyui_integration/COMFYUI_QUICK_START.md) - ComfyUI setup in 2 minutes
- [Documentation Index](INDEX_DOCUMENTATION_COMPLETE.md) - 📑 **START HERE** - Complete documentation navigation
- [Quick Reference](QUICK_REFERENCE.md) - Common commands and workflows

### Build & Development
- [Build Success Summary](documentation/reports/BUILD_SUCCESS_SUMMARY.md) - ✅ Latest build status (Jan 23, 2026)
- [Build Report](documentation/reports/BUILD_REPORT.md) - Detailed build analysis and metrics
- [Release Notes](documentation/RELEASE_NOTES_2026_01_23.md) - Latest release information
- [Changelog](CHANGELOG.md) - Version history

### Technical Documentation
- [Technical Guide](documentation/TECHNICAL_GUIDE.md) - Architecture and implementation
- [API Reference](documentation/api_reference/README.md) - API documentation
- [Troubleshooting](documentation/TROUBLESHOOTING.md) - Common issues and solutions
- [Project Index](INDEX.md) - Complete project structure



---

## 🏅 Built for Hackathon 2026

**Team:** StoryCore-Engine Development Team  
**Duration:** 210+ hours  
**Focus:** Coherence-first, measurable multimodal pipeline  
**Result:** Production-ready system with professional interfaces

*Redefining how creators interact with multimodal AI through guaranteed visual coherence and autonomous quality control.*
