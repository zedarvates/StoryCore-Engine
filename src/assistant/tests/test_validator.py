"""
Unit tests for DataContractValidator.

Tests specific edge cases and error conditions for validation.
"""

import pytest
from pathlib import Path
from datetime import datetime
import tempfile

from src.assistant.validator import DataContractValidator, ValidationResult
from src.assistant.models import (
    Project, ProjectMetadata, Scene, Character, Sequence, Shot
)


class TestDataContractValidator:
    """Test suite for DataContractValidator"""
    
    def test_missing_required_fields(self):
        """Test validation fails when required fields are missing"""
        # Create project with missing project_name
        metadata = ProjectMetadata(
            schema_version="1.0",
            project_name="",  # Empty project name
            capabilities={
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            generation_status={
                "grid": "pending",
                "promotion": "pending"
            }
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Project(
                name="",  # Empty name
                path=Path(temp_dir) / "test_project",
                metadata=metadata,
                scenes=[],
                characters=[],
                sequences=[],
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            validator = DataContractValidator()
            result = validator.validate_project(project)
            
            assert not result.valid
            assert any("project_name" in err.lower() for err in result.errors)
            assert any("project name" in err.lower() for err in result.errors)
    
    def test_invalid_status_values(self):
        """Test validation fails with invalid status values"""
        metadata = ProjectMetadata(
            schema_version="1.0",
            project_name="Test Project",
            capabilities={
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            generation_status={
                "grid": "invalid_status",  # Invalid
                "promotion": "also_invalid"  # Invalid
            }
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Project(
                name="test_project",
                path=Path(temp_dir) / "test_project",
                metadata=metadata,
                scenes=[],
                characters=[],
                sequences=[],
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            validator = DataContractValidator()
            result = validator.validate_project(project)
            
            assert not result.valid
            assert len([e for e in result.errors if "invalid status" in e.lower()]) == 2
    
    def test_incorrect_schema_version(self):
        """Test validation fails with incorrect schema version"""
        metadata = ProjectMetadata(
            schema_version="2.0",  # Wrong version
            project_name="Test Project",
            capabilities={
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            generation_status={
                "grid": "pending",
                "promotion": "pending"
            }
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Project(
                name="test_project",
                path=Path(temp_dir) / "test_project",
                metadata=metadata,
                scenes=[],
                characters=[],
                sequences=[],
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            validator = DataContractValidator()
            result = validator.validate_project(project)
            
            assert not result.valid
            assert any("schema version" in err.lower() for err in result.errors)
    
    def test_scene_missing_required_fields(self):
        """Test validation fails when scene is missing required fields"""
        scene = Scene(
            id="",  # Missing id
            number=1,
            title="",  # Missing title
            description="",  # Missing description
            location="",  # Missing location
            time_of_day="",  # Missing time_of_day
            duration=-1.0,  # Invalid duration
            characters=[],
            key_actions=[],
            visual_notes=None
        )
        
        metadata = ProjectMetadata(
            schema_version="1.0",
            project_name="Test Project",
            capabilities={
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            generation_status={
                "grid": "pending",
                "promotion": "pending"
            }
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Project(
                name="test_project",
                path=Path(temp_dir) / "test_project",
                metadata=metadata,
                scenes=[scene],
                characters=[],
                sequences=[],
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            validator = DataContractValidator()
            result = validator.validate_project(project)
            
            assert not result.valid
            # Should have errors for missing id, title, description, location, time_of_day, and invalid duration
            assert len(result.errors) >= 6
    
    def test_character_missing_required_fields(self):
        """Test validation fails when character is missing required fields"""
        character = Character(
            id="",  # Missing id
            name="",  # Missing name
            role="",  # Missing role
            description="",  # Missing description
            appearance="",  # Missing appearance
            personality="",  # Missing personality
            visual_reference=None
        )
        
        metadata = ProjectMetadata(
            schema_version="1.0",
            project_name="Test Project",
            capabilities={
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            generation_status={
                "grid": "pending",
                "promotion": "pending"
            }
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Project(
                name="test_project",
                path=Path(temp_dir) / "test_project",
                metadata=metadata,
                scenes=[],
                characters=[character],
                sequences=[],
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            validator = DataContractValidator()
            result = validator.validate_project(project)
            
            assert not result.valid
            # Should have errors for missing id, name, role, description, appearance, personality
            assert len(result.errors) >= 6
    
    def test_shot_invalid_type_and_camera_movement(self):
        """Test validation fails with invalid shot type and camera movement"""
        shot = Shot(
            id="shot_1",
            number=1,
            type="invalid_type",  # Invalid
            camera_movement="invalid_movement",  # Invalid
            duration=3.0,
            description="Shot description",
            visual_style="cinematic"
        )
        
        sequence = Sequence(
            id="seq_1",
            scene_id="scene_1",
            shots=[shot],
            total_duration=3.0
        )
        
        scene = Scene(
            id="scene_1",
            number=1,
            title="Scene 1",
            description="Description",
            location="Location",
            time_of_day="morning",
            duration=3.0,
            characters=[],
            key_actions=[],
            visual_notes=None
        )
        
        metadata = ProjectMetadata(
            schema_version="1.0",
            project_name="Test Project",
            capabilities={
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            generation_status={
                "grid": "pending",
                "promotion": "pending"
            }
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Project(
                name="test_project",
                path=Path(temp_dir) / "test_project",
                metadata=metadata,
                scenes=[scene],
                characters=[],
                sequences=[sequence],
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            validator = DataContractValidator()
            result = validator.validate_project(project)
            
            assert not result.valid
            assert any("invalid type" in err.lower() for err in result.errors)
            assert any("invalid camera_movement" in err.lower() for err in result.errors)
    
    def test_sequence_shot_duration_mismatch(self):
        """Test validation fails when shot durations don't match sequence total"""
        shots = [
            Shot(
                id="shot_1",
                number=1,
                type="medium",
                camera_movement="static",
                duration=1.0,
                description="Shot 1",
                visual_style="cinematic"
            ),
            Shot(
                id="shot_2",
                number=2,
                type="medium",
                camera_movement="static",
                duration=1.0,
                description="Shot 2",
                visual_style="cinematic"
            )
        ]
        
        sequence = Sequence(
            id="seq_1",
            scene_id="scene_1",
            shots=shots,
            total_duration=5.0  # Mismatch: shots sum to 2.0, but total is 5.0
        )
        
        scene = Scene(
            id="scene_1",
            number=1,
            title="Scene 1",
            description="Description",
            location="Location",
            time_of_day="morning",
            duration=3.0,
            characters=[],
            key_actions=[],
            visual_notes=None
        )
        
        metadata = ProjectMetadata(
            schema_version="1.0",
            project_name="Test Project",
            capabilities={
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            generation_status={
                "grid": "pending",
                "promotion": "pending"
            }
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Project(
                name="test_project",
                path=Path(temp_dir) / "test_project",
                metadata=metadata,
                scenes=[scene],
                characters=[],
                sequences=[sequence],
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            validator = DataContractValidator()
            result = validator.validate_project(project)
            
            assert not result.valid
            assert any("don't match total_duration" in err for err in result.errors)
    
    def test_sequence_references_nonexistent_scene(self):
        """Test validation fails when sequence references non-existent scene"""
        shot = Shot(
            id="shot_1",
            number=1,
            type="medium",
            camera_movement="static",
            duration=3.0,
            description="Shot description",
            visual_style="cinematic"
        )
        
        sequence = Sequence(
            id="seq_1",
            scene_id="nonexistent_scene",  # References non-existent scene
            shots=[shot],
            total_duration=3.0
        )
        
        scene = Scene(
            id="scene_1",  # Different ID
            number=1,
            title="Scene 1",
            description="Description",
            location="Location",
            time_of_day="morning",
            duration=3.0,
            characters=[],
            key_actions=[],
            visual_notes=None
        )
        
        metadata = ProjectMetadata(
            schema_version="1.0",
            project_name="Test Project",
            capabilities={
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            generation_status={
                "grid": "pending",
                "promotion": "pending"
            }
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Project(
                name="test_project",
                path=Path(temp_dir) / "test_project",
                metadata=metadata,
                scenes=[scene],
                characters=[],
                sequences=[sequence],
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            validator = DataContractValidator()
            result = validator.validate_project(project)
            
            assert not result.valid
            assert any("non-existent scene" in err.lower() for err in result.errors)
    
    def test_missing_capabilities_generates_warnings(self):
        """Test that missing capabilities generate warnings"""
        metadata = ProjectMetadata(
            schema_version="1.0",
            project_name="Test Project",
            capabilities={
                # Missing some required capabilities
                "grid_generation": True
            },
            generation_status={
                "grid": "pending",
                "promotion": "pending"
            }
        )
        
        scene = Scene(
            id="scene_1",
            number=1,
            title="Scene 1",
            description="Description",
            location="Location",
            time_of_day="morning",
            duration=3.0,
            characters=[],
            key_actions=[],
            visual_notes=None
        )
        
        with tempfile.TemporaryDirectory() as temp_dir:
            project = Project(
                name="test_project",
                path=Path(temp_dir) / "test_project",
                metadata=metadata,
                scenes=[scene],
                characters=[],
                sequences=[],
                created_at=datetime.now(),
                modified_at=datetime.now()
            )
            
            validator = DataContractValidator()
            result = validator.validate_project(project)
            
            # Should have warnings for missing capabilities
            assert len(result.warnings) >= 3  # Missing 3 capabilities
            assert any("capability" in warn.lower() for warn in result.warnings)
