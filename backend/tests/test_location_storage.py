import os
import json
import shutil
import tempfile
import asyncio
from pathlib import Path
import pytest
from backend.location_api import create_location, get_location, LocationCreate

@pytest.fixture
def temp_projects_dir():
    # Create a temporary directory for projects
    dir_path = tempfile.mkdtemp()
    # Change working directory to the temporary directory to avoid polluting the repo
    original_cwd = os.getcwd()
    os.chdir(dir_path)
    try:
        yield dir_path
    finally:
        os.chdir(original_cwd)
        shutil.rmtree(dir_path, ignore_errors=True)


def test_directory_creation_when_missing(temp_projects_dir):
    """Test that the 'lieux' directory is created if it does not exist when saving a location."""
    import uuid
    project_id = "testproj"
    location_id = str(uuid.uuid4())
    location_data = {
        "project_id": project_id,
        "name": "Mysterious Cave",
        "description": "A dark cave with hidden secrets",
        "location_type": "interior",
        "metadata": {},
        "cube_faces": None,
        "skybox_data": None,
    }
    # Ensure the project directory does not exist yet
    project_path = Path("./projects") / project_id / "lieux"
    if project_path.exists():
        shutil.rmtree(project_path.parent.parent)
    # Save location directly (this should trigger directory creation)
    from backend.location_api import save_location
    saved = save_location(location_id, location_data)
    assert saved is True
    # Verify that the directory was created
    assert project_path.is_dir(), f"Expected directory {project_path} to be created"
    # Verify that the location file exists and contains correct data
    location_file = project_path / f"{location_id}.json"
    assert location_file.is_file(), f"Expected location file {location_file} to exist"
    with open(location_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["name"] == location_data["name"]
