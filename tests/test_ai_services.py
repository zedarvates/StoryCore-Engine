"""
Tests Unitaires pour les Services IA Phase 3
StoryCore Engine - Phase 3: IA (Story Generation, Character AI, Scene Composition, Video Enhancement)
"""
import pytest
import sys
import os
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.story_generation_service import (
    StoryGenerationService, StoryGenre, StoryStructure, Story, StoryArc, StoryScene, StoryBeat
)
from backend.character_ai_service import (
    CharacterAIService, CharacterRole, PersonalityTrait, Character, CharacterBackground, CharacterAppearance
)
from backend.scene_composition_service import (
    SceneCompositionService, ShotType, CameraMovement, LightingStyle, SceneComposition, CameraSetup
)
from backend.video_enhancement_service import (
    VideoEnhancementService, EnhancementType, EnhancementConfig, ColorGradingPreset
)


class TestStoryGenerationService:
    """Tests pour le service de génération de stories"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.service = StoryGenerationService()
    
    def test_service_initialization(self):
        """Test de l'initialisation du service"""
        assert self.service is not None
        assert self.service.stories == {}
        assert len(self.service.PROMPT_TEMPLATES) > 0
        assert len(self.service.STRUCTURES) > 0
    
    def test_genre_enum_values(self):
        """Test des valeurs d'énumération Genre"""
        assert StoryGenre.ADVENTURE.value == "adventure"
        assert StoryGenre.HORROR.value == "horror"
        assert StoryGenre.ROMANCE.value == "romance"
        assert StoryGenre.SCIFI.value == "scifi"
        assert len(StoryGenre) >= 8
    
    def test_structure_enum_values(self):
        """Test des valeurs d'énumération Structure"""
        assert StoryStructure.THREE_ACT.value == "three_act"
        assert StoryStructure.HERO_JOURNEY.value == "hero_journey"
        assert StoryStructure.SAVE_THE_CAT.value == "save_the_cat"
        assert len(StoryStructure) >= 4
    
    def test_generate_story_basic(self):
        """Test de génération de story basique"""
        story = self.service.generate_story(
            prompt="A hero discovers a hidden world",
            genre=StoryGenre.ADVENTURE,
            structure=StoryStructure.HERO_JOURNEY,
            length="medium"
        )
        
        assert story is not None
        assert story.id != ""
        assert story.title != ""
        assert story.genre == StoryGenre.ADVENTURE
        assert len(story.arcs) > 0
        assert len(story.scenes) > 0
    
    def test_generate_story_different_lengths(self):
        """Test de génération avec différentes longueurs"""
        lengths = ["short", "medium", "long"]
        scene_counts = [5, 15, 30]
        
        for length, expected_count in zip(lengths, scene_counts):
            story = self.service.generate_story(
                prompt=f"Test story - {length}",
                genre=StoryGenre.DRAMA,
                structure=StoryStructure.THREE_ACT,
                length=length
            )
            assert len(story.scenes) >= expected_count - 5  # Marge acceptable
            assert len(story.scenes) <= expected_count + 5
    
    def test_generate_story_all_genres(self):
        """Test de génération pour tous les genres"""
        for genre in StoryGenre:
            story = self.service.generate_story(
                prompt=f"Test story for {genre.value}",
                genre=genre,
                structure=StoryStructure.THREE_ACT,
                length="short"
            )
            assert story.genre == genre
            assert len(story.arcs) > 0
    
    def test_generate_story_all_structures(self):
        """Test de génération pour toutes les structures"""
        for structure in StoryStructure:
            story = self.service.generate_story(
                prompt=f"Test story for {structure.value}",
                genre=StoryGenre.COMEDY,
                structure=structure,
                length="short"
            )
            assert len(story.arcs) > 0
    
    def test_story_arcs_generation(self):
        """Test de la génération d'arcs"""
        story = self.service.generate_story(
            prompt="Test story arcs",
            genre=StoryGenre.THRILLER,
            structure=StoryStructure.THREE_ACT,
            length="medium"
        )
        
        assert len(story.arcs) == 3  # 3 arcs typiques
        for arc in story.arcs:
            assert arc.id != ""
            assert arc.genre == story.genre
            assert arc.structure == story.arcs[0].structure
    
    def test_story_scenes_generation(self):
        """Test de la génération de scènes"""
        story = self.service.generate_story(
            prompt="Test scenes",
            genre=StoryGenre.HORROR,
            structure=StoryStructure.HERO_JOURNEY,
            length="short"
        )
        
        assert len(story.scenes) > 0
        for scene in story.scenes:
            assert scene.id != ""
            assert scene.title != ""
            assert scene.description != ""
    
    def test_export_story(self):
        """Test de l'export de story"""
        story = self.service.generate_story(
            prompt="Export test story",
            genre=StoryGenre.ROMANCE,
            structure=StoryStructure.SAVE_THE_CAT,
            length="short"
        )
        
        exported = self.service.export_story(story.id)
        
        assert "id" in exported
        assert "title" in exported
        assert "synopsis" in exported
        assert "genre" in exported
        assert "arcs" in exported
        assert "scenes" in exported
        assert exported["arcs_count"] == len(story.arcs)
        assert exported["scenes_count"] == len(story.scenes)
    
    def test_analyze_story_structure(self):
        """Test de l'analyse de structure"""
        story = self.service.generate_story(
            prompt="Analysis test",
            genre=StoryGenre.COMEDY,
            structure=StoryStructure.FIVE_POINT,
            length="short"
        )
        
        analysis = self.service.analyze_story_structure(story.id)
        
        assert "total_beats" in analysis
        assert "total_scenes" in analysis
        assert "pacing_analysis" in analysis
        assert "structure_compliance" in analysis
        assert "character_arcs" in analysis
        assert analysis["total_scenes"] == len(story.scenes)
        assert 0 <= analysis["structure_compliance"] <= 1
    
    def test_add_scene(self):
        """Test de l'ajout de scène"""
        story = self.service.generate_story(
            prompt="Add scene test",
            genre=StoryGenre.FANTASY,
            structure=StoryStructure.THREE_ACT,
            length="short"
        )
        
        initial_count = len(story.scenes)
        
        new_scene = self.service.add_scene(story.id, {
            "id": "new_scene_1",
            "title": "New Scene",
            "description": "A newly added scene",
            "characters": [],
            "dialogue": []
        })
        
        assert new_scene is not None
        assert new_scene.title == "New Scene"
    
    def test_get_story(self):
        """Test de la récupération de story"""
        story = self.service.generate_story(
            prompt="Get story test",
            genre=StoryGenre.SCIFI,
            structure=StoryStructure.HERO_JOURNEY,
            length="short"
        )
        
        retrieved = self.service.get_story(story.id)
        
        assert retrieved is not None
        assert retrieved.id == story.id
        assert retrieved.title == story.title
    
    def test_list_stories(self):
        """Test du listage des stories"""
        # Créer quelques stories
        genres = list(StoryGenre)[:3]
        for i, genre in enumerate(genres):
            self.service.generate_story(
                prompt=f"Story {i}",
                genre=genre,
                structure=StoryStructure.THREE_ACT,
                length="short"
            )
        
        stories = self.service.list_stories()
        
        assert len(stories) == 3
        assert all(isinstance(s, Story) for s in stories)
    
    def test_extract_title(self):
        """Test de l'extraction de titre"""
        short_prompt = "A hero journey"
        long_prompt = "This is a very long prompt that has many words and should be truncated"
        
        title_short = self.service._extract_title(short_prompt)
        title_long = self.service._extract_title(long_prompt)
        
        assert len(title_short) > 0
        assert len(title_long) > 0
        assert "..." in title_long  # Devrait être tronqué


class TestCharacterAIService:
    """Tests pour le service de personnages IA"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.service = CharacterAIService()
    
    def test_service_initialization(self):
        """Test de l'initialisation du service"""
        assert self.service is not None
        assert self.service.characters == {}
        assert self.service.conversations == {}
    
    def test_character_role_enum(self):
        """Test des rôles de personnage"""
        assert CharacterRole.PROTAGONIST.value == "protagonist"
        assert CharacterRole.ANTAGONIST.value == "antagonist"
        assert CharacterRole.SUPPORTING.value == "supporting"
        assert CharacterRole.MINOR.value == "minor"
    
    def test_personality_trait_enum(self):
        """Test des traits de personnalité"""
        assert PersonalityTrait.BRAVE.value == "brave"
        assert PersonalityTrait.CAUTIOUS.value == "cautious"
        assert PersonalityTrait.CHARISMATIC.value == "charismatic"
        assert len(PersonalityTrait) >= 15
    
    def test_create_character_basic(self):
        """Test de création de personnage basique"""
        character = self.service.create_character({
            "name": "John",
            "role": CharacterRole.PROTAGONIST,
            "personality": [PersonalityTrait.BRAVE, PersonalityTrait.KIND],
            "dialogue_style": "Direct and witty"
        })
        
        assert character is not None
        assert character.id != ""
        assert character.name == "John"
        assert character.role == CharacterRole.PROTAGONIST
        assert len(character.personality) == 2
    
    def test_create_character_with_enums(self):
        """Test de création avec énumérations"""
        character = self.service.create_character({
            "name": "Jane",
            "role": CharacterRole.ANTAGONIST,
            "personality": [PersonalityTrait.AGGRESSIVE, PersonalityTrait.INTELLIGENT, PersonalityTrait.TREACHEROUS],
            "dialogue_style": "Menacing and calculating"
        })
        
        assert character.role == CharacterRole.ANTAGONIST
        assert PersonalityTrait.AGGRESSIVE in character.personality
        assert PersonalityTrait.INTELLIGENT in character.personality
    
    def test_generate_character_backstory(self):
        """Test de génération d'arrière-plan"""
        character = self.service.create_character({
            "name": "Test Hero",
            "role": CharacterRole.PROTAGONIST,
            "personality": [PersonalityTrait.BRAVE, PersonalityTrait.LOYAL],
            "dialogue_style": "Inspirational"
        })
        
        background = self.service.generate_character_backstory(character, "adventure")
        
        assert background is not None
        assert background.origin != ""
        assert background.motivation != ""
        assert background.fear != ""
    
    def test_generate_dialogue(self):
        """Test de génération de dialogue"""
        character = self.service.create_character({
            "name": "Test Char",
            "role": CharacterRole.SUPPORTING,
            "personality": [PersonalityTrait.CHARISMATIC],
            "dialogue_style": "Charming"
        })
        
        dialogue = self.service.generate_dialogue(
            character=character,
            context="They're in a dangerous situation",
            situation="Action scene",
            emotional_state="tense"
        )
        
        assert dialogue is not None
        assert len(dialogue) > 0
    
    def test_converse_with_character(self):
        """Test de conversation avec un personnage"""
        character = self.service.create_character({
            "name": "Convo Test",
            "role": CharacterRole.PROTAGONIST,
            "personality": [PersonalityTrait.INTELLIGENT],
            "dialogue_style": "Analytical"
        })
        
        response = self.service.converse(character.id, "Hello, who are you?")
        
        assert "response" in response
        assert "emotional_state" in response
        assert response["character_name"] == "Convo Test"
        assert response["character_id"] == character.id
    
    def test_converse_nonexistent_character(self):
        """Test de conversation avec personnage inexistant"""
        response = self.service.converse("nonexistent_id", "Hello")
        
        assert "error" in response
        assert response["error"] == "Character not found"
    
    def test_analyze_character_arc(self):
        """Test d'analyse d'arc de personnage"""
        character = self.service.create_character({
            "name": "Arc Test",
            "role": CharacterRole.PROTAGONIST,
            "personality": [PersonalityTrait.BRAVE],
            "dialogue_style": "Heroic"
        })
        
        analysis = self.service.analyze_character_arc(character.id)
        
        assert "character_id" in analysis
        assert "arc_start" in analysis
        assert "arc_middle" in analysis
        assert "arc_end" in analysis
        assert "growth_score" in analysis
    
    def test_export_character(self):
        """Test d'export de personnage"""
        character = self.service.create_character({
            "name": "Export Test",
            "role": CharacterRole.ANTAGONIST,
            "personality": [PersonalityTrait.ARROGANT],
            "dialogue_style": "Condescending"
        })
        
        exported = self.service.export_character(character.id)
        
        assert exported["name"] == "Export Test"
        assert exported["role"] == "antagonist"
        assert "personality" in exported
        assert "background" in exported
        assert "appearance" in exported
    
    def test_get_character(self):
        """Test de récupération de personnage"""
        character = self.service.create_character({
            "name": "Get Test",
            "role": CharacterRole.MINOR,
            "personality": [PersonalityTrait.SHY],
            "dialogue_style": "Quiet"
        })
        
        retrieved = self.service.get_character(character.id)
        
        assert retrieved is not None
        assert retrieved.id == character.id
        assert retrieved.name == "Get Test"
    
    def test_list_characters(self):
        """Test du listage des personnages"""
        # Créer quelques personnages
        roles = [CharacterRole.PROTAGONIST, CharacterRole.ANTAGONIST, CharacterRole.SUPPORTING]
        for i, role in enumerate(roles):
            self.service.create_character({
                "name": f"Character {i}",
                "role": role,
                "personality": [list(PersonalityTrait)[i]],
                "dialogue_style": f"Style {i}"
            })
        
        all_chars = self.service.list_characters()
        assert len(all_chars) == 3
        
        protagonists = self.service.list_characters(role=CharacterRole.PROTAGONIST)
        assert len(protagonists) == 1
        assert protagonists[0].role == CharacterRole.PROTAGONIST
    
    def test_validate_character_consistency(self):
        """Test de validation de cohérence"""
        character = self.service.create_character({
            "name": "Validate Test",
            "role": CharacterRole.PROTAGONIST,
            "personality": [PersonalityTrait.BRAVE, PersonalityTrait.KIND],
            "dialogue_style": "Heroic"
        })
        
        validation = self.service.validate_character_consistency(character.id)
        
        assert "consistency_score" in validation
        assert "issues" in validation
        assert "suggestions" in validation
        assert "is_valid" in validation
    
    def test_generate_character_voice_sample(self):
        """Test de génération d'exemple de voix"""
        character = self.service.create_character({
            "name": "Voice Test",
            "role": CharacterRole.SUPPORTING,
            "personality": [PersonalityTrait.CHARISMATIC],
            "dialogue_style": "Warm"
        })
        
        sample = self.service.generate_character_voice_sample(character, "greeting")
        
        assert sample is not None
        assert "Voice Test" in sample


class TestSceneCompositionService:
    """Tests pour le service de composition de scènes"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.service = SceneCompositionService()
    
    def test_service_initialization(self):
        """Test de l'initialisation du service"""
        assert self.service is not None
        assert self.service.compositions == {}
        assert len(self.service.COMPOSITION_RULES) > 0
        assert len(self.service.SHOT_SEQUENCES) > 0
    
    def test_shot_type_enum(self):
        """Test des types de plan"""
        assert ShotType.WIDE.value == "wide"
        assert ShotType.MEDIUM.value == "medium"
        assert ShotType.CLOSE_UP.value == "close_up"
        assert ShotType.EXTREME_CLOSE_UP.value == "ecu"
        assert ShotType.DRONE.value == "drone"
        assert ShotType.TRACKING.value == "tracking"
        assert len(ShotType) >= 8
    
    def test_camera_movement_enum(self):
        """Test des mouvements de caméra"""
        assert CameraMovement.STATIC.value == "static"
        assert CameraMovement.DOLLY_IN.value == "dolly_in"
        assert CameraMovement.DOLLY_OUT.value == "dolly_out"
        assert CameraMovement.ZOOM_IN.value == "zoom_in"
        assert CameraMovement.TRACKING_SHOT.value == "tracking"
        assert len(CameraMovement) >= 10
    
    def test_lighting_style_enum(self):
        """Test des styles d'éclairage"""
        assert LightingStyle.NATURAL.value == "natural"
        assert LightingStyle.HIGH_KEY.value == "high_key"
        assert LightingStyle.LOW_KEY.value == "low_key"
        assert LightingStyle.GOLDEN_HOUR.value == "golden_hour"
        assert LightingStyle.CHIAROSCURO.value == "chiaroscuro"
        assert len(LightingStyle) >= 10
    
    def test_generate_composition_basic(self):
        """Test de génération de composition basique"""
        composition = self.service.generate_composition(
            scene_description="A hero stands in a dark forest",
            characters=["Hero", "Villain"],
            mood="tense"
        )
        
        assert composition is not None
        assert composition.id != ""
        assert len(composition.shots) > 0
        assert len(composition.color_palette) > 0
        assert composition.mood == "tense"
    
    def test_generate_composition_with_characters(self):
        """Test de génération avec personnages"""
        composition = self.service.generate_composition(
            scene_description="Dialogue between two friends",
            characters=["Alice", "Bob"],
            mood="happy"
        )
        
        assert len(composition.shots) >= 3  # Au moins une séquence de dialogue
        assert composition.lighting_style == LightingStyle.HIGH_KEY
    
    def test_composition_rules_selection(self):
        """Test de sélection des règles de composition"""
        composition = self.service.generate_composition(
            scene_description="A landscape with mountains",
            mood="epic"
        )
        
        assert len(composition.composition_rules) > 0
        rule_ids = [r.id for r in composition.composition_rules]
        assert any("leading_lines" in rid or "depth" in rid for rid in rule_ids)
    
    def test_color_palette_by_mood(self):
        """Test de palette de couleurs par ambiance"""
        moods = ["happy", "sad", "tense", "romantic", "horror"]
        
        for mood in moods:
            composition = self.service.generate_composition(
                scene_description="Test scene",
                mood=mood
            )
            assert len(composition.color_palette) == 5
            assert all(isinstance(c, str) for c in composition.color_palette)
    
    def test_shot_sequence_by_type(self):
        """Test de séquence de plans par type"""
        types = ["dialogue", "action", "tension", "establishing"]
        
        for seq_type in types:
            composition = self.service.generate_composition(
                scene_description=f"Test {seq_type} scene",
                mood="neutral"
            )
            assert len(composition.shots) >= 3
    
    def test_camera_lens_inference(self):
        """Test de l'inférence de focale"""
        assert self.service._infer_lens(ShotType.WIDE) == 24
        assert self.service._infer_lens(ShotType.MEDIUM) == 50
        assert self.service._infer_lens(ShotType.CLOSE_UP) == 85
        assert self.service._infer_lens(ShotType.EXTREME_CLOSE_UP) == 135
    
    def test_shot_types_in_composition(self):
        """Test des types de plan dans la composition"""
        composition = self.service.generate_composition(
            scene_description="Wide establishing shot followed by character interaction",
            mood="epic"
        )
        
        shot_types = [s.shot_type for s in composition.shots]
        assert ShotType.WIDE in shot_types
    
    def test_export_composition(self):
        """Test d'export de composition"""
        composition = self.service.generate_composition(
            scene_description="Test export",
            mood="neutral"
        )
        
        exported = self.service.export_composition(composition.id)
        
        assert "id" in exported
        assert "shots" in exported
        assert "lighting_style" in exported
        assert "color_palette" in exported
        assert "rules" in exported
        assert len(exported["shots"]) == len(composition.shots)
    
    def test_analyze_composition(self):
        """Test d'analyse de composition"""
        composition = self.service.generate_composition(
            scene_description="Test analysis scene",
            characters=["Actor 1", "Actor 2"],
            mood="tense"
        )
        
        analysis = self.service.analyze_composition(composition.id)
        
        assert "total_shots" in analysis
        assert "shot_types_used" in analysis
        assert "movements_used" in analysis
        assert "variety_score" in analysis
        assert "pacing_analysis" in analysis
        assert "recommendations" in analysis
    
    def test_add_shot(self):
        """Test d'ajout de plan"""
        composition = self.service.generate_composition(
            scene_description="Test add shot",
            mood="neutral"
        )
        
        initial_shots = len(composition.shots)
        
        new_shot = self.service.add_shot(composition.id, {
            "id": "new_shot_1",
            "shot_type": ShotType.EXTREME_CLOSE_UP,
            "camera_movement": CameraMovement.STATIC,
            "lens": 135,
            "framing": "Close on eyes",
            "duration_estimate": 3.0
        })
        
        assert new_shot is not None
        assert len(composition.shots) == initial_shots + 1
    
    def test_get_composition(self):
        """Test de récupération de composition"""
        composition = self.service.generate_composition(
            scene_description="Get test",
            mood="neutral"
        )
        
        retrieved = self.service.get_composition(composition.id)
        
        assert retrieved is not None
        assert retrieved.id == composition.id
    
    def test_lighting_style_by_mood(self):
        """Test du style d'éclairage par ambiance"""
        mood_lighting_map = {
            "happy": LightingStyle.HIGH_KEY,
            "sad": LightingStyle.LOW_KEY,
            "tense": LightingStyle.CHIAROSCURO,
            "romantic": LightingStyle.GOLDEN_HOUR,
            "horror": LightingStyle.LOW_KEY,
            "epic": LightingStyle.NATURAL
        }
        
        for mood, expected_style in mood_lighting_map.items():
            composition = self.service.generate_composition(
                scene_description="Test lighting",
                mood=mood
            )
            assert composition.lighting_style == expected_style


class TestVideoEnhancementService:
    """Tests pour le service d'amélioration vidéo"""
    
    def setup_method(self):
        """Setup avant chaque test"""
        self.service = VideoEnhancementService()
    
    def test_service_initialization(self):
        """Test de l'initialisation du service"""
        assert self.service is not None
        assert self.service.ffmpeg == "ffmpeg"
        assert self.service.tasks == {}
    
    def test_enhancement_type_enum(self):
        """Test des types d'amélioration"""
        assert EnhancementType.SUPER_RESOLUTION.value == "super_resolution"
        assert EnhancementType.FRAME_INTERPOLATION.value == "frame_interpolation"
        assert EnhancementType.COLOR_GRADING.value == "color_grading"
        assert EnhancementType.NOISE_REDUCTION.value == "noise_reduction"
        assert EnhancementType.STABILIZATION.value == "stabilization"
        assert len(EnhancementType) >= 8
    
    def test_enhancement_config(self):
        """Test de configuration d'amélioration"""
        config = EnhancementConfig(
            type=EnhancementType.SUPER_RESOLUTION,
            strength=0.8,
            model="realesrgan_4x"
        )
        
        assert config.type == EnhancementType.SUPER_RESOLUTION
        assert config.strength == 0.8
        assert config.model == "realesrgan_4x"
    
    def test_estimate_processing_time(self):
        """Test d'estimation du temps de traitement"""
        estimate = self.service.estimate_processing_time(
            "test.mp4",
            [
                EnhancementConfig(type=EnhancementType.SUPER_RESOLUTION, strength=0.5),
                EnhancementConfig(type=EnhancementType.COLOR_GRADING, strength=0.3)
            ]
        )
        
        assert "video_duration_seconds" in estimate
        assert "total_estimated_seconds" in estimate
        assert "total_estimated_minutes" in estimate
        assert "enhancements" in estimate
        assert estimate["total_estimated_seconds"] > 0
    
    def test_list_supported_enhancements(self):
        """Test de la liste des améliorations supportées"""
        supported = self.service.list_supported_enhancements()
        
        assert "super_resolution_models" in supported
        assert "frame_interpolation_models" in supported
        assert "color_grading_presets" in supported
        assert "enhancement_types" in supported
        assert EnhancementType.SUPER_RESOLUTION.value in supported["enhancement_types"]
    
    def test_apply_preset_unknown(self):
        """Test d'application de preset inconnu"""
        # Ne devrait pas planter mais retourner False
        result = self.service.apply_preset("input.mp4", "output.mp4", "unknown_preset")
        assert result is False
    
    def test_processing_task_creation(self):
        """Test de création de tâche de traitement"""
        task = self.service.enhance_video(
            "input.mp4",
            "output.mp4",
            [EnhancementConfig(type=EnhancementType.COLOR_GRADING)]
        )
        
        assert "task_id" in task
        assert "input_path" in task
        assert "output_path" in task
        assert "enhancements_applied" in task
    
    def test_get_task_status(self):
        """Test de récupération de statut de tâche"""
        # Créer une tâche
        self.service.enhance_video(
            "input.mp4",
            "output.mp4",
            [EnhancementConfig(type=EnhancementType.NOISE_REDUCTION)]
        )
        
        # Récupérer le statut
        status = self.service.get_task_status("task_id")
        assert status is None  # Le task_id n'est pas "task_id"
    
    def test_color_grading_presets(self):
        """Test des presets de color grading"""
        presets = [p.value for p in ColorGradingPreset]
        
        assert "natural" in presets
        assert "cinematic" in presets
        assert "vintage" in presets
        assert "bleach_bypass" in presets
        assert "teal_orange" in presets
        assert len(presets) >= 8
    
    def test_enhancement_strength_validation(self):
        """Test de validation de la force d'amélioration"""
        for strength in [0.0, 0.25, 0.5, 0.75, 1.0]:
            config = EnhancementConfig(
                type=EnhancementType.COLOR_GRADING,
                strength=strength
            )
            assert config.strength == strength
    
    def test_multiple_enhancements(self):
        """Test de multiples améliorations"""
        enhancements = [
            EnhancementConfig(type=EnhancementType.SUPER_RESOLUTION, strength=0.7, model="realesrgan_4x"),
            EnhancementConfig(type=EnhancementType.FRAME_INTERPOLATION, strength=0.5, fps_target=60),
            EnhancementConfig(type=EnhancementType.COLOR_GRADING, strength=0.4, preset="cinematic"),
            EnhancementConfig(type=EnhancementType.NOISE_REDUCTION, strength=0.6)
        ]
        
        result = self.service.enhance_video(
            "input.mp4",
            "output.mp4",
            enhancements
        )
        
        assert len(result["enhancements_applied"]) == 4
        assert result["input_path"] == "input.mp4"
        assert result["output_path"] == "output.mp4"
    
    def test_processing_task_structure(self):
        """Test de la structure de tâche de traitement"""
        task_id = str(datetime.now().timestamp())
        task = self.service.tasks.get(task_id)
        
        # La tâche n'existe pas encore
        assert task is None


class TestIntegrationScenarios:
    """Tests de scénarios d'intégration"""
    
    def test_story_to_scene_workflow(self):
        """Test du workflow story -> scène"""
        story_service = StoryGenerationService()
        scene_service = SceneCompositionService()
        
        # Générer une story
        story = story_service.generate_story(
            prompt="A romantic dinner in Paris",
            genre=StoryGenre.ROMANCE,
            structure=StoryStructure.THREE_ACT,
            length="short"
        )
        
        assert story is not None
        assert len(story.scenes) > 0
        
        # Pour chaque scène, générer une composition
        for scene in story.scenes[:2]:
            composition = scene_service.generate_composition(
                scene_description=scene.description,
                characters=scene.characters,
                mood="romantic"
            )
            
            assert composition is not None
            assert len(composition.shots) > 0
    
    def test_character_conversation_in_scene(self):
        """Test de conversation de personnage dans une scène"""
        char_service = CharacterAIService()
        
        # Créer deux personnages
        char1 = char_service.create_character({
            "name": "Alex",
            "role": CharacterRole.PROTAGONIST,
            "personality": [PersonalityTrait.BRAVE],
            "dialogue_style": "Direct"
        })
        
        char2 = char_service.create_character({
            "name": "Sam",
            "role": CharacterRole.SUPPORTING,
            "personality": [PersonalityTrait.KIND],
            "dialogue_style": "Supportive"
        })
        
        # Conversation
        response1 = char_service.converse(char1.id, "We need to find the artifact.")
        response2 = char_service.converse(char2.id, "I'm scared, Alex.")
        
        assert response1["response"] != ""
        assert response2["response"] != ""
        assert "suggested_actions" in response1
    
    def test_enhancement_pipeline(self):
        """Test du pipeline d'amélioration"""
        enhancement_service = VideoEnhancementService()
        
        # Estimer le temps pour un pipeline complet
        estimate = enhancement_service.estimate_processing_time(
            "movie.mp4",
            [
                EnhancementConfig(type=EnhancementType.SUPER_RESOLUTION, strength=0.5),
                EnhancementConfig(type=EnhancementType.COLOR_GRADING, strength=0.7, preset="cinematic"),
                EnhancementConfig(type=EnhancementType.FRAME_INTERPOLATION, strength=0.5, fps_target=60)
            ]
        )
        
        assert estimate["total_estimated_seconds"] > 0
        assert estimate["cpu_intensive"] is True
        assert estimate["gpu_recommended"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
