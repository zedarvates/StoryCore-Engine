"""
Dialogue Wizard for Interactive Dialogue Creation

This module implements a specialized wizard for creating compelling dialogue
sequences with character voices, emotional depth, and narrative pacing.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import random


class DialogueTone(Enum):
    """Different tones for dialogue"""
    NATURAL = "natural"
    DRAMATIC = "dramatic"
    COMEDIC = "comedic"
    INTENSE = "intense"
    SUBTLE = "subtle"


class DialoguePurpose(Enum):
    """Purposes of dialogue sequences"""
    EXPOSITION = "exposition"
    CONFLICT = "conflict"
    CHARACTER_DEVELOPMENT = "character_development"
    COMEDY_RELIEF = "comedy_relief"
    CLIMAX_BUILDING = "climax_building"


@dataclass
class CharacterVoice:
    """Voice characteristics for a character"""
    character_name: str
    personality_traits: List[str]
    speech_patterns: List[str]
    vocabulary_level: str  # "simple", "moderate", "complex", "technical"
    emotional_range: List[str]
    cultural_background: str = ""
    age_group: str = "adult"


@dataclass
class DialogueLine:
    """A single line of dialogue"""
    character: str
    text: str
    emotional_state: str
    subtext: str = ""
    action_description: str = ""


@dataclass
class DialogueScene:
    """Complete dialogue scene"""
    title: str
    setting: str
    characters: List[CharacterVoice]
    purpose: DialoguePurpose
    tone: DialogueTone
    dialogue_lines: List[DialogueLine] = field(default_factory=list)
    scene_description: str = ""
    duration_estimate: int = 0  # in seconds


class DialogueWizard:
    """
    Wizard for creating dialogue scenes with character consistency and dramatic impact
    """

    def __init__(self):
        """Initialize the dialogue wizard"""
        self.character_voices = {}
        self.templates = self._load_dialogue_templates()
        self.emotional_states = self._load_emotional_states()

    def create_character_voice(self, character_name: str, genre: str = "general",
                             personality: List[str] = None) -> CharacterVoice:
        """
        Create a character voice profile

        Args:
            character_name: Name of the character
            genre: Story genre for voice adaptation
            personality: List of personality traits

        Returns:
            CharacterVoice object
        """
        if personality is None:
            personality = ["confident", "direct"]

        # Generate voice characteristics based on personality
        speech_patterns = self._generate_speech_patterns(personality)
        vocabulary = self._determine_vocabulary_level(personality)
        emotions = self._determine_emotional_range(personality)

        voice = CharacterVoice(
            character_name=character_name,
            personality_traits=personality,
            speech_patterns=speech_patterns,
            vocabulary_level=vocabulary,
            emotional_range=emotions,
            age_group="adult"
        )

        self.character_voices[character_name] = voice
        return voice

    def generate_dialogue_scene(self, scene_concept: str, characters: List[str],
                               purpose: DialoguePurpose, tone: DialogueTone,
                               target_length: int = 10) -> DialogueScene:
        """
        Generate a complete dialogue scene

        Args:
            scene_concept: Brief description of the scene
            characters: List of character names involved
            purpose: Purpose of this dialogue
            tone: Overall tone of the dialogue
            target_length: Target number of dialogue lines

        Returns:
            Complete DialogueScene object
        """
        # Ensure all characters have voice profiles
        for char_name in characters:
            if char_name not in self.character_voices:
                self.create_character_voice(char_name)

        # Generate scene structure
        scene = DialogueScene(
            title=self._generate_scene_title(scene_concept, purpose),
            setting=self._generate_setting(scene_concept),
            characters=[self.character_voices[name] for name in characters],
            purpose=purpose,
            tone=tone
        )

        # Generate dialogue lines
        scene.dialogue_lines = self._generate_dialogue_lines(
            scene_concept, characters, purpose, tone, target_length
        )

        # Add scene description
        scene.scene_description = self._generate_scene_description(scene, scene_concept)

        # Estimate duration (rough calculation: 3-5 seconds per line)
        scene.duration_estimate = len(scene.dialogue_lines) * 4

        return scene

    def enhance_dialogue(self, existing_dialogue: List[DialogueLine],
                        enhancement_type: str = "emotional_depth") -> List[DialogueLine]:
        """
        Enhance existing dialogue with additional layers

        Args:
            existing_dialogue: Current dialogue lines
            enhancement_type: Type of enhancement ("emotional_depth", "subtext", "conflict")

        Returns:
            Enhanced dialogue lines
        """
        enhanced_lines = []

        for line in existing_dialogue:
            enhanced_line = DialogueLine(
                character=line.character,
                text=line.text,
                emotional_state=line.emotional_state
            )

            if enhancement_type == "emotional_depth":
                enhanced_line.subtext = self._add_subtext(line)
                enhanced_line.action_description = self._add_action_description(line)

            elif enhancement_type == "subtext":
                enhanced_line.subtext = self._generate_subtext(line, existing_dialogue)

            elif enhancement_type == "conflict":
                enhanced_line = self._add_conflict_layer(line, existing_dialogue)

            enhanced_lines.append(enhanced_line)

        return enhanced_lines

    def _generate_speech_patterns(self, personality: List[str]) -> List[str]:
        """Generate speech patterns based on personality traits"""
        patterns = []

        if "confident" in personality:
            patterns.extend(["direct statements", "firm tone", "minimal hesitation"])
        if "nervous" in personality:
            patterns.extend(["hesitant speech", "filler words", "rushed delivery"])
        if "intellectual" in personality:
            patterns.extend(["complex sentences", "precise vocabulary", "analytical tone"])
        if "aggressive" in personality:
            patterns.extend(["confrontational", "interrupting", "loud emphasis"])
        if "calm" in personality:
            patterns.extend(["measured pace", "thoughtful pauses", "soft volume"])

        # Default patterns if none match
        if not patterns:
            patterns = ["balanced delivery", "clear enunciation", "moderate pace"]

        return patterns

    def _determine_vocabulary_level(self, personality: List[str]) -> str:
        """Determine vocabulary complexity based on personality"""
        if "intellectual" in personality or "educated" in personality:
            return "complex"
        elif "simple" in personality or "uneducated" in personality:
            return "simple"
        elif "technical" in personality or "professional" in personality:
            return "technical"
        else:
            return "moderate"

    def _determine_emotional_range(self, personality: List[str]) -> List[str]:
        """Determine emotional range for character"""
        emotions = ["calm", "concerned", "determined"]  # Base emotions

        if "passionate" in personality:
            emotions.extend(["angry", "excited", "desperate"])
        if "stoic" in personality:
            emotions.extend(["reserved", "controlled", "detached"])
        if "emotional" in personality:
            emotions.extend(["overwhelmed", "vulnerable", "intense"])
        if "humorous" in personality:
            emotions.extend(["amused", "sarcastic", "lighthearted"])

        return emotions

    def _generate_scene_title(self, concept: str, purpose: DialoguePurpose) -> str:
        """Generate a compelling title for the dialogue scene"""
        purpose_words = {
            DialoguePurpose.EXPOSITION: ["Introduction", "Setup", "Background"],
            DialoguePurpose.CONFLICT: ["Confrontation", "Clash", "Dispute"],
            DialoguePurpose.CHARACTER_DEVELOPMENT: ["Revelation", "Growth", "Change"],
            DialoguePurpose.COMEDY_RELIEF: ["Light Moment", "Comic Relief", "Break"],
            DialoguePurpose.CLIMAX_BUILDING: ["Rising Tension", "Critical Moment", "Breaking Point"]
        }

        words = purpose_words.get(purpose, ["Dialogue"])
        title_word = random.choice(words)

        # Extract key concept words
        concept_words = concept.split()[:2]
        concept_part = " ".join(concept_words).title()

        return f"{title_word}: {concept_part}"

    def _generate_setting(self, concept: str) -> str:
        """Generate appropriate setting description"""
        # Extract location hints from concept
        concept_lower = concept.lower()

        if "office" in concept_lower or "work" in concept_lower:
            return "A modern office with fluorescent lighting and cluttered desks"
        elif "home" in concept_lower or "house" in concept_lower:
            return "A comfortable living room with warm lighting and personal touches"
        elif "street" in concept_lower or "outdoor" in concept_lower:
            return "A bustling city street with passersby and urban sounds"
        elif "restaurant" in concept_lower or "cafe" in concept_lower:
            return "A cozy restaurant with ambient music and the clink of dishes"
        elif "car" in concept_lower or "vehicle" in concept_lower:
            return "Inside a moving vehicle with the hum of the engine"
        else:
            return "An intimate conversation space with focused lighting"

    def _generate_dialogue_lines(self, concept: str, characters: List[str],
                               purpose: DialoguePurpose, tone: DialogueTone,
                               target_length: int) -> List[DialogueLine]:
        """Generate the actual dialogue lines"""
        lines = []

        # Get dialogue template for this purpose/tone combination
        template = self._get_dialogue_template(purpose, tone)

        # Generate lines based on template
        for i in range(min(target_length, len(template))):
            template_line = template[i]

            # Select character for this line
            character_name = characters[i % len(characters)]

            # Adapt line to character voice
            adapted_text = self._adapt_to_character_voice(template_line, character_name)

            # Determine emotional state
            emotional_state = self._determine_emotional_state(template_line, tone)

            line = DialogueLine(
                character=character_name,
                text=adapted_text,
                emotional_state=emotional_state
            )

            lines.append(line)

        return lines

    def _get_dialogue_template(self, purpose: DialoguePurpose,
                             tone: DialogueTone) -> List[str]:
        """Get dialogue template for specific purpose and tone"""
        # This would be expanded with more templates
        templates = {
            (DialoguePurpose.CONFLICT, DialogueTone.INTENSE): [
                "This has gone too far!",
                "You don't understand the consequences.",
                "I won't back down from this.",
                "You're making a terrible mistake.",
                "This ends now.",
                "You have no idea what you're doing.",
                "I can't let this happen.",
                "Think about what you're saying!"
            ],
            (DialoguePurpose.EXPOSITION, DialogueTone.NATURAL): [
                "So, how did you end up here?",
                "I've been meaning to ask you about that.",
                "What really happened back then?",
                "Tell me more about your background.",
                "How did you get into this line of work?",
                "That's quite a story.",
                "I never knew that about you."
            ],
            (DialoguePurpose.CHARACTER_DEVELOPMENT, DialogueTone.DRAMATIC): [
                "I've been carrying this secret for too long.",
                "You don't know what I've been through.",
                "This changes everything I thought I knew.",
                "I need to tell you something important.",
                "My whole life has been a lie.",
                "I can't keep pretending anymore.",
                "This is who I really am."
            ]
        }

        # Default template if specific combination not found
        default_template = [
            "I need to talk to you about something.",
            "What's on your mind?",
            "This is important.",
            "I understand.",
            "What do you mean?",
            "Let me explain.",
            "I see your point.",
            "That makes sense."
        ]

        return templates.get((purpose, tone), default_template)

    def _adapt_to_character_voice(self, text: str, character_name: str) -> str:
        """Adapt dialogue text to match character voice"""
        if character_name not in self.character_voices:
            return text

        voice = self.character_voices[character_name]

        # Simple adaptation based on personality
        adapted_text = text

        if "confident" in voice.personality_traits:
            adapted_text = adapted_text.replace("I think", "I know")
            adapted_text = adapted_text.replace("maybe", "certainly")

        if "nervous" in voice.personality_traits:
            adapted_text = adapted_text.replace("I know", "I think")
            adapted_text = adapted_text.replace("certainly", "maybe")

        if "intellectual" in voice.personality_traits:
            adapted_text = adapted_text.replace("good", "excellent")
            adapted_text = adapted_text.replace("bad", "problematic")

        return adapted_text

    def _determine_emotional_state(self, text: str, tone: DialogueTone) -> str:
        """Determine emotional state from text and tone"""
        text_lower = text.lower()

        if "!" in text or "too far" in text_lower:
            return "angry"
        elif "?" in text and len(text.split()) > 5:
            return "concerned"
        elif "secret" in text_lower or "lie" in text_lower:
            return "vulnerable"
        elif tone == DialogueTone.COMEDIC:
            return "amused"
        elif tone == DialogueTone.INTENSE:
            return "intense"
        else:
            return "calm"

    def _generate_scene_description(self, scene: DialogueScene, concept: str) -> str:
        """Generate overall scene description"""
        char_names = [c.character_name for c in scene.characters]
        characters_str = ", ".join(char_names)

        return f"""INT. {scene.setting.upper()} - DAY

{characters_str} engage in an intense conversation. The {scene.tone.value} tone builds tension as they discuss {concept.lower()}.

The dialogue reveals character motivations and drives the story forward through {scene.purpose.value.replace('_', ' ')}."""

    def _add_subtext(self, line: DialogueLine) -> str:
        """Add subtext layer to dialogue line"""
        emotional_mapping = {
            "angry": "Hiding deep frustration and resentment",
            "concerned": "Masking genuine worry with forced calm",
            "vulnerable": "Revealing true feelings despite fear",
            "amused": "Using humor to deflect from deeper emotions",
            "intense": "Barely containing overwhelming emotion",
            "calm": "Maintaining composure despite inner turmoil"
        }

        return emotional_mapping.get(line.emotional_state, "Conveying complex inner thoughts")

    def _add_action_description(self, line: DialogueLine) -> str:
        """Add action description to accompany dialogue"""
        action_mapping = {
            "angry": "pacing, gesturing emphatically",
            "concerned": "fidgeting with hands, avoiding eye contact",
            "vulnerable": "voice breaking slightly, eyes downcast",
            "amused": "smiling wryly, leaning back",
            "intense": "leaning forward, intense eye contact",
            "calm": "speaking deliberately, maintaining posture"
        }

        action = action_mapping.get(line.emotional_state, "speaking steadily")
        return f"({action})"

    def _generate_subtext(self, line: DialogueLine, context: List[DialogueLine]) -> str:
        """Generate subtext based on dialogue context"""
        # Analyze conversation flow to determine subtext
        line_index = context.index(line) if line in context else 0

        # Simple subtext generation
        if line.emotional_state == "angry":
            return "Actually terrified of losing control"
        elif line.emotional_state == "calm":
            return "Boiling with rage underneath the surface"
        elif "?" in line.text:
            return "Seeking validation and reassurance"
        else:
            return "Hiding true intentions behind words"

    def _add_conflict_layer(self, line: DialogueLine, context: List[DialogueLine]) -> DialogueLine:
        """Add conflict elements to dialogue"""
        # Enhance line with conflict
        conflict_indicators = ["but", "however", "actually", "truth is", "fact is"]

        enhanced_text = line.text
        if not any(word in enhanced_text.lower() for word in conflict_indicators):
            enhanced_text = enhanced_text.replace("I", "But I", 1)

        return DialogueLine(
            character=line.character,
            text=enhanced_text,
            emotional_state="intense",  # Escalate emotion for conflict
            subtext="Challenging the other's perspective",
            action_description="(confrontational body language)"
        )

    def _load_dialogue_templates(self) -> Dict:
        """Load dialogue templates (placeholder)"""
        return {}

    def _load_emotional_states(self) -> Dict:
        """Load emotional state definitions (placeholder)"""
        return {}


# Convenience functions
def create_dialogue_wizard() -> DialogueWizard:
    """Create and return a new dialogue wizard instance"""
    return DialogueWizard()


def generate_quick_dialogue(characters: List[str], topic: str,
                          tone: str = "natural") -> DialogueScene:
    """
    Quick dialogue generation for simple scenes

    Args:
        characters: List of character names
        topic: Conversation topic
        tone: Dialogue tone ("natural", "dramatic", "comedic", "intense")

    Returns:
        Generated dialogue scene
    """
    wizard = DialogueWizard()

    # Create basic character voices
    for name in characters:
        wizard.create_character_voice(name)

    # Map string tone to enum
    tone_mapping = {
        "natural": DialogueTone.NATURAL,
        "dramatic": DialogueTone.DRAMATIC,
        "comedic": DialogueTone.COMEDIC,
        "intense": DialogueTone.INTENSE
    }

    tone_enum = tone_mapping.get(tone, DialogueTone.NATURAL)

    # Generate scene
    return wizard.generate_dialogue_scene(
        scene_concept=f"Discussion about {topic}",
        characters=characters,
        purpose=DialoguePurpose.CHARACTER_DEVELOPMENT,
        tone=tone_enum,
        target_length=6
    )