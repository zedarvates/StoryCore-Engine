"""
tests/test_story_assets.py — Tests unitaires du module story_assets
=====================================================================

Couvre :
  - StoryObject (création, sérialisation, propriétés)
  - CharacterInventory (ajout, équipement, persistance)
  - StoryObjectRegistry (CRUD, recherche, inventaires)
  - StoryAssetBuilder (génération scripts Blender)
  - SceneObjectInjector (injection dans scripts de scène)

Tous les tests fonctionnent SANS Blender installé.
"""

import json
import math
import tempfile
import shutil
from pathlib import Path
import pytest

from story_assets import (
    StoryObject,
    CharacterInventory,
    StoryObjectRegistry,
    StoryAssetBuilder,
    SceneObjectInjector,
    OBJECT_TYPES,
    MATERIAL_PRESETS,
    INVENTORY_SLOTS,
)


# ─────────────────────────────────────────────────────────────────────────────
#  FIXTURES
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def tmp_dir(tmp_path):
    """Répertoire temporaire pour chaque test."""
    return tmp_path


@pytest.fixture
def epee():
    """StoryObject de base pour les tests."""
    return StoryObject(
        id="epee_alpha_001",
        name="Épée d'Alpha",
        object_type="weapon",
        owner="Alpha",
        material="metal_rusty",
        description="Lame brisée, gravée d'un symbole inconnu",
        tags=["cyberpunk", "weapon", "rusty"],
        narrative_context="Acte 1 - Ruelle nocturne",
    )


@pytest.fixture
def manteau():
    return StoryObject(
        id="manteau_alpha_001",
        name="Manteau de Combat",
        object_type="armor",
        owner="Alpha",
        material="matte_black",
        tags=["cyberpunk", "armor"],
    )


@pytest.fixture
def implant():
    return StoryObject(
        id="implant_001",
        name="Implant Optique",
        object_type="device",
        owner="Alpha",
        material="glowing_blue",
        color_override=(0.2, 0.5, 1.0),
        scale=(0.4, 0.4, 0.4),
        tags=["cyberpunk", "tech", "glowing"],
    )


@pytest.fixture
def registry(tmp_dir):
    return StoryObjectRegistry(project_id="test_project", projects_dir=str(tmp_dir))


@pytest.fixture
def inventory(epee, manteau):
    inv = CharacterInventory("Alpha", project_id="test_project")
    inv.add(epee, slot="main_hand")
    inv.add(manteau, slot="chest")
    return inv


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : StoryObject
# ─────────────────────────────────────────────────────────────────────────────

class TestStoryObject:

    def test_creation_defaults(self):
        obj = StoryObject(name="Objet test")
        assert obj.id.startswith("obj_")
        assert obj.object_type == "misc"
        assert obj.material == "metal_shiny"
        assert obj.scale == (1.0, 1.0, 1.0)
        assert obj.tags == []
        assert obj.owner is None

    def test_creation_with_params(self, epee):
        assert epee.id == "epee_alpha_001"
        assert epee.name == "Épée d'Alpha"
        assert epee.object_type == "weapon"
        assert epee.owner == "Alpha"
        assert epee.material == "metal_rusty"
        assert "cyberpunk" in epee.tags

    def test_geometry_type(self, epee):
        assert epee.geometry_type == "blade"

    def test_geometry_type_fallback(self):
        obj = StoryObject(object_type="misc")
        assert obj.geometry_type == "box"

    def test_material_preset_returns_dict(self, epee):
        preset = epee.material_preset
        assert "base_color" in preset
        assert "metallic" in preset
        assert "roughness" in preset

    def test_color_override_applied(self, implant):
        preset = implant.material_preset
        assert preset["base_color"][0] == pytest.approx(0.2)
        assert preset["base_color"][1] == pytest.approx(0.5)
        assert preset["base_color"][2] == pytest.approx(1.0)

    def test_blender_object_name_clean(self, epee):
        name = epee.blender_object_name
        import re
        assert re.match(r"^[a-zA-Z0-9_]+$", name)
        assert len(name) <= 63

    def test_to_dict(self, epee):
        d = epee.to_dict()
        assert d["id"] == "epee_alpha_001"
        assert d["name"] == "Épée d'Alpha"
        assert d["object_type"] == "weapon"
        assert d["owner"] == "Alpha"
        assert d["material"] == "metal_rusty"
        assert "tags" in d
        assert "scale" in d

    def test_to_json_and_back(self, epee):
        json_str = epee.to_json()
        loaded = StoryObject.from_json(json_str)
        assert loaded.id == epee.id
        assert loaded.name == epee.name
        assert loaded.object_type == epee.object_type
        assert loaded.owner == epee.owner
        assert loaded.tags == epee.tags

    def test_from_dict(self, epee):
        d = epee.to_dict()
        loaded = StoryObject.from_dict(d)
        assert loaded.id == epee.id
        assert loaded.scale == epee.scale

    def test_color_override_roundtrip(self, implant):
        d = implant.to_dict()
        loaded = StoryObject.from_dict(d)
        assert loaded.color_override == implant.color_override

    def test_save_and_load_from_file(self, epee, tmp_dir):
        path = epee.save(str(tmp_dir))
        assert Path(path).exists()
        loaded = StoryObject.from_file(path)
        assert loaded.id == epee.id
        assert loaded.name == epee.name

    def test_repr(self, epee):
        r = repr(epee)
        assert "epee_alpha_001" in r
        assert "weapon" in r
        assert "Alpha" in r

    def test_all_object_types_have_geometry(self):
        for obj_type in OBJECT_TYPES:
            obj = StoryObject(object_type=obj_type)
            assert obj.geometry_type  # non vide

    def test_all_material_presets_valid(self):
        for mat_name in MATERIAL_PRESETS:
            obj = StoryObject(material=mat_name)
            preset = obj.material_preset
            assert "base_color" in preset
            assert len(preset["base_color"]) == 4


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : CharacterInventory
# ─────────────────────────────────────────────────────────────────────────────

class TestCharacterInventory:

    def test_creation_empty(self):
        inv = CharacterInventory("Beta")
        assert inv.character_name == "Beta"
        assert inv.item_count == 0
        assert inv.equipped == []

    def test_add_sets_owner(self, epee):
        inv = CharacterInventory("Beta")
        inv.add(epee)
        assert epee.owner == "Beta"
        assert inv.has_item("epee_alpha_001")

    def test_add_with_slot(self, epee):
        inv = CharacterInventory("Alpha")
        inv.add(epee, slot="main_hand")
        assert "main_hand" in inv.equipped_slots
        assert inv.equipped_slots["main_hand"] == "epee_alpha_001"

    def test_add_no_duplicate(self, epee):
        inv = CharacterInventory("Alpha")
        inv.add(epee)
        inv.add(epee)
        assert inv.item_count == 1

    def test_remove(self, inventory, epee):
        assert inventory.has_item("epee_alpha_001")
        result = inventory.remove("epee_alpha_001")
        assert result is True
        assert not inventory.has_item("epee_alpha_001")

    def test_remove_unequips_slot(self, inventory):
        inventory.remove("epee_alpha_001")
        assert "main_hand" not in inventory.equipped_slots

    def test_remove_nonexistent(self, inventory):
        result = inventory.remove("nonexistent_id")
        assert result is False

    def test_equip(self, inventory, implant):
        inventory.add(implant)
        result = inventory.equip("implant_001", "accessory_1")
        assert result is True
        assert inventory.equipped_slots.get("accessory_1") == "implant_001"

    def test_equip_invalid_slot(self, inventory, epee):
        result = inventory.equip("epee_alpha_001", "invalid_slot")
        assert result is False

    def test_unequip(self, inventory):
        obj = inventory.unequip("main_hand")
        assert obj is not None
        assert obj.id == "epee_alpha_001"
        assert "main_hand" not in inventory.equipped_slots

    def test_equipped_property(self, inventory):
        equipped = inventory.equipped
        ids = [o.id for o in equipped]
        assert "epee_alpha_001" in ids
        assert "manteau_alpha_001" in ids

    def test_unequipped_property(self, inventory, implant):
        inventory.add(implant)  # pas de slot → dans le sac
        unequipped = inventory.unequipped
        assert any(o.id == "implant_001" for o in unequipped)

    def test_weapons_property(self, inventory):
        weapons = inventory.weapons
        assert any(w.id == "epee_alpha_001" for w in weapons)

    def test_find_by_name(self, inventory):
        obj = inventory.find_by_name("épée d'alpha")
        assert obj is not None
        assert obj.id == "epee_alpha_001"

    def test_find_by_type(self, inventory):
        weapons = inventory.find_by_type("weapon")
        assert len(weapons) == 1

    def test_find_by_tags(self, inventory):
        tagged = inventory.find_by_tags(["cyberpunk"])
        assert len(tagged) >= 1

    def test_to_dict_and_back(self, inventory):
        d = inventory.to_dict()
        loaded = CharacterInventory.from_dict(d)
        assert loaded.character_name == "Alpha"
        assert loaded.item_count == inventory.item_count
        assert loaded.equipped_slots == inventory.equipped_slots

    def test_save_and_load(self, inventory, tmp_dir):
        path = inventory.save(str(tmp_dir))
        assert Path(path).exists()
        loaded = CharacterInventory.load(
            "Alpha", project_id="test_project", projects_dir=str(tmp_dir)
        )
        assert loaded.item_count == inventory.item_count

    def test_load_missing_returns_empty(self, tmp_dir):
        inv = CharacterInventory.load(
            "Unknown", project_id="nonexistent", projects_dir=str(tmp_dir)
        )
        assert inv.item_count == 0

    def test_summary(self, inventory):
        s = inventory.summary()
        assert "Alpha" in s
        assert "main_hand" in s

    def test_repr(self, inventory):
        r = repr(inventory)
        assert "Alpha" in r
        assert "2 items" in r


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : StoryObjectRegistry
# ─────────────────────────────────────────────────────────────────────────────

class TestStoryObjectRegistry:

    def test_empty_registry(self, registry):
        assert len(registry) == 0
        assert registry.all_objects() == []

    def test_register(self, registry, epee):
        registry.register(epee)
        assert len(registry) == 1

    def test_register_sets_project_id(self, registry, epee):
        registry.register(epee)
        assert epee.project_id == "test_project"

    def test_get_by_id(self, registry, epee):
        registry.register(epee)
        obj = registry.get("epee_alpha_001")
        assert obj is not None
        assert obj.name == "Épée d'Alpha"

    def test_get_nonexistent(self, registry):
        assert registry.get("fake_id") is None

    def test_get_or_raise(self, registry, epee):
        registry.register(epee)
        obj = registry.get_or_raise("epee_alpha_001")
        assert obj.id == "epee_alpha_001"

    def test_get_or_raise_missing(self, registry):
        with pytest.raises(ValueError, match="introuvable"):
            registry.get_or_raise("nonexistent")

    def test_delete(self, registry, epee):
        registry.register(epee)
        result = registry.delete("epee_alpha_001")
        assert result is True
        assert len(registry) == 0

    def test_delete_nonexistent(self, registry):
        result = registry.delete("fake")
        assert result is False

    def test_find_by_owner(self, registry, epee, manteau):
        registry.register(epee)
        registry.register(manteau)
        items = registry.find_by_owner("Alpha")
        assert len(items) == 2

    def test_find_by_type(self, registry, epee, manteau):
        registry.register(epee)
        registry.register(manteau)
        weapons = registry.find_by_type("weapon")
        assert len(weapons) == 1
        assert weapons[0].id == "epee_alpha_001"

    def test_find_by_tags(self, registry, epee, implant):
        registry.register(epee)
        registry.register(implant)
        results = registry.find_by_tags(["cyberpunk"])
        assert len(results) == 2

    def test_find_by_name(self, registry, epee):
        registry.register(epee)
        obj = registry.find_by_name("épée d'alpha")
        assert obj is not None

    def test_search(self, registry, epee, manteau):
        registry.register(epee)
        registry.register(manteau)
        results = registry.search("epee")
        assert len(results) >= 1

    def test_get_inventory(self, registry, epee, manteau):
        registry.register(epee)
        registry.register(manteau)
        inv = registry.get_inventory("Alpha")
        assert inv.character_name == "Alpha"
        assert inv.item_count == 2

    def test_all_characters(self, registry, epee):
        lanterne = StoryObject(id="lanterne_beta", name="Lanterne", owner="Beta",
                               object_type="lantern")
        registry.register(epee)
        registry.register(lanterne)
        chars = registry.all_characters()
        assert "Alpha" in chars
        assert "Beta" in chars

    def test_objects_in_scene_by_tags(self, registry, epee, implant):
        registry.register(epee)
        registry.register(implant)
        results = registry.objects_in_scene(["cyberpunk"])
        assert len(results) == 2

    def test_objects_in_scene_no_tags(self, registry, epee):
        registry.register(epee)
        results = registry.objects_in_scene()
        assert len(results) == 1

    def test_persistence_reload(self, registry, epee, tmp_dir):
        registry.register(epee)
        # Créer un nouveau registre (recharge depuis disque)
        registry2 = StoryObjectRegistry(project_id="test_project", projects_dir=str(tmp_dir))
        assert len(registry2) == 1
        loaded = registry2.get("epee_alpha_001")
        assert loaded is not None
        assert loaded.name == "Épée d'Alpha"

    def test_export_manifest(self, registry, epee, tmp_dir):
        registry.register(epee)
        path = registry.export_manifest()
        assert Path(path).exists()
        with open(path) as f:
            data = json.load(f)
        assert data["total_objects"] == 1
        assert "Alpha" in data["characters"]

    def test_repr(self, registry):
        r = repr(registry)
        assert "test_project" in r


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : StoryAssetBuilder
# ─────────────────────────────────────────────────────────────────────────────

class TestStoryAssetBuilder:

    def test_build_script_creates_file(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        script_path = builder.build_script(epee, render_preview=False)
        assert Path(script_path).exists()

    def test_script_contains_object_name(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        path = builder.build_script(epee, render_preview=False)
        content = Path(path).read_text(encoding="utf-8")
        # Le nom de l'objet ou son ID doit apparaître
        assert "epee" in content.lower() or "alpha" in content.lower()

    def test_script_contains_bpy(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        path = builder.build_script(epee, render_preview=False)
        content = Path(path).read_text(encoding="utf-8")
        assert "import bpy" in content

    def test_script_contains_material(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        path = builder.build_script(epee, render_preview=False)
        content = Path(path).read_text(encoding="utf-8")
        assert "Principled BSDF" in content
        assert "Metallic" in content

    def test_script_contains_render_when_enabled(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        path = builder.build_script(epee, render_preview=True)
        content = Path(path).read_text(encoding="utf-8")
        assert "render.render" in content

    def test_script_no_render_when_disabled(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        path = builder.build_script(epee, render_preview=False)
        content = Path(path).read_text(encoding="utf-8")
        assert "render.render" not in content

    def test_script_updates_object_path(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        builder.build_script(epee, render_preview=False)
        assert epee.blender_script_path is not None

    def test_script_completion_marker(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        path = builder.build_script(epee, render_preview=False)
        content = Path(path).read_text(encoding="utf-8")
        assert "STORYCORE_ASSET_COMPLETE" in content

    def test_build_inventory_scripts(self, inventory, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        scripts = builder.build_inventory_scripts(inventory)
        assert len(scripts) == inventory.item_count
        for s in scripts:
            assert Path(s).exists()

    def test_embed_code_contains_function(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        code = builder.build_scene_embed_code(epee, position=(1.0, 0.0, 0.8))
        assert "def create_story_object_" in code
        assert "bpy" in code

    def test_embed_code_with_parent_rig(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        code = builder.build_scene_embed_code(epee, parent_rig_name="Alpha_Rig")
        assert "Alpha_Rig" in code

    def test_embed_code_position(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        code = builder.build_scene_embed_code(epee, position=(1.5, -2.0, 0.9))
        assert "1.5" in code
        assert "-2.0" in code

    def test_all_geometry_types_generate_code(self, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        geom_types = list(builder._geometry_code.__func__.__code__.co_consts
                          if False else ["blade", "cylinder", "box", "sphere",
                                         "disc", "gem", "lantern", "book",
                                         "bottle", "flat_plane", "scroll",
                                         "gun_body", "key_shape"])
        for geom in geom_types:
            obj = StoryObject(id=f"test_{geom}", name=f"Test {geom}",
                              object_type="misc", material="metal_shiny")
            lines = builder._geometry_code(geom, "test_obj", (1.0, 1.0, 1.0))
            assert len(lines) > 0

    def test_glowing_material_has_emission(self, implant, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        path = builder.build_script(implant, render_preview=False)
        content = Path(path).read_text(encoding="utf-8")
        assert "Emission" in content

    def test_script_exists_after_build(self, epee, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        builder.build_script(epee, render_preview=False)
        assert builder.script_exists(epee)

    def test_get_all_scripts(self, epee, manteau, tmp_dir):
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        builder.build_script(epee, render_preview=False)
        builder.build_script(manteau, render_preview=False)
        scripts = builder.get_all_scripts()
        assert len(scripts) == 2


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : SceneObjectInjector
# ─────────────────────────────────────────────────────────────────────────────

class TestSceneObjectInjector:

    def _make_scene_script(self, tmp_dir: Path) -> str:
        """Crée un faux script de scène Blender pour les tests."""
        script = tmp_dir / "scene_test.py"
        script.write_text(
            "import bpy\n"
            "bpy.ops.object.select_all(action='SELECT')\n"
            "bpy.ops.object.delete()\n"
            "scene = bpy.context.scene\n"
            "scene.render.filepath = '/tmp/render'\n"
            "bpy.ops.render.render(write_still=True)\n"
            "print('STORYCORE_RENDER_COMPLETE:/tmp/render.png')\n",
            encoding="utf-8",
        )
        return str(script)

    def test_inject_into_script(self, epee, tmp_dir):
        script_path = self._make_scene_script(tmp_dir)
        injector = SceneObjectInjector()
        result = injector.inject_into_script(script_path, [epee], character_name="Alpha")
        content = Path(result).read_text(encoding="utf-8")
        assert "OBJETS D'HISTOIRE" in content
        assert "Alpha" in content

    def test_inject_before_render(self, epee, tmp_dir):
        script_path = self._make_scene_script(tmp_dir)
        injector = SceneObjectInjector()
        injector.inject_into_script(script_path, [epee])
        content = Path(script_path).read_text(encoding="utf-8")
        inject_idx = content.find("OBJETS D'HISTOIRE")
        render_idx = content.find("bpy.ops.render.render(")
        assert inject_idx < render_idx

    def test_inject_empty_list(self, tmp_dir):
        script_path = self._make_scene_script(tmp_dir)
        injector = SceneObjectInjector()
        original = Path(script_path).read_text()
        result = injector.inject_into_script(script_path, [])
        assert Path(result).read_text() == original

    def test_inject_missing_script(self, epee, tmp_dir):
        injector = SceneObjectInjector()
        result = injector.inject_into_script("/nonexistent/script.py", [epee])
        assert result == "/nonexistent/script.py"

    def test_inject_inventory(self, inventory, tmp_dir):
        script_path = self._make_scene_script(tmp_dir)
        injector = SceneObjectInjector()
        result = injector.inject_inventory(script_path, inventory)
        content = Path(result).read_text(encoding="utf-8")
        assert "Alpha" in content
        assert "OBJETS D'HISTOIRE" in content

    def test_inject_equipped_only(self, inventory, tmp_dir):
        script_path = self._make_scene_script(tmp_dir)
        injector = SceneObjectInjector()
        result = injector.inject_inventory(
            script_path, inventory, inject_equipped_only=True
        )
        content = Path(result).read_text(encoding="utf-8")
        assert "OBJETS D'HISTOIRE" in content

    def test_generate_objects_section_no_file(self, epee):
        injector = SceneObjectInjector()
        code = injector.generate_objects_section([epee], character_name="Alpha")
        assert "OBJETS D'HISTOIRE" in code
        assert "def create_story_object_" in code

    def test_generate_objects_section_empty(self):
        injector = SceneObjectInjector()
        code = injector.generate_objects_section([])
        assert "Aucun objet" in code

    def test_inject_from_registry(self, registry, epee, tmp_dir):
        registry.register(epee)
        script_path = self._make_scene_script(tmp_dir)
        injector = SceneObjectInjector()
        result = injector.inject_from_registry(
            script_path, registry, character_name="Alpha"
        )
        content = Path(result).read_text(encoding="utf-8")
        assert "OBJETS D'HISTOIRE" in content

    def test_inject_from_registry_by_tags(self, registry, epee, tmp_dir):
        registry.register(epee)
        script_path = self._make_scene_script(tmp_dir)
        injector = SceneObjectInjector()
        result = injector.inject_from_registry(
            script_path, registry, scene_tags=["cyberpunk"]
        )
        content = Path(result).read_text(encoding="utf-8")
        assert "OBJETS D'HISTOIRE" in content

    def test_default_position_with_character(self):
        injector = SceneObjectInjector()
        pos = injector._default_position(0, 3, "Alpha")
        x, y, z = pos
        assert z == pytest.approx(0.8)
        assert -2.0 <= x <= 2.0

    def test_default_position_global(self):
        injector = SceneObjectInjector()
        pos = injector._default_position(0, 3, None)
        assert pos[2] == 0.0

    def test_custom_positions(self, epee, tmp_dir):
        script_path = self._make_scene_script(tmp_dir)
        injector = SceneObjectInjector()
        positions = {"epee_alpha_001": (2.5, 1.0, 0.5)}
        injector.inject_into_script(script_path, [epee], positions=positions)
        content = Path(script_path).read_text(encoding="utf-8")
        assert "2.5" in content


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : Intégration complète
# ─────────────────────────────────────────────────────────────────────────────

class TestStoryAssetsIntegration:

    def test_full_pipeline_weapon_to_scene(self, tmp_dir):
        """Pipeline complet : StoryObject → inventaire → registre → script → injection."""

        # 1. Créer les objets
        epee = StoryObject(
            id="epee_test_001",
            name="Épée de Test",
            object_type="weapon",
            owner="Gamma",
            material="metal_rusty",
            tags=["test", "weapon"],
        )
        lanterne = StoryObject(
            id="lanterne_test_001",
            name="Lanterne",
            object_type="lantern",
            owner="Gamma",
            material="gold",
            tags=["test", "light"],
        )

        # 2. Inventaire
        inv = CharacterInventory("Gamma", project_id="integration_test")
        inv.add(epee, slot="main_hand")
        inv.add(lanterne, slot="accessory_1")
        assert inv.item_count == 2
        assert len(inv.equipped) == 2

        # 3. Registre
        registry = StoryObjectRegistry(
            project_id="integration_test",
            projects_dir=str(tmp_dir),
        )
        registry.register(epee)
        registry.register(lanterne)
        assert len(registry) == 2

        # 4. Scripts Blender
        builder = StoryAssetBuilder(output_dir=str(tmp_dir / "scripts"))
        scripts = builder.build_inventory_scripts(inv)
        assert len(scripts) == 2
        for s in scripts:
            assert Path(s).exists()
            content = Path(s).read_text()
            assert "import bpy" in content

        # 5. Script de scène + injection
        scene_script = tmp_dir / "scene.py"
        scene_script.write_text(
            "import bpy\n"
            "bpy.ops.render.render(write_still=True)\n"
            "print('STORYCORE_RENDER_COMPLETE:/tmp/scene.png')\n",
            encoding="utf-8",
        )
        injector = SceneObjectInjector(asset_builder=builder)
        result = injector.inject_inventory(str(scene_script), inv)
        content = Path(result).read_text(encoding="utf-8")
        assert "OBJETS D'HISTOIRE" in content
        assert "Gamma" in content

        # 6. Vérifier persistance
        registry2 = StoryObjectRegistry(
            project_id="integration_test",
            projects_dir=str(tmp_dir),
        )
        assert len(registry2) == 2
        recovered = registry2.get_inventory("Gamma")
        assert recovered.item_count == 2

    def test_load_inventory_from_example_json(self):
        """Charge l'exemple JSON d'inventaire fourni."""
        example_path = Path("story_assets/examples/cyberpunk_alpha_inventory.json")
        if not example_path.exists():
            pytest.skip("Fichier exemple non trouvé")

        with open(example_path, encoding="utf-8") as f:
            data = json.load(f)

        inv = CharacterInventory.from_dict(data)
        assert inv.character_name == "Alpha"
        assert inv.item_count == 4
        assert "main_hand" in inv.equipped_slots
        weapons = inv.weapons
        assert len(weapons) >= 1

    def test_registry_manifest_export(self, tmp_dir):
        """Le manifest JSON est cohérent avec le registre."""
        registry = StoryObjectRegistry(
            project_id="manifest_test",
            projects_dir=str(tmp_dir),
        )
        for i in range(3):
            registry.register(StoryObject(
                id=f"item_{i}",
                name=f"Item {i}",
                owner=f"Char_{i % 2}",
                object_type="misc",
            ))

        manifest_path = registry.export_manifest()
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

        assert manifest["total_objects"] == 3
        assert len(manifest["objects"]) == 3
        assert len(manifest["characters"]) == 2
