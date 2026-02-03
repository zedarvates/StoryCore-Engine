"""
Progress Monitor for End-to-End Project Creation.

This module provides real-time progress tracking, time estimation,
and reporting for the complete workflow.

Requirements: 8.1, 8.2, 8.3, 8.4, 8.6
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from enum import Enum

from .data_models import WorkflowStep, ProgressReport


class StepStatus(Enum):
    """Status of a workflow step"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class StepProgress:
    """Progress information for a single step"""
    step_name: str
    status: StepStatus
    progress_percent: float = 0.0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    message: str = ""
    result: Optional[Dict] = None


@dataclass
class WorkflowProgress:
    """Complete workflow progress information"""
    workflow_id: str
    total_steps: int
    completed_steps: int
    current_step: Optional[str]
    overall_progress: float
    start_time: datetime
    elapsed_time: timedelta
    estimated_remaining: timedelta
    estimated_completion: datetime
    steps: Dict[str, StepProgress] = field(default_factory=dict)


class ProgressMonitor:
    """
    Monitor and track progress of end-to-end workflow.
    
    Provides:
    - Real-time progress tracking
    - Time estimation
    - Step-by-step reporting
    - Progress callbacks
    
    Requirements:
    - 8.1: Track workflow through all steps
    - 8.2: Track step progress
    - 8.3: Calculate overall completion percentage
    - 8.4: Estimate remaining time
    - 8.6: Provide progress information on demand
    """
    
    def __init__(self, workflow_id: str = "default"):
        """
        Initialize progress monitor.
        
        Args:
            workflow_id: Unique identifier for this workflow
        """
        self.workflow_id = workflow_id
        self.total_steps = 0
        self.completed_steps = 0
        self.current_step: Optional[str] = None
        self.start_time: Optional[datetime] = None
        self.steps: Dict[str, StepProgress] = {}
        self.step_order: List[str] = []
        self.callbacks: List[Callable[[ProgressReport], None]] = []
        
        # Time estimation
        self.step_durations: Dict[str, timedelta] = {}
        self.average_step_duration: Optional[timedelta] = None
    
    def start_workflow(
        self,
        total_steps: int,
        estimated_duration: Optional[timedelta] = None
    ) -> None:
        """
        Start monitoring workflow.
        
        Args:
            total_steps: Total number of steps in workflow
            estimated_duration: Optional estimated total duration
            
        Requirement 8.1: Track workflow through all steps
        """
        self.total_steps = total_steps
        self.completed_steps = 0
        self.current_step = None
        self.start_time = datetime.now()
        self.steps = {}
        self.step_order = []
        
        if estimated_duration:
            self.average_step_duration = estimated_duration / total_steps
    
    def update_step(
        self,
        step_name: str,
        progress_percent: float,
        message: str = ""
    ) -> None:
        """
        Update progress for current step.
        
        Args:
            step_name: Name of the step
            progress_percent: Progress percentage (0-100)
            message: Optional progress message
            
        Requirement 8.2: Track step progress
        """
        if step_name not in self.steps:
            # New step - initialize it
            self.steps[step_name] = StepProgress(
                step_name=step_name,
                status=StepStatus.IN_PROGRESS,
                start_time=datetime.now()
            )
            self.step_order.append(step_name)
            self.current_step = step_name
        
        # Update step progress
        step = self.steps[step_name]
        step.progress_percent = min(100.0, max(0.0, progress_percent))
        step.message = message
        step.status = StepStatus.IN_PROGRESS
        
        # Notify callbacks
        self._notify_callbacks()
    
    def complete_step(
        self,
        step_name: str,
        result: Optional[Dict] = None
    ) -> None:
        """
        Mark step as complete.
        
        Args:
            step_name: Name of the step
            result: Optional result data from step
            
        Requirement 8.2: Track step progress
        """
        if step_name not in self.steps:
            # Step wasn't started properly, initialize it
            self.steps[step_name] = StepProgress(
                step_name=step_name,
                status=StepStatus.COMPLETED,
                start_time=datetime.now(),
                end_time=datetime.now(),
                result=result
            )
            self.step_order.append(step_name)
        else:
            step = self.steps[step_name]
            step.status = StepStatus.COMPLETED
            step.progress_percent = 100.0
            step.end_time = datetime.now()
            step.result = result
            
            # Record duration for estimation
            if step.start_time:
                duration = step.end_time - step.start_time
                self.step_durations[step_name] = duration
        
        self.completed_steps += 1
        
        # Don't change current_step - it should remain on the step being worked on
        # until explicitly moved to next step via update_step
        
        # Notify callbacks
        self._notify_callbacks()
    
    def fail_step(
        self,
        step_name: str,
        error_message: str
    ) -> None:
        """
        Mark step as failed.
        
        Args:
            step_name: Name of the step
            error_message: Error message
        """
        if step_name not in self.steps:
            self.steps[step_name] = StepProgress(
                step_name=step_name,
                status=StepStatus.FAILED,
                start_time=datetime.now(),
                end_time=datetime.now()
            )
            self.step_order.append(step_name)
        else:
            step = self.steps[step_name]
            step.status = StepStatus.FAILED
            step.end_time = datetime.now()
            step.message = error_message
        
        # Notify callbacks
        self._notify_callbacks()
    
    def get_progress_report(self) -> ProgressReport:
        """
        Get current progress report.
        
        Returns:
            ProgressReport with current state
            
        Requirement 8.6: Provide progress information on demand
        """
        if not self.start_time:
            # Workflow not started
            return ProgressReport(
                current_step="Not started",
                progress_percent=0.0,
                elapsed_time=timedelta(0),
                estimated_remaining=timedelta(0),
                completed_steps=[],
                current_message=""
            )
        
        elapsed = datetime.now() - self.start_time
        progress_percent = self.calculate_overall_progress()
        estimated_remaining = self.estimate_remaining_time()
        
        completed_step_names = [
            name for name, step in self.steps.items()
            if step.status == StepStatus.COMPLETED
        ]
        
        current_message = ""
        if self.current_step and self.current_step in self.steps:
            current_message = self.steps[self.current_step].message
        
        return ProgressReport(
            current_step=self.current_step or "Complete",
            progress_percent=progress_percent,
            elapsed_time=elapsed,
            estimated_remaining=estimated_remaining,
            completed_steps=completed_step_names,
            current_message=current_message
        )
    
    def calculate_overall_progress(self) -> float:
        """
        Calculate overall workflow progress percentage.
        
        Returns:
            Progress percentage (0-100)
            
        Requirement 8.3: Calculate overall completion percentage
        """
        if self.total_steps == 0:
            return 0.0
        
        # Calculate based on completed steps plus current step progress
        total_progress = 0.0
        
        for step_name in self.step_order:
            if step_name in self.steps:
                step = self.steps[step_name]
                if step.status == StepStatus.COMPLETED:
                    total_progress += 100.0
                elif step.status == StepStatus.IN_PROGRESS:
                    total_progress += step.progress_percent
        
        # Calculate percentage
        if self.total_steps > 0:
            return (total_progress / (self.total_steps * 100.0)) * 100.0
        
        return 0.0
    
    def estimate_remaining_time(self) -> timedelta:
        """
        Estimate remaining time to completion.
        
        Returns:
            Estimated remaining time
            
        Requirement 8.4: Estimate remaining time
        """
        if not self.start_time or self.total_steps == 0:
            return timedelta(0)
        
        elapsed = datetime.now() - self.start_time
        progress_percent = self.calculate_overall_progress()
        
        if progress_percent <= 0.001:  # Essentially no progress
            # No progress yet, use average step duration if available
            if self.average_step_duration:
                return self.average_step_duration * self.total_steps
            return timedelta(0)
        
        # Estimate based on current progress rate
        if progress_percent >= 100:
            return timedelta(0)
        
        # Calculate time per percent - handle very small progress carefully
        try:
            time_per_percent = elapsed / progress_percent
            remaining_percent = 100.0 - progress_percent
            estimated = time_per_percent * remaining_percent
            
            # Sanity check - don't return absurdly large estimates
            max_reasonable = elapsed * 1000  # At most 1000x elapsed time
            if estimated > max_reasonable:
                return max_reasonable
            
            return estimated
        except (OverflowError, ValueError):
            # Handle edge cases with very small progress
            if self.average_step_duration:
                return self.average_step_duration * (self.total_steps - self.completed_steps)
            return timedelta(0)
    
    def get_workflow_progress(self) -> WorkflowProgress:
        """
        Get complete workflow progress information.
        
        Returns:
            WorkflowProgress with all details
            
        Requirement 8.6: Provide progress information on demand
        """
        if not self.start_time:
            # Return empty progress
            return WorkflowProgress(
                workflow_id=self.workflow_id,
                total_steps=self.total_steps,
                completed_steps=0,
                current_step=None,
                overall_progress=0.0,
                start_time=datetime.now(),
                elapsed_time=timedelta(0),
                estimated_remaining=timedelta(0),
                estimated_completion=datetime.now(),
                steps={}
            )
        
        elapsed = datetime.now() - self.start_time
        progress_percent = self.calculate_overall_progress()
        estimated_remaining = self.estimate_remaining_time()
        estimated_completion = datetime.now() + estimated_remaining
        
        return WorkflowProgress(
            workflow_id=self.workflow_id,
            total_steps=self.total_steps,
            completed_steps=self.completed_steps,
            current_step=self.current_step,
            overall_progress=progress_percent,
            start_time=self.start_time,
            elapsed_time=elapsed,
            estimated_remaining=estimated_remaining,
            estimated_completion=estimated_completion,
            steps=self.steps.copy()
        )
    
    def add_callback(self, callback: Callable[[ProgressReport], None]) -> None:
        """
        Add progress callback.
        
        Args:
            callback: Function to call on progress updates
        """
        self.callbacks.append(callback)
    
    def remove_callback(self, callback: Callable[[ProgressReport], None]) -> None:
        """
        Remove progress callback.
        
        Args:
            callback: Function to remove
        """
        if callback in self.callbacks:
            self.callbacks.remove(callback)
    
    def _notify_callbacks(self) -> None:
        """Notify all registered callbacks of progress update."""
        report = self.get_progress_report()
        for callback in self.callbacks:
            try:
                callback(report)
            except Exception as e:
                # Don't let callback errors break monitoring
                print(f"Error in progress callback: {e}")
