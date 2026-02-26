import asyncio
import pytest
from fastapi.testclient import TestClient

from backend.main_api import app

client = TestClient(app)

class SeqQueue3aMore:
    def __init__(self):
        self.calls = 0
        self.statuses = [
            {'job_id': 'e2e-3a-more', 'state': 'PENDING', 'progress': 0, 'created_at': '', 'started_at': None, 'completed_at': None, 'error': None},
            {'job_id': 'e2e-3a-more', 'state': 'PROCESSING', 'progress': 40, 'created_at': '', 'started_at': '2026-02-24T12:00:00Z', 'completed_at': None, 'error': None},
            {'job_id': 'e2e-3a-more', 'state': 'COMPLETED', 'progress': 100, 'created_at': '', 'started_at': '2026-02-24T12:00:00Z', 'completed_at': '2026-02-24T12:01:00Z', 'error': None},
        ]
    async def submit_task(self, task_id, coroutine, priority, timeout_seconds):
        return None
    async def get_task_status(self, job_id):
        res = self.statuses[min(self.calls, len(self.statuses)-1)]
        self.calls += 1
        return res
    def get_queue_statistics(self):
        return {}

def test_api_end2end_3a_more_progress(monkeypatch):
    q = SeqQueue3aMore()
    monkeypatch.setattr('backend.task_queue_api.get_async_task_queue', lambda: q)
    payload = {"job_id": "e2e-3a-more", "payload": {"input": "more"}, "priority": 5, "timeout_seconds": 300}
    resp = client.post("/api/tasks/api", json=payload)
    assert resp.status_code == 200
    resp1 = client.get(f"/api/tasks/api/{payload['job_id']}")
    assert resp1.status_code == 200
    assert resp1.json()["state"] in ("PENDING", "PROCESSING", "COMPLETED")
    resp2 = client.get(f"/api/tasks/api/{payload['job_id']}")
    assert resp2.status_code == 200
    resp3 = client.get(f"/api/tasks/api/{payload['job_id']}")
    assert resp3.status_code == 200
    assert resp3.json()["state"] in ("COMPLETED", "FAILED", "CANCELLED", "PROCESSING")

