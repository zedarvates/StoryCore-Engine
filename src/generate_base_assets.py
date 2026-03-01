#!/usr/bin/env python3
"""
StoryCore Base Asset Generator - With Mock Mode
Generates base image assets using local ComfyUI (or mock mode if unavailable)
"""

import asyncio
import json
import os
import sys
import time
import aiohttp
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging
import base64
from PIL import Image
import io

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration - Can be overridden via environment
COMFYUI_URL = os.environ.get("COMFYUI_URL", "http://127.0.0.1:8000")
OUTPUT_DIR = Path("assets/generated")
MOCK_MODE = False  # Set to True if ComfyUI is not available

# Asset definitions
BASE_ASSETS = [
    {
        "name": "storycore_logo_horizontal",
        "prompt": "Professional logo design for 'StoryCore' text, modern typography, clean minimal style, dark background with gradient accent, cinematic lighting, high detail vector-style logo, 2D graphic design",
        "negative_prompt": "blurry, low quality, distorted, ugly, watermark, text signature, oversaturated, photograph, 3D render",
        "width": 1024,
        "height": 256,
        "steps": 25,
        "cfg_scale": 4.0,
        "output_subdir": "logos"
    },
    {
        "name": "storycore_logo_square",
        "prompt": "Square app icon design, 'SC' monogram logo, modern minimal style, dark background with blue-purple gradient, professional tech branding, clean vector aesthetic, 2D graphic",
        "negative_prompt": "blurry, low quality, distorted, ugly, watermark, photograph, 3D, realistic",
        "width": 512,
        "height": 512,
        "steps": 25,
        "cfg_scale": 4.0,
        "output_subdir": "icons"
    },
    {
        "name": "storycore_panel_placeholder",
        "prompt": "Storyboard panel placeholder, neutral gray gradient background, subtle grid overlay, professional comic panel template, clean white border, minimalist design",
        "negative_prompt": "blurry, low quality, distorted, ugly, watermark, text, signature, detailed scene, characters",
        "width": 768,
        "height": 432,
        "steps": 20,
        "cfg_scale": 3.5,
        "output_subdir": "placeholders"
    },
    {
        "name": "storycore_loading_state",
        "prompt": "Animated loading spinner placeholder, circular loading animation mockup, professional UI loading indicator, clean minimal design, light gray on white, vector-style graphic",
        "negative_prompt": "blurry, low quality, distorted, ugly, photograph, realistic, complex scene",
        "width": 256,
        "height": 256,
        "steps": 15,
        "cfg_scale": 3.0,
        "output_subdir": "ui"
    },
    {
        "name": "storycore_error_state",
        "prompt": "Error state illustration, warning triangle icon, professional UI error graphic, clean minimal design, red-orange accent, vector-style on light background",
        "negative_prompt": "blurry, low quality, distorted, ugly, photograph, realistic, complex scene",
        "width": 400,
        "height": 300,
        "steps": 20,
        "cfg_scale": 3.5,
        "output_subdir": "ui"
    },
    {
        "name": "storycore_character_template_male",
        "prompt": "Character design template for storyboard, generic male figure outline, front view, clean line art style, minimal details, professional character sheet reference, white background",
        "negative_prompt": "blurry, low quality, distorted, ugly, watermark, text, signature, complex background, photograph, realistic",
        "width": 512,
        "height": 768,
        "steps": 20,
        "cfg_scale": 3.5,
        "output_subdir": "templates"
    },
    {
        "name": "storycore_character_template_female",
        "prompt": "Character design template for storyboard, generic female figure outline, front view, clean line art style, minimal details, professional character sheet reference, white background",
        "negative_prompt": "blurry, low quality, distorted, ugly, watermark, text, signature, complex background, photograph, realistic",
        "width": 512,
        "height": 768,
        "steps": 20,
        "cfg_scale": 3.5,
        "output_subdir": "templates"
    },
    {
        "name": "storycore_environment_landscape",
        "prompt": "Environment background template for storyboard panels, wide landscape view placeholder, neutral gradient sky and ground, clean minimal design, professional background reference",
        "negative_prompt": "blurry, low quality, distorted, ugly, watermark, text, signature, detailed scene, characters",
        "width": 1024,
        "height": 576,
        "steps": 20,
        "cfg_scale": 3.5,
        "output_subdir": "templates"
    },
    {
        "name": "storycore_environment_interior",
        "prompt": "Environment background template for storyboard panels, interior room placeholder, neutral gray walls and floor, clean minimal design, professional background reference",
        "negative_prompt": "blurry, low quality, distorted, ugly, watermark, text, signature, detailed furniture, characters",
        "width": 768,
        "height": 512,
        "steps": 20,
        "cfg_scale": 3.5,
        "output_subdir": "templates"
    },
    {
        "name": "storycore_ui_button_primary",
        "prompt": "Primary button UI element, clean rectangular button design, blue gradient fill, rounded corners, subtle shadow, professional modern UI style, high quality icon",
        "negative_prompt": "blurry, low quality, distorted, ugly, photograph, realistic, 3D render",
        "width": 200,
        "height": 60,
        "steps": 15,
        "cfg_scale": 3.5,
        "output_subdir": "ui"
    },
    {
        "name": "storycore_ui_button_secondary",
        "prompt": "Secondary button UI element, clean rectangular button outline design, gray stroke, transparent fill, rounded corners, professional modern UI style, high quality icon",
        "negative_prompt": "blurry, low quality, distorted, ugly, photograph, realistic, 3D render, filled background",
        "width": 200,
        "height": 60,
        "steps": 15,
        "cfg_scale": 3.5,
        "output_subdir": "ui"
    },
    {
        "name": "storycore_banner_featured",
        "prompt": "Featured content banner design, horizontal layout, dark gradient background, modern tech aesthetic, clean minimal style, professional marketing banner, high quality 2D graphic",
        "negative_prompt": "blurry, low quality, distorted, ugly, watermark, photograph, realistic, complex scene, photograph",
        "width": 1200,
        "height": 400,
        "steps": 25,
        "cfg_scale": 4.0,
        "output_subdir": "banners"
    }
]


def create_mock_image(width: int, height: int, asset_name: str) -> bytes:
    """Create a placeholder image for mock mode"""
    # Create a simple gradient placeholder
    img = Image.new('RGB', (width, height), color=(40, 44, 52))
    
    # Add some visual interest with a gradient
    pixels = img.load()
    for y in range(height):
        for x in range(width):
            # Create a subtle gradient
            r = int(40 + (x / width) * 30)
            g = int(44 + (y / height) * 20)
            b = int(52 + ((x + y) / (width + height)) * 40)
            pixels[x, y] = (r, g, b)
    
    # Add text overlay (simplified)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


class StoryCoreAssetGenerator:
    """Generates base assets for StoryCore using local ComfyUI"""
    
    def __init__(self, comfyui_url: str = COMFYUI_URL, mock_mode: bool = False):
        self.comfyui_url = comfyui_url
        self.mock_mode = mock_mode
        self.session: Optional[aiohttp.ClientSession] = None
        self.results: List[Dict[str, Any]] = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def check_comfyui_connection(self) -> bool:
        """Check if ComfyUI is accessible"""
        if self.mock_mode:
            return False
        
        try:
            async with self.session.get(f"{self.comfyui_url}/", timeout=5) as response:
                return response.status == 200
        except Exception as e:
            logger.warning(f"ComfyUI connection check failed: {e}")
            return False
    
    async def queue_prompt(self, workflow: Dict[str, Any]) -> Optional[str]:
        """Queue a prompt for execution on ComfyUI"""
        try:
            payload = {
                "prompt": workflow,
                "client_id": f"storycore_{int(time.time())}"
            }
            
            async with self.session.post(
                f"{self.comfyui_url}/prompt",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    prompt_id = result.get("prompt_id")
                    logger.info(f"Queued prompt with ID: {prompt_id}")
                    return prompt_id
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to queue prompt: {response.status} - {error_text}")
                    return None
        except Exception as e:
            logger.error(f"Error queuing prompt: {e}")
            return None
    
    async def get_history(self, prompt_id: str) -> Dict[str, Any]:
        """Get prompt execution history"""
        try:
            async with self.session.get(f"{self.comfyui_url}/history/{prompt_id}") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Failed to get history: {response.status}")
                    return {}
        except Exception as e:
            logger.error(f"Error getting history: {e}")
            return {}
    
    async def get_images(self, prompt_id: str) -> List[Dict[str, Any]]:
        """Get generated images for a prompt"""
        try:
            async with self.session.get(
                f"{self.comfyui_url}/history/{prompt_id}"
            ) as response:
                if response.status == 200:
                    history = await response.json()
                    
                    if prompt_id in history:
                        outputs = history[prompt_id].get("outputs", {})
                        images = []
                        
                        for node_id, output in outputs.items():
                            if "images" in output:
                                for img in output["images"]:
                                    images.append({
                                        "filename": img["filename"],
                                        "subfolder": img.get("subfolder", ""),
                                        "type": img["type"],
                                        "node_id": node_id
                                    })
                        
                        return images
        except Exception as e:
            logger.error(f"Error getting images: {e}")
        
        return []
    
    def create_flux_workflow(self, prompt: str, negative_prompt: str,
                            width: int, height: int, steps: int,
                            cfg_scale: float, seed: int = -1) -> Dict[str, Any]:
        """Create a customized FLUX workflow for image generation"""
        workflow = {
            "last_node_id": 9,
            "last_link_id": 9,
            "nodes": [
                {
                    "id": 1,
                    "type": "CLIPTextEncode",
                    "pos": [300, 200],
                    "size": {"0": 425.27801513671875, "1": 200.0},
                    "inputs": [{"name": "clip", "type": "CLIP", "link": 1}],
                    "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [2], "slot_index": 0}],
                    "widgets_values": [prompt]
                },
                {
                    "id": 2,
                    "type": "CLIPTextEncode",
                    "pos": [300, 450],
                    "size": {"0": 425.27801513671875, "1": 200.0},
                    "inputs": [{"name": "clip", "type": "CLIP", "link": 3}],
                    "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [4], "slot_index": 0}],
                    "widgets_values": [negative_prompt]
                },
                {
                    "id": 3,
                    "type": "DualCLIPLoader",
                    "pos": [800, 200],
                    "size": {"0": 315.0, "1": 106.0},
                    "outputs": [{"name": "CLIP", "type": "CLIP", "links": [1, 3], "slot_index": 0}],
                    "widgets_values": ["t5xxl_fp16.safetensors", "mistral_3_small_flux2_bf16.safetensors", "flux"]
                },
                {
                    "id": 4,
                    "type": "VAELoader",
                    "pos": [1150, 200],
                    "size": {"0": 315.0, "1": 60.0},
                    "outputs": [{"name": "VAE", "type": "VAE", "links": [5], "slot_index": 0}],
                    "widgets_values": ["ae.safetensors"]
                },
                {
                    "id": 5,
                    "type": "FluxSampler",
                    "pos": [300, 700],
                    "size": {"0": 400.0, "1": 526.0},
                    "inputs": [
                        {"name": "model", "type": "MODEL", "link": 6},
                        {"name": "conditioning", "type": "CONDITIONING", "link": 2},
                        {"name": "neg_conditioning", "type": "CONDITIONING", "link": 4},
                        {"name": "latent_image", "type": "LATENT", "link": 7}
                    ],
                    "outputs": [{"name": "LATENT", "type": "LATENT", "links": [8], "slot_index": 0}],
                    "widgets_values": [steps, cfg_scale, width, height, 0.5, seed if seed >= 0 else int(time.time())]
                },
                {
                    "id": 6,
                    "type": "UNETLoader",
                    "pos": [750, 450],
                    "size": {"0": 315.0, "1": 60.0},
                    "outputs": [{"name": "MODEL", "type": "MODEL", "links": [6], "slot_index": 0}],
                    "widgets_values": ["flux2_dev_fp8mixed.safetensors", "default"]
                },
                {
                    "id": 7,
                    "type": "EmptyLatentImage",
                    "pos": [1150, 350],
                    "size": {"0": 315.0, "1": 106.0},
                    "outputs": [{"name": "LATENT", "type": "LATENT", "links": [7], "slot_index": 0}],
                    "widgets_values": [width, height, 1]
                },
                {
                    "id": 8,
                    "type": "VAEDecode",
                    "pos": [750, 700],
                    "size": {"0": 210.0, "1": 46.0},
                    "inputs": [
                        {"name": "samples", "type": "LATENT", "link": 8},
                        {"name": "vae", "type": "VAE", "link": 5}
                    ],
                    "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [9], "slot_index": 0}]
                },
                {
                    "id": 9,
                    "type": "SaveImage",
                    "pos": [1000, 700],
                    "size": {"0": 400.0, "1": 460.0},
                    "inputs": [{"name": "images", "type": "IMAGE", "link": 9}],
                    "widgets_values": [f"StoryCore_Asset"]
                }
            ],
            "links": [
                [1, 3, 0, 1, 0, "CLIP"],
                [2, 1, 0, 5, 1, "CONDITIONING"],
                [3, 3, 0, 2, 0, "CLIP"],
                [4, 2, 0, 5, 2, "CONDITIONING"],
                [5, 4, 0, 8, 1, "VAE"],
                [6, 6, 0, 5, 0, "MODEL"],
                [7, 7, 0, 5, 3, "LATENT"],
                [8, 5, 0, 8, 0, "LATENT"],
                [9, 8, 0, 9, 0, "IMAGE"]
            ],
            "groups": [],
            "config": {},
            "extra": {"ds": {"scale": 0.68, "offset": [-389, -28]}},
            "version": 0.4
        }
        return workflow
    
    async def download_image(self, image_info: Dict[str, Any], output_path: Path) -> bool:
        """Download generated image from ComfyUI"""
        try:
            filename = image_info["filename"]
            subfolder = image_info.get("subfolder", "")
            image_type = image_info["type"]
            
            params = {"filename": filename, "type": image_type}
            if subfolder:
                params["subfolder"] = subfolder
            
            async with self.session.get(
                f"{self.comfyui_url}/view",
                params=params
            ) as response:
                if response.status == 200:
                    content = await response.read()
                    with open(output_path, "wb") as f:
                        f.write(content)
                    return True
                else:
                    logger.error(f"Failed to download image: {response.status}")
                    return False
        except Exception as e:
            logger.error(f"Error downloading image: {e}")
            return False
    
    async def generate_asset(self, asset_def: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a single asset"""
        asset_name = asset_def["name"]
        logger.info(f"🎨 Generating asset: {asset_name}")
        
        start_time = time.time()
        
        # Mock mode - create placeholder
        if self.mock_mode:
            await asyncio.sleep(0.5)  # Simulate generation time
            
            output_subdir = OUTPUT_DIR / asset_def.get("output_subdir", "misc")
            output_subdir.mkdir(parents=True, exist_ok=True)
            
            output_filename = f"{asset_name}.png"
            output_path = output_subdir / output_filename
            
            # Create placeholder image
            image_data = create_mock_image(
                asset_def["width"],
                asset_def["height"],
                asset_name
            )
            
            with open(output_path, "wb") as f:
                f.write(image_data)
            
            generation_time = time.time() - start_time
            logger.info(f"✅ Mock asset created: {output_path}")
            
            return {
                "name": asset_name,
                "success": True,
                "output_path": str(output_path),
                "generation_time": generation_time,
                "mock_mode": True
            }
        
        # Real ComfyUI mode
        try:
            # Create workflow
            workflow = self.create_flux_workflow(
                prompt=asset_def["prompt"],
                negative_prompt=asset_def["negative_prompt"],
                width=asset_def["width"],
                height=asset_def["height"],
                steps=asset_def["steps"],
                cfg_scale=asset_def["cfg_scale"],
                seed=asset_def.get("seed", -1)
            )
            
            # Queue prompt
            prompt_id = await self.queue_prompt(workflow)
            if not prompt_id:
                raise Exception("Failed to queue prompt")
            
            # Wait for completion (poll every 2 seconds)
            max_wait = 120  # 2 minutes max
            wait_time = 0
            
            while wait_time < max_wait:
                await asyncio.sleep(2)
                wait_time += 2
                
                history = await self.get_history(prompt_id)
                if prompt_id in history:
                    status = history[prompt_id].get("status", {})
                    if status.get("completed"):
                        break
                    elif status.get("exception"):
                        raise Exception(status["exception"])
            
            # Get generated images
            images = await self.get_images(prompt_id)
            
            if not images:
                raise Exception("No images generated")
            
            # Create output directory
            output_subdir = OUTPUT_DIR / asset_def.get("output_subdir", "misc")
            output_subdir.mkdir(parents=True, exist_ok=True)
            
            # Download first image
            output_filename = f"{asset_name}.png"
            output_path = output_subdir / output_filename
            
            success = await self.download_image(images[0], output_path)
            
            generation_time = time.time() - start_time
            
            if success:
                logger.info(f"✅ Asset generated: {output_path}")
                return {
                    "name": asset_name,
                    "success": True,
                    "output_path": str(output_path),
                    "generation_time": generation_time,
                    "prompt_id": prompt_id
                }
            else:
                raise Exception("Failed to download image")
                
        except Exception as e:
            generation_time = time.time() - start_time
            logger.error(f"❌ Asset generation failed: {asset_name} - {e}")
            return {
                "name": asset_name,
                "success": False,
                "error_message": str(e),
                "generation_time": generation_time
            }
    
    async def generate_all_assets(self) -> List[Dict[str, Any]]:
        """Generate all base assets"""
        results = []
        
        logger.info(f"🚀 Starting asset generation for {len(BASE_ASSETS)} assets...")
        if self.mock_mode:
            logger.info("   Mode: MOCK (placeholder images)")
        else:
            logger.info(f"   Mode: ComfyUI at {self.comfyui_url}")
        
        for i, asset in enumerate(BASE_ASSETS, 1):
            logger.info(f"📦 Progress: {i}/{len(BASE_ASSETS)}")
            result = await self.generate_asset(asset)
            results.append(result)
            
            # Small delay between generations to avoid overwhelming the server
            if i < len(BASE_ASSETS):
                await asyncio.sleep(1)
        
        return results
    
    def save_generation_report(self, results: List[Dict[str, Any]]) -> None:
        """Save generation report"""
        report = {
            "generation_summary": {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "total_assets": len(results),
                "successful": len([r for r in results if r["success"]]),
                "failed": len([r for r in results if not r["success"]]),
                "total_time": sum(r.get("generation_time", 0) for r in results),
                "average_time": sum(r.get("generation_time", 0) for r in results) / len(results) if results else 0,
                "mock_mode": self.mock_mode
            },
            "results": results
        }
        
        report_path = OUTPUT_DIR / "generation_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"📄 Report saved to: {report_path}")


async def main():
    """Main entry point"""
    global MOCK_MODE
    
    print("=" * 60)
    print("StoryCore Base Asset Generator")
    print("=" * 60)
    
    # Check for mock mode flag
    mock_flag = "--mock" in sys.argv or os.environ.get("MOCK_MODE", "").lower() == "true"
    
    async with StoryCoreAssetGenerator(mock_mode=mock_flag) as generator:
        # Check ComfyUI connection
        if not mock_flag:
            logger.info("🔍 Checking ComfyUI connection...")
            comfyui_ok = await generator.check_comfyui_connection()
            
            if not comfyui_ok:
                logger.warning("⚠️ ComfyUI is not accessible!")
                logger.warning("   Switching to MOCK mode for placeholder generation")
                MOCK_MODE = True
                generator.mock_mode = True
        
        # Create output directory
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        
        # Generate assets
        results = await generator.generate_all_assets()
        
        # Save report
        generator.save_generation_report(results)
        
        # Summary
        successful = sum(1 for r in results if r["success"])
        failed = sum(1 for r in results if not r["success"])
        
        print("=" * 60)
        print(f"📊 Generation Complete!")
        print(f"   ✅ Successful: {successful}")
        print(f"   ❌ Failed: {failed}")
        print(f"   📁 Output: {OUTPUT_DIR}")
        print("=" * 60)
        
        return results


if __name__ == "__main__":
    results = asyncio.run(main())
    
    # Exit with appropriate code
    if all(r["success"] for r in results):
        sys.exit(0)
    elif any(r["success"] for r in results):
        sys.exit(0)  # Partial success
    else:
        sys.exit(1)  # All failed

