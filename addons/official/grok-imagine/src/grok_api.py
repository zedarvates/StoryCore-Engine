"""
Grok Imagine API Client
Client pour communiquer avec l'API Grok Imagine (xAI)
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from enum import Enum


class GrokModel(str, Enum):
    """Modèles disponibles pour Grok Imagine"""

    GROK_IMAGE_V1 = "grok-image-v1"
    GROK_VIDEO_V1 = "grok-video-v1"
    GROK_IMAGE_V2 = "grok-image-v2"
    GROK_VIDEO_V2 = "grok-video-v2"
    GROK_3_1_FAST = "grok-3.1-fast"
    GROK_3_1_QUALITY = "grok-3.1-quality"
    GROK_2_FAST = "grok-2-fast"
    GROK_2_QUALITY = "grok-2-quality"


class QualityPreset(str, Enum):
    """Préréglages de qualité"""

    FAST = "fast"
    BALANCED = "balanced"
    HIGH = "high"
    CINEMATIC = "cinematic"


class AspectRatio(str, Enum):
    """Ratios d'aspect disponibles"""

    RATIO_16_9 = "16:9"
    RATIO_9_16 = "9:16"
    RATIO_1_1 = "1:1"
    RATIO_4_3 = "4:3"
    RATIO_3_4 = "3:4"
    RATIO_21_9 = "21:9"
    RATIO_2_3 = "2:3"
    RATIO_3_2 = "3:2"


@dataclass
class GrokImagineConfig:
    """Configuration pour l'API Grok Imagine"""

    engine: str = "grok-imagine-v1"
    model: str = "grok-3.1-fast"
    fps: int = 30
    resolution: str = "1080p"
    aspect_ratio: str = "16:9"
    style: str = "cinematic"
    quality: str = "high"
    duration_seconds: int = 6
    enable_motion: bool = True
    creativity_scale: float = 0.5
    negative_prompt: str = (
        "blurry, low quality, artifacts, text, watermark, deformed, distorted"
    )
    api_endpoint: str = "https://api.x.ai/v1/imagine"
    api_key: str = ""
    timeout: int = 300
    max_retries: int = 3
    quality_preset: str = "high"
    seed: int = -1
    output_format: str = "mp4"
    image_format: str = "png"
    concatenation_enabled: bool = False
    batch_mode: bool = False
    output_count_per_prompt: int = 1


@dataclass
class GrokImagineRequest:
    """Requête de génération Grok Imagine"""

    scene: Dict[str, Any]
    references: List[Dict[str, Any]] = field(default_factory=list)
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GrokImagineResult:
    """Résultat de génération Grok Imagine"""

    success: bool = False
    generation_id: str = ""
    video_path: Optional[str] = None
    images: List[str] = field(default_factory=list)
    audio_path: Optional[str] = None
    processing_time: float = 0.0
    engine: str = ""
    model: str = ""
    fps: int = 0
    resolution: str = ""
    seed: int = 0
    character_consistency_enabled: bool = False
    multishot_enabled: bool = False
    credits_used: int = 0
    timestamp: str = ""
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class GrokImagineAPIClient:
    """
    Client API pour Grok Imagine (xAI)

    Gère la communication avec l'API Grok Imagine pour:
    - Génération d'images
    - Génération de vidéos
    - Génération de keyframes
    """

    def __init__(self, config: GrokImagineConfig, logger: logging.Logger):
        """
        Initialise le client API

        Args:
            config: Configuration Grok Imagine
            logger: Logger pour les messages
        """
        self.config = config
        self.logger = logger
        self._session = None
        self._base_url = config.api_endpoint

    async def _get_session(self):
        """Récupère ou crée une session HTTP"""
        if self._session is None:
            import aiohttp

            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.config.timeout)
            )
        return self._session

    async def close(self):
        """Ferme la session HTTP"""
        if self._session:
            await self._session.close()
            self._session = None

    async def health_check(self) -> bool:
        """
        Vérifie la connexion à l'API Grok Imagine

        Returns:
            True si l'API est disponible
        """
        try:
            session = await self._get_session()

            if not self.config.api_key:
                self.logger.warning(
                    "Clé API Grok Imagine non configurée. (Le mode simulation a été retiré)"
                )
                return False

            async with session.get(f"{self._base_url}/health") as response:
                return response.status == 200

        except Exception as e:
            self.logger.warning(f"Health check échoué: {e}")
            return False

    async def generate(self, request: GrokImagineRequest) -> GrokImagineResult:
        """
        Génère une image ou vidéo via l'API Grok Imagine

        Args:
            request: Requête de génération

        Returns:
            Résultat de la génération
        """
        start_time = time.time()

        if not self.config.api_key:
            error_msg = "Clé API Grok Imagine manquante. Fin de la simulation, veuillez configurer une vraie clé."
            self.logger.error(error_msg)
            return GrokImagineResult(
                success=False, error=error_msg, processing_time=time.time() - start_time
            )

        try:
            session = await self._get_session()

            # Déterminer le type de génération (image ou vidéo)
            enable_motion = request.config.get(
                "enable_motion", self.config.enable_motion
            )

            # Préparer les données de la requête
            payload = self._prepare_payload(request)

            # Endpoint selon le type de génération
            if enable_motion:
                endpoint = f"{self._base_url}/generate/video"
            else:
                endpoint = f"{self._base_url}/generate/image"

            # En-têtes de la requête
            headers = {
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
            }

            self.logger.info(f"Envoi de la requête à {endpoint}")

            async with session.post(
                endpoint, json=payload, headers=headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_response(data, start_time, enable_motion)
                else:
                    error_text = await response.text()
                    return GrokImagineResult(
                        success=False,
                        error=f"API Error {response.status}: {error_text}",
                        processing_time=time.time() - start_time,
                    )

        except asyncio.TimeoutError:
            return GrokImagineResult(
                success=False,
                error="Délai d'attente dépassé",
                processing_time=time.time() - start_time,
            )
        except Exception as e:
            self.logger.error(f"Erreur lors de la génération: {e}")
            return GrokImagineResult(
                success=False, error=str(e), processing_time=time.time() - start_time
            )

    async def get_generation_status(self, generation_id: str) -> Dict[str, Any]:
        """
        Récupère le statut d'une génération

        Args:
            generation_id: ID de la génération

        Returns:
            Statut de la génération
        """
        try:
            session = await self._get_session()

            headers = {"Authorization": f"Bearer {self.config.api_key}"}

            async with session.get(
                f"{self._base_url}/generations/{generation_id}", headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"status": "error", "error": f"HTTP {response.status}"}

        except Exception as e:
            self.logger.error(f"Erreur lors de la récupération du statut: {e}")
            return {"status": "error", "error": str(e)}

    def _prepare_payload(self, request: GrokImagineRequest) -> Dict[str, Any]:
        """Prépare le payload pour l'API Grok Imagine"""

        # Convertir la scène StoryCore en prompt Grok
        scene_data = self._convert_scene_to_prompt(request.scene)

        # Déterminer le modèle à utiliser
        enable_motion = request.config.get("enable_motion", self.config.enable_motion)
        model = request.config.get("model", self.config.model)

        # Ajuster le modèle selon le type de génération
        if enable_motion and "image" in model:
            model = model.replace("image", "video")

        payload = {
            "generation_id": str(uuid.uuid4()),
            "model": model,
            "prompt": scene_data["prompt"],
            "negative_prompt": request.config.get(
                "negative_prompt", self.config.negative_prompt
            ),
            "style": request.config.get("style", self.config.style),
            "aspect_ratio": request.config.get(
                "aspect_ratio", self.config.aspect_ratio
            ),
            "quality": request.config.get("quality", self.config.quality),
            "fps": request.config.get("fps", self.config.fps),
            "duration_seconds": request.config.get(
                "duration_seconds", self.config.duration_seconds
            ),
            "creativity_scale": request.config.get(
                "creativity_scale", self.config.creativity_scale
            ),
            "seed": request.config.get("seed", self.config.seed),
            "enable_motion": enable_motion,
            "character_consistency": scene_data.get("character_consistency", False),
            "multishot": scene_data.get("multishot", False),
            "references": request.references,
        }

        return payload

    def _convert_scene_to_prompt(self, scene: Dict[str, Any]) -> Dict[str, Any]:
        """Convertit une scène StoryCore en prompt optimisé pour Grok Imagine"""

        prompt_parts = []
        negative_prompt = ""

        # Priority 1: Specific Prompts
        if "image_prompt" in scene and scene["image_prompt"]:
            prompt_parts.append(scene["image_prompt"])
        elif "video_prompt" in scene and scene["video_prompt"]:
            prompt_parts.append(scene["video_prompt"])
        elif "description" in scene and scene["description"]:
            prompt_parts.append(scene["description"])

        # Personnages
        if "characters" in scene and isinstance(scene["characters"], list):
            for char in scene["characters"]:
                char_desc = []
                if "name" in char:
                    char_desc.append(f"Character: {char['name']}")
                if "appearance" in char:
                    char_desc.append(char["appearance"])
                if "clothing" in char:
                    char_desc.append(f"wearing {char['clothing']}")
                if char_desc:
                    prompt_parts.append(", ".join(char_desc))

        # Actions
        if "actions" in scene and isinstance(scene["actions"], list):
            prompt_parts.append(", ".join(scene["actions"]))

        # Environnement
        if "environment" in scene and scene["environment"]:
            prompt_parts.append(f"Environment: {scene['environment']}")

        # Style visuel
        if "style" in scene and scene["style"]:
            prompt_parts.append(f"Style: {scene['style']}")
        elif "style" not in [p.lower() for p in prompt_parts if "style:" in p.lower()]:
            prompt_parts.append("cinematic style")

        # Éclairage
        if "lighting" in scene and scene["lighting"]:
            prompt_parts.append(f"Lighting: {scene['lighting']}")

        # Mouvement/Caméra (pour vidéo)
        if "camera_movement" in scene and scene["camera_movement"]:
            prompt_parts.append(f"Camera: {scene['camera_movement']}")

        # Atmosphère
        if "atmosphere" in scene and scene["atmosphere"]:
            prompt_parts.append(f"Atmosphere: {scene['atmosphere']}")

        # Assembler le prompt
        prompt = (
            ". ".join(prompt_parts)
            if prompt_parts
            else scene.get("name", "Generate a cinematic scene")
        )

        # Ajouter des détails de qualité
        quality_suffix = f". Highly detailed, 8k, professional cinematic render, {self.config.quality} quality."
        prompt += quality_suffix

        return {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "character_consistency": scene.get("character_consistency", False),
            "multishot": scene.get("multishot", False),
        }

    def _parse_response(
        self, data: Dict[str, Any], start_time: float, enable_motion: bool
    ) -> GrokImagineResult:
        """Parse la réponse de l'API"""

        processing_time = time.time() - start_time

        # Extraire les URLs
        video_url = data.get("video_url") or data.get("video")
        image_urls = data.get("image_urls") or data.get("images") or []

        # Si c'est une vidéo, l'URL peut être dans video_url
        if enable_motion and video_url:
            image_urls = [video_url]  # Utiliser la vidéo comme premier "image"

        return GrokImagineResult(
            success=data.get("status") == "completed",
            generation_id=data.get("generation_id", ""),
            video_path=video_url,
            images=image_urls if isinstance(image_urls, list) else [image_urls],
            audio_path=data.get("audio_url") or data.get("audio"),
            processing_time=processing_time,
            engine=data.get("engine", self.config.engine),
            model=data.get("model", self.config.model),
            fps=data.get("fps", self.config.fps),
            resolution=data.get("resolution", self.config.resolution),
            seed=data.get("seed", 0),
            character_consistency_enabled=data.get("character_consistency", False),
            multishot_enabled=data.get("multishot", False),
            credits_used=data.get("credits_used", 0),
            timestamp=data.get("timestamp", ""),
            error=data.get("error"),
            metadata=data.get("metadata", {}),
        )
