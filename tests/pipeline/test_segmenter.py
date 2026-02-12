import json
import os
import tempfile
from pathlib import Path
from unittest import mock

import pytest

# Import the module to test
import src.pipeline.segmenter as segmenter


def test_missing_file():
    """Segmenting a non‑existent file should raise FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        segmenter.segment_character("nonexistent.png")


def test_invalid_json_sheet(tmp_path):
    """A JSON sheet without an 'image_path' field should raise ValueError."""
    json_path = tmp_path / "sheet.json"
    json_path.write_text(json.dumps({"foo": "bar"}), encoding="utf-8")
    with pytest.raises(ValueError):
        segmenter.segment_character(str(json_path))


def test_successful_segmentation(tmp_path):
    """Happy path – a dummy image is processed and a JSON result is saved."""
    # Create a tiny PNG (1×1 pixel) – PNG header + minimal data
    png_data = (
        b"\x89PNG\r\n\x1a\n"
        b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00"
        b"\x90wS\xde\x00\x00\x00\x0cIDATx\x9c\x63\x60\x60\x60\x00\x00\x00\x04\x00\x01"
        b"\x0d\n\x2d\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    img_path = tmp_path / "dummy.png"
    img_path.write_bytes(png_data)

    # Mock the pose model to avoid heavy dependencies
    dummy_landmark = mock.Mock(x=0.5, y=0.5, z=0.0, visibility=1.0)
    dummy_pose = mock.Mock(pose_landmarks=mock.Mock(landmark=[dummy_landmark]))
    mock_model = mock.Mock()
    mock_model.process.return_value = dummy_pose
    with mock.patch.object(segmenter, "POSE_MODEL", mock_model):
        result = segmenter.segment_character(str(img_path))

    # Verify result structure
    assert isinstance(result, dict)
    assert "keypoints" in result
    assert len(result["keypoints"]) == 1
    # Verify output file exists and contains the same JSON
    img_hash = segmenter._hash_file(img_path)
    output_file = Path(__file__).parents[2] / "src" / "pipeline" / "segmentations" / f"{img_hash}.json"
    assert output_file.is_file()
    saved = json.loads(output_file.read_text(encoding="utf-8"))
    assert saved == result
