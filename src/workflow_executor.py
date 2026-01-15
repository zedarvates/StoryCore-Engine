"""
ComfyUI Workflow Executor
Converts StoryCore workflows to ComfyUI format and handles execution.
"""

import logging
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

from .comfyui_config import ComfyUIConfig, ControlNetConfig, IPAdapterConfig
from .comfyui_models import (
    ComfyUIWorkflow, WorkflowNode, WorkflowMetadata, ValidationResult
)
from .performance_monitor import PerformanceMonitor


@dataclass
class StoryCorePanelConfig:
    """Configuration for a StoryCore panel conversion."""
    
    # Basic generation parameters
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    steps: int = 20
    cfg_scale: float = 7.0
    seed: int = -1
    
    # Model configuration
    checkpoint_name: str = "sd_xl_base_1.0.safetensors"
    vae_name: Optional[str] = None
    
    # ControlNet configuration
    controlnet_config: Optional[ControlNetConfig] = None
    
    # IP-Adapter configuration
    ipadapter_config: Optional[IPAdapterConfig] = None
    
    # Advanced parameters
    sampler_name: str = "euler"
    scheduler: str = "normal"
    denoise: float = 1.0


class WorkflowExecutor:
    """
    Converts StoryCore workflows to ComfyUI format and validates them.
    
    Handles ControlNet, IP-Adapter, and model configuration while ensuring
    proper node connections and workflow validation.
    """
    
    def __init__(self, config: ComfyUIConfig):
        """
        Initialize Workflow Executor.
        
        Args:
            config: ComfyUI configuration for model paths and settings.
        """
        self.config = config
        self.logger = self._setup_logging()
        
        # Performance monitor for metrics collection
        self.performance_monitor = PerformanceMonitor(config)
        
        # Model validation cache
        self._available_models: Optional[Dict[str, List[str]]] = None
        
        # Node ID counter for unique node IDs
        self._node_counter = 1
        
        self.logger.info("Workflow Executor initialized")
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the executor."""
        logger = logging.getLogger("comfyui_workflow_executor")
        logger.setLevel(getattr(logging, self.config.log_level))
        
        # Create console handler if not already exists
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _get_next_node_id(self) -> str:
        """Get next unique node ID."""
        node_id = str(self._node_counter)
        self._node_counter += 1
        return node_id
    
    def convert_storycore_panel(self, panel_config: StoryCorePanelConfig) -> ComfyUIWorkflow:
        """
        Convert a StoryCore panel configuration to ComfyUI workflow.
        
        Args:
            panel_config: StoryCore panel configuration.
            
        Returns:
            ComfyUI workflow ready for execution.
        """
        operation_id = f"workflow_conversion_{int(time.time())}"
        self.performance_monitor.record_operation_start("workflow_conversion", operation_id)
        
        try:
            self.logger.info(f"Converting StoryCore panel to ComfyUI workflow")
            
            # Create new workflow
            workflow = ComfyUIWorkflow()
            workflow.metadata = WorkflowMetadata(
                source_type="storycore_panel",
                tags=["storycore", "panel_generation"]
            )
            
            # Reset node counter for this workflow
            self._node_counter = 1
            
            # Build workflow nodes
            self._add_checkpoint_loader(workflow, panel_config)
            self._add_text_encoders(workflow, panel_config)
            
            # Add ControlNet if configured
            if panel_config.controlnet_config:
                self._add_controlnet_nodes(workflow, panel_config)
            
            # Add IP-Adapter if configured
            if panel_config.ipadapter_config:
                self._add_ipadapter_nodes(workflow, panel_config)
            
            # Add sampling and generation nodes
            self._add_sampling_nodes(workflow, panel_config)
            self._add_vae_decode(workflow, panel_config)
            self._add_save_image(workflow)
            
            # Calculate complexity
            workflow.metadata.calculate_complexity(workflow.nodes)
            
            self.logger.info(f"Workflow created with {len(workflow.nodes)} nodes, complexity: {workflow.metadata.complexity_score}")
            
            # Analyze workflow complexity for performance insights
            complexity_analysis = self.performance_monitor.analyze_workflow_complexity(workflow)
            
            self.performance_monitor.record_operation_end(
                "workflow_conversion", operation_id, True,
                {
                    "node_count": len(workflow.nodes),
                    "complexity_score": workflow.metadata.complexity_score,
                    "estimated_memory_mb": complexity_analysis.estimated_memory_mb,
                    "estimated_time_seconds": complexity_analysis.estimated_processing_time_seconds
                }
            )
            
            return workflow
            
        except Exception as e:
            self.logger.error(f"Failed to convert StoryCore panel: {e}")
            self.performance_monitor.record_operation_end(
                "workflow_conversion", operation_id, False,
                {"error": str(e)}
            )
            raise
    
    def _add_checkpoint_loader(self, workflow: ComfyUIWorkflow, config: StoryCorePanelConfig) -> str:
        """Add checkpoint loader node."""
        node_id = self._get_next_node_id()
        
        node = WorkflowNode(
            class_type="CheckpointLoaderSimple",
            inputs={
                "ckpt_name": config.checkpoint_name
            }
        )
        
        workflow.add_node(node_id, node)
        return node_id
    
    def _add_text_encoders(self, workflow: ComfyUIWorkflow, config: StoryCorePanelConfig) -> Tuple[str, str]:
        """Add text encoder nodes for positive and negative prompts."""
        # Positive prompt encoder
        pos_node_id = self._get_next_node_id()
        pos_node = WorkflowNode(
            class_type="CLIPTextEncode",
            inputs={
                "text": config.prompt,
                "clip": ["1", 1]  # Reference to checkpoint loader CLIP output
            }
        )
        workflow.add_node(pos_node_id, pos_node)
        
        # Negative prompt encoder
        neg_node_id = self._get_next_node_id()
        neg_node = WorkflowNode(
            class_type="CLIPTextEncode",
            inputs={
                "text": config.negative_prompt,
                "clip": ["1", 1]  # Reference to checkpoint loader CLIP output
            }
        )
        workflow.add_node(neg_node_id, neg_node)
        
        return pos_node_id, neg_node_id
    
    def _add_controlnet_nodes(self, workflow: ComfyUIWorkflow, config: StoryCorePanelConfig) -> str:
        """Add ControlNet nodes if configured."""
        if not config.controlnet_config:
            return None
        
        controlnet_config = config.controlnet_config
        
        # Load ControlNet model
        loader_node_id = self._get_next_node_id()
        loader_node = WorkflowNode(
            class_type="ControlNetLoader",
            inputs={
                "control_net_name": controlnet_config.model_name
            }
        )
        workflow.add_node(loader_node_id, loader_node)
        
        # Load control image
        image_node_id = self._get_next_node_id()
        image_node = WorkflowNode(
            class_type="LoadImage",
            inputs={
                "image": str(controlnet_config.control_image_path.name) if controlnet_config.control_image_path else "control_image.jpg"
            }
        )
        workflow.add_node(image_node_id, image_node)
        
        # Add preprocessing if enabled
        preprocessed_image_ref = [image_node_id, 0]
        
        if controlnet_config.preprocessing:
            if "openpose" in controlnet_config.model_name.lower():
                preprocess_node_id = self._get_next_node_id()
                preprocess_node = WorkflowNode(
                    class_type="OpenposePreprocessor",
                    inputs={
                        "image": [image_node_id, 0]
                    }
                )
                workflow.add_node(preprocess_node_id, preprocess_node)
                preprocessed_image_ref = [preprocess_node_id, 0]
            
            elif "depth" in controlnet_config.model_name.lower():
                preprocess_node_id = self._get_next_node_id()
                preprocess_node = WorkflowNode(
                    class_type="MiDaS-DepthMapPreprocessor",
                    inputs={
                        "image": [image_node_id, 0]
                    }
                )
                workflow.add_node(preprocess_node_id, preprocess_node)
                preprocessed_image_ref = [preprocess_node_id, 0]
            
            elif "lineart" in controlnet_config.model_name.lower():
                preprocess_node_id = self._get_next_node_id()
                preprocess_node = WorkflowNode(
                    class_type="LineArtPreprocessor",
                    inputs={
                        "image": [image_node_id, 0]
                    }
                )
                workflow.add_node(preprocess_node_id, preprocess_node)
                preprocessed_image_ref = [preprocess_node_id, 0]
        
        # Apply ControlNet
        apply_node_id = self._get_next_node_id()
        apply_node = WorkflowNode(
            class_type="ControlNetApply",
            inputs={
                "conditioning": ["2", 0],  # Positive conditioning
                "control_net": [loader_node_id, 0],
                "image": preprocessed_image_ref,
                "strength": controlnet_config.strength
            }
        )
        workflow.add_node(apply_node_id, apply_node)
        
        return apply_node_id
    
    def _add_ipadapter_nodes(self, workflow: ComfyUIWorkflow, config: StoryCorePanelConfig) -> str:
        """Add IP-Adapter nodes if configured."""
        if not config.ipadapter_config:
            return None
        
        ipadapter_config = config.ipadapter_config
        
        # Load IP-Adapter model
        loader_node_id = self._get_next_node_id()
        loader_node = WorkflowNode(
            class_type="IPAdapterModelLoader",
            inputs={
                "ipadapter_file": ipadapter_config.model_name
            }
        )
        workflow.add_node(loader_node_id, loader_node)
        
        # Load reference image
        image_node_id = self._get_next_node_id()
        image_node = WorkflowNode(
            class_type="LoadImage",
            inputs={
                "image": str(ipadapter_config.reference_image_path.name)
            }
        )
        workflow.add_node(image_node_id, image_node)
        
        # Apply IP-Adapter
        apply_node_id = self._get_next_node_id()
        apply_node = WorkflowNode(
            class_type="IPAdapterApply",
            inputs={
                "ipadapter": [loader_node_id, 0],
                "clip_vision": [loader_node_id, 1],
                "image": [image_node_id, 0],
                "model": ["1", 0],  # Reference to checkpoint loader model
                "weight": ipadapter_config.weight,
                "noise": ipadapter_config.noise
            }
        )
        workflow.add_node(apply_node_id, apply_node)
        
        return apply_node_id
    
    def _add_sampling_nodes(self, workflow: ComfyUIWorkflow, config: StoryCorePanelConfig) -> str:
        """Add sampling nodes for generation."""
        # Empty latent image
        latent_node_id = self._get_next_node_id()
        latent_node = WorkflowNode(
            class_type="EmptyLatentImage",
            inputs={
                "width": config.width,
                "height": config.height,
                "batch_size": 1
            }
        )
        workflow.add_node(latent_node_id, latent_node)
        
        # KSampler
        sampler_node_id = self._get_next_node_id()
        
        # Determine conditioning inputs based on ControlNet/IP-Adapter
        positive_conditioning = ["2", 0]  # Default positive text encoding
        model_input = ["1", 0]  # Default checkpoint model
        
        # Check if ControlNet was added (would modify conditioning)
        if config.controlnet_config:
            # Find ControlNet apply node (should be the last ControlNet node)
            for node_id, node in workflow.nodes.items():
                if node.class_type == "ControlNetApply":
                    positive_conditioning = [node_id, 0]
        
        # Check if IP-Adapter was added (would modify model)
        if config.ipadapter_config:
            # Find IP-Adapter apply node
            for node_id, node in workflow.nodes.items():
                if node.class_type == "IPAdapterApply":
                    model_input = [node_id, 0]
        
        sampler_node = WorkflowNode(
            class_type="KSampler",
            inputs={
                "seed": config.seed if config.seed >= 0 else 42,  # Use fixed seed if negative
                "steps": config.steps,
                "cfg": config.cfg_scale,
                "sampler_name": config.sampler_name,
                "scheduler": config.scheduler,
                "denoise": config.denoise,
                "model": model_input,
                "positive": positive_conditioning,
                "negative": ["3", 0],  # Negative text encoding
                "latent_image": [latent_node_id, 0]
            }
        )
        workflow.add_node(sampler_node_id, sampler_node)
        
        return sampler_node_id
    
    def _add_vae_decode(self, workflow: ComfyUIWorkflow, config: StoryCorePanelConfig) -> str:
        """Add VAE decode node."""
        # Find the sampler node
        sampler_node_id = None
        for node_id, node in workflow.nodes.items():
            if node.class_type == "KSampler":
                sampler_node_id = node_id
                break
        
        if not sampler_node_id:
            raise ValueError("No KSampler node found for VAE decode")
        
        decode_node_id = self._get_next_node_id()
        decode_node = WorkflowNode(
            class_type="VAEDecode",
            inputs={
                "samples": [sampler_node_id, 0],
                "vae": ["1", 2]  # VAE from checkpoint loader
            }
        )
        workflow.add_node(decode_node_id, decode_node)
        
        return decode_node_id
    
    def _add_save_image(self, workflow: ComfyUIWorkflow) -> str:
        """Add save image node."""
        # Find the VAE decode node
        decode_node_id = None
        for node_id, node in workflow.nodes.items():
            if node.class_type == "VAEDecode":
                decode_node_id = node_id
                break
        
        if not decode_node_id:
            raise ValueError("No VAEDecode node found for save image")
        
        save_node_id = self._get_next_node_id()
        save_node = WorkflowNode(
            class_type="SaveImage",
            inputs={
                "images": [decode_node_id, 0],
                "filename_prefix": "storycore_panel"
            }
        )
        workflow.add_node(save_node_id, save_node)
        
        return save_node_id
    
    def validate_workflow(self, workflow: ComfyUIWorkflow) -> ValidationResult:
        """
        Validate a ComfyUI workflow for correctness.
        
        Args:
            workflow: ComfyUI workflow to validate.
            
        Returns:
            ValidationResult with errors, warnings, and complexity info.
        """
        errors = []
        warnings = []
        
        # Basic workflow validation
        workflow_errors = workflow.validate()
        errors.extend(workflow_errors)
        
        # Check for required node types
        required_nodes = ["CheckpointLoaderSimple", "KSampler", "VAEDecode", "SaveImage"]
        found_nodes = set(node.class_type for node in workflow.nodes.values())
        
        for required in required_nodes:
            if required not in found_nodes:
                errors.append(f"Missing required node type: {required}")
        
        # Check node connections
        self._validate_node_connections(workflow, errors, warnings)
        
        # Check model availability
        self._validate_model_references(workflow, errors, warnings)
        
        # Calculate complexity and estimated time
        complexity = workflow.metadata.complexity_score
        estimated_time = self._estimate_execution_time(workflow)
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            complexity_score=complexity,
            estimated_time_seconds=estimated_time
        )
    
    def _validate_node_connections(self, workflow: ComfyUIWorkflow, errors: List[str], warnings: List[str]) -> None:
        """Validate node connections in workflow."""
        # Check that all node references exist
        for node_id, node in workflow.nodes.items():
            for input_name, input_value in node.inputs.items():
                if isinstance(input_value, list) and len(input_value) == 2:
                    ref_node_id, ref_output = input_value
                    if str(ref_node_id) not in workflow.nodes:
                        errors.append(f"Node {node_id} references non-existent node {ref_node_id}")
        
        # Check for circular dependencies (basic check)
        visited = set()
        rec_stack = set()
        
        def has_cycle(node_id: str) -> bool:
            if node_id in rec_stack:
                return True
            if node_id in visited:
                return False
            
            visited.add(node_id)
            rec_stack.add(node_id)
            
            # Check all input references
            node = workflow.nodes.get(node_id)
            if node:
                for input_value in node.inputs.values():
                    if isinstance(input_value, list) and len(input_value) == 2:
                        ref_node_id = str(input_value[0])
                        if ref_node_id in workflow.nodes and has_cycle(ref_node_id):
                            return True
            
            rec_stack.remove(node_id)
            return False
        
        for node_id in workflow.nodes:
            if node_id not in visited:
                if has_cycle(node_id):
                    errors.append("Circular dependency detected in workflow")
                    break
    
    def _validate_model_references(self, workflow: ComfyUIWorkflow, errors: List[str], warnings: List[str]) -> None:
        """Validate model file references in workflow."""
        # This would check if referenced models exist in the ComfyUI installation
        # For now, we'll just check basic naming patterns
        
        for node_id, node in workflow.nodes.items():
            if node.class_type == "CheckpointLoaderSimple":
                ckpt_name = node.inputs.get("ckpt_name", "")
                if not ckpt_name.endswith((".safetensors", ".ckpt", ".pt")):
                    warnings.append(f"Checkpoint {ckpt_name} may not be a valid model file")
            
            elif node.class_type == "ControlNetLoader":
                control_net_name = node.inputs.get("control_net_name", "")
                if not control_net_name:
                    errors.append("ControlNet loader missing model name")
            
            elif node.class_type == "IPAdapterModelLoader":
                ipadapter_file = node.inputs.get("ipadapter_file", "")
                if not ipadapter_file:
                    errors.append("IP-Adapter loader missing model file")
    
    def _estimate_execution_time(self, workflow: ComfyUIWorkflow) -> float:
        """Estimate workflow execution time in seconds."""
        base_time = 10.0  # Base generation time
        
        # Add time based on complexity
        complexity_multiplier = 1.0 + (workflow.metadata.complexity_score / 10.0)
        
        # Add time for specific node types
        for node in workflow.nodes.values():
            if node.class_type == "KSampler":
                steps = node.inputs.get("steps", 20)
                base_time += steps * 0.5  # ~0.5 seconds per step
            elif node.class_type in ["ControlNetApply", "IPAdapterApply"]:
                base_time += 5.0  # Additional processing time
        
        return base_time * complexity_multiplier
    
    def get_available_models(self) -> Dict[str, List[str]]:
        """
        Get available models from ComfyUI installation.
        
        Returns:
            Dictionary mapping model types to available model files.
        """
        if self._available_models is not None:
            return self._available_models
        
        models = {
            "checkpoints": [],
            "controlnets": [],
            "ipadapters": [],
            "vaes": []
        }
        
        # Check if ComfyUI installation exists
        if not self.config.installation_path.exists():
            self.logger.warning(f"ComfyUI installation not found at {self.config.installation_path}")
            self._available_models = models
            return models
        
        # Scan model directories
        model_dirs = {
            "checkpoints": self.config.installation_path / "models" / "checkpoints",
            "controlnets": self.config.installation_path / "models" / "controlnet",
            "ipadapters": self.config.installation_path / "models" / "ipadapter",
            "vaes": self.config.installation_path / "models" / "vae"
        }
        
        for model_type, model_dir in model_dirs.items():
            if model_dir.exists():
                # Scan for model files
                extensions = [".safetensors", ".ckpt", ".pt", ".bin"]
                for ext in extensions:
                    for model_file in model_dir.glob(f"*{ext}"):
                        models[model_type].append(model_file.name)
        
        self._available_models = models
        self.logger.info(f"Found models: {sum(len(files) for files in models.values())} total")
        
        return models
    
    def refresh_model_cache(self) -> None:
        """Refresh the cached model list."""
        self._available_models = None
        self.get_available_models()
        self.logger.info("Model cache refreshed")