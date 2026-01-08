# StoryCore-Engine (v1.0-hackathon)

**A coherence-first, measurable multimodal pipeline for cinematic storyboarding.**

## 🎯 Key Features

- **Grid Anchoring** - Visual consistency through structured panel generation
- **Narrative Style Anchoring** - Semantic consistency with global style extraction
- **Automated QA with Sharpness Metrics** - Measurable quality scoring and validation
- **Video Planning Engine** - Camera movements and transition planning
- **Standalone HTML Dashboard & Export System** - Complete project visualization and packaging

## 🚀 Quick Start

```bash
# Initialize new project
python3 storycore.py init my-project

# Generate grid and panels
python3 storycore.py grid --project my-project

# Upscale panels
python3 storycore.py promote --project my-project

# Apply enhancement filters
python3 storycore.py refine --project my-project

# Process narrative consistency
python3 storycore.py narrative --project my-project

# Generate video production plan
python3 storycore.py video-plan --project my-project

# Run quality assurance
python3 storycore.py qa --project my-project

# Export complete package
python3 storycore.py export --project my-project

# Generate interactive dashboard
python3 storycore.py dashboard --project my-project
```

## 🏗️ Architecture

**Modular Python Design** with **Data Contract v1** for pipeline consistency:

- **Project Manager** - Initialization and schema compliance
- **Grid Generator** - Visual anchoring and panel slicing
- **Promotion Engine** - Image upscaling with quality metrics
- **Refinement Engine** - Enhancement filters with sharpness tracking
- **Narrative Engine** - Style extraction and prompt augmentation
- **Video Plan Engine** - Camera movement inference and transition planning
- **QA Engine** - Multi-category scoring and validation
- **Dashboard & Export** - Visualization and packaging systems

## 🛠️ Tech Stack

- **Python 3.x** - Core pipeline
- **PIL (Pillow)** - Image processing
- **JSON** - Data contracts and project state
- **HTML/CSS/JS** - Standalone dashboard

## 📊 Data Contract v1

Each project maintains:
- **Schema Version** - Version tracking (`1.0`)
- **Capabilities** - Feature flags for pipeline steps
- **Generation Status** - Progress tracking (`pending` | `done` | `failed` | `passed`)

## 🎬 Pipeline Flow

```
Init → Grid → Promote → Refine → Narrative → Video Plan → QA → Export/Dashboard
```

Each step updates project capabilities and status for full traceability.

---

*Built for hackathon speed with production-ready architecture.*
