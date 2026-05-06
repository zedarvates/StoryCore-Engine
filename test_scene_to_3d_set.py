import json
import os
import sys

# Add src to path
sys.path.append(os.getcwd())

from src.three_d.set_builder import SetBuilderEngine


def run_set_builder_test():
    print("🏙️ STORYCORE 3D SET BUILDER TEST - Scene Layout 🏙️")
    print("=" * 60)

    # 1. Create Dummy Scene Breakdown
    breakdown_data = {
        "detailed_scenes": [
            {
                "scene_id": "ANYA_INTRO_01",
                "environment": {"type": "interior", "atmosphere": "peaceful"},
                "characters": [
                    {
                        "character_id": "ANYA_V2",
                        "name": "Anya",
                        "role_in_scene": "primary_focus",
                        "positioning": {"world_position": (0.0, 0.0, 0.0)},
                    }
                ],
                "lighting": {"primary": "warm_morning", "intensity": "medium"},
                "composition": {"style": "cinematic_portrait", "focal_length": 50},
            }
        ]
    }

    breakdown_file = "exports/test_scene_breakdown.json"
    os.makedirs("exports", exist_ok=True)
    with open(breakdown_file, "w") as f:
        json.dump(breakdown_data, f, indent=2)

    print(f"✓ Analysis file created: {breakdown_file}")

    # 2. Run Set Builder Engine
    engine = SetBuilderEngine()
    scene = breakdown_data["detailed_scenes"][0]

    print("\nDrafting 3D Layout (Primitives)...")
    layout = engine.generate_layout_from_breakdown(scene)

    print(f"✓ Env Template: {layout.environment_type}")
    print(f"✓ Primitives Placed: {[p.name for p in layout.primitives]}")
    print(f"✓ Puppets Assigned: {[p['name'] for p in layout.puppets]}")

    # 3. Export for ComfyUI (PrimitiveAnything)
    manifest_path = engine.export_comfy_manifest(layout)
    print(f"\n✓ ComfyUI Manifest generated: {manifest_path}")
    print("✓ Ready for Node: 'PrimitiveAnything_Loader' / 'Playbook_Scenario'")

    # 4. Preview Sync Logic
    sync_cmd = engine.sync_to_blender(layout)
    print(f"\n[Blender-Link]: {sync_cmd}")
    print("🏆 SET PRODUCTION TEST SUCCESSFUL.")


if __name__ == "__main__":
    run_set_builder_test()
