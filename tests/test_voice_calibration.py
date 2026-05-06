import asyncio
import os
import sys

# Add src to path
sys.path.append(os.getcwd())

from src.models.character_ccd import VoiceProfile, VoiceIntonation, Gender
from src.tts.voice_preview_generator import VoicePreviewGenerator


async def test_voice_preview():
    print("\n--- Testing Vocal Calibration ---")

    profiler = VoicePreviewGenerator()

    # Create a custom profile (High pitch, emotional)
    profile = VoiceProfile(
        gender=Gender.FEMININE,
        pitch_offset=5.5,
        intonation=VoiceIntonation.EMOTIONAL,
        speed=1.2,
    )

    print(
        f"Generating sample for profile: Pitch={profile.pitch_offset}, Intonation={profile.intonation.value}"
    )

    path = await profiler.preview_profile(profile, "Hey, looking sharp today!")

    if path and os.path.exists(path):
        print(f"✓ Success! Voice preview generated at: {path}")
    else:
        print("Failed to generate voice preview.")


if __name__ == "__main__":
    asyncio.run(test_voice_preview())
