# Troubleshooting Guide: Modular CLI Architecture

This guide helps you diagnose and resolve common issues with the modular CLI architecture.

**Requirements: 10.3, 9.5**

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Import Errors](#import-errors)
3. [Command Registration Issues](#command-registration-issues)
4. [Handler Errors](#handler-errors)
5. [Performance Issues](#performance-issues)
6. [Testing Issues](#testing-issues)
7. [Packaging and Deployment](#packaging-and-deployment)
8. [Getting Help](#getting-help)

## Quick Diagnostics

### Run Validation Script

The validation script checks for common issues:

```bash
python scripts/validate_modularization.py --export report.json
```

This checks:
- ✓ Directory structure
- ✓ Module size constraints
- ✓ Handler registration
- ✓ Import structure
- ✓ Documentation
- ✓ Test structure

### Check CLI Installation

```bash
# Verify CLI is installed
which storycore  # Unix/Mac
where storycore  # Windows

# Test basic functionality
storycore --help

# Check version
python -c "import src.cli; print(src.cli.__file__)"
```

### Verify Python Environment

```bash
# Check Python version (requires 3.8+)
python --version

# Check installed packages
pip list | grep storycore

# Verify dependencies
pip check
```

## Import Errors

### Error: `ModuleNotFoundError: No module named 'cli'`

**Cause:** Python can't find the `cli` module.

**Solutions:**

1. **Ensure correct working directory:**
   ```bash
   # Must run from project root
   cd /path/to/storycore-engine
   python -m src.storycore_cli
   ```

2. **Check directory structure:**
   ```bash
   # Verify cli directory exists
   ls -la src/cli/
   
   # Should show:
   # - __init__.py
   # - core.py
   # - registry.py
   # - handlers/
   # - utils/
   ```

3. **Reinstall package:**
   ```bash
   pip uninstall storycore-engine
   pip install -e .
   ```

### Error: `ImportError: cannot import name 'InitHandler'`

**Cause:** Trying to import handler from old monolithic module.

**Solution:** Update import path:

```python
# ❌ Old (incorrect)
from storycore_cli import InitHandler

# ✅ New (correct)
from src.cli.handlers.init import InitHandler
```

**Automated fix:**
```bash
python scripts/migrate_to_modular_cli.py --dir .
```

### Error: `ImportError: attempted relative import with no known parent package`

**Cause:** Running module directly instead of as package.

**Solution:**

```bash
# ❌ Don't do this
python src/cli/handlers/init.py

# ✅ Do this instead
python -m src.storycore_cli init my-project
```

### Error: `ModuleNotFoundError: No module named 'src'`

**Cause:** Python path not configured correctly.

**Solutions:**

1. **Install in development mode:**
   ```bash
   pip install -e .
   ```

2. **Add to PYTHONPATH:**
   ```bash
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"  # Unix/Mac
   set PYTHONPATH=%PYTHONPATH%;%CD%          # Windows
   ```

3. **Use absolute imports:**
   ```python
   import sys
   from pathlib import Path
   sys.path.insert(0, str(Path(__file__).parent.parent))
   ```

## Command Registration Issues

### Error: Command not found

**Symptoms:**
```bash
$ storycore mycommand
Error: Unknown command 'mycommand'
```

**Diagnosis:**

1. **Check handler file exists:**
   ```bash
   ls src/cli/handlers/mycommand.py
   ```

2. **Verify handler class:**
   ```python
   # Handler must inherit from BaseHandler
   from src.cli.base import BaseHandler
   
   class MyCommandHandler(BaseHandler):
       command_name = "mycommand"  # Must match
       description = "My command description"
   ```

3. **Check handler registration:**
   ```bash
   python -c "from src.cli.registry import CommandRegistry; \
              from argparse import ArgumentParser; \
              r = CommandRegistry(ArgumentParser()); \
              print(r.list_commands())"
   ```

**Solutions:**

1. **Ensure handler has required attributes:**
   ```python
   class MyCommandHandler(BaseHandler):
       command_name = "mycommand"  # Required
       description = "Description"  # Required
       
       def setup_parser(self, parser):  # Required
           pass
       
       def execute(self, args):  # Required
           return 0
   ```

2. **Verify file naming:**
   - File: `src/cli/handlers/mycommand.py`
   - Class: `MyCommandHandler`
   - Command: `mycommand`

3. **Check for syntax errors:**
   ```bash
   python -m py_compile src/cli/handlers/mycommand.py
   ```

### Error: Multiple handlers for same command

**Symptoms:**
```
Warning: Multiple handlers registered for command 'init'
```

**Cause:** Duplicate handler files or classes.

**Solution:**

1. **Find duplicates:**
   ```bash
   grep -r "command_name = \"init\"" src/cli/handlers/
   ```

2. **Remove or rename duplicate:**
   ```bash
   # Rename duplicate
   mv src/cli/handlers/init_old.py src/cli/handlers/init_backup.py.bak
   ```

## Handler Errors

### Error: Handler execution fails

**Symptoms:**
```bash
$ storycore grid --project test
✗ Error executing command: 'NoneType' object has no attribute 'get'
```

**Diagnosis:**

1. **Enable debug logging:**
   ```bash
   export STORYCORE_LOG_LEVEL=DEBUG
   storycore grid --project test
   ```

2. **Check handler implementation:**
   ```python
   # Add debug prints
   def execute(self, args):
       print(f"DEBUG: args = {args}")
       print(f"DEBUG: project = {args.project}")
       # ... rest of implementation
   ```

3. **Validate arguments:**
   ```bash
   storycore grid --help  # Check required arguments
   ```

**Solutions:**

1. **Add error handling:**
   ```python
   def execute(self, args):
       try:
           # Handler logic
           return 0
       except Exception as e:
           self.print_error(f"Handler error: {e}")
           return 1
   ```

2. **Validate inputs:**
   ```python
   def execute(self, args):
       if not args.project:
           self.print_error("Project path required")
           return 1
       
       if not Path(args.project).exists():
           self.print_error(f"Project not found: {args.project}")
           return 1
   ```

### Error: Project loading fails

**Symptoms:**
```
✗ Error: Could not load project configuration
```

**Solutions:**

1. **Check project structure:**
   ```bash
   # Verify project.json exists
   ls -la my-project/project.json
   
   # Validate JSON syntax
   python -m json.tool my-project/project.json
   ```

2. **Use utility functions:**
   ```python
   from src.cli.utils.project import load_project_config, validate_project_structure
   
   # Load with error handling
   try:
       config = load_project_config(project_path)
   except Exception as e:
       print(f"Error loading project: {e}")
   
   # Validate structure
   is_valid, errors = validate_project_structure(project_path)
   if not is_valid:
       print(f"Invalid project: {errors}")
   ```

## Performance Issues

### Issue: Slow CLI startup

**Symptoms:** CLI takes >1 second to start.

**Diagnosis:**

```bash
# Time CLI startup
time storycore --help

# Profile imports
python -X importtime -m src.storycore_cli --help 2>&1 | grep "import time"
```

**Solutions:**

1. **Use lazy imports:**
   ```python
   # ❌ Don't import at module level
   from src.engines.grid_generator import GridGenerator
   
   # ✅ Import in method
   def execute(self, args):
       from src.engines.grid_generator import GridGenerator
       generator = GridGenerator()
   ```

2. **Check for heavy dependencies:**
   ```bash
   # Find slow imports
   python -X importtime -m src.storycore_cli 2>&1 | sort -n -k 2
   ```

3. **Optimize handler registration:**
   ```python
   # Registry should use lazy loading
   def get_handler(self, command):
       if command not in self._handlers:
           self._load_handler(command)  # Load on demand
       return self._handlers[command]
   ```

### Issue: High memory usage

**Symptoms:** CLI uses excessive memory.

**Diagnosis:**

```bash
# Monitor memory usage
python -m memory_profiler src/storycore_cli.py grid --project test
```

**Solutions:**

1. **Use generators instead of lists:**
   ```python
   # ❌ Loads all into memory
   files = [f for f in Path(dir).rglob('*.py')]
   
   # ✅ Processes one at a time
   for file in Path(dir).rglob('*.py'):
       process(file)
   ```

2. **Clean up resources:**
   ```python
   def execute(self, args):
       try:
           # Process data
           result = process_large_file(args.input)
           return 0
       finally:
           # Clean up
           del result
           gc.collect()
   ```

## Testing Issues

### Error: Tests fail after migration

**Symptoms:**
```bash
$ pytest tests/
ImportError: cannot import name 'GridHandler'
```

**Solutions:**

1. **Update test imports:**
   ```python
   # ❌ Old
   from storycore_cli import GridHandler
   
   # ✅ New
   from src.cli.handlers.grid import GridHandler
   ```

2. **Run migration on tests:**
   ```bash
   python scripts/migrate_to_modular_cli.py --dir tests/
   ```

3. **Update test fixtures:**
   ```python
   # Update fixture imports
   @pytest.fixture
   def cli_core():
       from src.cli.core import CLICore
       return CLICore()
   ```

### Error: Coverage reports incorrect

**Symptoms:** Coverage shows 0% despite tests passing.

**Solutions:**

1. **Configure coverage correctly:**
   ```bash
   # .coveragerc or pyproject.toml
   [tool.coverage.run]
   source = ["src/cli"]
   omit = ["*/tests/*", "*/__pycache__/*"]
   ```

2. **Run with correct source:**
   ```bash
   pytest --cov=src/cli --cov-report=html tests/
   ```

3. **Check coverage report:**
   ```bash
   coverage report -m
   coverage html
   open htmlcov/index.html
   ```

## Packaging and Deployment

### Error: Package build fails

**Symptoms:**
```bash
$ python -m build
ERROR: Could not find module 'src.cli'
```

**Solutions:**

1. **Check MANIFEST.in:**
   ```
   recursive-include src *.py
   recursive-include src/cli *.py
   ```

2. **Verify setup.py:**
   ```python
   packages=find_packages(where="."),
   package_dir={"": "."},
   ```

3. **Clean build artifacts:**
   ```bash
   rm -rf build/ dist/ *.egg-info
   python -m build
   ```

### Error: Installed package missing modules

**Symptoms:**
```bash
$ pip install dist/storycore-engine-0.1.0.tar.gz
$ storycore --help
ModuleNotFoundError: No module named 'cli'
```

**Solutions:**

1. **Check package contents:**
   ```bash
   tar -tzf dist/storycore-engine-0.1.0.tar.gz | grep cli
   ```

2. **Verify __init__.py files:**
   ```bash
   # Each directory needs __init__.py
   touch src/cli/__init__.py
   touch src/cli/handlers/__init__.py
   touch src/cli/utils/__init__.py
   ```

3. **Reinstall in development mode:**
   ```bash
   pip uninstall storycore-engine
   pip install -e .
   ```

### Error: Entry point not found

**Symptoms:**
```bash
$ storycore
bash: storycore: command not found
```

**Solutions:**

1. **Check entry point configuration:**
   ```python
   # setup.py or pyproject.toml
   entry_points={
       "console_scripts": [
           "storycore=src.storycore_cli:main",
       ],
   }
   ```

2. **Reinstall package:**
   ```bash
   pip uninstall storycore-engine
   pip install -e .
   ```

3. **Check PATH:**
   ```bash
   # Unix/Mac
   echo $PATH | grep -o "[^:]*bin"
   
   # Windows
   echo %PATH%
   ```

## Getting Help

### Self-Service Resources

1. **Run validation:**
   ```bash
   python scripts/validate_modularization.py --export report.json
   ```

2. **Check documentation:**
   - [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
   - [CLI_ARCHITECTURE.md](./CLI_ARCHITECTURE.md)
   - [CLI_EXTENSIBILITY.md](./CLI_EXTENSIBILITY.md)

3. **Search issues:**
   - [GitHub Issues](https://github.com/storycore/storycore-engine/issues)

### Reporting Issues

When reporting issues, include:

1. **System information:**
   ```bash
   python --version
   pip list | grep storycore
   uname -a  # Unix/Mac
   systeminfo  # Windows
   ```

2. **Validation report:**
   ```bash
   python scripts/validate_modularization.py --export report.json
   # Attach report.json
   ```

3. **Error output:**
   ```bash
   # Run with debug logging
   export STORYCORE_LOG_LEVEL=DEBUG
   storycore <command> 2>&1 | tee error.log
   # Attach error.log
   ```

4. **Minimal reproduction:**
   ```bash
   # Provide exact commands to reproduce
   storycore init test-project
   storycore grid --project test-project
   # Error occurs here
   ```

### Community Support

- **GitHub Discussions:** Ask questions and share solutions
- **Issue Tracker:** Report bugs and request features
- **Documentation:** Contribute improvements

---

**Still having issues?** Open an issue with the information above, and we'll help you resolve it!
