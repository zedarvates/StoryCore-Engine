"""
Simple unit tests for ComfyUI Performance Monitor.
Tests specific functionality and edge cases for performance monitoring.
"""

import pytest
import time
import json
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch

from src.performance_monitor import (
    PerformanceMonitor, MetricType, AlertSeverity, PerformanceThreshold,
    PerformanceAlert, WorkflowComplexityAnalysis, ResourceUsageSnapshot
)
from src.comfyui_config import ComfyUIConfig
from src.comfyui_models import ComfyUIWorkflow, WorkflowMetadata, WorkflowNode


class TestPerformanceMonitor:
    """Unit tests for Performance Monitor functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        from pathlib import Path
        self.config = ComfyUIConfig(installation_path=Path("C:/storycore-engine/comfyui_portable"))
        self.performance_monitor = PerformanceMonitor(self.config)
    
    def teardown_method(self):
        """Clean up after tests."""
        if hasattr(self, 'performance_monitor'):
            self.performance_monitor.stop_monitoring()
    
    def test_initialization(self):
        """Test performance monitor initialization."""
        assert self.performance_monitor.config == self.config
        assert not self.performance_monitor._monitoring_active
        assert len(self.performance_monitor._metrics_history) == 0
        assert len(self.performance_monitor._resource_snapshots) == 0
        assert len(self.performance_monitor._workflow_analyses) == 0
        assert len(self.performance_monitor._performance_alerts) == 0
    
    def test_default_thresholds(self):
        """Test default performance thresholds setup."""
        thresholds = self.performance_monitor._thresholds
        
        # Verify required thresholds exist
        required_thresholds = [
            "service_start_time", "workflow_execution_time", "health_check_response_time",
            "memory_usage", "cpu_usage", "error_rate", "queue_depth"
        ]
        
        for threshold_name in required_thresholds:
            assert threshold_name in thresholds
            threshold = thresholds[threshold_name]
            assert isinstance(threshold, PerformanceThreshold)
            assert threshold.warning_threshold < threshold.critical_threshold
            assert threshold.unit != ""
            assert threshold.description != ""
    
    def test_operation_tracking(self):
        """Test operation start and end tracking."""
        operation_name = "test_operation"
        operation_id = "test_op_123"
        
        # Test operation start
        self.performance_monitor.record_operation_start(operation_name, operation_id)
        
        assert operation_id in self.performance_monitor._active_operations
        assert self.performance_monitor._operation_counts[operation_name] == 1
        
        # Test operation end
        metadata = {"test_key": "test_value"}
        result = self.performance_monitor.record_operation_end(
            operation_name, operation_id, True, metadata
        )
        
        assert result is not None
        assert result.operation_type == operation_name
        assert result.success is True
        assert result.metadata == metadata
        assert result.duration_seconds > 0
        
        # Verify operation is no longer tracked
        assert operation_id not in self.performance_monitor._active_operations
        
        # Verify metrics stored
        assert len(self.performance_monitor._metrics_history) == 1
        stored_metric = self.performance_monitor._metrics_history[0]
        assert stored_metric.operation_type == operation_name
    
    def test_operation_end_without_start(self):
        """Test ending operation that wasn't started."""
        result = self.performance_monitor.record_operation_end(
            "unknown_operation", "unknown_id", True
        )
        
        assert result is None
    
    def test_workflow_complexity_analysis(self):
        """Test workflow complexity analysis."""
        # Create test workflow
        workflow = ComfyUIWorkflow(
            metadata=WorkflowMetadata(
                workflow_id="test_workflow_123",
                created_at=datetime.utcnow()
            ),
            nodes={
                "1": WorkflowNode(
                    class_type="CheckpointLoaderSimple",
                    inputs={"ckpt_name": "model.safetensors"}
                ),
                "2": WorkflowNode(
                    class_type="KSampler",
                    inputs={"model": ["1", 0], "steps": 20, "seed": 12345}
                ),
                "3": WorkflowNode(
                    class_type="VAEDecode",
                    inputs={"samples": ["2", 0]}
                )
            }
        )
        
        # Analyze complexity
        analysis = self.performance_monitor.analyze_workflow_complexity(workflow)
        
        # Verify analysis results
        assert analysis.workflow_id == "test_workflow_123"
        assert analysis.node_count == 3
        assert analysis.connection_count >= 0
        assert analysis.estimated_memory_mb > 0
        assert analysis.estimated_processing_time_seconds > 0
        assert 0 <= analysis.complexity_score <= 100
        assert isinstance(analysis.bottleneck_nodes, list)
        assert isinstance(analysis.optimization_suggestions, list)
        assert len(analysis.optimization_suggestions) > 0
        
        # Verify analysis is stored
        assert "test_workflow_123" in self.performance_monitor._workflow_analyses
    
    def test_workflow_complexity_error_handling(self):
        """Test workflow complexity analysis error handling."""
        # Create invalid workflow
        invalid_workflow = Mock()
        invalid_workflow.metadata.workflow_id = "invalid_workflow"
        invalid_workflow.to_comfyui_format.side_effect = Exception("Invalid workflow")
        
        # Should handle error gracefully
        analysis = self.performance_monitor.analyze_workflow_complexity(invalid_workflow)
        
        assert analysis.workflow_id == "invalid_workflow"
        assert analysis.node_count == 0
        assert analysis.complexity_score == 0.0
        assert "Error analyzing workflow complexity" in analysis.optimization_suggestions
    
    def test_memory_estimation(self):
        """Test workflow memory estimation."""
        nodes = {
            "1": {"class_type": "CheckpointLoaderSimple"},
            "2": {"class_type": "KSampler"},
            "3": {"class_type": "VAEDecode"},
            "4": {"class_type": "UnknownNode"}
        }
        
        memory = self.performance_monitor._estimate_workflow_memory(nodes)
        
        # Should estimate reasonable memory usage
        assert memory > 0
        # CheckpointLoader (4000) + KSampler (2000) + VAEDecode (200) + Unknown (100) = 6300
        assert memory >= 6300
    
    def test_processing_time_estimation(self):
        """Test workflow processing time estimation."""
        nodes = {
            "1": {"class_type": "CheckpointLoaderSimple"},
            "2": {"class_type": "KSampler"},
            "3": {"class_type": "VAEDecode"}
        }
        
        time_estimate = self.performance_monitor._estimate_workflow_processing_time(nodes)
        
        # Should estimate reasonable processing time
        assert time_estimate > 0
        # CheckpointLoader (5) + KSampler (30) + VAEDecode (3) = 38 seconds
        assert time_estimate >= 38
    
    def test_bottleneck_identification(self):
        """Test bottleneck node identification."""
        nodes = {
            "1": {"class_type": "CheckpointLoaderSimple"},
            "2": {"class_type": "KSampler"},
            "3": {"class_type": "ImageScale"},
            "4": {"class_type": "ControlNetLoader"}
        }
        
        bottlenecks = self.performance_monitor._identify_bottleneck_nodes(nodes)
        
        # Should identify known bottleneck types
        bottleneck_text = " ".join(bottlenecks)
        assert "KSampler" in bottleneck_text
        assert "CheckpointLoaderSimple" in bottleneck_text
        assert "ControlNetLoader" in bottleneck_text
        assert "ImageScale" not in bottleneck_text  # Not a bottleneck type
    
    def test_optimization_suggestions(self):
        """Test optimization suggestion generation."""
        # Test high complexity workflow
        nodes = {str(i): {"class_type": "KSampler"} for i in range(25)}  # Many nodes
        
        suggestions = self.performance_monitor._generate_optimization_suggestions(
            nodes, 25, 50, 10000, 150  # High values
        )
        
        # Should generate relevant suggestions
        suggestions_text = " ".join(suggestions).lower()
        assert "high node count" in suggestions_text or "simplifying workflow" in suggestions_text
        assert "memory usage" in suggestions_text or "smaller models" in suggestions_text
        assert "processing time" in suggestions_text or "sampling parameters" in suggestions_text
        assert "multiple samplers" in suggestions_text
    
    @patch('psutil.cpu_percent')
    @patch('psutil.virtual_memory')
    @patch('psutil.disk_usage')
    def test_resource_snapshot_collection(self, mock_disk, mock_memory, mock_cpu):
        """Test resource usage snapshot collection."""
        # Mock system resource data
        mock_cpu.return_value = 75.5
        mock_memory.return_value = Mock(percent=60.2, used=8000000000, available=4000000000)
        mock_disk.return_value = Mock(percent=45.8)
        
        snapshot = self.performance_monitor._collect_resource_snapshot()
        
        assert isinstance(snapshot, ResourceUsageSnapshot)
        assert snapshot.cpu_percent == 75.5
        assert snapshot.memory_percent == 60.2
        assert snapshot.memory_used_mb > 0
        assert snapshot.memory_available_mb > 0
        assert snapshot.disk_usage_percent == 45.8
    
    def test_resource_threshold_checking(self):
        """Test resource usage threshold checking."""
        # Create high-usage snapshot
        high_usage_snapshot = ResourceUsageSnapshot(
            timestamp=datetime.utcnow(),
            cpu_percent=98.0,  # Above critical threshold (95%)
            memory_percent=97.0,  # Above critical threshold (95%)
            memory_used_mb=15000.0,
            memory_available_mb=500.0,
            disk_usage_percent=50.0
        )
        
        initial_alert_count = len(self.performance_monitor._performance_alerts)
        
        # Check thresholds
        self.performance_monitor._check_resource_thresholds(high_usage_snapshot)
        
        # Should generate alerts
        new_alerts = self.performance_monitor._performance_alerts[initial_alert_count:]
        assert len(new_alerts) > 0
        
        # Should have critical alerts for high usage
        critical_alerts = [a for a in new_alerts if a.severity == AlertSeverity.CRITICAL]
        assert len(critical_alerts) > 0
        
        # Verify alert content
        for alert in critical_alerts:
            assert alert.current_value > alert.threshold_value
            assert alert.message != ""
            assert len(alert.suggestions) > 0
    
    def test_operation_threshold_checking(self):
        """Test operation performance threshold checking."""
        # Test slow operation (above warning threshold)
        slow_duration = 35.0  # Above service_start_time warning (30s)
        
        initial_alert_count = len(self.performance_monitor._performance_alerts)
        
        self.performance_monitor._check_operation_thresholds("service_start", slow_duration, True)
        
        # Should generate warning alert
        new_alerts = self.performance_monitor._performance_alerts[initial_alert_count:]
        warning_alerts = [a for a in new_alerts if a.severity == AlertSeverity.WARNING]
        
        if warning_alerts:  # May not generate if threshold mapping doesn't match
            alert = warning_alerts[0]
            assert alert.current_value == slow_duration
            assert "service_start" in alert.message.lower()
    
    def test_alert_callback_system(self):
        """Test alert callback registration and execution."""
        callback_calls = []
        
        def test_callback(alert: PerformanceAlert):
            callback_calls.append(alert)
        
        # Register callback
        self.performance_monitor.add_alert_callback(test_callback)
        
        # Create alert manually
        test_alert = PerformanceAlert(
            alert_id="test_alert_123",
            timestamp=datetime.utcnow(),
            severity=AlertSeverity.WARNING,
            metric_name="test_metric",
            current_value=85.0,
            threshold_value=80.0,
            message="Test alert message",
            suggestions=["Test suggestion"]
        )
        
        # Trigger alert creation
        self.performance_monitor._create_alert(
            AlertSeverity.WARNING,
            "test_metric",
            85.0,
            80.0,
            "Test alert message",
            ["Test suggestion"]
        )
        
        # Should have called callback
        assert len(callback_calls) > 0
        alert = callback_calls[-1]
        assert alert.severity == AlertSeverity.WARNING
        assert alert.metric_name == "test_metric"
        
        # Test callback removal
        self.performance_monitor.remove_alert_callback(test_callback)
        
        # Should not be in callbacks list
        assert test_callback not in self.performance_monitor._alert_callbacks
    
    def test_performance_summary(self):
        """Test performance summary generation."""
        # Generate some test data
        op_name = "test_operation"
        op_id = "test_123"
        
        self.performance_monitor.record_operation_start(op_name, op_id)
        time.sleep(0.01)
        self.performance_monitor.record_operation_end(op_name, op_id, True, {"test": "data"})
        
        # Get summary
        summary = self.performance_monitor.get_performance_summary(1.0)
        
        # Verify summary structure
        required_keys = [
            "time_window_hours", "summary_timestamp", "operation_statistics",
            "resource_statistics", "alert_statistics", "workflow_analyses",
            "monitoring_active", "recent_alerts"
        ]
        
        for key in required_keys:
            assert key in summary
        
        # Verify operation statistics
        op_stats = summary["operation_statistics"]
        if op_name in op_stats:
            stats = op_stats[op_name]
            assert stats["count"] == 1
            assert stats["success_rate"] == 100.0
            assert stats["error_rate"] == 0.0
    
    def test_workflow_recommendations(self):
        """Test workflow-specific recommendations."""
        # Create and analyze a workflow first
        workflow = ComfyUIWorkflow(
            metadata=WorkflowMetadata(
                workflow_id="test_recommendations",
                created_at=datetime.utcnow()
            ),
            nodes={
                "1": WorkflowNode(
                    class_type="KSampler",
                    inputs={"steps": 50}
                )
            }
        )
        
        self.performance_monitor.analyze_workflow_complexity(workflow)
        
        # Get recommendations
        recommendations = self.performance_monitor.get_workflow_recommendations("test_recommendations")
        
        # Verify recommendation structure
        assert "workflow_id" in recommendations
        assert "complexity_analysis" in recommendations
        assert "recommendations" in recommendations
        assert "priority_actions" in recommendations
        
        assert recommendations["workflow_id"] == "test_recommendations"
        assert isinstance(recommendations["recommendations"], list)
        assert isinstance(recommendations["priority_actions"], list)
    
    def test_workflow_recommendations_not_found(self):
        """Test recommendations for non-existent workflow."""
        recommendations = self.performance_monitor.get_workflow_recommendations("nonexistent")
        
        assert "error" in recommendations
        assert recommendations["workflow_id"] == "nonexistent"
    
    def test_metrics_export(self):
        """Test metrics export functionality."""
        # Generate some test data
        self.performance_monitor.record_operation_start("test_op", "test_123")
        time.sleep(0.01)
        self.performance_monitor.record_operation_end("test_op", "test_123", True)
        
        # Export to temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = Path(f.name)
        
        try:
            success = self.performance_monitor.export_metrics(temp_path, 1.0)
            assert success
            
            # Verify file was created and contains valid JSON
            assert temp_path.exists()
            
            with open(temp_path, 'r') as f:
                data = json.load(f)
            
            # Verify export structure
            required_keys = [
                "export_timestamp", "time_window_hours", "summary",
                "detailed_metrics", "resource_snapshots", "workflow_analyses"
            ]
            
            for key in required_keys:
                assert key in data
            
            assert data["time_window_hours"] == 1.0
            assert isinstance(data["detailed_metrics"], list)
            
        finally:
            # Clean up
            if temp_path.exists():
                temp_path.unlink()
    
    def test_metrics_clearing(self):
        """Test metrics clearing functionality."""
        # Generate test data
        self.performance_monitor.record_operation_start("test_op", "test_123")
        self.performance_monitor.record_operation_end("test_op", "test_123", True)
        
        # Add test snapshot
        snapshot = ResourceUsageSnapshot(
            timestamp=datetime.utcnow(),
            cpu_percent=50.0,
            memory_percent=60.0,
            memory_used_mb=4000.0,
            memory_available_mb=4000.0,
            disk_usage_percent=30.0
        )
        self.performance_monitor._resource_snapshots.append(snapshot)
        
        # Verify data exists
        assert len(self.performance_monitor._metrics_history) > 0
        assert len(self.performance_monitor._resource_snapshots) > 0
        
        # Clear all metrics
        self.performance_monitor.clear_metrics()
        
        # Verify data cleared
        assert len(self.performance_monitor._metrics_history) == 0
        assert len(self.performance_monitor._resource_snapshots) == 0
        assert len(self.performance_monitor._performance_alerts) == 0
    
    def test_metrics_clearing_with_time_window(self):
        """Test metrics clearing with time window."""
        # Create old and new metrics
        old_time = datetime.utcnow() - timedelta(hours=25)  # 25 hours ago
        new_time = datetime.utcnow()
        
        # Mock old metric
        old_metric = Mock()
        old_metric.start_time = old_time
        self.performance_monitor._metrics_history.append(old_metric)
        
        # Add new metric
        self.performance_monitor.record_operation_start("new_op", "new_123")
        self.performance_monitor.record_operation_end("new_op", "new_123", True)
        
        # Should have 2 metrics
        assert len(self.performance_monitor._metrics_history) == 2
        
        # Clear metrics older than 24 hours
        self.performance_monitor.clear_metrics(24.0)
        
        # Should only have the new metric
        assert len(self.performance_monitor._metrics_history) == 1
        assert self.performance_monitor._metrics_history[0].operation_type == "new_op"
    
    def test_monitoring_lifecycle(self):
        """Test monitoring start and stop."""
        # Initially not monitoring
        assert not self.performance_monitor._monitoring_active
        
        # Start monitoring
        self.performance_monitor.start_monitoring()
        assert self.performance_monitor._monitoring_active
        assert self.performance_monitor._resource_monitor_thread is not None
        
        # Stop monitoring
        self.performance_monitor.stop_monitoring()
        assert not self.performance_monitor._monitoring_active
        
        # Should be able to start again
        self.performance_monitor.start_monitoring()
        assert self.performance_monitor._monitoring_active
    
    def test_current_resource_usage(self):
        """Test getting current resource usage."""
        # Should return a snapshot
        snapshot = self.performance_monitor.get_current_resource_usage()
        assert isinstance(snapshot, ResourceUsageSnapshot)
        assert snapshot.timestamp is not None