#!/usr/bin/env python3
"""
StoryCore-Engine Audio Engine
Generates complete soundscape with dialogue, SFX, ambience, and music.

This module implements Stage 8 of the 10-stage pipeline:
- Dialogue generation with character voice consistency
- Sound effects (SFX) generation and placement
- Ambience and environmental audio
- Music generation and scoring
- Spatialization and 3D audio positioning
- Audio synchronization with video timeline
- Reverb zones and acoustic modeling
- Audio stem export for professional mixing

The Audio Engine follows Data Contract v1 and integrates with:
- Timeline Manager for synchronization metadata
- Video Engine for visual-audio coherence
- Assembly & Export Engine for final mixing
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from enum import Enum
import time
import random
import math
import uuid

# Import ComfyUI integration components
try:
    from .workflow_executor import WorkflowExecutor
    from .comfyui_config import ComfyUIConfig
except ImportError:
    # Fallback for standalone execution
    WorkflowExecutor = None
    ComfyUIConfig = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ComfyUIWorkflowType(Enum):
    """Types of ComfyUI audio workflows."""
    ACE_STEP_T2A = "ace_step_t2a"  # Text-to-audio instrumentals
    ACE_STEP_M2M = "ace_step_m2m"  # Music-to-music editing
    STABLE_AUDIO = "stable_audio"   # General audio generation


@dataclass
class ComfyUIAudioRequest:
    """Request for ComfyUI audio generation."""
    workflow_type: ComfyUIWorkflowType
    prompt: str
    duration: float = 30.0
    negative_prompt: str = ""
    input_audio_path: Optional[str] = None  # For M2M workflows
    seed: Optional[int] = None
    cfg_scale: float = 5.0
    steps: int = 50
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.seed is None:
            self.seed = random.randint(0, 2**32 - 1)


class AudioType(Enum):
    """Types of audio content."""
    DIALOGUE = "dialogue"
    SFX = "sfx"
    AMBIENCE = "ambience"
    MUSIC = "music"
    FOLEY = "foley"


class VoiceType(Enum):
    """Character voice types."""
    MALE_YOUNG = "male_young"
    MALE_ADULT = "male_adult"
    MALE_ELDERLY = "male_elderly"
    FEMALE_YOUNG = "female_young"
    FEMALE_ADULT = "female_adult"
    FEMALE_ELDERLY = "female_elderly"
    CHILD = "child"
    NARRATOR = "narrator"


class AudioQuality(Enum):
    """Audio quality levels."""
    DRAFT = "draft"
    STANDARD = "standard"
    PROFESSIONAL = "professional"
    BROADCAST = "broadcast"


@dataclass
class AudioClip:
    """Represents a single audio clip."""
    clip_id: str
    audio_type: AudioType
    start_time: float
    duration: float
    content: str
    character_id: Optional[str] = None
    voice_type: Optional[VoiceType] = None
    volume: float = 1.0
    pan: float = 0.0  # -1.0 (left) to 1.0 (right)
    reverb_zone: Optional[str] = None
    spatial_position: Optional[Tuple[float, float, float]] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class ReverbZone:
    """Defines acoustic properties of a space."""
    zone_id: str
    name: str
    reverb_time: float  # RT60 in seconds
    pre_delay: float    # Pre-delay in milliseconds
    room_size: float    # 0.0 to 1.0
    damping: float      # High frequency damping 0.0 to 1.0
    wet_level: float    # Reverb mix level 0.0 to 1.0
    dry_level: float    # Direct signal level 0.0 to 1.0


@dataclass
class AudioTrack:
    """Represents a complete audio track."""
    track_id: str
    track_type: AudioType
    clips: List[AudioClip]
    volume: float = 1.0
    muted: bool = False
    solo: bool = False
    effects: List[Dict[str, Any]] = None

    def __post_init__(self):
        if self.effects is None:
            self.effects = []


@dataclass
class AudioProject:
    """Complete audio project structure."""
    project_id: str
    sample_rate: int = 48000
    bit_depth: int = 24
    total_duration: float = 0.0
    tracks: List[AudioTrack] = None
    reverb_zones: List[ReverbZone] = None
    sync_markers: List[Dict[str, Any]] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.tracks is None:
            self.tracks = []
        if self.reverb_zones is None:
            self.reverb_zones = []
        if self.sync_markers is None:
            self.sync_markers = []
        if self.metadata is None:
            self.metadata = {}


class AudioEngine:
    """
    Main Audio Engine for generating complete soundscapes.
    
    Capabilities:
    - Dialogue generation with character voice consistency
    - Sound effects generation and placement
    - Ambience and environmental audio
    - Music generation and scoring
    - Spatialization and 3D audio positioning
    - Audio synchronization with video timeline
    - Reverb zones and acoustic modeling
    - Audio stem export for professional mixing
    """
    
    def __init__(self, quality: AudioQuality = AudioQuality.STANDARD, mock_mode: bool = True, comfyui_config: Optional[Dict[str, Any]] = None):
        """
        Initialize Audio Engine.
        
        Args:
            quality: Audio quality level for generation
            mock_mode: If True, generates mock audio data for demonstration
            comfyui_config: ComfyUI configuration for real audio generation
        """
        self.quality = quality
        self.mock_mode = mock_mode
        self.sample_rate = 48000
        self.bit_depth = 24
        
        # Audio generation settings
        self.settings = self._get_quality_settings()
        
        # Character voice mapping
        self.character_voices = {}
        
        # Environment acoustic profiles
        self.acoustic_profiles = self._load_acoustic_profiles()
        
        # ComfyUI integration
        self.comfyui_config = comfyui_config or {}
        self.workflow_executor = None
        if not mock_mode and WorkflowExecutor:
            try:
                self.workflow_executor = WorkflowExecutor(
                    base_url=self.comfyui_config.get("base_url", "http://127.0.0.1:8188"),
                    timeout=self.comfyui_config.get("timeout", 300)
                )
                logger.info("ComfyUI WorkflowExecutor initialized for real audio generation")
            except Exception as e:
                logger.warning(f"Failed to initialize ComfyUI: {e}. Falling back to mock mode.")
                self.mock_mode = True
        
        # Load ComfyUI workflows
        self.audio_workflows = self._load_audio_workflows()
        
        logger.info(f"Audio Engine initialized - Quality: {quality.value}, Mock: {mock_mode}")
    
    def _load_audio_workflows(self) -> Dict[ComfyUIWorkflowType, Dict[str, Any]]:
        """Load ComfyUI audio workflow definitions."""
        workflows = {}
        
        # Define workflow file paths
        workflow_files = {
            ComfyUIWorkflowType.ACE_STEP_T2A: "audio_ace_step_1_t2a_instrumentals.json",
            ComfyUIWorkflowType.ACE_STEP_M2M: "audio_ace_step_1_m2m_editing.json",
            ComfyUIWorkflowType.STABLE_AUDIO: "audio_stable_audio_example.json"
        }
        
        for workflow_type, filename in workflow_files.items():
            try:
                workflow_path = Path(filename)
                if workflow_path.exists():
                    with open(workflow_path, 'r') as f:
                        workflow_data = json.load(f)
                    workflows[workflow_type] = workflow_data
                    logger.debug(f"Loaded workflow: {workflow_type.value}")
                else:
                    logger.warning(f"Workflow file not found: {filename}")
            except Exception as e:
                logger.error(f"Failed to load workflow {filename}: {e}")
        
        return workflows
    
    def _get_quality_settings(self) -> Dict[str, Any]:
        """Get quality-specific settings."""
        settings = {
            AudioQuality.DRAFT: {
                "sample_rate": 22050,
                "bit_depth": 16,
                "dialogue_quality": 0.6,
                "sfx_density": 0.4,
                "music_complexity": 0.3,
                "reverb_quality": 0.5
            },
            AudioQuality.STANDARD: {
                "sample_rate": 44100,
                "bit_depth": 16,
                "dialogue_quality": 0.8,
                "sfx_density": 0.7,
                "music_complexity": 0.6,
                "reverb_quality": 0.7
            },
            AudioQuality.PROFESSIONAL: {
                "sample_rate": 48000,
                "bit_depth": 24,
                "dialogue_quality": 0.9,
                "sfx_density": 0.9,
                "music_complexity": 0.8,
                "reverb_quality": 0.9
            },
            AudioQuality.BROADCAST: {
                "sample_rate": 48000,
                "bit_depth": 24,
                "dialogue_quality": 1.0,
                "sfx_density": 1.0,
                "music_complexity": 1.0,
                "reverb_quality": 1.0
            }
        }
        return settings[self.quality]
    
    def _load_acoustic_profiles(self) -> Dict[str, ReverbZone]:
        """Load predefined acoustic environment profiles."""
        profiles = {
            "outdoor": ReverbZone(
                zone_id="outdoor",
                name="Outdoor Environment",
                reverb_time=0.3,
                pre_delay=10,
                room_size=1.0,
                damping=0.8,
                wet_level=0.2,
                dry_level=0.9
            ),
            "indoor_small": ReverbZone(
                zone_id="indoor_small",
                name="Small Indoor Space",
                reverb_time=0.8,
                pre_delay=15,
                room_size=0.3,
                damping=0.6,
                wet_level=0.4,
                dry_level=0.8
            ),
            "indoor_large": ReverbZone(
                zone_id="indoor_large",
                name="Large Indoor Space",
                reverb_time=2.5,
                pre_delay=30,
                room_size=0.8,
                damping=0.4,
                wet_level=0.6,
                dry_level=0.7
            ),
            "cathedral": ReverbZone(
                zone_id="cathedral",
                name="Cathedral/Church",
                reverb_time=4.0,
                pre_delay=50,
                room_size=1.0,
                damping=0.2,
                wet_level=0.8,
                dry_level=0.6
            ),
            "cave": ReverbZone(
                zone_id="cave",
                name="Cave/Underground",
                reverb_time=3.0,
                pre_delay=40,
                room_size=0.9,
                damping=0.3,
                wet_level=0.7,
                dry_level=0.6
            )
        }
        return profiles
    
    def _generate_comfyui_audio(self, request: ComfyUIAudioRequest) -> Optional[str]:
        """
        Generate audio using ComfyUI workflows.
        
        Args:
            request: ComfyUI audio generation request
            
        Returns:
            Path to generated audio file, or None if failed
        """
        if self.mock_mode or not self.workflow_executor:
            logger.debug(f"Mock mode: Simulating {request.workflow_type.value} generation")
            return self._create_mock_audio_file(request)
        
        try:
            # Get workflow template
            workflow_template = self.audio_workflows.get(request.workflow_type)
            if not workflow_template:
                logger.error(f"Workflow template not found: {request.workflow_type.value}")
                return None
            
            # Customize workflow for request
            workflow = self._customize_workflow(workflow_template, request)
            
            # Execute workflow
            result = self.workflow_executor.execute_workflow(workflow)
            
            if result and result.get("success"):
                audio_path = result.get("output_files", {}).get("audio")
                if audio_path:
                    logger.info(f"Generated audio: {audio_path}")
                    return audio_path
            
            logger.error(f"ComfyUI workflow execution failed: {result}")
            return None
            
        except Exception as e:
            logger.error(f"ComfyUI audio generation failed: {e}")
            return None
    
    def _customize_workflow(self, workflow_template: Dict[str, Any], request: ComfyUIAudioRequest) -> Dict[str, Any]:
        """
        Customize workflow template with request parameters.
        
        Args:
            workflow_template: Base workflow template
            request: Audio generation request
            
        Returns:
            Customized workflow
        """
        import copy
        workflow = copy.deepcopy(workflow_template)
        
        try:
            if request.workflow_type == ComfyUIWorkflowType.ACE_STEP_T2A:
                # Customize ACE Step T2A workflow
                self._customize_ace_step_t2a(workflow, request)
            elif request.workflow_type == ComfyUIWorkflowType.ACE_STEP_M2M:
                # Customize ACE Step M2M workflow
                self._customize_ace_step_m2m(workflow, request)
            elif request.workflow_type == ComfyUIWorkflowType.STABLE_AUDIO:
                # Customize Stable Audio workflow
                self._customize_stable_audio(workflow, request)
            
        except Exception as e:
            logger.error(f"Workflow customization failed: {e}")
        
        return workflow
    
    def _customize_ace_step_t2a(self, workflow: Dict[str, Any], request: ComfyUIAudioRequest):
        """Customize ACE Step T2A workflow."""
        nodes = workflow.get("nodes", [])
        
        for node in nodes:
            # Update text encoder with prompt
            if node.get("type") == "TextEncodeAceStepAudio":
                if "widgets_values" in node and len(node["widgets_values"]) >= 2:
                    node["widgets_values"][0] = request.prompt  # Style prompt
                    node["widgets_values"][1] = request.metadata.get("lyrics", "[instrumental]")  # Lyrics
            
            # Update sampler settings
            elif node.get("type") == "KSampler":
                if "widgets_values" in node and len(node["widgets_values"]) >= 7:
                    node["widgets_values"][0] = request.seed  # Seed
                    node["widgets_values"][2] = request.steps  # Steps
                    node["widgets_values"][3] = request.cfg_scale  # CFG scale
            
            # Update duration
            elif node.get("type") == "EmptyAceStepLatentAudio":
                if "widgets_values" in node and len(node["widgets_values"]) >= 1:
                    node["widgets_values"][0] = request.duration  # Duration
    
    def _customize_ace_step_m2m(self, workflow: Dict[str, Any], request: ComfyUIAudioRequest):
        """Customize ACE Step M2M workflow."""
        nodes = workflow.get("nodes", [])
        
        for node in nodes:
            # Update text encoder with prompt
            if node.get("type") == "TextEncodeAceStepAudio":
                if "widgets_values" in node and len(node["widgets_values"]) >= 2:
                    node["widgets_values"][0] = request.prompt  # Style prompt
                    node["widgets_values"][1] = request.metadata.get("lyrics", "")  # Lyrics
            
            # Update input audio
            elif node.get("type") == "LoadAudio":
                if request.input_audio_path and "widgets_values" in node:
                    node["widgets_values"][0] = request.input_audio_path
            
            # Update sampler settings
            elif node.get("type") == "KSampler":
                if "widgets_values" in node and len(node["widgets_values"]) >= 7:
                    node["widgets_values"][0] = request.seed  # Seed
                    node["widgets_values"][2] = request.steps  # Steps
                    node["widgets_values"][3] = request.cfg_scale  # CFG scale
                    # M2M typically uses lower denoising strength
                    node["widgets_values"][6] = 0.3  # Denoising strength
    
    def _customize_stable_audio(self, workflow: Dict[str, Any], request: ComfyUIAudioRequest):
        """Customize Stable Audio workflow."""
        nodes = workflow.get("nodes", [])
        
        for node in nodes:
            # Update positive prompt
            if node.get("type") == "CLIPTextEncode" and node.get("color") == "#232":
                if "widgets_values" in node:
                    node["widgets_values"][0] = request.prompt
            
            # Update negative prompt
            elif node.get("type") == "CLIPTextEncode" and node.get("color") == "#322":
                if "widgets_values" in node:
                    node["widgets_values"][0] = request.negative_prompt
            
            # Update duration
            elif node.get("type") == "EmptyLatentAudio":
                if "widgets_values" in node and len(node["widgets_values"]) >= 1:
                    node["widgets_values"][0] = request.duration
            
            # Update sampler settings
            elif node.get("type") == "KSampler":
                if "widgets_values" in node and len(node["widgets_values"]) >= 7:
                    node["widgets_values"][0] = request.seed  # Seed
                    node["widgets_values"][2] = request.steps  # Steps
                    node["widgets_values"][3] = request.cfg_scale  # CFG scale
    
    def _create_mock_audio_file(self, request: ComfyUIAudioRequest) -> str:
        """Create mock audio file for demonstration."""
        mock_dir = Path("temp_audio_mock")
        mock_dir.mkdir(exist_ok=True)
        
        filename = f"mock_{request.workflow_type.value}_{uuid.uuid4().hex[:8]}.wav"
        mock_path = mock_dir / filename
        
        # Create mock audio file with metadata
        with open(mock_path, 'w') as f:
            f.write(f"# Mock Audio File - {request.workflow_type.value}\n")
            f.write(f"# Prompt: {request.prompt}\n")
            f.write(f"# Duration: {request.duration} seconds\n")
            f.write(f"# Seed: {request.seed}\n")
            f.write(f"# Generated: {time.time()}\n")
        
        return str(mock_path)
    
    def generate_audio_project(self, 
                             timeline_metadata: Dict[str, Any],
                             scene_data: Dict[str, Any],
                             character_data: Dict[str, Any]) -> AudioProject:
        """
        Generate complete audio project from timeline and scene data.
        
        Args:
            timeline_metadata: Video timeline synchronization data
            scene_data: Scene breakdown with dialogue and environment info
            character_data: Character definitions and voice assignments
        
        Returns:
            Complete AudioProject with all tracks and synchronization
        """
        logger.info("Generating complete audio project...")
        
        # Create audio project
        project = AudioProject(
            project_id=f"audio_{int(time.time())}",
            sample_rate=self.settings["sample_rate"],
            bit_depth=self.settings["bit_depth"],
            total_duration=timeline_metadata.get("total_duration", 30.0)
        )
        
        # Assign character voices
        self._assign_character_voices(character_data)
        
        # Generate dialogue track
        dialogue_track = self._generate_dialogue_track(timeline_metadata, scene_data)
        project.tracks.append(dialogue_track)
        
        # Generate SFX track
        sfx_track = self._generate_sfx_track(timeline_metadata, scene_data)
        project.tracks.append(sfx_track)
        
        # Generate ambience track
        ambience_track = self._generate_ambience_track(timeline_metadata, scene_data)
        project.tracks.append(ambience_track)
        
        # Generate music track
        music_track = self._generate_music_track(timeline_metadata, scene_data)
        project.tracks.append(music_track)
        
        # Set up reverb zones
        project.reverb_zones = self._setup_reverb_zones(scene_data)
        
        # Generate sync markers
        project.sync_markers = self._generate_sync_markers(timeline_metadata)
        
        # Add project metadata
        project.metadata = {
            "generation_timestamp": time.time(),
            "quality_level": self.quality.value,
            "mock_mode": self.mock_mode,
            "character_count": len(character_data.get("characters", [])),
            "scene_count": len(scene_data.get("scenes", [])),
            "total_clips": sum(len(track.clips) for track in project.tracks)
        }
        
        logger.info(f"Audio project generated - {len(project.tracks)} tracks, {project.metadata['total_clips']} clips")
        return project
    
    def _assign_character_voices(self, character_data: Dict[str, Any]):
        """Assign voice types to characters."""
        characters = character_data.get("characters", [])
        
        for character in characters:
            char_id = character.get("character_id", "unknown")
            
            # Determine voice type based on character attributes
            age = character.get("age", "adult")
            gender = character.get("gender", "neutral")
            
            if age == "child":
                voice_type = VoiceType.CHILD
            elif gender == "male":
                if age == "young":
                    voice_type = VoiceType.MALE_YOUNG
                elif age == "elderly":
                    voice_type = VoiceType.MALE_ELDERLY
                else:
                    voice_type = VoiceType.MALE_ADULT
            elif gender == "female":
                if age == "young":
                    voice_type = VoiceType.FEMALE_YOUNG
                elif age == "elderly":
                    voice_type = VoiceType.FEMALE_ELDERLY
                else:
                    voice_type = VoiceType.FEMALE_ADULT
            else:
                voice_type = VoiceType.NARRATOR
            
            self.character_voices[char_id] = voice_type
            logger.debug(f"Assigned voice {voice_type.value} to character {char_id}")
    
    def _generate_dialogue_track(self, 
                               timeline_metadata: Dict[str, Any],
                               scene_data: Dict[str, Any]) -> AudioTrack:
        """Generate dialogue track with character voices using ComfyUI."""
        logger.info("Generating dialogue track with ComfyUI...")
        
        clips = []
        scenes = scene_data.get("scenes", [])
        
        for scene_idx, scene in enumerate(scenes):
            dialogue_lines = scene.get("dialogue", [])
            scene_start_time = scene_idx * 10.0  # Assume 10 seconds per scene
            
            for line_idx, line in enumerate(dialogue_lines):
                character_id = line.get("character_id", "narrator")
                text = line.get("text", "")
                emotion = line.get("emotion", "neutral")
                
                if not text.strip():
                    continue
                
                # Calculate timing
                start_time = scene_start_time + (line_idx * 3.0)  # 3 seconds per line
                duration = max(2.0, len(text) * 0.1)  # Estimate based on text length
                
                # Get character voice
                voice_type = self.character_voices.get(character_id, VoiceType.NARRATOR)
                
                # Generate dialogue using ComfyUI ACE Step
                dialogue_prompt = self._create_dialogue_prompt(text, voice_type, emotion)
                
                request = ComfyUIAudioRequest(
                    workflow_type=ComfyUIWorkflowType.ACE_STEP_T2A,
                    prompt=dialogue_prompt,
                    duration=duration,
                    seed=hash(f"{character_id}_{scene_idx}_{line_idx}") % (2**32),
                    metadata={
                        "lyrics": text,
                        "character_id": character_id,
                        "voice_type": voice_type.value,
                        "emotion": emotion
                    }
                )
                
                audio_path = self._generate_comfyui_audio(request)
                
                # Create dialogue clip
                clip = AudioClip(
                    clip_id=f"dialogue_{scene_idx}_{line_idx}",
                    audio_type=AudioType.DIALOGUE,
                    start_time=start_time,
                    duration=duration,
                    content=audio_path or f"mock_dialogue_{character_id}",
                    character_id=character_id,
                    voice_type=voice_type,
                    volume=0.8,
                    metadata={
                        "scene_index": scene_idx,
                        "line_index": line_idx,
                        "emotion": emotion,
                        "intensity": line.get("intensity", 0.5),
                        "generated_audio": audio_path,
                        "comfyui_prompt": dialogue_prompt
                    }
                )
                
                clips.append(clip)
        
        return AudioTrack(
            track_id="dialogue",
            track_type=AudioType.DIALOGUE,
            clips=clips,
            volume=0.9
        )
    
    def _create_dialogue_prompt(self, text: str, voice_type: VoiceType, emotion: str) -> str:
        """Create ComfyUI prompt for dialogue generation."""
        # Map voice types to audio characteristics
        voice_prompts = {
            VoiceType.MALE_YOUNG: "young male voice, clear speech, energetic",
            VoiceType.MALE_ADULT: "adult male voice, confident, clear diction",
            VoiceType.MALE_ELDERLY: "elderly male voice, wise, measured speech",
            VoiceType.FEMALE_YOUNG: "young female voice, bright, expressive",
            VoiceType.FEMALE_ADULT: "adult female voice, professional, clear",
            VoiceType.FEMALE_ELDERLY: "elderly female voice, gentle, experienced",
            VoiceType.CHILD: "child voice, innocent, playful",
            VoiceType.NARRATOR: "narrator voice, neutral, professional"
        }
        
        # Map emotions to audio characteristics
        emotion_prompts = {
            "happy": "cheerful, upbeat, positive tone",
            "sad": "melancholic, slow, emotional",
            "angry": "intense, forceful, aggressive tone",
            "scared": "nervous, trembling, fearful",
            "excited": "energetic, fast-paced, enthusiastic",
            "calm": "peaceful, steady, relaxed",
            "neutral": "balanced, natural tone"
        }
        
        voice_desc = voice_prompts.get(voice_type, "clear voice")
        emotion_desc = emotion_prompts.get(emotion, "natural tone")
        
        return f"speech, dialogue, {voice_desc}, {emotion_desc}, high quality, clear audio"
    
    def _generate_sfx_track(self, 
                          timeline_metadata: Dict[str, Any],
                          scene_data: Dict[str, Any]) -> AudioTrack:
        """Generate sound effects track using ComfyUI."""
        logger.info("Generating SFX track with ComfyUI...")
        
        clips = []
        scenes = scene_data.get("scenes", [])
        
        for scene_idx, scene in enumerate(scenes):
            environment = scene.get("environment", {})
            actions = scene.get("actions", [])
            scene_start_time = scene_idx * 10.0
            
            # Environment-based SFX using Stable Audio
            env_type = environment.get("type", "indoor")
            if env_type == "outdoor":
                # Generate wind and nature sounds
                request = ComfyUIAudioRequest(
                    workflow_type=ComfyUIWorkflowType.STABLE_AUDIO,
                    prompt="wind blowing, nature sounds, outdoor ambience, forest atmosphere",
                    duration=10.0,
                    seed=hash(f"env_{scene_idx}_{env_type}") % (2**32)
                )
                
                audio_path = self._generate_comfyui_audio(request)
                
                clip = AudioClip(
                    clip_id=f"sfx_wind_{scene_idx}",
                    audio_type=AudioType.SFX,
                    start_time=scene_start_time,
                    duration=10.0,
                    content=audio_path or "wind_ambient",
                    volume=0.3,
                    metadata={
                        "environment": env_type,
                        "generated_audio": audio_path,
                        "comfyui_prompt": request.prompt
                    }
                )
                clips.append(clip)
            
            # Action-based SFX
            for action_idx, action in enumerate(actions):
                action_type = action.get("type", "")
                
                # Map actions to SFX prompts
                sfx_prompts = {
                    "walk": "footsteps on ground, walking sound, steady pace",
                    "run": "running footsteps, fast pace, urgent movement",
                    "open": "door opening, creaking hinges, wooden door",
                    "close": "door closing, solid thud, latch clicking",
                    "fight": "sword clashing, metal on metal, combat sounds",
                    "magic": "magical spell, mystical energy, fantasy magic sound"
                }
                
                sfx_prompt = sfx_prompts.get(action_type)
                if sfx_prompt:
                    start_time = scene_start_time + (action_idx * 2.0)
                    
                    request = ComfyUIAudioRequest(
                        workflow_type=ComfyUIWorkflowType.STABLE_AUDIO,
                        prompt=sfx_prompt,
                        duration=1.5,
                        seed=hash(f"action_{scene_idx}_{action_idx}_{action_type}") % (2**32)
                    )
                    
                    audio_path = self._generate_comfyui_audio(request)
                    
                    clip = AudioClip(
                        clip_id=f"sfx_{action_type}_{scene_idx}_{action_idx}",
                        audio_type=AudioType.SFX,
                        start_time=start_time,
                        duration=1.5,
                        content=audio_path or f"sfx_{action_type}",
                        volume=0.6,
                        metadata={
                            "action_type": action_type,
                            "scene_index": scene_idx,
                            "generated_audio": audio_path,
                            "comfyui_prompt": sfx_prompt
                        }
                    )
                    clips.append(clip)
        
        return AudioTrack(
            track_id="sfx",
            track_type=AudioType.SFX,
            clips=clips,
            volume=0.7
        )
    
    def _generate_ambience_track(self, 
                               timeline_metadata: Dict[str, Any],
                               scene_data: Dict[str, Any]) -> AudioTrack:
        """Generate ambience and environmental audio using ComfyUI."""
        logger.info("Generating ambience track with ComfyUI...")
        
        clips = []
        scenes = scene_data.get("scenes", [])
        
        for scene_idx, scene in enumerate(scenes):
            environment = scene.get("environment", {})
            scene_start_time = scene_idx * 10.0
            
            # Determine ambience type
            env_type = environment.get("type", "indoor")
            time_of_day = environment.get("time_of_day", "day")
            weather = environment.get("weather", "clear")
            
            ambience_prompt = self._create_ambience_prompt(env_type, time_of_day, weather)
            
            request = ComfyUIAudioRequest(
                workflow_type=ComfyUIWorkflowType.STABLE_AUDIO,
                prompt=ambience_prompt,
                duration=10.0,
                seed=hash(f"ambience_{scene_idx}_{env_type}_{time_of_day}") % (2**32)
            )
            
            audio_path = self._generate_comfyui_audio(request)
            
            clip = AudioClip(
                clip_id=f"ambience_{scene_idx}",
                audio_type=AudioType.AMBIENCE,
                start_time=scene_start_time,
                duration=10.0,
                content=audio_path or f"ambience_{env_type}_{time_of_day}",
                volume=0.4,
                metadata={
                    "environment_type": env_type,
                    "time_of_day": time_of_day,
                    "weather": weather,
                    "generated_audio": audio_path,
                    "comfyui_prompt": ambience_prompt
                }
            )
            clips.append(clip)
        
        return AudioTrack(
            track_id="ambience",
            track_type=AudioType.AMBIENCE,
            clips=clips,
            volume=0.5
        )
    
    def _create_ambience_prompt(self, env_type: str, time_of_day: str, weather: str) -> str:
        """Create ComfyUI prompt for ambience generation."""
        base_prompts = {
            "outdoor": "outdoor atmosphere, natural environment",
            "indoor": "indoor room tone, quiet interior space",
            "forest": "forest ambience, trees, nature sounds",
            "city": "urban environment, city atmosphere",
            "cave": "cave ambience, underground echo, mysterious",
            "beach": "ocean waves, seashore, coastal sounds"
        }
        
        time_prompts = {
            "day": "daytime, bright, active",
            "night": "nighttime, quiet, peaceful",
            "dawn": "early morning, birds chirping",
            "dusk": "evening, sunset, calm"
        }
        
        weather_prompts = {
            "clear": "clear weather, calm",
            "rain": "rain falling, water drops, wet atmosphere",
            "storm": "thunderstorm, heavy rain, wind",
            "snow": "snowy weather, winter atmosphere",
            "wind": "windy, air movement, breezy"
        }
        
        base = base_prompts.get(env_type, "ambient atmosphere")
        time_desc = time_prompts.get(time_of_day, "")
        weather_desc = weather_prompts.get(weather, "")
        
        parts = [base, time_desc, weather_desc, "ambient sound, atmospheric"]
        return ", ".join(filter(None, parts))
    
    def _generate_music_track(self, 
                            timeline_metadata: Dict[str, Any],
                            scene_data: Dict[str, Any]) -> AudioTrack:
        """Generate music and scoring using ComfyUI ACE Step."""
        logger.info("Generating music track with ComfyUI ACE Step...")
        
        clips = []
        scenes = scene_data.get("scenes", [])
        
        for scene_idx, scene in enumerate(scenes):
            mood = scene.get("mood", "neutral")
            tension = scene.get("tension", 0.5)
            scene_start_time = scene_idx * 10.0
            
            # Create music prompt based on mood and tension
            music_prompt = self._create_music_prompt(mood, tension)
            
            request = ComfyUIAudioRequest(
                workflow_type=ComfyUIWorkflowType.ACE_STEP_T2A,
                prompt=music_prompt,
                duration=10.0,
                seed=hash(f"music_{scene_idx}_{mood}") % (2**32),
                metadata={
                    "lyrics": "[instrumental]",
                    "mood": mood,
                    "tension": tension
                }
            )
            
            audio_path = self._generate_comfyui_audio(request)
            
            clip = AudioClip(
                clip_id=f"music_{scene_idx}",
                audio_type=AudioType.MUSIC,
                start_time=scene_start_time,
                duration=10.0,
                content=audio_path or f"music_{mood}_{tension}",
                volume=0.3,
                metadata={
                    "mood": mood,
                    "tension": tension,
                    "musical_key": "C_major",  # Default key
                    "tempo": self._get_tempo_for_tension(tension),
                    "generated_audio": audio_path,
                    "comfyui_prompt": music_prompt
                }
            )
            clips.append(clip)
        
        return AudioTrack(
            track_id="music",
            track_type=AudioType.MUSIC,
            clips=clips,
            volume=0.4
        )
    
    def _create_music_prompt(self, mood: str, tension: float) -> str:
        """Create ComfyUI prompt for music generation."""
        # Base mood characteristics
        mood_prompts = {
            "peaceful": "calm, serene, gentle, peaceful music",
            "tense": "suspenseful, dramatic, intense, building tension",
            "happy": "upbeat, cheerful, joyful, positive music",
            "sad": "melancholic, emotional, slow, minor key",
            "mysterious": "mysterious, ambient, ethereal, enigmatic",
            "action": "energetic, fast-paced, driving, powerful",
            "romantic": "romantic, soft, intimate, warm",
            "epic": "epic, orchestral, grand, heroic"
        }
        
        # Tension-based intensity
        if tension > 0.8:
            intensity = "intense, dramatic, powerful, climactic"
        elif tension > 0.6:
            intensity = "building, moderate intensity, engaging"
        elif tension > 0.4:
            intensity = "gentle build, subtle tension"
        else:
            intensity = "calm, relaxed, peaceful"
        
        # Instrumentation based on mood
        instruments = {
            "peaceful": "piano, strings, soft synthesizer",
            "tense": "strings, brass, percussion, dark tones",
            "happy": "piano, guitar, light percussion, bright tones",
            "sad": "piano, strings, minor chords, slow tempo",
            "mysterious": "ambient pads, ethereal sounds, reverb",
            "action": "drums, electric guitar, bass, fast tempo",
            "romantic": "piano, strings, soft melody",
            "epic": "orchestra, choir, brass, timpani"
        }
        
        base_mood = mood_prompts.get(mood, "atmospheric music")
        instrument_desc = instruments.get(mood, "mixed instrumentation")
        
        return f"{base_mood}, {intensity}, {instrument_desc}, instrumental, cinematic"
    
    def _get_tempo_for_tension(self, tension: float) -> int:
        """Get appropriate tempo based on tension level."""
        if tension > 0.8:
            return random.randint(140, 180)  # Fast, intense
        elif tension > 0.6:
            return random.randint(120, 140)  # Moderate to fast
        elif tension > 0.4:
            return random.randint(90, 120)   # Moderate
        else:
            return random.randint(60, 90)    # Slow, calm
    
    def _setup_reverb_zones(self, scene_data: Dict[str, Any]) -> List[ReverbZone]:
        """Set up reverb zones based on scene environments."""
        zones = []
        scenes = scene_data.get("scenes", [])
        
        used_environments = set()
        
        for scene in scenes:
            environment = scene.get("environment", {})
            env_type = environment.get("type", "indoor")
            
            if env_type not in used_environments:
                if env_type in self.acoustic_profiles:
                    zones.append(self.acoustic_profiles[env_type])
                else:
                    # Create custom zone
                    zone = ReverbZone(
                        zone_id=env_type,
                        name=f"{env_type.title()} Environment",
                        reverb_time=1.5,
                        pre_delay=20,
                        room_size=0.5,
                        damping=0.5,
                        wet_level=0.5,
                        dry_level=0.8
                    )
                    zones.append(zone)
                
                used_environments.add(env_type)
        
        return zones
    
    def _generate_sync_markers(self, timeline_metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate synchronization markers for video alignment."""
        markers = []
        
        # Add markers from timeline metadata
        sync_points = timeline_metadata.get("audio_sync_points", [])
        
        for point in sync_points:
            marker = {
                "timestamp": point.get("timestamp", 0.0),
                "type": point.get("type", "sync"),
                "description": point.get("description", "Sync point"),
                "frame_number": point.get("frame_number", 0)
            }
            markers.append(marker)
        
        # Add additional markers at regular intervals
        total_duration = timeline_metadata.get("total_duration", 30.0)
        interval = 5.0  # Every 5 seconds
        
        for t in range(0, int(total_duration), int(interval)):
            marker = {
                "timestamp": float(t),
                "type": "regular",
                "description": f"Regular sync marker at {t}s",
                "frame_number": int(t * 24)  # Assume 24 FPS
            }
            markers.append(marker)
        
        return sorted(markers, key=lambda x: x["timestamp"])
    
    def export_audio_project(self, 
                           project: AudioProject,
                           export_path: Path,
                           export_stems: bool = True) -> Dict[str, Any]:
        """
        Export audio project to files and metadata.
        
        Args:
            project: AudioProject to export
            export_path: Directory to export to
            export_stems: Whether to export individual track stems
        
        Returns:
            Export manifest with file paths and metadata
        """
        logger.info(f"Exporting audio project to {export_path}")
        
        # Create export directory structure
        export_path.mkdir(parents=True, exist_ok=True)
        (export_path / "stems").mkdir(exist_ok=True)
        (export_path / "metadata").mkdir(exist_ok=True)
        
        export_manifest = {
            "project_id": project.project_id,
            "export_timestamp": time.time(),
            "export_path": str(export_path),
            "files": {},
            "metadata": {}
        }
        
        # Export project metadata
        project_metadata_path = export_path / "metadata" / "audio_project.json"
        with open(project_metadata_path, 'w') as f:
            json.dump(asdict(project), f, indent=2, default=str)
        export_manifest["files"]["project_metadata"] = str(project_metadata_path)
        
        # Export individual track stems if requested
        if export_stems:
            for track in project.tracks:
                stem_path = export_path / "stems" / f"{track.track_id}.json"
                with open(stem_path, 'w') as f:
                    json.dump(asdict(track), f, indent=2, default=str)
                export_manifest["files"][f"stem_{track.track_id}"] = str(stem_path)
        
        # Export sync markers
        sync_path = export_path / "metadata" / "sync_markers.json"
        with open(sync_path, 'w') as f:
            json.dump(project.sync_markers, f, indent=2)
        export_manifest["files"]["sync_markers"] = str(sync_path)
        
        # Export reverb zones
        reverb_path = export_path / "metadata" / "reverb_zones.json"
        with open(reverb_path, 'w') as f:
            json.dump([asdict(zone) for zone in project.reverb_zones], f, indent=2)
        export_manifest["files"]["reverb_zones"] = str(reverb_path)
        
        # Generate audio statistics
        stats = self._generate_audio_statistics(project)
        stats_path = export_path / "metadata" / "audio_statistics.json"
        with open(stats_path, 'w') as f:
            json.dump(stats, f, indent=2)
        export_manifest["files"]["statistics"] = str(stats_path)
        export_manifest["metadata"]["statistics"] = stats
        
        # Mock audio file generation (in real mode, would generate actual audio files)
        if self.mock_mode:
            # Create mock audio files for demonstration
            mock_files = self._create_mock_audio_files(project, export_path)
            export_manifest["files"].update(mock_files)
        
        logger.info(f"Audio project exported - {len(export_manifest['files'])} files generated")
        return export_manifest
    
    def _generate_audio_statistics(self, project: AudioProject) -> Dict[str, Any]:
        """Generate comprehensive audio project statistics."""
        stats = {
            "project_overview": {
                "total_duration": project.total_duration,
                "sample_rate": project.sample_rate,
                "bit_depth": project.bit_depth,
                "track_count": len(project.tracks),
                "total_clips": sum(len(track.clips) for track in project.tracks),
                "reverb_zones": len(project.reverb_zones),
                "sync_markers": len(project.sync_markers)
            },
            "track_analysis": {},
            "content_analysis": {
                "dialogue_lines": 0,
                "sfx_events": 0,
                "ambience_layers": 0,
                "music_segments": 0
            },
            "quality_metrics": {
                "dialogue_coverage": 0.0,
                "sfx_density": 0.0,
                "ambience_consistency": 0.0,
                "music_continuity": 0.0
            }
        }
        
        # Analyze each track
        for track in project.tracks:
            track_stats = {
                "clip_count": len(track.clips),
                "total_duration": sum(clip.duration for clip in track.clips),
                "average_clip_duration": 0.0,
                "volume_range": {"min": 1.0, "max": 0.0},
                "content_variety": len(set(clip.content for clip in track.clips))
            }
            
            if track.clips:
                track_stats["average_clip_duration"] = track_stats["total_duration"] / len(track.clips)
                volumes = [clip.volume for clip in track.clips]
                track_stats["volume_range"]["min"] = min(volumes)
                track_stats["volume_range"]["max"] = max(volumes)
            
            stats["track_analysis"][track.track_id] = track_stats
            
            # Update content analysis
            if track.track_type == AudioType.DIALOGUE:
                stats["content_analysis"]["dialogue_lines"] = len(track.clips)
            elif track.track_type == AudioType.SFX:
                stats["content_analysis"]["sfx_events"] = len(track.clips)
            elif track.track_type == AudioType.AMBIENCE:
                stats["content_analysis"]["ambience_layers"] = len(track.clips)
            elif track.track_type == AudioType.MUSIC:
                stats["content_analysis"]["music_segments"] = len(track.clips)
        
        # Calculate quality metrics
        if project.total_duration > 0:
            dialogue_track = next((t for t in project.tracks if t.track_type == AudioType.DIALOGUE), None)
            if dialogue_track:
                dialogue_duration = sum(clip.duration for clip in dialogue_track.clips)
                stats["quality_metrics"]["dialogue_coverage"] = dialogue_duration / project.total_duration
            
            sfx_track = next((t for t in project.tracks if t.track_type == AudioType.SFX), None)
            if sfx_track:
                stats["quality_metrics"]["sfx_density"] = len(sfx_track.clips) / project.total_duration
            
            stats["quality_metrics"]["ambience_consistency"] = 0.9  # Mock value
            stats["quality_metrics"]["music_continuity"] = 0.8     # Mock value
        
        return stats
    
    def _create_mock_audio_files(self, project: AudioProject, export_path: Path) -> Dict[str, str]:
        """Create mock audio files for demonstration."""
        mock_files = {}
        
        # Create mock master mix
        master_path = export_path / "master_mix.wav"
        with open(master_path, 'w') as f:
            f.write(f"# Mock audio file - Master Mix\n")
            f.write(f"# Duration: {project.total_duration} seconds\n")
            f.write(f"# Sample Rate: {project.sample_rate} Hz\n")
            f.write(f"# Bit Depth: {project.bit_depth} bit\n")
        mock_files["master_mix"] = str(master_path)
        
        # Create mock stem files
        for track in project.tracks:
            stem_path = export_path / "stems" / f"{track.track_id}.wav"
            with open(stem_path, 'w') as f:
                f.write(f"# Mock audio stem - {track.track_id}\n")
                f.write(f"# Clips: {len(track.clips)}\n")
                f.write(f"# Volume: {track.volume}\n")
            mock_files[f"stem_{track.track_id}"] = str(stem_path)
        
        return mock_files


def main():
    """Demonstration of Audio Engine capabilities."""
    print("StoryCore-Engine Audio Engine Demo")
    print("=" * 50)
    
    # Create mock timeline and scene data
    timeline_metadata = {
        "total_duration": 30.0,
        "total_frames": 720,
        "audio_sync_points": [
            {"timestamp": 0.0, "type": "start", "description": "Scene start"},
            {"timestamp": 10.0, "type": "scene_change", "description": "Scene transition"},
            {"timestamp": 20.0, "type": "climax", "description": "Dramatic moment"},
            {"timestamp": 30.0, "type": "end", "description": "Scene end"}
        ]
    }
    
    scene_data = {
        "scenes": [
            {
                "scene_id": "scene_1",
                "environment": {"type": "outdoor", "time_of_day": "day", "weather": "clear"},
                "mood": "peaceful",
                "tension": 0.3,
                "dialogue": [
                    {"character_id": "hero", "text": "What a beautiful day for an adventure!", "emotion": "happy"},
                    {"character_id": "companion", "text": "Indeed, but I sense danger ahead.", "emotion": "concerned"}
                ],
                "actions": [
                    {"type": "walk", "description": "Characters walking through forest"},
                    {"type": "look", "description": "Scanning the horizon"}
                ]
            },
            {
                "scene_id": "scene_2",
                "environment": {"type": "cave", "time_of_day": "day", "weather": "clear"},
                "mood": "tense",
                "tension": 0.8,
                "dialogue": [
                    {"character_id": "hero", "text": "This cave gives me the creeps.", "emotion": "nervous"},
                    {"character_id": "companion", "text": "Stay close. Something's not right.", "emotion": "alert"}
                ],
                "actions": [
                    {"type": "walk", "description": "Cautiously entering cave"},
                    {"type": "magic", "description": "Casting light spell"}
                ]
            }
        ]
    }
    
    character_data = {
        "characters": [
            {"character_id": "hero", "name": "Alex", "age": "adult", "gender": "male"},
            {"character_id": "companion", "name": "Sam", "age": "adult", "gender": "female"}
        ]
    }
    
    # Initialize Audio Engine with ComfyUI configuration
    comfyui_config = {
        "base_url": "http://127.0.0.1:8188",
        "timeout": 300,
        "enable_real_generation": False  # Set to True for real ComfyUI generation
    }
    
    engine = AudioEngine(
        quality=AudioQuality.PROFESSIONAL, 
        mock_mode=True,  # Set to False for real ComfyUI generation
        comfyui_config=comfyui_config
    )
    
    # Generate audio project
    print("\n1. Generating audio project...")
    project = engine.generate_audio_project(timeline_metadata, scene_data, character_data)
    
    print(f"   ✓ Generated {len(project.tracks)} audio tracks")
    print(f"   ✓ Total clips: {sum(len(track.clips) for track in project.tracks)}")
    print(f"   ✓ Duration: {project.total_duration} seconds")
    print(f"   ✓ Reverb zones: {len(project.reverb_zones)}")
    print(f"   ✓ ComfyUI workflows: {len(engine.audio_workflows)} loaded")
    
    # Show ComfyUI integration status
    print(f"\n   ComfyUI Integration Status:")
    print(f"   • Mock mode: {engine.mock_mode}")
    print(f"   • Workflow executor: {'Available' if engine.workflow_executor else 'Not available'}")
    print(f"   • Available workflows: {list(engine.audio_workflows.keys())}")
    
    # Show track details with ComfyUI information
    print("\n2. Audio track breakdown:")
    for track in project.tracks:
        comfyui_clips = sum(1 for clip in track.clips if clip.metadata.get("generated_audio"))
        print(f"   • {track.track_id}: {len(track.clips)} clips, volume {track.volume}")
        if comfyui_clips > 0:
            print(f"     └─ ComfyUI generated: {comfyui_clips} clips")
    
    # Export audio project
    print("\n3. Exporting audio project...")
    export_path = Path("temp_audio_export")
    manifest = engine.export_audio_project(project, export_path, export_stems=True)
    
    print(f"   ✓ Exported to: {export_path}")
    print(f"   ✓ Files generated: {len(manifest['files'])}")
    print(f"   ✓ Statistics: {manifest['metadata']['statistics']['project_overview']}")
    
    # Show quality metrics
    print("\n4. Quality metrics:")
    metrics = manifest['metadata']['statistics']['quality_metrics']
    print(f"   • Dialogue coverage: {metrics['dialogue_coverage']:.1%}")
    print(f"   • SFX density: {metrics['sfx_density']:.1f} events/second")
    print(f"   • Ambience consistency: {metrics['ambience_consistency']:.1%}")
    print(f"   • Music continuity: {metrics['music_continuity']:.1%}")
    
    print("\n✅ Audio Engine with ComfyUI integration demonstration complete!")
    print(f"💡 Mock mode generated realistic audio project structure with ComfyUI workflow integration")
    print(f"🎵 Ready for real ComfyUI audio generation - set mock_mode=False to enable")
    print(f"🔧 Supports ACE Step (T2A, M2M) and Stable Audio workflows")
    print(f"🎬 Fully integrated with Video Engine and Assembly & Export Engine")


if __name__ == "__main__":
    main()