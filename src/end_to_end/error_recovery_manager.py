"""
Error Recovery Manager for End-to-End Project Creation

This module provides error recovery and checkpoint functionality for the workflow.
"""

import json
import logging
import traceback
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, Any, Optional, List

from .data_models import (
    ErrorContext,
    RecoveryAction,
    RecoveryStrategy,
    WorkflowState,
    WorkflowStep,
)


logger = logging.getLogger(__name__)


class ErrorType(Enum):
    """Types of errors that can occur"""
    NETWORK_ERROR = "network_error"
    FILE_SYSTEM_ERROR = "file_system_error"
    PARSING_ERROR = "parsing_error"
    GENERATION_ERROR = "generation_error"
    VALIDATION_ERROR = "validation_error"
    PIPELINE_ERROR = "pipeline_error"
    DEPENDENCY_ERROR = "dependency_error"
    RESOURCE_ERROR = "resource_error"
    UNKNOWN_ERROR = "unknown_error"


class ErrorSeverity(Enum):
    """Severity levels for errors"""
    LOW = "low"  # Can continue with degraded functionality
    MEDIUM = "medium"  # Requires recovery action
    HIGH = "high"  # Requires user intervention
    CRITICAL = "critical"  # Cannot continue


@dataclass
class RecoveryResult:
    """Result of recovery action execution"""
    success: bool
    message: str
    new_state: Optional[WorkflowState] = None
    retry_recommended: bool = False


class ErrorRecoveryManager:
    """
    Manages error recovery and checkpoint functionality.
    
    Responsibilities:
    - Classify errors by type and severity
    - Determine appropriate recovery strategies
    - Execute recovery actions
    - Save and load workflow checkpoints
    - Notify users of errors and recovery actions
    """
    
    def __init__(self, checkpoint_dir: Optional[Path] = None):
        """
        Initialize error recovery manager.
        
        Args:
            checkpoint_dir: Directory for storing checkpoints (default: .checkpoints)
        """
        self.checkpoint_dir = checkpoint_dir or Path(".checkpoints")
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.recovery_attempts: Dict[str, int] = {}
        self.error_history: List[ErrorContext] = []
        
    def classify_error(self, error: Exception, context: Dict[str, Any]) -> tuple[ErrorType, ErrorSeverity]:
        """
        Classify error by type and severity.
        
        Args:
            error: The exception that occurred
            context: Additional context about the error
            
        Returns:
            Tuple of (ErrorType, ErrorSeverity)
        """
        error_str = str(error).lower()
        error_type_name = type(error).__name__.lower()
        
        # Network errors
        if any(keyword in error_str for keyword in ["connection", "timeout", "network", "http"]):
            return ErrorType.NETWORK_ERROR, ErrorSeverity.MEDIUM
            
        # File system errors
        if any(keyword in error_str for keyword in ["permission", "file not found", "directory", "disk"]):
            if "permission" in error_str:
                return ErrorType.FILE_SYSTEM_ERROR, ErrorSeverity.HIGH
            return ErrorType.FILE_SYSTEM_ERROR, ErrorSeverity.MEDIUM
            
        # Parsing errors
        if any(keyword in error_str for keyword in ["parse", "invalid format", "json", "yaml"]):
            return ErrorType.PARSING_ERROR, ErrorSeverity.MEDIUM
            
        # Generation errors
        if any(keyword in error_str for keyword in ["generation", "llm", "model", "api"]):
            return ErrorType.GENERATION_ERROR, ErrorSeverity.MEDIUM
            
        # Validation errors
        if any(keyword in error_str for keyword in ["validation", "invalid", "missing required"]):
            return ErrorType.VALIDATION_ERROR, ErrorSeverity.LOW
            
        # Pipeline errors
        if any(keyword in error_str for keyword in ["pipeline", "command", "execution"]):
            return ErrorType.PIPELINE_ERROR, ErrorSeverity.MEDIUM
            
        # Dependency errors
        if any(keyword in error_str for keyword in ["import", "module", "dependency", "not found"]):
            return ErrorType.DEPENDENCY_ERROR, ErrorSeverity.HIGH
            
        # Resource errors
        if any(keyword in error_str for keyword in ["memory", "resource", "space", "quota"]):
            return ErrorType.RESOURCE_ERROR, ErrorSeverity.HIGH
            
        # Unknown errors
        return ErrorType.UNKNOWN_ERROR, ErrorSeverity.MEDIUM
        
    def determine_recovery_strategy(
        self,
        error_type: ErrorType,
        error_severity: ErrorSeverity,
        workflow_step: WorkflowStep,
        attempt_count: int = 0
    ) -> RecoveryStrategy:
        """
        Determine appropriate recovery strategy based on error characteristics.
        
        Args:
            error_type: Type of error
            error_severity: Severity of error
            workflow_step: Current workflow step
            attempt_count: Number of previous recovery attempts
            
        Returns:
            RecoveryStrategy to apply
        """
        # Critical errors require abort
        if error_severity == ErrorSeverity.CRITICAL:
            return RecoveryStrategy.ABORT
            
        # High severity errors require user intervention
        if error_severity == ErrorSeverity.HIGH:
            return RecoveryStrategy.CHECKPOINT
            
        # Network errors - retry with backoff
        if error_type == ErrorType.NETWORK_ERROR:
            if attempt_count < 3:
                return RecoveryStrategy.RETRY_ADJUSTED
            return RecoveryStrategy.FALLBACK
            
        # File system errors - retry once, then checkpoint
        if error_type == ErrorType.FILE_SYSTEM_ERROR:
            if attempt_count < 1:
                return RecoveryStrategy.RETRY
            return RecoveryStrategy.CHECKPOINT
            
        # Parsing errors - use defaults and continue
        if error_type == ErrorType.PARSING_ERROR:
            return RecoveryStrategy.FALLBACK
            
        # Generation errors - retry with adjusted parameters
        if error_type == ErrorType.GENERATION_ERROR:
            if attempt_count < 2:
                return RecoveryStrategy.RETRY_ADJUSTED
            return RecoveryStrategy.FALLBACK
            
        # Validation errors - skip if optional, otherwise fallback
        if error_type == ErrorType.VALIDATION_ERROR:
            if workflow_step in [WorkflowStep.QUALITY_VALIDATION]:
                return RecoveryStrategy.SKIP
            return RecoveryStrategy.FALLBACK
            
        # Pipeline errors - retry once, then checkpoint
        if error_type == ErrorType.PIPELINE_ERROR:
            if attempt_count < 1:
                return RecoveryStrategy.RETRY
            return RecoveryStrategy.CHECKPOINT
            
        # Dependency errors - cannot recover automatically
        if error_type == ErrorType.DEPENDENCY_ERROR:
            return RecoveryStrategy.ABORT
            
        # Resource errors - cannot recover automatically
        if error_type == ErrorType.RESOURCE_ERROR:
            return RecoveryStrategy.ABORT
            
        # Unknown errors - try retry once, then checkpoint
        if attempt_count < 1:
            return RecoveryStrategy.RETRY
        return RecoveryStrategy.CHECKPOINT
        
    def handle_error(
        self,
        error: Exception,
        context: ErrorContext
    ) -> RecoveryAction:
        """
        Analyze error and determine recovery action.
        
        Args:
            error: The exception that occurred
            context: Error context with workflow information
            
        Returns:
            RecoveryAction to take
        """
        # Classify error
        error_type, error_severity = self.classify_error(error, {
            "workflow_step": context.workflow_step,
            "project_path": context.project_path
        })
        
        # Track recovery attempts for this error location
        error_key = f"{context.workflow_step.value}:{error_type.value}"
        attempt_count = self.recovery_attempts.get(error_key, 0)
        
        # Determine recovery strategy
        strategy = self.determine_recovery_strategy(
            error_type,
            error_severity,
            context.workflow_step,
            attempt_count
        )
        
        # Update attempt count
        self.recovery_attempts[error_key] = attempt_count + 1
        
        # Store error in history
        self.error_history.append(context)
        
        # Log error
        logger.error(
            f"Error in {context.workflow_step.value}: {error_type.value} "
            f"(severity: {error_severity.value}). Strategy: {strategy.value}"
        )
        
        # Create recovery action
        parameters = {
            "error_type": error_type.value,
            "error_severity": error_severity.value,
            "attempt_count": attempt_count,
            "original_error": str(error)
        }
        
        # Add strategy-specific parameters
        if strategy == RecoveryStrategy.RETRY_ADJUSTED:
            parameters["backoff_seconds"] = min(2 ** attempt_count, 60)
            parameters["adjusted_params"] = self._get_adjusted_parameters(error_type, context)
            
        return RecoveryAction(
            strategy=strategy,
            parameters=parameters,
            max_attempts=3
        )
        
    def _get_adjusted_parameters(
        self,
        error_type: ErrorType,
        context: ErrorContext
    ) -> Dict[str, Any]:
        """
        Get adjusted parameters for retry attempts.
        
        Args:
            error_type: Type of error
            context: Error context
            
        Returns:
            Dictionary of adjusted parameters
        """
        adjusted = {}
        
        if error_type == ErrorType.NETWORK_ERROR:
            adjusted["timeout"] = 60  # Increase timeout
            adjusted["retry_delay"] = 5  # Add delay between retries
            
        elif error_type == ErrorType.GENERATION_ERROR:
            adjusted["temperature"] = 0.7  # Reduce temperature for more deterministic output
            adjusted["max_tokens"] = 2000  # Reduce token limit
            
        return adjusted
        
    async def execute_recovery(
        self,
        action: RecoveryAction,
        context: ErrorContext
    ) -> RecoveryResult:
        """
        Execute recovery action.
        
        Args:
            action: Recovery action to execute
            context: Error context
            
        Returns:
            RecoveryResult with outcome
        """
        strategy = action.strategy
        
        if strategy == RecoveryStrategy.RETRY:
            return RecoveryResult(
                success=True,
                message="Retrying operation with same parameters",
                retry_recommended=True
            )
            
        elif strategy == RecoveryStrategy.RETRY_ADJUSTED:
            backoff = action.parameters.get("backoff_seconds", 1)
            return RecoveryResult(
                success=True,
                message=f"Retrying operation with adjusted parameters (backoff: {backoff}s)",
                retry_recommended=True
            )
            
        elif strategy == RecoveryStrategy.SKIP:
            return RecoveryResult(
                success=True,
                message="Skipping optional step and continuing workflow",
                retry_recommended=False
            )
            
        elif strategy == RecoveryStrategy.FALLBACK:
            return RecoveryResult(
                success=True,
                message="Using fallback implementation to continue workflow",
                retry_recommended=False
            )
            
        elif strategy == RecoveryStrategy.CHECKPOINT:
            # Save checkpoint
            if context.project_path:
                checkpoint_saved = self.save_checkpoint(
                    WorkflowState(
                        current_step=context.workflow_step,
                        completed_steps=[],
                        failed_steps=[(context.workflow_step, context.error_message)],
                        project_data={},
                        start_time=context.timestamp,
                        estimated_completion=None
                    ),
                    context.project_path
                )
                
                if checkpoint_saved:
                    return RecoveryResult(
                        success=True,
                        message="Checkpoint saved. Workflow paused for user intervention.",
                        retry_recommended=False
                    )
                    
            return RecoveryResult(
                success=False,
                message="Failed to save checkpoint",
                retry_recommended=False
            )
            
        elif strategy == RecoveryStrategy.ABORT:
            return RecoveryResult(
                success=False,
                message="Error cannot be recovered automatically. Workflow aborted.",
                retry_recommended=False
            )
            
        return RecoveryResult(
            success=False,
            message=f"Unknown recovery strategy: {strategy}",
            retry_recommended=False
        )
        
    def save_checkpoint(
        self,
        workflow_state: WorkflowState,
        project_path: Optional[Path] = None
    ) -> bool:
        """
        Save workflow checkpoint for resume.
        
        Args:
            workflow_state: Current workflow state
            project_path: Optional project path for project-specific checkpoint
            
        Returns:
            True if checkpoint saved successfully
        """
        try:
            # Determine checkpoint file path
            if project_path:
                checkpoint_file = project_path / ".checkpoint.json"
            else:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                checkpoint_file = self.checkpoint_dir / f"checkpoint_{timestamp}.json"
                
            # Prepare checkpoint data
            checkpoint_data = {
                "current_step": workflow_state.current_step.value,
                "completed_steps": [step.value for step in workflow_state.completed_steps],
                "failed_steps": [
                    {"step": step.value, "error": error}
                    for step, error in workflow_state.failed_steps
                ],
                "project_data": workflow_state.project_data,
                "start_time": workflow_state.start_time.isoformat(),
                "estimated_completion": (
                    workflow_state.estimated_completion.isoformat()
                    if workflow_state.estimated_completion
                    else None
                ),
                "checkpoint_time": datetime.now().isoformat(),
                "error_history": [
                    {
                        "error_type": ctx.error_type,
                        "error_message": ctx.error_message,
                        "workflow_step": ctx.workflow_step.value,
                        "timestamp": ctx.timestamp.isoformat()
                    }
                    for ctx in self.error_history[-10:]  # Last 10 errors
                ]
            }
            
            # Save checkpoint
            with open(checkpoint_file, 'w', encoding='utf-8') as f:
                json.dump(checkpoint_data, f, indent=2)
                
            logger.info(f"Checkpoint saved to {checkpoint_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save checkpoint: {e}")
            return False
            
    def load_checkpoint(
        self,
        project_path: Path
    ) -> Optional[WorkflowState]:
        """
        Load workflow checkpoint.
        
        Args:
            project_path: Project path containing checkpoint
            
        Returns:
            WorkflowState if checkpoint found, None otherwise
        """
        try:
            checkpoint_file = project_path / ".checkpoint.json"
            
            if not checkpoint_file.exists():
                logger.warning(f"No checkpoint found at {checkpoint_file}")
                return None
                
            # Load checkpoint data
            with open(checkpoint_file, 'r', encoding='utf-8') as f:
                checkpoint_data = json.load(f)
                
            # Reconstruct workflow state
            workflow_state = WorkflowState(
                current_step=WorkflowStep(checkpoint_data["current_step"]),
                completed_steps=[
                    WorkflowStep(step) for step in checkpoint_data["completed_steps"]
                ],
                failed_steps=[
                    (WorkflowStep(item["step"]), item["error"])
                    for item in checkpoint_data["failed_steps"]
                ],
                project_data=checkpoint_data["project_data"],
                start_time=datetime.fromisoformat(checkpoint_data["start_time"]),
                estimated_completion=(
                    datetime.fromisoformat(checkpoint_data["estimated_completion"])
                    if checkpoint_data["estimated_completion"]
                    else None
                )
            )
            
            logger.info(f"Checkpoint loaded from {checkpoint_file}")
            return workflow_state
            
        except Exception as e:
            logger.error(f"Failed to load checkpoint: {e}")
            return None
            
    def format_error_notification(
        self,
        error: Exception,
        context: ErrorContext,
        recovery_action: RecoveryAction
    ) -> str:
        """
        Format error notification for user.
        
        Args:
            error: The exception that occurred
            context: Error context
            recovery_action: Recovery action being taken
            
        Returns:
            Formatted error message
        """
        error_type, error_severity = self.classify_error(error, {})
        
        message_parts = [
            f"❌ Error in {context.workflow_step.value}:",
            f"   Type: {error_type.value}",
            f"   Severity: {error_severity.value}",
            f"   Message: {context.error_message}",
            "",
            f"🔧 Recovery Action: {recovery_action.strategy.value}",
        ]
        
        # Add strategy-specific details
        if recovery_action.strategy == RecoveryStrategy.RETRY:
            message_parts.append("   → Retrying operation...")
            
        elif recovery_action.strategy == RecoveryStrategy.RETRY_ADJUSTED:
            backoff = recovery_action.parameters.get("backoff_seconds", 1)
            message_parts.append(f"   → Retrying with adjusted parameters (waiting {backoff}s)...")
            
        elif recovery_action.strategy == RecoveryStrategy.SKIP:
            message_parts.append("   → Skipping this step and continuing...")
            
        elif recovery_action.strategy == RecoveryStrategy.FALLBACK:
            message_parts.append("   → Using fallback implementation...")
            
        elif recovery_action.strategy == RecoveryStrategy.CHECKPOINT:
            message_parts.append("   → Checkpoint saved. Please review and resume manually.")
            
        elif recovery_action.strategy == RecoveryStrategy.ABORT:
            message_parts.append("   → Workflow cannot continue automatically.")
            
        return "\n".join(message_parts)
        
    def get_corrective_actions(
        self,
        error: Exception,
        context: ErrorContext
    ) -> List[str]:
        """
        Get list of corrective actions user can take.
        
        Args:
            error: The exception that occurred
            context: Error context
            
        Returns:
            List of suggested corrective actions
        """
        error_type, _ = self.classify_error(error, {})
        
        actions = []
        
        if error_type == ErrorType.NETWORK_ERROR:
            actions.extend([
                "Check your internet connection",
                "Verify API endpoints are accessible",
                "Check firewall settings",
                "Try again in a few minutes"
            ])
            
        elif error_type == ErrorType.FILE_SYSTEM_ERROR:
            actions.extend([
                "Check file/directory permissions",
                "Ensure sufficient disk space",
                "Verify path exists and is writable",
                "Close any programs using the files"
            ])
            
        elif error_type == ErrorType.PARSING_ERROR:
            actions.extend([
                "Review prompt format",
                "Simplify prompt structure",
                "Remove special characters",
                "Try a different phrasing"
            ])
            
        elif error_type == ErrorType.GENERATION_ERROR:
            actions.extend([
                "Check API key is valid",
                "Verify API quota/limits",
                "Try with simpler parameters",
                "Wait and retry later"
            ])
            
        elif error_type == ErrorType.DEPENDENCY_ERROR:
            actions.extend([
                "Install missing dependencies",
                "Check Python version compatibility",
                "Verify virtual environment is activated",
                "Run: pip install -r requirements.txt"
            ])
            
        elif error_type == ErrorType.RESOURCE_ERROR:
            actions.extend([
                "Free up disk space",
                "Close other applications",
                "Reduce project complexity",
                "Use lower quality settings"
            ])
            
        elif error_type == ErrorType.PIPELINE_ERROR:
            actions.extend([
                "Check StoryCore CLI is installed",
                "Verify project structure is valid",
                "Review pipeline logs",
                "Try running pipeline steps manually"
            ])
            
        else:
            actions.extend([
                "Review error logs for details",
                "Check system requirements",
                "Try restarting the workflow",
                "Contact support if issue persists"
            ])
            
        return actions
        
    def clear_recovery_attempts(self):
        """Clear recovery attempt counters."""
        self.recovery_attempts.clear()
        
    def get_error_history(self, limit: int = 10) -> List[ErrorContext]:
        """
        Get recent error history.
        
        Args:
            limit: Maximum number of errors to return
            
        Returns:
            List of recent error contexts
        """
        return self.error_history[-limit:]
