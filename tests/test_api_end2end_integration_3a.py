from fastapi.testclient import TestClient
import pytest

from backend.main_api import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def override_auth_dependency(monkeypatch):
    from backend.auth import verify_jwt_token
    app.dependency_overrides[verify_jwt_token] = lambda: {"sub": "test-user"}
    yield
    app.dependency_overrides.pop(verify_jwt_token, None)

class FakeQueue:
    def __init__(self):
        self._status = {
            'job_id': 't3a-test',
            'state': 'COMPLETED',
            'progress': 100,
            'created_at': '',
            'started_at': None,
            'completed_at': None,
            'error': None,
        }
    async def submit_task(self, task_id, coroutine, priority, timeout_seconds):
        return None
    async def get_task_status(self, job_id):
        return self._status
    def get_queue_statistics(self):
        return {}

def test_api_task3a_end2end(monkeypatch):
    fake = FakeQueue()
    monkeypatch.setattr('backend.task_queue_api.get_async_task_queue', lambda: fake)
    payload = {"job_id": "t3a-test", "payload": {"example": 1}, "priority": 5, "timeout_seconds": 300}
    resp = client.post("/api/tasks/api", json=payload)
    assert resp.status_code == 200
    resp2 = client.get("/api/tasks/api/t3a-test")
    assert resp2.status_code == 200
    data = resp2.json()
    assert data["job_id"] == "t3a-test"
    assert data["status"] == "COMPLETED"
