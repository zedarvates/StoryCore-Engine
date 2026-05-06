#!/usr/bin/env python3
"""
StoryCore Add-on CLI
Interface en ligne de commande pour gérer les add-ons.
"""

import asyncio
import argparse
import json
import sys
from pathlib import Path
from typing import List
import logging

# Ajouter le répertoire src au path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.addon_manager import AddonManager, AddonType
from src.addon_validator import AddonValidator
from src.addon_permissions import PermissionManager


class AddonCLI:
    """Interface CLI pour la gestion des add-ons"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.addon_manager = AddonManager()
        self.validator = AddonValidator()
        self.permission_manager = PermissionManager()

        # Configurer le logging
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )

    async def initialize(self):
        """Initialise les composants asynchrones"""
        await self.addon_manager.initialize_all_addons()

    def create_parser(self) -> argparse.ArgumentParser:
        """Crée le parser d'arguments"""
        parser = argparse.ArgumentParser(
            description="StoryCore Add-on CLI - Gestion des extensions",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Exemples d'utilisation:

  # Lister tous les add-ons
  python addon_cli.py list

  # Créer un nouveau add-on
  python addon_cli.py create workflow_addon my_workflow "Mon workflow personnalisé"

  # Valider un add-on
  python addon_cli.py validate path/to/addon

  # Activer un add-on
  python addon_cli.py enable my_addon

  # Voir les informations d'un add-on
  python addon_cli.py info my_addon

  # Créer un template d'add-on
  python addon_cli.py template workflow my_template
            """,
        )

        subparsers = parser.add_subparsers(dest="command", help="Commandes disponibles")

        # Commande list
        list_parser = subparsers.add_parser("list", help="Lister les add-ons")
        list_parser.add_argument(
            "--type",
            choices=["workflow", "ui", "processing", "model", "export"],
            help="Filtrer par type d'add-on",
        )
        list_parser.add_argument(
            "--status",
            choices=["enabled", "disabled", "error"],
            help="Filtrer par statut",
        )

        # Commande info
        info_parser = subparsers.add_parser("info", help="Informations sur un add-on")
        info_parser.add_argument("addon_name", help="Nom de l'add-on")

        # Commande create
        create_parser = subparsers.add_parser("create", help="Créer un nouveau add-on")
        create_parser.add_argument(
            "type",
            choices=[
                "workflow_addon",
                "ui_addon",
                "processing_addon",
                "model_addon",
                "export_addon",
            ],
            help="Type d'add-on",
        )
        create_parser.add_argument("name", help="Nom de l'add-on")
        create_parser.add_argument("description", help="Description de l'add-on")
        create_parser.add_argument("--author", default="Unknown", help="Auteur")
        create_parser.add_argument(
            "--category",
            choices=["official", "community"],
            default="community",
            help="Catégorie",
        )

        # Commande validate
        validate_parser = subparsers.add_parser("validate", help="Valider un add-on")
        validate_parser.add_argument("path", help="Chemin vers l'add-on")
        validate_parser.add_argument(
            "--detailed", action="store_true", help="Afficher les détails de validation"
        )

        # Commande enable/disable
        enable_parser = subparsers.add_parser("enable", help="Activer un add-on")
        enable_parser.add_argument("addon_name", help="Nom de l'add-on")

        disable_parser = subparsers.add_parser("disable", help="Désactiver un add-on")
        disable_parser.add_argument("addon_name", help="Nom de l'add-on")

        # Commande template
        template_parser = subparsers.add_parser(
            "template", help="Créer un template d'add-on"
        )
        template_parser.add_argument(
            "type",
            choices=["workflow", "ui", "processing", "model", "export"],
            help="Type d'add-on",
        )
        template_parser.add_argument("name", help="Nom du template")
        template_parser.add_argument("--output", "-o", help="Répertoire de sortie")

        # Commande permissions
        perms_parser = subparsers.add_parser(
            "permissions", help="Gérer les permissions"
        )
        perms_parser.add_argument("addon_name", help="Nom de l'add-on")
        perms_parser.add_argument(
            "--list", action="store_true", help="Lister les permissions"
        )
        perms_parser.add_argument(
            "--grant",
            nargs=2,
            metavar=("PERMISSION", "LEVEL"),
            help="Accorder une permission (permission level)",
        )
        perms_parser.add_argument(
            "--revoke", metavar="PERMISSION", help="Révoquer une permission"
        )

        # Commande stats
        subparsers.add_parser("stats", help="Statistiques du système")

        return parser

    async def run_command(self, args):
        """Exécute la commande demandée"""
        command = args.command

        if command == "list":
            await self.cmd_list(args)
        elif command == "info":
            await self.cmd_info(args)
        elif command == "create":
            await self.cmd_create(args)
        elif command == "validate":
            await self.cmd_validate(args)
        elif command == "enable":
            await self.cmd_enable(args)
        elif command == "disable":
            await self.cmd_disable(args)
        elif command == "template":
            await self.cmd_template(args)
        elif command == "permissions":
            await self.cmd_permissions(args)
        elif command == "stats":
            await self.cmd_stats(args)
        else:
            self.logger.error(f"Commande inconnue: {command}")

    async def cmd_list(self, args):
        """Liste les add-ons"""
        print("📦 Add-ons installés:\n")

        addons = self.addon_manager.addons
        enabled = self.addon_manager.enabled_addons

        if not addons:
            print("Aucun add-on installé.")
            return

        for name, info in addons.items():
            status_icon = (
                "✅"
                if name in enabled
                else "❌"
                if info.state.value == "error"
                else "⏸️"
            )
            type_icon = self._get_type_icon(info.manifest.type)

            if args.type and info.manifest.type.value != args.type:
                continue
            if args.status:
                if args.status == "enabled" and name not in enabled:
                    continue
                if args.status == "disabled" and (
                    name in enabled or info.state.value == "error"
                ):
                    continue
                if args.status == "error" and info.state.value != "error":
                    continue

            print(f"{status_icon} {type_icon} {name}")
            print(f"   📝 {info.manifest.description}")
            print(f"   👤 {info.manifest.author} | v{info.manifest.version}")
            print(f"   📊 État: {info.state.value}")
            if info.error_message:
                print(f"   ⚠️  Erreur: {info.error_message}")
            print()

    async def cmd_info(self, args):
        """Affiche les informations d'un add-on"""
        addon_name = args.addon_name

        info = self.addon_manager.get_addon_info(addon_name)
        if not info:
            print(f"❌ Add-on '{addon_name}' non trouvé.")
            return

        print(f"📦 Informations sur l'add-on: {addon_name}\n")

        manifest = info.manifest
        print(f"📝 Description: {manifest.description}")
        print(f"👤 Auteur: {manifest.author}")
        print(f"🏷️  Type: {manifest.type.value}")
        print(f"📊 Version: {manifest.version}")
        print(f"📍 État: {info.state.value}")

        if info.load_time:
            print(f"⏱️  Temps de chargement: {info.load_time:.2f}s")

        if info.error_message:
            print(f"⚠️  Erreur: {info.error_message}")

        print("\n🔧 Permissions requises:")
        for perm in manifest.permissions:
            print(f"   • {perm}")

        print("\n📂 Points d'entrée:")
        for entry_name, entry_path in manifest.entry_points.items():
            exists = (info.path / entry_path).exists()
            status = "✅" if exists else "❌"
            print(f"   • {entry_name}: {entry_path} {status}")

        if manifest.dependencies:
            print("\n📦 Dépendances:")
            for dep, version in manifest.dependencies.items():
                print(f"   • {dep}{version}")

        if manifest.metadata:
            print("\n🏷️  Métadonnées:")
            for key, value in manifest.metadata.items():
                print(f"   • {key}: {value}")

    async def cmd_create(self, args):
        """Crée un nouveau add-on"""
        addon_type = AddonType(args.type)
        name = args.name
        description = args.description
        author = args.author
        category = args.category

        # Créer la structure
        addon_path = self.addon_manager.addons_path / category / name

        if addon_path.exists():
            print(f"❌ L'add-on '{name}' existe déjà dans {category}/")
            return

        print(f"🏗️  Création de l'add-on '{name}'...")

        # Créer les répertoires
        addon_path.mkdir(parents=True, exist_ok=True)
        (addon_path / "src").mkdir(exist_ok=True)
        (addon_path / "docs").mkdir(exist_ok=True)
        (addon_path / "examples").mkdir(exist_ok=True)
        (addon_path / "tests").mkdir(exist_ok=True)

        # Créer le manifest
        manifest = {
            "name": name,
            "version": "1.0.0",
            "type": addon_type.value,
            "author": author,
            "description": description,
            "compatibility": {"engine_version": ">=2.0.0", "python_version": ">=3.9"},
            "permissions": self._get_default_permissions(addon_type),
            "entry_points": {"main": "src/main.py"},
            "dependencies": {},
            "metadata": {"created_with": "addon_cli", "category": category},
        }

        # Écrire le manifest
        with open(addon_path / "addon.json", "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        # Créer le fichier main.py de base
        main_content = self._get_template_main(addon_type, name)
        with open(addon_path / "src" / "main.py", "w", encoding="utf-8") as f:
            f.write(main_content)

        # Créer un README
        readme_content = f"""# {name}

{description}

## Installation

Ce add-on est automatiquement découvert par StoryCore lors du démarrage.

## Utilisation

TODO: Décrire l'utilisation de l'add-on

## Développement

TODO: Instructions pour les développeurs
"""
        with open(addon_path / "README.md", "w", encoding="utf-8") as f:
            f.write(readme_content)

        print(f"✅ Add-on '{name}' créé avec succès dans {addon_path}")
        print(f"📝 Manifest: {addon_path}/addon.json")
        print(f"🐍 Code principal: {addon_path}/src/main.py")
        print(f"📚 Documentation: {addon_path}/README.md")

    async def cmd_validate(self, args):
        """Valide un add-on"""
        addon_path = Path(args.path)

        if not addon_path.exists():
            print(f"❌ Chemin non trouvé: {addon_path}")
            return

        print(f"🔍 Validation de l'add-on: {addon_path.name}\n")

        # Charger le manifest
        try:
            manifest = await self.addon_manager.load_addon_manifest(addon_path)
            if not manifest:
                print("❌ Impossible de charger le manifest")
                return
        except Exception as e:
            print(f"❌ Erreur lors du chargement du manifest: {e}")
            return

        # Validation complète
        result = await self.validator.validate_addon(manifest, addon_path)

        # Afficher les résultats
        status_icon = "✅" if result.is_valid else "❌"
        print(f"{status_icon} Validation: {'PASS' if result.is_valid else 'FAIL'}")
        print(f"📊 Score: {result.score:.1f}/100")
        print(f"🔒 Checksum: {result.checksum[:16]}...")

        if result.issues:
            print(f"\n⚠️  Issues trouvées: {len(result.issues)}")
            for issue in result.issues[:10]:  # Limiter à 10 issues
                severity_icon = {
                    "info": "ℹ️",
                    "warning": "⚠️",
                    "error": "❌",
                    "critical": "🚨",
                }[issue.severity]
                print(f"   {severity_icon} [{issue.category}] {issue.message}")
                if issue.file_path:
                    print(f"      📁 {issue.file_path}")
                if issue.line_number:
                    print(f"      📍 Ligne {issue.line_number}")
                if issue.suggestion:
                    print(f"      💡 {issue.suggestion}")
        else:
            print("\n✅ Aucune issue trouvée!")

        if args.detailed and result.issues:
            print("\n📋 Rapport détaillé:")
            print(self.validator.get_validation_report(result))

    async def cmd_enable(self, args):
        """Active un add-on"""
        addon_name = args.addon_name

        success = await self.addon_manager.enable_addon(addon_name)

        if success:
            print(f"✅ Add-on '{addon_name}' activé avec succès")
        else:
            print(f"❌ Impossible d'activer l'add-on '{addon_name}'")

    async def cmd_disable(self, args):
        """Désactive un add-on"""
        addon_name = args.addon_name

        success = await self.addon_manager.disable_addon(addon_name)

        if success:
            print(f"✅ Add-on '{addon_name}' désactivé avec succès")
        else:
            print(f"❌ Impossible de désactiver l'add-on '{addon_name}'")

    async def cmd_template(self, args):
        """Crée un template d'add-on"""
        addon_type = args.type
        template_name = args.name
        output_dir = (
            Path(args.output)
            if args.output
            else self.addon_manager.addons_path / "templates"
        )

        template_path = output_dir / template_name
        template_path.mkdir(parents=True, exist_ok=True)

        print(
            f"🏗️  Création du template '{template_name}' pour le type '{addon_type}'..."
        )

        # Copier la structure depuis un add-on existant ou créer de base
        # TODO: Implémenter la logique de template

        print(f"✅ Template créé dans: {template_path}")

    async def cmd_permissions(self, args):
        """Gère les permissions d'un add-on"""
        addon_name = args.addon_name

        if args.list:
            grants = self.permission_manager.get_addon_permissions(addon_name)
            if grants:
                print(f"🔒 Permissions accordées à '{addon_name}':")
                for grant in grants:
                    status = "✅" if grant.granted else "❌"
                    print(
                        f"   {status} {grant.request.permission} ({grant.request.level.value})"
                    )
                    print(f"      Accordé par: {grant.granted_by}")
                    print(f"      Date: {grant.timestamp}")
            else:
                print(f"ℹ️  Aucune permission accordée à '{addon_name}'")

        elif args.grant:
            permission, level_str = args.grant
            # TODO: Implémenter l'octroi de permissions via CLI
            print("⚠️  Fonctionnalité d'octroi de permissions non implémentée")

        elif args.revoke:
            permission = args.revoke
            success = await self.permission_manager.revoke_permission(
                addon_name, permission
            )
            if success:
                print(f"✅ Permission '{permission}' révoquée pour '{addon_name}'")
            else:
                print(f"❌ Impossible de révoquer la permission '{permission}'")

    async def cmd_stats(self, args):
        """Affiche les statistiques du système"""
        print("📊 Statistiques du système d'add-ons:\n")

        manager_stats = self.addon_manager.stats
        perm_stats = self.permission_manager.get_permission_stats()

        print("🔍 Découverte et chargement:")
        print(f"   📦 Add-ons découverts: {manager_stats['discovered']}")
        print(f"   ✅ Add-ons chargés: {manager_stats['loaded']}")
        print(f"   🚀 Add-ons activés: {manager_stats['enabled']}")
        print(f"   ❌ Erreurs: {manager_stats['errors']}")

        print("\n🔒 Permissions:")
        print(f"   📋 Requêtes totales: {perm_stats['requests_total']}")
        print(f"   ✅ Requêtes accordées: {perm_stats['requests_granted']}")
        print(f"   ❌ Requêtes refusées: {perm_stats['requests_denied']}")
        print(f"   📈 Permissions actives: {perm_stats['active_grants']}")

    def _get_type_icon(self, addon_type: AddonType) -> str:
        """Retourne l'icône pour un type d'add-on"""
        icons = {
            AddonType.WORKFLOW: "⚡",
            AddonType.UI: "🖥️",
            AddonType.PROCESSING: "🔧",
            AddonType.MODEL: "🤖",
            AddonType.EXPORT: "📤",
        }
        return icons.get(addon_type, "📦")

    def _get_default_permissions(self, addon_type: AddonType) -> List[str]:
        """Retourne les permissions par défaut pour un type d'add-on"""
        defaults = {
            AddonType.WORKFLOW: ["model_access"],
            AddonType.UI: ["ui_access"],
            AddonType.PROCESSING: ["file_system_read"],
            AddonType.MODEL: ["model_access", "file_system_write"],
            AddonType.EXPORT: ["file_system_write", "config_access"],
        }
        return defaults.get(addon_type, [])

    def _get_template_main(self, addon_type: AddonType, name: str) -> str:
        """Retourne le code template pour le fichier main.py"""
        templates = {
            AddonType.WORKFLOW: '''"""
{name} - Workflow Add-on
"""

import asyncio
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class {name}Addon:
    """Add-on de workflow personnalisé"""

    def __init__(self):
        self.name = "{name}"
        self.logger = logger

    async def initialize(self, context: Dict[str, Any]):
        """Initialisation de l'add-on"""
        self.logger.info(f"Initialisation de l'add-on {{self.name}}")
        # TODO: Initialisation spécifique

    async def cleanup(self):
        """Nettoyage de l'add-on"""
        self.logger.info(f"Nettoyage de l'add-on {{self.name}}")
        # TODO: Nettoyage spécifique

    # TODO: Ajouter les méthodes spécifiques au workflow

# Instance globale
addon = {name}Addon()
''',
            AddonType.UI: '''"""
{name} - UI Add-on
"""

import asyncio
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class {name}UIAddon:
    """Add-on d'interface utilisateur"""

    def __init__(self):
        self.name = "{name}"
        self.logger = logger

    async def initialize(self, context: Dict[str, Any]):
        """Initialisation de l'add-on"""
        self.logger.info(f"Initialisation de l'add-on UI {{self.name}}")
        # TODO: Initialisation UI

    async def cleanup(self):
        """Nettoyage de l'add-on"""
        self.logger.info(f"Nettoyage de l'add-on UI {{self.name}}")
        # TODO: Nettoyage UI

    # TODO: Ajouter les méthodes UI

# Instance globale
addon = {name}UIAddon()
''',
            AddonType.PROCESSING: '''"""
{name} - Processing Add-on
"""

import asyncio
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class {name}ProcessingAddon:
    """Add-on de traitement personnalisé"""

    def __init__(self):
        self.name = "{name}"
        self.logger = logger

    async def initialize(self, context: Dict[str, Any]):
        """Initialisation de l'add-on"""
        self.logger.info(f"Initialisation de l'add-on de traitement {{self.name}}")
        # TODO: Initialisation traitement

    async def cleanup(self):
        """Nettoyage de l'add-on"""
        self.logger.info(f"Nettoyage de l'add-on de traitement {{self.name}}")
        # TODO: Nettoyage traitement

    async def process(self, data: Any) -> Any:
        """Traitement des données"""
        # TODO: Implémenter le traitement
        return data

# Instance globale
addon = {name}ProcessingAddon()
''',
            AddonType.MODEL: '''"""
{name} - Model Add-on
"""

import asyncio
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class {name}ModelAddon:
    """Add-on de modèle IA"""

    def __init__(self):
        self.name = "{name}"
        self.logger = logger
        self.model = None

    async def initialize(self, context: Dict[str, Any]):
        """Initialisation de l'add-on"""
        self.logger.info(f"Initialisation du modèle {{self.name}}")
        # TODO: Chargement du modèle

    async def cleanup(self):
        """Nettoyage de l'add-on"""
        self.logger.info(f"Nettoyage du modèle {{self.name}}")
        # TODO: Déchargement du modèle

    async def generate(self, prompt: str, **kwargs) -> Any:
        """Génération avec le modèle"""
        # TODO: Implémenter la génération
        return f"Generated content for: {{prompt}}"

# Instance globale
addon = {name}ModelAddon()
''',
            AddonType.EXPORT: '''"""
{name} - Export Add-on
"""

import asyncio
import logging
from typing import Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

class {name}ExportAddon:
    """Add-on d'export personnalisé"""

    def __init__(self):
        self.name = "{name}"
        self.logger = logger

    async def initialize(self, context: Dict[str, Any]):
        """Initialisation de l'add-on"""
        self.logger.info(f"Initialisation de l'add-on d'export {{self.name}}")
        # TODO: Initialisation export

    async def cleanup(self):
        """Nettoyage de l'add-on"""
        self.logger.info(f"Nettoyage de l'add-on d'export {{self.name}}")
        # TODO: Nettoyage export

    async def export(self, data: Any, output_path: Path, **kwargs) -> bool:
        """Export des données"""
        try:
            # TODO: Implémenter l'export
            self.logger.info(f"Export vers {{output_path}}")
            return True
        except Exception as e:
            self.logger.error(f"Erreur lors de l'export: {{e}}")
            return False

# Instance globale
addon = {name}ExportAddon()
''',
        }

        template = templates.get(addon_type, "# TODO: Implémenter l'add-on")
        return template.format(name=name)


async def main():
    """Fonction principale"""
    cli = AddonCLI()
    await cli.initialize()

    parser = cli.create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    try:
        await cli.run_command(args)
    except KeyboardInterrupt:
        print("\n⚠️  Interruption utilisateur")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        logging.exception("Erreur lors de l'exécution de la commande")


if __name__ == "__main__":
    asyncio.run(main())
