# StoryCore Pipeline Integration Guide

## Overview

The Pipeline Integration module provides seamless integration between the fact-checking system and the StoryCore-Engine pipeline. It enables automatic content verification at key stages of the content generation workflow without disrupting the pipeline flow.

## Key Features

- **Three Integration Points**: `before_generate`, `after_generate`, and `on_publish` hooks
- **Asynchronous Execution**: Non-blocking hooks return within 100ms
- **Data Contract v1 Compliance**: Results stored in standardized format
- **Warning Events**: Automatic notification for high-risk content
- **Flexible Configuration**: Per-hook customization of behavior
- **Automatic vs Manual Modes**: Choose when verification runs

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              StoryCore Pipeline                          │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Script     │  │  Generation  │  │   Publish    │ │
│  │   Input      │  │   Process    │  │   Output     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │          │
│         ▼                 ▼                  ▼          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ before_      │  │ after_       │  │ on_publish   │ │
│  │ generate     │  │ generate     │  │ hook         │ │
│  │ hook         │  │ hook         │  │ (blocking)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│         Fact-Checking System (Async)                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Verification → Storage → Event Emission         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Basic Usage

```python
import asyncio
from pathlib import Path
from src.fact_checker.pipeline_integration import PipelineIntegration

async def main():
    # Create integration instance
    integration = PipelineIntegration(
        project_path=Path("./my_project")
    )
    
    # Execute a hook
    content = "Your content to verify..."
    result = await integration.execute_hook("before_generate", content)
    
    print(f"Status: {result.status}")
    print(f"Processing time: {result.processing_time_ms}ms")
    
    integration.shutdown()

asyncio.run(main())
```

### With Configuration

```python
from src.fact_checker.pipeline_integration import (
    PipelineIntegration,
    HookConfig
)

# Create integration
integration = PipelineIntegration()

# Configure hooks
integration.configure_hook(
    "before_generate",
    HookConfig(
        enabled=True,
        mode="auto",
        blocking=False,
        on_high_risk="warn"
    )
)

integration.configure_hook(
    "on_publish",
    HookConfig(
        enabled=True,
        mode="auto",
        blocking=True,
        on_high_risk="block"
    )
)
```

## Hook Stages

### 1. before_generate Hook

**Purpose**: Validate script/input content before generation begins

**Typical Configuration**:
- **Blocking**: False (non-blocking)
- **On High Risk**: "warn"
- **Store Results**: False (optional)

**Use Cases**:
- Early detection of problematic claims
- Script validation before expensive generation
- Quick sanity checks

**Example**:
```python
result = await integration.execute_hook(
    "before_generate",
    script_content
)
# Returns immediately, verification continues in background
```

### 2. after_generate Hook

**Purpose**: Verify generated content before final processing

**Typical Configuration**:
- **Blocking**: False (non-blocking)
- **On High Risk**: "warn"
- **Store Results**: True

**Use Cases**:
- Verify generated descriptions match facts
- Check for hallucinations in AI-generated content
- Quality assurance of output

**Example**:
```python
result = await integration.execute_hook(
    "after_generate",
    generated_content,
    metadata={"generation_id": "abc123"}
)
```

### 3. on_publish Hook

**Purpose**: Final validation before content publication

**Typical Configuration**:
- **Blocking**: True (blocking)
- **On High Risk**: "block"
- **Store Results**: True

**Use Cases**:
- Final quality gate before publication
- Prevent publication of high-risk content
- Compliance verification

**Example**:
```python
result = await integration.execute_hook(
    "on_publish",
    final_content
)

if result.should_block:
    print("Publication blocked due to high-risk content")
    # Handle blocking scenario
else:
    print("Content approved for publication")
    # Proceed with publication
```

## Configuration

### HookConfig Options

```python
@dataclass
class HookConfig:
    enabled: bool = True              # Enable/disable hook
    mode: str = "auto"                # "text", "video", or "auto"
    blocking: bool = False            # Wait for completion?
    on_high_risk: str = "warn"        # "warn", "block", or "ignore"
    confidence_threshold: float = None  # Override default threshold
    store_results: bool = True        # Store in Data Contract v1?
```

### Configuration File Format

Create a `pipeline_config.json` file:

```json
{
  "fact_checker": {
    "hooks": {
      "before_generate": {
        "enabled": true,
        "mode": "auto",
        "blocking": false,
        "on_high_risk": "warn",
        "confidence_threshold": 70.0,
        "store_results": false
      },
      "after_generate": {
        "enabled": true,
        "mode": "auto",
        "blocking": false,
        "on_high_risk": "warn",
        "store_results": true
      },
      "on_publish": {
        "enabled": true,
        "mode": "auto",
        "blocking": true,
        "on_high_risk": "block",
        "confidence_threshold": 80.0,
        "store_results": true
      }
    }
  }
}
```

Load configuration:

```python
integration.load_hook_configuration(Path("./pipeline_config.json"))
```

## Warning Events

### Registering Event Callbacks

```python
def handle_warning(event):
    print(f"⚠️  Warning: {event['summary']}")
    print(f"   Risk Level: {event['risk_level']}")
    print(f"   Hook Stage: {event['hook_stage']}")
    
    # Send notification, log to monitoring system, etc.
    send_alert(event)

integration.register_event_callback("warning", handle_warning)
```

### Event Structure

```python
{
    "type": "warning",
    "risk_level": "high" | "critical",
    "summary": "Detected 3 high-risk claim(s) in content",
    "timestamp": "2024-01-15T10:30:00Z",
    "hook_stage": "before_generate",
    "details": {
        "high_risk_count": 3,
        "average_confidence": 45.0,
        "total_claims": 5
    }
}
```

## Data Storage

### Data Contract v1 Format

Results are stored in `{project_path}/fact_checking/` directory:

```
project/
├── fact_checking/
│   ├── before_generate_20240115_103000.json
│   ├── after_generate_20240115_103100.json
│   └── on_publish_20240115_103200.json
└── project.json (updated with fact-checking status)
```

### Stored Data Structure

```json
{
  "schema_version": "1.0",
  "hook_stage": "after_generate",
  "timestamp": "2024-01-15T10:31:00Z",
  "metadata": {
    "generation_id": "abc123"
  },
  "verification_result": {
    "status": "success",
    "mode": "text",
    "agent": "scientific_audit",
    "report": { /* Full verification report */ },
    "summary": "Human-readable summary",
    "processing_time_ms": 1234
  }
}
```

### Project.json Updates

The `project.json` file is automatically updated:

```json
{
  "schema_version": "1.0",
  "project_name": "my_project",
  "fact_checking": {
    "enabled": true,
    "hooks": {
      "before_generate": {
        "last_run": "2024-01-15T10:30:00Z",
        "result_file": "fact_checking/before_generate_20240115_103000.json"
      },
      "after_generate": {
        "last_run": "2024-01-15T10:31:00Z",
        "result_file": "fact_checking/after_generate_20240115_103100.json"
      }
    }
  }
}
```

## Performance Characteristics

### Non-Blocking Hooks

- **Return Time**: < 100ms (typically 10-50ms)
- **Status**: "processing"
- **Behavior**: Verification continues in background
- **Use Case**: Early pipeline stages where blocking is undesirable

### Blocking Hooks

- **Return Time**: Full verification time (typically 1-5 seconds)
- **Status**: "completed" or "failed"
- **Behavior**: Waits for verification to complete
- **Use Case**: Critical decision points (e.g., publication)

### Resource Usage

- **Thread Pool**: 3 worker threads for async execution
- **Memory**: Minimal overhead, results streamed to disk
- **Concurrency**: Configurable via `max_concurrent_verifications`

## Error Handling

### Hook Execution Errors

```python
result = await integration.execute_hook("before_generate", content)

if result.status == "failed":
    print(f"Hook failed: {result.error}")
    # Handle error appropriately
    # Pipeline can continue or abort based on your logic
```

### Graceful Degradation

The system is designed to fail gracefully:

1. **Hook Disabled**: Returns "skipped" status immediately
2. **Verification Fails**: Returns "failed" status with error message
3. **Storage Fails**: Logs error but doesn't block pipeline
4. **Event Callback Fails**: Logs error but continues execution

## Best Practices

### 1. Hook Configuration Strategy

```python
# Development: Warn on everything, don't block
dev_config = HookConfig(
    enabled=True,
    blocking=False,
    on_high_risk="warn"
)

# Production: Block on high risk at publication
prod_config = HookConfig(
    enabled=True,
    blocking=True,
    on_high_risk="block"
)
```

### 2. Event Monitoring

```python
# Integrate with monitoring system
def handle_warning(event):
    # Log to monitoring
    logger.warning(f"High-risk content detected: {event['summary']}")
    
    # Send to metrics
    metrics.increment("fact_check.high_risk", tags={
        "hook_stage": event["hook_stage"],
        "risk_level": event["risk_level"]
    })
    
    # Alert team if critical
    if event["risk_level"] == "critical":
        send_alert_to_team(event)
```

### 3. Result Analysis

```python
# Periodically analyze stored results
fact_check_dir = project_path / "fact_checking"
results = []

for result_file in fact_check_dir.glob("*.json"):
    with open(result_file) as f:
        results.append(json.load(f))

# Analyze trends
high_risk_count = sum(
    1 for r in results 
    if r["verification_result"]["report"]["summary_statistics"]["high_risk_count"] > 0
)

print(f"High-risk content detected in {high_risk_count}/{len(results)} verifications")
```

### 4. Cleanup Old Results

```python
import time
from datetime import datetime, timedelta

def cleanup_old_results(project_path, days=30):
    """Remove verification results older than specified days."""
    fact_check_dir = project_path / "fact_checking"
    cutoff = datetime.now() - timedelta(days=days)
    
    for result_file in fact_check_dir.glob("*.json"):
        # Parse timestamp from filename
        # Remove if older than cutoff
        pass
```

## Troubleshooting

### Hook Not Executing

**Check**:
1. Is the hook enabled? `integration.get_hook_status()`
2. Is content empty or invalid?
3. Check logs for errors

### Results Not Stored

**Check**:
1. Is `store_results=True` in hook config?
2. Is `project_path` set correctly?
3. Does the process have write permissions?
4. Check disk space

### Events Not Received

**Check**:
1. Is callback registered? `integration.register_event_callback()`
2. Is content actually high-risk?
3. Is `on_high_risk` set to "ignore"?
4. Check callback for exceptions

### Performance Issues

**Check**:
1. Are too many hooks blocking?
2. Is cache enabled? `config.cache_enabled=True`
3. Is `max_concurrent_verifications` too low?
4. Check network latency if using external services

## API Reference

### PipelineIntegration Class

```python
class PipelineIntegration:
    def __init__(
        self,
        config: Optional[Configuration] = None,
        project_path: Optional[Path] = None
    )
    
    async def execute_hook(
        self,
        hook_stage: HookStage,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> HookResult
    
    def configure_hook(
        self,
        hook_stage: HookStage,
        config: HookConfig
    ) -> None
    
    def register_event_callback(
        self,
        event_type: str,
        callback: Callable[[Dict[str, Any]], None]
    ) -> None
    
    def load_hook_configuration(
        self,
        config_path: Path
    ) -> None
    
    def get_hook_status(self) -> Dict[str, Any]
    
    def shutdown(self) -> None
```

### Convenience Functions

```python
async def execute_before_generate_hook(
    content: str,
    project_path: Optional[Path] = None,
    config: Optional[Configuration] = None
) -> HookResult

async def execute_after_generate_hook(
    content: str,
    project_path: Optional[Path] = None,
    config: Optional[Configuration] = None
) -> HookResult

async def execute_on_publish_hook(
    content: str,
    project_path: Optional[Path] = None,
    config: Optional[Configuration] = None
) -> HookResult
```

## Examples

See `examples/pipeline_integration_example.py` for complete working examples including:

1. Basic hook execution
2. Project storage integration
3. Warning event handling
4. Blocking on high-risk content
5. Custom configuration
6. Loading configuration from file
7. Complete pipeline workflow

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 5.1**: ✅ Integration hooks for before_generate, after_generate, on_publish
- **Requirement 5.2**: ✅ All three hook stages implemented
- **Requirement 5.3**: ✅ All three hook stages implemented
- **Requirement 5.4**: ✅ Asynchronous non-blocking execution (< 100ms return)
- **Requirement 5.5**: ✅ Data Contract v1 compliant storage
- **Requirement 5.6**: ✅ Warning event emission for high-risk content
- **Requirement 5.7**: ✅ Automatic vs manual verification mode configuration

## Testing

Run the test suite:

```bash
pytest tests/test_pipeline_integration.py -v
```

All 16 tests should pass, covering:
- Non-blocking hook execution
- Blocking hook execution
- Warning event emission
- Data Contract storage
- Configuration management
- Error handling

---

For more information, see:
- [Fact-Checking System Design Document](../../.kiro/specs/fact-checking-system/design.md)
- [Requirements Document](../../.kiro/specs/fact-checking-system/requirements.md)
- [Implementation Examples](../../examples/pipeline_integration_example.py)
