# Task 7.2.7: Shot-by-Shot Breakdown Generation

**Date:** January 26, 2026
**Status:** ✅ COMPLETED
**Priority:** High

## Overview
Convert script scenes into detailed shot breakdowns.

## Implementation Steps

### Phase 1: Shot Types
- [x] Define shot type categories (14 types)
- [x] Create camera direction types

### Phase 2: Conversion Logic
- [x] Implement script-to-shot parsing
- [x] Analyze scene content for shot type
- [x] Extract camera directions

### Phase 3: Shot Suggestions
- [x] Create shot type recommendations
- [x] Match content to shot types

### Phase 4: Export
- [x] Create shot list format
- [x] Export to structured data

## Success Criteria
- [x] Convert scenes to shots
- [x] Suggest appropriate shot types
- [x] Include camera directions
- [x] Export structured data

## Files Created
- `src/script/shot_breakdown_types.py` - Data structures
- `src/script/shot_breakdown_analyzer.py` - Analysis system

## Features Implemented

### Shot Types (14 types)
- Extreme Wide Shot, Wide Shot, Full Shot
- Medium Shot, Medium Close-Up, Close-Up, Extreme Close-Up
- Over Shoulder, Point of View
- Insert, Cutaway, Establishing
- Two Shot, Group Shot

### Camera Movements (13 types)
- Static, Pan Left/Right, Tilt Up/Down
- Dolly In/Out, Tracking, Crane Up/Down
- Zoom In/Out, Handheld, Steadicam

### Camera Angles (6 types)
- Eye Level, Low Angle, High Angle
- Bird Eye, Worm Eye, Dutch Angle

### Analysis Features
- Scene parsing (INT./EXT./I/E. format)
- Shot type suggestion based on content keywords
- Camera movement extraction
- Duration estimation (word count based)
- Character extraction from dialogue
- Confidence scoring

### Export
- CSV format export
- Structured data output
- Shot list with all metadata

## Usage Example

```python
from src.script.shot_breakdown_analyzer import analyze_script_shots, export_shot_list

# Analyze script
script = """
EXT. FOREST - DAY

JOHN (30s) walks through the dense forest. He looks nervous, checking his phone.

INT. CAVE - CONTINUOUS

Inside the cave, MARIA (20s) examines ancient markings on the wall.
"""

analysis = analyze_script_shots(script, "My Script")

print(f"Total Scenes: {analysis.total_scenes}")
print(f"Total Shots: {analysis.total_shots}")
print(f"Duration: {analysis.total_duration}s")

# Scene breakdown
for sb in analysis.scene_breakdowns:
    print(f"\nScene {sb.scene_number}: {sb.scene_heading}")
    for shot in sb.shots:
        print(f"  Shot {shot.shot_number}: {shot.shot_type.value}")
        print(f"    {shot.description}")
        print(f"    Duration: {shot.estimated_duration}s")

# Export CSV
csv = export_shot_list(analysis)
print("\nCSV Export:")
print(csv)
```

