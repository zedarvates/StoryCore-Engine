"""
Tests for Pipeline API Category

This module tests the pipeline category handler endpoints.
"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext
from src.api.categories.pipeline import PipelineCategoryHandler


@pytest.fixture
def api_config():
    """Create test API configuration."""
    return APIConfig(
        version="v1",
        host="localhost",
        port=8000,
        enable_auth=False,
        enable_rate_limiting=False,
        log_api_calls=True,
    )


@pytest.fixture
def router(api_config):
    """Create test router."""
    return APIRouter(api_config)


@pytest.fixture
def pipeline_handler(api_config, router):
    """Create pipeline handler instance."""
    return PipelineCategoryHandler(api_config, router)


@pytest.fixture
def temp_dir():
    """Create temporary directory for test projects."""
    temp_path = tempfile.mkdtemp()
    yield temp_path
    # Cleanup
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def request_context():
    """Create test request context."""
    return RequestContext(
        request_id="test-request-123",
        user=None,
    )


class TestProjectLifecycle:
    """Test project lifecycle endpoints."""
    
    def test_init_project(self, pipeline_handler, temp_dir, request_context):
        """Test project initialization."""
        params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        
        response = pipeline_handler.init_project(params, request_context)
        
        assert response.status == "success"
        assert response.data["project_name"] == "test-project"
        assert "project_id" in response.data
        assert "global_seed" in response.data
        assert "capabilities" in response.data
        
        # Verify project was created
        project_path = Path(temp_dir) / "test-project"
        assert project_path.exists()
        assert (project_path / "project.json").exists()
        assert (project_path / "storyboard.json").exists()
    
    def test_init_project_duplicate(self, pipeline_handler, temp_dir, request_context):
        """Test that initializing duplicate project fails."""
        params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        
        # First init should succeed
        response1 = pipeline_handler.init_project(params, request_context)
        assert response1.status == "success"
        
        # Second init should fail
        response2 = pipeline_handler.init_project(params, request_context)
        assert response2.status == "error"
        assert response2.error.code == "CONFLICT"
    
    def test_validate_project(self, pipeline_handler, temp_dir, request_context):
        """Test project validation."""
        # First create a project
        init_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        pipeline_handler.init_project(init_params, request_context)
        
        # Now validate it
        validate_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        
        response = pipeline_handler.validate_project(validate_params, request_context)
        
        assert response.status == "success"
        assert response.data["valid"] is True
        assert response.data["data_contract_compliant"] is True
        assert len(response.data["missing_fields"]) == 0
    
    def test_get_status(self, pipeline_handler, temp_dir, request_context):
        """Test getting pipeline status."""
        # First create a project
        init_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        pipeline_handler.init_project(init_params, request_context)
        
        # Get status
        status_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        
        response = pipeline_handler.get_status(status_params, request_context)
        
        assert response.status == "success"
        assert response.data["project_name"] == "test-project"
        assert "current_stage" in response.data
        assert "current_phase" in response.data
        assert "progress" in response.data
        assert isinstance(response.data["progress"], float)


class TestPipelineExecution:
    """Test pipeline execution endpoints."""
    
    def test_execute_pipeline_async(self, pipeline_handler, temp_dir, request_context):
        """Test async pipeline execution."""
        # First create a project
        init_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        pipeline_handler.init_project(init_params, request_context)
        
        # Execute pipeline (include init since grid depends on it)
        exec_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
            "stages": ["init", "grid", "promote"],
            "async_mode": True,
        }
        
        response = pipeline_handler.execute_pipeline(exec_params, request_context)
        
        # Debug output
        if response.status == "error":
            print(f"Error: {response.error.code} - {response.error.message}")
            if response.error.details:
                print(f"Details: {response.error.details}")
        
        assert response.status == "pending"
        assert "task_id" in response.data
        assert response.data["execution_mode"] == "async"
    
    def test_execute_pipeline_invalid_stage(self, pipeline_handler, temp_dir, request_context):
        """Test pipeline execution with invalid stage."""
        # First create a project
        init_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        pipeline_handler.init_project(init_params, request_context)
        
        # Execute with invalid stage
        exec_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
            "stages": ["invalid_stage"],
        }
        
        response = pipeline_handler.execute_pipeline(exec_params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_pause_resume_cancel(self, pipeline_handler, temp_dir, request_context):
        """Test pause, resume, and cancel operations."""
        # First create a project and start execution
        init_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        pipeline_handler.init_project(init_params, request_context)
        
        exec_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
            "stages": ["init", "grid", "promote"],
            "async_mode": True,
        }
        pipeline_handler.execute_pipeline(exec_params, request_context)
        
        # Pause
        pause_params = {"project_name": "test-project"}
        pause_response = pipeline_handler.pause_pipeline(pause_params, request_context)
        assert pause_response.status == "success"
        assert pause_response.data["status"] == "paused"
        
        # Resume
        resume_params = {"project_name": "test-project"}
        resume_response = pipeline_handler.resume_pipeline(resume_params, request_context)
        assert resume_response.status == "success"
        assert resume_response.data["status"] == "running"
        
        # Cancel
        cancel_params = {"project_name": "test-project"}
        cancel_response = pipeline_handler.cancel_pipeline(cancel_params, request_context)
        assert cancel_response.status == "success"
        assert cancel_response.data["status"] == "cancelled"


class TestPipelineConfiguration:
    """Test pipeline configuration endpoints."""
    
    def test_list_stages(self, pipeline_handler, request_context):
        """Test listing pipeline stages."""
        response = pipeline_handler.list_stages({}, request_context)
        
        assert response.status == "success"
        assert "stages" in response.data
        assert response.data["total_count"] > 0
        assert "categories" in response.data
        
        # Verify stage structure
        for stage in response.data["stages"]:
            assert "name" in stage
            assert "description" in stage
            assert "dependencies" in stage
            assert "estimated_duration" in stage
    
    def test_configure_stage(self, pipeline_handler, temp_dir, request_context):
        """Test configuring a stage."""
        # First create a project
        init_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        pipeline_handler.init_project(init_params, request_context)
        
        # Configure stage
        config_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
            "stage_name": "grid",
            "config": {
                "enabled": True,
                "parameters": {"resolution": "1920x1080"},
                "timeout": 60,
            }
        }
        
        response = pipeline_handler.configure_stage(config_params, request_context)
        
        assert response.status == "success"
        assert response.data["stage_name"] == "grid"
        assert response.data["config"]["enabled"] is True
    
    def test_check_dependencies(self, pipeline_handler, request_context):
        """Test dependency checking."""
        response = pipeline_handler.check_dependencies({}, request_context)
        
        assert response.status == "success"
        assert "all_available" in response.data
        assert "available_dependencies" in response.data
        assert "dependency_versions" in response.data


class TestCheckpointManagement:
    """Test checkpoint management endpoints."""
    
    def test_create_checkpoint(self, pipeline_handler, temp_dir, request_context):
        """Test creating a checkpoint."""
        # First create a project
        init_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        pipeline_handler.init_project(init_params, request_context)
        
        # Create checkpoint
        checkpoint_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
            "description": "Test checkpoint",
        }
        
        response = pipeline_handler.create_checkpoint(checkpoint_params, request_context)
        
        assert response.status == "success"
        assert "checkpoint_id" in response.data
        assert response.data["project_name"] == "test-project"
        
        # Verify checkpoint file was created
        checkpoint_file = Path(response.data["checkpoint_file"])
        assert checkpoint_file.exists()
    
    def test_restore_checkpoint(self, pipeline_handler, temp_dir, request_context):
        """Test restoring a checkpoint."""
        # First create a project
        init_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
        }
        pipeline_handler.init_project(init_params, request_context)
        
        # Create checkpoint
        checkpoint_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
            "description": "Test checkpoint",
        }
        create_response = pipeline_handler.create_checkpoint(checkpoint_params, request_context)
        checkpoint_id = create_response.data["checkpoint_id"]
        
        # Restore checkpoint
        restore_params = {
            "project_name": "test-project",
            "base_path": temp_dir,
            "checkpoint_id": checkpoint_id,
        }
        
        response = pipeline_handler.restore_checkpoint(restore_params, request_context)
        
        assert response.status == "success"
        assert response.data["checkpoint_id"] == checkpoint_id
        assert response.data["project_name"] == "test-project"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
