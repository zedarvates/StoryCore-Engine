"""
Dialogue Script Generator for end-to-end project creation.

Generates complete dialogue scripts from story structures, including:
- Scene-based dialogue organization
- Character voice consistency
- Emotion and delivery notes
- Timing information
"""

import uuid
from typing import List, Dict
from src.end_to_end.data_models import (
    ParsedPrompt, StoryStructure, Character,
    DialogueScript, DialogueScene, DialogueLine
)


class DialogueScriptGenerator:
    """Generates dialogue scripts from story structures"""
    
    def __init__(self):
        """Initialize dialogue script generator"""
        self.emotion_templates = self._init_emotion_templates()
        self.delivery_templates = self._init_delivery_templates()
    
    def _init_emotion_templates(self) -> Dict[str, List[str]]:
        """Initialize emotion templates for different contexts"""
        return {
            "setup": ["curious", "uncertain", "hopeful", "calm", "neutral"],
            "conflict": ["tense", "angry", "fearful", "determined", "desperate"],
            "climax": ["intense", "passionate", "urgent", "powerful", "dramatic"],
            "resolution": ["relieved", "satisfied", "reflective", "peaceful", "content"]
        }
    
    def _init_delivery_templates(self) -> Dict[str, List[str]]:
        """Initialize delivery note templates"""
        return {
            "protagonist": [
                "with conviction",
                "determined tone",
                "steady voice",
                "confident delivery"
            ],
            "antagonist": [
                "menacing tone",
                "cold delivery",
                "threatening voice",
                "calculated speech"
            ],
            "mentor": [
                "wise tone",
                "gentle voice",
                "measured delivery",
                "thoughtful speech"
            ],
            "sidekick": [
                "supportive tone",
                "friendly voice",
                "enthusiastic delivery",
                "loyal speech"
            ],
            "default": [
                "natural delivery",
                "clear voice",
                "appropriate tone",
                "expressive speech"
            ]
        }
    
    def generate_dialogue_script(
        self,
        parsed_prompt: ParsedPrompt,
        story_structure: StoryStructure,
        characters: List[Character]
    ) -> DialogueScript:
        """
        Generate complete dialogue script from story structure
        
        Args:
            parsed_prompt: Parsed user prompt
            story_structure: Story structure
            characters: List of characters
            
        Returns:
            Complete DialogueScript object
        """
        script_id = str(uuid.uuid4())
        
        # Determine if dialogue is needed
        if not self._needs_dialogue(parsed_prompt):
            # Return minimal script for non-dialogue videos
            return DialogueScript(
                script_id=script_id,
                scenes=[],
                total_lines=0,
                estimated_duration=0
            )
        
        # Generate dialogue scenes from story acts
        scenes = self._generate_scenes(
            story_structure,
            characters,
            parsed_prompt
        )
        
        # Calculate totals
        total_lines = sum(len(scene.dialogue_lines) for scene in scenes)
        estimated_duration = self._estimate_duration(scenes)
        
        return DialogueScript(
            script_id=script_id,
            scenes=scenes,
            total_lines=total_lines,
            estimated_duration=estimated_duration
        )
    
    def _needs_dialogue(self, parsed_prompt: ParsedPrompt) -> bool:
        """Determine if video type needs dialogue"""
        dialogue_types = [
            "short_film", "trailer", "teaser", "drama", "comedy"
        ]
        
        video_type = parsed_prompt.video_type.lower()
        genre = parsed_prompt.genre.lower()
        
        # Check if video type or genre typically has dialogue
        return (
            any(dt in video_type for dt in dialogue_types) or
            any(dt in genre for dt in dialogue_types) or
            len(parsed_prompt.characters) > 0
        )
    
    def _generate_scenes(
        self,
        story_structure: StoryStructure,
        characters: List[Character],
        parsed_prompt: ParsedPrompt
    ) -> List[DialogueScene]:
        """Generate dialogue scenes from story structure"""
        scenes = []
        
        # Generate scenes for each act
        for act in story_structure.acts:
            for scene_id in act.scenes:
                scene = self._generate_scene(
                    scene_id,
                    act,
                    characters,
                    parsed_prompt,
                    story_structure
                )
                scenes.append(scene)
        
        return scenes
    
    def _generate_scene(
        self,
        scene_id: str,
        act,
        characters: List[Character],
        parsed_prompt: ParsedPrompt,
        story_structure: StoryStructure
    ) -> DialogueScene:
        """Generate a single dialogue scene"""
        # Determine scene context
        scene_context = self._get_scene_context(act.act_number, len(story_structure.acts))
        
        # Select characters for this scene
        scene_characters = self._select_scene_characters(
            characters,
            act.act_number,
            len(story_structure.acts)
        )
        
        # Generate dialogue lines
        dialogue_lines = self._generate_dialogue_lines(
            scene_characters,
            scene_context,
            parsed_prompt
        )
        
        # Generate action notes
        action_notes = self._generate_action_notes(
            scene_context,
            parsed_prompt,
            scene_characters
        )
        
        # Determine location and time
        location = self._determine_location(parsed_prompt, act.act_number)
        time = self._determine_time(act.act_number, len(story_structure.acts))
        
        return DialogueScene(
            scene_id=scene_id,
            scene_name=f"{act.name} - Scene {scene_id.split('-')[-1]}",
            location=location,
            time=time,
            characters_present=[char.character_id for char in scene_characters],
            dialogue_lines=dialogue_lines,
            action_notes=action_notes
        )
    
    def _get_scene_context(self, act_number: int, total_acts: int) -> str:
        """Get scene context based on act position"""
        if act_number == 1:
            return "setup"
        elif act_number == total_acts:
            return "resolution"
        elif act_number == total_acts - 1:
            return "climax"
        else:
            return "conflict"
    
    def _select_scene_characters(
        self,
        characters: List[Character],
        act_number: int,
        total_acts: int
    ) -> List[Character]:
        """Select characters for a scene"""
        if not characters:
            return []
        
        # First act: introduce protagonist
        if act_number == 1:
            protagonist = next(
                (c for c in characters if "protagonist" in c.role.lower()),
                characters[0]
            )
            return [protagonist]
        
        # Middle acts: protagonist + others
        elif act_number < total_acts:
            # Include protagonist and antagonist if available
            selected = []
            for char in characters:
                role_lower = char.role.lower()
                if "protagonist" in role_lower or "antagonist" in role_lower:
                    selected.append(char)
                    if len(selected) >= 2:
                        break
            
            return selected if selected else characters[:2]
        
        # Final act: all main characters
        else:
            return characters[:3]  # Limit to 3 for manageability
    
    def _generate_dialogue_lines(
        self,
        characters: List[Character],
        scene_context: str,
        parsed_prompt: ParsedPrompt
    ) -> List[DialogueLine]:
        """Generate dialogue lines for a scene"""
        if not characters:
            return []
        
        lines = []
        num_lines = self._get_num_lines(scene_context)
        
        for i in range(num_lines):
            # Alternate between characters
            char = characters[i % len(characters)]
            
            # Generate line
            line = self._generate_line(
                char,
                scene_context,
                i,
                parsed_prompt
            )
            lines.append(line)
        
        return lines
    
    def _get_num_lines(self, scene_context: str) -> int:
        """Get number of dialogue lines for scene context"""
        line_counts = {
            "setup": 2,
            "conflict": 3,
            "climax": 4,
            "resolution": 2
        }
        return line_counts.get(scene_context, 2)
    
    def _generate_line(
        self,
        character: Character,
        scene_context: str,
        line_index: int,
        parsed_prompt: ParsedPrompt
    ) -> DialogueLine:
        """Generate a single dialogue line with character personality"""
        line_id = str(uuid.uuid4())
        
        # Select emotion based on context
        emotions = self.emotion_templates.get(scene_context, ["neutral"])
        emotion = emotions[line_index % len(emotions)]
        
        # Select delivery note based on character role
        role_key = self._get_role_key(character.role)
        deliveries = self.delivery_templates.get(role_key, self.delivery_templates["default"])
        delivery = deliveries[line_index % len(deliveries)]
        
        # Add character gesture (Requirement Enhancement)
        if hasattr(character, 'gestures') and character.gestures:
            gesture = character.gestures[line_index % len(character.gestures)]
            delivery = f"{delivery}. Character {gesture}"
            
        # Add voice inflection (Requirement Enhancement)
        if hasattr(character, 'voice_inflection') and character.voice_inflection:
            delivery = f"{delivery}, {character.voice_inflection.lower()}"
            
        # Add diction quirk to delivery notes for consistency (Requirement Enhancement)
        if hasattr(character, 'diction_quirks') and character.diction_quirks:
            delivery = f"{delivery} ({character.diction_quirks})"
        
        # Generate text based on context
        text = self._generate_line_text(
            character,
            scene_context,
            line_index,
            parsed_prompt
        )
        
        return DialogueLine(
            line_id=line_id,
            character_id=character.character_id,
            character_name=character.name,
            text=text,
            emotion=emotion,
            delivery_notes=delivery,
            timestamp=None  # Will be set during sequence planning
        )
    
    def _get_role_key(self, role: str) -> str:
        """Get role key for templates"""
        role_lower = role.lower()
        if "protagonist" in role_lower or "hero" in role_lower:
            return "protagonist"
        elif "antagonist" in role_lower or "villain" in role_lower:
            return "antagonist"
        elif "mentor" in role_lower:
            return "mentor"
        elif "sidekick" in role_lower or "companion" in role_lower:
            return "sidekick"
        else:
            return "default"
    
    def _generate_line_text(
        self,
        character: Character,
        scene_context: str,
        line_index: int,
        parsed_prompt: ParsedPrompt
    ) -> str:
        """Generate dialogue line text with onomatopoeia"""
        # Create context-appropriate dialogue
        templates = {
            "setup": [
                f"Something's not right about {parsed_prompt.setting}.",
                f"We need to understand what's happening here.",
                f"This is just the beginning."
            ],
            "conflict": [
                f"We can't let this continue.",
                f"There has to be another way.",
                f"Everything depends on what we do next."
            ],
            "climax": [
                f"This ends now!",
                f"We've come too far to turn back.",
                f"It's time to make our stand."
            ],
            "resolution": [
                f"It's finally over.",
                f"We did what we had to do.",
                f"Things will be different now."
            ]
        }
        
        context_templates = templates.get(scene_context, templates["setup"])
        text = context_templates[line_index % len(context_templates)]
        
        # Occasionally mix in character-specific onomatopoeia (Requirement Enhancement)
        if line_index % 3 == 0 and hasattr(character, 'onomatopoeia') and character.onomatopoeia:
            ono = character.onomatopoeia[line_index % len(character.onomatopoeia)]
            text = f"{ono} {text}"
            
        return text
    
    def _generate_action_notes(
        self,
        scene_context: str,
        parsed_prompt: ParsedPrompt,
        characters: List[Character]
    ) -> List[str]:
        """Generate action notes for scene with character gestures"""
        action_templates = {
            "setup": [
                f"Establishing shot of {parsed_prompt.setting}",
                "The atmosphere is still, awaiting movement"
            ],
            "conflict": [
                "Tension builds between characters",
                "Action intensifies as the stakes rise"
            ],
            "climax": [
                "Dramatic confrontation reaches its peak",
                "Rapid movement and high energy"
            ],
            "resolution": [
                "The characters reflect on the outcome",
                "A slow fade as the world settles"
            ]
        }
        
        notes = action_templates.get(scene_context, ["Scene action"])
        
        # Mix in character-specific gestures (Requirement Enhancement)
        if characters:
            main_char = characters[0]
            if hasattr(main_char, 'gestures') and main_char.gestures:
                gesture = main_char.gestures[0]
                notes.append(f"{main_char.name} {gesture.lower()}")
        
        return notes
    
    def _determine_location(self, parsed_prompt: ParsedPrompt, act_number: int) -> str:
        """Determine scene location"""
        return f"{parsed_prompt.setting} - Location {act_number}"
    
    def _determine_time(self, act_number: int, total_acts: int) -> str:
        """Determine scene time"""
        if act_number == 1:
            return "Beginning"
        elif act_number == total_acts:
            return "End"
        else:
            return "Middle"
    
    def _estimate_duration(self, scenes: List[DialogueScene]) -> int:
        """Estimate total dialogue duration in seconds"""
        # Rough estimate: 2 seconds per word, average 10 words per line
        total_lines = sum(len(scene.dialogue_lines) for scene in scenes)
        words_per_line = 10
        seconds_per_word = 0.5
        
        return int(total_lines * words_per_line * seconds_per_word)
