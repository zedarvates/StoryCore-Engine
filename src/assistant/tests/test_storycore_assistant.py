"""
Integration tests for StoryCoreAssistant main orchestration class.

Tests the complete flow from project generation to finalization and management.
"""

import pytest
from pathlib import Path

from src.assistant.storycore_assistant import StoryCoreAssistant, ProjectPreview
from src.assistant.exceptions import StorageLimitExceededError, ValidationError, ResourceError, ProjectError, ConfirmationRequiredError
from src.assistant.models import Project


class TestStoryCoreAssistantInitialization:
    """Test StoryCoreAssistant initialization."""
    
    def test_assistant_initialization(self, temp_project_dir):
        """Test that assistant initializes correctly."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        assert assistant is not None
        assert assistant.file_ops is not None
        assert assistant.storage_monitor is not None
        assert assistant.validator is not None
        assert assistant.project_generator is not None
        assert assistant.comfyui_generator is not None
        assert assistant.project_manager is not None
        assert assistant.autosave_manager is not None
    
    def test_assistant_initialization_with_custom_limits(self, temp_project_dir):
        """Test initialization with custom storage limits."""
        assistant = StoryCoreAssistant(
            temp_project_dir,
            storage_limit_gb=100,
            file_limit=500
        )
        
        stats = assistant.get_storage_stats()
        assert stats.limit_gb == 100
        assert stats.file_limit == 500


class TestProjectGeneration:
    """Test project generation workflow."""
    
    def test_generate_project_from_simple_prompt(self, temp_project_dir):
        """Test generating a project from a simple prompt."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        prompt = "Create a sci-fi thriller about AI rebellion"
        preview = assistant.generate_project(prompt)
        
        assert isinstance(preview, ProjectPreview)
        assert preview.preview_id is not None
        assert preview.generated_project is not None
        assert preview.comfyui_config is not None
        assert len(preview.generated_project.scenes) >= 3
        assert len(preview.generated_project.characters) >= 1
    
    def test_generate_project_with_language(self, temp_project_dir):
        """Test generating a project with non-English language."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        prompt = "Crée une histoire de science-fiction"
        preview = assistant.generate_project(prompt, language="fr")
        
        assert isinstance(preview, ProjectPreview)
        assert preview.generated_project is not None
    
    def test_generate_project_with_preferences(self, temp_project_dir):
        """Test generating a project with preferences."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        prompt = "Create an action movie"
        preferences = {"sceneCount": 5}
        preview = assistant.generate_project(prompt, preferences=preferences)
        
        assert isinstance(preview, ProjectPreview)
        # Scene count should be close to preference (may be adjusted)
        assert 3 <= len(preview.generated_project.scenes) <= 7
    
    def test_generate_project_validates_output(self, temp_project_dir):
        """Test that generated projects are validated."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        prompt = "Create a simple story"
        preview = assistant.generate_project(prompt)
        
        # Preview should have valid project
        assert preview.generated_project.metadata.schema_version == "1.0"
        assert preview.generated_project.metadata.project_name != ""
    
    def test_generate_project_creates_comfyui_config(self, temp_project_dir):
        """Test that ComfyUI configuration is generated."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        prompt = "Create a fantasy adventure"
        preview = assistant.generate_project(prompt)
        
        config = preview.comfyui_config
        assert config is not None
        assert config.project_name == preview.generated_project.name
        assert len(config.character_prompts) > 0
        assert len(config.shot_prompts) > 0
    
    def test_generate_project_checks_storage_limits(self, temp_project_dir):
        """Test that storage limits are checked before generation."""
        # Create assistant with very low limits
        assistant = StoryCoreAssistant(
            temp_project_dir,
            storage_limit_gb=0.001,  # 1 MB
            file_limit=5
        )
        
        # Fill up storage
        test_file = temp_project_dir / "large_file.bin"
        test_file.write_bytes(b"x" * (2 * 1024 * 1024))  # 2 MB
        
        # Should fail due to storage limit
        with pytest.raises(StorageLimitExceededError):
            assistant.generate_project("Create a story")


class TestProjectFinalization:
    """Test project finalization workflow."""
    
    def test_finalize_project_creates_files(self, temp_project_dir):
        """Test that finalizing a project creates all files."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # Generate preview
        prompt = "Create a mystery thriller"
        preview = assistant.generate_project(prompt)
        
        # Finalize
        project = assistant.finalize_project(preview.preview_id)
        
        # Check that files were created
        assert project.path.exists()
        assert (project.path / "project.json").exists()
        assert (project.path / "scenes.json").exists()
        assert (project.path / "characters.json").exists()
        assert (project.path / "sequences.json").exists()
        assert (project.path / "comfyui_config.json").exists()
    
    def test_finalize_project_returns_project_object(self, temp_project_dir):
        """Test that finalization returns a valid Project object."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        preview = assistant.generate_project("Create a story")
        project = assistant.finalize_project(preview.preview_id)
        
        assert isinstance(project, Project)
        assert project.name == preview.generated_project.name
        assert len(project.scenes) == len(preview.generated_project.scenes)
        assert len(project.characters) == len(preview.generated_project.characters)
    
    def test_finalize_project_removes_preview(self, temp_project_dir):
        """Test that preview is removed after finalization."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        preview = assistant.generate_project("Create a story")
        preview_id = preview.preview_id
        
        # Finalize
        assistant.finalize_project(preview_id)
        
        # Preview should be removed
        assert preview_id not in assistant.active_previews
    
    def test_finalize_nonexistent_preview_fails(self, temp_project_dir):
        """Test that finalizing a nonexistent preview fails."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        with pytest.raises(ResourceError):
            assistant.finalize_project("nonexistent-preview-id")


class TestProjectManagement:
    """Test project opening, closing, and management."""
    
    def test_open_project(self, temp_project_dir):
        """Test opening a finalized project."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # Create and finalize a project
        preview = assistant.generate_project("Create a story")
        project = assistant.finalize_project(preview.preview_id)
        project_name = project.name
        
        # Close it
        assistant.close_project()
        
        # Open it again
        opened_project = assistant.open_project(project_name)
        
        assert opened_project.name == project_name
        assert assistant.has_active_project()
    
    def test_close_project(self, temp_project_dir):
        """Test closing a project."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # Create and finalize a project
        preview = assistant.generate_project("Create a story")
        project = assistant.finalize_project(preview.preview_id)
        
        # Open it
        assistant.open_project(project.name)
        assert assistant.has_active_project()
        
        # Close it
        assistant.close_project()
        assert not assistant.has_active_project()
    
    def test_list_projects(self, temp_project_dir):
        """Test listing all projects."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # Create multiple projects
        preview1 = assistant.generate_project("Create story 1")
        project1 = assistant.finalize_project(preview1.preview_id)
        
        preview2 = assistant.generate_project("Create story 2")
        project2 = assistant.finalize_project(preview2.preview_id)
        
        # List projects
        projects = assistant.list_projects()
        
        assert len(projects) >= 2
        assert project1.name in projects
        assert project2.name in projects
    
    def test_get_active_project(self, temp_project_dir):
        """Test getting the active project."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # No active project initially
        assert assistant.get_active_project() is None
        
        # Create and open a project
        preview = assistant.generate_project("Create a story")
        project = assistant.finalize_project(preview.preview_id)
        assistant.open_project(project.name)
        
        # Should have active project
        active = assistant.get_active_project()
        assert active is not None
        assert active.name == project.name
    
    def test_get_storage_stats(self, temp_project_dir):
        """Test getting storage statistics."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        stats = assistant.get_storage_stats()
        
        assert stats is not None
        assert stats.total_gb >= 0
        assert stats.file_count >= 0
        assert stats.limit_gb == 50
        assert stats.file_limit == 248


class TestProjectModifications:
    """Test project modification operations."""
    
    def test_modify_scene(self, temp_project_dir):
        """Test modifying a scene."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # Create and open a project
        preview = assistant.generate_project("Create a story")
        project = assistant.finalize_project(preview.preview_id)
        assistant.open_project(project.name)
        
        # Modify a scene
        scene_id = project.scenes[0].id
        updates = {"title": "Modified Title"}
        assistant.modify_scene(scene_id, updates)
        
        # Verify modification
        active = assistant.get_active_project()
        modified_scene = next(s for s in active.scenes if s.id == scene_id)
        assert modified_scene.title == "Modified Title"
    
    def test_modify_character(self, temp_project_dir):
        """Test modifying a character."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # Create and open a project
        preview = assistant.generate_project("Create a story")
        project = assistant.finalize_project(preview.preview_id)
        assistant.open_project(project.name)
        
        # Modify a character
        char_id = project.characters[0].id
        updates = {"name": "Modified Name"}
        assistant.modify_character(char_id, updates)
        
        # Verify modification
        active = assistant.get_active_project()
        modified_char = next(c for c in active.characters if c.id == char_id)
        assert modified_char.name == "Modified Name"
    
    def test_add_scene(self, temp_project_dir):
        """Test adding a new scene."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # Create and open a project
        preview = assistant.generate_project("Create a story")
        project = assistant.finalize_project(preview.preview_id)
        assistant.open_project(project.name)
        
        initial_count = len(project.scenes)
        
        # Add a scene
        scene_data = {
            "id": "new_scene",
            "number": initial_count + 1,
            "title": "New Scene",
            "description": "A new scene",
            "location": "New Location",
            "time_of_day": "day",
            "duration": 3.0,
            "characters": [],
            "key_actions": []
        }
        assistant.add_scene(scene_data)
        
        # Verify addition
        active = assistant.get_active_project()
        assert len(active.scenes) == initial_count + 1
    
    def test_remove_scene_requires_confirmation(self, temp_project_dir):
        """Test that removing a scene requires confirmation."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # Create and open a project
        preview = assistant.generate_project("Create a story")
        project = assistant.finalize_project(preview.preview_id)
        assistant.open_project(project.name)
        
        scene_id = project.scenes[0].id
        
        # Should fail without confirmation
        with pytest.raises(ConfirmationRequiredError):
            assistant.remove_scene(scene_id, confirmed=False)


class TestCompleteWorkflow:
    """Test complete end-to-end workflows."""
    
    def test_complete_generation_to_modification_workflow(self, temp_project_dir):
        """Test complete workflow from generation to modification."""
        assistant = StoryCoreAssistant(temp_project_dir)
        
        # 1. Generate project
        prompt = "Create a cyberpunk thriller"
        preview = assistant.generate_project(prompt)
        assert preview is not None
        
        # 2. Review preview
        assert len(preview.generated_project.scenes) >= 3
        assert len(preview.generated_project.characters) >= 1
        assert preview.comfyui_config.ready_for_generation
        
        # 3. Finalize project
        project = assistant.finalize_project(preview.preview_id)
        assert project.path.exists()
        
        # 4. Open project
        assistant.open_project(project.name)
        assert assistant.has_active_project()
        
        # 5. Modify project
        scene_id = project.scenes[0].id
        assistant.modify_scene(scene_id, {"title": "Updated Title"})
        
        # 6. Close project
        assistant.close_project(save=True)
        assert not assistant.has_active_project()
        
        # 7. Reopen and verify changes persisted
        reopened = assistant.open_project(project.name)
        modified_scene = next(s for s in reopened.scenes if s.id == scene_id)
        assert modified_scene.title == "Updated Title"


@pytest.fixture
def temp_project_dir(tmp_path):
    """Create a temporary project directory for testing."""
    project_dir = tmp_path / "test_projects"
    project_dir.mkdir()
    return project_dir
