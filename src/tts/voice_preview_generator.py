"""
Voice Preview Generator - Calibration tool for Character Voice Profiles.
Allows checking pitch and intonation variations before final character registration.
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional
from pathlib import Path

from src.models.character_ccd import VoiceProfile, VoiceIntonation, Gender
from src.tts.kitten_tts_integration import KittenTTSIntegration

class VoicePreviewGenerator:
    """
    Utility service to preview different vocal settings (Pitch, Intonation, Speed).
    """

    def __init__(self, tts_engine: Optional[KittenTTSIntegration] = None):
        self.logger = logging.getLogger(__name__)
        self.tts = tts_engine or KittenTTSIntegration()
        self.preview_dir = Path("data/audio/previews")
        self.preview_dir.mkdir(parents=True, exist_ok=True)

    async def generate_variants(self, text: str, base_voice_id: str) -> Dict[str, str]:
        """Generates a matrix of voice variants for a given base voice."""
        variants = {
            "high_pitch": {"pitch": 4.0},
            "low_pitch": {"pitch": -4.0},
            "emotional": {"intonation": VoiceIntonation.EMOTIONAL.value},
            "whisper": {"intonation": VoiceIntonation.WHISPER.value},
            "fast": {"speed": 1.5}
        }
        
        results = {}
        self.logger.info(f"Generating voice variants for {base_voice_id}...")
        
        for name, params in variants.items():
            result = await self.tts.synthesize(
                text=text,
                voice_id=base_voice_id,
                pitch_offset=params.get("pitch", 0.0),
                intonation=params.get("intonation", "stable"),
                speed=params.get("speed", 1.0)
            )
            
            if result.success:
                results[name] = result.audio_path
                
        return results

    def suggest_voice_by_gender(self, gender: Gender) -> str:
        """Suggests a default Kitten TTS voice ID based on gender."""
        if gender == Gender.MASCULINE:
            return "heroic_male"
        elif gender == Gender.FEMININE:
            return "natural_1" # Sophie
        else:
            return "natural_1" # Fallback
            
    async def generate_visemes(self, text: str, profile: VoiceProfile) -> List[Dict[str, Any]]:
        """
        Generates alphabetical visemes from phoneme alignment.
        Useful for the Blender automate Lip-Sync script.
        """
        result = await self.tts.synthesize(
            text=text,
            voice_id=profile.kitten_voice_id or self.suggest_voice_by_gender(profile.gender),
            pitch_offset=profile.pitch_offset,
            intonation=profile.intonation.value,
            speed=profile.speed
        )
        
        if result.success and result.phoneme_alignment:
            return [
                {
                    "timestamp": p["start_time"],
                    "viseme": p["phoneme"][0] if p.get("phoneme") else "A" 
                }
                for p in result.phoneme_alignment
            ]
        return []

    async def preview_profile(self, profile: VoiceProfile, test_text: str = "Hello, this is my new voice.") -> Optional[str]:
        """Provides a preview for a specific VoiceProfile object."""
        result = await self.tts.synthesize(
            text=test_text,
            voice_id=profile.kitten_voice_id or self.suggest_voice_by_gender(profile.gender),
            pitch_offset=profile.pitch_offset,
            intonation=profile.intonation.value,
            speed=profile.speed
        )
        return result.audio_path if result.success else None
