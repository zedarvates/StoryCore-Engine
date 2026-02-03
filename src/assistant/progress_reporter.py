"""
Progress Reporter for long-running operations.

Provides progress tracking and reporting for operations like project generation,
with support for cancellation and stage tracking.
"""

from typing import Optional, Callable, List
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from .logging_config import get_logger

logger = get_logger(__name__)


class OperationStage(Enum):
    """Stages of a long-running operation."""
    INITIALIZING = "initializing"
    PARSING_PROMPT = "parsing_prompt"
    GENERATING_SCENES = "generating_scenes"
    GENERATING_CHARACTERS = "generating_characters"
    GENERATING_SEQUENCES = "generating_sequences"
    VALIDATING = "validating"
    PREPARING_COMFYUI = "preparing_comfyui"
    FINALIZING = "finalizing"
    COMPLETE = "complete"
    CANCELLED = "cancelled"
    FAILED = "failed"


@dataclass
class ProgressUpdate:
    """Progress update for a long-running operation."""
    operation_id: str
    stage: OperationStage
    progress_percent: float
    message: str
    timestamp: datetime
    estimated_time_remaining: Optional[float] = None  # seconds
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "operation_id": self.operation_id,
            "stage": self.stage.value,
            "progress_percent": self.progress_percent,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "estimated_time_remaining": self.estimated_time_remaining
        }


class ProgressReporter:
    """
    Track and report progress for long-running operations.
    
    Provides progress updates, stage tracking, and cancellation support
    for operations like project generation.
    """
    
    def __init__(self, operation_id: str, callback: Optional[Callable[[ProgressUpdate], None]] = None):
        """
        Initialize progress reporter.
        
        Args:
            operation_id: Unique identifier for this operation
            callback: Optional callback function to receive progress updates
        """
        self.operation_id = operation_id
        self.callback = callback
        self.current_stage = OperationStage.INITIALIZING
        self.progress_percent = 0.0
        self.start_time = datetime.now()
        self.cancelled = False
        self.updates: List[ProgressUpdate] = []
        
        # Stage weights for progress calculation
        self.stage_weights = {
            OperationStage.INITIALIZING: 5,
            OperationStage.PARSING_PROMPT: 10,
            OperationStage.GENERATING_SCENES: 25,
            OperationStage.GENERATING_CHARACTERS: 20,
            OperationStage.GENERATING_SEQUENCES: 25,
            OperationStage.VALIDATING: 5,
            OperationStage.PREPARING_COMFYUI: 5,
            OperationStage.FINALIZING: 5
        }
        
        logger.info(f"Progress reporter initialized for operation: {operation_id}")
    
    def update(self, stage: OperationStage, message: str, progress_percent: Optional[float] = None) -> None:
        """
        Update progress to a new stage.
        
        Args:
            stage: Current operation stage
            message: Progress message
            progress_percent: Optional explicit progress percentage (0-100)
        """
        if self.cancelled:
            logger.warning(f"Progress update ignored - operation {self.operation_id} is cancelled")
            return
        
        self.current_stage = stage
        
        # Calculate progress if not explicitly provided
        if progress_percent is None:
            progress_percent = self._calculate_progress(stage)
        
        self.progress_percent = min(100.0, max(0.0, progress_percent))
        
        # Estimate time remaining
        elapsed = (datetime.now() - self.start_time).total_seconds()
        if self.progress_percent > 0:
            total_estimated = elapsed / (self.progress_percent / 100.0)
            time_remaining = total_estimated - elapsed
        else:
            time_remaining = None
        
        # Create update
        update = ProgressUpdate(
            operation_id=self.operation_id,
            stage=stage,
            progress_percent=self.progress_percent,
            message=message,
            timestamp=datetime.now(),
            estimated_time_remaining=time_remaining
        )
        
        self.updates.append(update)
        
        # Log update
        logger.info(f"Progress [{self.operation_id}]: {stage.value} - {progress_percent:.1f}% - {message}")
        
        # Call callback if provided
        if self.callback:
            try:
                self.callback(update)
            except Exception as e:
                logger.error(f"Error in progress callback: {e}")
    
    def _calculate_progress(self, stage: OperationStage) -> float:
        """
        Calculate progress percentage based on current stage.
        
        Args:
            stage: Current operation stage
            
        Returns:
            Progress percentage (0-100)
        """
        # Get all stages up to and including current
        stages = list(OperationStage)
        try:
            current_index = stages.index(stage)
        except ValueError:
            return 0.0
        
        # Calculate cumulative weight
        total_weight = sum(self.stage_weights.get(s, 0) for s in stages if s in self.stage_weights)
        completed_weight = sum(
            self.stage_weights.get(s, 0) 
            for s in stages[:current_index] 
            if s in self.stage_weights
        )
        
        if total_weight == 0:
            return 0.0
        
        return (completed_weight / total_weight) * 100.0
    
    def cancel(self) -> None:
        """
        Cancel the operation.
        
        Marks the operation as cancelled and prevents further updates.
        """
        if self.cancelled:
            logger.warning(f"Operation {self.operation_id} already cancelled")
            return
        
        self.cancelled = True
        self.current_stage = OperationStage.CANCELLED
        
        logger.info(f"Operation cancelled: {self.operation_id}")
        
        # Send cancellation update
        self.update(OperationStage.CANCELLED, "Operation cancelled by user")
    
    def is_cancelled(self) -> bool:
        """
        Check if operation has been cancelled.
        
        Returns:
            True if cancelled, False otherwise
        """
        return self.cancelled
    
    def complete(self, message: str = "Operation completed successfully") -> None:
        """
        Mark operation as complete.
        
        Args:
            message: Completion message
        """
        if self.cancelled:
            logger.warning(f"Cannot complete cancelled operation: {self.operation_id}")
            return
        
        self.update(OperationStage.COMPLETE, message, progress_percent=100.0)
        
        elapsed = (datetime.now() - self.start_time).total_seconds()
        logger.info(f"Operation completed: {self.operation_id} (took {elapsed:.2f}s)")
    
    def fail(self, message: str, error: Optional[Exception] = None) -> None:
        """
        Mark operation as failed.
        
        Args:
            message: Failure message
            error: Optional exception that caused the failure
        """
        self.current_stage = OperationStage.FAILED
        
        error_msg = f"{message}"
        if error:
            error_msg += f": {str(error)}"
        
        self.update(OperationStage.FAILED, error_msg)
        
        logger.error(f"Operation failed: {self.operation_id} - {error_msg}")
    
    def get_latest_update(self) -> Optional[ProgressUpdate]:
        """
        Get the most recent progress update.
        
        Returns:
            Latest ProgressUpdate or None if no updates
        """
        if not self.updates:
            return None
        return self.updates[-1]
    
    def get_all_updates(self) -> List[ProgressUpdate]:
        """
        Get all progress updates.
        
        Returns:
            List of all ProgressUpdate objects
        """
        return self.updates.copy()
    
    def get_summary(self) -> dict:
        """
        Get a summary of the operation progress.
        
        Returns:
            Dictionary with operation summary
        """
        elapsed = (datetime.now() - self.start_time).total_seconds()
        
        return {
            "operation_id": self.operation_id,
            "current_stage": self.current_stage.value,
            "progress_percent": self.progress_percent,
            "elapsed_seconds": elapsed,
            "cancelled": self.cancelled,
            "update_count": len(self.updates),
            "latest_message": self.updates[-1].message if self.updates else None
        }
