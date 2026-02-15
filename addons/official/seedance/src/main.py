"""
Seedance 2.0 Addon for StoryCore Engine
Point d'entrée principal de l'addon Seedance pour la génération de vidéos.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

from .seedance_api import SeedanceAPIClient, SeedanceGenerationRequest, SeedanceConfig


logger = logging.getLogger(__name__)


class SeedanceAddon:
    """
    Addon Seedance 2.0 pour StoryCore Engine
    
    Responsabilités:
    - Initialisation du client API Seedance
    - Gestion de la génération de vidéos
    - Intégration avec le système d'addons StoryCore
    """

    def __init__(self, context: Dict[str, Any]):
        """
        Initialise l'addon Seedance
        
        Args:
            context: Contexte d'exécution fourni par le gestionnaire d'addons
        """
        self.context = context
        self.addon_name = context.get('addon_name', 'seedance')
        self.logger = logging.getLogger(f'seedance.addon')
        
        # Composant API
        self.api_client: Optional[SeedanceAPIClient] = None
        
        # État de l'addon
        self.is_initialized = False
        self.is_running = False
        self.config = self._load_config()
        
        # Statistiques
        self.stats = {
            'generations_count': 0,
            'successful_generations': 0,
            'failed_generations': 0,
            'total_processing_time': 0.0
        }

    def _load_config(self) -> SeedanceConfig:
        """Charge la configuration depuis le fichier config.json"""
        config_path = Path(__file__).parent.parent / "config.json"
        
        default_config = {
            "engine": "seedance-v2-turbo",
            "fps": 60,
            "resolution": "2k",
            "creativity_scale": 0.5,
            "physics_fidelity": "high",
            "enable_audio": True,
            "enable_3d_export": True,
            "api_endpoint": "https://api.seedance.ai/v2",
            "api_key": "",
            "timeout": 300,
            "max_retries": 3,
            "default_aspect_ratio": "16:9",
            "quality_preset": "high",
            "seed": -1,
            "output_format": "mp4",
            "audio_format": "wav",
            "3d_format": "glb"
        }
        
        if config_path.exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception as e:
                self.logger.warning(f"Erreur lors du chargement de config.json: {e}")
        
        return SeedanceConfig(**default_config)

    async def initialize(self) -> bool:
        """
        Initialise l'addon Seedance
        
        Returns:
            True si l'initialisation réussit
        """
        try:
            self.logger.info("Initialisation de l'addon Seedance 2.0...")
            
            # Initialiser le client API
            self.api_client = SeedanceAPIClient(
                config=self.config,
                logger=self.logger
            )
            
            self.is_initialized = True
            self.logger.info("Addon Seedance 2.0 initialisé avec succès")
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
            self.logger.warning("L'addon Seedance est déjà en cours d'exécution")
            return True
        
        try:
            self.logger.info("Démarrage de l'addon Seedance...")
            
            # Vérifier la connexion API
            if self.api_client:
                health_check = await self.api_client.health_check()
                if not health_check:
                    self.logger.warning("API Seedance non disponible, mais l'addon reste fonctionnel")
            
            self.is_running = True
            self.logger.info("Addon Seedance démarré avec succès")
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
            self.logger.warning("L'addon Seedance n'est pas en cours d'exécution")
            return True
        
        try:
            self.logger.info("Arrêt de l'addon Seedance...")
            self.is_running = False
            self.logger.info("Addon Seedance arrêté avec succès")
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'arrêt: {e}")
            return False

    async def generate(self, scene: Dict[str, Any], references: Optional[List[Dict[str, Any]]] = None, 
                      config_overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Génère une vidéo via l'API Seedance
        
        Args:
            scene: JSON StoryCore (description de la scène)
            references: Liste de références (images, audio)
            config_overrides: Paramètres optionnels
            
        Returns:
            {
                "status": "success | error",
                "video": <chemin ou buffer>,
                "audio": <optionnel>,
                "3d": <optionnel>,
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
            request = SeedanceGenerationRequest(
                scene=scene,
                references=references or [],
                config=generation_config
            )
            
            # Envoyer la requête à l'API
            self.logger.info(f"Génération Seedance débutée pour la scène: {scene.get('name', 'Untitled')}")
            
            result = await self.api_client.generate_video(request)
            
            # Mettre à jour les statistiques
            self.stats['generations_count'] += 1
            if result.success:
                self.stats['successful_generations'] += 1
            else:
                self.stats['failed_generations'] += 1
            
            self.stats['total_processing_time'] += result.processing_time
            
            return {
                "status": "success" if result.success else "error",
                "video": result.video_path,
                "audio": result.audio_path,
                "3d": result.model_3d_path,
                "metadata": {
                    "generation_id": result.generation_id,
                    "processing_time": result.processing_time,
                    "engine": result.engine,
                    "fps": result.fps,
                    "resolution": result.resolution,
                    "seed": result.seed,
                    "character_consistency": result.character_consistency_enabled,
                    "multishot": result.multishot_enabled,
                    "credits_used": result.credits_used,
                    "timestamp": result.timestamp
                }
            }
            
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
                "fps": self.config.fps,
                "resolution": self.config.resolution,
                "creativity_scale": self.config.creativity_scale,
                "physics_fidelity": self.config.physics_fidelity,
                "enable_audio": self.config.enable_audio,
                "enable_3d_export": self.config.enable_3d_export,
                "api_endpoint": self.config.api_endpoint
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
            self.logger.info("Nettoyage de l'addon Seedance terminé")
            
        except Exception as e:
            self.logger.error(f"Erreur lors du nettoyage: {e}")

    def _merge_configs(self, overrides: Dict[str, Any]) -> Dict[str, Any]:
        """Fusionne la configuration par défaut avec les overrides"""
        config_dict = {
            "engine": self.config.engine,
            "fps": self.config.fps,
            "resolution": self.config.resolution,
            "creativity_scale": self.config.creativity_scale,
            "physics_fidelity": self.config.physics_fidelity,
            "enable_audio": self.config.enable_audio,
            "enable_3d_export": self.config.enable_3d_export,
            "aspect_ratio": self.config.default_aspect_ratio,
            "quality_preset": self.config.quality_preset,
            "seed": self.config.seed,
            "output_format": self.config.output_format,
            "audio_format": self.config.audio_format,
            "3d_format": self.config._3d_format
        }
        
        config_dict.update(overrides)
        return config_dict

    def capabilities(self) -> List[str]:
        """Retourne les capacités de l'addon"""
        return [
            "video",
            "audio",
            "3d",
            "multishot",
            "character_consistency"
        ]


# Instance globale
addon = None


def get_addon() -> SeedanceAddon:
    """Retourne l'instance globale de l'addon"""
    global addon
    return addon


async def initialize(context: Dict[str, Any]) -> SeedanceAddon:
    """
    Fonction d'initialisation pour le gestionnaire d'addons
    
    Args:
        context: Contexte d'exécution
        
    Returns:
        Instance de l'addon initialisée
    """
    global addon
    addon = SeedanceAddon(context)
    
    if await addon.initialize():
        return addon
    else:
        raise RuntimeError("Échec de l'initialisation de l'addon Seedance")


async def cleanup() -> None:
    """Fonction de nettoyage pour le gestionnaire d'addons"""
    global addon
    if addon:
        await addon.cleanup()
        addon = None

