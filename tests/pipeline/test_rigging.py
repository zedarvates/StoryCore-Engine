import json
import pytest
from pathlib import Path

# Import the rigging module
from src.pipeline.rigging.rigging import rig_character

# Sample keypoints with all required points (coordinates are dummy)
VALID_KEYPOINTS = {
    "head": {"x": 0, "y": 0, "z": 0},
    "neck": {"x": 0, "y": 0, "z": 0},
    "left_shoulder": {"x": 0, "y": 0, "z": 0},
    "right_shoulder": {"x": 0, "y": 0, "z": 0},
    "left_elbow": {"x": 0, "y": 0, "z": 0},
    "right_elbow": {"x": 0, "y": 0, "z": 0},
    "left_hand": {"x": 0, "y": 0, "z": 0},
    "right_hand": {"x": 0, "y": 0, "z": 0},
    "spine": {"x": 0, "y": 0, "z": 0},
    "hips": {"x": 0, "y": 0, "z": 0},
    "left_hip": {"x": 0, "y": 0, "z": 0},
    "right_hip": {"x": 0, "y": 0, "z": 0},
    "left_knee": {"x": 0, "y": 0, "z": 0},
    "right_knee": {"x": 0, "y": 0, "z": 0},
    "left_foot": {"x": 0, "y": 0, "z": 0},
    "right_foot": {"x": 0, "y": 0, "z": 0},
}

def test_rig_character_success():
    meta = rig_character(VALID_KEYPOINTS)
    # Verify returned metadata structure
    assert isinstance(meta, dict)
    assert "file_path" in meta
    assert "bone_count" in meta
    assert "hash" in meta
    # File should exist
    assert Path(meta["file_path"]).is_file()
    # Bone count should match the hierarchy defined in rigging.py (18 bones)
    assert meta["bone_count"] == 18

def test_rig_character_missing_keypoints():
    incomplete = VALID_KEYPOINTS.copy()
    incomplete.pop("head")
    with pytest.raises(ValueError):
        rig_character(incomplete)
