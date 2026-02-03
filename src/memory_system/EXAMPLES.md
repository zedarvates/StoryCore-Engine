# Memory System Examples

This document provides practical examples of using the StoryCore LLM Memory System in real-world scenarios.

## Example 1: Creating a New Cinematic Project

### Scenario
You want to create a new cinematic video project with full memory system tracking.

### Steps

```bash
# 1. Initialize project with memory system
python storycore.py init cinematic-trailer --enable-memory

# 2. Verify structure created
ls -la projects/cinematic-trailer/
# Output shows:
# - assistant/
# - build_logs/
# - assets/
# - summaries/
# - qa_reports/
# - project_config.json

# 3. Check configuration
cat projects/cinematic-trailer/project_config.json
```

### Expected Output

```json
{
  "schema_version": "1.0",
  "project_name": "cinematic-trailer",
  "project_type": "video",
  "creation_timestamp": "2025-01-26T10:00:00Z",
  "objectives": [],
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

### What Happens

1. Complete directory structure is created
2. All JSON files are initialized with valid schemas
3. Empty index files are created
4. Build log starts tracking actions
5. Timeline records project creation

## Example 2: Running Complete Pipeline with Logging

### Scenario
You want to run the complete StoryCore pipeline and have all actions logged automatically.

### Steps

```bash
# 1. Generate master coherence sheet
python storycore.py grid --project cinematic-trailer

# 2. Promote panels
python storycore.py promote --project cinematic-trailer

# 3. Run QA validation
python storycore.py qa --project cinematic-trailer

# 4. Export final sequence
python storycore.py export --project cinematic-trailer

# 5. Review what was logged
cat projects/cinematic-trailer/build_logs/build_steps_clean.txt
```

### Expected Log Output

```
=== 2025-01-26T10:20:00Z ===
ACTION: GRID_GENERATED
Project: cinematic-trailer
Details:
  - Grid Specification: 3x3
  - Panel Count: 9
  - Cell Size: 512px
  - Output: projects/cinematic-trailer/grid_3x3.png
Triggered By: grid_handler

=== 2025-01-26T10:25:00Z ===
ACTION: PANELS_PROMOTED
Project: cinematic-trailer
Details:
  - Panel Count: 9
  - Scale Factor: 2x
  - Method: lanczos
  - Output Directory: projects/cinematic-trailer/promoted/
Triggered By: promote_handler

=== 2025-01-26T10:30:00Z ===
ACTION: QA_SCORING_COMPLETED
Project: cinematic-trailer
Details:
  - Overall Score: 95.5
  - Threshold: 100.0
  - Status: PASSED
  - Issues Found: 0
Triggered By: qa_handler

=== 2025-01-26T10:35:00Z ===
ACTION: PROJECT_EXPORTED
Project: cinematic-trailer
Details:
  - Format: ZIP
  - Location: exports/cinematic-trailer_20250126_103500.zip
  - File Count: 27
Triggered By: export_handler
```

### What Happens

1. Each pipeline command logs its actions
2. Build log captures all parameters
3. Timeline is updated with events
4. Asset index is updated with generated files
5. Project overview reflects current state

## Example 3: Validating and Recovering from Errors

### Scenario
You suspect there might be issues with your project and want to validate and fix them.

### Steps

```bash
# 1. Run validation
python storycore.py memory-validate --project cinematic-trailer

# 2. Check for detected errors
cat projects/cinematic-trailer/build_logs/errors_detected.json

# 3. Attempt automatic recovery
python storycore.py memory-recover --project cinematic-trailer

# 4. Verify recovery succeeded
python storycore.py memory-validate --project cinematic-trailer

# 5. Review recovery log
cat projects/cinematic-trailer/build_logs/recovery_attempts.log
```

### Example Error Detection Output

```json
{
  "schema_version": "1.0",
  "errors": [
    {
      "id": "err_001",
      "type": "missing_file",
      "severity": "medium",
      "detected": "2025-01-26T11:00:00Z",
      "description": "Asset index file is missing",
      "affected_components": ["assets/attachments_index.txt"],
      "diagnostic_info": {
        "expected_path": "projects/cinematic-trailer/assets/attachments_index.txt",
        "parent_directory_exists": true
      },
      "status": "detected",
      "recovery_attempts": 0
    }
  ]
}
```

### Example Recovery Output

```
=== Recovery Attempt Log ===
Timestamp: 2025-01-26T11:05:00Z
Project: cinematic-trailer

Error: err_001 (missing_file)
Description: Asset index file is missing
Severity: medium

Recovery Action: Recreate from file system scan
Status: SUCCESS

Details:
- Scanned assets/ directory
- Found 15 image files
- Found 3 audio files
- Generated index with 18 entries
- Validated index format

Result: Asset index recreated successfully
```

### What Happens

1. Validation scans entire project structure
2. Errors are detected and classified
3. Recovery attempts appropriate fixes
4. Success/failure is logged
5. Error status is updated

## Example 4: Reviewing Project History

### Scenario
You want to understand what happened in your project over time.

### Steps

```bash
# 1. View timeline
cat projects/cinematic-trailer/summaries/timeline.txt

# 2. View project overview
cat projects/cinematic-trailer/summaries/project_overview.txt

# 3. View asset inventory
cat projects/cinematic-trailer/summaries/assets_summary.txt

# 4. View detailed build log
cat projects/cinematic-trailer/build_logs/build_steps_clean.txt
```

### Example Timeline Output

```
=== Project Timeline: cinematic-trailer ===

=== 2025-01-26T10:00:00Z ===
EVENT: Project Created
Type: INITIALIZATION
Details: Initialized cinematic-trailer with memory system enabled
Status: Success

=== 2025-01-26T10:20:00Z ===
EVENT: Master Coherence Sheet Generated
Type: GRID_GENERATION
Details: Created 3x3 grid with 9 panels (512px cells)
Status: Success

=== 2025-01-26T10:25:00Z ===
EVENT: Panels Promoted
Type: PROMOTION
Details: Upscaled 9 panels using lanczos method (2x scale factor)
Status: Success

=== 2025-01-26T10:30:00Z ===
EVENT: QA Validation Completed
Type: QUALITY_ASSURANCE
Details: Overall score 95.5 (threshold 100.0) - PASSED
Status: Success

=== 2025-01-26T10:35:00Z ===
EVENT: Project Exported
Type: EXPORT
Details: Created ZIP archive with 27 files
Status: Success

=== 2025-01-26T11:00:00Z ===
EVENT: Error Detected
Type: ERROR
Details: Missing asset index file (severity: medium)
Status: Detected

=== 2025-01-26T11:05:00Z ===
EVENT: Error Resolved
Type: RECOVERY
Details: Recreated asset index from file system scan
Status: Success
```

### Example Project Overview Output

```
# Project Overview: cinematic-trailer

## Summary
Cinematic video trailer project using StoryCore pipeline with master coherence
sheet for visual consistency. Project completed successfully with all QA checks
passing.

## Current Objectives
- Create professional cinematic trailer (Completed)
- Maintain visual coherence across all shots (Active)
- Export final sequence for distribution (Completed)

## Key Entities
- Master Coherence Sheet: 3x3 grid establishing visual DNA (Component)
- Promoted Panels: 9 upscaled panels at 2x resolution (Asset Collection)
- Final Export: Complete sequence package (Deliverable)

## Recent Decisions
- Use 3x3 grid for master coherence (2025-01-26T10:15:00Z)
  Rationale: Provides optimal balance between detail and processing time
  Alternatives Considered: 2x2 grid (too coarse), 4x4 grid (too slow)

- Use lanczos upscaling method (2025-01-26T10:22:00Z)
  Rationale: Best quality for cinematic content
  Alternatives Considered: bilinear (faster but lower quality)

## Current State
Phase: completed
Progress: 100%
Active Tasks: None
Blockers: None
Last Activity: 2025-01-26T10:35:00Z

## Recent Activity
- Project exported successfully (2025-01-26T10:35:00Z)
- QA validation passed with score 95.5 (2025-01-26T10:30:00Z)
- All panels promoted successfully (2025-01-26T10:25:00Z)
- Master coherence sheet generated (2025-01-26T10:20:00Z)

## Next Steps
- Review exported sequence
- Prepare for distribution
- Archive project files
```

### What Happens

1. Timeline shows chronological event history
2. Project overview synthesizes current state
3. Asset summary lists all project assets
4. Build log provides detailed action history

## Example 5: Exporting Project State

### Scenario
You want to export complete project state for backup or sharing.

### Steps

```bash
# 1. Update all summaries first
python storycore.py memory-summary --project cinematic-trailer

# 2. Export complete state
python storycore.py memory-export --project cinematic-trailer --output backups/

# 3. Review exported files
ls -la backups/cinematic-trailer/

# 4. Verify export contents
tree backups/cinematic-trailer/
```

### Expected Export Structure

```
backups/cinematic-trailer/
├── memory.json                    # Complete project memory
├── variables.json                 # Project variables
├── project_config.json            # Configuration
├── build_steps_raw.log           # Complete action log
├── build_steps_clean.txt         # Formatted log
├── build_steps_translated.txt    # Translated log (if enabled)
├── errors_detected.json          # Error history
├── recovery_attempts.log         # Recovery history
├── attachments_index.txt         # Asset index
├── assets_summary.txt            # Asset overview
├── project_overview.txt          # Project summary
├── timeline.txt                  # Event timeline
└── qa_reports/                   # All QA reports
    ├── qa_report_20250126_103000.json
    └── qa_report_20250126_110500.json
```

### What Happens

1. All summaries are regenerated
2. Complete memory system state is exported
3. All logs and reports are included
4. Export is timestamped for versioning

## Example 6: Desperate Recovery from Corruption

### Scenario
Your project files are severely corrupted and automatic recovery failed.

### Steps

```bash
# 1. Attempt normal recovery first
python storycore.py memory-recover --project cinematic-trailer

# 2. If that fails, try desperate recovery
python storycore.py memory-recover --project cinematic-trailer --desperate

# 3. Review recovery report
cat projects/cinematic-trailer/build_logs/recovery_attempts.log

# 4. Check what was recovered
python storycore.py memory-validate --project cinematic-trailer

# 5. Review project state
cat projects/cinematic-trailer/summaries/project_overview.txt
```

### Example Desperate Recovery Output

```
=== Desperate Recovery Mode ===
Timestamp: 2025-01-26T12:00:00Z
Project: cinematic-trailer

Phase 1: Log Analysis
- Analyzing build_steps_raw.log
- Found 47 logged actions
- Reconstructed project history
- Identified 23 file operations
- Identified 8 memory updates
Status: SUCCESS

Phase 2: Directory Structure Reconstruction
- Recreating assistant/ directory
- Recreating build_logs/ directory
- Recreating assets/ subdirectories
- Recreating summaries/ directory
- Recreating qa_reports/ directory
Status: SUCCESS

Phase 3: Memory Reconstitution
- Extracting decisions from logs
- Extracting entities from logs
- Extracting objectives from logs
- Reconstructing current state
- Validating memory schema
Status: SUCCESS (Confidence: 85%)

Phase 4: File Recreation
- Recreating memory.json (from logs)
- Recreating variables.json (from logs)
- Recreating attachments_index.txt (from file system)
- Recreating project_overview.txt (from memory)
- Recreating timeline.txt (from logs)
Status: PARTIAL (3 of 5 files recreated)

Phase 5: Cross-Verification
- Verifying directory structure: PASS
- Verifying JSON schemas: PASS
- Verifying file references: PASS
- Verifying state consistency: PASS
Status: SUCCESS

=== Recovery Summary ===
Overall Status: SUCCESS
Confidence Level: 85%

Restored Files:
- assistant/memory.json (confidence: 85%)
- assistant/variables.json (confidence: 90%)
- assets/attachments_index.txt (confidence: 95%)
- summaries/project_overview.txt (confidence: 80%)
- summaries/timeline.txt (confidence: 95%)

Lost Files:
- None (all critical files recovered)

Warnings:
- Some memory entries may be incomplete
- Timestamps may not be exact
- Some variable values may be defaults

Recommendations:
- Review memory.json for completeness
- Verify variable values are correct
- Regenerate summaries for accuracy
- Run validation to confirm state
```

### What Happens

1. Logs are analyzed to understand project history
2. Directory structure is rebuilt
3. Memory is reconstituted from logs and summaries
4. Files are recreated from available data
5. Cross-verification ensures consistency
6. Recovery report details what was restored

## Example 7: Customizing Memory System Configuration

### Scenario
You want to customize memory system behavior for your specific needs.

### Steps

```bash
# 1. Edit project configuration
nano projects/cinematic-trailer/project_config.json

# 2. Modify memory_system_config section
# (See configuration example below)

# 3. Verify configuration
cat projects/cinematic-trailer/project_config.json

# 4. Test with validation
python storycore.py memory-validate --project cinematic-trailer
```

### Example Custom Configuration

```json
{
  "schema_version": "1.0",
  "project_name": "cinematic-trailer",
  "project_type": "video",
  "creation_timestamp": "2025-01-26T10:00:00Z",
  "objectives": ["Create professional cinematic trailer"],
  "memory_system_enabled": true,
  "memory_system_config": {
    "auto_summarize": true,
    "summarization_threshold_kb": 100,     // Larger threshold = less frequent
    "auto_translate": false,               // Disable translation
    "target_languages": ["en"],            // English only
    "error_detection_enabled": true,       // Keep error detection
    "auto_recovery_enabled": false,        // Disable auto-recovery
    "max_recovery_attempts": 5             // More attempts if needed
  }
}
```

### Configuration Options Explained

| Option | Default | Description |
|--------|---------|-------------|
| `auto_summarize` | `true` | Enable automatic discussion summarization |
| `summarization_threshold_kb` | `50` | File size trigger for summarization (KB) |
| `auto_translate` | `true` | Enable automatic log translation |
| `target_languages` | `["en", "fr"]` | Languages for translation |
| `error_detection_enabled` | `true` | Enable automatic error detection |
| `auto_recovery_enabled` | `true` | Enable automatic error recovery |
| `max_recovery_attempts` | `3` | Maximum recovery attempts per error |

### What Happens

1. Configuration is updated
2. Memory system uses new settings
3. Behavior changes according to configuration
4. Validation confirms configuration is valid

## Example 8: Programmatic Usage

### Scenario
You want to use the memory system programmatically in your own scripts.

### Python Script Example

```python
#!/usr/bin/env python3
"""
Example script showing programmatic memory system usage.
"""

from pathlib import Path
from src.memory_system.memory_system_core import MemorySystemCore
from src.memory_system.data_models import (
    ProjectConfig, Conversation, Message, AssetType
)
from datetime import datetime

def main():
    # 1. Initialize memory system
    project_path = Path("projects/my-custom-project")
    config = ProjectConfig(
        project_name="my-custom-project",
        project_type="video",
        objectives=["Create custom video sequence"]
    )
    
    memory_system = MemorySystemCore(project_path, config)
    
    # 2. Initialize project
    print("Initializing project...")
    success = memory_system.initialize_project(
        project_name="my-custom-project",
        project_type="video",
        objectives=["Create custom video sequence"]
    )
    print(f"Initialization: {'SUCCESS' if success else 'FAILED'}")
    
    # 3. Record a discussion
    print("\nRecording discussion...")
    conversation = Conversation(
        messages=[
            Message(
                role="user",
                content="Let's create a cinematic sequence",
                timestamp=datetime.now()
            ),
            Message(
                role="assistant",
                content="I'll help you create a cinematic sequence with visual coherence",
                timestamp=datetime.now()
            )
        ],
        session_id="session_001",
        start_time=datetime.now()
    )
    
    success = memory_system.record_discussion(conversation)
    print(f"Discussion recorded: {'SUCCESS' if success else 'FAILED'}")
    
    # 4. Add an asset
    print("\nAdding asset...")
    asset_path = Path("test_image.png")
    if asset_path.exists():
        success = memory_system.add_asset(asset_path, AssetType.IMAGE)
        print(f"Asset added: {'SUCCESS' if success else 'FAILED'}")
    else:
        print("Asset file not found, skipping")
    
    # 5. Update memory
    print("\nUpdating memory...")
    updates = {
        "objectives": [
            {
                "id": "obj_001",
                "description": "Create custom video sequence",
                "status": "active",
                "added": datetime.now().isoformat()
            }
        ],
        "decisions": [
            {
                "id": "dec_001",
                "description": "Use 3x3 grid for coherence",
                "rationale": "Optimal balance of detail and speed",
                "alternatives_considered": ["2x2", "4x4"],
                "timestamp": datetime.now().isoformat()
            }
        ]
    }
    
    success = memory_system.update_memory(updates)
    print(f"Memory updated: {'SUCCESS' if success else 'FAILED'}")
    
    # 6. Get project context
    print("\nRetrieving project context...")
    context = memory_system.get_project_context()
    print(f"Current phase: {context.current_state.get('phase', 'unknown')}")
    print(f"Progress: {context.current_state.get('progress_percentage', 0)}%")
    print(f"Objectives: {len(context.objectives)}")
    print(f"Decisions: {len(context.decisions)}")
    
    # 7. Validate project state
    print("\nValidating project state...")
    validation_result = memory_system.validate_project_state()
    print(f"Validation: {'PASS' if validation_result.is_valid else 'FAIL'}")
    
    if not validation_result.is_valid:
        print(f"Errors detected: {len(validation_result.errors)}")
        for error in validation_result.errors:
            print(f"  - {error.type}: {error.description}")
        
        # 8. Trigger recovery if needed
        print("\nAttempting recovery...")
        recovery_report = memory_system.trigger_recovery("automatic")
        print(f"Recovery: {'SUCCESS' if recovery_report.success else 'FAILED'}")
        print(f"Restored files: {len(recovery_report.restored_files)}")
        print(f"Lost files: {len(recovery_report.lost_files)}")
    
    print("\nDone!")

if __name__ == "__main__":
    main()
```

### Running the Script

```bash
# Make script executable
chmod +x my_memory_script.py

# Run script
python my_memory_script.py
```

### Expected Output

```
Initializing project...
Initialization: SUCCESS

Recording discussion...
Discussion recorded: SUCCESS

Adding asset...
Asset added: SUCCESS

Updating memory...
Memory updated: SUCCESS

Retrieving project context...
Current phase: initialization
Progress: 0%
Objectives: 1
Decisions: 1

Validating project state...
Validation: PASS

Done!
```

### What Happens

1. Memory system is initialized programmatically
2. Project structure is created
3. Discussion is recorded
4. Asset is added and indexed
5. Memory is updated with custom data
6. Project context is retrieved
7. Validation ensures everything is correct
8. Recovery is triggered if needed

## Summary

These examples demonstrate:
- Project initialization with memory system
- Automatic logging during pipeline execution
- Error detection and recovery workflows
- Project history review
- State export for backup
- Desperate recovery from corruption
- Configuration customization
- Programmatic usage in scripts

For more details, see [README.md](README.md) and [QUICK_REFERENCE.md](QUICK_REFERENCE.md).
