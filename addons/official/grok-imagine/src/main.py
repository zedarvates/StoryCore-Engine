"""
Grok Imagine Addon for StoryCore Engine
Point d'entrée principal de l'addon Grok Imagine pour la génération d'images et vidéos.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

from .grok_api import GrokImagineAPIClient, GrokImagineRequest, GrokImagineConfig


logger = logging.getLogger(__name__)


class GrokImagineAddon:
    """
    Addon Grok Imagine pour StoryCore Engine
    
    Responsabilités:
    - Initialisation du client API Grok Imagine
    - Gestion de la génération d'images et vidéos
    - Intégration avec le système d'addons StoryCore
    """

    def __init__(self, context: Dict[str, Any]):
        """
        Initialise l'addon Grok Imagine
        
        Args:
            context: Contexte d'exécution fourni par le gestionnaire d'addons
        """
        self.context = context
        self.addon_name = context.get('addon_name', 'grok-imagine')
        self.logger = logging.getLogger(f'grok-imagine.addon')
        
        # Composant API
        self.api_client: Optional[GrokImagineAPIClient] = None
        
        # État de l'addon
        self.is_initialized = False
        self.is_running = False
        self.config = self._load_config()
        
        # Statistiques
        self.stats = {
            'generations_count': 0,
            'successful_generations': 0,
            'failed_generations': 0,
            'total_processing_time': 0.0,
            'images_generated': 0,
            'videos_generated': 0
        }

    def _load_config(self) -> GrokImagineConfig:
        """Charge la configuration depuis le fichier config.json"""
        config_path = Path(__file__).parent.parent / "config.json"
        
        default_config = {
            "engine": "grok-imagine-v1",
            "model": "grok-image-v1",
            "fps": 30,
            "resolution": "1080p",
            "aspect_ratio": "16:9",
            "style": "cinematic",
            "quality": "high",
            "duration_seconds": 8,
            "enable_motion": True,
            "creativity_scale": 0.5,
            "negative_prompt": "blurry, low quality, artifacts, text, watermark, deformed, distorted",
            "api_endpoint": "https://api.x.ai/v1/imagine",
            "api_key": "",
            "timeout": 300,
            "max_retries": 3,
            "quality_preset": "high",
            "seed": -1,
            "output_format": "mp4",
            "image_format": "png"
        }
        
        if config_path.exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception as e:
                self.logger.warning(f"Erreur lors du chargement de config.json: {e}")
        
        return GrokImagineConfig(**default_config)

    async def initialize(self) -> bool:
        """
        Initialise l'addon Grok Imagine
        
        Returns:
            True si l'initialisation réussit
        """
        try:
            self.logger.info("Initialisation de l'addon Grok Imagine...")
            
            # Initialiser le client API
            self.api_client = GrokImagineAPIClient(
                config=self.config,
                logger=self.logger
            )
            
            self.is_initialized = True
            self.logger.info("Addon Grok Imagine initialisé avec succès")
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'initialisation: {e}")
            return False

    async def start(self) -> bool:
        """
        Démarre l'addon
        
        Returns:
            True si le démarrage réussit
        """
        if self.is_running:
            self.logger.warning("L'addon Grok Imagine est déjà en cours d'exécution")
            return True
        
        try:
            self.logger.info("Démarrage de l'addon Grok Imagine...")
            
            # Vérifier la connexion API
            if self.api_client:
                health_check = await self.api_client.health_check()
                if not health_check:
                    self.logger.warning("API Grok Imagine non disponible, mais l'addon reste fonctionnel en mode simulation")
            
            self.is_running = True
            self.logger.info("Addon Grok Imagine démarré avec succès")
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors du démarrage: {e}")
            return False

    async def stop(self) -> bool:
        """
        Arrête l'addon
        
        Returns:
            True si l'arrêt réussit
        """
        if not self.is_running:
            self.logger.warning("L'addon Grok Imagine n'est pas en cours d'exécution")
            return True
        
        try:
            self.logger.info("Arrêt de l'addon Grok Imagine...")
            self.is_running = False
            self.logger.info("Addon Grok Imagine arrêté avec succès")
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'arrêt: {e}")
            return False

    async def generate(self, scene: Dict[str, Any], references: Optional[List[Dict[str, Any]]] = None, 
                      config_overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Génère une image ou vidéo via l'API Grok Imagine
        
        Args:
            scene: JSON StoryCore (description de la scène)
            references: Liste de références (images, audio)
            config_overrides: Paramètres optionnels
            
        Returns:
            {
                "status": "success | error",
                "video": <chemin ou URL>,
                "images": [<chemin ou URL>, ...],
                "audio": <optionnel>,
                "metadata": {...}
            }
        """
        if not self.is_initialized:
            return {
                "status": "error",
                "error": "Addon non initialisé",
                "metadata": {}
            }
        
        try:
            # Fusionner les configurations
            generation_config = self._merge_configs(config_overrides or {})
            
            # Préparer la requête
            request = GrokImagineRequest(
                scene=scene,
                references=references or [],
                config=generation_config
            )
            
            # Envoyer la requête à l'API
            self.logger.info(f"Génération Grok Imagine débutée pour la scène: {scene.get('name', 'Untitled')}")
            
            result = await self.api_client.generate(request)
            
            # Mettre à jour les statistiques
            self.stats['generations_count'] += 1
            if result.success:
                self.stats['successful_generations'] += 1
                
                # Compter le type de génération
                if result.video_path:
                    self.stats['videos_generated'] += 1
                if result.images:
                    self.stats['images_generated'] += len(result.images)
            else:
                self.stats['failed_generations'] += 1
            
            self.stats['total_processing_time'] += result.processing_time
            
            # Préparer la réponse
            response = {
                "status": "success" if result.success else "error",
                "video": result.video_path,
                "images": result.images,
                "audio": result.audio_path,
                "metadata": {
                    "generation_id": result.generation_id,
                    "processing_time": result.processing_time,
                    "engine": result.engine,
                    "model": result.model,
                    "fps": result.fps,
                    "resolution": result.resolution,
                    "seed": result.seed,
                    "character_consistency": result.character_consistency_enabled,
                    "multishot": result.multishot_enabled,
                    "credits_used": result.credits_used,
                    "timestamp": result.timestamp,
                    "prompt": result.metadata.get("prompt_used", ""),
                    "simulation_mode": result.metadata.get("simulation_mode", False)
                }
            }
            
            if result.error:
                response["error"] = result.error
            
            return response
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la génération: {e}")
            self.stats['failed_generations'] += 1
            return {
                "status": "error",
                "error": str(e),
                "metadata": {}
            }

    async def get_status(self) -> Dict[str, Any]:
        """
        Retourne l'état actuel de l'addon
        
        Returns:
            Dictionnaire contenant l'état et les statistiques
        """
        return {
            "running": self.is_running,
            "initialized": self.is_initialized,
            "stats": self.stats,
            "config": {
                "engine": self.config.engine,
                "model": self.config.model,
                "fps": self.config.fps,
                "resolution": self.config.resolution,
                "aspect_ratio": self.config.aspect_ratio,
                "style": self.config.style,
                "quality": self.config.quality,
                "duration_seconds": self.config.duration_seconds,
                "enable_motion": self.config.enable_motion,
                "creativity_scale": self.config.creativity_scale,
                "api_endpoint": self.config.api_endpoint,
                "has_api_key": bool(self.config.api_key)
            }
        }

    async def update_config(self, new_config: Dict[str, Any]) -> bool:
        """
        Met à jour la configuration de l'addon
        
        Args:
            new_config: Nouvelle configuration
            
        Returns:
            True si la mise à jour réussit
        """
        try:
            for key, value in new_config.items():
                if hasattr(self.config, key):
                    setattr(self.config, key, value)
            
            # Reconfigurer le client API si nécessaire
            if self.api_client:
                self.api_client.config = self.config
            
            self.logger.info("Configuration mise à jour")
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la mise à jour de la configuration: {e}")
            return False

    async def cleanup(self) -> None:
        """Nettoyage des ressources avant la désactivation"""
        try:
            await self.stop()
            if self.api_client:
                await self.api_client.close()
            self.logger.info("Nettoyage de l'addon Grok Imagine terminé")
            
        except Exception as e:
            self.logger.error(f"Erreur lors du nettoyage: {e}")

    def _merge_configs(self, overrides: Dict[str, Any]) -> Dict[str, Any]:
        """Fusionne la configuration par défaut avec les overrides"""
        config_dict = {
            "engine": self.config.engine,
            "model": self.config.model,
            "fps": self.config.fps,
            "resolution": self.config.resolution,
            "aspect_ratio": self.config.aspect_ratio,
            "style": self.config.style,
            "quality": self.config.quality,
            "duration_seconds": self.config.duration_seconds,
            "enable_motion": self.config.enable_motion,
            "creativity_scale": self.config.creativity_scale,
            "negative_prompt": self.config.negative_prompt,
            "quality_preset": self.config.quality_preset,
            "seed": self.config.seed,
            "output_format": self.config.output_format,
            "image_format": self.config.image_format
        }
        
        config_dict.update(overrides)
        return config_dict

    def capabilities(self) -> List[str]:
        """Retourne les capacités de l'addon"""
        return [
            "image",
            "video",
            "multishot",
            "character_consistency",
            "text_to_video",
            "text_to_image"
        ]


# Instance globale
addon = None


def get_addon() -> GrokImagineAddon:
    """Retourne l'instance globale de l'addon"""
    global addon
    return addon


async def initialize(context: Dict[str, Any]) -> GrokImagineAddon:
    """
    Fonction d'initialisation pour le gestionnaire d'addons
    
    Args:
        context: Contexte d'exécution
        
    Returns:
        Instance de l'addon initialisée
    """
    global addon
    addon = GrokImagineAddon(context)
    
    if await addon.initialize():
        return addon
    else:
        raise RuntimeError("Échec de l'initialisation de l'addon Grok Imagine")


async def cleanup() -> None:
    """Fonction de nettoyage pour le gestionnaire d'addons"""
    global addon
    if addon:
        await addon.cleanup()
        addon = None

