import sys
import types

# Stub out sseclient to satisfy imports when tests run without full dependencies
sys.modules.setdefault("sseclient", types.ModuleType("sseclient"))

from fastapi.testclient import TestClient
import pytest

from backend.main_api import app
from backend.auth import verify_jwt_token

# Create a test client for the FastAPI app
client = TestClient(app)


@pytest.fixture(autouse=True)
def override_auth_dependency(monkeypatch):
    # Bypass real JWT verification for tests by overriding the dependency
    app.dependency_overrides[verify_jwt_token] = lambda: {"sub": "test-user"}
    yield
    app.dependency_overrides.pop(verify_jwt_token, None)


def test_api_task_status_not_found(monkeypatch):
    async def fake_status(job_id):
        return None

    monkeypatch.setattr("backend.task_queue_api.get_async_task_status", fake_status)

    response = client.get("/api/tasks/api/not-found-id")
    assert response.status_code == 404


def test_api_task_status_found(monkeypatch):
    async def fake_status(job_id):
        return {
            "state": "PENDING",
            "progress": 20,
            "created_at": "2026-02-24T12:00:00Z",
            "started_at": None,
            "completed_at": None,
            "error": None,
        }

    monkeypatch.setattr("backend.task_queue_api.get_async_task_status", fake_status)

    response = client.get("/api/tasks/api/fake-id-1")
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "fake-id-1"
    assert data["status"] == "PENDING"
    assert data["progress"] == 20


def test_api_task_status_forbidden(monkeypatch):
    """Ensure API returns 403 when JWT validation fails."""
    from fastapi import HTTPException

    # Override the JWT dependency to raise 403
    # Inject a 403 by overriding the dependency in the FastAPI app
    app = __import__("backend.main_api", fromlist=["app"]).app
    monkeypatch.setitem(
        app.dependency_overrides,
        verify_jwt_token,
        lambda: (_ for _ in ()).throw(
            HTTPException(status_code=403, detail="Forbidden")
        ),
    )
    response = client.get("/api/tasks/api/not-found-id")
    assert response.status_code == 403


def test_api_task_submission_and_status(monkeypatch):
    class FakeQueue:
        def __init__(self):
            self.store = {}

        async def submit_task(self, task_id, coroutine, priority, timeout_seconds):
            # Immediately mark as completed for test determinism
            self.store[task_id] = {
                "state": "COMPLETED",
                "progress": 100,
                "created_at": "2026-02-24T12:01:00Z",
                "started_at": "2026-02-24T12:01:01Z",
                "completed_at": "2026-02-24T12:01:02Z",
                "error": None,
            }

        async def get_task_status(self, task_id):
            return self.store.get(task_id)

        def get_queue_statistics(self):
            return {}

    # Create a shared FakeQueue instance and patch to always return it
    fake_queue = FakeQueue()
    monkeypatch.setattr(
        "backend.task_queue_api.get_async_task_queue", lambda: fake_queue
    )

    # Also patch get_async_task_status to simulate a completed task after submission
    async def fake_status(job_id):
        return {
            "state": "COMPLETED",
            "progress": 100,
            "created_at": "2026-02-24T12:01:00Z",
            "started_at": "2026-02-24T12:01:01Z",
            "completed_at": "2026-02-24T12:01:02Z",
            "error": None,
        }

    monkeypatch.setattr("backend.task_queue_api.get_async_task_status", fake_status)

    # Submit an API task via the backend API
    payload = {
        "job_id": "api-task-xyz",
        "payload": {"example": 1},
        "priority": 5,
        "timeout_seconds": 300,
    }
    response = client.post(
        "/api/tasks/api", json=payload, headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data.get("success") is True

    # Query status for the API task
    resp2 = client.get("/api/tasks/api/api-task-xyz")
    assert resp2.status_code == 200
    d2 = resp2.json()
    assert d2["job_id"] == "api-task-xyz"
    assert d2["status"] == "COMPLETED"
    assert d2["progress"] == 100
