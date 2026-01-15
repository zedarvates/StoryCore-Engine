"""
Story Generation Engine for Interactive Project Setup Wizard (V2)

This module implements automatic story generation with 3-act structure,
theme extraction, and narrative coherence validation.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import random
from .models import WizardState
from .definitions import get_genre_definition


class ActType(Enum):
    """Types of acts in 3-act structure"""
    SETUP = "setup"
    CONFRONTATION = "confrontation"
    RESOLUTION = "resolution"


@dataclass
class StoryBeat:
    """A single story beat within an act"""
    name: str
    description: str
    duration_percent: float  # Percentage of total story duration
    emotional_intensity: int  # 1-10 scale
    conflict_level: int  # 1-10 scale


@dataclass
class Act:
    """A single act in the 3-act structure"""
    act_type: ActType
    title: str
    description: str
    duration_percent: float  # Should be 25%, 50%, or 25%
    beats: List[StoryBeat] = field(default_factory=list)
    
    def get_duration_minutes(self, total_duration: int) -> float:
        """Calculate act duration in minutes"""
        return (self.duration_percent / 100.0) * total_duration


@dataclass
class Story:
    """Complete story with 3-act structure"""
    title: str
    logline: str  # One-sentence summary
    theme: str
    tone: str
    conflict: str
    stakes: str
    resolution: str
    acts: List[Act] = field(default_factory=list)
    summary: str = ""  # 300-500 word summary
    
    def get_total_beats(self) -> int:
        """Get total number of story beats"""
        return sum(len(act.beats) for act in self.acts)
    
    def validate_structure(self) -> Tuple[bool, List[str]]:
        """Validate 3-act structure"""
        errors = []
        
        if len(self.acts) != 3:
            errors.append(f"Story must have exactly 3 acts, found {len(self.acts)}")
        
        if self.acts:
            # Check act duration percentages
            expected_durations = [25.0, 50.0, 25.0]
            for i, (act, expected) in enumerate(zip(self.acts, expected_durations)):
                if abs(act.duration_percent - expected) > 5.0:  # 5% tolerance
                    errors.append(f"Act {i+1} duration {act.duration_percent}% should be ~{expected}%")
        
        return len(errors) == 0, errors


class StoryGenerator:
    """
    Generates stories with 3-act structure based on genre and project parameters
    """
    
    def __init__(self):
        """Initialize the story generator"""
        self.genre_templates = self._load_genre_templates()
        self.story_beats = self._load_story_beats()
        self.themes = self._load_themes()
        self.conflicts = self._load_conflicts()
    
    def generate_story(self, wizard_state: WizardState) -> Story:
        """
        Generate a complete story based on wizard parameters
        
        Args:
            wizard_state: The wizard state with project parameters
            
        Returns:
            Complete Story object with 3-act structure
        """
        # Get genre information
        genre_def = get_genre_definition(wizard_state.genre_key)
        
        # Generate story elements
        theme = self._select_theme(wizard_state.genre_key)
        tone = self._determine_tone(genre_def)
        conflict = self._select_conflict(wizard_state.genre_key)
        
        # Generate title and logline
        title = self._generate_title(wizard_state.genre_key, theme)
        logline = self._generate_logline(wizard_state.genre_key, conflict)
        
        # Generate stakes and resolution
        stakes = self._generate_stakes(conflict, wizard_state.duration_minutes)
        resolution = self._generate_resolution(conflict, theme)
        
        # Create 3 acts
        acts = self._generate_acts(wizard_state, theme, conflict)
        
        # Generate summary
        summary = self._generate_summary(title, logline, theme, acts)
        
        # Create complete story
        story = Story(
            title=title,
            logline=logline,
            theme=theme,
            tone=tone,
            conflict=conflict,
            stakes=stakes,
            resolution=resolution,
            acts=acts,
            summary=summary
        )
        
        return story
    
    def _generate_acts(self, wizard_state: WizardState, theme: str, conflict: str) -> List[Act]:
        """Generate the 3 acts with proper structure"""
        acts = []
        
        # Act 1: Setup (25%)
        setup_act = self._generate_setup_act(wizard_state, theme)
        acts.append(setup_act)
        
        # Act 2: Confrontation (50%)
        confrontation_act = self._generate_confrontation_act(wizard_state, conflict)
        acts.append(confrontation_act)
        
        # Act 3: Resolution (25%)
        resolution_act = self._generate_resolution_act(wizard_state, theme)
        acts.append(resolution_act)
        
        return acts
    
    def _generate_setup_act(self, wizard_state: WizardState, theme: str) -> Act:
        """Generate Act 1: Setup (25% duration)"""
        genre_key = wizard_state.genre_key
        
        # Get genre-specific setup beats
        setup_beats = self._get_setup_beats(genre_key)
        
        act = Act(
            act_type=ActType.SETUP,
            title="Setup",
            description=f"Introduce the world, characters, and establish the {theme} theme",
            duration_percent=25.0,
            beats=setup_beats
        )
        
        return act
    
    def _generate_confrontation_act(self, wizard_state: WizardState, conflict: str) -> Act:
        """Generate Act 2: Confrontation (50% duration)"""
        genre_key = wizard_state.genre_key
        
        # Get genre-specific confrontation beats
        confrontation_beats = self._get_confrontation_beats(genre_key, conflict)
        
        act = Act(
            act_type=ActType.CONFRONTATION,
            title="Confrontation",
            description=f"Escalate the {conflict} and develop character arcs",
            duration_percent=50.0,
            beats=confrontation_beats
        )
        
        return act
    
    def _generate_resolution_act(self, wizard_state: WizardState, theme: str) -> Act:
        """Generate Act 3: Resolution (25% duration)"""
        genre_key = wizard_state.genre_key
        
        # Get genre-specific resolution beats
        resolution_beats = self._get_resolution_beats(genre_key, theme)
        
        act = Act(
            act_type=ActType.RESOLUTION,
            title="Resolution",
            description=f"Resolve the conflict and reinforce the {theme} theme",
            duration_percent=25.0,
            beats=resolution_beats
        )
        
        return act
    
    def _get_setup_beats(self, genre_key: str) -> List[StoryBeat]:
        """Get setup beats for specific genre"""
        base_beats = [
            StoryBeat("Opening Image", "Establish tone and world", 3.0, 3, 1),
            StoryBeat("Inciting Incident", "Event that starts the story", 8.0, 6, 4),
            StoryBeat("Plot Point 1", "Protagonist commits to the journey", 14.0, 7, 5)
        ]
        
        # Add genre-specific beats
        genre_beats = {
            "action": [
                StoryBeat("Action Sequence", "High-energy opening", 5.0, 8, 6)
            ],
            "drame": [
                StoryBeat("Character Moment", "Emotional character introduction", 5.0, 5, 2)
            ],
            "science_fiction": [
                StoryBeat("World Building", "Establish sci-fi elements", 7.0, 4, 2)
            ],
            "horreur": [
                StoryBeat("Ominous Foreshadowing", "Hint at coming horror", 6.0, 6, 3)
            ],
            "comedie": [
                StoryBeat("Comedy Setup", "Establish comedic tone", 4.0, 7, 1)
            ]
        }
        
        if genre_key in genre_beats:
            base_beats.extend(genre_beats[genre_key])
        
        return base_beats
    
    def _get_confrontation_beats(self, genre_key: str, conflict: str) -> List[StoryBeat]:
        """Get confrontation beats for specific genre"""
        base_beats = [
            StoryBeat("First Obstacle", "Initial challenge", 8.0, 6, 6),
            StoryBeat("Midpoint", "Major revelation or setback", 15.0, 8, 8),
            StoryBeat("All Is Lost", "Lowest point for protagonist", 12.0, 9, 9),
            StoryBeat("Plot Point 2", "Final push toward climax", 15.0, 8, 7)
        ]
        
        # Add genre-specific beats
        genre_beats = {
            "action": [
                StoryBeat("Chase Sequence", "High-stakes pursuit", 10.0, 9, 8)
            ],
            "drame": [
                StoryBeat("Emotional Crisis", "Character's internal struggle", 12.0, 9, 6)
            ],
            "science_fiction": [
                StoryBeat("Tech Revelation", "Scientific discovery or twist", 8.0, 7, 5)
            ],
            "horreur": [
                StoryBeat("Horror Escalation", "Terror intensifies", 10.0, 10, 9)
            ],
            "comedie": [
                StoryBeat("Comedy Complications", "Humorous misunderstandings", 8.0, 8, 4)
            ]
        }
        
        if genre_key in genre_beats:
            base_beats.extend(genre_beats[genre_key])
        
        return base_beats
    
    def _get_resolution_beats(self, genre_key: str, theme: str) -> List[StoryBeat]:
        """Get resolution beats for specific genre"""
        base_beats = [
            StoryBeat("Climax", "Final confrontation", 12.0, 10, 10),
            StoryBeat("Falling Action", "Immediate aftermath", 8.0, 6, 3),
            StoryBeat("Resolution", "New equilibrium", 5.0, 4, 1)
        ]
        
        # Add genre-specific beats
        genre_beats = {
            "action": [
                StoryBeat("Final Battle", "Ultimate action sequence", 10.0, 10, 10)
            ],
            "drame": [
                StoryBeat("Emotional Resolution", "Character growth moment", 8.0, 8, 2)
            ],
            "science_fiction": [
                StoryBeat("Future Implications", "Show consequences of events", 6.0, 5, 2)
            ],
            "horreur": [
                StoryBeat("Final Scare", "Last moment of terror", 7.0, 9, 8)
            ],
            "comedie": [
                StoryBeat("Comedy Resolution", "Humorous conclusion", 6.0, 8, 1)
            ]
        }
        
        if genre_key in genre_beats:
            base_beats.extend(genre_beats[genre_key])
        
        return base_beats
    
    def _select_theme(self, genre_key: str) -> str:
        """Select appropriate theme for genre"""
        themes = self.themes.get(genre_key, self.themes["universal"])
        return random.choice(themes)
    
    def _determine_tone(self, genre_def) -> str:
        """Determine tone from genre definition"""
        mood = genre_def.style_defaults.get("mood", "neutral")
        
        tone_mapping = {
            "energetic_intense": "High-energy and intense",
            "contemplative_emotional": "Thoughtful and emotional",
            "futuristic_mysterious": "Mysterious and speculative",
            "tense_frightening": "Dark and suspenseful",
            "lighthearted_fun": "Light and humorous"
        }
        
        return tone_mapping.get(mood, "Balanced and engaging")
    
    def _select_conflict(self, genre_key: str) -> str:
        """Select appropriate conflict for genre"""
        conflicts = self.conflicts.get(genre_key, self.conflicts["universal"])
        return random.choice(conflicts)
    
    def _generate_title(self, genre_key: str, theme: str) -> str:
        """Generate story title"""
        # Simple title generation - can be enhanced
        genre_words = {
            "action": ["Strike", "Force", "Impact", "Rush", "Blitz"],
            "drame": ["Heart", "Soul", "Journey", "Path", "Truth"],
            "science_fiction": ["Future", "Nova", "Quantum", "Nexus", "Void"],
            "horreur": ["Shadow", "Darkness", "Fear", "Terror", "Nightmare"],
            "comedie": ["Chaos", "Mix-up", "Adventure", "Surprise", "Twist"]
        }
        
        words = genre_words.get(genre_key, ["Story", "Tale", "Chronicle"])
        base_word = random.choice(words)
        
        # Add theme-related word
        theme_words = theme.split()
        if theme_words:
            theme_word = theme_words[0]
            return f"{base_word} of {theme_word}"
        
        return f"The {base_word}"
    
    def _generate_logline(self, genre_key: str, conflict: str) -> str:
        """Generate one-sentence story summary"""
        # Template-based logline generation
        templates = {
            "action": "When {conflict}, a determined protagonist must overcome impossible odds to save what matters most.",
            "drame": "A character facing {conflict} must confront their deepest fears to find redemption.",
            "science_fiction": "In a world where {conflict}, humanity's future depends on one person's choice.",
            "horreur": "When {conflict} unleashes ancient evil, survival becomes the only goal.",
            "comedie": "A series of misunderstandings involving {conflict} leads to hilarious complications."
        }
        
        template = templates.get(genre_key, "A story about {conflict} and its consequences.")
        return template.format(conflict=conflict.lower())
    
    def _generate_stakes(self, conflict: str, duration: int) -> str:
        """Generate what's at stake"""
        # Stakes scale with duration
        if duration <= 15:  # Short film
            return f"Personal consequences of {conflict}"
        elif duration <= 45:  # Medium film
            return f"Community impact of {conflict}"
        else:  # Feature film
            return f"World-changing implications of {conflict}"
    
    def _generate_resolution(self, conflict: str, theme: str) -> str:
        """Generate how the conflict resolves"""
        return f"The {conflict} is resolved through {theme}, leading to character growth and new understanding."
    
    def _generate_summary(self, title: str, logline: str, theme: str, acts: List[Act]) -> str:
        """Generate 300-500 word story summary"""
        summary_parts = [
            f'"{title}" is a story that explores the theme of {theme}.',
            "",
            f"LOGLINE: {logline}",
            "",
            "STORY STRUCTURE:",
            ""
        ]
        
        for i, act in enumerate(acts, 1):
            summary_parts.append(f"ACT {i} - {act.title.upper()} ({act.duration_percent}%)")
            summary_parts.append(act.description)
            
            # Add key beats
            key_beats = [beat for beat in act.beats if beat.emotional_intensity >= 7]
            if key_beats:
                summary_parts.append("Key moments:")
                for beat in key_beats[:2]:  # Limit to 2 key beats per act
                    summary_parts.append(f"• {beat.name}: {beat.description}")
            
            summary_parts.append("")
        
        summary_parts.append(f"The story reinforces the {theme} theme through character development and plot resolution, ")
        summary_parts.append("creating a satisfying narrative arc that resonates with audiences.")
        
        return "\n".join(summary_parts)
    
    def _load_genre_templates(self) -> Dict[str, Any]:
        """Load genre-specific story templates"""
        # Placeholder - would load from external files in full implementation
        return {}
    
    def _load_story_beats(self) -> Dict[str, List[str]]:
        """Load story beat definitions"""
        # Placeholder - would load from external files in full implementation
        return {}
    
    def _load_themes(self) -> Dict[str, List[str]]:
        """Load theme definitions by genre"""
        return {
            "action": [
                "Good vs Evil", "Justice", "Heroism", "Sacrifice", "Redemption"
            ],
            "drame": [
                "Love and Loss", "Family", "Coming of Age", "Forgiveness", "Identity"
            ],
            "science_fiction": [
                "Technology vs Humanity", "Progress", "Discovery", "Evolution", "Future Society"
            ],
            "horreur": [
                "Survival", "Fear of Unknown", "Corruption", "Isolation", "Madness"
            ],
            "comedie": [
                "Mistaken Identity", "Love Conquers All", "Friendship", "Self-Discovery", "Absurdity"
            ],
            "universal": [
                "Good vs Evil", "Love", "Growth", "Truth", "Hope"
            ]
        }
    
    def _load_conflicts(self) -> Dict[str, List[str]]:
        """Load conflict definitions by genre"""
        return {
            "action": [
                "a terrorist threat emerges", "corruption must be exposed", "innocent lives are endangered",
                "a conspiracy unfolds", "justice must be served"
            ],
            "drame": [
                "a family secret is revealed", "a relationship faces crisis", "a moral dilemma arises",
                "past mistakes resurface", "difficult choices must be made"
            ],
            "science_fiction": [
                "alien contact occurs", "technology becomes dangerous", "time travel creates paradoxes",
                "artificial intelligence evolves", "humanity faces extinction"
            ],
            "horreur": [
                "ancient evil awakens", "supernatural forces emerge", "isolation breeds terror",
                "reality becomes questionable", "survival instincts activate"
            ],
            "comedie": [
                "mistaken identities occur", "plans go hilariously wrong", "opposites attract",
                "secrets create chaos", "misunderstandings multiply"
            ],
            "universal": [
                "conflict arises", "challenges emerge", "obstacles appear", "problems develop", "tensions escalate"
            ]
        }


# Convenience function for direct use
def generate_story(wizard_state: WizardState) -> Story:
    """
    Convenience function to generate a story
    
    Args:
        wizard_state: The wizard state with project parameters
        
    Returns:
        Complete Story object
    """
    generator = StoryGenerator()
    return generator.generate_story(wizard_state)