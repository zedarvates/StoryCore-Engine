import json
import sys
from pathlib import Path
from .rigging import rig_character


def main():
    if len(sys.argv) != 2:
        print("Usage: python -m src.pipeline.rigging <keypoints_json_path>")
        sys.exit(1)
    kp_path = Path(sys.argv[1])
    if not kp_path.is_file():
        print(f"Keypoints file not found: {kp_path}")
        sys.exit(1)
    try:
        with kp_path.open('r', encoding='utf-8') as f:
            kp_data = json.load(f)
        meta = rig_character(kp_data)
        print(json.dumps(meta, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
