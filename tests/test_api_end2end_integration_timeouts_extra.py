import asyncio
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from backend.main_api import app

client = TestClient(app)


class FakeQueue:
    def __init__(self):
        self.store = {}

    async def submit_task(self, task_id, coroutine, priority, timeout_seconds):
        self.store[task_id] = {"state": "PENDING", "progress": 0}
        return None

    async def get_task_status(self, task_id):
        raise asyncio.TimeoutError("status timeout")

    def get_queue_statistics(self):
        return {}


@pytest.fixture(autouse=True)
def patch_auth_default(monkeypatch):
    # By default, bypass auth for tests
    from backend.auth import verify_jwt_token

    app.dependency_overrides[verify_jwt_token] = lambda: {"sub": "test-user"}
    yield
    app.dependency_overrides.pop(verify_jwt_token, None)


def test_end2end_timeout_status(monkeypatch):
    monkeypatch.setattr(
        "backend.task_queue_api.get_async_task_queue", lambda: FakeQueue()
    )
    payload = {
        "job_id": "e2e-timeout-extra",
        "payload": {},
        "priority": 5,
        "timeout_seconds": 300,
    }
    resp = client.post("/api/tasks/api", json=payload)
    assert resp.status_code == 200
    resp2 = client.get(f"/api/tasks/api/{payload['job_id']}")
    # Depending on implementation, this could be 500 due to timeout
    assert resp2.status_code in (500, 503, 504)


def test_end2end_forbidden_jwt(monkeypatch):
    from backend.auth import verify_jwt_token

    def raise_forbidden(_credentials=None):
        raise HTTPException(status_code=403, detail="Forbidden")

    app.dependency_overrides[verify_jwt_token] = raise_forbidden
    resp = client.get("/api/tasks/api/not-found-id")
    assert resp.status_code == 403
