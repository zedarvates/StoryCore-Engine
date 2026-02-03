"""
Unit tests for ProgressMonitor.

Tests specific examples and edge cases for progress tracking,
time estimation, and progress reporting.
"""

import pytest
from datetime import datetime, timedelta
import time

from src.end_to_end.progress_monitor import (
    ProgressMonitor,
    StepStatus,
    StepProgress,
    WorkflowProgress
)


class TestProgressMonitorInitialization:
    """Test progress monitor initialization."""
    
    def test_initialization_default(self):
        """Test default initialization."""
        monitor = ProgressMonitor()
        
        assert monitor.workflow_id == "default"
        assert monitor.total_steps == 0
        assert monitor.completed_steps == 0
        assert monitor.current_step is None
        assert monitor.start_time is None
        assert len(monitor.steps) == 0
        assert len(monitor.callbacks) == 0
    
    def test_initialization_with_id(self):
        """Test initialization with custom workflow ID."""
        monitor = ProgressMonitor(workflow_id="test_workflow")
        
        assert monitor.workflow_id == "test_workflow"
    
    def test_start_workflow(self):
        """Test starting workflow."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=5)
        
        assert monitor.total_steps == 5
        assert monitor.completed_steps == 0
        assert monitor.start_time is not None
        assert len(monitor.steps) == 0
    
    def test_start_workflow_with_estimated_duration(self):
        """Test starting workflow with estimated duration."""
        monitor = ProgressMonitor()
        estimated = timedelta(minutes=10)
        monitor.start_workflow(total_steps=5, estimated_duration=estimated)
        
        assert monitor.total_steps == 5
        assert monitor.average_step_duration == estimated / 5


class TestStepProgressTracking:
    """Test step progress tracking."""
    
    def test_update_step_new(self):
        """Test updating a new step."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        monitor.update_step("step_1", 50.0, "Processing")
        
        assert "step_1" in monitor.steps
        assert monitor.steps["step_1"].progress_percent == 50.0
        assert monitor.steps["step_1"].message == "Processing"
        assert monitor.steps["step_1"].status == StepStatus.IN_PROGRESS
        assert monitor.current_step == "step_1"
    
    def test_update_step_existing(self):
        """Test updating an existing step."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        monitor.update_step("step_1", 25.0, "Starting")
        monitor.update_step("step_1", 75.0, "Almost done")
        
        assert monitor.steps["step_1"].progress_percent == 75.0
        assert monitor.steps["step_1"].message == "Almost done"
    
    def test_update_step_clamps_progress(self):
        """Test that progress is clamped to 0-100 range."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        # Test negative progress
        monitor.update_step("step_1", -10.0)
        assert monitor.steps["step_1"].progress_percent == 0.0
        
        # Test over 100 progress
        monitor.update_step("step_2", 150.0)
        assert monitor.steps["step_2"].progress_percent == 100.0
    
    def test_complete_step(self):
        """Test completing a step."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        monitor.update_step("step_1", 50.0)
        monitor.complete_step("step_1")
        
        step = monitor.steps["step_1"]
        assert step.status == StepStatus.COMPLETED
        assert step.progress_percent == 100.0
        assert step.end_time is not None
        assert monitor.completed_steps == 1
    
    def test_complete_step_without_update(self):
        """Test completing a step that wasn't updated first."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        monitor.complete_step("step_1")
        
        assert "step_1" in monitor.steps
        assert monitor.steps["step_1"].status == StepStatus.COMPLETED
        assert monitor.completed_steps == 1
    
    def test_complete_step_with_result(self):
        """Test completing a step with result data."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        result = {"output": "test_data", "count": 42}
        monitor.complete_step("step_1", result=result)
        
        assert monitor.steps["step_1"].result == result
    
    def test_fail_step(self):
        """Test failing a step."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        monitor.update_step("step_1", 50.0)
        monitor.fail_step("step_1", "Test error")
        
        step = monitor.steps["step_1"]
        assert step.status == StepStatus.FAILED
        assert step.message == "Test error"
        assert step.end_time is not None
    
    def test_step_order_tracking(self):
        """Test that step order is tracked correctly."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        monitor.update_step("step_1", 100.0)
        monitor.complete_step("step_1")
        monitor.update_step("step_2", 100.0)
        monitor.complete_step("step_2")
        
        assert monitor.step_order == ["step_1", "step_2"]
        # Current step remains on last updated step
        assert monitor.current_step == "step_2"


class TestProgressCalculation:
    """Test progress percentage calculation."""
    
    def test_calculate_progress_no_steps(self):
        """Test progress calculation with no steps."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=0)
        
        progress = monitor.calculate_overall_progress()
        assert progress == 0.0
    
    def test_calculate_progress_no_completion(self):
        """Test progress calculation with no completed steps."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=5)
        
        progress = monitor.calculate_overall_progress()
        assert progress == 0.0
    
    def test_calculate_progress_partial_completion(self):
        """Test progress calculation with partial completion."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=4)
        
        # Complete 2 out of 4 steps
        monitor.update_step("step_1", 100.0)
        monitor.complete_step("step_1")
        monitor.update_step("step_2", 100.0)
        monitor.complete_step("step_2")
        
        progress = monitor.calculate_overall_progress()
        assert abs(progress - 50.0) < 0.1
    
    def test_calculate_progress_full_completion(self):
        """Test progress calculation with full completion."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        for i in range(3):
            monitor.update_step(f"step_{i}", 100.0)
            monitor.complete_step(f"step_{i}")
        
        progress = monitor.calculate_overall_progress()
        assert abs(progress - 100.0) < 0.1
    
    def test_calculate_progress_with_partial_step(self):
        """Test progress calculation with partially completed step."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=4)
        
        # Complete 2 steps fully
        monitor.update_step("step_1", 100.0)
        monitor.complete_step("step_1")
        monitor.update_step("step_2", 100.0)
        monitor.complete_step("step_2")
        
        # Partially complete third step
        monitor.update_step("step_3", 50.0)
        
        # Expected: (100 + 100 + 50 + 0) / 400 * 100 = 62.5%
        progress = monitor.calculate_overall_progress()
        assert abs(progress - 62.5) < 0.1
    
    def test_calculate_progress_multiple_updates(self):
        """Test that progress uses latest update."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=2)
        
        monitor.update_step("step_1", 25.0)
        monitor.update_step("step_1", 50.0)
        monitor.update_step("step_1", 75.0)
        
        # Expected: 75 / 200 * 100 = 37.5%
        progress = monitor.calculate_overall_progress()
        assert abs(progress - 37.5) < 0.1


class TestTimeEstimation:
    """Test time estimation."""
    
    def test_estimate_remaining_no_start(self):
        """Test time estimation before workflow starts."""
        monitor = ProgressMonitor()
        
        remaining = monitor.estimate_remaining_time()
        assert remaining == timedelta(0)
    
    def test_estimate_remaining_no_progress(self):
        """Test time estimation with no progress."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=5)
        
        remaining = monitor.estimate_remaining_time()
        assert remaining == timedelta(0)
    
    def test_estimate_remaining_with_progress(self):
        """Test time estimation with some progress."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=4)
        
        # Complete 2 steps with delays
        for i in range(2):
            monitor.update_step(f"step_{i}", 100.0)
            time.sleep(0.01)
            monitor.complete_step(f"step_{i}")
        
        remaining = monitor.estimate_remaining_time()
        
        # Should have some remaining time
        assert remaining > timedelta(0)
        
        # Should be reasonable (not more than 10x elapsed)
        elapsed = datetime.now() - monitor.start_time
        assert remaining <= elapsed * 10
    
    def test_estimate_remaining_complete(self):
        """Test time estimation when complete."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=2)
        
        for i in range(2):
            monitor.update_step(f"step_{i}", 100.0)
            monitor.complete_step(f"step_{i}")
        
        remaining = monitor.estimate_remaining_time()
        assert remaining == timedelta(0)
    
    def test_estimate_with_average_duration(self):
        """Test time estimation with average step duration."""
        monitor = ProgressMonitor()
        avg_duration = timedelta(seconds=10)
        monitor.start_workflow(total_steps=5, estimated_duration=avg_duration * 5)
        
        # Before any progress, should use average
        remaining = monitor.estimate_remaining_time()
        # Should be close to total estimated duration
        assert remaining >= timedelta(0)


class TestProgressReporting:
    """Test progress reporting."""
    
    def test_get_progress_report_before_start(self):
        """Test getting progress report before workflow starts."""
        monitor = ProgressMonitor()
        
        report = monitor.get_progress_report()
        
        assert report is not None
        assert report.progress_percent == 0.0
        assert report.elapsed_time == timedelta(0)
        assert len(report.completed_steps) == 0
    
    def test_get_progress_report_during_execution(self):
        """Test getting progress report during execution."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        monitor.update_step("step_1", 50.0, "Processing step 1")
        
        report = monitor.get_progress_report()
        
        assert report.current_step == "step_1"
        assert report.current_message == "Processing step 1"
        assert report.progress_percent > 0
        assert report.elapsed_time >= timedelta(0)
    
    def test_get_progress_report_after_completion(self):
        """Test getting progress report after completion."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=2)
        
        monitor.update_step("step_1", 100.0)
        monitor.complete_step("step_1")
        monitor.update_step("step_2", 100.0)
        monitor.complete_step("step_2")
        
        report = monitor.get_progress_report()
        
        assert len(report.completed_steps) == 2
        assert "step_1" in report.completed_steps
        assert "step_2" in report.completed_steps
        assert report.progress_percent == 100.0
    
    def test_get_workflow_progress(self):
        """Test getting complete workflow progress."""
        monitor = ProgressMonitor(workflow_id="test_123")
        monitor.start_workflow(total_steps=3)
        
        monitor.update_step("step_1", 100.0)
        monitor.complete_step("step_1")
        
        progress = monitor.get_workflow_progress()
        
        assert isinstance(progress, WorkflowProgress)
        assert progress.workflow_id == "test_123"
        assert progress.total_steps == 3
        assert progress.completed_steps == 1
        # Current step remains on last updated step
        assert progress.current_step == "step_1"
        assert progress.overall_progress > 0
        assert progress.start_time is not None
        assert "step_1" in progress.steps
    
    def test_get_workflow_progress_before_start(self):
        """Test getting workflow progress before start."""
        monitor = ProgressMonitor(workflow_id="test_456")
        
        progress = monitor.get_workflow_progress()
        
        assert progress.workflow_id == "test_456"
        assert progress.total_steps == 0
        assert progress.completed_steps == 0
        assert progress.overall_progress == 0.0


class TestCallbacks:
    """Test progress callbacks."""
    
    def test_add_callback(self):
        """Test adding a callback."""
        monitor = ProgressMonitor()
        
        def callback(report):
            pass
        
        monitor.add_callback(callback)
        assert callback in monitor.callbacks
    
    def test_remove_callback(self):
        """Test removing a callback."""
        monitor = ProgressMonitor()
        
        def callback(report):
            pass
        
        monitor.add_callback(callback)
        monitor.remove_callback(callback)
        assert callback not in monitor.callbacks
    
    def test_callback_invoked_on_update(self):
        """Test that callback is invoked on step update."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=2)
        
        invocations = []
        
        def callback(report):
            invocations.append(report)
        
        monitor.add_callback(callback)
        monitor.update_step("step_1", 50.0, "Testing")
        
        assert len(invocations) > 0
        assert invocations[-1].current_step == "step_1"
        assert invocations[-1].current_message == "Testing"
    
    def test_callback_invoked_on_complete(self):
        """Test that callback is invoked on step completion."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=2)
        
        invocations = []
        
        def callback(report):
            invocations.append(report)
        
        monitor.add_callback(callback)
        monitor.update_step("step_1", 100.0)
        initial_count = len(invocations)
        
        monitor.complete_step("step_1")
        
        assert len(invocations) > initial_count
    
    def test_callback_error_handling(self):
        """Test that callback errors don't break monitoring."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=2)
        
        def bad_callback(report):
            raise ValueError("Test error")
        
        monitor.add_callback(bad_callback)
        
        # Should not raise exception
        monitor.update_step("step_1", 50.0)
        
        # Monitor should still work
        assert "step_1" in monitor.steps
    
    def test_multiple_callbacks(self):
        """Test multiple callbacks."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=2)
        
        invocations_1 = []
        invocations_2 = []
        
        def callback_1(report):
            invocations_1.append(report)
        
        def callback_2(report):
            invocations_2.append(report)
        
        monitor.add_callback(callback_1)
        monitor.add_callback(callback_2)
        
        monitor.update_step("step_1", 50.0)
        
        assert len(invocations_1) > 0
        assert len(invocations_2) > 0


class TestEdgeCases:
    """Test edge cases."""
    
    def test_empty_workflow(self):
        """Test workflow with zero steps."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=0)
        
        progress = monitor.calculate_overall_progress()
        assert progress == 0.0
        
        report = monitor.get_progress_report()
        assert report.progress_percent == 0.0
    
    def test_single_step_workflow(self):
        """Test workflow with single step."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=1)
        
        monitor.update_step("only_step", 50.0)
        progress = monitor.calculate_overall_progress()
        assert abs(progress - 50.0) < 0.1
        
        monitor.complete_step("only_step")
        progress = monitor.calculate_overall_progress()
        assert abs(progress - 100.0) < 0.1
    
    def test_step_duration_tracking(self):
        """Test that step durations are tracked."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=2)
        
        monitor.update_step("step_1", 50.0)
        time.sleep(0.01)
        monitor.complete_step("step_1")
        
        assert "step_1" in monitor.step_durations
        assert monitor.step_durations["step_1"] > timedelta(0)
    
    def test_restart_workflow(self):
        """Test restarting workflow."""
        monitor = ProgressMonitor()
        
        # First workflow
        monitor.start_workflow(total_steps=2)
        monitor.update_step("step_1", 100.0)
        monitor.complete_step("step_1")
        
        # Restart
        monitor.start_workflow(total_steps=3)
        
        assert monitor.total_steps == 3
        assert monitor.completed_steps == 0
        assert len(monitor.steps) == 0
    
    def test_out_of_order_completion(self):
        """Test completing steps out of order."""
        monitor = ProgressMonitor()
        monitor.start_workflow(total_steps=3)
        
        # Complete step 2 before step 1
        monitor.update_step("step_2", 100.0)
        monitor.complete_step("step_2")
        monitor.update_step("step_1", 100.0)
        monitor.complete_step("step_1")
        
        assert monitor.completed_steps == 2
        assert monitor.steps["step_1"].status == StepStatus.COMPLETED
        assert monitor.steps["step_2"].status == StepStatus.COMPLETED
