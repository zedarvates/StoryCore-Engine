import unittest
import os
import shutil
import json
from backend.location_api import save_location


def test_save_location_creates_epic4_lieux_dir():
    # Setup: ensure clean state
    project_dir = os.path.abspath(os.path.join("./projects", "epic4", "lieux"))
    if os.path.isdir(project_dir):
        shutil.rmtree(project_dir)
    # Prepare data with project_id
    location_id = "testloc"
    data = {
        "id": location_id,
        "name": "Test Location",
        "description": "A test location",
        "location_type": "generic",
        "metadata": {},
        "project_id": "epic4",
        "cube_faces": None,
        "skybox_data": None,
        "created_at": "2020-01-01T00:00:00Z",
        "updated_at": "2020-01-01T00:00:00Z",
    }
    # Execute function
    result = save_location(location_id, data)
    assert result is True
    # Verify directory and file exist
    assert os.path.isdir(project_dir)
    target_path = os.path.join(project_dir, f"{location_id}.json")
    assert os.path.isfile(target_path)
    # Verify file content matches data
    with open(target_path, "r", encoding="utf-8") as f:
        loaded = json.load(f)
    assert loaded == data
    # Cleanup
    shutil.rmtree(os.path.abspath("./projects"))
