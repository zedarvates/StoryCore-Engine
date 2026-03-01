"""
Face Swap Workflow Integration for Character Creation.

This module provides:
- ComfyUI workflow integration for face swapping
- IP-Adapter faceID support
- Style transfer with extracted faces
- Multi-face character consistency

Requirements: Character Creation Enhancement from User Images
"""

import base64
import json
import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

# Try to import requests for API calls
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# Try to import aiohttp for async API calls
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)


class FaceSwapMethod(str, Enum):
    """Available face swap methods"""
    IP_ADAPTER = "ip_adapter"
    FACE_ID = "face_id"
    INSTANT_ID = "instant_id"
    REACTOR = "reactor"
    FACE_SWAP = "face_swap"


class StyleTransferMode(str, Enum):
    """Style transfer modes"""
    NONE = "none"
    LIGHT = "light"
    MEDIUM = "medium"
    STRONG = "strong"


@dataclass
class FaceSwapConfig:
    """Configuration for face swap workflow"""
    method: FaceSwapMethod = FaceSwapMethod.IP_ADAPTER
    style_transfer_mode: StyleTransferMode = StyleTransferMode.LIGHT
    ip_adapter_model: str = "ip_adapter_face_sd15"
    face_id_model: str = "face_id_v2"
    strength: float = 0.85
    preserve_identity: bool = True
    target_size: Tuple[int, int] = (512, 512)
    output_format: str = "PNG"


    quality: int = 95


@dataclass
class CharacterVariation:
    """A variation of a character"""
    variation_id: str
    variation_type: str  # pose, expression, style
    prompt: str
    face_image_base64: Optional[str] = None
    generated_image_base64: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FaceSwapResult:
    """Result of face swap operation"""
    success: bool
    original_image: Optional[np.ndarray] = None
    face_image: Optional[np.ndarray] = None
    result_image: Optional[np.ndarray] = None
    result_image_base64: Optional[str] = None
    variations: List[CharacterVariation] = field(default_factory=list)
    workflow_id: Optional[str] = None
    processing_time_ms: int = 0
    error_message: Optional[str] = None


class FaceSwapWorkflow:
    """
    Integration with ComfyUI for face swapping workflows.
    
    Provides:
    - IP-Adapter face swap
    - FaceID integration
    - Multi-character consistency
    - Style transfer
    - Character variation generation
    """
    
    def __init__(
        self,
        config: Optional[FaceSwapConfig] = None,
        comfyui_url: str = "http://127.0.0.1:8188"
    ):
        """Initialize face swap workflow"""
        self.config = config or FaceSwapConfig()
        self.comfyui_url = comfyui_url
        
        # Cache for workflow templates
        self._workflow_cache: Dict[str, Dict] = {}
        
        logger.info(f"Face swap workflow initialized with ComfyUI at {comfyui_url}")
    
    async def check_comfyui_available(self) -> bool:
        """Check if ComfyUI is available"""
        if not REQUESTS_AVAILABLE:
            return False
        
        try:
            response = requests.get(
                f"{self.comfyui_url}/system_stats",
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"ComfyUI not available: {e}")
            return False
    
    async def load_workflow_template(self, workflow_name: str) -> Optional[Dict]:
        """Load a workflow template from ComfyUI"""
        try:
            response = requests.get(
                f"{self.comfyui_url}/workflow/{workflow_name}",
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Failed to load workflow template: {e}")
            return None
    
    async def execute_face_swap(
        self,
        source_face: np.ndarray,
        target_image: np.ndarray,
        variation_prompts: Optional[List[str]] = None,
        style_transfer_image: Optional[np.ndarray] = None
    ) -> FaceSwapResult:
        """
        Execute face swap with optional style transfer and variations.
        
        Args:
            source_face: The extracted face to swap
            target_image: The target image to apply face to
            variation_prompts: Optional prompts for generating variations
            style_transfer_image: Optional image for style transfer
            
        Returns:
            FaceSwapResult with the swapped image and variations
        """
        start_time = datetime.now() if 'datetime' in globals() else None
        import datetime
        start_time = datetime.datetime.now()
        
        try:
            # Convert images to base64
            source_face_b64 = self._array_to_base64(source_face)
            target_image_b64 = self._array_to_base64(target_image)
            
            if not source_face_b64 or not target_image_b64:
                return FaceSwapResult(
                    success=False,
                    error_message="Failed to encode images"
                )
            
            # Build workflow based on method
            workflow = await self._build_face_swap_workflow(
                source_face_b64,
                target_image_b64,
                style_transfer_image
            )
            
            if workflow is None:
                return FaceSwapResult(
                    success=False,
                    error_message="Failed to build workflow"
                )
            
            # Queue workflow
            workflow_id = await self._queue_workflow(workflow)
            if workflow_id is None:
                return FaceSwapResult(
                    success=False,
                    error_message="Failed to queue workflow"
                )
            
            # Wait for result
            result = await self._wait_for_result(workflow_id)
            
            processing_time = (datetime.datetime.now() - start_time).total_seconds() * 1000
            
            if result is None:
                return FaceSwapResult(
                    success=False,
                    workflow_id=workflow_id,
                    processing_time_ms=int(processing_time),
                    error_message="Workflow execution failed"
                )
            
            # Generate variations if prompts provided
            variations = []
            if variation_prompts:
                variations = await self._generate_variations(
                    result,
                    variation_prompts
                )
            
            return FaceSwapResult(
                success=True,
                result_image_base64=result,
                variations=variations,
                workflow_id=workflow_id,
                processing_time_ms=int(processing_time)
            )
            
        except Exception as e:
            logger.error(f"Face swap execution failed: {e}")
            return FaceSwapResult(
                success=False,
                error_message=str(e)
            )
    
    async def _build_face_swap_workflow(
        self,
        source_face_b64: str,
        target_image_b64: str,
        style_transfer_image: Optional[np.ndarray] = None
    ) -> Optional[Dict]:
        """Build ComfyUI workflow for face swap"""
        try:
            # This would typically load a workflow template
            # and modify it with the provided images
            # For now, return a placeholder workflow
            
            workflow = {
                "workflow_id": f"face_swap_{os.urandom.randint(0, 1000000)}",
                "nodes": {
                    "load_source_face": {
                        "class_type": "LoadImage",
                        "inputs": {},
                        "inputs_values": {
                            "image": source_face_b64
                        }
                    },
                    "load_target_image": {
                        "class_type": "LoadImage",
                        "inputs": {},
                        "inputs_values": {
                            "image": target_image_b64
                        }
                    },
                    "face_swap": {
                        "class_type": "FaceSwapNode",
                        "inputs": {
                            "source_face": ["load_source_face", 0],
                            "target_image": ["load_target_image", 0]
                        },
                        "inputs_values": {
                            "method": self.config.method.value,
                            "strength": self.config.strength
                        }
                    },
                    "output": {
                        "class_type": "SaveImage",
                        "inputs": {
                            "images": ["face_swap", 0]
                        },
                        "inputs_values": {
                            "filename_prefix": "face_swap_result"
                        }
                    }
                }
            }
            
            return workflow
            
        except Exception as e:
            logger.error(f"Failed to build workflow: {e}")
            return None
    
    async def _queue_workflow(self, workflow: Dict) -> Optional[str]:
        """Queue workflow in ComfyUI"""
        if not REQUESTS_AVAILABLE:
            return None
        
        try:
            response = requests.post(
                f"{self.comfyui_url}/prompt",
                json={
                    "prompt": workflow,
                    "client_id": "storycore_face_swap"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json().get("prompt_id")
            else:
                logger.error(f"Failed to queue workflow: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to queue workflow: {e}")
            return None
    
    async def _wait_for_result(self, workflow_id: str, timeout: int = 300) -> Optional[str]:
        """Wait for workflow result"""
        if not REQUESTS_AVAILABLE:
            return None
        
        import time
        start_time = time.time()
        
        try:
            while time.time() - start_time < timeout:
                response = requests.get(
                    f"{self.comfyui_url}/history/{workflow_id}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    history = response.json()
                    if history.get("status") == "completed":
                        outputs = history.get("outputs", {})
                        # Extract the result image
                        for node_id, output in outputs.items():
                            if "images" in output:
                                images = output["images"]
                                if images and len(images) > 0:
                                    return images[0]  # Return first image
                
                await asyncio.sleep(1)
            
            logger.error("Workflow timeout")
            return None
            
        except Exception as e:
            logger.error(f"Failed to get result: {e}")
            return None
    
    async def _generate_variations(
        self,
        base_image_b64: str,
        prompts: List[str]
    ) -> List[CharacterVariation]:
        """Generate character variations with different prompts"""
        variations = []
        
        for i, prompt in enumerate(prompts):
            try:
                # Build variation workflow
                workflow = await self._build_variation_workflow(base_image_b64, prompt)
                if workflow is None:
                    continue
                
                # Queue and wait
                workflow_id = await self._queue_workflow(workflow)
                if workflow_id is None:
                    continue
                
                result = await self._wait_for_result(workflow_id)
                
                if result:
                    variations.append(CharacterVariation(
                        variation_id=f"variation_{i}",
                        variation_type="expression" if "expression" in prompt.lower() else "pose",
                        prompt=prompt,
                        generated_image_base64=result
                    ))
                    
            except Exception as e:
                logger.error(f"Failed to generate variation: {e}")
                continue
        
        return variations
    
    async def _build_variation_workflow(
        self,
        base_image_b64: str,
        prompt: str
    ) -> Optional[Dict]:
        """Build workflow for variation generation"""
        try:
            workflow = {
                "workflow_id": f"variation_{os.urandom.randint(0, 1000000)}",
                "nodes": {
                    "load_image": {
                        "class_type": "LoadImage",
                        "inputs": {},
                        "inputs_values": {
                            "image": base_image_b64
                        }
                    },
                    "generate_variation": {
                        "class_type": "KSampler",
                        "inputs": {
                            "image": ["load_image", 0]
                        },
                        "inputs_values": {
                            "prompt": prompt,
                            "strength": 0.6
                        }
                    },
                    "output": {
                        "class_type": "SaveImage",
                        "inputs": {
                            "images": ["generate_variation", 0]
                        }
                    }
                }
            }
            return workflow
        except Exception as e:
            logger.error(f"Failed to build variation workflow: {e}")
            return None
    
    def _array_to_base64(self, array: np.ndarray) -> Optional[str]:
        """Convert numpy array to base64 string"""
        try:
            import cv2
            from PIL import Image
            import io
            
            # Convert array to PIL Image
            if array.dtype != np.uint8:
                array = (array * 255).astype(np.uint8)
            
            if len(array.shape) == 3 and array.shape[2] == 3:
                image = Image.fromarray(array)
            else:
                image = Image.fromarray(array, mode='L')
            
            # Convert to base64
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Failed to convert array to base64: {e}")
            return None


    
    def _base64_to_array(self, base64_str: str) -> Optional[np.ndarray]:
        """Convert base64 string to numpy array"""
        try:
            from PIL import Image
            import io
            
            image_data = base64.b64decode(base64_str)
            image = Image.open(io.BytesIO(image_data))
            return np.array(image)
        except Exception as e:
            logger.error(f"Failed to convert base64 to array: {e}")
            return None


    
    async def generate_character_sheet(
        self,
        face_image: np.ndarray,
        expressions: List[str] = None,
        poses: List[str] = None,
        styles: List[str] = None
    ) -> Dict[str, CharacterVariation]:
        """
        Generate a character sheet with multiple expressions/poses.
        
        Args:
            face_image: The extracted face image
            expressions: List of expression prompts (e.g., "happy", "angry", "sad")
            poses: List of pose prompts (e.g., "front view", "3/4 view", "profile")
            styles: List of style prompts (e.g., "realistic", "anime", "sketch")
            
        Returns:
            Dictionary mapping variation type to CharacterVariation
        """
        variations = {}
        
        # Default prompts if not provided
        expressions = expressions or ["neutral", "happy", "sad", "angry", "surprised"]
        poses = poses or ["front view", "3/4 left", "3/4 right", "profile left", "profile right"]
        styles = styles or ["realistic portrait", "cinematic", "dramatic lighting"]
        
        face_b64 = self._array_to_base64(face_image)
        if not face_b64:
            return variations
        
        # Generate expression variations
        for expr in expressions:
            prompt = f"{expr} expression, {self.config.ip_adapter_model}"
            result = await self._generate_single_variation(face_b64, prompt, "expression")
            if result:
                variations[f"expression_{expr}"] = result
        
        # Generate pose variations
        for pose in poses:
            prompt = f"{pose}, {self.config.ip_adapter_model}"
            result = await self._generate_single_variation(face_b64, prompt, "pose")
            if result:
                variations[f"pose_{pose}"] = result
        
        # Generate style variations
        for style in styles:
            prompt = f"{style} style, {self.config.ip_adapter_model}"
            result = await self._generate_single_variation(face_b64, prompt, "style")
            if result:
                variations[f"style_{style}"] = result
        
        return variations
    
    async def _generate_single_variation(
        self,
        face_b64: str,
        prompt: str,
        variation_type: str
    ) -> Optional[CharacterVariation]:
        """Generate a single variation"""
        try:
            workflow = await self._build_variation_workflow(face_b64, prompt)
            if workflow is None:
                return None
            
            workflow_id = await self._queue_workflow(workflow)
            if workflow_id is None:
                return None
            
            result = await self._wait_for_result(workflow_id)
            
            if result:
                return CharacterVariation(
                    variation_id=f"{variation_type}_{os.urandom.randint(0, 1000000)}",
                    variation_type=variation_type,
                    prompt=prompt,
                    face_image_base64=face_b64,
                    generated_image_base64=result
                )
            
            return None
        except Exception as e:
            logger.error(f"Failed to generate variation: {e}")
            return None


    
    def save_face_embedding(self, face_image: np.ndarray, character_id: str) -> bool:
        """
        Save face embedding for later use.
        
        Args:
            face_image: The face image to generate embedding from
            character_id: Character ID for the embedding file name
            
        Returns:
            True if saved successfully
        """
        try:
            # Generate embedding (placeholder - would use actual face recognition model)
            embedding = self._compute_face_embedding(face_image)
            
            # Save to file
            embedding_dir = Path("./embeddings/faces")
            embedding_dir.mkdir(parents=True, exist_ok=True)
            
            embedding_path = embedding_dir / f"face_{character_id}.npy"
            np.save(embeding_path, embedding)
            
            logger.info(f"Saved face embedding for character {character_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to save face embedding: {e}")
            return False
    
    def load_face_embedding(self, character_id: str) -> Optional[np.ndarray]:
        """
        Load saved face embedding.
        
        Args:
            character_id: Character ID to load embedding for
            
        Returns:
            Face embedding if found, None otherwise
        """
        try:
            embedding_path = Path("./embeddings/faces/face_{character_id}.npy")
            if embedding_path.exists():
                return np.load(embeding_path)
            return None
        except Exception as e:
            logger.error(f"Failed to load face embedding: {e}")
            return None
    
    def _compute_face_embedding(self, face_image: np.ndarray) -> np.ndarray:
        """
        Compute face embedding (placeholder for actual face recognition model).
        
        In production, this would use:
        - InsightFace
        - ArcFace
        - DeepFace
        """
        try:
            # Placeholder: use histogram as pseudo-embedding
            # In production, use proper face recognition model
            import cv2
            
            gray = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY) if len(face_image.shape) == 3 else face_image
            
            # Compute HOG descriptor
            hog = cv2.HOGDescriptor(
                winSize=(64, 64),
                blockSize=(16, 16),
                blockStride=(8, 8),
                nbins=9
            )
            
            # Resize to standard size
            resized = cv2.resize(gray, (128, 128))
            
            # Compute HOG features
            hog_features = hog.compute(resized)
            
            if hog_features is not None:
                return hog_features.flatten()
            
            # Fallback to raw pixel values
            return cv2.resize(gray, (64, 64)).flatten().astype(np.float32) / 255.0
            
        except Exception as e:
            logger.error(f"Failed to compute face embedding: {e}")
            return np.zeros(4096)


# Singleton instance
_face_swap_workflow: Optional[FaceSwapWorkflow] = None


def get_face_swap_workflow(
    config: Optional[FaceSwapConfig] = None,
    comfyui_url: str = "http://127.0.0.1:8188"
) -> FaceSwapWorkflow:
    """Get singleton instance of face swap workflow"""
    global _face_swap_workflow
    if _face_swap_workflow is None:
        _face_swap_workflow = FaceSwapWorkflow(config, comfyui_url)
    return _face_swap_workflow