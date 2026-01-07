# StoryCore-Engine (MVP CLI)

Hackathon MVP: a zero-dependency Python CLI that bootstraps a StoryCore project, validates the JSON data contract, and exports reproducible snapshots.

## Requirements
- Python 3.8+

## Quickstart

### 1) Create a project
python3 storycore.py init demo-project

### 2) Validate the project JSON
python3 storycore.py validate --project demo-project

### 3) Export a timestamped snapshot (includes QA stub)
python3 storycore.py export --project demo-project

## Output
- `demo-project/`
  - `project.json`
  - `storyboard.json`
  - `assets/images/`
  - `assets/audio/`
- `exports/run-YYYYMMDD-HHMMSS/`
  - `project.json`
  - `storyboard.json`
  - `qa_report.json` (stub)