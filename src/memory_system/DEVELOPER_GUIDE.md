# StoryCore LLM Memory System - Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Decisions](#design-decisions)
3. [Module API Reference](#module-api-reference)
4. [Testing Strategy](#testing-strategy)
5. [Extension Points](#extension-points)
6. [Development Workflow](#development-workflow)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Philosophy

The StoryCore LLM Memory System is built on three core principles:

1. **Structure as Intelligence**: A well-organized directory structure acts as an external memory system for LLMs
2. **Automatic Compression**: Raw data is continuously summarized and indexed for efficient LLM consumption
3. **Self-Healing**: Comprehensive logging and recovery mechanisms ensure project integrity

### Layered Architecture

The system is organized in three layers:

**Layer 1: Infrastructure** (Foundation)
- `DirectoryManager`: Creates and validates directory structure
- `ConfigManager`: Manages project configuration
- `BuildLogger`: Records all system actions
- `LogProcessor`: Cleans and translates logs

**Layer 2: Intelligence** (Core Features)
- `DiscussionManager`: Records and summarizes conversations
- `MemoryManager`: Maintains persistent project memory
- `AssetManager`: Organizes and indexes assets
- `SummarizationEngine`: Compresses content for LLM efficiency
- `TimelineGenerator`: Tracks project evolution
- `VariablesManager`: Manages project variables

**Layer 3: Resilience** (Quality & Recovery)
- `ErrorDetector`: Identifies inconsistencies and errors
- `RecoveryEngine`: Repairs errors and reconstructs projects
- `AutoQASystem`: Validates LLM outputs and project state

**Orchestration**
- `MemorySystemCore`: Central coordinator providing the public API


### Component Interaction Flow

```
User/LLM Assistant
        ↓
MemorySystemCore (Orchestrator)
        ↓
    ┌───┴───┬───────┬──────────┬────────────┐
    ↓       ↓       ↓          ↓            ↓
Directory Discussion Asset  Build      Error
Manager   Manager   Manager Logger    Detector
    ↓       ↓       ↓          ↓            ↓
    └───┬───┴───────┴──────────┴────────────┘
        ↓
Summarization ← Log Processor → Recovery
Engine                           Engine
        ↓                            ↓
Timeline Generator              Auto-QA System
```

### Data Flow

1. **Initialization**: `MemorySystemCore` → `DirectoryManager` → File System
2. **Discussion Recording**: User → `DiscussionManager` → `SummarizationEngine` → `MemoryManager`
3. **Asset Addition**: User → `AssetManager` → Index Files → `SummarizationEngine`
4. **Error Detection**: `ErrorDetector` → `BuildLogger` → `RecoveryEngine`
5. **Context Retrieval**: LLM → `MemorySystemCore` → All Managers → Aggregated Context

---

## Design Decisions

### 1. File-Based Storage vs Database

**Decision**: Use file-based storage (JSON + text files)

**Rationale**:
- **Simplicity**: No database dependencies, easier deployment
- **Transparency**: Human-readable files for debugging
- **Version Control**: Easy to track changes with Git
- **LLM-Friendly**: Text files are directly consumable by LLMs
- **Portability**: Projects are self-contained directories

**Trade-offs**:
- Slower for large-scale queries
- Manual concurrency management
- Limited transaction support

**Mitigation**:
- Atomic file operations for critical updates
- File locking for concurrent access
- Periodic validation to detect corruption


### 2. JSON Schema Validation

**Decision**: Validate all JSON operations against schemas

**Rationale**:
- **Data Integrity**: Prevents malformed data from entering the system
- **Early Error Detection**: Catches issues before they propagate
- **Documentation**: Schemas serve as API contracts
- **Versioning**: Schema versions enable migration strategies

**Implementation**:
- Schemas defined in `schemas.py`
- Validation before every write operation
- Graceful degradation on validation failures

### 3. Append-Only Logging

**Decision**: Build logs are append-only, never modified

**Rationale**:
- **Audit Trail**: Complete history of all actions
- **Recovery**: Logs enable project reconstruction
- **Debugging**: Full context for troubleshooting
- **Simplicity**: No complex log rotation logic

**Trade-offs**:
- Log files can grow large
- Redundant information

**Mitigation**:
- Separate cleaned/translated logs for LLM consumption
- Periodic archival of old logs
- Log compression for long-term storage

### 4. Timestamp-Based Conflict Resolution

**Decision**: Use timestamps to resolve conflicting information

**Rationale**:
- **Deterministic**: Clear resolution strategy
- **Simple**: Easy to implement and understand
- **Temporal Consistency**: Reflects project evolution

**Implementation**:
- All entries include ISO 8601 timestamps
- Most recent timestamp wins in conflicts
- Timezone-aware comparisons


### 5. Three-Tier Error Recovery

**Decision**: Implement automatic, guided, and desperate recovery modes

**Rationale**:
- **Automatic**: Handles common issues without user intervention
- **Guided**: Provides assistance for complex issues
- **Desperate**: Last-resort reconstruction from logs

**Recovery Hierarchy**:
1. Automatic repair (3 attempts max)
2. User notification with suggestions
3. Desperate recovery mode (full reconstruction)

### 6. Property-Based Testing

**Decision**: Use property-based testing alongside unit tests

**Rationale**:
- **Comprehensive Coverage**: Tests across all input spaces
- **Specification Validation**: Verifies universal properties
- **Edge Case Discovery**: Finds unexpected failure modes
- **Regression Prevention**: Ensures properties hold over time

**Implementation**:
- Hypothesis library for Python
- Minimum 100 iterations per property test
- Each property maps to design document requirements

---

## Module API Reference

### MemorySystemCore

**Purpose**: Central orchestrator providing the complete public API

**Key Methods**:

```python
def initialize_project(
    project_name: str,
    project_type: str = "video",
    objectives: Optional[List[str]] = None,
    enable_memory_system: bool = True
) -> bool:
    """
    Create complete directory structure and initialize files.
    
    Returns: True if successful, False otherwise
    Validates: Requirement 1.1
    """
```


```python
def record_discussion(
    messages: List[Dict[str, Any]],
    session_id: Optional[str] = None
) -> bool:
    """
    Record a conversation and trigger summarization if needed.
    
    Args:
        messages: List of message dicts with 'role', 'content', 'timestamp'
        session_id: Optional session identifier
    
    Returns: True if successful, False otherwise
    Validates: Requirements 3.1-3.5
    """

def add_asset(
    asset_path: Path,
    asset_type: str,
    description: str = ""
) -> bool:
    """
    Add an asset and update indices.
    
    Args:
        asset_path: Path to the asset file
        asset_type: Type (image, audio, video, document)
        description: Optional description
    
    Returns: True if successful, False otherwise
    Validates: Requirements 6.1-6.3
    """

def get_project_context() -> Optional[ProjectContext]:
    """
    Retrieve complete project context for LLM.
    
    Returns: ProjectContext with config, memory, discussions, assets
    Validates: Requirement 5.4
    """

def validate_project_state() -> ValidationResult:
    """
    Check project integrity and detect errors.
    
    Returns: ValidationResult with errors and warnings
    Validates: Requirements 10.1, 10.4-10.6
    """

def trigger_recovery(
    recovery_type: RecoveryType = RecoveryType.AUTOMATIC
) -> RecoveryReport:
    """
    Initiate error recovery or desperate recovery mode.
    
    Args:
        recovery_type: AUTOMATIC, GUIDED, or DESPERATE
    
    Returns: RecoveryReport with results
    Validates: Requirements 11.1, 12.1
    """
```


### DirectoryManager

**Purpose**: Creates and validates directory structure

**Key Methods**:

```python
def create_structure(project_path: Path) -> bool:
    """
    Create complete directory hierarchy.
    
    Creates all required directories in a single atomic operation.
    
    Returns: True if successful, False otherwise
    Validates: Requirements 1.1-1.3
    """

def initialize_files(project_path: Path, config: ProjectConfig) -> bool:
    """
    Create initial JSON and text files with valid schemas.
    
    Initializes all required files with proper structure.
    
    Returns: True if successful, False otherwise
    Validates: Requirements 1.4-1.5
    """

def validate_structure(project_path: Path) -> List[str]:
    """
    Check for missing directories or files.
    
    Returns: List of missing items (empty if complete)
    Validates: Requirement 10.4
    """

def get_directory_tree(project_path: Path) -> Dict[str, Any]:
    """
    Return directory structure as nested dictionary.
    
    Returns: Nested dict representing directory tree
    """
```

**Directory Structure**:
```
/PROJECT_NAME/
├── /assistant/
│   ├── /discussions_raw/
│   ├── /discussions_summary/
│   ├── memory.json
│   └── variables.json
├── /build_logs/
│   ├── build_steps_raw.log
│   ├── build_steps_clean.txt
│   ├── build_steps_translated.txt
│   ├── errors_detected.json
│   └── recovery_attempts.log
├── /assets/
│   ├── /images/
│   ├── /audio/
│   ├── /video/
│   ├── /documents/
│   └── attachments_index.txt
├── /summaries/
│   ├── assets_summary.txt
│   ├── project_overview.txt
│   └── timeline.txt
├── /qa_reports/
└── project_config.json
```


### DiscussionManager

**Purpose**: Records conversations and creates summaries

**Key Methods**:

```python
def record_conversation(
    conversation: Conversation,
    session_id: Optional[str] = None
) -> Path:
    """
    Append conversation to timestamped file in discussions_raw/.
    
    Returns: Path to discussion file
    Validates: Requirements 3.1-3.5
    """

def should_summarize(
    discussion_file: Path,
    threshold_kb: int = 50
) -> bool:
    """
    Check if discussion file exceeds size threshold.
    
    Returns: True if summarization needed
    Validates: Requirement 4.1
    """

def create_summary(discussion_file: Path) -> Optional[Path]:
    """
    Generate compressed summary and save to discussions_summary/.
    
    Returns: Path to summary file, or None if failed
    Validates: Requirements 4.2-4.4
    """

def extract_key_information(discussion_text: str) -> Dict[str, List[str]]:
    """
    Extract decisions, action items, entities, constraints.
    
    Returns: Dict with keys: decisions, action_items, entities, constraints
    Validates: Requirement 4.4
    """
```

**Discussion File Format**:
```
discussion_20250126_143022.txt

[2025-01-26T14:30:22Z] USER:
Let's add a new character to the story.

[2025-01-26T14:30:45Z] ASSISTANT:
I'll help you create a new character. What's their name?

[2025-01-26T14:31:10Z] USER:
Let's call them Alex.
```


### MemoryManager

**Purpose**: Manages memory.json operations

**Key Methods**:

```python
def load_memory() -> Optional[ProjectMemory]:
    """
    Load and parse memory.json.
    
    Returns: ProjectMemory object, or None if failed
    Validates: Requirement 5.4
    """

def update_memory(updates: Dict[str, Any]) -> bool:
    """
    Apply updates to memory.json with validation.
    
    Returns: True if successful, False otherwise
    Validates: Requirements 5.2-5.3
    """

def add_objective(description: str) -> bool:
    """Add new objective to memory."""

def add_entity(
    name: str,
    entity_type: str,
    description: str,
    attributes: Optional[Dict[str, Any]] = None
) -> bool:
    """Register new entity/module."""

def add_decision(
    description: str,
    rationale: str,
    alternatives: Optional[List[str]] = None
) -> bool:
    """Record important decision."""

def add_constraint(description: str, constraint_type: str = "technical") -> bool:
    """Add project constraint."""
```

**Memory Schema**:
```json
{
  "schema_version": "1.0",
  "last_updated": "ISO8601",
  "objectives": [{"id": "...", "description": "...", "status": "active", "added": "..."}],
  "entities": [{"id": "...", "name": "...", "type": "...", "description": "...", "attributes": {}, "added": "..."}],
  "constraints": [{"id": "...", "description": "...", "type": "...", "added": "..."}],
  "decisions": [{"id": "...", "description": "...", "rationale": "...", "alternatives_considered": [], "timestamp": "..."}],
  "style_rules": [{"category": "...", "rule": "...", "added": "..."}],
  "task_backlog": [{"id": "...", "description": "...", "priority": "...", "status": "...", "added": "..."}],
  "current_state": {"phase": "...", "progress_percentage": 0, "active_tasks": [], "blockers": [], "last_activity": "..."}
}
```


### AssetManager

**Purpose**: Organizes assets and maintains indices

**Key Methods**:

```python
def store_asset(
    asset_path: Path,
    asset_type: AssetType,
    description: str = ""
) -> Optional[AssetInfo]:
    """
    Copy asset to appropriate subdirectory.
    
    Returns: AssetInfo object, or None if failed
    Validates: Requirement 6.1
    """

def update_index(asset_info: AssetInfo) -> bool:
    """
    Add entry to attachments_index.txt.
    
    Returns: True if successful, False otherwise
    Validates: Requirement 6.2
    """

def generate_asset_metadata(asset_path: Path) -> AssetMetadata:
    """
    Extract metadata (size, dimensions, format, etc.).
    
    Returns: AssetMetadata object
    Validates: Requirement 6.3
    """

def summarize_assets() -> bool:
    """
    Generate assets_summary.txt from all assets.
    
    Returns: True if successful, False otherwise
    Validates: Requirements 7.1-7.5
    """
```

**Asset Index Format**:
```
=== IMAGE: screenshot_001.png ===
Path: assets/images/screenshot_001.png
Type: PNG
Size: 245 KB
Dimensions: 1920x1080
Added: 2025-01-26T14:30:00Z
Description: Dashboard interface mockup

=== DOCUMENT: requirements.pdf ===
Path: assets/documents/requirements.pdf
Type: PDF
Size: 1.2 MB
Pages: 15
Added: 2025-01-26T09:15:00Z
Description: Project requirements specification
```


### ErrorDetector

**Purpose**: Identifies inconsistencies and errors

**Key Methods**:

```python
def detect_errors() -> List[Error]:
    """
    Scan project for errors and inconsistencies.
    
    Returns: List of detected errors
    Validates: Requirements 10.1-10.6
    """

def check_missing_files() -> List[str]:
    """Identify missing required files."""

def validate_json_files() -> List[Error]:
    """Check JSON files for schema compliance."""

def check_state_consistency() -> List[Error]:
    """Verify memory.json matches actual project state."""

def classify_error(error: Error) -> Error:
    """Categorize error by type and severity."""
```

**Error Types**:
- `MISSING_FILE`: Required file not found
- `INVALID_JSON`: JSON syntax or schema violation
- `INCONSISTENT_STATE`: Memory-reality mismatch
- `CORRUPTED_DATA`: Data corruption detected
- `PERMISSION_ERROR`: File access denied

**Error Severities**:
- `LOW`: Non-critical, can continue
- `MEDIUM`: Should fix soon
- `HIGH`: Affects functionality
- `CRITICAL`: Project unusable

### RecoveryEngine

**Purpose**: Repairs errors and reconstructs projects

**Key Methods**:

```python
def attempt_repair(error: Error) -> RepairResult:
    """
    Try to automatically fix the error.
    
    Returns: RepairResult with success status
    Validates: Requirement 11.1
    """

def desperate_recovery() -> RecoveryReport:
    """
    Reconstruct project from logs (last resort).
    
    Returns: RecoveryReport with detailed results
    Validates: Requirements 12.1-12.6
    """
```


### AutoQASystem

**Purpose**: Validates LLM outputs and project state

**Key Methods**:

```python
def generate_qa_report() -> QAReport:
    """
    Generate comprehensive quality assurance report.
    
    Returns: QAReport with scores and issues
    Validates: Requirement 17.5
    """

def check_summary_quality(original: str, summary: str) -> Dict[str, Any]:
    """
    Verify summary preserves key information.
    
    Returns: Quality metrics dict
    Validates: Requirement 17.1
    """

def check_memory_consistency() -> List[Dict[str, Any]]:
    """
    Verify memory.json internal consistency.
    
    Returns: List of consistency issues
    Validates: Requirement 17.2
    """

def check_index_accuracy() -> List[Dict[str, Any]]:
    """
    Verify asset indices match actual files.
    
    Returns: List of index issues
    Validates: Requirement 17.3
    """

def auto_fix_issues(issues: List[QAIssue]) -> Dict[str, Any]:
    """
    Automatically fix detected QA issues.
    
    Returns: Fix report dict
    Validates: Requirement 17.6
    """
```

**QA Checks**:
1. Summary quality (compression ratio, information preservation)
2. Memory consistency (no duplicates, valid references)
3. Index accuracy (all files indexed, metadata matches)
4. Log completeness (all operations logged, sequential timestamps)
5. Output validation (valid JSON, proper formatting)

---

## Testing Strategy

### Dual Testing Approach

The system uses both unit testing and property-based testing for comprehensive coverage.


### Unit Tests

**Purpose**: Test specific examples, edge cases, and error conditions

**Location**: `tests/unit/`

**Coverage**:
- Specific file format examples
- Known error scenarios
- Integration points between components
- Edge cases (empty files, large files, special characters)

**Example**:
```python
def test_discussion_file_timestamp_format():
    """Discussion files should use ISO 8601 timestamps in filenames."""
    discussion_manager = DiscussionManager(test_project_path)
    conversation = create_test_conversation()
    
    file_path = discussion_manager.record_conversation(conversation)
    
    filename = file_path.name
    timestamp_str = extract_timestamp_from_filename(filename)
    assert is_valid_iso8601(timestamp_str)
```

### Property-Based Tests

**Purpose**: Verify universal properties across all inputs

**Location**: `tests/property/`

**Framework**: Hypothesis for Python

**Configuration**:
- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: `# Feature: storycore-llm-memory-system, Property {number}: {property_text}`

**Example**:
```python
from hypothesis import given, strategies as st

# Feature: storycore-llm-memory-system, Property 1: Complete Directory Structure Creation
@given(project_name=st.text(min_size=1, max_size=50))
def test_complete_directory_creation(project_name):
    """For any valid project name, all required directories and files shall be created."""
    memory_system = MemorySystemCore(test_path, default_config)
    
    result = memory_system.initialize_project(project_name, "video", ["test objective"])
    
    assert result == True
    assert all_required_directories_exist(test_path / project_name)
    assert all_required_files_exist(test_path / project_name)
    assert all_json_files_valid(test_path / project_name)
```


### Integration Tests

**Purpose**: Test component interactions and end-to-end workflows

**Location**: `tests/integration/`

**Coverage**:
- Complete initialization workflow
- Discussion recording with automatic summarization
- Asset addition with indexing
- Error detection and recovery workflows
- StoryCore pipeline integration

**Example**:
```python
def test_end_to_end_project_initialization():
    """Test complete project initialization workflow."""
    # Initialize
    memory_system = MemorySystemCore(test_path)
    result = memory_system.initialize_project("test_project", "video", ["objective1"])
    assert result == True
    
    # Verify structure
    assert (test_path / "assistant").exists()
    assert (test_path / "build_logs").exists()
    assert (test_path / "assets").exists()
    
    # Verify files
    assert (test_path / "project_config.json").exists()
    assert (test_path / "assistant/memory.json").exists()
    
    # Verify content
    config = memory_system.config_manager.load_config()
    assert config.project_name == "test_project"
    assert "objective1" in config.objectives
```

### Test Coverage Requirements

**Minimum Coverage**: 85% code coverage
- 100% coverage for critical paths (initialization, error detection, recovery)
- 80% coverage for utility functions
- 70% coverage for UI/formatting functions

**Property Test Coverage**: Each correctness property must have at least one property-based test

**Edge Case Coverage**: Explicit tests for:
- Empty inputs
- Maximum size inputs
- Special characters
- Concurrent operations
- Disk full scenarios
- Permission errors


### Running Tests

```bash
# Run all tests
pytest tests/

# Run unit tests only
pytest tests/unit/

# Run property tests only
pytest tests/property/

# Run integration tests only
pytest tests/integration/

# Run with coverage
pytest --cov=src/memory_system --cov-report=html tests/

# Run specific test file
pytest tests/unit/test_directory_manager.py

# Run with verbose output
pytest -v tests/

# Run property tests with more iterations
pytest tests/property/ --hypothesis-iterations=1000
```

---

## Extension Points

The system is designed with several extension points for future enhancements.

### 1. Custom Summarization Strategies

**Extension Point**: `SummarizationEngine`

**How to Extend**:
```python
class CustomSummarizationEngine(SummarizationEngine):
    def summarize_discussion(self, discussion_text: str) -> str:
        """Override with custom summarization logic."""
        # Use LLM API for summarization
        # Or implement custom algorithm
        return custom_summary
```

**Use Cases**:
- LLM-based summarization (GPT, Claude, etc.)
- Domain-specific summarization
- Multi-language summarization
- Hierarchical summarization


### 2. Custom Asset Processors

**Extension Point**: `AssetManager`

**How to Extend**:
```python
class CustomAssetManager(AssetManager):
    def generate_asset_metadata(self, asset_path: Path) -> AssetMetadata:
        """Override to add custom metadata extraction."""
        metadata = super().generate_asset_metadata(asset_path)
        
        # Add custom processing
        if asset_path.suffix == '.mp4':
            metadata.custom_field = extract_video_features(asset_path)
        
        return metadata
```

**Use Cases**:
- Video analysis (scene detection, object recognition)
- Audio transcription
- Document OCR
- Image classification
- 3D model analysis

### 3. Custom Error Handlers

**Extension Point**: `RecoveryEngine`

**How to Extend**:
```python
class CustomRecoveryEngine(RecoveryEngine):
    def attempt_repair(self, error: Error) -> RepairResult:
        """Override to add custom repair strategies."""
        # Try custom repair first
        if error.type == ErrorType.CUSTOM_ERROR:
            return self.custom_repair(error)
        
        # Fall back to default
        return super().attempt_repair(error)
    
    def custom_repair(self, error: Error) -> RepairResult:
        """Implement custom repair logic."""
        # Custom repair implementation
        return RepairResult(success=True, reason="Custom repair applied")
```

**Use Cases**:
- Cloud backup restoration
- Database recovery
- External service integration
- Custom validation rules


### 4. Custom QA Checks

**Extension Point**: `AutoQASystem`

**How to Extend**:
```python
class CustomAutoQASystem(AutoQASystem):
    def generate_qa_report(self) -> QAReport:
        """Override to add custom QA checks."""
        report = super().generate_qa_report()
        
        # Add custom checks
        custom_issues = self.run_custom_checks()
        report.issues.extend(custom_issues)
        
        return report
    
    def run_custom_checks(self) -> List[QAIssue]:
        """Implement custom QA checks."""
        issues = []
        
        # Example: Check for profanity in discussions
        if self.contains_profanity():
            issues.append(QAIssue(
                type="content_policy",
                severity="high",
                description="Profanity detected in discussions",
                affected_component="discussions",
                auto_fixable=False
            ))
        
        return issues
```

**Use Cases**:
- Content policy enforcement
- Brand guideline compliance
- Security scanning
- Performance monitoring
- Custom business rules

### 5. Storage Backend Plugins

**Extension Point**: File operations in all managers

**How to Extend**:
```python
class CloudStorageBackend:
    """Plugin for cloud storage (S3, Azure Blob, etc.)."""
    
    def read_file(self, path: Path) -> str:
        """Read file from cloud storage."""
        return cloud_client.download(path)
    
    def write_file(self, path: Path, content: str) -> bool:
        """Write file to cloud storage."""
        return cloud_client.upload(path, content)
```

**Use Cases**:
- Cloud storage (S3, Azure, GCS)
- Database storage
- Distributed file systems
- Version control integration


### 6. Event Hooks

**Extension Point**: Add event system to `MemorySystemCore`

**How to Extend**:
```python
class EventHook:
    """Base class for event hooks."""
    
    def on_project_initialized(self, project_path: Path) -> None:
        """Called after project initialization."""
        pass
    
    def on_discussion_recorded(self, discussion_file: Path) -> None:
        """Called after discussion recording."""
        pass
    
    def on_asset_added(self, asset_info: AssetInfo) -> None:
        """Called after asset addition."""
        pass
    
    def on_error_detected(self, error: Error) -> None:
        """Called when error is detected."""
        pass

# Usage
class NotificationHook(EventHook):
    def on_error_detected(self, error: Error) -> None:
        """Send notification when critical error detected."""
        if error.severity == ErrorSeverity.CRITICAL:
            send_email_notification(error)

memory_system.register_hook(NotificationHook())
```

**Use Cases**:
- Notifications (email, Slack, etc.)
- Analytics tracking
- Audit logging
- External system integration
- Workflow automation

---

## Development Workflow

### Setting Up Development Environment

```bash
# Clone repository
git clone <repository-url>
cd storycore-engine

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest hypothesis pytest-cov black flake8 mypy

# Run tests to verify setup
pytest tests/
```


### Code Style and Linting

```bash
# Format code with Black
black src/memory_system/

# Check code style with flake8
flake8 src/memory_system/

# Type checking with mypy
mypy src/memory_system/

# Run all checks
black src/memory_system/ && flake8 src/memory_system/ && mypy src/memory_system/
```

**Style Guidelines**:
- Follow PEP 8
- Use type hints for all function signatures
- Document all public methods with docstrings
- Keep functions focused and small (<50 lines)
- Use descriptive variable names

### Adding a New Feature

1. **Design**: Update design document with new component/interface
2. **Requirements**: Add acceptance criteria to requirements document
3. **Properties**: Define correctness properties in design document
4. **Implementation**: Write code following existing patterns
5. **Unit Tests**: Add specific test cases
6. **Property Tests**: Add property-based tests
7. **Integration Tests**: Add end-to-end tests
8. **Documentation**: Update API reference and examples
9. **Review**: Code review and testing
10. **Merge**: Merge to main branch

### Debugging Tips

**Enable Verbose Logging**:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Inspect Project State**:
```python
memory_system = MemorySystemCore(project_path)
status = memory_system.get_status()
print(json.dumps(status, indent=2))
```

**Validate Structure**:
```python
missing = memory_system.directory_manager.validate_structure(project_path)
if missing:
    print(f"Missing items: {missing}")
```

**Check Logs**:
```python
# View raw logs
with open(project_path / "build_logs/build_steps_raw.log") as f:
    print(f.read())

# View errors
with open(project_path / "build_logs/errors_detected.json") as f:
    errors = json.load(f)
    print(json.dumps(errors, indent=2))
```


---

## Performance Considerations

### File I/O Optimization

**Batch Operations**: Group multiple file operations together
```python
# Bad: Multiple separate writes
for item in items:
    write_to_file(item)

# Good: Batch write
write_all_to_file(items)
```

**Caching**: Cache frequently accessed data
```python
class CachedMemoryManager(MemoryManager):
    def __init__(self, project_path: Path):
        super().__init__(project_path)
        self._memory_cache = None
        self._cache_timestamp = None
    
    def load_memory(self) -> Optional[ProjectMemory]:
        # Check cache validity
        if self._memory_cache and self._is_cache_valid():
            return self._memory_cache
        
        # Load and cache
        self._memory_cache = super().load_memory()
        self._cache_timestamp = datetime.now()
        return self._memory_cache
```

**Lazy Loading**: Load data only when needed
```python
def get_project_context(self, include_discussions: bool = True) -> ProjectContext:
    """Load context with optional components."""
    context = ProjectContext(
        config=self.config_manager.load_config(),
        memory=self.memory_manager.load_memory()
    )
    
    # Only load discussions if requested
    if include_discussions:
        context.recent_discussions = self.discussion_manager.get_discussion_history(5)
    
    return context
```

### Memory Management

**Stream Large Files**: Don't load entire files into memory
```python
def process_large_log(log_path: Path) -> None:
    """Process log file line by line."""
    with open(log_path, 'r') as f:
        for line in f:
            process_line(line)
```

**Cleanup Temporary Data**: Remove temporary files after use
```python
def create_summary(self, discussion_file: Path) -> Path:
    """Generate summary with cleanup."""
    temp_file = self._create_temp_file()
    try:
        # Process
        summary = self._generate_summary(discussion_file)
        summary_file = self._save_summary(summary)
        return summary_file
    finally:
        # Always cleanup
        if temp_file.exists():
            temp_file.unlink()
```


### Concurrency Considerations

**File Locking**: Prevent concurrent writes
```python
import fcntl

def write_with_lock(file_path: Path, content: str) -> None:
    """Write file with exclusive lock."""
    with open(file_path, 'w') as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        try:
            f.write(content)
        finally:
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
```

**Atomic Operations**: Use atomic file operations
```python
def atomic_write(file_path: Path, content: str) -> None:
    """Write file atomically."""
    temp_path = file_path.with_suffix('.tmp')
    
    # Write to temp file
    with open(temp_path, 'w') as f:
        f.write(content)
    
    # Atomic rename
    temp_path.replace(file_path)
```

### Scalability

**Pagination**: Limit data returned in queries
```python
def get_discussion_history(self, limit: int = 10, offset: int = 0) -> List[str]:
    """Get paginated discussion history."""
    all_discussions = self._load_all_discussions()
    return all_discussions[offset:offset + limit]
```

**Indexing**: Use indices for fast lookups
```python
class IndexedAssetManager(AssetManager):
    def __init__(self, project_path: Path):
        super().__init__(project_path)
        self._asset_index = self._build_index()
    
    def find_asset(self, query: str) -> List[AssetInfo]:
        """Fast asset lookup using index."""
        return self._asset_index.get(query, [])
```

---

## Troubleshooting

### Common Issues

**Issue**: JSON validation fails
```
Error: Invalid JSON schema: missing required field 'schema_version'
```

**Solution**: Ensure all JSON files include schema_version field
```python
# Check schema version
with open(file_path) as f:
    data = json.load(f)
    if 'schema_version' not in data:
        data['schema_version'] = '1.0'
        # Write back
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
```


**Issue**: Directory structure incomplete
```
Error: Missing required directories: ['assistant/discussions_raw']
```

**Solution**: Run structure validation and repair
```python
memory_system = MemorySystemCore(project_path)
missing = memory_system.directory_manager.validate_structure(project_path)

if missing:
    print(f"Missing: {missing}")
    # Recreate structure
    memory_system.directory_manager.create_structure(project_path)
```

**Issue**: Memory file corrupted
```
Error: Cannot parse memory.json
```

**Solution**: Trigger recovery
```python
memory_system = MemorySystemCore(project_path)
report = memory_system.trigger_recovery(RecoveryType.DESPERATE)

if report.success:
    print("Recovery successful")
else:
    print(f"Recovery failed: {report.warnings}")
```

**Issue**: Summarization not triggering
```
Discussion file growing but no summary created
```

**Solution**: Check threshold configuration
```python
# Check current threshold
config = memory_system.config_manager.load_config()
threshold = config.memory_system_config.summarization_threshold_kb

# Adjust if needed
config.memory_system_config.summarization_threshold_kb = 25
memory_system.config_manager.save_config(config)
```

**Issue**: Asset not indexed
```
Asset file exists but not in attachments_index.txt
```

**Solution**: Rebuild asset index
```python
memory_system.asset_manager.rebuild_index()
```

### Diagnostic Commands

```python
# Get system status
status = memory_system.get_status()
print(json.dumps(status, indent=2))

# Validate project state
validation = memory_system.validate_project_state()
if not validation.valid:
    for error in validation.errors:
        print(f"{error.severity}: {error.description}")

# Run QA check
qa_report = memory_system.run_quality_check()
print(f"QA Score: {qa_report['overall_score']}")

# Get timeline
timeline = memory_system.get_timeline(20)
for event in timeline:
    print(f"[{event['timestamp']}] {event['event_type']}: {event['description']}")
```


### Error Recovery Workflow

```
1. Detect Error
   ↓
2. Classify Error (type, severity)
   ↓
3. Log Error to errors_detected.json
   ↓
4. Attempt Automatic Repair (max 3 attempts)
   ↓
5. If repair fails → Mark for manual intervention
   ↓
6. If critical → Trigger desperate recovery
   ↓
7. Generate recovery report
   ↓
8. Update timeline
```

### Performance Profiling

```python
import cProfile
import pstats

# Profile a function
profiler = cProfile.Profile()
profiler.enable()

memory_system.initialize_project("test", "video", ["obj1"])

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)  # Top 20 functions
```

### Memory Profiling

```python
from memory_profiler import profile

@profile
def test_memory_usage():
    memory_system = MemorySystemCore(project_path)
    memory_system.initialize_project("test", "video", ["obj1"])
    
    # Add many assets
    for i in range(1000):
        memory_system.add_asset(f"asset_{i}.png", "image")

test_memory_usage()
```

---

## Additional Resources

### Related Documentation

- [README.md](README.md) - User guide and quick start
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference
- [EXAMPLES.md](EXAMPLES.md) - Usage examples
- [Design Document](../../.kiro/specs/storycore-llm-memory-system/design.md) - Complete design
- [Requirements Document](../../.kiro/specs/storycore-llm-memory-system/requirements.md) - Requirements

### External Resources

- [Hypothesis Documentation](https://hypothesis.readthedocs.io/) - Property-based testing
- [JSON Schema](https://json-schema.org/) - Schema validation
- [Python Pathlib](https://docs.python.org/3/library/pathlib.html) - Path operations
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) - Timestamp format

### Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

### License

See [LICENSE](../../LICENSE) for license information.

---

**Last Updated**: 2025-01-26

**Version**: 1.0

**Maintainers**: StoryCore Development Team
