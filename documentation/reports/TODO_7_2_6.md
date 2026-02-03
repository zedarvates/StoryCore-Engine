# Task 7.2.6: Scene Timing Estimation

**Date:** January 26, 2026
**Status:** ✅ COMPLETED
**Priority:** High

## Overview
Estimate scene and script runtime from script analysis.

## Implementation Steps

### Phase 1: Timing Data Structures
- [x] Define timing data classes
- [x] Create duration estimation rules

### Phase 2: Dialogue Duration
- [x] Estimate dialogue reading time
- [x] Calculate scene dialogue duration

### Phase 3: Action Timing
- [x] Estimate action line duration
- [x] Handle action intensity

### Phase 4: Scene Complexity
- [x] Score scene complexity
- [x] Adjust timing for complexity

### Phase 5: Runtime Estimation
- [x] Calculate scene durations
- [x] Sum total runtime

## Success Criteria
- [x] Estimate dialogue duration
- [x] Calculate action timing
- [x] Score scene complexity
- [x] Generate runtime report

## Files Created
- `src/script/timing_types.py` - Data structures
- `src/script/timing_analyzer.py` - Analysis system

## Features Implemented

### Timing Data Types
- DialogueTiming (words, seconds, speakers)
- ActionTiming (lines, intensity, movements)
- SceneComplexity (level, score, factors)
- SceneTiming (combined scene data)
- ScriptTimingReport (complete report)

### Dialogue Duration
- Word count per scene
- 4 dialogue speeds (Slow 2.5, Normal 3.0, Fast 3.5, Very Fast 4.0 wps)
- Speaker extraction
- Parenthetical handling

### Action Timing
- Action line counting
- Intensity multipliers (Low 1.0x to Very High 3.0x)
- Movement extraction (walking, running, driving, etc.)

### Scene Complexity Scoring
- 13 complexity indicators (fight scene, emotional, visual effects, etc.)
- Complexity levels (Simple, Moderate, Complex, Very Complex)
- Adjustment factor (1.0x to 1.5x based on complexity)

### Runtime Calculation
- Standard formula: (dialogue + action) × complexity + transition
- 250 words = 1 page
- 5 seconds transition per scene
- Total runtime estimation

### Statistics
- Scene duration averages
- Longest/shortest scene identification
- Dialogue/action percentage breakdown
- Complexity distribution

### Visualization
- Stacked bar chart (scene timeline)
- Pie chart (time breakdown)

