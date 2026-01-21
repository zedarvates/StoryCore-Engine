# Migration Guide: Modular CLI Architecture

This guide helps you migrate from the monolithic `storycore_cli.py` to the new modular CLI architecture.

**Requirements: 10.3, 9.5**

## Table of Contents

1. [Overview](#overview)
2. [What Changed](#what-changed)
3. [Migration Steps](#migration-steps)
4. [Breaking Changes](#breaking-changes)
5. [Import Updates](#import-updates)
6. [Testing Your Migration](#testing-your-migration)
7. [Rollback Plan](#rollback-plan)

## Overview

The StoryCore-Engine CLI has been refactored from a monolithic 1797-line file into a modular architecture with:

- **Individual command handlers** (<300 lines each)
- **Shared utilities** for common functionality
- **Centralized error handling**
- **Plugin-style registration system**
- **Comprehensive test coverage**

### Benefits

✅ **Easier maintenance** - Each command is in its own module  
✅ **Better testability** - Isolated components with clear interfaces  
✅ **Improved extensibility** - Add new commands without modifying existing code  
✅ **Backward compatibility** - Existing CLI commands work identically  

## What Changed

### Directory Structure

**Before:**
```
src/
├── storycore_cli.py (1797 lines)
└── engines/
    ├── project_manager.py
    ├── grid_generator.py
    └── ...
```

**After:**
```
src/
├── storycore_cli.py (minimal entry point)
├── cli/
│   ├── core.py (CLI orchestration)
│   ├── registry.py (handler registration)
│   ├── errors.py (error handling)
│   ├── base.py (base handler class)
│   ├── handlers/ (individual command handlers)
│   │   ├── init.py
│   │   ├── grid.py
│   │   ├── promote.py
│   │   └── ...
│   └── utils/ (shared utilities)
│       ├── project.py
│       ├── validation.py
│       └── output.py
└── engines/ (unchanged)
```

### Command-Line Interface

**No changes** - All commands work exactly as before:

```bash
# These commands work identically
storycore init my-project
storycore grid --project my-project
storycore promote --project my-project
storycore qa --project my-project
```

## Migration Steps

### Step 1: Backup Your Code

```bash
# Create a backup branch
git checkout -b backup-before-modular-cli
git commit -am "Backup before modular CLI migration"
git checkout main
```

### Step 2: Update Dependencies

```bash
# Install/update required packages
pip install -r requirements.txt

# Install development dependencies (optional)
pip install -e ".[dev]"
```

### Step 3: Run Migration Script

The migration script automatically updates imports in your codebase:

```bash
# Dry run to see what would change
python scripts/migrate_to_modular_cli.py --dry-run

# Apply changes
python scripts/migrate_to_modular_cli.py

# Migrate specific directory
python scripts/migrate_to_modular_cli.py --dir ./my_custom_code
```

### Step 4: Validate Modularization

```bash
# Run validation checks
python scripts/validate_modularization.py

# Export validation report
python scripts/validate_modularization.py --export validation-report.json
```

### Step 5: Update Custom Code

If you have custom code that imports from `storycore_cli`, update the imports manually:

**Before:**
```python
from storycore_cli import InitHandler, GridHandler
from storycore_cli import load_project, validate_project
```

**After:**
```python
from src.cli.handlers.init import InitHandler
from src.cli.handlers.grid import GridHandler
from src.cli.utils.project import load_project_config, validate_project_structure
```

### Step 6: Run Tests

```bash
# Run all tests
pytest tests/

# Run specific test suites
pytest tests/unit/
pytest tests/integration/

# Check test coverage
pytest --cov=src/cli --cov-report=html
```

### Step 7: Verify CLI Functionality

```bash
# Test basic commands
storycore --help
storycore init test-project
storycore grid --project test-project

# Verify all commands are registered
storycore --help | grep "Available commands"
```

## Breaking Changes

### Import Paths

**Breaking:** Direct imports from `storycore_cli` module

**Before:**
```python
from storycore_cli import CLIError, UserError
```

**After:**
```python
from src.cli.errors import CLIError, UserError
```

**Migration:** Use the migration script or update imports manually.

### Function Signatures

**No breaking changes** - All public APIs maintain the same signatures.

### Configuration Files

**No breaking changes** - Project configuration files remain unchanged.

### Command-Line Arguments

**No breaking changes** - All CLI arguments work identically.

## Import Updates

### Common Import Patterns

| Old Import | New Import |
|------------|------------|
| `from storycore_cli import CLIError` | `from src.cli.errors import CLIError` |
| `from storycore_cli import InitHandler` | `from src.cli.handlers.init import InitHandler` |
| `from storycore_cli import load_project` | `from src.cli.utils.project import load_project_config` |
| `from storycore_cli import validate_project` | `from src.cli.utils.project import validate_project_structure` |
| `import storycore_cli` | `from src import storycore_cli` |

### Handler Imports

```python
# Old (monolithic)
from storycore_cli import (
    InitHandler,
    GridHandler,
    PromoteHandler,
    QAHandler,
    ExportHandler
)

# New (modular)
from src.cli.handlers.init import InitHandler
from src.cli.handlers.grid import GridHandler
from src.cli.handlers.promote import PromoteHandler
from src.cli.handlers.qa import QAHandler
from src.cli.handlers.export import ExportHandler
```

### Utility Imports

```python
# Old (monolithic)
from storycore_cli import (
    load_project,
    validate_project,
    print_success,
    print_error
)

# New (modular)
from src.cli.utils.project import load_project_config, validate_project_structure
from src.cli.utils.output import print_success, print_error
```

## Testing Your Migration

### Automated Tests

```bash
# Run validation script
python scripts/validate_modularization.py

# Expected output:
# ✓ PASS: Directory Structure
# ✓ PASS: Module Size Constraint
# ✓ PASS: Handler Registration
# ✓ PASS: Import Structure
# ✓ PASS: Documentation
# ✓ PASS: Test Structure
```

### Manual Testing

1. **Test CLI Entry Point:**
   ```bash
   storycore --help
   ```

2. **Test Each Command:**
   ```bash
   storycore init test-migration
   storycore grid --project test-migration
   storycore promote --project test-migration
   storycore qa --project test-migration
   storycore export --project test-migration
   ```

3. **Test Error Handling:**
   ```bash
   # Should show helpful error message
   storycore grid --project nonexistent
   ```

4. **Test Help System:**
   ```bash
   storycore grid --help
   storycore promote --help
   ```

### Integration Testing

```bash
# Run integration test suite
pytest tests/integration/test_cli_backward_compatibility.py -v

# Test complete workflow
pytest tests/integration/test_command_workflows.py -v
```

## Rollback Plan

If you encounter issues, you can rollback to the monolithic version:

### Option 1: Git Rollback

```bash
# Restore from backup branch
git checkout backup-before-modular-cli
git checkout -b main-rollback
```

### Option 2: Selective Rollback

```bash
# Restore specific files
git checkout HEAD~1 src/storycore_cli.py

# Remove modular CLI directory
rm -rf src/cli/
```

### Option 3: Version Pinning

```bash
# Install previous version from PyPI
pip install storycore-engine==0.0.9
```

## Common Issues and Solutions

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed troubleshooting guidance.

### Quick Fixes

**Issue:** `ModuleNotFoundError: No module named 'cli'`  
**Solution:** Ensure you're running from the project root and `src/cli/` exists.

**Issue:** `ImportError: cannot import name 'InitHandler'`  
**Solution:** Update import to `from src.cli.handlers.init import InitHandler`

**Issue:** Commands not found  
**Solution:** Reinstall package: `pip install -e .`

## Support

For additional help:

- **Documentation:** [docs/](../docs/)
- **Issues:** [GitHub Issues](https://github.com/storycore/storycore-engine/issues)
- **Validation:** Run `python scripts/validate_modularization.py`

## Next Steps

After successful migration:

1. ✅ Review [CLI_ARCHITECTURE.md](./CLI_ARCHITECTURE.md) for architecture details
2. ✅ Read [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines
3. ✅ Explore [CLI_EXTENSIBILITY.md](./CLI_EXTENSIBILITY.md) for adding new commands
4. ✅ Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues

---

**Migration completed successfully?** You're now using the modular CLI architecture! 🎉
