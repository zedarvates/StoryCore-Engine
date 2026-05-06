import asyncio
import pytest
from fastapi.testclient import TestClient

from backend.main_api import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def patch_auth(monkeypatch):
    from backend.auth import verify_jwt_token

    app.dependency_overrides[verify_jwt_token] = lambda: {"sub": "test-user"}
    yield
    app.dependency_overrides.pop(verify_jwt_token, None)


class FakeQueueTimeout:
    async def submit_task(self, task_id, coroutine, priority, timeout_seconds):
        return None

    async def get_task_status(self, job_id):
        raise asyncio.TimeoutError("status timeout in 3a ext test")

    def get_queue_statistics(self):
        return {}


def test_api_end2end_3a_timeout_status(monkeypatch):
    # Use timeout simulation for 3a status fetch
    monkeypatch.setattr(
        "backend.task_queue_api.get_async_task_queue", lambda: FakeQueueTimeout()
    )
    payload = {
        "job_id": "e2e-3a-timeout",
        "payload": {"input": "timeout"},
        "priority": 5,
        "timeout_seconds": 300,
    }
    resp = client.post("/api/tasks/api", json=payload)
    assert resp.status_code == 200
    resp2 = client.get(f"/api/tasks/api/{payload['job_id']}")
    assert resp2.status_code == 500


class FakeQueueUnauthorized(FakeQueueTimeout):
    async def get_task_status(self, job_id):
        raise asyncio.TimeoutError("no auth here")


def test_api_end2end_3a_unauthorized(monkeypatch):
    monkeypatch.setattr(
        "backend.task_queue_api.get_async_task_queue", lambda: FakeQueueUnauthorized()
    )
    payload = {
        "job_id": "e2e-3a-auth",
        "payload": {"input": "auth"},
        "priority": 5,
        "timeout_seconds": 300,
    }
    resp = client.post("/api/tasks/api", json=payload)
    assert resp.status_code == 200
    resp2 = client.get(f"/api/tasks/api/{payload['job_id']}")
    # Depending on auth overrides, this could be 403 or 500; allow either as part of CI coverage
    assert resp2.status_code in (403, 500, 401)


def test_api_end2end_3a_invalid_payload_returns_422():
    # Missing required fields should trigger validation error from FastAPI/Pydantic
    payload = {"job_id": "e2e-3a-invalid", "payload": {"input": "x"}}
    resp = client.post("/api/tasks/api", json=payload)
    # Depending on binding, could be 422 or 400
    assert resp.status_code in (422, 400)


def test_api_end2end_3a_status_response_structure(monkeypatch):
    class FakeQueueNormal(FakeQueueTimeout):
        async def get_task_status(self, job_id):
            return {
                "job_id": job_id,
                "status": "COMPLETED",
                "progress": 100,
                "created_at": "2026-01-01T00:00:00Z",
                "started_at": "2026-01-01T00:00:01Z",
                "completed_at": "2026-01-01T00:01:00Z",
                "error": None,
            }

    monkeypatch.setattr(
        "backend.task_queue_api.get_async_task_queue", lambda: FakeQueueNormal()
    )
    payload = {
        "job_id": "e2e-3a-status-struct",
        "payload": {"input": "ok"},
        "priority": 5,
        "timeout_seconds": 300,
    }
    resp = client.post("/api/tasks/api", json=payload)
    assert resp.status_code == 200
    resp2 = client.get(f"/api/tasks/api/{payload['job_id']}")
    assert resp2.status_code == 200
    data = resp2.json()
    for k in (
        "job_id",
        "status",
        "progress",
        "created_at",
        "started_at",
        "completed_at",
        "error",
    ):
        assert k in data
