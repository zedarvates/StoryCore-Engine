# StoryCore LLM Memory System - API Reference

## Overview

This document provides a complete API reference for all public interfaces in the StoryCore LLM Memory System.

## Table of Contents

1. [MemorySystemCore](#memorysystemcore)
2. [DirectoryManager](#directorymanager)
3. [ConfigManager](#configmanager)
4. [DiscussionManager](#discussionmanager)
5. [MemoryManager](#memorymanager)
6. [AssetManager](#assetmanager)
7. [BuildLogger](#buildlogger)
8. [LogProcessor](#logprocessor)
9. [ErrorDetector](#errordetector)
10. [RecoveryEngine](#recoveryengine)
11. [SummarizationEngine](#summarizationengine)
12. [TimelineGenerator](#timelinegenerator)
13. [VariablesManager](#variablesmanager)
14. [AutoQASystem](#autoqasystem)
15. [Data Models](#data-models)

---

## MemorySystemCore

**Module**: `memory_system_core.py`

**Purpose**: Central orchestrator providing the complete public API

### Constructor

```python
def __init__(self, project_path: Path, config: Optional[ProjectConfig] = None)
```

Initialize memory system for a project.

**Parameters**:
- `project_path` (Path): Path to the project directory
- `config` (Optional[ProjectConfig]): Optional project configuration (loaded from file if not provided)

**Example**:
```python
from pathlib import Path
from memory_system import MemorySystemCore

memory_system = MemorySystemCore(Path("my_project"))
```


### Methods

#### initialize_project

```python
def initialize_project(
    project_name: str,
    project_type: str = "video",
    objectives: Optional[List[str]] = None,
    enable_memory_system: bool = True
) -> bool
```

Create complete directory structure and initialize files.

**Parameters**:
- `project_name` (str): Name of the project
- `project_type` (str): Type of project (video, script, creative, technical). Default: "video"
- `objectives` (Optional[List[str]]): List of project objectives. Default: None
- `enable_memory_system` (bool): Whether to enable memory system features. Default: True

**Returns**: `bool` - True if initialization succeeded, False otherwise

**Validates**: Requirement 1.1

**Example**:
```python
success = memory_system.initialize_project(
    project_name="My Video Project",
    project_type="video",
    objectives=["Create engaging content", "Maintain visual consistency"]
)
```

#### record_discussion

```python
def record_discussion(
    messages: List[Dict[str, Any]],
    session_id: Optional[str] = None
) -> bool
```

Record a conversation and trigger summarization if needed.

**Parameters**:
- `messages` (List[Dict[str, Any]]): List of message dictionaries with keys:
  - `role` (str): "user", "assistant", or "system"
  - `content` (str): Message content
  - `timestamp` (str or datetime): Message timestamp
- `session_id` (Optional[str]): Optional session identifier

**Returns**: `bool` - True if recording succeeded, False otherwise

**Validates**: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

**Example**:
```python
messages = [
    {"role": "user", "content": "Let's add a new character", "timestamp": "2025-01-26T14:30:00Z"},
    {"role": "assistant", "content": "I'll help you create a character", "timestamp": "2025-01-26T14:30:15Z"}
]
success = memory_system.record_discussion(messages)
```


#### add_asset

```python
def add_asset(
    asset_path: Path,
    asset_type: str,
    description: str = ""
) -> bool
```

Add an asset and update indices.

**Parameters**:
- `asset_path` (Path): Path to the asset file
- `asset_type` (str): Type of the asset ("image", "audio", "video", "document")
- `description` (str): Optional description. Default: ""

**Returns**: `bool` - True if asset was added successfully, False otherwise

**Validates**: Requirements 6.1, 6.2, 6.3

**Example**:
```python
from pathlib import Path

success = memory_system.add_asset(
    asset_path=Path("screenshots/dashboard.png"),
    asset_type="image",
    description="Dashboard interface mockup"
)
```

#### update_memory

```python
def update_memory(updates: Dict[str, Any]) -> bool
```

Update project memory with new information.

**Parameters**:
- `updates` (Dict[str, Any]): Dictionary of updates to apply

**Returns**: `bool` - True if update succeeded, False otherwise

**Validates**: Requirement 5.2

**Example**:
```python
updates = {
    "objectives": [{"description": "New objective", "status": "active"}],
    "current_state": {"phase": "development", "progress_percentage": 50}
}
success = memory_system.update_memory(updates)
```

#### add_memory_objective

```python
def add_memory_objective(description: str) -> bool
```

Add an objective to memory.

**Parameters**:
- `description` (str): Objective description

**Returns**: `bool` - True if successful, False otherwise

**Example**:
```python
success = memory_system.add_memory_objective("Complete video editing by end of month")
```


#### add_memory_entity

```python
def add_memory_entity(
    name: str,
    entity_type: str,
    description: str,
    attributes: Optional[Dict[str, Any]] = None
) -> bool
```

Add an entity to memory.

**Parameters**:
- `name` (str): Entity name
- `entity_type` (str): Type of entity (character, module, component, concept)
- `description` (str): Entity description
- `attributes` (Optional[Dict[str, Any]]): Additional attributes. Default: None

**Returns**: `bool` - True if successful, False otherwise

**Example**:
```python
success = memory_system.add_memory_entity(
    name="Alex",
    entity_type="character",
    description="Main protagonist",
    attributes={"age": 25, "role": "hero"}
)
```

#### add_memory_decision

```python
def add_memory_decision(
    description: str,
    rationale: str,
    alternatives: Optional[List[str]] = None
) -> bool
```

Add a decision to memory.

**Parameters**:
- `description` (str): Decision description
- `rationale` (str): Reasoning behind the decision
- `alternatives` (Optional[List[str]]): Alternatives considered. Default: None

**Returns**: `bool` - True if successful, False otherwise

**Example**:
```python
success = memory_system.add_memory_decision(
    description="Use React for UI framework",
    rationale="Better component reusability and ecosystem",
    alternatives=["Vue.js", "Angular"]
)
```

#### get_project_context

```python
def get_project_context() -> Optional[ProjectContext]
```

Retrieve complete project context for LLM.

**Returns**: `Optional[ProjectContext]` - Complete project context, or None if unavailable

**Validates**: Requirement 5.4

**Example**:
```python
context = memory_system.get_project_context()
if context:
    print(f"Project: {context.config.project_name}")
    print(f"Objectives: {len(context.memory.objectives)}")
    print(f"Recent discussions: {len(context.recent_discussions)}")
```


#### validate_project_state

```python
def validate_project_state() -> ValidationResult
```

Check project integrity and detect errors.

**Returns**: `ValidationResult` - Validation result with any detected errors

**Validates**: Requirements 10.1, 10.4, 10.5, 10.6

**Example**:
```python
validation = memory_system.validate_project_state()
if not validation.valid:
    print(f"Found {len(validation.errors)} errors:")
    for error in validation.errors:
        print(f"  - {error.severity}: {error.description}")
```

#### trigger_recovery

```python
def trigger_recovery(
    recovery_type: RecoveryType = RecoveryType.AUTOMATIC
) -> RecoveryReport
```

Initiate error recovery or desperate recovery mode.

**Parameters**:
- `recovery_type` (RecoveryType): Type of recovery (AUTOMATIC, GUIDED, DESPERATE). Default: AUTOMATIC

**Returns**: `RecoveryReport` - Recovery report with results

**Validates**: Requirements 11.1, 12.1

**Example**:
```python
from memory_system.data_models import RecoveryType

# Automatic recovery
report = memory_system.trigger_recovery(RecoveryType.AUTOMATIC)
print(f"Restored: {len(report.restored_files)} files")
print(f"Failed: {len(report.lost_files)} files")

# Desperate recovery (last resort)
report = memory_system.trigger_recovery(RecoveryType.DESPERATE)
if report.success:
    print("Project successfully reconstructed from logs")
```

#### run_quality_check

```python
def run_quality_check() -> Dict[str, Any]
```

Run quality assurance checks.

**Returns**: `Dict[str, Any]` - QA report dictionary with keys:
- `timestamp` (str): Report timestamp
- `overall_score` (float): Overall quality score (0-100)
- `checks_passed` (int): Number of checks passed
- `checks_failed` (int): Number of checks failed
- `issues` (List[Dict]): List of detected issues
- `recommendations` (List[str]): List of recommendations

**Example**:
```python
qa_report = memory_system.run_quality_check()
print(f"QA Score: {qa_report['overall_score']}/100")
print(f"Passed: {qa_report['checks_passed']}/{qa_report['checks_performed']}")
```


#### get_status

```python
def get_status() -> Dict[str, Any]
```

Get current system status.

**Returns**: `Dict[str, Any]` - Status dictionary with keys:
- `project_path` (str): Project path
- `config_loaded` (bool): Whether config is loaded
- `validation_valid` (bool): Whether validation passed
- `errors_count` (int): Number of errors detected
- `qa_score` (float): Latest QA score
- `last_activity` (str): Last activity timestamp

**Example**:
```python
status = memory_system.get_status()
print(f"Project: {status['project_path']}")
print(f"Valid: {status['validation_valid']}")
print(f"Errors: {status['errors_count']}")
```

#### get_variable

```python
def get_variable(name: str, default: Any = None) -> Any
```

Get a project variable.

**Parameters**:
- `name` (str): Variable name
- `default` (Any): Default value if variable not found. Default: None

**Returns**: `Any` - Variable value, or default if not found

**Example**:
```python
video_format = memory_system.get_variable("video_format", "mp4")
frame_rate = memory_system.get_variable("frame_rate", 30)
```

#### set_variable

```python
def set_variable(
    name: str,
    value: Any,
    description: str = ""
) -> bool
```

Set a project variable.

**Parameters**:
- `name` (str): Variable name
- `value` (Any): Variable value (string, number, boolean, array)
- `description` (str): Variable description. Default: ""

**Returns**: `bool` - True if successful, False otherwise

**Example**:
```python
success = memory_system.set_variable(
    name="video_format",
    value="mp4",
    description="Output video format"
)
```

#### get_timeline

```python
def get_timeline(limit: int = 50) -> List[Dict[str, Any]]
```

Get timeline events.

**Parameters**:
- `limit` (int): Maximum number of events to return. Default: 50

**Returns**: `List[Dict[str, Any]]` - List of timeline events

**Example**:
```python
timeline = memory_system.get_timeline(20)
for event in timeline:
    print(f"[{event['timestamp']}] {event['event_type']}: {event['description']}")
```

---

