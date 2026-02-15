#!/usr/bin/env python3
"""
StoryCore-Engine CLI Entry Point
Proper entry point that handles imports correctly and initializes ComfyUI integration.
"""

import sys
import asyncio
import logging
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

# Import ComfyUI integration components
from end_to_end.configuration_manager import ConfigurationManager
from end_to_end.connection_manager import ConnectionManager, ComfyUIConfig
from end_to_end.model_manager import ModelManager
from end_to_end.workflow_manager import WorkflowManager
from end_to_end.generation_engine import GenerationEngine
from end_to_end.ui_integration import UIIntegration, create_ui_integration

# Import CLI
from storycore_cli import main

# Global instances for ComfyUI integration
_config_manager: ConfigurationManager = None
_connection_manager: ConnectionManager = None
_model_manager: ModelManager = None
_workflow_manager: WorkflowManager = None
_generation_engine: GenerationEngine = None
_comfyui_config: ComfyUIConfig = None
_ui_integration: UIIntegration = None

logger = logging.getLogger(__name__)


def initialize_comfyui_integration():
    """
    Initialize ComfyUI Desktop integration components on startup.
    
    Creates and wires together:
    - ConfigurationManager for settings
    - ConnectionManager for backend communication
    - ModelManager for model downloads
    - WorkflowManager for workflow deployment
    - GenerationEngine for asset generation
    - UIIntegration for UI callbacks
    
    Validates: Requirement 1.1
    """
    global _config_manager, _connection_manager, _model_manager
    global _workflow_manager, _generation_engine, _comfyui_config, _ui_integration
    
    try:
        logger.info("Initializing ComfyUI Desktop integration...")
        
        # Initialize ConfigurationManager
        _config_manager = ConfigurationManager()
        logger.debug("ConfigurationManager initialized")
        
        # Load ComfyUI configuration
        config_file = Path.home() / ".storycore" / "config" / "comfyui.json"
        
        # Create default config
        _comfyui_config = ComfyUIConfig()
        
        # Load from file if exists
        if config_file.exists():
            try:
                import json
                with open(config_file, 'r') as f:
                    config_data = json.load(f)
                    
                # Override defaults with file values
                for key, value in config_data.items():
                    if hasattr(_comfyui_config, key):
                        setattr(_comfyui_config, key, value)
                
                logger.info(f"Loaded ComfyUI configuration from {config_file}")
            except Exception as e:
                logger.warning(f"Failed to load config file, using defaults: {e}")
        
        # Override with environment variables
        import os
        if os.getenv('COMFYUI_HOST'):
            _comfyui_config.host = os.getenv('COMFYUI_HOST')
        if os.getenv('COMFYUI_PORT'):
            _comfyui_config.port = int(os.getenv('COMFYUI_PORT'))
        if os.getenv('COMFYUI_TIMEOUT'):
            _comfyui_config.timeout = int(os.getenv('COMFYUI_TIMEOUT'))
        if os.getenv('COMFYUI_AUTO_DOWNLOAD'):
            _comfyui_config.auto_download_models = os.getenv('COMFYUI_AUTO_DOWNLOAD').lower() == 'true'
        if os.getenv('COMFYUI_FALLBACK_MODE'):
            _comfyui_config.fallback_mode = os.getenv('COMFYUI_FALLBACK_MODE')
        
        # Validate configuration
        errors = _comfyui_config.validate()
        if errors:
            logger.warning(f"Configuration validation warnings: {errors}")
        
        logger.info(f"ComfyUI configuration: {_comfyui_config.url}")
        
        # Initialize ConnectionManager
        _connection_manager = ConnectionManager(_comfyui_config)
        logger.debug("ConnectionManager initialized")
        
        # Attempt initial connection (non-blocking)
        async def try_connect():
            status = await _connection_manager.connect()
            if status.available:
                logger.info(f"Connected to ComfyUI Desktop at {status.url}")
                # Start health monitoring
                await _connection_manager.start_health_monitoring(interval=5)
            else:
                logger.warning(f"ComfyUI Desktop not available: {status.error_message}")
                logger.info("System will operate in fallback mode")
                # Start background reconnection attempts
                await _connection_manager.start_background_reconnection(interval=10)
        
        # Run connection attempt
        try:
            asyncio.run(try_connect())
        except Exception as e:
            logger.warning(f"Initial connection attempt failed: {e}")
        
        # Initialize ModelManager
        comfyui_models_dir = Path.home() / "ComfyUI" / "models"
        if not comfyui_models_dir.exists():
            # Try alternative location
            comfyui_models_dir = Path.home() / ".comfyui" / "models"
        
        _model_manager = ModelManager(comfyui_models_dir)
        logger.debug(f"ModelManager initialized with models directory: {comfyui_models_dir}")
        
        # Initialize WorkflowManager
        workflows_dir = Path(__file__).parent / "assets" / "workflows"
        comfyui_workflows_dir = Path.home() / "ComfyUI" / "user" / "default" / "workflows"
        if not comfyui_workflows_dir.exists():
            comfyui_workflows_dir = Path.home() / ".comfyui" / "workflows"
        
        _workflow_manager = WorkflowManager(workflows_dir, comfyui_workflows_dir)
        logger.debug(f"WorkflowManager initialized")
        
        # Initialize GenerationEngine
        _generation_engine = GenerationEngine(
            connection_manager=_connection_manager,
            model_manager=_model_manager,
            workflow_manager=_workflow_manager
        )
        logger.debug("GenerationEngine initialized")
        
        # Initialize UIIntegration
        _ui_integration = create_ui_integration(
            connection_manager=_connection_manager,
            model_manager=_model_manager,
            workflow_manager=_workflow_manager,
            generation_engine=_generation_engine
        )
        logger.debug("UIIntegration initialized")
        
        logger.info("ComfyUI Desktop integration initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize ComfyUI integration: {e}", exc_info=True)
        logger.warning("System will operate without ComfyUI integration")


def get_comfyui_components():
    """
    Get initialized ComfyUI integration components.
    
    Returns:
        Tuple of (config_manager, connection_manager, model_manager, 
                 workflow_manager, generation_engine, comfyui_config, ui_integration)
    """
    return (
        _config_manager,
        _connection_manager,
        _model_manager,
        _workflow_manager,
        _generation_engine,
        _comfyui_config,
        _ui_integration
    )


def shutdown_comfyui_integration():
    """
    Gracefully shutdown ComfyUI integration.
    
    Stops health monitoring, cancels downloads, cleans up temporary files,
    and saves state for resume.
    
    Validates: General system stability
    """
    global _connection_manager, _model_manager, _generation_engine, _ui_integration
    
    try:
        logger.info("Shutting down ComfyUI integration...")
        
        # Cancel in-progress generation
        if _generation_engine and _generation_engine.current_session:
            logger.info("Cancelling in-progress generation...")
            _generation_engine.cancel_generation()
            
            # Save generation state for potential resume
            try:
                state_file = Path.home() / ".storycore" / "state" / "generation_state.json"
                state_file.parent.mkdir(parents=True, exist_ok=True)
                
                import json
                state = {
                    "session_id": _generation_engine.current_session.session_id,
                    "session_type": _generation_engine.current_session.session_type,
                    "total_items": _generation_engine.current_session.total_items,
                    "completed_items": _generation_engine.current_session.completed_items,
                    "failed_items": _generation_engine.current_session.failed_items,
                    "metadata": _generation_engine.current_session.metadata
                }
                
                with open(state_file, 'w') as f:
                    json.dump(state, f, indent=2)
                
                logger.info(f"Saved generation state to {state_file}")
            except Exception as e:
                logger.warning(f"Failed to save generation state: {e}")
        
        # Cleanup UI integration
        if _ui_integration:
            _ui_integration.cleanup()
            logger.debug("UI integration cleaned up")
        
        # Stop health monitoring and disconnect
        if _connection_manager:
            async def stop_monitoring():
                await _connection_manager.stop_health_monitoring()
                await _connection_manager.stop_background_reconnection()
                await _connection_manager.disconnect()
            
            try:
                asyncio.run(stop_monitoring())
                logger.debug("Connection manager stopped")
            except Exception as e:
                logger.warning(f"Error stopping connection manager: {e}")
        
        # Cancel in-progress downloads
        if _model_manager:
            logger.info("Cancelling in-progress downloads...")
            for model_name in list(_model_manager.downloads.keys()):
                progress = _model_manager.downloads.get(model_name)
                if progress and progress.status == "downloading":
                    try:
                        asyncio.run(_model_manager.pause_download(model_name))
                        logger.debug(f"Paused download: {model_name}")
                    except Exception as e:
                        logger.warning(f"Failed to pause download {model_name}: {e}")
        
        # Clean up temporary files
        logger.info("Cleaning up temporary files...")
        temp_dirs = [
            Path.home() / ".storycore" / "temp",
            Path.cwd() / "temp",
            Path.cwd() / ".temp"
        ]
        
        for temp_dir in temp_dirs:
            if temp_dir.exists():
                try:
                    # Remove .tmp files
                    for tmp_file in temp_dir.glob("**/*.tmp"):
                        try:
                            tmp_file.unlink()
                            logger.debug(f"Removed temporary file: {tmp_file}")
                        except Exception as e:
                            logger.warning(f"Failed to remove {tmp_file}: {e}")
                except Exception as e:
                    logger.warning(f"Error cleaning temp directory {temp_dir}: {e}")
        
        logger.info("ComfyUI integration shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}", exc_info=True)


if __name__ == "__main__":
    # Initialize ComfyUI integration before running CLI
    initialize_comfyui_integration()
    
    exit_code = 0
    try:
        # Run CLI
        exit_code = main()
    finally:
        # Cleanup on exit
        shutdown_comfyui_integration()
        sys.exit(exit_code if isinstance(exit_code, int) else 0)
