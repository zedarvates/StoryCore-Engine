"""
Unit Tests for Error Recovery Manager

Tests error classification, recovery strategies, checkpoint save/load, and resume functionality.
"""

import pytest
import json
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch

from src.end_to_end.error_recovery_manager import (
    ErrorRecoveryManager,
    ErrorType,
    ErrorSeverity,
    RecoveryResult,
)
from src.end_to_end.data_models import (
    ErrorContext,
    RecoveryAction,
    RecoveryStrategy,
    WorkflowStep,
    WorkflowState,
)


class TestErrorClassification:
    """Test error classification logic"""
    
    def test_classify_network_error(self):
        """Test classification of network errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Connection timeout occurred")
        error_type, severity = manager.classify_error(error, {})
        
        assert error_type == ErrorType.NETWORK_ERROR
        assert severity == ErrorSeverity.MEDIUM
        
    def test_classify_file_system_error(self):
        """Test classification of file system errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Permission denied")
        error_type, severity = manager.classify_error(error, {})
        
        assert error_type == ErrorType.FILE_SYSTEM_ERROR
        assert severity == ErrorSeverity.HIGH
        
    def test_classify_parsing_error(self):
        """Test classification of parsing errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Invalid JSON format")
        error_type, severity = manager.classify_error(error, {})
        
        assert error_type == ErrorType.PARSING_ERROR
        assert severity == ErrorSeverity.MEDIUM
        
    def test_classify_generation_error(self):
        """Test classification of generation errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("LLM API request failed")
        error_type, severity = manager.classify_error(error, {})
        
        assert error_type == ErrorType.GENERATION_ERROR
        assert severity == ErrorSeverity.MEDIUM
        
    def test_classify_dependency_error(self):
        """Test classification of dependency errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Module not found: missing_module")
        error_type, severity = manager.classify_error(error, {})
        
        assert error_type == ErrorType.DEPENDENCY_ERROR
        assert severity == ErrorSeverity.HIGH
        
    def test_classify_resource_error(self):
        """Test classification of resource errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Out of memory")
        error_type, severity = manager.classify_error(error, {})
        
        assert error_type == ErrorType.RESOURCE_ERROR
        assert severity == ErrorSeverity.HIGH
        
    def test_classify_unknown_error(self):
        """Test classification of unknown errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Something went wrong")
        error_type, severity = manager.classify_error(error, {})
        
        assert error_type == ErrorType.UNKNOWN_ERROR
        assert severity == ErrorSeverity.MEDIUM


class TestRecoveryStrategyDetermination:
    """Test recovery strategy determination"""
    
    def test_critical_error_aborts(self):
        """Test that critical errors result in abort strategy"""
        manager = ErrorRecoveryManager()
        
        strategy = manager.determine_recovery_strategy(
            ErrorType.UNKNOWN_ERROR,
            ErrorSeverity.CRITICAL,
            WorkflowStep.PARSING,
            attempt_count=0
        )
        
        assert strategy == RecoveryStrategy.ABORT
        
    def test_high_severity_checkpoints(self):
        """Test that high severity errors result in checkpoint strategy"""
        manager = ErrorRecoveryManager()
        
        strategy = manager.determine_recovery_strategy(
            ErrorType.FILE_SYSTEM_ERROR,
            ErrorSeverity.HIGH,
            WorkflowStep.PROJECT_STRUCTURE,
            attempt_count=0
        )
        
        assert strategy == RecoveryStrategy.CHECKPOINT
        
    def test_network_error_retry_then_fallback(self):
        """Test network error recovery: retry then fallback"""
        manager = ErrorRecoveryManager()
        
        # First attempt - retry with adjustment
        strategy1 = manager.determine_recovery_strategy(
            ErrorType.NETWORK_ERROR,
            ErrorSeverity.MEDIUM,
            WorkflowStep.IMAGE_GENERATION,
            attempt_count=0
        )
        assert strategy1 == RecoveryStrategy.RETRY_ADJUSTED
        
        # After multiple attempts - fallback
        strategy2 = manager.determine_recovery_strategy(
            ErrorType.NETWORK_ERROR,
            ErrorSeverity.MEDIUM,
            WorkflowStep.IMAGE_GENERATION,
            attempt_count=3
        )
        assert strategy2 == RecoveryStrategy.FALLBACK
        
    def test_parsing_error_fallback(self):
        """Test parsing error uses fallback (defaults)"""
        manager = ErrorRecoveryManager()
        
        strategy = manager.determine_recovery_strategy(
            ErrorType.PARSING_ERROR,
            ErrorSeverity.MEDIUM,
            WorkflowStep.PARSING,
            attempt_count=0
        )
        
        assert strategy == RecoveryStrategy.FALLBACK
        
    def test_validation_error_skip(self):
        """Test validation error can be skipped"""
        manager = ErrorRecoveryManager()
        
        strategy = manager.determine_recovery_strategy(
            ErrorType.VALIDATION_ERROR,
            ErrorSeverity.LOW,
            WorkflowStep.QUALITY_VALIDATION,
            attempt_count=0
        )
        
        assert strategy == RecoveryStrategy.SKIP


class TestErrorHandling:
    """Test complete error handling flow"""
    
    def test_handle_error_creates_recovery_action(self):
        """Test that handling error creates appropriate recovery action"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Connection timeout")
        context = ErrorContext(
            error_type="network",
            error_message="Connection timeout",
            stack_trace="test trace",
            workflow_step=WorkflowStep.IMAGE_GENERATION,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        recovery_action = manager.handle_error(error, context)
        
        assert isinstance(recovery_action, RecoveryAction)
        assert isinstance(recovery_action.strategy, RecoveryStrategy)
        assert recovery_action.max_attempts > 0
        
    def test_handle_error_logs_to_history(self):
        """Test that errors are logged to history"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Test error")
        context = ErrorContext(
            error_type="test",
            error_message="Test error",
            stack_trace="test trace",
            workflow_step=WorkflowStep.PARSING,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        manager.handle_error(error, context)
        
        assert len(manager.error_history) == 1
        assert manager.error_history[0] == context
        
    def test_handle_error_tracks_attempts(self):
        """Test that recovery attempts are tracked"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Network error")
        context = ErrorContext(
            error_type="network",
            error_message="Network error",
            stack_trace="test trace",
            workflow_step=WorkflowStep.IMAGE_GENERATION,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        # Handle same error multiple times
        manager.handle_error(error, context)
        manager.handle_error(error, context)
        
        # Check attempts are tracked
        error_key = f"{WorkflowStep.IMAGE_GENERATION.value}:{ErrorType.NETWORK_ERROR.value}"
        assert error_key in manager.recovery_attempts
        assert manager.recovery_attempts[error_key] == 2


class TestCheckpointSystem:
    """Test checkpoint save and load functionality"""
    
    def test_save_checkpoint_creates_file(self):
        """Test that saving checkpoint creates file"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir) / "test_project"
            project_path.mkdir()
            
            manager = ErrorRecoveryManager()
            
            workflow_state = WorkflowState(
                current_step=WorkflowStep.PARSING,
                completed_steps=[],
                failed_steps=[],
                project_data={"test": "data"},
                start_time=datetime.now(),
                estimated_completion=None
            )
            
            result = manager.save_checkpoint(workflow_state, project_path)
            
            assert result is True
            assert (project_path / ".checkpoint.json").exists()
            
    def test_save_checkpoint_without_project_path(self):
        """Test saving checkpoint without project path"""
        with tempfile.TemporaryDirectory() as temp_dir:
            manager = ErrorRecoveryManager(checkpoint_dir=Path(temp_dir))
            
            workflow_state = WorkflowState(
                current_step=WorkflowStep.PARSING,
                completed_steps=[],
                failed_steps=[],
                project_data={},
                start_time=datetime.now(),
                estimated_completion=None
            )
            
            result = manager.save_checkpoint(workflow_state, project_path=None)
            
            assert result is True
            # Check that a checkpoint file was created
            checkpoint_files = list(Path(temp_dir).glob("checkpoint_*.json"))
            assert len(checkpoint_files) > 0
            
    def test_load_checkpoint_restores_state(self):
        """Test that loading checkpoint restores workflow state"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir) / "test_project"
            project_path.mkdir()
            
            manager = ErrorRecoveryManager()
            
            # Create and save state
            original_state = WorkflowState(
                current_step=WorkflowStep.COMPONENT_GENERATION,
                completed_steps=[WorkflowStep.PARSING, WorkflowStep.NAME_GENERATION],
                failed_steps=[],
                project_data={"key": "value"},
                start_time=datetime.now(),
                estimated_completion=None
            )
            
            manager.save_checkpoint(original_state, project_path)
            
            # Load state
            loaded_state = manager.load_checkpoint(project_path)
            
            assert loaded_state is not None
            assert loaded_state.current_step == original_state.current_step
            assert len(loaded_state.completed_steps) == len(original_state.completed_steps)
            assert loaded_state.project_data == original_state.project_data
            
    def test_load_checkpoint_returns_none_if_not_found(self):
        """Test that loading non-existent checkpoint returns None"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir) / "nonexistent"
            
            manager = ErrorRecoveryManager()
            loaded_state = manager.load_checkpoint(project_path)
            
            assert loaded_state is None
            
    def test_checkpoint_includes_error_history(self):
        """Test that checkpoint includes recent error history"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir) / "test_project"
            project_path.mkdir()
            
            manager = ErrorRecoveryManager()
            
            # Add some errors to history
            for i in range(3):
                context = ErrorContext(
                    error_type="test",
                    error_message=f"Error {i}",
                    stack_trace="trace",
                    workflow_step=WorkflowStep.PARSING,
                    project_path=None,
                    timestamp=datetime.now(),
                    system_state={}
                )
                manager.error_history.append(context)
                
            workflow_state = WorkflowState(
                current_step=WorkflowStep.PARSING,
                completed_steps=[],
                failed_steps=[],
                project_data={},
                start_time=datetime.now(),
                estimated_completion=None
            )
            
            manager.save_checkpoint(workflow_state, project_path)
            
            # Read checkpoint file and verify error history is included
            with open(project_path / ".checkpoint.json", 'r') as f:
                checkpoint_data = json.load(f)
                
            assert "error_history" in checkpoint_data
            assert len(checkpoint_data["error_history"]) == 3


class TestRecoveryExecution:
    """Test recovery action execution"""
    
    @pytest.mark.asyncio
    async def test_execute_retry_recovery(self):
        """Test executing retry recovery action"""
        manager = ErrorRecoveryManager()
        
        action = RecoveryAction(
            strategy=RecoveryStrategy.RETRY,
            parameters={},
            max_attempts=3
        )
        
        context = ErrorContext(
            error_type="test",
            error_message="test",
            stack_trace="trace",
            workflow_step=WorkflowStep.PARSING,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        result = await manager.execute_recovery(action, context)
        
        assert isinstance(result, RecoveryResult)
        assert result.success is True
        assert result.retry_recommended is True
        
    @pytest.mark.asyncio
    async def test_execute_skip_recovery(self):
        """Test executing skip recovery action"""
        manager = ErrorRecoveryManager()
        
        action = RecoveryAction(
            strategy=RecoveryStrategy.SKIP,
            parameters={},
            max_attempts=3
        )
        
        context = ErrorContext(
            error_type="test",
            error_message="test",
            stack_trace="trace",
            workflow_step=WorkflowStep.QUALITY_VALIDATION,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        result = await manager.execute_recovery(action, context)
        
        assert result.success is True
        assert result.retry_recommended is False
        
    @pytest.mark.asyncio
    async def test_execute_fallback_recovery(self):
        """Test executing fallback recovery action"""
        manager = ErrorRecoveryManager()
        
        action = RecoveryAction(
            strategy=RecoveryStrategy.FALLBACK,
            parameters={},
            max_attempts=3
        )
        
        context = ErrorContext(
            error_type="test",
            error_message="test",
            stack_trace="trace",
            workflow_step=WorkflowStep.PARSING,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        result = await manager.execute_recovery(action, context)
        
        assert result.success is True
        assert result.retry_recommended is False
        
    @pytest.mark.asyncio
    async def test_execute_abort_recovery(self):
        """Test executing abort recovery action"""
        manager = ErrorRecoveryManager()
        
        action = RecoveryAction(
            strategy=RecoveryStrategy.ABORT,
            parameters={},
            max_attempts=3
        )
        
        context = ErrorContext(
            error_type="test",
            error_message="test",
            stack_trace="trace",
            workflow_step=WorkflowStep.PARSING,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        result = await manager.execute_recovery(action, context)
        
        assert result.success is False
        assert result.retry_recommended is False


class TestUserNotification:
    """Test user notification formatting"""
    
    def test_format_error_notification(self):
        """Test error notification formatting"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Connection timeout")
        context = ErrorContext(
            error_type="network",
            error_message="Connection timeout",
            stack_trace="trace",
            workflow_step=WorkflowStep.IMAGE_GENERATION,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        action = RecoveryAction(
            strategy=RecoveryStrategy.RETRY_ADJUSTED,
            parameters={"backoff_seconds": 5},
            max_attempts=3
        )
        
        notification = manager.format_error_notification(error, context, action)
        
        assert notification is not None
        assert len(notification) > 0
        assert "image_generation" in notification
        assert "retry_adjusted" in notification
        
    def test_get_corrective_actions_network_error(self):
        """Test corrective actions for network errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Connection timeout")
        context = ErrorContext(
            error_type="network",
            error_message="Connection timeout",
            stack_trace="trace",
            workflow_step=WorkflowStep.IMAGE_GENERATION,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        actions = manager.get_corrective_actions(error, context)
        
        assert len(actions) > 0
        assert any("internet" in action.lower() for action in actions)
        
    def test_get_corrective_actions_file_system_error(self):
        """Test corrective actions for file system errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Permission denied")
        context = ErrorContext(
            error_type="file_system",
            error_message="Permission denied",
            stack_trace="trace",
            workflow_step=WorkflowStep.PROJECT_STRUCTURE,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        actions = manager.get_corrective_actions(error, context)
        
        assert len(actions) > 0
        assert any("permission" in action.lower() for action in actions)
        
    def test_get_corrective_actions_dependency_error(self):
        """Test corrective actions for dependency errors"""
        manager = ErrorRecoveryManager()
        
        error = Exception("Module not found")
        context = ErrorContext(
            error_type="dependency",
            error_message="Module not found",
            stack_trace="trace",
            workflow_step=WorkflowStep.PARSING,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        actions = manager.get_corrective_actions(error, context)
        
        assert len(actions) > 0
        assert any("install" in action.lower() or "dependencies" in action.lower() for action in actions)


class TestErrorRecoveryEdgeCases:
    """Test edge cases and error conditions"""
    
    def test_clear_recovery_attempts(self):
        """Test clearing recovery attempts"""
        manager = ErrorRecoveryManager()
        
        # Add some attempts
        manager.recovery_attempts["test_key"] = 5
        
        manager.clear_recovery_attempts()
        
        assert len(manager.recovery_attempts) == 0
        
    def test_get_error_history_with_limit(self):
        """Test getting error history with limit"""
        manager = ErrorRecoveryManager()
        
        # Add many errors
        for i in range(20):
            context = ErrorContext(
                error_type="test",
                error_message=f"Error {i}",
                stack_trace="trace",
                workflow_step=WorkflowStep.PARSING,
                project_path=None,
                timestamp=datetime.now(),
                system_state={}
            )
            manager.error_history.append(context)
            
        # Get limited history
        recent = manager.get_error_history(limit=5)
        
        assert len(recent) == 5
        assert recent[-1].error_message == "Error 19"
        
    def test_adjusted_parameters_for_network_error(self):
        """Test adjusted parameters for network errors"""
        manager = ErrorRecoveryManager()
        
        context = ErrorContext(
            error_type="network",
            error_message="timeout",
            stack_trace="trace",
            workflow_step=WorkflowStep.IMAGE_GENERATION,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        adjusted = manager._get_adjusted_parameters(ErrorType.NETWORK_ERROR, context)
        
        assert "timeout" in adjusted
        assert adjusted["timeout"] > 0
        
    def test_adjusted_parameters_for_generation_error(self):
        """Test adjusted parameters for generation errors"""
        manager = ErrorRecoveryManager()
        
        context = ErrorContext(
            error_type="generation",
            error_message="generation failed",
            stack_trace="trace",
            workflow_step=WorkflowStep.COMPONENT_GENERATION,
            project_path=None,
            timestamp=datetime.now(),
            system_state={}
        )
        
        adjusted = manager._get_adjusted_parameters(ErrorType.GENERATION_ERROR, context)
        
        assert "temperature" in adjusted or "max_tokens" in adjusted
