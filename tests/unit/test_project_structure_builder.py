"""
Unit tests for ProjectStructureBuilder.

Tests specific examples and edge cases for project structure creation.
"""

import pytest
import tempfile
import json
from pathlib import Path
from datetime import datetime
import uuid

from src.end_to_end.project_structure_builder import (
    ProjectStructureBuilder,
    ProjectStructure,
    StructureValidation
)
from src.end_to_end.data_models import (
    ProjectComponents,
    WorldConfig,
    Character,
    StoryStructure,
    DialogueScript,
    SequencePlan,
    MusicDescription,
    ProjectMetadata,
    ColorPalette,
    Act,
    EmotionalBeat,
    Sequence,
    Shot,
    PromptModules,
    MusicCue,
    DialogueScene
)


def create_minimal_components():
    """Create minimal valid project components for testing."""
    world_config = WorldConfig(
        world_id=str(uuid.uuid4()),
        name="Test World",
        genre="cyberpunk",
        setting="city",
        time_period="2048",
        visual_style=["cinematic"],
        color_palette=ColorPalette(
            primary="#FF0000",
            secondary="#00FF00",
            accent="#0000FF",
            background="#000000"
        ),
        lighting_style="dramatic",
        atmosphere="dark",
        key_locations=[]
    )
    
    character = Character(
        character_id=str(uuid.uuid4()),
        name="Test Character",
        role="protagonist",
        description="A test character",
        visual_description="Looks like a test",
        personality_traits=["brave", "smart"],
        relationships={}
    )
    
    act = Act(
        act_number=1,
        name="Act 1",
        description="First act",
        duration=60,
        scenes=["Scene 1", "Scene 2"]
    )
    
    story_structure = StoryStructure(
        story_id=str(uuid.uuid4()),
        title="Test Story",
        logline="A test story",
        acts=[act],
        themes=["adventure"],
        emotional_arc=[
            EmotionalBeat(
                beat_id=str(uuid.uuid4()),
                emotion="excitement",
                intensity=0.8,
                timestamp=0.0
            )
        ]
    )
    
    dialogue_script = DialogueScript(
        script_id=str(uuid.uuid4()),
        scenes=[],
        total_lines=0,
        estimated_duration=0
    )
    
    shot = Shot(
        shot_id=str(uuid.uuid4()),
        shot_number=1,
        duration=5,
        description="Opening shot",
        camera_angle="wide",
        camera_movement="static",
        lighting="natural",
        composition="centered",
        prompt_modules=PromptModules(
            base="Base prompt",
            style="Cinematic",
            lighting="Dramatic",
            composition="Rule of thirds",
            camera="Wide angle"
        )
    )
    
    sequence = Sequence(
        sequence_id=str(uuid.uuid4()),
        name="Opening Sequence",
        duration=60,
        shots=[shot],
        mood="tense",
        visual_direction="Dark and moody"
    )
    
    sequence_plan = SequencePlan(
        sequence_id=str(uuid.uuid4()),
        total_duration=60,
        sequences=[sequence],
        total_shots=1
    )
    
    music_description = MusicDescription(
        music_id=str(uuid.uuid4()),
        genre="electronic",
        mood=["tense", "mysterious"],
        tempo="medium",
        instruments=["synth", "drums"],
        sound_effects=[],
        timeline=[
            MusicCue(
                cue_id=str(uuid.uuid4()),
                timestamp=0.0,
                description="Music starts",
                intensity=0.5
            )
        ]
    )
    
    metadata = ProjectMetadata(
        project_id=str(uuid.uuid4()),
        project_name="test-project",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        version="1.0",
        video_type="trailer",
        duration_seconds=60,
        aspect_ratio="16:9",
        resolution="1920x1080",
        author="test"
    )
    
    return ProjectComponents(
        world_config=world_config,
        characters=[character],
        story_structure=story_structure,
        dialogue_script=dialogue_script,
        sequence_plan=sequence_plan,
        music_description=music_description,
        metadata=metadata
    )


class TestProjectStructureBuilderDirectoryCreation:
    """Test directory creation functionality."""
    
    def test_creates_project_root_directory(self):
        """Test that project root directory is created."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.project_path.exists()
            assert structure.project_path.is_dir()
    
    def test_creates_assets_subdirectories(self):
        """Test that assets subdirectories are created."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.assets_images_path.exists()
            assert structure.assets_audio_path.exists()
            assert structure.assets_images_path.is_dir()
            assert structure.assets_audio_path.is_dir()
    
    def test_creates_exports_directory(self):
        """Test that exports directory is created."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.exports_path.exists()
            assert structure.exports_path.is_dir()
    
    def test_handles_existing_directory(self):
        """Test that existing directories don't cause errors."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            # Create project first time
            structure1 = builder.create_project_structure("test-project", components)
            
            # Create again - should not fail
            structure2 = builder.create_project_structure("test-project", components)
            
            assert structure1.project_path == structure2.project_path


class TestProjectStructureBuilderFileSaving:
    """Test file saving functionality."""
    
    def test_saves_project_json(self):
        """Test that project.json is saved correctly."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.project_json_path.exists()
            
            with open(structure.project_json_path, 'r') as f:
                data = json.load(f)
            
            assert data["schema_version"] == "1.0"
            assert data["project_name"] == "test-project"
            assert "project_id" in data
            assert "capabilities" in data
    
    def test_saves_world_config_json(self):
        """Test that world_config.json is saved correctly."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.world_config_path.exists()
            
            with open(structure.world_config_path, 'r') as f:
                data = json.load(f)
            
            assert data["world_id"] == components.world_config.world_id
            assert data["genre"] == "cyberpunk"
    
    def test_saves_characters_json(self):
        """Test that characters.json is saved correctly."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.characters_path.exists()
            
            with open(structure.characters_path, 'r') as f:
                data = json.load(f)
            
            assert "characters" in data
            assert len(data["characters"]) == 1
            assert data["characters"][0]["name"] == "Test Character"
    
    def test_saves_story_structure_json(self):
        """Test that story_structure.json is saved correctly."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.story_structure_path.exists()
            
            with open(structure.story_structure_path, 'r') as f:
                data = json.load(f)
            
            assert data["story_id"] == components.story_structure.story_id
            assert data["title"] == "Test Story"
    
    def test_saves_sequence_plan_json(self):
        """Test that sequence_plan.json is saved correctly."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.sequence_plan_path.exists()
            
            with open(structure.sequence_plan_path, 'r') as f:
                data = json.load(f)
            
            assert data["sequence_id"] == components.sequence_plan.sequence_id
            assert data["total_shots"] == 1
    
    def test_saves_music_description_json(self):
        """Test that music_description.json is saved correctly."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.music_description_path.exists()
            
            with open(structure.music_description_path, 'r') as f:
                data = json.load(f)
            
            assert data["music_id"] == components.music_description.music_id
            assert data["genre"] == "electronic"
    
    def test_does_not_save_dialogue_script_when_empty(self):
        """Test that dialogue_script.json is not saved when no dialogues exist."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            # Ensure dialogue script is empty
            components.dialogue_script.scenes = []
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.dialogue_script_path is None
    
    def test_saves_dialogue_script_when_present(self):
        """Test that dialogue_script.json is saved when dialogues exist."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            # Add dialogue scene
            components.dialogue_script.scenes = [
                DialogueScene(
                    scene_id=str(uuid.uuid4()),
                    scene_name="Scene 1",
                    location="City",
                    time="Night",
                    characters_present=["Test Character"],
                    dialogue_lines=[],
                    action_notes=[]
                )
            ]
            
            structure = builder.create_project_structure("test-project", components)
            
            assert structure.dialogue_script_path is not None
            assert structure.dialogue_script_path.exists()


class TestProjectStructureBuilderValidation:
    """Test structure validation functionality."""
    
    def test_validates_complete_structure(self):
        """Test that complete structure passes validation."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            validation = builder.validate_structure(structure.project_path)
            
            assert validation.valid
            assert len(validation.missing_directories) == 0
            assert len(validation.missing_files) == 0
            assert len(validation.errors) == 0
    
    def test_detects_missing_directories(self):
        """Test that missing directories are detected."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            # Remove a directory
            import shutil
            shutil.rmtree(structure.assets_images_path)
            
            validation = builder.validate_structure(structure.project_path)
            
            assert not validation.valid
            assert "assets/images" in validation.missing_directories
    
    def test_detects_missing_files(self):
        """Test that missing files are detected."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            # Remove a file
            structure.project_json_path.unlink()
            
            validation = builder.validate_structure(structure.project_path)
            
            assert not validation.valid
            assert "project.json" in validation.missing_files
    
    def test_detects_nonexistent_project(self):
        """Test that nonexistent project is detected."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            
            nonexistent_path = Path(temp_dir) / "nonexistent"
            validation = builder.validate_structure(nonexistent_path)
            
            assert not validation.valid
            assert len(validation.errors) > 0


class TestProjectStructureBuilderErrorHandling:
    """Test error handling for file system issues."""
    
    def test_rejects_invalid_project_name(self):
        """Test that invalid project names are rejected."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            # Test with invalid characters
            with pytest.raises(ValueError):
                builder.create_project_structure("test<>project", components)
    
    def test_rejects_empty_project_name(self):
        """Test that empty project name is rejected."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            with pytest.raises(ValueError):
                builder.create_project_structure("", components)
    
    def test_rejects_reserved_names(self):
        """Test that reserved names are rejected (Windows)."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            with pytest.raises(ValueError):
                builder.create_project_structure("CON", components)
    
    def test_save_all_components_returns_false_on_error(self):
        """Test that save_all_components returns False on error."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            # Try to save to a nonexistent directory
            nonexistent_path = Path(temp_dir) / "nonexistent"
            success = builder.save_all_components(nonexistent_path, components)
            
            assert not success


class TestProjectStructureBuilderEdgeCases:
    """Test edge cases and special scenarios."""
    
    def test_handles_long_project_name(self):
        """Test that long project names are handled."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            long_name = "a" * 50  # 50 characters
            structure = builder.create_project_structure(long_name, components)
            
            assert structure.project_path.exists()
    
    def test_handles_project_name_with_hyphens(self):
        """Test that project names with hyphens are handled."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project-name", components)
            
            assert structure.project_path.exists()
    
    def test_handles_project_name_with_numbers(self):
        """Test that project names with numbers are handled."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project-123", components)
            
            assert structure.project_path.exists()
    
    def test_json_files_are_utf8_encoded(self):
        """Test that JSON files are UTF-8 encoded."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            # Read file as bytes and verify UTF-8
            with open(structure.project_json_path, 'rb') as f:
                content = f.read()
                # Should decode without error
                content.decode('utf-8')
    
    def test_json_files_are_formatted(self):
        """Test that JSON files are properly formatted."""
        with tempfile.TemporaryDirectory() as temp_dir:
            builder = ProjectStructureBuilder(temp_dir)
            components = create_minimal_components()
            
            structure = builder.create_project_structure("test-project", components)
            
            # Read file and verify it's formatted (has indentation)
            with open(structure.project_json_path, 'r') as f:
                content = f.read()
                # Formatted JSON should have newlines and spaces
                assert '\n' in content
                assert '  ' in content  # 2-space indentation
