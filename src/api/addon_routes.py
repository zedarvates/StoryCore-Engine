"""
Addon API Routes for StoryCore-Engine
Routes FastAPI pour la gestion des add-ons via l'interface web.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from pathlib import Path
from typing import List, Optional, Dict, Any
import logging
import tempfile
import shutil

from src.addon_manager import AddonManager, AddonType, AddonState
from src.addon_validator import AddonValidator
from src.addon_permissions import PermissionManager

# Configuration du logger
logger = logging.getLogger(__name__)

# Créer le router
router = APIRouter(prefix="/api/addons", tags=["addons"])

# Instances globales (à initialiser au démarrage de l'app)
addon_manager: Optional[AddonManager] = None
addon_validator: Optional[AddonValidator] = None
permission_manager: Optional[PermissionManager] = None


def init_addon_api(manager: AddonManager, validator: AddonValidator, perm_manager: PermissionManager):
    """
    Initialise l'API des add-ons avec les gestionnaires
    
    Args:
        manager: Gestionnaire d'add-ons
        validator: Validateur d'add-ons
        perm_manager: Gestionnaire de permissions
    """
    global addon_manager, addon_validator, permission_manager
    addon_manager = manager
    addon_validator = validator
    permission_manager = perm_manager


@router.get("")
async def list_addons(
    category: Optional[str] = Query(None, description="Filter by category (official, community)"),
    addon_type: Optional[str] = Query(None, description="Filter by type"),
    status: Optional[str] = Query(None, description="Filter by status (enabled, disabled, error)")
):
    """
    Liste tous les add-ons disponibles
    
    Query Parameters:
        - category: Filtrer par catégorie
        - addon_type: Filtrer par type
        - status: Filtrer par statut
    
    Returns:
        Liste des add-ons avec leurs informations
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")
    
    try:
        addons_list = []
        
        for name, info in addon_manager.addons.items():
            # Appliquer les filtres
            if category and category not in str(info.path):
                continue
            
            if addon_type and info.manifest.type.value != addon_type:
                continue
            
            if status:
                if status == "enabled" and name not in addon_manager.enabled_addons:
                    continue
                if status == "disabled" and (name in addon_manager.enabled_addons or info.state == AddonState.ERROR):
                    continue
                if status == "error" and info.state != AddonState.ERROR:
                    continue
            
            # Construire la réponse
            addon_data = {
                "name": info.manifest.name,
                "version": info.manifest.version,
                "type": info.manifest.type.value,
                "author": info.manifest.author,
                "description": info.manifest.description,
                "category": "official" if "official" in str(info.path) else "community",
                "status": info.state.value,
                "enabled": name in addon_manager.enabled_addons,
                "permissions": info.manifest.permissions,
                "dependencies": info.manifest.dependencies,
                "metadata": info.manifest.metadata,
                "load_time": info.load_time,
                "error_message": info.error_message
            }
            
            addons_list.append(addon_data)
        
        return {
            "success": True,
            "count": len(addons_list),
            "addons": addons_list
        }
    
    except Exception as e:
        logger.error(f"Error listing addons: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{addon_name}")
async def get_addon_details(addon_name: str):
    """
    Récupère les détails complets d'un add-on
    
    Path Parameters:
        - addon_name: Nom de l'add-on
    
    Returns:
        Informations détaillées de l'add-on
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")
    
    info = addon_manager.get_addon_info(addon_name)
    if not info:
        raise HTTPException(status_code=404, detail=f"Addon '{addon_name}' not found")
    
    try:
        # Vérifier la compatibilité
        compatibility = await addon_manager.check_compatibility(addon_name)
        
        # Récupérer les dépendances
        dependencies = addon_manager.get_addon_dependencies(addon_name)
        
        return {
            "success": True,
            "addon": {
                "name": info.manifest.name,
                "version": info.manifest.version,
                "type": info.manifest.type.value,
                "author": info.manifest.author,
                "description": info.manifest.description,
                "category": "official" if "official" in str(info.path) else "community",
                "status": info.state.value,
                "enabled": addon_name in addon_manager.enabled_addons,
                "permissions": info.manifest.permissions,
                "dependencies": dependencies,
                "entry_points": info.manifest.entry_points,
                "compatibility": info.manifest.compatibility,
                "metadata": info.manifest.metadata,
                "load_time": info.load_time,
                "error_message": info.error_message,
                "compatibility_check": compatibility
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting addon details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{addon_name}/enable")
async def enable_addon(addon_name: str):
    """
    Active un add-on
    
    Path Parameters:
        - addon_name: Nom de l'add-on
    
    Returns:
        Statut de l'opération
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")
    
    try:
        success = await addon_manager.enable_addon(addon_name)
        
        if success:
            return {
                "success": True,
                "message": f"Addon '{addon_name}' enabled successfully"
            }
        else:
            raise HTTPException(status_code=400, detail=f"Failed to enable addon '{addon_name}'")
    
    except Exception as e:
        logger.error(f"Error enabling addon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{addon_name}/disable")
async def disable_addon(addon_name: str):
    """
    Désactive un add-on
    
    Path Parameters:
        - addon_name: Nom de l'add-on
    
    Returns:
        Statut de l'opération
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")
    
    try:
        success = await addon_manager.disable_addon(addon_name)
        
        if success:
            return {
                "success": True,
                "message": f"Addon '{addon_name}' disabled successfully"
            }
        else:
            raise HTTPException(status_code=400, detail=f"Failed to disable addon '{addon_name}'")
    
    except Exception as e:
        logger.error(f"Error disabling addon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/install")
async def install_addon(
    file: UploadFile = File(...),
    category: str = Query("community", description="Category (official, community)")
):
    """
    Installe un nouvel add-on depuis un fichier ZIP
    
    Form Data:
        - file: Fichier ZIP de l'add-on
        - category: Catégorie d'installation
    
    Returns:
        Statut de l'installation
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")
    
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    
    try:
        # Créer un fichier temporaire
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
            # Copier le contenu uploadé
            content = await file.read()
            temp_file.write(content)
            temp_path = Path(temp_file.name)
        
        # Installer l'add-on
        success = await addon_manager.install_addon(temp_path, category)
        
        # Nettoyer le fichier temporaire
        temp_path.unlink()
        
        if success:
            return {
                "success": True,
                "message": "Addon installed successfully"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to install addon")
    
    except Exception as e:
        logger.error(f"Error installing addon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{addon_name}")
async def uninstall_addon(addon_name: str):
    """
    Désinstalle un add-on
    
    Path Parameters:
        - addon_name: Nom de l'add-on
    
    Returns:
        Statut de la désinstallation
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")
    
    try:
        success = await addon_manager.uninstall_addon(addon_name)
        
        if success:
            return {
                "success": True,
                "message": f"Addon '{addon_name}' uninstalled successfully"
            }
        else:
            raise HTTPException(status_code=400, detail=f"Failed to uninstall addon '{addon_name}'")
    
    except Exception as e:
        logger.error(f"Error uninstalling addon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{addon_name}/validate")
async def validate_addon(addon_name: str, detailed: bool = Query(False)):
    """
    Valide un add-on
    
    Path Parameters:
        - addon_name: Nom de l'add-on
    
    Query Parameters:
        - detailed: Inclure les détails complets
    
    Returns:
        Résultat de validation
    """
    if not addon_manager or not addon_validator:
        raise HTTPException(status_code=500, detail="Addon manager/validator not initialized")
    
    info = addon_manager.get_addon_info(addon_name)
    if not info:
        raise HTTPException(status_code=404, detail=f"Addon '{addon_name}' not found")
    
    try:
        # Validation complète
        result = await addon_validator.validate_addon(info.manifest, info.path)
        
        # Validation de sécurité
        security_report = await addon_validator.validate_security(info.path)
        
        # Validation de qualité
        quality_report = await addon_validator.validate_code_quality(info.path)
        
        response = {
            "success": True,
            "validation": {
                "is_valid": result.is_valid,
                "score": result.score,
                "checksum": result.checksum,
                "issues_count": len(result.issues)
            },
            "security": {
                "safe": security_report["safe"],
                "risk_level": security_report["risk_level"]
            },
            "quality": {
                "score": quality_report["score"],
                "metrics": quality_report["metrics"]
            }
        }
        
        if detailed:
            response["validation"]["issues"] = [
                {
                    "severity": issue.severity.value,
                    "category": issue.category,
                    "message": issue.message,
                    "file_path": str(issue.file_path) if issue.file_path else None,
                    "line_number": issue.line_number,
                    "suggestion": issue.suggestion
                }
                for issue in result.issues
            ]
            response["security"]["details"] = security_report
            response["quality"]["issues"] = quality_report["issues"]
        
        return response
    
    except Exception as e:
        logger.error(f"Error validating addon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/categories/list")
async def get_categories():
    """
    Liste les catégories d'add-ons disponibles
    
    Returns:
        Liste des catégories avec statistiques
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")
    
    try:
        categories = {
            "official": {
                "name": "Official",
                "description": "Add-ons officiels StoryCore",
                "count": len(addon_manager.get_addons_by_category("official"))
            },
            "community": {
                "name": "Community",
                "description": "Add-ons communautaires",
                "count": len(addon_manager.get_addons_by_category("community"))
            }
        }
        
        return {
            "success": True,
            "categories": categories
        }
    
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types/list")
async def get_types():
    """
    Liste les types d'add-ons disponibles
    
    Returns:
        Liste des types avec descriptions
    """
    types = {
        "workflow_addon": {
            "name": "Workflow",
            "description": "Add-ons de workflow personnalisés",
            "icon": "⚡"
        },
        "ui_addon": {
            "name": "UI",
            "description": "Extensions d'interface utilisateur",
            "icon": "🖥️"
        },
        "processing_addon": {
            "name": "Processing",
            "description": "Traitement de données personnalisé",
            "icon": "🔧"
        },
        "model_addon": {
            "name": "Model",
            "description": "Modèles IA personnalisés",
            "icon": "🤖"
        },
        "export_addon": {
            "name": "Export",
            "description": "Formats d'export personnalisés",
            "icon": "📤"
        }
    }
    
    return {
        "success": True,
        "types": types
    }


@router.get("/updates/check")
async def check_updates():
    """
    Vérifie les mises à jour disponibles pour les add-ons
    
    Returns:
        Liste des add-ons avec mises à jour disponibles
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")
    
    try:
        updates = addon_manager.get_addon_updates()
        
        return {
            "success": True,
            "updates_available": len(updates),
            "updates": updates
        }
    
    except Exception as e:
        logger.error(f"Error checking updates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats():
    """
    Récupère les statistiques globales du système d'add-ons
    
    Returns:
        Statistiques détaillées
    """
    if not addon_manager or not permission_manager:
        raise HTTPException(status_code=500, detail="Managers not initialized")
    
    try:
        addon_stats = addon_manager.stats
        perm_stats = permission_manager.get_permission_stats()
        
        # Statistiques par type
        type_stats = {}
        for addon_type in AddonType:
            type_stats[addon_type.value] = len(addon_manager.get_addons_by_type(addon_type))
        
        # Statistiques par catégorie
        category_stats = {
            "official": len(addon_manager.get_addons_by_category("official")),
            "community": len(addon_manager.get_addons_by_category("community"))
        }
        
        return {
            "success": True,
            "stats": {
                "addons": addon_stats,
                "permissions": perm_stats,
                "by_type": type_stats,
                "by_category": category_stats
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_addons(
    q: str = Query(..., description="Search query"),
    addon_type: Optional[str] = Query(None, description="Filter by type"),
    category: Optional[str] = Query(None, description="Filter by category")
):
    """
    Recherche des add-ons
    
    Query Parameters:
        - q: Terme de recherche
        - addon_type: Filtrer par type
        - category: Filtrer par catégorie
    
    Returns:
        Liste des add-ons correspondants
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")
    
    try:
        filters = {}
        if addon_type:
            filters["type"] = addon_type
        if category:
            filters["category"] = category
        
        results = addon_manager.search_addons(q, filters)
        
        # Récupérer les détails des résultats
        addons_list = []
        for name in results:
            info = addon_manager.get_addon_info(name)
            if info:
                addons_list.append({
                    "name": info.manifest.name,
                    "version": info.manifest.version,
                    "type": info.manifest.type.value,
                    "author": info.manifest.author,
                    "description": info.manifest.description,
                    "category": "official" if "official" in str(info.path) else "community",
                    "status": info.state.value,
                    "enabled": name in addon_manager.enabled_addons
                })
        
        return {
            "success": True,
            "query": q,
            "count": len(addons_list),
            "results": addons_list
        }
    
    except Exception as e:
        logger.error(f"Error searching addons: {e}")
        raise HTTPException(status_code=500, detail=str(e))
