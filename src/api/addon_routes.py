"""
Addon API Routes for StoryCore-Engine
Routes FastAPI pour la gestion des add-ons via l'interface web.
"""

from fastapi import APIRouter, HTTPException, Query, File, UploadFile
from typing import List, Optional, Any
import logging
import os  # Added for os.unlink

from src.addon_manager import AddonManager, AddonType, AddonState
from src.addon_validator import AddonValidator
from src.addon_permissions import PermissionManager
from pydantic import BaseModel

# Configuration du logger
logger = logging.getLogger(__name__)

# Créer le router
router = APIRouter(prefix="/api/addons", tags=["addons"])

# Instances globales (à initialiser au démarrage de l'app)
addon_manager: Optional[AddonManager] = None
addon_validator: Optional[AddonValidator] = None
permission_manager: Optional[PermissionManager] = None
registry_client: Optional[Any] = None  # Will store AddonRegistryClient


def init_addon_api(
    manager: AddonManager,
    validator: AddonValidator,
    perm_manager: PermissionManager,
    registry: Any = None,
):
    """
    Initialise l'API des add-ons avec les gestionnaires

    Args:
        manager: Gestionnaire d'add-ons
        validator: Validateur d'add-ons
        perm_manager: Gestionnaire de permissions
        registry: Client du registry/marketplace (optionnel)
    """
    global addon_manager, addon_validator, permission_manager, registry_client
    addon_manager = manager
    addon_validator = validator
    permission_manager = perm_manager
    registry_client = registry


class BulkAddonOperation(BaseModel):
    """Modèle pour les opérations en masse sur les add-ons"""

    addon_names: List[str]


@router.get("")
async def list_addons(
    category: Optional[str] = Query(
        None, description="Filter by category (official, community)"
    ),
    addon_type: Optional[str] = Query(None, description="Filter by type"),
    status: Optional[str] = Query(
        None, description="Filter by status (enabled, disabled, error)"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("name", description="Sort field (name, version, status)"),
    sort_order: str = Query("asc", description="Sort order (asc, desc)"),
):
    """
    Liste tous les add-ons disponibles avec pagination et tri

    Query Parameters:
        - category: Filtrer par catégorie
        - addon_type: Filtrer par type
        - status: Filtrer par statut
        - page: Numéro de page (défaut: 1)
        - page_size: Éléments par page (défaut: 20, max: 100)
        - sort_by: Champ de tri (name, version, status)
        - order: Ordre de tri (asc, desc)

    Returns:
        Liste paginée des add-ons avec métadonnées
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
                if status == "disabled" and (
                    name in addon_manager.enabled_addons
                    or info.state == AddonState.ERROR
                ):
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
                "error_message": info.error_message,
            }

            addons_list.append(addon_data)

        # Apply sorting
        reverse = sort_order.lower() == "desc"
        if sort_by == "name":
            addons_list.sort(key=lambda x: x.get("name", ""), reverse=reverse)
        elif sort_by == "version":
            addons_list.sort(key=lambda x: x.get("version", ""), reverse=reverse)
        elif sort_by == "status":
            addons_list.sort(key=lambda x: x.get("status", ""), reverse=reverse)

        # Calculate pagination
        total_items = len(addons_list)
        total_pages = (total_items + page_size - 1) // page_size
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = addons_list[start_idx:end_idx]

        return {
            "success": True,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            },
            "sort": {"by": sort_by, "order": sort_order},
            "count": len(paginated_items),
            "addons": paginated_items,
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
                "compatibility_check": compatibility,
            },
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
                "message": f"Addon '{addon_name}' enabled successfully",
            }
        else:
            raise HTTPException(
                status_code=400, detail=f"Failed to enable addon '{addon_name}'"
            )

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
                "message": f"Addon '{addon_name}' disabled successfully",
            }
        else:
            raise HTTPException(
                status_code=400, detail=f"Failed to disable addon '{addon_name}'"
            )

    except Exception as e:
        logger.error(f"Error disabling addon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/install")
async def install_addon(
    addon_url: Optional[str] = Query(None),
    file: Optional[UploadFile] = File(None),
    category: str = Query("community"),
):
    """
    Installe un nouvel add-on depuis une URL ou un fichier ZIP

    Query Parameters:
        - addon_url: URL du dépôt ou du package (optionnel)
        - category: Catégorie de destination (default: community)

    Multipart Body:
        - file: Fichier ZIP de l'add-on (optionnel)

    Returns:
        Détails de l'add-on installé
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")

    try:
        addon_info = None

        if file:
            # Installation depuis un fichier téléchargé
            import tempfile
            from pathlib import Path

            # Créer un fichier temporaire pour stocker l'upload
            with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = Path(tmp.name)

            try:
                addon_info = await addon_manager.install_addon_from_file(
                    tmp_path, category
                )
            finally:
                if tmp_path.exists():
                    os.unlink(tmp_path)

        elif addon_url:
            # Installation depuis une URL
            addon_info = await addon_manager.install_addon(addon_url)
        else:
            raise HTTPException(
                status_code=400, detail="Must provide either addon_url or file"
            )

        if addon_info:
            return {
                "success": True,
                "addon": {
                    "name": addon_info.manifest.name,
                    "version": addon_info.manifest.version,
                    "status": addon_info.state.value,
                },
            }
        else:
            raise HTTPException(
                status_code=400, detail="Installation failed or invalid addon"
            )

    except Exception as e:
        logger.error(f"Error during addon installation: {e}")
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
                "message": f"Addon '{addon_name}' uninstalled successfully",
            }
        else:
            raise HTTPException(
                status_code=400, detail=f"Failed to uninstall addon '{addon_name}'"
            )

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
        raise HTTPException(
            status_code=500, detail="Addon manager/validator not initialized"
        )

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
                "issues_count": len(result.issues),
            },
            "security": {
                "safe": security_report["safe"],
                "risk_level": security_report["risk_level"],
            },
            "quality": {
                "score": quality_report["score"],
                "metrics": quality_report["metrics"],
            },
        }

        if detailed:
            response["validation"]["issues"] = [
                {
                    "severity": issue.severity.value,
                    "category": issue.category,
                    "message": issue.message,
                    "file_path": str(issue.file_path) if issue.file_path else None,
                    "line_number": issue.line_number,
                    "suggestion": issue.suggestion,
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
                "count": len(addon_manager.get_addons_by_category("official")),
            },
            "community": {
                "name": "Community",
                "description": "Add-ons communautaires",
                "count": len(addon_manager.get_addons_by_category("community")),
            },
        }

        return {"success": True, "categories": categories}

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
            "icon": "⚡",
        },
        "ui_addon": {
            "name": "UI",
            "description": "Extensions d'interface utilisateur",
            "icon": "🖥️",
        },
        "processing_addon": {
            "name": "Processing",
            "description": "Traitement de données personnalisé",
            "icon": "🔧",
        },
        "model_addon": {
            "name": "Model",
            "description": "Modèles IA personnalisés",
            "icon": "🤖",
        },
        "export_addon": {
            "name": "Export",
            "description": "Formats d'export personnalisés",
            "icon": "📤",
        },
    }

    return {"success": True, "types": types}


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

        return {"success": True, "updates_available": len(updates), "updates": updates}

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
            type_stats[addon_type.value] = len(
                addon_manager.get_addons_by_type(addon_type)
            )

        # Statistiques par catégorie
        category_stats = {
            "official": len(addon_manager.get_addons_by_category("official")),
            "community": len(addon_manager.get_addons_by_category("community")),
        }

        return {
            "success": True,
            "stats": {
                "addons": addon_stats,
                "permissions": perm_stats,
                "by_type": type_stats,
                "by_category": category_stats,
            },
        }

    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_addons(
    q: str = Query(..., description="Search query"),
    addon_type: Optional[str] = Query(None, description="Filter by type"),
    category: Optional[str] = Query(None, description="Filter by category"),
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
                addons_list.append(
                    {
                        "name": info.manifest.name,
                        "version": info.manifest.version,
                        "type": info.manifest.type.value,
                        "author": info.manifest.author,
                        "description": info.manifest.description,
                        "category": "official"
                        if "official" in str(info.path)
                        else "community",
                        "status": info.state.value,
                        "enabled": name in addon_manager.enabled_addons,
                    }
                )

        return {
            "success": True,
            "query": q,
            "count": len(addons_list),
            "results": addons_list,
        }

    except Exception as e:
        logger.error(f"Error searching addons: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# NEW ENDPOINTS - Phase 2 Enhancements
# ============================================


@router.post("/bulk/enable")
async def bulk_enable_addons(operation: BulkAddonOperation):
    """
    Active plusieurs add-ons en une seule requête

    Body:
        - addon_names: Liste des noms d'add-ons à activer

    Returns:
        Statut de l'opération pour chaque add-on
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")

    results = []
    for addon_name in operation.addon_names:
        try:
            success = await addon_manager.enable_addon(addon_name)
            results.append(
                {
                    "name": addon_name,
                    "success": success,
                    "message": f"Addon '{addon_name}' enabled"
                    if success
                    else f"Failed to enable '{addon_name}'",
                }
            )
        except Exception as e:
            results.append({"name": addon_name, "success": False, "message": str(e)})

    success_count = sum(1 for r in results if r["success"])
    return {
        "success": True,
        "total": len(operation.addon_names),
        "enabled": success_count,
        "failed": len(operation.addon_names) - success_count,
        "results": results,
    }


@router.post("/bulk/disable")
async def bulk_disable_addons(operation: BulkAddonOperation):
    """
    Désactive plusieurs add-ons en une seule requête

    Body:
        - addon_names: Liste des noms d'add-ons à désactiver

    Returns:
        Statut de l'opération pour chaque add-on
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")

    results = []
    for addon_name in operation.addon_names:
        try:
            success = await addon_manager.disable_addon(addon_name)
            results.append(
                {
                    "name": addon_name,
                    "success": success,
                    "message": f"Addon '{addon_name}' disabled"
                    if success
                    else f"Failed to disable '{addon_name}'",
                }
            )
        except Exception as e:
            results.append({"name": addon_name, "success": False, "message": str(e)})

    success_count = sum(1 for r in results if r["success"])
    return {
        "success": True,
        "total": len(operation.addon_names),
        "disabled": success_count,
        "failed": len(operation.addon_names) - success_count,
        "results": results,
    }


@router.post("/{addon_name}/reload")
async def reload_addon(addon_name: str):
    """
    Recharge un add-on sans redémarrage du serveur

    Path Parameters:
        - addon_name: Nom de l'add-on à recharger

    Returns:
        Statut de l'opération
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")

    try:
        # Utiliser la méthode reload_addon de AddonManager qui gère le rechargement du module
        success = await addon_manager.reload_addon(addon_name)

        if success:
            return {
                "success": True,
                "message": f"Addon '{addon_name}' reloaded successfully",
            }
        else:
            raise HTTPException(
                status_code=400, detail=f"Failed to reload addon '{addon_name}'"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reloading addon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{addon_name}/dependencies")
async def get_addon_dependencies(addon_name: str, recursive: bool = Query(False)):
    """
    Récupère les dépendances d'un add-on

    Path Parameters:
        - addon_name: Nom de l'add-on

    Query Parameters:
        - recursive: Inclure les dépendances transitives

    Returns:
        Liste des dépendances
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")

    info = addon_manager.get_addon_info(addon_name)
    if not info:
        raise HTTPException(status_code=404, detail=f"Addon '{addon_name}' not found")

    try:
        dependencies = addon_manager.get_addon_dependencies(
            addon_name, recursive=recursive
        )

        # Enrich with details
        dep_details = []
        for dep_name in dependencies:
            dep_info = addon_manager.get_addon_info(dep_name)
            if dep_info:
                dep_details.append(
                    {
                        "name": dep_name,
                        "version": dep_info.manifest.version,
                        "enabled": dep_name in addon_manager.enabled_addons,
                        "status": dep_info.state.value,
                    }
                )

        return {
            "success": True,
            "addon": addon_name,
            "dependencies": dep_details,
            "count": len(dep_details),
        }

    except Exception as e:
        logger.error(f"Error getting dependencies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/marketplace/browse")
async def browse_marketplace(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=50, description="Items per page"),
):
    """
    Parcourt le marketplace des add-ons (Real registry client)

    Query Parameters:
        - category: Catégorie à filtrer
        - search: Terme de recherche
        - page: Numéro de page
        - page_size: Éléments par page

    Returns:
        Liste des add-ons disponibles sur le marketplace
    """
    if not registry_client:
        # Fallback to mock data if registry client not available
        logger.warning("Registry client not initialized, using mock marketplace data")
        return await _get_mock_marketplace_data(category, search, page, page_size)

    try:
        filters = {}
        if category:
            filters["category"] = category

        # Call the real registry
        query = search or ""
        addons = await registry_client.search(query, filters, limit=page_size)

        # Format results for the frontend
        formatted_addons = [
            {
                "id": f"remote-{a.name.lower().replace(' ', '-')}",
                "name": a.name,
                "version": a.version,
                "description": a.description,
                "author": a.author,
                "download_url": a.source_url,
                "downloads": a.download_count,
                "rating": a.rating,
                "tags": a.tags,
                "is_remote": True,
            }
            for a in addons
        ]

        return {
            "success": True,
            "count": len(formatted_addons),
            "addons": formatted_addons,
            "pagination": {
                "page": page,
                "total_items": len(formatted_addons),  # Simplified for now
                "total_pages": 1,
            },
        }
    except Exception as e:
        logger.error(f"Error browsing marketplace: {e}")
        return await _get_mock_marketplace_data(category, search, page, page_size)


async def _get_mock_marketplace_data(category, search, page, page_size):
    """Fallback if remote registry is down"""
    # ... (Rest of original mock implementation)
    marketplace_addons = [
        {
            "id": "premium-video-filters",
            "name": "Premium Video Filters",
            "description": "Collection de filtres vidéo professionnels (Mock Local)",
            "author": "StoryCore Team",
            "version": "1.2.0",
            "category": "processing",
            "rating": 4.8,
            "downloads": 15000,
            "price": "Free",
        }
    ]
    # Simplified mock return
    return {"success": True, "addons": marketplace_addons, "is_mock": True}


@router.get("/versions/check")
async def check_version_compatibility():
    """
    Vérifie la compatibilité des versions d'add-ons

    Returns:
        Statut de compatibilité pour chaque add-on
    """
    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")

    try:
        results = []
        for name, info in addon_manager.addons.items():
            compatibility = await addon_manager.check_compatibility(name)
            results.append(
                {
                    "name": name,
                    "version": info.manifest.version,
                    "compatible": compatibility.get("compatible", False),
                    "issues": compatibility.get("issues", []),
                }
            )

        compatible_count = sum(1 for r in results if r["compatible"])

        return {
            "success": True,
            "total": len(results),
            "compatible": compatible_count,
            "incompatible": len(results) - compatible_count,
            "addons": results,
        }

    except Exception as e:
        logger.error(f"Error checking versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
