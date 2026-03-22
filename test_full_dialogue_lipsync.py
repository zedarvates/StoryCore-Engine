import asyncio
import os
import json
import sys
from pathlib import Path

# Add src to path
sys.path.append(os.getcwd())

from src.models.character_ccd import (
    CharacterCoreData, VisualProfile, NarrativeProfile, VoiceProfile,
    ArtStyle, CreationMethod, Gender, VoiceIntonation
)
from src.tts.voice_preview_generator import VoicePreviewGenerator

async def run_full_dialogue_test():
    print("🎭 FULL DIALOGUE LIP-SYNC TEST - Anya's Monologue 🎭")
    print("=" * 60)
    
    # 1. Setup Anya's Voice Profile
    profile = VoiceProfile(
        gender=Gender.FEMININE,
        pitch_offset=2.5,
        intonation=VoiceIntonation.EMOTIONAL,
        kitten_voice_id="natural_1"
    )
    
    # 2. The Dialogue script
    dialogue = [
        "Welcome to the StoryCore Engine production suite.",
        "I am Anya, and today we are testing the full synchronization between my voice and my 3D mesh.",
        "It is a complex process, but it allows for unprecedented character consistency.",
        "Now, let's look at the generated viseme data for Blender."
    ]
    full_text = " ".join(dialogue)
    
    # 3. Initialize Generator
    generator = VoicePreviewGenerator()
    
    print(f"Processing dialogue ({len(dialogue)} sentences)...")
    
    # 4. Generate Visemes for the whole dialogue
    visemes = await generator.generate_visemes(full_text, profile)
    
    # 5. Export for Blender
    output_path = "exports/anya_full_monologue_lipsync.json"
    os.makedirs("exports", exist_ok=True)
    
    with open(output_path, "w", encoding='utf-8') as f:
        json.dump(visemes, f, indent=2)
        
    print(f"\n✓ Full dialogue processed: {len(visemes)} viseme keyframes generated.")
    print(f"✓ Total duration estimate: {visemes[-1]['timestamp'] + 0.5:.2f} seconds.")
    print(f"✓ Saved to: {output_path}")
    
    print("\n[Blender Pipeline Preview]")
    print(f"  1. In Blender, select 'Anya' mesh.")
    print(f"  2. Run 'src/three_d/blender_lipsync_animator.py'.")
    print(f"  3. Open '{output_path}'.")
    print(f"  4. Watch Anya speak her monologue at 24 FPS.")

    print("\n🏆 DIALOGUE TEST SUCCESSFUL.")

if __name__ == "__main__":
    asyncio.run(run_full_dialogue_test())
