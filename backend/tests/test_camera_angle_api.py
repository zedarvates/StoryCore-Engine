"""
Test Suite for Camera Angle API

Tests for:
- POST /api/camera-angle/generate - Start generation job
- GET /api/camera-angle/jobs/{job_id} - Get job status
- GET /api/camera-angle/results/{job_id} - Get result
- GET /api/camera-angle/presets - List available presets
- DELETE /api/camera-angle/jobs/{job_id} - Cancel job
- GET /api/camera-angle/test-connection - Test ComfyUI connection
- GET /api/camera-angle/health - Health check

Coverage target: 80%
"""

import pytest
import asyncio
import base64
import os
import sys
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from typing import Dict, Any, List

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Import camera angle modules
from backend.camera_angle_types import (
    CameraAnglePreset,
    CameraAngleJobStatus,
    CameraAngleJob,
    CameraAngleRequest,
    CameraAngleResult,
    CAMERA_ANGLE_PRESET_METADATA,
)
from backend.camera_angle_api import (
    router,
    GenerateRequest,
    GenerateResponse,
    ConnectionTestResponse,
    _job_to_response,
    _estimate_generation_time,
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def app():
    """Create FastAPI app with camera angle router"""
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    # Override auth dependency for testing
    from backend.camera_angle_api import router
    from backend.auth import verify_jwt_token
    
    # Override the dependency
    app.dependency_overrides[verify_jwt_token] = lambda: "test-user-123"
    
    with TestClient(app) as client:
        yield client
    
    # Clear overrides after test
    app.dependency_overrides.clear()


@pytest.fixture
def sample_image_base64() -> str:
    """Create a sample base64 encoded image for testing"""
    # Create a minimal 1x1 PNG image
    png_header = bytes([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE,  # IHDR CRC
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,  # IDAT chunk
        0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F, 0x00,
        0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7,  # IDAT CRC
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,  # IEND chunk
        0xAE, 0x42, 0x60, 0x82  # IEND CRC
    ])
    return base64.b64encode(png_header).decode('utf-8')


@pytest.fixture
def sample_generate_request(sample_image_base64) -> Dict[str, Any]:
    """Sample generation request data"""
    return {
        "image_base64": sample_image_base64,
        "angle_ids": ["front", "side_left", "three_quarter"],
        "preserve_style": True,
        "quality": "standard",
        "seed": 42,
        "custom_prompt": "Test prompt"
    }


@pytest.fixture
def mock_job() -> CameraAngleJob:
    """Create a mock job for testing"""
    return CameraAngleJob(
        id="test-job-123",
        user_id="test-user-123",
        status=CameraAngleJobStatus.COMPLETED,
        progress=100,
        current_step="Generation complete",
        request=CameraAngleRequest(
            image_base64="test-image",
            angle_ids=[CameraAnglePreset.FRONT, CameraAnglePreset.SIDE_LEFT],
            preserve_style=True,
            quality="standard"
        ),
        completed_angles=[CameraAnglePreset.FRONT, CameraAnglePreset.SIDE_LEFT],
        remaining_angles=[],
        created_at=datetime.now(),
        started_at=datetime.now(),
        completed_at=datetime.now()
    )


@pytest.fixture
def mock_result() -> CameraAngleResult:
    """Create a mock result for testing"""
    return CameraAngleResult(
        id="result-123",
        angle_id=CameraAnglePreset.FRONT,
        generated_image_base64="generated-image-base64",
        generation_time_seconds=5.5,
        metadata={"test": "metadata"}
    )


# ============================================================================
# Test Helper Functions
# ============================================================================

class TestHelperFunctions:
    """Tests for helper functions"""
    
    def test_estimate_generation_time_draft(self):
        """Test time estimation for draft quality"""
        time = _estimate_generation_time(3, "draft")
        assert time == 15  # 3 angles * 5 seconds
    
    def test_estimate_generation_time_standard(self):
        """Test time estimation for standard quality"""
        time = _estimate_generation_time(3, "standard")
        assert time == 30  # 3 angles * 10 seconds
    
    def test_estimate_generation_time_high(self):
        """Test time estimation for high quality"""
        time = _estimate_generation_time(3, "high")
        assert time == 60  # 3 angles * 20 seconds
    
    def test_estimate_generation_time_unknown_quality(self):
        """Test time estimation defaults to standard for unknown quality"""
        time = _estimate_generation_time(3, "unknown")
        assert time == 30  # defaults to standard (10 seconds)
    
    def test_job_to_response(self, mock_job):
        """Test job to response conversion"""
        response = _job_to_response(mock_job)
        
        assert response.job_id == mock_job.id
        assert response.status == mock_job.status
        assert response.progress == mock_job.progress
        assert response.current_step == mock_job.current_step
        assert len(response.completed_angles) == 2
        assert len(response.remaining_angles) == 0
        assert response.error is None


# ============================================================================
# Test Presets Endpoint
# ============================================================================

class TestPresetsEndpoint:
    """Tests for GET /camera-angle/presets"""
    
    def test_list_presets_success(self, client):
        """Test successful preset listing"""
        response = client.get("/camera-angle/presets")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "presets" in data
        assert "total" in data
        assert data["total"] > 0
        assert len(data["presets"]) == data["total"]
    
    def test_list_presets_contains_expected_presets(self, client):
        """Test that preset list contains expected presets"""
        response = client.get("/camera-angle/presets")
        data = response.json()
        
        preset_ids = [p["id"] for p in data["presets"]]
        
        # Check for some expected presets
        assert "front" in preset_ids
        assert "side_left" in preset_ids
        assert "three_quarter" in preset_ids
    
    def test_list_presets_structure(self, client):
        """Test preset structure"""
        response = client.get("/camera-angle/presets")
        data = response.json()
        
        for preset in data["presets"]:
            assert "id" in preset
            assert "display_name" in preset
            assert "description" in preset
            assert "icon" in preset


# ============================================================================
# Test Generate Endpoint
# ============================================================================

class TestGenerateEndpoint:
    """Tests for POST /camera-angle/generate"""
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_generate_success(self, mock_get_service, client, sample_generate_request):
        """Test successful generation start"""
        # Mock the service
        mock_service = AsyncMock()
        mock_service.generate_multiple_angles = AsyncMock(return_value="job-123")
        mock_get_service.return_value = mock_service
        
        response = client.post("/camera-angle/generate", json=sample_generate_request)
        
        assert response.status_code == 202
        data = response.json()
        
        assert data["job_id"] == "job-123"
        assert data["status"] == "pending"
        assert "message" in data
        assert "estimated_time" in data
    
    def test_generate_invalid_quality(self, client, sample_generate_request):
        """Test generation with invalid quality"""
        sample_generate_request["quality"] = "ultra"
        
        response = client.post("/camera-angle/generate", json=sample_generate_request)
        
        assert response.status_code == 400
        assert "Invalid quality" in response.json()["detail"]
    
    def test_generate_empty_angles(self, client, sample_generate_request):
        """Test generation with empty angle list"""
        sample_generate_request["angle_ids"] = []
        
        response = client.post("/camera-angle/generate", json=sample_generate_request)
        
        assert response.status_code == 422  # Validation error
    
    def test_generate_missing_image(self, client, sample_generate_request):
        """Test generation without image"""
        del sample_generate_request["image_base64"]
        
        response = client.post("/camera-angle/generate", json=sample_generate_request)
        
        assert response.status_code == 422  # Validation error
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_generate_service_error(self, mock_get_service, client, sample_generate_request):
        """Test handling of service errors"""
        # Mock the service to raise an error
        mock_service = AsyncMock()
        mock_service.generate_multiple_angles = AsyncMock(
            side_effect=Exception("Service error")
        )
        mock_get_service.return_value = mock_service
        
        response = client.post("/camera-angle/generate", json=sample_generate_request)
        
        assert response.status_code == 500
        assert "Failed to start generation" in response.json()["detail"]


# ============================================================================
# Test Job Status Endpoint
# ============================================================================

class TestJobStatusEndpoint:
    """Tests for GET /camera-angle/jobs/{job_id}"""
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_get_job_status_success(self, mock_get_service, client, mock_job):
        """Test successful job status retrieval"""
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/jobs/test-job-123")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["job_id"] == mock_job.id
        assert data["status"] == mock_job.status.value
        assert data["progress"] == mock_job.progress
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_get_job_status_not_found(self, mock_get_service, client):
        """Test job status for non-existent job"""
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=None)
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/jobs/non-existent-job")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_get_job_status_wrong_user(self, mock_get_service, client, mock_job):
        """Test job status access denied for wrong user"""
        mock_job.user_id = "different-user"
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/jobs/test-job-123")
        
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]


# ============================================================================
# Test Results Endpoint
# ============================================================================

class TestResultsEndpoint:
    """Tests for GET /camera-angle/results/{job_id}"""
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_get_results_success(self, mock_get_service, client, mock_job, mock_result):
        """Test successful results retrieval"""
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_service.get_result = Mock(return_value=[mock_result])
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/results/test-job-123")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["job_id"] == mock_job.id
        assert data["status"] == mock_job.status.value
        assert len(data["results"]) == 1
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_get_results_not_completed(self, mock_get_service, client, mock_job):
        """Test results retrieval for incomplete job"""
        mock_job.status = CameraAngleJobStatus.PROCESSING
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/results/test-job-123")
        
        assert response.status_code == 400
        assert "not completed" in response.json()["detail"]
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_get_results_not_found(self, mock_get_service, client):
        """Test results for non-existent job"""
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=None)
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/results/non-existent-job")
        
        assert response.status_code == 404
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_get_results_empty(self, mock_get_service, client, mock_job):
        """Test results retrieval with no results"""
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_service.get_result = Mock(return_value=None)
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/results/test-job-123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []


# ============================================================================
# Test Cancel Endpoint
# ============================================================================

class TestCancelEndpoint:
    """Tests for DELETE /camera-angle/jobs/{job_id}"""
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    async def test_cancel_success(self, mock_get_service, client, mock_job):
        """Test successful job cancellation"""
        mock_job.status = CameraAngleJobStatus.PROCESSING
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_service.cancel_job = AsyncMock(return_value=True)
        mock_get_service.return_value = mock_service
        
        response = client.delete("/camera-angle/jobs/test-job-123")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["job_id"] == "test-job-123"
        assert data["status"] == "cancelled"
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_cancel_not_found(self, mock_get_service, client):
        """Test cancellation of non-existent job"""
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=None)
        mock_get_service.return_value = mock_service
        
        response = client.delete("/camera-angle/jobs/non-existent-job")
        
        assert response.status_code == 404
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_cancel_wrong_user(self, mock_get_service, client, mock_job):
        """Test cancellation access denied for wrong user"""
        mock_job.user_id = "different-user"
        mock_job.status = CameraAngleJobStatus.PROCESSING
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_get_service.return_value = mock_service
        
        response = client.delete("/camera-angle/jobs/test-job-123")
        
        assert response.status_code == 403
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_cancel_completed_job(self, mock_get_service, client, mock_job):
        """Test cancellation of completed job fails"""
        mock_job.status = CameraAngleJobStatus.COMPLETED
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_get_service.return_value = mock_service
        
        response = client.delete("/camera-angle/jobs/test-job-123")
        
        assert response.status_code == 400
        assert "Cannot cancel" in response.json()["detail"]
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    async def test_cancel_service_failure(self, mock_get_service, client, mock_job):
        """Test handling of service failure during cancellation"""
        mock_job.status = CameraAngleJobStatus.PROCESSING
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_service.cancel_job = AsyncMock(return_value=False)
        mock_get_service.return_value = mock_service
        
        response = client.delete("/camera-angle/jobs/test-job-123")
        
        assert response.status_code == 500
        assert "Failed to cancel" in response.json()["detail"]


# ============================================================================
# Test Connection Endpoint
# ============================================================================

class TestConnectionEndpoint:
    """Tests for GET /camera-angle/test-connection"""
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    async def test_connection_success(self, mock_get_service, client):
        """Test successful connection check"""
        mock_service = Mock()
        mock_service.comfyui_url = "http://localhost:8188"
        mock_service.check_comfyui_connection = AsyncMock(return_value=True)
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/test-connection")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "Successfully connected" in data["message"]
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    async def test_connection_failure(self, mock_get_service, client):
        """Test failed connection check"""
        mock_service = Mock()
        mock_service.comfyui_url = "http://localhost:8188"
        mock_service.check_comfyui_connection = AsyncMock(return_value=False)
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/test-connection")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is False
        assert "not responding" in data["message"]
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    async def test_connection_error(self, mock_get_service, client):
        """Test connection check with error"""
        mock_service = Mock()
        mock_service.comfyui_url = "http://localhost:8188"
        mock_service.check_comfyui_connection = AsyncMock(
            side_effect=Exception("Connection error")
        )
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/test-connection")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is False
        assert "Connection error" in data["message"]


# ============================================================================
# Test Health Check Endpoint
# ============================================================================

class TestHealthEndpoint:
    """Tests for GET /camera-angle/health"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/camera-angle/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert "service" in data


# ============================================================================
# Test Validation
# ============================================================================

class TestValidation:
    """Tests for request validation"""
    
    def test_invalid_angle_id(self, client, sample_generate_request):
        """Test validation rejects invalid angle IDs"""
        sample_generate_request["angle_ids"] = ["invalid_angle"]
        
        response = client.post("/camera-angle/generate", json=sample_generate_request)
        
        # Should fail validation
        assert response.status_code == 422
    
    def test_missing_required_fields(self, client):
        """Test validation rejects missing required fields"""
        incomplete_request = {
            "image_base64": "test-image",
            # Missing angle_ids
        }
        
        response = client.post("/camera-angle/generate", json=incomplete_request)
        
        assert response.status_code == 422
    
    def test_optional_fields_defaults(self, client, sample_generate_request):
        """Test optional fields have correct defaults"""
        # Remove optional fields
        del sample_generate_request["preserve_style"]
        del sample_generate_request["quality"]
        del sample_generate_request["seed"]
        del sample_generate_request["custom_prompt"]
        
        with patch('backend.camera_angle_api.get_camera_angle_service') as mock_get_service:
            mock_service = AsyncMock()
            mock_service.generate_multiple_angles = AsyncMock(return_value="job-123")
            mock_get_service.return_value = mock_service
            
            response = client.post("/camera-angle/generate", json=sample_generate_request)
            
            # Should succeed with defaults
            assert response.status_code == 202


# ============================================================================
# Test Edge Cases
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and boundary conditions"""
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_large_angle_list(self, mock_get_service, client, sample_generate_request):
        """Test handling of large angle lists"""
        # Use all available presets
        sample_generate_request["angle_ids"] = list(CAMERA_ANGLE_PRESET_METADATA.keys())
        
        mock_service = AsyncMock()
        mock_service.generate_multiple_angles = AsyncMock(return_value="job-123")
        mock_get_service.return_value = mock_service
        
        response = client.post("/camera-angle/generate", json=sample_generate_request)
        
        assert response.status_code == 202
    
    def test_empty_base64_image(self, client, sample_generate_request):
        """Test handling of empty base64 image"""
        sample_generate_request["image_base64"] = ""
        
        response = client.post("/camera-angle/generate", json=sample_generate_request)
        
        # Should fail validation
        assert response.status_code == 422
    
    @patch('backend.camera_angle_api.get_camera_angle_service')
    def test_job_with_error(self, mock_get_service, client, mock_job):
        """Test job status with error"""
        mock_job.status = CameraAngleJobStatus.FAILED
        mock_job.error = "Generation failed due to invalid image"
        mock_service = Mock()
        mock_service.get_job_status = Mock(return_value=mock_job)
        mock_get_service.return_value = mock_service
        
        response = client.get("/camera-angle/jobs/test-job-123")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "failed"
        assert data["error"] == "Generation failed due to invalid image"


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
