"""
StoryCore-Engine Audio-Sequence Integration Module

This module integrates the multi-track audio system with the sequence generation system.
It automatically creates audio profiles based on sequence context and enables
synchronized audio generation for generated sequences.

Integration Features:
- Auto-profile generation from sequence context
- Shot-level audio attachment
- Timeline synchronization
- Cross-module data flow

Requirements: Q1 2026 - Audio/Sequence Integration
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field

from backend.music_profile_builder import MusicProfileBuilder
from backend.sfx_profile_builder import SFXProfileBuilder
from backend.voice_profile_builder import VoiceProfileBuilder
from backend.prompt_composer import PromptComposer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SequenceAudioType(str, Enum):
    """Audio types for sequence integration"""
    MUSIC = "music"
    SFX = "sfx"
    VOICE = "voice"
    ALL = "all"


class IntegrationStatus(str, Enum):
    """Status of audio-sequence integration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class SequenceAudioContext:
    """
    Audio context derived from sequence/shot data.
    This bridges the gap between sequence metadata and audio generation.
    """
    # Project context
    project_id: str
    project_type: str = ""
    location: str = ""
    themes: List[str] = field(default_factory=list)
    visual_style: str = ""
    emotional_intensity: str = "medium"
    
    # Shot context (per-shot audio)
    shot_id: Optional[str] = None
    shot_type: str = ""
    shot_description: str = ""
    shot_duration: float = 0.0
    
    # Action context
    action_type: str = ""
    action_intensity: str = "medium"
    visual_rhythm: str = "normal"
    
    # Beat context
    beat_type: str = ""
    beat_importance: str = "medium"
    
    # Timing
    start_time: float = 0.0
    end_time: float = 0.0
    
    # Options
    auto_mix: bool = True
    ducking: bool = True


@dataclass
class IntegratedAudioResult:
    """Result of audio-sequence integration"""
    success: bool
    status: IntegrationStatus
    music_profile: Optional[Dict[str, Any]] = None
    sfx_profile: Optional[Dict[str, Any]] = None
    voice_profile: Optional[Dict[str, Any]] = None
    music_prompts: List[Dict[str, str]] = field(default_factory=list)
    sfx_prompts: List[Dict[str, str]] = field(default_factory=list)
    voice_prompts: List[Dict[str, str]] = field(default_factory=list)
    mix_configuration: Optional[Dict[str, Any]] = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    generated_at: str = ""


class AudioSequenceIntegrator:
    """
    Main integrator class for audio-sequence functionality.
    
    This class bridges the sequence/shot generation system with the
    multi-track audio generation system.
    """
    
    def __init__(self):
        """Initialize the integrator"""
        self.prompt_composer = PromptComposer()
        logger.info("Audio-Sequence Integrator initialized")
    
    def extract_context_from_sequence(
        self,
        sequence: Dict[str, Any],
        project_context: Optional[Dict[str, Any]] = None
    ) -> List[SequenceAudioContext]:
        """
        Extract audio contexts from a generated sequence.
        
        Args:
            sequence: Generated sequence data
            project_context: Optional project-level context
        
        Returns:
            List of SequenceAudioContext for each shot
        """
        contexts = []
        project_id = sequence.get('project_id', '')
        shots = sequence.get('shots', [])
        
        # Extract project context
        proj_type = project_context.get('project_type', '') if project_context else ''
        location = project_context.get('location', '') if project_context else ''
        themes = project_context.get('themes', []) if project_context else []
        style = project_context.get('visual_style', '') if project_context else ''
        intensity = project_context.get('emotional_intensity', 'medium') if project_context else 'medium'
        
        for shot in shots:
            context = SequenceAudioContext(
                project_id=project_id,
                project_type=proj_type,
                location=location,
                themes=themes.copy(),
                visual_style=style,
                emotional_intensity=intensity,
                shot_id=shot.get('id'),
                shot_type=shot.get('shot_type', 'action'),
                shot_description=shot.get('prompt', ''),
                shot_duration=shot.get('duration_seconds', 5.0)
            )
            contexts.append(context)
        
        logger.info(f"Extracted {len(contexts)} audio contexts from sequence")
        return contexts
    
    def create_music_profile_from_context(
        self,
        context: SequenceAudioContext
    ) -> Dict[str, Any]:
        """
        Create a music profile from sequence context.
        
        Args:
            context: SequenceAudioContext
        
        Returns:
            Music profile as dictionary
        """
        builder = MusicProfileBuilder(context.project_id)
        
        if context.project_type:
            builder.set_project_type(context.project_type)
        if context.location:
            builder.set_location(context.location)
        for theme in context.themes:
            builder.add_theme(theme)
        if context.visual_style:
            builder.set_visual_style(context.visual_style)
        if context.emotional_intensity:
            builder.set_emotional_intensity(context.emotional_intensity)
        
        if context.action_type:
            builder.set_action(
                context.action_type,
                context.action_intensity,
                context.visual_rhythm
            )
        
        if context.shot_duration:
            builder.set_duration(context.shot_duration)
        
        profile = builder.build()
        return profile.to_dict() if hasattr(profile, 'to_dict') else profile.__dict__
    
    def create_sfx_profile_from_context(
        self,
        context: SequenceAudioContext
    ) -> Dict[str, Any]:
        """
        Create an SFX profile from sequence context.
        
        Args:
            context: SequenceAudioContext
        
        Returns:
            SFX profile as dictionary
        """
        builder = SFXProfileBuilder(context.project_id)
        
        action_mapping = {
            'action': 'fight',
            'dialogue': 'footsteps',
            'ambient': 'wind',
            'transition': 'whoosh'
        }
        sfx_action = action_mapping.get(context.shot_type, 'impact')
        
        intensity_mapping = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high'
        }
        intensity = intensity_mapping.get(context.action_intensity, 'medium')
        
        builder.set_action_type(sfx_action)
        builder.set_intensity(intensity)
        if context.location:
            builder.set_environment(context.location)
        builder.set_duration(context.shot_duration)
        
        if context.shot_type in ['underwater', 'submarine']:
            builder.enable_muffling()
        
        profile = builder.build()
        return profile.to_dict() if hasattr(profile, 'to_dict') else profile.__dict__
    
    def create_voice_profile_from_context(
        self,
        context: SequenceAudioContext,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a voice profile from sequence context.
        
        Args:
            context: SequenceAudioContext
            text_content: Optional text to speak
        
        Returns:
            Voice profile as dictionary
        """
        builder = VoiceProfileBuilder(context.project_id)
        
        voice_mapping = {
            'dialogue': 'raw',
            'narration': 'whisper',
            'action': 'raw'
        }
        voice_type = voice_mapping.get(context.shot_type, 'raw')
        
        builder.set_voice_type(voice_type)
        if text_content:
            builder.set_text(text_content)
        builder.set_language('fr')
        if context.shot_duration:
            builder.set_duration(context.shot_duration)
        
        profile = builder.build()
        return profile.to_dict() if hasattr(profile, 'to_dict') else profile.__dict__
    
    def generate_audio_for_sequence(
        self,
        sequence: Dict[str, Any],
        project_context: Optional[Dict[str, Any]] = None,
        audio_types: List[SequenceAudioType] = None
    ) -> IntegratedAudioResult:
        """
        Generate all audio for a complete sequence.
        
        Args:
            sequence: Generated sequence data
            project_context: Optional project-level context
            audio_types: Types of audio to generate
        
        Returns:
            IntegratedAudioResult with all generated profiles and prompts
        """
        if audio_types is None:
            audio_types = [SequenceAudioType.ALL]
        
        result = IntegratedAudioResult(
            success=True,
            status=IntegrationStatus.COMPLETED,
            generated_at=datetime.utcnow().isoformat()
        )
        
        contexts = self.extract_context_from_sequence(sequence, project_context)
        
        if SequenceAudioType.MUSIC in audio_types or SequenceAudioType.ALL in audio_types:
            for context in contexts:
                music_profile = self.create_music_profile_from_context(context)
                result.music_profile = music_profile
                
                try:
                    builder = MusicProfileBuilder(context.project_id)
                    if context.project_type:
                        builder.set_project_type(context.project_type)
                    if context.location:
                        builder.set_location(context.location)
                    for theme in context.themes:
                        builder.add_theme(theme)
                    if context.visual_style:
                        builder.set_visual_style(context.visual_style)
                    if context.emotional_intensity:
                        builder.set_emotional_intensity(context.emotional_intensity)
                    if context.action_type:
                        builder.set_action(context.action_type, context.action_intensity, context.visual_rhythm)
                    builder.set_duration(context.shot_duration)
                    
                    profile = builder.build()
                    prompts = self.prompt_composer.compose_all_music_prompts(profile)
                    result.music_prompts.extend([
                        {"track_name": p.track_name, "track_type": p.track_type, "prompt": p.prompt, "shot_id": context.shot_id}
                        for p in prompts
                    ])
                except Exception as e:
                    result.errors.append(f"Music prompt generation failed: {str(e)}")
        
        if SequenceAudioType.SFX in audio_types or SequenceAudioType.ALL in audio_types:
            for context in contexts:
                sfx_profile = self.create_sfx_profile_from_context(context)
                result.sfx_profile = sfx_profile
                
                try:
                    builder = SFXProfileBuilder(context.project_id)
                    if context.action_type:
                        builder.set_action_type(context.action_type)
                    builder.set_intensity(context.action_intensity)
                    if context.location:
                        builder.set_environment(context.location)
                    builder.set_duration(context.shot_duration)
                    
                    profile = builder.build()
                    prompts = self.prompt_composer.compose_all_sfx_prompts(profile)
                    result.sfx_prompts.extend([
                        {"track_name": p.track_name, "track_type": p.track_type, "prompt": p.prompt, "shot_id": context.shot_id}
                        for p in prompts
                    ])
                except Exception as e:
                    result.errors.append(f"SFX prompt generation failed: {str(e)}")
        
        if SequenceAudioType.VOICE in audio_types or SequenceAudioType.ALL in audio_types:
            for context in contexts:
                voice_profile = self.create_voice_profile_from_context(context)
                result.voice_profile = voice_profile
                
                try:
                    builder = VoiceProfileBuilder(context.project_id)
                    builder.set_voice_type('raw')
                    if context.shot_description:
                        sample_text = context.shot_description[:200]
                        builder.set_text(sample_text)
                    builder.set_language('fr')
                    builder.set_duration(context.shot_duration)
                    
                    profile = builder.build()
                    prompt = self.prompt_composer.compose_voice_prompt(profile)
                    result.voice_prompts.append({
                        "track_name": prompt.track_name,
                        "track_type": prompt.track_type,
                        "prompt": prompt.prompt,
                        "shot_id": context.shot_id
                    })
                except Exception as e:
                    result.errors.append(f"Voice prompt generation failed: {str(e)}")
        
        result.success = len(result.errors) == 0
        result.status = IntegrationStatus.COMPLETED if result.success else IntegrationStatus.FAILED
        
        logger.info(f"Audio-sequence integration: {len(result.music_prompts)} music, {len(result.sfx_prompts)} SFX, {len(result.voice_prompts)} voice")
        
        return result
    
    def attach_audio_to_shot(
        self,
        shot: Dict[str, Any],
        audio_result: IntegratedAudioResult,
        audio_type: SequenceAudioType = SequenceAudioType.ALL
    ) -> Dict[str, Any]:
        """
        Attach generated audio to a shot for timeline integration.
        
        Args:
            shot: Shot data to attach audio to
            audio_result: IntegratedAudioResult from generation
            audio_type: Type of audio to attach
        
        Returns:
            Shot with audio attached
        """
        shot_id = shot.get('id')
        
        music_tracks = [p for p in audio_result.music_prompts if p.get('shot_id') == shot_id]
        sfx_tracks = [p for p in audio_result.sfx_prompts if p.get('shot_id') == shot_id]
        voice_tracks = [p for p in audio_result.voice_prompts if p.get('shot_id') == shot_id]
        
        audio_tracks = []
        
        if audio_type in [SequenceAudioType.MUSIC, SequenceAudioType.ALL]:
            for track in music_tracks:
                audio_tracks.append({
                    "id": f"{shot_id}_music_{track['track_name'].lower().replace(' ', '_')}",
                    "name": track['track_name'],
                    "type": "music",
                    "prompt": track['prompt'],
                    "start_time": 0,
                    "duration": shot.get('duration_seconds', 5.0),
                    "volume": -6.0,
                    "muted": False,
                    "regeneratable": True
                })
        
        if audio_type in [SequenceAudioType.SFX, SequenceAudioType.ALL]:
            for track in sfx_tracks:
                audio_tracks.append({
                    "id": f"{shot_id}_sfx_{track['track_name'].lower().replace(' ', '_')}",
                    "name": track['track_name'],
                    "type": "sfx",
                    "prompt": track['prompt'],
                    "start_time": 0,
                    "duration": shot.get('duration_seconds', 5.0),
                    "volume": 0.0,
                    "muted": False,
                    "regeneratable": True
                })
        
        if audio_type in [SequenceAudioType.VOICE, SequenceAudioType.ALL]:
            for track in voice_tracks:
                audio_tracks.append({
                    "id": f"{shot_id}_voice_{track['track_name'].lower().replace(' ', '_')}",
                    "name": track['track_name'],
                    "type": "voice",
                    "prompt": track['prompt'],
                    "start_time": 0,
                    "duration": shot.get('duration_seconds', 5.0),
                    "volume": 0.0,
                    "muted": False,
                    "regeneratable": True
                })
        
        shot['audio_tracks'] = audio_tracks
        shot['audio_generated'] = len(audio_tracks) > 0
        
        return shot
    
    def generate_timeline_sync_data(
        self,
        sequence: Dict[str, Any],
        audio_result: IntegratedAudioResult
    ) -> Dict[str, Any]:
        """
        Generate timeline synchronization data for the video editor.
        
        Args:
            sequence: Original sequence
            audio_result: Generated audio result
        
        Returns:
            Timeline sync data with all tracks and timing
        """
        shots = sequence.get('shots', [])
        timeline_tracks = []
        
        track_types = [
            ("dialogue", "Dialogue"),
            ("sfx_action", "SFX - Action"),
            ("sfx_environment", "SFX - Environment"),
            ("music_base", "Music - Base"),
            ("music_melody", "Music - Melody"),
            ("music_percussion", "Music - Percussion"),
            ("music_bass", "Music - Bass"),
            ("music_fx", "Music - FX"),
            ("ambient", "Ambient")
        ]
        
        for track_id, track_name in track_types:
            timeline_tracks.append({
                "id": f"timeline_{track_id}",
                "name": track_name,
                "type": track_id.split("_")[0] if "_" in track_id else track_id,
                "clips": [],
                "muted": False,
                "volume": 0.0,
                "height": 40
            })
        
        current_time = 0.0
        for shot in shots:
            shot_duration = shot.get('duration_seconds', 5.0)
            shot_id = shot.get('id', '')
            audio_tracks = shot.get('audio_tracks', [])
            
            for audio_track in audio_tracks:
                track_type = audio_track.get('type', 'music')
                track_name = audio_track.get('name', '')
                
                if track_type == "voice":
                    timeline_track_id = "timeline_dialogue"
                elif track_type == "sfx":
                    if "action" in track_name.lower():
                        timeline_track_id = "timeline_sfx_action"
                    else:
                        timeline_track_id = "timeline_sfx_environment"
                else:
                    if "base" in track_name.lower() or "fondation" in track_name.lower():
                        timeline_track_id = "timeline_music_base"
                    elif "melody" in track_name.lower() or "mélodie" in track_name.lower():
                        timeline_track_id = "timeline_music_melody"
                    elif "percussion" in track_name.lower():
                        timeline_track_id = "timeline_music_percussion"
                    elif "bass" in track_name.lower() or "basse" in track_name.lower():
                        timeline_track_id = "timeline_music_bass"
                    elif "fx" in track_name.lower():
                        timeline_track_id = "timeline_music_fx"
                    else:
                        timeline_track_id = "timeline_music_base"
                
                for track in timeline_tracks:
                    if track["id"] == timeline_track_id:
                        track["clips"].append({
                            "id": audio_track["id"],
                            "name": track_name,
                            "start_time": current_time,
                            "duration": shot_duration,
                            "audio_track_id": audio_track["id"],
                            "prompt": audio_track.get('prompt', ''),
                            "regeneratable": audio_track.get('regeneratable', True)
                        })
                        break
            
            current_time += shot_duration
        
        return {
            "sequence_id": sequence.get('id', ''),
            "project_id": sequence.get('project_id', ''),
            "total_duration": current_time,
            "tracks": timeline_tracks,
            "generated_at": datetime.utcnow().isoformat(),
            "audio_prompts": {
                "music": audio_result.music_prompts,
                "sfx": audio_result.sfx_prompts,
                "voice": audio_result.voice_prompts
            }
        }


def create_audio_sequence_integrator() -> AudioSequenceIntegrator:
    """Create a new AudioSequenceIntegrator instance."""
    return AudioSequenceIntegrator()

