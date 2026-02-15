"""
Seedance API Routes for StoryCore-Engine
Routes FastAPI pour la génération de vidéos via Seedance 2.0
"""

from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import logging
import json
from pathlib import Path

from src.addon_manager import AddonManager

# Configuration du logger
logger = logging.getLogger(__name__)

# Créer le router
router = APIRouter(prefix="/api/seedance", tags=["seedance"])

# Instance globale
addon_manager: Optional[AddonManager] = None
_seedance_addon = None


def init_seedance_api(manager: AddonManager, seedance_addon=None):
    """
    Initialise l'API Seedance avec les gestionnaires
    
    Args:
        manager: Gestionnaire d'add-ons
        seedance_addon: Instance de l'addon Seedance
    """
    global addon_manager, _seedance_addon
    addon_manager = manager
    _seedance_addon = seedance_addon


@router.get("")
async def get_seedance_status():
    """
    Récupère le statut de l'addon Seedance
    
    Returns:
        Statut de l'addon
    """
    global _seedance_addon
    
    if not _seedance_addon:
        # Essayer de récupérer l'addon depuis le manager
        if addon_manager:
            info = addon_manager.get_addon_info("Seedance 2.0")
            if info and info.module:
                _seedance_addon = info.module.addon
        
        if not _seedance_addon:
            return {
                "success": False,
                "message": "Addon Seedance non initialisé",
                "running": False
            }
    
    try:
        status = await _seedance_addon.get_status()
        return {
            "success": True,
            **status
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du statut: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/generate")
async def generate_video(
    scene: Dict[str, Any] = Body(...),
    references: Optional[List[Dict[str, Any]]] = Body(None),
    config_overrides: Optional[Dict[str, Any]] = Body(None)
):
    """
    Génère une vidéo via Seedance
    
    Body Parameters:
        - scene: Description de la scène StoryCore
        - references: Liste de références (images, audio)
        - config_overrides: Paramètres optionnels
        
    Returns:
        Résultat de la génération
    """
    global _seedance_addon
    
    if not _seedance_addon:
        # Essayer de récupérer l'addon depuis le manager
        if addon_manager:
            info = addon_manager.get_addon_info("Seedance 2.0")
            if info and info.module and hasattr(info.module, 'addon'):
                _seedance_addon = info.module.addon
        
        if not _seedance_addon:
            raise HTTPException(
                status_code=503,
                detail="Addon Seedance non disponible"
            )
    
    try:
        logger.info(f"Génération vidéo Seedance demandée pour: {scene.get('name', 'Untitled')}")
        
        result = await _seedance_addon.generate(
            scene=scene,
            references=references,
            config_overrides=config_overrides
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Erreur lors de la génération: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération: {str(e)}"
        )


@router.get("/config")
async def get_seedance_config():
    """
    Récupère la configuration de Seedance
    
    Returns:
        Configuration actuelle
    """
    global _seedance_addon
    
    if not _seedance_addon:
        if addon_manager:
            info = addon_manager.get_addon_info("Seedance 2.0")
            if info and info.module and hasattr(info.module, 'addon'):
                _seedance_addon = info.module.addon
        
        if not _seedance_addon:
            raise HTTPException(
                status_code=503,
                detail="Addon Seedance non disponible"
            )
    
    try:
        status = await _seedance_addon.get_status()
        return {
            "success": True,
            "config": status.get("config", {})
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de la config: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.put("/config")
async def update_seedance_config(
    new_config: Dict[str, Any] = Body(...)
):
    """
    Met à jour la configuration de Seedance
    
    Body Parameters:
        - new_config: Nouvelle configuration
        
    Returns:
        Résultat de la mise à jour
    """
    global _seedance_addon
    
    if not _seedance_addon:
        if addon_manager:
            info = addon_manager.get_addon_info("Seedance 2.0")
            if info and info.module and hasattr(info.module, 'addon'):
                _seedance_addon = info.module.addon
        
        if not _seedance_addon:
            raise HTTPException(
                status_code=503,
                detail="Addon Seedance non disponible"
            )
    
    try:
        success = await _seedance_addon.update_config(new_config)
        
        if success:
            return {
                "success": True,
                "message": "Configuration mise à jour"
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Échec de la mise à jour de la configuration"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de la config: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/capabilities")
async def get_seedance_capabilities():
    """
    Récupère les capacités de l'addon Seedance
    
    Returns:
        Liste des capacités
    """
    global _seedance_addon
    
    if not _seedance_addon:
        if addon_manager:
            info = addon_manager.get_addon_info("Seedance 2.0")
            if info and info.module and hasattr(info.module, 'addon'):
                _seedance_addon = info.module.addon
        
        if not _seedance_addon:
            return {
                "success": True,
                "capabilities": ["video", "audio", "3d", "multishot", "character_consistency"]
            }
    
    try:
        capabilities = _seedance_addon.capabilities()
        return {
            "success": True,
            "capabilities": capabilities
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des capacités: {e}")
        return {
            "success": True,
            "capabilities": ["video", "audio", "3d", "multishot", "character_consistency"]
        }


@router.get("/engines")
async def get_available_engines():
    """
    Récupère les moteurs Seedance disponibles
    
    Returns:
        Liste des moteurs disponibles
    """
    return {
        "success": True,
        "engines": [
            {
                "id": "seedance-v2-turbo",
                "name": "Seedance V2 Turbo",
                "description": "Génération rapide avec qualité intermédiaire",
                "recommended_fps": 30,
                "max_resolution": "1080p"
            },
            {
                "id": "seedance-v2-quality",
                "name": "Seedance V2 Quality",
                "description": "Génération de haute qualité",
                "recommended_fps": 60,
                "max_resolution": "2k"
            },
            {
                "id": "seedance-v2-cinematic",
                "name": "Seedance V2 Cinematic",
                "description": "Mode cinématographique avec fidélité physique maximale",
                "recommended_fps": 60,
                "max_resolution": "4k"
            }
        ]
    }


@router.get("/presets")
async def get_generation_presets():
    """
    Récupère les préréglages de génération disponibles
    
    Returns:
        Liste des préréglages
    """
    return {
        "success": True,
        "presets": [
            {
                "id": "fast",
                "name": "Génération Rapide",
                "fps": 30,
                "resolution": "720p",
                "creativity_scale": 0.3,
                "physics_fidelity": "low"
            },
            {
                "id": "balanced",
                "name": "Équilibré",
                "fps": 30,
                "resolution": "1080p",
                "creativity_scale": 0.5,
                "physics_fidelity": "medium"
            },
            {
                "id": "high",
                "name": "Haute Qualité",
                "fps": 60,
                "resolution": "2k",
                "creativity_scale": 0.5,
                "physics_fidelity": "high"
            },
            {
                "id": "cinematic",
                "name": "Cinématique",
                "fps": 60,
                "resolution": "4k",
                "creativity_scale": 0.7,
                "physics_fidelity": "ultra"
            }
        ]
    }

