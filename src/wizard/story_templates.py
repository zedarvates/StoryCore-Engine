"""
Story Templates for Interactive Project Setup Wizard (V2)

This module provides genre-specific story templates and template selection logic.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional
from enum import Enum
from .story_generator import Story, Act, StoryBeat, ActType


class StoryStructure(Enum):
    """Types of story structures"""
    THREE_ACT = "three_act"
    HERO_JOURNEY = "hero_journey"
    FIVE_ACT = "five_act"


@dataclass
class StoryTemplate:
    """Template for generating stories of a specific genre"""
    genre_key: str
    name: str
    description: str
    structure: StoryStructure
    themes: List[str]
    typical_conflicts: List[str]
    character_archetypes: List[str]
    tone_descriptors: List[str]
    pacing_notes: str
    
    def get_act_templates(self) -> List[Dict[str, Any]]:
        """Get act templates for this genre"""
        return getattr(self, f"_{self.genre_key}_acts", self._default_acts())
    
    def _default_acts(self) -> List[Dict[str, Any]]:
        """Default 3-act structure"""
        return [
            {
                "type": ActType.SETUP,
                "duration_percent": 25.0,
                "description": "Establish world, characters, and conflict",
                "key_beats": ["Opening", "Inciting Incident", "Plot Point 1"]
            },
            {
                "type": ActType.CONFRONTATION,
                "duration_percent": 50.0,
                "description": "Develop conflict and character arcs",
                "key_beats": ["First Obstacle", "Midpoint", "All Is Lost", "Plot Point 2"]
            },
            {
                "type": ActType.RESOLUTION,
                "duration_percent": 25.0,
                "description": "Resolve conflict and show consequences",
                "key_beats": ["Climax", "Falling Action", "Resolution"]
            }
        ]


class StoryTemplateLibrary:
    """Library of story templates for different genres"""
    
    def __init__(self):
        """Initialize the template library"""
        self.templates = self._create_templates()
    
    def get_template(self, genre_key: str) -> Optional[StoryTemplate]:
        """
        Get story template for a specific genre
        
        Args:
            genre_key: The genre key (e.g., "action", "drame")
            
        Returns:
            StoryTemplate for the genre, or None if not found
        """
        return self.templates.get(genre_key)
    
    def get_all_templates(self) -> Dict[str, StoryTemplate]:
        """Get all available templates"""
        return self.templates.copy()
    
    def select_template(self, genre_key: str, story_length: int) -> StoryTemplate:
        """
        Select appropriate template based on genre and length
        
        Args:
            genre_key: The genre key
            story_length: Duration in minutes
            
        Returns:
            Best matching StoryTemplate
        """
        template = self.get_template(genre_key)
        if template is None:
            # Fallback to universal template
            template = self._create_universal_template()
        
        # Could modify template based on length here
        return template
    
    def _create_templates(self) -> Dict[str, StoryTemplate]:
        """Create all genre templates"""
        templates = {}
        
        # Action template
        templates["action"] = self._create_action_template()
        
        # Drama template
        templates["drame"] = self._create_drama_template()
        
        # Science Fiction template
        templates["science_fiction"] = self._create_scifi_template()
        
        # Horror template
        templates["horreur"] = self._create_horror_template()
        
        # Comedy template
        templates["comedie"] = self._create_comedy_template()
        
        return templates
    
    def _create_action_template(self) -> StoryTemplate:
        """Create action genre template"""
        return StoryTemplate(
            genre_key="action",
            name="Action Adventure",
            description="High-energy stories with physical conflict and heroic protagonists",
            structure=StoryStructure.THREE_ACT,
            themes=[
                "Good vs Evil",
                "Justice and Righteousness", 
                "Heroism and Sacrifice",
                "Redemption through Action",
                "Protecting the Innocent"
            ],
            typical_conflicts=[
                "Terrorist threat to innocent lives",
                "Corrupt system that must be exposed",
                "Villain with world-ending plan",
                "Rescue mission against impossible odds",
                "Race against time to prevent disaster"
            ],
            character_archetypes=[
                "Reluctant Hero",
                "Skilled Warrior",
                "Corrupt Authority Figure",
                "Innocent Victim",
                "Loyal Sidekick",
                "Ruthless Villain"
            ],
            tone_descriptors=[
                "High-energy and intense",
                "Fast-paced and exciting",
                "Heroic and inspiring",
                "Dangerous and thrilling"
            ],
            pacing_notes="Fast pacing with frequent action sequences. Build tension through escalating stakes and time pressure."
        )
    
    def _create_drama_template(self) -> StoryTemplate:
        """Create drama genre template"""
        return StoryTemplate(
            genre_key="drame",
            name="Character Drama",
            description="Character-driven stories focusing on emotional conflict and personal growth",
            structure=StoryStructure.THREE_ACT,
            themes=[
                "Love and Loss",
                "Family Bonds and Conflicts",
                "Coming of Age",
                "Forgiveness and Redemption",
                "Identity and Self-Discovery"
            ],
            typical_conflicts=[
                "Family secret threatens relationships",
                "Moral dilemma with no clear answer",
                "Past mistakes come back to haunt",
                "Love triangle creates emotional turmoil",
                "Life-changing decision must be made"
            ],
            character_archetypes=[
                "Flawed Protagonist",
                "Wise Mentor",
                "Estranged Family Member",
                "Lost Love",
                "Innocent Child",
                "Antagonistic Authority"
            ],
            tone_descriptors=[
                "Thoughtful and emotional",
                "Realistic and grounded",
                "Intimate and personal",
                "Contemplative and moving"
            ],
            pacing_notes="Moderate pacing with focus on character development. Build emotional tension through relationships and internal conflict."
        )
    
    def _create_scifi_template(self) -> StoryTemplate:
        """Create science fiction template"""
        return StoryTemplate(
            genre_key="science_fiction",
            name="Science Fiction",
            description="Speculative stories exploring technology, future societies, and scientific concepts",
            structure=StoryStructure.THREE_ACT,
            themes=[
                "Technology vs Humanity",
                "Progress and Its Consequences",
                "Scientific Discovery",
                "Evolution and Adaptation",
                "Future Society and Ethics"
            ],
            typical_conflicts=[
                "AI becomes self-aware and dangerous",
                "Alien contact changes everything",
                "Time travel creates paradoxes",
                "Genetic engineering goes wrong",
                "Corporate control of technology"
            ],
            character_archetypes=[
                "Brilliant Scientist",
                "Reluctant Explorer",
                "AI or Android",
                "Corporate Executive",
                "Alien Being",
                "Tech-Savvy Rebel"
            ],
            tone_descriptors=[
                "Mysterious and speculative",
                "Intellectually engaging",
                "Futuristic and imaginative",
                "Thought-provoking"
            ],
            pacing_notes="Balanced pacing with time for world-building. Build tension through scientific discovery and technological threats."
        )
    
    def _create_horror_template(self) -> StoryTemplate:
        """Create horror genre template"""
        return StoryTemplate(
            genre_key="horreur",
            name="Horror Thriller",
            description="Suspenseful stories designed to frighten and create tension",
            structure=StoryStructure.THREE_ACT,
            themes=[
                "Survival Against Evil",
                "Fear of the Unknown",
                "Corruption and Decay",
                "Isolation and Helplessness",
                "Madness and Reality"
            ],
            typical_conflicts=[
                "Ancient evil awakens from slumber",
                "Supernatural forces invade reality",
                "Isolation breeds paranoia and terror",
                "Reality becomes questionable",
                "Survival instincts override morality"
            ],
            character_archetypes=[
                "Final Girl/Boy",
                "Skeptical Authority",
                "Occult Expert",
                "Innocent Victim",
                "Corrupted Individual",
                "Supernatural Entity"
            ],
            tone_descriptors=[
                "Dark and suspenseful",
                "Tense and frightening",
                "Atmospheric and ominous",
                "Psychologically disturbing"
            ],
            pacing_notes="Slow build with sudden scares. Escalate tension gradually, then release through horror sequences."
        )
    
    def _create_comedy_template(self) -> StoryTemplate:
        """Create comedy genre template"""
        return StoryTemplate(
            genre_key="comedie",
            name="Comedy",
            description="Humorous stories designed to entertain and amuse",
            structure=StoryStructure.THREE_ACT,
            themes=[
                "Mistaken Identity",
                "Love Conquers All",
                "Friendship and Loyalty",
                "Self-Discovery Through Humor",
                "Absurdity of Life"
            ],
            typical_conflicts=[
                "Mistaken identities create chaos",
                "Plans go hilariously wrong",
                "Opposites attract despite differences",
                "Secrets create comedic complications",
                "Misunderstandings multiply exponentially"
            ],
            character_archetypes=[
                "Bumbling Protagonist",
                "Straight Man/Woman",
                "Eccentric Supporting Character",
                "Romantic Interest",
                "Authority Figure",
                "Comic Relief"
            ],
            tone_descriptors=[
                "Light and humorous",
                "Playful and entertaining",
                "Optimistic and fun",
                "Witty and clever"
            ],
            pacing_notes="Quick pacing with frequent comedic beats. Build humor through escalating misunderstandings and physical comedy."
        )
    
    def _create_universal_template(self) -> StoryTemplate:
        """Create universal fallback template"""
        return StoryTemplate(
            genre_key="universal",
            name="Universal Story",
            description="General story structure applicable to any genre",
            structure=StoryStructure.THREE_ACT,
            themes=[
                "Good vs Evil",
                "Love and Relationships",
                "Personal Growth",
                "Truth and Justice",
                "Hope and Perseverance"
            ],
            typical_conflicts=[
                "Protagonist faces major challenge",
                "Conflict threatens what matters most",
                "Difficult choice must be made",
                "Past comes back to haunt",
                "Stakes escalate beyond control"
            ],
            character_archetypes=[
                "Protagonist",
                "Antagonist",
                "Mentor",
                "Ally",
                "Love Interest",
                "Threshold Guardian"
            ],
            tone_descriptors=[
                "Balanced and engaging",
                "Emotionally resonant",
                "Universally appealing",
                "Satisfying and complete"
            ],
            pacing_notes="Moderate pacing with clear story beats. Balance action, character development, and plot progression."
        )


class TemplateSelector:
    """Selects appropriate templates based on project parameters"""
    
    def __init__(self):
        """Initialize the template selector"""
        self.library = StoryTemplateLibrary()
    
    def select_template(self, genre_key: str, duration_minutes: int, 
                       user_preferences: Optional[Dict[str, Any]] = None) -> StoryTemplate:
        """
        Select the best template for the given parameters
        
        Args:
            genre_key: The genre key
            duration_minutes: Story duration in minutes
            user_preferences: Optional user preferences
            
        Returns:
            Selected StoryTemplate
        """
        # Get base template for genre
        template = self.library.select_template(genre_key, duration_minutes)
        
        # Modify template based on duration
        template = self._adjust_for_duration(template, duration_minutes)
        
        # Apply user preferences if provided
        if user_preferences:
            template = self._apply_preferences(template, user_preferences)
        
        return template
    
    def _adjust_for_duration(self, template: StoryTemplate, duration: int) -> StoryTemplate:
        """Adjust template based on story duration"""
        # For short films (< 15 min), simplify structure
        if duration < 15:
            # Reduce number of themes and conflicts
            template.themes = template.themes[:3]
            template.typical_conflicts = template.typical_conflicts[:3]
        
        # For feature films (> 75 min), can handle more complexity
        elif duration > 75:
            # Could add sub-plots, more character arcs, etc.
            pass
        
        return template
    
    def _apply_preferences(self, template: StoryTemplate, preferences: Dict[str, Any]) -> StoryTemplate:
        """Apply user preferences to template"""
        # Could filter themes, conflicts, etc. based on user preferences
        # For now, return template unchanged
        return template


# Convenience functions for direct use
def get_story_template(genre_key: str) -> Optional[StoryTemplate]:
    """
    Get story template for a genre
    
    Args:
        genre_key: The genre key
        
    Returns:
        StoryTemplate or None
    """
    library = StoryTemplateLibrary()
    return library.get_template(genre_key)


def select_story_template(genre_key: str, duration_minutes: int) -> StoryTemplate:
    """
    Select appropriate story template
    
    Args:
        genre_key: The genre key
        duration_minutes: Story duration
        
    Returns:
        Selected StoryTemplate
    """
    selector = TemplateSelector()
    return selector.select_template(genre_key, duration_minutes)