"""
Addon Manager for StoryCore-Engine
Gestionnaire principal des extensions (add-ons) du système StoryCore.
"""

import json
import os
import sys
import importlib
import importlib.util
import logging
import zipfile
import shutil
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any, Set, Union
from dataclasses import dataclass
from enum import Enum

from src.error_handling_resilience import ErrorHandlingSystem
from src.security_validation_system import SecurityValidationSystem


class AddonType(Enum):
    """Types d'add-ons supportés"""
    WORKFLOW = "workflow_addon"
    UI = "ui_addon"
    PROCESSING = "processing_addon"
    MODEL = "model_addon"
    EXPORT = "export_addon"
    VIDEO_GENERATION = "video_generation"
    INTEGRATION = "integration"
    EXTERNAL = "external_addon"  # Add-ons chargés depuis des sources externes


class AddonState(Enum):
    """États possibles d'un add-on"""
    DISABLED = "disabled"
    ENABLED = "enabled"
    ERROR = "error"
    LOADING = "loading"


@dataclass
class AddonManifest:
    """Structure du manifest d'un add-on"""
    name: str
    version: str
    type: AddonType
    author: str
    description: str
    compatibility: Dict[str, str]
    permissions: List[str]
    entry_points: Dict[str, str]
    dependencies: Dict[str, str]
    metadata: Dict[str, Any]


@dataclass
class AddonInfo:
    """Informations complètes sur un add-on chargé"""
    manifest: AddonManifest
    path: Path
    state: AddonState
    module: Optional[Any] = None
    error_message: Optional[str] = None
    load_time: Optional[float] = None


class AddonManager:
    """
    Gestionnaire principal des add-ons StoryCore

    Responsabilités:
    - Découverte des add-ons
    - Chargement et validation
    - Gestion du cycle de vie
    - Interface avec le système de sécurité
    """

    def __init__(self, engine_path: Path = None):
        """
        Initialise le gestionnaire d'add-ons

        Args:
            engine_path: Chemin vers le répertoire racine de StoryCore
        """
        self.engine_path = engine_path or Path(__file__).parent.parent
        self.addons_path = self.engine_path / "addons"
        self.logger = logging.getLogger(__name__)

        # Systèmes intégrés
        self.error_handler = ErrorHandlingSystem()
        self.security_validator = SecurityValidationSystem()

        # Registre des add-ons
        self.addons: Dict[str, AddonInfo] = {}
        self.enabled_addons: Set[str] = set()

        # Statistiques
        self.stats = {
            "discovered": 0,
            "loaded": 0,
            "enabled": 0,
            "errors": 0
        }

    async def discover_addons(self) -> List[Path]:
        """
        Découvre tous les add-ons disponibles

        Returns:
            Liste des chemins vers les dossiers d'add-ons
        """
        addon_paths = []

        # Parcourir les sous-dossiers d'addons
        for subdir in ["official", "community"]:
            addon_dir = self.addons_path / subdir
            if addon_dir.exists():
                for item in addon_dir.iterdir():
                    if item.is_dir() and (item / "addon.json").exists():
                        addon_paths.append(item)

        self.stats["discovered"] = len(addon_paths)
        self.logger.info(f"Découverts {len(addon_paths)} add-ons")

        return addon_paths

    async def load_addon_manifest(self, addon_path: Path) -> Optional[AddonManifest]:
        """
        Charge le manifest d'un add-on

        Args:
            addon_path: Chemin vers l'add-on

        Returns:
            Manifest chargé ou None si erreur
        """
        manifest_file = addon_path / "addon.json"

        try:
            with open(manifest_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Validation basique du manifest
            required_fields = ["name", "version", "type", "author", "description"]
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Champ requis manquant: {field}")

            # Conversion du type
            try:
                addon_type = AddonType(data["type"])
            except ValueError:
                raise ValueError(f"Type d'add-on invalide: {data['type']}")

            manifest = AddonManifest(
                name=data["name"],
                version=data["version"],
                type=addon_type,
                author=data["author"],
                description=data.get("description", ""),
                compatibility=data.get("compatibility", {}),
                permissions=data.get("permissions", []),
                entry_points=data.get("entry_points", {}),
                dependencies=data.get("dependencies", {}),
                metadata=data.get("metadata", {})
            )

            return manifest

        except Exception as e:
            self.logger.error(f"Erreur lors du chargement du manifest {manifest_file}: {e}")
            return None

    async def validate_addon(self, manifest: AddonManifest, addon_path: Path) -> bool:
        """
        Valide un add-on selon les critères de sécurité et compatibilité

        Args:
            manifest: Manifest de l'add-on
            addon_path: Chemin vers l'add-on

        Returns:
            True si valide, False sinon
        """
        try:
            # Vérification de compatibilité de version
            engine_version = "2.0.0"  # À récupérer depuis la config
            if "engine_version" in manifest.compatibility:
                required_version = manifest.compatibility["engine_version"]
                if not self._check_version_compatibility(engine_version, required_version):
                    self.logger.warning(f"Version incompatible pour {manifest.name}")
                    return False

            # Validation des permissions
            for permission in manifest.permissions:
                if not self._validate_permission(permission):
                    self.logger.warning(f"Permission invalide pour {manifest.name}: {permission}")
                    return False

            # Validation des entry points
            for entry_name, entry_path in manifest.entry_points.items():
                entry_file = addon_path / entry_path
                if not entry_file.exists():
                    self.logger.warning(f"Entry point manquant pour {manifest.name}: {entry_path}")
                    return False

            # Validation des dépendances (basique)
            for dep, version_req in manifest.dependencies.items():
                if not self._check_dependency(dep, version_req):
                    self.logger.warning(f"Dépendance non satisfaite pour {manifest.name}: {dep}{version_req}")
                    return False

            return True

        except Exception as e:
            self.logger.error(f"Erreur lors de la validation de {manifest.name}: {e}")
            return False

    async def load_addon(self, addon_path: Path) -> Optional[AddonInfo]:
        """
        Charge un add-on complet

        Args:
            addon_path: Chemin vers l'add-on

        Returns:
            Informations sur l'add-on chargé ou None si erreur
        """
        import time
        start_time = time.time()

        try:
            # Charger le manifest
            manifest = await self.load_addon_manifest(addon_path)
            if not manifest:
                return None

            addon_info = AddonInfo(
                manifest=manifest,
                path=addon_path,
                state=AddonState.LOADING
            )

            # Valider l'add-on
            if not await self.validate_addon(manifest, addon_path):
                addon_info.state = AddonState.ERROR
                addon_info.error_message = "Validation échouée"
                return addon_info

            # Charger le module principal si entry point défini
            if "main" in manifest.entry_points:
                main_path = addon_path / manifest.entry_points["main"]
                module = await self._load_addon_module(main_path, manifest.name)
                if module:
                    addon_info.module = module

            addon_info.state = AddonState.DISABLED
            addon_info.load_time = time.time() - start_time

            self.stats["loaded"] += 1
            return addon_info

        except Exception as e:
            self.logger.error(f"Erreur lors du chargement de l'add-on {addon_path}: {e}")
            return AddonInfo(
                manifest=AddonManifest(
                    name=addon_path.name,
                    version="unknown",
                    type=AddonType.WORKFLOW,
                    author="unknown",
                    description="",
                    compatibility={},
                    permissions=[],
                    entry_points={},
                    dependencies={},
                    metadata={}
                ),
                path=addon_path,
                state=AddonState.ERROR,
                error_message=str(e),
                load_time=time.time() - start_time
            )

    async def enable_addon(self, addon_name: str) -> bool:
        """
        Active un add-on

        Args:
            addon_name: Nom de l'add-on

        Returns:
            True si activé avec succès
        """
        if addon_name not in self.addons:
            self.logger.error(f"Add-on inconnu: {addon_name}")
            return False

        addon_info = self.addons[addon_name]

        if addon_info.state != AddonState.DISABLED:
            self.logger.warning(f"Impossible d'activer {addon_name} (état: {addon_info.state})")
            return False

        try:
            # Appeler l'initialisation si disponible
            if addon_info.module and hasattr(addon_info.module, 'initialize'):
                await addon_info.module.initialize(self._get_addon_context(addon_name))

            addon_info.state = AddonState.ENABLED
            self.enabled_addons.add(addon_name)
            self.stats["enabled"] += 1

            self.logger.info(f"Add-on activé: {addon_name}")
            return True

        except Exception as e:
            self.logger.error(f"Erreur lors de l'activation de {addon_name}: {e}")
            addon_info.state = AddonState.ERROR
            addon_info.error_message = str(e)
            return False

    async def disable_addon(self, addon_name: str) -> bool:
        """
        Désactive un add-on

        Args:
            addon_name: Nom de l'add-on

        Returns:
            True si désactivé avec succès
        """
        if addon_name not in self.addons:
            self.logger.error(f"Add-on inconnu: {addon_name}")
            return False

        addon_info = self.addons[addon_name]

        if addon_info.state != AddonState.ENABLED:
            self.logger.warning(f"Add-on {addon_name} n'est pas activé")
            return False

        try:
            # Appeler la cleanup si disponible
            if addon_info.module and hasattr(addon_info.module, 'cleanup'):
                await addon_info.module.cleanup()

            addon_info.state = AddonState.DISABLED
            self.enabled_addons.discard(addon_name)
            self.stats["enabled"] -= 1

            self.logger.info(f"Add-on désactivé: {addon_name}")
            return True

        except Exception as e:
            self.logger.error(f"Erreur lors de la désactivation de {addon_name}: {e}")
            return False

    async def initialize_all_addons(self):
        """Initialise tous les add-ons disponibles"""
        self.logger.info("Initialisation du système d'add-ons...")

        # Découvrir les add-ons
        addon_paths = await self.discover_addons()

        # Charger chaque add-on
        for addon_path in addon_paths:
            addon_info = await self.load_addon(addon_path)
            if addon_info:
                self.addons[addon_info.manifest.name] = addon_info

        self.logger.info(f"Système d'add-ons initialisé: {self.stats}")

    def get_enabled_addons(self) -> List[str]:
        """Retourne la liste des add-ons activés"""
        return list(self.enabled_addons)

    def get_addon_info(self, addon_name: str) -> Optional[AddonInfo]:
        """Retourne les informations sur un add-on"""
        return self.addons.get(addon_name)

    def get_addons_by_type(self, addon_type: AddonType) -> List[str]:
        """Retourne les add-ons d'un type spécifique"""
        return [name for name, info in self.addons.items()
                if info.manifest.type == addon_type]

    async def install_addon(self, source: Path, category: str = "community") -> bool:
        """
        Installe un add-on depuis un fichier source
        
        Args:
            source: Chemin vers le fichier .zip de l'add-on
            category: Catégorie (official, community)
            
        Returns:
            True si installation réussie
        """
        import shutil
        
        try:
            # Vérifier que le fichier existe
            if not source.exists():
                self.logger.error(f"Fichier source introuvable: {source}")
                return False
                
            # Créer un répertoire temporaire pour l'extraction
            temp_dir = self.addons_path / "temp" / source.stem
            temp_dir.mkdir(parents=True, exist_ok=True)
            
            # Extraire l'archive de manière sécurisée
            with zipfile.ZipFile(source, 'r') as zip_ref:
                if not self._safe_extract_zip(zip_ref, temp_dir):
                    shutil.rmtree(temp_dir)
                    self.logger.error("Extraction sécurisée échouée: path traversal détecté")
                    return False
            
            # Charger et valider le manifest
            manifest = await self.load_addon_manifest(temp_dir)
            if not manifest:
                shutil.rmtree(temp_dir)
                return False
            
            # Vérifier si l'add-on existe déjà
            target_path = self.addons_path / category / manifest.name
            if target_path.exists():
                self.logger.error(f"Add-on {manifest.name} déjà installé")
                shutil.rmtree(temp_dir)
                return False
            
            # Valider l'add-on
            if not await self.validate_addon(manifest, temp_dir):
                self.logger.error(f"Validation échouée pour {manifest.name}")
                shutil.rmtree(temp_dir)
                return False
            
            # Déplacer vers le répertoire final
            target_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(temp_dir), str(target_path))
            
            # Charger l'add-on
            addon_info = await self.load_addon(target_path)
            if addon_info:
                self.addons[manifest.name] = addon_info
                self.logger.info(f"Add-on {manifest.name} installé avec succès")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'installation: {e}")
            return False
    
    async def install_addon_from_file(self, file_path: Path, category: str = "community") -> Optional[AddonInfo]:
        """
        Installe un add-on depuis un fichier ZIP
        
        Args:
            file_path: Chemin vers le fichier ZIP
            category: Catégorie de destination
            
        Returns:
            Info de l'add-on installé ou None
        """
        try:
            # 1. Créer un répertoire temporaire pour l'extraction
            temp_dir = self.addons_dir / "temp_install"
            temp_dir.mkdir(exist_ok=True)
            
            # 2. Extraire le ZIP de manière sécurisée
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                if not self._safe_extract_zip(zip_ref, temp_dir):
                    shutil.rmtree(temp_dir)
                    self.logger.error("Extraction sécurisée échouée: path traversal détecté")
                    return None
            
            # 3. Trouver le manifest (addon.json)
            # Il peut être à la racine ou dans un sous-répertoire
            manifest_path = None
            for p in temp_dir.rglob("addon.json"):
                manifest_path = p
                break
                
            if not manifest_path:
                shutil.rmtree(temp_dir)
                self.logger.error("Aucun fichier addon.json trouvé dans le ZIP")
                return None
                
            # 4. Charger le manifest pour obtenir le nom
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest_data = json.load(f)
                addon_name = manifest_data.get("name")
                
            if not addon_name:
                shutil.rmtree(temp_dir)
                self.logger.error("Manifest invalide: nom manquant")
                return None
            
            # 5. Déplacer vers le répertoire final
            dest_dir = self.addons_dir / category / addon_name
            if dest_dir.exists():
                shutil.rmtree(dest_dir)
            
            dest_dir.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(manifest_path.parent), str(dest_dir))
            
            # 6. Nettoyage
            shutil.rmtree(temp_dir)
            
            # 7. Re-découvrir et charger
            new_info = await self.load_addon(dest_dir)
            if new_info:
                self.addons[addon_name] = new_info
                return new_info
                
            return None
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'installation depuis le fichier: {e}")
            return None

    async def uninstall_addon(self, addon_name: str) -> bool:
        """
        Désinstalle un add-on
        
        Args:
            addon_name: Nom de l'add-on
            
        Returns:
            True si désinstallation réussie
        """
        import shutil
        
        if addon_name not in self.addons:
            self.logger.error(f"Add-on inconnu: {addon_name}")
            return False
        
        addon_info = self.addons[addon_name]
        
        try:
            # Désactiver l'add-on s'il est activé
            if addon_info.state == AddonState.ENABLED:
                await self.disable_addon(addon_name)
            
            # Supprimer le répertoire
            if addon_info.path.exists():
                shutil.rmtree(addon_info.path)
            
            # Retirer du registre
            del self.addons[addon_name]
            
            self.logger.info(f"Add-on {addon_name} désinstallé")
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la désinstallation de {addon_name}: {e}")
            return False
    
    async def update_addon(self, addon_name: str, source: Path) -> bool:
        """
        Met à jour un add-on existant
        
        Args:
            addon_name: Nom de l'add-on
            source: Chemin vers la nouvelle version
            
        Returns:
            True si mise à jour réussie
        """
        if addon_name not in self.addons:
            self.logger.error(f"Add-on inconnu: {addon_name}")
            return False
        
        addon_info = self.addons[addon_name]
        category = "official" if "official" in str(addon_info.path) else "community"
        
        try:
            # Désinstaller l'ancienne version
            if not await self.uninstall_addon(addon_name):
                return False
            
            # Installer la nouvelle version
            return await self.install_addon(source, category)
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la mise à jour de {addon_name}: {e}")
            return False
    
    async def reload_addon(self, addon_name: str) -> bool:
        """
        Recharge un add-on (manifest + code) sans redémarrage
        
        Args:
            addon_name: Nom de l'add-on
            
        Returns:
            True si recharge réussi
        """
        if addon_name not in self.addons:
            self.logger.error(f"Add-on inconnu pour recharge: {addon_name}")
            return False
            
        addon_info = self.addons[addon_name]
        addon_path = addon_info.path
        was_enabled = addon_info.state == AddonState.ENABLED
        
        try:
            # 1. Désactiver si nécessaire
            if was_enabled:
                await self.disable_addon(addon_name)
            
            # 2. Re-charger depuis le disque
            self.logger.info(f"Rechargement de l'add-on: {addon_name} depuis {addon_path}")
            new_info = await self.load_addon(addon_path)
            
            if new_info:
                self.addons[addon_name] = new_info
                
                # 3. Ré-activer si c'était le cas
                if was_enabled:
                    await self.enable_addon(addon_name)
                    
                self.logger.info(f"Add-on {addon_name} rechargé avec succès")
                return True
            else:
                self.logger.error(f"Échec du chargement de la nouvelle version de {addon_name}")
                return False
                
        except Exception as e:
            self.logger.error(f"Erreur lors du rechargement de {addon_name}: {e}")
            return False
    
    async def check_compatibility(self, addon_name: str) -> Dict[str, Any]:
        """
        Vérifie la compatibilité d'un add-on
        
        Args:
            addon_name: Nom de l'add-on
            
        Returns:
            Rapport de compatibilité
        """
        if addon_name not in self.addons:
            return {"compatible": False, "reason": "Add-on inconnu"}
        
        addon_info = self.addons[addon_name]
        manifest = addon_info.manifest
        
        result = {
            "compatible": True,
            "engine_version_ok": True,
            "python_version_ok": True,
            "dependencies_ok": True,
            "conflicts": []
        }
        
        # Vérifier la version du moteur
        engine_version = "2.0.0"
        if "engine_version" in manifest.compatibility:
            required = manifest.compatibility["engine_version"]
            if not self._check_version_compatibility(engine_version, required):
                result["engine_version_ok"] = False
                result["compatible"] = False
                result["conflicts"].append(f"Version moteur incompatible: {required}")
        
        # Vérifier les dépendances
        for dep, version_req in manifest.dependencies.items():
            if dep not in self.addons:
                result["dependencies_ok"] = False
                result["compatible"] = False
                result["conflicts"].append(f"Dépendance manquante: {dep}")
        
        return result
    
    def search_addons(self, query: str, filters: Optional[Dict] = None) -> List[str]:
        """
        Recherche des add-ons par nom ou description
        
        Args:
            query: Terme de recherche
            filters: Filtres optionnels (type, category, status)
            
        Returns:
            Liste des noms d'add-ons correspondants
        """
        results = []
        query_lower = query.lower()
        
        for name, info in self.addons.items():
            # Recherche dans le nom et la description
            if (query_lower in name.lower() or 
                query_lower in info.manifest.description.lower()):
                
                # Appliquer les filtres
                if filters:
                    if "type" in filters and info.manifest.type.value != filters["type"]:
                        continue
                    if "status" in filters:
                        if filters["status"] == "enabled" and name not in self.enabled_addons:
                            continue
                        if filters["status"] == "disabled" and name in self.enabled_addons:
                            continue
                
                results.append(name)
        
        return results
    
    def get_addons_by_category(self, category: str) -> List[str]:
        """
        Retourne les add-ons d'une catégorie
        
        Args:
            category: Catégorie (official, community)
            
        Returns:
            Liste des noms d'add-ons
        """
        results = []
        for name, info in self.addons.items():
            if category in str(info.path):
                results.append(name)
        return results
    
    def get_addon_updates(self) -> List[Dict[str, Any]]:
        """
        Vérifie les mises à jour disponibles
        
        Returns:
            Liste des add-ons avec mises à jour disponibles
        """
        # Pour l'instant, retourne une liste vide
        # À implémenter avec un système de registry distant
        return []

    # Méthodes privées

    def _check_version_compatibility(self, current: str, required: str) -> bool:
        """Vérifie la compatibilité des versions (implémentation basique)"""
        # Pour l'instant, accepte toutes les versions commençant par les mêmes chiffres
        return current.split('.')[0] == required.lstrip('>=')[0]

    def _validate_permission(self, permission: str) -> bool:
        """Valide une permission (implémentation basique)"""
        valid_permissions = {
            "model_access", "file_system_read", "file_system_write",
            "network_access", "ui_access", "config_access"
        }
        return permission in valid_permissions

    def _check_dependency(self, dependency: str, version_req: str) -> bool:
        """Vérifie une dépendance (implémentation basique)"""
        # Pour l'instant, suppose que les dépendances sont satisfaites
        # À implémenter avec un vrai gestionnaire de dépendances
        return True

    async def _load_addon_module(self, module_path: Path, addon_name: str) -> Optional[Any]:
        """Charge un module Python d'add-on"""
        try:
            # Nettoyer le préfixe si nécessaire pour éviter les conflits
            module_key = f"addon.{addon_name}"
            
            # Si déjà chargé dans sys.modules, on tente de le recharger
            if module_key in sys.modules:
                module = sys.modules[module_key]
                try:
                    importlib.reload(module)
                    return module
                except Exception as e:
                    self.logger.error(f"Erreur lors du rechargement du module {module_key}: {e}")
                    # On continue pour tenter un chargement frais
            
            spec = importlib.util.spec_from_file_location(module_key, module_path)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                sys.modules[module_key] = module # Enregistrer dans sys.modules
                spec.loader.exec_module(module)
                return module
            return None
        except Exception as e:
            self.logger.error(f"Erreur lors du chargement du module {module_path}: {e}")
            return None

    def _get_addon_context(self, addon_name: str) -> Dict[str, Any]:
        """Retourne le contexte d'exécution pour un add-on"""
        return {
            "addon_name": addon_name,
            "engine_path": self.engine_path,
            "logger": self.logger.getChild(addon_name),
            "permissions": self.addons[addon_name].manifest.permissions
        }

    def _safe_extract_zip(self, zip_file: zipfile.ZipFile, dest_dir: Path) -> bool:
        """
        Extract ZIP safely without path traversal (Zip Slip vulnerability fix).
        
        Args:
            zip_file: Open ZIP file object
            dest_dir: Destination directory
            
        Returns:
            True if extraction successful, False if path traversal detected
        """
        dest_path = dest_dir.resolve()
        
        for member in zip_file.members:
            member_path = (dest_path / member.filename).resolve()
            
            # Check if the extracted path would be outside the destination directory
            if not member_path.is_relative_to(dest_path):
                self.logger.error(f"Path traversal attempt detected: {member.filename}")
                return False
        
        # All paths are safe, proceed with extraction
        zip_file.extractall(dest_dir)
        return True
