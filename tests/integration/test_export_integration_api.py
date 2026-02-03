"""
Integration tests for Export and Integration API Category

Tests all 7 endpoints:
- storycore.export.package
- storycore.export.format
- storycore.export.metadata
- storycore.integration.comfyui.connect
- storycore.integration.comfyui.workflow
- storycore.integration.webhook.register
- storycore.integration.webhook.trigger
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext, ErrorCodes
from src.api.categories.export_integration import ExportIntegrationCategoryHandler


@pytest.fixture
def api_config():
    """Create test API configuration."""
    return APIConfig(
        version="v1",
        host="localhost",
        port=8000,
        log_api_calls=True,
    )


@pytest.fixture
def router(api_config):
    """Create test router."""
    return APIRouter(api_config)


@pytest.fixture
def handler(api_config, router):
    """Create export integration handler."""
    return ExportIntegrationCategoryHandler(api_config, router)


@pytest.fixture
def request_context():
    """Create test request context."""
    return RequestContext(
        request_id="test_request_123",
        user=None,
    )


@pytest.fixture
def temp_project():
    """Create temporary project directory."""
    temp_dir = tempfile.mkdtemp()
    project_dir = Path(temp_dir) / "test_project"
    project_dir.mkdir()
    
    # Create mock project structure
    (project_dir / "project.json").write_text('{"name": "test"}')
    (project_dir / "assets").mkdir()
    (project_dir / "outputs").mkdir()
    
    yield str(project_dir)
    
    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)


class TestExportPackage:
    """Tests for storycore.export.package endpoint."""
    
    def test_export_package_success(self, handler, request_context, temp_project):
        """Test successful package export."""
        params = {
            "project_path": temp_project,
            "include_source": False,
            "include_assets": True,
            "include_reports": True,
            "compression_level": 6,
        }
        
        response = handler.export_package(params, request_context)
        
        assert response.status == "success"
        assert "export_path" in response.data
        assert "package_size_bytes" in response.data
        assert "files_included" in response.data
        assert "export_time_ms" in response.data
        assert response.data["format"] == "zip"
        assert "checksum" in response.data
        assert "manifest" in response.data
        assert isinstance(response.data["manifest"], list)
    
    def test_export_package_missing_project(self, handler, request_context):
        """Test export with missing project directory."""
        params = {
            "project_path": "/nonexistent/project",
        }
        
        response = handler.export_package(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.NOT_FOUND
        assert "not found" in response.error.message.lower()
    
    def test_export_package_invalid_compression(self, handler, request_context, temp_project):
        """Test export with invalid compression level."""
        params = {
            "project_path": temp_project,
            "compression_level": 15,  # Invalid: must be 0-9
        }
        
        response = handler.export_package(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        assert "compression" in response.error.message.lower()
    
    def test_export_package_with_custom_output(self, handler, request_context, temp_project):
        """Test export with custom output path."""
        output_dir = str(Path(temp_project).parent / "custom_export")
        params = {
            "project_path": temp_project,
            "output_path": output_dir,
        }
        
        response = handler.export_package(params, request_context)
        
        assert response.status == "success"
        assert output_dir in response.data["export_path"]


class TestExportFormat:
    """Tests for storycore.export.format endpoint."""
    
    def test_format_conversion_to_zip(self, handler, request_context, temp_project):
        """Test format conversion to ZIP."""
        params = {
            "project_path": temp_project,
            "target_format": "zip",
        }
        
        response = handler.export_format(params, request_context)
        
        assert response.status == "success"
        assert "output_path" in response.data
        assert response.data["target_format"] == "zip"
        assert "conversion_time_ms" in response.data
        assert "output_size_bytes" in response.data
    
    def test_format_conversion_to_mp4(self, handler, request_context, temp_project):
        """Test format conversion to MP4 video."""
        params = {
            "project_path": temp_project,
            "target_format": "mp4",
        }
        
        response = handler.export_format(params, request_context)
        
        assert response.status == "success"
        assert response.data["target_format"] == "mp4"
        assert "quality_metrics" in response.data
        assert "resolution" in response.data["quality_metrics"]
        assert "fps" in response.data["quality_metrics"]
    
    def test_format_conversion_to_audio(self, handler, request_context, temp_project):
        """Test format conversion to audio formats."""
        for audio_format in ["wav", "mp3"]:
            params = {
                "project_path": temp_project,
                "target_format": audio_format,
            }
            
            response = handler.export_format(params, request_context)
            
            assert response.status == "success"
            assert response.data["target_format"] == audio_format
            assert "quality_metrics" in response.data
            assert "sample_rate" in response.data["quality_metrics"]
    
    def test_format_conversion_unsupported_format(self, handler, request_context, temp_project):
        """Test conversion to unsupported format."""
        params = {
            "project_path": temp_project,
            "target_format": "xyz",  # Unsupported
        }
        
        response = handler.export_format(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        assert "unsupported" in response.error.message.lower()


class TestExportMetadata:
    """Tests for storycore.export.metadata endpoint."""
    
    def test_metadata_generation_full(self, handler, request_context, temp_project):
        """Test full metadata generation."""
        params = {
            "project_path": temp_project,
            "metadata_format": "json",
            "include_technical": True,
            "include_creative": True,
            "include_qa_reports": True,
        }
        
        response = handler.export_metadata(params, request_context)
        
        assert response.status == "success"
        assert "metadata_content" in response.data
        assert "technical" in response.data["metadata_content"]
        assert "creative" in response.data["metadata_content"]
        assert "qa_reports" in response.data["metadata_content"]
        assert response.data["metadata_format"] == "json"
        assert len(response.data["sections_included"]) == 3
    
    def test_metadata_generation_selective(self, handler, request_context, temp_project):
        """Test selective metadata generation."""
        params = {
            "project_path": temp_project,
            "metadata_format": "json",
            "include_technical": True,
            "include_creative": False,
            "include_qa_reports": False,
        }
        
        response = handler.export_metadata(params, request_context)
        
        assert response.status == "success"
        assert "technical" in response.data["metadata_content"]
        assert "creative" not in response.data["metadata_content"]
        assert "qa_reports" not in response.data["metadata_content"]
        assert len(response.data["sections_included"]) == 1
    
    def test_metadata_generation_invalid_format(self, handler, request_context, temp_project):
        """Test metadata generation with invalid format."""
        params = {
            "project_path": temp_project,
            "metadata_format": "invalid",
        }
        
        response = handler.export_metadata(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR


class TestComfyUIIntegration:
    """Tests for ComfyUI integration endpoints."""
    
    def test_comfyui_connect_success(self, handler, request_context):
        """Test successful ComfyUI connection."""
        params = {
            "host": "localhost",
            "port": 8188,
            "timeout_seconds": 30,
        }
        
        response = handler.comfyui_connect(params, request_context)
        
        assert response.status == "success"
        assert response.data["connected"] is True
        assert response.data["host"] == "localhost"
        assert response.data["port"] == 8188
        assert "server_version" in response.data
        assert "available_models" in response.data
        assert isinstance(response.data["available_models"], list)
    
    def test_comfyui_connect_invalid_port(self, handler, request_context):
        """Test ComfyUI connection with invalid port."""
        params = {
            "host": "localhost",
            "port": 99999,  # Invalid port
        }
        
        response = handler.comfyui_connect(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
    
    def test_comfyui_workflow_submission(self, handler, request_context):
        """Test ComfyUI workflow submission."""
        # First connect
        connect_params = {"host": "localhost", "port": 8188}
        handler.comfyui_connect(connect_params, request_context)
        
        # Then submit workflow
        params = {
            "workflow_definition": {
                "nodes": [],
                "connections": [],
            },
            "workflow_name": "test_workflow",
            "priority": "normal",
        }
        
        response = handler.comfyui_workflow(params, request_context)
        
        assert response.status == "success"
        assert "workflow_id" in response.data
        assert response.data["status"] == "pending"
        assert response.data["progress"] == 0.0
    
    def test_comfyui_workflow_not_connected(self, handler, request_context):
        """Test workflow submission without connection."""
        params = {
            "workflow_definition": {"nodes": []},
        }
        
        response = handler.comfyui_workflow(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.DEPENDENCY_ERROR
    
    def test_comfyui_workflow_invalid_priority(self, handler, request_context):
        """Test workflow with invalid priority."""
        # First connect
        connect_params = {"host": "localhost", "port": 8188}
        handler.comfyui_connect(connect_params, request_context)
        
        params = {
            "workflow_definition": {"nodes": []},
            "priority": "invalid",
        }
        
        response = handler.comfyui_workflow(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR


class TestWebhooks:
    """Tests for webhook endpoints."""
    
    def test_webhook_register_success(self, handler, request_context):
        """Test successful webhook registration."""
        params = {
            "url": "https://example.com/webhook",
            "event_types": ["export.completed", "qa.failed"],
            "active": True,
        }
        
        response = handler.webhook_register(params, request_context)
        
        assert response.status == "success"
        assert "webhook_id" in response.data
        assert response.data["url"] == params["url"]
        assert response.data["event_types"] == params["event_types"]
        assert response.data["active"] is True
    
    def test_webhook_register_invalid_url(self, handler, request_context):
        """Test webhook registration with invalid URL."""
        params = {
            "url": "not-a-valid-url",
            "event_types": ["export.completed"],
        }
        
        response = handler.webhook_register(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        assert "url" in response.error.message.lower()
    
    def test_webhook_register_invalid_event_types(self, handler, request_context):
        """Test webhook registration with invalid event types."""
        params = {
            "url": "https://example.com/webhook",
            "event_types": ["invalid.event", "another.invalid"],
        }
        
        response = handler.webhook_register(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR
        assert "event" in response.error.message.lower()
    
    def test_webhook_trigger_success(self, handler, request_context):
        """Test successful webhook trigger."""
        # First register webhook
        register_params = {
            "url": "https://example.com/webhook",
            "event_types": ["export.completed"],
        }
        register_response = handler.webhook_register(register_params, request_context)
        webhook_id = register_response.data["webhook_id"]
        
        # Then trigger it
        trigger_params = {
            "webhook_id": webhook_id,
            "event_type": "export.completed",
            "payload": {"project": "test", "status": "success"},
        }
        
        response = handler.webhook_trigger(trigger_params, request_context)
        
        assert response.status == "success"
        assert response.data["webhook_id"] == webhook_id
        assert response.data["event_type"] == "export.completed"
        assert response.data["success"] is True
        assert "response_status" in response.data
        assert "response_time_ms" in response.data
    
    def test_webhook_trigger_test_mode(self, handler, request_context):
        """Test webhook trigger in test mode."""
        # Register webhook
        register_params = {
            "url": "https://example.com/webhook",
            "event_types": ["export.completed"],
            "active": False,  # Inactive
        }
        register_response = handler.webhook_register(register_params, request_context)
        webhook_id = register_response.data["webhook_id"]
        
        # Trigger in test mode (should work even if inactive)
        trigger_params = {
            "webhook_id": webhook_id,
            "event_type": "export.completed",
            "payload": {"test": True},
            "test_mode": True,
        }
        
        response = handler.webhook_trigger(trigger_params, request_context)
        
        assert response.status == "success"
        assert response.data["success"] is True
    
    def test_webhook_trigger_not_found(self, handler, request_context):
        """Test triggering non-existent webhook."""
        params = {
            "webhook_id": "nonexistent_webhook",
            "event_type": "export.completed",
            "payload": {},
        }
        
        response = handler.webhook_trigger(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.NOT_FOUND
    
    def test_webhook_trigger_wrong_event_type(self, handler, request_context):
        """Test triggering webhook with unregistered event type."""
        # Register webhook for specific events
        register_params = {
            "url": "https://example.com/webhook",
            "event_types": ["export.completed"],
        }
        register_response = handler.webhook_register(register_params, request_context)
        webhook_id = register_response.data["webhook_id"]
        
        # Try to trigger with different event
        trigger_params = {
            "webhook_id": webhook_id,
            "event_type": "qa.failed",  # Not registered
            "payload": {},
        }
        
        response = handler.webhook_trigger(trigger_params, request_context)
        
        assert response.status == "error"
        assert response.error.code == ErrorCodes.VALIDATION_ERROR


class TestEndToEndWorkflows:
    """End-to-end workflow tests."""
    
    def test_complete_export_workflow(self, handler, request_context, temp_project):
        """Test complete export workflow."""
        # 1. Generate metadata
        metadata_params = {
            "project_path": temp_project,
            "metadata_format": "json",
        }
        metadata_response = handler.export_metadata(metadata_params, request_context)
        assert metadata_response.status == "success"
        
        # 2. Export package
        export_params = {
            "project_path": temp_project,
        }
        export_response = handler.export_package(export_params, request_context)
        assert export_response.status == "success"
        
        # 3. Convert to different format
        format_params = {
            "project_path": temp_project,
            "target_format": "pdf",
        }
        format_response = handler.export_format(format_params, request_context)
        assert format_response.status == "success"
    
    def test_comfyui_workflow_with_webhook(self, handler, request_context):
        """Test ComfyUI workflow with webhook notification."""
        # 1. Register webhook for workflow completion
        webhook_params = {
            "url": "https://example.com/webhook",
            "event_types": ["image.generated"],
        }
        webhook_response = handler.webhook_register(webhook_params, request_context)
        assert webhook_response.status == "success"
        webhook_id = webhook_response.data["webhook_id"]
        
        # 2. Connect to ComfyUI
        connect_params = {"host": "localhost", "port": 8188}
        connect_response = handler.comfyui_connect(connect_params, request_context)
        assert connect_response.status == "success"
        
        # 3. Submit workflow
        workflow_params = {
            "workflow_definition": {"nodes": [], "connections": []},
            "workflow_name": "test_with_webhook",
        }
        workflow_response = handler.comfyui_workflow(workflow_params, request_context)
        assert workflow_response.status == "success"
        
        # 4. Trigger webhook (simulating workflow completion)
        trigger_params = {
            "webhook_id": webhook_id,
            "event_type": "image.generated",
            "payload": {
                "workflow_id": workflow_response.data["workflow_id"],
                "status": "completed",
            },
        }
        trigger_response = handler.webhook_trigger(trigger_params, request_context)
        assert trigger_response.status == "success"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
