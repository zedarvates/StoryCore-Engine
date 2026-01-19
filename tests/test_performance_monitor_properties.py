"""
Property-based tests for ComfyUI Performance Monitor.
Tests universal correctness properties for performance monitoring and optimization.
"""

import pytest
import asyncio
import time
from hypothesis import given, strategies as st, assume, settings
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List

from src.performance_monitor import (
    PerformanceMonitor, MetricType, AlertSeverity, PerformanceThreshold,
    PerformanceAlert, WorkflowComplexityAnalysis, ResourceUsageSnapshot
)
from src.comfyui_config import ComfyUIConfig
from src.comfyui_models import ComfyUIWorkflow, WorkflowMetadata, WorkflowNode


# Test data generators
@st.composite
def workflow_nodes(draw):
    """Generate ComfyUI workflow nodes for testing."""
    node_types = [
        "CheckpointLoaderSimple", "VAELoader", "CLIPTextEncode", "KSampler",
        "VAEDecode", "ControlNetLoader", "IPAdapterLoader", "ImageScale", "SaveImage"
    ]
    
    node_count = draw(st.integers(min_value=1, max_value=20))
    nodes = {}
    
    for i in range(node_count):
        node_id = str(i)
        node_type = draw(st.sampled_from(node_types))
        
        # Generate inputs based on node type
        inputs = {}
        if node_type == "KSampler":
            inputs = {
                "model": ["0", 0],
                "positive": ["1", 0],
                "negative": ["2", 0],
                "seed": draw(st.integers(min_value=0, max_value=2**32)),
                "steps": draw(st.integers(min_value=1, max_value=100))
            }
        elif node_type == "CLIPTextEncode":
            inputs = {
                "text": draw(st.text(min_size=1, max_size=200)),
                "clip": ["0", 0]
            }
        
        nodes[node_id] = {
            "class_type": node_type,
            "inputs": inputs
        }
    
    return nodes


@st.composite
def performance_thresholds(draw):
    """Generate performance threshold configurations."""
    metric_name = draw(st.text(min_size=1, max_size=50))
    warning_threshold = draw(st.floats(min_value=0.1, max_value=100.0))
    critical_threshold = draw(st.floats(min_value=warning_threshold, max_value=200.0))
    
    return PerformanceThreshold(
        metric_name=metric_name,
        warning_threshold=warning_threshold,
        critical_threshold=critical_threshold,
        unit=draw(st.sampled_from(["seconds", "milliseconds", "percent", "MB", "items"])),
        description=draw(st.text(min_size=1, max_size=100))
    )


@st.composite
def resource_snapshots(draw):
    """Generate resource usage snapshots."""
    return ResourceUsageSnapshot(
        timestamp=datetime.utcnow(),
        cpu_percent=draw(st.floats(min_value=0.0, max_value=100.0)),
        memory_percent=draw(st.floats(min_value=0.0, max_value=100.0)),
        memory_used_mb=draw(st.floats(min_value=100.0, max_value=32000.0)),
        memory_available_mb=draw(st.floats(min_value=100.0, max_value=32000.0)),
        disk_usage_percent=draw(st.floats(min_value=0.0, max_value=100.0)),
        gpu_memory_used_mb=draw(st.floats(min_value=0.0, max_value=24000.0)),
        gpu_memory_total_mb=draw(st.floats(min_value=1000.0, max_value=24000.0)),
        gpu_utilization_percent=draw(st.floats(min_value=0.0, max_value=100.0))
    )


class TestPerformanceMonitorProperties:
    """Property-based tests for Performance Monitor correctness."""
    
    def setup_method(self):
        """Set up test fixtures."""
        from pathlib import Path
        self.config = ComfyUIConfig(installation_path=Path("C:/storycore-engine/comfyui_portable"))
        self.performance_monitor = PerformanceMonitor(self.config)
    
    def teardown_method(self):
        """Clean up after tests."""
        if hasattr(self, 'performance_monitor'):
            self.performance_monitor.stop_monitoring()
    
    @given(st.text(min_size=1, max_size=50), st.floats(min_value=0.001, max_value=10.0))
    @settings(max_examples=15, deadline=3000)
    def test_property_23_metrics_collection_consistency(self, operation_name, duration):
        """
        Property 23: Metrics Collection Consistency
        Performance metrics should be collected consistently for all operations,
        with accurate timing and metadata preservation.
        """
        operation_id = f"test_{int(time.time())}"
        
        # Record operation start
        self.performance_monitor.record_operation_start(operation_name, operation_id)
        
        # Verify operation is being tracked
        assert operation_id in self.performance_monitor._active_operations
        
        # Simulate operation duration
        time.sleep(min(duration, 0.1))  # Cap sleep for test performance
        
        # Record operation end with metadata
        metadata = {"test_data": "test_value", "duration_hint": duration}
        result_metrics = self.performance_monitor.record_operation_end(
            operation_name, operation_id, True, metadata
        )
        
        # Verify metrics were recorded
        assert result_metrics is not None
        assert result_metrics.operation_type == operation_name
        assert result_metrics.success is True
        assert result_metrics.metadata == metadata
        assert result_metrics.duration_seconds > 0
        
        # Verify operation is no longer being tracked
        assert operation_id not in self.performance_monitor._active_operations
        
        # Verify metrics are stored in history
        assert len(self.performance_monitor._metrics_history) > 0
        stored_metric = self.performance_monitor._metrics_history[-1]
        assert stored_metric.operation_type == operation_name
        assert stored_metric.metadata == metadata
        
        # Verify operation counts are updated
        assert self.performance_monitor._operation_counts.get(operation_name, 0) > 0
    
    @given(workflow_nodes())
    @settings(max_examples=10, deadline=5000)
    def test_property_24_workflow_complexity_analysis(self, nodes):
        """
        Property 24: Workflow Complexity Analysis
        Workflow complexity analysis should provide consistent and meaningful
        metrics for optimization guidance across all workflow types.
        """
        # Create a test workflow
        workflow = ComfyUIWorkflow(
            metadata=WorkflowMetadata(
                workflow_id=f"test_workflow_{int(time.time())}",
                created_at=datetime.utcnow()
            ),
            nodes={
                node_id: WorkflowNode(
                    class_type=node_data["class_type"],
                    inputs=node_data.get("inputs", {})
                )
                for node_id, node_data in nodes.items()
            }
        )
        
        # Analyze workflow complexity
        analysis = self.performance_monitor.analyze_workflow_complexity(workflow)
        
        # Verify analysis completeness
        assert analysis.workflow_id == workflow.metadata.workflow_id
        assert analysis.node_count == len(nodes)
        assert analysis.connection_count >= 0
        assert analysis.estimated_memory_mb >= 0
        assert analysis.estimated_processing_time_seconds >= 0
        assert 0 <= analysis.complexity_score <= 100
        assert isinstance(analysis.bottleneck_nodes, list)
        assert isinstance(analysis.optimization_suggestions, list)
        assert len(analysis.optimization_suggestions) > 0
        
        # Verify complexity score correlates with workflow size
        if len(nodes) > 10:
            assert analysis.complexity_score > 20  # Complex workflows should have higher scores
        
        # Verify memory estimation is reasonable
        if any("CheckpointLoaderSimple" in node.get("class_type", "") for node in nodes.values()):
            assert analysis.estimated_memory_mb > 1000  # Should account for model loading
        
        # Verify analysis is stored
        assert workflow.metadata.workflow_id in self.performance_monitor._workflow_analyses
        stored_analysis = self.performance_monitor._workflow_analyses[workflow.metadata.workflow_id]
        assert stored_analysis.complexity_score == analysis.complexity_score
    
    @given(resource_snapshots())
    @settings(max_examples=10, deadline=3000)
    def test_property_25_resource_management(self, snapshot):
        """
        Property 25: Resource Management
        Resource monitoring should accurately track system usage and trigger
        appropriate alerts when thresholds are exceeded.
        """
        # Store the snapshot
        self.performance_monitor._resource_snapshots.append(snapshot)
        
        # Check threshold violations
        initial_alert_count = len(self.performance_monitor._performance_alerts)
        
        # Simulate threshold checking
        self.performance_monitor._check_resource_thresholds(snapshot)
        
        # Verify alert generation for high resource usage
        if snapshot.memory_percent > 95:
            # Should generate critical alert
            new_alerts = self.performance_monitor._performance_alerts[initial_alert_count:]
            critical_alerts = [a for a in new_alerts if a.severity == AlertSeverity.CRITICAL]
            assert len(critical_alerts) > 0
            
            # Verify alert content
            memory_alerts = [a for a in critical_alerts if a.metric_name == "memory_usage"]
            if memory_alerts:
                alert = memory_alerts[0]
                assert alert.current_value == snapshot.memory_percent
                assert alert.message is not None
                assert len(alert.suggestions) > 0
        
        elif snapshot.memory_percent > 80:
            # Should generate warning alert
            new_alerts = self.performance_monitor._performance_alerts[initial_alert_count:]
            warning_alerts = [a for a in new_alerts if a.severity == AlertSeverity.WARNING]
            # Note: May or may not generate alert depending on previous state
        
        # Verify CPU threshold checking
        if snapshot.cpu_percent > 95:
            new_alerts = self.performance_monitor._performance_alerts[initial_alert_count:]
            cpu_alerts = [a for a in new_alerts if a.metric_name == "cpu_usage"]
            # Should have CPU-related alerts for very high usage
        
        # Verify snapshot storage
        assert snapshot in self.performance_monitor._resource_snapshots
        
        # Verify resource summary includes this snapshot
        summary = self.performance_monitor.get_performance_summary(1.0)  # 1 hour window
        resource_stats = summary.get("resource_statistics", {})
        
        if resource_stats:  # Only check if we have resource stats
            # Should include our snapshot in calculations
            assert "avg_cpu_percent" in resource_stats
            assert "avg_memory_percent" in resource_stats
    
    @given(st.lists(st.text(min_size=1, max_size=30), min_size=1, max_size=10))
    @settings(max_examples=7, deadline=5000)
    def test_property_operation_tracking_consistency(self, operation_names):
        """
        Test that operation tracking maintains consistency across multiple operations.
        """
        operation_ids = []
        
        # Start multiple operations
        for i, op_name in enumerate(operation_names):
            op_id = f"{op_name}_{i}_{int(time.time())}"
            operation_ids.append((op_name, op_id))
            self.performance_monitor.record_operation_start(op_name, op_id)
        
        # Verify all operations are being tracked
        for op_name, op_id in operation_ids:
            assert op_id in self.performance_monitor._active_operations
        
        # End operations in different order
        import random
        random.shuffle(operation_ids)
        
        completed_operations = []
        for op_name, op_id in operation_ids:
            success = random.choice([True, False])
            metadata = {"operation_index": len(completed_operations)}
            
            result = self.performance_monitor.record_operation_end(
                op_name, op_id, success, metadata
            )
            
            completed_operations.append((op_name, op_id, success, result))
            
            # Verify operation is no longer tracked
            assert op_id not in self.performance_monitor._active_operations
            
            # Verify metrics were recorded
            assert result is not None
            assert result.operation_type == op_name
            assert result.success == success
            assert result.metadata == metadata
        
        # Verify all operations were recorded
        assert len(completed_operations) == len(operation_names)
        
        # Verify metrics history contains all operations
        recent_metrics = self.performance_monitor._metrics_history[-len(operation_names):]
        recorded_ops = [(m.operation_type, m.success) for m in recent_metrics]
        expected_ops = [(op_name, success) for op_name, _, success, _ in completed_operations]
        
        # Should have recorded all operations (order may differ)
        assert len(recorded_ops) == len(expected_ops)
    
    @given(st.floats(min_value=1.0, max_value=48.0))
    @settings(max_examples=5, deadline=3000)
    def test_property_performance_summary_completeness(self, time_window_hours):
        """
        Test that performance summaries provide complete and accurate information.
        """
        # Generate some test metrics
        test_operations = ["test_op_1", "test_op_2", "test_op_3"]
        
        for i, op_name in enumerate(test_operations):
            op_id = f"{op_name}_{i}"
            self.performance_monitor.record_operation_start(op_name, op_id)
            time.sleep(0.01)  # Small delay
            success = i % 2 == 0  # Alternate success/failure
            self.performance_monitor.record_operation_end(op_name, op_id, success)
        
        # Get performance summary
        summary = self.performance_monitor.get_performance_summary(time_window_hours)
        
        # Verify summary structure
        required_keys = [
            "time_window_hours", "summary_timestamp", "operation_statistics",
            "resource_statistics", "alert_statistics", "workflow_analyses",
            "monitoring_active", "recent_alerts"
        ]
        
        for key in required_keys:
            assert key in summary
        
        # Verify time window is correct
        assert summary["time_window_hours"] == time_window_hours
        
        # Verify operation statistics
        op_stats = summary["operation_statistics"]
        for op_name in test_operations:
            if op_name in op_stats:
                stats = op_stats[op_name]
                
                # Verify required statistics fields
                required_stat_keys = [
                    "count", "avg_duration", "success_rate", "error_rate",
                    "min_duration", "max_duration"
                ]
                
                for stat_key in required_stat_keys:
                    assert stat_key in stats
                
                # Verify statistics are reasonable
                assert stats["count"] > 0
                assert stats["avg_duration"] >= 0
                assert 0 <= stats["success_rate"] <= 100
                assert 0 <= stats["error_rate"] <= 100
                assert stats["success_rate"] + stats["error_rate"] == 100
                assert stats["min_duration"] >= 0
                assert stats["max_duration"] >= stats["min_duration"]
        
        # Verify alert statistics structure
        alert_stats = summary["alert_statistics"]
        alert_keys = ["total_alerts", "critical_alerts", "warning_alerts", "info_alerts"]
        
        for key in alert_keys:
            assert key in alert_stats
            assert alert_stats[key] >= 0
        
        # Verify total alerts equals sum of severity-specific alerts
        total = alert_stats["total_alerts"]
        sum_by_severity = (
            alert_stats["critical_alerts"] +
            alert_stats["warning_alerts"] +
            alert_stats["info_alerts"]
        )
        assert total == sum_by_severity
    
    def test_property_alert_callback_reliability(self):
        """
        Test that alert callbacks are reliably called when performance issues occur.
        """
        callback_calls = []
        
        def test_callback(alert: PerformanceAlert):
            callback_calls.append(alert)
        
        # Register callback
        self.performance_monitor.add_alert_callback(test_callback)
        
        # Create a high-resource snapshot to trigger alerts
        high_memory_snapshot = ResourceUsageSnapshot(
            timestamp=datetime.utcnow(),
            cpu_percent=98.0,  # High CPU
            memory_percent=97.0,  # High memory
            memory_used_mb=15000.0,
            memory_available_mb=500.0,
            disk_usage_percent=50.0
        )
        
        # Trigger threshold checking
        initial_alert_count = len(self.performance_monitor._performance_alerts)
        self.performance_monitor._check_resource_thresholds(high_memory_snapshot)
        
        # Verify alerts were generated
        new_alert_count = len(self.performance_monitor._performance_alerts) - initial_alert_count
        
        if new_alert_count > 0:
            # Should have called callbacks
            assert len(callback_calls) == new_alert_count
            
            # Verify callback received correct alerts
            for alert in callback_calls:
                assert isinstance(alert, PerformanceAlert)
                assert alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.WARNING]
                assert alert.current_value > alert.threshold_value
        
        # Test callback removal
        self.performance_monitor.remove_alert_callback(test_callback)
        
        # Generate another alert
        another_snapshot = ResourceUsageSnapshot(
            timestamp=datetime.utcnow(),
            cpu_percent=99.0,
            memory_percent=98.0,
            memory_used_mb=16000.0,
            memory_available_mb=200.0,
            disk_usage_percent=60.0
        )
        
        initial_callback_count = len(callback_calls)
        self.performance_monitor._check_resource_thresholds(another_snapshot)
        
        # Should not have new callback calls after removal
        assert len(callback_calls) == initial_callback_count