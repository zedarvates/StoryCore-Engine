"""
WorldConfigGenerator for end-to-end project creation.

Generates WorldConfig from ParsedPrompt with:
- Genre-specific world templates
- Color palette selection based on mood and genre
- Location generation based on setting
- Visual style and atmosphere configuration
"""

import uuid
from typing import Dict, List, Optional
from .data_models import (
    ParsedPrompt,
    WorldConfig,
    ColorPalette,
    Location
)


class WorldConfigGenerator:
    """
    Generator for WorldConfig from ParsedPrompt.
    
    Provides genre-specific templates and intelligent defaults
    for creating consistent world configurations.
    """
    
    # Genre-specific world templates
    GENRE_TEMPLATES = {
        'cyberpunk': {
            'lighting_style': 'neon-lit',
            'atmosphere': 'gritty and technological',
            'default_locations': ['megacity', 'underground', 'corporate tower'],
            'visual_style_additions': ['neon', 'industrial', 'gritty']
        },
        'fantasy': {
            'lighting_style': 'magical',
            'atmosphere': 'mystical and enchanted',
            'default_locations': ['enchanted forest', 'castle', 'village'],
            'visual_style_additions': ['organic', 'baroque', 'stylized']
        },
        'horror': {
            'lighting_style': 'shadowy',
            'atmosphere': 'eerie and unsettling',
            'default_locations': ['abandoned house', 'dark forest', 'cemetery'],
            'visual_style_additions': ['gritty', 'surreal', 'minimalist']
        },
        'sci-fi': {
            'lighting_style': 'futuristic',
            'atmosphere': 'advanced and sterile',
            'default_locations': ['space station', 'laboratory', 'alien world'],
            'visual_style_additions': ['minimalist', 'industrial', 'realistic']
        },
        'western': {
            'lighting_style': 'harsh sunlight',
            'atmosphere': 'dusty and rugged',
            'default_locations': ['desert town', 'saloon', 'canyon'],
            'visual_style_additions': ['gritty', 'realistic', 'organic']
        },
        'thriller': {
            'lighting_style': 'dramatic',
            'atmosphere': 'tense and suspenseful',
            'default_locations': ['city street', 'apartment', 'warehouse'],
            'visual_style_additions': ['gritty', 'realistic', 'minimalist']
        },
        'romance': {
            'lighting_style': 'soft and warm',
            'atmosphere': 'intimate and emotional',
            'default_locations': ['cafe', 'park', 'home'],
            'visual_style_additions': ['elegant', 'organic', 'realistic']
        },
        'action': {
            'lighting_style': 'dynamic',
            'atmosphere': 'intense and energetic',
            'default_locations': ['city street', 'rooftop', 'warehouse'],
            'visual_style_additions': ['gritty', 'realistic', 'stylized']
        },
        'comedy': {
            'lighting_style': 'bright',
            'atmosphere': 'lighthearted and playful',
            'default_locations': ['home', 'office', 'street'],
            'visual_style_additions': ['stylized', 'organic', 'minimalist']
        },
        'drama': {
            'lighting_style': 'naturalistic',
            'atmosphere': 'emotional and grounded',
            'default_locations': ['home', 'office', 'street'],
            'visual_style_additions': ['realistic', 'elegant', 'organic']
        },
        'post-apocalyptic': {
            'lighting_style': 'harsh and desolate',
            'atmosphere': 'bleak and survivalist',
            'default_locations': ['wasteland', 'ruins', 'bunker'],
            'visual_style_additions': ['gritty', 'industrial', 'realistic']
        },
        'noir': {
            'lighting_style': 'high-contrast shadows',
            'atmosphere': 'dark and mysterious',
            'default_locations': ['city street', 'office', 'bar'],
            'visual_style_additions': ['gritty', 'minimalist', 'stylized']
        },
        'steampunk': {
            'lighting_style': 'warm gaslight',
            'atmosphere': 'industrial and Victorian',
            'default_locations': ['factory', 'airship', 'city'],
            'visual_style_additions': ['baroque', 'industrial', 'stylized']
        }
    }
    
    # Color palettes based on mood and genre
    COLOR_PALETTES = {
        # Dark moods
        'dark': {
            'primary': '#1a1a2e',
            'secondary': '#16213e',
            'accent': '#0f3460',
            'background': '#0a0a0f',
            'additional': ['#2d2d44', '#3a3a5c']
        },
        'mysterious': {
            'primary': '#2c003e',
            'secondary': '#1f1f3a',
            'accent': '#6a0572',
            'background': '#0d0d1a',
            'additional': ['#4a0e4e', '#8b008b']
        },
        'noir': {
            'primary': '#1c1c1c',
            'secondary': '#2d2d2d',
            'accent': '#4a4a4a',
            'background': '#0a0a0a',
            'additional': ['#666666', '#808080']
        },
        
        # Bright/energetic moods
        'epic': {
            'primary': '#ff6b35',
            'secondary': '#f7931e',
            'accent': '#fdc830',
            'background': '#1a1a1a',
            'additional': ['#ff8c42', '#ffb347']
        },
        'uplifting': {
            'primary': '#ffd700',
            'secondary': '#ffec8b',
            'accent': '#fff68f',
            'background': '#f5f5dc',
            'additional': ['#fffacd', '#ffffe0']
        },
        
        # Tense/violent moods
        'tense': {
            'primary': '#8b0000',
            'secondary': '#a52a2a',
            'accent': '#dc143c',
            'background': '#1a0000',
            'additional': ['#b22222', '#cd5c5c']
        },
        'violent': {
            'primary': '#8b0000',
            'secondary': '#800000',
            'accent': '#ff0000',
            'background': '#0d0000',
            'additional': ['#b22222', '#dc143c']
        },
        
        # Calm/peaceful moods
        'peaceful': {
            'primary': '#87ceeb',
            'secondary': '#b0e0e6',
            'accent': '#add8e6',
            'background': '#f0f8ff',
            'additional': ['#e0ffff', '#f0ffff']
        },
        'romantic': {
            'primary': '#ff69b4',
            'secondary': '#ffb6c1',
            'accent': '#ffc0cb',
            'background': '#fff0f5',
            'additional': ['#ffe4e1', '#ffd1dc']
        },
        
        # Special moods
        'melancholic': {
            'primary': '#4a5568',
            'secondary': '#718096',
            'accent': '#a0aec0',
            'background': '#2d3748',
            'additional': ['#cbd5e0', '#e2e8f0']
        },
        'eerie': {
            'primary': '#2f4f4f',
            'secondary': '#556b2f',
            'accent': '#6b8e23',
            'background': '#1c1c1c',
            'additional': ['#808000', '#9acd32']
        },
        'chaotic': {
            'primary': '#ff1493',
            'secondary': '#ff4500',
            'accent': '#ffd700',
            'background': '#1a1a1a',
            'additional': ['#ff6347', '#ff8c00']
        },
        
        # Genre-specific defaults
        'cyberpunk': {
            'primary': '#00ffff',
            'secondary': '#ff00ff',
            'accent': '#ffff00',
            'background': '#0a0a1a',
            'additional': ['#00ff00', '#ff0080']
        },
        'fantasy': {
            'primary': '#9370db',
            'secondary': '#8a2be2',
            'accent': '#dda0dd',
            'background': '#2f1b3c',
            'additional': ['#ba55d3', '#da70d6']
        },
        'horror': {
            'primary': '#8b0000',
            'secondary': '#2f4f4f',
            'accent': '#696969',
            'background': '#0a0a0a',
            'additional': ['#4a4a4a', '#1c1c1c']
        }
    }
    
    # Setting-based location templates
    SETTING_LOCATIONS = {
        'city': [
            {'name': 'Downtown District', 'type': 'urban'},
            {'name': 'City Street', 'type': 'street'},
            {'name': 'Rooftop', 'type': 'elevated'}
        ],
        'forest': [
            {'name': 'Deep Woods', 'type': 'wilderness'},
            {'name': 'Forest Clearing', 'type': 'open'},
            {'name': 'Ancient Tree', 'type': 'landmark'}
        ],
        'desert': [
            {'name': 'Sand Dunes', 'type': 'wilderness'},
            {'name': 'Desert Outpost', 'type': 'settlement'},
            {'name': 'Canyon', 'type': 'landmark'}
        ],
        'space': [
            {'name': 'Space Station', 'type': 'structure'},
            {'name': 'Starship Bridge', 'type': 'interior'},
            {'name': 'Alien Planet', 'type': 'exterior'}
        ],
        'underwater': [
            {'name': 'Ocean Depths', 'type': 'wilderness'},
            {'name': 'Underwater City', 'type': 'settlement'},
            {'name': 'Coral Reef', 'type': 'landmark'}
        ],
        'mountain': [
            {'name': 'Mountain Peak', 'type': 'elevated'},
            {'name': 'Mountain Pass', 'type': 'path'},
            {'name': 'Cave', 'type': 'interior'}
        ],
        'castle': [
            {'name': 'Throne Room', 'type': 'interior'},
            {'name': 'Castle Courtyard', 'type': 'exterior'},
            {'name': 'Tower', 'type': 'elevated'}
        ],
        'laboratory': [
            {'name': 'Main Lab', 'type': 'interior'},
            {'name': 'Observation Room', 'type': 'interior'},
            {'name': 'Storage Area', 'type': 'interior'}
        ],
        'street': [
            {'name': 'Main Street', 'type': 'street'},
            {'name': 'Alley', 'type': 'street'},
            {'name': 'Intersection', 'type': 'street'}
        ],
        'home': [
            {'name': 'Living Room', 'type': 'interior'},
            {'name': 'Bedroom', 'type': 'interior'},
            {'name': 'Kitchen', 'type': 'interior'}
        ]
    }
    
    def __init__(self):
        """Initialize WorldConfigGenerator"""
        pass
    
    def generate(self, parsed_prompt: ParsedPrompt) -> WorldConfig:
        """
        Generate WorldConfig from ParsedPrompt.
        
        Args:
            parsed_prompt: Parsed user prompt
            
        Returns:
            WorldConfig with all fields populated
        """
        # Generate unique world ID
        world_id = str(uuid.uuid4())
        
        # Get genre template
        genre_template = self._get_genre_template(parsed_prompt.genre)
        
        # Generate world name
        world_name = self._generate_world_name(parsed_prompt)
        
        # Merge visual styles
        visual_style = self._merge_visual_styles(
            parsed_prompt.visual_style,
            genre_template.get('visual_style_additions', [])
        )
        
        # Select color palette
        color_palette = self._select_color_palette(
            parsed_prompt.mood,
            parsed_prompt.genre
        )
        
        # Get lighting style
        lighting_style = self._get_lighting_style(
            parsed_prompt.genre,
            parsed_prompt.mood,
            genre_template
        )
        
        # Get atmosphere
        atmosphere = self._get_atmosphere(
            parsed_prompt.mood,
            genre_template
        )
        
        # Generate locations
        key_locations = self._generate_locations(
            parsed_prompt.setting,
            parsed_prompt.genre,
            genre_template
        )
        
        return WorldConfig(
            world_id=world_id,
            name=world_name,
            genre=parsed_prompt.genre,
            setting=parsed_prompt.setting,
            time_period=parsed_prompt.time_period,
            visual_style=visual_style,
            color_palette=color_palette,
            lighting_style=lighting_style,
            atmosphere=atmosphere,
            key_locations=key_locations
        )
    
    def _get_genre_template(self, genre: str) -> Dict:
        """Get genre-specific template"""
        return self.GENRE_TEMPLATES.get(genre, self.GENRE_TEMPLATES['drama'])
    
    def _generate_world_name(self, parsed_prompt: ParsedPrompt) -> str:
        """Generate world name from prompt"""
        # Use project title as base
        base_name = parsed_prompt.project_title
        
        # Add genre/setting context if title is generic
        if base_name.lower() in ['untitled project', 'project', 'video']:
            base_name = f"{parsed_prompt.genre.title()} {parsed_prompt.setting.title()}"
        
        return f"World of {base_name}"
    
    def _merge_visual_styles(
        self,
        prompt_styles: List[str],
        template_styles: List[str]
    ) -> List[str]:
        """Merge visual styles from prompt and template"""
        # Combine and deduplicate
        merged = list(set(prompt_styles + template_styles))
        
        # Limit to 5 styles
        return merged[:5]
    
    def _select_color_palette(
        self,
        moods: List[str],
        genre: str
    ) -> ColorPalette:
        """
        Select color palette based on mood and genre.
        
        Priority:
        1. First mood in list
        2. Genre-specific palette
        3. Default neutral palette
        """
        # Try first mood
        if moods and moods[0] in self.COLOR_PALETTES:
            palette_data = self.COLOR_PALETTES[moods[0]]
        # Try genre
        elif genre in self.COLOR_PALETTES:
            palette_data = self.COLOR_PALETTES[genre]
        # Default to dark/mysterious
        else:
            palette_data = self.COLOR_PALETTES['dark']
        
        return ColorPalette(
            primary=palette_data['primary'],
            secondary=palette_data['secondary'],
            accent=palette_data['accent'],
            background=palette_data['background'],
            additional=palette_data.get('additional', [])
        )
    
    def _get_lighting_style(
        self,
        genre: str,
        moods: List[str],
        genre_template: Dict
    ) -> str:
        """Get lighting style based on genre and mood"""
        # Start with genre template
        lighting = genre_template.get('lighting_style', 'naturalistic')
        
        # Adjust based on mood
        if 'dark' in moods or 'mysterious' in moods:
            lighting = f"low-key {lighting}"
        elif 'uplifting' in moods or 'peaceful' in moods:
            lighting = f"bright {lighting}"
        elif 'tense' in moods or 'violent' in moods:
            lighting = f"dramatic {lighting}"
        
        return lighting
    
    def _get_atmosphere(
        self,
        moods: List[str],
        genre_template: Dict
    ) -> str:
        """Get atmosphere description based on mood"""
        # Start with genre template
        base_atmosphere = genre_template.get('atmosphere', 'neutral')
        
        # Add mood descriptors
        mood_descriptors = []
        
        if 'dark' in moods:
            mood_descriptors.append('shadowy')
        if 'mysterious' in moods:
            mood_descriptors.append('enigmatic')
        if 'epic' in moods:
            mood_descriptors.append('grand')
        if 'tense' in moods:
            mood_descriptors.append('suspenseful')
        if 'peaceful' in moods:
            mood_descriptors.append('serene')
        if 'chaotic' in moods:
            mood_descriptors.append('turbulent')
        
        # Combine
        if mood_descriptors:
            return f"{', '.join(mood_descriptors[:2])} and {base_atmosphere}"
        else:
            return base_atmosphere
    
    def _generate_locations(
        self,
        setting: str,
        genre: str,
        genre_template: Dict
    ) -> List[Location]:
        """Generate key locations based on setting and genre"""
        locations = []
        
        # Get setting-based locations
        setting_locs = self.SETTING_LOCATIONS.get(
            setting,
            self.SETTING_LOCATIONS['city']
        )
        
        # Get genre default locations
        genre_locs = genre_template.get('default_locations', [])
        
        # Create Location objects from setting
        for i, loc_data in enumerate(setting_locs):
            location = Location(
                location_id=str(uuid.uuid4()),
                name=loc_data['name'],
                description=f"A {loc_data['type']} location in the {setting}",
                visual_description=self._generate_location_visual_description(
                    loc_data['name'],
                    loc_data['type'],
                    genre
                )
            )
            locations.append(location)
        
        # Add genre-specific locations if not already covered
        for genre_loc_name in genre_locs:
            # Check if similar location already exists
            if not any(genre_loc_name.lower() in loc.name.lower() for loc in locations):
                location = Location(
                    location_id=str(uuid.uuid4()),
                    name=genre_loc_name.title(),
                    description=f"A key {genre} location",
                    visual_description=self._generate_location_visual_description(
                        genre_loc_name,
                        'special',
                        genre
                    )
                )
                locations.append(location)
        
        # Limit to 5 locations
        return locations[:5]
    
    def _generate_location_visual_description(
        self,
        name: str,
        location_type: str,
        genre: str
    ) -> str:
        """Generate visual description for a location"""
        # Get genre template for style hints
        genre_template = self._get_genre_template(genre)
        atmosphere = genre_template.get('atmosphere', 'atmospheric')
        lighting = genre_template.get('lighting_style', 'dramatic')
        
        # Build description
        description_parts = [
            f"{name} with {lighting} lighting",
            f"{atmosphere} atmosphere",
            f"typical of {genre} genre"
        ]
        
        return ", ".join(description_parts)
