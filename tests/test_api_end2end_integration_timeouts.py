import asyncio
import pytest
from fastapi.testclient import TestClient

from backend.main_api import app

# Simple test client
client = TestClient(app)

@pytest.fixture(autouse=True)
def override_auth_dependency(monkeypatch):
    # Bypass real auth for tests
    from backend.auth import verify_jwt_token
    app.dependency_overrides[verify_jwt_token] = lambda: {"sub": "test-user"}
    yield
    app.dependency_overrides.pop(verify_jwt_token, None)


class FakeQueue:
    def __init__(self):
        self.store = {}
    async def submit_task(self, task_id, coroutine, priority, timeout_seconds):
        # Do nothing (simulate enqueuing without immediate result)
        return None
    async def get_task_status(self, task_id):
        # Simulate a timeout when status is fetched
        raise asyncio.TimeoutError("status fetch timeout")
    def get_queue_statistics(self):
        return {}


def test_api_end2end_timeout_status(monkeypatch):
    # Patch to use the FakeQueue
    monkeypatch.setattr('backend.task_queue_api.get_async_task_queue', lambda: FakeQueue())
    # Submit a task
    payload = {
        "job_id": "e2e-timeout-task",
        "payload": {"input": "timeout"},
        "priority": 5,
        "timeout_seconds": 300,
    }
    resp = client.post("/api/tasks/api", json=payload, headers={"Content-Type": "application/json"})
    assert resp.status_code == 200
    # Attempt to fetch status should result in 500 due to timeout in status fetch
    resp2 = client.get(f"/api/tasks/api/{payload['job_id']}")
    assert resp2.status_code == 500

