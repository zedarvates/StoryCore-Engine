"""
Video Engine System Validation Quality Tests
Validates professional quality output standards.
"""

import time
import logging

logger = logging.getLogger(__name__)

class QualityTests:
    """Handles quality validation"""

    @staticmethod
    def validate_quality_standards(result, temp_project_dir):
        """Validate professional quality output standards"""
        logger.info("🎨 Validating quality standards...")

        test_start = time.time()

        try:
            # Quality targets
            quality_targets = {
                "temporal_coherence": 0.7,      # Minimum temporal coherence
                "motion_smoothness": 0.8,       # Minimum motion smoothness
                "visual_quality": 0.85,         # Minimum visual quality score
                "artifact_threshold": 0.1       # Maximum artifact level
            }

            # Run quality tests
            quality_results = QualityTests._run_quality_tests(temp_project_dir)

            all_quality_passed = True

            for metric_name, target_value in quality_targets.items():
                if metric_name in quality_results:
                    actual_value = quality_results[metric_name]
                    passed = actual_value >= target_value

                    if passed:
                        logger.info(f"    ✅ {metric_name}: {actual_value:.3f} (target: {target_value:.3f})")
                    else:
                        logger.warning(f"    ⚠️  {metric_name}: {actual_value:.3f} (below target: {target_value:.3f})")
                        all_quality_passed = False

                    result.add_quality_metric(metric_name, actual_value, target_value)
                else:
                    logger.warning(f"    ⚠️  {metric_name}: Not measured")
                    all_quality_passed = False

            duration = time.time() - test_start
            result.add_test_result("Quality Standards", all_quality_passed, duration)

            if all_quality_passed:
                logger.info("    🎯 All quality standards met")
            else:
                logger.warning("    ⚠️  Some quality standards not met")

        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Quality validation failed: {e}")
            result.add_test_result("Quality Standards", False, duration)
            result.add_error(f"Quality validation failed: {e}")

    @staticmethod
    def _run_quality_tests(temp_project_dir):
        """Run quality validation tests"""

        try:
            from quality_validator import QualityValidator
            from video_engine import VideoEngine, VideoConfig

            # Setup quality validator
            validator = QualityValidator()

            # Generate test sequence
            config = VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="high"
            )

            engine = VideoEngine(config)
            engine.load_project(temp_project_dir)

            result = engine.generate_video_sequence("shot_001")

            if not result.success:
                raise RuntimeError(f"Failed to generate test sequence: {result.error_message}")

            # Validate quality
            quality_metrics = validator.validate_sequence(result.frames)

            # Calculate specific metrics
            temporal_coherence = validator.calculate_temporal_coherence(result.frames)
            motion_smoothness = validator.calculate_motion_smoothness(result.frames)
            visual_quality = validator.calculate_visual_quality_score(result.frames)
            artifact_level = validator.detect_artifacts(result.frames)

            return {
                "temporal_coherence": temporal_coherence,
                "motion_smoothness": motion_smoothness,
                "visual_quality": visual_quality,
                "artifact_threshold": 1.0 - artifact_level  # Invert so higher is better
            }

        except Exception as e:
            logger.error(f"Quality test failed: {e}")
            return {}