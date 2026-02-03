# Memory System Quick Reference

## Essential Commands

```bash
# Initialize project with memory system
python storycore.py init <project-name> --enable-memory

# Validate project state
python storycore.py memory-validate --project <project-name>

# Recover from errors
python storycore.py memory-recover --project <project-name>

# Update summaries
python storycore.py memory-summary --project <project-name>

# Export project state
python storycore.py memory-export --project <project-name> --output <path>
```

## Key Files

| File | Purpose | Location |
|------|---------|----------|
| `memory.json` | Project memory | `assistant/` |
| `variables.json` | Project variables | `assistant/` |
| `project_config.json` | Configuration | Root |
| `attachments_index.txt` | Asset index | `assets/` |
| `build_steps_raw.log` | Action log | `build_logs/` |
| `errors_detected.json` | Error tracking | `build_logs/` |
| `project_overview.txt` | Project summary | `summaries/` |
| `timeline.txt` | Event history | `summaries/` |

## Common Tasks

### Check if Memory System is Enabled

```bash
cat projects/<project-name>/project_config.json | grep memory_system_enabled
```

### View Project Overview

```bash
cat projects/<project-name>/summaries/project_overview.txt
```

### View Recent Actions

```bash
tail -n 50 projects/<project-name>/build_logs/build_steps_clean.txt
```

### View Asset Index

```bash
cat projects/<project-name>/assets/attachments_index.txt
```

### Check for Errors

```bash
cat projects/<project-name>/build_logs/errors_detected.json
```

### View Timeline

```bash
cat projects/<project-name>/summaries/timeline.txt
```

## Directory Structure

```
/PROJECT_NAME/
├── /assistant/              # LLM context
│   ├── /discussions_raw/
│   ├── /discussions_summary/
│   ├── memory.json
│   └── variables.json
├── /build_logs/            # Action tracking
│   ├── build_steps_raw.log
│   ├── build_steps_clean.txt
│   ├── errors_detected.json
│   └── recovery_attempts.log
├── /assets/                # Project assets
│   ├── /images/
│   ├── /audio/
│   ├── /video/
│   ├── /documents/
│   └── attachments_index.txt
├── /summaries/             # Consolidated info
│   ├── assets_summary.txt
│   ├── project_overview.txt
│   └── timeline.txt
└── /qa_reports/            # Quality assurance
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Memory system not creating files | Check `memory_system_enabled` in config |
| Invalid JSON errors | Run `memory-recover` |
| Missing files | Run `memory-validate` then `memory-recover` |
| State inconsistencies | Run `memory-recover` |
| Large log files | Archive old logs with date suffix |

## Configuration Options

```json
{
  "memory_system_config": {
    "auto_summarize": true,              // Auto-summarize discussions
    "summarization_threshold_kb": 50,    // Size trigger for summarization
    "auto_translate": true,              // Translate logs
    "target_languages": ["en", "fr"],    // Translation languages
    "error_detection_enabled": true,     // Enable error detection
    "auto_recovery_enabled": true,       // Enable auto-recovery
    "max_recovery_attempts": 3           // Max recovery attempts
  }
}
```

## Error Types

| Type | Description | Severity |
|------|-------------|----------|
| `missing_file` | Required file not found | Medium-High |
| `invalid_json` | JSON syntax error | High |
| `inconsistent_state` | Memory doesn't match reality | Medium |
| `corrupted_data` | Data corruption detected | Critical |

## Recovery Modes

| Mode | Command | Use Case |
|------|---------|----------|
| Automatic | `memory-recover` | Common errors |
| Desperate | `memory-recover --desperate` | Severe corruption |

## Best Practices

1. ✅ Enable memory system when initializing projects
2. ✅ Run validation after major operations
3. ✅ Review summaries for quick context
4. ✅ Use build logs for debugging
5. ✅ Configure for your needs
6. ❌ Don't manually edit JSON files (use API)
7. ❌ Don't delete log files (archive instead)
8. ❌ Don't use desperate recovery unless necessary

## Integration with Pipeline

Memory system automatically:
- Logs all pipeline commands
- Indexes generated assets
- Updates project state
- Detects errors
- Generates summaries

No manual intervention required!

## Quick Validation Workflow

```bash
# 1. Run validation
python storycore.py memory-validate --project my-project

# 2. If errors found, check details
cat projects/my-project/build_logs/errors_detected.json

# 3. Attempt recovery
python storycore.py memory-recover --project my-project

# 4. Verify fix
python storycore.py memory-validate --project my-project
```

## Quick Export Workflow

```bash
# 1. Update summaries
python storycore.py memory-summary --project my-project

# 2. Export everything
python storycore.py memory-export --project my-project --output exports/

# 3. Review exports
ls -la exports/my-project/
```

## File Format Examples

### memory.json (minimal)

```json
{
  "schema_version": "1.0",
  "last_updated": "2025-01-26T10:00:00Z",
  "objectives": [],
  "entities": [],
  "constraints": [],
  "decisions": [],
  "style_rules": [],
  "task_backlog": [],
  "current_state": {
    "phase": "initialization",
    "progress_percentage": 0,
    "active_tasks": [],
    "blockers": [],
    "last_activity": "2025-01-26T10:00:00Z"
  }
}
```

### variables.json (minimal)

```json
{
  "schema_version": "1.0",
  "last_updated": "2025-01-26T10:00:00Z",
  "variables": {}
}
```

### project_config.json (memory system section)

```json
{
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

## Support

For detailed documentation, see [README.md](README.md)

For issues:
1. Check error logs
2. Run validation
3. Attempt recovery
4. Review recovery logs
5. Report issue with logs attached
