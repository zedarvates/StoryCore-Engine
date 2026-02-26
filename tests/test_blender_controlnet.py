
import os
import sys
from pathlib import Path

# Ajouter le répertoire courant au path pour l'import
sys.path.append(os.getcwd())

from blender_bridge.scene_types import SceneJSON, RenderSettings
from blender_bridge.script_generator import BlenderScriptGenerator

def test_controlnet_generation():
    scene = SceneJSON(
        scene_id="test_controlnet",
        render=RenderSettings(
            export_controlnet=True,
            output_path="./exports/test_render.png"
        )
    )
    
    generator = BlenderScriptGenerator()
    script_path = generator.generate(scene)
    
    print(f"Script genere : {script_path}")
    
    with open(script_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Vérifications
    assert "COMPOSITION CONTROLNET" in content
    assert "CompositorNodeRLayers" in content
    assert "CompositorNodeMapValue" in content
    assert "CompositorNodeOutputFile" in content
    assert "STORYCORE_CONTROLNET_EXPORT_COMPLETE" in content
    
    print("SUCCESS: Test de generation ControlNet reussi !")

if __name__ == "__main__":
    try:
        test_controlnet_generation()
    except Exception as e:
        print(f"FAILURE: Test echoue : {e}")
        sys.exit(1)
