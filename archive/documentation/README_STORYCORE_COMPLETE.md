# 🎬 StoryCore-Engine - Complete AI Content Generation System

**Hackathon 2026 - Multimodal AI Content Generation Platform**

StoryCore-Engine is a complete AI-powered content generation system that combines image and video generation capabilities with an intuitive user interface and automated workflow management.

## 🌟 Features

### 🎨 AI Content Generation
- **FLUX.2 Image Generation** - High-quality image synthesis
- **LTX-2 Video Generation** - Advanced video creation with motion
- **Real-time Generation** - Live progress tracking and status updates
- **Customizable Parameters** - Full control over generation settings

### 🔧 Technical Infrastructure
- **ComfyUI Backend** - Powerful workflow execution engine
- **REST API** - Programmatic access to all features
- **React UI** - Modern, responsive user interface
- **Automated Model Management** - Automatic downloading and verification

### 📊 System Monitoring
- **Health Checks** - Real-time service monitoring
- **Queue Management** - Generation job tracking
- **Performance Metrics** - System status and analytics
- **Error Handling** - Robust failure recovery

### 🎭 Interactive Wizards (14 Powerful Wizards)

#### 🎬 Content Creation Wizards
- **EditForge** - Professional video montage creation with intelligent transitions *(New Revolutionary)*
- **PanelForge** - Transform comic panels into cinematic sequences *(New Revolutionary)*
- **SonicCrafter** - Complete audio production planning *(New)*
- **Storyboard Creator** - AI-generated visual storyboards
- **Shot Reference Wizard** - AI-generated visual references for shots
- **Style Transfer** - Apply consistent visual styles

#### 👥 Character & Story Wizards
- **Character Wizard** - AI-assisted character creation with detailed profiles
- **Dialogue Wizard** - Professional dialogue scene generation with emotional depth
- **World Builder** - Immersive world creation with validation

#### 🎯 Production Wizards
- **Shot Planning Wizard** - Cinematic shot planning with camera specifications
- **Project Wizard** - Guided project setup with story generation
- **Ghost Tracker Advisor** - AI project analysis and optimization *(New)*

#### 🚀 Marketing & Analysis Wizards
- **ViralForge** - Viral marketing campaign creation *(New Revolutionary)*
- **Roger Data Extractor** - Intelligent text data extraction *(New)*

#### 🤖 AI Assistant Integration
- **StoryCore Assistant** - Conversational AI controlling all wizards *(Enhanced)*
- **Intelligent Workflows** - Automated wizard chaining and suggestions
- **How-To Guides** - Integrated learning system for all wizards
- **Enhanced Validation** - Intelligent error messages and suggestions

### 🎯 Revolutionary New Wizards

#### 🎬 EditForge - Professional Video Montage
```bash
storycore video-editor-wizard --style cinematic
storycore video-editor-wizard --preview
storycore video-editor-wizard --export-timeline --export-settings
```
- **Intelligent Transitions**: Cinematic dissolves, cuts, wipes based on content
- **Audio Synchronization**: Perfect sync with SonicCrafter audio plans
- **Professional Exports**: DaVinci Resolve, Premiere Pro compatible
- **Quality Metrics**: Rhythm consistency, transition coverage analysis

#### 🚀 ViralForge - Viral Marketing Campaigns
```bash
storycore marketing-wizard --strategy entertaining --platforms youtube tiktok instagram
storycore marketing-wizard --preview
storycore marketing-wizard --export-assets --export-strategy
```
- **Multi-Platform Optimization**: YouTube, TikTok, Instagram, Twitter, Facebook
- **Viral Strategies**: Educational, Entertaining, Emotional, Trending, Humorous
- **AI-Generated Content**: Thumbnails, descriptions, social posts, trailers
- **Performance Analytics**: Viral potential scoring, reach estimation

#### 🎭 PanelForge - Comic to Cinematic Sequences
```bash
storycore comic-to-sequence-wizard image.jpg --style american_comics
storycore comic-to-sequence-wizard image.jpg --export-shot-planning --export-storyboard
```
- **Comic Analysis**: Automatic panel detection and content extraction
- **Cinematic Conversion**: Panel layouts to professional shot planning
- **Multi-Format Support**: American Comics, Manga, European Comics, Graphic Novels
- **Storyboard Generation**: Complete cinematic sequences from BD pages

#### 🎵 SonicCrafter - Complete Audio Production
```bash
storycore audio-production-wizard
storycore audio-production-wizard --export-script --export-music-cues
```
- **Intelligent Audio Planning**: Voice overs, SFX, music cues based on shots
- **Professional Standards**: Broadcast-quality specifications
- **Mood-Based Generation**: Dramatic, tense, peaceful, energetic audio palettes
- **Complete Workflow**: From planning to final mix specifications

### 🤖 Enhanced StoryCore Assistant

The AI Assistant now controls all wizards with conversational intelligence:

```bash
# Natural language control
"Analyze my project" → Runs Ghost Tracker
"Create a character" → Launches Character Wizard
"Make it viral" → Opens ViralForge
"Transform this comic" → Uses PanelForge
```

#### 🧠 Intelligent Features
- **Wizard-Specific Announcements**: Detailed explanations for each wizard
- **Workflow Suggestions**: Automatic next-step recommendations
- **How-To Guides**: Integrated learning for all wizards
- **Contextual Help**: Personalized assistance based on project state
- **File Processing**: Direct upload and processing of documents

#### 🎨 Enhanced User Experience
- **Conversational Interface**: Natural language commands
- **Visual Suggestions**: Interactive buttons for wizard actions
- **Progress Tracking**: Real-time wizard execution status
- **Error Recovery**: Intelligent troubleshooting and fixes

## 🚀 Quick Start

### Option 1: Complete System (Recommended)

Start everything with a single command:

```bash
python start_storycore_complete.py
```

This will automatically:
1. ✅ Start ComfyUI backend
2. 🌐 Start StoryCore API server
3. ⚛️ Start React UI development server
4. 🌐 Open browser to the interface

### Option 2: Individual Components

#### Start ComfyUI + API Only
```bash
python tools/comfyui_installer/start_storycore_api.py
```

#### Start React UI Only
```bash
cd creative-studio-ui
npm install
npm start
```

#### Manual Model Download
```bash
python src/auto_model_downloader.py
```

#### ComfyUI Update and Maintenance
```bash
# Check current ComfyUI version
python tools/comfyui_installer/update_comfyui_simple.py --version

# Update ComfyUI (recommended - follows official docs)
python tools/comfyui_installer/update_comfyui_simple.py

# Advanced maintenance menu
python tools/comfyui_installer/update_comfyui_integrated.py --menu

# Other maintenance options
python tools/comfyui_installer/update_comfyui_integrated.py --check    # Check for updates
python tools/comfyui_installer/update_comfyui_integrated.py --verify   # Verify installation
```

## 📱 User Interface

### React Application (http://localhost:3000)

The modern React interface provides:

#### 🖼️ Image Generation (FLUX.2)
- Prompt and negative prompt input
- Resolution control (256-2048px)
- Quality parameters (steps, CFG scale, seed)
- Real-time generation status
- Image gallery with download options

#### 🎬 Video Generation (LTX-2)
- Temporal prompt description
- Frame count and resolution settings
- Motion and camera control parameters
- Video preview and download
- Generation progress tracking

#### 📊 Dashboard Features
- Service health monitoring
- Active job status
- Generation queue management
- System performance metrics
- **Scene Plan Editing** - Edit video plans with live JSON database persistence *(New)*

#### 🔧 System Maintenance (UI Controls)
- **🔄 Update ComfyUI Portable** - Direct update from interface
- **🔄 Restart Services** - Restart ComfyUI and API servers
- **📋 Command Instructions** - Step-by-step terminal commands
- **⚡ Real-time Status** - Update progress and system status

### Technical Dashboard (storycore-dashboard-demo.html)

Legacy HTML dashboard with:
- Master Coherence Sheet visualization
- QA metrics display
- Manual controls and testing
- System status indicators
- **🔄 ComfyUI Update Button** - Direct access to update functionality
- **🎬 Scene Plan Editor** - Edit video plans with live JSON persistence *(New)*

#### Scene Plan Editing *(New Feature)*
The dashboard now includes a powerful **Scene Plan Editor** accessible via the "Plans Scène" tab:

**Features:**
- **Interactive Plan Editing**: Modify scene titles, camera movements, durations, transitions
- **Real-time Statistics**: Live updates showing total scenes, duration, camera movements, transitions
- **Add/Remove Scenes**: Dynamic plan modification with automatic ID management
- **JSON Database Persistence**: All changes saved immediately to `video_plan.json` files
- **Project Integration**: Automatic updates to project metadata and capabilities

**How to Use:**
1. Open dashboard: `storycore-dashboard-demo.html`
2. Click "Plans Scène" tab in the navigation
3. Edit existing scenes or click "Ajouter Scène" to add new ones
4. Modify parameters: title, camera movement, duration, transition, description
5. Click "Sauvegarder" to persist changes to JSON database
6. Changes are immediately saved to the project's `video_plan.json` file

**API Integration:**
- `GET /projects/{id}/video-plan` - Retrieve current plan
- `PUT /projects/{id}/video-plan` - Save plan changes
- `POST /projects/{id}/video-plan/generate` - Generate plan from storyboard
- Automatic file persistence with error handling

## 🔧 API Reference

### Base URL: `http://localhost:8000`

#### Health Check
```http
GET /health
```

#### List Workflows
```http
GET /workflows
```

#### Generate Image
```http
POST /generate/image
Content-Type: application/json

{
  "prompt": "A beautiful mountain landscape...",
  "negative_prompt": "blurry, low quality...",
  "width": 1024,
  "height": 1024,
  "steps": 20,
  "cfg_scale": 3.5,
  "seed": -1
}
```

#### Generate Video
```http
POST /generate/video
Content-Type: application/json

{
  "prompt": "Camera slowly zooms in on mountains...",
  "negative_prompt": "static, frozen...",
  "width": 768,
  "height": 512,
  "frames": 25,
  "steps": 25,
  "cfg_scale": 3.0,
  "seed": -1
}
```

#### Check Job Status
```http
GET /job/{job_id}
```

#### Queue Status
```http
GET /queue
```

## 🎭 Interactive Wizards

StoryCore Engine includes powerful interactive wizards to guide you through complex content creation tasks.

### Available Wizards

#### Project Initialization Wizard
```bash
storycore init                    # Interactive project setup
storycore init "My Project"       # Quick project creation
```

**Features:**
- Guided project setup with validation
- Automatic story generation (optional)
- Format selection with duration constraints
- Genre-based style recommendations

#### Character Creation Wizard
```bash
storycore character-wizard        # Interactive character creation
```

**Features:**
- Personality trait selection
- Background story generation
- Visual profile creation
- Character consistency validation

#### Dialogue Generation Wizard *(New)*
```bash
storycore dialogue-wizard --quick --characters Alice Bob --topic "conflict"
storycore dialogue-wizard --interactive
```

**Features:**
- Character voice profiling
- Multiple dialogue purposes (exposition, conflict, development)
- Professional screenplay formatting
- Emotional depth enhancement

#### World Building Wizard
```bash
storycore world-wizard           # Interactive world creation
```

**Features:**
- Systematic world construction
- Cultural element generation
- Rule and constraint definition
- Location interconnectivity

### Enhanced Validation System

All wizards now include intelligent validation with:

- **Smart Error Messages**: Clear explanations of validation failures
- **Contextual Suggestions**: Actionable fixes for common issues
- **Cross-field Validation**: Relationship checking between form fields
- **Progressive Disclosure**: Show relevant options as you progress

**Example Validation Messages:**
```
❌ Project name contains invalid characters (< > : " / \ | ? *)
💡 Suggestion: Use only letters, numbers, spaces, hyphens, and underscores

❌ Field 'duration' requires 'format' to be filled first
💡 Suggestion: Fill in the 'format' field first

⚠️ For horror genre, consider using 'dark', 'tense', or 'frightening' tones
💡 Suggestion: Try 'dark' or 'tense' for better horror atmosphere
```

### Wizard API Integration

Wizards can be integrated programmatically:

```python
from wizard.enhanced_validation import validate_wizard_form
from wizard.dialogue_wizard import generate_quick_dialogue

# Validate wizard data
result = validate_wizard_form("project_init", project_data)
if not result.is_valid:
    for error in result.errors:
        print(f"❌ {error.message}")

# Generate dialogue
scene = generate_quick_dialogue(["Alice", "Bob"], "family discussion")
print(scene.dialogue_lines)
```

### Documentation

Complete wizard documentation is available in:
- `documentation/guides/WIZARDS_GUIDE.md` - Comprehensive user guide
- `WIZARD_ENHANCEMENTS_README.md` - Technical implementation details

### Development

Wizards follow a modular architecture for easy extension:

```python
# Create new wizard
src/wizard/
├── my_wizard.py              # Wizard logic
├── test_my_wizard.py         # Unit tests
└── ...

# CLI handler
src/cli/handlers/my_wizard.py

# Validation rules
# Automatically integrated via enhanced_validation.py
```

## 🔄 ComfyUI Update & Maintenance System

### Official Documentation Compliance
All update scripts follow the **official ComfyUI documentation** at:
https://docs.comfy.org/installation/update_comfyui

### Update Scripts Available

#### Primary Update Script (Recommended)
```bash
# Simple, reliable update following official docs
python tools/comfyui_installer/update_comfyui_simple.py

# Features:
# ✅ Git pull for latest changes
# ✅ Automatic requirements update
# ✅ Stash local changes safely
# ✅ Version verification
# ✅ Follows official ComfyUI update guide
```

#### Advanced Maintenance Script
```bash
# Interactive menu with multiple options
python tools/comfyui_installer/update_comfyui_integrated.py --menu

# Available options:
# • Check for updates
# • Update with backup
# • Update without backup
# • Create manual backup
# • Verify installation
# • Check version
# • Interactive maintenance menu
```

#### Command Line Options
```bash
# Check current version
python tools/comfyui_installer/update_comfyui_integrated.py --version

# Check for available updates
python tools/comfyui_installer/update_comfyui_integrated.py --check

# Update with automatic backup
python tools/comfyui_installer/update_comfyui_integrated.py --update --backup

# Verify ComfyUI installation
python tools/comfyui_installer/update_comfyui_integrated.py --verify
```

### User Interface Integration

#### React UI System Maintenance Panel
The modern React interface includes a dedicated **System Maintenance** section:

**🔧 System Maintenance Controls:**
- **🔄 Update ComfyUI Portable** - Direct update from UI
- **🔄 Restart Services** - Restart all StoryCore services
- **📋 Command Instructions** - Step-by-step terminal guidance
- **⚡ Status Display** - Real-time update progress

**How to Access:**
1. Open React UI: `http://localhost:3000`
2. Go to Image/Video generation tab
3. Scroll to "🔧 System Maintenance" section
4. Click desired maintenance button

#### Technical Dashboard Update Button
The HTML dashboard includes a **ComfyUI Update** button in the system status section.

### Update Process Workflow

#### Automatic Update Process:
1. **🔍 Pre-flight Checks** - Verify ComfyUI installation
2. **💾 Stash Changes** - Save any local modifications
3. **📥 Git Pull** - Download latest ComfyUI version
4. **📦 Update Requirements** - Install new Python dependencies
5. **✅ Verification** - Confirm successful update
6. **🔄 Service Restart** - Restart ComfyUI and API services

#### Safety Features:
- **Backup Creation** (optional) - Preserve current installation
- **Change Stashing** - Protect local modifications
- **Rollback Capability** - Restore from backup if needed
- **Version Verification** - Confirm successful update

### Maintenance Best Practices

#### Regular Updates:
```bash
# Weekly update check
python tools/comfyui_installer/update_comfyui_integrated.py --check

# Monthly full update
python tools/comfyui_installer/update_comfyui_simple.py
```

#### Before Major Updates:
```bash
# Create backup
python tools/comfyui_installer/update_comfyui_integrated.py --backup

# Update with backup
python tools/comfyui_installer/update_comfyui_integrated.py --update --backup
```

#### Troubleshooting Updates:
```bash
# If update fails, check logs
python tools/comfyui_installer/update_comfyui_integrated.py --verify

# Manual ComfyUI restart
python start_storycore_complete.py
```

### Integration with StoryCore Ecosystem

#### Seamless Service Management:
- **Automatic Service Detection** - Finds ComfyUI installation
- **Cross-platform Support** - Works on Windows/Linux/macOS
- **Environment Preservation** - Maintains custom configurations
- **Dependency Management** - Updates all related components

#### API Integration Ready:
The update system is designed to integrate with future API endpoints for:
- Remote update triggering
- Automated maintenance schedules
- Update status monitoring
- Rollback capabilities

## 🎯 Model Management

### Automatic Download
Models are automatically downloaded on first use:

#### FLUX.2 Core Models (~11GB)
- `flux2-vae.safetensors` (335MB) - VAE decoder
- `flux2_dev_fp8mixed.safetensors` (3.5GB) - Main diffusion model
- `mistral_3_small_flux2_bf16.safetensors` (7.2GB) - Text encoder

#### FLUX.2-klein (~9.3GB)
- Lightweight alternative for lower-end hardware

#### LTX-2 Video Models (~33GB)
- `ltx-2-19b-dev-fp8.safetensors` (9.3GB) - Video generation model
- `gemma_3_12B_it.safetensors` (24GB) - Video text encoder
- Camera control LoRAs and upscalers

### Manual Management
```bash
# Check model status
python src/auto_model_downloader.py --check-only

# Force download all models
python src/auto_model_downloader.py

# Download specific model categories
python src/auto_model_downloader.py --include-ltx2
```

## 📂 Project Structure

```
storycore-engine/
├── 📁 src/
│   ├── comfyui_api_server.py          # REST API server
│   ├── auto_model_downloader.py        # Model management
│   ├── storycore.py                    # CLI entry point
│   └── 📁 wizard/                      # 🎭 14 Interactive wizards
│       ├── 📁 video_editor_wizard/     # 🎬 EditForge - Video montage
│       │   ├── __init__.py
│       │   ├── video_editor_wizard.py  # Main wizard logic
│       │   └── test_video_editor_wizard.py
│       ├── 📁 marketing_wizard/        # 🚀 ViralForge - Marketing campaigns
│       │   ├── __init__.py
│       │   ├── marketing_wizard.py     # Campaign generation
│       │   └── test_marketing_wizard.py
│       ├── 📁 comic_to_sequence_wizard/ # 🎭 PanelForge - BD to cinema
│       │   ├── __init__.py
│       │   ├── comic_to_sequence_wizard.py # Comic analysis
│       │   └── test_comic_to_sequence_wizard.py
│       ├── 📁 audio_production_wizard/ # 🎵 SonicCrafter - Audio design
│       │   ├── __init__.py
│       │   ├── audio_production_wizard.py
│       │   └── test_audio_production_wizard.py
│       ├── 📁 ghost_tracker_wizard/    # 👻 Ghost Tracker - AI analysis
│       │   ├── __init__.py
│       │   ├── ghost_tracker_wizard.py
│       │   └── test_ghost_tracker_wizard.py
│       ├── 📁 roger_wizard/            # 🤖 Roger - Data extraction
│       │   ├── __init__.py
│       │   ├── roger_wizard.py
│       │   └── test_roger_wizard.py
│       ├── dialogue_wizard.py          # 💬 Dialogue generation
│       ├── enhanced_validation.py      # Smart validation system
│       ├── story_generator.py          # Story generation engine
│       ├── wizard_orchestrator.py      # Wizard coordination
│       └── test_*.py                   # Comprehensive test suite
├── 📁 src/cli/handlers/                # CLI command handlers
│   ├── video_editor_wizard.py          # EditForge CLI handler
│   ├── marketing_wizard.py             # ViralForge CLI handler
│   ├── comic_to_sequence_wizard.py     # PanelForge CLI handler
│   ├── audio_production_wizard.py      # SonicCrafter CLI handler
│   ├── ghost_tracker_wizard.py         # Ghost Tracker CLI handler
│   ├── roger_wizard.py                 # Roger CLI handler
│   └── base.py                         # Base handler class
├── 📁 documentation/
│   ├── guides/
│   │   ├── WIZARDS_GUIDE.md           # Complete 14-wizard documentation
│   │   └── WIZARD_ENHANCEMENTS_README.md # Technical details
│   └── *.md                           # Technical documentation
├── 📁 workflows/
│   ├── 📁 flux2/                       # FLUX.2 workflows
│   └── 📁 ltx2/                        # LTX-2 workflows
├── 📁 creative-studio-ui/              # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── assistants/
│   │   │   │   └── StoryCoreAssistant.tsx # 🤖 Enhanced AI assistant
│   │   │   ├── PlanEditor.tsx          # 🎬 Scene plan editor *(New)*
│   │   │   └── AIGenerationPanel.tsx   # Main generation UI
│   │   └── data/
│   │       └── wizardDefinitions.ts    # 14 wizard configurations
│   └── package.json
├── 📁 src/ui/                           # React UI components
│   └── PlanEditor.tsx                   # 🎬 Scene plan editor component *(New)*
├── 📁 tools/
│   └── comfyui_installer/              # Installation & maintenance tools
│       ├── install_comfyui.py          # ComfyUI installation
│       ├── update_comfyui_simple.py    # 🔄 Simple update script
│       ├── update_comfyui_integrated.py # 🔧 Advanced maintenance
│       ├── start_comfyui_with_models.py # Auto-start with models
│       └── start_storycore_api.py      # API launcher
├── 📁 comfyui_portable/                # ComfyUI installation
├── 📁 models/                          # Downloaded AI models
├── start_storycore_complete.py         # Complete system launcher
├── storycore-dashboard-demo.html       # Technical dashboard
└── README_STORYCORE_COMPLETE.md        # This documentation
```

## 🛠️ Development Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git
- 16GB+ RAM (32GB recommended for video generation)

### Installation Steps

1. **Clone and Setup**
```bash
git clone <repository-url>
cd storycore-engine
```

2. **Install ComfyUI**
```bash
python tools/comfyui_installer/install_comfyui.py
```

3. **Setup React UI**
```bash
cd creative-studio-ui
npm install
cd ..
```

4. **Download Models**
```bash
python src/auto_model_downloader.py
```

5. **Start Complete System**
```bash
python start_storycore_complete.py
```

## 🎨 Workflow System

### FLUX.2 Workflows
- `flux2_basic.json` - Standard image generation
- Customizable parameters and model variants
- Optimized for quality and speed

### LTX-2 Workflows
- `ltx2_basic_video.json` - Standard video generation
- Camera control and motion workflows
- Multi-frame sequence generation

### Customization
Workflows are JSON files that can be modified for:
- Custom model combinations
- Specialized generation parameters
- Batch processing configurations

## 🔍 Troubleshooting

### Common Issues

#### ComfyUI Won't Start
```bash
# Check ComfyUI installation
python tools/comfyui_installer/validate_installation.py

# Manual start
cd comfyui_portable/ComfyUI
python main.py --listen 0.0.0.0 --port 8188 --cpu
```

#### API Connection Failed
```bash
# Check API server
curl http://localhost:8000/health

# Restart API server
python src/comfyui_api_server.py
```

#### React UI Issues
```bash
cd creative-studio-ui
npm install
npm start
```

#### Model Download Issues
```bash
# Clear cache and retry
python src/auto_model_downloader.py --force

# Check disk space
df -h
```

### Logs and Debugging

#### Service Logs
Each service outputs detailed logs:
- ComfyUI: Direct console output
- API Server: Structured logging
- React UI: Browser console

#### Debug Mode
```bash
# Enable verbose logging
export LOG_LEVEL=DEBUG
python start_storycore_complete.py
```

## 📊 Performance Optimization

### For Image Generation
- Use FLUX.2-klein for faster generation
- Reduce steps for draft quality
- Optimize resolution based on use case

### For Video Generation
- Use FP8 models for better performance
- Limit frames for faster iteration
- Enable LoRA distillation for speed

### Hardware Recommendations
- **CPU Mode**: 16GB RAM minimum
- **GPU Mode**: RTX 3060+ recommended
- **Video Generation**: 32GB+ RAM, high-end GPU

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Code Standards
- Python: PEP 8 with type hints
- TypeScript: ESLint configuration
- Documentation required for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **ComfyUI** - Powerful workflow engine
- **Black Forest Labs** - FLUX.2 models
- **Lightricks** - LTX-2 video generation
- **React Community** - UI framework

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: This README and inline docs

---

**StoryCore-Engine** - Redefining multimodal AI content generation through guaranteed visual coherence and automated workflows.