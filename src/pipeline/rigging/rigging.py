import json
import hashlib
import logging
from pathlib import Path

# Configure structured logger
logger = logging.getLogger("rigging")
handler = logging.StreamHandler()
formatter = logging.Formatter('{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Expected keypoint names for a basic humanoid skeleton
EXPECTED_POINTS = [
    "head",
    "neck",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_hand",
    "right_hand",
    "spine",
    "hips",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_foot",
    "right_foot",
]

def _hash_keypoints(keypoints: dict) -> str:
    """Compute SHA256 hash of the canonical JSON representation of keypoints."""
    canonical = json.dumps(keypoints, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

def _validate_keypoints(keypoints: dict) -> None:
    """Raise an error if required points are missing."""
    missing = [p for p in EXPECTED_POINTS if p not in keypoints]
    if missing:
        logger.error(f"Missing keypoints: {missing}")
        raise ValueError(f"Missing required keypoints: {missing}")

def _build_bone_hierarchy(keypoints: dict) -> list:
    """Return a list of bone dictionaries with name and parent index.
    The hierarchy follows a simple humanoid chain.
    """
    # Define bone order and parent relationships (index of parent in the list)
    bones = [
        {"name": "hips", "parent": -1},
        {"name": "spine", "parent": 0},
        {"name": "neck", "parent": 1},
        {"name": "head", "parent": 2},
        {"name": "left_shoulder", "parent": 2},
        {"name": "left_arm", "parent": 4},
        {"name": "left_forearm", "parent": 5},
        {"name": "left_hand", "parent": 6},
        {"name": "right_shoulder", "parent": 2},
        {"name": "right_arm", "parent": 8},
        {"name": "right_forearm", "parent": 9},
        {"name": "right_hand", "parent": 10},
        {"name": "left_up_leg", "parent": 0},
        {"name": "left_leg", "parent": 11},
        {"name": "left_foot", "parent": 12},
        {"name": "right_up_leg", "parent": 0},
        {"name": "right_leg", "parent": 14},
        {"name": "right_foot", "parent": 15},
    ]
    # In a real implementation we would compute bone transforms from keypoint coordinates.
    # Here we simply return the hierarchy.
    return bones

def _export_gltf(bones: list, output_path: Path) -> None:
    """Export a minimal glTF file containing the bone nodes.
    This is a placeholder implementation that creates a glTF JSON structure.
    """
    gltf = {
        "asset": {"version": "2.0"},
        "nodes": [],
        "skins": [{"joints": []}],
    }
    for idx, bone in enumerate(bones):
        node = {
            "name": bone["name"],
            "translation": [0, 0, 0],  # placeholder
        }
        if bone["parent"] != -1:
            node["parent"] = bone["parent"]
        gltf["nodes"].append(node)
        gltf["skins"][0]["joints"].append(idx)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(gltf, f, ensure_ascii=False, indent=2)
    logger.info(f"Exported glTF skeleton to {output_path}")

def rig_character(keypoints: dict) -> dict:
    """Public API to rig a character from keypoints.
    Returns metadata: {'file_path': str, 'bone_count': int, 'hash': str}
    """
    logger.info("Starting rigging process")
    _validate_keypoints(keypoints)
    bones = _build_bone_hierarchy(keypoints)
    bone_count = len(bones)
    keypoints_hash = _hash_keypoints(keypoints)
    output_dir = Path(__file__).parent
    output_file = output_dir / f"{keypoints_hash}.gltf"
    _export_gltf(bones, output_file)
    result = {
        "file_path": str(output_file),
        "bone_count": bone_count,
        "hash": keypoints_hash,
    }
    logger.info(f"Rigging completed: {result}")
    return result

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python -m src.pipeline.rigging <keypoints_json_path>")
        sys.exit(1)
    kp_path = Path(sys.argv[1])
    if not kp_path.is_file():
        logger.error(f"Keypoints file not found: {kp_path}")
        sys.exit(1)
    try:
        with kp_path.open("r", encoding="utf-8") as f:
            kp_data = json.load(f)
        meta = rig_character(kp_data)
        print(json.dumps(meta, indent=2))
    except Exception as e:
        logger.error(str(e))
        sys.exit(1)
