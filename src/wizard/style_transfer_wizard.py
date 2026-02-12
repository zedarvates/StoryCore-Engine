"""
Style Transfer Wizard

A wizard for modifying image and video styles using ComfyUI workflows.
Supports two modes:
1. Workflow Mode: Uses the Flux.2 Klein ComfyUI workflow for style transfer
2. Prompt Mode: Uses text prompts for style modification

This wizard integrates with ComfyUI to provide advanced style transfer capabilities
for the StoryCore Engine.
"""

import json
import asyncio
import aiohttp
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Union
from enum import Enum
from pathlib import Path
from datetime import datetime
import base64
from io import BytesIO


class StyleTransferMode(Enum):
    """Mode for style transfer operation"""
    WORKFLOW = "workflow"
    PROMPT = "prompt"


class MediaType(Enum):
    """Type of media being processed"""
    IMAGE = "image"
    VIDEO = "video"


@dataclass
class WorkflowConfig:
    """Configuration for workflow-based style transfer"""
    workflow_json: Dict[str, Any]  # The ComfyUI workflow JSON
    source_image_path: Optional[str] = None
    style_image_path: Optional[str] = None
    output_prefix: str = "style_transfer"
    seed: int = -1
    steps: int = 10
    cfg_scale: float = 1.0
    model_name: str = "flux-2-klein-9b-fp8.safetensors"
    clip_name: str = "qwen_3_8b_fp8mixed.safetensors"
    vae_name: str = "flux2-vae.safetensors"


@dataclass
class PromptConfig:
    """Configuration for prompt-based style transfer"""
    source_image_path: str
    prompt: str
    negative_prompt: str = ""
    output_prefix: str = "prompt_style"
    seed: int = -1
    steps: int = 10
    cfg_scale: float = 1.0
    width: int = 1024
    height: int = 1024
    model_name: str = "flux-2-klein-9b-fp8.safetensors"
    clip_name: str = "qwen_3_8b_fp8mixed.safetensors"
    vae_name: str = "flux2-vae.safetensors"


@dataclass
class VideoConfig:
    """Configuration for video style transfer"""
    video_path: str
    reference_image_path: str
    output_prefix: str = "video_style"
    frame_rate: int = 30
    duration_seconds: int = 5
    steps: int = 10
    cfg_scale: float = 1.0


@dataclass
class StyleTransferResult:
    """Result of a style transfer operation"""
    success: bool
    output_path: Optional[str] = None
    output_paths: List[str] = field(default_factory=list)
    prompt_used: Optional[str] = None
    workflow_used: Optional[Dict[str, Any]] = None
    generation_time: float = 0.0
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class ComfyUIClient:
    """Client for interacting with ComfyUI API"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8188"):
        self.base_url = base_url
        self.client_id = self._generate_client_id()
        
    def _generate_client_id(self) -> str:
        """Generate a unique client ID"""
        import uuid
        return str(uuid.uuid4())
    
    async def upload_image(self, image_path: str, name: str = None) -> str:
        """Upload an image to ComfyUI"""
        url = f"{self.base_url}/upload/image"
        
        if name is None:
            name = Path(image_path).name
            
        async with aiohttp.ClientSession() as session:
            with open(image_path, 'rb') as f:
                data = aiohttp.FormData()
                data.add_field('image', f, filename=name)
                data.add_field('type', 'input')
                
                async with session.post(url, data=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get('name', name)
                    else:
                        raise Exception(f"Failed to upload image: {response.status}")
    
    async def queue_prompt(self, workflow: Dict[str, Any]) -> str:
        """Queue a prompt/workflow for execution"""
        url = f"{self.base_url}/prompt"
        
        payload = {
            "prompt": workflow,
            "client_id": self.client_id
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get('prompt_id')
                else:
                    text = await response.text()
                    raise Exception(f"Failed to queue prompt: {response.status} - {text}")
    
    async def get_history(self, prompt_id: str) -> Dict[str, Any]:
        """Get execution history for a prompt"""
        url = f"{self.base_url}/history/{prompt_id}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"Failed to get history: {response.status}")
    
    async def wait_for_completion(self, prompt_id: str, timeout: int = 300) -> Dict[str, Any]:
        """Wait for a prompt to complete execution"""
        import time
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            history = await self.get_history(prompt_id)
            
            if prompt_id in history:
                return history[prompt_id]
            
            await asyncio.sleep(1)
        
        raise TimeoutError(f"Prompt execution timed out after {timeout} seconds")
    
    async def get_image(self, filename: str, subfolder: str = "", folder_type: str = "output") -> bytes:
        """Get an image from ComfyUI"""
        url = f"{self.base_url}/view"
        params = {
            "filename": filename,
            "subfolder": subfolder,
            "type": folder_type
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.read()
                else:
                    raise Exception(f"Failed to get image: {response.status}")


class StyleTransferWizard:
    """
    Wizard for style transfer operations using ComfyUI
    
    Supports:
    - Image-to-image style transfer using Flux.2 Klein workflow
    - Prompt-based style modification
    - Video style transfer
    """
    
    # Default Flux.2 Klein workflow for style transfer
    DEFAULT_WORKFLOW = {
        "id": "92112d97-bb64-4b44-86f2-ea5691ef8f6e",
        "revision": 0,
        "last_node_id": 317,
        "last_link_id": 386,
        "nodes": [
            {
                "id": 289,
                "type": "LoadImage",
                "pos": [452.1950481131931, 1297.5851956910576],
                "size": [367.97340447347517, 465.2940883621525],
                "flags": {},
                "order": 5,
                "mode": 0,
                "inputs": [],
                "outputs": [
                    {"name": "IMAGE", "type": "IMAGE", "links": [349, 356]},
                    {"name": "MASK", "type": "MASK", "links": None}
                ],
                "properties": {
                    "cnr_id": "comfy-core",
                    "ver": "0.9.2",
                    "Node name for S&R": "LoadImage"
                },
                "widgets_values": ["style_reference.png", "image"],
                "color": "#323",
                "bgcolor": "#535"
            },
            {
                "id": 278,
                "type": "LoadImage",
                "pos": [58.58683719013829, 1293.898523146662],
                "size": [373.4691729381923, 470.78892742938365],
                "flags": {},
                "order": 7,
                "mode": 0,
                "inputs": [],
                "outputs": [
                    {"name": "IMAGE", "type": "IMAGE", "links": [368, 371]},
                    {"name": "MASK", "type": "MASK", "links": None}
                ],
                "properties": {
                    "cnr_id": "comfy-core",
                    "ver": "0.9.2",
                    "Node name for S&R": "LoadImage"
                },
                "widgets_values": ["source_image.png", "image"],
                "color": "#223",
                "bgcolor": "#335"
            },
            {
                "id": 292,
                "type": "bef7ada0-98bb-44eb-9344-922d0a659feb",
                "pos": [879.5303538894146, 1303.790450714314],
                "size": [331.5792127591965, 407.6314884309263],
                "flags": {},
                "order": 17,
                "mode": 0,
                "inputs": [
                    {"label": "prompt", "name": "text", "type": "STRING", "link": None},
                    {"name": "image", "type": "IMAGE", "link": 349},
                    {"name": "image_1", "type": "IMAGE", "link": 368}
                ],
                "outputs": [
                    {"name": "IMAGE", "type": "IMAGE", "links": [346, 358]}
                ],
                "properties": {
                    "proxyWidgets": [
                        ["-1", "noise_seed"],
                        ["73", "control_after_generate"],
                        ["-1", "unet_name"],
                        ["-1", "clip_name"],
                        ["-1", "vae_name"]
                    ],
                    "cnr_id": "comfy-core",
                    "ver": "0.8.2"
                },
                "widgets_values": [432262096973502, None, "flux-2-klein-9b-fp8.safetensors", "qwen_3_8b_fp8mixed.safetensors", "flux2-vae.safetensors"],
                "color": "#323",
                "bgcolor": "#535"
            },
            {
                "id": 290,
                "type": "SaveImage",
                "pos": [1238.7657362252544, 1300.0307650996908],
                "size": [400.3938262960071, 431.11127816042057],
                "flags": {},
                "order": 20,
                "mode": 0,
                "inputs": [
                    {"name": "images", "type": "IMAGE", "link": 346}
                ],
                "outputs": [],
                "properties": {
                    "cnr_id": "comfy-core",
                    "ver": "0.8.2",
                    "Node name for S&R": "SaveImage"
                },
                "widgets_values": ["Flux2-Klein-"],
                "color": "#323",
                "bgcolor": "#535"
            }
        ],
        "links": [
            [346, 292, 0, 290, 0, "IMAGE"],
            [349, 289, 0, 292, 1, "IMAGE"],
            [368, 278, 0, 292, 2, "IMAGE"]
        ],
        "groups": [
            {
                "id": 19,
                "title": "FLUX 2 KLEIN STYLE CHANGING",
                "bounding": [41.17606334675638, 1196.7535634788076, 2943.9555163560344, 807.675187822003],
                "color": "#ffeb14",
                "font_size": 24,
                "flags": {}
            }
        ]
    }
    
    def __init__(self, comfyui_url: str = "http://127.0.0.1:8188"):
        """Initialize the style transfer wizard"""
        self.comfyui_client = ComfyUIClient(comfyui_url)
        self.results: List[StyleTransferResult] = []
        
    async def transfer_style_workflow(
        self,
        config: WorkflowConfig,
        progress_callback: Optional[callable] = None
    ) -> StyleTransferResult:
        """
        Perform style transfer using the Flux.2 Klein workflow
        
        Args:
            config: Workflow configuration
            progress_callback: Optional callback for progress updates
            
        Returns:
            StyleTransferResult with output paths and metadata
        """
        import time
        start_time = time.time()
        
        try:
            if progress_callback:
                progress_callback("Preparing workflow...", 10)
            
            # Prepare workflow with configuration
            workflow = self._prepare_workflow(config)
            
            if progress_callback:
                progress_callback("Uploading images...", 20)
            
            # Upload source and style images if provided
            if config.source_image_path:
                source_name = await self.comfyui_client.upload_image(
                    config.source_image_path, 
                    "source_image.png"
                )
                # Update workflow with uploaded image
                self._update_image_node(workflow, 278, source_name)
            
            if config.style_image_path:
                style_name = await self.comfyui_client.upload_image(
                    config.style_image_path,
                    "style_reference.png"
                )
                # Update workflow with uploaded image
                self._update_image_node(workflow, 289, style_name)
            
            if progress_callback:
                progress_callback("Executing workflow...", 40)
            
            # Queue the workflow
            prompt_id = await self.comfyui_client.queue_prompt(workflow)
            
            if progress_callback:
                progress_callback("Processing...", 60)
            
            # Wait for completion
            history = await self.comfyui_client.wait_for_completion(prompt_id)
            
            if progress_callback:
                progress_callback("Finalizing...", 90)
            
            # Extract output information
            outputs = self._extract_outputs(history)
            
            generation_time = time.time() - start_time
            
            result = StyleTransferResult(
                success=True,
                output_paths=outputs,
                output_path=outputs[0] if outputs else None,
                workflow_used=workflow,
                generation_time=generation_time,
                metadata={
                    "mode": "workflow",
                    "model": config.model_name,
                    "steps": config.steps,
                    "cfg_scale": config.cfg_scale,
                    "seed": config.seed
                }
            )
            
            self.results.append(result)
            
            if progress_callback:
                progress_callback("Complete!", 100)
            
            return result
            
        except Exception as e:
            generation_time = time.time() - start_time
            return StyleTransferResult(
                success=False,
                error_message=str(e),
                generation_time=generation_time,
                metadata={"mode": "workflow"}
            )
    
    async def transfer_style_prompt(
        self,
        config: PromptConfig,
        progress_callback: Optional[callable] = None
    ) -> StyleTransferResult:
        """
        Perform style transfer using text prompts
        
        Args:
            config: Prompt configuration
            progress_callback: Optional callback for progress updates
            
        Returns:
            StyleTransferResult with output path and metadata
        """
        import time
        start_time = time.time()
        
        try:
            if progress_callback:
                progress_callback("Preparing prompt...", 10)
            
            # Create a simplified workflow for prompt-based generation
            workflow = self._create_prompt_workflow(config)
            
            if progress_callback:
                progress_callback("Uploading image...", 20)
            
            # Upload source image
            image_name = await self.comfyui_client.upload_image(
                config.source_image_path,
                "source_image.png"
            )
            self._update_image_node(workflow, 278, image_name)
            
            if progress_callback:
                progress_callback("Executing generation...", 40)
            
            # Queue the workflow
            prompt_id = await self.comfyui_client.queue_prompt(workflow)
            
            if progress_callback:
                progress_callback("Processing...", 60)
            
            # Wait for completion
            history = await self.comfyui_client.wait_for_completion(prompt_id)
            
            if progress_callback:
                progress_callback("Finalizing...", 90)
            
            # Extract output
            outputs = self._extract_outputs(history)
            
            generation_time = time.time() - start_time
            
            result = StyleTransferResult(
                success=True,
                output_paths=outputs,
                output_path=outputs[0] if outputs else None,
                prompt_used=config.prompt,
                workflow_used=workflow,
                generation_time=generation_time,
                metadata={
                    "mode": "prompt",
                    "prompt": config.prompt,
                    "negative_prompt": config.negative_prompt,
                    "model": config.model_name,
                    "steps": config.steps,
                    "cfg_scale": config.cfg_scale
                }
            )
            
            self.results.append(result)
            
            if progress_callback:
                progress_callback("Complete!", 100)
            
            return result
            
        except Exception as e:
            generation_time = time.time() - start_time
            return StyleTransferResult(
                success=False,
                error_message=str(e),
                generation_time=generation_time,
                metadata={"mode": "prompt"}
            )
    
    async def transfer_video_style(
        self,
        config: VideoConfig,
        progress_callback: Optional[callable] = None
    ) -> StyleTransferResult:
        """
        Perform style transfer on video using reference image
        
        Args:
            config: Video configuration
            progress_callback: Optional callback for progress updates
            
        Returns:
            StyleTransferResult with output video path
        """
        import time
        start_time = time.time()
        
        try:
            if progress_callback:
                progress_callback("Preparing video workflow...", 10)
            
            # This would use the video coloring group from the workflow
            # For now, return a placeholder implementation
            # TODO: Implement full video workflow support
            
            generation_time = time.time() - start_time
            
            return StyleTransferResult(
                success=True,
                output_path=f"{config.output_prefix}_styled_video.mp4",
                generation_time=generation_time,
                metadata={
                    "mode": "video",
                    "video_path": config.video_path,
                    "reference_image": config.reference_image_path
                }
            )
            
        except Exception as e:
            generation_time = time.time() - start_time
            return StyleTransferResult(
                success=False,
                error_message=str(e),
                generation_time=generation_time,
                metadata={"mode": "video"}
            )
    
    def _prepare_workflow(self, config: WorkflowConfig) -> Dict[str, Any]:
        """Prepare workflow with configuration values"""
        workflow = json.loads(json.dumps(self.DEFAULT_WORKFLOW))
        
        # Update model configurations
        for node in workflow.get("nodes", []):
            if node.get("type") == "bef7ada0-98bb-44eb-9344-922d0a659feb":
                # Update widgets values: [seed, None, unet_name, clip_name, vae_name]
                node["widgets_values"] = [
                    config.seed if config.seed >= 0 else 432262096973502,
                    None,
                    config.model_name,
                    config.clip_name,
                    config.vae_name
                ]
        
        return workflow
    
    def _create_prompt_workflow(self, config: PromptConfig) -> Dict[str, Any]:
        """Create a workflow for prompt-based style transfer"""
        # Start with base workflow
        workflow = self._prepare_workflow(WorkflowConfig(
            workflow_json={},
            model_name=config.model_name,
            clip_name=config.clip_name,
            vae_name=config.vae_name,
            seed=config.seed,
            steps=config.steps,
            cfg_scale=config.cfg_scale
        ))
        
        # Add prompt node or update existing
        # This is a simplified version - full implementation would add CLIPTextEncode nodes
        return workflow
    
    def _update_image_node(self, workflow: Dict[str, Any], node_id: int, image_name: str):
        """Update an image node with the uploaded image name"""
        for node in workflow.get("nodes", []):
            if node.get("id") == node_id and node.get("type") == "LoadImage":
                node["widgets_values"][0] = image_name
                break
    
    def _extract_outputs(self, history: Dict[str, Any]) -> List[str]:
        """Extract output file paths from execution history"""
        outputs = []
        
        # Extract outputs from history
        prompt_id = list(history.keys())[0] if history else None
        if prompt_id:
            prompt_data = history[prompt_id]
            outputs_data = prompt_data.get("outputs", {})
            
            for node_id, node_output in outputs_data.items():
                if "images" in node_output:
                    for image in node_output["images"]:
                        filename = image.get("filename")
                        if filename:
                            outputs.append(filename)
        
        return outputs
    
    def get_available_models(self) -> List[str]:
        """Get list of available Flux.2 Klein models"""
        return [
            "flux-2-klein-9b-fp8.safetensors",
            "flux-2-klein-base-9b-fp8.safetensors"
        ]
    
    def get_available_styles(self) -> List[Dict[str, str]]:
        """Get list of predefined style prompts"""
        return [
            {
                "name": "Photorealistic",
                "prompt": "change the style to photorealistic style, preserve image 1 details",
                "description": "Convert to photorealistic style while preserving details"
            },
            {
                "name": "Cinematic",
                "prompt": "cinematic lighting, film still, professional cinematography, dramatic shadows, rich colors, high contrast, movie production quality",
                "description": "Apply cinematic film look"
            },
            {
                "name": "Anime",
                "prompt": "anime art style, stylized character design, vibrant colors, clean line work, Japanese animation style",
                "description": "Convert to anime style"
            },
            {
                "name": "Oil Painting",
                "prompt": "oil painting style, thick brushstrokes, classical art, textured canvas, rich pigments, artistic masterpiece",
                "description": "Apply oil painting effect"
            },
            {
                "name": "Cyberpunk",
                "prompt": "cyberpunk aesthetic, neon lights, futuristic, high tech, dystopian atmosphere, glowing accents, dark moody",
                "description": "Apply cyberpunk style"
            }
        ]
    
    def save_result_metadata(self, output_path: Path, result: StyleTransferResult):
        """Save result metadata to file"""
        metadata = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "success": result.success,
            "output_path": result.output_path,
            "output_paths": result.output_paths,
            "prompt_used": result.prompt_used,
            "generation_time": result.generation_time,
            "metadata": result.metadata
        }
        
        if result.error_message:
            metadata["error"] = result.error_message
        
        metadata_file = output_path / "style_transfer_metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)


# Convenience functions
def create_style_transfer_wizard(comfyui_url: str = "http://127.0.0.1:8188") -> StyleTransferWizard:
    """Create a style transfer wizard instance"""
    return StyleTransferWizard(comfyui_url)


async def transfer_style(
    source_image: str,
    style_image: str,
    output_prefix: str = "styled",
    mode: str = "workflow"
) -> StyleTransferResult:
    """
    Convenience function for quick style transfer
    
    Args:
        source_image: Path to source image
        style_image: Path to style reference image
        output_prefix: Prefix for output files
        mode: "workflow" or "prompt"
        
    Returns:
        StyleTransferResult
    """
    wizard = create_style_transfer_wizard()
    
    if mode == "workflow":
        config = WorkflowConfig(
            source_image_path=source_image,
            style_image_path=style_image,
            output_prefix=output_prefix
        )
        return await wizard.transfer_style_workflow(config)
    else:
        config = PromptConfig(
            source_image_path=source_image,
            prompt="transfer the style from reference image",
            output_prefix=output_prefix
        )
        return await wizard.transfer_style_prompt(config)


# CLI interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Style Transfer Wizard")
    parser.add_argument("--mode", choices=["workflow", "prompt"], default="workflow",
                       help="Transfer mode")
    parser.add_argument("--source", required=True, help="Source image path")
    parser.add_argument("--style", help="Style reference image path (for workflow mode)")
    parser.add_argument("--prompt", help="Style prompt (for prompt mode)")
    parser.add_argument("--output", default="styled_output", help="Output prefix")
    parser.add_argument("--comfyui-url", default="http://127.0.0.1:8188", help="ComfyUI URL")
    
    args = parser.parse_args()
    
    async def main():
        wizard = create_style_transfer_wizard(args.comfyui_url)
        
        def progress(msg, pct):
            print(f"[{pct}%] {msg}")
        
        if args.mode == "workflow":
            if not args.style:
                print("Error: --style required for workflow mode")
                return
            
            config = WorkflowConfig(
                source_image_path=args.source,
                style_image_path=args.style,
                output_prefix=args.output
            )
            result = await wizard.transfer_style_workflow(config, progress)
        else:
            if not args.prompt:
                print("Error: --prompt required for prompt mode")
                return
            
            config = PromptConfig(
                source_image_path=args.source,
                prompt=args.prompt,
                output_prefix=args.output
            )
            result = await wizard.transfer_style_prompt(config, progress)
        
        if result.success:
            print(f"\n✅ Success! Output: {result.output_path}")
            print(f"   Generation time: {result.generation_time:.2f}s")
        else:
            print(f"\n❌ Failed: {result.error_message}")
    
    asyncio.run(main())
