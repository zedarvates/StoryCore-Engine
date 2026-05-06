"""
Comic Generator - Core Type Definitions
Types for panels, pages, narrative state, and visual styles.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum


# ============================================================================
# Comic Style Enums
# ============================================================================


class ComicStyle(str, Enum):
    FRANCO_BELGE = "franco-belge"  # Square panels, clear reading, centered dialogue
    COMICS_US = "comics-us"  # Dynamic panels, diagonals, splash pages
    MANGA = "manga"  # Variable rhythm, emotional large panels, screentones
    WEBTOON = "webtoon"  # Vertical scroll, breathing space, dramatic pauses


class BubbleShape(str, Enum):
    ROUND = "round"
    SPIKY = "spiky"  # Scream / explosion
    CLOUD = "cloud"  # Thought bubble
    FLAME = "flame"  # Rage / demon speech
    RECTANGLE = "rectangle"  # Robot / technology
    GLITCH = "glitch"  # AI / broken mind


class MotionEffect(str, Enum):
    NONE = "none"
    PARALLAX = "parallax"
    ZOOM = "zoom"
    RAIN = "rain"
    LIGHT_FLICKER = "light_flicker"
    TYPEWRITER = "typewriter"
    SHAKE = "shake"


class NarrativeBeat(str, Enum):
    SETUP = "setup"
    TENSION = "tension"
    REVELATION = "revelation"
    TRANSITION = "transition"
    CLIMAX = "climax"
    RESOLUTION = "resolution"


# ============================================================================
# Core Panel Types
# ============================================================================


@dataclass
class DialogueLine:
    character_id: str
    character_name: str
    text: str
    bubble_shape: BubbleShape = BubbleShape.ROUND
    bubble_color: str = "#FFFFFF"
    text_effect: Optional[str] = None  # "shake", "typewriter", "explode"
    voice_profile: Optional[Dict[str, Any]] = None


@dataclass
class PanelScript:
    """Complete script for a single comic panel."""

    id: str
    page_id: str
    panel_index: int  # Position within the page (0-based)
    characters: List[str]  # Character IDs present
    character_names: List[str]  # Human-readable names
    location: str  # Location name
    location_id: Optional[str]
    dialogue: List[DialogueLine]
    visual_cue: str  # Visual description for image generation
    image_prompt: str  # Full prompt for AI image generation
    negative_prompt: str = ""
    seed: int = 42
    narrative_beat: NarrativeBeat = NarrativeBeat.SETUP
    motion_effects: List[MotionEffect] = field(default_factory=list)
    generated_image_path: Optional[str] = None
    camera_move: Optional[Dict[str, Any]] = None  # {"zoom": 1.2, "duration": 5}
    panel_size: str = "normal"  # "normal" | "wide" | "tall" | "splash"


@dataclass
class ComicPage:
    """A single comic page containing multiple panels."""

    id: str
    chapter_id: str
    page_number: int
    panels: List[PanelScript]
    narrative_summary: str  # What happened on this page
    emotional_tone: str  # Overall emotional tone
    arc_position: str  # Where in the arc this page sits
    style: ComicStyle = ComicStyle.MANGA
    layout_template: str = "grid_2x2"  # Layout template name
    exported_image_path: Optional[str] = None
    created_at: Optional[str] = None


@dataclass
class ComicChapter:
    """A chapter containing multiple pages."""

    id: str
    project_id: str
    chapter_number: int
    title: str
    pages: List[ComicPage]
    arc_description: str
    created_at: Optional[str] = None


# ============================================================================
# Narrative State - The Memory System
# ============================================================================


@dataclass
class CharacterState:
    """Current state of a character for narrative continuity."""

    character_id: str
    character_name: str
    emotional_state: str  # "angry", "hopeful", "fearful"
    physical_state: str  # "injured", "healthy", "exhausted"
    location: Optional[str]
    relationships: Dict[str, str]  # char_id -> relationship description
    active_objects: List[str]  # Object IDs currently held/relevant
    last_seen_page: Optional[int]


@dataclass
class NarrativeCheckpoint:
    """Snapshot of story state for continuity between pages."""

    checkpoint_id: str
    page_id: str
    page_number: int
    story_arc_position: float  # 0.0 to 1.0 progress
    active_characters: List[CharacterState]
    revealed_secrets: List[str]
    active_conflicts: List[str]
    last_dramatic_event: str
    story_summary: str
    created_at: str


@dataclass
class ComicState:
    """Full persistent state for the comic generator addon."""

    project_id: str
    last_page_generated: Optional[str]  # Page ID
    last_chapter_id: Optional[str]
    narrative_checkpoint: Optional[NarrativeCheckpoint]
    style_preset: ComicStyle
    progression: float  # 0.0 to 1.0 overall story progress
    chapters: List[str]  # Chapter IDs in order
    total_pages: int
    created_at: str
    updated_at: str

    # Three-level narrative memory
    local_memory: List[str]  # Current page events
    arc_memory: List[str]  # Current chapter events
    global_memory: List[str]  # Full story events


# ============================================================================
# Visual Signature For Characters
# ============================================================================


@dataclass
class CharacterVisualSignature:
    character_id: str
    character_name: str
    primary_color: str  # Hex color
    bubble_theme: BubbleShape
    text_effect: Optional[str]
    bubble_border_color: str
    bubble_background_color: str
    voice_profile: Optional[Dict[str, Any]]


# ============================================================================
# Export Types
# ============================================================================


@dataclass
class ComicExportResult:
    success: bool
    format: str  # "json" | "pdf" | "png"
    output_path: Optional[str]
    pages_exported: int
    error: Optional[str] = None


# ============================================================================
# Generation Request / Response
# ============================================================================


@dataclass
class PageGenerationRequest:
    project_id: str
    chapter_id: str
    story_context: str
    previous_page_summary: Optional[str]
    narrative_checkpoint: Optional[NarrativeCheckpoint]
    characters: List[Dict[str, Any]]  # Character data from StoryCore
    locations: List[Dict[str, Any]]  # Location data from StoryCore
    objects: List[Dict[str, Any]]  # Object data from StoryCore
    style: ComicStyle
    panels_count: int = 4
    narrative_direction: Optional[str] = None  # "tension", "revelation", etc.


@dataclass
class PageGenerationResult:
    success: bool
    page: Optional[ComicPage]
    new_checkpoint: Optional[NarrativeCheckpoint]
    image_prompts: List[str]
    error: Optional[str] = None
