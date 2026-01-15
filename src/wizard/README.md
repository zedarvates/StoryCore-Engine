# Interactive Project Setup Wizard - MVP

## Overview

The Interactive Project Setup Wizard provides a user-friendly CLI interface for creating new StoryCore-Engine projects. This MVP implementation covers the essential functionality needed for the concours.

## Features Implemented (MVP)

### ✅ Core Components
- **Data Models** (`models.py`) - WizardState and ProjectConfiguration
- **Definitions** (`definitions.py`) - 5 genres and 3 formats
- **Validator Service** (`validator_service.py`) - Input validation
- **Input Handler** (`input_handler.py`) - CLI interaction
- **Wizard Orchestrator** (`wizard_orchestrator.py`) - Main wizard flow
- **Config Builder** (`config_builder.py`) - Configuration generation
- **Story Handler** (`story_handler.py`) - Manual story input
- **File Writer** (`file_writer.py`) - Project file creation
- **Error Handler** (`error_handler.py`) - Error management

### ✅ CLI Integration
- `storycore init` - Launches interactive wizard
- `storycore init --interactive` - Forces wizard mode
- `storycore init project-name` - Legacy mode (direct creation)

### ✅ Project Creation
- Creates project directory structure
- Generates `project.json` with complete configuration
- Creates `README.md` with project information
- Sets up basic directory structure (assets, exports, etc.)

## Usage

### Interactive Mode (Recommended)
```bash
# Launch wizard without project name
python storycore.py init

# Force interactive mode
python storycore.py init --interactive

# Specify base directory
python storycore.py init --path /path/to/projects
```

### Legacy Mode
```bash
# Direct project creation (uses existing project manager)
python storycore.py init my-project-name
```

## Wizard Flow

1. **Welcome Screen** - Introduction and instructions
2. **Project Name** - Collect unique project name with validation
3. **Format Selection** - Choose from 3 formats (Court/Moyen/Long-métrage)
4. **Duration** - Set duration within format constraints
5. **Genre Selection** - Choose from 5 genres (Action, Drame, Sci-Fi, Horreur, Comédie)
6. **Story Input** - Manual story entry (single-line or multi-line)
7. **Summary & Confirmation** - Review and confirm settings
8. **Project Creation** - Generate files and directory structure

## Configuration Generated

The wizard generates a complete `project.json` with:

```json
{
  "schema_version": "1.0",
  "project_name": "my-project",
  "format": {
    "key": "court_metrage",
    "name": "Court-métrage",
    "duration_range": [1, 15],
    "actual_duration": 10,
    "shot_duration_avg": 4.0,
    "estimated_shot_count": 150
  },
  "duration_minutes": 10,
  "genre": {
    "key": "action",
    "name": "Action",
    "style_defaults": { ... }
  },
  "story": "User's story content...",
  "style_config": {
    "visual": { ... },
    "cinematography": { ... }
  },
  "technical_specs": {
    "resolution": "4K",
    "frame_rate": 24,
    "aspect_ratio": "16:9",
    "color_space": "Rec.709",
    "audio_sample_rate": 48000,
    "audio_channels": 2
  }
}
```

## Testing

### Unit Tests
```bash
cd src/wizard
python -m pytest test_integration.py -v
python -m pytest test_wizard_orchestrator.py -v
```

### Manual Testing
```bash
# Test interactive wizard
python storycore.py init --interactive

# Test legacy mode
python storycore.py init test-project
```

## MVP Limitations

The following features are **deferred to post-concours**:

- ❌ State persistence (resume functionality)
- ❌ AI story generation
- ❌ File import (.txt, .md, .json)
- ❌ 17 complete genres with sub-genres
- ❌ 7 complete formats
- ❌ Advanced navigation (back, edit previous answers)
- ❌ Property-based tests
- ❌ 90% test coverage

## Next Steps (Post-Concours)

1. **State Persistence** - Save wizard state to `.wizard-state.json`
2. **AI Integration** - Add AI story generation option
3. **File Import** - Support importing stories from files
4. **Extended Definitions** - Add complete genre and format sets
5. **Advanced Navigation** - Back/forward navigation, edit mode
6. **Comprehensive Testing** - Property-based tests, full coverage

## Architecture Notes

### Error Handling
- Validation errors allow retry
- File system errors provide specific guidance
- Keyboard interrupts are handled gracefully
- Unexpected errors show debug information

### Extensibility
- Modular design allows easy addition of new components
- Genre and format definitions are data-driven
- Validation is pluggable and reusable
- Input handling is abstracted and testable

### Performance
- Minimal dependencies (uses standard library)
- Fast startup and execution
- Efficient file operations
- Memory-conscious design

## Files Created

When a project is created, the wizard generates:

```
my-project/
├── project.json          # Main configuration
├── README.md            # Project documentation
├── assets/              # User assets
├── exports/             # Generated exports
├── storyboard/          # Storyboard files (future)
├── audio/               # Audio files (future)
└── video/               # Video files (future)
```

## Integration with StoryCore Pipeline

The generated `project.json` is compatible with the existing StoryCore-Engine pipeline:

```bash
cd my-project
storycore grid           # Generate master coherence sheet
storycore promote        # Upscale panels
storycore qa            # Quality analysis
storycore export        # Export final package
```

## MVP Status: ✅ COMPLETE

All MVP tasks (1-11) have been implemented and tested. The wizard is ready for the concours demonstration.