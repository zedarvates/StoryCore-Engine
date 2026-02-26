import pytest
from fastapi.testclient import TestClient

from backend.main_api import app


@pytest.fixture(scope='module')
def client():
    with TestClient(app) as c:
        yield c


def test_identity_create(client: TestClient):
    payload = {
        "name": "Test Character",
        "project_id": "proj_1",
        "reference_image": None,
        "manual_attributes": None,
        "lock_features": ["face", "lighting"]
    }
    resp = client.post("/api/mvp/identity/create", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "identity_id" in data
    assert data["name"] == payload["name"]


def test_identity_apply_and_validate(client: TestClient):
    # Create identity first
    create = client.post("/api/mvp/identity/create", json={
        "name": "Test Character 2",
        "project_id": "proj_2",
        "reference_image": None,
        "manual_attributes": None,
        "lock_features": ["face"]
    })
    assert create.status_code == 200
    identity_id = create.json()["identity_id"]

    # Apply identity to a scene
    apply_payload = {"identity_id": identity_id, "scene_id": "scene_01", "generation_params": {}}
    apply_resp = client.post("/api/mvp/identity/apply", json=apply_payload)
    assert apply_resp.status_code == 200
    assert apply_resp.json().get("applied") is True

    # Validate consistency
    validate_resp = client.get(f"/api/mvp/identity/{identity_id}/validate/scene_01")
    assert validate_resp.status_code == 200
    assert "consistency_score" in validate_resp.json()


def test_segmentation_segment(client: TestClient):
    payload = {"script": "Bonjour, ceci est un test de segmentation.", "language": "fr", "target_duration": 8.0}
    resp = client.post("/api/mvp/segmentation/segment", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "segmentation_id" in data
    assert data.get("total_duration") is not None


def test_video_renderEndpoint(client: TestClient):
    payload = {"prompt": "Test scene for MVP", "identity_id": None, "resolution": "1080p", "audio_url": None}
    resp = client.post("/api/mvp/video/render", json=payload)
    assert resp.status_code == 200
    j = resp.json()
    assert "video_url" in j and j["video_url"].endswith(".mp4")
    assert "duration" in j
    assert "resolution" in j and j["resolution"] == "1080p"
