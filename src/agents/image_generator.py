"""
Agent Image Generator

This module handles automatic image generation for agent cards using ComfyUI.
Falls back to manual image prompts if ComfyUI is not available.

Usage:
    from agents.image_generator import AgentImageGenerator
    
    generator = AgentImageGenerator()
    
    # Generate with ComfyUI (if available)
    result = generator.generate_image("scientific_audit", card["image"]["prompt"])
    
    # Or get the prompt for manual generation
    prompt = generator.get_manual_prompt("scientific_audit")
"""

import os
import json
import asyncio
import aiohttp
from typing import Dict, Any, Optional, List
from pathlib import Path


class AgentImageGenerator:
    """Generator for agent card images using ComfyUI."""
    
    def __init__(self, base_path: Optional[str] = None):
        """
        Initialize the Image Generator.
        
        Args:
            base_path: Base path for the project
        """
        self.base_path = base_path or "C:/storycore-engine"
        self.agents_dir = os.path.join(self.base_path, "agents")
        self.assets_dir = os.path.join(self.base_path, "assets", "agents")
        
        # Ensure directories exist
        os.makedirs(self.assets_dir, exist_ok=True)
        
        # Load ComfyUI configuration
        self.comfyui_url = self._get_comfyui_url()
        self.comfyui_available = False
    
    def _get_comfyui_url(self) -> str:
        """Get ComfyUI URL from environment or config."""
        # Check environment variable
        url = os.environ.get("COMFYUI_URL")
        if url:
            return url
        
        # Check config file
        config_path = os.path.join(self.base_path, "config", "comfyui_config.json")
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    return config.get("url", "http://localhost:8188")
            except Exception:
                pass
        
        # Default to localhost
        return "http://localhost:8188"
    
    async def _check_comfyui_connection(self) -> bool:
        """Check if ComfyUI is available."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.comfyui_url}/system_stats", timeout=5) as response:
                    return response.status == 200
        except Exception:
            return False
    
    def is_comfyui_available(self) -> bool:
        """Check if ComfyUI is available (synchronous wrapper)."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is running, schedule the check
                future = asyncio.run_coroutine_threadsafe(
                    self._check_comfyui_connection(), 
                    loop
                )
                return future.result(timeout=5)
            else:
                return asyncio.run(self._check_comfyui_connection())
        except Exception:
            return False
    
    def generate_image(
        self,
        agent_id: str,
        prompt: str,
        negative_prompt: Optional[str] = None,
        workflow: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate an image for an agent card.
        
        Args:
            agent_id: Agent identifier
            prompt: Positive prompt for generation
            negative_prompt: Negative prompt (optional)
            workflow: Custom ComfyUI workflow (optional)
            
        Returns:
            Dictionary with generation result:
            - success: bool
            - image_path: str (if successful)
            - prompt: str (for manual generation if failed)
            - message: str (status message)
        """
        # Check ComfyUI availability
        if not self.is_comfyui_available():
            return {
                "success": False,
                "agent_id": agent_id,
                "image_path": None,
                "prompt": self._build_full_prompt(prompt, negative_prompt),
                "message": "ComfyUI not available. Use the prompt for manual generation."
            }
        
        # Use default workflow if not provided
        if workflow is None:
            workflow = self._get_default_workflow(prompt, negative_prompt)
        
        try:
            # Run async generation
            loop = asyncio.get_event_loop()
            if loop.is_running():
                future = asyncio.run_coroutine_threadsafe(
                    self._send_to_comfyui(workflow, agent_id),
                    loop
                )
                return future.result(timeout=120)
            else:
                return asyncio.run(self._send_to_comfyui(workflow, agent_id))
                
        except Exception as e:
            return {
                "success": False,
                "agent_id": agent_id,
                "image_path": None,
                "prompt": self._build_full_prompt(prompt, negative_prompt),
                "message": f"Generation failed: {str(e)}"
            }
    
    async def _send_to_comfyui(
        self,
        workflow: Dict[str, Any],
        agent_id: str
    ) -> Dict[str, Any]:
        """Send workflow to ComfyUI and get the result."""
        async with aiohttp.ClientSession() as session:
            # Queue the workflow
            async with session.post(
                f"{self.comfyui_url}/prompt",
                json={"prompt": workflow}
            ) as response:
                if response.status != 200:
                    return {
                        "success": False,
                        "agent_id": agent_id,
                        "prompt": "",
                        "message": f"Failed to queue workflow: {response.status}"
                    }
                
                result = await response.json()
                prompt_id = result.get("prompt_id")
            
            # Wait for completion
            if prompt_id:
                return await self._wait_for_completion(session, prompt_id, agent_id)
            
            return {
                "success": False,
                "agent_id": agent_id,
                "prompt": "",
                "message": "No prompt_id returned"
            }
    
    async def _wait_for_completion(
        self,
        session: aiohttp.ClientSession,
        prompt_id: str,
        agent_id: str,
        timeout: int = 120
    ) -> Dict[str, Any]:
        """Wait for ComfyUI to finish processing."""
        import time
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                async with session.get(
                    f"{self.comfyui_url}/history/{prompt_id}"
                ) as response:
                    if response.status == 200:
                        history = await response.json()
                        if prompt_id in history:
                            result = history[prompt_id]
                            return await self._save_comfyui_output(
                                result, agent_id
                            )
            except Exception:
                pass
            
            await asyncio.sleep(1)
        
        return {
            "success": False,
            "agent_id": agent_id,
            "prompt": "",
            "message": "Timeout waiting for generation"
        }
    
    async def _save_comfyui_output(
        self,
        result: Dict[str, Any],
        agent_id: str
    ) -> Dict[str, Any]:
        """Save ComfyUI output to file."""
        # Find output images
        outputs = result.get("outputs", {})
        
        for node_id, node_data in outputs.items():
            if "images" in node_data:
                for image in node_data["images"]:
                    filename = image.get("filename")
                    subfolder = image.get("subfolder", "")
                    
                    # Get the image
                    try:
                        async with aiohttp.ClientSession() as session:
                            async with session.get(
                                f"{self.comfyui_url}/view",
                                params={
                                    "filename": filename,
                                    "subfolder": subfolder
                                }
                            ) as response:
                                if response.status == 200:
                                    # Save to assets
                                    output_path = os.path.join(
                                        self.assets_dir,
                                        f"{agent_id}_card.png"
                                    )
                                    
                                    with open(output_path, 'wb') as f:
                                        f.write(await response.read())
                                    
                                    return {
                                        "success": True,
                                        "agent_id": agent_id,
                                        "image_path": output_path,
                                        "message": "Image generated successfully"
                                    }
                    except Exception as e:
                        return {
                            "success": False,
                            "agent_id": agent_id,
                            "prompt": "",
                            "message": f"Failed to save image: {str(e)}"
                        }
        
        return {
            "success": False,
            "agent_id": agent_id,
            "prompt": "",
            "message": "No output images found"
        }
    
    def _get_default_workflow(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get default ComfyUI workflow for agent card generation."""
        full_prompt = self._build_full_prompt(prompt, negative_prompt)
        
        # Basic workflow for portrait/badge generation
        # This can be customized based on your ComfyUI setup
        workflow = {
            "1": {
                "inputs": {
                    "text": full_prompt,
                    "clip": ["3", 0]
                },
                "class_type": "CLIPTextEncode",
                "id": "5"
            },
            "2": {
                "inputs": {
                    "text": "blurry, low quality, distorted, deformed, ugly, bad anatomy",
                    "clip": ["3", 0]
                },
                "class_type": "CLIPTextEncode",
                "id": "6"
            },
            "3": {
                "inputs": {
                    "ckpt_name": "sd15_default.yaml"
                },
                "class_type": "CheckpointLoaderSimple",
                "id": "3"
            },
            "4": {
                "inputs": {
                    "samples": ["5", 0],
                    "model": ["3", 0]
                },
                "class_type": "KSampler",
                "id": "4"
            },
            "5": {
                "inputs": {
                    "positive": "5",
                    "negative": "6",
                    "seed": 42,
                    "steps": 20,
                    "cfg": 7.0,
                    "sampler_name": "euler",
                    "scheduler": "normal"
                },
                "class_type": "BasicGuided",
                "id": "5"
            },
            "6": {
                "inputs": {
                    "width": 512,
                    "height": 512,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage",
                "id": "7"
            },
            "7": {
                "inputs": {
                    "samples": ["4", 0],
                    "vae": ["3", 2]
                },
                "class_type": "VAEDecode",
                "id": "8"
            },
            "8": {
                "inputs": {
                    "filename_prefix": "agent_card",
                    "images": ["7", 0]
                },
                "class_type": "SaveImage",
                "id": "9"
            }
        }
        
        return workflow
    
    def _build_full_prompt(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None
    ) -> str:
        """Build a complete prompt for image generation."""
        base = f"Professional agent portrait, {prompt}"
        base += ", studio lighting, high quality, detailed face, portrait orientation"
        
        if negative_prompt:
            base += f", {negative_prompt}"
        
        return base
    
    def get_manual_prompt(self, agent_id: str) -> str:
        """
        Get the prompt for manual image generation.
        
        Args:
            agent_id: Agent identifier
            
        Returns:
            Prompt string for manual generation
        """
        # Load card to get the prompt
        card_path = os.path.join(self.agents_dir, f"{agent_id}_card.json")
        
        if os.path.exists(card_path):
            with open(card_path, 'r') as f:
                card = json.load(f)
                prompt = card.get("image", {}).get("prompt", "")
                return self._build_full_prompt(prompt)
        
        return "Professional agent portrait, professional, badge-style"
    
    def generate_all_images(
        self,
        agents: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate images for all agents or specified agents.
        
        Args:
            agents: List of agent IDs. If None, generates for all.
            
        Returns:
            Dictionary with results for each agent
        """
        results = {}
        
        # Get list of agents
        if agents is None:
            agents = []
            for filename in os.listdir(self.agents_dir):
                if filename.endswith('_card.json'):
                    agents.append(filename.replace('_card.json', ''))
        
        for agent_id in agents:
            card_path = os.path.join(self.agents_dir, f"{agent_id}_card.json")
            
            if os.path.exists(card_path):
                with open(card_path, 'r') as f:
                    card = json.load(f)
                    prompt = card.get("image", {}).get("prompt", "")
                    
                    result = self.generate_image(agent_id, prompt)
                    results[agent_id] = result
                    
                    # Update card if successful
                    if result["success"]:
                        card["image"]["generated"] = True
                        card["image"]["manual_path"] = result["image_path"]
                        
                        with open(card_path, 'w') as f:
                            json.dump(card, f, indent=2)
        
        return results


# Utility function for synchronous usage
def generate_agent_image(
    agent_id: str,
    prompt: str,
    base_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate an agent card image.
    
    Args:
        agent_id: Agent identifier
        prompt: Image generation prompt
        base_path: Base project path
        
    Returns:
        Generation result dictionary
    """
    generator = AgentImageGenerator(base_path)
    return generator.generate_image(agent_id, prompt)


def get_prompt_for_manual(agent_id: str, base_path: Optional[str] = None) -> str:
    """
    Get prompt for manual image generation.
    
    Args:
        agent_id: Agent identifier
        base_path: Base project path
        
    Returns:
        Prompt string
    """
    generator = AgentImageGenerator(base_path)
    return generator.get_manual_prompt(agent_id)


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) > 1:
        agent_id = sys.argv[1]
        result = generate_agent_image(agent_id, "professional portrait")
        print(json.dumps(result, indent=2))
    else:
        # Generate all
        generator = AgentImageGenerator()
        results = generator.generate_all_images()
        print(json.dumps(results, indent=2))

