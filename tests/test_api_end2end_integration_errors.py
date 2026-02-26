import sys
import types
sys.modules.setdefault('sseclient', types.ModuleType('sseclient'))
import pytest
from fastapi.testclient import TestClient

from backend.main_api import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def _mock_auth(monkeypatch):
    # Bypass real auth for tests
    from backend.auth import verify_jwt_token
    app.dependency_overrides[verify_jwt_token] = lambda: {"sub": "test-user"}
    yield
    app.dependency_overrides.pop(verify_jwt_token, None)


def test_api_end2end_submission_and_timeout(monkeypatch):
    # Simulate API task submission always succeeds
    monkeypatch.setattr('backend.task_queue_api.submit_api_task', lambda job_id, payload, priority, timeout_seconds: True)
    # Simulate status lookup raising a timeout when queried
    async def fake_status(job_id):
        raise TimeoutError("timeout while fetching status")
    monkeypatch.setattr('backend.task_queue_api.get_async_task_status', fake_status)

    payload = {
        "job_id": "e2e-api-timeout-err",
        "payload": {"input": "timeout"},
        "priority": 5,
        "timeout_seconds": 300
    }

    resp = client.post("/api/tasks/api", json=payload)
    assert resp.status_code == 200

    resp2 = client.get(f"/api/tasks/api/{payload['job_id']}")
    # Expect a server error due to timeout during status fetch
    assert resp2.status_code == 500
