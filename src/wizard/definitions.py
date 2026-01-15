"""
Genre and Format Definitions for the Wizard (MVP)

This module contains the simplified definitions for the 5 core genres
and 3 basic formats used in the MVP version of the wizard.
"""

from typing import Dict, Any
from .models import GenreDefinition, FormatDefinition


# ============================================================================
# GENRE DEFINITIONS (MVP - 5 genres only)
# ============================================================================

GENRE_DEFINITIONS: Dict[str, GenreDefinition] = {
    "action": GenreDefinition(
        key="action",
        name="Action",
        style_defaults={
            "lighting": "high_contrast_dynamic",
            "color_palette": "saturated_vibrant",
            "color_temperature": "neutral_to_warm",
            "camera_movement": "dynamic_handheld",
            "pacing": "fast",
            "shot_duration_avg": 3.5,
            "mood": "energetic_intense",
            "contrast": "high",
            "saturation": "high"
        }
    ),
    
    "drame": GenreDefinition(
        key="drame",
        name="Drame",
        style_defaults={
            "lighting": "natural_soft",
            "color_palette": "muted_realistic",
            "color_temperature": "neutral",
            "camera_movement": "steady_deliberate",
            "pacing": "moderate",
            "shot_duration_avg": 5.5,
            "mood": "contemplative_emotional",
            "contrast": "medium",
            "saturation": "medium"
        }
    ),
    
    "science_fiction": GenreDefinition(
        key="science_fiction",
        name="Science-Fiction",
        style_defaults={
            "lighting": "stylized_artificial",
            "color_palette": "cool_tones_teal_orange",
            "color_temperature": "cool",
            "camera_movement": "smooth_controlled",
            "pacing": "moderate_to_fast",
            "shot_duration_avg": 4.5,
            "mood": "futuristic_mysterious",
            "contrast": "high",
            "saturation": "medium_to_high"
        }
    ),
    
    "horreur": GenreDefinition(
        key="horreur",
        name="Horreur",
        style_defaults={
            "lighting": "low_key_shadows",
            "color_palette": "desaturated_dark",
            "color_temperature": "cool_to_neutral",
            "camera_movement": "unsettling_handheld",
            "pacing": "slow_builds_to_fast",
            "shot_duration_avg": 6.0,
            "mood": "tense_frightening",
            "contrast": "very_high",
            "saturation": "low"
        }
    ),
    
    "comedie": GenreDefinition(
        key="comedie",
        name="Comédie",
        style_defaults={
            "lighting": "bright_even",
            "color_palette": "warm_cheerful",
            "color_temperature": "warm",
            "camera_movement": "stable_clear",
            "pacing": "fast_to_moderate",
            "shot_duration_avg": 4.0,
            "mood": "lighthearted_fun",
            "contrast": "low_to_medium",
            "saturation": "medium_to_high"
        }
    )
}


# ============================================================================
# FORMAT DEFINITIONS (MVP - 3 formats only)
# ============================================================================

FORMAT_DEFINITIONS: Dict[str, FormatDefinition] = {
    "court_metrage": FormatDefinition(
        key="court_metrage",
        name="Court-métrage",
        duration_range=(1, 15),
        shot_duration_avg=4.0,
        resolution="4K",
        frame_rate=24
    ),
    
    "moyen_metrage": FormatDefinition(
        key="moyen_metrage",
        name="Moyen-métrage",
        duration_range=(20, 45),
        shot_duration_avg=5.0,
        resolution="4K",
        frame_rate=24
    ),
    
    "long_metrage": FormatDefinition(
        key="long_metrage",
        name="Long-métrage",
        duration_range=(75, 100),
        shot_duration_avg=5.5,
        resolution="4K",
        frame_rate=24
    )
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_genre_definition(genre_key: str) -> GenreDefinition:
    """
    Get genre definition by key
    
    Args:
        genre_key: The genre key (e.g., "action", "drame")
        
    Returns:
        GenreDefinition object
        
    Raises:
        KeyError: If genre_key is not found
    """
    if genre_key not in GENRE_DEFINITIONS:
        raise KeyError(f"Genre '{genre_key}' not found. Available genres: {list(GENRE_DEFINITIONS.keys())}")
    return GENRE_DEFINITIONS[genre_key]


def get_format_definition(format_key: str) -> FormatDefinition:
    """
    Get format definition by key
    
    Args:
        format_key: The format key (e.g., "court_metrage", "long_metrage")
        
    Returns:
        FormatDefinition object
        
    Raises:
        KeyError: If format_key is not found
    """
    if format_key not in FORMAT_DEFINITIONS:
        raise KeyError(f"Format '{format_key}' not found. Available formats: {list(FORMAT_DEFINITIONS.keys())}")
    return FORMAT_DEFINITIONS[format_key]


def get_all_genres() -> Dict[str, GenreDefinition]:
    """Get all available genre definitions"""
    return GENRE_DEFINITIONS.copy()


def get_all_formats() -> Dict[str, FormatDefinition]:
    """Get all available format definitions"""
    return FORMAT_DEFINITIONS.copy()


def get_genre_names() -> Dict[str, str]:
    """Get mapping of genre keys to display names"""
    return {key: genre.name for key, genre in GENRE_DEFINITIONS.items()}


def get_format_names() -> Dict[str, str]:
    """Get mapping of format keys to display names"""
    return {key: fmt.name for key, fmt in FORMAT_DEFINITIONS.items()}
