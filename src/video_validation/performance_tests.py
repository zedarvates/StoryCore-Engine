"""
Video Engine System Validation Performance Tests
Validates performance targets are met.
"""

import time
import logging
import gc

logger = logging.getLogger(__name__)

class PerformanceTests:
    """Handles performance validation"""

    @staticmethod
    def validate_performance_targets(result, temp_project_dir):
        """Validate performance targets are met"""
        logger.info("⚡ Validating performance targets...")

        test_start = time.time()

        try:
            # Performance target: < 30 seconds per second of video
            target_fps_threshold = 1.0 / 30.0  # 1 second of video in 30 seconds = ~0.033 processing FPS

            # Test performance with different configurations
            performance_results = PerformanceTests._run_performance_tests(temp_project_dir)

            # Validate performance targets
            successful_configs = []
            for config_name, result_data in performance_results.items():
                if result_data.get("success", False) and "processing_fps" in result_data:
                    processing_fps = result_data["processing_fps"]

                    if processing_fps >= target_fps_threshold:
                        logger.info(f"    ✅ {config_name}: {processing_fps:.3f} FPS (target: {target_fps_threshold:.3f})")
                        result.add_performance_metric(f"{config_name}_fps", processing_fps, "fps")
                        successful_configs.append(config_name)
                    else:
                        logger.warning(f"    ⚠️  {config_name}: {processing_fps:.3f} FPS (below target)")
                        result.add_warning(f"{config_name} below performance target", "Performance Validation")

                    # Add detailed metrics
                    result.add_performance_metric(f"{config_name}_processing_time", result_data["processing_time"], "seconds")
                    result.add_performance_metric(f"{config_name}_memory_usage", result_data["memory_usage_mb"], "MB")
                else:
                    error_msg = result_data.get("error", "Unknown error")
                    logger.error(f"    ❌ {config_name}: {error_msg}")
                    result.add_error(f"{config_name} performance test failed: {error_msg}")

            # Overall performance validation
            if successful_configs:
                successful_results = [performance_results[name] for name in successful_configs]
                best_fps = max(result["processing_fps"] for result in successful_results)
                performance_passed = best_fps >= target_fps_threshold
            else:
                best_fps = 0.0
                performance_passed = False

            duration = time.time() - test_start
            result.add_test_result("Performance Targets", performance_passed, duration)

            if performance_passed:
                logger.info(f"    🎯 Performance target met: {best_fps:.3f} FPS")
            else:
                logger.warning(f"    ⚠️  Performance target not met: {best_fps:.3f} FPS")

        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Performance validation failed: {e}")
            result.add_test_result("Performance Targets", False, duration)
            result.add_error(f"Performance validation failed: {e}")

    @staticmethod
    def _run_performance_tests(temp_project_dir):
        """Run performance tests with different configurations"""

        from video_engine import VideoEngine, VideoConfig
        import psutil
        import gc

        test_configs = {
            "gpu_optimized": VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="medium",
                gpu_acceleration=True,
                parallel_processing=True
            ),
            "cpu_optimized": VideoConfig(
                frame_rate=24,
                resolution=(1280, 720),
                quality="medium",
                gpu_acceleration=False,
                parallel_processing=True
            ),
            "balanced": VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="medium",
                gpu_acceleration=True,
                parallel_processing=False
            )
        }

        results = {}

        for config_name, config in test_configs.items():
            logger.info(f"  🧪 Testing {config_name} performance...")

            try:
                # Setup
                engine = VideoEngine(config)
                engine.load_project(temp_project_dir)

                # Monitor memory
                process = psutil.Process()
                memory_before = process.memory_info().rss / 1024**2  # MB

                # Performance test
                start_time = time.time()
                result = engine.generate_video_sequence("shot_001")  # 5 second shot
                end_time = time.time()

                memory_after = process.memory_info().rss / 1024**2  # MB

                if result.success:
                    processing_time = end_time - start_time
                    video_duration = result.duration  # seconds of video
                    processing_fps = video_duration / processing_time if processing_time > 0 else 0

                    results[config_name] = {
                        "success": True,
                        "processing_time": processing_time,
                        "video_duration": video_duration,
                        "processing_fps": processing_fps,
                        "frame_count": result.frame_count,
                        "memory_usage_mb": memory_after - memory_before
                    }

                    logger.info(f"    ✅ {config_name}: {processing_fps:.3f} FPS, {processing_time:.1f}s")
                else:
                    results[config_name] = {
                        "success": False,
                        "error": result.error_message
                    }
                    logger.error(f"    ❌ {config_name}: {result.error_message}")

                # Cleanup
                gc.collect()

            except Exception as e:
                results[config_name] = {
                    "success": False,
                    "error": str(e)
                }
                logger.error(f"    ❌ {config_name}: {e}")

        return results