
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main_api import app
from backend.auth import verify_jwt_token

# Mock auth
async def mock_verify_jwt_token():
    return "test-user-id"

app.dependency_overrides[verify_jwt_token] = mock_verify_jwt_token

client = TestClient(app)

@pytest.fixture
def mock_project_storage():
    with patch("backend.shot_api.project_storage") as mock:
        yield mock

@pytest.fixture
def mock_shot_storage():
    with patch("backend.shot_api.shot_storage") as mock:
        yield mock

def test_create_shot(mock_project_storage, mock_shot_storage):
    # Setup mocks
    mock_project_storage.load.return_value = {"id": "proj1", "owner_id": "test-user-id"}
    mock_shot_storage.save.return_value = True
    
    shot_data = {
        "project_id": "proj1",
        "name": "Test Shot",
        "prompt": "A cinematic test shot",
        "shot_type": "action",
        "duration_seconds": 5.0,
        "order_index": 1
    }
    
    response = client.post("/api/shots", json=shot_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Shot"
    assert data["project_id"] == "proj1"
    assert "id" in data

def test_list_project_shots(mock_project_storage, mock_shot_storage):
    # Setup mocks
    mock_project_storage.load.return_value = {"id": "proj1", "owner_id": "test-user-id"}
    
    # Mock get_by_owner (which we configured to index by project_id)
    mock_shot_storage.get_by_owner.return_value = [
        {
            "id": "shot1", 
            "project_id": "proj1", 
            "sequence_id": None,
            "name": "Shot 1",
            "description": None,
            "prompt": "Prompt 1",
            "shot_type": "action",
            "duration_seconds": 5.0,
            "order_index": 1,
            "status": "pending",
            "metadata": {},
            "character_ids": [],
            "asset_ids": [],
            "result_url": None,
            "thumbnail_url": None,
            "created_at": "2023-01-01T00:00:00",
            "updated_at": "2023-01-01T00:00:00",
            "version": 1
        }
    ]
    
    response = client.get("/api/projects/proj1/shots")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["shots"]) == 1
    assert data["shots"][0]["id"] == "shot1"
    
    # Verify get_by_owner was called with project_id
    mock_shot_storage.get_by_owner.assert_called_with("proj1")
