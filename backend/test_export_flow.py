import asyncio
import uuid
from datetime import datetime

# Mocking the environment to test the logic within video_editor_api.py
# Since I cannot easily run the full FastAPI app with background tasks here
# I will simulate the core sequence.

# We'll import what we need if possible, or just simulate the dictionary state
from video_editor_api import (
    projects_db,
    jobs_db,
    media_db,
    ExportRequest,
    process_export,
)


async def test_flow():
    print("🚀 Starting End-to-End Export Flow Test...")

    # 1. Setup Mock Project
    project_id = str(uuid.uuid4())
    projects_db[project_id] = {
        "id": project_id,
        "name": "Test Project",
        "media": [{"id": "media-1", "path": "test_video.mp4"}],
        "tracks": [],
        "clips": [],
    }
    media_db["media-1"] = {"id": "media-1", "path": "test_video.mp4"}

    print(f"✅ Project {project_id} created.")

    # 2. Simulate Export Request
    export_req = ExportRequest(
        project_id=project_id,
        format="mp4",
        quality="high",
        frameRate=30,
        includeAudio=True,
    )

    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "project_id": project_id,
        "format": export_req.format,
        "status": "pending",
        "progress": 0.0,
        "message": "Job created",
        "output_path": None,
        "error": None,
        "settings": export_req.dict(),
        "started_at": datetime.utcnow(),
    }
    jobs_db[job_id] = job
    print(f"✅ Export job {job_id} initiated.")

    # 3. Run Background Task (Simulated)
    # Note: We need to mock the AI service because it might not exist/work in this env
    # For now, let's see if we can just trigger it.
    # Actually, the process_export uses 'create_ai_service' which might fail.

    print("⏳ Running background export task...")
    try:
        # We manually call it. In real app, FastAPI's BackgroundTasks would do this.
        await process_export(job_id)
    except Exception as e:
        print(f"❌ Background task failed as expected (no real AI service): {e}")
        # Even if it fails, we check if the state was updated

    final_job = jobs_db[job_id]
    print(f"📊 Final Job State: {final_job['status']}")
    if final_job.get("completed_at"):
        print(f"📅 Completed At: {final_job['completed_at']}")
    if final_job.get("output_path"):
        print(f"📁 Output Path: {final_job['output_path']}")

    if final_job["status"] in ["completed", "failed"]:
        print("✨ Test sequence finished.")
    else:
        print("⚠️ Job stuck in unfinished state.")


if __name__ == "__main__":
    asyncio.run(test_flow())
