"""
Pipeline Compatibility Tests for StoryCore AI Assistant.

Tests that generated projects work with the existing StoryCore-Engine pipeline
commands (grid, promote) and verify Data Contract v1 compliance.

Requirements: 17.2, 17.3, 17.5
"""

import pytest
import tempfile
import shutil
import json
import subprocess
from pathlib import Path
from datetime import datetime

from ..storycore_assistant import StoryCoreAssistant
from ..models import ProjectMetadata
from ..exceptions import ValidationError


class TestPipelineCompatibility:
    """Test pipeline compatibility with generated projects."""
    
    @pytest.fixture
    def temp_project_dir(self):
        """Create a temporary project directory."""
        temp_dir = tempfile.mkdtemp(prefix="storycore_test_")
        yield Path(temp_dir)
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def assistant(self, temp_project_dir):
        """Create assistant instance with temp directory."""
        return StoryCoreAssistant(
            project_directory=temp_project_dir,
            storage_limit_gb=50,
            file_limit=248,
            llm_provider="mock"
        )
    
    def test_generated_project_has_valid_structure(self, assistant):
        """
        Test that generated projects have the correct directory structure.
        
        Requirements: 17.3, 17.5
        """
        # Generate a project
        prompt = "A sci-fi adventure about space explorers discovering an ancient alien artifact"
        preview = assistant.generate_project(prompt, language="en")
        
        # Finalize the project
        project = assistant.finalize_project(preview.preview_id)
        
        # Verify project structure
        project_path = assistant.file_ops.project_directory / project.name
        assert project_path.exists(), "Project directory should exist"
        
        # Check for project.json
        project_json = project_path / "project.json"
        assert project_json.exists(), "project.json should exist"
        
        # Verify project.json is valid JSON
        with open(project_json, 'r') as f:
            project_data = json.load(f)
        
        assert "schema_version" in project_data
        assert "project_name" in project_data
        assert "capabilities" in project_data
        assert "generation_status" in project_data
    
    def test_generated_project_data_contract_compliance(self, assistant):
        """
        Test that generated projects comply with Data Contract v1.
        
        Requirements: 17.1, 17.3, 17.4, 17.5
        """
        # Generate a project
        prompt = "A fantasy story about a young wizard learning magic"
        preview = assistant.generate_project(prompt, language="en")
        
        # Finalize the project
        project = assistant.finalize_project(preview.preview_id)
        
        # Load project.json
        project_path = assistant.file_ops.project_directory / project.name
        project_json = project_path / "project.json"
        
        with open(project_json, 'r') as f:
            project_data = json.load(f)
        
        # Verify Data Contract v1 fields
        assert project_data["schema_version"] == "1.0", "Schema version should be 1.0"
        assert isinstance(project_data["project_name"], str), "Project name should be string"
        
        # Verify capabilities
        capabilities = project_data["capabilities"]
        assert capabilities["grid_generation"] is True, "grid_generation should be enabled"
        assert capabilities["promotion_engine"] is True, "promotion_engine should be enabled"
        assert capabilities["qa_engine"] is True, "qa_engine should be enabled"
        assert capabilities["autofix_engine"] is True, "autofix_engine should be enabled"
        
        # Verify generation status
        generation_status = project_data["generation_status"]
        assert "grid" in generation_status, "grid status should be present"
        assert "promotion" in generation_status, "promotion status should be present"
        assert generation_status["grid"] in ["pending", "done", "failed", "passed"]
        assert generation_status["promotion"] in ["pending", "done", "failed", "passed"]
        
        # Verify scenes
        assert "scenes" in project_data, "Scenes should be present"
        assert isinstance(project_data["scenes"], list), "Scenes should be a list"
        assert len(project_data["scenes"]) >= 3, "Should have at least 3 scenes"
        assert len(project_data["scenes"]) <= 12, "Should have at most 12 scenes"
        
        # Verify characters
        assert "characters" in project_data, "Characters should be present"
        assert isinstance(project_data["characters"], list), "Characters should be a list"
        
        # Verify sequences
        assert "sequences" in project_data, "Sequences should be present"
        assert isinstance(project_data["sequences"], list), "Sequences should be a list"
    
    def test_generated_project_scene_structure(self, assistant):
        """
        Test that generated scenes have all required fields.
        
        Requirements: 17.3, 17.4
        """
        # Generate a project
        prompt = "A mystery thriller about a detective solving a murder case"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Load project.json
        project_path = assistant.file_ops.project_directory / project.name
        project_json = project_path / "project.json"
        
        with open(project_json, 'r') as f:
            project_data = json.load(f)
        
        # Verify each scene has required fields
        for scene in project_data["scenes"]:
            assert "id" in scene, "Scene should have id"
            assert "number" in scene, "Scene should have number"
            assert "title" in scene, "Scene should have title"
            assert "description" in scene, "Scene should have description"
            assert "location" in scene, "Scene should have location"
            assert "time_of_day" in scene, "Scene should have time_of_day"
            assert "duration" in scene, "Scene should have duration"
            assert "characters" in scene, "Scene should have characters list"
            assert "key_actions" in scene, "Scene should have key_actions list"
            
            # Verify types
            assert isinstance(scene["id"], str)
            assert isinstance(scene["number"], int)
            assert isinstance(scene["title"], str)
            assert isinstance(scene["description"], str)
            assert isinstance(scene["duration"], (int, float))
            assert isinstance(scene["characters"], list)
            assert isinstance(scene["key_actions"], list)
    
    def test_generated_project_character_structure(self, assistant):
        """
        Test that generated characters have all required fields.
        
        Requirements: 17.3, 17.4
        """
        # Generate a project
        prompt = "A romantic comedy about two people who meet at a coffee shop"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Load project.json
        project_path = assistant.file_ops.project_directory / project.name
        project_json = project_path / "project.json"
        
        with open(project_json, 'r') as f:
            project_data = json.load(f)
        
        # Verify each character has required fields
        for character in project_data["characters"]:
            assert "id" in character, "Character should have id"
            assert "name" in character, "Character should have name"
            assert "role" in character, "Character should have role"
            assert "description" in character, "Character should have description"
            assert "appearance" in character, "Character should have appearance"
            assert "personality" in character, "Character should have personality"
            
            # Verify types
            assert isinstance(character["id"], str)
            assert isinstance(character["name"], str)
            assert isinstance(character["role"], str)
            assert isinstance(character["description"], str)
            assert isinstance(character["appearance"], str)
            assert isinstance(character["personality"], str)
    
    def test_generated_project_sequence_structure(self, assistant):
        """
        Test that generated sequences have all required fields.
        
        Requirements: 17.3, 17.4
        """
        # Generate a project
        prompt = "An action movie about a heist gone wrong"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Load project.json
        project_path = assistant.file_ops.project_directory / project.name
        project_json = project_path / "project.json"
        
        with open(project_json, 'r') as f:
            project_data = json.load(f)
        
        # Verify each sequence has required fields
        for sequence in project_data["sequences"]:
            assert "id" in sequence, "Sequence should have id"
            assert "scene_id" in sequence, "Sequence should have scene_id"
            assert "shots" in sequence, "Sequence should have shots"
            assert "total_duration" in sequence, "Sequence should have total_duration"
            
            # Verify types
            assert isinstance(sequence["id"], str)
            assert isinstance(sequence["scene_id"], str)
            assert isinstance(sequence["shots"], list)
            assert isinstance(sequence["total_duration"], (int, float))
            
            # Verify shots
            for shot in sequence["shots"]:
                assert "id" in shot, "Shot should have id"
                assert "number" in shot, "Shot should have number"
                assert "type" in shot, "Shot should have type"
                assert "camera_movement" in shot, "Shot should have camera_movement"
                assert "duration" in shot, "Shot should have duration"
                assert "description" in shot, "Shot should have description"
                assert "visual_style" in shot, "Shot should have visual_style"
    
    def test_generated_project_can_be_opened(self, assistant):
        """
        Test that generated projects can be opened by the assistant.
        
        Requirements: 17.2, 17.3
        """
        # Generate and finalize a project
        prompt = "A documentary about wildlife in the Amazon rainforest"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Close the project
        assistant.close_project()
        
        # Try to open it again
        reopened_project = assistant.open_project(project.name)
        
        # Verify it's the same project
        assert reopened_project.name == project.name
        assert reopened_project.metadata.schema_version == "1.0"
        assert len(reopened_project.scenes) == len(project.scenes)
        assert len(reopened_project.characters) == len(project.characters)
        assert len(reopened_project.sequences) == len(project.sequences)
    
    def test_generated_project_metadata_timestamps(self, assistant):
        """
        Test that generated projects have valid timestamps.
        
        Requirements: 17.3, 17.4
        """
        # Generate a project
        prompt = "A horror story about a haunted house"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Load project.json
        project_path = assistant.file_ops.project_directory / project.name
        project_json = project_path / "project.json"
        
        with open(project_json, 'r') as f:
            project_data = json.load(f)
        
        # Verify timestamps exist and are valid ISO format
        assert "created_at" in project_data, "Should have created_at timestamp"
        assert "modified_at" in project_data, "Should have modified_at timestamp"
        
        # Parse timestamps to verify they're valid
        created_at = datetime.fromisoformat(project_data["created_at"])
        modified_at = datetime.fromisoformat(project_data["modified_at"])
        
        # Verify timestamps are recent (within last minute)
        now = datetime.now()
        assert (now - created_at).total_seconds() < 60, "created_at should be recent"
        assert (now - modified_at).total_seconds() < 60, "modified_at should be recent"
    
    def test_generated_project_file_organization(self, assistant):
        """
        Test that generated projects follow the expected file organization.
        
        Requirements: 17.2, 17.3
        """
        # Generate a project
        prompt = "A western about a gunslinger seeking redemption"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Verify project directory structure
        project_path = assistant.file_ops.project_directory / project.name
        
        # Check main project file
        assert (project_path / "project.json").exists(), "project.json should exist"
        
        # Check that the project directory is properly named
        assert project_path.name == project.name
        assert project_path.is_dir()
    
    def test_multiple_generated_projects_unique_names(self, assistant):
        """
        Test that multiple generated projects have unique names.
        
        Requirements: 17.3
        """
        # Generate multiple projects with the same prompt
        prompt = "A comedy about office workers"
        
        project1 = assistant.generate_project(prompt, language="en")
        finalized1 = assistant.finalize_project(project1.preview_id)
        assistant.close_project()
        
        project2 = assistant.generate_project(prompt, language="en")
        finalized2 = assistant.finalize_project(project2.preview_id)
        
        # Verify names are unique
        assert finalized1.name != finalized2.name, "Project names should be unique"
        
        # Verify both projects exist
        path1 = assistant.file_ops.project_directory / finalized1.name
        path2 = assistant.file_ops.project_directory / finalized2.name
        
        assert path1.exists(), "First project should exist"
        assert path2.exists(), "Second project should exist"
    
    def test_generated_project_validator_acceptance(self, assistant):
        """
        Test that generated projects pass the Data Contract validator.
        
        Requirements: 17.1, 17.3, 17.5
        """
        # Generate a project
        prompt = "A drama about family relationships"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Validate using the validator
        validation_result = assistant.validator.validate_project(project)
        
        # Should pass validation
        assert validation_result.valid, f"Project should pass validation. Errors: {validation_result.errors}"
        
        # Should have no critical errors
        assert len(validation_result.errors) == 0, f"Should have no errors: {validation_result.errors}"
    
    def test_generated_project_scene_count_bounds(self, assistant):
        """
        Test that generated projects respect scene count bounds (3-12).
        
        Requirements: 17.3, 17.4
        """
        # Generate projects with different prompts
        prompts = [
            "A short story about a single conversation",
            "An epic saga spanning multiple generations",
            "A medium-length adventure story"
        ]
        
        for prompt in prompts:
            preview = assistant.generate_project(prompt, language="en")
            project = assistant.finalize_project(preview.preview_id)
            
            # Verify scene count is within bounds
            scene_count = len(project.scenes)
            assert 3 <= scene_count <= 12, f"Scene count {scene_count} should be between 3 and 12"
            
            # Close project for next iteration
            assistant.close_project()
    
    def test_generated_project_sequence_shot_bounds(self, assistant):
        """
        Test that generated sequences have appropriate shot counts (1-5).
        
        Requirements: 17.3, 17.4
        """
        # Generate a project
        prompt = "A thriller about a spy mission"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Verify each sequence has 1-5 shots
        for sequence in project.sequences:
            shot_count = len(sequence.shots)
            assert 1 <= shot_count <= 5, f"Shot count {shot_count} should be between 1 and 5"
    
    def test_generated_project_capabilities_enabled(self, assistant):
        """
        Test that all required capabilities are enabled in generated projects.
        
        Requirements: 17.2, 17.5
        """
        # Generate a project
        prompt = "A musical about Broadway performers"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Verify all capabilities are enabled
        capabilities = project.metadata.capabilities
        
        assert capabilities.get("grid_generation") is True, "grid_generation should be enabled"
        assert capabilities.get("promotion_engine") is True, "promotion_engine should be enabled"
        assert capabilities.get("qa_engine") is True, "qa_engine should be enabled"
        assert capabilities.get("autofix_engine") is True, "autofix_engine should be enabled"
    
    def test_generated_project_generation_status_initialized(self, assistant):
        """
        Test that generation status is properly initialized.
        
        Requirements: 17.2, 17.5
        """
        # Generate a project
        prompt = "A sports movie about an underdog team"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Verify generation status
        status = project.metadata.generation_status
        
        assert "grid" in status, "grid status should be present"
        assert "promotion" in status, "promotion status should be present"
        
        # Status should be pending initially
        assert status["grid"] == "pending", "grid status should be pending"
        assert status["promotion"] == "pending", "promotion status should be pending"


class TestPipelineCommandCompatibility:
    """Test compatibility with actual pipeline commands."""
    
    @pytest.fixture
    def temp_project_dir(self):
        """Create a temporary project directory."""
        temp_dir = tempfile.mkdtemp(prefix="storycore_pipeline_test_")
        yield Path(temp_dir)
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def assistant(self, temp_project_dir):
        """Create assistant instance with temp directory."""
        return StoryCoreAssistant(
            project_directory=temp_project_dir,
            storage_limit_gb=50,
            file_limit=248,
            llm_provider="mock"
        )
    
    def test_generated_project_structure_for_grid_command(self, assistant):
        """
        Test that generated projects have the structure expected by grid command.
        
        Requirements: 17.2
        """
        # Generate a project
        prompt = "A sci-fi story about time travel"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Verify project structure for grid command
        project_path = assistant.file_ops.project_directory / project.name
        
        # Grid command expects project.json
        assert (project_path / "project.json").exists()
        
        # Load and verify metadata
        with open(project_path / "project.json", 'r') as f:
            project_data = json.load(f)
        
        # Grid command checks capabilities
        assert project_data["capabilities"]["grid_generation"] is True
        
        # Grid command checks generation status
        assert "grid" in project_data["generation_status"]
    
    def test_generated_project_structure_for_promote_command(self, assistant):
        """
        Test that generated projects have the structure expected by promote command.
        
        Requirements: 17.2
        """
        # Generate a project
        prompt = "A fantasy adventure with dragons"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Verify project structure for promote command
        project_path = assistant.file_ops.project_directory / project.name
        
        # Promote command expects project.json
        assert (project_path / "project.json").exists()
        
        # Load and verify metadata
        with open(project_path / "project.json", 'r') as f:
            project_data = json.load(f)
        
        # Promote command checks capabilities
        assert project_data["capabilities"]["promotion_engine"] is True
        
        # Promote command checks generation status
        assert "promotion" in project_data["generation_status"]
    
    def test_generated_project_metadata_format(self, assistant):
        """
        Test that project metadata format matches pipeline expectations.
        
        Requirements: 17.2, 17.3
        """
        # Generate a project
        prompt = "A historical drama set in ancient Rome"
        preview = assistant.generate_project(prompt, language="en")
        project = assistant.finalize_project(preview.preview_id)
        
        # Load project metadata
        project_path = assistant.file_ops.project_directory / project.name
        with open(project_path / "project.json", 'r') as f:
            project_data = json.load(f)
        
        # Verify format matches pipeline expectations
        assert isinstance(project_data, dict)
        assert "schema_version" in project_data
        assert "project_name" in project_data
        assert "capabilities" in project_data
        assert "generation_status" in project_data
        assert "scenes" in project_data
        assert "characters" in project_data
        assert "sequences" in project_data
        
        # Verify data types
        assert isinstance(project_data["capabilities"], dict)
        assert isinstance(project_data["generation_status"], dict)
        assert isinstance(project_data["scenes"], list)
        assert isinstance(project_data["characters"], list)
        assert isinstance(project_data["sequences"], list)
