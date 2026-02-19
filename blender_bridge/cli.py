"""
cli.py — Interface ligne de commande pour BlenderBridge
========================================================

Permet d'utiliser BlenderBridge directement depuis le terminal,
sans écrire de code Python.

Usage :
    python -m blender_bridge.cli render "Ruelle cyberpunk sous pluie avec Alpha devant"
    python -m blender_bridge.cli dry-run "Caméra basse 35mm contre-plongée"
    python -m blender_bridge.cli scene "Forêt brumeuse" --json
    python -m blender_bridge.cli script "Studio sombre" --output ./scripts/
    python -m blender_bridge.cli status
    python -m blender_bridge.cli presets
    python -m blender_bridge.cli shots
    python -m blender_bridge.cli project "Ruelle cyberpunk" "Caméra basse" "Alpha devant"

    # Système 2.5D
    python -m blender_bridge.cli project2d image.png exterior --camera low_angle
    python -m blender_bridge.cli project2d image.png interior --trees 5

    # Storyboard depuis un fichier
    python -m blender_bridge.cli storyboard beats.json --output ./renders/

Alias rapide : vous pouvez créer un script blender_bridge_cli.bat
    @echo off
    python -m blender_bridge.cli %*
"""

from __future__ import annotations
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Optional

# Ajouter le répertoire racine au path si nécessaire
_root = Path(__file__).parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

logging.basicConfig(
    level=logging.WARNING,
    format="[%(levelname)s] %(message)s",
)

from blender_bridge import BlenderBridge
from blender_bridge.camera_system import CinematicCameraSystem
from blender_bridge.location_manager import LocationManager
from blender_bridge.voice_bridge import VoiceToSceneBridge
from blender_projection.scene_builder import build_projected_scene, ProjectionConfig


# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS D'AFFICHAGE
# ─────────────────────────────────────────────────────────────────────────────

def _ok(msg: str): print(f"✅ {msg}")
def _warn(msg: str): print(f"⚠️  {msg}")
def _err(msg: str): print(f"❌ {msg}", file=sys.stderr)
def _info(msg: str): print(f"   {msg}")
def _sep(title: str = ""): print(f"\n{'─' * 60}\n{'  ' + title if title else ''}")


# ─────────────────────────────────────────────────────────────────────────────
#  COMMANDES
# ─────────────────────────────────────────────────────────────────────────────

def cmd_status(args, bridge: BlenderBridge):
    """Affiche le statut du système BlenderBridge."""
    _sep("STATUT BLENDERBRIDGE")
    status = bridge.status()

    print(f"\n  Blender disponible : {'✅ OUI' if status['blender_available'] else '❌ NON'}")
    if status.get("blender_version"):
        print(f"  Version Blender     : {status['blender_version']}")
    print(f"  Presets de lieux    : {status['location_presets']}")
    print(f"  Types de plans      : {status['camera_shot_types']}")
    print(f"  Scripts dir         : {status['scripts_dir']}")

    if not status["blender_available"]:
        print("\n  Pour installer Blender :")
        print("    → https://www.blender.org/download/")
        print("    → Définissez BLENDER_EXECUTABLE dans votre .env")
        print("      Ex: BLENDER_EXECUTABLE=C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe")


def cmd_presets(args, bridge: BlenderBridge):
    """Liste les presets de lieux disponibles."""
    _sep("PRESETS DE LIEUX")
    presets = bridge.locations.list_all()

    if not presets:
        _warn("Aucun preset disponible.")
        return

    query = getattr(args, "filter", None) or ""
    if query:
        presets = bridge.locations.search(query=query)
        print(f"\n  Recherche : '{query}' → {len(presets)} résultat(s)")

    print(f"\n  {'ID':25s} {'NOM':25s} {'TYPE':10s} {'TAGS'}")
    print(f"  {'─'*25} {'─'*25} {'─'*10} {'─'*30}")
    for p in presets:
        tags = ", ".join(p.tags[:4])
        print(f"  {p.id:25s} {p.name:25s} {p.scene_type.value:10s} {tags}")


def cmd_shots(args, bridge: BlenderBridge):
    """Liste les types de plans cinématographiques."""
    _sep("TYPES DE PLANS CINÉMATOGRAPHIQUES")
    from blender_bridge.scene_types import ShotType
    cam_sys = CinematicCameraSystem()
    shot_types = cam_sys.list_shot_types()

    print(f"\n  {'TYPE':22s} {'FOCALE':8s} {'F-STOP':8s} DESCRIPTION")
    print(f"  {'─'*22} {'─'*8} {'─'*8} {'─'*35}")
    for shot_name, desc in shot_types.items():
        cam = cam_sys.get_camera_for_shot(ShotType(shot_name))
        print(f"  {shot_name:22s} {cam.lens:5.0f}mm  f/{cam.f_stop:<5.1f} {desc[:38]}")


def cmd_scene(args, bridge: BlenderBridge):
    """Parse une commande vocale et affiche la scène JSON."""
    command = " ".join(args.voice_cmd)
    scene = bridge.parse_voice_command(command)

    if getattr(args, "json", False):
        print(scene.to_json(indent=2))
    else:
        _sep(f"SCÈNE : {scene.scene_id}")
        print(f"\n  Commande    : {command}")
        print(f"  Scene ID    : {scene.scene_id}")
        print(f"  Type        : {scene.scene_type.value}")
        print(f"  Preset lieu : {scene.location_preset_id or '(aucun)'}")
        print(f"  Tags        : {', '.join(scene.narrative_tags) or '(aucun)'}")
        print(f"\n  📷 Caméra")
        print(f"    Shot type : {scene.camera.shot_type.value}")
        print(f"    Focale    : {scene.camera.lens}mm")
        print(f"    F-stop    : f/{scene.camera.f_stop}")
        print(f"    DoF       : {'activé' if scene.camera.dof_enabled else 'désactivé'}")
        print(f"    Position  : {[round(v, 2) for v in scene.camera.position]}")
        print(f"\n  🌫️  Atmosphère")
        print(f"    Type      : {scene.atmosphere.type.value}")
        print(f"    Densité   : {scene.atmosphere.density:.3f}")
        if scene.characters:
            print(f"\n  👤 Personnages ({len(scene.characters)})")
            for c in scene.characters:
                print(f"    {c.name:15s} @ {[round(v, 2) for v in c.position]} h={c.height}m")
        if scene.lighting.lights:
            print(f"\n  💡 Éclairage ({len(scene.lighting.lights)} lumières)")
            for light in scene.lighting.lights:
                print(f"    {light.name:20s} {light.light_type.value:8s} {light.energy:.0f}W")


def cmd_script(args, bridge: BlenderBridge):
    """Génère un script Blender depuis une commande vocale."""
    command = " ".join(args.voice_cmd)
    output = getattr(args, "output", None)

    script_path = bridge.generate_script_only(command, output_path=output)
    _ok(f"Script généré : {script_path}")

    # Afficher la commande CLI correspondante
    scene = bridge.parse_voice_command(command)
    runner = bridge.runner
    dry = runner.dry_run(script_path, scene)
    print(f"\n  Commande CLI :")
    print(f"  {dry['command']}")


def cmd_dry_run(args, bridge: BlenderBridge):
    """Simule le pipeline sans exécuter Blender."""
    command = " ".join(args.voice_cmd)
    result = bridge.dry_run(command)

    _sep("DRY RUN")
    print(f"\n  Commande vocale : {command}")
    print(f"  Script généré   : {result['script_path']}")
    print(f"  Blender dispo   : {'✅' if result['blender_available'] else '❌'}")
    if result.get("blender_version"):
        print(f"  Version         : {result['blender_version']}")
    print(f"\n  Commande CLI :")
    print(f"  {result['command']}")

    if getattr(args, "json", False):
        print(f"\n  JSON de la scène :")
        print(json.dumps(result["scene_json"], indent=2, ensure_ascii=False))


def cmd_render(args, bridge: BlenderBridge):
    """Lance le pipeline complet : commande vocale → rendu Blender."""
    command = " ".join(args.voice_cmd)
    output = getattr(args, "output", None)

    _sep("RENDU BLENDER")
    print(f"\n  Commande : {command}")
    print(f"  ...")

    result = bridge.render_from_voice(command, output_path=output)

    if result["success"]:
        _ok(f"Rendu terminé en {result.get('duration_seconds', 0):.1f}s")
        print(f"  Fichier : {result['render_path']}")
    else:
        _err(f"Rendu échoué : {result.get('error', 'Erreur inconnue')}")
        print(f"\n  Script généré : {result.get('script_path')}")
        print(f"  Commande CLI  : {result.get('command', 'N/A')}")
        print(f"\n  Pour lancer manuellement (une fois Blender installé) :")
        print(f"  {result.get('command', '')}")


def cmd_project(args, bridge: BlenderBridge):
    """Construction incrémentale de scène depuis plusieurs commandes."""
    commands = args.voice_cmds
    if not commands:
        _err("Au moins une commande requise.")
        return

    _sep("CONSTRUCTION INCRÉMENTALE")
    bridge_voice = VoiceToSceneBridge()

    scene = bridge_voice.parse(commands[0])
    print(f"\n  [1] {commands[0]}")
    print(f"      → {scene.scene_id} | {scene.camera.shot_type.value} | {scene.atmosphere.type.value}")

    for i, cmd in enumerate(commands[1:], 2):
        scene = bridge_voice.apply_command(scene, cmd)
        print(f"  [{i}] {cmd}")
        print(f"      → {scene.camera.shot_type.value} | {scene.atmosphere.type.value} | {[c.name for c in scene.characters]}")

    print()

    if getattr(args, "json", False):
        print(scene.to_json(indent=2))
        return

    # Générer le script
    script_path = bridge.script_gen.generate(scene)
    runner = bridge.runner
    dry = runner.dry_run(script_path, scene)

    _ok(f"Script généré : {script_path}")
    print(f"\n  Commande CLI :")
    print(f"  {dry['command']}")

    if getattr(args, "render", False) and bridge.is_ready():
        print(f"\n  🔄 Lancement du rendu...")
        result = bridge.render(scene)
        if result["success"]:
            _ok(f"Rendu → {result['render_path']}")
        else:
            _err(f"Erreur : {result.get('error')}")


def cmd_project2d(args, bridge: BlenderBridge):
    """Génère une scène 2.5D depuis une image source."""
    image_path = args.image
    scene_type = getattr(args, "type", "exterior") or "exterior"

    camera_mode = getattr(args, "camera", "wide") or "wide"
    trees = getattr(args, "trees", 0) or 0
    depth_map = getattr(args, "depth", None)
    engine = getattr(args, "engine", "EEVEE") or "EEVEE"
    output = getattr(args, "output", None)

    _sep("PROJECTION 2.5D")
    print(f"\n  Image       : {image_path}")
    print(f"  Type scène  : {scene_type}")
    print(f"  Caméra      : {camera_mode}")
    print(f"  Arbres      : {trees}")
    print(f"  Depth map   : {depth_map or '(simulation artificielle)'}")
    print(f"  Moteur      : {engine}")

    config = {
        "camera_mode": camera_mode,
        "plant_trees": trees > 0,
        "tree_count": trees,
        "use_depth_map": depth_map is not None,
        "depth_map_path": depth_map,
        "engine": engine,
    }
    if output:
        config["output_path"] = output

    script_path = build_projected_scene(image_path, scene_type, config)
    _ok(f"Script généré : {script_path}")
    print(f"\n  Commande CLI :")
    print(f"  blender -b -P {script_path} -- {image_path} {scene_type}")

    if getattr(args, "render", False) and bridge.is_ready():
        print(f"\n  🔄 Lancement du rendu...")
        result = bridge.runner.execute_projection(script_path, image_path, scene_type)
        if result.get("success"):
            _ok(f"Rendu → {result['render_path']}")
        else:
            _err(f"Erreur : {result.get('error')}")


def cmd_storyboard(args, bridge: BlenderBridge):
    """Génère des scènes depuis un fichier de beats JSON."""
    beats_path = args.beats_file
    output_dir = getattr(args, "output", "./exports/blender/storyboard") or "./exports/blender/storyboard"

    try:
        with open(beats_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        _err(f"Fichier introuvable : {beats_path}")
        return
    except json.JSONDecodeError as e:
        _err(f"JSON invalide : {e}")
        return

    beats = data if isinstance(data, list) else data.get("beats", [])
    if not beats:
        _err("Aucun beat trouvé dans le fichier.")
        return

    _sep(f"STORYBOARD : {len(beats)} beats")

    from blender_bridge.backend_integration import NarrativePipelineBridge
    narrative = NarrativePipelineBridge(blender_bridge=bridge)

    if getattr(args, "render", False):
        print(f"\n  🔄 Rendu de {len(beats)} scènes...")
        results = narrative.render_all(beats, output_dir=output_dir)
        success = sum(1 for r in results if r.get("success"))
        _ok(f"{success}/{len(beats)} scènes rendues")
    else:
        scenes = narrative.beats_to_scenes(beats)
        print(f"\n  {'#':4s} {'SCÈNE':25s} {'PLAN':18s} {'ATMO':15s} {'PERSONNAGES'}")
        print(f"  {'─'*4} {'─'*25} {'─'*18} {'─'*15} {'─'*25}")
        for i, scene in enumerate(scenes):
            chars = ", ".join(c.name for c in scene.characters) or "—"
            print(
                f"  {i+1:4d} {scene.scene_id[:25]:25s} "
                f"{scene.camera.shot_type.value[:18]:18s} "
                f"{scene.atmosphere.type.value[:15]:15s} "
                f"{chars[:25]}"
            )

    # Exporter le storyboard JSON
    sb_path = narrative.export_storyboard(f"{output_dir}/storyboard.json")
    _ok(f"Storyboard exporté : {sb_path}")


# ─────────────────────────────────────────────────────────────────────────────
#  POINT D'ENTRÉE PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        prog="python -m blender_bridge.cli",
        description="BlenderBridge CLI — StoryCore-Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples :
  python -m blender_bridge.cli status
  python -m blender_bridge.cli presets
  python -m blender_bridge.cli shots
  python -m blender_bridge.cli scene "Ruelle cyberpunk sous pluie"
  python -m blender_bridge.cli scene "Ruelle cyberpunk" --json
  python -m blender_bridge.cli script "Studio sombre"
  python -m blender_bridge.cli dry-run "Caméra basse 35mm contre-plongée"
  python -m blender_bridge.cli render "Ruelle cyberpunk avec Alpha"
  python -m blender_bridge.cli project "Ruelle cyberpunk" "Caméra basse 35mm" "Alpha à 2m"
  python -m blender_bridge.cli project2d scene.png exterior --camera low_angle --trees 5
  python -m blender_bridge.cli storyboard beats.json --output ./renders/
        """,
    )

    parser.add_argument("--blender", metavar="PATH", help="Chemin vers l'exécutable Blender")
    parser.add_argument("--verbose", "-v", action="store_true", help="Mode verbeux")

    subs = parser.add_subparsers(dest="command", metavar="COMMANDE")

    # status
    subs.add_parser("status", help="Affiche le statut du système")

    # presets
    p_presets = subs.add_parser("presets", help="Liste les presets de lieux")
    p_presets.add_argument("--filter", metavar="TEXTE", help="Filtrer les presets")

    # shots
    subs.add_parser("shots", help="Liste les types de plans cinématographiques")

    # scene
    p_scene = subs.add_parser("scene", help="Parse une commande et affiche la scène")
    p_scene.add_argument("voice_cmd", nargs="+", help="Commande vocale")
    p_scene.add_argument("--json", action="store_true", help="Sortie en JSON")

    # script
    p_script = subs.add_parser("script", help="Génère le script Blender Python")
    p_script.add_argument("voice_cmd", nargs="+", help="Commande vocale")
    p_script.add_argument("--output", metavar="PATH", help="Chemin de sortie du script")

    # dry-run
    p_dry = subs.add_parser("dry-run", help="Simule le pipeline sans exécuter Blender")
    p_dry.add_argument("voice_cmd", nargs="+", help="Commande vocale")
    p_dry.add_argument("--json", action="store_true", help="Afficher la scène JSON")

    # render
    p_render = subs.add_parser("render", help="Lance le rendu Blender complet")
    p_render.add_argument("voice_cmd", nargs="+", help="Commande vocale")
    p_render.add_argument("--output", metavar="PATH", help="Chemin de sortie du rendu")

    # project (construction incrémentale)
    p_project = subs.add_parser("project", help="Construction incrémentale de scène")
    p_project.add_argument("voice_cmds", nargs="+", help="Séquence de commandes vocales")
    p_project.add_argument("--json", action="store_true", help="Sortie JSON")
    p_project.add_argument("--render", action="store_true", help="Lancer le rendu")

    # project2d (projection d'image)
    p_2d = subs.add_parser("project2d", help="Scène 2.5D par projection d'image")
    p_2d.add_argument("image", help="Chemin vers l'image source")
    p_2d.add_argument("type", nargs="?", default="exterior", choices=["exterior", "interior"])
    p_2d.add_argument("--camera", default="wide", choices=["wide", "close", "over_shoulder", "low_angle", "high_angle"])
    p_2d.add_argument("--trees", type=int, default=0, metavar="N")
    p_2d.add_argument("--depth", metavar="PATH", help="Chemin vers la depth map")
    p_2d.add_argument("--engine", default="EEVEE", choices=["EEVEE", "CYCLES"])
    p_2d.add_argument("--output", metavar="PATH", help="Chemin de sortie du rendu")
    p_2d.add_argument("--render", action="store_true", help="Lancer le rendu")

    # storyboard
    p_sb = subs.add_parser("storyboard", help="Génère des scènes depuis un fichier beats JSON")
    p_sb.add_argument("beats_file", help="Fichier JSON de beats narratifs")
    p_sb.add_argument("--output", metavar="DIR", default="./exports/blender/storyboard")
    p_sb.add_argument("--render", action="store_true", help="Lancer le rendu de toutes les scènes")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.INFO)

    if not args.command:
        parser.print_help()
        return

    # Initialiser le bridge
    bridge = BlenderBridge(blender_executable=getattr(args, "blender", None))

    # Dispatcher
    dispatch = {
        "status":     cmd_status,
        "presets":    cmd_presets,
        "shots":      cmd_shots,
        "scene":      cmd_scene,
        "script":     cmd_script,
        "dry-run":    cmd_dry_run,
        "render":     cmd_render,
        "project":    cmd_project,
        "project2d":  cmd_project2d,
        "storyboard": cmd_storyboard,
    }

    handler = dispatch.get(args.command)
    if handler:
        handler(args, bridge)
    else:
        _err(f"Commande inconnue : {args.command}")
        parser.print_help()


if __name__ == "__main__":
    main()
