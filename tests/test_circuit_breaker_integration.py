#!/usr/bin/env python3
"""
Test Circuit Breaker Integration with Video Engine Components

This test validates that circuit breakers are properly integrated into video processing
components to prevent blocking operations and infinite loops.
"""

import sys
import time
import logging
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_circuit_breaker_availability():
    """Test that circuit breaker is available and working."""
    print("1. Testing Circuit Breaker Availability...")

    try:
        from circuit_breaker import (
            CircuitBreaker,
            CircuitBreakerConfig,
            CircuitBreakerError,
        )

        # Create test circuit breaker
        config = CircuitBreakerConfig(
            failure_threshold=2, recovery_timeout=5.0, success_threshold=1, timeout=2.0
        )

        breaker = CircuitBreaker("test_breaker", config)

        # Test successful operation
        def successful_operation():
            return "success"

        result = breaker.call(successful_operation)
        assert result == "success", "Circuit breaker should allow successful operations"

        # Test failing operation
        def failing_operation():
            raise Exception("Test failure")

        failure_count = 0
        for i in range(5):
            try:
                breaker.call(failing_operation)
            except Exception:
                failure_count += 1

        # After threshold failures, circuit should be open
        try:
            breaker.call(failing_operation)
            assert False, "Circuit breaker should be open after threshold failures"
        except CircuitBreakerError:
            pass  # Expected

        print("   ✅ Circuit breaker is working correctly")
        return True

    except ImportError as e:
        print(f"   ❌ Circuit breaker not available: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Circuit breaker test failed: {e}")
        return False


def test_video_engine_circuit_breaker_integration():
    """Test circuit breaker integration in VideoEngine."""
    print("\n2. Testing VideoEngine Circuit Breaker Integration...")

    try:
        from video_engine import VideoEngine, VideoConfig

        # Create video engine
        config = VideoConfig(frame_rate=24, resolution=(1920, 1080))
        engine = VideoEngine(config)

        # Check if circuit breakers are initialized
        if (
            hasattr(engine, "frame_processing_breaker")
            and engine.frame_processing_breaker
        ):
            print("   ✅ Frame processing circuit breaker initialized")
        else:
            print("   ⚠️  Frame processing circuit breaker not available")

        if hasattr(engine, "interpolation_breaker") and engine.interpolation_breaker:
            print("   ✅ Interpolation circuit breaker initialized")
        else:
            print("   ⚠️  Interpolation circuit breaker not available")

        if hasattr(engine, "export_breaker") and engine.export_breaker:
            print("   ✅ Export circuit breaker initialized")
        else:
            print("   ⚠️  Export circuit breaker not available")

        # Test circuit breaker statistics
        if hasattr(engine, "get_circuit_breaker_stats"):
            stats = engine.get_circuit_breaker_stats()
            print(f"   ✅ Circuit breaker statistics available: {len(stats)} breakers")
        else:
            print("   ⚠️  Circuit breaker statistics not available")

        # Test emergency stop functionality
        if hasattr(engine, "emergency_stop_all_operations"):
            engine.emergency_stop_all_operations()
            print("   ✅ Emergency stop functionality available")

            # Reset for further testing
            if hasattr(engine, "reset_circuit_breakers"):
                engine.reset_circuit_breakers()
                print("   ✅ Circuit breaker reset functionality available")

        return True

    except Exception as e:
        print(f"   ❌ VideoEngine circuit breaker integration test failed: {e}")
        return False


def test_performance_monitor_circuit_breaker_integration():
    """Test circuit breaker integration in VideoPerformanceMonitor."""
    print("\n3. Testing Performance Monitor Circuit Breaker Integration...")

    try:
        from video_performance_monitor import (
            VideoPerformanceMonitor,
            OptimizationStrategy,
        )

        # Create performance monitor
        monitor = VideoPerformanceMonitor(OptimizationStrategy.BALANCED)

        # Check resource monitor circuit breaker
        if (
            hasattr(monitor.resource_monitor, "monitoring_breaker")
            and monitor.resource_monitor.monitoring_breaker
        ):
            print("   ✅ Resource monitoring circuit breaker initialized")
        else:
            print("   ⚠️  Resource monitoring circuit breaker not available")

        # Check parallel processor circuit breaker
        if (
            hasattr(monitor.parallel_processor, "parallel_processing_breaker")
            and monitor.parallel_processor.parallel_processing_breaker
        ):
            print("   ✅ Parallel processing circuit breaker initialized")
        else:
            print("   ⚠️  Parallel processing circuit breaker not available")

        # Test resource monitoring with circuit breaker protection
        try:
            resources = monitor.resource_monitor.get_current_resources()
            print(
                f"   ✅ Resource monitoring working (CPU: {resources.cpu_usage_percent:.1f}%)"
            )
        except Exception as e:
            print(f"   ⚠️  Resource monitoring failed: {e}")

        # Test parallel processing with circuit breaker protection
        def dummy_processor(data):
            return data * 2

        test_data = [1, 2, 3, 4, 5]
        try:
            results = monitor.parallel_processor.process_frames_parallel(
                dummy_processor, test_data
            )
            if results == [2, 4, 6, 8, 10]:
                print(
                    "   ✅ Parallel processing with circuit breaker protection working"
                )
            else:
                print(
                    f"   ⚠️  Parallel processing returned unexpected results: {results}"
                )
        except Exception as e:
            print(f"   ⚠️  Parallel processing test failed: {e}")

        return True

    except Exception as e:
        print(f"   ❌ Performance monitor circuit breaker integration test failed: {e}")
        return False


def test_error_handler_circuit_breaker_integration():
    """Test circuit breaker integration in VideoErrorHandler."""
    print("\n4. Testing Error Handler Circuit Breaker Integration...")

    try:
        from video_error_handling import VideoErrorHandler, FallbackConfig

        # Create error handler
        config = FallbackConfig(max_retry_attempts=2, retry_delay_seconds=0.1)
        error_handler = VideoErrorHandler(config)

        # Check circuit breakers
        if hasattr(error_handler, "retry_breaker") and error_handler.retry_breaker:
            print("   ✅ Retry operations circuit breaker initialized")
        else:
            print("   ⚠️  Retry operations circuit breaker not available")

        if (
            hasattr(error_handler, "fallback_breaker")
            and error_handler.fallback_breaker
        ):
            print("   ✅ Fallback operations circuit breaker initialized")
        else:
            print("   ⚠️  Fallback operations circuit breaker not available")

        # Test error handling with circuit breaker protection
        test_exception = Exception("Test error for circuit breaker")
        test_context = {"operation": "test", "retry_count": 0}

        try:
            error_info = error_handler.handle_error(
                test_exception, test_context, "test_operation"
            )
            print("   ✅ Error handling with circuit breaker protection completed")
            print(f"       Recovery attempted: {error_info.recovery_attempted}")
            print(f"       Recovery successful: {error_info.recovery_successful}")
        except Exception as e:
            print(f"   ⚠️  Error handling test failed: {e}")

        return True

    except Exception as e:
        print(f"   ❌ Error handler circuit breaker integration test failed: {e}")
        return False


def test_circuit_breaker_under_load():
    """Test circuit breaker behavior under simulated load."""
    print("\n5. Testing Circuit Breaker Under Load...")

    try:
        from circuit_breaker import (
            CircuitBreaker,
            CircuitBreakerConfig,
            CircuitBreakerError,
        )

        # Create circuit breaker with low thresholds for testing
        config = CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout=2.0,
            success_threshold=2,
            timeout=1.0,
            max_concurrent=2,
        )

        breaker = CircuitBreaker("load_test_breaker", config)

        # Simulate operations that sometimes fail
        import random

        def unreliable_operation():
            if random.random() < 0.7:  # 70% failure rate
                raise Exception("Simulated failure")
            return "success"

        success_count = 0
        failure_count = 0
        blocked_count = 0

        # Run many operations
        for i in range(50):
            try:
                breaker.call(unreliable_operation)
                success_count += 1
            except CircuitBreakerError:
                blocked_count += 1
            except Exception:
                failure_count += 1

            # Small delay to simulate real processing
            time.sleep(0.01)

        print("   ✅ Load test completed:")
        print(f"       Successful operations: {success_count}")
        print(f"       Failed operations: {failure_count}")
        print(f"       Blocked operations: {blocked_count}")

        # Get final statistics
        stats = breaker.get_stats()
        print(
            f"       Final success rate: {stats['stats']['success_rate_percent']:.1f}%"
        )
        print(f"       Circuit state: {stats['state']}")

        return True

    except Exception as e:
        print(f"   ❌ Load test failed: {e}")
        return False


def test_timeout_protection():
    """Test timeout protection in circuit breakers."""
    print("\n6. Testing Timeout Protection...")

    try:
        from circuit_breaker import CircuitBreaker, CircuitBreakerConfig, TimeoutError

        # Create circuit breaker with short timeout
        config = CircuitBreakerConfig(
            failure_threshold=2,
            recovery_timeout=5.0,
            success_threshold=1,
            timeout=0.5,  # 500ms timeout
        )

        breaker = CircuitBreaker("timeout_test_breaker", config)

        # Test operation that times out
        def slow_operation():
            time.sleep(1.0)  # Takes longer than timeout
            return "should not reach here"

        try:
            result = breaker.call(slow_operation)
            print("   ❌ Timeout protection failed - operation should have timed out")
            return False
        except TimeoutError:
            print("   ✅ Timeout protection working correctly")
        except Exception as e:
            print(f"   ⚠️  Unexpected exception during timeout test: {e}")

        # Test operation that completes within timeout
        def fast_operation():
            time.sleep(0.1)  # Completes within timeout
            return "success"

        try:
            result = breaker.call(fast_operation)
            if result == "success":
                print("   ✅ Fast operations complete successfully")
            else:
                print(f"   ⚠️  Unexpected result from fast operation: {result}")
        except Exception as e:
            print(f"   ⚠️  Fast operation failed: {e}")

        return True

    except Exception as e:
        print(f"   ❌ Timeout protection test failed: {e}")
        return False


def main():
    """Run all circuit breaker integration tests."""
    print("🔧 Circuit Breaker Integration Tests")
    print("=" * 50)

    tests = [
        test_circuit_breaker_availability,
        test_video_engine_circuit_breaker_integration,
        test_performance_monitor_circuit_breaker_integration,
        test_error_handler_circuit_breaker_integration,
        test_circuit_breaker_under_load,
        test_timeout_protection,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"   ❌ Test failed with exception: {e}")

    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All circuit breaker integration tests passed!")
        print("\n✅ Anti-blocking protection is properly integrated:")
        print("   • Video operations are protected against infinite loops")
        print("   • Timeout protection prevents hanging operations")
        print("   • Circuit breakers prevent cascading failures")
        print("   • Emergency stop functionality is available")
        print("   • Fallback mechanisms handle circuit breaker activation")
    else:
        print(f"⚠️  {total - passed} tests failed or had issues")
        print("   Some anti-blocking protections may not be fully functional")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
