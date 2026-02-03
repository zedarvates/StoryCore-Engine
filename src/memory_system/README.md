# StoryCore LLM Memory System

## Overview

The StoryCore LLM Memory System is an intelligent project organization framework that automatically creates and maintains a structured directory system optimized for LLM assistant efficiency. The system provides persistent memory, automatic summarization, comprehensive logging, and error recovery capabilities to ensure projects maintain coherence across sessions while minimizing token usage and maximizing context utility.

### Key Benefits

- **Persistent Memory**: Maintains project context across sessions with structured memory.json
- **Automatic Summarization**: Compresses discussions and assets for efficient LLM consumption
- **Comprehensive Logging**: Tracks all project actions for debugging and recovery
- **Error Recovery**: Automatically detects and repairs common issues
- **Asset Management**: Organizes and indexes all project assets
- **Quality Assurance**: Validates LLM outputs and project state automatically

### Core Principles

1. **Structure as Intelligence**: A well-organized directory structure acts as an external memory system for LLMs
2. **Automatic Compression**: Raw data is continuously summarized and indexed for efficient LLM consumption
3. **Self-Healing**: Comprehensive logging and recovery mechanisms ensure project integrity

## Quick Start

### Enabling Memory System for a Project

The memory system is optional and can be enabled when initializing a new StoryCore project:

```bash
# Initialize a new project with memory system enabled
python storycore.py init my-project --enable-memory

# Or enable it in wizard mode
python storycore.py init
# Select "Yes" when prompted about memory system
```

### Verifying Memory System Status

Check if memory system is enabled for a project:

```bash
# Check project configuration
cat projects/my-project/project_config.json | grep memory_system_enabled
```

### Basic Usage

Once enabled, the memory system works automatically:

1. **Pipeline commands** automatically log actions
2. **Generated assets** are automatically indexed
3. **Discussions** can be recorded for context
4. **Summaries** are generated automatically when needed

## Directory Structure

When enabled, the memory system creates the following structure:

```
/PROJECT_NAME/
├── /assistant/                    # LLM assistant context
│   ├── /discussions_raw/          # Complete conversation logs
│   ├── /discussions_summary/      # Compressed summaries
│   ├── memory.json                # Structured project memory
│   └── variables.json             # Project variables
├── /build_logs/                   # Action tracking
│   ├── build_steps_raw.log        # Complete action log
│   ├── build_steps_clean.txt      # Formatted log
│   ├── build_steps_translated.txt # Translated log
│   ├── errors_detected.json       # Error tracking
│   └── recovery_attempts.log      # Recovery history
├── /assets/                       # Project assets
│   ├── /images/                   # Image files
│   ├── /audio/                    # Audio files
│   ├── /video/                    # Video files
│   ├── /documents/                # Document files
│   └── attachments_index.txt      # Asset index
├── /summaries/                    # Consolidated information
│   ├── assets_summary.txt         # Asset overview
│   ├── project_overview.txt       # Project summary
│   └── timeline.txt               # Event timeline
├── /qa_reports/                   # Quality assurance
│   └── [timestamped reports]      # QA validation reports
└── project_config.json            # Project configuration
```

### Key Files Explained

#### memory.json
Structured project memory containing:
- **objectives**: Project goals and their status
- **entities**: Characters, modules, components, concepts
- **constraints**: Technical, creative, and business limitations
- **decisions**: Important decisions with rationale
- **style_rules**: Visual, narrative, and technical guidelines
- **task_backlog**: Pending and completed tasks
- **current_state**: Current phase, progress, and blockers

#### variables.json
Key-value storage for project parameters:
- Supports string, number, boolean, and array types
- Tracks last modification timestamp
- Logged to build log on changes

#### attachments_index.txt
LLM-readable asset index with:
- Filename and path
- File type and size
- Metadata (dimensions, format, etc.)
- Description and timestamp

#### build_steps_raw.log
Complete action log including:
- File creation and modification
- Asset additions
- Memory updates
- Pipeline operations
- Error occurrences

## CLI Commands

### Memory Validation

Validate project integrity and detect errors:

```bash
# Run validation checks
python storycore.py memory-validate --project my-project

# Output includes:
# - Missing file detection
# - JSON schema validation
# - State consistency checks
# - Error classification and severity
```

### Memory Recovery

Attempt to repair detected errors:

```bash
# Automatic repair mode
python storycore.py memory-recover --project my-project

# Desperate recovery mode (reconstruct from logs)
python storycore.py memory-recover --project my-project --desperate

# Recovery attempts:
# - Recreate missing files from templates
# - Fix invalid JSON syntax
# - Reconcile state inconsistencies
# - Rebuild from logs (desperate mode)
```

### Memory Summary

Generate or update project overview:

```bash
# Update project overview and timeline
python storycore.py memory-summary --project my-project

# Generates:
# - project_overview.txt: Comprehensive project summary
# - timeline.txt: Chronological event history
# - assets_summary.txt: Asset overview by type
```

### Memory Export

Export memory system reports:

```bash
# Export complete memory system state
python storycore.py memory-export --project my-project --output reports/

# Exports:
# - Complete memory.json
# - All summaries
# - Build logs (raw, clean, translated)
# - QA reports
# - Error logs
```

## Integration with StoryCore Pipeline

The memory system integrates seamlessly with StoryCore commands:

### Automatic Logging

Pipeline commands automatically log actions when memory system is enabled:

```bash
# Grid generation logs:
# - Grid specification (3x3, etc.)
# - Panel count and cell size
# - Output file paths
python storycore.py grid --project my-project

# Promotion logs:
# - Panel count and scale factor
# - Upscaling method used
# - Output directory
python storycore.py promote --project my-project

# QA logs:
# - Overall score and threshold
# - Pass/fail status
# - Issues count
python storycore.py qa --project my-project

# Export logs:
# - Export format and location
# - File count
python storycore.py export --project my-project
```

### Automatic Asset Indexing

Generated assets are automatically indexed:

```bash
# Images generated by grid/promote are indexed
# Audio generated by audio pipeline is indexed
# Video generated by video pipeline is indexed

# Index includes:
# - Asset type and location
# - Generation context (workflow, prompt, etc.)
# - Metadata (dimensions, duration, format)
# - Timestamp
```

### Non-Interference

The memory system operates transparently:
- Does not modify pipeline outputs
- Does not affect pipeline behavior
- Fails silently if errors occur
- Can be disabled without affecting functionality

## File Formats

### JSON Schemas

#### project_config.json

```json
{
  "schema_version": "1.0",
  "project_name": "my-project",
  "project_type": "video",
  "creation_timestamp": "2025-01-26T10:00:00Z",
  "objectives": ["Create cinematic sequence"],
  "memory_system_enabled": true,
  "memory_system_config": {
    "auto_summarize": true,
    "summarization_threshold_kb": 50,
    "auto_translate": true,
    "target_languages": ["en", "fr"],
    "error_detection_enabled": true,
    "auto_recovery_enabled": true,
    "max_recovery_attempts": 3
  }
}
```

#### memory.json

```json
{
  "schema_version": "1.0",
  "last_updated": "2025-01-26T10:30:00Z",
  "objectives": [
    {
      "id": "obj_001",
      "description": "Create cinematic sequence",
      "status": "active",
      "added": "2025-01-26T10:00:00Z"
    }
  ],
  "entities": [
    {
      "id": "ent_001",
      "name": "Main Character",
      "type": "character",
      "description": "Protagonist of the story",
      "attributes": {"age": 30, "role": "hero"},
      "added": "2025-01-26T10:15:00Z"
    }
  ],
  "constraints": [
    {
      "id": "con_001",
      "description": "Must maintain visual coherence",
      "type": "technical",
      "added": "2025-01-26T10:00:00Z"
    }
  ],
  "decisions": [
    {
      "id": "dec_001",
      "description": "Use 3x3 grid for master coherence",
      "rationale": "Ensures consistent visual style",
      "alternatives_considered": ["2x2 grid", "4x4 grid"],
      "timestamp": "2025-01-26T10:20:00Z"
    }
  ],
  "style_rules": [
    {
      "category": "visual",
      "rule": "Cinematic lighting with high contrast",
      "added": "2025-01-26T10:25:00Z"
    }
  ],
  "task_backlog": [
    {
      "id": "task_001",
      "description": "Generate master coherence sheet",
      "priority": "high",
      "status": "completed",
      "added": "2025-01-26T10:00:00Z"
    }
  ],
  "current_state": {
    "phase": "promotion",
    "progress_percentage": 60,
    "active_tasks": ["Promoting panels"],
    "blockers": [],
    "last_activity": "2025-01-26T10:30:00Z"
  }
}
```

#### variables.json

```json
{
  "schema_version": "1.0",
  "last_updated": "2025-01-26T10:30:00Z",
  "variables": {
    "grid_size": {
      "value": "3x3",
      "type": "string",
      "description": "Master coherence grid size",
      "last_modified": "2025-01-26T10:00:00Z"
    },
    "scale_factor": {
      "value": 2,
      "type": "number",
      "description": "Panel upscaling factor",
      "last_modified": "2025-01-26T10:20:00Z"
    },
    "qa_threshold": {
      "value": 100.0,
      "type": "number",
      "description": "Quality threshold for Laplacian variance",
      "last_modified": "2025-01-26T10:25:00Z"
    }
  }
}
```

#### errors_detected.json

```json
{
  "schema_version": "1.0",
  "errors": [
    {
      "id": "err_001",
      "type": "missing_file",
      "severity": "medium",
      "detected": "2025-01-26T10:35:00Z",
      "description": "Asset index file missing",
      "affected_components": ["assets/attachments_index.txt"],
      "diagnostic_info": {
        "expected_path": "assets/attachments_index.txt",
        "parent_exists": true
      },
      "status": "resolved",
      "recovery_attempts": 1
    }
  ]
}
```

### Text File Formats

#### attachments_index.txt

```
=== IMAGE: panel_001.png ===
Path: assets/images/panel_001.png
Type: PNG
Size: 245 KB
Dimensions: 1920x1080
Added: 2025-01-26T10:30:00Z
Description: Generated image for shot 1 using flux workflow

=== AUDIO: dialogue_001.wav ===
Path: assets/audio/dialogue_001.wav
Type: WAV
Size: 1.2 MB
Duration: 5.3s
Added: 2025-01-26T10:35:00Z
Description: Generated audio for character dialogue
```

#### build_steps_raw.log

```
[2025-01-26T10:00:00Z] ACTION: PROJECT_INITIALIZED
  Project_Name: my-project
  Project_Type: video
  Memory_System: enabled
  Triggered_By: init_handler

[2025-01-26T10:20:00Z] ACTION: GRID_GENERATED
  Path: projects/my-project/grid_3x3.png
  Grid_Spec: 3x3
  Panel_Count: 9
  Cell_Size: 512
  Triggered_By: grid_handler

[2025-01-26T10:30:00Z] ACTION: PANELS_PROMOTED
  Output_Dir: projects/my-project/promoted/
  Panel_Count: 9
  Scale_Factor: 2
  Method: lanczos
  Triggered_By: promote_handler
```

#### project_overview.txt

```
# Project Overview: my-project

## Summary
Cinematic video sequence project using StoryCore pipeline with master coherence
sheet for visual consistency.

## Current Objectives
- Create cinematic sequence (Active)
- Maintain visual coherence across all panels (Active)

## Key Entities
- Main Character: Protagonist of the story (Character)
- Master Coherence Sheet: 3x3 grid for visual DNA lock (Component)

## Recent Decisions
- Use 3x3 grid for master coherence (2025-01-26)
  Rationale: Ensures consistent visual style
  Alternatives: 2x2 grid, 4x4 grid

## Current State
Phase: promotion
Progress: 60%
Active Tasks: Promoting panels
Blockers: None

## Next Steps
- Complete panel promotion
- Run QA validation
- Export final sequence
```

#### timeline.txt

```
=== 2025-01-26T10:00:00Z ===
EVENT: Project Created
Details: Initialized my-project with memory system enabled

=== 2025-01-26T10:20:00Z ===
EVENT: Grid Generated
Details: Created 3x3 master coherence sheet with 9 panels

=== 2025-01-26T10:30:00Z ===
EVENT: Panels Promoted
Details: Upscaled 9 panels using lanczos method (2x scale)

=== 2025-01-26T10:35:00Z ===
EVENT: Error Detected
Details: Missing asset index file (Severity: medium)

=== 2025-01-26T10:35:30Z ===
EVENT: Error Resolved
Details: Recreated asset index from file system scan
```

## Workflows

### Workflow 1: Starting a New Project

```bash
# 1. Initialize project with memory system
python storycore.py init my-project --enable-memory

# 2. Verify structure created
ls -la projects/my-project/

# 3. Check configuration
cat projects/my-project/project_config.json

# 4. Run pipeline commands (automatically logged)
python storycore.py grid --project my-project
python storycore.py promote --project my-project
python storycore.py qa --project my-project

# 5. Review logs and summaries
cat projects/my-project/build_logs/build_steps_clean.txt
cat projects/my-project/summaries/project_overview.txt
```

### Workflow 2: Validating Project State

```bash
# 1. Run validation
python storycore.py memory-validate --project my-project

# 2. Check for errors
cat projects/my-project/build_logs/errors_detected.json

# 3. If errors found, attempt recovery
python storycore.py memory-recover --project my-project

# 4. Verify recovery
python storycore.py memory-validate --project my-project
```

### Workflow 3: Reviewing Project History

```bash
# 1. View timeline
cat projects/my-project/summaries/timeline.txt

# 2. View build log
cat projects/my-project/build_logs/build_steps_clean.txt

# 3. View project overview
cat projects/my-project/summaries/project_overview.txt

# 4. View asset index
cat projects/my-project/assets/attachments_index.txt
```

### Workflow 4: Recovering from Errors

```bash
# 1. Detect errors
python storycore.py memory-validate --project my-project

# 2. Attempt automatic repair
python storycore.py memory-recover --project my-project

# 3. If automatic repair fails, try desperate recovery
python storycore.py memory-recover --project my-project --desperate

# 4. Review recovery report
cat projects/my-project/build_logs/recovery_attempts.log

# 5. Check what was recovered
python storycore.py memory-validate --project my-project
```

### Workflow 5: Exporting Project State

```bash
# 1. Generate latest summaries
python storycore.py memory-summary --project my-project

# 2. Export complete state
python storycore.py memory-export --project my-project --output exports/

# 3. Review exported files
ls -la exports/my-project/

# Exported files include:
# - memory.json
# - variables.json
# - All summaries
# - Build logs (raw, clean, translated)
# - QA reports
# - Error logs
```

## Best Practices

### 1. Enable Memory System Early

Enable the memory system when initializing a project to capture complete history:

```bash
# Good: Enable from start
python storycore.py init my-project --enable-memory

# Less ideal: Enable later (loses early history)
# Edit project_config.json manually
```

### 2. Run Validation Regularly

Validate project state periodically to catch issues early:

```bash
# After major operations
python storycore.py promote --project my-project
python storycore.py memory-validate --project my-project

# Before critical operations
python storycore.py memory-validate --project my-project
python storycore.py export --project my-project
```

### 3. Review Summaries for Context

Use summaries to quickly understand project state:

```bash
# Quick project overview
cat projects/my-project/summaries/project_overview.txt

# Event history
cat projects/my-project/summaries/timeline.txt

# Asset inventory
cat projects/my-project/summaries/assets_summary.txt
```

### 4. Leverage Build Logs for Debugging

Build logs provide complete action history:

```bash
# Human-readable log
cat projects/my-project/build_logs/build_steps_clean.txt

# Raw log with all details
cat projects/my-project/build_logs/build_steps_raw.log

# Translated log (if configured)
cat projects/my-project/build_logs/build_steps_translated.txt
```

### 5. Use Recovery Wisely

Recovery should be last resort:

```bash
# First: Try validation to identify issues
python storycore.py memory-validate --project my-project

# Second: Try automatic repair
python storycore.py memory-recover --project my-project

# Last resort: Desperate recovery (may lose data)
python storycore.py memory-recover --project my-project --desperate
```

### 6. Configure for Your Needs

Customize memory system behavior in project_config.json:

```json
{
  "memory_system_config": {
    "auto_summarize": true,              // Enable automatic summarization
    "summarization_threshold_kb": 50,    // Trigger at 50KB
    "auto_translate": false,             // Disable translation
    "target_languages": ["en"],          // Only English
    "error_detection_enabled": true,     // Enable error detection
    "auto_recovery_enabled": false,      // Disable auto-recovery
    "max_recovery_attempts": 3           // Limit recovery attempts
  }
}
```

## Troubleshooting

### Memory System Not Creating Files

**Problem**: Memory system directories not created

**Solution**:
```bash
# Check if memory system is enabled
cat projects/my-project/project_config.json | grep memory_system_enabled

# If false, enable it
# Edit project_config.json and set "memory_system_enabled": true

# Or reinitialize with --enable-memory flag
python storycore.py init my-project --enable-memory
```

### Invalid JSON Errors

**Problem**: JSON files have syntax errors

**Solution**:
```bash
# Validate JSON files
python storycore.py memory-validate --project my-project

# Attempt automatic repair
python storycore.py memory-recover --project my-project

# If repair fails, check the file manually
cat projects/my-project/assistant/memory.json

# Common issues:
# - Trailing commas
# - Missing brackets
# - Unescaped quotes
```

### Missing Files

**Problem**: Required files are missing

**Solution**:
```bash
# Detect missing files
python storycore.py memory-validate --project my-project

# Attempt to recreate from templates
python storycore.py memory-recover --project my-project

# If recovery fails, check what's missing
cat projects/my-project/build_logs/errors_detected.json

# Manually recreate if needed (see File Formats section)
```

### State Inconsistencies

**Problem**: memory.json doesn't match actual project state

**Solution**:
```bash
# Detect inconsistencies
python storycore.py memory-validate --project my-project

# Attempt reconciliation
python storycore.py memory-recover --project my-project

# Review what was fixed
cat projects/my-project/build_logs/recovery_attempts.log

# If issues persist, regenerate summaries
python storycore.py memory-summary --project my-project
```

### Large Log Files

**Problem**: Build logs growing too large

**Solution**:
```bash
# Logs are append-only for complete history
# To reduce size, archive old logs:

# 1. Copy current logs
cp projects/my-project/build_logs/build_steps_raw.log \
   projects/my-project/build_logs/build_steps_raw_archive_$(date +%Y%m%d).log

# 2. Clear current log (not recommended - loses history)
# > projects/my-project/build_logs/build_steps_raw.log

# Better: Use log rotation or compression
gzip projects/my-project/build_logs/build_steps_raw_archive_*.log
```

### Recovery Failures

**Problem**: Automatic recovery cannot fix issues

**Solution**:
```bash
# Try desperate recovery mode
python storycore.py memory-recover --project my-project --desperate

# Review recovery report
cat projects/my-project/build_logs/recovery_attempts.log

# Check what couldn't be recovered
cat projects/my-project/build_logs/errors_detected.json

# Manual intervention may be required:
# 1. Review error details
# 2. Recreate missing files from templates
# 3. Fix JSON syntax manually
# 4. Update memory.json with correct state
```

## Advanced Topics

### Custom Summarization

The summarization engine can be customized by modifying the configuration:

```json
{
  "memory_system_config": {
    "summarization_threshold_kb": 100,  // Larger threshold = less frequent
    "auto_summarize": true              // Enable/disable
  }
}
```

### Multi-Language Support

Enable translation for build logs:

```json
{
  "memory_system_config": {
    "auto_translate": true,
    "target_languages": ["en", "fr"]  // English and French
  }
}
```

### Error Detection Tuning

Configure error detection sensitivity:

```json
{
  "memory_system_config": {
    "error_detection_enabled": true,
    "auto_recovery_enabled": true,
    "max_recovery_attempts": 3  // Prevent infinite loops
  }
}
```

### Programmatic Access

Use the memory system programmatically:

```python
from pathlib import Path
from src.memory_system.memory_system_core import MemorySystemCore
from src.memory_system.data_models import ProjectConfig

# Initialize memory system
project_path = Path("projects/my-project")
config = ProjectConfig(
    project_name="my-project",
    project_type="video",
    objectives=["Create cinematic sequence"]
)

memory_system = MemorySystemCore(project_path, config)

# Initialize project
memory_system.initialize_project(
    project_name="my-project",
    project_type="video",
    objectives=["Create cinematic sequence"]
)

# Get project context
context = memory_system.get_project_context()
print(f"Current phase: {context.current_state['phase']}")
print(f"Progress: {context.current_state['progress_percentage']}%")

# Validate project state
validation_result = memory_system.validate_project_state()
if not validation_result.is_valid:
    print(f"Errors detected: {len(validation_result.errors)}")
    
    # Trigger recovery
    recovery_report = memory_system.trigger_recovery("automatic")
    print(f"Recovery success: {recovery_report.success}")
```

## FAQ

### Q: Does the memory system slow down the pipeline?

**A**: No. The memory system operates asynchronously and fails silently if errors occur. Logging and indexing operations are lightweight and don't impact pipeline performance.

### Q: Can I disable the memory system for a project?

**A**: Yes. Set `"memory_system_enabled": false` in project_config.json. The pipeline will continue to work normally without memory system features.

### Q: What happens if I delete memory system files?

**A**: The system will detect missing files during validation. You can attempt recovery using `memory-recover` command, which will try to reconstruct files from logs and templates.

### Q: Can I use the memory system with existing projects?

**A**: Yes. Enable it in project_config.json and run `memory-validate` to create the structure. However, you'll lose history from before enabling it.

### Q: How much disk space does the memory system use?

**A**: Minimal. Text files (logs, summaries, indices) are typically < 1MB per project. The largest files are usually the assets themselves, which would exist regardless of the memory system.

### Q: Can I customize the directory structure?

**A**: The structure is fixed to ensure consistency. However, you can add custom directories alongside the memory system directories without issues.

### Q: Is the memory system required for StoryCore?

**A**: No. It's completely optional. StoryCore works perfectly without it. The memory system is an enhancement for projects that benefit from persistent context and logging.

### Q: Can multiple users share a memory system project?

**A**: Yes, but be careful with concurrent access. The system doesn't currently handle concurrent writes. Use version control (git) to coordinate changes.

## Support and Contributing

### Getting Help

- Check this README for common issues
- Review error logs in `build_logs/errors_detected.json`
- Run validation: `python storycore.py memory-validate --project <name>`
- Check recovery logs: `cat build_logs/recovery_attempts.log`

### Reporting Issues

When reporting issues, include:
1. Project configuration (`project_config.json`)
2. Error logs (`errors_detected.json`)
3. Recent build log entries (`build_steps_clean.txt`)
4. Steps to reproduce the issue

### Contributing

The memory system is part of StoryCore. Contributions welcome:
- Bug fixes
- Feature enhancements
- Documentation improvements
- Test coverage

## License

Part of StoryCore-Engine. See main project LICENSE file.

## Version

Memory System Version: 1.0
Compatible with: StoryCore-Engine 1.0+
Last Updated: 2025-01-26
