"""
Unit tests for Dialogue Wizard functionality.
"""

import pytest
from .dialogue_wizard import (
    DialogueWizard,
    DialogueTone,
    DialoguePurpose,
    CharacterVoice,
    DialogueLine,
    DialogueScene,
    create_dialogue_wizard,
    generate_quick_dialogue
)


class TestDialogueWizard:
    """Test the DialogueWizard class."""

    def test_initialization(self):
        """Test wizard initialization."""
        wizard = DialogueWizard()
        assert wizard.character_voices == {}
        assert wizard.templates == {}
        assert wizard.emotional_states == {}

    def test_create_character_voice(self):
        """Test character voice creation."""
        wizard = DialogueWizard()

        voice = wizard.create_character_voice("Alice", personality=["confident", "intellectual"])

        assert voice.character_name == "Alice"
        assert "confident" in voice.personality_traits
        assert "intellectual" in voice.personality_traits
        assert voice.vocabulary_level == "complex"
        assert voice.age_group == "adult"

        # Check it's stored in wizard
        assert "Alice" in wizard.character_voices

    def test_generate_dialogue_scene(self):
        """Test dialogue scene generation."""
        wizard = DialogueWizard()

        # Create character voices
        wizard.create_character_voice("Alice", personality=["confident"])
        wizard.create_character_voice("Bob", personality=["nervous"])

        # Generate scene
        scene = wizard.generate_dialogue_scene(
            scene_concept="A difficult conversation",
            characters=["Alice", "Bob"],
            purpose=DialoguePurpose.CONFLICT,
            tone=DialogueTone.INTENSE,
            target_length=6
        )

        assert isinstance(scene, DialogueScene)
        assert scene.title
        assert scene.setting
        assert len(scene.characters) == 2
        assert scene.purpose == DialoguePurpose.CONFLICT
        assert scene.tone == DialogueTone.INTENSE
        assert len(scene.dialogue_lines) > 0
        assert scene.duration_estimate > 0

        # Check that all lines have characters from the specified list
        character_names = [c.character_name for c in scene.characters]
        for line in scene.dialogue_lines:
            assert line.character in character_names

    def test_enhance_dialogue_emotional_depth(self):
        """Test dialogue enhancement with emotional depth."""
        wizard = DialogueWizard()

        # Create sample dialogue
        original_lines = [
            DialogueLine("Alice", "I don't understand why you're so upset.", "calm"),
            DialogueLine("Bob", "You never listen to me!", "angry")
        ]

        # Enhance dialogue
        enhanced_lines = wizard.enhance_dialogue(original_lines, "emotional_depth")

        assert len(enhanced_lines) == len(original_lines)

        # Check that enhancements were added
        for line in enhanced_lines:
            assert line.subtext  # Should have subtext
            assert line.action_description  # Should have action description

    def test_adapt_to_character_voice_confident(self):
        """Test voice adaptation for confident character."""
        wizard = DialogueWizard()

        # Create confident character
        wizard.create_character_voice("Alice", personality=["confident"])

        text = wizard._adapt_to_character_voice("I think this is good.", "Alice")
        assert "I know" in text  # Confident adaptation

    def test_adapt_to_character_voice_nervous(self):
        """Test voice adaptation for nervous character."""
        wizard = DialogueWizard()

        # Create nervous character
        wizard.create_character_voice("Bob", personality=["nervous"])

        text = wizard._adapt_to_character_voice("I know this is right.", "Bob")
        assert "I think" in text  # Nervous adaptation

    def test_generate_scene_title(self):
        """Test scene title generation."""
        wizard = DialogueWizard()

        title = wizard._generate_scene_title("family argument", DialoguePurpose.CONFLICT)
        assert "Confrontation" in title or "Clash" in title or "Dispute" in title

    def test_generate_setting_office(self):
        """Test setting generation for office concept."""
        wizard = DialogueWizard()

        setting = wizard._generate_setting("meeting at the office")
        assert "office" in setting.lower()

    def test_generate_setting_home(self):
        """Test setting generation for home concept."""
        wizard = DialogueWizard()

        setting = wizard._generate_setting("family dinner at home")
        assert "living room" in setting.lower() or "home" in setting.lower()

    def test_determine_emotional_state_from_text(self):
        """Test emotional state determination from dialogue text."""
        wizard = DialogueWizard()

        # Test exclamation (angry)
        state = wizard._determine_emotional_state("This is unacceptable!", DialogueTone.INTENSE)
        assert state == "angry"

        # Test question (concerned)
        state = wizard._determine_emotional_state("What do you mean by that?", DialogueTone.NATURAL)
        assert state == "concerned"

    def test_generate_scene_description(self):
        """Test scene description generation."""
        wizard = DialogueWizard()

        # Create mock scene
        characters = [CharacterVoice("Alice", ["confident"], [], "moderate", ["calm"])]
        scene = DialogueScene(
            title="Test Scene",
            setting="Office",
            characters=characters,
            purpose=DialoguePurpose.CONFLICT,
            tone=DialogueTone.INTENSE
        )

        description = wizard._generate_scene_description(scene, "office confrontation")

        assert "INT. OFFICE" in description.upper()
        assert "intense" in description.lower()
        assert "confrontation" in description.lower()


class TestConvenienceFunctions:
    """Test convenience functions."""

    def test_create_dialogue_wizard(self):
        """Test create_dialogue_wizard convenience function."""
        wizard = create_dialogue_wizard()
        assert isinstance(wizard, DialogueWizard)

    def test_generate_quick_dialogue(self):
        """Test quick dialogue generation."""
        scene = generate_quick_dialogue(
            characters=["Alice", "Bob"],
            topic="work project",
            tone="natural"
        )

        assert isinstance(scene, DialogueScene)
        assert len(scene.characters) == 2
        assert len(scene.dialogue_lines) > 0
        assert scene.tone == DialogueTone.NATURAL


class TestEnums:
    """Test enum definitions."""

    def test_dialogue_tone_enum(self):
        """Test DialogueTone enum values."""
        assert DialogueTone.NATURAL.value == "natural"
        assert DialogueTone.DRAMATIC.value == "dramatic"
        assert DialogueTone.INTENSE.value == "intense"
        assert DialogueTone.SUBTLE.value == "subtle"

    def test_dialogue_purpose_enum(self):
        """Test DialoguePurpose enum values."""
        assert DialoguePurpose.EXPOSITION.value == "exposition"
        assert DialoguePurpose.CONFLICT.value == "conflict"
        assert DialoguePurpose.CHARACTER_DEVELOPMENT.value == "character_development"
        assert DialoguePurpose.CLIMAX_BUILDING.value == "climax_building"


class TestDataClasses:
    """Test data class structures."""

    def test_character_voice_creation(self):
        """Test CharacterVoice data class."""
        voice = CharacterVoice(
            character_name="Alice",
            personality_traits=["confident", "intelligent"],
            speech_patterns=["direct", "clear"],
            vocabulary_level="complex",
            emotional_range=["calm", "intense"],
            cultural_background="American",
            age_group="adult"
        )

        assert voice.character_name == "Alice"
        assert "confident" in voice.personality_traits
        assert voice.vocabulary_level == "complex"
        assert voice.cultural_background == "American"

    def test_dialogue_line_creation(self):
        """Test DialogueLine data class."""
        line = DialogueLine(
            character="Alice",
            text="I understand your concern.",
            emotional_state="concerned",
            subtext="Actually worried about the implications",
            action_description="(nodding slowly)"
        )

        assert line.character == "Alice"
        assert line.text == "I understand your concern."
        assert line.emotional_state == "concerned"
        assert line.subtext == "Actually worried about the implications"

    def test_dialogue_scene_creation(self):
        """Test DialogueScene data class."""
        characters = [CharacterVoice("Alice", ["confident"], [], "moderate", ["calm"])]
        lines = [DialogueLine("Alice", "Hello", "calm")]

        scene = DialogueScene(
            title="Test Scene",
            setting="Office",
            characters=characters,
            purpose=DialoguePurpose.EXPOSITION,
            tone=DialogueTone.NATURAL,
            dialogue_lines=lines,
            scene_description="A simple conversation",
            duration_estimate=20
        )

        assert scene.title == "Test Scene"
        assert scene.setting == "Office"
        assert len(scene.characters) == 1
        assert len(scene.dialogue_lines) == 1
        assert scene.duration_estimate == 20