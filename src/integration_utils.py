"""
Integration utilities for ComfyUI workflow manipulation and data processing
Handles JSON workflow loading, parameter injection, and output processing
"""

import json
import os
from typing import Dict, Any, List, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def load_workflow(workflow_path: str) -> Dict[str, Any]:
    """Load ComfyUI workflow from JSON file"""
    try:
        with open(workflow_path, 'r', encoding='utf-8') as f:
            workflow = json.load(f)
        
        if not isinstance(workflow, dict):
            raise ValueError("Workflow must be a JSON object")
        
        logger.info(f"Loaded workflow with {len(workflow)} nodes")
        return workflow
        
    except FileNotFoundError:
        logger.error(f"Workflow file not found: {workflow_path}")
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in workflow file: {e}")
        raise
    except Exception as e:
        logger.error(f"Error loading workflow: {e}")
        raise

def inject_storycore_parameters(workflow: Dict[str, Any], project_config: Dict[str, Any]) -> Dict[str, Any]:
    """Inject StoryCore project parameters into ComfyUI workflow"""
    modified_workflow = workflow.copy()
    
    global_seed = project_config.get("global_seed", 42)
    target_resolution = project_config.get("target_resolution", "1920x1080")
    width, height = map(int, target_resolution.split('x'))
    
    for node_id, node_data in modified_workflow.items():
        if not isinstance(node_data, dict) or "inputs" not in node_data:
            continue
            
        inputs = node_data["inputs"]
        
        # Inject seed parameters
        if "seed" in inputs:
            inputs["seed"] = global_seed
            
        # Inject resolution parameters
        if "width" in inputs:
            inputs["width"] = width
        if "height" in inputs:
            inputs["height"] = height
            
        # Inject batch size (default to 1 for memory safety)
        if "batch_size" in inputs:
            inputs["batch_size"] = 1
    
    return modified_workflow

def extract_panel_seed(global_seed: int, panel_id: str) -> int:
    """Generate deterministic panel seed from global seed and panel ID"""
    panel_hash = hash(panel_id) % 1000000
    return global_seed + panel_hash

def create_panel_workflow(base_workflow: Dict[str, Any], panel_id: str, prompt: str, global_seed: int) -> Dict[str, Any]:
    """Create panel-specific workflow with deterministic seeding"""
    panel_workflow = base_workflow.copy()
    panel_seed = extract_panel_seed(global_seed, panel_id)
    
    for node_id, node_data in panel_workflow.items():
        if not isinstance(node_data, dict) or "inputs" not in node_data:
            continue
            
        inputs = node_data["inputs"]
        
        # Set panel-specific seed
        if "seed" in inputs:
            inputs["seed"] = panel_seed
            
        # Set panel-specific prompt
        if "text" in inputs and inputs["text"] == "":
            inputs["text"] = f"{prompt} [Panel: {panel_id}]"
        elif "prompt" in inputs:
            inputs["prompt"] = f"{prompt} [Panel: {panel_id}]"
    
    return panel_workflow

def process_comfyui_outputs(outputs: Dict[str, Any], output_dir: str) -> List[Dict[str, Any]]:
    """Process ComfyUI outputs and organize files according to StoryCore conventions"""
    processed_outputs = []
    
    for node_id, output_data in outputs.items():
        if not isinstance(output_data, dict) or "images" not in output_data:
            continue
            
        images = output_data["images"]
        for i, image_info in enumerate(images):
            filename = image_info.get("filename", f"output_{node_id}_{i}.png")
            file_type = image_info.get("type", "output")
            
            # Create StoryCore-compliant output structure
            processed_output = {
                "node_id": node_id,
                "filename": filename,
                "type": file_type,
                "local_path": os.path.join(output_dir, filename),
                "metadata": {
                    "generated_by": "comfyui",
                    "node_id": node_id,
                    "index": i
                }
            }
            
            processed_outputs.append(processed_output)
    
    return processed_outputs

def validate_workflow_structure(workflow: Dict[str, Any]) -> bool:
    """Validate that workflow has required structure for StoryCore integration"""
    required_node_types = ["KSampler", "VAEDecode", "SaveImage"]
    found_types = set()
    
    for node_id, node_data in workflow.items():
        if isinstance(node_data, dict) and "class_type" in node_data:
            found_types.add(node_data["class_type"])
    
    missing_types = set(required_node_types) - found_types
    if missing_types:
        logger.warning(f"Workflow missing required node types: {missing_types}")
        return False
    
    return True

def create_batch_workflow(base_workflow: Dict[str, Any], panel_configs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Create batch workflow for multiple panels with VRAM optimization"""
    if len(panel_configs) > 4:  # VRAM safety limit
        logger.warning(f"Batch size {len(panel_configs)} exceeds VRAM limit, reducing to 4")
        panel_configs = panel_configs[:4]
    
    batch_workflow = base_workflow.copy()
    
    # Modify batch size in relevant nodes
    for node_id, node_data in batch_workflow.items():
        if isinstance(node_data, dict) and "inputs" in node_data:
            if "batch_size" in node_data["inputs"]:
                node_data["inputs"]["batch_size"] = len(panel_configs)
    
    return batch_workflow

def extract_error_context(error_data: Dict[str, Any]) -> Dict[str, str]:
    """Extract useful context from ComfyUI error responses"""
    context = {
        "error_type": "unknown",
        "node_id": "unknown",
        "message": "No error message available"
    }
    
    if isinstance(error_data, dict):
        context["error_type"] = error_data.get("exception_type", "unknown")
        context["node_id"] = error_data.get("node_id", "unknown")
        context["message"] = error_data.get("exception_message", "No message")
        
        # Extract traceback if available
        if "traceback" in error_data:
            context["traceback"] = error_data["traceback"]
    
    return context

def optimize_workflow_for_memory(workflow: Dict[str, Any], available_vram_gb: float = 8.0) -> Dict[str, Any]:
    """Optimize workflow parameters based on available VRAM"""
    optimized = workflow.copy()
    
    # Conservative settings for lower VRAM
    if available_vram_gb < 12:
        for node_id, node_data in optimized.items():
            if isinstance(node_data, dict) and "inputs" in node_data:
                inputs = node_data["inputs"]
                
                # Reduce batch size
                if "batch_size" in inputs:
                    inputs["batch_size"] = 1
                
                # Use memory-efficient samplers
                if "sampler_name" in inputs:
                    inputs["sampler_name"] = "euler"
                
                # Reduce steps for memory efficiency
                if "steps" in inputs and inputs["steps"] > 20:
                    inputs["steps"] = 20
    
    return optimized
