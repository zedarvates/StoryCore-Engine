"""
StoryCore PromptComposer

This module generates optimized prompts for multi-track audio generation.
Handles prompt composition for music, SFX, and voice tracks.

Requirements: AUDIO & SFX STORYCORE ENGINE (VERSION MULTIPISTE) - Section 12
"""

import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from backend.music_profile_builder import MusicProfile, MusicTrackType
from backend.sfx_profile_builder import SFXProfile, SFXTrackType
from backend.voice_profile_builder import VoiceProfile, VoiceType

logger = logging.getLogger(__name__)


# =============================================================================
# PROMPT COMPOSER
# =============================================================================

@dataclass
class GeneratedPrompt:
    """Generated prompt result"""
    track_name: str
    track_type: str
    prompt: str
    parameters: Dict[str, Any]
    estimated_duration: float


class PromptComposer:
    """
    Generates optimized prompts for multi-track audio generation.
    
    Section 12 - PROMPTCOMPOSITION MULTIPISTE
    
    Produces separate prompts for:
    - Music tracks (6 tracks)
    - SFX tracks (4 tracks)
    - Voice tracks (1-4 types)
    """
    
    def __init__(self):
        logger.info("PromptComposer initialized")
    
    # -------------------------------------------------------------------------
    # MUSIC PROMPTS (Section 12)
    # -------------------------------------------------------------------------
    
    def compose_music_track_prompt(
        self,
        profile: MusicProfile,
        track_type: MusicTrackType
    ) -> GeneratedPrompt:
        """
        Generate prompt for a specific music track.
        
        Section 12 format:
        "Génère uniquement la piste [nom_de_piste] pour une scène de [type d'œuvre] 
        dans [lieu], ambiance [ambiance], intensité [intensité], style [références], 
        tempo [tempo], transitions [transitions], basse mono propre sans déphasage."
        """
        # Get track info
        track = next(
            (t for t in profile.tracks if t.track_type == track_type),
            None
        )
        
        if not track:
            raise ValueError(f"Track type {track_type} not found in profile")
        
        # Compose prompt based on track type
        if track_type == MusicTrackType.BASE:
            prompt = self._compose_base_prompt(profile)
        elif track_type == MusicTrackType.MELODY:
            prompt = self._compose_melody_prompt(profile)
        elif track_type == MusicTrackType.PERCUSSION:
            prompt = self._compose_percussion_prompt(profile)
        elif track_type == MusicTrackType.BASS:
            prompt = self._compose_bass_prompt(profile)
        elif track_type == MusicTrackType.FX:
            prompt = self._compose_fx_prompt(profile)
        elif track_type == MusicTrackType.DRONES:
            prompt = self._compose_drones_prompt(profile)
        else:
            prompt = track.prompt
        
        return GeneratedPrompt(
            track_name=track.name,
            track_type=track_type.value,
            prompt=prompt,
            parameters=track.parameters,
            estimated_duration=profile.duration_seconds or 10.0
        )
    
    def compose_all_music_prompts(self, profile: MusicProfile) -> List[GeneratedPrompt]:
        """Generate prompts for all music tracks"""
        prompts = []
        for track_type in MusicTrackType:
            try:
                prompt = self.compose_music_track_prompt(profile, track_type)
                prompts.append(prompt)
            except ValueError as e:
                logger.warning(f"Skipping track {track_type}: {e}")
        return prompts
    
    def _compose_base_prompt(self, profile: MusicProfile) -> str:
        """Compose base/foundation track prompt"""
        return (
            f"Génère uniquement la piste BASE pour une scène de {profile.project_type.value} "
            f"dans {profile.location}, ambiance {profile.visual_style}, "
            f"intensité {profile.emotional_intensity.value}. "
            f"Cette piste constitue la fondation musicale avec les harmoniques fondamentaux. "
            f"Instruments: accordages stables, section harmonique. "
            f"Tempo: {self._get_tempo_info(profile)}. "
            f"Durée: {profile.duration_seconds or 10} secondes."
        )
    
    def _compose_melody_prompt(self, profile: MusicProfile) -> str:
        """Compose melody track prompt"""
        refs = ", ".join(profile.style_references) or "style cinématique"
        return (
            f"Génère uniquement la piste MÉLODIE pour une scène de {profile.project_type.value} "
            f"dans {profile.location}, ambiance {profile.visual_style}, "
            f"intensité {profile.emotional_intensity.value}. "
            f"Style: {refs}. "
            f"Instruments: mélodie principale avec instruments caractéristiques. "
            f"Durée: {profile.duration_seconds or 10} secondes."
        )
    
    def _compose_percussion_prompt(self, profile: MusicProfile) -> str:
        """Compose percussion track prompt"""
        rhythm = profile.action.visual_rhythm if profile.action else "normal"
        return (
            f"Génère uniquement la piste PERCUSSIONS pour une scène de {profile.project_type.value} "
            f"dans {profile.location}, rythme visuel {rhythm}. "
            f"Cette piste gère le rythme et la dynamique. "
            f"Instruments: drums, percussions, section rythmique. "
            f"Durée: {profile.duration_seconds or 10} secondes."
        )
    
    def _compose_bass_prompt(self, profile: MusicProfile) -> str:
        """Compose bass track prompt - Section 4.2 Bass Rules"""
        bass_rules = []
        if profile.action:
            bass_rules.append("mono" if profile.action.bass.mono else "stereo")
            bass_rules.append("phase-locked" if profile.action.bass.phase_locked else "")
            bass_rules.append("sub court" if profile.action.bass.sub_short else "")
            bass_rules.append("pas de pitch" if profile.action.bass.no_pitch else "")
        
        rules_str = ", ".join([r for r in bass_rules if r])
        
        return (
            f"Génère uniquement la piste BASSE pour une scène de {profile.project_type.value} "
            f"dans {profile.location}. {rules_str}. "
            f"Fréquence: sub-basse courte et propre, sans déphasage. "
            f"Caractéristiques: {rules_str}. "
            f"Durée: {profile.duration_seconds or 10} secondes."
        )
    
    def _compose_fx_prompt(self, profile: MusicProfile) -> str:
        """Compose musical FX track prompt"""
        fx_elements = ["reverse", "glitch", "impacts stylisés"]
        
        if profile.action:
            if profile.action.pitch.pitch_up_mount:
                fx_elements.append("montée avec pitch up")
            if profile.action.pitch.pitch_down_impact:
                fx_elements.append("impact avec pitch down")
            if profile.action.pitch.stylized_modulation:
                fx_elements.append("modulation stylisée")
        
        return (
            f"Génère uniquement la piste FX MUSICAUX pour une scène de {profile.project_type.value} "
            f"dans {profile.location}. Éléments: {', '.join(fx_elements)}. "
            f"Style: effets sonores cinématographiques. "
            f"Durée: {profile.duration_seconds or 5} secondes."
        )
    
    def _compose_drones_prompt(self, profile: MusicProfile) -> str:
        """Compose drones/pads track prompt"""
        return (
            f"Génère uniquement la piste DRONES pour une scène de {profile.project_type.value} "
            f"dans {profile.location}, ambiance {profile.visual_style}. "
            f"Textures sonores atmosphériques avec pads harmoniques et ambiances. "
            f"Instruments: synthétiseurs pads, textures atmosphériques. "
            f"Durée: {profile.duration_seconds or 15} secondes, loop possible."
        )
    
    def _get_tempo_info(self, profile: MusicProfile) -> str:
        """Get tempo information based on action context"""
        if not profile.action:
            return "90-120 BPM (variable selon scène)"
        
        # Section 4.2 Tempo Rules
        if profile.action.type.value in ["fight", "chase"]:
            return "130-160 BPM (action rapide)"
        elif profile.action.type.value == "bullet_time":
            return "60-80 BPM (bullet time)"
        elif profile.action.type.value == "tension":
            return "70-100 BPM (tension)"
        elif profile.action.visual_rhythm.value == "hyper":
            return "150-170 BPM (hyper)"
        elif profile.action.visual_rhythm.value == "slow":
            return "60-80 BPM (lent)"
        else:
            return "100-120 BPM (stylisé)"
    
    # -------------------------------------------------------------------------
    # SFX PROMPTS (Section 12)
    # -------------------------------------------------------------------------
    
    def compose_sfx_track_prompt(
        self,
        profile: SFXProfile,
        track_type: SFXTrackType
    ) -> GeneratedPrompt:
        """Generate prompt for a specific SFX track"""
        track = next(
            (t for t in profile.tracks if t.track_type == track_type),
            None
        )
        
        if not track:
            raise ValueError(f"SFX track type {track_type} not found in profile")
        
        if track_type == SFXTrackType.ACTION:
            prompt = self._compose_sfx_action_prompt(profile)
        elif track_type == SFXTrackType.ENVIRONMENT:
            prompt = self._compose_sfx_environment_prompt(profile)
        elif track_type == SFXTrackType.STYLIZED:
            prompt = self._compose_sfx_stylized_prompt(profile)
        elif track_type == SFXTrackType.BULLET_TIME:
            prompt = self._compose_sfx_bullet_time_prompt(profile)
        else:
            prompt = track.prompt
        
        return GeneratedPrompt(
            track_name=track.name,
            track_type=track_type.value,
            prompt=prompt,
            parameters=track.parameters,
            estimated_duration=profile.duration_seconds or 5.0
        )
    
    def compose_all_sfx_prompts(self, profile: SFXProfile) -> List[GeneratedPrompt]:
        """Generate prompts for all SFX tracks"""
        prompts = []
        for track_type in SFXTrackType:
            try:
                prompt = self.compose_sfx_track_prompt(profile, track_type)
                prompts.append(prompt)
            except ValueError as e:
                logger.warning(f"Skipping SFX track {track_type}: {e}")
        return prompts
    
    def _compose_sfx_action_prompt(self, profile: SFXProfile) -> str:
        """Compose action SFX prompt"""
        muffling_info = (
            f"Étouffement: {profile.muffling.muffling_type.value}, "
            f"cutoff {profile.muffling.cutoff_frequency}Hz"
            if profile.muffling.enabled
            else "Sans étouffement"
        )
        
        return (
            f"Génère uniquement la piste SFX ACTION pour une scène de {profile.action_type}, "
            f"intensité {profile.intensity}. "
            f"Sons: tirs, impacts, explosions, whooshes selon le contexte. "
            f"{muffling_info}. "
            f"Filtres: {', '.join(profile.post_filters.keys()) or 'EQ standard'}. "
            f"Synchronisation: avec musique et action. "
            f"Durée: {profile.duration_seconds or 5} secondes."
        )
    
    def _compose_sfx_environment_prompt(self, profile: SFXProfile) -> str:
        """Compose environment SFX prompt"""
        return (
            f"Génère uniquement la piste SFX ENVIRONNEMENT pour {profile.environment or 'un environnement'}. "
            f"Sons: vent, pluie, ville, jungle selon le contexte. "
            f"Volume: -12 à -20 dB (ambiance). "
            f"Loop: activé si approprié. "
            f"Durée: {profile.duration_seconds or 10} secondes."
        )
    
    def _compose_sfx_stylized_prompt(self, profile: SFXProfile) -> str:
        """Compose stylized SFX prompt"""
        return (
            f"Génère uniquement la piste SFX STYLISÉS pour une scène de film. "
            f"Éléments: glitch, bass drops, résonances stylisées. "
            f"Style: effets cinématographiques modernes. "
            f"Synchronisation: avec musique et action. "
            f"Durée: {profile.duration_seconds or 3} secondes."
        )
    
    def _compose_sfx_bullet_time_prompt(self, profile: SFXProfile) -> str:
        """Compose bullet time SFX prompt - Section 6.1"""
        return (
            f"Génère uniquement la piste SFX BULLET TIME pour une scène en slow motion. "
            f"Effets: time stretch, pitch down, étouffement automatique. "
            f"Contexte: {'sous l\'eau' if profile.muffling.context == 'underwater' else 'bullet time'}. "
            f"Filtres: time_stretch (x2), pitch_shift (-7 demi-tons). "
            f"Durée: {profile.duration_seconds or 8} secondes."
        )
    
    # -------------------------------------------------------------------------
    # VOICE PROMPTS (Section 12)
    # -------------------------------------------------------------------------
    
    def compose_voice_prompt(
        self,
        profile: VoiceProfile
    ) -> GeneratedPrompt:
        """Generate prompt for voice track"""
        voice_type_info = {
            "raw": ("Voix Brute", "voix naturelle humaine"),
            "sung": ("Voix Chantée", "mélodie vocale"),
            "whisper": ("Chuchotement", "voix intime"),
            "styled": (f"Voix {profile.voice_style}", "effet stylisé")
        }
        
        name, style = voice_type_info.get(
            profile.voice_type,
            ("Voix", "voix")
        )
        
        filters = ", ".join(profile.filters.keys()) or "EQ, compressor, reverb"
        
        return GeneratedPrompt(
            track_name=name,
            track_type=profile.voice_type,
            prompt=(
                f"Génère uniquement la piste voix {profile.voice_type.upper()} pour: '{profile.text_content}'. "
                f"Langue: {profile.language}. "
                f"Style: {style}. "
                f"Filters: {filters}. "
                f"Ambiance: {profile.voice_type} theme. "
                f"Durée: {profile.duration_seconds or estimated} secondes."
            ),
            parameters={},
            estimated_duration=profile.duration_seconds or 5.0
        )
    
    # -------------------------------------------------------------------------
    # BATCH GENERATION
    # -------------------------------------------------------------------------
    
    def generate_all_tracks(
        self,
        music_profile: Optional[MusicProfile] = None,
        sfx_profile: Optional[SFXProfile] = None,
        voice_profile: Optional[VoiceProfile] = None
    ) -> Dict[str, List[GeneratedPrompt]]:
        """
        Generate prompts for all enabled profiles.
        
        Returns:
            Dictionary with keys: 'music', 'sfx', 'voice'
        """
        result = {
            "music": [],
            "sfx": [],
            "voice": []
        }
        
        if music_profile:
            result["music"] = self.compose_all_music_prompts(music_profile)
            logger.info(f"Generated {len(result['music'])} music prompts")
        
        if sfx_profile:
            result["sfx"] = self.compose_all_sfx_prompts(sfx_profile)
            logger.info(f"Generated {len(result['sfx'])} SFX prompts")
        
        if voice_profile:
            result["voice"].append(self.compose_voice_prompt(voice_profile))
            logger.info(f"Generated {len(result['voice'])} voice prompts")
        
        return result
    
    def export_prompts_json(
        self,
        prompts: Dict[str, List[GeneratedPrompt]]
    ) -> Dict[str, Any]:
        """Export all prompts as JSON structure"""
        return {
            "music_prompts": [
                {
                    "track_name": p.track_name,
                    "track_type": p.track_type,
                    "prompt": p.prompt,
                    "parameters": p.parameters,
                    "estimated_duration": p.estimated_duration
                }
                for p in prompts.get("music", [])
            ],
            "sfx_prompts": [
                {
                    "track_name": p.track_name,
                    "track_type": p.track_type,
                    "prompt": p.prompt,
                    "parameters": p.parameters,
                    "estimated_duration": p.estimated_duration
                }
                for p in prompts.get("sfx", [])
            ],
            "voice_prompts": [
                {
                    "track_name": p.track_name,
                    "track_type": p.track_type,
                    "prompt": p.prompt,
                    "parameters": p.parameters,
                    "estimated_duration": p.estimated_duration
                }
                for p in prompts.get("voice", [])
            ],
            "total_tracks": sum(len(v) for v in prompts.values()),
            "exported_at": __import__('datetime').datetime.now().isoformat()
        }

