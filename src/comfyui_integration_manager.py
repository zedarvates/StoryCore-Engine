"""
ComfyUI Integration Manager - High-level orchestration for StoryCore-Engine
Coordinates workflow execution, progress tracking, and error recovery
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path

from .comfy_client import ComfyUIClient, VRAMOverflowError, ExecutionError, ValidationError
from .integration_utils import (
    load_workflow, inject_storycore_parameters, create_panel_workflow,
    process_comfyui_outputs, validate_workflow_structure, optimize_workflow_for_memory
)
from .schemas import PROJECT_SCHEMA
from .validator import validate_against_schema

logger = logging.getLogger(__name__)

class ComfyUIIntegrationManager:
    """High-level manager for ComfyUI integration with StoryCore-Engine"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8188", workflow_path: str = None):
        self.client = ComfyUIClient(base_url)
        self.workflow_path = workflow_path or "assets/workflows/storycore_flux2.json"
        self.base_workflow = None
        self.available_vram = 8.0  # Default conservative estimate
        
    def initialize(self) -> bool:
        """Initialize the integration manager and validate setup"""
        try:
            # Test connection to ComfyUI
            if not self.client.test_connection():
                logger.error("Cannot connect to ComfyUI server")
                return False
            
            # Load and validate base workflow
            if os.path.exists(self.workflow_path):
                self.base_workflow = load_workflow(self.workflow_path)
                if not validate_workflow_structure(self.base_workflow):
                    logger.error("Workflow structure validation failed")
                    return False
            else:
                logger.warning(f"Workflow file not found: {self.workflow_path}")
                return False
            
            logger.info("ComfyUI integration initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Integration initialization failed: {e}")
            return False
    
    def process_project(self, project_data: Dict[str, Any], progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Process complete StoryCore project through ComfyUI"""
        try:
            # Validate project data against schema
            if not validate_against_schema(project_data, PROJECT_SCHEMA):
                raise ValidationError("Project data failed schema validation")
            
            # Extract project configuration
            config = project_data["config"]
            global_seed = config["global_seed"]
            
            # Optimize workflow for available VRAM
            optimized_workflow = optimize_workflow_for_memory(self.base_workflow, self.available_vram)
            
            # Inject project parameters
            project_workflow = inject_storycore_parameters(optimized_workflow, config)
            
            # Process master coherence sheet if available
            results = {}
            if "coherence_anchors" in project_data and "master_grid_path" in project_data["coherence_anchors"]:
                results = self._process_master_grid(project_workflow, project_data, progress_callback)
            
            return {
                "status": "completed",
                "results": results,
                "project_id": project_data["project_id"]
            }
            
        except VRAMOverflowError as e:
            logger.error(f"VRAM overflow during processing: {e}")
            return self._handle_vram_overflow(project_data, progress_callback)
        except Exception as e:
            logger.error(f"Project processing failed: {e}")
            return {"status": "failed", "error": str(e)}
    
    def process_single_panel(self, panel_id: str, prompt: str, global_seed: int, 
                           progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Process a single panel through ComfyUI"""
        try:
            # Create panel-specific workflow
            panel_workflow = create_panel_workflow(self.base_workflow, panel_id, prompt, global_seed)
            
            # Queue workflow
            prompt_id = self.client.queue_workflow(panel_workflow, global_seed, prompt)
            if not prompt_id:
                raise ExecutionError("Failed to queue panel workflow")
            
            # Monitor execution
            result = self.client.monitor_execution(prompt_id, progress_callback)
            
            # Process outputs
            if result["status"] == "completed":
                output_dir = f"outputs/{panel_id}"
                os.makedirs(output_dir, exist_ok=True)
                processed_outputs = process_comfyui_outputs(result["outputs"], output_dir)
                
                return {
                    "status": "completed",
                    "panel_id": panel_id,
                    "outputs": processed_outputs,
                    "prompt_id": prompt_id
                }
            
            return result
            
        except VRAMOverflowError:
            logger.warning(f"VRAM overflow for panel {panel_id}, reducing batch size")
            return self._process_panel_with_reduced_batch(panel_id, prompt, global_seed, progress_callback)
        except Exception as e:
            logger.error(f"Panel processing failed for {panel_id}: {e}")
            return {"status": "failed", "panel_id": panel_id, "error": str(e)}
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        try:
            connection_ok = self.client.test_connection()
            queue_status = self.client.get_queue_status()
            
            return {
                "connection": "connected" if connection_ok else "disconnected",
                "queue_running": len(queue_status.get("queue_running", [])),
                "queue_pending": len(queue_status.get("queue_pending", [])),
                "workflow_loaded": self.base_workflow is not None,
                "available_vram_gb": self.available_vram
            }
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            return {"connection": "error", "error": str(e)}
    
    def _process_master_grid(self, workflow: Dict[str, Any], project_data: Dict[str, Any], 
                           progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Process master coherence sheet through ComfyUI"""
        try:
            master_grid_path = project_data["coherence_anchors"]["master_grid_path"]
            global_seed = project_data["config"]["global_seed"]
            
            # Create grid-specific workflow
            grid_workflow = workflow.copy()
            
            # Queue and monitor grid generation
            prompt_id = self.client.queue_workflow(grid_workflow, global_seed, "master coherence sheet")
            if not prompt_id:
                raise ExecutionError("Failed to queue master grid workflow")
            
            result = self.client.monitor_execution(prompt_id, progress_callback)
            
            if result["status"] == "completed":
                output_dir = "outputs/master_grid"
                os.makedirs(output_dir, exist_ok=True)
                processed_outputs = process_comfyui_outputs(result["outputs"], output_dir)
                
                return {
                    "master_grid": {
                        "status": "completed",
                        "outputs": processed_outputs,
                        "prompt_id": prompt_id
                    }
                }
            
            return {"master_grid": result}
            
        except Exception as e:
            logger.error(f"Master grid processing failed: {e}")
            return {"master_grid": {"status": "failed", "error": str(e)}}
    
    def _handle_vram_overflow(self, project_data: Dict[str, Any], 
                            progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Handle VRAM overflow by reducing batch size and retrying"""
        logger.info("Handling VRAM overflow with reduced batch processing")
        
        try:
            # Reduce available VRAM estimate
            self.available_vram = max(4.0, self.available_vram * 0.7)
            
            # Re-optimize workflow for reduced VRAM
            optimized_workflow = optimize_workflow_for_memory(self.base_workflow, self.available_vram)
            
            # Inject project parameters with conservative settings
            config = project_data["config"].copy()
            project_workflow = inject_storycore_parameters(optimized_workflow, config)
            
            # Retry processing with reduced settings
            return self._process_master_grid(project_workflow, project_data, progress_callback)
            
        except Exception as e:
            logger.error(f"VRAM overflow recovery failed: {e}")
            return {
                "status": "failed", 
                "error": "VRAM overflow - insufficient memory for processing",
                "suggestion": "Reduce image resolution or close other applications"
            }
    
    def _process_panel_with_reduced_batch(self, panel_id: str, prompt: str, global_seed: int,
                                        progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Process panel with reduced batch size for VRAM recovery"""
        try:
            # Create conservative panel workflow
            reduced_workflow = optimize_workflow_for_memory(self.base_workflow, 4.0)  # Very conservative
            panel_workflow = create_panel_workflow(reduced_workflow, panel_id, prompt, global_seed)
            
            # Queue with reduced settings
            prompt_id = self.client.queue_workflow(panel_workflow, global_seed, prompt)
            if not prompt_id:
                raise ExecutionError("Failed to queue reduced panel workflow")
            
            result = self.client.monitor_execution(prompt_id, progress_callback)
            
            if result["status"] == "completed":
                output_dir = f"outputs/{panel_id}"
                os.makedirs(output_dir, exist_ok=True)
                processed_outputs = process_comfyui_outputs(result["outputs"], output_dir)
                
                return {
                    "status": "completed",
                    "panel_id": panel_id,
                    "outputs": processed_outputs,
                    "prompt_id": prompt_id,
                    "note": "Processed with reduced batch size due to VRAM constraints"
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Reduced batch processing failed for {panel_id}: {e}")
            return {
                "status": "failed", 
                "panel_id": panel_id, 
                "error": str(e),
                "suggestion": "Insufficient VRAM - consider reducing image resolution"
            }