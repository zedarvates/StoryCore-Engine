"""
Routes API pour les addons externes
Gestion du chargement et de l'installation d'addons depuis des sources distantes
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel

from backend.auth import verify_jwt_token

from src.addon_api import (
    AddonRegistryClient,
    DependencyManager,
    ExternalAddonLoader,
    InstallationResult,
)
from src.addon_manager import AddonManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/addons/external", tags=["external-addons"])

# Instances globales (à initialiser au démarrage)
external_loader: Optional[ExternalAddonLoader] = None
registry_client: Optional[AddonRegistryClient] = None
dependency_manager: Optional[DependencyManager] = None
addon_manager: Optional[AddonManager] = None


def init_external_addon_api(
    manager: AddonManager,
    loader: ExternalAddonLoader,
    registry: AddonRegistryClient,
    deps_manager: DependencyManager,
):
    """Initialise les API externes"""
    global external_loader, registry_client, dependency_manager, addon_manager
    addon_manager = manager
    external_loader = loader
    registry_client = registry
    dependency_manager = deps_manager
    logger.info("External Addon API initialisée")


# === Modèles de requête ===


class InstallFromUrlRequest(BaseModel):
    """Requête d'installation depuis une URL"""

    url: str
    category: str = "community"
    verify_checksum: bool = True


class InstallFromGithubRequest(BaseModel):
    """Requête d'installation depuis GitHub"""

    repo: str
    branch: str = "main"
    category: str = "community"


class InstallFromPypiRequest(BaseModel):
    """Requête d'installation depuis PyPI"""

    package_name: str
    category: str = "community"


class InstallDependenciesRequest(BaseModel):
    """Requête d'installation de dépendances"""

    dependencies: dict


# === Routes ===


@router.post("/install/url", response_model=dict)
async def install_from_url(
    request: InstallFromUrlRequest, user_payload: dict = Depends(verify_jwt_token)
):
    user_id = (
        user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    )
    logger.info(f"User {user_id} requesting addon installation from URL: {request.url}")
    """
    Installe un addon depuis une URL distante.
    
    L'URL doit pointer vers un fichier ZIP contenant l'addon.
    """
    if not external_loader:
        raise HTTPException(
            status_code=500, detail="External addon loader not initialized"
        )

    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")

    try:
        result: InstallationResult = await external_loader.load_from_url(
            request.url, request.category, request.verify_checksum
        )

        if result.success:
            # Charger l'addon dans le manager
            addon_info = await addon_manager.load_addon(
                addon_manager.addons_path / request.category / result.addon_name
            )
            if addon_info:
                addon_manager.addons[result.addon_name] = addon_info
                result.addon_info = addon_info

            return {
                "success": True,
                "addon_name": result.addon_name,
                "message": result.message,
                "warnings": result.warnings,
            }
        else:
            return {
                "success": False,
                "addon_name": result.addon_name,
                "message": result.message,
                "errors": result.errors,
            }

    except Exception as e:
        logger.error(f"Erreur lors de l'installation depuis URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/install/github", response_model=dict)
async def install_from_github(
    request: InstallFromGithubRequest, user_payload: dict = Depends(verify_jwt_token)
):
    user_id = (
        user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    )
    logger.info(
        f"User {user_id} requesting addon installation from GitHub: {request.repo}"
    )
    """
    Installe un addon depuis un dépôt GitHub.
    
    Le format du repo doit être: owner/repository
    Exemple: username/my-addon
    """
    if not external_loader:
        raise HTTPException(
            status_code=500, detail="External addon loader not initialized"
        )

    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")

    try:
        result: InstallationResult = await external_loader.load_from_github(
            request.repo, request.category, request.branch
        )

        if result.success:
            # Charger l'addon dans le manager
            addon_info = await addon_manager.load_addon(
                addon_manager.addons_path / request.category / result.addon_name
            )
            if addon_info:
                addon_manager.addons[result.addon_name] = addon_info
                result.addon_info = addon_info

            return {
                "success": True,
                "addon_name": result.addon_name,
                "message": result.message,
                "warnings": result.warnings,
            }
        else:
            return {
                "success": False,
                "addon_name": result.addon_name,
                "message": result.message,
                "errors": result.errors,
            }

    except Exception as e:
        logger.error(f"Erreur lors de l'installation depuis GitHub: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/install/pypi", response_model=dict)
async def install_from_pypi(
    request: InstallFromPypiRequest, user_payload: dict = Depends(verify_jwt_token)
):
    user_id = (
        user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    )
    logger.info(
        f"User {user_id} requesting addon installation from PyPI: {request.package_name}"
    )
    """
    Installe un addon depuis PyPI.
    
    Le package doit être un package Python valide avec un fichier addon.json.
    """
    if not external_loader:
        raise HTTPException(
            status_code=500, detail="External addon loader not initialized"
        )

    if not addon_manager:
        raise HTTPException(status_code=500, detail="Addon manager not initialized")

    try:
        result: InstallationResult = await external_loader.load_from_pypi(
            request.package_name, request.category
        )

        if result.success:
            # Charger l'addon dans le manager
            addon_info = await addon_manager.load_addon(
                addon_manager.addons_path / request.category / result.addon_name
            )
            if addon_info:
                addon_manager.addons[result.addon_name] = addon_info
                result.addon_info = addon_info

            return {
                "success": True,
                "addon_name": result.addon_name,
                "message": result.message,
                "warnings": result.warnings,
            }
        else:
            return {
                "success": False,
                "addon_name": result.addon_name,
                "message": result.message,
                "errors": result.errors,
            }

    except Exception as e:
        logger.error(f"Erreur lors de l'installation depuis PyPI: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/registry/search", response_model=list)
async def search_registry(
    q: str = Query(..., description="Terme de recherche"),
    category: Optional[str] = Query(None, description="Filtrer par catégorie"),
    limit: int = Query(20, description="Nombre maximum de résultats"),
    user_payload: dict = Depends(verify_jwt_token),
):
    user_id = (
        user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    )
    logger.info(f"User {user_id} searching registry for: {q}")
    """
    Recherche des addons dans le registry distant.
    """
    if not registry_client:
        raise HTTPException(status_code=500, detail="Registry client not initialized")

    try:
        filters = {}
        if category:
            filters["category"] = category

        results = await registry_client.search(q, filters, limit)

        return [
            {
                "name": r.name,
                "version": r.version,
                "author": r.author,
                "description": r.description,
                "source_url": r.source_url,
                "download_count": r.download_count,
                "rating": r.rating,
                "tags": r.tags,
                "engine_version": r.engine_version,
            }
            for r in results
        ]

    except Exception as e:
        logger.error(f"Erreur lors de la recherche dans le registry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/registry/featured", response_model=list)
async def get_featured_addons(
    category: Optional[str] = Query(None, description="Filtrer par catégorie"),
    user_payload: dict = Depends(verify_jwt_token),
):
    user_id = (
        user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    )
    logger.info(f"User {user_id} fetching featured addons")
    """
    Obtient les addons en vedette depuis le registry.
    """
    if not registry_client:
        raise HTTPException(status_code=500, detail="Registry client not initialized")

    try:
        results = await registry_client.get_featured(category)

        return [
            {
                "name": r.name,
                "version": r.version,
                "author": r.author,
                "description": r.description,
                "source_url": r.source_url,
                "download_count": r.download_count,
                "rating": r.rating,
                "tags": r.tags,
            }
            for r in results
        ]

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des addons vedettes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/registry/categories", response_model=list)
async def get_registry_categories(user_payload: dict = Depends(verify_jwt_token)):
    user_id = (
        user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    )
    logger.info(f"User {user_id} fetching registry categories")
    """Obtient les catégories disponibles dans le registry"""
    if not registry_client:
        raise HTTPException(status_code=500, detail="Registry client not initialized")

    try:
        return await registry_client.get_categories()
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des catégories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dependencies/install")
async def install_dependencies(
    request: InstallDependenciesRequest, user_payload: dict = Depends(verify_jwt_token)
):
    user_id = (
        user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    )
    logger.info(f"User {user_id} installing dependencies")
    """
    Installe les dépendances Python d'un addon.
    """
    if not dependency_manager:
        raise HTTPException(
            status_code=500, detail="Dependency manager not initialized"
        )

    try:
        result = await dependency_manager.install_dependencies(request.dependencies)
        return result
    except Exception as e:
        logger.error(f"Erreur lors de l'installation des dépendances: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dependencies/check")
async def check_dependencies(
    dependencies: dict, user_payload: dict = Depends(verify_jwt_token)
):
    user_id = (
        user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    )
    logger.info(f"User {user_id} checking dependencies")
    """
    Vérifie si les dépendances sont satisfaites.
    """
    if not dependency_manager:
        raise HTTPException(
            status_code=500, detail="Dependency manager not initialized"
        )

    try:
        result = await dependency_manager.check_dependencies(dependencies)
        return result
    except Exception as e:
        logger.error(f"Erreur lors de la vérification des dépendances: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources")
async def get_available_sources():
    """Retourne les sources d'addons disponibles"""
    return {
        "sources": [
            {
                "id": "url",
                "name": "URL distante",
                "description": "Télécharger depuis une URL directe vers un fichier ZIP",
                "requires_url": True,
            },
            {
                "id": "github",
                "name": "GitHub",
                "description": "Installer depuis un dépôt GitHub",
                "requires_url": False,
                "format_example": "owner/repository",
            },
            {
                "id": "pypi",
                "name": "PyPI",
                "description": "Installer un package depuis Python Package Index",
                "requires_url": False,
                "format_example": "package-name",
            },
            {
                "id": "registry",
                "name": "Registry StoryCore",
                "description": "Découvrir et installer depuis le registry officiel",
                "requires_url": False,
            },
        ]
    }
