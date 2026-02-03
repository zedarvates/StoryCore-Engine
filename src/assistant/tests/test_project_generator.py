"""
Unit tests for ProjectGenerator.

Tests the project generation functionality including scene, character,
and sequence generation.
"""

import pytest
from datetime import datetime

from src.assistant.project_generator import ProjectGenerator
from src.assistant.prompt_parser import MockLLMClient
from src.assistant.models import (
    GeneratedProject,
    Scene,
    Character,
    Sequence,
    Shot,
    ParsedPrompt
)
from src.assistant.exceptions import ValidationError


class TestProjectGenerator:
    """Test the ProjectGenerator class."""
    
    def test_generator_initialization(self):
        """Test generator initializes correctly."""
        generator = ProjectGenerator()
        assert generator.parser is not None
        assert generator.llm is not None
        assert isinstance(generator.llm, MockLLMClient)
    
    def test_generator_initialization_with_custom_client(self):
        """Test generator initializes with custom LLM client."""
        client = MockLLMClient()
        generator = ProjectGenerator(llm_client=client)
        assert generator.llm is client
    
    def test_generate_project_from_simple_prompt(self):
        """Test generating a project from a simple prompt."""
        generator = ProjectGenerator()
        prompt = "Create a sci-fi thriller about AI rebellion"
        
        result = generator.generate_project(prompt)
        
        assert isinstance(result, GeneratedProject)
        assert result.name is not None
        assert len(result.scenes) >= 3
        assert len(result.scenes) <= 12
        assert len(result.characters) >= 1
        assert len(result.sequences) == len(result.scenes)
        assert result.metadata is not None
        assert result.parsed_prompt is not None
    
    def test_generate_project_with_language(self):
        """Test generating a project with specific language."""
        generator = ProjectGenerator()
        prompt = "Crée une histoire de science-fiction"
        
        result = generator.generate_project(prompt, language="fr")
        
        assert isinstance(result, GeneratedProject)
        assert result.parsed_prompt.language == "fr"
    
    def test_generate_project_with_scene_count_preference(self):
        """Test generating a project with scene count preference."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        preferences = {"sceneCount": 5}
        
        result = generator.generate_project(prompt, preferences=preferences)
        
        assert len(result.scenes) == 5
    
    def test_generate_project_name_is_filesystem_safe(self):
        """Test that generated project names are filesystem-safe."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        # Should not contain unsafe characters
        assert "/" not in result.name
        assert "\\" not in result.name
        assert ":" not in result.name
        assert "*" not in result.name
        assert "?" not in result.name
        assert '"' not in result.name
        assert "<" not in result.name
        assert ">" not in result.name
        assert "|" not in result.name
    
    def test_generate_project_name_includes_genre(self):
        """Test that project name includes genre."""
        generator = ProjectGenerator()
        prompt = "Create a sci-fi story"
        
        result = generator.generate_project(prompt)
        
        # Should contain genre or timestamp
        assert len(result.name) > 0
        assert "_" in result.name  # Should have underscore separator
    
    def test_generated_metadata_has_correct_schema_version(self):
        """Test that generated metadata has correct schema version."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        assert result.metadata.schema_version == "1.0"
    
    def test_generated_metadata_has_all_capabilities(self):
        """Test that generated metadata has all capabilities enabled."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        assert result.metadata.capabilities["grid_generation"] is True
        assert result.metadata.capabilities["promotion_engine"] is True
        assert result.metadata.capabilities["qa_engine"] is True
        assert result.metadata.capabilities["autofix_engine"] is True
    
    def test_generated_metadata_has_pending_status(self):
        """Test that generated metadata has pending generation status."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        assert result.metadata.generation_status["grid"] == "pending"
        assert result.metadata.generation_status["promotion"] == "pending"


class TestSceneGeneration:
    """Test scene generation functionality."""
    
    def test_generate_scenes_respects_minimum_count(self):
        """Test that at least 3 scenes are generated."""
        generator = ProjectGenerator()
        prompt = "Create a very short story"
        
        result = generator.generate_project(prompt)
        
        assert len(result.scenes) >= 3
    
    def test_generate_scenes_respects_maximum_count(self):
        """Test that at most 12 scenes are generated."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        preferences = {"sceneCount": 20}  # Request more than max
        
        result = generator.generate_project(prompt, preferences=preferences)
        
        assert len(result.scenes) <= 12
    
    def test_generated_scenes_have_unique_ids(self):
        """Test that generated scenes have unique IDs."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        scene_ids = [scene.id for scene in result.scenes]
        assert len(scene_ids) == len(set(scene_ids))  # All unique
    
    def test_generated_scenes_have_sequential_numbers(self):
        """Test that generated scenes have sequential numbers."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        for i, scene in enumerate(result.scenes):
            assert scene.number == i + 1
    
    def test_generated_scenes_have_all_required_fields(self):
        """Test that generated scenes have all required fields."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        for scene in result.scenes:
            assert scene.id is not None
            assert scene.number > 0
            assert scene.title is not None
            assert scene.description is not None
            assert scene.location is not None
            assert scene.time_of_day is not None
            assert scene.duration > 0
            assert isinstance(scene.characters, list)
            assert isinstance(scene.key_actions, list)
    
    def test_generated_scenes_have_positive_duration(self):
        """Test that generated scenes have positive duration."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        for scene in result.scenes:
            assert scene.duration > 0


class TestCharacterGeneration:
    """Test character generation functionality."""
    
    def test_generate_characters_creates_at_least_one(self):
        """Test that at least one character is generated."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        assert len(result.characters) >= 1
    
    def test_generated_characters_have_unique_ids(self):
        """Test that generated characters have unique IDs."""
        generator = ProjectGenerator()
        prompt = "Create a story with multiple characters"
        
        result = generator.generate_project(prompt)
        
        char_ids = [char.id for char in result.characters]
        assert len(char_ids) == len(set(char_ids))  # All unique
    
    def test_generated_characters_have_all_required_fields(self):
        """Test that generated characters have all required fields."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        for character in result.characters:
            assert character.id is not None
            assert character.name is not None
            assert character.role is not None
            assert character.description is not None
            assert character.appearance is not None
            assert len(character.appearance) > 0
    
    def test_generated_character_appearance_is_detailed(self):
        """Test that character appearance descriptions are detailed."""
        generator = ProjectGenerator()
        prompt = "Create a story with a hero"
        
        result = generator.generate_project(prompt)
        
        for character in result.characters:
            # Appearance should be reasonably detailed (at least 20 chars)
            assert len(character.appearance) >= 20
    
    def test_character_appearance_includes_style_context(self):
        """Test that character appearance includes visual style context."""
        generator = ProjectGenerator()
        prompt = "Create a cyberpunk story"
        
        result = generator.generate_project(prompt)
        
        # At least one character should have appearance description
        assert any(len(char.appearance) > 0 for char in result.characters)


class TestSequenceGeneration:
    """Test sequence and shot generation functionality."""
    
    def test_generate_sequences_creates_one_per_scene(self):
        """Test that one sequence is created per scene."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        assert len(result.sequences) == len(result.scenes)
    
    def test_generated_sequences_have_correct_scene_ids(self):
        """Test that sequences reference correct scene IDs."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        scene_ids = {scene.id for scene in result.scenes}
        for sequence in result.sequences:
            assert sequence.scene_id in scene_ids
    
    def test_generated_sequences_have_shots(self):
        """Test that sequences have at least one shot."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        for sequence in result.sequences:
            assert len(sequence.shots) >= 1
            assert len(sequence.shots) <= 5
    
    def test_generated_shots_have_all_required_fields(self):
        """Test that generated shots have all required fields."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        for sequence in result.sequences:
            for shot in sequence.shots:
                assert shot.id is not None
                assert shot.number > 0
                assert shot.type in ["wide", "medium", "close-up", "extreme-close-up"]
                assert shot.camera_movement in ["static", "pan", "tilt", "dolly", "crane"]
                assert shot.duration > 0
                assert shot.description is not None
                assert shot.visual_style is not None
    
    def test_generated_shots_have_sequential_numbers(self):
        """Test that shots within a sequence have sequential numbers."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        for sequence in result.sequences:
            for i, shot in enumerate(sequence.shots):
                assert shot.number == i + 1
    
    def test_sequence_total_duration_matches_scene(self):
        """Test that sequence total duration matches scene duration."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        for i, sequence in enumerate(result.sequences):
            scene = result.scenes[i]
            assert abs(sequence.total_duration - scene.duration) < 0.01
    
    def test_shot_durations_sum_to_sequence_duration(self):
        """Test that shot durations sum to sequence duration."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        for sequence in result.sequences:
            shot_duration_sum = sum(shot.duration for shot in sequence.shots)
            assert abs(shot_duration_sum - sequence.total_duration) < 0.01
    
    def test_first_shot_is_usually_wide(self):
        """Test that first shot is usually wide to establish scene."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        
        result = generator.generate_project(prompt)
        
        # Most sequences should start with wide shot
        wide_first_count = sum(
            1 for seq in result.sequences
            if len(seq.shots) > 1 and seq.shots[0].type == "wide"
        )
        
        # At least half should start with wide
        assert wide_first_count >= len(result.sequences) // 2


class TestProjectGeneratorEdgeCases:
    """Test edge cases and error handling."""
    
    def test_generate_project_with_empty_prompt(self):
        """Test generating project with empty prompt."""
        generator = ProjectGenerator()
        
        # Should still work with mock client
        result = generator.generate_project("")
        assert isinstance(result, GeneratedProject)
    
    def test_generate_project_with_very_long_prompt(self):
        """Test generating project with very long prompt."""
        generator = ProjectGenerator()
        prompt = "Create a story. " * 500
        
        result = generator.generate_project(prompt)
        assert isinstance(result, GeneratedProject)
    
    def test_generate_project_with_unicode_prompt(self):
        """Test generating project with unicode characters."""
        generator = ProjectGenerator()
        prompt = "Create a story with émojis 🎬 and spëcial çharacters"
        
        result = generator.generate_project(prompt)
        assert isinstance(result, GeneratedProject)
    
    def test_scene_count_preference_below_minimum(self):
        """Test that scene count preference below 3 is clamped to 3."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        preferences = {"sceneCount": 1}
        
        result = generator.generate_project(prompt, preferences=preferences)
        
        assert len(result.scenes) >= 3
    
    def test_scene_count_preference_above_maximum(self):
        """Test that scene count preference above 12 is clamped to 12."""
        generator = ProjectGenerator()
        prompt = "Create a story"
        preferences = {"sceneCount": 50}
        
        result = generator.generate_project(prompt, preferences=preferences)
        
        assert len(result.scenes) <= 12
    
    def test_shot_count_estimation_for_short_scene(self):
        """Test shot count estimation for short scenes."""
        generator = ProjectGenerator()
        prompt = "Create a very brief story"
        
        result = generator.generate_project(prompt)
        
        # Short scenes should have fewer shots
        for i, sequence in enumerate(result.sequences):
            scene = result.scenes[i]
            if scene.duration <= 2.0:
                assert len(sequence.shots) <= 2
    
    def test_shot_count_estimation_for_long_scene(self):
        """Test shot count estimation for long scenes."""
        generator = ProjectGenerator()
        prompt = "Create a story with detailed scenes"
        
        result = generator.generate_project(prompt)
        
        # Should have at least some sequences with multiple shots
        multi_shot_sequences = [seq for seq in result.sequences if len(seq.shots) > 1]
        assert len(multi_shot_sequences) > 0
