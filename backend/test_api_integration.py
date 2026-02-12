"""
StoryCore-Engine API Integration Tests

This module contains tests for the backend APIs to verify functionality.
Run with: python -m pytest backend/test_api_integration.py -v
"""

import pytest
import sys
import os
from datetime import datetime
from unittest.mock import patch, MagicMock

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Test fixtures
@pytest.fixture
def mock_user_id():
    """Mock authenticated user ID"""
    return "test_user_1234567890"


@pytest.fixture
def app():
    """Create test FastAPI application"""
    from backend.main_api import app
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    from fastapi.testclient import TestClient
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for health check endpoint"""
    
    def test_health_check(self, client):
        """Test health check returns 200"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "StoryCore-Engine API"


class TestProjectAPI:
    """Tests for Project Management API"""
    
    def test_create_project(self, client, mock_user_id):
        """Test creating a new project"""
        response = client.post(
            "/api/projects",
            json={
                "name": "Test Project",
                "description": "A test project",
                "format": "landscape",
                "fps": 24
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["name"] == "Test Project"
        assert data["status"] == "draft"
    
    def test_list_projects(self, client, mock_user_id):
        """Test listing projects"""
        response = client.get(
            "/api/projects",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert "total" in data
    
    def test_get_project_not_found(self, client, mock_user_id):
        """Test getting non-existent project returns 404"""
        response = client.get(
            "/api/projects/non-existent-id",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 404
    
    def test_update_project(self, client, mock_user_id):
        """Test updating a project"""
        # Create project first
        create_response = client.post(
            "/api/projects",
            json={"name": "Update Test Project"},
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        project_id = create_response.json()["id"]
        
        # Update project
        response = client.put(
            f"/api/projects/{project_id}",
            json={"name": "Updated Project Name", "status": "in_progress"},
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Project Name"
        assert data["status"] == "in_progress"
    
    def test_delete_project(self, client, mock_user_id):
        """Test deleting a project"""
        # Create project first
        create_response = client.post(
            "/api/projects",
            json={"name": "Delete Test Project"},
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        project_id = create_response.json()["id"]
        
        # Delete project
        response = client.delete(
            f"/api/projects/{project_id}",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 204
        
        # Verify deletion
        get_response = client.get(
            f"/api/projects/{project_id}",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert get_response.status_code == 404


class TestShotAPI:
    """Tests for Shot Management API"""
    
    def test_create_shot(self, client, mock_user_id):
        """Test creating a new shot"""
        response = client.post(
            "/api/shots",
            json={
                "project_id": "test-project-id",
                "name": "Test Shot",
                "prompt": "A beautiful sunset over the ocean",
                "shot_type": "wide",
                "duration_seconds": 5.0
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["name"] == "Test Shot"
        assert data["status"] == "pending"
    
    def test_get_shot(self, client, mock_user_id):
        """Test getting a shot"""
        # Create shot first
        create_response = client.post(
            "/api/shots",
            json={
                "project_id": "test-project-id",
                "name": "Get Test Shot",
                "prompt": "Test prompt"
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        shot_id = create_response.json()["id"]
        
        response = client.get(
            f"/api/shots/{shot_id}",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == shot_id
    
    def test_update_shot(self, client, mock_user_id):
        """Test updating a shot"""
        # Create shot first
        create_response = client.post(
            "/api/shots",
            json={
                "project_id": "test-project-id",
                "name": "Update Test Shot",
                "prompt": "Test prompt"
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        shot_id = create_response.json()["id"]
        
        response = client.put(
            f"/api/shots/{shot_id}",
            json={"name": "Updated Shot Name", "duration_seconds": 10.0},
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Shot Name"
        assert data["duration_seconds"] == 10.0


class TestSequenceAPI:
    """Tests for Sequence Generation API"""
    
    def test_generate_sequence(self, client, mock_user_id):
        """Test starting sequence generation"""
        response = client.post(
            "/api/sequences/generate",
            json={
                "project_id": "test-project-id",
                "prompt": "Create an exciting action sequence with a car chase through a city",
                "shot_count": 5,
                "style": "cinematic",
                "mood": "tense"
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "pending"
    
    def test_get_generation_status(self, client, mock_user_id):
        """Test getting generation status"""
        # Start generation
        gen_response = client.post(
            "/api/sequences/generate",
            json={
                "project_id": "test-project-id",
                "prompt": "Test prompt for status check"
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        job_id = gen_response.json()["job_id"]
        
        response = client.get(
            f"/api/sequences/{job_id}/status",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == job_id
    
    def test_cancel_generation(self, client, mock_user_id):
        """Test cancelling generation"""
        # Start generation
        gen_response = client.post(
            "/api/sequences/generate",
            json={
                "project_id": "test-project-id",
                "prompt": "Test prompt for cancellation"
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        job_id = gen_response.json()["job_id"]
        
        response = client.post(
            f"/api/sequences/{job_id}/cancel",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"


class TestLLMAPI:
    """Tests for LLM Integration API"""
    
    def test_generate_text(self, client, mock_user_id):
        """Test text generation with LLM"""
        response = client.post(
            "/api/llm/generate",
            json={
                "prompt": "Write a short description of a fantasy kingdom",
                "model": "gpt-3.5-turbo",
                "temperature": 0.7
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert "model" in data
        assert "latency_ms" in data
    
    def test_list_templates(self, client, mock_user_id):
        """Test listing prompt templates"""
        response = client.get(
            "/api/llm/templates",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert "total" in data
        assert len(data["templates"]) > 0
    
    def test_render_template(self, client, mock_user_id):
        """Test rendering a prompt template"""
        response = client.post(
            "/api/llm/render-template",
            json={
                "template_name": "story_generation",
                "variables": {
                    "genre": "Science Fiction",
                    "theme": "Exploration",
                    "setting": "Distant planet",
                    "characters": "Team of astronauts",
                    "length": "Full feature"
                }
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "rendered_prompt" in data
        assert "Science Fiction" in data["rendered_prompt"]
    
    def test_list_models(self, client, mock_user_id):
        """Test listing LLM models"""
        response = client.get(
            "/api/llm/models",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert "total" in data
        assert len(data["models"]) > 0
    
    def test_chat_completion(self, client, mock_user_id):
        """Test chat completion"""
        response = client.post(
            "/api/llm/chat",
            json={
                "messages": [
                    {"role": "user", "content": "Tell me a short story about a robot"}
                ],
                "temperature": 0.7
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "choices" in data
        assert len(data["choices"]) > 0
    
    def test_cache_operations(self, client, mock_user_id):
        """Test cache clear and stats"""
        # Get cache stats
        stats_response = client.get(
            "/api/llm/cache/stats",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert stats_response.status_code == 200
        
        # Clear cache
        clear_response = client.delete(
            "/api/llm/cache",
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert clear_response.status_code == 200


class TestAudioAPI:
    """Tests for Audio Processing API"""
    
    def test_generate_audio(self, client, mock_user_id):
        """Test audio generation"""
        response = client.post(
            "/api/audio/generate",
            json={
                "project_id": "test-project-id",
                "text": "Hello, welcome to the story generator!",
                "audio_type": "voice",
                "voice": "female"
            },
            headers={"Authorization": f"Bearer {mock_user_id}"}
        )
        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "processing"


class TestAuthentication:
    """Tests for authentication"""
    
    def test_missing_auth_header(self, client):
        """Test request without auth header"""
        response = client.get("/api/projects")
        assert response.status_code == 401
        assert "Missing authorization header" in response.json()["detail"]
    
    def test_invalid_auth_token(self, client):
        """Test request with invalid auth token"""
        response = client.get(
            "/api/projects",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
        assert "Invalid authorization token" in response.json()["detail"]


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
