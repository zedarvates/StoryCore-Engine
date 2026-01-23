"""
Simple test for Analytics AI Integration - Non-blocking validation.

Tests that the integration:
1. Doesn't block
2. Doesn't have infinite loops
3. Handles timeouts correctly
4. Stops gracefully
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from analytics_ai_integration import (
    AnalyticsAIIntegration,
    AnalyticsConfig,
    AIMetricEvent,
    AIMetricType,
    AIOperationType
)
from datetime import datetime


async def test_non_blocking_record():
    """Test that recording metrics doesn't block."""
    print("🧪 Test 1: Non-blocking metric recording")
    
    config = AnalyticsConfig(
        max_queue_size=10,  # Small queue to test overflow
        batch_size=5,
        batch_timeout_seconds=1.0
    )
    
    integration = AnalyticsAIIntegration(config)
    await integration.start()
    
    try:
        # Record metrics rapidly
        start_time = asyncio.get_event_loop().time()
        
        for i in range(20):  # More than queue size
            event = AIMetricEvent(
                timestamp=datetime.now(),
                operation_type=AIOperationType.STYLE_TRANSFER,
                metric_type=AIMetricType.PROCESSING_TIME,
                value=float(i * 100),
                unit="ms"
            )
            await integration.record_ai_metric(event, timeout=0.1)
        
        elapsed = asyncio.get_event_loop().time() - start_time
        
        # Should complete quickly even with queue overflow
        assert elapsed < 2.0, f"Recording took too long: {elapsed}s"
        
        stats = integration.get_statistics()
        print(f"   ✅ Recorded {stats['counters']['total_events']} events in {elapsed:.3f}s")
        print(f"   ✅ Dropped {stats['counters']['dropped_events']} events (queue full)")
        print(f"   ✅ No blocking detected")
        
    finally:
        await integration.stop(timeout=2.0)
    
    print("   ✅ Test passed\n")


async def test_graceful_stop():
    """Test that stop() completes within timeout."""
    print("🧪 Test 2: Graceful stop with timeout")
    
    config = AnalyticsConfig(
        batch_timeout_seconds=10.0  # Long timeout
    )
    
    integration = AnalyticsAIIntegration(config)
    await integration.start()
    
    # Start stop with short timeout
    start_time = asyncio.get_event_loop().time()
    await integration.stop(timeout=1.0)
    elapsed = asyncio.get_event_loop().time() - start_time
    
    # Should stop within timeout even if tasks are slow
    assert elapsed < 2.0, f"Stop took too long: {elapsed}s"
    assert not integration.is_running, "Integration still running after stop"
    
    print(f"   ✅ Stopped in {elapsed:.3f}s (within timeout)")
    print("   ✅ Test passed\n")


async def test_batch_processing_timeout():
    """Test that batch processing respects timeout."""
    print("🧪 Test 3: Batch processing timeout")
    
    config = AnalyticsConfig(
        batch_size=100,  # Large batch
        batch_timeout_seconds=0.5  # Short timeout
    )
    
    integration = AnalyticsAIIntegration(config)
    await integration.start()
    
    try:
        # Add a few events (less than batch size)
        for i in range(5):
            event = AIMetricEvent(
                timestamp=datetime.now(),
                operation_type=AIOperationType.SUPER_RESOLUTION,
                metric_type=AIMetricType.QUALITY_SCORE,
                value=0.9,
                unit="score"
            )
            await integration.record_ai_metric(event)
        
        # Wait for batch timeout
        await asyncio.sleep(1.0)
        
        stats = integration.get_statistics()
        
        # Events should be processed despite incomplete batch
        assert stats['counters']['processed_events'] > 0, "No events processed"
        
        print(f"   ✅ Processed {stats['counters']['processed_events']} events")
        print(f"   ✅ Batch timeout respected (didn't wait for full batch)")
        
    finally:
        await integration.stop(timeout=1.0)
    
    print("   ✅ Test passed\n")


async def test_model_performance_tracking():
    """Test model performance tracking."""
    print("🧪 Test 4: Model performance tracking")
    
    config = AnalyticsConfig(enable_model_tracking=True)
    integration = AnalyticsAIIntegration(config)
    await integration.start()
    
    try:
        # Record model performance
        await integration.record_model_performance(
            model_id="test_model_1",
            model_type="style_transfer",
            inference_time_ms=523.1,
            quality_score=0.94,
            memory_usage_mb=512.0,
            success=True
        )
        
        await integration.record_model_performance(
            model_id="test_model_1",
            model_type="style_transfer",
            inference_time_ms=487.3,
            quality_score=0.92,
            memory_usage_mb=512.0,
            success=True
        )
        
        # Get model summary
        summary = integration.get_model_performance_summary()
        
        assert "test_model_1" in summary, "Model not tracked"
        model_metrics = summary["test_model_1"]
        
        assert model_metrics["total_inferences"] == 2, "Wrong inference count"
        assert model_metrics["error_count"] == 0, "Wrong error count"
        
        print(f"   ✅ Tracked model: {model_metrics['model_id']}")
        print(f"   ✅ Inferences: {model_metrics['total_inferences']}")
        print(f"   ✅ Avg time: {model_metrics['average_inference_time_ms']:.1f}ms")
        print(f"   ✅ Avg quality: {model_metrics['average_quality_score']:.2f}")
        
    finally:
        await integration.stop(timeout=1.0)
    
    print("   ✅ Test passed\n")


async def test_bottleneck_detection():
    """Test bottleneck detection."""
    print("🧪 Test 5: Bottleneck detection")
    
    config = AnalyticsConfig(
        max_queue_size=10,
        enable_bottleneck_detection=True
    )
    
    integration = AnalyticsAIIntegration(config)
    await integration.start()
    
    try:
        # Fill queue to trigger congestion
        for i in range(15):
            event = AIMetricEvent(
                timestamp=datetime.now(),
                operation_type=AIOperationType.INTERPOLATION,
                metric_type=AIMetricType.PROCESSING_TIME,
                value=1000.0,
                unit="ms"
            )
            await integration.record_ai_metric(event, timeout=0.1)
        
        # Detect bottlenecks
        bottlenecks = await integration.detect_bottlenecks()
        
        print(f"   ✅ Detected {len(bottlenecks)} bottleneck(s)")
        for bottleneck in bottlenecks:
            print(f"      - {bottleneck['type']}: {bottleneck['description']}")
            print(f"        Recommendation: {bottleneck['recommendation']}")
        
    finally:
        await integration.stop(timeout=1.0)
    
    print("   ✅ Test passed\n")


async def test_optimization_recommendations():
    """Test optimization recommendations."""
    print("🧪 Test 6: Optimization recommendations")
    
    config = AnalyticsConfig()
    integration = AnalyticsAIIntegration(config)
    await integration.start()
    
    try:
        # Record some slow operations
        for i in range(5):
            await integration.record_operation_metrics(
                operation_type=AIOperationType.SUPER_RESOLUTION,
                processing_time_ms=4000.0,  # Slow
                quality_score=0.85,
                success=True
            )
        
        # Wait for processing
        await asyncio.sleep(1.0)
        
        # Get recommendations
        recommendations = await integration.generate_optimization_recommendations()
        
        print(f"   ✅ Generated {len(recommendations)} recommendation(s)")
        for rec in recommendations:
            print(f"      - [{rec['priority']}] {rec['category']}: {rec['recommendation']}")
            print(f"        Suggestion: {rec['suggestion']}")
        
    finally:
        await integration.stop(timeout=1.0)
    
    print("   ✅ Test passed\n")


async def test_performance_snapshot():
    """Test performance snapshot generation."""
    print("🧪 Test 7: Performance snapshot")
    
    config = AnalyticsConfig()
    integration = AnalyticsAIIntegration(config)
    await integration.start()
    
    try:
        # Record various metrics
        await integration.record_operation_metrics(
            operation_type=AIOperationType.STYLE_TRANSFER,
            processing_time_ms=523.1,
            quality_score=0.94,
            success=True
        )
        
        await integration.record_operation_metrics(
            operation_type=AIOperationType.SUPER_RESOLUTION,
            processing_time_ms=1234.5,
            quality_score=0.88,
            success=True
        )
        
        # Wait for processing
        await asyncio.sleep(1.0)
        
        # Get snapshot
        snapshot = await integration.get_performance_snapshot()
        
        print(f"   ✅ Snapshot generated:")
        print(f"      - Total operations: {snapshot.total_operations}")
        print(f"      - Successful: {snapshot.successful_operations}")
        print(f"      - Failed: {snapshot.failed_operations}")
        print(f"      - Avg processing time: {snapshot.average_processing_time_ms:.1f}ms")
        print(f"      - Avg quality score: {snapshot.average_quality_score:.2f}")
        print(f"      - Active models: {snapshot.active_models}")
        
    finally:
        await integration.stop(timeout=1.0)
    
    print("   ✅ Test passed\n")


async def main():
    """Run all tests."""
    print("=" * 60)
    print("Analytics AI Integration - Non-Blocking Tests")
    print("=" * 60)
    print()
    
    tests = [
        test_non_blocking_record,
        test_graceful_stop,
        test_batch_processing_timeout,
        test_model_performance_tracking,
        test_bottleneck_detection,
        test_optimization_recommendations,
        test_performance_snapshot
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            await test()
            passed += 1
        except Exception as e:
            print(f"   ❌ Test failed: {e}\n")
            failed += 1
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
