"""
Music Description Generator for end-to-end project creation.

Generates music and sound descriptions from story structure, including:
- Genre-specific music templates
- Timeline cue generation
- Sound effect planning
- Mood-based music selection
"""

import uuid
from typing import List, Dict
from src.end_to_end.data_models import (
    ParsedPrompt, StoryStructure,
    MusicDescription, MusicCue, SoundEffect
)


class MusicDescriptionGenerator:
    """Generates music descriptions from story structure"""
    
    def __init__(self):
        """Initialize music description generator"""
        self.genre_music_templates = self._init_genre_music_templates()
        self.mood_tempo_mapping = self._init_mood_tempo_mapping()
        self.genre_instruments = self._init_genre_instruments()
    
    def _init_genre_music_templates(self) -> Dict[str, Dict[str, any]]:
        """Initialize genre-specific music templates"""
        return {
            "cyberpunk": {
                "genre": "electronic synthwave",
                "base_mood": ["dark", "futuristic", "intense"],
                "sound_effects": ["tech sounds", "city ambience", "digital glitches"]
            },
            "fantasy": {
                "genre": "orchestral epic",
                "base_mood": ["heroic", "mystical", "adventurous"],
                "sound_effects": ["sword clashes", "magic sounds", "nature ambience"]
            },
            "horror": {
                "genre": "dark ambient",
                "base_mood": ["ominous", "tense", "unsettling"],
                "sound_effects": ["creaking", "whispers", "sudden stings"]
            },
            "sci-fi": {
                "genre": "electronic cinematic",
                "base_mood": ["futuristic", "mysterious", "expansive"],
                "sound_effects": ["spaceship sounds", "tech beeps", "atmospheric drones"]
            },
            "western": {
                "genre": "americana folk",
                "base_mood": ["rugged", "nostalgic", "tense"],
                "sound_effects": ["horse hooves", "gunshots", "wind"]
            },
            "thriller": {
                "genre": "suspense orchestral",
                "base_mood": ["tense", "mysterious", "dramatic"],
                "sound_effects": ["heartbeat", "footsteps", "door creaks"]
            },
            "romance": {
                "genre": "romantic orchestral",
                "base_mood": ["emotional", "tender", "uplifting"],
                "sound_effects": ["ambient nature", "soft piano", "gentle strings"]
            },
            "comedy": {
                "genre": "upbeat quirky",
                "base_mood": ["playful", "lighthearted", "energetic"],
                "sound_effects": ["comedic stings", "whimsical sounds", "playful percussion"]
            },
            "default": {
                "genre": "cinematic orchestral",
                "base_mood": ["dramatic", "emotional", "dynamic"],
                "sound_effects": ["ambient sounds", "dramatic stings", "atmospheric layers"]
            }
        }
    
    def _init_mood_tempo_mapping(self) -> Dict[str, str]:
        """Initialize mood to tempo mapping"""
        return {
            "dark": "slow to moderate",
            "intense": "fast",
            "tense": "moderate",
            "calm": "slow",
            "energetic": "fast",
            "mysterious": "slow",
            "heroic": "moderate to fast",
            "emotional": "slow to moderate",
            "playful": "moderate to fast",
            "dramatic": "variable",
            "default": "moderate"
        }
    
    def _init_genre_instruments(self) -> Dict[str, List[str]]:
        """Initialize genre-specific instrument lists"""
        return {
            "cyberpunk": ["synthesizers", "electronic drums", "bass synth", "digital effects"],
            "fantasy": ["orchestra", "choir", "epic drums", "brass section", "strings"],
            "horror": ["strings", "piano", "ambient pads", "percussion", "sound design"],
            "sci-fi": ["synthesizers", "electronic orchestra", "ambient pads", "digital effects"],
            "western": ["acoustic guitar", "harmonica", "banjo", "percussion", "strings"],
            "thriller": ["strings", "piano", "percussion", "brass", "electronic elements"],
            "romance": ["piano", "strings", "acoustic guitar", "woodwinds", "soft percussion"],
            "comedy": ["ukulele", "xylophone", "brass", "woodwinds", "quirky percussion"],
            "default": ["orchestra", "strings", "brass", "woodwinds", "percussion"]
        }
    
    def generate_music_description(
        self,
        parsed_prompt: ParsedPrompt,
        story_structure: StoryStructure
    ) -> MusicDescription:
        """
        Generate complete music description from story structure
        
        Args:
            parsed_prompt: Parsed user prompt
            story_structure: Story structure
            
        Returns:
            Complete MusicDescription object
        """
        music_id = str(uuid.uuid4())
        
        # Get genre template
        genre_lower = parsed_prompt.genre.lower()
        template = self.genre_music_templates.get(
            genre_lower,
            self.genre_music_templates["default"]
        )
        
        # Determine music genre
        music_genre = template["genre"]
        
        # Combine moods
        mood = self._combine_moods(parsed_prompt.mood, template["base_mood"])
        
        # Determine tempo
        tempo = self._determine_tempo(mood)
        
        # Select instruments
        instruments = self._select_instruments(genre_lower)
        
        # Generate sound effects
        sound_effects = self._generate_sound_effects(
            template["sound_effects"],
            story_structure,
            parsed_prompt
        )
        
        # Generate timeline cues
        timeline = self._generate_timeline_cues(
            story_structure,
            parsed_prompt
        )
        
        return MusicDescription(
            music_id=music_id,
            genre=music_genre,
            mood=mood,
            tempo=tempo,
            instruments=instruments,
            sound_effects=sound_effects,
            timeline=timeline
        )
    
    def _combine_moods(
        self,
        prompt_moods: List[str],
        template_moods: List[str]
    ) -> List[str]:
        """Combine prompt moods with template moods"""
        combined = []
        
        # Add prompt moods first
        combined.extend(prompt_moods[:2])
        
        # Add template moods
        for mood in template_moods:
            if mood not in combined:
                combined.append(mood)
                if len(combined) >= 3:
                    break
        
        return combined[:3]  # Cap at 3 moods
    
    def _determine_tempo(self, moods: List[str]) -> str:
        """Determine tempo from moods"""
        if not moods:
            return self.mood_tempo_mapping["default"]
        
        # Use first mood for tempo
        primary_mood = moods[0].lower()
        return self.mood_tempo_mapping.get(
            primary_mood,
            self.mood_tempo_mapping["default"]
        )
    
    def _select_instruments(self, genre: str) -> List[str]:
        """Select instruments for genre"""
        return self.genre_instruments.get(
            genre,
            self.genre_instruments["default"]
        )
    
    def _generate_sound_effects(
        self,
        template_effects: List[str],
        story_structure: StoryStructure,
        parsed_prompt: ParsedPrompt
    ) -> List[SoundEffect]:
        """Generate sound effects for story"""
        effects = []
        duration = parsed_prompt.duration_seconds
        
        # Generate effects based on template and story acts
        for i, act in enumerate(story_structure.acts):
            # Calculate timestamp for this act
            act_start = sum(a.duration for a in story_structure.acts[:i])
            
            # Add effect for each act
            effect_name = template_effects[i % len(template_effects)]
            
            effect = SoundEffect(
                effect_id=str(uuid.uuid4()),
                name=effect_name,
                description=f"{effect_name} during {act.name}",
                timestamp=float(act_start)
            )
            effects.append(effect)
        
        return effects
    
    def _generate_timeline_cues(
        self,
        story_structure: StoryStructure,
        parsed_prompt: ParsedPrompt
    ) -> List[MusicCue]:
        """Generate music timeline cues"""
        cues = []
        
        # Generate cue for each act
        for i, act in enumerate(story_structure.acts):
            # Calculate timestamp
            act_start = sum(a.duration for a in story_structure.acts[:i])
            
            # Determine intensity based on act
            intensity = self._calculate_intensity(i, len(story_structure.acts))
            
            # Generate description
            description = self._generate_cue_description(act, i, len(story_structure.acts))
            
            cue = MusicCue(
                cue_id=str(uuid.uuid4()),
                timestamp=float(act_start),
                description=description,
                intensity=intensity
            )
            cues.append(cue)
        
        # Add final cue at end
        final_cue = MusicCue(
            cue_id=str(uuid.uuid4()),
            timestamp=float(parsed_prompt.duration_seconds),
            description="Final resolution and fade out",
            intensity=0.3
        )
        cues.append(final_cue)
        
        return cues
    
    def _calculate_intensity(self, act_index: int, total_acts: int) -> float:
        """Calculate music intensity for act"""
        if act_index == 0:
            return 0.4  # Setup - moderate
        elif act_index == total_acts - 1:
            return 0.9  # Climax - high
        elif act_index == total_acts - 2:
            return 1.0  # Peak intensity
        else:
            return 0.6  # Building tension
    
    def _generate_cue_description(
        self,
        act,
        act_index: int,
        total_acts: int
    ) -> str:
        """Generate description for music cue"""
        if act_index == 0:
            return f"Opening theme, establishing mood for {act.name}"
        elif act_index == total_acts - 1:
            return f"Climactic music for {act.name}, building to resolution"
        elif act_index == total_acts - 2:
            return f"Peak intensity music for {act.name}"
        else:
            return f"Building tension music for {act.name}"
