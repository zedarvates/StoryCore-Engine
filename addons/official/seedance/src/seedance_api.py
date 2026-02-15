"""
Seedance API Client
Client pour communiquer avec l'API Seedance 2.0
"""

import asyncio
import json
import logging
import time
import uuid
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from enum import Enum


class PhysicsFidelity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    ULTRA = "ultra"


@dataclass
class SeedanceConfig:
    """Configuration pour l'API Seedance"""
    engine: str = "seedance-v2-turbo"
    fps: int = 60
    resolution: str = "2k"
    creativity_scale: float = 0.5
    physics_fidelity: str = "high"
    enable_audio: bool = True
    enable_3d_export: bool = True
    api_endpoint: str = "https://api.seedance.ai/v2"
    api_key: str = ""
    timeout: int = 300
    max_retries: int = 3
    default_aspect_ratio: str = "16:9"
    quality_preset: str = "high"
    seed: int = -1
    output_format: str = "mp4"
    audio_format: str = "wav"
    _3d_format: str = "glb"


@dataclass
class SeedanceGenerationRequest:
    """Requête de génération vidéo"""
    scene: Dict[str, Any]
    references: List[Dict[str, Any]] = field(default_factory=list)
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SeedanceGenerationResult:
    """Résultat de génération vidéo"""
    success: bool = False
    generation_id: str = ""
    video_path: Optional[str] = None
    audio_path: Optional[str] = None
    model_3d_path: Optional[str] = None
    processing_time: float = 0.0
    engine: str = ""
    fps: int = 0
    resolution: str = ""
    seed: int = 0
    character_consistency_enabled: bool = False
    multishot_enabled: bool = False
    credits_used: int = 0
    timestamp: str = ""
    error: Optional[str] = None


class SeedanceAPIClient:
    """
    Client API pour Seedance 2.0
    
    Gère la communication avec l'API Seedance pour:
    - Génération de vidéos
    - Génération audio
    - Export 3D
    """

    def __init__(self, config: SeedanceConfig, logger: logging.Logger):
        """
        Initialise le client API
        
        Args:
            config: Configuration Seedance
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
        Vérifie la connexion à l'API Seedance
        
        Returns:
            True si l'API est disponible
        """
        try:
            session = await self._get_session()
            
            # En mode simulation (pas de clé API)
            if not self.config.api_key:
                self.logger.info("Mode simulation: API Seedance non configurée")
                return True
            
            async with session.get(f"{self._base_url}/health") as response:
                return response.status == 200
                
        except Exception as e:
            self.logger.warning(f"Health check échoué: {e}")
            return False

    async def generate_video(self, request: SeedanceGenerationRequest) -> SeedanceGenerationResult:
        """
        Génère une vidéo via l'API Seedance
        
        Args:
            request: Requête de génération
            
        Returns:
            Résultat de la génération
        """
        start_time = time.time()
        
        # Simulation si pas de clé API
        if not self.config.api_key:
            return self._simulate_generation(request, start_time)
        
        try:
            session = await self._get_session()
            
            # Préparer les données de la requête
            payload = self._prepare_payload(request)
            
            # Envoyer la requête
            headers = {
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json"
            }
            
            async with session.post(
                f"{self._base_url}/generate",
                json=payload,
                headers=headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_response(data, start_time)
                else:
                    error_text = await response.text()
                    return SeedanceGenerationResult(
                        success=False,
                        error=f"API Error {response.status}: {error_text}",
                        processing_time=time.time() - start_time
                    )
                    
        except asyncio.TimeoutError:
            return SeedanceGenerationResult(
                success=False,
                error="Délai d'attente dépassé",
                processing_time=time.time() - start_time
            )
        except Exception as e:
            self.logger.error(f"Erreur lors de la génération: {e}")
            return SeedanceGenerationResult(
                success=False,
                error=str(e),
                processing_time=time.time() - start_time
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
            
            headers = {
                "Authorization": f"Bearer {self.config.api_key}"
            }
            
            async with session.get(
                f"{self._base_url}/generations/{generation_id}",
                headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"status": "error", "error": f"HTTP {response.status}"}
                    
        except Exception as e:
            self.logger.error(f"Erreur lors de la récupération du statut: {e}")
            return {"status": "error", "error": str(e)}

    def _prepare_payload(self, request: SeedanceGenerationRequest) -> Dict[str, Any]:
        """Prépare le payload pour l'API Seedance"""
        
        # Convertir la scène StoryCore en prompt Seedance
        scene_data = self._convert_scene_to_prompt(request.scene)
        
        payload = {
            "generation_id": str(uuid.uuid4()),
            "engine": request.config.get("engine", self.config.engine),
            "prompt": scene_data["prompt"],
            "negative_prompt": scene_data.get("negative_prompt", ""),
            "fps": request.config.get("fps", self.config.fps),
            "resolution": request.config.get("resolution", self.config.resolution),
            "creativity_scale": request.config.get("creativity_scale", self.config.creativity_scale),
            "physics_fidelity": request.config.get("physics_fidelity", self.config.physics_fidelity),
            "aspect_ratio": request.config.get("aspect_ratio", self.config.default_aspect_ratio),
            "quality_preset": request.config.get("quality_preset", self.config.quality_preset),
            "seed": request.config.get("seed", self.config.seed),
            "enable_audio": request.config.get("enable_audio", self.config.enable_audio),
            "enable_3d_export": request.config.get("enable_3d_export", self.config.enable_3d_export),
            "character_consistency": scene_data.get("character_consistency", False),
            "multishot": scene_data.get("multishot", False),
            "references": request.references
        }
        
        return payload

    def _convert_scene_to_prompt(self, scene: Dict[str, Any]) -> Dict[str, Any]:
        """Convertit une scène StoryCore en prompt Seedance"""
        
        # Extraire les informations pertinentes
        prompt_parts = []
        negative_prompt = ""
        
        # Description de la scène
        if "description" in scene:
            prompt_parts.append(scene["description"])
        
        # Personnages
        if "characters" in scene:
            for char in scene["characters"]:
                if "name" in char:
                    prompt_parts.append(f"Character: {char['name']}")
                if "appearance" in char:
                    prompt_parts.append(char["appearance"])
        
        # Actions
        if "actions" in scene:
            prompt_parts.append(", ".join(scene["actions"]))
        
        # Environnement
        if "environment" in scene:
            prompt_parts.append(f"Environment: {scene['environment']}")
        
        # Style
        if "style" in scene:
            prompt_parts.append(f"Style: {scene['style']}")
        
        # Mouvement/Caméra
        if "camera_movement" in scene:
            prompt_parts.append(f"Camera: {scene['camera_movement']}")
        
        # Assembler le prompt
        prompt = ", ".join(prompt_parts) if prompt_parts else scene.get("name", "Generate a video")
        
        return {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "character_consistency": scene.get("character_consistency", False),
            "multishot": scene.get("multishot", False)
        }

    def _parse_response(self, data: Dict[str, Any], start_time: float) -> SeedanceGenerationResult:
        """Parse la réponse de l'API"""
        
        processing_time = time.time() - start_time
        
        return SeedanceGenerationResult(
            success=data.get("status") == "completed",
            generation_id=data.get("generation_id", ""),
            video_path=data.get("video_url"),
            audio_path=data.get("audio_url"),
            model_3d_path=data.get("model_3d_url"),
            processing_time=processing_time,
            engine=data.get("engine", self.config.engine),
            fps=data.get("fps", self.config.fps),
            resolution=data.get("resolution", self.config.resolution),
            seed=data.get("seed", 0),
            character_consistency_enabled=data.get("character_consistency", False),
            multishot_enabled=data.get("multishot", False),
            credits_used=data.get("credits_used", 0),
            timestamp=data.get("timestamp", ""),
            error=data.get("error")
        )

    def _simulate_generation(self, request: SeedanceGenerationRequest, start_time: float) -> SeedanceGenerationResult:
        """
        Simule une génération pour les tests sans API
        
        Args:
            request: Requête de génération
            start_time: Temps de début
            
        Returns:
            Résultat simulé
        """
        import random
        
        # Temps de traitement simulé
        time.sleep(min(random.uniform(2, 5), self.config.timeout))
        
        processing_time = time.time() - start_time
        
        # Générer un ID de simulation
        generation_id = f"sim_{uuid.uuid4().hex[:8]}"
        
        # Préparer les chemins de sortie simulés
        output_dir = Path("exports/seedance")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        video_path = str(output_dir / f"{generation_id}.mp4")
        audio_path = str(output_dir / f"{generation_id}_audio.wav") if request.config.get("enable_audio", self.config.enable_audio) else None
        model_3d_path = str(output_dir / f"{generation_id}.glb") if request.config.get("enable_3d_export", self.config.enable_3d_export) else None
        
        self.logger.info(f"Génération simulée: {generation_id}")
        self.logger.info(f"  Vidéo: {video_path}")
        self.logger.info(f"  Audio: {audio_path}")
        self.logger.info(f"  3D: {model_3d_path}")
        
        return SeedanceGenerationResult(
            success=True,
            generation_id=generation_id,
            video_path=video_path,
            audio_path=audio_path,
            model_3d_path=model_3d_path,
            processing_time=processing_time,
            engine=request.config.get("engine", self.config.engine),
            fps=request.config.get("fps", self.config.fps),
            resolution=request.config.get("resolution", self.config.resolution),
            seed=request.config.get("seed", random.randint(0, 999999)),
            character_consistency_enabled=request.scene.get("character_consistency", False),
            multishot_enabled=request.scene.get("multishot", False),
            credits_used=random.randint(10, 100),
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
        )

