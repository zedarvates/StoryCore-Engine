"""
Video Engine System Validation Component Tests
Validates all components work together seamlessly.
"""

import time
import json
import logging
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

class ComponentTests:
    """Handles component integration validation"""

    @staticmethod
    def validate_component_integration(result, temp_project_dir):
        """Validate all components work together seamlessly"""
        logger.info("🔗 Validating component integration...")

        test_start = time.time()

        try:
            # Test 1: Video Engine initialization
            ComponentTests._test_video_engine_initialization(result, temp_project_dir)

            # Test 2: Advanced interpolation integration
            ComponentTests._test_advanced_interpolation_integration(result)

            # Test 3: Configuration management integration
            ComponentTests._test_configuration_management_integration(result)

            # Test 4: Pipeline integration
            ComponentTests._test_pipeline_integration(result, temp_project_dir)

            # Test 5: Export system integration
            ComponentTests._test_export_system_integration(result, temp_project_dir)

            duration = time.time() - test_start
            result.add_test_result("Component Integration", True, duration)
            result.add_performance_metric("component_integration_time", duration, "seconds")

        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Component integration failed: {e}")
            result.add_test_result("Component Integration", False, duration)
            result.add_error(f"Component integration failed: {e}")

    @staticmethod
    def _test_video_engine_initialization(result, temp_project_dir):
        """Test Video Engine initialization"""
        logger.info("  🧪 Testing Video Engine initialization...")

        try:
            from video_engine import VideoEngine, VideoConfig

            # Test basic initialization
            config = VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="high"
            )

            engine = VideoEngine(config)

            # Validate configuration
            is_valid, issues = engine.validate_configuration()
            if not is_valid:
                raise ValueError(f"Configuration validation failed: {issues}")

            # Test project loading
            if not engine.load_project(temp_project_dir):
                raise RuntimeError("Failed to load validation project")

            logger.info("    ✅ Video Engine initialization successful")

        except Exception as e:
            logger.error(f"    ❌ Video Engine initialization failed: {e}")
            raise

    @staticmethod
    def _test_advanced_interpolation_integration(result):
        """Test advanced interpolation integration"""
        logger.info("  🧪 Testing advanced interpolation integration...")

        try:
            from advanced_interpolation_engine import (
                AdvancedInterpolationEngine,
                create_cinematic_preset
            )

            # Test preset creation
            config = create_cinematic_preset("cinematic")
            engine = AdvancedInterpolationEngine(config)

            # Test configuration validation
            is_valid, issues = engine.validate_configuration()
            if not is_valid:
                raise ValueError(f"Advanced interpolation config invalid: {issues}")

            # Test basic interpolation
            keyframes = [
                np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8),
                np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
            ]

            camera_movement = {
                "type": "pan",
                "direction": "right",
                "amount": 0.1,
                "duration": 2.0,
                "easing": "ease_in_out"
            }

            interpolated_frames = engine.interpolate_frames(
                keyframes, 48, camera_movement
            )

            if len(interpolated_frames) != 48:
                raise ValueError(f"Expected 48 frames, got {len(interpolated_frames)}")

            logger.info("    ✅ Advanced interpolation integration successful")

        except Exception as e:
            logger.error(f"    ❌ Advanced interpolation integration failed: {e}")
            raise

    @staticmethod
    def _test_configuration_management_integration(result):
        """Test configuration management integration"""
        logger.info("  🧪 Testing configuration management integration...")

        try:
            from video_configuration_manager import VideoConfigurationManager

            config_manager = VideoConfigurationManager()

            # Test preset loading
            presets = ["documentary", "cinematic", "action", "portrait"]
            for preset_name in presets:
                config = config_manager.load_preset(preset_name)
                is_valid, issues = config_manager.validate_configuration(config)

                if not is_valid:
                    raise ValueError(f"Preset {preset_name} invalid: {issues}")

            # Test serialization
            config = config_manager.load_preset("cinematic")
            json_data = config_manager.serialize_configuration(config, "json")
            restored_config = config_manager.deserialize_configuration(json_data, "json")

            # Validate round-trip
            if config.frame_rate != restored_config.frame_rate:
                raise ValueError("Configuration serialization round-trip failed")

            logger.info("    ✅ Configuration management integration successful")

        except Exception as e:
            logger.error(f"    ❌ Configuration management integration failed: {e}")
            raise

    @staticmethod
    def _test_pipeline_integration(result, temp_project_dir):
        """Test pipeline integration"""
        logger.info("  🧪 Testing pipeline integration...")

        try:
            # Test Data Contract v1 compliance
            project_path = Path(temp_project_dir)
            project_file = project_path / "project.json"

            with open(project_file, 'r') as f:
                project_data = json.load(f)

            # Validate required fields
            required_fields = ["schema_version", "project_name", "video_settings"]
            for field in required_fields:
                if field not in project_data:
                    raise ValueError(f"Missing required field: {field}")

            # Test metadata generation
            from video_engine import VideoEngine, VideoConfig

            config = VideoConfig(**project_data["video_settings"])
            engine = VideoEngine(config)
            engine.load_project(str(project_path))

            timeline_metadata = engine.get_timeline_metadata()

            # Validate timeline metadata
            required_timeline_fields = ["total_duration", "total_frames", "frame_rate"]
            for field in required_timeline_fields:
                if field not in timeline_metadata:
                    raise ValueError(f"Missing timeline field: {field}")

            logger.info("    ✅ Pipeline integration successful")

        except Exception as e:
            logger.error(f"    ❌ Pipeline integration failed: {e}")
            raise

    @staticmethod
    def _test_export_system_integration(result, temp_project_dir):
        """Test export system integration"""
        logger.info("  🧪 Testing export system integration...")

        try:
            from export_manager import ExportManager

            export_manager = ExportManager()

            # Test export configuration
            export_config = {
                "output_format": "png",
                "organize_by_shot": True,
                "include_metadata": True,
                "generate_timeline": True
            }

            # Mock export test (would normally export actual frames)
            mock_frames = [
                np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
                for _ in range(24)
            ]

            export_result = export_manager.export_frame_sequence(
                mock_frames,
                str(Path(temp_project_dir) / "output" / "test_export"),
                export_config
            )

            if not export_result.success:
                raise RuntimeError(f"Export failed: {export_result.error_message}")

            logger.info("    ✅ Export system integration successful")

        except Exception as e:
            logger.error(f"    ❌ Export system integration failed: {e}")
            raise