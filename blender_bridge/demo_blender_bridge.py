"""
demo_blender_bridge.py — Démonstration rapide du pipeline BlenderBridge
========================================================================

Ce script montre comment utiliser BlenderBridge sans avoir Blender installé.
Il génère les scripts Python Blender et la structure JSON de scènes,
mais ne lance pas le rendu (dry-run).

Usage :
    python blender_bridge/demo_blender_bridge.py

Pour un vrai rendu (Blender requis) :
    python blender_bridge/demo_blender_bridge.py --render
"""

import sys
import json
import argparse
from pathlib import Path

# Ajouter le répertoire racine au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from blender_bridge.scene_types import (
    ShotType,
)
from blender_bridge.script_generator import BlenderScriptGenerator
from blender_bridge.headless_runner import BlenderHeadlessRunner
from blender_bridge.camera_system import CinematicCameraSystem
from blender_bridge.rig_generator import RigGenerator
from blender_bridge.location_manager import LocationManager
from blender_bridge.voice_bridge import VoiceToSceneBridge
from blender_projection.scene_builder import build_projected_scene


def separator(title: str):
    print(f"\n{'═' * 60}")
    print(f"  {title}")
    print("═" * 60)


def demo_voice_parsing():
    """Démo 1 : Parsing de commandes vocales → SceneJSON"""
    separator("DÉMO 1 : Parsing vocal → SceneJSON")

    bridge = VoiceToSceneBridge()

    commands = [
        "Crée une ruelle cyberpunk sous pluie",
        "Caméra basse 35mm légère contre-plongée",
        "Place personnage Alpha à 2 mètres devant caméra",
        "Plan serré sur visage",
        "Forêt brumeuse au lever du jour",
    ]

    for cmd in commands:
        print(f"\n📢 Commande : '{cmd}'")
        scene = bridge.parse(cmd)
        print(f"   → scene_id  : {scene.scene_id}")
        print(f"   → shot_type : {scene.camera.shot_type.value}")
        print(f"   → lens      : {scene.camera.lens}mm")
        print(f"   → atmosphère: {scene.atmosphere.type.value}")
        print(f"   → preset    : {scene.location_preset_id or 'aucun'}")
        print(f"   → tags      : {scene.narrative_tags}")
        if scene.characters:
            print(f"   → personnages: {[c.name for c in scene.characters]}")


def demo_incremental_scene():
    """Démo 2 : Construction incrémentale d'une scène"""
    separator("DÉMO 2 : Construction incrémentale de scène")

    bridge = VoiceToSceneBridge()

    print("\n🎬 Construction pas à pas de la scène...")

    scene = bridge.parse("Ruelle cyberpunk nocturne")
    print(f"  [1] Scène de base : {scene.scene_id}, preset={scene.location_preset_id}")

    scene = bridge.apply_command(scene, "Caméra basse 35mm contre-plongée")
    print(
        f"  [2] Caméra modifiée : {scene.camera.shot_type.value}, {scene.camera.lens}mm"
    )

    scene = bridge.apply_command(scene, "Brouillard volumétrique dense")
    print(
        f"  [3] Atmosphère : {scene.atmosphere.type.value}, density={scene.atmosphere.density:.3f}"
    )

    scene = bridge.apply_command(
        scene, "Place personnage Alpha à 2 mètres devant caméra"
    )
    print(f"  [4] Personnages : {[c.name for c in scene.characters]}")

    print("\n📋 JSON final (extrait) :")
    d = scene.to_dict()
    print(
        json.dumps(
            {
                "scene_id": d["scene_id"],
                "camera": {
                    "shot_type": d["camera"]["shot_type"],
                    "lens": d["camera"]["lens"],
                },
                "atmosphere": {"type": d["atmosphere"]["type"]},
                "characters": [
                    {"name": c["name"], "position": c["position"]}
                    for c in d["characters"]
                ],
            },
            indent=2,
            ensure_ascii=False,
        )
    )


def demo_camera_system():
    """Démo 3 : Système de caméras cinématographiques"""
    separator("DÉMO 3 : Presets caméras cinématographiques")

    cam_sys = CinematicCameraSystem()

    print("\n🎥 Types de plans disponibles :")
    for shot_type, desc in cam_sys.list_shot_types().items():
        cam = cam_sys.get_camera_for_shot(ShotType(shot_type))
        print(f"  {shot_type:20s} | {cam.lens:5.0f}mm | f/{cam.f_stop} | {desc[:40]}")

    print("\n🎯 Test : description verbale → config caméra")
    test_descs = [
        "caméra basse 35mm légère contre-plongée",
        "plan serré sur visage avec bokeh",
        "grand angle large",
        "over shoulder dialogue",
    ]
    for desc in test_descs:
        cam = cam_sys.from_voice_description(desc)
        print(
            f"  '{desc[:35]:35s}' → {cam.shot_type.value:20s} {cam.lens:.0f}mm f/{cam.f_stop}"
        )


def demo_rig_generator():
    """Démo 4 : Génération de rigs placeholder"""
    separator("DÉMO 4 : Rigs Placeholder (Pantins)")

    gen = RigGenerator()
    cam_sys = CinematicCameraSystem()
    cam = cam_sys.get_camera_for_shot(ShotType.MEDIUM)

    print("\n👤 Création de rigs individuels :")
    alpha = gen.create_rig("Alpha", position=(0, 0, 0))
    beta = gen.place_at_distance(
        "Beta", camera_config=cam, distance_from_camera=3.0, lateral_offset=0.5
    )
    print(f"  Alpha : pos={alpha.position}, couleur={alpha.material_color}")
    print(
        f"  Beta  : pos=({beta.position[0]:.2f}, {beta.position[1]:.2f}, {beta.position[2]:.2f})"
    )

    print("\n👥 Formation de groupe :")
    group = gen.place_multiple(
        ["Alpha", "Beta", "Gamma", "Delta"],
        camera_config=cam,
        spacing=0.9,
        formation="arc",
    )
    for rig in group:
        print(
            f"  {rig.name:8s} : ({rig.position[0]:5.2f}, {rig.position[1]:5.2f}, {rig.position[2]:5.2f})"
        )


def demo_location_manager():
    """Démo 5 : Gestionnaire de lieux"""
    separator("DÉMO 5 : Gestionnaire de lieux & Presets")

    mgr = LocationManager()

    print("\n🗺️ Presets disponibles :")
    for preset in mgr.list_all():
        print(
            f"  [{preset.id:20s}] {preset.name:25s} | {preset.scene_type.value:8s} | {preset.tags}"
        )

    print("\n🔍 Recherche par mot-clé 'cyberpunk' :")
    results = mgr.search(query="cyberpunk")
    for p in results:
        print(f"  → {p.id}: {p.description}")

    print("\n🔍 Correspondance narrative :")
    test_descriptions = [
        "ruelle sombre avec néons et pluie",
        "forêt brumeuse mystérieuse",
        "bureau de détective noir",
    ]
    for desc in test_descriptions:
        match = mgr.create_from_narrative(desc)
        if match:
            print(f"  '{desc[:40]:40s}' → '{match.id}'")
        else:
            print(f"  '{desc[:40]:40s}' → (pas de correspondance)")


def demo_script_generation(output_dir: str = "./exports/blender/demo"):
    """Démo 6 : Génération de scripts Blender"""
    separator("DÉMO 6 : Génération de scripts Python Blender")

    bridge = VoiceToSceneBridge()
    gen = BlenderScriptGenerator(scripts_dir=output_dir)

    scene = bridge.parse(
        "Ruelle cyberpunk sous pluie avec Alpha devant, caméra basse 35mm"
    )
    # Configurer un chemin de rendu pour la démo
    scene.render.output_path = "./exports/blender/demo_render_"

    script_path = gen.generate(scene)
    print(f"\n✅ Script généré : {script_path}")

    # Afficher un extrait du script
    with open(script_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    print(f"   Taille : {len(lines)} lignes")
    print("\n   Premières lignes :")
    for line in lines[:10]:
        print(f"   {line}", end="")

    # Commande CLI correspondante
    runner = BlenderHeadlessRunner()
    dry = runner.dry_run(script_path, scene)
    print("\n\n🖥️  Commande CLI pour exécuter :")
    print(f"   {dry['command']}")
    print(f"\n   Blender disponible : {dry['blender_available']}")
    if dry["blender_version"]:
        print(f"   Version : {dry['blender_version']}")

    return script_path


def demo_projection_2_5d(output_dir: str = "./exports/blender/demo"):
    """Démo 7 : Système de projection 2.5D"""
    separator("DÉMO 7 : Scène 2.5D par projection d'image")

    image_path = "./assets/generated/scene_example.png"  # Image fictive pour la démo

    configs = [
        ("exterior", "wide", False, "Vue large extérieure"),
        ("exterior", "low_angle", True, "Contre-plongée extérieure avec arbres"),
        ("interior", "close", False, "Plan serré intérieur"),
    ]

    for scene_type, camera_mode, plant_trees, desc in configs:
        config = {
            "camera_mode": camera_mode,
            "plant_trees": plant_trees,
            "tree_count": 5,
            "engine": "EEVEE",
            "output_path": f"{output_dir}/projection_{scene_type}_{camera_mode}",
        }
        script_path = build_projected_scene(image_path, scene_type, config)
        print(f"\n✅ [{desc}]")
        print(f"   Script : {script_path}")
        print(f"   CLI    : blender -b -P {script_path} -- {image_path} {scene_type}")


def main():
    parser = argparse.ArgumentParser(description="Démo BlenderBridge StoryCore-Engine")
    parser.add_argument(
        "--render",
        action="store_true",
        help="Lancer le rendu Blender réel (nécessite Blender)",
    )
    parser.add_argument(
        "--output", default="./exports/blender/demo", help="Dossier de sortie"
    )
    args = parser.parse_args()

    print("\n" + "█" * 60)
    print("  StoryCore-Engine — BlenderBridge Demo")
    print("  Système d'intégration Blender Headless")
    print("█" * 60)

    demo_voice_parsing()
    demo_incremental_scene()
    demo_camera_system()
    demo_rig_generator()
    demo_location_manager()
    demo_script_generation(args.output)
    demo_projection_2_5d(args.output)

    separator("RÉSUMÉ")
    print("\n✅ Tous les modules fonctionnent correctement.")
    print("\n📁 Fichiers générés :")
    print(f"   - Scripts Blender : {args.output}/")
    print("   - Presets lieux   : blender_bridge/presets/locations/")

    if args.render:
        separator("RENDU RÉEL (--render)")
        runner = BlenderHeadlessRunner()
        if runner.is_blender_available():
            print("\n🔄 Lancement du rendu Blender...")
            bridge = VoiceToSceneBridge()
            scene = bridge.parse("Ruelle cyberpunk sous pluie avec Alpha")
            from blender_bridge.script_generator import BlenderScriptGenerator

            gen = BlenderScriptGenerator(scripts_dir=args.output)
            s_path = gen.generate(scene)
            result = runner.execute(s_path, scene)
            if result["success"]:
                print(f"✅ Rendu réussi → {result['render_path']}")
                print(f"   Durée : {result['duration_seconds']:.1f}s")
            else:
                print(f"❌ Erreur : {result['error']}")
        else:
            print("⚠️  Blender non trouvé. Configurez BLENDER_EXECUTABLE dans .env")

    print("\n" + "═" * 60)
    print("  Documentation complète : documentation/BLENDER_INTEGRATION.md")
    print("═" * 60 + "\n")


if __name__ == "__main__":
    main()
