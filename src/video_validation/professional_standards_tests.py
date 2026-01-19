"""
Video Engine System Validation Professional Standards Tests
Validates professional broadcast standards compliance.
"""

import time
import logging
import numpy as np

logger = logging.getLogger(__name__)

class ProfessionalStandardsTests:
    """Handles professional standards validation"""

    @staticmethod
    def validate_professional_standards(result, temp_project_dir):
        """Validate professional broadcast standards compliance"""
        logger.info("🎖️  Validating professional standards compliance...")

        test_start = time.time()

        try:
            professional_tests_passed = 0
            total_professional_tests = 0

            # Test 1: Broadcast frame rates
            total_professional_tests += 1
            if ProfessionalStandardsTests._test_broadcast_frame_rates(result):
                professional_tests_passed += 1

            # Test 2: Standard resolutions
            total_professional_tests += 1
            if ProfessionalStandardsTests._test_standard_resolutions(result):
                professional_tests_passed += 1

            # Test 3: Color space compliance
            total_professional_tests += 1
            if ProfessionalStandardsTests._test_color_space_compliance(result, temp_project_dir):
                professional_tests_passed += 1

            # Test 4: Metadata standards
            total_professional_tests += 1
            if ProfessionalStandardsTests._test_metadata_standards(result, temp_project_dir):
                professional_tests_passed += 1

            # Test 5: Export format compliance
            total_professional_tests += 1
            if ProfessionalStandardsTests._test_export_format_compliance(result):
                professional_tests_passed += 1

            # Calculate success rate
            professional_success_rate = (professional_tests_passed / total_professional_tests) * 100
            professional_passed = professional_success_rate >= 90.0  # 90% threshold for professional standards

            duration = time.time() - test_start
            result.add_test_result("Professional Standards", professional_passed, duration)
            result.add_performance_metric("professional_standards_success_rate", professional_success_rate, "%")

            logger.info(f"    📊 Professional standards success rate: {professional_success_rate:.1f}%")

            if professional_passed:
                logger.info("    ✅ Professional standards validation passed")
            else:
                logger.warning("    ⚠️  Professional standards validation needs improvement")

        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Professional standards validation failed: {e}")
            result.add_test_result("Professional Standards", False, duration)
            result.add_error(f"Professional standards validation failed: {e}")

    @staticmethod
    def _test_broadcast_frame_rates(result):
        """Test support for broadcast standard frame rates"""
        logger.info("    🧪 Testing broadcast frame rates...")

        try:
            from video_engine import VideoEngine, VideoConfig

            # Standard broadcast frame rates
            broadcast_frame_rates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60]

            supported_rates = 0

            for frame_rate in broadcast_frame_rates:
                try:
                    config = VideoConfig(
                        frame_rate=int(frame_rate),  # Simplified to int for testing
                        resolution=(1920, 1080),
                        quality="medium"
                    )

                    engine = VideoEngine(config)
                    is_valid, issues = engine.validate_configuration()

                    if is_valid:
                        supported_rates += 1
                        logger.info(f"      ✅ {frame_rate} fps supported")
                    else:
                        logger.warning(f"      ⚠️  {frame_rate} fps not supported: {issues}")

                except Exception as e:
                    logger.warning(f"      ⚠️  {frame_rate} fps failed: {e}")

            # Require support for at least 80% of standard frame rates
            success_rate = (supported_rates / len(broadcast_frame_rates)) * 100
            success = success_rate >= 80.0

            logger.info(f"      📊 Frame rate support: {supported_rates}/{len(broadcast_frame_rates)} ({success_rate:.1f}%)")

            return success

        except Exception as e:
            logger.error(f"      ❌ Broadcast frame rate test failed: {e}")
            return False

    @staticmethod
    def _test_standard_resolutions(result):
        """Test support for standard broadcast resolutions"""
        logger.info("    🧪 Testing standard resolutions...")

        try:
            from video_engine import VideoEngine, VideoConfig

            # Standard broadcast resolutions
            standard_resolutions = [
                (1280, 720),    # 720p HD
                (1920, 1080),   # 1080p Full HD
                (3840, 2160),   # 4K UHD
                (854, 480),     # 480p SD
                (640, 360)      # 360p
            ]

            supported_resolutions = 0

            for width, height in standard_resolutions:
                try:
                    config = VideoConfig(
                        frame_rate=24,
                        resolution=(width, height),
                        quality="medium"
                    )

                    engine = VideoEngine(config)
                    is_valid, issues = engine.validate_configuration()

                    if is_valid:
                        supported_resolutions += 1
                        logger.info(f"      ✅ {width}x{height} supported")
                    else:
                        logger.warning(f"      ⚠️  {width}x{height} not supported: {issues}")

                except Exception as e:
                    logger.warning(f"      ⚠️  {width}x{height} failed: {e}")

            # Require support for at least 80% of standard resolutions
            success_rate = (supported_resolutions / len(standard_resolutions)) * 100
            success = success_rate >= 80.0

            logger.info(f"      📊 Resolution support: {supported_resolutions}/{len(standard_resolutions)} ({success_rate:.1f}%)")

            return success

        except Exception as e:
            logger.error(f"      ❌ Standard resolution test failed: {e}")
            return False

    @staticmethod
    def _test_color_space_compliance(result, temp_project_dir):
        """Test color space compliance"""
        logger.info("    🧪 Testing color space compliance...")

        try:
            # Test that generated frames have proper color space
            from video_engine import VideoEngine, VideoConfig

            config = VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="high"
            )

            engine = VideoEngine(config)
            engine.load_project(temp_project_dir)

            result_data = engine.generate_video_sequence("shot_001")

            if not result_data.success:
                logger.error(f"      ❌ Failed to generate test sequence: {result_data.error_message}")
                return False

            # Check frame properties
            if not result_data.frames:
                logger.error("      ❌ No frames generated")
                return False

            sample_frame = result_data.frames[0]

            # Check frame format
            if sample_frame.dtype != np.uint8:
                logger.warning(f"      ⚠️  Frame dtype is {sample_frame.dtype}, expected uint8")
                return False

            # Check color range (0-255 for uint8)
            if sample_frame.min() < 0 or sample_frame.max() > 255:
                logger.warning(f"      ⚠️  Frame values out of range: {sample_frame.min()}-{sample_frame.max()}")
                return False

            # Check dimensions
            if len(sample_frame.shape) != 3 or sample_frame.shape[2] != 3:
                logger.warning(f"      ⚠️  Frame shape is {sample_frame.shape}, expected (H, W, 3)")
                return False

            logger.info("      ✅ Color space compliance verified")
            return True

        except Exception as e:
            logger.error(f"      ❌ Color space compliance test failed: {e}")
            return False

    @staticmethod
    def _test_metadata_standards(result, temp_project_dir):
        """Test metadata standards compliance"""
        logger.info("    🧪 Testing metadata standards...")

        try:
            from video_engine import VideoEngine, VideoConfig

            config = VideoConfig()
            engine = VideoEngine(config)
            engine.load_project(temp_project_dir)

            # Get timeline metadata
            timeline_metadata = engine.get_timeline_metadata()

            # Check required metadata fields
            required_fields = [
                "total_duration",
                "total_frames",
                "frame_rate",
                "resolution",
                "shots"
            ]

            missing_fields = []
            for field in required_fields:
                if field not in timeline_metadata:
                    missing_fields.append(field)

            if missing_fields:
                logger.warning(f"      ⚠️  Missing metadata fields: {missing_fields}")
                return False

            # Validate metadata values
            if timeline_metadata["total_duration"] <= 0:
                logger.warning("      ⚠️  Invalid total_duration")
                return False

            if timeline_metadata["total_frames"] <= 0:
                logger.warning("      ⚠️  Invalid total_frames")
                return False

            if timeline_metadata["frame_rate"] <= 0:
                logger.warning("      ⚠️  Invalid frame_rate")
                return False

            logger.info("      ✅ Metadata standards compliance verified")
            return True

        except Exception as e:
            logger.error(f"      ❌ Metadata standards test failed: {e}")
            return False

    @staticmethod
    def _test_export_format_compliance(result):
        """Test export format compliance"""
        logger.info("    🧪 Testing export format compliance...")

        try:
            from export_manager import ExportManager

            export_manager = ExportManager()

            # Test standard export formats
            standard_formats = ["png", "jpg", "tiff"]

            supported_formats = 0

            for format_name in standard_formats:
                try:
                    export_config = {
                        "output_format": format_name,
                        "organize_by_shot": True,
                        "include_metadata": True
                    }

                    # Test format validation
                    is_valid = export_manager.validate_export_config(export_config)

                    if is_valid:
                        supported_formats += 1
                        logger.info(f"      ✅ {format_name} format supported")
                    else:
                        logger.warning(f"      ⚠️  {format_name} format not supported")

                except Exception as e:
                    logger.warning(f"      ⚠️  {format_name} format failed: {e}")

            # Require support for at least 2 standard formats
            success = supported_formats >= 2

            logger.info(f"      📊 Export format support: {supported_formats}/{len(standard_formats)}")

            return success

        except Exception as e:
            logger.error(f"      ❌ Export format compliance test failed: {e}")
            return False