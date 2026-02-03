"""
Integration tests for Storyboard and Timeline API endpoints.

Tests all 8 storyboard endpoints:
- storycore.storyboard.create
- storycore.storyboard.validate
- storycore.storyboard.export
- storycore.storyboard.shot.add
- storycore.storyboard.shot.update
- storycore.storyboard.shot.delete
- storycore.storyboard.shot.reorder
- storycore.storyboard.timeline.generate
"""

import pytest
import json
from pathlib import Path
from datetime import datetime

from src.api.categories.storyboard import StoryboardCategoryHandler
from src.api.models import RequestContext, ErrorCodes
from src.api.config import APIConfig
from src.api.router import APIRouter


@pytest.fixture
def api_config():
    """Create API configuration for testing."""
    return APIConfig(
        version="v1",
        log_api_calls=True,
        log_sanitize_params=False,
    )


@pytest.fixture
def router(api_config):
    """Create API router for testing."""
    return APIRouter(api_config)


@pytest.fixture
def storyboard_handler(api_config, router):
    """Create storyboard handler for testing."""
    return StoryboardCategoryHandler(api_config, router)


@pytest.fixture
def request_context():
    """Create request context for testing."""
    return RequestContext(
        endpoint="test",
        method="POST",
    )


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project directory."""
    project_name = "test-storyboard-project"
    project_path = tmp_path / project_name
    project_path.mkdir()
    
    # Create project.json
    project_data = {
        "schema_version": "1.0",
        "project_name": project_name,
        "storyboard": {"shots": []},
    }
    with open(project_path / "project.json", "w") as f:
        json.dump(project_data, f, indent=2)
    
    return {
        "name": project_name,
        "path": project_path,
        "base_path": str(tmp_path),
    }


class TestStoryboardLifecycle:
    """Test storyboard lifecycle endpoints."""
    
    def test_create_storyboard_basic(self, storyboard_handler, request_context, temp_project):
        """Test basic storyboard creation."""
        params = {
            "project_name": temp_project["name"],
            "title": "Test Storyboard",
            "description": "A test storyboard",
            "base_path": temp_project["base_path"],
        }
        
        response = storyboard_handler.create(params, request_context)
        
        assert response.status == "success"
        assert response.data["project_name"] == temp_project["name"]
        assert response.data["title"] == "Test Storyboard"
        assert response.data["total_shots"] == 0
        assert "storyboard_id" in response.data
    
    def test_create_storyboard_with_auto_generation(self, storyboard_handler, request_context, temp_project):
        """Test storyboard creation with auto-generated shots."""
        params = {
            "project_name": temp_project["name"],
            "title": "Auto-Generated Storyboard",
            "auto_generate_shots": True,
            "num_shots": 3,
            "scene_data": {"description": "Action scene"},
            "base_path": temp_project["base_path"],
        }
        
        response = storyboard_handler.create(params, request_context)
        
        assert response.status == "success"
        assert response.data["total_shots"] == 3
        assert response.data["total_duration_seconds"] > 0
    
    def test_create_storyboard_duplicate(self, storyboard_handler, request_context, temp_project):
        """Test that creating duplicate storyboard fails."""
        params = {
            "project_name": temp_project["name"],
            "title": "Test Storyboard",
            "base_path": temp_project["base_path"],
        }
        
        # Create first storyboard
        response1 = storyboard_handler.create(params, request_context)
        assert response1.status == "success"
        
        # Try to create second storyboard for same project
        response2 = storyboard_handler.create(params, request_context)
        assert response2.status == "error"
        assert response2.error.code == ErrorCodes.CONFLICT
    
    def test_validate_storyboard_empty(self, storyboard_handler, request_context, temp_project):
        """Test validation of empty storyboard."""
        # Create storyboard
        create_params = {
            "project_name": temp_project["name"],
            "title": "Empty Storyboard",
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Validate
        validate_params = {
            "storyboard_id": storyboard_id,
        }
        response = storyboard_handler.validate(validate_params, request_context)
        
        assert response.status == "success"
        assert response.data["valid"] is False
        assert response.data["errors"] > 0
        assert any("no shots" in issue["message"].lower() for issue in response.data["issues"])
    
    def test_validate_storyboard_with_shots(self, storyboard_handler, request_context, temp_project):
        """Test validation of storyboard with valid shots."""
        # Create storyboard with shots
        create_params = {
            "project_name": temp_project["name"],
            "title": "Valid Storyboard",
            "auto_generate_shots": True,
            "num_shots": 3,
            "scene_data": {"description": "Test scene"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Validate
        validate_params = {
            "storyboard_id": storyboard_id,
        }
        response = storyboard_handler.validate(validate_params, request_context)
        
        assert response.status == "success"
        assert response.data["valid"] is True
        assert response.data["errors"] == 0
    
    def test_export_storyboard_json(self, storyboard_handler, request_context, temp_project):
        """Test exporting storyboard as JSON."""
        # Create storyboard with shots
        create_params = {
            "project_name": temp_project["name"],
            "title": "Export Test",
            "auto_generate_shots": True,
            "num_shots": 2,
            "scene_data": {"description": "Test scene"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Export
        export_params = {
            "storyboard_id": storyboard_id,
            "format": "json",
            "base_path": temp_project["base_path"],
            "project_name": temp_project["name"],
        }
        response = storyboard_handler.export(export_params, request_context)
        
        assert response.status == "success"
        assert response.data["format"] == "json"
        assert response.data["file_size_bytes"] > 0
        assert Path(response.data["output_path"]).exists()
    
    def test_export_storyboard_html(self, storyboard_handler, request_context, temp_project):
        """Test exporting storyboard as HTML."""
        # Create storyboard
        create_params = {
            "project_name": temp_project["name"],
            "title": "HTML Export Test",
            "auto_generate_shots": True,
            "num_shots": 2,
            "scene_data": {"description": "Test scene"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Export
        export_params = {
            "storyboard_id": storyboard_id,
            "format": "html",
            "base_path": temp_project["base_path"],
            "project_name": temp_project["name"],
        }
        response = storyboard_handler.export(export_params, request_context)
        
        assert response.status == "success"
        assert response.data["format"] == "html"
        assert Path(response.data["output_path"]).exists()
    
    def test_export_storyboard_invalid_format(self, storyboard_handler, request_context, temp_project):
        """Test exporting with invalid format."""
        # Create storyboard
        create_params = {
            "project_name": temp_project["name"],
            "title": "Test",
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Try invalid format
        export_params = {
            "storyboard_id": storyboard_id,
            "format": "invalid_format",
        }
        response = storyboard_handler.export(export_params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR


class TestShotManagement:
    """Test shot management endpoints."""
    
    def test_add_shot(self, storyboard_handler, request_context, temp_project):
        """Test adding a shot to storyboard."""
        # Create storyboard
        create_params = {
            "project_name": temp_project["name"],
            "title": "Shot Test",
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Add shot
        add_params = {
            "storyboard_id": storyboard_id,
            "description": "Opening shot",
            "duration_seconds": 5.0,
            "camera_angle": "wide",
            "camera_movement": "pan_right",
            "base_path": temp_project["base_path"],
        }
        response = storyboard_handler.shot_add(add_params, request_context)
        
        assert response.status == "success"
        assert response.data["storyboard_id"] == storyboard_id
        assert response.data["sequence_number"] == 0
        assert response.data["total_shots"] == 1
    
    def test_add_shot_invalid_duration(self, storyboard_handler, request_context, temp_project):
        """Test adding shot with invalid duration."""
        # Create storyboard
        create_params = {
            "project_name": temp_project["name"],
            "title": "Test",
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Try to add shot with negative duration
        add_params = {
            "storyboard_id": storyboard_id,
            "description": "Invalid shot",
            "duration_seconds": -1.0,
        }
        response = storyboard_handler.shot_add(add_params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
    
    def test_update_shot(self, storyboard_handler, request_context, temp_project):
        """Test updating an existing shot."""
        # Create storyboard with shot
        create_params = {
            "project_name": temp_project["name"],
            "title": "Update Test",
            "auto_generate_shots": True,
            "num_shots": 1,
            "scene_data": {"description": "Test"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Get shot ID
        storyboard = storyboard_handler._get_storyboard(storyboard_id)
        shot_id = storyboard.shots[0].shot_id
        
        # Update shot
        update_params = {
            "storyboard_id": storyboard_id,
            "shot_id": shot_id,
            "description": "Updated description",
            "duration_seconds": 10.0,
            "camera_angle": "close_up",
            "base_path": temp_project["base_path"],
        }
        response = storyboard_handler.shot_update(update_params, request_context)
        
        assert response.status == "success"
        assert "description" in response.data["updated_fields"]
        assert "duration_seconds" in response.data["updated_fields"]
        assert "camera_angle" in response.data["updated_fields"]
    
    def test_delete_shot(self, storyboard_handler, request_context, temp_project):
        """Test deleting a shot."""
        # Create storyboard with shots
        create_params = {
            "project_name": temp_project["name"],
            "title": "Delete Test",
            "auto_generate_shots": True,
            "num_shots": 3,
            "scene_data": {"description": "Test"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Get shot ID
        storyboard = storyboard_handler._get_storyboard(storyboard_id)
        shot_id = storyboard.shots[1].shot_id  # Delete middle shot
        
        # Delete shot
        delete_params = {
            "storyboard_id": storyboard_id,
            "shot_id": shot_id,
            "base_path": temp_project["base_path"],
        }
        response = storyboard_handler.shot_delete(delete_params, request_context)
        
        assert response.status == "success"
        assert response.data["deleted"] is True
        assert response.data["remaining_shots"] == 2
    
    def test_reorder_shots(self, storyboard_handler, request_context, temp_project):
        """Test reordering shots."""
        # Create storyboard with shots
        create_params = {
            "project_name": temp_project["name"],
            "title": "Reorder Test",
            "auto_generate_shots": True,
            "num_shots": 3,
            "scene_data": {"description": "Test"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Get shot IDs
        storyboard = storyboard_handler._get_storyboard(storyboard_id)
        shot_ids = [shot.shot_id for shot in storyboard.shots]
        
        # Reverse order
        new_order = list(reversed(shot_ids))
        
        # Reorder
        reorder_params = {
            "storyboard_id": storyboard_id,
            "shot_order": new_order,
            "base_path": temp_project["base_path"],
        }
        response = storyboard_handler.shot_reorder(reorder_params, request_context)
        
        assert response.status == "success"
        assert response.data["reordered_count"] == 3
        assert [s["shot_id"] for s in response.data["new_sequence"]] == new_order
    
    def test_reorder_shots_invalid(self, storyboard_handler, request_context, temp_project):
        """Test reordering with invalid shot list."""
        # Create storyboard
        create_params = {
            "project_name": temp_project["name"],
            "title": "Test",
            "auto_generate_shots": True,
            "num_shots": 2,
            "scene_data": {"description": "Test"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Try to reorder with missing shot
        reorder_params = {
            "storyboard_id": storyboard_id,
            "shot_order": ["shot_001"],  # Missing shot_002
        }
        response = storyboard_handler.shot_reorder(reorder_params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR


class TestTimeline:
    """Test timeline generation endpoint."""
    
    def test_generate_timeline_basic(self, storyboard_handler, request_context, temp_project):
        """Test basic timeline generation."""
        # Create storyboard with shots
        create_params = {
            "project_name": temp_project["name"],
            "title": "Timeline Test",
            "auto_generate_shots": True,
            "num_shots": 3,
            "scene_data": {"description": "Test"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Generate timeline
        timeline_params = {
            "storyboard_id": storyboard_id,
        }
        response = storyboard_handler.timeline_generate(timeline_params, request_context)
        
        assert response.status == "success"
        assert response.data["storyboard_id"] == storyboard_id
        assert len(response.data["timeline"]["entries"]) == 3
        assert response.data["timeline"]["total_shots"] == 3
        assert response.data["timeline"]["total_duration_seconds"] > 0
    
    def test_generate_timeline_with_transitions(self, storyboard_handler, request_context, temp_project):
        """Test timeline generation with transitions."""
        # Create storyboard
        create_params = {
            "project_name": temp_project["name"],
            "title": "Transition Test",
            "auto_generate_shots": True,
            "num_shots": 2,
            "scene_data": {"description": "Test"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Generate timeline with transitions
        timeline_params = {
            "storyboard_id": storyboard_id,
            "include_transitions": True,
            "transition_duration_seconds": 0.5,
        }
        response = storyboard_handler.timeline_generate(timeline_params, request_context)
        
        assert response.status == "success"
        # Should have 2 shots + 1 transition (between shots)
        assert len(response.data["timeline"]["entries"]) == 3
        
        # Check that transition entry exists
        entries = response.data["timeline"]["entries"]
        transition_entries = [e for e in entries if "transition" in e["shot_id"]]
        assert len(transition_entries) == 1
    
    def test_generate_timeline_timing(self, storyboard_handler, request_context, temp_project):
        """Test that timeline timing is correct."""
        # Create storyboard
        create_params = {
            "project_name": temp_project["name"],
            "title": "Timing Test",
            "auto_generate_shots": True,
            "num_shots": 3,
            "scene_data": {"description": "Test"},
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        storyboard_id = create_response.data["storyboard_id"]
        
        # Generate timeline
        timeline_params = {
            "storyboard_id": storyboard_id,
        }
        response = storyboard_handler.timeline_generate(timeline_params, request_context)
        
        # Verify timing
        entries = response.data["timeline"]["entries"]
        
        # First entry should start at 0
        assert entries[0]["start_time_seconds"] == 0.0
        
        # Each entry's end time should equal next entry's start time
        for i in range(len(entries) - 1):
            assert entries[i]["end_time_seconds"] == entries[i+1]["start_time_seconds"]
        
        # Last entry's end time should equal total duration
        assert entries[-1]["end_time_seconds"] == response.data["timeline"]["total_duration_seconds"]


class TestEndToEndWorkflow:
    """Test complete end-to-end storyboard workflow."""
    
    def test_complete_storyboard_workflow(self, storyboard_handler, request_context, temp_project):
        """Test complete workflow: create, add shots, update, validate, export, timeline."""
        # 1. Create storyboard
        create_params = {
            "project_name": temp_project["name"],
            "title": "Complete Workflow Test",
            "description": "Testing complete workflow",
            "base_path": temp_project["base_path"],
        }
        create_response = storyboard_handler.create(create_params, request_context)
        assert create_response.status == "success"
        storyboard_id = create_response.data["storyboard_id"]
        
        # 2. Add shots
        for i in range(3):
            add_params = {
                "storyboard_id": storyboard_id,
                "description": f"Shot {i+1} description",
                "duration_seconds": 3.0 + i,
                "camera_angle": "medium",
                "base_path": temp_project["base_path"],
            }
            add_response = storyboard_handler.shot_add(add_params, request_context)
            assert add_response.status == "success"
        
        # 3. Update a shot
        storyboard = storyboard_handler._get_storyboard(storyboard_id)
        shot_id = storyboard.shots[1].shot_id
        update_params = {
            "storyboard_id": storyboard_id,
            "shot_id": shot_id,
            "description": "Updated shot description",
            "duration_seconds": 5.0,
            "base_path": temp_project["base_path"],
        }
        update_response = storyboard_handler.shot_update(update_params, request_context)
        assert update_response.status == "success"
        
        # 4. Validate storyboard
        validate_params = {
            "storyboard_id": storyboard_id,
        }
        validate_response = storyboard_handler.validate(validate_params, request_context)
        assert validate_response.status == "success"
        assert validate_response.data["valid"] is True
        
        # 5. Generate timeline
        timeline_params = {
            "storyboard_id": storyboard_id,
            "include_transitions": True,
        }
        timeline_response = storyboard_handler.timeline_generate(timeline_params, request_context)
        assert timeline_response.status == "success"
        assert len(timeline_response.data["timeline"]["entries"]) > 3  # Shots + transitions
        
        # 6. Export storyboard
        export_params = {
            "storyboard_id": storyboard_id,
            "format": "json",
            "base_path": temp_project["base_path"],
            "project_name": temp_project["name"],
        }
        export_response = storyboard_handler.export(export_params, request_context)
        assert export_response.status == "success"
        assert Path(export_response.data["output_path"]).exists()
