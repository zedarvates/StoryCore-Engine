"""
Character Generator for end-to-end project creation.

Generates complete character sheets from parsed prompts, including:
- Character descriptions
- Visual descriptions
- Personality traits
- Relationship mapping
"""

import uuid
from typing import List, Dict
from src.end_to_end.data_models import ParsedPrompt, Character, WorldConfig, CharacterInfo


class CharacterGenerator:
    """Generates character sheets from parsed prompts"""
    
    def __init__(self):
        """Initialize character generator"""
        self.genre_personality_templates = self._init_personality_templates()
        self.role_templates = self._init_role_templates()
    
    def _init_personality_templates(self) -> Dict[str, List[str]]:
        """Initialize genre-specific personality trait templates"""
        return {
            "cyberpunk": [
                "tech-savvy", "rebellious", "street-smart", "cynical", 
                "resourceful", "independent", "anti-authority"
            ],
            "fantasy": [
                "brave", "honorable", "mystical", "wise", "loyal", 
                "adventurous", "noble"
            ],
            "horror": [
                "paranoid", "traumatized", "skeptical", "protective", 
                "desperate", "haunted", "resilient"
            ],
            "sci-fi": [
                "analytical", "curious", "logical", "innovative", 
                "adaptable", "visionary", "pragmatic"
            ],
            "western": [
                "tough", "independent", "honorable", "stoic", "loyal", 
                "rugged", "principled"
            ],
            "thriller": [
                "suspicious", "calculating", "determined", "secretive", 
                "intense", "focused", "strategic"
            ],
            "romance": [
                "passionate", "vulnerable", "hopeful", "empathetic", 
                "romantic", "sensitive", "caring"
            ],
            "comedy": [
                "witty", "optimistic", "quirky", "spontaneous", 
                "charming", "playful", "lighthearted"
            ],
            "default": [
                "determined", "complex", "relatable", "dynamic", 
                "authentic", "compelling"
            ]
        }
    
    def _init_role_templates(self) -> Dict[str, Dict[str, str]]:
        """Initialize role-based character templates"""
        return {
            "protagonist": {
                "description_template": "The main character who drives the story forward",
                "visual_template": "Distinctive appearance that reflects their journey"
            },
            "antagonist": {
                "description_template": "The opposing force that creates conflict",
                "visual_template": "Imposing presence that contrasts with the protagonist"
            },
            "mentor": {
                "description_template": "The wise guide who provides knowledge and support",
                "visual_template": "Experienced appearance with signs of wisdom"
            },
            "sidekick": {
                "description_template": "The loyal companion who supports the protagonist",
                "visual_template": "Complementary appearance to the protagonist"
            },
            "love_interest": {
                "description_template": "The romantic connection that adds emotional depth",
                "visual_template": "Attractive appearance that captures attention"
            },
            "comic_relief": {
                "description_template": "The character who provides levity and humor",
                "visual_template": "Distinctive quirky appearance"
            },
            "default": {
                "description_template": "A character with a specific role in the story",
                "visual_template": "Appearance that reflects their personality and role"
            }
        }
    
    def generate_characters(
        self,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig
    ) -> List[Character]:
        """
        Generate complete character sheets from parsed prompt
        
        Args:
            parsed_prompt: Parsed user prompt
            world_config: World configuration for context
            
        Returns:
            List of complete Character objects
        """
        characters = []
        
        # Generate characters from prompt
        for char_info in parsed_prompt.characters:
            character = self._generate_character(
                char_info,
                parsed_prompt,
                world_config
            )
            characters.append(character)
        
        # Add relationship mapping
        characters = self._map_relationships(characters)
        
        return characters
    
    def _generate_character(
        self,
        char_info: CharacterInfo,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig
    ) -> Character:
        """Generate a single character"""
        character_id = str(uuid.uuid4())
        
        # Generate personality traits based on genre and role
        personality_traits = self._generate_personality_traits(
            parsed_prompt.genre,
            char_info.role
        )
        
        # Generate visual description
        visual_description = self._generate_visual_description(
            char_info,
            parsed_prompt,
            world_config
        )
        
        return Character(
            character_id=character_id,
            name=char_info.name,
            role=char_info.role,
            description=char_info.description,
            visual_description=visual_description,
            personality_traits=personality_traits,
            relationships={}  # Will be filled by _map_relationships
        )
    
    def _generate_personality_traits(
        self,
        genre: str,
        role: str
    ) -> List[str]:
        """Generate personality traits based on genre and role"""
        # Get genre-specific traits
        genre_lower = genre.lower()
        base_traits = self.genre_personality_templates.get(
            genre_lower,
            self.genre_personality_templates["default"]
        )
        
        # Select 3-5 traits
        num_traits = min(5, len(base_traits))
        selected_traits = base_traits[:num_traits]
        
        # Add role-specific trait if applicable
        role_lower = role.lower()
        if "protagonist" in role_lower or "hero" in role_lower:
            if "determined" not in selected_traits:
                selected_traits.append("determined")
        elif "antagonist" in role_lower or "villain" in role_lower:
            if "ambitious" not in selected_traits:
                selected_traits.append("ambitious")
        elif "mentor" in role_lower:
            if "wise" not in selected_traits:
                selected_traits.append("wise")
        
        return selected_traits[:5]  # Cap at 5 traits
    
    def _generate_visual_description(
        self,
        char_info: CharacterInfo,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig
    ) -> str:
        """Generate visual description for character"""
        # Base description from character info
        base_desc = char_info.description
        
        # Add genre-specific visual elements
        genre_elements = self._get_genre_visual_elements(parsed_prompt.genre)
        
        # Add world-specific elements
        world_elements = self._get_world_visual_elements(world_config)
        
        # Combine into visual description
        visual_desc = f"{base_desc}. "
        visual_desc += f"Appearance reflects {parsed_prompt.genre} aesthetic with {genre_elements}. "
        visual_desc += f"Style consistent with {world_config.setting} setting, featuring {world_elements}."
        
        return visual_desc
    
    def _get_genre_visual_elements(self, genre: str) -> str:
        """Get genre-specific visual elements"""
        genre_visuals = {
            "cyberpunk": "neon accents, tech implants, urban streetwear",
            "fantasy": "medieval clothing, mystical accessories, natural materials",
            "horror": "dark clothing, weathered appearance, haunted expression",
            "sci-fi": "futuristic attire, sleek design, advanced materials",
            "western": "rugged clothing, leather accessories, weathered look",
            "thriller": "modern professional attire, sharp features, intense gaze",
            "romance": "elegant clothing, soft features, expressive eyes",
            "comedy": "colorful clothing, expressive features, animated presence"
        }
        return genre_visuals.get(genre.lower(), "distinctive styling and unique features")
    
    def _get_world_visual_elements(self, world_config: WorldConfig) -> str:
        """Get world-specific visual elements"""
        # Use color palette
        palette = world_config.color_palette
        color_desc = f"{palette.primary} and {palette.secondary} tones"
        
        # Use lighting style
        lighting_desc = world_config.lighting_style
        
        return f"{color_desc} with {lighting_desc} lighting"
    
    def _map_relationships(self, characters: List[Character]) -> List[Character]:
        """Map relationships between characters"""
        if len(characters) < 2:
            return characters
        
        # Create relationship map
        for i, char in enumerate(characters):
            relationships = {}
            
            for j, other_char in enumerate(characters):
                if i == j:
                    continue
                
                # Determine relationship based on roles
                relationship = self._determine_relationship(
                    char.role,
                    other_char.role
                )
                
                relationships[other_char.character_id] = relationship
            
            char.relationships = relationships
        
        return characters
    
    def _determine_relationship(self, role1: str, role2: str) -> str:
        """Determine relationship between two character roles"""
        role1_lower = role1.lower()
        role2_lower = role2.lower()
        
        # Protagonist relationships
        if "protagonist" in role1_lower or "hero" in role1_lower:
            if "antagonist" in role2_lower or "villain" in role2_lower:
                return "adversary"
            elif "mentor" in role2_lower:
                return "student"
            elif "sidekick" in role2_lower or "companion" in role2_lower:
                return "ally"
            elif "love" in role2_lower:
                return "romantic interest"
            else:
                return "acquaintance"
        
        # Antagonist relationships
        elif "antagonist" in role1_lower or "villain" in role1_lower:
            if "protagonist" in role2_lower or "hero" in role2_lower:
                return "nemesis"
            else:
                return "rival"
        
        # Mentor relationships
        elif "mentor" in role1_lower:
            if "protagonist" in role2_lower or "hero" in role2_lower:
                return "protégé"
            else:
                return "colleague"
        
        # Default relationship
        return "associate"
