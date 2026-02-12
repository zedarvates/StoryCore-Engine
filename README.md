# 🎬 StoryCore-Engine
### The Self-Correcting Multimodal Production Pipeline

**From Script to Screen in 5 Minutes — With  Visual Coherence**

![Hackathon 2026](https://img.shields.io/badge/Hackathon-2026-blue) ![Python](https://img.shields.io/badge/Python-3.9+-green) ![React](https://img.shields.io/badge/React-18+-blue) ![ComfyUI](https://img.shields.io/badge/ComfyUI-Ready-orange) ![Deterministic AI](https://img.shields.io/badge/Deterministic-AI-purple) ![Security](https://img.shields.io/badge/Security-Validated-green) ![Resilience](https://img.shields.io/badge/Resilience-Enterprise-blue)

---

> **A Message from the Creator**
>
> I wanted to create a tool that modernizes long‑form video production without losing the soul of the craft. We start from the classic storyboard methods—the ones that shaped generations of creators—and we bring them into the present with the tools of our era.
>
> This isn't just another AI generator. It's a complete production pipeline: storyboard, visual coherence, narrative continuity, scene organization, character tracking, location consistency. The system remembers the entire project, just like a full team dedicated to artistic supervision.
>
> But above all, it respects the creators. The goal is not to replace artists, but to give them back time, freedom, and control. AI handles the repetitive tasks, while humans keep the vision, the emotion, and the direction. With this approach, a project that once required thirty people can now be handled by six to eight, allowing the rest of the team to focus on more creative, more human, and more meaningful work.
>
> And everything runs locally. Your data, your images, your scripts, your industrial secrets—everything stays on your machine. It's a sovereign tool, designed for studios, agencies, and independent creators who must protect their work. In a world where uploading a single file online is already a risk, I wanted to offer a safer, modern, and respectful alternative.
>
> In short, I wanted to build a bridge between yesterday and today: the rigor and poetry of traditional methods, combined with the speed and power of modern tools. A tool that accelerates production, secures your workflow, and frees creativity.

---
i know they are a lot of problems in the UI but i can do more in time for the competition 
---------------------------------------------------------------------------------------
you must
---------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------

SETUP FOR THE USER:

win11:

1. Install Ollama:
2. Install ComfyUI desktop CORS and enable it ( others may not work actually )
3. Install StoryCore with the setup
4. Launch ComfyUI on port 8000 with CORS * and install the correction flow plugin, enable automatic model download, and if possible, download the models in advance
5. Launch StoryCore

---------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------

Minimal Hardware:

1 screen, 1 mouse, 1 keyboard, optionnal microphone 
GPU : 3060 12 go rtx 
cuda / pytorch / pythons (3.11 +) / drivers / ....
Pc ram : 32 go
Espace disque : need to be defined but more or less  500GO with models in comfyui

---------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------

In the Future Roadmaps :

MCP ui render in the storycore assistant
Upscalling Boutons in the user's UI
Embedded Boutons  in the user's UI
Regenerated Boutons assets by selection 
Brutal AI images corrections ( paint tool )
World API (3d scene construction with one image)
3d characters puppet 
3d assets 
3d video Sprites for Anime
Characters pose en "cliché" bank 
Auto asset generators 
Auto real photo exploitations 
Clawdbot facilitator (reduces capacity consumption, quickest as possible, skills, logics integrations)
Your Second Brain Obsidian inspiration to story
Community Bank Assets 
Layerings optimization (statics and animed)
Video loop optimizations (First and last images with auto caption, first frame and last frame)

Fixes and Ameliorations : mixing audio video and story , workfows , goal user identification, improve  fact checker, UI...... more comfyui workflows like 1st image to end image flux.2 Klein, add more possibilities in user UI allready in scripted in .py


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
git clone https://github.com/yourusername/storycore-engine.git
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

- **Visual Coherence System** - Master Coherence Sheet ensures consistent style across all frames
- **Story builder System** - Master story ensures  coherences across video
- **Self-Correcting Pipeline** - Automatic quality detection and fixing during generation
- **Deterministic Output** - Reproducible results with seed control
- **Complete Local Processing** - No cloud dependencies, all data stays on your machine
- **Production-Ready** - Security validation, error handling, and resilience patterns

---

## 🏗️ Architecture

```
📝 Input (Script/Prompt)  → 🧠 Text Engine (Scene Breakdown + Shot Planning)
    ↓
🧠 LLM Processing (Ollama) → Scene Breakdown
    ↓
🎨 Visual Coherence Grid (ComfyUI) 🔀 Workflow Selection (Basic/Advanced)
    ↓
⚡ Quality Check & Auto-fix
    ↓
🔧 AutofixEngine (Parameter Adjustment + Re-processing Loop)
    ↓
🎬 Video Planning (Camera Movements + Transitions)
    ↓    
🎬 Video Generation (HunyuanVideo, Wan Video) | 🖼️ Image Generation (NewBie, Qwen)
    ↓
📦 Export Ready Output
```

ComfyUI Integration Layer (Production-Ready)

Advanced Workflows ( + 8 AI Models)
Data Flow & Performance
Validated Performance Metrics
Circuit Breaker
Fallback Chains
Graceful Degradation
Error Analytics

---
🛡️ Error Handling & Resilience
StoryCore-Engine includes comprehensive error handling and resilience patterns for production reliability.
Resilience Patterns
Retry Mechanism

## 📁 Project Structure

```
storycore-engine/
├── README.md              # This file
├── storycore.py           # Main CLI entry point
├── src/                   # Core engine modules
│   ├── grid_generator.py  # Visual coherence generation
│   ├── promotion_engine.py
│   ├── qa_engine.py       # Quality assessment
│   └── ...
├── creative-studio-ui/    # React/TypeScript UI
├── workflows/             # ComfyUI workflows
├── docs/                  # Documentation
└── tests/                 # Test suite
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

**For detailed build information, see:** [BUILD_REPORT.md](BUILD_REPORT.md)


---

## 🎯 Future Roadmap (Post-Launch Enhancements)
Future Enhancements

Advanced Camera Movements: Bezier curves and complex transitions
Multi-format Export: MP4 generation from video plans
Collaborative Features: Multi-user project management
Performance Optimization: Parallel processing and caching
Plugin Architecture: Custom engine extensions
Cloud Deployment: Scalable cloud infrastructure
Real-time Monitoring Dashboard: Enhanced monitoring with alerting
Multi-character Scenes: Advanced scene composition
Professional Studio Integration: Enterprise deployment and scaling

---

## 📚 Documentation

### Getting Started
- [Quick Start Guide](docs/COMFYUI_QUICK_START.md) - ComfyUI setup in 2 minutes
- [Documentation Index](DOCUMENTATION_INDEX.md) - 📑 **START HERE** - Complete documentation navigation
- [Quick Reference](QUICK_REFERENCE.md) - Common commands and workflows

### Build & Development
- [Build Success Summary](BUILD_SUCCESS_SUMMARY.md) - ✅ Latest build status (Jan 23, 2026)
- [Build Report](BUILD_REPORT.md) - Detailed build analysis and metrics
- [Test Fixes](FIX_TESTS.md) - Test improvements and known issues
- [TODO List](TODO.md) - Master TODO and task tracking
- [Release Notes](RELEASE_NOTES_2026_01_23.md) - Latest release information
- [Changelog](CHANGELOG.md) - Version history

### Technical Documentation
- [Technical Guide](documentation/TECHNICAL_GUIDE.md) - Architecture and implementation
- [API Reference](documentation/api/) - API documentation
- [Troubleshooting](documentation/TROUBLESHOOTING.md) - Common issues and solutions
- [Project Index](INDEX.md) - Complete project structure




---
🏅 Built for Hackathon 2026
Team: StoryCore-Engine Development Team
Duration: + 210 hours
Focus: Coherence-first, measurable multimodal pipeline
Result: Production Marquette-ready system with interfaces

Redefining how creators interact with multimodal AI through guaranteed visual coherence and autonomous quality control.
