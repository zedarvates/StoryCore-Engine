"""
Workflow Manager for ComfyUI Desktop Integration.

Handles workflow deployment, validation, and version tracking.
"""

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Any
from enum import Enum

from .workflow_configs import ZImageTurboConfig, LTX2ImageToVideoConfig


logger = logging.getLogger(__name__)


@dataclass
class WorkflowInfo:
    """Information about a ComfyUI workflow"""
    name: str
    version: str
    file_path: Path
    description: str
    required_nodes: List[str]
    required_models: List[str]
    installed: bool = False
    up_to_date: bool = False


@dataclass
class WorkflowValidationResult:
    """Result of workflow validation"""
    valid: bool
    workflow_name: str
    missing_nodes: List[str] = field(default_factory=list)
    missing_models: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class WorkflowManager:
    """
    Manages ComfyUI workflow deployment and validation.
    
    Handles automatic deployment of required workflows, validation of
    node compatibility, and version tracking.
    """
    
    def __init__(self, workflows_dir: Path, comfyui_workflows_dir: Path):
        """
        Initialize WorkflowManager.
        
        Args:
            workflows_dir: Path to StoryCore's workflow templates directory
            comfyui_workflows_dir: Path to ComfyUI's workflow directory
        """
        self.workflows_dir = workflows_dir
        self.comfyui_workflows_dir = comfyui_workflows_dir
        self.workflow_registry: Dict[str, WorkflowInfo] = {}
        
        # Ensure ComfyUI workflows directory exists
        self.comfyui_workflows_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize workflow registry
        self._initialize_registry()
    
    def _initialize_registry(self):
        """Initialize the workflow registry with required workflows"""
        
        # Define required workflows
        required_workflows = [
            # Z-Image Turbo workflows (default - highest priority)
            WorkflowInfo(
                name="z_image_turbo_generation",
                version="1.0.0",
                file_path=self.workflows_dir / "z_image_turbo_generation.json",
                description="Z-Image Turbo fast image generation (DEFAULT)",
                required_nodes=[
                    "KSampler",
                    "CLIPTextEncode",
                    "CLIPLoader",
                    "UNETLoader",
                    "VAELoader",
                    "VAEDecode",
                    "SaveImage",
                    "EmptySD3LatentImage",
                    "ModelSamplingAuraFlow",
                    "ConditioningZeroOut",
                    "StringConcatenate",
                    "PrimitiveStringMultiline"
                ],
                required_models=["Z-Image Turbo", "Qwen 3 4B", "AE VAE"]
            ),
            WorkflowInfo(
                name="z_image_turbo_coherence_grid",
                version="1.0.0",
                file_path=self.workflows_dir / "z_image_turbo_coherence_grid.json",
                description="3x3 Master Coherence Sheet with Z-Image Turbo",
                required_nodes=[
                    "KSampler",
                    "CLIPTextEncode",
                    "CLIPLoader",
                    "UNETLoader",
                    "VAELoader",
                    "VAEDecode",
                    "SaveImage",
                    "EmptySD3LatentImage",
                    "ModelSamplingAuraFlow",
                    "ConditioningZeroOut",
                    "StringConcatenate",
                    "PrimitiveStringMultiline",
                    "GridCombiner"
                ],
                required_models=["Z-Image Turbo", "Qwen 3 4B", "AE VAE"]
            ),
            WorkflowInfo(
                name="z_image_turbo_shot_generation",
                version="1.0.0",
                file_path=self.workflows_dir / "z_image_turbo_shot_generation.json",
                description="Individual shot generation with Z-Image Turbo and style reference",
                required_nodes=[
                    "KSampler",
                    "CLIPTextEncode",
                    "CLIPLoader",
                    "UNETLoader",
                    "VAELoader",
                    "VAEDecode",
                    "VAEEncode",
                    "LoadImage",
                    "SaveImage",
                    "EmptySD3LatentImage",
                    "ModelSamplingAuraFlow",
                    "ConditioningZeroOut",
                    "StringConcatenate",
                    "PrimitiveStringMultiline"
                ],
                required_models=["Z-Image Turbo", "Qwen 3 4B", "AE VAE"]
            ),
            # FLUX workflows (alternative)
            WorkflowInfo(
                name="flux_basic_generation",
                version="1.0.0",
                file_path=self.workflows_dir / "flux_basic_generation.json",
                description="Basic FLUX image generation workflow",
                required_nodes=[
                    "KSampler",
                    "CLIPTextEncode",
                    "CheckpointLoaderSimple",
                    "VAEDecode",
                    "SaveImage"
                ],
                required_models=["FLUX Dev", "T5XXL", "CLIP", "VAE"]
            ),
            WorkflowInfo(
                name="flux_coherence_grid",
                version="1.0.0",
                file_path=self.workflows_dir / "flux_coherence_grid.json",
                description="3x3 Master Coherence Sheet generation workflow",
                required_nodes=[
                    "KSampler",
                    "CLIPTextEncode",
                    "CheckpointLoaderSimple",
                    "VAEDecode",
                    "SaveImage",
                    "LatentComposite"
                ],
                required_models=["FLUX Dev", "T5XXL", "CLIP", "VAE"]
            ),
            WorkflowInfo(
                name="flux_shot_generation",
                version="1.0.0",
                file_path=self.workflows_dir / "flux_shot_generation.json",
                description="Individual shot generation with style reference",
                required_nodes=[
                    "KSampler",
                    "CLIPTextEncode",
                    "CheckpointLoaderSimple",
                    "VAEDecode",
                    "VAEEncode",
                    "LoadImage",
                    "SaveImage"
                ],
                required_models=["FLUX Dev", "T5XXL", "CLIP", "VAE"]
            ),
            WorkflowInfo(
                name="sdxl_fallback",
                version="1.0.0",
                file_path=self.workflows_dir / "sdxl_fallback.json",
                description="SDXL fallback workflow for compatibility",
                required_nodes=[
                    "KSampler",
                    "CLIPTextEncode",
                    "CheckpointLoaderSimple",
                    "VAEDecode",
                    "SaveImage"
                ],
                required_models=["SDXL Base"]
            ),
            # LTX-2 image-to-video workflow
            WorkflowInfo(
                name="ltx2_image_to_video",
                version="1.0.0",
                file_path=self.workflows_dir / "ltx2_image_to_video.json",
                description="LTX-2 image-to-video conversion with audio generation",
                required_nodes=[
                    "LoadImage",
                    "ResizeImageMaskNode",
                    "CheckpointLoaderSimple",
                    "LTXAVTextEncoderLoader",
                    "LTXVAudioVAELoader",
                    "LatentUpscaleModelLoader",
                    "CLIPTextEncode",
                    "PrimitiveInt",
                    "RandomNoise",
                    "ManualSigmaSchedule",
                    "ImageCompressionNode",
                    "LongerEdgeResize",
                    "UpscaleStrength",
                    "KSamplerSelect",
                    "SamplerCustomAdvanced",
                    "EmptyLTXVLatentVideo",
                    "LatentUpscale",
                    "VAEDecode",
                    "SaveVideo"
                ],
                required_models=["LTX-2 19B Distilled", "Gemma 3 12B IT FP4", "LTX-2 Spatial Upscaler"]
            ),
        ]
        
        # Add workflows to registry
        for workflow in required_workflows:
            self.workflow_registry[workflow.name] = workflow
            logger.debug(f"Registered workflow: {workflow.name} v{workflow.version}")
    
    def check_installed_workflows(self) -> List[WorkflowInfo]:
        """
        Check which workflows are installed in ComfyUI.
        
        Returns:
            List of WorkflowInfo for all workflows with installation status updated
        """
        installed_workflows = []
        
        for workflow_name, workflow_info in self.workflow_registry.items():
            # Check if workflow file exists in ComfyUI directory
            comfyui_workflow_path = self.comfyui_workflows_dir / workflow_info.file_path.name
            
            if comfyui_workflow_path.exists():
                workflow_info.installed = True
                
                # Check if version matches
                installed_version = self.get_workflow_version(workflow_name)
                if installed_version == workflow_info.version:
                    workflow_info.up_to_date = True
                else:
                    workflow_info.up_to_date = False
                    logger.info(
                        f"Workflow {workflow_name} is outdated: "
                        f"installed={installed_version}, latest={workflow_info.version}"
                    )
            else:
                workflow_info.installed = False
                workflow_info.up_to_date = False
                logger.info(f"Workflow {workflow_name} is not installed")
            
            installed_workflows.append(workflow_info)
        
        return installed_workflows
    
    def get_workflow_version(self, workflow_name: str) -> Optional[str]:
        """
        Get version of installed workflow.
        
        Args:
            workflow_name: Name of the workflow
            
        Returns:
            Version string if found, None otherwise
        """
        if workflow_name not in self.workflow_registry:
            logger.warning(f"Workflow {workflow_name} not found in registry")
            return None
        
        workflow_info = self.workflow_registry[workflow_name]
        comfyui_workflow_path = self.comfyui_workflows_dir / workflow_info.file_path.name
        
        if not comfyui_workflow_path.exists():
            return None
        
        try:
            with open(comfyui_workflow_path, 'r', encoding='utf-8') as f:
                workflow_data = json.load(f)
                
                # Check for version in metadata
                if isinstance(workflow_data, dict):
                    # Try common version field locations
                    version = (
                        workflow_data.get('version') or
                        workflow_data.get('metadata', {}).get('version') or
                        workflow_data.get('extra', {}).get('version')
                    )
                    
                    if version:
                        return str(version)
                
                # If no version found, return None
                logger.debug(f"No version metadata found in {workflow_name}")
                return None
                
        except Exception as e:
            logger.error(f"Error reading workflow version for {workflow_name}: {str(e)}")
            return None
    
    def check_for_updates(self) -> List[WorkflowInfo]:
        """
        Check for workflow updates.
        
        Returns:
            List of WorkflowInfo for workflows that have updates available
        """
        outdated_workflows = []
        
        # First check installation status
        self.check_installed_workflows()
        
        for workflow_name, workflow_info in self.workflow_registry.items():
            if workflow_info.installed and not workflow_info.up_to_date:
                outdated_workflows.append(workflow_info)
                logger.info(f"Update available for workflow: {workflow_name}")
        
        return outdated_workflows
    
    def deploy_workflow(self, workflow_name: str) -> bool:
        """
        Deploy a workflow to ComfyUI.
        
        Copies the workflow JSON file from StoryCore's workflow directory
        to ComfyUI's workflow directory.
        
        Args:
            workflow_name: Name of the workflow to deploy
            
        Returns:
            True if deployment succeeded, False otherwise
        """
        if workflow_name not in self.workflow_registry:
            logger.error(f"Workflow {workflow_name} not found in registry")
            return False
        
        workflow_info = self.workflow_registry[workflow_name]
        
        # Check if source workflow file exists
        if not workflow_info.file_path.exists():
            logger.error(f"Source workflow file not found: {workflow_info.file_path}")
            return False
        
        try:
            # Destination path in ComfyUI workflows directory
            dest_path = self.comfyui_workflows_dir / workflow_info.file_path.name
            
            # Read source workflow
            with open(workflow_info.file_path, 'r', encoding='utf-8') as f:
                workflow_data = json.load(f)
            
            # Add version metadata if not present
            if isinstance(workflow_data, dict):
                if 'metadata' not in workflow_data:
                    workflow_data['metadata'] = {}
                workflow_data['metadata']['version'] = workflow_info.version
                workflow_data['metadata']['deployed_by'] = 'StoryCore-Engine'
            
            # Write to destination with proper permissions
            with open(dest_path, 'w', encoding='utf-8') as f:
                json.dump(workflow_data, f, indent=2)
            
            # Set file permissions (readable by all, writable by owner)
            dest_path.chmod(0o644)
            
            logger.info(f"Successfully deployed workflow: {workflow_name} to {dest_path}")
            
            # Update installation status
            workflow_info.installed = True
            workflow_info.up_to_date = True
            
            return True
            
        except PermissionError as e:
            logger.error(f"Permission denied when deploying {workflow_name}: {str(e)}")
            return False
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in workflow {workflow_name}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error deploying workflow {workflow_name}: {str(e)}", exc_info=True)
            return False
    
    def deploy_all_workflows(self) -> Dict[str, bool]:
        """
        Deploy all required workflows to ComfyUI.
        
        Returns:
            Dictionary mapping workflow names to deployment success status
        """
        results = {}
        
        logger.info(f"Deploying {len(self.workflow_registry)} workflows")
        
        for workflow_name in self.workflow_registry.keys():
            logger.info(f"Deploying workflow: {workflow_name}")
            success = self.deploy_workflow(workflow_name)
            results[workflow_name] = success
            
            if not success:
                logger.warning(f"Failed to deploy {workflow_name}, continuing with next workflow")
        
        # Summary
        successful = sum(1 for success in results.values() if success)
        logger.info(f"Deployment complete: {successful}/{len(results)} workflows deployed successfully")
        
        return results
    
    def validate_workflow(
        self,
        workflow_path: Path,
        installed_nodes: Optional[List[str]] = None
    ) -> WorkflowValidationResult:
        """
        Validate workflow compatibility with installed nodes.
        
        Parses the workflow JSON to extract required nodes and checks
        against ComfyUI's installed custom nodes.
        
        Args:
            workflow_path: Path to the workflow JSON file
            installed_nodes: Optional list of installed node types. If None,
                           validation will only check for structural issues.
            
        Returns:
            WorkflowValidationResult with validation details
        """
        workflow_name = workflow_path.stem
        
        result = WorkflowValidationResult(
            valid=True,
            workflow_name=workflow_name
        )
        
        # Check if workflow file exists
        if not workflow_path.exists():
            result.valid = False
            result.errors.append(f"Workflow file not found: {workflow_path}")
            return result
        
        try:
            # Load workflow JSON
            with open(workflow_path, 'r', encoding='utf-8') as f:
                workflow_data = json.load(f)
            
            # Extract required nodes from workflow
            required_nodes = self._extract_required_nodes(workflow_data)
            
            if not required_nodes:
                result.warnings.append("No nodes found in workflow")
            
            # If installed_nodes provided, check compatibility
            if installed_nodes is not None:
                missing_nodes = [
                    node for node in required_nodes
                    if node not in installed_nodes
                ]
                
                if missing_nodes:
                    result.valid = False
                    result.missing_nodes = missing_nodes
                    result.errors.append(
                        f"Missing required nodes: {', '.join(missing_nodes)}"
                    )
                    logger.warning(
                        f"Workflow {workflow_name} requires missing nodes: {missing_nodes}"
                    )
            
            # Check for required models (from registry if available)
            if workflow_name in self.workflow_registry:
                workflow_info = self.workflow_registry[workflow_name]
                result.missing_models = workflow_info.required_models
                
                if workflow_info.required_models:
                    result.warnings.append(
                        f"Requires models: {', '.join(workflow_info.required_models)}"
                    )
            
            # Validate JSON structure
            if not isinstance(workflow_data, dict):
                result.valid = False
                result.errors.append("Workflow must be a JSON object")
            
            logger.info(f"Workflow validation for {workflow_name}: {'PASSED' if result.valid else 'FAILED'}")
            
        except json.JSONDecodeError as e:
            result.valid = False
            result.errors.append(f"Invalid JSON: {str(e)}")
            logger.error(f"JSON decode error in {workflow_name}: {str(e)}")
        except Exception as e:
            result.valid = False
            result.errors.append(f"Validation error: {str(e)}")
            logger.error(f"Error validating workflow {workflow_name}: {str(e)}", exc_info=True)
        
        return result
    
    def _extract_required_nodes(self, workflow_data: dict) -> List[str]:
        """
        Extract required node types from workflow JSON.
        
        Args:
            workflow_data: Parsed workflow JSON data
            
        Returns:
            List of unique node type names
        """
        required_nodes = set()
        
        try:
            # ComfyUI workflows typically have nodes in a top-level dict
            # where each key is a node ID and value contains node info
            if isinstance(workflow_data, dict):
                for node_id, node_data in workflow_data.items():
                    if isinstance(node_data, dict):
                        # Look for class_type field (standard ComfyUI format)
                        if 'class_type' in node_data:
                            required_nodes.add(node_data['class_type'])
                        # Also check 'type' field (alternative format)
                        elif 'type' in node_data:
                            required_nodes.add(node_data['type'])
        except Exception as e:
            logger.warning(f"Error extracting nodes from workflow: {str(e)}")
        
        return sorted(list(required_nodes))
    
    def get_default_workflow(self) -> str:
        """
        Get the default workflow name.
        
        Returns Z-Image Turbo as the default workflow for image generation.
        
        Returns:
            Default workflow name
            
        Validates: Requirements 13.2
        """
        return "z_image_turbo_generation"
    
    def _load_workflow_template(self, workflow_name: str) -> Dict[str, Any]:
        """
        Load a workflow template from file.
        
        Args:
            workflow_name: Name of the workflow (with or without .json extension)
            
        Returns:
            Parsed workflow JSON data
            
        Raises:
            FileNotFoundError: If workflow file not found
            json.JSONDecodeError: If workflow JSON is invalid
        """
        # Ensure .json extension
        if not workflow_name.endswith('.json'):
            workflow_name = f"{workflow_name}.json"
        
        workflow_path = self.workflows_dir / workflow_name
        
        if not workflow_path.exists():
            raise FileNotFoundError(f"Workflow template not found: {workflow_path}")
        
        with open(workflow_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def create_z_image_turbo_workflow(
        self,
        prompt: str,
        config: ZImageTurboConfig,
        seed: int = 0
    ) -> Dict[str, Any]:
        """
        Create Z-Image Turbo workflow with custom parameters.
        
        Loads the workflow template and injects custom prompt, dimensions,
        sampling parameters, and optional style prefix.
        
        Args:
            prompt: Text prompt for image generation
            config: Z-Image Turbo configuration
            seed: Random seed for generation (default: 0)
            
        Returns:
            Complete workflow JSON ready for ComfyUI
            
        Validates: Requirements 13.2, 13.9, 13.11
        """
        # Load workflow template
        workflow = self._load_workflow_template("z_image_turbo_generation.json")
        
        # Update prompt
        if "58" in workflow:
            workflow["58"]["inputs"]["value"] = prompt
        
        # Update style prefix if provided
        if config.style_prefix and "61" in workflow:
            workflow["61"]["inputs"]["string_a"] = config.style_prefix
        
        # Update dimensions
        if "57:13" in workflow:
            workflow["57:13"]["inputs"]["width"] = config.width
            workflow["57:13"]["inputs"]["height"] = config.height
        
        # Update sampling parameters
        if "57:3" in workflow:
            workflow["57:3"]["inputs"]["seed"] = seed
            workflow["57:3"]["inputs"]["steps"] = config.steps
            workflow["57:3"]["inputs"]["cfg"] = config.cfg
            workflow["57:3"]["inputs"]["sampler_name"] = config.sampler_name
            workflow["57:3"]["inputs"]["scheduler"] = config.scheduler
        
        # Update shift
        if "57:11" in workflow:
            workflow["57:11"]["inputs"]["shift"] = config.shift
        
        logger.info(
            f"Created Z-Image Turbo workflow: {config.width}x{config.height}, "
            f"{config.steps} steps, seed={seed}"
        )
        
        return workflow
    
    def create_z_image_turbo_coherence_grid_workflow(
        self,
        prompt: str,
        config: ZImageTurboConfig,
        base_seed: int = 1000
    ) -> Dict[str, Any]:
        """
        Create Z-Image Turbo 3x3 coherence grid workflow.
        
        Args:
            prompt: Base text prompt for all panels
            config: Z-Image Turbo configuration
            base_seed: Base seed for panel generation (panels use base_seed + panel_number)
            
        Returns:
            Complete workflow JSON for 3x3 grid generation
            
        Validates: Requirements 13.2
        """
        # Load workflow template
        workflow = self._load_workflow_template("z_image_turbo_coherence_grid.json")
        
        # Update base prompt
        if "58" in workflow:
            workflow["58"]["inputs"]["value"] = prompt
        
        # Update style prefix if provided
        if config.style_prefix and "61" in workflow:
            workflow["61"]["inputs"]["string_a"] = config.style_prefix
        
        # Update dimensions for all panels
        for panel_num in range(1, 10):
            latent_node = f"panel_{panel_num}:13"
            if latent_node in workflow:
                workflow[latent_node]["inputs"]["width"] = config.width
                workflow[latent_node]["inputs"]["height"] = config.height
            
            # Update sampling parameters for each panel
            sampler_node = f"panel_{panel_num}:3"
            if sampler_node in workflow:
                workflow[sampler_node]["inputs"]["seed"] = base_seed + panel_num
                workflow[sampler_node]["inputs"]["steps"] = config.steps
                workflow[sampler_node]["inputs"]["cfg"] = config.cfg
                workflow[sampler_node]["inputs"]["sampler_name"] = config.sampler_name
                workflow[sampler_node]["inputs"]["scheduler"] = config.scheduler
        
        # Update shift (shared across all panels)
        if "57:11" in workflow:
            workflow["57:11"]["inputs"]["shift"] = config.shift
        
        logger.info(
            f"Created Z-Image Turbo 3x3 grid workflow: {config.width}x{config.height}, "
            f"{config.steps} steps, base_seed={base_seed}"
        )
        
        return workflow
    
    def create_z_image_turbo_shot_workflow(
        self,
        prompt: str,
        style_reference_path: str,
        config: ZImageTurboConfig,
        seed: int = 0,
        shot_width: int = 1920,
        shot_height: int = 1080
    ) -> Dict[str, Any]:
        """
        Create Z-Image Turbo shot generation workflow with style reference.
        
        Args:
            prompt: Text prompt for shot generation
            style_reference_path: Path to Master Coherence Sheet image
            config: Z-Image Turbo configuration
            seed: Random seed for generation
            shot_width: Output shot width (default: 1920)
            shot_height: Output shot height (default: 1080)
            
        Returns:
            Complete workflow JSON for shot generation
            
        Validates: Requirements 13.2
        """
        # Load workflow template
        workflow = self._load_workflow_template("z_image_turbo_shot_generation.json")
        
        # Update prompt
        if "58" in workflow:
            workflow["58"]["inputs"]["value"] = prompt
        
        # Update style prefix if provided
        if config.style_prefix and "61" in workflow:
            workflow["61"]["inputs"]["string_a"] = config.style_prefix
        
        # Update style reference image path
        if "style_reference" in workflow:
            workflow["style_reference"]["inputs"]["image"] = style_reference_path
        
        # Update shot dimensions
        if "57:13" in workflow:
            workflow["57:13"]["inputs"]["width"] = shot_width
            workflow["57:13"]["inputs"]["height"] = shot_height
        
        # Update sampling parameters
        if "57:3" in workflow:
            workflow["57:3"]["inputs"]["seed"] = seed
            workflow["57:3"]["inputs"]["steps"] = config.steps
            workflow["57:3"]["inputs"]["cfg"] = config.cfg
            workflow["57:3"]["inputs"]["sampler_name"] = config.sampler_name
            workflow["57:3"]["inputs"]["scheduler"] = config.scheduler
        
        # Update shift
        if "57:11" in workflow:
            workflow["57:11"]["inputs"]["shift"] = config.shift
        
        logger.info(
            f"Created Z-Image Turbo shot workflow: {shot_width}x{shot_height}, "
            f"{config.steps} steps, seed={seed}, style_ref={style_reference_path}"
        )
        
        return workflow


    def get_video_workflow_options(self) -> List[str]:
        """
        Get list of available video generation workflows.
        
        Returns:
            List of video workflow names
            
        Validates: Requirements 14.1
        """
        return ["ltx2_image_to_video"]
    
    def create_ltx2_image_to_video_workflow(
        self,
        input_image_path: str,
        prompt: str,
        config: LTX2ImageToVideoConfig,
    ) -> Dict[str, Any]:
        """
        Create LTX-2 image-to-video workflow with custom parameters.
        
        Loads the workflow template and injects input image path, prompt,
        resize dimensions, frame count, sampling parameters, and sigma schedules.
        
        Args:
            input_image_path: Path to input image file
            prompt: Text prompt for motion and scene description
            config: LTX-2 image-to-video configuration
            
        Returns:
            Complete workflow JSON ready for ComfyUI
            
        Validates: Requirements 14.8, 14.9, 14.10, 14.12
        """
        # Load workflow template
        workflow = self._load_workflow_template("ltx2_image_to_video.json")
        
        # Update input image
        if "98" in workflow:
            workflow["98"]["inputs"]["image"] = input_image_path
        
        # Update resize dimensions
        if "102" in workflow:
            workflow["102"]["inputs"]["resize_type.width"] = config.resize_width
            workflow["102"]["inputs"]["resize_type.height"] = config.resize_height
            workflow["102"]["inputs"]["scale_method"] = config.resize_method
            workflow["102"]["inputs"]["resize_type.crop"] = config.crop_type
        
        # Update prompt
        if "92:3" in workflow:
            workflow["92:3"]["inputs"]["text"] = prompt
        
        # Update frame count
        if "92:62" in workflow:
            workflow["92:62"]["inputs"]["value"] = config.frame_count
        
        # Update noise seeds
        if "92:11" in workflow:
            workflow["92:11"]["inputs"]["noise_seed"] = config.noise_seed_stage1
        if "92:67" in workflow:
            workflow["92:67"]["inputs"]["noise_seed"] = config.noise_seed_stage2
        
        # Update sigma schedules
        if "92:113" in workflow:
            workflow["92:113"]["inputs"]["sigmas"] = config.stage1_sigmas
        if "92:73" in workflow:
            workflow["92:73"]["inputs"]["sigmas"] = config.stage2_sigmas
        
        # Update samplers
        if "92:50" in workflow:
            workflow["92:50"]["inputs"]["sampler_name"] = config.stage1_sampler
        if "92:51" in workflow:
            workflow["92:51"]["inputs"]["sampler_name"] = config.stage2_sampler
        
        # Update preprocessing parameters
        if "92:99" in workflow:
            workflow["92:99"]["inputs"]["img_compression"] = config.img_compression
        if "92:106" in workflow:
            workflow["92:106"]["inputs"]["longer_edge"] = config.longer_edge_resize
        if "92:107" in workflow:
            workflow["92:107"]["inputs"]["strength"] = config.upscale_strength
        if "92:108" in workflow:
            workflow["92:108"]["inputs"]["strength"] = config.upscale_strength
        
        # Update CFG scale for both stages
        if "92:80" in workflow:
            workflow["92:80"]["inputs"]["cfg"] = config.cfg_scale
        if "92:95" in workflow:
            workflow["92:95"]["inputs"]["cfg"] = config.cfg_scale
        
        # Update latent video dimensions
        if "92:85" in workflow:
            workflow["92:85"]["inputs"]["width"] = config.resize_width
            workflow["92:85"]["inputs"]["height"] = config.resize_height
        
        logger.info(
            f"Created LTX-2 image-to-video workflow: {config.resize_width}x{config.resize_height}, "
            f"{config.frame_count} frames at {config.frame_rate}fps ({config.video_duration_seconds:.2f}s), "
            f"input={input_image_path}"
        )
        
        return workflow
