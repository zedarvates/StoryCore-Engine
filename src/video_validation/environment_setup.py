"""
Video Engine System Validation Environment Setup
Handles setup and cleanup of validation environment.
"""

import tempfile
import json
import logging
import shutil
from pathlib import Path
import numpy as np

logger = logging.getLogger(__name__)

class EnvironmentSetup:
    """Handles validation environment setup and cleanup"""

    @staticmethod
    def setup_validation_environment(result):
        """Setup validation environment"""
        logger.info("🔧 Setting up validation environment...")

        try:
            # Create temporary project directory
            temp_project_dir = tempfile.mkdtemp(prefix="video_engine_validation_")
            logger.info(f"📁 Created temp project: {temp_project_dir}")

            # Create mock project
            EnvironmentSetup._create_mock_project(temp_project_dir)

            result.add_test_result("Environment Setup", True, 0.0)

            return temp_project_dir

        except Exception as e:
            logger.error(f"❌ Environment setup failed: {e}")
            result.add_test_result("Environment Setup", False, 0.0)
            result.add_error(f"Environment setup failed: {e}")
            raise

    @staticmethod
    def _create_mock_project(project_path):
        """Create mock project for validation"""
        project_path = Path(project_path)

        # Create project structure
        (project_path / "keyframes").mkdir(exist_ok=True)
        (project_path / "output").mkdir(exist_ok=True)
        (project_path / "metadata").mkdir(exist_ok=True)

        # Create mock project.json
        project_data = {
            "schema_version": "1.0",
            "project_name": "validation_project",
            "video_settings": {
                "frame_rate": 24,
                "resolution": [1920, 1080],
                "quality": "high"
            },
            "shots": [
                {"id": "shot_001", "duration": 5.0, "keyframes": 2},
                {"id": "shot_002", "duration": 3.0, "keyframes": 2},
                {"id": "shot_003", "duration": 4.0, "keyframes": 3}
            ]
        }

        with open(project_path / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)

        # Create mock keyframes
        EnvironmentSetup._create_mock_keyframes(project_path)

        logger.info("✅ Mock project created successfully")

    @staticmethod
    def _create_mock_keyframes(project_path: Path):
        """Create mock keyframes for testing"""
        keyframes_dir = project_path / "keyframes"

        # Create mock keyframes as numpy arrays saved to files
        for shot_data in [
            {"id": "shot_001", "keyframes": 2},
            {"id": "shot_002", "keyframes": 2},
            {"id": "shot_003", "keyframes": 3}
        ]:
            shot_dir = keyframes_dir / shot_data["id"]
            shot_dir.mkdir(exist_ok=True)

            for i in range(shot_data["keyframes"]):
                # Create mock keyframe (random image data)
                keyframe = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
                np.save(shot_dir / f"keyframe_{i:03d}.npy", keyframe)

    @staticmethod
    def cleanup_validation_environment(temp_project_dir, result):
        """Cleanup validation environment"""
        logger.info("🧹 Cleaning up validation environment...")

        try:
            if temp_project_dir and Path(temp_project_dir).exists():
                shutil.rmtree(temp_project_dir)
                logger.info(f"✅ Cleaned up temp project: {temp_project_dir}")
        except Exception as e:
            logger.warning(f"⚠️  Cleanup failed: {e}")
            result.add_warning(f"Cleanup failed: {e}")