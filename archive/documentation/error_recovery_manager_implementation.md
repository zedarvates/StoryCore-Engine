# Error Recovery Manager Implementation

## Overview

The Error Recovery Manager provides comprehensive error handling, recovery, and checkpoint functionality for the end-to-end project creation workflow. It ensures that errors are properly classified, appropriate recovery strategies are applied, and workflow state can be saved and resumed.

## Implementation Summary

### Core Components

#### 1. ErrorRecoveryManager Class
**Location:** `src/end_to_end/error_recovery_manager.py`

**Key Features:**
- Error classification by type and severity
- Recovery strategy determination based on error characteristics
- Recovery action execution
- Checkpoint save/load functionality
- User notification formatting
- Corrective action suggestions

**Error Types:**
- `NETWORK_ERROR`: Connection timeouts, HTTP errors
- `FILE_SYSTEM_ERROR`: Permission denied, file not found, disk space
- `PARSING_ERROR`: Invalid format, JSON/YAML errors
- `GENERATION_ERROR`: LLM API failures, model errors
- `VALIDATION_ERROR`: Invalid data, missing required fields
- `PIPELINE_ERROR`: Command execution failures
- `DEPENDENCY_ERROR`: Missing modules, import errors
- `RESOURCE_ERROR`: Out of memory, quota exceeded
- `UNKNOWN_ERROR`: Unclassified errors

**Error Severity Levels:**
- `LOW`: Can continue with degraded functionality
- `MEDIUM`: Requires recovery action
- `HIGH`: Requires user intervention
- `CRITICAL`: Cannot continue

**Recovery Strategies:**
- `RETRY`: Retry with same parameters
- `RETRY_ADJUSTED`: Retry with adjusted parameters (backoff, reduced complexity)
- `SKIP`: Skip optional step and continue
- `FALLBACK`: Use fallback implementation (defaults, placeholders)
- `CHECKPOINT`: Save state and pause for user intervention
- `ABORT`: Stop workflow (cannot recover)

#### 2. Error Classification Logic

The manager analyzes exceptions and context to determine:
1. **Error Type**: Based on error message keywords
2. **Error Severity**: Based on error type and impact
3. **Recovery Strategy**: Based on type, severity, workflow step, and attempt count

**Classification Examples:**
```python
# Network error with medium severity
Exception("Connection timeout") → NETWORK_ERROR, MEDIUM → RETRY_ADJUSTED

# Permission error with high severity
Exception("Permission denied") → FILE_SYSTEM_ERROR, HIGH → CHECKPOINT

# Parsing error with medium severity
Exception("Invalid JSON") → PARSING_ERROR, MEDIUM → FALLBACK

# Dependency error with high severity
Exception("Module not found") → DEPENDENCY_ERROR, HIGH → ABORT
```

#### 3. Checkpoint System

**Save Checkpoint:**
- Saves workflow state to `.checkpoint.json` in project directory
- Includes current step, completed steps, failed steps, project data
- Stores recent error history (last 10 errors)
- Supports both project-specific and global checkpoints

**Load Checkpoint:**
- Restores workflow state from checkpoint file
- Reconstructs WorkflowState with all metadata
- Enables resume from any saved point

**Checkpoint Data Structure:**
```json
{
  "current_step": "component_generation",
  "completed_steps": ["parsing", "name_generation"],
  "failed_steps": [],
  "project_data": {...},
  "start_time": "2024-01-27T10:30:00",
  "estimated_completion": null,
  "checkpoint_time": "2024-01-27T10:35:00",
  "error_history": [...]
}
```

#### 4. User Notification System

**Error Notification Format:**
```
❌ Error in image_generation:
   Type: network_error
   Severity: medium
   Message: Connection timeout

🔧 Recovery Action: retry_adjusted
   → Retrying with adjusted parameters (waiting 5s)...
```

**Corrective Actions:**
- Context-specific suggestions based on error type
- Actionable steps user can take
- Examples:
  - Network errors: "Check your internet connection"
  - File system errors: "Check file/directory permissions"
  - Dependency errors: "Run: pip install -r requirements.txt"

#### 5. Recovery Action Execution

The manager executes recovery actions asynchronously:

```python
async def execute_recovery(action, context) -> RecoveryResult:
    # Returns:
    # - success: bool
    # - message: str
    # - retry_recommended: bool
```

**Recovery Results:**
- `RETRY`: Returns success=True, retry_recommended=True
- `SKIP`: Returns success=True, retry_recommended=False
- `FALLBACK`: Returns success=True, retry_recommended=False
- `CHECKPOINT`: Saves checkpoint, returns success based on save result
- `ABORT`: Returns success=False, retry_recommended=False

## Testing

### Property-Based Tests
**Location:** `tests/property/test_error_recovery_properties.py`

**Property 7: Error Recovery and Checkpoint**
- Tests error logging and classification (Req 7.1-7.2)
- Tests recovery strategy determination (Req 7.3-7.4)
- Tests checkpoint save and load (Req 7.5-7.6)
- Tests user notification (Req 7.7-7.8)
- Tests multiple errors handling
- Tests checkpoint without project path
- Tests recovery action execution

**Test Results:** ✅ All 7 property tests passed (100 examples each)

### Unit Tests
**Location:** `tests/unit/test_error_recovery_manager.py`

**Test Coverage:**
1. **Error Classification** (7 tests)
   - Network, file system, parsing, generation errors
   - Dependency, resource, unknown errors

2. **Recovery Strategy Determination** (5 tests)
   - Critical errors abort
   - High severity checkpoints
   - Network error retry then fallback
   - Parsing error fallback
   - Validation error skip

3. **Error Handling** (3 tests)
   - Creates recovery action
   - Logs to history
   - Tracks attempts

4. **Checkpoint System** (5 tests)
   - Save creates file
   - Save without project path
   - Load restores state
   - Load returns None if not found
   - Checkpoint includes error history

5. **Recovery Execution** (4 tests)
   - Execute retry, skip, fallback, abort

6. **User Notification** (4 tests)
   - Format error notification
   - Corrective actions for network, file system, dependency errors

7. **Edge Cases** (4 tests)
   - Clear recovery attempts
   - Get error history with limit
   - Adjusted parameters for network and generation errors

**Test Results:** ✅ All 32 unit tests passed

## Usage Examples

### Basic Error Handling

```python
from src.end_to_end.error_recovery_manager import ErrorRecoveryManager
from src.end_to_end.data_models import ErrorContext, WorkflowStep

# Initialize manager
manager = ErrorRecoveryManager()

# Handle an error
try:
    # Some operation that might fail
    result = risky_operation()
except Exception as e:
    # Create error context
    context = ErrorContext(
        error_type="operation_error",
        error_message=str(e),
        stack_trace=traceback.format_exc(),
        workflow_step=WorkflowStep.IMAGE_GENERATION,
        project_path=Path("my_project"),
        timestamp=datetime.now(),
        system_state={}
    )
    
    # Handle error and get recovery action
    recovery_action = manager.handle_error(e, context)
    
    # Format notification for user
    notification = manager.format_error_notification(e, context, recovery_action)
    print(notification)
    
    # Get corrective actions
    actions = manager.get_corrective_actions(e, context)
    print("\nSuggested actions:")
    for action in actions:
        print(f"  - {action}")
    
    # Execute recovery
    result = await manager.execute_recovery(recovery_action, context)
    if result.retry_recommended:
        # Retry the operation
        pass
```

### Checkpoint Save and Resume

```python
# Save checkpoint during workflow
workflow_state = WorkflowState(
    current_step=WorkflowStep.COMPONENT_GENERATION,
    completed_steps=[WorkflowStep.PARSING, WorkflowStep.NAME_GENERATION],
    failed_steps=[],
    project_data={"project_name": "my_project"},
    start_time=datetime.now(),
    estimated_completion=None
)

saved = manager.save_checkpoint(workflow_state, project_path)
if saved:
    print("Checkpoint saved successfully")

# Later, resume from checkpoint
loaded_state = manager.load_checkpoint(project_path)
if loaded_state:
    print(f"Resuming from step: {loaded_state.current_step.value}")
    # Continue workflow from loaded state
```

### Multiple Error Handling

```python
# Handle multiple errors with attempt tracking
for attempt in range(3):
    try:
        result = operation_that_might_fail()
        break
    except Exception as e:
        context = ErrorContext(...)
        recovery_action = manager.handle_error(e, context)
        
        # Check if we should continue retrying
        result = await manager.execute_recovery(recovery_action, context)
        if not result.retry_recommended:
            break
```

## Integration with Workflow

The Error Recovery Manager integrates with the EndToEndOrchestrator:

1. **Error Detection**: Orchestrator catches exceptions during workflow execution
2. **Error Handling**: Passes exception to ErrorRecoveryManager
3. **Recovery Execution**: Executes recovery action based on strategy
4. **Checkpoint Management**: Saves checkpoints at key workflow stages
5. **User Notification**: Displays formatted error messages and suggestions
6. **Resume Support**: Loads checkpoints to resume interrupted workflows

## Requirements Validation

✅ **Requirement 7.1**: Log error with full context - Implemented via error_history
✅ **Requirement 7.2**: Analyze error cause - Implemented via classify_error
✅ **Requirement 7.3**: Determine if recoverable - Implemented via determine_recovery_strategy
✅ **Requirement 7.4**: Apply recovery strategy - Implemented via execute_recovery
✅ **Requirement 7.5**: Save workflow state - Implemented via save_checkpoint
✅ **Requirement 7.6**: Enable resume - Implemented via load_checkpoint
✅ **Requirement 7.7**: Notify user with clear message - Implemented via format_error_notification
✅ **Requirement 7.8**: Propose corrective actions - Implemented via get_corrective_actions

## Performance Characteristics

- **Error Classification**: O(1) - keyword-based matching
- **Checkpoint Save**: O(n) where n = size of workflow state
- **Checkpoint Load**: O(n) where n = size of checkpoint file
- **Error History**: Limited to last 10 errors to prevent memory growth
- **Recovery Execution**: Async, non-blocking

## Future Enhancements

1. **Machine Learning Classification**: Use ML to improve error classification accuracy
2. **Predictive Recovery**: Predict likely errors and preemptively apply mitigations
3. **Recovery Analytics**: Track recovery success rates and optimize strategies
4. **Distributed Checkpoints**: Support for distributed/cloud checkpoint storage
5. **Smart Retry**: Adaptive retry strategies based on historical success rates
6. **Error Correlation**: Detect patterns in related errors
7. **Auto-Recovery Learning**: Learn from successful recoveries to improve future handling

## Conclusion

The Error Recovery Manager provides robust error handling and recovery capabilities for the end-to-end project creation workflow. With comprehensive error classification, intelligent recovery strategies, checkpoint support, and clear user notifications, it ensures that workflows can recover gracefully from errors and resume from interruptions.

All requirements (7.1-7.8) have been implemented and validated through both property-based tests (100 examples each) and comprehensive unit tests (32 tests covering all functionality).
