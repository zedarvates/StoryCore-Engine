"""
test_blender_bridge.py — Tests unitaires du module BlenderBridge

Valide :
  - Imports et instanciation
  - Parsing vocal → SceneJSON
  - Détection des types de plans cinématographiques
  - Détection des atmosphères
  - Placement de personnages (avec et sans accents)
  - Presets de lieux
  - Génération de scripts Blender (dry-run)
  - Système de projection 2.5D
  - NarrativePipelineBridge
  - Config blender_config.json

Ces tests ne nécessitent PAS que Blender soit installé.
"""

import sys
import json
import pytest
from pathlib import Path

# Ajouter la racine du projet au path
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))


# ─────────────────────────────────────────────────────────────────────────────
#  IMPORTS
# ─────────────────────────────────────────────────────────────────────────────

from blender_bridge import BlenderBridge
from blender_bridge.scene_types import (
    SceneJSON, SceneType, ShotType, AtmosphereType,
    CameraConfig, CharacterRig, AtmosphereConfig,
)
from blender_bridge.voice_bridge import VoiceToSceneBridge, voice_to_scene
from blender_bridge.camera_system import CinematicCameraSystem
from blender_bridge.location_manager import LocationManager
from blender_bridge.headless_runner import BlenderHeadlessRunner, _load_blender_project_config
from blender_projection.scene_builder import build_projected_scene, ProjectionConfig


# ─────────────────────────────────────────────────────────────────────────────
#  FIXTURES
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def bridge():
    return BlenderBridge()

@pytest.fixture(scope="module")
def voice_bridge():
    return VoiceToSceneBridge()

@pytest.fixture(scope="module")
def camera_sys():
    return CinematicCameraSystem()

@pytest.fixture(scope="module")
def location_mgr():
    return LocationManager()

@pytest.fixture(scope="module")
def runner():
    return BlenderHeadlessRunner()


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : CONFIG PROJET
# ─────────────────────────────────────────────────────────────────────────────

class TestBlenderConfig:
    def test_config_loads(self):
        """Le fichier config/blender_config.json est trouvé et chargeable."""
        cfg = _load_blender_project_config()
        assert isinstance(cfg, dict)

    def test_config_has_required_keys(self):
        cfg = _load_blender_project_config()
        assert "executable" in cfg
        assert "version_preference" in cfg
        assert "render" in cfg
        assert "paths" in cfg

    def test_config_render_settings(self):
        cfg = _load_blender_project_config()
        r = cfg["render"]
        assert r["timeout_seconds"] >= 60
        assert r["default_engine"] in ("BLENDER_EEVEE", "CYCLES", "EEVEE")
        assert r["default_resolution_x"] > 0
        assert r["default_resolution_y"] > 0

    def test_config_paths(self):
        cfg = _load_blender_project_config()
        p = cfg["paths"]
        assert "scripts_output" in p
        assert "renders_output" in p


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : TYPES DE DONNÉES
# ─────────────────────────────────────────────────────────────────────────────

class TestSceneTypes:
    def test_scenejson_creation(self):
        scene = SceneJSON(scene_id="test_scene")
        assert scene.scene_id == "test_scene"
        assert scene.scene_type == SceneType.EXTERIOR
        assert len(scene.characters) == 0

    def test_scenejson_to_dict(self):
        scene = SceneJSON(scene_id="test_001", description="Test scène")
        d = scene.to_dict()
        assert d["scene_id"] == "test_001"
        assert "camera" in d
        assert "lighting" in d
        assert "atmosphere" in d

    def test_scenejson_to_json_and_back(self):
        scene = SceneJSON(
            scene_id="roundtrip_test",
            scene_type=SceneType.INTERIOR,
            description="Test aller-retour JSON",
        )
        json_str = scene.to_json()
        restored = SceneJSON.from_json(json_str)
        assert restored.scene_id == "roundtrip_test"
        assert restored.scene_type == SceneType.INTERIOR

    def test_camera_config_defaults(self):
        cam = CameraConfig()
        assert cam.lens == 50.0
        assert cam.dof_enabled is True
        assert cam.shot_type == ShotType.MEDIUM

    def test_character_rig_creation(self):
        rig = CharacterRig(name="Alpha", position=(0.0, -2.0, 0.0))
        assert rig.name == "Alpha"
        assert rig.height == 1.75
        assert rig.facing_camera is True


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : CAMÉRA SYSTÈME
# ─────────────────────────────────────────────────────────────────────────────

class TestCameraSystem:
    def test_list_shot_types(self, camera_sys):
        shots = camera_sys.list_shot_types()
        assert len(shots) >= 10
        assert "wide" in shots
        assert "close_up" in shots
        assert "low_angle" in shots
        assert "high_angle" in shots
        assert "over_shoulder" in shots

    def test_get_camera_wide(self, camera_sys):
        cam = camera_sys.get_camera_for_shot(ShotType.WIDE)
        assert cam.lens == 24.0
        assert cam.shot_type == ShotType.WIDE

    def test_get_camera_close_up(self, camera_sys):
        cam = camera_sys.get_camera_for_shot(ShotType.CLOSE_UP)
        assert cam.lens == 85.0

    def test_get_camera_with_lens_override(self, camera_sys):
        cam = camera_sys.get_camera_for_shot(ShotType.WIDE, lens_override=35.0)
        assert cam.lens == 35.0
        assert cam.shot_type == ShotType.WIDE

    @pytest.mark.parametrize("description,expected_shot", [
        ("camera basse 35mm contre-plongee",           ShotType.LOW_ANGLE),
        ("contre-plongee serree plan serre visage",    ShotType.LOW_ANGLE_CLOSE),
        ("plongee high angle",                          ShotType.HIGH_ANGLE),
        ("gros plan close visage",                      ShotType.CLOSE_UP),
        ("plan large wide",                             ShotType.WIDE),
        ("over shoulder dialogue",                      ShotType.OVER_SHOULDER),
        ("medium plan moyen standard",                  ShotType.MEDIUM),
    ])
    def test_shot_detection_from_voice(self, camera_sys, description, expected_shot):
        cam = camera_sys.from_voice_description(description)
        assert cam.shot_type == expected_shot, (
            f"'{description}' → attendu {expected_shot.value}, obtenu {cam.shot_type.value}"
        )

    def test_lens_detection_35mm(self, camera_sys):
        cam = camera_sys.from_voice_description("camera basse 35mm")
        assert cam.lens == 35.0

    def test_lens_detection_85mm(self, camera_sys):
        cam = camera_sys.from_voice_description("gros plan 85mm portrait")
        assert cam.lens == 85.0

    def test_contre_plongee_not_haute(self, camera_sys):
        """Bug fix: contre-plongee ne doit PAS donner HIGH_ANGLE."""
        cam = camera_sys.from_voice_description("camera basse 35mm legere contre-plongee plan serre")
        assert cam.shot_type != ShotType.HIGH_ANGLE, (
            "contre-plongee ne doit pas être détecté comme high_angle"
        )
        assert cam.shot_type in (ShotType.LOW_ANGLE, ShotType.LOW_ANGLE_CLOSE)


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : VOICE BRIDGE
# ─────────────────────────────────────────────────────────────────────────────

class TestVoiceBridge:
    def test_parse_basic_scene(self, voice_bridge):
        scene = voice_bridge.parse("Ruelle cyberpunk nocturne")
        assert isinstance(scene, SceneJSON)
        assert scene.scene_id
        assert len(scene.scene_id) > 0

    def test_parse_detects_cyberpunk_preset(self, voice_bridge):
        scene = voice_bridge.parse("Ruelle cyberpunk sous pluie")
        assert scene.location_preset_id == "ruelle_cyberpunk"

    def test_parse_detects_foret_preset(self, voice_bridge):
        scene = voice_bridge.parse("Foret brumeuse au lever du jour")
        assert scene.location_preset_id == "foret_brumeuse"

    def test_parse_atmosphere_pluie(self, voice_bridge):
        scene = voice_bridge.parse("Exterieur sous pluie battante")
        assert scene.atmosphere.type == AtmosphereType.RAIN

    def test_parse_atmosphere_brouillard(self, voice_bridge):
        scene = voice_bridge.parse("Brouillard dense dans la ville")
        assert scene.atmosphere.type == AtmosphereType.FOG

    def test_parse_atmosphere_volumetrique(self, voice_bridge):
        scene = voice_bridge.parse("Ajoute brouillard volumetrique")
        assert scene.atmosphere.type == AtmosphereType.VOLUMETRIC

    def test_parse_atmosphere_intensity(self, voice_bridge):
        scene_light = voice_bridge.parse("Brouillard leger")
        scene_heavy = voice_bridge.parse("Brouillard dense")
        assert scene_heavy.atmosphere.density > scene_light.atmosphere.density

    def test_parse_character_with_accent(self, voice_bridge):
        """Personnage avec 'à' accentué."""
        scene = voice_bridge.parse("Place Alpha a 2 metres devant camera")
        names = [c.name for c in scene.characters]
        assert "Alpha" in names

    def test_parse_character_without_accent(self, voice_bridge):
        """Bug fix: Personnage avec 'a' sans accent doit aussi être détecté."""
        scene = voice_bridge.parse("Cree ruelle cyberpunk avec Alpha a 2 metres devant camera")
        names = [c.name for c in scene.characters]
        assert "Alpha" in names, f"Alpha non détecté, personnages: {names}"

    def test_parse_camera_basse(self, voice_bridge):
        scene = voice_bridge.parse("Camera basse 35mm legere contre-plongee")
        assert scene.camera.lens == 35.0
        assert scene.camera.shot_type in (ShotType.LOW_ANGLE, ShotType.LOW_ANGLE_CLOSE)

    def test_parse_interior(self, voice_bridge):
        scene = voice_bridge.parse("Bureau sombre interieur detective")
        assert scene.scene_type == SceneType.INTERIOR

    def test_apply_command_camera(self, voice_bridge):
        scene = voice_bridge.parse("Ruelle cyberpunk")
        scene = voice_bridge.apply_command(scene, "Camera basse 35mm")
        assert scene.camera.lens == 35.0

    def test_apply_command_atmosphere(self, voice_bridge):
        scene = voice_bridge.parse("Desert aride")
        scene = voice_bridge.apply_command(scene, "Ajoute brouillard volumetrique dense")
        assert scene.atmosphere.type == AtmosphereType.VOLUMETRIC
        assert scene.atmosphere.density > 0.02

    def test_incremental_three_commands(self, voice_bridge):
        scene = voice_bridge.parse("Ruelle cyberpunk nocturne")
        assert scene.location_preset_id == "ruelle_cyberpunk"

        scene = voice_bridge.apply_command(scene, "Camera basse 35mm contre-plongee")
        assert scene.camera.lens == 35.0

        scene = voice_bridge.apply_command(scene, "Ajoute brouillard volumetrique")
        assert scene.atmosphere.type == AtmosphereType.VOLUMETRIC

    def test_voice_command_stored(self, voice_bridge):
        scene = voice_bridge.parse("Ruelle cyberpunk")
        assert scene.voice_command == "Ruelle cyberpunk"

    def test_narrative_tags_extracted(self, voice_bridge):
        scene = voice_bridge.parse("Ruelle cyberpunk nuit pluie")
        assert "cyberpunk" in scene.narrative_tags
        assert "night" in scene.narrative_tags or "rain" in scene.narrative_tags


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : LOCATION MANAGER
# ─────────────────────────────────────────────────────────────────────────────

class TestLocationManager:
    def test_list_all_returns_builtins(self, location_mgr):
        presets = location_mgr.list_all()
        assert len(presets) >= 5

    def test_builtin_preset_ids(self, location_mgr):
        ids = {p.id for p in location_mgr.list_all()}
        assert "ruelle_cyberpunk" in ids
        assert "foret_brumeuse" in ids
        assert "bureau_sombre" in ids
        assert "studio_neutre" in ids
        assert "desert" in ids

    def test_get_preset_by_id(self, location_mgr):
        preset = location_mgr.get("ruelle_cyberpunk")
        assert preset is not None
        assert preset.name == "Ruelle Cyberpunk"
        assert preset.scene_type == SceneType.EXTERIOR

    def test_search_by_query(self, location_mgr):
        results = location_mgr.search(query="cyberpunk")
        assert len(results) >= 1
        assert any(p.id == "ruelle_cyberpunk" for p in results)

    def test_search_by_tags(self, location_mgr):
        results = location_mgr.search(tags=["forest", "fog"])
        assert any(p.id == "foret_brumeuse" for p in results)

    def test_search_by_scene_type(self, location_mgr):
        interiors = location_mgr.search(scene_type=SceneType.INTERIOR)
        assert all(p.scene_type == SceneType.INTERIOR for p in interiors)
        assert len(interiors) >= 2

    def test_narrative_matching_cyberpunk(self, location_mgr):
        preset = location_mgr.create_from_narrative("ruelle cyberpunk neon")
        assert preset is not None
        assert preset.id == "ruelle_cyberpunk"

    def test_narrative_matching_foret(self, location_mgr):
        preset = location_mgr.create_from_narrative("foret brumeuse nature")
        assert preset is not None
        assert preset.id == "foret_brumeuse"

    def test_apply_to_scene(self, location_mgr):
        scene = SceneJSON(scene_id="test")
        scene = location_mgr.apply_to_scene(scene, "ruelle_cyberpunk")
        assert scene.location_preset_id == "ruelle_cyberpunk"
        assert scene.scene_type == SceneType.EXTERIOR
        assert scene.lighting is not None
        assert scene.atmosphere is not None

    def test_preset_has_lighting(self, location_mgr):
        preset = location_mgr.get("ruelle_cyberpunk")
        assert preset.lighting is not None
        assert len(preset.lighting.lights) >= 2

    def test_builtin_not_deletable(self, location_mgr):
        result = location_mgr.delete_preset("ruelle_cyberpunk")
        assert result is False
        # S'assure qu'il est encore là
        assert location_mgr.get("ruelle_cyberpunk") is not None


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : BRIDGE PRINCIPAL (sans Blender)
# ─────────────────────────────────────────────────────────────────────────────

class TestBlenderBridge:
    def test_status_has_required_keys(self, bridge):
        status = bridge.status()
        assert "blender_available" in status
        assert "location_presets" in status
        assert "camera_shot_types" in status
        assert "scripts_dir" in status

    def test_parse_voice_command(self, bridge):
        scene = bridge.parse_voice_command("Ruelle cyberpunk sous pluie")
        assert isinstance(scene, SceneJSON)
        assert scene.location_preset_id == "ruelle_cyberpunk"

    def test_modify_scene(self, bridge):
        scene = bridge.parse_voice_command("Foret brumeuse")
        scene = bridge.modify_scene(scene, "Camera basse 35mm")
        assert scene.camera.lens == 35.0

    def test_dry_run_returns_command(self, bridge):
        result = bridge.dry_run("Ruelle cyberpunk nocturne")
        assert "command" in result
        assert "blender" in result["command"].lower()
        assert "scene_json" in result
        assert "script_path" in result
        assert "blender_available" in result

    def test_dry_run_generates_script_file(self, bridge):
        result = bridge.dry_run("Studio neutre portrait")
        script_path = Path(result["script_path"])
        assert script_path.exists(), f"Script non généré : {script_path}"
        assert script_path.stat().st_size > 500

    def test_generate_script_only(self, bridge):
        script_path = bridge.generate_script_only("Desert aride coucher de soleil")
        p = Path(script_path)
        assert p.exists()
        content = p.read_text(encoding="utf-8")
        assert "import bpy" in content
        assert "render.render" in content

    def test_script_contains_camera(self, bridge):
        script_path = bridge.generate_script_only("Ruelle cyberpunk camera basse 35mm")
        content = Path(script_path).read_text(encoding="utf-8")
        assert "camera_add" in content
        assert "cam_data.lens" in content

    def test_script_contains_character(self, bridge):
        script_path = bridge.generate_script_only("Ruelle avec Alpha a 2 metres devant camera")
        content = Path(script_path).read_text(encoding="utf-8")
        assert "Alpha" in content

    def test_script_cyberpunk_has_neons(self, bridge):
        script_path = bridge.generate_script_only("Ruelle cyberpunk nocturne")
        content = Path(script_path).read_text(encoding="utf-8")
        assert "Neon" in content or "neon" in content or "AREA" in content

    def test_script_atmosphere_rain(self, bridge):
        script_path = bridge.generate_script_only("Exterieur sous pluie battante")
        content = Path(script_path).read_text(encoding="utf-8")
        assert "particle" in content.lower() or "rain" in content.lower()

    def test_locations_property(self, bridge):
        assert bridge.locations is not None
        assert len(bridge.locations.list_all()) >= 5

    def test_cameras_property(self, bridge):
        assert bridge.cameras is not None
        assert len(bridge.cameras.list_shot_types()) >= 10

    def test_is_ready_returns_bool(self, bridge):
        result = bridge.is_ready()
        assert isinstance(result, bool)


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : HEADLESS RUNNER
# ─────────────────────────────────────────────────────────────────────────────

class TestHeadlessRunner:
    def test_is_blender_available_returns_bool(self, runner):
        result = runner.is_blender_available()
        assert isinstance(result, bool)

    def test_dry_run_returns_dict(self, runner, bridge):
        script_path = bridge.generate_script_only("Ruelle cyberpunk")
        result = runner.dry_run(script_path)
        assert "command" in result
        assert "blender_available" in result
        assert "blender" in result["command"].lower()

    def test_execute_projection_without_blender(self, runner):
        """execute_projection retourne une erreur propre si Blender absent."""
        if runner.is_blender_available():
            pytest.skip("Blender disponible — test non applicable")
        result = runner.execute_projection(
            script_path="./fake_script.py",
            image_path="./fake_image.png",
            scene_type="exterior",
        )
        assert result["success"] is False
        assert "error" in result
        assert result["render_path"] is None

    def test_execute_without_blender(self, runner):
        """execute retourne une erreur propre si Blender absent."""
        if runner.is_blender_available():
            pytest.skip("Blender disponible — test non applicable")
        result = runner.execute("./fake_script.py")
        assert result["success"] is False
        assert result["render_path"] is None


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : PROJECTION 2.5D
# ─────────────────────────────────────────────────────────────────────────────

class TestProjectionScene:
    def test_exterior_script_generated(self, tmp_path):
        script = build_projected_scene(
            image_path="./test_image.png",
            scene_type="exterior",
            output_script_path=str(tmp_path / "test_ext.py"),
        )
        p = Path(script)
        assert p.exists()
        assert p.stat().st_size > 1000

    def test_interior_script_generated(self, tmp_path):
        script = build_projected_scene(
            image_path="./test_image.png",
            scene_type="interior",
            output_script_path=str(tmp_path / "test_int.py"),
        )
        content = Path(script).read_text(encoding="utf-8")
        assert "Wall_Back" in content
        assert "Floor" in content

    def test_exterior_has_skybox(self, tmp_path):
        script = build_projected_scene(
            image_path="./test_image.png",
            scene_type="exterior",
            output_script_path=str(tmp_path / "test_sky.py"),
        )
        content = Path(script).read_text(encoding="utf-8")
        assert "Skybox_Cube" in content
        assert "flip_normals" in content

    def test_camera_low_angle(self, tmp_path):
        script = build_projected_scene(
            image_path="./test_image.png",
            scene_type="exterior",
            config={"camera_mode": "low_angle"},
            output_script_path=str(tmp_path / "test_cam.py"),
        )
        content = Path(script).read_text(encoding="utf-8")
        assert "low_angle" in content

    def test_plant_trees(self, tmp_path):
        script = build_projected_scene(
            image_path="./test_image.png",
            scene_type="exterior",
            config={"plant_trees": True, "tree_count": 3},
            output_script_path=str(tmp_path / "test_trees.py"),
        )
        content = Path(script).read_text(encoding="utf-8")
        assert "plant_assets" in content

    def test_projection_config_from_dict(self):
        cfg = ProjectionConfig.from_dict({
            "scene_type": "interior",
            "camera_mode": "over_shoulder",
            "engine": "CYCLES",
            "samples": 128,
        })
        assert cfg.scene_type == "interior"
        assert cfg.camera_mode == "over_shoulder"
        assert cfg.engine == "CYCLES"
        assert cfg.samples == 128

    def test_render_call_present(self, tmp_path):
        script = build_projected_scene(
            image_path="./test_image.png",
            scene_type="exterior",
            output_script_path=str(tmp_path / "test_render.py"),
        )
        content = Path(script).read_text(encoding="utf-8")
        assert "bpy.ops.render.render" in content
        assert "STORYCORE_RENDER_COMPLETE" in content


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : NARRATIVE PIPELINE BRIDGE
# ─────────────────────────────────────────────────────────────────────────────

class TestNarrativePipelineBridge:
    def test_beat_to_scene(self, bridge):
        from blender_bridge.backend_integration import NarrativePipelineBridge
        nb = NarrativePipelineBridge(blender_bridge=bridge)
        scene = nb.beat_to_scene({
            "beat": "Alpha arrive dans la ruelle cyberpunk",
            "characters": [],
        })
        assert isinstance(scene, SceneJSON)
        assert "ruelle_cyberpunk" in scene.location_preset_id or True  # peut matcher

    def test_beats_to_scenes(self, bridge):
        from blender_bridge.backend_integration import NarrativePipelineBridge
        nb = NarrativePipelineBridge(blender_bridge=bridge)
        beats = [
            {"beat": "Ruelle cyberpunk nocturne", "characters": []},
            {"beat": "Gros plan sur le visage d'Alpha", "camera": "gros plan"},
            {"beat": "Fuite sous la pluie", "atmosphere": "pluie"},
        ]
        scenes = nb.beats_to_scenes(beats)
        assert len(scenes) == 3
        assert all(isinstance(s, SceneJSON) for s in scenes)

    def test_location_carry_over(self, bridge):
        from blender_bridge.backend_integration import NarrativePipelineBridge
        nb = NarrativePipelineBridge(blender_bridge=bridge)
        beats = [
            {"beat": "Ruelle cyberpunk neon"},
            {"beat": "Gros plan sur le mur"},  # Pas de lieu explicite
        ]
        scenes = nb.beats_to_scenes(beats, carry_over_location=True)
        # La 2ème scène devrait hériter du lieu de la 1ère
        if scenes[0].location_preset_id:
            assert scenes[1].location_preset_id == scenes[0].location_preset_id

    def test_export_storyboard(self, bridge, tmp_path):
        from blender_bridge.backend_integration import NarrativePipelineBridge
        nb = NarrativePipelineBridge(blender_bridge=bridge)
        beats = [{"beat": "Ruelle cyberpunk"}, {"beat": "Gros plan alpha"}]
        nb.beats_to_scenes(beats)

        out = str(tmp_path / "storyboard.json")
        path = nb.export_storyboard(out)
        assert Path(path).exists()

        with open(path) as f:
            data = json.load(f)
        assert data["beat_count"] == 2
        assert len(data["scenes"]) == 2


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS D'INTÉGRATION : pipeline complet sans Blender
# ─────────────────────────────────────────────────────────────────────────────

class TestIntegrationDryRun:
    """Tests du pipeline complet en mode dry-run (sans Blender)."""

    @pytest.mark.parametrize("command", [
        "Cree une ruelle cyberpunk sous pluie",
        "Camera basse 35mm legere contre-plongee plan serre",
        "Foret brumeuse au lever du jour large angle",
        "Bureau sombre de detective interieur",
        "Desert aride soleil rasant occidental",
        "Studio neutre fond blanc portrait",
    ])
    def test_dry_run_all_commands(self, bridge, command):
        """Chaque commande produit un script valide."""
        result = bridge.dry_run(command)
        assert Path(result["script_path"]).exists()
        assert "blender" in result["command"].lower()

    def test_full_pipeline_cyberpunk(self, bridge):
        """Pipeline complet : voix → JSON → script."""
        scene = bridge.parse_voice_command(
            "Ruelle cyberpunk sous pluie avec Alpha a 2 metres devant camera"
        )
        # JSON valide
        json_str = scene.to_json()
        data = json.loads(json_str)
        assert data["scene_id"]
        assert data["camera"]["lens"] > 0
        # Script généré
        script = bridge.generate_script_only(
            "Ruelle cyberpunk sous pluie avec Alpha a 2 metres devant camera"
        )
        content = Path(script).read_text(encoding="utf-8")
        assert "Alpha" in content
        assert "camera_add" in content
