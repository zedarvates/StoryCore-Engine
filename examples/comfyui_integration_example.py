"""
ComfyUI Integration Example - Demonstrates production-ready API bridge usage
Shows how to integrate ComfyUI with StoryCore-Engine pipeline
"""

import logging
import json
from pathlib import Path

from src.comfyui_integration_manager import ComfyUIIntegrationManager
from src.project_manager import ProjectManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def progress_callback(percentage: float, current_step: str):
    """Progress callback for real-time updates"""
    print(f"Progress: {percentage:.1f}% - {current_step}")

def main():
    """Example integration workflow"""
    
    # Initialize integration manager
    manager = ComfyUIIntegrationManager(
        base_url="http://127.0.0.1:8188",
        workflow_path="assets/workflows/storycore_flux2.json"
    )
    
    # Initialize the integration
    if not manager.initialize():
        logger.error("Failed to initialize ComfyUI integration")
        return
    
    # Check system status
    status = manager.get_system_status()
    logger.info(f"System status: {status}")
    
    if status["connection"] != "connected":
        logger.error("ComfyUI not connected - please start ComfyUI server")
        return
    
    # Example 1: Process single panel
    logger.info("Processing single panel...")
    panel_result = manager.process_single_panel(
        panel_id="panel_01",
        prompt="A cinematic shot of a futuristic city at sunset",
        global_seed=42,
        progress_callback=progress_callback
    )
    
    if panel_result["status"] == "completed":
        logger.info(f"Panel completed: {len(panel_result['outputs'])} outputs generated")
        for output in panel_result["outputs"]:
            logger.info(f"Generated: {output['filename']} at {output['local_path']}")
    else:
        logger.error(f"Panel processing failed: {panel_result.get('error', 'Unknown error')}")
    
    # Example 2: Process complete project (if project exists)
    project_path = "projects/demo-project/project.json"
    if Path(project_path).exists():
        logger.info("Processing complete project...")
        
        # Load project data
        with open(project_path, 'r') as f:
            project_data = json.load(f)
        
        # Process through ComfyUI
        project_result = manager.process_project(project_data, progress_callback)
        
        if project_result["status"] == "completed":
            logger.info("Project processing completed successfully")
        else:
            logger.error(f"Project processing failed: {project_result.get('error', 'Unknown error')}")
    
    logger.info("Integration example completed")

def test_error_handling():
    """Test error handling scenarios"""
    logger.info("Testing error handling scenarios...")
    
    manager = ComfyUIIntegrationManager(base_url="http://127.0.0.1:9999")  # Wrong port
    
    # Test connection failure
    if not manager.initialize():
        logger.info("✅ Connection failure handled correctly")
    
    # Test with correct connection but invalid workflow
    manager = ComfyUIIntegrationManager(
        base_url="http://127.0.0.1:8188",
        workflow_path="nonexistent_workflow.json"
    )
    
    if not manager.initialize():
        logger.info("✅ Invalid workflow handled correctly")

def test_deterministic_seeding():
    """Test deterministic seeding functionality"""
    from src.integration_utils import extract_panel_seed
    
    logger.info("Testing deterministic seeding...")
    
    # Same inputs should produce same seeds
    seed1 = extract_panel_seed(42, "panel_01")
    seed2 = extract_panel_seed(42, "panel_01")
    
    assert seed1 == seed2, "Deterministic seeding failed"
    logger.info(f"✅ Deterministic seeding: panel_01 with seed 42 → {seed1}")
    
    # Different panels should produce different seeds
    seed3 = extract_panel_seed(42, "panel_02")
    assert seed1 != seed3, "Panel differentiation failed"
    logger.info(f"✅ Panel differentiation: panel_02 with seed 42 → {seed3}")

if __name__ == "__main__":
    print("StoryCore-Engine ComfyUI Integration Example")
    print("=" * 50)
    
    # Run tests first
    test_error_handling()
    test_deterministic_seeding()
    
    print("\nRunning main integration example...")
    print("Note: Requires ComfyUI server running on 127.0.0.1:8188")
    
    try:
        main()
    except KeyboardInterrupt:
        print("\nExample interrupted by user")
    except Exception as e:
        logger.error(f"Example failed: {e}")
        raise