"""
Addon External API for StoryCore-Engine
API publique pour le support des addons externes et tiers.

Ce module fournit:
- ExternalAddonLoader: Chargement d'addons depuis des sources distantes
- AddonRegistryClient: Connexion à un registry distant
- DependencyManager: Gestion des dépendances pip
- API publique pour les développeurs d'addons
"""

import asyncio
import hashlib
import json
import logging
import shutil
import subprocess
import sys
import zipfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set
from urllib.parse import urlparse

import aiohttp

from src.addon_manager import AddonInfo


class ExternalAddonType(Enum):
    """Types d'addons externes"""

    REMOTE = "remote"  # Chargé depuis une URL distante
    LOCAL_EXTERNAL = "local_external"  # Répertoire externe local
    PYPI_PACKAGE = "pypi"  # Package Python depuis PyPI
    GITHUB_REPO = "github"  # Dépôt GitHub


class ExternalAddonSource(Enum):
    """Sources d'addons externes"""

    URL = "url"
    FILE = "file"
    GITHUB = "github"
    PYPI = "pypi"
    CUSTOM_REGISTRY = "custom_registry"


@dataclass
class ExternalAddonMetadata:
    """Métadonnées d'un addon externe"""

    addon_name: str
    source_type: ExternalAddonSource
    source_url: str
    version: str
    author: str
    description: str
    download_url: Optional[str] = None
    checksum: Optional[str] = None
    signature: Optional[str] = None
    registry_source: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class InstallationResult:
    """Résultat d'installation d'un addon externe"""

    success: bool
    addon_name: str
    message: str
    addon_info: Optional[AddonInfo] = None
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


@dataclass
class RegistryAddonInfo:
    """Informations sur un addon dans un registry"""

    name: str
    version: str
    author: str
    description: str
    source_url: str
    download_count: int
    rating: float
    tags: List[str]
    dependencies: Dict[str, str]
    engine_version: str
    last_updated: str


class ExternalAddonLoader:
    """
    Chargeur d'addons externes pour StoryCore.

    Responsable du téléchargement et de l'installation d'addons
    depuis des sources distantes (URLs, GitHub, PyPI).
    """

    def __init__(self, addons_path: Path, engine_version: str = "2.0.0"):
        """
        Initialise le chargeur d'addons externes.

        Args:
            addons_path: Chemin vers le répertoire des addons
            engine_version: Version du moteur StoryCore
        """
        self.addons_path = addons_path
        self.engine_version = engine_version
        self.logger = logging.getLogger(__name__)
        self._temp_dir: Optional[Path] = None

        # Configuration de téléchargement
        self.timeout = aiohttp.ClientTimeout(total=300)  # 5 minutes
        self.max_retries = 3
        self.chunk_size = 8192

        # URLs par défaut pour les registries
        self.default_registries = {
            "storycore": "https://registry.storycore.engine",
            "community": "https://community-addons.storycore.engine",
        }

    async def initialize(self):
        """Initialise le chargeur"""
        self._temp_dir = self.addons_path / "temp_external"
        self._temp_dir.mkdir(parents=True, exist_ok=True)
        self.logger.info("ExternalAddonLoader initialisé")

    async def cleanup(self):
        """Nettoie les ressources temporaires"""
        if self._temp_dir and self._temp_dir.exists():
            try:
                shutil.rmtree(self._temp_dir)
                self.logger.debug("Temp directory cleaned")
            except Exception as e:
                self.logger.warning(f"Erreur lors du nettoyage: {e}")

    async def load_from_url(
        self, url: str, category: str = "community", verify_checksum: bool = True
    ) -> InstallationResult:
        """
        Charge un addon depuis une URL distante.

        Args:
            url: URL du fichier ZIP de l'addon
            category: Catégorie de destination (official, community)
            verify_checksum: Vérifier le checksum après téléchargement

        Returns:
            Résultat de l'installation
        """
        self.logger.info(f"Chargement de l'addon depuis: {url}")

        try:
            # Télécharger le fichier
            downloaded_path = await self._download_file(url)
            if not downloaded_path:
                return InstallationResult(
                    success=False,
                    addon_name="",
                    message="Échec du téléchargement",
                    errors=["Impossible de télécharger le fichier"],
                )

            # Vérifier le checksum si fourni
            if verify_checksum:
                checksum_valid = await self._verify_checksum(downloaded_path)
                if not checksum_valid:
                    return InstallationResult(
                        success=False,
                        addon_name="",
                        message="Checksum invalide",
                        errors=["Le checksum du fichier téléchargé ne correspond pas"],
                    )

            # Extraire et installer
            result = await self._install_from_archive(downloaded_path, category)

            # Nettoyer le fichier téléchargé
            try:
                downloaded_path.unlink()
            except Exception:
                pass

            return result

        except Exception as e:
            self.logger.error(f"Erreur lors du chargement depuis URL: {e}")
            return InstallationResult(
                success=False, addon_name="", message=str(e), errors=[str(e)]
            )

    async def load_from_github(
        self, repo_url: str, category: str = "community", branch: str = "main"
    ) -> InstallationResult:
        """
        Charge un addon depuis un dépôt GitHub.

        Args:
            repo_url: URL du dépôt GitHub (format: utilisateur/dépôt ou URL complète)
            category: Catégorie de destination
            branch: Branche à utiliser

        Returns:
            Résultat de l'installation
        """
        self.logger.info(f"Chargement de l'addon depuis GitHub: {repo_url}")

        # Extraire owner et repo de l'URL
        parsed = urlparse(repo_url)
        if parsed.path:
            parts = parsed.path.strip("/").split("/")
            if len(parts) >= 2:
                owner, repo = parts[0], parts[1].replace(".git", "")
            else:
                return InstallationResult(
                    success=False,
                    addon_name="",
                    message="Format de dépôt GitHub invalide",
                    errors=["Utilisez le format: utilisateur/dépôt"],
                )
        else:
            # Format court: owner/repo
            parts = repo_url.split("/")
            if len(parts) >= 2:
                owner, repo = parts[0], parts[1]
            else:
                return InstallationResult(
                    success=False,
                    addon_name="",
                    message="Format de dépôt GitHub invalide",
                    errors=["Utilisez le format: utilisateur/dépôt"],
                )

        # URL de téléchargement direct
        download_url = (
            f"https://github.com/{owner}/{repo}/archive/refs/heads/{branch}.zip"
        )

        return await self.load_from_url(download_url, category)

    async def load_from_pypi(
        self, package_name: str, category: str = "community"
    ) -> InstallationResult:
        """
        Charge un addon depuis PyPI.

        Args:
            package_name: Nom du package PyPI
            category: Catégorie de destination

        Returns:
            Résultat de l'installation
        """
        self.logger.info(f"Chargement de l'addon depuis PyPI: {package_name}")

        try:
            # Requêter l'API PyPI pour obtenir les informations du package
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"https://pypi.org/pypi/{package_name}/json",
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    if response.status != 200:
                        return InstallationResult(
                            success=False,
                            addon_name=package_name,
                            message=f"Package {package_name} non trouvé sur PyPI",
                            errors=[f"Status: {response.status}"],
                        )

                    data = await response.json()
                    info = data.get("info", {})

                    # Obtenir l'URL de téléchargement
                    downloads = data.get("urls", [])
                    if not downloads:
                        return InstallationResult(
                            success=False,
                            addon_name=package_name,
                            message="Aucun fichier de téléchargement disponible",
                            errors=["Package sans fichiers"],
                        )

                    # Prendre le premier fichier source
                    download_url = downloads[0]["url"]
                    filename = downloads[0]["filename"]

                    # Vérifier que c'est un wheel ou sdist valide
                    if not (filename.endswith(".whl") or filename.endswith(".tar.gz")):
                        return InstallationResult(
                            success=False,
                            addon_name=package_name,
                            message="Format de package non supporté",
                            errors=[f"Format: {filename}"],
                        )

            # Télécharger le fichier
            downloaded_path = await self._download_file(download_url)
            if not downloaded_path:
                return InstallationResult(
                    success=False,
                    addon_name=package_name,
                    message="Échec du téléchargement",
                    errors=["Impossible de télécharger le package"],
                )

            # Installer depuis l'archive
            result = await self._install_from_archive(downloaded_path, category)

            # Ajouter les métadonnées PyPI
            if result.success and result.addon_info:
                result.addon_info.manifest.metadata["pypi_package"] = package_name
                result.addon_info.manifest.metadata["pypi_version"] = info.get(
                    "version"
                )

            return result

        except Exception as e:
            self.logger.error(f"Erreur lors du chargement depuis PyPI: {e}")
            return InstallationResult(
                success=False, addon_name=package_name, message=str(e), errors=[str(e)]
            )

    async def _download_file(self, url: str) -> Optional[Path]:
        """Télécharge un fichier depuis une URL"""
        if not self._temp_dir:
            await self.initialize()

        filename = Path(urlparse(url).path).name or "download.zip"
        dest_path = self._temp_dir / filename

        retry_count = 0
        last_error = None

        while retry_count < self.max_retries:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=self.timeout) as response:
                        if response.status != 200:
                            self.logger.error(f"HTTP {response.status} pour {url}")
                            return None

                        # Écrire le fichier
                        with open(dest_path, "wb") as f:
                            async for chunk in response.content.iter_chunked(
                                self.chunk_size
                            ):
                                f.write(chunk)

                        self.logger.info(f"Téléchargé: {dest_path}")
                        return dest_path

            except asyncio.TimeoutError:
                last_error = "Timeout lors du téléchargement"
                retry_count += 1
                self.logger.warning(
                    f"Retry {retry_count}/{self.max_retries} pour {url}"
                )

            except Exception as e:
                last_error = str(e)
                self.logger.error(f"Erreur de téléchargement: {e}")
                break

        self.logger.error(f"Échec après {self.max_retries} tentatives: {last_error}")
        return None

    async def _verify_checksum(
        self, file_path: Path, expected_checksum: str = None
    ) -> bool:
        """Vérifie le checksum d'un fichier"""
        try:
            with open(file_path, "rb") as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()

            if expected_checksum and file_hash != expected_checksum:
                self.logger.error(
                    f"Checksum mismatch: attendu {expected_checksum}, obtenu {file_hash}"
                )
                return False

            return True
        except Exception as e:
            self.logger.error(f"Erreur lors de la vérification du checksum: {e}")
            return False

    async def _install_from_archive(
        self, archive_path: Path, category: str
    ) -> InstallationResult:
        """Installe un addon depuis une archive ZIP"""
        warnings = []
        errors = []

        try:
            # Créer un répertoire temporaire pour l'extraction
            extract_dir = self._temp_dir / "extract"
            extract_dir.mkdir(exist_ok=True)

            # Extraire le ZIP de manière sécurisée
            with zipfile.ZipFile(archive_path, "r") as zip_ref:
                # Vérifier pour des path traversal
                for member in zip_ref.namelist():
                    if member.startswith("/") or ".." in member:
                        errors.append("Path traversal détecté dans l'archive")
                        return InstallationResult(
                            success=False,
                            addon_name="",
                            message="Archive invalide",
                            errors=errors,
                        )

                zip_ref.extractall(extract_dir)

            # Chercher le manifest
            manifest_path = None
            for p in extract_dir.rglob("addon.json"):
                manifest_path = p
                break

            if not manifest_path:
                errors.append("Aucun fichier addon.json trouvé")
                return InstallationResult(
                    success=False,
                    addon_name="",
                    message="Archive invalide",
                    errors=errors,
                )

            # Charger le manifest
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)

            addon_name = manifest_data.get("name")
            if not addon_name:
                errors.append("Nom d'addon invalide dans le manifest")
                return InstallationResult(
                    success=False,
                    addon_name="",
                    message="Manifest invalide",
                    errors=errors,
                )

            # Vérifier la compatibilité avec le moteur
            compatibility = manifest_data.get("compatibility", {})
            if "engine_version" in compatibility:
                required_version = compatibility["engine_version"]
                if not self._check_version_compatibility(
                    self.engine_version, required_version
                ):
                    warnings.append(
                        f"Version du moteur incompatible: {required_version} requis"
                    )

            # Préparer le répertoire de destination
            target_dir = self.addons_path / category / addon_name
            if target_dir.exists():
                # Sauvegarder l'ancienne version
                backup_dir = self.addons_path / "backups" / f"{addon_name}_old"
                backup_dir.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(target_dir), str(backup_dir))
                warnings.append(f"Ancienne version sauvegardée dans {backup_dir}")

            # Déplacer les fichiers
            source_dir = manifest_path.parent
            target_dir.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source_dir), str(target_dir))

            # Nettoyer
            try:
                shutil.rmtree(extract_dir)
            except Exception:
                pass

            self.logger.info(f"Addon {addon_name} installé avec succès")

            return InstallationResult(
                success=True,
                addon_name=addon_name,
                message=f"Addon {addon_name} installé avec succès",
                warnings=warnings,
                errors=errors,
            )

        except Exception as e:
            self.logger.error(f"Erreur lors de l'installation: {e}")
            return InstallationResult(
                success=False, addon_name="", message=str(e), errors=[str(e)]
            )

    def _check_version_compatibility(self, current: str, required: str) -> bool:
        """Vérifie la compatibilité des versions"""
        # Version simple: accepte si les majeurs sont identiques
        current_major = current.split(".")[0]
        required_stripped = required.lstrip(">=")
        required_major = required_stripped.split(".")[0]
        return current_major == required_major


class AddonRegistryClient:
    """
    Client pour la connexion à un registry d'addons distant.

    Permet de:
    - Découvrir des addons disponibles
    - Rechercher des addons
    - Obtenir des informations sur les addons
    """

    def __init__(self, registry_url: str = None, api_key: str = None):
        """
        Initialise le client de registry.

        Args:
            registry_url: URL du registry (utilise l默认值 si None)
            api_key: Clé API pour l'authentification
        """
        self.registry_url = registry_url or "https://registry.storycore.engine/api/v1"
        self.api_key = api_key
        self.logger = logging.getLogger(__name__)
        self.timeout = aiohttp.ClientTimeout(total=30)

        # Cache des requêtes
        self._cache: Dict[str, tuple] = {}
        self._cache_ttl = 300  # 5 minutes

    async def search(
        self, query: str, filters: Optional[Dict] = None, limit: int = 20
    ) -> List[RegistryAddonInfo]:
        """
        Recherche des addons dans le registry.

        Args:
            query: Terme de recherche
            filters: Filtres optionnels (category, tags, author)
            limit: Nombre maximum de résultats

        Returns:
            Liste des addons correspondants
        """
        cache_key = f"search:{query}:{json.dumps(filters or {})}::{limit}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        try:
            params = {"q": query, "limit": limit}
            if filters:
                params.update(filters)

            headers = self._get_headers()

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.registry_url}/addons/search",
                    params=params,
                    headers=headers,
                    timeout=self.timeout,
                ) as response:
                    if response.status != 200:
                        self.logger.error(f"Erreur de recherche: {response.status}")
                        return []

                    data = await response.json()
                    results = [
                        self._parse_registry_addon(item)
                        for item in data.get("results", [])
                    ]

                    self._set_cache(cache_key, results)
                    return results

        except Exception as e:
            self.logger.error(f"Erreur lors de la recherche: {e}")
            return []

    async def get_addon_info(self, addon_name: str) -> Optional[RegistryAddonInfo]:
        """
        Obtient les informations détaillées d'un addon.

        Args:
            addon_name: Nom de l'addon

        Returns:
            Informations sur l'addon ou None
        """
        cache_key = f"addon:{addon_name}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached[0] if cached else None

        try:
            headers = self._get_headers()

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.registry_url}/addons/{addon_name}",
                    headers=headers,
                    timeout=self.timeout,
                ) as response:
                    if response.status == 404:
                        return None
                    if response.status != 200:
                        self.logger.error(f"Erreur: {response.status}")
                        return None

                    data = await response.json()
                    addon = self._parse_registry_addon(data)

                    self._set_cache(cache_key, [addon])
                    return addon

        except Exception as e:
            self.logger.error(f"Erreur lors de la récupération des infos: {e}")
            return None

    async def get_featured(self, category: str = None) -> List[RegistryAddonInfo]:
        """
        Obtient les addons en vedette.

        Args:
            category: Filtrer par catégorie

        Returns:
            Liste des addons en vedette
        """
        try:
            params = {}
            if category:
                params["category"] = category

            headers = self._get_headers()

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.registry_url}/addons/featured",
                    params=params,
                    headers=headers,
                    timeout=self.timeout,
                ) as response:
                    if response.status != 200:
                        return []

                    data = await response.json()
                    return [
                        self._parse_registry_addon(item)
                        for item in data.get("results", [])
                    ]

        except Exception as e:
            self.logger.error(
                f"Erreur lors de la récupération des addons vedettes: {e}"
            )
            return []

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Obtient la liste des catégories disponibles"""
        try:
            headers = self._get_headers()

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.registry_url}/categories",
                    headers=headers,
                    timeout=self.timeout,
                ) as response:
                    if response.status != 200:
                        return []

                    data = await response.json()
                    return data.get("categories", [])

        except Exception as e:
            self.logger.error(f"Erreur lors de la récupération des catégories: {e}")
            return []

    def _parse_registry_addon(self, data: Dict) -> RegistryAddonInfo:
        """Parse les données d'un addon depuis le registry"""
        return RegistryAddonInfo(
            name=data.get("name", ""),
            version=data.get("version", ""),
            author=data.get("author", ""),
            description=data.get("description", ""),
            source_url=data.get("source_url", ""),
            download_count=data.get("download_count", 0),
            rating=data.get("rating", 0.0),
            tags=data.get("tags", []),
            dependencies=data.get("dependencies", {}),
            engine_version=data.get("engine_version", ""),
            last_updated=data.get("last_updated", ""),
        )

    def _get_headers(self) -> Dict[str, str]:
        """Retourne les headers pour les requêtes"""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": f"StoryCore-Engine/{self._get_engine_version()}",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _get_engine_version(self) -> str:
        """Obtient la version du moteur"""
        # Essaye d'importer la version depuis la config
        try:
            from config import get_config

            config = get_config()
            return config.get("version", "2.0.0")
        except Exception:
            return "2.0.0"

    def _get_from_cache(self, key: str) -> Optional[List]:
        """Récupère depuis le cache"""
        if key in self._cache:
            import time

            timestamp, data = self._cache[key]
            if time.time() - timestamp < self._cache_ttl:
                return data
            del self._cache[key]
        return None

    def _set_cache(self, key: str, data: List):
        """Met en cache des données"""
        import time

        self._cache[key] = (time.time(), data)


class DependencyManager:
    """
    Gestionnaire de dépendances pour les addons.

    Gère l'installation et la vérification des dépendances
    Python (pip) requises par les addons.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._installed_packages: Set[str] = set()

    async def initialize(self):
        """Initialise le gestionnaire"""
        await self._scan_installed_packages()
        self.logger.info(
            f"DependencyManager initialisé avec {len(self._installed_packages)} packages"
        )

    async def _scan_installed_packages(self):
        """Scanne les packages pip installés"""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "list", "--format=json"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0:
                packages = json.loads(result.stdout)
                self._installed_packages = {p["name"].lower() for p in packages}
        except Exception as e:
            self.logger.warning(f"Erreur lors du scan des packages: {e}")

    async def install_dependencies(
        self, dependencies: Dict[str, str], optional: bool = False
    ) -> Dict[str, Any]:
        """
        Installe les dépendances d'un addon.

        Args:
            dependencies: Dict de dépendances {package: version}
            optional: Si True, ne pas échouer sur des erreurs

        Returns:
            Rapport d'installation
        """
        result = {
            "success": True,
            "installed": [],
            "already_satisfied": [],
            "failed": [],
            "warnings": [],
        }

        # Préparer les packages à installer
        to_install = []
        for package, version_req in dependencies.items():
            package_lower = package.lower()

            # Vérifier si déjà installé
            if package_lower in self._installed_packages:
                result["already_satisfied"].append(package)
                continue

            # Formater pour pip
            if version_req:
                to_install.append(f"{package}{version_req}")
            else:
                to_install.append(package)

        if not to_install:
            self.logger.info("Toutes les dépendances sont déjà satisfaites")
            return result

        # Installer les packages manquants
        self.logger.info(f"Installation de {len(to_install)} dépendances: {to_install}")

        try:
            # Utiliser pip pour installer
            cmd = [
                sys.executable,
                "-m",
                "pip",
                "install",
                "--quiet",
                "--no-input",
                "--disable-pip-version-check",
            ]
            cmd.extend(to_install)

            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                result["installed"] = to_install
                # Mettre à jour la liste des packages installés
                await self._scan_installed_packages()
                self.logger.info(f"Dépendances installées: {to_install}")
            else:
                error_msg = stderr.decode() if stderr else "Unknown error"
                result["warnings"].append(f"Erreur d'installation: {error_msg}")

                if not optional:
                    result["success"] = False
                    result["failed"] = to_install

        except Exception as e:
            self.logger.error(f"Erreur lors de l'installation: {e}")
            if not optional:
                result["success"] = False
                result["failed"] = to_install
            result["warnings"].append(str(e))

        return result

    async def check_dependencies(self, dependencies: Dict[str, str]) -> Dict[str, Any]:
        """
        Vérifie si les dépendances sont satisfaites.

        Args:
            dependencies: Dict de dépendances {package: version}

        Returns:
            Rapport de vérification
        """
        result = {"satisfied": True, "missing": [], "outdated": []}

        for package, version_req in dependencies.items():
            package_lower = package.lower()

            if package_lower not in self._installed_packages:
                result["satisfied"] = False
                result["missing"].append(f"{package}{version_req}")
            # Note: La vérification de version pourrait être ajoutée ici

        return result

    def get_package_info(self, package_name: str) -> Optional[Dict[str, Any]]:
        """
        Obtient les informations sur un package installé.

        Args:
            package_name: Nom du package

        Returns:
            Informations du package ou None
        """
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "show", package_name],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode != 0:
                return None

            info = {}
            for line in result.stdout.strip().split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    info[key.strip().lower().replace("-", "_")] = value.strip()

            return info

        except Exception as e:
            self.logger.error(
                f"Erreur lors de la récupération des infos du package: {e}"
            )
            return None


class AddonAPI:
    """
    API publique pour les développeurs d'addons.

    Cette classe fournit une interface standardisée que les addons
    peuvent utiliser pour interagir avec le moteur StoryCore.
    """

    def __init__(self, addon_name: str, addon_context: Dict[str, Any]):
        """
        Initialise l'API pour un addon.

        Args:
            addon_name: Nom de l'addon
            addon_context: Contexte d'exécution de l'addon
        """
        self.addon_name = addon_name
        self.context = addon_context
        self.logger = logging.getLogger(f"addon.{addon_name}")

        # Références aux systèmes du moteur
        self._hook_manager = None
        self._event_bus = None
        self._permission_manager = None

    def set_hook_manager(self, hook_manager):
        """Définit le gestionnaire de hooks"""
        self._hook_manager = hook_manager

    def set_event_bus(self, event_bus):
        """Définit le bus d'événements"""
        self._event_bus = event_bus

    def set_permission_manager(self, permission_manager):
        """Définit le gestionnaire de permissions"""
        self._permission_manager = permission_manager

    # === Méthodes de gestion du cycle de vie ===

    async def on_load(self) -> bool:
        """
        Callback appelé lors du chargement de l'addon.

        Returns:
            True si le chargement est réussi
        """
        self.logger.info(f"Addon {self.addon_name} chargé")

        # Publier un événement
        if self._event_bus:
            await self._event_bus.publish_addon_event(
                self.addon_name,
                "addon.loaded",
                {"version": self.context.get("version")},
            )

        return True

    async def on_enable(self) -> bool:
        """
        Callback appelé lors de l'activation de l'addon.

        Returns:
            True si l'activation est réussie
        """
        self.logger.info(f"Addon {self.addon_name} activé")

        if self._event_bus:
            await self._event_bus.publish_addon_event(
                self.addon_name, "addon.enabled", {}
            )

        return True

    async def on_disable(self) -> bool:
        """
        Callback appelé lors de la désactivation de l'addon.

        Returns:
            True si la désactivation est réussie
        """
        self.logger.info(f"Addon {self.addon_name} désactivé")

        if self._event_bus:
            await self._event_bus.publish_addon_event(
                self.addon_name, "addon.disabled", {}
            )

        return True

    async def on_unload(self):
        """Callback appelé lors du déchargement de l'addon"""
        self.logger.info(f"Addon {self.addon_name} déchargé")

        if self._event_bus:
            await self._event_bus.publish_addon_event(
                self.addon_name, "addon.unloaded", {}
            )

    # === Méthodes de hooks ===

    async def register_hook(
        self, hook_name: str, callback: Callable, priority: int = 50
    ) -> bool:
        """
        Enregistre un hook.

        Args:
            hook_name: Nom du hook
            callback: Fonction de callback
            priority: Priorité (0-100)

        Returns:
            True si l'enregistrement est réussi
        """
        if not self._hook_manager:
            self.logger.warning("Hook manager non disponible")
            return False

        try:
            from src.addon_hooks import HookPriority

            # Convertir la priorité en HookPriority
            if priority >= 75:
                hook_priority = HookPriority.HIGHEST
            elif priority >= 50:
                hook_priority = HookPriority.HIGH
            elif priority >= 25:
                hook_priority = HookPriority.NORMAL
            else:
                hook_priority = HookPriority.LOW

            return self._hook_manager.register_hook(
                self.addon_name, hook_name, callback, hook_priority
            )
        except Exception as e:
            self.logger.error(f"Erreur lors de l'enregistrement du hook: {e}")
            return False

    async def unregister_hook(self, hook_name: str) -> bool:
        """
        Désenregistre un hook.

        Args:
            hook_name: Nom du hook

        Returns:
            True si le désenregistrement est réussi
        """
        if not self._hook_manager:
            return False
        return self._hook_manager.unregister_hook(self.addon_name, hook_name)

    async def execute_hook(self, hook_name: str, *args, **kwargs) -> List[Any]:
        """
        Exécute un hook et retourne les résultats.

        Args:
            hook_name: Nom du hook
            *args, **kwargs: Arguments à passer au hook

        Returns:
            Liste des résultats
        """
        if not self._hook_manager:
            return []

        results = await self._hook_manager.execute_hook(hook_name, *args, **kwargs)
        return [r.result for r in results if r.success]

    # === Méthodes d'événements ===

    async def publish_event(self, event_name: str, data: Dict = None):
        """
        Publie un événement.

        Args:
            event_name: Nom de l'événement
            data: Données de l'événement
        """
        if not self._event_bus:
            self.logger.warning("Event bus non disponible")
            return

        await self._event_bus.publish_addon_event(
            self.addon_name, event_name, data or {}
        )

    async def subscribe_event(self, event_pattern: str, callback: Callable):
        """
        S'abonne à un pattern d'événements.

        Args:
            event_pattern: Pattern d'événement (peut contenir des wildcards)
            callback: Fonction de callback
        """
        if not self._event_bus:
            self.logger.warning("Event bus non disponible")
            return

        from src.addon_events import EventPriority

        self._event_bus.subscribe(
            self.addon_name, event_pattern, callback, EventPriority.NORMAL
        )

    async def unsubscribe_events(self, event_pattern: str = None):
        """
        Se désabonne des événements.

        Args:
            event_pattern: Pattern spécifique, ou None pour tous
        """
        if not self._event_bus:
            return
        self._event_bus.unsubscribe(self.addon_name, event_pattern)

    # === Méthodes de permissions ===

    async def check_permission(self, permission: str) -> bool:
        """
        Vérifie si l'addon a une permission.

        Args:
            permission: Nom de la permission

        Returns:
            True si la permission est accordée
        """
        if not self._permission_manager:
            return False

        from src.addon_permissions import PermissionLevel, PermissionScope

        return await self._permission_manager.check_permission(
            self.addon_name, permission, PermissionLevel.READ, PermissionScope.PROJECT
        )

    # === Méthodes utilitaires ===

    def get_engine_version(self) -> str:
        """Retourne la version du moteur"""
        return self.context.get("engine_version", "2.0.0")

    def get_config(self, key: str, default: Any = None) -> Any:
        """Récupère une configuration de l'addon"""
        return self.context.get("config", {}).get(key, default)

    def get_data_path(self) -> Path:
        """Retourne le chemin des données de l'addon"""
        data_path = self.context.get("data_path")
        if data_path:
            return Path(data_path)
        return Path("data") / self.addon_name

    def get_logger(self) -> logging.Logger:
        """Retourne le logger de l'addon"""
        return self.logger


# === Fonctions utilitaires pour les développeurs d'addons ===


def create_addon_api(addon_name: str, context: Dict[str, Any]) -> AddonAPI:
    """
    Crée une instance de l'API pour un addon.

    Args:
        addon_name: Nom de l'addon
        context: Contexte d'exécution

    Returns:
        Instance de l'API
    """
    return AddonAPI(addon_name, context)


def get_available_hooks() -> Dict[str, str]:
    """
    Retourne la liste des hooks disponibles.

    Returns:
        Dictionnaire des hooks {nom: description}
    """
    from src.addon_hooks import HookManager

    manager = HookManager()
    return manager.get_available_hooks()


async def get_addon_statistics() -> Dict[str, Any]:
    """
    Retourne les statistiques globales des addons.

    Returns:
        Statistiques du système d'addons
    """
    # Cette fonction pourrait être étendue pour retourner des stats réelles
    return {
        "total_addons": 0,
        "enabled_addons": 0,
        "hooks_registered": 0,
        "events_published": 0,
    }
