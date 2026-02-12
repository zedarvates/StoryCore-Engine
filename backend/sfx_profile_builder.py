"""
StoryCore SFXProfileBuilder

This module implements the SFX generation logic for StoryCore's multi-track audio system.
Handles SFX types, muffling, filters, sync rules, and SFX playback.

Enhanced with:
- SFXService for SFX playback and management
- Multiple SFX categories
- Variant and volume control

Requirements: AUDIO & SFX STORYCORE ENGINE (VERSION MULTIPISTE) - Section 6, 7
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


# =============================================================================
# SFX TYPES (Section 6.1)
# =============================================================================

class SFXType(str, Enum):
    """Types of SFX"""
    ACTION = "action"
    ENVIRONMENT = "environment"
    STYLIZED = "stylized"
    BULLET_TIME = "bullet_time"


class MufflingType(str, Enum):
    """Section 6.2 - Types d'etouffement"""
    LOW_PASS_DYNAMIC = "low_pass_dynamic"
    BAND_PASS = "band_pass"
    HIGH_CUT = "high_cut"
    REVERB_MUFFLED = "reverb_muffled"
    DUCKING = "ducking"


# =============================================================================
# POST-FILTER TYPES (Section 9)
# =============================================================================

class FilterType(str, Enum):
    """Post-generation filters"""
    LOW_PASS = "low_pass"
    HIGH_PASS = "high_pass"
    BAND_PASS = "band_pass"
    EQ_DYNAMIC = "eq_dynamic"
    COMPRESSION = "compression"
    LIMITER = "limiter"
    TRANSIENT_SHAPER = "transient_shaper"
    STEREO_WIDTH = "stereo_width"
    REVERB = "reverb"
    DELAY = "delay"
    PITCH_SHIFT = "pitch_shift"
    TIME_STRETCH = "time_stretch"


# =============================================================================
# SFX TRACK TYPES (Section 7)
# =============================================================================

class SFXTrackType(str, Enum):
    """Multi-track SFX outputs"""
    ACTION = "action"
    ENVIRONMENT = "environment"
    STYLIZED = "stylized"
    BULLET_TIME = "bullet_time"


# =============================================================================
# SFX SERVICE
# =============================================================================

@dataclass
class SFXVariant:
    """SFX variant configuration"""
    id: str
    name: str
    file_pattern: str
    volume_offset: float = 0.0  # dB
    pitch_offset: float = 0.0  # semitones


class SFXService:
    """
    SFX playback and management service.
    
    Provides:
    - SFX category management
    - Variant selection
    - Volume control
    """
    
    # SFX Categories
    CATEGORIES = [
        "ui_click",
        "ui_hover",
        "transition_whoosh",
        "notification_chime",
        "ambient_nature",
        "ambient_urban",
        "weapons",
        "footsteps",
        "impacts",
        "explosions",
        "vehicles",
        "weather",
        "doors",
        "glass",
        "cloth"
    ]
    
    # SFX variants by category
    SFX_VARIANTS: Dict[str, List[SFXVariant]] = {
        "ui_click": [
            SFXVariant(id="click_light", name="Light Click", file_pattern="ui_click_*.wav", volume_offset=0),
            SFXVariant(id="click_heavy", name="Heavy Click", file_pattern="ui_click_heavy_*.wav", volume_offset=3),
            SFXVariant(id="click_tactile", name="Tactile Click", file_pattern="ui_click_tactile_*.wav", volume_offset=-2)
        ],
        "ui_hover": [
            SFXVariant(id="hover_soft", name="Soft Hover", file_pattern="ui_hover_soft_*.wav", volume_offset=0),
            SFXVariant(id="hover_sharp", name="Sharp Hover", file_pattern="ui_hover_sharp_*.wav", volume_offset=-3)
        ],
        "transition_whoosh": [
            SFXVariant(id="whoosh_fast", name="Fast Whoosh", file_pattern="whoosh_fast_*.wav", volume_offset=0),
            SFXVariant(id="whoosh_slow", name="Slow Whoosh", file_pattern="whoosh_slow_*.wav", volume_offset=-3),
            SFXVariant(id="whoosh_power", name="Power Whoosh", file_pattern="whoosh_power_*.wav", volume_offset=3)
        ],
        "notification_chime": [
            SFXVariant(id="chime_bell", name="Bell", file_pattern="chime_bell_*.wav", volume_offset=0),
            SFXVariant(id="chime_ding", name="Ding", file_pattern="chime_ding_*.wav", volume_offset=-2),
            SFXVariant(id="chime_alert", name="Alert", file_pattern="chime_alert_*.wav", volume_offset=2)
        ],
        "ambient_nature": [
            SFXVariant(id="nature_wind", name="Wind", file_pattern="ambient_wind_*.wav", volume_offset=0),
            SFXVariant(id="nature_birds", name="Birds", file_pattern="ambient_birds_*.wav", volume_offset=-3),
            SFXVariant(id="nature_water", name="Water", file_pattern="ambient_water_*.wav", volume_offset=-2),
            SFXVariant(id="nature_forest", name="Forest", file_pattern="ambient_forest_*.wav", volume_offset=0)
        ],
        "ambient_urban": [
            SFXVariant(id="urban_traffic", name="Traffic", file_pattern="urban_traffic_*.wav", volume_offset=0),
            SFXVariant(id="urban_crowd", name="Crowd", file_pattern="urban_crowd_*.wav", volume_offset=-2),
            SFXVariant(id="urban_construction", name="Construction", file_pattern="urban_construction_*.wav", volume_offset=1)
        ],
        "weapons": [
            SFXVariant(id="weapon_gun_shot", name="Gun Shot", file_pattern="weapon_gun_*.wav", volume_offset=4),
            SFXVariant(id="weapon_blade", name="Blade", file_pattern="weapon_blade_*.wav", volume_offset=0),
            SFXVariant(id="weapon_laser", name="Laser", file_pattern="weapon_laser_*.wav", volume_offset=-1),
            SFXVariant(id="weapon_explosion", name="Explosion", file_pattern="weapon_explosion_*.wav", volume_offset=6)
        ],
        "footsteps": [
            SFXVariant(id="footsteps_concrete", name="Concrete", file_pattern="footsteps_concrete_*.wav", volume_offset=0),
            SFXVariant(id="footsteps_wood", name="Wood", file_pattern="footsteps_wood_*.wav", volume_offset=-2),
            SFXVariant(id="footsteps_grass", name="Grass", file_pattern="footsteps_grass_*.wav", volume_offset=-4),
            SFXVariant(id="footsteps_metal", name="Metal", file_pattern="footsteps_metal_*.wav", volume_offset=1)
        ],
        "impacts": [
            SFXVariant(id="impact_body", name="Body Hit", file_pattern="impact_body_*.wav", volume_offset=3),
            SFXVariant(id="impact_metal", name="Metal Hit", file_pattern="impact_metal_*.wav", volume_offset=2),
            SFXVariant(id="impact_wood", name="Wood Hit", file_pattern="impact_wood_*.wav", volume_offset=0),
            SFXVariant(id="impact_glass", name="Glass Break", file_pattern="impact_glass_*.wav", volume_offset=-1)
        ],
        "explosions": [
            SFXVariant(id="explosion_small", name="Small Explosion", file_pattern="explosion_small_*.wav", volume_offset=2),
            SFXVariant(id="explosion_medium", name="Medium Explosion", file_pattern="explosion_medium_*.wav", volume_offset=4),
            SFXVariant(id="explosion_large", name="Large Explosion", file_pattern="explosion_large_*.wav", volume_offset=6),
            SFXVariant(id="explosion_nuclear", name="Nuclear Explosion", file_pattern="explosion_nuclear_*.wav", volume_offset=8)
        ],
        "vehicles": [
            SFXVariant(id="vehicle_car", name="Car", file_pattern="vehicle_car_*.wav", volume_offset=0),
            SFXVariant(id="vehicle_helicopter", name="Helicopter", file_pattern="vehicle_helicopter_*.wav", volume_offset=2),
            SFXVariant(id="vehicle_engine", name="Engine", file_pattern="vehicle_engine_*.wav", volume_offset=-2),
            SFXVariant(id="vehicle_siren", name="Siren", file_pattern="vehicle_siren_*.wav", volume_offset=3)
        ],
        "weather": [
            SFXVariant(id="weather_rain", name="Rain", file_pattern="weather_rain_*.wav", volume_offset=0),
            SFXVariant(id="weather_thunder", name="Thunder", file_pattern="weather_thunder_*.wav", volume_offset=4),
            SFXVariant(id="weather_lightning", name="Lightning", file_pattern="weather_lightning_*.wav", volume_offset=-3),
            SFXVariant(id="weather_storm", name="Storm", file_pattern="weather_storm_*.wav", volume_offset=1)
        ],
        "doors": [
            SFXVariant(id="door_wood_open", name="Wood Door Open", file_pattern="door_wood_open_*.wav", volume_offset=0),
            SFXVariant(id="door_wood_close", name="Wood Door Close", file_pattern="door_wood_close_*.wav", volume_offset=-2),
            SFXVariant(id="door_metal", name="Metal Door", file_pattern="door_metal_*.wav", volume_offset=2),
            SFXVariant(id="door_squeak", name="Squeaky Door", file_pattern="door_squeak_*.wav", volume_offset=-4)
        ],
        "glass": [
            SFXVariant(id="glass_break", name="Glass Break", file_pattern="glass_break_*.wav", volume_offset=0),
            SFXVariant(id="glass_crack", name="Glass Crack", file_pattern="glass_crack_*.wav", volume_offset=-3),
            SFXVariant(id="glass_shatter", name="Glass Shatter", file_pattern="glass_shatter_*.wav", volume_offset=2)
        ],
        "cloth": [
            SFXVariant(id="cloth_movement", name="Cloth Movement", file_pattern="cloth_movement_*.wav", volume_offset=-4),
            SFXVariant(id="cloth_rip", name="Cloth Rip", file_pattern="cloth_rip_*.wav", volume_offset=0),
            SFXVariant(id="cloth_button", name="Button", file_pattern="cloth_button_*.wav", volume_offset=-6)
        ]
    }
    
    def __init__(self):
        logger.info("SFXService initialized")
        self._active_sounds: Dict[str, Any] = {}
        self._volume_master: float = 1.0
    
    def get_categories(self) -> List[str]:
        """Get list of available SFX categories"""
        return self.CATEGORIES.copy()
    
    def get_variants(self, category: str) -> List[SFXVariant]:
        """Get available variants for a category"""
        return self.SFX_VARIANTS.get(category, [])
    
    async def play_sfx(
        self,
        category: str,
        variant: int = 0,
        volume: float = 1.0,
        pitch: float = 1.0,
        loop: bool = False
    ) -> Tuple[bool, str]:
        """
        Play a sound effect.
        
        Args:
            category: SFX category to play
            variant: Variant index (0-based)
            volume: Volume multiplier (0.0 to 2.0)
            pitch: Pitch multiplier (0.5 to 2.0)
            loop: Whether to loop the sound
            
        Returns:
            Tuple of (success, sound_id)
        """
        try:
            # Validate category
            if category not in self.SFX_VARIANTS:
                logger.warning(f"Unknown SFX category: {category}")
                return False, f"Unknown category: {category}"
            
            variants = self.SFX_VARIANTS[category]
            
            # Validate variant index
            if variant >= len(variants):
                logger.warning(f"Variant {variant} not available for {category}, using 0")
                variant = 0
            
            selected_variant = variants[variant]
            
            # Calculate final volume
            final_volume = volume * self._volume_master * (10 ** (selected_variant.volume_offset / 20))
            
            # In production, this would actually play the sound
            sound_id = f"sfx_{category}_{selected_variant.id}_{datetime.now().timestamp()}"
            
            logger.info(
                f"Playing SFX: category={category}, variant={selected_variant.name}, "
                f"volume={final_volume:.2f}, pitch={pitch}"
            )
            
            # Store active sound
            self._active_sounds[sound_id] = {
                "category": category,
                "variant": selected_variant,
                "volume": final_volume,
                "pitch": pitch,
                "loop": loop,
                "start_time": datetime.now()
            }
            
            return True, sound_id
            
        except Exception as e:
            logger.error(f"Failed to play SFX: {e}")
            return False, str(e)
    
    async def stop_sfx(self, sound_id: str) -> Tuple[bool, str]:
        """
        Stop a playing sound effect.
        
        Args:
            sound_id: ID of the sound to stop
            
        Returns:
            Tuple of (success, message)
        """
        try:
            if sound_id in self._active_sounds:
                del self._active_sounds[sound_id]
                logger.info(f"Stopped SFX: {sound_id}")
                return True, f"Sound {sound_id} stopped"
            else:
                logger.warning(f"Sound not found: {sound_id}")
                return False, f"Sound not found: {sound_id}"
                
        except Exception as e:
            logger.error(f"Failed to stop SFX: {e}")
            return False, str(e)
    
    async def stop_all_sounds(self) -> int:
        """
        Stop all playing sounds.
        
        Returns:
            Number of sounds stopped
        """
        count = len(self._active_sounds)
        self._active_sounds.clear()
        logger.info(f"Stopped {count} sounds")
        return count
    
    def set_master_volume(self, volume: float) -> None:
        """
        Set master volume for all SFX.
        
        Args:
            volume: Master volume (0.0 to 2.0)
        """
        self._volume_master = max(0.0, min(2.0, volume))
        logger.info(f"Master volume set to {self._volume_master}")
    
    def get_active_sounds(self) -> List[Dict[str, Any]]:
        """Get list of currently playing sounds"""
        return [
            {
                "id": sound_id,
                **sound_data,
                "start_time": sound_data["start_time"].isoformat()
            }
            for sound_id, sound_data in self._active_sounds.items()
        ]
    
    def preload_category(self, category: str) -> Tuple[bool, str]:
        """
        Preload all variants of a category.
        
        Args:
            category: SFX category to preload
            
        Returns:
            Tuple of (success, message)
        """
        if category not in self.SFX_VARIANTS:
            return False, f"Unknown category: {category}"
        
        logger.info(f"Preloading category: {category}")
        # In production, this would actually preload the files
        return True, f"Category {category} preloaded"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class MufflingSettings:
    """
    Section 6.2 - Etouffement automatique settings
    Activated in: infiltration, sous l'eau, slow motion, explosion, scene subjective
    """
    enabled: bool = False
    muffling_type: MufflingType = MufflingType.LOW_PASS_DYNAMIC
    cutoff_frequency: float = 1000.0  # Hz
    resonance: float = 1.0
    envelope_attack: float = 0.01  # seconds
    envelope_release: float = 0.1  # seconds
    
    def apply_for_context(self, context: str) -> 'MufflingSettings':
        """Adjust muffling based on scene context"""
        if context in ["infiltration", "underwater", "slow_motion"]:
            self.enabled = True
            self.muffling_type = MufflingType.LOW_PASS_DYNAMIC
            self.cutoff_frequency = 800.0
        elif context == "explosion":
            self.enabled = True
            self.muffling_type = MufflingType.HIGH_CUT
            self.cutoff_frequency = 2000.0
        elif context == "subjective":
            self.enabled = True
            self.muffling_type = MufflingType.BAND_PASS
            self.cutoff_frequency = 1500.0
        return self


@dataclass
class SFXTrack:
    """Individual SFX track output"""
    track_type: SFXTrackType
    name: str
    prompt: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    volume: float = 0.0  # dB
    muffling: MufflingSettings = field(default_factory=MufflingSettings)
    filters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SyncSettings:
    """Section 6.2 - Sync rules"""
    align_with_music: bool = True
    align_with_action: bool = True
    ducking_enabled: bool = True
    ducking_threshold: float = -20.0  # dB
    ducking_release: float = 0.05  # seconds


@dataclass
class SFXProfile:
    """
    Section 11 - SFXProfile JSON Structure
    
    Complete profile for SFX generation including:
    - SFX types and categories
    - Muffling settings
    - Post-filters
    - Sync configuration
    """
    # Identity
    id: str
    project_id: str
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # SFX Configuration
    action_type: str = ""
    intensity: str = "medium"
    environment: str = ""
    
    # Muffling (Section 6.2)
    muffling: MufflingSettings = field(default_factory=MufflingSettings)
    
    # Post-filters (Section 9)
    post_filters: Dict[str, Any] = field(default_factory=dict)
    
    # Sync (Section 6.2)
    sync: SyncSettings = field(default_factory=SyncSettings)
    
    # Track configuration (Section 7)
    tracks: List[SFXTrack] = field(default_factory=list)


# =============================================================================
# SFX PROFILE BUILDER
# =============================================================================

class SFXProfileBuilder:
    """
    Constructs SFXProfile objects for multi-track SFX generation.
    
    Handles:
    - SFX type selection (Section 6.1)
    - Muffling for special contexts (Section 6.2)
    - Post-filter configuration (Section 9)
    - Sync rules (Section 6.2)
    """
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self._profile_id = f"sfx_profile_{project_id}"
        
        # Profile fields
        self._action_type: str = ""
        self._intensity: str = "medium"
        self._environment: str = ""
        
        # Muffling
        self._muffling_enabled: bool = False
        self._muffling_type: MufflingType = MufflingType.LOW_PASS_DYNAMIC
        self._muffling_context: str = ""
        
        # Filters
        self._filters: Dict[str, Any] = {}
        
        # Sync
        self._align_music: bool = True
        self._align_action: bool = True
        self._ducking_enabled: bool = True
        
        # Constraints
        self._duration_seconds: Optional[float] = None
        
        logger.info(f"SFXProfileBuilder initialized for project {project_id}")
    
    # -------------------------------------------------------------------------
    # SFX CONFIGURATION
    # -------------------------------------------------------------------------
    
    def set_action_type(self, action_type: str) -> 'SFXProfileBuilder':
        """Set the type of action SFX"""
        self._action_type = action_type
        return self
    
    def set_intensity(self, intensity: str) -> 'SFXProfileBuilder':
        """Set intensity level"""
        valid_intensities = ["low", "medium", "high", "critical"]
        self._intensity = intensity.lower() if intensity.lower() in valid_intensities else "medium"
        return self
    
    def set_environment(self, environment: str) -> 'SFXProfileBuilder':
        """Set environment context"""
        self._environment = environment
        return self
    
    def set_duration(self, seconds: float) -> 'SFXProfileBuilder':
        """Set target duration"""
        self._duration_seconds = seconds
        return self
    
    # -------------------------------------------------------------------------
    # MUFFLING (Section 6.2)
    # -------------------------------------------------------------------------
    
    def enable_muffling(
        self,
        muffling_type: str = "low_pass_dynamic",
        context: str = ""
    ) -> 'SFXProfileBuilder':
        """Enable muffling with context-based automatic adjustment"""
        self._muffling_enabled = True
        self._muffling_type = MufflingType(muffling_type)
        self._muffling_context = context
        return self
    
    def set_muffling_params(
        self,
        cutoff_hz: float = 1000.0,
        resonance: float = 1.0,
        attack: float = 0.01,
        release: float = 0.1
    ) -> 'SFXProfileBuilder':
        """Configure muffling parameters"""
        self._muffling_params = {
            "cutoff_frequency": cutoff_hz,
            "resonance": resonance,
            "envelope_attack": attack,
            "envelope_release": release
        }
        return self
    
    # -------------------------------------------------------------------------
    # POST-FILTERS (Section 9)
    # -------------------------------------------------------------------------
    
    def add_filter(self, filter_type: str, params: Dict[str, Any]) -> 'SFXProfileBuilder':
        """Add post-generation filter"""
        self._filters[filter_type] = params
        return self
    
    def set_eq(
        self,
        low_gain: float = 0,
        mid_gain: float = 0,
        high_gain: float = 0
    ) -> 'SFXProfileBuilder':
        """Set EQ parameters"""
        self._filters["eq"] = {
            "low_gain": low_gain,
            "mid_gain": mid_gain,
            "high_gain": high_gain
        }
        return self
    
    def set_compression(
        self,
        threshold: float = -20.0,
        ratio: float = 4.0,
        attack: float = 0.01,
        release: float = 0.1
    ) -> 'SFXProfileBuilder':
        """Set compression parameters"""
        self._filters["compressor"] = {
            "threshold_db": threshold,
            "ratio": ratio,
            "attack_ms": attack * 1000,
            "release_ms": release * 1000
        }
        return self
    
    def set_limiter(self, threshold: float = -3.0, release: float = 0.05) -> 'SFXProfileBuilder':
        """Set limiter parameters"""
        self._filters["limiter"] = {
            "threshold_db": threshold,
            "release_ms": release * 1000
        }
        return self
    
    def set_reverb(
        self,
        room_size: float = 0.5,
        damping: float = 0.5,
        wet_level: float = 0.3
    ) -> 'SFXProfileBuilder':
        """Set reverb parameters"""
        self._filters["reverb"] = {
            "room_size": room_size,
            "damping": damping,
            "wet_level": wet_level
        }
        return self
    
    def set_pitch_shift(self, semitones: float = 0) -> 'SFXProfileBuilder':
        """Set pitch shift"""
        self._filters["pitch_shift"] = {"semitones": semitones}
        return self
    
    def set_time_stretch(self, factor: float = 1.0) -> 'SFXProfileBuilder':
        """Set time stretch"""
        self._filters["time_stretch"] = {"factor": factor}
        return self
    
    def set_stereo_width(self, width: float = 1.0) -> 'SFXProfileBuilder':
        """Set stereo width"""
        self._filters["stereo_width"] = {"width": width}
        return self
    
    # -------------------------------------------------------------------------
    # SYNC RULES (Section 6.2)
    # -------------------------------------------------------------------------
    
    def set_sync(
        self,
        align_music: bool = True,
        align_action: bool = True,
        ducking: bool = True
    ) -> 'SFXProfileBuilder':
        """Configure sync settings"""
        self._align_music = align_music
        self._align_action = align_action
        self._ducking_enabled = ducking
        return self
    
    # -------------------------------------------------------------------------
    # PROFILE GENERATION
    # -------------------------------------------------------------------------
    
    def build(self) -> SFXProfile:
        """Build the complete SFXProfile with all settings"""
        
        muffling = MufflingSettings(
            enabled=self._muffling_enabled,
            muffling_type=self._muffling_type
        )
        if self._muffling_context:
            muffling.apply_for_context(self._muffling_context)
        
        sync = SyncSettings(
            align_with_music=self._align_music,
            align_with_action=self._align_action,
            ducking_enabled=self._ducking_enabled
        )
        
        tracks = self._build_tracks()
        
        profile = SFXProfile(
            id=self._profile_id,
            project_id=self.project_id,
            action_type=self._action_type,
            intensity=self._intensity,
            environment=self._environment,
            muffling=muffling,
            post_filters=self._filters,
            sync=sync,
            tracks=tracks
        )
        
        logger.info(f"SFXProfile {profile.id} built successfully with {len(tracks)} tracks")
        return profile
    
    def _build_tracks(self) -> List[SFXTrack]:
        """Generate multi-track SFX configuration (Section 7)"""
        
        tracks = []
        
        # Piste SFX Action - Section 7
        action_track = SFXTrack(
            track_type=SFXTrackType.ACTION,
            name="SFX Action",
            prompt=self._generate_action_prompt(),
            parameters={
                "action_type": self._action_type,
                "intensity": self._intensity
            },
            volume=self._get_action_volume(),
            muffling=self._build_action_muffling(),
            filters=self._filters
        )
        tracks.append(action_track)
        
        # Piste SFX Environnement - Section 7
        env_track = SFXTrack(
            track_type=SFXTrackType.ENVIRONMENT,
            name="SFX Environnement",
            prompt=self._generate_environment_prompt(),
            parameters={
                "environment": self._environment
            },
            volume=-12.0
        )
        tracks.append(env_track)
        
        # Piste SFX Stylizes - Section 7
        stylized_track = SFXTrack(
            track_type=SFXTrackType.STYLIZED,
            name="SFX Stylizes",
            prompt=self._generate_stylized_prompt(),
            parameters={
                "style": "glitch, bass drops, resonances"
            },
            volume=-6.0,
            filters=self._filters
        )
        tracks.append(stylized_track)
        
        # Piste SFX Bullet Time - Section 7
        bullet_time_track = SFXTrack(
            track_type=SFXTrackType.BULLET_TIME,
            name="SFX Bullet Time",
            prompt=self._generate_bullet_time_prompt(),
            parameters={
                "time_stretch": True,
                "pitch_down": True
            },
            volume=-3.0,
            muffling=MufflingSettings(
                enabled=True,
                muffling_type=MufflingType.HIGH_CUT,
                cutoff_frequency=2000.0
            ),
            filters={
                **self._filters,
                "time_stretch": {"factor": 2.0},
                "pitch_shift": {"semitones": -7}
            }
        )
        tracks.append(bullet_time_track)
        
        return tracks
    
    def _get_action_volume(self) -> float:
        """Get volume based on action type (Section 10)"""
        if self._action_type in ["explosion", "impact"]:
            return +4.0
        elif self._action_type in ["tir", "shoot"]:
            return +3.0
        return 0.0
    
    def _build_action_muffling(self) -> MufflingSettings:
        """Build muffling for action track"""
        if self._action_type in ["explosion", "impact"]:
            return MufflingSettings(
                enabled=True,
                muffling_type=MufflingType.HIGH_CUT,
                cutoff_frequency=3000.0
            )
        elif self._action_type in ["whoosh", "passage"]:
            return MufflingSettings(
                enabled=True,
                muffling_type=MufflingType.BAND_PASS,
                cutoff_frequency=2000.0
            )
        return MufflingSettings()
    
    # -------------------------------------------------------------------------
    # PROMPT GENERATORS
    # -------------------------------------------------------------------------
    
    def _generate_action_prompt(self) -> str:
        """Generate prompt for action SFX"""
        return (
            f"Genere uniquement la piste SFX ACTION pour une scene de {self._action_type}, "
            f"intensite {self._intensity}. "
            f"Sons: tirs, impacts, explosions, whooshes, ricochets selon le contexte. "
            f"Etouffement: {'active' if self._muffling_enabled else 'desactive'}. "
            f"Duree: {self._duration_seconds or 5} secondes."
        )
    
    def _generate_environment_prompt(self) -> str:
        """Generate prompt for environment SFX"""
        return (
            f"Genere uniquement la piste SFX ENVIRONNEMENT pour {self._environment or 'un environnement generique'}. "
            f"Sons: vent, pluie, ville, jungle, selon le contexte. "
            f"Volume: ambient (-12 a -20 dB). "
            f"Duree: {self._duration_seconds or 10} secondes, loop possible."
        )
    
    def _generate_stylized_prompt(self) -> str:
        """Generate prompt for stylized SFX"""
        return (
            f"Genere uniquement la piste SFX STYLISES pour une scene de film. "
            f"Elements: glitch, bass drops, resonances stylisees. "
            f"Synchronisation: avec musique et action. "
            f"Duree: {self._duration_seconds or 3} secondes."
        )
    
    def _generate_bullet_time_prompt(self) -> str:
        """Generate prompt for bullet time SFX (Section 6.1)"""
        return (
            f"Genere uniquement la piste SFX BULLET TIME pour une scene en slow motion. "
            f"Effets: time stretch, pitch down, etouffement. "
            f"Contexte: {'sous l\'eau' if self._muffling_context == 'underwater' else 'bullet time'}."
        )
    
    # -------------------------------------------------------------------------
    # DICTIONARY CONVERSION
    # -------------------------------------------------------------------------
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert profile to dictionary for JSON serialization"""
        return {
            "id": self._profile_id,
            "project_id": self.project_id,
            "action_type": self._action_type,
            "intensity": self._intensity,
            "environment": self._environment,
            "muffling": {
                "enabled": self._muffling_enabled,
                "type": self._muffling_type.value,
                "context": self._muffling_context
            },
            "post_filters": self._filters,
            "sync": {
                "align_with_music": self._align_music,
                "align_with_action": self._align_action,
                "ducking_enabled": self._ducking_enabled
            },
            "duration_seconds": self._duration_seconds,
            "created_at": datetime.now().isoformat()
        }
