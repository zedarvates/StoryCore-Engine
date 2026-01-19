# Wizard Services - Metadata Enrichment

## Overview

The Metadata Enrichment Service provides comprehensive metadata validation and completeness checking for wizard-generated scenes and shots. It ensures that projects meet the **90% metadata completeness threshold** required for optimal generation quality.

## MetadataEnrichmentService

### Purpose

The `MetadataEnrichmentService` analyzes scene and shot metadata to:

1. **Calculate completeness scores** - Weighted scoring based on field importance
2. **Identify missing fields** - Distinguish between critical and optional fields
3. **Generate recommendations** - Actionable suggestions to improve completeness
4. **Validate metadata structure** - Ensure data integrity and consistency

### Key Features

- **Weighted Scoring**: Fields are weighted by importance (0.4 - 1.0)
  - Core fields (id, sceneNumber, etc.): weight 1.0
  - Enhanced metadata (promptMetadata): weight 0.5 - 0.7
  - Technical specs: weight 0.4 - 0.6

- **90% Threshold**: Success metric for production-ready projects
- **Detailed Reports**: Per-entity and overall completeness analysis
- **Validation**: Structural and referential integrity checks

## Usage

### Basic Usage

```typescript
import { metadataEnrichmentService } from '@/services/wizard/MetadataEnrichmentService';
import type { EnhancedSceneBreakdown, EnhancedShotPlan } from '@/services/wizard/MetadataEnrichmentService';

// Your scenes and shots data
const scenes: EnhancedSceneBreakdown[] = [...];
const shots: EnhancedShotPlan[] = [...];

// Generate completeness report
const report = metadataEnrichmentService.checkCompleteness(scenes, shots);

console.log(`Overall Completeness: ${report.overallScore.toFixed(1)}%`);
console.log(`Meets 90% Threshold: ${report.meetsThreshold}`);
console.log(`Recommendations:`, report.recommendations);
```

### Check Individual Scene Completeness

```typescript
const scene: EnhancedSceneBreakdown = {
  id: 'scene-1',
  sceneNumber: 1,
  sceneName: 'Opening Scene',
  durationMinutes: 5,
  locationId: 'loc-1',
  characterIds: ['char-1'],
  timeOfDay: 'morning',
  emotionalBeat: 'hopeful',
  keyActions: ['enter', 'greet'],
  order: 1,
  promptMetadata: {
    timeOfDayPrompt: { promptId: 'tod-1', category: 'time', name: 'Morning' },
    moodPrompts: [{ promptId: 'mood-1', category: 'mood', name: 'Hopeful' }],
  },
  technicalSpecs: {
    lighting: {
      type: 'natural',
      intensity: 'medium',
      direction: 'side',
      colorTemp: '5600K',
      shadowQuality: 'soft',
    },
    colorTemperature: '5600K',
    atmosphere: { mood: 'hopeful', intensity: 7, effects: [] },
    suggestedDuration: 5,
  },
};

const sceneCompleteness = metadataEnrichmentService.checkSceneCompleteness(scene);
console.log(`Scene Completeness: ${sceneCompleteness.completenessScore.toFixed(1)}%`);
console.log(`Missing Fields:`, sceneCompleteness.missingFields);
```

### Check Individual Shot Completeness

```typescript
const shot: EnhancedShotPlan = {
  id: 'shot-1',
  sceneId: 'scene-1',
  shotNumber: 1,
  shotType: 'medium',
  cameraAngle: 'eye-level',
  cameraMovement: 'static',
  transition: 'cut',
  compositionNotes: 'Centered',
  order: 1,
  promptMetadata: {
    shotTypePrompt: { promptId: 'shot-1', category: 'shot', name: 'Medium' },
    cameraAnglePrompt: { promptId: 'angle-1', category: 'angle', name: 'Eye Level' },
  },
  technicalSpecs: {
    framing: { type: 'medium', aspectRatio: '16:9', composition: 'center', focusPoint: 'subject' },
  },
  combinedPrompt: {
    base: 'Medium shot',
    positive: 'professional',
    negative: 'amateur',
    technical: {},
  },
};

const shotCompleteness = metadataEnrichmentService.checkShotCompleteness(shot);
console.log(`Shot Completeness: ${shotCompleteness.completenessScore.toFixed(1)}%`);
```

### Validate Metadata Structure

```typescript
const validationResult = metadataEnrichmentService.validateMetadata(scenes, shots);

if (!validationResult.isValid) {
  console.error('Validation Errors:', validationResult.errors);
}

if (validationResult.warnings.length > 0) {
  console.warn('Validation Warnings:', validationResult.warnings);
}
```

## Completeness Report Structure

```typescript
interface CompletenessReport {
  overallScore: number;              // 0-100
  sceneCompleteness: EntityCompleteness[];
  shotCompleteness: EntityCompleteness[];
  totalFields: number;
  completedFields: number;
  missingCriticalFields: string[];
  recommendations: string[];
  meetsThreshold: boolean;           // true if >= 90%
}

interface EntityCompleteness {
  entityId: string;
  entityType: 'scene' | 'shot';
  entityName: string;
  fields: FieldCompleteness[];
  completenessScore: number;         // 0-100
  missingFields: string[];           // Critical fields (weight >= 0.8)
  optionalFields: string[];          // Optional fields (weight < 0.8)
}
```

## Field Weights

### Scene Fields

| Field | Weight | Category |
|-------|--------|----------|
| id, sceneNumber, sceneName, locationId, order | 1.0 | Required |
| durationMinutes, characterIds, timeOfDay | 1.0 | Required |
| emotionalBeat, keyActions | 0.8 | Important |
| promptMetadata.timeOfDayPrompt | 0.7 | Enhanced |
| promptMetadata.moodPrompts | 0.7 | Enhanced |
| promptMetadata.lightingPrompt | 0.6 | Enhanced |
| technicalSpecs.lighting | 0.6 | Technical |
| technicalSpecs.atmosphere | 0.6 | Technical |
| technicalSpecs.colorTemperature | 0.5 | Technical |

### Shot Fields

| Field | Weight | Category |
|-------|--------|----------|
| id, sceneId, shotNumber, shotType, cameraAngle | 1.0 | Required |
| cameraMovement, transition, order | 1.0 | Required |
| compositionNotes | 0.7 | Important |
| promptMetadata.shotTypePrompt | 0.7 | Enhanced |
| promptMetadata.cameraAnglePrompt | 0.7 | Enhanced |
| promptMetadata.cameraMovementPrompt | 0.7 | Enhanced |
| technicalSpecs.framing | 0.6 | Technical |
| technicalSpecs.perspective | 0.6 | Technical |
| combinedPrompt | 0.5 | Generated |

## Achieving 90% Completeness

To meet the 90% threshold, ensure:

### For Scenes:
1. ✅ All required fields populated (id, name, duration, location, characters, timeOfDay)
2. ✅ Emotional beat and key actions defined
3. ✅ Prompt metadata selected (time of day, mood, lighting)
4. ✅ Technical specs auto-generated from prompts

### For Shots:
1. ✅ All required fields populated (id, sceneId, shotNumber, type, angle, movement, transition)
2. ✅ Composition notes provided
3. ✅ Prompt metadata selected (shot type, camera angle, movement, transition)
4. ✅ Technical specs auto-generated from prompts
5. ✅ Combined prompt generated

## Integration with Wizard

```typescript
import { useWizardStore } from '@/stores/wizard/wizardStore';
import { metadataEnrichmentService } from '@/services/wizard/MetadataEnrichmentService';

function WizardReviewStep() {
  const scenes = useWizardStore((state) => state.scenes);
  const shots = useWizardStore((state) => state.shots);

  const report = metadataEnrichmentService.checkCompleteness(
    scenes as EnhancedSceneBreakdown[],
    shots as EnhancedShotPlan[]
  );

  return (
    <div>
      <h2>Project Completeness: {report.overallScore.toFixed(1)}%</h2>
      {report.meetsThreshold ? (
        <p>✓ Ready for generation!</p>
      ) : (
        <div>
          <p>⚠ Additional metadata recommended</p>
          <ul>
            {report.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Example

See `src/examples/MetadataCompletenessExample.tsx` for a complete working example with:
- Fully enriched scenes and shots
- Completeness report generation
- Visual display of results
- Recommendations and missing fields

## Testing

Run tests with:

```bash
npm test -- MetadataEnrichmentService.test.ts
```

Tests cover:
- Scene completeness calculation
- Shot completeness calculation
- Overall completeness reporting
- 90% threshold validation
- Metadata validation
- Recommendation generation

## Success Metrics

The service helps achieve the spec's success criteria:

- ✅ **90% metadata completeness** - Weighted scoring ensures quality
- ✅ **Validation before export** - Catch issues early
- ✅ **Actionable recommendations** - Guide users to improve completeness
- ✅ **Production readiness** - Ensure projects are generation-ready

## Future Enhancements

- Auto-enrichment from prompt library selections
- Real-time completeness tracking during wizard steps
- Completeness history and trends
- Export completeness reports
- Custom field weight configuration

