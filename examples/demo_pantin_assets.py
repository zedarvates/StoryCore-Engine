"""
demo_pantin_assets.py — Démonstration de la génération d'assets (Pantin + Box + Skybox)
====================================================================================

Ce script montre comment utiliser les nouveaux générateurs pour créer une scène 3D complète :
1. Un pantin de base avec armature
2. Une scène de base en 'boîtes'
3. Intégration théorique avec Skybox via ComfyUI
"""

import os
import sys
from pathlib import Path

# Ajouter le root au path pour importer les modules locaux
sys.path.append(str(Path(__file__).parent))

from blender_bridge.rig_generator import RigGenerator
from blender_bridge.skybox_generator import SkyboxGenerator
from blender_bridge.scene_types import CharacterRig, RigType


def generate_demo_script():
    """Génère un script Blender complet pour démonstration."""
    rig_gen = RigGenerator()
    SkyboxGenerator()

    # Simulation d'un personnage
    pantin_rig = CharacterRig(
        name="Alpha",
        rig_type=RigType.HUMANOID,
        position=(0, 0, 0),
        height=1.80,
        material_color=(0.2, 0.5, 0.8),  # Bleu
    )

    # 1. Obtenir le code du Pantin
    pantin_code = rig_gen.generate_pantin_script(pantin_rig)

    # 2. Générer le script complet
    full_script = f"""\
import bpy
import math

def setup_demo():
    # Nettoyage
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # --- Étape 1 : Créer la Scène de Base (Box) ---
    print("Génération de la scène en boîte...")
    # (On simule l'appel à BoxSceneGenerator.create_simple_room)
    bpy.ops.mesh.primitive_plane_add(size=10, location=(0,0,0)) # Sol
    
    # Mur arrière
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 5, 2))
    bpy.context.active_object.scale = (10, 0.2, 4)
    
    # --- Étape 2 : Créer le Pantin ---
    print("Génération du pantin Alpha...")
{pantin_code}

    # --- Étape 3 : Caméra et Lumière ---
    bpy.ops.object.camera_add(location=(0, -8, 2))
    cam = bpy.context.active_object
    cam.rotation_euler = (math.radians(80), 0, 0)
    bpy.context.scene.camera = cam
    
    bpy.ops.object.light_add(type='SUN', location=(5, -5, 10))

    print("Scène prête !")

setup_demo()
"""

    output_path = "exports/blender/demo_pantin.py"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_script)

    print(f"Script de démo généré : {output_path}")
    print("Vous pouvez l'exécuter avec : blender -b -P {output_path}")


if __name__ == "__main__":
    generate_demo_script()
