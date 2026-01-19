"""
Configuration system for Character Setup Wizard

This module handles all configuration settings, defaults, and validation
for the character creation system.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Any


@dataclass
class CharacterWizardConfig:
    """Configuration settings for Character Setup Wizard"""
    
    # File Processing Settings
    max_image_size_mb: int = 50
    supported_image_formats: List[str] = field(default_factory=lambda: ["jpg", "jpeg", "png", "webp", "gif"])
    image_processing_timeout: int = 30  # seconds
    
    # Generation Settings
    default_quality_threshold: float = 3.0  # Minimum quality score (0-5)
    max_generation_retries: int = 3
    generation_timeout: int = 60  # seconds
    
    # Character Profile Settings
    min_personality_traits: int = 3
    max_personality_traits: int = 5
    min_character_strengths: int = 2
    max_character_strengths: int = 3
    min_character_flaws: int = 2
    max_character_flaws: int = 3
    
    # Color Palette Settings
    min_dominant_colors: int = 3
    max_dominant_colors: int = 5
    color_extraction_method: str = "kmeans"  # kmeans, median_cut, octree
    
    # Voice Identity Settings
    default_formality_level: str = "neutral"
    default_humor_style: str = "none"
    max_catchphrases: int = 5
    max_verbal_tics: int = 3
    
    # Integration Settings
    puppet_system_enabled: bool = True
    comfyui_integration_enabled: bool = True
    newbie_integration_enabled: bool = True
    
    # Validation Settings
    strict_validation: bool = True
    require_coherence_anchors: bool = True
    validate_color_harmony: bool = True
    
    # Error Handling Settings
    max_error_retries: int = 3
    error_recovery_enabled: bool = True
    detailed_error_logging: bool = True
    
    # Performance Settings
    enable_caching: bool = True
    cache_expiry_hours: int = 24
    parallel_processing: bool = False  # For batch operations
    
    # Output Settings
    character_library_path: str = "characters"
    backup_enabled: bool = True
    export_format: str = "json"  # json, yaml
    
    # Genre-specific Settings
    genre_archetypes: Dict[str, List[str]] = field(default_factory=lambda: {
        "fantasy": ["hero", "mentor", "villain", "trickster", "guardian", "innocent"],
        "sci-fi": ["scientist", "soldier", "alien", "ai", "rebel", "corporate_agent"],
        "horror": ["final_girl", "skeptic", "believer", "comic_relief", "authority_figure"],
        "romance": ["protagonist", "love_interest", "rival", "best_friend", "mentor"],
        "mystery": ["detective", "suspect", "witness", "victim", "red_herring"]
    })
    
    # Style Presets
    art_style_presets: Dict[str, Dict[str, Any]] = field(default_factory=lambda: {
        "realistic": {
            "rendering_style": "photorealistic",
            "quality_level": "high",
            "style_strength": 0.8
        },
        "anime": {
            "rendering_style": "anime",
            "quality_level": "high", 
            "style_strength": 1.0
        },
        "cartoon": {
            "rendering_style": "cartoon",
            "quality_level": "medium",
            "style_strength": 0.9
        },
        "artistic": {
            "rendering_style": "painterly",
            "quality_level": "high",
            "style_strength": 0.7
        }
    })

    @classmethod
    def load_from_file(cls, config_path: Path) -> "CharacterWizardConfig":
        """Load configuration from JSON file"""
        if not config_path.exists():
            return cls()  # Return default config
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
            
            # Create config instance with loaded data
            config = cls()
            for key, value in config_data.items():
                if hasattr(config, key):
                    setattr(config, key, value)
            
            return config
        except Exception as e:
            print(f"Warning: Failed to load config from {config_path}: {e}")
            return cls()  # Return default config on error

    def save_to_file(self, config_path: Path) -> bool:
        """Save configuration to JSON file"""
        try:
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Convert to dictionary for JSON serialization
            config_dict = {}
            for key, value in self.__dict__.items():
                if not key.startswith('_'):
                    config_dict[key] = value
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config_dict, f, indent=2, ensure_ascii=False)
            
            return True
        except Exception as e:
            print(f"Error: Failed to save config to {config_path}: {e}")
            return False

    def validate(self) -> List[str]:
        """Validate configuration settings and return any issues"""
        issues = []
        
        # Validate file processing settings
        if self.max_image_size_mb <= 0:
            issues.append("max_image_size_mb must be positive")
        
        if not self.supported_image_formats:
            issues.append("supported_image_formats cannot be empty")
        
        # Validate generation settings
        if self.default_quality_threshold < 0 or self.default_quality_threshold > 5:
            issues.append("default_quality_threshold must be between 0 and 5")
        
        if self.max_generation_retries < 0:
            issues.append("max_generation_retries must be non-negative")
        
        # Validate character profile settings
        if self.min_personality_traits > self.max_personality_traits:
            issues.append("min_personality_traits cannot exceed max_personality_traits")
        
        if self.min_character_strengths > self.max_character_strengths:
            issues.append("min_character_strengths cannot exceed max_character_strengths")
        
        if self.min_character_flaws > self.max_character_flaws:
            issues.append("min_character_flaws cannot exceed max_character_flaws")
        
        # Validate color settings
        if self.min_dominant_colors > self.max_dominant_colors:
            issues.append("min_dominant_colors cannot exceed max_dominant_colors")
        
        if self.color_extraction_method not in ["kmeans", "median_cut", "octree"]:
            issues.append("color_extraction_method must be 'kmeans', 'median_cut', or 'octree'")
        
        # Validate paths
        if not self.character_library_path:
            issues.append("character_library_path cannot be empty")
        
        return issues

    def get_genre_archetypes(self, genre: str) -> List[str]:
        """Get available archetypes for a specific genre"""
        return self.genre_archetypes.get(genre.lower(), [])

    def get_art_style_preset(self, style: str) -> Dict[str, Any]:
        """Get art style preset configuration"""
        return self.art_style_presets.get(style.lower(), {})

    def is_supported_image_format(self, file_extension: str) -> bool:
        """Check if image format is supported"""
        return file_extension.lower().lstrip('.') in self.supported_image_formats

    def get_max_image_size_bytes(self) -> int:
        """Get maximum image size in bytes"""
        return self.max_image_size_mb * 1024 * 1024


# Default configuration instance
DEFAULT_CONFIG = CharacterWizardConfig()


def load_config(project_path: Optional[Path] = None) -> CharacterWizardConfig:
    """
    Load configuration with proper precedence:
    1. Project-specific config (.kiro/character_wizard_config.json)
    2. Global config (~/.kiro/character_wizard_config.json)
    3. Default config
    """
    config = CharacterWizardConfig()
    
    # Try to load global config first
    global_config_path = Path.home() / ".kiro" / "character_wizard_config.json"
    if global_config_path.exists():
        config = CharacterWizardConfig.load_from_file(global_config_path)
    
    # Override with project-specific config if available
    if project_path:
        project_config_path = project_path / ".kiro" / "character_wizard_config.json"
        if project_config_path.exists():
            project_config = CharacterWizardConfig.load_from_file(project_config_path)
            # Merge project config over global config
            for key, value in project_config.__dict__.items():
                if not key.startswith('_'):
                    setattr(config, key, value)
    
    return config


def save_config(config: CharacterWizardConfig, project_path: Optional[Path] = None, global_config: bool = False) -> bool:
    """Save configuration to appropriate location"""
    if global_config:
        config_path = Path.home() / ".kiro" / "character_wizard_config.json"
    elif project_path:
        config_path = project_path / ".kiro" / "character_wizard_config.json"
    else:
        raise ValueError("Must specify either project_path or global_config=True")
    
    return config.save_to_file(config_path)