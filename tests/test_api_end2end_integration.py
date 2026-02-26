import time
import requests
import pytest
import pytest
from typing import Optional

BASE_URL = "http://localhost:8000"


def test_api_end2end_integration_basic():
    """End-to-end: submit an API-driven task and poll for completion."""
    payload = {
        "job_id": "e2e-api-task-001",
        "payload": {"input": "end-to-end"},
        "priority": 5,
        "timeout_seconds": 300,
    }

    # Quick health check to decide if we should run the end-to-end test
    try:
        requests.get(f"{BASE_URL}/health", timeout=2)
    except Exception:
        pytest.skip("OpenAPI server not running; skipping end-to-end integration test.")

    # Submit the API-driven task
    try:
        resp = requests.post(f"{BASE_URL}/api/tasks/api", json=payload)
    except requests.exceptions.ConnectionError:
        pytest.skip("OpenAPI server not running; skipping end-to-end integration test.")
    assert resp.status_code in (200, 201), f"Submission failed with {getattr(resp, 'status_code', None)}: {getattr(resp, 'text', '')}"

    # Poll for status until completion or timeout
    start = time.time()
    status: Optional[str] = None
    while time.time() - start < 20:
        try:
            r = requests.get(f"{BASE_URL}/api/tasks/api/{payload['job_id']}")
        except requests.exceptions.ConnectionError:
            pytest.skip("OpenAPI server not running; skipping end-to-end integration test.")
        
        if r.status_code == 200:
            data = r.json()
            status = data.get("status")
            if status in ("COMPLETED", "FAILED", "CANCELLED"):
                break
        time.sleep(0.5)

    assert status == "COMPLETED", f"API-driven task did not complete in time, final status: {status}"


def test_api_end2end_integration_error_on_status(monkeypatch):
    """End-to-end: simulate error during status fetch after submission."""
    payload = {
        "job_id": "e2e-api-error",
        "payload": {"input": "error"},
        "priority": 5,
        "timeout_seconds": 300,
    }
    class FakeQueue:
        async def submit_task(self, task_id, coroutine, priority, timeout_seconds):
            # Simulate successful submission
            return None
        async def get_task_status(self, task_id):
            # Simulate an error during status retrieval
            raise RuntimeError("status fetch failed")
        def get_queue_statistics(self):
            return {}
    # Patch to use the fake queue
    monkeypatch.setattr('backend.task_queue_api.get_async_task_queue', lambda: FakeQueue())
    # Submit the API task
    resp = client.post("/api/tasks/api", json=payload, headers={"Content-Type": "application/json"})
    assert resp.status_code == 200
    # Attempt to fetch status should result in 500 due to internal error in status fetch
    resp2 = client.get(f"/api/tasks/api/{payload['job_id']}")
    assert resp2.status_code == 500


def test_api_end2end_integration_timeout_status(monkeypatch):
    """End-to-end: simulate timeout when retrieving status after submission."""
    payload = {
        "job_id": "e2e-api-timeout",
        "payload": {"input": "timeout"},
        "priority": 5,
        "timeout_seconds": 300,
    }
    class FakeQueue:
        async def submit_task(self, task_id, coroutine, priority, timeout_seconds):
            return None
        async def get_task_status(self, job_id):
            return {"state": "PENDING", "progress": 0}
        def get_queue_statistics(self):
            return {}
    async def fake_status(job_id):
        import asyncio
        raise asyncio.TimeoutError("timeout")
    monkeypatch.setattr('backend.task_queue_api.get_async_task_queue', lambda: FakeQueue())
    monkeypatch.setattr('backend.task_queue_api.get_async_task_status', fake_status)
    # Submit a task
    resp = client.post("/api/tasks/api", json=payload, headers={"Content-Type": "application/json"})
    assert resp.status_code == 200
    # Try to poll status; expect 500 due to timeout in status fetch
    resp2 = client.get(f"/api/tasks/api/{payload['job_id']}")
    assert resp2.status_code == 500
