import asyncio
import os
import sys
from PIL import Image

# Add src to path
sys.path.append(os.getcwd())

from src.models.character_ccd import (
    CharacterCoreData,
    VisualProfile,
    NarrativeProfile,
    VoiceProfile,
    CreationMethod,
    Gender,
    VoiceIntonation,
)
from src.character_wizard.methodology_switcher import MethodologySwitcher
from src.character_wizard.character_wizard_orchestrator import (
    CharacterWizardOrchestrator,
)
from src.character_registry import CharacterRegistry
from backend.config import settings

# Force mock mode for the demo
settings.USE_MOCK_COMFYUI = True


async def run_full_demo():
    print("🎭 FULL CHARACTER CREATION DEMO - StoryCore Engine v2 🎭")
    print("=" * 60)

    CharacterRegistry("data/demo_characters")
    switcher = MethodologySwitcher()

    # --- STEP 1: INITIAL 2D CAPTURE ---
    print("\n[Step 1] Initial Image Capture (2D-First)")
    test_sketch = "demo_sketch.png"
    Image.new("RGB", (100, 100), color="purple").save(test_sketch)

    # We start with a person created via 2D-First from image
    ccd = CharacterCoreData(
        name="Anya",
        creation_method=CreationMethod.TWO_D_FIRST,
        visual=VisualProfile(reference_images=[test_sketch]),
        narrative=NarrativeProfile(role="Heroine"),
        voice=VoiceProfile(gender=Gender.FEMININE),
    )

    # Execute 2D pipeline (Analyze sketch, populate locks)
    ccd = await switcher.execute_pipeline(ccd)
    print(f"✓ Sketch analyzed. ArtStyle: {ccd.visual.art_style.value}")
    print(f"✓ Discovered Traits: {ccd.visual.physical_description}")

    # --- STEP 2: VOCAL CALIBRATION ---
    print("\n[Step 2] Voice Profile Fine-Tuning")
    ccd.voice.pitch_offset = 2.5  # Make her sound more energetic
    ccd.voice.intonation = VoiceIntonation.EMOTIONAL
    ccd.voice.speed = 1.1

    print(
        f"✓ Adjusted Vocal Settings: Pitch={ccd.voice.pitch_offset}, Intonation={ccd.voice.intonation.value}"
    )

    # --- STEP 3: METHODOLOGY SHIFT (Refining via Vision-First) ---
    print("\n[Step 3] Methodology Shift (Transitioning to Artistic Vision)")
    ccd.creation_method = CreationMethod.VISION_FIRST

    # Execute Shift (Artistic Locks should protect her traits)
    ccd = await switcher.execute_pipeline(ccd)
    print(
        f"✓ Shift successful. Artistic Locks Active: {[l.attribute for l in ccd.artistic_locks]}"
    )

    # --- STEP 4: CHARACTER SHEET (GRID) ---
    print("\n[Step 4] Character Sheet Generation (Multi-Outfit Grid)")
    orchestrator = CharacterWizardOrchestrator()
    bundle = await orchestrator._run_character_sheet_generation(ccd)
    print(f"✓ Character Sheet Planned: {bundle.grid_image_path}")
    print(f"✓ Outfits Planned: {[o.value for o in bundle.config.outfits]}")

    # --- STEP 6: 3D EXPORT (Blender/Three.js) ---
    print("\n[Step 6] 3D Asset Export (Blender & Three.js)")
    from src.character_wizard.character_exporter import export_character

    # Simulate adding 3D assets to the CCD
    ccd.visual.mesh_assets = {
        "glb": f"assets/characters/{ccd.name}/mesh/anya_v2.glb",
        "fbx": f"assets/characters/{ccd.name}/mesh/anya_rigged.fbx",
        "obj": f"assets/characters/{ccd.name}/mesh/anya_static.obj",
    }

    export_dir = f"exports/{ccd.name}_3d_package"
    export_character(ccd, export_dir, format="3d")
    print(f"✓ 3D Production Bundle exported to: {export_dir}")
    print(f"✓ Formats Ready: {list(ccd.visual.mesh_assets.keys())}")

    # Cleanup
    if os.path.exists(test_sketch):
        os.remove(test_sketch)

    print(
        "\n🏆 DEMO SUCCESS: Character is consistent and ready for Video & 3D Production."
    )


if __name__ == "__main__":
    asyncio.run(run_full_demo())
