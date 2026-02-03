"""
Property-based tests for Progress Monitor.

Tests Property 8: Progress Tracking
Validates Requirements 8.1-8.6

Property 8: Progress Tracking
For any workflow execution, the system should track progress through all steps,
calculate overall completion percentage, estimate remaining time, and provide
this information on demand.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime, timedelta
import time

from src.end_to_end.progress_monitor import ProgressMonitor, StepStatus


# Strategies
@st.composite
def step_sequence(draw):
    """Generate a sequence of step updates."""
    num_steps = draw(st.integers(min_value=1, max_value=20))
    step_names = [f"step_{i}" for i in range(num_steps)]
    
    updates = []
    for step_name in step_names:
        # Generate progress updates for this step
        num_updates = draw(st.integers(min_value=1, max_value=5))
        for _ in range(num_updates):
            progress = draw(st.floats(min_value=0, max_value=100))
            message = draw(st.text(min_size=0, max_size=50))
            updates.append(("update", step_name, progress, message))
        
        # Complete the step
        updates.append(("complete", step_name, None, None))
    
    return num_steps, step_names, updates


@given(
    total_steps=st.integers(min_value=1, max_value=50),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=100, deadline=None)
def test_property_8_progress_tracking_initialization(total_steps, seed):
    """
    Feature: end-to-end-project-creation, Property 8: Progress Tracking
    
    Test that workflow tracking is properly initialized.
    
    Validates: Requirement 8.1 - Track workflow through all steps
    """
    monitor = ProgressMonitor(workflow_id=f"test_{seed}")
    
    # Start workflow
    monitor.start_workflow(total_steps=total_steps)
    
    # Verify initialization
    assert monitor.total_steps == total_steps
    assert monitor.completed_steps == 0
    assert monitor.current_step is None
    assert monitor.start_time is not None
    assert len(monitor.steps) == 0
    
    # Verify progress report is available
    report = monitor.get_progress_report()
    assert report is not None
    assert report.progress_percent == 0.0
    assert report.elapsed_time >= timedelta(0)


@given(
    step_data=step_sequence(),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=100, deadline=None)
def test_property_8_step_progress_tracking(step_data, seed):
    """
    Feature: end-to-end-project-creation, Property 8: Progress Tracking
    
    Test that individual step progress is tracked correctly.
    
    Validates: Requirement 8.2 - Track step progress
    """
    num_steps, step_names, updates = step_data
    
    monitor = ProgressMonitor(workflow_id=f"test_{seed}")
    monitor.start_workflow(total_steps=num_steps)
    
    # Apply all updates
    for action, step_name, progress, message in updates:
        if action == "update":
            monitor.update_step(step_name, progress, message or "")
        elif action == "complete":
            monitor.complete_step(step_name)
    
    # Verify all steps are tracked
    assert len(monitor.steps) == num_steps
    
    # Verify all steps are completed
    for step_name in step_names:
        assert step_name in monitor.steps
        step = monitor.steps[step_name]
        assert step.status == StepStatus.COMPLETED
        assert step.progress_percent == 100.0
        assert step.start_time is not None
        assert step.end_time is not None
    
    # Verify completed count
    assert monitor.completed_steps == num_steps


@given(
    total_steps=st.integers(min_value=1, max_value=20),
    completed_steps=st.integers(min_value=0, max_value=20),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=100, deadline=None)
def test_property_8_overall_progress_calculation(total_steps, completed_steps, seed):
    """
    Feature: end-to-end-project-creation, Property 8: Progress Tracking
    
    Test that overall progress percentage is calculated correctly.
    
    Validates: Requirement 8.3 - Calculate overall completion percentage
    """
    assume(completed_steps <= total_steps)
    
    monitor = ProgressMonitor(workflow_id=f"test_{seed}")
    monitor.start_workflow(total_steps=total_steps)
    
    # Complete some steps
    for i in range(completed_steps):
        step_name = f"step_{i}"
        monitor.update_step(step_name, 100.0)
        monitor.complete_step(step_name)
    
    # Calculate expected progress
    expected_progress = (completed_steps / total_steps) * 100.0 if total_steps > 0 else 0.0
    
    # Get actual progress
    actual_progress = monitor.calculate_overall_progress()
    
    # Verify progress is in valid range
    assert 0.0 <= actual_progress <= 100.0
    
    # Verify progress matches expected (with small tolerance for floating point)
    assert abs(actual_progress - expected_progress) < 0.1
    
    # Verify progress report
    report = monitor.get_progress_report()
    assert abs(report.progress_percent - expected_progress) < 0.1


@given(
    total_steps=st.integers(min_value=1, max_value=10),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=50, deadline=None)
def test_property_8_time_estimation(total_steps, seed):
    """
    Feature: end-to-end-project-creation, Property 8: Progress Tracking
    
    Test that remaining time is estimated based on progress.
    
    Validates: Requirement 8.4 - Estimate remaining time
    """
    monitor = ProgressMonitor(workflow_id=f"test_{seed}")
    monitor.start_workflow(total_steps=total_steps)
    
    # Complete half the steps with small delays
    half_steps = total_steps // 2
    for i in range(half_steps):
        step_name = f"step_{i}"
        monitor.update_step(step_name, 50.0)
        time.sleep(0.01)  # Small delay to simulate work
        monitor.complete_step(step_name)
    
    # Get time estimation
    estimated_remaining = monitor.estimate_remaining_time()
    
    # Verify estimation is non-negative
    assert estimated_remaining >= timedelta(0)
    
    # If we've made progress, estimation should be reasonable
    if half_steps > 0:
        elapsed = datetime.now() - monitor.start_time
        # Remaining time should be proportional to elapsed time
        # (roughly equal for 50% completion)
        # Allow wide margin due to timing variations
        assert estimated_remaining <= elapsed * 10


@given(
    total_steps=st.integers(min_value=1, max_value=20),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=100, deadline=None)
def test_property_8_progress_information_on_demand(total_steps, seed):
    """
    Feature: end-to-end-project-creation, Property 8: Progress Tracking
    
    Test that progress information is available on demand at any time.
    
    Validates: Requirement 8.6 - Provide progress information on demand
    """
    monitor = ProgressMonitor(workflow_id=f"test_{seed}")
    
    # Before starting - should still provide info
    report_before = monitor.get_progress_report()
    assert report_before is not None
    assert report_before.progress_percent == 0.0
    
    # Start workflow
    monitor.start_workflow(total_steps=total_steps)
    
    # After starting - should provide info
    report_started = monitor.get_progress_report()
    assert report_started is not None
    assert report_started.current_step in ["Not started", None, "Complete"]
    
    # During execution - should provide info
    for i in range(min(3, total_steps)):
        step_name = f"step_{i}"
        monitor.update_step(step_name, 50.0, f"Processing {step_name}")
        
        report_during = monitor.get_progress_report()
        assert report_during is not None
        assert report_during.current_step == step_name
        assert report_during.current_message == f"Processing {step_name}"
        
        monitor.complete_step(step_name)
    
    # After completion - should provide info
    report_after = monitor.get_progress_report()
    assert report_after is not None
    assert len(report_after.completed_steps) > 0
    
    # Workflow progress should also be available
    workflow_progress = monitor.get_workflow_progress()
    assert workflow_progress is not None
    assert workflow_progress.workflow_id == f"test_{seed}"
    assert workflow_progress.total_steps == total_steps


@given(
    total_steps=st.integers(min_value=2, max_value=10),
    partial_progress=st.floats(min_value=0, max_value=100),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=100, deadline=None)
def test_property_8_partial_step_progress(total_steps, partial_progress, seed):
    """
    Feature: end-to-end-project-creation, Property 8: Progress Tracking
    
    Test that partial step progress is included in overall calculation.
    
    Validates: Requirements 8.2, 8.3 - Track step progress and calculate overall
    """
    monitor = ProgressMonitor(workflow_id=f"test_{seed}")
    monitor.start_workflow(total_steps=total_steps)
    
    # Complete first step
    monitor.update_step("step_0", 100.0)
    monitor.complete_step("step_0")
    
    # Partially complete second step
    monitor.update_step("step_1", partial_progress)
    
    # Calculate expected progress
    # First step: 100%, second step: partial_progress%, rest: 0%
    expected = ((100.0 + partial_progress) / (total_steps * 100.0)) * 100.0
    
    actual = monitor.calculate_overall_progress()
    
    # Verify progress includes partial step
    assert abs(actual - expected) < 0.1
    
    # Verify progress is between completed and completed+1 steps
    min_progress = (1 / total_steps) * 100.0
    max_progress = (2 / total_steps) * 100.0
    assert min_progress <= actual <= max_progress


@given(
    total_steps=st.integers(min_value=1, max_value=10),
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=50, deadline=None)
def test_property_8_progress_monotonicity(total_steps, seed):
    """
    Feature: end-to-end-project-creation, Property 8: Progress Tracking
    
    Test that progress never decreases (monotonic increase).
    
    Validates: Requirements 8.2, 8.3 - Progress tracking consistency
    """
    monitor = ProgressMonitor(workflow_id=f"test_{seed}")
    monitor.start_workflow(total_steps=total_steps)
    
    previous_progress = 0.0
    
    for i in range(total_steps):
        step_name = f"step_{i}"
        
        # Update with increasing progress
        for progress in [25.0, 50.0, 75.0, 100.0]:
            monitor.update_step(step_name, progress)
            current_progress = monitor.calculate_overall_progress()
            
            # Progress should never decrease
            assert current_progress >= previous_progress
            previous_progress = current_progress
        
        monitor.complete_step(step_name)
        current_progress = monitor.calculate_overall_progress()
        
        # Progress should never decrease after completion
        assert current_progress >= previous_progress
        previous_progress = current_progress


@given(
    seed=st.integers(min_value=0, max_value=2**31-1)
)
@settings(max_examples=100, deadline=None)
def test_property_8_callback_notification(seed):
    """
    Feature: end-to-end-project-creation, Property 8: Progress Tracking
    
    Test that callbacks are notified on progress updates.
    
    Validates: Requirement 8.2 - Track step progress with notifications
    """
    monitor = ProgressMonitor(workflow_id=f"test_{seed}")
    
    # Track callback invocations
    callback_count = [0]
    last_report = [None]
    
    def test_callback(report):
        callback_count[0] += 1
        last_report[0] = report
    
    monitor.add_callback(test_callback)
    monitor.start_workflow(total_steps=3)
    
    # Update step - should trigger callback
    monitor.update_step("step_0", 50.0, "Testing")
    assert callback_count[0] > 0
    assert last_report[0] is not None
    assert last_report[0].current_step == "step_0"
    
    # Complete step - should trigger callback
    prev_count = callback_count[0]
    monitor.complete_step("step_0")
    assert callback_count[0] > prev_count
    
    # Remove callback
    monitor.remove_callback(test_callback)
    prev_count = callback_count[0]
    monitor.update_step("step_1", 50.0)
    
    # Should not increase after removal
    assert callback_count[0] == prev_count
