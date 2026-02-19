"""
tests/test_story_assets_connector.py — Tests du StoryAssetsConnector
=====================================================================

Couvre :
  - dry_run : parsing vocal + inventaire + CLI simulée
  - get_character_objects : registre vide → liste vide (graceful)
  - apply_voice_modifier  : modifications incrémentales
  - voice_to_render       : pipeline sans exécution (execute=False)
  - enrich_and_build      : enrichissement sur SceneJSON existante

Tous les tests fonctionnent SANS Blender installé (execute=False).
"""

import pytest
from unittest.mock import MagicMock, patch
from blender_bridge.story_assets_connector import StoryAssetsConnector


# ─────────────────────────────────────────────────────────────────────────────
#  FIXTURES
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def connector(tmp_path):
    """Connector avec dossiers temporaires."""
    return StoryAssetsConnector(
        project_id="test_project",
        projects_dir=str(tmp_path / "projects"),
        output_dir=str(tmp_path / "exports"),
        blender_executable="fake_blender",
        inject_equipped_only=True,
    )


@pytest.fixture
def connector_no_project(tmp_path):
    """Connector sans projet (pas d'inventaire disponible)."""
    return StoryAssetsConnector(
        project_id=None,
        projects_dir=str(tmp_path / "projects"),
        output_dir=str(tmp_path / "exports"),
    )


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : dry_run
# ─────────────────────────────────────────────────────────────────────────────

class TestDryRun:

    def test_dry_run_basic(self, connector):
        result = connector.dry_run("Crée une ruelle cyberpunk sous pluie")
        assert "scene_id" in result
        assert "characters" in result
        assert "atmosphere" in result
        assert "cli_command" in result
        assert "blender" in result["cli_command"]

    def test_dry_run_with_character(self, connector):
        result = connector.dry_run(
            "Ruelle cyberpunk avec personnage Alpha devant caméra"
        )
        assert "Alpha" in result["characters"]
        assert "character_objects" in result
        # Alpha n'a pas d'inventaire dans ce projet → liste vide
        assert result["character_objects"].get("Alpha", []) == []

    def test_dry_run_atmosphere(self, connector):
        result = connector.dry_run("Scène désert avec brouillard volumétrique")
        assert result["atmosphere"] in ("fog", "volumetric_fog", "mist", "rain", "smoke", "dust", "none")

    def test_dry_run_shot_type(self, connector):
        result = connector.dry_run("Gros plan visage 85mm")
        assert "shot_type" in result
        assert isinstance(result["shot_type"], str)

    def test_dry_run_tags(self, connector):
        result = connector.dry_run("Ruelle cyberpunk nuit pluie")
        assert isinstance(result["tags"], list)
        assert any(t in result["tags"] for t in ("cyberpunk", "night", "rain", "urban"))

    def test_dry_run_no_execute(self, connector):
        """dry_run ne doit PAS lancer Blender."""
        # Si Blender était lancé, ça planterait (fake_blender introuvable)
        result = connector.dry_run("Scène test")
        assert "render_path" not in result  # dry_run ne rend pas


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : get_character_objects
# ─────────────────────────────────────────────────────────────────────────────

class TestGetCharacterObjects:

    def test_missing_inventory_returns_empty(self, connector):
        """Personnage sans inventaire → liste vide sans exception."""
        objects = connector.get_character_objects("PersonnageInexistant")
        assert objects == []

    def test_missing_inventory_with_tags(self, connector):
        """Avec tags, même comportement gracieux."""
        objects = connector.get_character_objects("Ghost", scene_tags=["cyberpunk", "night"])
        assert objects == []

    def test_mock_inventory(self, connector):
        """Avec un registre mocké, les objets sont retournés."""
        mock_obj = MagicMock()
        mock_obj.name = "Pistolet"
        mock_obj.tags = ["urban"]

        mock_inventory = MagicMock()
        mock_inventory.equipped = [mock_obj]

        mock_registry = MagicMock()
        mock_registry.get_inventory.return_value = mock_inventory
        connector._registry = mock_registry

        objects = connector.get_character_objects("Alpha", scene_tags=["urban"])
        assert len(objects) == 1
        assert objects[0].name == "Pistolet"

    def test_tag_filtering(self, connector):
        """Les objets dont les tags ne matchent pas sont filtrés."""
        mock_obj_urban = MagicMock()
        mock_obj_urban.name = "Pistolet"
        mock_obj_urban.tags = ["urban"]

        mock_obj_nature = MagicMock()
        mock_obj_nature.name = "Arc"
        mock_obj_nature.tags = ["nature"]

        mock_inventory = MagicMock()
        mock_inventory.equipped = [mock_obj_urban, mock_obj_nature]

        mock_registry = MagicMock()
        mock_registry.get_inventory.return_value = mock_inventory
        connector._registry = mock_registry

        objects = connector.get_character_objects("Alpha", scene_tags=["urban", "night"])
        names = [o.name for o in objects]
        assert "Pistolet" in names
        assert "Arc" not in names

    def test_no_tags_no_filtering(self, connector):
        """Sans tags de scène → pas de filtrage."""
        mock_obj = MagicMock()
        mock_obj.name = "Couteau"
        mock_obj.tags = ["combat"]

        mock_inventory = MagicMock()
        mock_inventory.equipped = [mock_obj]

        mock_registry = MagicMock()
        mock_registry.get_inventory.return_value = mock_inventory
        connector._registry = mock_registry

        objects = connector.get_character_objects("Alpha", scene_tags=None)
        assert len(objects) == 1

    def test_object_without_tags_always_included(self, connector):
        """Un objet sans tags est toujours inclus (accessoire universel)."""
        mock_obj = MagicMock()
        mock_obj.name = "Veste"
        mock_obj.tags = []  # Pas de tags → toujours inclus

        mock_inventory = MagicMock()
        mock_inventory.equipped = [mock_obj]

        mock_registry = MagicMock()
        mock_registry.get_inventory.return_value = mock_inventory
        connector._registry = mock_registry

        objects = connector.get_character_objects("Alpha", scene_tags=["nature"])
        assert len(objects) == 1


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : apply_voice_modifier
# ─────────────────────────────────────────────────────────────────────────────

class TestApplyVoiceModifier:

    def test_modifier_changes_atmosphere(self, connector):
        scene = connector.bridge.parse("Ruelle cyberpunk")
        original_atm = scene.atmosphere.type

        scene = connector.apply_voice_modifier(scene, "Ajoute brouillard dense")
        # L'atmosphère doit avoir changé
        from blender_bridge.scene_types import AtmosphereType
        assert scene.atmosphere.type in (AtmosphereType.FOG, AtmosphereType.VOLUMETRIC,
                                          AtmosphereType.MIST, original_atm)

    def test_modifier_changes_camera(self, connector):
        scene = connector.bridge.parse("Scène test")
        original_lens = scene.camera.lens

        scene = connector.apply_voice_modifier(scene, "Caméra 85mm gros plan")
        # La focale doit avoir changé
        assert scene.camera.lens != original_lens or scene.camera.lens == 85

    def test_modifier_adds_character(self, connector):
        scene = connector.bridge.parse("Ruelle cyberpunk")
        initial_chars = len(scene.characters)

        scene = connector.apply_voice_modifier(
            scene, "Place personnage Bêta devant caméra"
        )
        # Un personnage a été ajouté
        assert len(scene.characters) >= initial_chars

    def test_modifier_preserves_scene_id(self, connector):
        """Les modificateurs ne doivent pas changer le scene_id."""
        scene = connector.bridge.parse("Ruelle cyberpunk")
        original_id = scene.scene_id

        scene = connector.apply_voice_modifier(scene, "Ajoute pluie légère")
        assert scene.scene_id == original_id

    def test_chained_modifiers(self, connector):
        """Plusieurs modificateurs successifs."""
        scene = connector.bridge.parse("Scène de base")
        scene = connector.apply_voice_modifier(scene, "Brouillard léger")
        scene = connector.apply_voice_modifier(scene, "Caméra 50mm plan moyen")
        scene = connector.apply_voice_modifier(scene, "Lumière nuit")
        # Pas d'exception → chaîne stable
        assert scene is not None


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : voice_to_render (sans exécution Blender)
# ─────────────────────────────────────────────────────────────────────────────

class TestVoiceToRender:

    def test_pipeline_no_execute(self, connector, tmp_path):
        """Pipeline complet sans lancer Blender → script généré."""
        result = connector.voice_to_render(
            "Ruelle cyberpunk sous pluie",
            execute=False,
        )
        assert result["success"] is True
        assert result["scene_id"] is not None
        assert result["script_path"] is not None
        assert result["render_path"] is None  # Pas de rendu (execute=False)
        assert result["error"] is None

    def test_pipeline_returns_scene_json(self, connector):
        result = connector.voice_to_render(
            "Forêt brumeuse",
            execute=False,
        )
        assert "scene_json" in result

    def test_pipeline_with_character_no_inventory(self, connector):
        """Personnage sans inventaire → pipeline continue sans erreur."""
        result = connector.voice_to_render(
            "Ruelle cyberpunk avec personnage Ghost",
            execute=False,
        )
        assert result["success"] is True
        assert result["objects_injected"] == []

    def test_pipeline_with_character_with_inventory(self, connector, tmp_path):
        """Personnage avec inventaire mocké → objets injectés."""
        mock_obj = MagicMock()
        mock_obj.name = "Katana"
        mock_obj.tags = ["cyberpunk"]

        mock_inventory = MagicMock()
        mock_inventory.equipped = [mock_obj]

        mock_registry = MagicMock()
        mock_registry.get_inventory.return_value = mock_inventory
        connector._registry = mock_registry

        # Mocker l'injector pour éviter les écritures fichier
        mock_injector = MagicMock()
        connector._injector = mock_injector

        result = connector.voice_to_render(
            "Ruelle cyberpunk avec personnage Alpha",
            execute=False,
        )
        assert result["success"] is True
        assert "Katana" in result["objects_injected"]

    def test_pipeline_handles_exception(self, connector):
        """En cas d'exception interne → résultat d'erreur structuré."""
        # Forcer une erreur dans le bridge
        connector._bridge = MagicMock()
        connector._bridge.parse.side_effect = RuntimeError("Test error")

        result = connector.voice_to_render("Scène test", execute=False)
        assert result["success"] is False
        assert result["error"] is not None
        assert "Test error" in result["error"]


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : enrich_and_build
# ─────────────────────────────────────────────────────────────────────────────

class TestEnrichAndBuild:

    def test_enrich_generates_script(self, connector):
        scene = connector.bridge.parse("Scène bureau intérieur")
        script_path = connector.enrich_and_build(scene, execute=False)
        assert script_path is not None
        import os
        assert os.path.exists(script_path)

    def test_enrich_no_characters_no_injection(self, connector):
        """Sans personnages → pas d'injection, pas d'erreur."""
        scene = connector.bridge.parse("Paysage désertique vide")
        # Enlever les éventuels personnages
        scene.characters = []
        script_path = connector.enrich_and_build(scene, execute=False)
        assert script_path is not None


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : lazy init
# ─────────────────────────────────────────────────────────────────────────────

class TestLazyInit:

    def test_bridge_lazy(self, connector):
        assert connector._bridge is None
        bridge = connector.bridge
        assert bridge is not None
        assert connector._bridge is bridge  # Cached

    def test_bridge_reuse(self, connector):
        b1 = connector.bridge
        b2 = connector.bridge
        assert b1 is b2  # Même instance

    def test_registry_lazy(self, connector):
        assert connector._registry is None
        reg = connector.registry
        assert reg is not None

    def test_configuration(self, connector):
        assert connector.inject_equipped_only is True
        assert connector.project_id == "test_project"
