# Task 7.3.3: Dynamic Shot Suggestions

**Date:** January 26, 2026
**Status:** ✅ COMPLETED
**Priority:** High

## Overview
Implement context-aware shot suggestions with emotional tone mapping for dynamic cinematography decisions.

## Implementation Steps

### Phase 1: Emotional Tone Analysis
- [x] Define emotional tone categories
- [x] Create tone-to-shot mapping
- [x] Implement sentiment analysis

### Phase 2: Context-Aware Suggestions
- [x] Build context detection system
- [x] Create suggestion engine
- [x] Implement confidence scoring

### Phase 3: Shot Sequence Planning
- [x] Design shot progression patterns
- [x] Implement sequence generation
- [x] Add variety optimization

### Phase 4: Narrative Beat Mapping
- [x] Map narrative beats to shots
- [x] Create beat detection
- [x] Implement arc-following suggestions

## Success Criteria
- [x] Emotion-based shot recommendations
- [x] Context-sensitive suggestions
- [x] Shot sequence generation
- [x] Narrative beat alignment

## Files Created
- `src/grammar/dynamic_types.py` - Data structures and enums
- `src/grammar/dynamic_suggestions.py` - Main suggestion engine

## Features Implemented

### Emotional Tones (12 types)
- Tense, Romantic, Action, Mysterious, Happy, Sad, Horror, Comedic, Nostalgic, Dramatic, Peaceful, Surreal

### Narrative Beats (11 types)
- Setup, Inciting Incident, Rising Action, Midpoint, Climax, Falling Action, Resolution, Theme Statement, Character Moment, Revelation, Confrontation

### Shot Variations (10 types)
- High Angle, Low Angle, Eye Level, Dutch Angle, Overhead, POV, Reflection, Window Reflection, Mirror Shot, Third Person

### Key Features
- **Tone Detection**: Keyword-based emotional analysis with confidence scores
- **Context Analysis**: Extracts action words, dialogue markers, location/time indicators
- **Narrative Beat Detection**: Identifies story position (setup → climax → resolution)
- **Shot Sequence Generation**: Creates complete shot sequences with opening, middle, closing shots
- **Rhythm Scoring**: Calculates shot duration variation for pacing
- **Variety Scoring**: Evaluates shot type and angle diversity
- **Transition Generation**: Suggests appropriate transitions between shots

### Tone-to-Shot Mapping
Each emotional tone maps to:
- Primary shot classes
- Recommended variations
- Camera movements
- Duration ranges
- Technical notes

## Usage Example

```python
from src.grammar.dynamic_suggestions import DynamicShotEngine, get_dynamic_suggestions

# Get dynamic suggestions
suggestions = get_dynamic_suggestions(
    scene_content="JOHN stands alone in the dark room, heart racing...",
    scene_heading="INT. OFFICE - NIGHT",
    num_characters=1,
    duration_estimate=45.0
)

print(f"Primary Tone: {suggestions.primary_tone.value}")
print(f"Tone Confidence: {suggestions.tone_confidence:.2f}")
print(f"Narrative Beat: {suggestions.narrative_context.beat_type.value}")
print(f"Intensity: {suggestions.narrative_context.intensity:.2f}")

# Get shot sequence
sequence = suggestions.suggested_sequence
print(f"\nShot Sequence ({len(sequence.shots)} shots):")
print(f"Total Duration: {sequence.total_duration:.1f}s")
print(f"Rhythm Score: {sequence.rhythm_score:.2f}")
print(f"Variety Score: {sequence.variety_score:.2f}")

for i, shot in enumerate(sequence.shots):
    print(f"  {i+1}. {shot.shot_class} - {shot.emotional_tone.value} ({shot.duration_estimate:.1f}s)")
```

### Phase 7 Progress:

| Week | Status | Tasks |
|------|--------|-------|
| Week 1-2 | ✅ Complete | 6/6 Character Generation |
| Week 3-4 | ✅ Complete | 8/8 Script Analysis |
| Week 5-6 | 🔄 In Progress | 7.3.1 ✅, 7.3.2 ✅, 7.3.3 ✅, pending |
| Week 7-8 | ⏳ Pending | 7.4.x tasks |

**Week 5-6 Progress: 3/8 tasks complete (37.5%)**


