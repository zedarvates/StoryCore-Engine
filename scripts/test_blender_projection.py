"""Test de validation des modules blender_projection."""
import sys
sys.path.insert(0, '.')

print("=== TEST 1: AssetLibrary ===")
from blender_projection.asset_library import AssetLibrary, AssetCategory, AssetType, SceneContext
lib = AssetLibrary()
all_assets = lib.get_all()
print(f"  Total assets: {len(all_assets)}")
rocks = lib.get_by_category(AssetCategory.ROCKS)
print(f"  Rochers: {len(rocks)} -> {[a.id for a in rocks]}")
sprites = lib.get_by_type(AssetType.SPRITE_2D)
print(f"  Sprites 2D: {len(sprites)} -> {[a.id for a in sprites]}")
tagged = lib.get_by_tags(["foret", "brume", "nature"])
print(f"  Tags foret/brume: {len(tagged)} assets -> {[a.id for a in tagged[:4]]}")
suggestions = lib.suggest_for_scene(["montagne", "rocher", "alpin"], SceneContext.EXTERIOR)
print(f"  Suggestions montagne: {list(suggestions.keys())}")

print()
print("=== TEST 2: AssetPlacer ===")
from blender_projection.asset_placer import AssetPlacer
placer = AssetPlacer()

code_rock = placer.generate_placement_code("rock_medium", count=3, seed=42)
print(f"  rock_medium code: {len(code_rock)} chars, has place_rock_medium: {'place_rock_medium' in code_rock}")

code_spr = placer.generate_placement_code("sprite_grass_ground", count=5, seed=99)
print(f"  sprite_grass_ground code: {len(code_spr)} chars, has TRACK_TO: {'TRACK_TO' in code_spr}")

script_path = placer.generate_full_script([
    {"asset_id": "tree_conifer",        "count": 3, "area": (-5,5,2,10), "seed": 1},
    {"asset_id": "rock_medium",         "count": 4, "area": (-4,4,0,8),  "seed": 2},
    {"asset_id": "sprite_grass_ground", "count": 10,"area": (-6,6,-1,9), "seed": 3},
], output_path="./exports/blender/test_placement.py")
from pathlib import Path
p = Path(script_path)
print(f"  Script genere: {p.name} ({p.stat().st_size} bytes)")

auto_path = placer.suggest_and_place(
    ["foret","brume","nature"],
    output_path="./exports/blender/auto_foret.py"
)
print(f"  Auto-placement foret: {Path(auto_path).name} ({Path(auto_path).stat().st_size} bytes)")

auto_path2 = placer.suggest_and_place(
    ["desert","aride","cactus","rocher"],
    output_path="./exports/blender/auto_desert.py"
)
print(f"  Auto-placement desert: {Path(auto_path2).name} ({Path(auto_path2).stat().st_size} bytes)")

print()
print("=== TEST 3: ReferenceRenderer ===")
from blender_projection.reference_renderer import ReferenceRenderer, SCENE_PRESETS
renderer = ReferenceRenderer(output_dir="./exports/blender/test_references")
presets = renderer.list_presets()
print(f"  Presets disponibles: {list(presets.keys())}")
for name, info in presets.items():
    print(f"    {name:12s}: {info['asset_count']} assets, {info['context']}")

ref_path = renderer.generate_from_preset(
    image_path="./assets/generated/scene_foret.png",
    preset_name="foret",
    camera_shot="wide",
    camera_lens=24.0,
    density="medium",
)
rp = Path(ref_path)
print(f"  Ref foret: {rp.name} ({rp.stat().st_size} bytes)")

ref_path2 = renderer.generate_from_preset(
    image_path="./assets/generated/ruelle_nuit.png",
    preset_name="urbain",
    camera_shot="low_angle",
    camera_lens=35.0,
    density="heavy",
)
rp2 = Path(ref_path2)
print(f"  Ref urbain low_angle: {rp2.name} ({rp2.stat().st_size} bytes)")

ref_path3 = renderer.generate_reference_script(
    image_path="./assets/generated/desert_scene.png",
    scene_type="exterior",
    narrative_tags=["desert","aride","cactus","sec"],
    camera_shot="high_angle",
    engine="EEVEE",
)
rp3 = Path(ref_path3)
print(f"  Ref desert auto-tags: {rp3.name} ({rp3.stat().st_size} bytes)")

ref_path4 = renderer.generate_from_preset(
    image_path="./assets/generated/interieur.png",
    preset_name="interieur",
    camera_shot="over_shoulder",
    camera_lens=50.0,
)
rp4 = Path(ref_path4)
print(f"  Ref interieur: {rp4.name} ({rp4.stat().st_size} bytes)")

# Verification du contenu du script foret
content = rp.read_text(encoding="utf-8")
checks = [
    ("Skybox",            "skybox cube inverse"),
    ("camera_add",        "creation camera"),
    ("render.render",     "appel rendu"),
    ("BLENDER_EEVEE",     "moteur EEVEE"),
    ("place_tree_conifer","placement conifere"),
    ("place_rock_medium", "placement rocher"),
]
print()
print("  Verification contenu script foret:")
all_ok = True
for keyword, desc in checks:
    ok = keyword in content
    if not ok:
        all_ok = False
    print(f"    [{'OK' if ok else 'KO'}] {desc} ({keyword})")

# Verification script interieur
content4 = rp4.read_text(encoding="utf-8")
interior_checks = [
    ("Piece interieure", "murs interieurs"),
    ("Wall_Back",        "mur arriere"),
    ("over_shoulder",    "mention plan"),
]
print()
print("  Verification contenu script interieur:")
for keyword, desc in interior_checks:
    ok = keyword in content4
    if not ok:
        all_ok = False
    print(f"    [{'OK' if ok else 'KO'}] {desc} ({keyword})")

print()
if all_ok:
    print("OK: Tous les modules blender_projection valides.")
else:
    print("ATTENTION: Certaines verifications ont echoue.")
