# StoryCore-Engine Project Index

Welcome to the StoryCore-Engine project index! This document provides a comprehensive overview of the project structure, key components, and navigation guide for developers and contributors.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [API Documentation](#api-documentation)
- [File Structure](#file-structure)
- [Key Files](#key-files)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)

## 🎬 Project Overview

**StoryCore-Engine** is a self-correcting multimodal production pipeline that transforms scripts into cinematic sequences in under 5 minutes with guaranteed visual coherence.

### Key Features
- **Multimodal AI Pipeline**: Text-to-video, image-to-video, and advanced editing workflows
- **Self-Correcting Quality**: Automatic detection and fixing of low-quality outputs
- **Deterministic Results**: 100% reproducible with hierarchical seed control
- **Professional Control Surface**: Technical dashboard and creative studio interface
- **Enterprise Security**: Input validation, model integrity, and privacy protection
- **Production Resilience**: Retry mechanisms, circuit breakers, and error recovery

### Version Information
- **Current Version**: v1.0.0 (Production Ready)
- **Last Updated**: March 19, 2026
- **Build Status**: 🔄 Build passing (Vite), 🚧 Type-checking in progress
- **License**: ISC
- **Python Version**: 3.11+
- **Node.js Version**: 18+

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- ComfyUI (for AI workflows)
- FFmpeg (for video processing)

### Installation
```bash
# Clone the repository
git clone https://github.com/zedarvates/StoryCore-Engine.git
cd storycore-engine

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install

# Build the project
npm run build

# Run the application
npm run dev
```

### First Pipeline Run
```bash
# Initialize a new project
python storycore.py init my-project

# Generate Master Coherence Sheet
python storycore.py grid --project my-project

# Run the complete pipeline
python storycore.py promote --project my-project
python storycore.py qa --project my-project
python storycore.py export --project my-project
```

## 🏗️ Architecture Overview

```
📝 Input (Script/Prompt)
    ↓
🧠 Text Engine (Scene Breakdown + Shot Planning)
    ↓
🎨 Master Coherence Sheet Generation (3x3 Visual DNA Lock)
    ↓
⚡ PromotionEngine (Slice → Center-Fill Crop → 2x Upscale → Refine)
    ↓
🔍 QA Engine (Laplacian Variance Analysis + Quality Scoring)
    ↓
🔧 AutofixEngine (Parameter Adjustment + Re-processing Loop)
    ↓
🎬 Video Planning (Camera Movements + Transitions)
    ↓
📦 Export (Final Sequence + QA Report + Demo Package)
```

### Core Modules
- **CLI Interface**: `storycore.py` - Main command-line interface
- **Engine Modules**: `src/` - Core processing engines
- **UI Components**: `creative-studio-ui/` - React/TypeScript interface
- **Electron App**: `electron/` - Desktop application wrapper

## 🔧 Core Components

### Engine Modules (`src/`)

| Module | Lines | Purpose |
|--------|-------|---------|
| `security_validation_system.py` | 850 | Input validation and security |
| `error_handling_resilience.py` | 900 | Error handling and resilience patterns |
| `hunyuan_video_integration.py` | 700 | HunyuanVideo workflow integration |
| `wan_video_integration.py` | 800 | Wan Video ATI integration |
| `newbie_image_integration.py` | 600 | Anime-style image generation |
| `qwen_image_suite_integration.py` | 1000 | Professional image editing |
| `integrated_workflow_system.py` | 600 | Unified workflow orchestration |
| `monitoring_dashboard.py` | 400 | Real-time system monitoring |

### UI Components (`creative-studio-ui/`)

| Component | Purpose |
|-----------|---------|
| `MainSidebar.tsx` | Navigation and project management |
| `MainLayout.tsx` | Main application layout |
| `SkeletonLoader.tsx` | Loading states and placeholders |
| `progress.tsx` | Progress indicators |

## 📚 API Documentation

### Comprehensive API Reference

StoryCore-Engine provides extensive API documentation covering all system interfaces, from Python backend services to TypeScript frontend components, Electron integration, and ComfyUI workflow APIs.

**Main API Index**: [documentation/API_INDEX.md](documentation/API_INDEX.md)

### API Categories

#### Core APIs
- **[Python Backend API](documentation/api/PYTHON_BACKEND_API.md)** - Core engine modules and processing pipelines
- **[TypeScript Frontend API](documentation/api/TYPESCRIPT_FRONTEND_API.md)** - React components and UI services
- **[Electron API](documentation/api/ELECTRON_API.md)** - Desktop application integration
- **[ComfyUI Workflow API](documentation/api/COMFYUI_WORKFLOW_API.md)** - AI workflow integration

#### Service APIs
- **[Security & Validation API](documentation/api/SECURITY_VALIDATION_API.md)** - Input validation and security services
- **[Error Handling API](documentation/api/ERROR_HANDLING_API.md)** - Error handling and resilience patterns
- **[Monitoring API](documentation/api/MONITORING_API.md)** - System monitoring and analytics
- **[Storage API](documentation/api/STORAGE_API.md)** - Data persistence and file management

#### Integration APIs
- **[REST API Reference](documentation/api/REST_API_REFERENCE.md)** - HTTP endpoints and webhooks
- **[WebSocket API](documentation/api/WEBSOCKET_API.md)** - Real-time communication
- **[CLI API](documentation/api/CLI_API.md)** - Command-line interface reference
- **[Plugin API](documentation/api/PLUGIN_API.md)** - Extension and addon system

### API Status

| API Category | Status | Version | Test Coverage |
|--------------|--------|---------|---------------|
| Python Backend | ✅ Stable | 1.0.0 | 95%+ |
| TypeScript Frontend | ✅ Stable | 1.0.0 | 90%+ |
| Electron Integration | ✅ Stable | 1.0.0 | 85%+ |
| ComfyUI Workflows | ✅ Stable | 1.0.0 | 95%+ |
| Security & Validation | ✅ Stable | 1.0.0 | 100% |
| Error Handling | ✅ Stable | 1.0.0 | 100% |
| Monitoring | ✅ Stable | 1.0.0 | 95%+ |
| REST API | ✅ Stable | 1.0.0 | 90%+ |
| WebSocket API | 🚧 Beta | 0.9.0 | 80%+ |
| Plugin API | 🚧 Beta | 0.9.0 | 85%+ |

### Quick API Access by Role

#### Backend Developers
1. [Python Backend API](documentation/api/PYTHON_BACKEND_API.md) - Core engine modules
2. [Security & Validation API](documentation/api/SECURITY_VALIDATION_API.md) - Input validation
3. [Error Handling API](documentation/api/ERROR_HANDLING_API.md) - Resilience patterns
4. [CLI API](documentation/api/CLI_API.md) - Command-line interface

#### Frontend Developers
1. [TypeScript Frontend API](documentation/api/TYPESCRIPT_FRONTEND_API.md) - React components
2. [Component Library](documentation/api/TYPESCRIPT_FRONTEND_API.md#component-library) - Reusable UI
3. [State Management](documentation/api/TYPESCRIPT_FRONTEND_API.md#state-management) - Redux store
4. [Hooks](documentation/api/TYPESCRIPT_FRONTEND_API.md#hooks) - Custom React hooks

#### Integration Developers
1. [REST API Reference](documentation/api/REST_API_REFERENCE.md) - HTTP endpoints
2. [WebSocket API](documentation/api/WEBSOCKET_API.md) - Real-time communication
3. [Plugin API](documentation/api/PLUGIN_API.md) - Extension system
4. [ComfyUI Workflow API](documentation/api/COMFYUI_WORKFLOW_API.md) - AI workflows

#### DevOps Engineers
1. [Monitoring API](documentation/api/MONITORING_API.md) - System monitoring
2. [Error Handling API](documentation/api/ERROR_HANDLING_API.md) - Resilience patterns
3. [Security & Validation API](documentation/api/SECURITY_VALIDATION_API.md) - Security services
4. [CLI API](documentation/api/CLI_API.md) - Automation commands

## 📁 File Structure

```
storycore-engine/
├── 📄 README.md                    # Main project documentation
├── 📄 INDEX.md                     # This navigation index
├── 📄 CHANGELOG.md                 # Version history and changes
├── 📄 ROADMAP.md                   # Development roadmap
├── 📄 requirements.txt             # Python dependencies
├── 📄 package.json                 # Node.js configuration
├── 📄 pyproject.toml               # Python project configuration
├── 📄 setup.py                     # Python package setup
├── 📄 storycore.py                 # Main CLI entry point
├── 📁 src/                         # Core engine modules
│   ├── 🧠 Core Engines
│   ├── 🔒 Security & Validation
│   ├── 🎨 AI Integration
│   └── 📊 Monitoring & Analytics
├── 📁 creative-studio-ui/          # React/TypeScript UI
│   ├── 📱 Components
│   ├── 🎨 Styles
│   ├── 🧭 Navigation
│   └── 🏗️ Layout
├── 📁 electron/                    # Desktop application
├── 📁 docs/                        # Documentation
├── 📁 tests/                       # Test suites
├── 📁 assets/                      # Visual assets
├── 📁 models/                      # AI model configurations
├── 📁 workflows/                   # ComfyUI workflows
├── 📁 exports/                     # Generated outputs
└── 📁 dist/                        # Build artifacts
```

## 📋 Key Files

### Configuration Files
- `requirements.txt` - Python dependencies
- `package.json` - Node.js dependencies and scripts
- `pyproject.toml` - Python project metadata
- `tsconfig.json` - TypeScript configuration

### Core Application Files
- `storycore.py` - Main CLI application
- `src/storycore_cli.py` - CLI command handlers
- `creative-studio-ui/src/App.tsx` - Main React application
- `electron/main.js` - Electron main process

### Documentation Files
- `README.md` - Project overview and quick start
- `CHANGELOG.md` - Version history
- `ROADMAP.md` - Development roadmap
- `docs/` - Detailed documentation

### Build and Deployment
- `setup.py` - Python package setup
- `electron-builder.json` - Electron build configuration
- `Dockerfile` - Containerization (if applicable)

## 🔄 Development Workflow

### Local Development
1. **Setup Environment**: Install dependencies with `pip install -r requirements.txt && npm install`
2. **Start Development Server**: Run `npm run dev` for hot-reload development
3. **Run Tests**: Execute `npm test` and `python -m pytest`
4. **Build Application**: Use `npm run build` for production build

### Code Quality
- **Linting**: ESLint for JavaScript/TypeScript, flake8 for Python
- **Testing**: Jest for frontend, pytest for backend
- **Type Checking**: TypeScript strict mode enabled
- **Security**: Automated security scanning in CI/CD

### Git Workflow
- **Branch Naming**: `feature/`, `bugfix/`, `hotfix/`, `docs/`
- **Commit Messages**: Conventional commits format
- **Pull Requests**: Require review and passing CI/CD
- **Release Process**: Automated versioning and changelog generation

## 🧪 Testing

### Test Structure
```
tests/
├── unit/                    # Unit tests
├── integration/            # Integration tests
├── e2e/                    # End-to-end tests
├── fixtures/               # Test data
└── utils/                  # Test utilities
```

### Test Coverage
- **Unit Tests**: Individual functions and modules
- **Integration Tests**: Component interactions
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load and stress testing

### Running Tests
```bash
# Run all tests
npm test
python -m pytest

# Run with coverage
npm run test:coverage
python -m pytest --cov=src

# Run specific test suite
npm run test:unit
python -m pytest tests/unit/
```

## 🚀 Deployment

### Build Process
```bash
# Build Python package
python -m build

# Build UI components
cd creative-studio-ui && npm run build

# Build Electron application
npm run package

# Create distribution packages
npm run package:win    # Windows installer
npm run package:mac    # macOS application
npm run package:linux  # Linux packages
```

### Distribution Artifacts
- **Python Wheel**: `dist/storycore_engine-*.whl`
- **Electron Installers**: `dist-electron/StoryCore Engine Setup *.exe`
- **UI Assets**: `creative-studio-ui/dist/`

### Deployment Environments
- **Development**: Local development with hot-reload
- **Staging**: Test environment with production-like setup
- **Production**: Live environment with monitoring and backups

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Contribution Guidelines
- Follow the existing code style
- Write comprehensive tests
- Update documentation as needed
- Use conventional commit messages
- Keep pull requests focused and atomic

### Development Setup
```bash
# Clone your fork
git clone https://github.com/your-username/storycore-engine.git
cd storycore-engine

# Set up development environment
pip install -r requirements.txt
npm install

# Run development server
npm run dev
```

## 🆘 Support

### Documentation
- **[README.md](README.md)** - Quick start and overview
- **[BUILD_REPORT.md](BUILD_REPORT.md)** - Latest build analysis and metrics
- **[FIX_TESTS.md](FIX_TESTS.md)** - Test improvements and known issues
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Developer quick reference
- **[TODO.md](TODO.md)** - Master TODO list and task tracking
- **[docs/](docs/)** - Detailed documentation
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[ROADMAP.md](ROADMAP.md)** - Development roadmap

### Community
- **Issues**: [GitHub Issues](https://github.com/zedarvates/StoryCore-Engine/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zedarvates/StoryCore-Engine/discussions)
- **Wiki**: [Project Wiki](https://github.com/zedarvates/StoryCore-Engine/wiki)

### Getting Help
1. Check the documentation first
2. Search existing issues
3. Create a new issue with detailed information
4. Join community discussions


*This index is maintained automatically. Last updated: February 26, 2026*

## 📈 Project Status

### Current Metrics
- **Build Status**: ✅ Production Ready v1.0.0
- **Build Time**: ~8 seconds
- **Bundle Size**: 1.38 MB (356 KB gzipped)
- **TypeScript Errors**: 0
- **Test Coverage**: 50% (improving)
- **Performance**: <5 minutes pipeline execution
- **Quality**: 95%+ QA pass rate
- **Security**: 41/41 security tests passing

### Recent Achievements
- ✅ Bidirectional Persistance & Synchronization (March 11, 2026)
- ✅ SyncManager for character/world/shot sync (March 19, 2026)
- ✅ Neural Augmented Creation & Project Genesis (Feb 26, 2026)
- ✅ Total Recall AI Memory System (Feb 26, 2026)
- ✅ Recursive LLM Service (RLM) (Feb 26, 2026)
- ✅ Location & Object Reference Sheets (Feb 26, 2026)
- ✅ Complete build pipeline successful (Jan 23, 2026)
- ✅ Jest/Vitest compatibility fixed
- ✅ Test patterns modernized (async/await)
- ✅ All dependencies resolved
- ✅ Production deployment ready
- ✅ Enterprise security implemented
- ✅ Advanced AI workflows integrated
- ✅ Comprehensive build documentation

### Next Priorities
- Cloud integration (Q1 2027)
- Collaborative editing (Q2 2027)
- Performance optimizations
- Additional AI model support

---

*StoryCore-Engine: Redefining multimodal AI through guaranteed visual coherence and autonomous quality control.*