"""
StoryCore MusicProfileBuilder

This module implements the musical logic for StoryCore's multi-track audio generation.
Handles input normalization, action-based rules, and track generation.

Requirements: AUDIO & SFX STORYCORE ENGINE (VERSION MULTIPISTE) - Section 4
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


# =============================================================================
# NORMALIZED INPUT ENUMS (Section 3)
# =============================================================================

class FilmGenre(str, Enum):
    """Normalized film genres"""
    ADVENTURE = "adventure"
    DRAMA = "drama"
    HORROR = "horror"
    DOCUMENTARY = "documentary"
    COMEDY = "comedy"
    SCI_FI = "sci-fi"
    FANTASY = "fantasy"
    ACTION = "action"


class Ambiance(str, Enum):
    """Normalized ambiance values"""
    DARK = "dark"
    BRIGHT = "bright"
    MYSTICAL = "mystical"
    EPIC = "epic"
    INTIMATE = "intimate"
    CHAOTIC = "chaotic"


class Tempo(str, Enum):
    """Normalized tempo values"""
    SLOW = "slow"
    MEDIUM = "medium"
    FAST = "fast"


class Intensity(str, Enum):
    """Normalized intensity values"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EVOLVING = "evolving"


class Culture(str, Enum):
    """Normalized cultural contexts"""
    EUROPEAN = "european"
    ASIAN = "asian"
    AFRICAN = "african"
    MIDDLE_EASTERN = "middle-eastern"
    AMERICAN = "american"
    MIXED = "mixed"


class Epoque(str, Enum):
    """Normalized time periods"""
    MODERN = "modern"
    MEDIEVAL = "medieval"
    FUTURISTIC = "futuristic"
    TIMELESS = "timeless"


# =============================================================================
# ACTION TYPES (Section 4.2)
# =============================================================================

class ActionType(str, Enum):
    """Types of actions for music generation"""
    EXPLOSION = "explosion"
    BULLET_TIME = "bullet_time"
    FIGHT = "fight"
    CHASE = "chase"
    INFILTRATION = "infiltration"
    DIALOGUE = "dialogue"
    REVELATION = "revelation"
    TENSION = "tension"
    CALM = "calm"
    EMOTIONAL = "emotional"


class VisualRhythm(str, Enum):
    """Visual rhythm patterns"""
    SLOW = "slow"
    NORMAL = "normal"
    FAST = "fast"
    HYPER = "hyper"
    SLOW_MOTION = "slow_motion"


# =============================================================================
# TRACK TYPES (Section 5)
# =============================================================================

class MusicTrackType(str, Enum):
    """Multi-track music outputs"""
    BASE = "base"           # Piste 1: base musicale (fondation)
    MELODY = "melody"       # Piste 2: mélodie principale
    PERCUSSION = "percussion"  # Piste 3: percussions / rythme
    BASS = "bass"           # Piste 4: basse (mono, phase-locked)
    FX = "fx"               # Piste 5: FX musicaux
    DRONES = "drones"       # Piste 6: drones / pads


# =============================================================================
# DATA CLASSES - MUSIC PROFILE (Section 11)
# =============================================================================

@dataclass
class BassRules:
    """Section 4.2 - Règles basse"""
    mono: bool = True           # Mono obligatoire
    phase_locked: bool = True    # Phase verrouillée
    sub_short: bool = True       # Sub court
    sidechain_light: bool = True # Sidechain léger
    no_pitch: bool = True        # Pas de pitch sur la basse


@dataclass
class GainRules:
    """Section 4.2 - Règles gain"""
    dynamic: bool = True
    bullet_time_drop: bool = False
    explosion_peak: bool = False


@dataclass
class PitchRules:
    """Section 4.2 - Règles pitch"""
    pitch_up_mount: bool = True
    pitch_down_impact: bool = True
    stylized_modulation: bool = False


@dataclass
class TempoRules:
    """Section 4.2 - Règles tempo"""
    # action rapide : 130–160 BPM
    # stylisé : 100–120 BPM
    # bullet time : 60–80 BPM
    # tension : 70–100 BPM
    pass


@dataclass
class ActionContext:
    """Action-based music context"""
    type: ActionType
    intensity: Intensity
    visual_rhythm: VisualRhythm
    bass: BassRules = field(default_factory=BassRules)
    gain: GainRules = field(default_factory=GainRules)
    pitch: PitchRules = field(default_factory=PitchRules)
    transitions: List[str] = field(default_factory=list)


@dataclass
class MusicTrack:
    """Individual music track output"""
    track_type: MusicTrackType
    name: str
    prompt: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    volume: float = 0.0  # dB
    pan: float = 0.0  # -1 to 1
    muted: bool = False
    solo: bool = False


@dataclass
class MusicProfile:
    """
    Section 11 - MusicProfile JSON Structure
    
    Complete profile for music generation including:
    - Project metadata
    - Normalized inputs
    - Action context
    - Multi-track configuration
    """
    # Identity
    id: str
    project_id: str
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # Normalized inputs (Section 3)
    project_type: FilmGenre
    location: str
    themes: List[str]
    visual_style: str
    emotional_intensity: Intensity
    
    # Action context (Section 4.2)
    action: Optional[ActionContext] = None
    
    # Track configuration (Section 5)
    tracks: List[MusicTrack] = field(default_factory=list)
    
    # Constraints (Section 4.1)
    duration_seconds: Optional[float] = None
    transitions: List[str] = field(default_factory=list)
    loops: bool = False
    
    # References (Section 4.1)
    style_references: List[str] = field(default_factory=list)
    instrument_constraints: Dict[str, bool] = field(default_factory=dict)  # allowed/forbidden
    voice_tags: List[str] = field(default_factory=list)


# =============================================================================
# MUSIC PROFILE BUILDER
# =============================================================================

class MusicProfileBuilder:
    """
    Constructs MusicProfile objects based on story/narrative inputs.
    
    Handles:
    - Input normalization (Section 3)
    - Action-based rules (Section 4.2)
    - Multi-track generation (Section 5)
    """
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self._profile_id = f"music_profile_{project_id}"
        
        # Profile fields to be built
        self._project_type: Optional[FilmGenre] = None
        self._location: str = ""
        self._themes: List[str] = []
        self._visual_style: str = ""
        self._emotional_intensity: Optional[Intensity] = None
        
        # Action context
        self._action_type: Optional[ActionType] = None
        self._action_intensity: Optional[Intensity] = None
        self._visual_rhythm: Optional[VisualRhythm] = None
        self._transitions: List[str] = []
        
        # Constraints
        self._duration_seconds: Optional[float] = None
        self._loops: bool = False
        self._style_references: List[str] = []
        self._forbidden_instruments: List[str] = []
        self._allowed_instruments: List[str] = []
        self._voice_tags: List[str] = []
        
        logger.info(f"MusicProfileBuilder initialized for project {project_id}")
    
    # -------------------------------------------------------------------------
    # INPUT NORMALIZATION (Section 3)
    # -------------------------------------------------------------------------
    
    def set_project_type(self, raw_type: str) -> 'MusicProfileBuilder':
        """Normalize and set film genre"""
        normalized = self._normalize_film_genre(raw_type)
        self._project_type = normalized
        logger.debug(f"Project type normalized: {raw_type} -> {normalized.value}")
        return self
    
    def set_location(self, raw_location: str) -> 'MusicProfileBuilder':
        """Set and validate location"""
        # In production, would validate against location database
        self._location = raw_location
        return self
    
    def add_theme(self, theme: str) -> 'MusicProfileBuilder':
        """Add narrative theme"""
        self._themes.append(theme)
        return self
    
    def set_visual_style(self, raw_style: str) -> 'MusicProfileBuilder':
        """Normalize and set visual style"""
        # Map common styles to simplified categories
        style_mapping = {
            'realistic': 'realistic',
            'sombre': 'dark',
            'lumineux': 'bright',
            'cyberpunk': 'cyberpunk',
            'noir': 'dark',
            'vibrant': 'bright',
        }
        self._visual_style = style_mapping.get(raw_style.lower(), raw_style)
        return self
    
    def set_emotional_intensity(self, raw_intensity: str) -> 'MusicProfileBuilder':
        """Normalize and set emotional intensity"""
        normalized = self._normalize_intensity(raw_intensity)
        self._emotional_intensity = normalized
        return self
    
    def set_duration(self, seconds: float) -> 'MusicProfileBuilder':
        """Set target duration"""
        self._duration_seconds = seconds
        return self
    
    def add_transition(self, transition: str) -> 'MusicProfileBuilder':
        """Add transition type (montée, chute, tension, relâchement)"""
        self._transitions.append(transition)
        return self
    
    # -------------------------------------------------------------------------
    # ACTION CONTEXT (Section 4.2)
    # -------------------------------------------------------------------------
    
    def set_action(
        self,
        action_type: str,
        intensity: str,
        visual_rhythm: str
    ) -> 'MusicProfileBuilder':
        """Set action context with automatic rule application"""
        self._action_type = self._normalize_action_type(action_type)
        self._action_intensity = self._normalize_intensity(intensity)
        self._visual_rhythm = self._normalize_visual_rhythm(visual_rhythm)
        return self
    
    def add_style_reference(self, reference: str) -> 'MusicProfileBuilder':
        """Add style/composer reference"""
        self._style_references.append(reference)
        return self
    
    def add_instrument_constraint(self, instrument: str, allowed: bool = True) -> 'MusicProfileBuilder':
        """Add instrument constraint (allowed/forbidden)"""
        if allowed:
            self._allowed_instruments.append(instrument)
        else:
            self._forbidden_instruments.append(instrument)
        return self
    
    def add_voice_tag(self, tag: str) -> 'MusicProfileBuilder':
        """Add voice/tag for style guidance"""
        self._voice_tags.append(tag)
        return self
    
    def set_loops(self, loops: bool) -> 'MusicProfileBuilder':
        """Enable/disable looping"""
        self._loops = loops
        return self
    
    # -------------------------------------------------------------------------
    # PROFILE GENERATION
    # -------------------------------------------------------------------------
    
    def build(self) -> MusicProfile:
        """
        Build the complete MusicProfile with all settings and generated tracks.
        """
        # Build action context if action was set
        action_context = None
        if self._action_type:
            action_context = self._build_action_context()
        
        # Build multi-track configuration
        tracks = self._build_tracks(action_context)
        
        # Create profile
        profile = MusicProfile(
            id=self._profile_id,
            project_id=self.project_id,
            project_type=self._project_type or FilmGenre.DRAMA,
            location=self._location,
            themes=self._themes,
            visual_style=self._visual_style,
            emotional_intensity=self._emotional_intensity or Intensity.MEDIUM,
            action=action_context,
            tracks=tracks,
            duration_seconds=self._duration_seconds,
            transitions=self._transitions,
            loops=self._loops,
            style_references=self._style_references,
            instrument_constraints={
                'allowed': self._allowed_instruments,
                'forbidden': self._forbidden_instruments
            },
            voice_tags=self._voice_tags
        )
        
        logger.info(f"MusicProfile {profile.id} built successfully with {len(tracks)} tracks")
        return profile
    
    def _build_action_context(self) -> ActionContext:
        """Build action context with rules based on action type"""
        
        # Determine rules based on action type (Section 4.2)
        bass_rules = BassRules()
        gain_rules = GainRules()
        pitch_rules = PitchRules()
        
        if self._action_type == ActionType.EXPLOSION:
            gain_rules.explosion_peak = True
            pitch_rules.pitch_down_impact = True
        elif self._action_type == ActionType.BULLET_TIME:
            gain_rules.bullet_time_drop = True
            self._visual_rhythm = VisualRhythm.SLOW_MOTION
        elif self._action_type == ActionType.FIGHT:
            pitch_rules.stylized_modulation = True
        elif self._action_type == ActionType.INFILTRATION:
            bass_rules.sidechain_light = True
        elif self._action_type == ActionType.TENSION:
            pitch_rules.pitch_up_mount = True
        
        return ActionContext(
            type=self._action_type,
            intensity=self._action_intensity or Intensity.MEDIUM,
            visual_rhythm=self._visual_rhythm or VisualRhythm.NORMAL,
            bass=bass_rules,
            gain=gain_rules,
            pitch=pitch_rules,
            transitions=self._transitions
        )
    
    def _build_tracks(self, action_context: Optional[ActionContext]) -> List[MusicTrack]:
        """Generate multi-track configuration (Section 5)"""
        
        tracks = []
        
        # Determine BPM based on context
        bpm = self._determine_bpm(action_context)
        
        # Piste 1: Base musicale (fondation)
        base_prompt = self._generate_base_prompt()
        tracks.append(MusicTrack(
            track_type=MusicTrackType.BASE,
            name="Base Musicale",
            prompt=base_prompt,
            parameters={"bpm": bpm, "role": "foundation"},
            volume=-3.0
        ))
        
        # Piste 2: Mélodie principale
        melody_prompt = self._generate_melody_prompt()
        tracks.append(MusicTrack(
            track_type=MusicTrackType.MELODY,
            name="Mélodie Principale",
            prompt=melody_prompt,
            parameters={"bpm": bpm, "role": "lead_melody"},
            volume=0.0
        ))
        
        # Piste 3: Percussions / Rythme
        percussion_prompt = self._generate_percussion_prompt()
        tracks.append(MusicTrack(
            track_type=MusicTrackType.PERCUSSION,
            name="Percussions",
            prompt=percussion_prompt,
            parameters={"bpm": bpm, "role": "rhythm"},
            volume=-2.0
        ))
        
        # Piste 4: Basse (mono, phase-locked) - Section 4.2 Bass Rules
        bass_prompt = self._generate_bass_prompt(action_context)
        tracks.append(MusicTrack(
            track_type=MusicTrackType.BASS,
            name="Basse",
            prompt=bass_prompt,
            parameters={
                "bpm": bpm,
                "mono": True,
                "phase_locked": True,
                "sub_short": True
            },
            volume=-4.0
        ))
        
        # Piste 5: FX musicaux
        fx_prompt = self._generate_fx_prompt(action_context)
        tracks.append(MusicTrack(
            track_type=MusicTrackType.FX,
            name="FX Musicaux",
            prompt=fx_prompt,
            parameters={"bpm": bpm, "role": "effects"},
            volume=-6.0
        ))
        
        # Piste 6: Drones / Pads
        drones_prompt = self._generate_drones_prompt()
        tracks.append(MusicTrack(
            track_type=MusicTrackType.DRONES,
            name="Drones / Pads",
            prompt=drones_prompt,
            parameters={"bpm": bpm, "role": "texture"},
            volume=-8.0
        ))
        
        return tracks
    
    def _determine_bpm(self, action_context: Optional[ActionContext]) -> int:
        """Determine BPM based on action type (Section 4.2 Tempo Rules)"""
        if not action_context:
            return 120  # Default
        
        # action rapide : 130–160 BPM
        # stylisé : 100–120 BPM
        # bullet time : 60–80 BPM
        # tension : 70–100 BPM
        
        if action_context.type in [ActionType.FIGHT, ActionType.CHASE]:
            return 145  # Fast action
        elif action_context.type == ActionType.BULLET_TIME:
            return 70  # Bullet time slow
        elif action_context.type == ActionType.TENSION:
            return 85  # Tension
        elif action_context.visual_rhythm == VisualRhythm.FAST:
            return 140
        elif action_context.visual_rhythm == VisualRhythm.HYPER:
            return 160
        elif action_context.visual_rhythm == VisualRhythm.SLOW:
            return 80
        else:
            return 110  # Stylized default
    
    # -------------------------------------------------------------------------
    # PROMPT GENERATORS (Section 12)
    # -------------------------------------------------------------------------
    
    def _generate_base_prompt(self) -> str:
        """Generate prompt for base/foundation track"""
        return (
            f"Génère uniquement la piste BASE pour une scène de film {self._project_type.value if self._project_type else 'drama'} "
            f"dans {self._location}, ambiance {self._visual_style}, intensité {self._emotional_intensity.value if self._emotional_intensity else 'medium'}. "
            f"Cette piste constitue la fondation musicale. "
            f"Instruments: harmoniques fondamentaux, accords stables. "
            f"Durée: {self._duration_seconds or 10} secondes."
        )
    
    def _generate_melody_prompt(self) -> str:
        """Generate prompt for melody track"""
        return (
            f"Génère uniquement la piste MÉLODIE pour une scène de film {self._project_type.value if self._project_type else 'drama'} "
            f"dans {self._location}, ambiance {self._visual_style}, intensité {self._emotional_intensity.value if self._emotional_intensity else 'medium'}. "
            f"Cette piste porte la mélodie principale. "
            f"Style: {', '.join(self._style_references) or 'cinématique'}."
        )
    
    def _generate_percussion_prompt(self) -> str:
        """Generate prompt for percussion track"""
        return (
            f"Génère uniquement la piste PERCUSSION pour une scène de film {self._project_type.value if self._project_type else 'drama'} "
            f"dans {self._location}, rythme visuel {self._visual_rhythm.value if self._visual_rhythm else 'normal'}. "
            f"Cette piste gère le rythme et les percussions. "
            f"Instruments: drums, percussion, rhythm section."
        )
    
    def _generate_bass_prompt(self, action_context: Optional[ActionContext]) -> str:
        """Generate prompt for bass track (Section 4.2 Bass Rules)"""
        bass_rules = "mono, phase-locked, sub court, pas de pitch sur la basse"
        if action_context:
            if action_context.gain.explosion_peak:
                bass_rules += ", pic contrôlé pour explosion"
            if action_context.gain.bullet_time_drop:
                bass_rules += ", chute dynamique pour bullet time"
        
        return (
            f"Génère uniquement la piste BASSE pour une scène de film {self._project_type.value if self._project_type else 'drama'} "
            f"dans {self._location}. {bass_rules}. "
            f"Fréquence: sub-basse courte et propre."
        )
    
    def _generate_fx_prompt(self, action_context: Optional[ActionContext]) -> str:
        """Generate prompt for musical FX track"""
        fx_elements = "reverse, glitch, impacts stylisés"
        if action_context:
            if action_context.pitch.pitch_up_mount:
                fx_elements += ", montée avec pitch up"
            if action_context.pitch.pitch_down_impact:
                fx_elements += ", impact avec pitch down"
        
        return (
            f"Génère uniquement la piste FX MUSICAUX pour une scène de film {self._project_type.value if self._project_type else 'drama'} "
            f"dans {self._location}. Éléments: {fx_elements}."
        )
    
    def _generate_drones_prompt(self) -> str:
        """Generate prompt for drones/pads track"""
        return (
            f"Génère uniquement la piste DRONES pour une scène de film {self._project_type.value if self._project_type else 'drama'} "
            f"dans {self._location}, ambiance {self._visual_style}. "
            f"Textures sonores atmosphériques, pads harmoniques."
        )
    
    # -------------------------------------------------------------------------
    # NORMALIZATION HELPERS
    # -------------------------------------------------------------------------
    
    def _normalize_film_genre(self, raw: str) -> FilmGenre:
        """Normalize film genre input"""
        genre_map = {
            'court-métrage': FilmGenre.DRAMA,
            'documentaire': FilmGenre.DOCUMENTARY,
            'film d action': FilmGenre.ACTION,
            'animation': FilmGenre.FANTASY,
            'horror': FilmGenre.HORROR,
            'sci-fi': FilmGenre.SCI_FI,
            'fantasy': FilmGenre.FANTASY,
            'comedy': FilmGenre.COMEDY,
            'adventure': FilmGenre.ADVENTURE,
        }
        return genre_map.get(raw.lower(), FilmGenre.DRAMA)
    
    def _normalize_intensity(self, raw: str) -> Intensity:
        """Normalize intensity input"""
        intensity_map = {
            'faible': Intensity.LOW,
            'moyenne': Intensity.MEDIUM,
            'forte': Intensity.HIGH,
            'évolutive': Intensity.EVOLVING,
            'low': Intensity.LOW,
            'medium': Intensity.MEDIUM,
            'high': Intensity.HIGH,
            'evolving': Intensity.EVOLVING,
        }
        return intensity_map.get(raw.lower(), Intensity.MEDIUM)
    
    def _normalize_action_type(self, raw: str) -> ActionType:
        """Normalize action type input"""
        action_map = {
            'explosion': ActionType.EXPLOSION,
            'bullet time': ActionType.BULLET_TIME,
            'fight': ActionType.FIGHT,
            'chase': ActionType.CHASE,
            'infiltration': ActionType.INFILTRATION,
            'dialogue': ActionType.DIALOGUE,
            'révélation': ActionType.REVELATION,
            'revelation': ActionType.REVELATION,
            'tension': ActionType.TENSION,
            'calme': ActionType.CALM,
            'calm': ActionType.CALM,
            'émotion': ActionType.EMOTIONAL,
            'emotional': ActionType.EMOTIONAL,
        }
        return action_map.get(raw.lower(), ActionType.DIALOGUE)
    
    def _normalize_visual_rhythm(self, raw: str) -> VisualRhythm:
        """Normalize visual rhythm input"""
        rhythm_map = {
            'lent': VisualRhythm.SLOW,
            'slow': VisualRhythm.SLOW,
            'normal': VisualRhythm.NORMAL,
            'rapide': VisualRhythm.FAST,
            'fast': VisualRhythm.FAST,
            'hyper': VisualRhythm.HYPER,
            'slow motion': VisualRhythm.SLOW_MOTION,
        }
        return rhythm_map.get(raw.lower(), VisualRhythm.NORMAL)
    
    def _to_dict(self) -> Dict[str, Any]:
        """Convert profile to dictionary for JSON serialization"""
        return {
            "id": self._profile_id,
            "project_id": self.project_id,
            "project_type": self._project_type.value if self._project_type else None,
            "location": self._location,
            "themes": self._themes,
            "visual_style": self._visual_style,
            "emotional_intensity": self._emotional_intensity.value if self._emotional_intensity else None,
            "action_type": self._action_type.value if self._action_type else None,
            "action_intensity": self._action_intensity.value if self._action_intensity else None,
            "visual_rhythm": self._visual_rhythm.value if self._visual_rhythm else None,
            "transitions": self._transitions,
            "duration_seconds": self._duration_seconds,
            "loops": self._loops,
            "style_references": self._style_references,
            "allowed_instruments": self._allowed_instruments,
            "forbidden_instruments": self._forbidden_instruments,
            "voice_tags": self._voice_tags,
            "created_at": datetime.now().isoformat()
        }

