"""
Recap Engine - Core Type Definitions
Types for recap scenes, timelines, character styles, and export results.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum


# ============================================================================
# Recap Visual Enums
# ============================================================================

class CameraMove(str, Enum):
    ZOOM_IN     = "zoom_in"       # Lent zoom vers le centre
    ZOOM_OUT    = "zoom_out"       # Dézoom progressif
    PAN_LEFT    = "pan_left"       # Panoramique gauche vers droite
    PAN_RIGHT   = "pan_right"      # Panoramique droite vers gauche
    SLOW_PUSH   = "slow_push"      # Légère avancée douce
    SHAKE       = "shake"          # Tremblement (combat, choc)
    STATIC      = "static"         # Image fixe pure


class TransitionType(str, Enum):
    FADE_BLACK  = "fade_black"     # Fondu au noir classique
    FADE_WHITE  = "fade_white"     # Fondu au blanc (flashback)
    DISSOLVE    = "dissolve"       # Dissolution douce
    SLIDE_LEFT  = "slide_left"     # Glissement
    CUT         = "cut"            # Coupe sèche
    SEPIA       = "sepia_wash"     # Filtre sépia (flashback)


class RecapStyle(str, Enum):
    MANGA_RECAP  = "manga_recap"   # Style manga recap YouTube classique
    ANIME_EPIC   = "anime_epic"    # Tons dramatiques, musique épique
    COMIC_BOOK   = "comic_book"    # Style comics occidental
    CINEMATIC    = "cinematic"     # Cinematique neutre


class TTSProvider(str, Enum):
    GTTS        = "gtts"           # Google TTS (offline-capable)
    EDGE_TTS    = "edge_tts"       # Microsoft Edge TTS (haute qualité)
    PIPER       = "piper"          # Piper TTS (local, offline)
    ELEVENLABS  = "elevenlabs"     # ElevenLabs (premium)
    MOCK        = "mock"           # Mode test sans TTS réel


# ============================================================================
# Character Style Signature - Cohérence visuelle par personnage
# ============================================================================

@dataclass
class RecapCharacterStyle:
    """
    Signature visuelle fixe d'un personnage pour toute la vidéo.
    Crée la "lisibilité longue durée" clé des recaps YouTube.
    """
    character_id: str
    character_name: str
    frame_color: str                 # Couleur du cadre (#00aaff, #ff4444…)
    frame_glow: str                  # Couleur du halo lumineux
    bubble_style: str                # "square_clean" | "round_soft" | "spiky"
    highlight_effect: str            # "soft_glow" | "hard_outline" | "pulse"
    voice_id: str                    # ID voix TTS pour ce personnage
    voice_pitch: float = 1.0         # Pitch vocal (-1.0 à +1.0)
    voice_speed: float = 1.0         # Vitesse de parole
    narrator_role: str = "character" # "character" | "narrator" | "villain" | "ally"


# ============================================================================
# Recap Scene - Unité atomique de la vidéo
# ============================================================================

@dataclass
class RecapScene:
    """
    Scène unitaire du recap : un panel animé + narration.
    
    Pipeline : image fixe → animation légère → audio TTS → montage ffmpeg
    """
    scene_id: str
    panel_id: str                    # Référence au panel source BD
    source_page_number: int          # Page BD d'origine
    source_panel_index: int          # Index du panel sur la page

    # Contenu narratif
    narration_text: str              # Texte lu par la voix off
    narrator_character_id: str       # Quel personnage / narrateur parle
    subtitle_text: str               # Sous-titre affiché (peut différer)

    # Visuels
    image_path: str                  # Chemin vers l'image du panel
    duration: float                  # Durée en secondes (3.0 – 12.0)
    camera_move: CameraMove          # Type de mouvement caméra
    camera_intensity: float          # Intensité du mouvement (0.0 – 1.0)
    transition_in: TransitionType    # Transition entrante
    transition_out: TransitionType   # Transition sortante
    transition_duration: float       # Durée de la transition (0.3 – 1.5s)

    # Highlights (surbrillance des bulles de dialogues)
    highlight_bubbles: bool          # Surbrillance des bulles actives
    highlight_characters: List[str]  # IDs des personnages à souligner

    # Audio
    audio_path: Optional[str] = None  # Chemin du fichier audio TTS généré
    background_music_volume: float = 0.15  # Volume musique fond (0.0–1.0)
    sfx_tags: List[str] = field(default_factory=list)   # ["whoosh", "hit", "dramatic"]

    # Rendu
    rendered_clip_path: Optional[str] = None  # Clip MP4 final de cette scène
    render_status: str = "pending"   # "pending" | "rendering" | "done" | "error"


# ============================================================================
# Recap Timeline - La vidéo complète
# ============================================================================

@dataclass
class RecapTimeline:
    """
    Représente la structure complète de la vidéo recap.
    """
    timeline_id: str
    project_id: str
    title: str                       # Titre de la vidéo
    subtitle: str                    # Sous-titre (ex: "Chapitre 1-3 recap")
    style: RecapStyle
    scenes: List[RecapScene]
    character_styles: Dict[str, RecapCharacterStyle]  # char_id → style

    # Paramètres globaux
    target_duration: float           # Durée cible totale (secondes)
    actual_duration: float           # Durée calculée réelle
    resolution: str = "1920x1080"    # "1920x1080" | "1280x720"
    fps: int = 30
    background_music_path: Optional[str] = None

    # État de rendu
    render_progress: float = 0.0     # 0.0 à 1.0
    final_video_path: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============================================================================
# Recap State - Persistance
# ============================================================================

@dataclass
class RecapState:
    """État persistant du Recap Engine pour un projet."""
    project_id: str
    timelines: List[str]             # Timeline IDs générées
    active_timeline_id: Optional[str]
    created_at: str
    updated_at: str


# ============================================================================
# Requests / Responses
# ============================================================================

@dataclass
class RecapGenerationRequest:
    """Requête de génération d'un recap depuis une BD StoryCore."""
    project_id: str
    source: str                      # "storycore_bd" | "comic_json" | "script"
    comic_data_path: Optional[str]   # Chemin vers le JSON de BD
    story_context: str               # Contexte narratif global
    characters: List[Dict[str, Any]] # Données personnages StoryCore
    style: RecapStyle = RecapStyle.MANGA_RECAP
    tts_provider: TTSProvider = TTSProvider.GTTS
    target_duration: Optional[float] = None  # Durée cible (None = auto)
    auto_pacing: bool = True         # Cadence automatique selon l'émotion
    language: str = "fr"             # Langue TTS
    narrator_voice: str = "fr-FR-DeniseNeural"  # Voix narrateur par défaut


@dataclass
class RecapGenerationResult:
    """Résultat de la génération d'un recap."""
    success: bool
    timeline: Optional[RecapTimeline]
    scenes_count: int
    estimated_duration: float
    error: Optional[str] = None


@dataclass
class RecapRenderResult:
    """Résultat du rendu vidéo final."""
    success: bool
    video_path: Optional[str]
    duration: float
    file_size_mb: float
    render_time: float
    error: Optional[str] = None


@dataclass
class RecapExportResult:
    """Résultat d'export (vidéo + sous-titres)."""
    success: bool
    video_path: Optional[str]
    subtitle_path: Optional[str]    # Fichier .srt
    duration: float
    error: Optional[str] = None
