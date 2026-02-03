# StoryCore-Engine Project Structure

**Version**: 1.0.0  
**Last Updated**: January 25, 2026  
**Status**: Production Ready ✅

## 📋 Overview

This document provides a comprehensive overview of the StoryCore-Engine project structure, including directory organization, file naming conventions, module organization, and configuration management.

## 🗂️ Directory Layout

```
storycore-engine/
├── 📁 Root Configuration Files
│   ├── package.json                    # Node.js project configuration
│   ├── package-lock.json               # Dependency lock file
│   ├── requirements.txt                # Python dependencies
│   ├── pyproject.toml                  # Python project metadata
│   ├── setup.py                        # Python package setup
│   ├── electron-builder.json           # Electron packaging config
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── pytest.ini                      # Pytest configuration
│   └── .gitignore                      # Git ignore rules
│
├── 📁 Documentation (/)
│   ├── README.md                       # Project overview
│   ├── INDEX.md                        # Project navigation index
│   ├── ROADMAP.md                      # Development roadmap
│   ├── CHANGELOG.md                    # Version history
│   ├── QUICK_REFERENCE.md              # Developer quick reference
│   ├── BUILD_REPORT.md                 # Build analysis
│   ├── FIX_TESTS.md                    # Test improvements
│   ├── DOCUMENTATION_INDEX.md          # Documentation index
│   └── RELEASE_NOTES_*.md              # Release notes
│
├── 📁 documentation/
│   ├── API_INDEX.md                    # API documentation index
│   ├── TECHNICAL_GUIDE.md              # Technical architecture
│   ├── DEVELOPER_GUIDE.md              # Development workflows
│   ├── DEPLOYMENT_GUIDE.md             # Deployment procedures
│   ├── TROUBLESHOOTING.md              # Common issues
│   ├── CONTRIBUTING.md                 # Contribution guidelines
│   ├── PROJECT_STRUCTURE.md            # This file
│   │
│   └── 📁 api/                         # API Documentation
│       ├── PYTHON_BACKEND_API.md       # Python backend API
│       ├── TYPESCRIPT_FRONTEND_API.md  # TypeScript frontend API
│       ├── ELECTRON_API.md             # Electron integration API
│       ├── COMFYUI_WORKFLOW_API.md     # ComfyUI workflow API
│       ├── SECURITY_VALIDATION_API.md  # Security & validation API
│       ├── ERROR_HANDLING_API.md       # Error handling API
│       ├── MONITORING_API.md           # Monitoring API
│       ├── STORAGE_API.md              # Storage API
│       ├── REST_API_REFERENCE.md       # REST API reference
│       ├── WEBSOCKET_API.md            # WebSocket API
│       ├── CLI_API.md                  # CLI API reference
│       └── PLUGIN_API.md               # Plugin API
│
├── 📁 src/                             # Python Backend Source
│   ├── 🧠 Core Engines
│   │   ├── project_manager.py          # Project lifecycle management
│   │   ├── grid_generator.py           # Master Coherence Sheet
│   │   ├── promotion_engine.py         # Panel promotion
│   │   ├── autofix_engine.py           # Quality correction
│   │   ├── qa_engine.py                # Quality analysis
│   │   ├── narrative_engine.py         # Style consistency
│   │   ├── video_plan_engine.py        # Camera movements
│   │   └── exporter.py                 # Package creation
│   │
│   ├── 🔒 Security & Validation
│   │   ├── security_validation_system.py    # Input validation
│   │   ├── error_handling_resilience.py     # Error handling
│   │   └── monitoring_dashboard.py          # System monitoring
│   │
│   ├── 🎨 AI Integration
│   │   ├── hunyuan_video_integration.py     # HunyuanVideo workflows
│   │   ├── wan_video_integration.py         # Wan Video ATI
│   │   ├── newbie_image_integration.py      # Anime-style generation
│   │   ├── qwen_image_suite_integration.py  # Professional editing
│   │   ├── integrated_workflow_system.py    # Workflow orchestration
│   │   └── ai_enhancement_engine.py         # AI enhancement
│   │
│   ├── 📊 Analytics & Monitoring
│   │   ├── analytics_dashboard.py           # Analytics dashboard
│   │   ├── batch_processing_system.py       # Batch processing
│   │   └── real_time_preview_system.py      # Real-time preview
│   │
│   ├── 🛠️ Utilities
│   │   ├── storycore_cli.py                 # CLI handlers
│   │   ├── addon_cli.py                     # Addon management
│   │   ├── config_validation_example.py     # Config validation
│   │   └── json_validation_examples.py      # JSON validation
│   │
│   └── 📁 ui/                          # Python UI Components
│       └── CentralConfigurationUI.tsx  # Configuration UI
│
├── 📁 creative-studio-ui/              # React/TypeScript Frontend
│   ├── 📁 src/
│   │   ├── 📁 components/              # React Components
│   │   │   ├── 📁 character/           # Character components
│   │   │   ├── 📁 layout/              # Layout components
│   │   │   ├── 📁 navigation/          # Navigation components
│   │   │   ├── 📁 wizards/             # Wizard components
│   │   │   └── 📁 ui/                  # UI primitives
│   │   │
│   │   ├── 📁 hooks/                   # Custom React Hooks
│   │   │   ├── useCharacterPersistenceOptimized.ts
│   │   │   └── ...
│   │   │
│   │   ├── 📁 services/                # Service Layer
│   │   │   ├── eventEmitterOptimized.ts
│   │   │   └── ...
│   │   │
│   │   ├── 📁 store/                   # Redux Store
│   │   │   ├── 📁 slices/              # Redux slices
│   │   │   └── store.ts                # Store configuration
│   │   │
│   │   ├── 📁 utils/                   # Utility Functions
│   │   │   ├── characterErrorHandler.ts
│   │   │   └── ...
│   │   │
│   │   ├── 📁 types/                   # TypeScript Types
│   │   │   └── ...
│   │   │
│   │   ├── 📁 styles/                  # Styles
│   │   │   └── ...
│   │   │
│   │   ├── App.tsx                     # Main application
│   │   └── main.tsx                    # Entry point
│   │
│   ├── 📁 public/                      # Static Assets
│   ├── 📁 dist/                        # Build Output
│   ├── 📁 coverage/                    # Test Coverage
│   ├── 📁 docs/                        # UI Documentation
│   ├── package.json                    # UI dependencies
│   ├── vite.config.ts                  # Vite configuration
│   ├── vitest.config.ts                # Vitest configuration
│   ├── tsconfig.json                   # TypeScript config
│   └── tailwind.config.js              # Tailwind CSS config
│
├── 📁 electron/                        # Electron Desktop App
│   ├── main.js                         # Main process
│   ├── preload.js                      # Preload script
│   ├── UpdateManager.ts                # Update management
│   └── ...
│
├── 📁 tests/                           # Test Suites
│   ├── 📁 unit/                        # Unit tests
│   ├── 📁 integration/                 # Integration tests
│   ├── 📁 e2e/                         # End-to-end tests
│   ├── 📁 fixtures/                    # Test data
│   └── 📁 utils/                       # Test utilities
│
├── 📁 .kiro/                           # Kiro Configuration
│   ├── 📁 specs/                       # Feature Specifications
│   │   ├── 📁 {feature-name}/          # Feature spec folder
│   │   │   ├── requirements.md         # Requirements document
│   │   │   ├── design.md               # Design document
│   │   │   └── tasks.md                # Task list
│   │   └── ...
│   │
│   ├── 📁 steering/                    # Steering Rules
│   │   ├── product.md                  # Product overview
│   │   ├── tech.md                     # Technical architecture
│   │   ├── structure.md                # Project structure
│   │   └── ...
│   │
│   └── 📁 agents/                      # Custom Agents
│
├── 📁 assets/                          # Visual Assets
│   ├── 📁 library/                     # Asset library
│   ├── 📁 resources/                   # Resources
│   └── 📁 workflows/                   # Workflow assets
│
├── 📁 workflows/                       # ComfyUI Workflows
│   ├── hunyuan_video_t2v.json          # Text-to-video workflow
│   ├── wan_video_ati.json              # ATI motion control
│   ├── newbie_image_anime.json         # Anime generation
│   └── qwen_image_suite.json           # Image editing
│
├── 📁 models/                          # AI Model Configurations
│   └── ...
│
├── 📁 exports/                         # Generated Outputs
│   └── ...
│
├── 📁 dist/                            # Build Artifacts
│   └── ...
│
├── 📁 dist-electron/                   # Electron Build
│   └── StoryCore Engine Setup *.exe
│
├── 📁 build/                           # Build Scripts
│   └── ...
│
├── 📁 scripts/                         # Utility Scripts
│   └── ...
│
├── 📁 config/                          # Configuration Files
│   ├── production_config.yaml          # Production config
│   ├── .env.example                    # Environment template
│   └── ...
│
├── 📁 logs/                            # Application Logs
│   └── ...
│
├── 📁 cache/                           # Cache Directory
│   └── 📁 models/                      # Model cache
│
└── 📁 node_modules/                    # Node.js Dependencies
    └── ...
```

## 📝 File Naming Conventions

### Python Files
- **Module Files**: `snake_case.py` (e.g., `project_manager.py`)
- **Class Files**: `PascalCase` for classes, `snake_case` for files (e.g., `class ProjectManager` in `project_manager.py`)
- **Test Files**: `test_*.py` (e.g., `test_project_manager.py`)
- **Configuration Files**: `*_config.py` (e.g., `app_config.py`)

### TypeScript/JavaScript Files
- **Component Files**: `PascalCase.tsx` (e.g., `MainSidebar.tsx`)
- **Hook Files**: `use*.ts` (e.g., `useCharacterPersistence.ts`)
- **Service Files**: `camelCase.ts` (e.g., `eventEmitter.ts`)
- **Utility Files**: `camelCase.ts` (e.g., `errorHandler.ts`)
- **Type Files**: `PascalCase.ts` or `types.ts` (e.g., `Character.ts`, `types.ts`)
- **Test Files**: `*.test.ts` or `*.spec.ts` (e.g., `MainSidebar.test.tsx`)

### Documentation Files
- **Main Docs**: `UPPERCASE.md` (e.g., `README.md`, `CHANGELOG.md`)
- **Guide Docs**: `PascalCase.md` (e.g., `TechnicalGuide.md`)
- **API Docs**: `UPPERCASE_API.md` (e.g., `PYTHON_BACKEND_API.md`)
- **Spec Docs**: `lowercase.md` in spec folders (e.g., `requirements.md`, `design.md`)

### Configuration Files
- **Package Config**: `package.json`, `pyproject.toml`
- **Build Config**: `*.config.js`, `*.config.ts` (e.g., `vite.config.ts`)
- **Environment**: `.env`, `.env.example`, `.env.production`
- **TypeScript**: `tsconfig.json`, `tsconfig.*.json`

## 🧩 Module Organization

### Python Backend Modules

#### Core Engine Modules (`src/`)
- **Project Management**: Project lifecycle, configuration, initialization
- **Grid Generation**: Master Coherence Sheet creation
- **Promotion Engine**: Panel promotion and enhancement
- **QA Engine**: Quality analysis and validation
- **Autofix Engine**: Automatic quality correction
- **Video Planning**: Camera movements and transitions
- **Export System**: Package creation and distribution

#### AI Integration Modules (`src/`)
- **HunyuanVideo**: Text-to-video and image-to-video workflows
- **Wan Video**: Inpainting and ATI motion control
- **NewBie Image**: Anime-style image generation
- **Qwen Image Suite**: Professional image editing
- **Integrated Workflow**: Multi-workflow orchestration
- **AI Enhancement**: Style transfer, super-resolution, interpolation

#### System Modules (`src/`)
- **Security & Validation**: Input validation, model integrity
- **Error Handling**: Circuit breakers, retry mechanisms, fallback strategies
- **Monitoring**: Performance metrics, resource monitoring, health checks
- **Analytics**: Dashboard, batch processing, real-time preview

### TypeScript Frontend Modules

#### Component Organization (`creative-studio-ui/src/components/`)
- **Layout Components**: Main layout, sidebars, navigation
- **Character Components**: Character management, cards, lists
- **Wizard Components**: Setup wizards, forms, modals
- **UI Primitives**: Buttons, inputs, progress indicators
- **Feature Components**: Feature-specific components

#### Service Layer (`creative-studio-ui/src/services/`)
- **API Clients**: REST API communication
- **Event Emitters**: Event-driven communication
- **Storage Services**: Local storage, session storage
- **WebSocket Services**: Real-time communication

#### State Management (`creative-studio-ui/src/store/`)
- **Redux Store**: Centralized state management
- **Slices**: Feature-specific state slices
- **Actions**: State modification actions
- **Selectors**: State selection utilities

#### Hooks (`creative-studio-ui/src/hooks/`)
- **Data Hooks**: Data fetching and caching
- **UI Hooks**: UI state management
- **Effect Hooks**: Side effect management
- **Custom Hooks**: Reusable logic patterns

## ⚙️ Configuration Files

### Root Configuration
- **package.json**: Node.js project configuration, scripts, dependencies
- **requirements.txt**: Python dependencies
- **pyproject.toml**: Python project metadata, build configuration
- **setup.py**: Python package setup and distribution
- **electron-builder.json**: Electron packaging configuration
- **tsconfig.json**: TypeScript compiler configuration
- **pytest.ini**: Pytest configuration

### Build Configuration
- **vite.config.ts**: Vite build configuration (UI)
- **vitest.config.ts**: Vitest test configuration (UI)
- **tailwind.config.js**: Tailwind CSS configuration
- **postcss.config.js**: PostCSS configuration
- **eslint.config.js**: ESLint configuration

### Environment Configuration
- **.env**: Local environment variables (not committed)
- **.env.example**: Environment template
- **.env.production**: Production environment variables
- **config/production_config.yaml**: Production configuration

### Kiro Configuration
- **.kiro/steering/**: Steering rules for AI assistance
- **.kiro/specs/**: Feature specifications
- **.kiro/agents/**: Custom agent configurations

## 📚 Documentation Structure

### Root Documentation (/)
- **README.md**: Project overview, quick start, key features
- **INDEX.md**: Project navigation index
- **ROADMAP.md**: Development roadmap, future plans
- **CHANGELOG.md**: Version history, release notes
- **QUICK_REFERENCE.md**: Developer quick reference
- **BUILD_REPORT.md**: Build analysis and metrics
- **FIX_TESTS.md**: Test improvements and fixes
- **DOCUMENTATION_INDEX.md**: Documentation navigation

### Technical Documentation (documentation/)
- **API_INDEX.md**: API documentation index
- **TECHNICAL_GUIDE.md**: Technical architecture
- **DEVELOPER_GUIDE.md**: Development workflows
- **DEPLOYMENT_GUIDE.md**: Deployment procedures
- **TROUBLESHOOTING.md**: Common issues and solutions
- **CONTRIBUTING.md**: Contribution guidelines
- **PROJECT_STRUCTURE.md**: This file

### API Documentation (documentation/api/)
- **PYTHON_BACKEND_API.md**: Python backend API reference
- **TYPESCRIPT_FRONTEND_API.md**: TypeScript frontend API reference
- **ELECTRON_API.md**: Electron integration API
- **COMFYUI_WORKFLOW_API.md**: ComfyUI workflow API
- **SECURITY_VALIDATION_API.md**: Security & validation API
- **ERROR_HANDLING_API.md**: Error handling API
- **MONITORING_API.md**: Monitoring API
- **STORAGE_API.md**: Storage API
- **REST_API_REFERENCE.md**: REST API reference
- **WEBSOCKET_API.md**: WebSocket API
- **CLI_API.md**: CLI API reference
- **PLUGIN_API.md**: Plugin API

### UI Documentation (creative-studio-ui/docs/)
- Component documentation
- UI patterns and guidelines
- Styling conventions
- Accessibility guidelines

## 🏗️ Build Artifacts

### Python Build Artifacts
- **dist/**: Python wheel packages (`.whl`)
- **build/**: Build intermediates
- **storycore_engine.egg-info/**: Package metadata

### UI Build Artifacts
- **creative-studio-ui/dist/**: Production UI build
- **creative-studio-ui/coverage/**: Test coverage reports
- **creative-studio-ui/tsconfig.*.tsbuildinfo**: TypeScript build info

### Electron Build Artifacts
- **dist-electron/**: Electron installers
  - Windows: `StoryCore Engine Setup *.exe`
  - macOS: `StoryCore Engine-*.dmg`
  - Linux: `StoryCore Engine-*.AppImage`

### Test Artifacts
- **coverage/**: Test coverage reports
- **test-results.json**: Test results
- **.coverage**: Coverage data
- **htmlcov/**: HTML coverage reports

## 🌍 Environment-Specific Files

### Development Environment
- **.env**: Local development variables
- **config/development_config.yaml**: Development configuration
- **vite.config.ts**: Development server configuration

### Staging Environment
- **.env.staging**: Staging environment variables
- **config/staging_config.yaml**: Staging configuration

### Production Environment
- **.env.production**: Production environment variables
- **config/production_config.yaml**: Production configuration
- **electron-builder.json**: Production build configuration

### Testing Environment
- **pytest.ini**: Test configuration
- **vitest.config.ts**: UI test configuration
- **tests/fixtures/**: Test data and fixtures

## 📦 Asset Organization

### Visual Assets (assets/)
- **library/**: Reusable asset library
- **resources/**: Project resources
- **workflows/**: Workflow-specific assets

### ComfyUI Workflows (workflows/)
- **hunyuan_video_t2v.json**: Text-to-video workflow
- **wan_video_ati.json**: ATI motion control workflow
- **newbie_image_anime.json**: Anime generation workflow
- **qwen_image_suite.json**: Image editing workflow

### Model Configurations (models/)
- Model configuration files
- Model metadata
- Model optimization settings

### Generated Outputs (exports/)
- Timestamped export packages
- QA reports
- Demo assets

## 🔍 Finding Files

### By Functionality
- **Core Engine**: `src/*_engine.py`
- **AI Integration**: `src/*_integration.py`
- **UI Components**: `creative-studio-ui/src/components/`
- **API Services**: `creative-studio-ui/src/services/`
- **Tests**: `tests/` and `creative-studio-ui/src/**/*.test.ts`

### By Type
- **Python Modules**: `src/**/*.py`
- **TypeScript Components**: `creative-studio-ui/src/**/*.tsx`
- **Configuration**: `*.json`, `*.yaml`, `*.config.*`
- **Documentation**: `*.md`
- **Tests**: `test_*.py`, `*.test.ts`, `*.spec.ts`

### By Purpose
- **Development**: `src/`, `creative-studio-ui/src/`, `tests/`
- **Configuration**: Root config files, `config/`, `.kiro/`
- **Documentation**: Root docs, `documentation/`, `creative-studio-ui/docs/`
- **Build**: `dist/`, `dist-electron/`, `build/`
- **Assets**: `assets/`, `workflows/`, `models/`

## 🚀 Quick Navigation

### For Backend Development
```
src/                          # Python backend source
tests/                        # Backend tests
requirements.txt              # Python dependencies
pyproject.toml                # Python project config
```

### For Frontend Development
```
creative-studio-ui/src/       # React/TypeScript source
creative-studio-ui/tests/     # Frontend tests
creative-studio-ui/package.json  # UI dependencies
creative-studio-ui/vite.config.ts  # Build config
```

### For Documentation
```
documentation/                # Technical documentation
documentation/api/            # API references
README.md                     # Project overview
INDEX.md                      # Navigation index
```

### For Configuration
```
config/                       # Configuration files
.env.example                  # Environment template
.kiro/steering/               # Steering rules
.kiro/specs/                  # Feature specs
```

---

**Maintained by**: StoryCore-Engine Team  
**License**: ISC  
**Repository**: [GitHub](https://github.com/zedarvates/StoryCore-Engine)

*This structure document is updated with each major release. For the latest information, always refer to the online documentation.*
