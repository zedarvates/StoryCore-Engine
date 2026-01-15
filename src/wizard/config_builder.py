"""
Configuration Builder for Interactive Project Setup Wizard (MVP)

This module builds the complete project configuration from wizard responses,
applying genre defaults and calculating basic project parameters.
"""

from typing import Dict, Any
from .models import WizardState, ProjectConfiguration
from .definitions import get_genre_definition, get_format_definition


class ConfigBuilder:
    """
    Builds project configuration from wizard state (MVP version)
    
    Simplified for MVP - basic configuration with genre defaults.
    """
    
    @staticmethod
    def build_configuration(wizard_state: WizardState) -> ProjectConfiguration:
        """
        Build complete project configuration from wizard state
        
        Args:
            wizard_state: The completed wizard state
            
        Returns:
            ProjectConfiguration with all settings applied
        """
        # Get definitions
        genre_def = get_genre_definition(wizard_state.genre_key)
        format_def = get_format_definition(wizard_state.format_key)
        
        # Build configuration
        config = ProjectConfiguration(
            schema_version="1.0",
            project_name=wizard_state.project_name,
            format=ConfigBuilder._build_format_config(format_def, wizard_state.duration_minutes),
            duration_minutes=wizard_state.duration_minutes,
            genre=ConfigBuilder._build_genre_config(genre_def),
            story=wizard_state.story_content,
            style_config=ConfigBuilder._build_style_config(genre_def),
            technical_specs=ConfigBuilder._build_technical_specs(format_def)
        )
        
        return config
    
    @staticmethod
    def _build_format_config(format_def, duration_minutes: int) -> Dict[str, Any]:
        """Build format configuration section"""
        return {
            "key": format_def.key,
            "name": format_def.name,
            "duration_range": list(format_def.duration_range),
            "actual_duration": duration_minutes,
            "shot_duration_avg": format_def.shot_duration_avg,
            "estimated_shot_count": ConfigBuilder._calculate_shot_count(
                duration_minutes, format_def.shot_duration_avg
            )
        }
    
    @staticmethod
    def _build_genre_config(genre_def) -> Dict[str, Any]:
        """Build genre configuration section"""
        return {
            "key": genre_def.key,
            "name": genre_def.name,
            "style_defaults": genre_def.style_defaults.copy()
        }
    
    @staticmethod
    def _build_style_config(genre_def) -> Dict[str, Any]:
        """Build style configuration from genre defaults"""
        style_defaults = genre_def.style_defaults.copy()
        
        return {
            "visual": {
                "lighting": style_defaults.get("lighting", "natural_soft"),
                "color_palette": style_defaults.get("color_palette", "neutral"),
                "color_temperature": style_defaults.get("color_temperature", "neutral"),
                "contrast": style_defaults.get("contrast", "medium"),
                "saturation": style_defaults.get("saturation", "medium"),
                "mood": style_defaults.get("mood", "neutral")
            },
            "cinematography": {
                "camera_movement": style_defaults.get("camera_movement", "steady"),
                "pacing": style_defaults.get("pacing", "moderate"),
                "shot_duration_avg": style_defaults.get("shot_duration_avg", 5.0)
            }
        }
    
    @staticmethod
    def _build_technical_specs(format_def) -> Dict[str, Any]:
        """Build technical specifications"""
        return {
            "resolution": format_def.resolution,
            "frame_rate": format_def.frame_rate,
            "aspect_ratio": "16:9",  # Default for MVP
            "color_space": "Rec.709",  # Default for MVP
            "audio_sample_rate": 48000,  # Default for MVP
            "audio_channels": 2  # Stereo default for MVP
        }
    
    @staticmethod
    def _calculate_shot_count(duration_minutes: int, shot_duration_avg: float) -> int:
        """
        Calculate estimated shot count
        
        Args:
            duration_minutes: Total duration in minutes
            shot_duration_avg: Average shot duration in seconds
            
        Returns:
            Estimated number of shots
        """
        total_seconds = duration_minutes * 60
        shot_count = int(total_seconds / shot_duration_avg)
        
        # Ensure minimum of 1 shot
        return max(1, shot_count)


# Convenience function for direct use
def build_project_configuration(wizard_state: WizardState) -> ProjectConfiguration:
    """
    Convenience function to build project configuration
    
    Args:
        wizard_state: The completed wizard state
        
    Returns:
        ProjectConfiguration with all settings applied
    """
    return ConfigBuilder.build_configuration(wizard_state)