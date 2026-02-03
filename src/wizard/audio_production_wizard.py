"""
Audio Production Wizard - Sound Design and Audio Generation Assistant

An intelligent wizard that creates comprehensive audio production plans for video sequences,
including voice overs, sound effects, background music, and ambient audio. Analyzes
storyboard shots to generate contextual audio suggestions and organizes complete
soundtracks for professional video production.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import json
import re
from pathlib import Path
from datetime import datetime
import asyncio


class AudioType(Enum):
    """Types of audio elements"""
    VOICE_OVER = "voice_over"
    SOUND_EFFECT = "sound_effect"
    BACKGROUND_MUSIC = "background_music"
    AMBIENT_SOUND = "ambient_sound"
    FOLEY = "foley"
    DIALOGUE = "dialogue"


class AudioMood(Enum):
    """Audio mood categories"""
    DRAMATIC = "dramatic"
    TENSE = "tense"
    PEACEFUL = "peaceful"
    ENERGETIC = "energetic"
    MYSTERIOUS = "mysterious"
    ROMANTIC = "romantic"
    COMIC = "comic"
    EPIC = "epic"
    MELANCHOLIC = "melancholic"
    NEUTRAL = "neutral"


class AudioPriority(Enum):
    """Priority levels for audio elements"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    OPTIONAL = "optional"


@dataclass
class AudioElement:
    """An individual audio element"""
    element_id: str
    audio_type: AudioType
    name: str
    description: str
    duration_seconds: float
    start_time: float
    end_time: float
    volume_level: float  # 0.0 to 1.0
    mood: AudioMood
    priority: AudioPriority
    shot_association: str  # shot_id this audio belongs to
    technical_specs: Dict[str, Any] = field(default_factory=dict)
    generation_prompt: str = ""
    source_file: str = ""
    confidence_score: float = 0.0


@dataclass
class AudioSequence:
    """A sequence of audio elements for a shot or scene"""
    sequence_id: str
    shot_id: str
    duration: float
    audio_elements: List[AudioElement] = field(default_factory=list)
    master_volume: float = 1.0
    fade_in_duration: float = 0.0
    fade_out_duration: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioProductionPlan:
    """Complete audio production plan for a project"""
    project_id: str
    plan_timestamp: str
    total_duration: float
    audio_sequences: List[AudioSequence] = field(default_factory=list)
    voice_over_script: str = ""
    music_cues: List[Dict[str, Any]] = field(default_factory=list)
    sound_effects_inventory: List[Dict[str, Any]] = field(default_factory=list)
    production_notes: List[str] = field(default_factory=list)
    technical_requirements: Dict[str, Any] = field(default_factory=dict)
    quality_metrics: Dict[str, float] = field(default_factory=dict)


class AudioProductionWizard:
    """
    Audio Production Wizard - Complete Sound Design Assistant

    Creates comprehensive audio production plans including:
    - Voice over scripts and timing
    - Sound effects suggestions
    - Background music cues
    - Ambient audio design
    - Foley requirements
    - Complete soundtrack organization
    """

    def __init__(self, audio_engine=None):
        """Initialize the Audio Production wizard"""
        self.audio_engine = audio_engine
        self.production_plan: Optional[AudioProductionPlan] = None

    async def create_audio_production_plan(self, project_path: Path,
                                         focus_shots: Optional[List[str]] = None) -> AudioProductionPlan:
        """
        Create a comprehensive audio production plan for the project

        Args:
            project_path: Path to the StoryCore project directory
            focus_shots: Specific shot IDs to focus on (optional)

        Returns:
            Complete audio production plan
        """
        print("🎵 Audio Production Wizard - Sound Design Assistant")
        print("=" * 60)

        # Load project data
        project_data = self._load_project_data(project_path)

        if not project_data:
            raise ValueError("No project data found. Please ensure this is a valid StoryCore project.")

        print(f"🎬 Analyzing project: {project_data.get('name', 'Unknown Project')}")
        if focus_shots:
            print(f"🎯 Focusing on shots: {', '.join(focus_shots)}")

        # Create production plan
        plan = AudioProductionPlan(
            project_id=self._get_project_id(project_path),
            plan_timestamp=datetime.utcnow().isoformat() + "Z",
            total_duration=0.0
        )

        # Analyze shots and create audio sequences
        shot_planning = project_data.get('shot_planning', {})
        shots = shot_planning.get('shot_lists', [])

        if not shots:
            raise ValueError("No shots found. Please run Shot Planning Wizard first.")

        print(f"🎵 Processing {len(shots)} shots for audio design...")

        total_duration = 0.0
        for shot in shots:
            if focus_shots and shot.get('shot_id') not in focus_shots:
                continue

            # Create audio sequence for this shot
            sequence = await self._create_audio_sequence_for_shot(shot, project_data)
            plan.audio_sequences.append(sequence)
            total_duration += sequence.duration

        plan.total_duration = total_duration

        # Generate additional production elements
        plan.voice_over_script = await self._generate_voice_over_script(plan.audio_sequences, project_data)
        plan.music_cues = await self._generate_music_cues(plan.audio_sequences, project_data)
        plan.sound_effects_inventory = await self._generate_sound_effects_inventory(plan.audio_sequences)
        plan.production_notes = self._generate_production_notes(plan)
        plan.technical_requirements = self._generate_technical_requirements(plan)

        # Calculate quality metrics
        plan.quality_metrics = self._calculate_audio_quality_metrics(plan)

        self.production_plan = plan
        self._save_audio_production_plan(project_path, plan)

        print("\n✅ Audio production plan created!")
        print(f"🎵 Total duration: {total_duration:.1f} seconds")
        print(f"🎼 Audio sequences: {len(plan.audio_sequences)}")
        print(f"🎤 Voice elements: {sum(1 for seq in plan.audio_sequences for elem in seq.audio_elements if elem.audio_type == AudioType.VOICE_OVER)}")
        print(f"🔊 Sound effects: {sum(1 for seq in plan.audio_sequences for elem in seq.audio_elements if elem.audio_type == AudioType.SOUND_EFFECT)}")
        print(f"🎶 Music cues: {len(plan.music_cues)}")

        return plan

    def _load_project_data(self, project_path: Path) -> Dict[str, Any]:
        """Load all relevant project data for audio analysis"""
        project_data = {}

        # Core project files
        files_to_check = [
            'project.json',
            'shot_planning.json',
            'character_definitions.json',
            'scene_breakdown.json'
        ]

        for filename in files_to_check:
            file_path = project_path / filename
            if file_path.exists():
                try:
                    with open(file_path, 'r') as f:
                        project_data[filename.replace('.json', '')] = json.load(f)
                except (json.JSONDecodeError, FileNotFoundError):
                    continue

        return project_data

    def _get_project_id(self, project_path: Path) -> str:
        """Get project ID from project.json"""
        project_file = project_path / "project.json"
        if project_file.exists():
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)
                    return project_data.get('id', 'unknown')
            except:
                pass
        return f"audio_production_{int(datetime.utcnow().timestamp())}"

    async def _create_audio_sequence_for_shot(self, shot: Dict[str, Any],
                                            project_data: Dict[str, Any]) -> AudioSequence:
        """Create an audio sequence for a specific shot"""
        shot_id = shot.get('shot_id', 'unknown')
        duration = shot.get('timing', {}).get('duration_seconds', 3.0)

        sequence = AudioSequence(
            sequence_id=f"audio_seq_{shot_id}",
            shot_id=shot_id,
            duration=duration
        )

        # Analyze shot content and create appropriate audio elements
        await self._analyze_shot_for_audio(shot, sequence, project_data)

        return sequence

    async def _analyze_shot_for_audio(self, shot: Dict[str, Any],
                                    sequence: AudioSequence, project_data: Dict[str, Any]):
        """Analyze shot content and generate appropriate audio elements"""
        shot_type = shot.get('shot_type', {}).get('code', 'MS')
        shot_description = shot.get('description', '').lower()
        camera_movement = shot.get('camera', {}).get('movement', {}).get('type', 'static')
        shot_purpose = shot.get('purpose', 'narrative')

        # Determine primary mood from shot content
        primary_mood = self._determine_shot_mood(shot_description, shot_purpose)

        # Create voice over if needed
        if self._shot_needs_voice_over(shot, project_data):
            voice_element = await self._create_voice_over_element(shot, sequence, primary_mood)
            sequence.audio_elements.append(voice_element)

        # Create sound effects based on shot content
        sfx_elements = await self._create_sound_effects_for_shot(shot, sequence, primary_mood)
        sequence.audio_elements.extend(sfx_elements)

        # Create ambient audio
        ambient_elements = await self._create_ambient_audio_for_shot(shot, sequence, primary_mood)
        sequence.audio_elements.extend(ambient_elements)

        # Create background music cues
        music_elements = await self._create_music_cues_for_shot(shot, sequence, primary_mood)
        sequence.audio_elements.extend(music_elements)

        # Create foley if needed
        foley_elements = await self._create_foley_for_shot(shot, sequence)
        sequence.audio_elements.extend(foley_elements)

    def _determine_shot_mood(self, description: str, purpose: str) -> AudioMood:
        """Determine the primary audio mood for a shot"""
        description_lower = description.lower()

        # Analyze description for mood indicators
        if any(word in description_lower for word in ['dark', 'shadow', 'night', 'mysterious', 'suspense']):
            return AudioMood.MYSTERIOUS
        elif any(word in description_lower for word in ['fight', 'battle', 'intense', 'action']):
            return AudioMood.TENSE
        elif any(word in description_lower for word in ['peaceful', 'calm', 'serene', 'quiet']):
            return AudioMood.PEACEFUL
        elif any(word in description_lower for word in ['exciting', 'energetic', 'fast-paced']):
            return AudioMood.ENERGETIC
        elif any(word in description_lower for word in ['romantic', 'love', 'tender']):
            return AudioMood.ROMANTIC
        elif any(word in description_lower for word in ['sad', 'melancholy', 'emotional']):
            return AudioMood.MELANCHOLIC
        elif any(word in description_lower for word in ['dramatic', 'important', 'climactic']):
            return AudioMood.DRAMATIC
        elif any(word in description_lower for word in ['funny', 'comedy', 'light']):
            return AudioMood.COMIC
        elif any(word in description_lower for word in ['epic', 'grand', 'majestic']):
            return AudioMood.EPIC
        else:
            return AudioMood.NEUTRAL

    def _shot_needs_voice_over(self, shot: Dict[str, Any], project_data: Dict[str, Any]) -> bool:
        """Determine if a shot needs voice over narration"""
        shot_purpose = shot.get('purpose', '').lower()
        shot_description = shot.get('description', '').lower()

        # Voice over needed for:
        # - Exposition shots
        # - Tutorial/explanatory content
        # - Narration-heavy scenes
        # - Opening/closing shots
        return any(indicator in shot_purpose or indicator in shot_description
                  for indicator in ['exposition', 'tutorial', 'narration', 'opening', 'closing', 'voice'])

    async def _create_voice_over_element(self, shot: Dict[str, Any],
                                       sequence: AudioSequence, mood: AudioMood) -> AudioElement:
        """Create a voice over audio element"""
        shot_id = shot.get('shot_id', 'unknown')
        duration = sequence.duration

        # Generate voice over script based on shot content
        script = self._generate_voice_over_script(shot, mood)

        element = AudioElement(
            element_id=f"vo_{shot_id}",
            audio_type=AudioType.VOICE_OVER,
            name=f"Voice Over - {shot_id}",
            description=f"Voice over narration for {shot_id}",
            duration_seconds=duration * 0.7,  # Voice over typically 70% of shot duration
            start_time=sequence.duration * 0.1,  # Start 10% into the shot
            end_time=sequence.duration * 0.8,   # End 80% into the shot
            volume_level=0.8,
            mood=mood,
            priority=AudioPriority.HIGH,
            shot_association=shot_id,
            generation_prompt=script,
            technical_specs={
                'voice_type': 'male_adult' if 'male' in script.lower() else 'female_adult',
                'tone': mood.value,
                'pace': 'moderate',
                'style': 'narrative'
            },
            confidence_score=0.85
        )

        return element

    def _generate_voice_over_script(self, shot: Dict[str, Any], mood: AudioMood) -> str:
        """Generate voice over script for a shot"""
        shot_description = shot.get('description', 'A cinematic scene unfolds.')
        shot_purpose = shot.get('purpose', 'narrative')

        # Create contextual script based on mood and content
        if mood == AudioMood.MYSTERIOUS:
            script = f"In the shadows of uncertainty, {shot_description.lower()}"
        elif mood == AudioMood.DRAMATIC:
            script = f"With great intensity, {shot_description.lower()}"
        elif mood == AudioMood.PEACEFUL:
            script = f"In quiet contemplation, {shot_description.lower()}"
        elif mood == AudioMood.TENSE:
            script = f"Under mounting pressure, {shot_description.lower()}"
        else:
            script = f"{shot_description.capitalize()} unfolds before us."

        return script

    async def _create_sound_effects_for_shot(self, shot: Dict[str, Any],
                                           sequence: AudioSequence, mood: AudioMood) -> List[AudioElement]:
        """Create sound effects for a shot"""
        elements = []
        shot_description = shot.get('description', '').lower()
        shot_type = shot.get('shot_type', {}).get('code', 'MS')

        # Analyze description for sound effect opportunities
        if any(word in shot_description for word in ['door', 'opens', 'closes']):
            elements.append(AudioElement(
                element_id=f"sfx_door_{sequence.sequence_id}",
                audio_type=AudioType.SOUND_EFFECT,
                name="Door Sound",
                description="Door opening/closing sound effect",
                duration_seconds=1.5,
                start_time=sequence.duration * 0.3,
                end_time=sequence.duration * 0.45,
                volume_level=0.6,
                mood=mood,
                priority=AudioPriority.MEDIUM,
                shot_association=sequence.shot_id,
                technical_specs={'category': 'doors', 'subtype': 'wooden_door'},
                confidence_score=0.9
            ))

        if any(word in shot_description for word in ['footsteps', 'walking', 'running']):
            elements.append(AudioElement(
                element_id=f"sfx_footsteps_{sequence.sequence_id}",
                audio_type=AudioType.FOLEY,
                name="Footsteps",
                description="Character movement footsteps",
                duration_seconds=sequence.duration * 0.6,
                start_time=sequence.duration * 0.2,
                end_time=sequence.duration * 0.8,
                volume_level=0.4,
                mood=mood,
                priority=AudioPriority.MEDIUM,
                shot_association=sequence.shot_id,
                technical_specs={'surface': 'wood_floor', 'pace': 'moderate'},
                confidence_score=0.8
            ))

        if any(word in shot_description for word in ['wind', 'storm', 'breeze']):
            elements.append(AudioElement(
                element_id=f"sfx_wind_{sequence.sequence_id}",
                audio_type=AudioType.AMBIENT_SOUND,
                name="Wind Sound",
                description="Environmental wind audio",
                duration_seconds=sequence.duration,
                start_time=0.0,
                end_time=sequence.duration,
                volume_level=0.3,
                mood=mood,
                priority=AudioPriority.LOW,
                shot_association=sequence.shot_id,
                technical_specs={'intensity': 'gentle', 'environment': 'outdoor'},
                confidence_score=0.75
            ))

        return elements

    async def _create_ambient_audio_for_shot(self, shot: Dict[str, Any],
                                           sequence: AudioSequence, mood: AudioMood) -> List[AudioElement]:
        """Create ambient audio for atmosphere"""
        elements = []

        # Create ambient background based on mood
        if mood in [AudioMood.MYSTERIOUS, AudioMood.TENSE]:
            elements.append(AudioElement(
                element_id=f"ambient_tension_{sequence.sequence_id}",
                audio_type=AudioType.AMBIENT_SOUND,
                name="Tension Ambience",
                description="Low tension ambient sound",
                duration_seconds=sequence.duration,
                start_time=0.0,
                end_time=sequence.duration,
                volume_level=0.2,
                mood=mood,
                priority=AudioPriority.LOW,
                shot_association=sequence.shot_id,
                technical_specs={'type': 'suspense_pad', 'frequency': 'low'},
                confidence_score=0.7
            ))

        elif mood == AudioMood.PEACEFUL:
            elements.append(AudioElement(
                element_id=f"ambient_peaceful_{sequence.sequence_id}",
                audio_type=AudioType.AMBIENT_SOUND,
                name="Peaceful Ambience",
                description="Calm and serene background audio",
                duration_seconds=sequence.duration,
                start_time=0.0,
                end_time=sequence.duration,
                volume_level=0.15,
                mood=mood,
                priority=AudioPriority.LOW,
                shot_association=sequence.shot_id,
                technical_specs={'type': 'nature_pad', 'elements': ['gentle_wind', 'distant_birds']},
                confidence_score=0.7
            ))

        return elements

    async def _create_music_cues_for_shot(self, shot: Dict[str, Any],
                                        sequence: AudioSequence, mood: AudioMood) -> List[AudioElement]:
        """Create music cues for a shot"""
        elements = []

        # Determine if this shot needs music
        shot_purpose = shot.get('purpose', '').lower()
        needs_music = any(purpose in shot_purpose for purpose in ['dramatic', 'emotional', 'climactic', 'opening', 'closing'])

        if needs_music or mood in [AudioMood.DRAMATIC, AudioMood.EPIC, AudioMood.ROMANTIC]:
            elements.append(AudioElement(
                element_id=f"music_{mood.value}_{sequence.sequence_id}",
                audio_type=AudioType.BACKGROUND_MUSIC,
                name=f"{mood.value.title()} Music Cue",
                description=f"Background music matching {mood.value} mood",
                duration_seconds=sequence.duration,
                start_time=0.0,
                end_time=sequence.duration,
                volume_level=0.25,
                mood=mood,
                priority=AudioPriority.MEDIUM,
                shot_association=sequence.shot_id,
                technical_specs={
                    'genre': self._music_genre_for_mood(mood),
                    'tempo': self._tempo_for_mood(mood),
                    'instruments': self._instruments_for_mood(mood)
                },
                confidence_score=0.8
            ))

        return elements

    def _music_genre_for_mood(self, mood: AudioMood) -> str:
        """Get appropriate music genre for mood"""
        genre_map = {
            AudioMood.DRAMATIC: 'orchestral',
            AudioMood.TENSE: 'suspense',
            AudioMood.PEACEFUL: 'ambient',
            AudioMood.ENERGETIC: 'electronic',
            AudioMood.MYSTERIOUS: 'atmospheric',
            AudioMood.ROMANTIC: 'piano',
            AudioMood.COMIC: 'light',
            AudioMood.EPIC: 'cinematic',
            AudioMood.MELANCHOLIC: 'strings',
            AudioMood.NEUTRAL: 'ambient'
        }
        return genre_map.get(mood, 'ambient')

    def _tempo_for_mood(self, mood: AudioMood) -> str:
        """Get appropriate tempo for mood"""
        tempo_map = {
            AudioMood.DRAMATIC: 'slow_building',
            AudioMood.TENSE: 'moderate_tense',
            AudioMood.PEACEFUL: 'slow_calm',
            AudioMood.ENERGETIC: 'fast_driving',
            AudioMood.MYSTERIOUS: 'slow_mysterious',
            AudioMood.ROMANTIC: 'moderate_emotional',
            AudioMood.COMIC: 'moderate_light',
            AudioMood.EPIC: 'grand_sweeping',
            AudioMood.MELANCHOLIC: 'slow_sad',
            AudioMood.NEUTRAL: 'moderate_neutral'
        }
        return tempo_map.get(mood, 'moderate')

    def _instruments_for_mood(self, mood: AudioMood) -> List[str]:
        """Get appropriate instruments for mood"""
        instrument_map = {
            AudioMood.DRAMATIC: ['strings', 'brass', 'percussion'],
            AudioMood.TENSE: ['strings', 'piano', 'sfx'],
            AudioMood.PEACEFUL: ['piano', 'strings', 'flute'],
            AudioMood.ENERGETIC: ['electronic', 'drums', 'bass'],
            AudioMood.MYSTERIOUS: ['strings', 'atmospheric_pads', 'low_percussion'],
            AudioMood.ROMANTIC: ['piano', 'strings', 'harp'],
            AudioMood.COMIC: ['piano', 'light_percussion', 'woodwinds'],
            AudioMood.EPIC: ['full_orchestra', 'choir', 'percussion'],
            AudioMood.MELANCHOLIC: ['strings', 'piano', 'cello'],
            AudioMood.NEUTRAL: ['piano', 'light_strings', 'ambient_pads']
        }
        return instrument_map.get(mood, ['piano'])

    async def _create_foley_for_shot(self, shot: Dict[str, Any], sequence: AudioSequence) -> List[AudioElement]:
        """Create foley audio elements for practical sound effects"""
        elements = []
        shot_description = shot.get('description', '').lower()

        # Add foley based on shot content
        if any(action in shot_description for action in ['walking', 'running', 'moving']):
            elements.append(AudioElement(
                element_id=f"foley_movement_{sequence.sequence_id}",
                audio_type=AudioType.FOLEY,
                name="Movement Foley",
                description="Character movement sounds",
                duration_seconds=sequence.duration * 0.5,
                start_time=sequence.duration * 0.25,
                end_time=sequence.duration * 0.75,
                volume_level=0.3,
                mood=AudioMood.NEUTRAL,
                priority=AudioPriority.LOW,
                shot_association=sequence.shot_id,
                technical_specs={'type': 'footsteps', 'surface': 'indoor_hard'},
                confidence_score=0.6
            ))

        return elements

    async def _generate_voice_over_script(self, audio_sequences: List[AudioSequence],
                                        project_data: Dict[str, Any]) -> str:
        """Generate complete voice over script for the project"""
        script_parts = []

        for sequence in audio_sequences:
            voice_elements = [elem for elem in sequence.audio_elements
                            if elem.audio_type == AudioType.VOICE_OVER]
            for element in voice_elements:
                script_parts.append(f"[{sequence.shot_id}] {element.generation_prompt}")

        return "\n\n".join(script_parts)

    async def _generate_music_cues(self, audio_sequences: List[AudioSequence],
                                 project_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate music cues for the project"""
        cues = []

        for sequence in audio_sequences:
            music_elements = [elem for elem in sequence.audio_elements
                            if elem.audio_type == AudioType.BACKGROUND_MUSIC]
            for element in music_elements:
                cue = {
                    'shot_id': sequence.shot_id,
                    'cue_name': element.name,
                    'duration': element.duration_seconds,
                    'mood': element.mood.value,
                    'genre': element.technical_specs.get('genre', 'ambient'),
                    'tempo': element.technical_specs.get('tempo', 'moderate'),
                    'instruments': element.technical_specs.get('instruments', []),
                    'start_time': element.start_time,
                    'volume': element.volume_level
                }
                cues.append(cue)

        return cues

    async def _generate_sound_effects_inventory(self, audio_sequences: List[AudioSequence]) -> List[Dict[str, Any]]:
        """Generate inventory of all sound effects needed"""
        inventory = {}

        for sequence in audio_sequences:
            sfx_elements = [elem for elem in sequence.audio_elements
                          if elem.audio_type in [AudioType.SOUND_EFFECT, AudioType.FOLEY]]

            for element in sfx_elements:
                key = element.technical_specs.get('category', 'misc')
                if key not in inventory:
                    inventory[key] = {
                        'category': key,
                        'effects': [],
                        'shots': []
                    }

                inventory[key]['effects'].append({
                    'name': element.name,
                    'description': element.description,
                    'duration': element.duration_seconds,
                    'shot_id': sequence.shot_id
                })
                inventory[key]['shots'].append(sequence.shot_id)

        return list(inventory.values())

    def _generate_production_notes(self, plan: AudioProductionPlan) -> List[str]:
        """Generate production notes for the audio plan"""
        notes = []

        # Count different types of audio
        total_elements = sum(len(seq.audio_elements) for seq in plan.audio_sequences)
        voice_count = sum(1 for seq in plan.audio_sequences
                         for elem in seq.audio_elements
                         if elem.audio_type == AudioType.VOICE_OVER)
        sfx_count = sum(1 for seq in plan.audio_sequences
                       for elem in seq.audio_elements
                       if elem.audio_type == AudioType.SOUND_EFFECT)
        music_count = len(plan.music_cues)

        notes.append(f"Audio Production Plan Overview:")
        notes.append(f"- Total audio elements: {total_elements}")
        notes.append(f"- Voice over segments: {voice_count}")
        notes.append(f"- Sound effects: {sfx_count}")
        notes.append(f"- Music cues: {music_count}")
        notes.append(f"- Total duration: {plan.total_duration:.1f} seconds")

        if voice_count > 0:
            notes.append(f"\nVoice Production Notes:")
            notes.append(f"- Record voice overs in a quiet environment")
            notes.append(f"- Use a quality microphone for clear audio")
            notes.append(f"- Consider professional voice talent for important segments")

        if sfx_count > 0:
            notes.append(f"\nSound Effects Production Notes:")
            notes.append(f"- Source high-quality sound libraries")
            notes.append(f"- Record custom effects if needed")
            notes.append(f"- Ensure consistent quality across all effects")

        if music_count > 0:
            notes.append(f"\nMusic Production Notes:")
            notes.append(f"- License royalty-free music or compose original")
            notes.append(f"- Ensure music fits the emotional tone of scenes")
            notes.append(f"- Fade music appropriately between scenes")

        return notes

    def _generate_technical_requirements(self, plan: AudioProductionPlan) -> Dict[str, Any]:
        """Generate technical requirements for audio production"""
        return {
            'sample_rate': 48000,  # Hz
            'bit_depth': 24,       # bits
            'channels': 'stereo',  # or 'mono' for voice
            'format': 'WAV',       # for production, convert to MP3/AAC for delivery
            'mastering_level': -6, # LUFS for broadcast
            'noise_floor': -60,    # dB
            'headroom': 6,         # dB
            'compression_ratio': 'moderate',
            'limiting': True,
            'dithering': True,
            'metadata': {
                'include_bwf': True,      # Broadcast Wave Format
                'embed_timestamps': True,
                'shot_references': True
            }
        }

    def _calculate_audio_quality_metrics(self, plan: AudioProductionPlan) -> Dict[str, float]:
        """Calculate quality metrics for the audio plan"""
        metrics = {}

        if not plan.audio_sequences:
            return metrics

        # Coverage metrics
        total_shots = len(plan.audio_sequences)
        shots_with_voice = sum(1 for seq in plan.audio_sequences
                              if any(elem.audio_type == AudioType.VOICE_OVER for elem in seq.audio_elements))
        shots_with_sfx = sum(1 for seq in plan.audio_sequences
                            if any(elem.audio_type in [AudioType.SOUND_EFFECT, AudioType.FOLEY]
                                  for elem in seq.audio_elements))
        shots_with_music = sum(1 for seq in plan.audio_sequences
                              if any(elem.audio_type == AudioType.BACKGROUND_MUSIC for elem in seq.audio_elements))

        metrics['voice_coverage'] = shots_with_voice / total_shots if total_shots > 0 else 0
        metrics['sfx_coverage'] = shots_with_sfx / total_shots if total_shots > 0 else 0
        metrics['music_coverage'] = shots_with_music / total_shots if total_shots > 0 else 0

        # Quality scores
        avg_confidence = sum(elem.confidence_score
                           for seq in plan.audio_sequences
                           for elem in seq.audio_elements) / max(1, sum(len(seq.audio_elements)
                                                                   for seq in plan.audio_sequences))

        metrics['average_confidence'] = avg_confidence
        metrics['overall_quality'] = avg_confidence * 0.7 + min(metrics.get('voice_coverage', 0) * 0.3, 1.0)

        return metrics

    def _save_audio_production_plan(self, project_path: Path, plan: AudioProductionPlan) -> None:
        """Save the audio production plan to project files"""
        # Save main production plan
        plan_data = {
            'audio_production_plan': {
                'project_id': plan.project_id,
                'plan_timestamp': plan.plan_timestamp,
                'total_duration': plan.total_duration,
                'audio_sequences': [
                    {
                        'sequence_id': seq.sequence_id,
                        'shot_id': seq.shot_id,
                        'duration': seq.duration,
                        'audio_elements': [
                            {
                                'element_id': elem.element_id,
                                'audio_type': elem.audio_type.value,
                                'name': elem.name,
                                'description': elem.description,
                                'duration_seconds': elem.duration_seconds,
                                'start_time': elem.start_time,
                                'end_time': elem.end_time,
                                'volume_level': elem.volume_level,
                                'mood': elem.mood.value,
                                'priority': elem.priority.value,
                                'technical_specs': elem.technical_specs,
                                'generation_prompt': elem.generation_prompt,
                                'confidence_score': elem.confidence_score
                            } for elem in seq.audio_elements
                        ],
                        'master_volume': seq.master_volume,
                        'fade_in_duration': seq.fade_in_duration,
                        'fade_out_duration': seq.fade_out_duration
                    } for seq in plan.audio_sequences
                ],
                'voice_over_script': plan.voice_over_script,
                'music_cues': plan.music_cues,
                'sound_effects_inventory': plan.sound_effects_inventory,
                'production_notes': plan.production_notes,
                'technical_requirements': plan.technical_requirements,
                'quality_metrics': plan.quality_metrics
            }
        }

        plan_file = project_path / "audio_production_plan.json"
        with open(plan_file, 'w') as f:
            json.dump(plan_data, f, indent=2)

        # Save voice over script separately
        if plan.voice_over_script:
            script_file = project_path / "voice_over_script.txt"
            with open(script_file, 'w') as f:
                f.write(plan.voice_over_script)

        # Update project.json with audio plan metadata
        project_file = project_path / "project.json"
        if project_file.exists():
            try:
                with open(project_file, 'r') as f:
                    project_data = json.load(f)

                project_data['audio_production'] = {
                    'plan_created': True,
                    'plan_timestamp': plan.plan_timestamp,
                    'total_sequences': len(plan.audio_sequences),
                    'total_elements': sum(len(seq.audio_elements) for seq in plan.audio_sequences),
                    'quality_score': plan.quality_metrics.get('overall_quality', 0)
                }

                with open(project_file, 'w') as f:
                    json.dump(project_data, f, indent=2)

            except Exception as e:
                print(f"Warning: Could not update project.json: {e}")

    def get_audio_preview_for_shot(self, shot_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get audio preview for a specific shot without full plan generation

        Args:
            shot_data: Shot data dictionary

        Returns:
            Audio suggestions for the shot
        """
        # Create temporary sequence for analysis
        sequence = AudioSequence(
            sequence_id="preview_seq",
            shot_id=shot_data.get('shot_id', 'preview'),
            duration=shot_data.get('timing', {}).get('duration_seconds', 3.0)
        )

        # Quick analysis (synchronous for preview)
        shot_description = shot_data.get('description', '').lower()
        mood = self._determine_shot_mood(shot_description, shot_data.get('purpose', 'narrative'))

        suggestions = {
            'shot_id': sequence.shot_id,
            'mood': mood.value,
            'duration': sequence.duration,
            'suggested_audio': []
        }

        # Quick suggestions based on analysis
        if self._shot_needs_voice_over(shot_data, {}):
            suggestions['suggested_audio'].append({
                'type': 'voice_over',
                'description': 'Narration or voice over',
                'priority': 'high'
            })

        if any(word in shot_description for word in ['door', 'walk', 'run', 'wind']):
            suggestions['suggested_audio'].append({
                'type': 'sound_effects',
                'description': 'Environmental sound effects',
                'priority': 'medium'
            })

        suggestions['suggested_audio'].append({
            'type': 'background_music',
            'description': f'{mood.value.title()} background music',
            'priority': 'medium'
        })

        suggestions['suggested_audio'].append({
            'type': 'ambient_sound',
            'description': f'{mood.value.title()} ambient atmosphere',
            'priority': 'low'
        })

        return suggestions


# Convenience functions
def create_audio_production_wizard(audio_engine=None) -> AudioProductionWizard:
    """Create an Audio Production wizard instance"""
    return AudioProductionWizard(audio_engine)


async def generate_audio_plan(project_path: Path, focus_shots: Optional[List[str]] = None) -> AudioProductionPlan:
    """
    Convenience function to generate audio production plan

    Args:
        project_path: Path to project directory
        focus_shots: Specific shot IDs to focus on

    Returns:
        Complete audio production plan
    """
    wizard = create_audio_production_wizard()
    return await wizard.create_audio_production_plan(project_path, focus_shots)


def get_audio_preview_for_shot(shot_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get audio preview for a shot

    Args:
        shot_data: Shot data dictionary

    Returns:
        Audio suggestions preview
    """
    wizard = create_audio_production_wizard()
    return wizard.get_audio_preview_for_shot(shot_data)