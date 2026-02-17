"""
Story Structure Generator for end-to-end project creation.

Generates complete story structures from parsed prompts, including:
- Three-act structure
- Emotional arcs
- Themes
- Scene breakdown
"""

import uuid
from typing import List, Dict
from src.end_to_end.data_models import (
    ParsedPrompt, StoryStructure, Act, EmotionalBeat,
    WorldConfig, Character
)


class StoryStructureGenerator:
    """Generates story structures from parsed prompts"""
    
    def __init__(self):
        """Initialize story structure generator"""
        self.video_type_structures = self._init_video_type_structures()
        self.genre_themes = self._init_genre_themes()
        self.emotional_arc_templates = self._init_emotional_arc_templates()
    
    def _init_video_type_structures(self) -> Dict[str, Dict[str, any]]:
        """Initialize video type-specific structure templates"""
        return {
            "trailer": {
                "acts": 3,
                "act_ratios": [0.25, 0.50, 0.25],  # Setup, Build, Climax
                "scene_count": [2, 3, 2]
            },
            "teaser": {
                "acts": 2,
                "act_ratios": [0.40, 0.60],  # Hook, Intrigue
                "scene_count": [1, 2]
            },
            "short_film": {
                "acts": 3,
                "act_ratios": [0.25, 0.50, 0.25],  # Classic three-act
                "scene_count": [3, 5, 3]
            },
            "music_video": {
                "acts": 3,
                "act_ratios": [0.20, 0.60, 0.20],  # Intro, Performance, Outro
                "scene_count": [2, 4, 2]
            },
            "commercial": {
                "acts": 3,
                "act_ratios": [0.30, 0.40, 0.30],  # Problem, Solution, Call-to-action
                "scene_count": [1, 2, 1]
            },
            "default": {
                "acts": 3,
                "act_ratios": [0.25, 0.50, 0.25],
                "scene_count": [2, 3, 2]
            }
        }
    
    def _init_genre_themes(self) -> Dict[str, List[str]]:
        """Initialize genre-specific theme templates"""
        return {
            "cyberpunk": [
                "technology vs humanity",
                "corporate control",
                "identity and consciousness",
                "rebellion and freedom"
            ],
            "fantasy": [
                "good vs evil",
                "heroic journey",
                "magic and wonder",
                "destiny and choice"
            ],
            "horror": [
                "fear of the unknown",
                "survival",
                "loss of control",
                "confronting darkness"
            ],
            "sci-fi": [
                "exploration and discovery",
                "humanity's future",
                "technology and ethics",
                "alien encounters"
            ],
            "western": [
                "justice and law",
                "frontier survival",
                "honor and revenge",
                "civilization vs wilderness"
            ],
            "thriller": [
                "trust and betrayal",
                "pursuit and escape",
                "secrets and lies",
                "moral ambiguity"
            ],
            "romance": [
                "love and connection",
                "overcoming obstacles",
                "self-discovery",
                "sacrifice and commitment"
            ],
            "comedy": [
                "misunderstanding and chaos",
                "social commentary",
                "personal growth through humor",
                "absurdity of life"
            ],
            "default": [
                "conflict and resolution",
                "character transformation",
                "human connection",
                "overcoming challenges"
            ]
        }
    
    def _init_emotional_arc_templates(self) -> Dict[str, List[Dict[str, any]]]:
        """Initialize emotional arc templates"""
        return {
            "trailer": [
                {"emotion": "curiosity", "intensity": 0.3, "position": 0.0},
                {"emotion": "intrigue", "intensity": 0.5, "position": 0.25},
                {"emotion": "tension", "intensity": 0.7, "position": 0.50},
                {"emotion": "excitement", "intensity": 0.9, "position": 0.75},
                {"emotion": "anticipation", "intensity": 1.0, "position": 1.0}
            ],
            "teaser": [
                {"emotion": "mystery", "intensity": 0.4, "position": 0.0},
                {"emotion": "intrigue", "intensity": 0.7, "position": 0.50},
                {"emotion": "suspense", "intensity": 1.0, "position": 1.0}
            ],
            "short_film": [
                {"emotion": "introduction", "intensity": 0.3, "position": 0.0},
                {"emotion": "rising_tension", "intensity": 0.5, "position": 0.25},
                {"emotion": "conflict", "intensity": 0.8, "position": 0.50},
                {"emotion": "climax", "intensity": 1.0, "position": 0.75},
                {"emotion": "resolution", "intensity": 0.4, "position": 1.0}
            ],
            "default": [
                {"emotion": "setup", "intensity": 0.3, "position": 0.0},
                {"emotion": "development", "intensity": 0.6, "position": 0.50},
                {"emotion": "climax", "intensity": 1.0, "position": 0.85},
                {"emotion": "resolution", "intensity": 0.5, "position": 1.0}
            ]
        }
    
    def generate_story_structure(
        self,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig,
        characters: List[Character]
    ) -> StoryStructure:
        """
        Generate complete story structure from parsed prompt
        
        Args:
            parsed_prompt: Parsed user prompt
            world_config: World configuration for context
            characters: List of characters
            
        Returns:
            Complete StoryStructure object
        """
        story_id = str(uuid.uuid4())
        
        # Generate logline
        logline = self._generate_logline(parsed_prompt, characters)
        
        # Generate acts
        acts = self._generate_acts(parsed_prompt, world_config, characters)
        
        # Generate themes
        themes = self._generate_themes(parsed_prompt)
        
        # Generate emotional arc
        emotional_arc = self._generate_emotional_arc(parsed_prompt)
        
        return StoryStructure(
            story_id=story_id,
            title=parsed_prompt.project_title,
            logline=logline,
            acts=acts,
            themes=themes,
            emotional_arc=emotional_arc
        )
    
    def _generate_logline(
        self,
        parsed_prompt: ParsedPrompt,
        characters: List[Character]
    ) -> str:
        """Generate story logline"""
        # Find protagonist
        protagonist_name = "A character"
        if characters:
            protagonist = next(
                (c for c in characters if "protagonist" in c.role.lower() or "hero" in c.role.lower()),
                characters[0]
            )
            protagonist_name = protagonist.name
        
        # Create logline template
        logline = f"{protagonist_name} must navigate {parsed_prompt.setting} "
        logline += f"in a {parsed_prompt.genre} story "
        
        # Add key elements
        if parsed_prompt.key_elements:
            key_element = parsed_prompt.key_elements[0]
            logline += f"involving {key_element}"
        
        # Add mood
        if parsed_prompt.mood:
            mood = parsed_prompt.mood[0]
            logline += f" with a {mood} atmosphere"
        
        return logline + "."
    
    def _generate_acts(
        self,
        parsed_prompt: ParsedPrompt,
        world_config: WorldConfig,
        characters: List[Character]
    ) -> List[Act]:
        """Generate story acts"""
        # Get structure template
        video_type = parsed_prompt.video_type.lower()
        structure = self.video_type_structures.get(
            video_type,
            self.video_type_structures["default"]
        )
        
        num_acts = structure["acts"]
        act_ratios = structure["act_ratios"]
        scene_counts = structure["scene_count"]
        
        acts = []
        duration = parsed_prompt.duration_seconds
        
        for i in range(num_acts):
            act_duration = int(duration * act_ratios[i])
            act_name = self._get_act_name(i, video_type)
            act_description = self._get_act_description(
                i, video_type, parsed_prompt, characters
            )
            
            # Generate scene IDs
            scene_ids = [
                f"scene-{i+1}-{j+1}"
                for j in range(scene_counts[i])
            ]
            
            act = Act(
                act_number=i + 1,
                name=act_name,
                description=act_description,
                duration=act_duration,
                scenes=scene_ids
            )
            acts.append(act)
        
        return acts
    
    def _get_act_name(self, act_index: int, video_type: str) -> str:
        """Get act name based on index and video type"""
        if video_type == "trailer":
            names = ["Setup", "Build", "Climax"]
        elif video_type == "teaser":
            names = ["Hook", "Intrigue"]
        elif video_type == "commercial":
            names = ["Problem", "Solution", "Call-to-Action"]
        elif video_type == "music_video":
            names = ["Intro", "Performance", "Outro"]
        else:
            names = ["Act I: Setup", "Act II: Confrontation", "Act III: Resolution"]
        
        return names[act_index] if act_index < len(names) else f"Act {act_index + 1}"
    
    def _get_act_description(
        self,
        act_index: int,
        video_type: str,
        parsed_prompt: ParsedPrompt,
        characters: List[Character]
    ) -> str:
        """Get act description with more detail and professional storytelling elements."""
        protagonist_name = "the protagonist"
        antagonist_name = "the antagonist"
        
        if characters:
            protagonist = next(
                (c for c in characters if "protagonist" in c.role.lower() or "hero" in c.role.lower()),
                characters[0]
            )
            protagonist_name = protagonist.name
            
            antagonist = next(
                (c for c in characters if "antagonist" in c.role.lower() or "villain" in c.role.lower()),
                None
            )
            if antagonist:
                antagonist_name = antagonist.name

        genre = parsed_prompt.genre.lower()
        setting = parsed_prompt.setting
        
        # Professional 3-act structure descriptions
        if act_index == 0:  # Setup
            return (
                f"Establishing the {genre} world of {setting}. "
                f"We introduce {protagonist_name}, establishing their normal life and a deep-seated need. "
                f"The inciting incident occurs when a mysterious event involving {parsed_prompt.mood[0] if parsed_prompt.mood else 'intrigue'} "
                f"forces {protagonist_name} to consider a path toward {parsed_prompt.key_elements[0] if parsed_prompt.key_elements else 'their destiny'}."
            )
        elif act_index == 1:  # Confrontation / Build
            return (
                f"The journey into {setting} intensifies. {protagonist_name} faces escalating challenges "
                f"and meets secondary characters. The conflict with {antagonist_name} begins to surface. "
                f"Themes of {', '.join(self._generate_themes(parsed_prompt)[:2])} are explored through "
                f"increasingly {parsed_prompt.mood[0] if parsed_prompt.mood else 'dramatic'} sequences."
            )
        elif act_index == 2:  # Climax / Resolution
            return (
                f"The ultimate confrontation in {setting}. {protagonist_name} must confront {antagonist_name} "
                f"in a high-stakes climax. The emotional arc reaches its peak, leading to a resolution "
                f"where the world is changed and {protagonist_name}'s transformation is complete, "
                f"reinforcing the core theme of {self._generate_themes(parsed_prompt)[0]}."
            )
        
        return "Continue the narrative progression."
    
    def _generate_themes(self, parsed_prompt: ParsedPrompt) -> List[str]:
        """Generate story themes"""
        genre_lower = parsed_prompt.genre.lower()
        base_themes = self.genre_themes.get(
            genre_lower,
            self.genre_themes["default"]
        )
        
        # Select 2-3 themes
        num_themes = min(3, len(base_themes))
        selected_themes = base_themes[:num_themes]
        
        # Add custom theme from key elements if available
        if parsed_prompt.key_elements:
            custom_theme = f"exploration of {parsed_prompt.key_elements[0]}"
            if custom_theme not in selected_themes:
                selected_themes.append(custom_theme)
        
        return selected_themes[:3]  # Cap at 3 themes
    
    def _generate_emotional_arc(
        self,
        parsed_prompt: ParsedPrompt
    ) -> List[EmotionalBeat]:
        """Generate emotional arc"""
        video_type = parsed_prompt.video_type.lower()
        arc_template = self.emotional_arc_templates.get(
            video_type,
            self.emotional_arc_templates["default"]
        )
        
        emotional_beats = []
        duration = parsed_prompt.duration_seconds
        
        for i, beat_template in enumerate(arc_template):
            beat = EmotionalBeat(
                beat_id=f"beat-{i+1}",
                emotion=beat_template["emotion"],
                intensity=beat_template["intensity"],
                timestamp=duration * beat_template["position"]
            )
            emotional_beats.append(beat)
        
        return emotional_beats
