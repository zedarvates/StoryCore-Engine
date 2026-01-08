# StoryCore-Engine Repository Structure

## Overview
This document provides a complete map of the StoryCore-Engine repository, explaining where each component lives and how they interconnect.

## Root Directory
```
storycore-engine/
├── README.md                          # Main project documentation (jury-facing)
├── INDEX.md                           # Project status and roadmap
├── STRUCTURE.md                       # This file - repository map
├── storycore.py                       # Main CLI entry point
├── requirements.txt                   # Python dependencies
├── setup.py                           # Package configuration
├── LICENSE                            # MIT license
└── .gitignore                         # Git ignore rules
```

## Core Engine Modules (`src/`)
```
src/
├── project_manager.py                 # Project initialization + Data Contract v1
├── grid_generator.py                  # Master Coherence Sheet (3x3) generation
├── promotion_engine.py                # Panel promotion pipeline
├── autofix_engine.py                  # Self-correcting quality loop
├── qa_engine.py                       # Quality assessment (Laplacian variance)
├── narrative_engine.py                # Style consistency and augmentation
├── video_plan_engine.py               # Camera movement planning
├── comparison_engine.py               # Visual diff generation
├── refinement_engine.py               # Enhancement filters
├── exporter.py                        # Package creation + dashboard generation
├── validator.py                       # JSON schema validation
└── schemas.py                         # Data contract schemas
```

## Interfaces & Demos
```
├── storycore-dashboard-demo.html      # Standalone technical dashboard (jury-facing)
├── StoryCoreDashboard.tsx             # React component version
├── App.tsx                            # Creative studio interface (user-facing)
└── UI_PRODUCT_SPEC_PACK.md           # Complete UI specification
```

## Engine Specifications
```
├── promotion_engine_hardened.py       # Production-ready promotion engine
├── promotion_engine_advanced.py       # Advanced promotion features
├── PROMOTION_ENGINE_CONTRACT.md       # Technical specification
└── autofix_engine.py                  # Self-correcting quality implementation
```

## Demo Projects
```
├── compare-demo/                      # Comparison workflow demo
│   ├── project.json                   # Project configuration
│   ├── storyboard.json               # Shot definitions
│   ├── dashboard.html                # Generated dashboard
│   └── assets/images/                # Generated assets
├── grid-demo/                         # Grid generation demo
├── refine-demo/                       # Refinement pipeline demo
└── exports/                           # Generated export packages
```

## Documentation & Research
```
├── json_schema_validation_research.md # Schema validation research
├── python_cli_research.md             # CLI implementation research
├── config_validation_example.py       # Configuration examples
└── json_validation_examples.py        # Validation examples
```

## Test Files
```
├── test_grid.py                       # Grid generation tests
├── test_promote.py                    # Promotion pipeline tests
├── test_refine.py                     # Refinement tests
├── test_compare.py                    # Comparison tests
└── test_refine_metrics.py            # Metrics validation tests
```

## Configuration & Assets
```
├── assets/                            # Global project assets
│   ├── images/                       # Image assets
│   └── audio/                        # Audio assets
└── .kiro/                            # Kiro CLI configuration
    ├── docs/                         # Original documentation
    └── settings/                     # Tool settings
```

## Key File Responsibilities

### **Core Pipeline Files**
- **`storycore.py`**: Main CLI entry point, routes all commands
- **`project_manager.py`**: Handles project initialization and Data Contract v1 compliance
- **`grid_generator.py`**: Creates Master Coherence Sheet (3x3 grid anchor)
- **`promotion_engine.py`**: Slices grid, applies center-fill crop, upscales to Promoted Keyframes
- **`autofix_engine.py`**: Monitors QA metrics, automatically adjusts parameters and re-processes
- **`qa_engine.py`**: Calculates Laplacian variance, generates QA Reports with scoring

### **Interface Files**
- **`storycore-dashboard-demo.html`**: Standalone technical dashboard for jury evaluation
- **`StoryCoreDashboard.tsx`**: React component version of technical dashboard
- **`App.tsx`**: User-facing creative studio interface with timeline editing

### **Documentation Files**
- **`README.md`**: Main project documentation optimized for jury evaluation
- **`INDEX.md`**: Single entry point linking all documentation
- **`STRUCTURE.md`**: This file - complete repository map
- **`UI_PRODUCT_SPEC_PACK.md`**: Comprehensive UI and product specification

### **Engine Specifications**
- **`PROMOTION_ENGINE_CONTRACT.md`**: Technical contract for promotion pipeline
- **`promotion_engine_hardened.py`**: Production-ready implementation with comprehensive validation

## Data Flow Between Components

### **1. Project Initialization**
```
storycore.py init → project_manager.py → Creates project.json with Data Contract v1
```

### **2. Master Coherence Sheet Generation**
```
storycore.py grid → grid_generator.py → Creates 3x3 grid anchor → Updates project.json
```

### **3. Panel Promotion Pipeline**
```
storycore.py promote → promotion_engine.py → Slices/crops/upscales → qa_engine.py → autofix_engine.py
```

### **4. Dashboard Generation**
```
storycore.py dashboard → exporter.py → Reads project data → Generates dashboard.html
```

### **5. Export Package**
```
storycore.py export → exporter.py → Creates timestamped ZIP with QA Reports and demo assets
```

## File Naming Conventions

### **Canonical Terminology**
- **Master Coherence Sheet**: 3x3 grid anchor (not "Master Grid")
- **Promoted Keyframe**: Upscaled panel (not "promoted image")
- **QA Report**: Quality assessment output (not "validation report")
- **Autofix Log**: Self-correction record (not "correction log")
- **Manual Re-Promote**: User-triggered re-processing (not "manual regeneration")

### **File Extensions**
- **`.py`**: Python modules and engines
- **`.json`**: Data contracts and project state
- **`.html`**: Standalone interfaces
- **`.tsx`**: React components
- **`.md`**: Documentation files

## Integration Points

### **CLI Commands → Engine Modules**
- `init` → `project_manager.py`
- `grid` → `grid_generator.py`
- `promote` → `promotion_engine.py`
- `refine` → `refinement_engine.py`
- `qa` → `qa_engine.py`
- `export` → `exporter.py`
- `dashboard` → `exporter.py` (generate_dashboard)

### **Data Contract Flow**
- All engines read/write `project.json` using Data Contract v1 schema
- Schema compliance enforced by `project_manager.ensure_schema_compliance()`
- Capability tracking via `capabilities` and `generation_status` fields

### **Interface Integration**
- Technical dashboard reads project data via JavaScript
- React components use same data structures
- All interfaces support manual image injection for testing

## Development Workflow

### **Adding New Engines**
1. Create engine module in `src/`
2. Add CLI command in `storycore.py`
3. Update Data Contract schema in `project_manager.py`
4. Add tests in `test_*.py`
5. Update documentation

### **Modifying Interfaces**
1. Update standalone HTML for jury-facing features
2. Sync React components for user-facing features
3. Update UI specification in `UI_PRODUCT_SPEC_PACK.md`
4. Test with demo projects

This structure ensures clear separation of concerns while maintaining tight integration between all components of the StoryCore-Engine pipeline.
