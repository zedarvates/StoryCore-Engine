"""
Video Engine System Validation Scalability Tests
Validates system scalability.
"""

import time
import logging
import threading
import queue
import numpy as np

logger = logging.getLogger(__name__)

class ScalabilityTests:
    """Handles scalability validation"""

    @staticmethod
    def validate_scalability(result, temp_project_dir):
        """Validate system scalability"""
        logger.info("📈 Validating system scalability...")

        test_start = time.time()

        try:
            scalability_results = ScalabilityTests._run_scalability_tests(temp_project_dir)

            # Analyze scalability metrics
            scalability_passed = True

            for test_name, result_data in scalability_results.items():
                if result_data["success"]:
                    logger.info(f"    ✅ {test_name}: {result_data['summary']}")

                    # Add performance metrics
                    if "processing_time" in result_data:
                        result.add_performance_metric(
                            f"scalability_{test_name}_time",
                            result_data["processing_time"],
                            "seconds"
                        )
                else:
                    logger.warning(f"    ⚠️  {test_name}: {result_data.get('error', 'Failed')}")
                    scalability_passed = False

            duration = time.time() - test_start
            result.add_test_result("Scalability", scalability_passed, duration)

            if scalability_passed:
                logger.info("    🎯 Scalability validation passed")
            else:
                logger.warning("    ⚠️  Scalability validation needs attention")

        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Scalability validation failed: {e}")
            result.add_test_result("Scalability", False, duration)
            result.add_error(f"Scalability validation failed: {e}")

    @staticmethod
    def _run_scalability_tests(temp_project_dir):
        """Run scalability tests"""

        results = {}

        # Test 1: Multiple shot processing
        results["multiple_shots"] = ScalabilityTests._test_multiple_shot_scalability(temp_project_dir)

        # Test 2: Large frame count handling
        results["large_frame_count"] = ScalabilityTests._test_large_frame_count_scalability()

        # Test 3: Concurrent processing
        results["concurrent_processing"] = ScalabilityTests._test_concurrent_processing_scalability(temp_project_dir)

        return results

    @staticmethod
    def _test_multiple_shot_scalability(temp_project_dir):
        """Test processing multiple shots"""
        logger.info("    🧪 Testing multiple shot scalability...")

        try:
            from video_engine import VideoEngine, VideoConfig

            config = VideoConfig(
                frame_rate=24,
                resolution=(1280, 720),  # Moderate resolution for scalability test
                quality="medium"
            )

            engine = VideoEngine(config)
            engine.load_project(temp_project_dir)

            # Process multiple shots
            shot_ids = ["shot_001", "shot_002", "shot_003"]

            start_time = time.time()
            successful_shots = 0

            for shot_id in shot_ids:
                result = engine.generate_video_sequence(shot_id)
                if result.success:
                    successful_shots += 1

            processing_time = time.time() - start_time

            success_rate = (successful_shots / len(shot_ids)) * 100

            return {
                "success": success_rate >= 80.0,  # 80% success threshold
                "processing_time": processing_time,
                "shots_processed": successful_shots,
                "total_shots": len(shot_ids),
                "success_rate": success_rate,
                "summary": f"{successful_shots}/{len(shot_ids)} shots ({success_rate:.1f}%)"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def _test_large_frame_count_scalability():
        """Test handling of large frame counts"""
        logger.info("    🧪 Testing large frame count scalability...")

        try:
            # This would test processing a longer sequence
            # For validation, we'll simulate this with a reasonable test

            from advanced_interpolation_engine import (
                AdvancedInterpolationEngine,
                create_cinematic_preset
            )

            config = create_cinematic_preset("documentary")  # Efficient preset
            engine = AdvancedInterpolationEngine(config)

            # Test with larger frame count
            keyframes = [
                np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8),
                np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8)
            ]

            large_frame_count = 240  # 10 seconds at 24fps

            start_time = time.time()
            interpolated_frames = engine.interpolate_frames(keyframes, large_frame_count)
            processing_time = time.time() - start_time

            success = len(interpolated_frames) == large_frame_count

            return {
                "success": success,
                "processing_time": processing_time,
                "target_frames": large_frame_count,
                "actual_frames": len(interpolated_frames),
                "summary": f"{len(interpolated_frames)}/{large_frame_count} frames in {processing_time:.1f}s"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def _test_concurrent_processing_scalability(temp_project_dir):
        """Test concurrent processing capabilities"""
        logger.info("    🧪 Testing concurrent processing scalability...")

        try:
            from video_engine import VideoEngine, VideoConfig

            config = VideoConfig(
                frame_rate=24,
                resolution=(854, 480),  # Lower resolution for concurrent test
                quality="low",
                parallel_processing=True
            )

            # Test concurrent processing with multiple engines
            def process_shot(shot_id, result_queue):
                try:
                    engine = VideoEngine(config)
                    engine.load_project(temp_project_dir)
                    result = engine.generate_video_sequence(shot_id)
                    result_queue.put({"shot_id": shot_id, "success": result.success})
                except Exception as e:
                    result_queue.put({"shot_id": shot_id, "success": False, "error": str(e)})

            # Start concurrent processing
            result_queue = queue.Queue()
            threads = []
            shot_ids = ["shot_001", "shot_002"]

            start_time = time.time()

            for shot_id in shot_ids:
                thread = threading.Thread(target=process_shot, args=(shot_id, result_queue))
                thread.start()
                threads.append(thread)

            # Wait for completion
            for thread in threads:
                thread.join(timeout=60)  # 60 second timeout

            processing_time = time.time() - start_time

            # Collect results
            results = []
            while not result_queue.empty():
                results.append(result_queue.get())

            successful_concurrent = sum(1 for r in results if r["success"])

            return {
                "success": successful_concurrent >= len(shot_ids) // 2,  # At least half successful
                "processing_time": processing_time,
                "concurrent_shots": len(shot_ids),
                "successful_shots": successful_concurrent,
                "summary": f"{successful_concurrent}/{len(shot_ids)} concurrent shots"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }