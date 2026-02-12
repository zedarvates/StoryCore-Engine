"""
StoryCore VoiceProfileBuilder

This module implements voice/audio generation for StoryCore.
Handles voice types, filters, track generation, and voice synthesis.

Enhanced with:
- VoiceService for text-to-speech generation
- Multiple language and voice support
- Emotion and speed control

Requirements: AUDIO & SFX STORYCORE ENGINE (VERSION MULTIPISTE) - Section 8
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


# =============================================================================
# VOICE TYPES (Section 8)
# =============================================================================

class VoiceType(str, Enum):
    """Types of voice tracks"""
    RAW = "raw"
    SUNG = "sung"
    WHISPER = "whisper"
    STYLED = "styled"


class VoiceStyle(str, Enum):
    """Styled voice variations"""
    RADIO = "radio"
    ROBOT = "robot"
    TELEPHONE = "telephone"
    DEEP_SPACE = "deep_space"
    CORRUPTED = "corrupted"


# =============================================================================
# VOICE FILTER TYPES (Section 8)
# =============================================================================

class VoiceFilterType(str, Enum):
    """Available voice filters"""
    EQ = "eq"
    COMPRESSOR = "compressor"
    REVERB = "reverb"
    DISTORTION = "distortion"
    BAND_PASS = "band_pass"
    PITCH_SHIFT = "pitch_shift"
    VIBRATO = "vibrato"
    CHORUS = "chorus"
    PHASER = "phaser"


# =============================================================================
# VOICE SERVICE
# =============================================================================

@dataclass
class VoiceEmotion:
    """Voice emotion configuration"""
    name: str
    pitch_modifier: float = 0.0  # Semitones
    speed_modifier: float = 1.0  # Multiplier
    volume_modifier: float = 0.0  # dB


class VoiceService:
    """
    Voice synthesis service for text-to-speech generation.
    
    Provides:
    - Multiple language support
    - Voice selection per language
    - Emotion and speed control
    """
    
    # Available voices by language
    VOICES: Dict[str, List[str]] = {
        "fr-FR": ["Amelie", "Hugo", "Maeleine"],
        "en-US": ["Aria", "Noah", "Lily"],
        "en-GB": ["Emma", "George", "Lily"],
        "es-ES": ["Elena", "Carlos", "Sofia"],
        "de-DE": ["Klara", "Hans", "Lies"],
        "it-IT": ["Bella", "Luca", "Giulia"],
        "pt-BR": ["Francisca", "Antonio", "Marcia"],
        "ja-JP": ["Nanami", "Kei", "Mizuki"],
        "zh-CN": ["Lili", "Wei", "Mei"],
        "ko-KR": ["Sora", "Minjun", "Yuna"],
        "ru-RU": ["Alyona", "Dmitri", "Tatiana"]
    }
    
    # Available emotions
    EMOTIONS: Dict[str, VoiceEmotion] = {
        "neutral": VoiceEmotion(name="neutral", pitch_modifier=0, speed_modifier=1.0, volume_modifier=0),
        "happy": VoiceEmotion(name="happy", pitch_modifier=2, speed_modifier=1.1, volume_modifier=1),
        "sad": VoiceEmotion(name="sad", pitch_modifier=-2, speed_modifier=0.9, volume_modifier=-2),
        "angry": VoiceEmotion(name="angry", pitch_modifier=-3, speed_modifier=1.2, volume_modifier=2),
        "fear": VoiceEmotion(name="fear", pitch_modifier=4, speed_modifier=1.3, volume_modifier=-1),
        "surprised": VoiceEmotion(name="surprised", pitch_modifier=3, speed_modifier=1.15, volume_modifier=0),
        "whisper": VoiceEmotion(name="whisper", pitch_modifier=0, speed_modifier=0.8, volume_modifier=-6),
        "deep": VoiceEmotion(name="deep", pitch_modifier=-4, speed_modifier=0.95, volume_modifier=1),
        "robotic": VoiceEmotion(name="robotic", pitch_modifier=-2, speed_modifier=1.0, volume_modifier=0)
    }
    
    def __init__(self):
        logger.info("VoiceService initialized")
        self._default_language = "fr-FR"
        self._default_voice = "Amelie"
    
    def get_available_languages(self) -> List[str]:
        """Get list of available languages"""
        return list(self.VOICES.keys())
    
    def get_voices_for_language(self, language: str) -> List[str]:
        """Get available voices for a language"""
        return self.VOICES.get(language, [])
    
    def get_available_emotions(self) -> List[str]:
        """Get list of available emotions"""
        return list(self.EMOTIONS.keys())
    
    async def generate_voice(
        self,
        text: str,
        voice: str,
        language: str,
        emotion: Optional[str] = None,
        speed: float = 1.0,
        pitch: float = 0.0,
        volume: float = 0.0
    ) -> Tuple[bool, bytes, str]:
        """
        Generate voice audio from text.
        
        Args:
            text: Text to synthesize
            voice: Voice name to use
            language: Language code (e.g., 'fr-FR')
            emotion: Emotion to apply (optional)
            speed: Speed multiplier (0.5 to 2.0)
            pitch: Pitch shift in semitones (-12 to 12)
            volume: Volume adjustment in dB (-20 to 20)
            
        Returns:
            Tuple of (success, audio_data, message)
        """
        try:
            # Validate language
            if language not in self.VOICES:
                logger.warning(f"Language {language} not found, using default")
                language = self._default_language
            
            # Validate voice
            available_voices = self.VOICES.get(language, [])
            if voice not in available_voices:
                logger.warning(f"Voice {voice} not available for {language}, using default")
                voice = available_voices[0] if available_voices else self._default_voice
            
            # Apply emotion modifiers if specified
            if emotion and emotion in self.EMOTIONS:
                emotion_config = self.EMOTIONS[emotion]
                speed = speed * emotion_config.speed_modifier
                pitch = pitch + emotion_config.pitch_modifier
                volume = volume + emotion_config.volume_modifier
            
            # Validate parameters
            speed = max(0.5, min(2.0, speed))
            pitch = max(-12, min(12, pitch))
            volume = max(-20, min(20, volume))
            
            logger.info(
                f"Generating voice: voice={voice}, language={language}, "
                f"emotion={emotion}, speed={speed}, pitch={pitch}"
            )
            
            # In production, this would call an actual TTS engine
            # For now, we return a placeholder response
            placeholder_data = self._create_placeholder_response(
                text, voice, language, speed, pitch, volume
            )
            
            return True, placeholder_data, f"Voice generated successfully with {voice}"
            
        except Exception as e:
            logger.error(f"Voice generation failed: {e}")
            return False, b"", str(e)
    
    def _create_placeholder_response(
        self,
        text: str,
        voice: str,
        language: str,
        speed: float,
        pitch: float,
        volume: float
    ) -> bytes:
        """Create placeholder response for testing"""
        import json
        
        response = {
            "status": "placeholder",
            "text": text,
            "voice": voice,
            "language": language,
            "speed": speed,
            "pitch": pitch,
            "volume": volume,
            "message": "This is a placeholder response. In production, this would be actual audio data."
        }
        
        return json.dumps(response).encode('utf-8')
    
    def apply_voice_effects(
        self,
        audio_data: bytes,
        effects: List[Dict[str, Any]]
    ) -> bytes:
        """
        Apply post-processing effects to voice audio.
        
        Args:
            audio_data: Input audio bytes
            effects: List of effects to apply
            
        Returns:
            Processed audio bytes
        """
        logger.info(f"Applying {len(effects)} effects to voice audio")
        
        # In production, this would process actual audio
        # For now, return placeholder
        return audio_data
    
    def estimate_duration(
        self,
        text: str,
        speed: float = 1.0
    ) -> float:
        """
        Estimate audio duration for text.
        
        Args:
            text: Text to estimate
            speed: Speaking speed multiplier
            
        Returns:
            Estimated duration in seconds
        """
        # Average speaking rate: ~150 words per minute
        word_count = len(text.split())
        base_duration = (word_count / 150) * 60  # seconds
        
        # Adjust for speed
        adjusted_duration = base_duration / speed
        
        return adjusted_duration


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class VoiceTrack:
    """Individual voice track output"""
    track_type: VoiceType
    name: str
    prompt: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    filters: Dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    volume: float = 0.0  # dB


@dataclass
class VoiceFilter:
    """Voice filter configuration"""
    filter_type: VoiceFilterType
    enabled: bool = True
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VoiceProfile:
    """
    VoiceProfile JSON Structure
    
    Complete profile for voice generation including:
    - Voice type selection
    - Filter configuration
    - Track generation
    """
    # Identity
    id: str
    project_id: str
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # Voice Configuration
    voice_type: str = "raw"
    voice_style: Optional[str] = None
    text_content: str = ""
    
    # Voice Service Configuration
    voice_name: Optional[str] = None
    language: str = "fr-FR"
    emotion: Optional[str] = None
    speed: float = 1.0
    pitch: float = 0.0
    volume: float = 0.0
    
    # Filters (Section 8)
    filters: List[VoiceFilter] = field(default_factory=list)
    
    # Track Configuration
    tracks: List[VoiceTrack] = field(default_factory=list)
    
    # Constraints
    duration_seconds: Optional[float] = None


# =============================================================================
# VOICE PROFILE BUILDER
# =============================================================================

class VoiceProfileBuilder:
    """
    Constructs VoiceProfile objects for voice generation.
    
    Handles:
    - Voice type selection (Section 8)
    - Filter configuration (Section 8)
    - Track generation
    - Voice synthesis settings
    """
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self._profile_id = f"voice_profile_{project_id}"
        
        # Profile fields
        self._voice_type: str = "raw"
        self._voice_style: Optional[str] = None
        self._text_content: str = ""
        self._duration_seconds: Optional[float] = None
        
        # Voice synthesis settings
        self._voice_name: Optional[str] = None
        self._language: str = "fr-FR"
        self._emotion: Optional[str] = None
        self._speed: float = 1.0
        self._pitch: float = 0.0
        self._voice_volume: float = 0.0
        
        # Filters
        self._filters: List[VoiceFilter] = []
        
        logger.info(f"VoiceProfileBuilder initialized for project {project_id}")
    
    # -------------------------------------------------------------------------
    # VOICE CONFIGURATION
    # -------------------------------------------------------------------------
    
    def set_voice_type(self, voice_type: str) -> 'VoiceProfileBuilder':
        """Set the type of voice"""
        valid_types = ["raw", "sung", "whisper", "styled"]
        self._voice_type = voice_type.lower() if voice_type.lower() in valid_types else "raw"
        return self
    
    def set_voice_style(self, style: str) -> 'VoiceProfileBuilder':
        """Set styled voice variation"""
        self._voice_style = style.lower()
        return self
    
    def set_text(self, text: str) -> 'VoiceProfileBuilder':
        """Set the text content for voice generation"""
        self._text_content = text
        return self
    
    def set_duration(self, seconds: float) -> 'VoiceProfileBuilder':
        """Set target duration"""
        self._duration_seconds = seconds
        return self
    
    # -------------------------------------------------------------------------
    # VOICE SYNTHESIS SETTINGS
    # -------------------------------------------------------------------------
    
    def set_voice(
        self,
        voice: str,
        language: str = "fr-FR"
    ) -> 'VoiceProfileBuilder':
        """Set voice name and language"""
        voice_service = VoiceService()
        
        # Validate language
        if language not in voice_service.VOICES:
            logger.warning(f"Language {language} not available")
            language = "fr-FR"
        
        # Validate voice
        available_voices = voice_service.VOICES.get(language, [])
        if voice not in available_voices:
            logger.warning(f"Voice {voice} not available for {language}")
            voice = available_voices[0] if available_voices else "Amelie"
        
        self._voice_name = voice
        self._language = language
        return self
    
    def set_emotion(
        self,
        emotion: str,
        speed: float = 1.0,
        pitch: float = 0.0,
        volume: float = 0.0
    ) -> 'VoiceProfileBuilder':
        """Set emotion and associated parameters"""
        voice_service = VoiceService()
        
        if emotion in voice_service.EMOTIONS:
            emotion_config = voice_service.EMOTIONS[emotion]
            self._emotion = emotion
            self._speed = speed * emotion_config.speed_modifier
            self._pitch = pitch + emotion_config.pitch_modifier
            self._voice_volume = volume + emotion_config.volume_modifier
        else:
            logger.warning(f"Emotion {emotion} not available")
        
        return self
    
    def set_synthesis_params(
        self,
        speed: float = 1.0,
        pitch: float = 0.0,
        volume: float = 0.0
    ) -> 'VoiceProfileBuilder':
        """Set synthesis parameters directly"""
        self._speed = max(0.5, min(2.0, speed))
        self._pitch = max(-12, min(12, pitch))
        self._voice_volume = max(-20, min(20, volume))
        return self
    
    # -------------------------------------------------------------------------
    # FILTERS (Section 8)
    # -------------------------------------------------------------------------
    
    def add_filter(self, filter_type: str, params: Dict[str, Any]) -> 'VoiceProfileBuilder':
        """Add voice filter"""
        try:
            self._filters.append(VoiceFilter(
                filter_type=VoiceFilterType(filter_type),
                enabled=True,
                parameters=params
            ))
        except ValueError:
            logger.warning(f"Invalid filter type: {filter_type}")
        return self
    
    def set_eq(
        self,
        low_gain: float = 0,
        mid_gain: float = 0,
        high_gain: float = 0
    ) -> 'VoiceProfileBuilder':
        """Set EQ for voice"""
        self.add_filter("eq", {
            "low_gain": low_gain,
            "mid_gain": mid_gain,
            "high_gain": high_gain
        })
        return self
    
    def set_compressor(
        self,
        threshold: float = -24.0,
        ratio: float = 4.0,
        attack: float = 0.003,
        release: float = 0.25
    ) -> 'VoiceProfileBuilder':
        """Set compressor for voice"""
        self.add_filter("compressor", {
            "threshold_db": threshold,
            "ratio": ratio,
            "attack_ms": attack * 1000,
            "release_ms": release * 1000
        })
        return self
    
    def set_reverb(
        self,
        room_size: float = 0.3,
        damping: float = 0.5,
        wet_level: float = 0.2
    ) -> 'VoiceProfileBuilder':
        """Set reverb for voice"""
        self.add_filter("reverb", {
            "room_size": room_size,
            "damping": damping,
            "wet_level": wet_level
        })
        return self
    
    def set_distortion(
        self,
        amount: float = 0,
        mix: float = 0.5
    ) -> 'VoiceProfileBuilder':
        """Set distortion for voice"""
        self.add_filter("distortion", {
            "amount": amount,
            "mix": mix
        })
        return self
    
    def set_band_pass(self, center_freq: float = 1000, q: float = 1.0) -> 'VoiceProfileBuilder':
        """Set band pass"""
        self.add_filter("band_pass", {
            "center_frequency": center_freq,
            "q": q
        })
        return self
    
    def set_pitch_shift(self, semitones: float = 0) -> 'VoiceProfileBuilder':
        """Set pitch shift"""
        self.add_filter("pitch_shift", {"semitones": semitones})
        return self
    
    def apply_radio_effect(self) -> 'VoiceProfileBuilder':
        """Apply classic radio effect"""
        self._voice_style = "radio"
        self.set_band_pass(center_freq=2000, q=2.0)
        self.set_eq(low_gain=-10, mid_gain=5, high_gain=-5)
        self.set_compressor(threshold=-20, ratio=6)
        return self
    
    def apply_robot_effect(self) -> 'VoiceProfileBuilder':
        """Apply robot effect"""
        self._voice_style = "robot"
        self.set_pitch_shift(semitones=-2)
        self.set_distortion(amount=15, mix=0.3)
        self.set_eq(low_gain=-2, mid_gain=0, high_gain=4)
        return self
    
    def apply_telephone_effect(self) -> 'VoiceProfileBuilder':
        """Apply telephone effect"""
        self._voice_style = "telephone"
        self.set_band_pass(center_freq=1000, q=1.5)
        self.set_eq(low_gain=-15, mid_gain=8, high_gain=-10)
        self.set_reverb(room_size=0.1, wet_level=0.1)
        return self
    
    # -------------------------------------------------------------------------
    # PROFILE GENERATION
    # -------------------------------------------------------------------------
    
    def build(self) -> VoiceProfile:
        """Build the complete VoiceProfile"""
        
        tracks = self._build_tracks()
        
        profile = VoiceProfile(
            id=self._profile_id,
            project_id=self.project_id,
            voice_type=self._voice_type,
            voice_style=self._voice_style,
            text_content=self._text_content,
            voice_name=self._voice_name,
            language=self._language,
            emotion=self._emotion,
            speed=self._speed,
            pitch=self._pitch,
            volume=self._voice_volume,
            filters=self._filters,
            tracks=tracks,
            duration_seconds=self._duration_seconds
        )
        
        logger.info(f"VoiceProfile {profile.id} built successfully with {len(tracks)} tracks")
        return profile
    
    def _build_tracks(self) -> List[VoiceTrack]:
        """Generate voice tracks based on type"""
        
        tracks = []
        
        if self._voice_type == "raw":
            tracks.append(VoiceTrack(
                track_type=VoiceType.RAW,
                name="Voix Brute",
                prompt=self._generate_raw_prompt(),
                volume=0.0,
                filters=self._get_filter_dicts()
            ))
        
        elif self._voice_type == "sung":
            tracks.append(VoiceTrack(
                track_type=VoiceType.SUNG,
                name="Voix Chantée",
                prompt=self._generate_sung_prompt(),
                volume=-3.0,
                filters=self._get_filter_dicts()
            ))
        
        elif self._voice_type == "whisper":
            tracks.append(VoiceTrack(
                track_type=VoiceType.WHISPER,
                name="Chuchotement",
                prompt=self._generate_whisper_prompt(),
                volume=-6.0,
                filters={
                    **self._get_filter_dicts(),
                    "noise_gate": {"threshold_db": -40}
                }
            ))
        
        elif self._voice_type == "styled":
            styled_prompt = self._generate_styled_prompt()
            tracks.append(VoiceTrack(
                track_type=VoiceType.STYLED,
                name=f"Voix {self._voice_style or 'Stylisée'}",
                prompt=styled_prompt,
                volume=0.0,
                filters=self._get_filter_dicts()
            ))
        
        return tracks
    
    def _get_filter_dicts(self) -> Dict[str, Any]:
        """Convert filters to dictionary"""
        return {f.filter_type.value: f.parameters for f in self._filters}
    
    # -------------------------------------------------------------------------
    # PROMPT GENERATORS
    # -------------------------------------------------------------------------
    
    def _generate_raw_prompt(self) -> str:
        """Generate prompt for raw voice"""
        return (
            f"Genere uniquement la piste voix BRUTE pour le texte: '{self._text_content}'. "
            f"Langue: {self._language}. "
            f"Style: naturel, voix humaine. "
            f"Filters: EQ, compressor, reverb legere. "
            f"Duree: {self._duration_seconds or 'estimation'} secondes."
        )
    
    def _generate_sung_prompt(self) -> str:
        """Generate prompt for sung voice"""
        return (
            f"Genere uniquement la piste voix CHANTEE pour le texte: '{self._text_content}'. "
            f"Langue: {self._language}. "
            f"Style: melodie chantée, partition vocale. "
            f"Filters: EQ vocal, compression legere. "
            f"Duree: {self._duration_seconds or 'estimation'} secondes."
        )
    
    def _generate_whisper_prompt(self) -> str:
        """Generate prompt for whisper"""
        return (
            f"Genere uniquement la piste CHUCHOTEMENT pour le texte: '{self._text_content}'. "
            f"Style: whisper intime, voix douce. "
            f"Filters: noise gate, legere reverb. "
            f"Duree: {self._duration_seconds or 'estimation'} secondes."
        )
    
    def _generate_styled_prompt(self) -> str:
        """Generate prompt for styled voice"""
        style_refs = {
            "radio": "effet radio old-school",
            "robot": "voix robotique synthetique",
            "telephone": "effet telephonique",
        }
        style = style_refs.get(self._voice_style, "effet stylise")
        
        return (
            f"Genere uniquement la piste voix STYLISEE ({style}) pour le texte: '{self._text_content}'. "
            f"Langue: {self._language}. "
            f"Filters: {', '.join(self._get_filter_dicts().keys())}. "
            f"Duree: {self._duration_seconds or 'estimation'} secondes."
        )
    
    # -------------------------------------------------------------------------
    # DICTIONARY CONVERSION
    # -------------------------------------------------------------------------
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert profile to dictionary for JSON serialization"""
        return {
            "id": self._profile_id,
            "project_id": self.project_id,
            "voice_type": self._voice_type,
            "voice_style": self._voice_style,
            "text_content": self._text_content,
            "voice_name": self._voice_name,
            "language": self._language,
            "emotion": self._emotion,
            "speed": self._speed,
            "pitch": self._pitch,
            "volume": self._voice_volume,
            "filters": [
                {
                    "type": f.filter_type.value,
                    "enabled": f.enabled,
                    "parameters": f.parameters
                }
                for f in self._filters
            ],
            "duration_seconds": self._duration_seconds,
            "created_at": datetime.now().isoformat()
        }
