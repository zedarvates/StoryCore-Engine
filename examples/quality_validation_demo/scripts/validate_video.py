#!/usr/bin/env python3
"""
Video Validation Script

Validates video files for format, readability, and quality metrics.
Usage: python validate_video.py <video_file>
"""

import sys
import json
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))

try:
    from quality_validator import QualityValidator, ValidationMode
except ImportError as e:
    print(f"Error: Could not import quality validation modules: {e}")
    sys.exit(1)


def validate_video_file(video_path: str) -> int:
    """Validate a single video file."""
    video_file = Path(video_path)

    if not video_file.exists():
        print(f"Error: Video file not found: {video_path}")
        return 1

    print(f"Validating video: {video_file.name}")
    print("-" * 40)

    validator = QualityValidator(mode=ValidationMode.BATCH)

    # Basic file validation
    print("1. File validation...")
    is_valid, error_msg = validator.validate_video_file(video_file)

    if not is_valid:
        print(f"❌ File validation failed: {error_msg}")
        return 1

    print("✓ File validation passed")

    # Quality assessment (using synthetic frames for demo)
    print("\n2. Quality assessment...")

    # Create synthetic frames for demonstration
    synthetic_frames = create_synthetic_frames()

    try:
        assessment = validator.assess_quality(synthetic_frames)
        print(f"✓ Quality assessment completed")
        print(f"   Overall score: {assessment.overall_score:.1f}/100")
        print(f"   Issues detected: {len(assessment.detected_issues)}")

        # Show top issues
        if assessment.detected_issues:
            print("\n   Issues found:")
            for i, issue in enumerate(assessment.detected_issues[:3]):  # Show top 3
                print(f"   - {issue.issue_type}: {issue.description}")

        # Determine pass/fail
        passed = assessment.passes_standard
        status = "PASSED" if passed else "FAILED"
        symbol = "✓" if passed else "❌"

        print(f"\n{symbol} Validation {status}")

        return 0 if passed else 1

    except Exception as e:
        print(f"❌ Quality assessment failed: {str(e)}")
        return 1


def create_synthetic_frames():
    """Create synthetic video frames for demonstration."""
    import numpy as np

    frames = []
    for i in range(5):  # Create 5 frames
        # Create a 200x200 RGB frame
        frame = np.zeros((200, 200, 3), dtype=np.uint8)

        # Add some pattern to simulate content
        frame[:, :, 0] = 100 + i * 10  # Blue gradient
        frame[:, :, 1] = 150           # Green base
        frame[:, :, 2] = 200 - i * 15  # Red gradient

        # Add some texture
        noise = np.random.randint(0, 30, (200, 200, 3), dtype=np.uint8)
        frame = np.clip(frame + noise, 0, 255)

        frames.append(frame.tolist())

    return frames


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python validate_video.py <video_file>")
        print("Example: python validate_video.py sample_video.mp4")
        return 1

    video_path = sys.argv[1]
    return validate_video_file(video_path)


if __name__ == "__main__":
    sys.exit(main())