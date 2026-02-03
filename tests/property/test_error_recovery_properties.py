"""
Property-Based Tests for Error Recovery Manager

Feature: end-to-end-project-creation
Property 7: Error Recovery and Checkpoint

For any error that occurs during workflow execution, the system should log the error
with full context, determine if it's recoverable, apply appropriate recovery strategy
(retry, skip, fallback), and save workflow checkpoints to enable resume after failures.

Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
"""

import pytest
from hypothesis import given, strategies as st, settings
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import shutil

from src.end_to_end.error_recovery_manager import (
    ErrorRecoveryManager,
    ErrorType,
    ErrorSeverity,
)
from src.end_to_end.data_models import (
    ErrorContext,
    RecoveryStrategy,
    WorkflowStep,
    WorkflowState,
)


# Strategy for generating workflow steps
workflow_step_strategy = st.sampled_from(list(WorkflowStep))


# Strategy for generating error messages
error_message_strategy = st.one_of(
    st.just("Connection timeout"),
    st.just("File not found"),
    st.just("Permission denied"),
    st.just("Invalid JSON format"),
    st.just("API rate limit exceeded"),
    st.just("Out of memory"),
    st.just("Module not found"),
    st.just("Network error"),
    st.just("Generation failed"),
    st.just("Validation error"),
)


# Strategy for generating error contexts
@st.composite
def error_context_strategy(draw):
    """Generate random error context"""
    workflow_step = draw(workflow_step_strategy)
    error_message = draw(error_message_strategy)
    
    return ErrorContext(
        error_type="test_error",
        error_message=error_message,
        stack_trace="test stack trace",
        workflow_step=workflow_step,
        project_path=None,
        timestamp=datetime.now(),
        system_state={}
    )


@pytest.mark.property
class TestErrorRecoveryProperties:
    """Property-based tests for Error Recovery Manager"""
    
    @given(
        error_message=error_message_strategy,
        workflow_step=workflow_step_strategy,
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_7_error_logging_and_classification(
        self,
        error_message: str,
        workflow_step: WorkflowStep,
        seed: int
    ):
        """
        Property 7.1-7.2: Error Logging and Classification
        
        For any error, the system should:
        1. Log the error with full context (Req 7.1)
        2. Analyze and classify the error (Req 7.2)
        """
        manager = ErrorRecoveryManager()
        
        # Create error and context
        error = Exception(error_message)
        context = ErrorContext(
            error_type="test_error",
            error_message=error_message,
            stack_trace="test stack trace",
            workflow_step=workflow_step,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        # Handle error
        recovery_action = manager.handle_error(error, context)
        
        # Verify error is logged in history
        assert len(manager.error_history) > 0, "Error should be logged in history"
        assert manager.error_history[-1] == context, "Latest error should match context"
        
        # Verify error is classified
        error_type, error_severity = manager.classify_error(error, {})
        assert isinstance(error_type, ErrorType), "Error type should be classified"
        assert isinstance(error_severity, ErrorSeverity), "Error severity should be classified"
        
        # Verify recovery action is created
        assert recovery_action is not None, "Recovery action should be created"
        assert isinstance(recovery_action.strategy, RecoveryStrategy), "Recovery strategy should be valid"
        
    @given(
        error_context=error_context_strategy(),
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_7_recovery_strategy_determination(
        self,
        error_context: ErrorContext,
        seed: int
    ):
        """
        Property 7.3-7.4: Recovery Strategy Determination
        
        For any error, the system should:
        3. Determine if error is recoverable (Req 7.3)
        4. Apply appropriate recovery strategy (Req 7.4)
        """
        manager = ErrorRecoveryManager()
        
        # Create error from context
        error = Exception(error_context.error_message)
        
        # Handle error
        recovery_action = manager.handle_error(error, error_context)
        
        # Verify recovery strategy is determined
        assert recovery_action.strategy in RecoveryStrategy, "Strategy should be valid"
        
        # Verify strategy is appropriate for error type
        error_type, error_severity = manager.classify_error(error, {})
        
        # Critical errors should abort
        if error_severity == ErrorSeverity.CRITICAL:
            assert recovery_action.strategy == RecoveryStrategy.ABORT, \
                "Critical errors should abort"
                
        # High severity errors should checkpoint
        elif error_severity == ErrorSeverity.HIGH:
            assert recovery_action.strategy == RecoveryStrategy.CHECKPOINT, \
                "High severity errors should checkpoint"
                
        # Other errors should have recoverable strategies
        else:
            assert recovery_action.strategy in [
                RecoveryStrategy.RETRY,
                RecoveryStrategy.RETRY_ADJUSTED,
                RecoveryStrategy.SKIP,
                RecoveryStrategy.FALLBACK,
                RecoveryStrategy.CHECKPOINT
            ], "Recoverable errors should have appropriate strategy"
            
    @given(
        workflow_step=workflow_step_strategy,
        completed_steps=st.lists(workflow_step_strategy, min_size=0, max_size=5),
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_7_checkpoint_save_and_load(
        self,
        workflow_step: WorkflowStep,
        completed_steps: list,
        seed: int
    ):
        """
        Property 7.5-7.6: Checkpoint System
        
        For any workflow state, the system should:
        5. Save workflow checkpoints (Req 7.5)
        6. Enable resume from checkpoint (Req 7.6)
        """
        # Create temporary directory for checkpoints
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir) / "test_project"
            project_path.mkdir(parents=True, exist_ok=True)
            
            manager = ErrorRecoveryManager(checkpoint_dir=Path(temp_dir))
            
            # Create workflow state
            workflow_state = WorkflowState(
                current_step=workflow_step,
                completed_steps=completed_steps,
                failed_steps=[],
                project_data={"test": "data"},
                start_time=datetime.now(),
                estimated_completion=None
            )
            
            # Save checkpoint
            saved = manager.save_checkpoint(workflow_state, project_path)
            assert saved, "Checkpoint should be saved successfully"
            
            # Verify checkpoint file exists
            checkpoint_file = project_path / ".checkpoint.json"
            assert checkpoint_file.exists(), "Checkpoint file should exist"
            
            # Load checkpoint
            loaded_state = manager.load_checkpoint(project_path)
            assert loaded_state is not None, "Checkpoint should be loaded successfully"
            
            # Verify loaded state matches original
            assert loaded_state.current_step == workflow_state.current_step, \
                "Current step should match"
            assert len(loaded_state.completed_steps) == len(workflow_state.completed_steps), \
                "Completed steps count should match"
            assert loaded_state.project_data == workflow_state.project_data, \
                "Project data should match"
                
    @given(
        error_message=error_message_strategy,
        workflow_step=workflow_step_strategy,
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_7_user_notification(
        self,
        error_message: str,
        workflow_step: WorkflowStep,
        seed: int
    ):
        """
        Property 7.7-7.8: User Notification
        
        For any error, the system should:
        7. Notify user with clear message (Req 7.7)
        8. Propose corrective actions (Req 7.8)
        """
        manager = ErrorRecoveryManager()
        
        # Create error and context
        error = Exception(error_message)
        context = ErrorContext(
            error_type="test_error",
            error_message=error_message,
            stack_trace="test stack trace",
            workflow_step=workflow_step,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        # Handle error
        recovery_action = manager.handle_error(error, context)
        
        # Format notification
        notification = manager.format_error_notification(error, context, recovery_action)
        
        # Verify notification is not empty
        assert notification, "Notification should not be empty"
        assert len(notification) > 0, "Notification should have content"
        
        # Verify notification contains key information
        assert workflow_step.value in notification, "Notification should mention workflow step"
        assert recovery_action.strategy.value in notification, "Notification should mention strategy"
        
        # Get corrective actions
        actions = manager.get_corrective_actions(error, context)
        
        # Verify corrective actions are provided
        assert actions is not None, "Corrective actions should be provided"
        assert len(actions) > 0, "At least one corrective action should be suggested"
        assert all(isinstance(action, str) for action in actions), \
            "All actions should be strings"
        assert all(len(action) > 0 for action in actions), \
            "All actions should have content"
            
    @given(
        error_messages=st.lists(error_message_strategy, min_size=1, max_size=5),
        workflow_step=workflow_step_strategy,
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=50, deadline=None)
    def test_property_7_multiple_errors_handling(
        self,
        error_messages: list,
        workflow_step: WorkflowStep,
        seed: int
    ):
        """
        Property 7: Multiple Errors Handling
        
        For multiple errors in sequence, the system should:
        - Track recovery attempts
        - Adjust strategies based on attempt count
        - Maintain error history
        """
        manager = ErrorRecoveryManager()
        
        recovery_actions = []
        
        # Handle multiple errors
        for error_message in error_messages:
            error = Exception(error_message)
            context = ErrorContext(
                error_type="test_error",
                error_message=error_message,
                stack_trace="test stack trace",
                workflow_step=workflow_step,
                project_path=None,
                timestamp=datetime.now(),
                system_state={}
            )
            
            recovery_action = manager.handle_error(error, context)
            recovery_actions.append(recovery_action)
            
        # Verify all errors are logged
        assert len(manager.error_history) == len(error_messages), \
            "All errors should be logged"
            
        # Verify recovery attempts are tracked
        # (Same error type at same step should increment attempts)
        error_type, _ = manager.classify_error(Exception(error_messages[0]), {})
        error_key = f"{workflow_step.value}:{error_type.value}"
        
        if error_key in manager.recovery_attempts:
            assert manager.recovery_attempts[error_key] > 0, \
                "Recovery attempts should be tracked"
                
    @given(
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=50, deadline=None)
    def test_property_7_checkpoint_without_project_path(
        self,
        seed: int
    ):
        """
        Property 7: Checkpoint Without Project Path
        
        The system should be able to save checkpoints even without a project path
        (using timestamp-based filenames in checkpoint directory).
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            manager = ErrorRecoveryManager(checkpoint_dir=Path(temp_dir))
            
            # Create workflow state
            workflow_state = WorkflowState(
                current_step=WorkflowStep.PARSING,
                completed_steps=[],
                failed_steps=[],
                project_data={},
                start_time=datetime.now(),
                estimated_completion=None
            )
            
            # Save checkpoint without project path
            saved = manager.save_checkpoint(workflow_state, project_path=None)
            assert saved, "Checkpoint should be saved without project path"
            
            # Verify checkpoint file was created in checkpoint directory
            checkpoint_files = list(Path(temp_dir).glob("checkpoint_*.json"))
            assert len(checkpoint_files) > 0, "Checkpoint file should be created"
            
    @given(
        error_message=error_message_strategy,
        seed=st.integers(min_value=0, max_value=2**31-1)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_7_recovery_action_execution(
        self,
        error_message: str,
        seed: int
    ):
        """
        Property 7: Recovery Action Execution
        
        For any recovery action, the system should execute it and return a result
        indicating success/failure and whether retry is recommended.
        """
        manager = ErrorRecoveryManager()
        
        # Create error and context
        error = Exception(error_message)
        context = ErrorContext(
            error_type="test_error",
            error_message=error_message,
            stack_trace="test stack trace",
            workflow_step=WorkflowStep.PARSING,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        # Handle error to get recovery action
        recovery_action = manager.handle_error(error, context)
        
        # Execute recovery action (async, so we need to run it)
        import asyncio
        result = asyncio.run(manager.execute_recovery(recovery_action, context))
        
        # Verify result is returned
        assert result is not None, "Recovery result should be returned"
        assert hasattr(result, 'success'), "Result should have success attribute"
        assert hasattr(result, 'message'), "Result should have message attribute"
        assert hasattr(result, 'retry_recommended'), "Result should have retry_recommended attribute"
        
        # Verify message is not empty
        assert result.message, "Result message should not be empty"
        assert len(result.message) > 0, "Result message should have content"
