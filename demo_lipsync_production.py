import asyncio
import os
import json
import sys

# Add src to path
sys.path.append(os.getcwd())

from src.models.character_ccd import VoiceProfile, Gender, VoiceIntonation
from src.tts.voice_preview_generator import VoicePreviewGenerator


async def run_lipsync_demo():
    print("👄 STORYCORE LIP-SYNC PRODUCTION DEMO 👄")
    print("=" * 60)

    # 1. Setup Character with Voice
    profile = VoiceProfile(
        gender=Gender.FEMININE, pitch_offset=2.5, intonation=VoiceIntonation.EMOTIONAL
    )

    # 2. Initialize Generator
    generator = VoicePreviewGenerator()

    script = "Hello Blender, I am Anya. I can talk now!"
    print(f"Generating visemes for: '{script}'")

    # 3. Generate Viseme Data
    visemes = await generator.generate_visemes(script, profile)

    # 4. Save to JSON for Blender
    output_path = "exports/anya_lipsync_data.json"
    os.makedirs("exports", exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(visemes, f, indent=2)

    print(f"\n✓ Viseme data generated ({len(visemes)} entries).")
    print(f"✓ File saved to: {output_path}")
    print("✓ Ready for Blender script: src/three_d/blender_lipsync_animator.py")

    # Print sample
    print("\nSample Visemes:")
    for v in visemes[:5]:
        print(f"  Time: {v['timestamp']:.2f}s -> Viseme: {v['viseme']}")

    print("\n🏆 PRODUCTION READY: Feed this JSON into Blender for instant animation.")


if __name__ == "__main__":
    asyncio.run(run_lipsync_demo())
