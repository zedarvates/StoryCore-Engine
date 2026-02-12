"""
Tests pour le module Dialogue Automation
"""

import pytest
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.automation.dialogue_automation import (
    DialogueAutomation,
    DialogueContext,
    DialogueLine,
    DialogueScene,
    DialogueType,
    EmotionIntensity,
    DialogueTemplate
)


class TestDialogueContext:
    """Tests pour la classe DialogueContext"""
    
    def test_default_context(self):
        """Test la création d'un contexte par défaut"""
        context = DialogueContext()
        
        assert context.location == "Unknown Location"
        assert context.time_of_day == "day"
        assert context.situation == "neutral"
        assert context.mood == "neutral"
    
    def test_custom_context(self):
        """Test la création d'un contexte personnalisé"""
        context = DialogueContext(
            location="Ancient Temple",
            time_of_day="night",
            situation="combat",
            mood="tense",
            weather="stormy"
        )
        
        assert context.location == "Ancient Temple"
        assert context.time_of_day == "night"
        assert context.situation == "combat"
        assert context.mood == "tense"
        assert context.weather == "stormy"
    
    def test_context_to_dict(self):
        """Test la sérialisation en dictionnaire"""
        context = DialogueContext(
            location="Castle",
            time_of_day="evening",
            situation="meeting",
            mood="mysterious"
        )
        
        data = context.to_dict()
        
        assert data["location"] == "Castle"
        assert data["time_of_day"] == "evening"
        assert data["situation"] == "meeting"
        assert data["mood"] == "mysterious"


class TestDialogueLine:
    """Tests pour la classe DialogueLine"""
    
    def test_create_line(self):
        """Test la création d'une ligne de dialogue"""
        line = DialogueLine(
            line_id="line_001",
            character_id="char_001",
            character_name="Hero",
            dialogue="We must act now!",
            emotion="determined"
        )
        
        assert line.line_id == "line_001"
        assert line.character_name == "Hero"
        assert line.dialogue == "We must act now!"
        assert line.emotion == "determined"
        assert line.is_thought is False
    
    def test_line_to_dict(self):
        """Test la sérialisation d'une ligne"""
        line = DialogueLine(
            line_id="line_001",
            character_id="char_001",
            character_name="Villain",
            dialogue="You can't stop me!",
            emotion="angry"
        )
        
        data = line.to_dict()
        
        assert data["line_id"] == "line_001"
        assert data["character_name"] == "Villain"
        assert data["dialogue"] == "You can't stop me!"
        assert data["emotion"] == "angry"
    
    def test_line_display(self):
        """Test l'affichage d'une ligne"""
        line = DialogueLine(
            line_id="line_001",
            character_id="char_001",
            character_name="Mentor",
            dialogue="Patience, young one.",
            emotion="calm"
        )
        
        display = line.to_display()
        
        assert "Mentor:" in display
        assert "Patience, young one." in display


class TestDialogueAutomation:
    """Tests pour la classe DialogueAutomation"""
    
    @pytest.fixture
    def automation(self, tmp_path):
        """Crée une instance de DialogueAutomation"""
        return DialogueAutomation(storage_dir=str(tmp_path / "dialogues"))
    
    def test_initialization(self, automation):
        """Test l'initialisation"""
        assert automation is not None
        assert len(automation.dialogue_history) == 0
    
    def test_generate_dialogue_single_character(self, automation):
        """Test la génération de dialogue avec un personnage"""
        from src.automation.dialogue_automation import (
            GeneratedCharacter,
            CharacterArchetype,
            CharacterRole,
            PersonalityProfile
        )
        
        # Créer un personnage mock
        character = GeneratedCharacter(
            character_id="test_hero",
            name="Test Hero",
            archetype=CharacterArchetype.HERO,
            role=CharacterRole.LEAD,
            personality=PersonalityProfile(),
            appearance=None,
            backstory=None,
            consistency=None
        )
        
        context = DialogueContext(
            location="Battlefield",
            time_of_day="dawn",
            situation="combat",
            mood="tense"
        )
        
        scene = automation.generate_dialogue(
            characters=[character],
            context=context,
            dialogue_type=DialogueType.CONFLICT,
            num_lines=5
        )
        
        assert scene is not None
        assert scene.scene_id is not None
        assert len(scene.lines) == 5
        assert scene.lines[0].character_name == "Test Hero"
    
    def test_generate_dialogue_multiple_characters(self, automation):
        """Test la génération de dialogue avec plusieurs personnages"""
        from src.automation.dialogue_automation import (
            GeneratedCharacter,
            CharacterArchetype,
            CharacterRole,
            PersonalityProfile
        )
        
        hero = GeneratedCharacter(
            character_id="hero_001",
            name="Hero",
            archetype=CharacterArchetype.HERO,
            role=CharacterRole.LEAD,
            personality=PersonalityProfile(),
            appearance=None,
            backstory=None,
            consistency=None
        )
        
        villain = GeneratedCharacter(
            character_id="villain_001",
            name="Villain",
            archetype=CharacterArchetype.VILLAIN,
            role=CharacterRole.ANTAGONIST,
            personality=PersonalityProfile(),
            appearance=None,
            backstory=None,
            consistency=None
        )
        
        context = DialogueContext(
            location="Throne Room",
            time_of_day="night",
            situation="meeting",
            mood="tense"
        )
        
        scene = automation.generate_dialogue(
            characters=[hero, villain],
            context=context,
            dialogue_type=DialogueType.CONFLICT,
            num_lines=6
        )
        
        assert scene is not None
        assert len(scene.lines) == 6
        # Vérifier que les deux personnages parlent
        characters = {line.character_name for line in scene.lines}
        assert "Hero" in characters
        assert "Villain" in characters
    
    def test_get_dialogue_history(self, automation):
        """Test la récupération de l'historique"""
        from src.automation.dialogue_automation import (
            GeneratedCharacter,
            CharacterArchetype,
            CharacterRole,
            PersonalityProfile
        )
        
        character = GeneratedCharacter(
            character_id="test_char",
            name="Test Char",
            archetype=CharacterArchetype.MENTOR,
            role=CharacterRole.SUPPORTING,
            personality=PersonalityProfile(),
            appearance=None,
            backstory=None,
            consistency=None
        )
        
        context = DialogueContext(
            location="Temple",
            time_of_day="morning",
            situation="ceremony",
            mood="peaceful"
        )
        
        # Générer quelques dialogues
        for i in range(3):
            automation.generate_dialogue(
                characters=[character],
                context=context,
                num_lines=4
            )
        
        history = automation.get_dialogue_history(limit=10)
        
        assert history is not None
        assert len(history) == 3
    
    def test_get_scene_by_id(self, automation):
        """Test la récupération d'une scène par ID"""
        from src.automation.dialogue_automation import (
            GeneratedCharacter,
            CharacterArchetype,
            CharacterRole,
            PersonalityProfile
        )
        
        character = GeneratedCharacter(
            character_id="test_char",
            name="Test Char",
            archetype=CharacterArchetype.COMIC_RELIEF,
            role=CharacterRole.SUPPORTING,
            personality=PersonalityProfile(),
            appearance=None,
            backstory=None,
            consistency=None
        )
        
        context = DialogueContext(
            location="Tavern",
            time_of_day="evening",
            situation="rest",
            mood="joyful"
        )
        
        scene = automation.generate_dialogue(
            characters=[character],
            context=context,
            num_lines=4
        )
        
        found = automation.get_scene_by_id(scene.scene_id)
        
        assert found is not None
        assert found.scene_id == scene.scene_id
    
    def test_clear_history(self, automation):
        """Test l'effacement de l'historique"""
        from src.automation.dialogue_automation import (
            GeneratedCharacter,
            CharacterArchetype,
            CharacterRole,
            PersonalityProfile
        )
        
        character = GeneratedCharacter(
            character_id="test_char",
            name="Test Char",
            archetype=CharacterArchetype.PROTAGONIST,
            role=CharacterRole.LEAD,
            personality=PersonalityProfile(),
            appearance=None,
            backstory=None,
            consistency=None
        )
        
        context = DialogueContext()
        
        # Générer un dialogue
        automation.generate_dialogue(
            characters=[character],
            context=context
        )
        
        assert len(automation.dialogue_history) == 1
        
        # Effacer l'historique
        automation.clear_history()
        
        assert len(automation.dialogue_history) == 0


class TestDialogueTypes:
    """Tests pour les types de dialogue"""
    
    def test_dialogue_types_exist(self):
        """Vérifie que tous les types existent"""
        assert DialogueType.NARRATIVE is not None
        assert DialogueType.CONVERSATION is not None
        assert DialogueType.MONOLOGUE is not None
        assert DialogueType.CONFLICT is not None
        assert DialogueType.RESOLUTION is not None
    
    def test_emotion_intensities(self):
        """Vérifie les intensités émotionnelles"""
        assert EmotionIntensity.SUBDUED.value == 0.3
        assert EmotionIntensity.MODERATE.value == 0.5
        assert EmotionIntensity.INTENSE.value == 0.7
        assert EmotionIntensity.EXTREME.value == 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

