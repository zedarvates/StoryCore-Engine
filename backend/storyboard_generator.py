import asyncio
import logging
import json
import uuid
from typing import List, Dict, Any, Optional
from backend.story_generation_service import Story, StoryScene
from src.comfyui_executor import comfyui_executor
from backend.config import settings

logger = logging.getLogger(__name__)

class StoryboardGenerator:
    """
    Service to generate visual storyboards using ComfyUI.
    Converts narrative scenes into AI-generated images.
    """
    
    def __init__(self):
        self.default_workflow_path = "backend/workflows/storyboard_standard.json"
        self._ensure_default_workflow()

    def _ensure_default_workflow(self):
        """Create a default ComfyUI workflow if not exists"""
        # Simple SDXL or SD1.5 workflow for storyboard
        import os
        if not os.path.exists("backend/workflows"):
            os.makedirs("backend/workflows")
        
        if not os.path.exists(self.default_workflow_path):
            workflow = {
                "3": {
                    "inputs": {
                        "seed": 42,
                        "steps": 20,
                        "cfg": 7,
                        "sampler_name": "euler",
                        "scheduler": "normal",
                        "denoise": 1,
                        "model": ["4", 0],
                        "positive": ["6", 0],
                        "negative": ["7", 0],
                        "latent_image": ["5", 0]
                    },
                    "class_type": "KSampler"
                },
                "4": {
                    "inputs": {
                        "ckpt_name": "sd_xl_base_1.0.safetensors"
                    },
                    "class_type": "CheckpointLoaderSimple"
                },
                "5": {
                    "inputs": {
                        "width": 1024,
                        "height": 576,
                        "batch_size": 1
                    },
                    "class_type": "EmptyLatentImage"
                },
                "6": {
                    "inputs": {
                        "text": "storyboard sketch, professional concept art, high quality",
                        "clip": ["4", 1]
                    },
                    "class_type": "CLIPTextEncode"
                },
                "7": {
                    "inputs": {
                        "text": "blurry, low quality, distorted, text, watermark",
                        "clip": ["4", 1]
                    },
                    "class_type": "CLIPTextEncode"
                },
                "8": {
                    "inputs": {
                        "samples": ["3", 0],
                        "vae": ["4", 2]
                    },
                    "class_type": "VAEDecode"
                },
                "9": {
                    "inputs": {
                        "filename_prefix": "storyboard",
                        "images": ["8", 0]
                    },
                    "class_type": "SaveImage"
                }
            }
            with open(self.default_workflow_path, 'w') as f:
                json.dump(workflow, f, indent=2)

    async def generate_images_for_story(self, story: Story) -> List[Dict[str, Any]]:
        """Génère un storyboard complet pour une story"""
        logger.info(f"Generating storyboard for story: {story.title}")
        
        results = []
        # Parallélisation limitée pour ne pas saturer la VRAM
        semaphore = asyncio.Semaphore(2) 
        
        tasks = []
        for i, scene in enumerate(story.scenes):
            tasks.append(self._generate_scene_image(scene, i, story, semaphore))
            
        results = await asyncio.gather(*tasks)
        return results

    async def _generate_scene_image(self, scene: StoryScene, index: int, story: Story, semaphore: asyncio.Semaphore) -> Dict[str, Any]:
        async with semaphore:
            logger.info(f"Generating image for Scene {index+1}: {scene.title}")
            
            # 1. Préparer le prompt visuel
            visual_prompt = f"Storyboard frame: {scene.description}. "
            if scene.visual_direction:
                visual_prompt += f"Visual Direction: {scene.visual_direction}. "
            
            # Ajouter le style global selon le mode
            style_suffix = ", high quality concept art, cinematic lighting, 16:9 aspect ratio"
            if story.mode.name == "RENOVATION":
                style_suffix = ", architectural visualization, before and after renovation style, realistic, clean"
            elif story.mode.name == "GARDENING":
                style_suffix = ", garden design, landscape architecture, lush greenery, realistic"
            
            full_prompt = visual_prompt + style_suffix
            
            # 2. Charger le workflow
            with open(self.default_workflow_path, 'r') as f:
                workflow = json.load(f)
            
            # 3. Injecter le prompt (Node 6 est CLIPTextEncode positif dans notre template)
            if "6" in workflow:
                workflow["6"]["inputs"]["text"] = full_prompt
            
            # 4. Exécuter via ComfyUI
            try:
                # Si on est en mode MOCK, on simule une URL
                if settings.USE_MOCK_COMFYUI:
                    await asyncio.sleep(1) # Simulation
                    image_url = f"https://picsum.photos/seed/{uuid.uuid4()}/1024/576"
                else:
                    exec_result = await comfyui_executor.execute_workflow(workflow)
                    if exec_result.get("success"):
                        # On prend la première image de l'output
                        outputs = exec_result.get("outputs", [])
                        image_url = outputs[0].get("url") if outputs else None
                    else:
                        logger.error(f"ComfyUI failed: {exec_result.get('error')}")
                        image_url = None
            except Exception as e:
                logger.error(f"Storyboard generation error: {e}")
                image_url = None
            
            # Fallback simple
            if not image_url:
                image_url = f"https://placehold.co/1024x576?text=Scene+{index+1}"

            return {
                "scene_index": index,
                "scene_title": scene.title,
                "image_url": image_url
            }

# Singleton
storyboard_generator = StoryboardGenerator()
