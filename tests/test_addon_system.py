"""
Tests unitaires pour le système d'add-ons StoryCore
"""

import asyncio
import json
import tempfile
import pytest
from pathlib import Path
from unittest.mock import Mock, patch

from src.addon_manager import AddonManager, AddonType, AddonManifest
from src.addon_validator import AddonValidator, ValidationSeverity
from src.addon_permissions import PermissionManager, PermissionLevel, PermissionScope
from src.addon_hooks import HookManager, HookPriority
from src.addon_events import EventBus, EventScope, EventPriority


class TestAddonManager:
    """Tests pour AddonManager"""

    def setup_method(self):
        """Configuration avant chaque test"""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.manager = AddonManager(self.temp_dir)

    def teardown_method(self):
        """Nettoyage après chaque test"""
        # Supprimer le répertoire temporaire
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_initialization(self):
        """Test d'initialisation du gestionnaire"""
        assert self.manager.addons_path == self.temp_dir / "addons"
        assert self.manager.addons == {}
        assert self.manager.stats["discovered"] == 0

    def test_manifest_parsing(self):
        """Test du parsing du manifest"""
        manifest_data = {
            "name": "test_addon",
            "version": "1.0.0",
            "type": "workflow_addon",
            "author": "Test Author",
            "description": "Test addon"
        }

        # Créer un fichier manifest temporaire
        addon_dir = self.temp_dir / "addons" / "community" / "test_addon"
        addon_dir.mkdir(parents=True)
        manifest_file = addon_dir / "addon.json"

        with open(manifest_file, 'w') as f:
            json.dump(manifest_data, f)

        # Tester le parsing
        manifest = asyncio.run(self.manager.load_addon_manifest(addon_dir))

        assert manifest is not None
        assert manifest.name == "test_addon"
        assert manifest.version == "1.0.0"
        assert manifest.type == AddonType.WORKFLOW
        assert manifest.author == "Test Author"


class TestAddonValidator:
    """Tests pour AddonValidator"""

    def setup_method(self):
        self.validator = AddonValidator()

    def test_manifest_validation_valid(self):
        """Test de validation d'un manifest valide"""
        manifest = AddonManifest(
            name="valid_addon",
            version="1.0.0",
            type=AddonType.WORKFLOW,
            author="Test Author",
            description="A valid addon description that is long enough",
            compatibility={},
            permissions=["model_access"],
            entry_points={"main": "src/main.py"},
            dependencies={},
            metadata={}
        )

        issues = asyncio.run(self.validator._validate_manifest(manifest, Path("/tmp")))

        # Devrait n'avoir que des warnings/info, pas d'erreurs
        errors = [i for i in issues if i.severity == ValidationSeverity.ERROR]
        assert len(errors) == 0

    def test_manifest_validation_invalid_name(self):
        """Test de validation d'un nom invalide"""
        manifest = AddonManifest(
            name="Invalid Name",  # Majuscules et espaces non autorisés
            version="1.0.0",
            type=AddonType.WORKFLOW,
            author="Test Author",
            description="Valid description",
            compatibility={},
            permissions=[],
            entry_points={},
            dependencies={},
            metadata={}
        )

        issues = asyncio.run(self.validator._validate_manifest(manifest, Path("/tmp")))

        errors = [i for i in issues if i.severity == ValidationSeverity.ERROR]
        assert len(errors) > 0
        assert "nom d'add-on invalide" in errors[0].message.lower()


class TestPermissionManager:
    """Tests pour PermissionManager"""

    def setup_method(self):
        self.pm = PermissionManager()

    def test_permission_request_auto_grant(self):
        """Test d'octroi automatique de permission"""
        from src.addon_permissions import PermissionRequest

        request = self.pm.create_permission_request(
            addon_name="test_addon",
            permission="file_system_read",
            level=PermissionLevel.READ,
            scope=PermissionScope.PROJECT
        )

        grant = asyncio.run(self.pm.request_permission(request))

        assert grant.granted == True
        assert grant.granted_by == "auto"

    def test_permission_request_deny_high_risk(self):
        """Test de refus automatique pour permissions haute risque"""
        from src.addon_permissions import PermissionRequest

        request = self.pm.create_permission_request(
            addon_name="test_addon",
            permission="network_access",
            level=PermissionLevel.EXECUTE,
            scope=PermissionScope.SESSION
        )

        grant = asyncio.run(self.pm.request_permission(request))

        assert grant.granted == False
        assert grant.granted_by == "system"


class TestHookManager:
    """Tests pour HookManager"""

    def setup_method(self):
        self.hm = HookManager()

    def test_hook_registration(self):
        """Test d'enregistrement de hook"""
        async def dummy_callback():
            return "test"

        success = self.hm.register_hook(
            addon_name="test_addon",
            hook_name="test_hook",
            callback=dummy_callback,
            priority=HookPriority.NORMAL
        )

        assert success == True
        assert "test_hook" in self.hm.hooks
        assert len(self.hm.hooks["test_hook"]) == 1

    def test_hook_execution(self):
        """Test d'exécution de hooks"""
        results = []

        async def test_callback(value):
            results.append(f"processed_{value}")
            return f"processed_{value}"

        self.hm.register_hook(
            addon_name="test_addon",
            hook_name="content_filter",
            callback=test_callback
        )

        result = asyncio.run(self.hm.execute_hook_with_filter("content_filter", "input"))

        assert result == "processed_input"
        assert len(results) == 1


class TestEventBus:
    """Tests pour EventBus"""

    def setup_method(self):
        self.bus = EventBus()

    def test_event_subscription(self):
        """Test d'abonnement aux événements"""
        async def dummy_handler(event):
            pass

        subscription_id = self.bus.subscribe(
            addon_name="test_addon",
            event_pattern="test.*",
            callback=dummy_handler
        )

        assert subscription_id is not None
        assert "test.*" in self.bus.subscriptions
        assert len(self.bus.subscriptions["test.*"]) == 1

    def test_event_publishing(self):
        """Test de publication d'événement"""
        received_events = []

        async def event_handler(event):
            received_events.append(event)

        self.bus.subscribe(
            addon_name="test_addon",
            event_pattern="test_event",
            callback=event_handler
        )

        event = self.bus.create_event(
            name="test_event",
            source="test_source",
            data={"key": "value"}
        )

        asyncio.run(self.bus.start())
        asyncio.run(self.bus.publish(event))

        # Attendre un peu que l'événement soit traité
        asyncio.run(asyncio.sleep(0.1))
        asyncio.run(self.bus.stop())

        assert len(received_events) == 1
        assert received_events[0].name == "test_event"


class TestAddonIntegration:
    """Tests d'intégration du système d'add-ons"""

    def setup_method(self):
        self.temp_dir = Path(tempfile.mkdtemp())
        self.manager = AddonManager(self.temp_dir)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_full_addon_lifecycle(self):
        """Test du cycle de vie complet d'un add-on"""
        # Créer un add-on de test
        addon_dir = self.temp_dir / "addons" / "community" / "test_addon"
        addon_dir.mkdir(parents=True)

        # Créer le manifest
        manifest_data = {
            "name": "test_addon",
            "version": "1.0.0",
            "type": "workflow_addon",
            "author": "Test Author",
            "description": "Test addon for integration testing"
        }

        with open(addon_dir / "addon.json", 'w') as f:
            json.dump(manifest_data, f)

        # Créer le fichier main.py
        main_content = '''
class TestAddon:
    def __init__(self):
        self.name = "test_addon"

    async def initialize(self, context):
        self.logger = context.get('logger')
        return True

    async def cleanup(self):
        return True

addon = TestAddon()
'''
        (addon_dir / "src").mkdir()
        with open(addon_dir / "src" / "main.py", 'w') as f:
            f.write(main_content)

        # Tester le chargement
        addon_info = asyncio.run(self.manager.load_addon(addon_dir))

        assert addon_info is not None
        assert addon_info.manifest.name == "test_addon"
        assert addon_info.state.name == "DISABLED"

        # Tester l'activation
        success = asyncio.run(self.manager.enable_addon("test_addon"))
        assert success == True

        # Vérifier l'état
        info = self.manager.get_addon_info("test_addon")
        assert info.state.name == "ENABLED"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
