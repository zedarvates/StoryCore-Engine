# Task 7.3.1: Enhanced Composition Rule Engine

**Date:** January 26, 2026
**Status:** In Progress
**Priority:** High

## Overview
Implement composition rule engine with Rule of Thirds, Golden Ratio, Symmetrical, and Leading Lines detection.

## Implementation Steps

### Phase 1: Composition Rule Types
- [ ] Define CompositionRule enum (Rule of Thirds, Golden Ratio, Symmetrical, Leading Lines, etc.)
- [ ] Create CompositionAnalysis dataclass
- [ ] Define RuleWeights dataclass

### Phase 2: Rule of Thirds Calculator
- [ ] Implement grid overlay calculation
- [ ] Calculate focal point placement
- [ ] Score rule of thirds compliance

### Phase 3: Golden Ratio Application
- [ ] Implement golden spiral calculation
- [ ] Calculate golden ratio points
- [ ] Apply to composition suggestions

### Phase 4: Symmetrical Composition
- [ ] Detect symmetrical elements
- [ ] Calculate symmetry score
- [ ] Suggest symmetrical compositions

### Phase 5: Leading Lines Detection
- [ ] Detect lines in frame
- [ ] Calculate line convergence
- [ ] Score leading lines effectiveness

### Phase 6: Depth of Field Optimization
- [ ] Calculate optimal aperture
- [ ] Suggest focus distance
- [ ] Calculate bokeh quality

## Success Criteria
- Rule of Thirds score calculation
- Golden Ratio spiral generation
- Symmetry detection and scoring
- Leading lines detection
- Depth of Field recommendations

## Files to Create
- `src/composition/composition_types.py`
- `src/composition/composition_engine.py`
