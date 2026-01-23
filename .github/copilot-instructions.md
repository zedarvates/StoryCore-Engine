# StoryCore-Engine AI Coding Instructions

## Architecture Overview
StoryCore-Engine is a multimodal AI pipeline for video production, transforming scripts into coherent videos. Core deterministic flow: Script → Text Engine → Configurable Grid (3x3 default) → Promotion Engine → QA Validation → AI Generation (HunyuanVideo/Wan/Qwen) → Export.

**Key Components:**
- **Backend**: Python modular CLI (`src/cli/`) with engines in `src/` (video, image, QA, security)
- **Frontend**: React/TypeScript UI in `creative-studio-ui/` built with Vite
- **AI Integration**: ComfyUI WebSocket/HTTP client (`src/comfyui_manager.py`) for model workflows
- **Desktop App**: Electron wrapper for standalone distribution

## Critical Workflows
- **Build**: `python -m build` (Python package), `cd creative-studio-ui && npm run build` (UI), `npm run electron:build` (installer)
- **Test**: `pytest --cov=src --cov-report=html` (coverage required >80%)
- **Run**: `python storycore.py` (CLI) or `launch_ui.bat` (UI launcher)
- **Debug AI**: ComfyUI ports 8188 (manual)/8000 (desktop); monitor WebSocket progress in `src/comfyui_workflow_executor.py`

## Project Conventions
- **Error Handling**: Use circuit breakers (`src/circuit_breaker.py`) and retry logic with exponential backoff
- **Security**: Validate all inputs via `src/security_validation_system.py`; never expose model paths
- **Logging**: Structured logging with `src/secure_logging.py`; include correlation IDs for tracing
- **Configuration**: Environment-based config in `src/advanced_workflow_config.py`; support multiple ComfyUI instances
- **Testing**: Comprehensive coverage; use `src/comprehensive_testing_framework.py` for integration tests
- **Wizards**: User-guided workflows in `src/wizard/`; implement step validation and progress tracking
- **Self-Correcting**: Implement validation, monitoring, and autofix in all new features (see `autofix_engine.py`, `quality_validator.py`)
- **Data Classes**: Use dataclasses for configuration and structured data (e.g., `ComfyUIConfig`, `CircuitBreakerConfig`)
- **Async Tasks**: Queue-based processing in `src/async_task_queue.py` for long-running AI operations

## Integration Patterns
- **ComfyUI Communication**: Dual HTTP/WebSocket in `src/comfy_client.py`; handle VRAM overflow with batch reduction
- **Model Management**: Auto-download via `src/auto_model_downloader.py`; validate integrity post-download
- **Cross-Platform**: Use `src/cross_platform_compatibility.py` for OS-specific paths and commands
- **Modular CLI**: Plugin-based architecture in `src/cli/`; add new commands via `PluginLoader`

## Key Files to Reference
- Entry: `storycore.py` → `src/storycore_cli.py` → `src/cli/core.py`
- AI Engines: `src/hunyuan_video_integration.py`, `src/qwen_image_suite_integration.py`
- UI Build: `creative-studio-ui/package.json` (Vite scripts)
- Config: `src/production_config.py`, `comfyui_config.py`
- Tests: `run_comprehensive_tests.py`, `pytest.ini`

Follow the "self-correcting" principle: implement validation, monitoring, and autofix in all new features.</content>
<parameter name="filePath">c:\storycore-engine\.github\copilot-instructions.md