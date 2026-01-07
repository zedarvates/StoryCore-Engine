# Feature: MVP CLI Bootstrap (init + validate + export)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Build a minimal local CLI tool in Python that provides the foundational commands for StoryCore-Engine project management. The CLI will enable project initialization with proper data contracts, validation of JSON schemas, and export functionality for hackathon demonstrations.

## User Story

As a StoryCore-Engine developer
I want to initialize, validate, and export projects via CLI commands
So that I can quickly bootstrap projects with proper data contracts and demonstrate the pipeline in hackathon settings

## Problem Statement

The StoryCore-Engine project needs a foundational CLI tool to:
- Create new projects with proper JSON data contracts and folder structure
- Validate project files against defined schemas to catch errors early
- Export project snapshots for demonstration and sharing
- Provide reproducible project initialization with deterministic seeds

## Solution Statement

Implement a Python CLI using argparse (zero dependencies, hackathon-friendly) with three core commands:
- `storycore init` - Creates project structure with valid JSON contracts
- `storycore validate` - Validates JSON files against schemas
- `storycore export` - Creates timestamped export snapshots

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: Project initialization, data validation, export system
**Dependencies**: Python 3.8+, built-in libraries only (argparse, json, pathlib, datetime)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.kiro/docs/Docs initiales/DOCUMENT 51 — DATA CONTRACT SPECIFI.txt` (lines 1-150) - Why: Contains complete data contract specifications and JSON schemas
- `.kiro/docs/Docs initiales/StoryCore-Engine — Vision Code.txt` (lines 1-50) - Why: Contains project.json and storyboard.json example structures
- `.kiro/docs/Docs initiales/StoryCore-Engine — Requirements Spe.txt` (lines 1-100) - Why: Contains project structure and requirements
- `.kiro/docs/Docs initiales/Definition of Done Kiro-friendly C.txt` - Why: Contains validation criteria and success metrics

### New Files to Create

- `src/storycore_cli.py` - Main CLI entry point with argparse commands
- `src/schemas.py` - JSON schema definitions for validation
- `src/project_manager.py` - Project initialization and management logic
- `src/validator.py` - JSON validation logic
- `src/exporter.py` - Export functionality
- `setup.py` - Package setup for CLI installation
- `requirements.txt` - Dependencies (empty for hackathon mode)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Python argparse Documentation](https://docs.python.org/3/library/argparse.html)
  - Specific section: Subcommands and argument parsing
  - Why: Required for implementing CLI with subcommands
- [Python json Documentation](https://docs.python.org/3/library/json.html)
  - Specific section: JSON encoding and decoding
  - Why: Required for JSON file manipulation
- [Python pathlib Documentation](https://docs.python.org/3/library/pathlib.html)
  - Specific section: Path manipulation and file operations
  - Why: Required for cross-platform file operations

### Patterns to Follow

**Project Structure Pattern:**
```
storycore-engine/
├── src/
│   ├── storycore_cli.py      # Main CLI entry
│   ├── schemas.py            # JSON schemas
│   ├── project_manager.py    # Project operations
│   ├── validator.py          # Validation logic
│   └── exporter.py           # Export logic
├── assets/
│   ├── images/
│   └── audio/
├── exports/
└── setup.py
```

**Error Handling Pattern:**
```python
try:
    # Operation
    pass
except SpecificError as e:
    print(f"Error: {e}")
    sys.exit(1)
```

**JSON Schema Validation Pattern:**
```python
def validate_schema(data, schema):
    # Simple validation without external dependencies
    required_fields = schema.get('required', [])
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Set up the basic CLI structure and core utilities needed for all commands.

**Tasks:**
- Create main CLI entry point with argparse
- Define JSON schemas based on data contract specifications
- Set up project structure and basic error handling
- Create utility functions for file operations

### Phase 2: Core Implementation

Implement the three main CLI commands with their core functionality.

**Tasks:**
- Implement `init` command with project.json and storyboard.json generation
- Implement `validate` command with schema validation
- Implement `export` command with timestamped snapshots
- Add proper logging and error handling

### Phase 3: Integration

Ensure all commands work together and follow the data contract specifications.

**Tasks:**
- Test command integration and data flow
- Validate against data contract requirements
- Add CLI help and documentation
- Ensure reproducible behavior with seeds

### Phase 4: Testing & Validation

Validate the CLI meets all requirements and works in hackathon scenarios.

**Tasks:**
- Test all commands with various inputs
- Validate JSON schema compliance
- Test export functionality
- Verify reproducible initialization

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE src/schemas.py

- **IMPLEMENT**: JSON schema definitions for project.json and storyboard.json
- **PATTERN**: Based on data contract specifications in DOCUMENT 51
- **IMPORTS**: No external dependencies, use built-in dict structures
- **GOTCHA**: Keep schemas simple for hackathon, focus on required fields only
- **VALIDATE**: `python -c "from src.schemas import PROJECT_SCHEMA, STORYBOARD_SCHEMA; print('Schemas loaded')"`

### CREATE src/project_manager.py

- **IMPLEMENT**: Project initialization logic with folder creation and JSON generation
- **PATTERN**: Use pathlib for cross-platform path operations
- **IMPORTS**: `from pathlib import Path`, `import json`, `from datetime import datetime`
- **GOTCHA**: Ensure deterministic seed generation and proper timestamp formatting
- **VALIDATE**: `python -c "from src.project_manager import ProjectManager; pm = ProjectManager(); print('ProjectManager loaded')"`

### CREATE src/validator.py

- **IMPLEMENT**: JSON validation logic without external dependencies
- **PATTERN**: Simple field checking and type validation
- **IMPORTS**: `import json`, `from pathlib import Path`
- **GOTCHA**: Provide clear error messages for validation failures
- **VALIDATE**: `python -c "from src.validator import Validator; v = Validator(); print('Validator loaded')"`

### CREATE src/exporter.py

- **IMPLEMENT**: Export functionality with timestamped directories
- **PATTERN**: Copy files to exports/run-YYYYMMDD-HHMMSS/ structure
- **IMPORTS**: `import shutil`, `from pathlib import Path`, `from datetime import datetime`
- **GOTCHA**: Handle missing files gracefully, create QA report stub
- **VALIDATE**: `python -c "from src.exporter import Exporter; e = Exporter(); print('Exporter loaded')"`

### CREATE src/storycore_cli.py

- **IMPLEMENT**: Main CLI entry point with argparse subcommands
- **PATTERN**: Use argparse with subparsers for init, validate, export commands
- **IMPORTS**: `import argparse`, `import sys`, `from pathlib import Path`
- **GOTCHA**: Provide helpful error messages and command descriptions
- **VALIDATE**: `python src/storycore_cli.py --help`

### UPDATE src/storycore_cli.py

- **IMPLEMENT**: init command implementation
- **PATTERN**: Call ProjectManager to create project structure
- **IMPORTS**: `from .project_manager import ProjectManager`
- **GOTCHA**: Handle existing project detection and overwrite confirmation
- **VALIDATE**: `python src/storycore_cli.py init test-project`

### UPDATE src/storycore_cli.py

- **IMPLEMENT**: validate command implementation
- **PATTERN**: Call Validator to check JSON files
- **IMPORTS**: `from .validator import Validator`
- **GOTCHA**: Check for file existence before validation
- **VALIDATE**: `python src/storycore_cli.py validate`

### UPDATE src/storycore_cli.py

- **IMPLEMENT**: export command implementation
- **PATTERN**: Call Exporter to create timestamped snapshot
- **IMPORTS**: `from .exporter import Exporter`
- **GOTCHA**: Handle missing project files gracefully
- **VALIDATE**: `python src/storycore_cli.py export`

### CREATE setup.py

- **IMPLEMENT**: Package setup for CLI installation
- **PATTERN**: Simple setup.py with console_scripts entry point
- **IMPORTS**: `from setuptools import setup, find_packages`
- **GOTCHA**: Keep dependencies minimal for hackathon
- **VALIDATE**: `python setup.py --help`

### CREATE requirements.txt

- **IMPLEMENT**: Empty requirements file (no external dependencies)
- **PATTERN**: Comment explaining zero-dependency approach
- **IMPORTS**: None
- **GOTCHA**: Document that this is intentionally empty for hackathon
- **VALIDATE**: `cat requirements.txt`

### UPDATE src/project_manager.py

- **IMPLEMENT**: Generate valid project.json with all required fields
- **PATTERN**: Follow data contract schema from DOCUMENT 51
- **IMPORTS**: `import uuid`, `from datetime import datetime`
- **GOTCHA**: Ensure all required fields from schema are present
- **VALIDATE**: `python -c "from src.project_manager import ProjectManager; pm = ProjectManager(); pm.init_project('test'); print('Project created')"`

### UPDATE src/project_manager.py

- **IMPLEMENT**: Generate valid storyboard.json with 1 scene, 3 shots placeholders
- **PATTERN**: Follow storyboard schema with minimal placeholder data
- **IMPORTS**: Already imported
- **GOTCHA**: Include all required prompt_modules and metadata
- **VALIDATE**: `python -c "import json; data = json.load(open('test/storyboard.json')); print(f'Shots: {len(data[\"shots\"])}')" `

### UPDATE src/validator.py

- **IMPLEMENT**: Validate project.json against schema
- **PATTERN**: Check required fields and basic type validation
- **IMPORTS**: `from .schemas import PROJECT_SCHEMA`
- **GOTCHA**: Provide specific error messages for missing fields
- **VALIDATE**: `python -c "from src.validator import Validator; v = Validator(); v.validate_project('test/project.json'); print('Validation passed')"`

### UPDATE src/validator.py

- **IMPLEMENT**: Validate storyboard.json against schema
- **PATTERN**: Check required fields and shot structure
- **IMPORTS**: `from .schemas import STORYBOARD_SCHEMA`
- **GOTCHA**: Validate nested shot objects and prompt_modules
- **VALIDATE**: `python -c "from src.validator import Validator; v = Validator(); v.validate_storyboard('test/storyboard.json'); print('Validation passed')"`

### UPDATE src/exporter.py

- **IMPLEMENT**: Create timestamped export directory
- **PATTERN**: exports/run-YYYYMMDD-HHMMSS/ format
- **IMPORTS**: Already imported
- **GOTCHA**: Handle timezone consistently, use UTC
- **VALIDATE**: `python -c "from src.exporter import Exporter; e = Exporter(); e.export_project('.'); print('Export created')"`

### UPDATE src/exporter.py

- **IMPLEMENT**: Copy project files to export directory
- **PATTERN**: Copy project.json, storyboard.json if they exist
- **IMPORTS**: Already imported
- **GOTCHA**: Handle missing files gracefully, don't fail export
- **VALIDATE**: `ls exports/run-*/`

### UPDATE src/exporter.py

- **IMPLEMENT**: Generate qa_report.json stub
- **PATTERN**: Create minimal QA report structure with placeholder data
- **IMPORTS**: Already imported
- **GOTCHA**: Follow QA report schema from documentation
- **VALIDATE**: `python -c "import json; data = json.load(open('exports/run-*/qa_report.json')); print('QA report created')"`

---

## TESTING STRATEGY

### Unit Tests

Create simple test functions for each module without external test frameworks to maintain zero dependencies.

**Test Coverage:**
- ProjectManager: project creation, JSON generation
- Validator: schema validation, error handling
- Exporter: export creation, file copying
- CLI: command parsing, error handling

### Integration Tests

Test complete workflows from CLI commands to file system changes.

**Test Scenarios:**
- Full init → validate → export workflow
- Error handling for missing files
- Validation failure scenarios
- Export with missing project files

### Edge Cases

- Invalid JSON files
- Missing directories
- Permission errors
- Existing project overwrite
- Empty project directories

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
python -m py_compile src/*.py
python -c "import src.storycore_cli; print('Syntax OK')"
```

### Level 2: Unit Tests

```bash
python -c "from src.schemas import PROJECT_SCHEMA, STORYBOARD_SCHEMA; print('Schemas valid')"
python -c "from src.project_manager import ProjectManager; ProjectManager().init_project('test-init'); print('Init works')"
python -c "from src.validator import Validator; Validator().validate_project('test-init/project.json'); print('Validation works')"
python -c "from src.exporter import Exporter; Exporter().export_project('test-init'); print('Export works')"
```

### Level 3: Integration Tests

```bash
python src/storycore_cli.py init test-integration
python src/storycore_cli.py validate --project test-integration
python src/storycore_cli.py export --project test-integration
ls test-integration/
ls exports/
```

### Level 4: Manual Validation

```bash
# Test complete workflow
python src/storycore_cli.py init demo-project
cat demo-project/project.json | python -m json.tool
cat demo-project/storyboard.json | python -m json.tool
python src/storycore_cli.py validate --project demo-project
python src/storycore_cli.py export --project demo-project
ls exports/run-*/
cat exports/run-*/qa_report.json | python -m json.tool
```

### Level 5: Error Handling Validation

```bash
# Test error scenarios
python src/storycore_cli.py validate --project nonexistent
echo '{"invalid": "json"}' > invalid.json && python src/storycore_cli.py validate --file invalid.json
python src/storycore_cli.py export --project nonexistent
```

---

## ACCEPTANCE CRITERIA

- [ ] `storycore init <project>` creates valid project.json with all required fields
- [ ] `storycore init <project>` creates valid storyboard.json with 1 scene, 3 shot placeholders
- [ ] `storycore init <project>` creates assets/images/ and assets/audio/ directories
- [ ] `storycore validate` checks project.json and storyboard.json schemas
- [ ] `storycore validate` prints clear pass/fail messages
- [ ] `storycore export` creates exports/run-YYYYMMDD-HHMMSS/ directory
- [ ] `storycore export` copies project.json and storyboard.json to export
- [ ] `storycore export` generates qa_report.json stub
- [ ] All commands work without external dependencies
- [ ] CLI provides helpful error messages and usage information
- [ ] Project initialization is reproducible with deterministic seeds
- [ ] All JSON files validate against their schemas
- [ ] Export functionality handles missing files gracefully

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full CLI workflow tested (init → validate → export)
- [ ] No external dependencies required
- [ ] JSON schemas match data contract specifications
- [ ] Error handling provides clear user feedback
- [ ] CLI help documentation is complete
- [ ] Export creates proper timestamped directories
- [ ] QA report stub follows documented schema

---

## NOTES

**Design Decisions:**
- Using argparse instead of Click/Typer to maintain zero external dependencies for hackathon
- Simple schema validation without jsonschema library to keep dependencies minimal
- Deterministic seed generation using project name hash for reproducibility
- UTC timestamps for consistent export naming across timezones

**Trade-offs:**
- Simplified validation vs full JSON Schema compliance (acceptable for MVP)
- Zero dependencies vs richer CLI features (hackathon requirement)
- Minimal error handling vs comprehensive validation (can be enhanced later)

**Future Enhancements:**
- Add proper JSON Schema validation with jsonschema library
- Implement rich CLI with Click or Typer
- Add configuration file support
- Implement project templates and customization options
