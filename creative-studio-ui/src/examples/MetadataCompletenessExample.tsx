/**
 * Example: Metadata Completeness Checking
 * Demonstrates how to use MetadataEnrichmentService to achieve 90% completeness
 */

import React, { useState, useEffect } from 'react';
import {
  metadataEnrichmentService,
  type EnhancedSceneBreakdown,
  type EnhancedShotPlan,
  type CompletenessReport,
} from '../services/wizard/MetadataEnrichmentService';

export const MetadataCompletenessExample: React.FC = () => {
  const [report, setReport] = useState<CompletenessReport | null>(null);

  // Example data with comprehensive metadata
  const exampleScenes: EnhancedSceneBreakdown[] = [
    {
      id: 'scene-1',
      sceneNumber: 1,
      sceneName: 'Opening Scene',
      durationMinutes: 5,
      locationId: 'location-1',
      characterIds: ['character-1', 'character-2'],
      timeOfDay: 'morning',
      emotionalBeat: 'hopeful and energetic',
      keyActions: ['character enters', 'dialogue exchange', 'reveal'],
      order: 1,
      promptMetadata: {
        timeOfDayPrompt: {
          promptId: 'tod-morning',
          category: 'time-of-day',
          name: 'Morning Light',
        },
        moodPrompts: [
          {
            promptId: 'mood-hopeful',
            category: 'mood',
            name: 'Hopeful',
          },
          {
            promptId: 'mood-energetic',
            category: 'mood',
            name: 'Energetic',
          },
        ],
        lightingPrompt: {
          promptId: 'light-natural',
          category: 'lighting',
          name: 'Natural Daylight',
        },
        colorPalettePrompt: {
          promptId: 'palette-warm',
          category: 'color-palette',
          name: 'Warm Tones',
        },
      },
      technicalSpecs: {
        lighting: {
          type: 'natural',
          intensity: 'medium-high',
          direction: 'side-front',
          colorTemp: '5600K',
          shadowQuality: 'soft',
        },
        colorTemperature: '5600K',
        atmosphere: {
          mood: 'hopeful',
          intensity: 8,
          effects: ['lens flare', 'soft glow', 'warm haze'],
        },
        suggestedDuration: 5,
      },
    },
    {
      id: 'scene-2',
      sceneNumber: 2,
      sceneName: 'Confrontation',
      durationMinutes: 7,
      locationId: 'location-2',
      characterIds: ['character-1', 'character-3'],
      timeOfDay: 'evening',
      emotionalBeat: 'tense and dramatic',
      keyActions: ['argument', 'revelation', 'decision'],
      order: 2,
      promptMetadata: {
        timeOfDayPrompt: {
          promptId: 'tod-evening',
          category: 'time-of-day',
          name: 'Golden Hour',
        },
        moodPrompts: [
          {
            promptId: 'mood-tense',
            category: 'mood',
            name: 'Tense',
          },
        ],
        lightingPrompt: {
          promptId: 'light-dramatic',
          category: 'lighting',
          name: 'Dramatic Lighting',
        },
        colorPalettePrompt: {
          promptId: 'palette-contrast',
          category: 'color-palette',
          name: 'High Contrast',
        },
      },
      technicalSpecs: {
        lighting: {
          type: 'mixed',
          intensity: 'high',
          direction: 'side',
          colorTemp: '3200K',
          shadowQuality: 'hard',
        },
        colorTemperature: '3200K',
        atmosphere: {
          mood: 'tense',
          intensity: 9,
          effects: ['rim light', 'deep shadows'],
        },
        suggestedDuration: 7,
      },
    },
  ];

  const exampleShots: EnhancedShotPlan[] = [
    {
      id: 'shot-1',
      sceneId: 'scene-1',
      shotNumber: 1,
      shotType: 'wide',
      cameraAngle: 'eye-level',
      cameraMovement: 'dolly',
      transition: 'cut',
      compositionNotes: 'Establishing shot with rule of thirds',
      order: 1,
      promptMetadata: {
        shotTypePrompt: {
          promptId: 'shot-wide',
          category: 'shot-type',
          name: 'Wide Shot',
        },
        cameraAnglePrompt: {
          promptId: 'angle-eye',
          category: 'camera-angle',
          name: 'Eye Level',
        },
        cameraMovementPrompt: {
          promptId: 'move-dolly',
          category: 'camera-movement',
          name: 'Dolly In',
        },
        transitionPrompt: {
          promptId: 'trans-cut',
          category: 'transition',
          name: 'Cut',
        },
      },
      technicalSpecs: {
        framing: {
          type: 'wide',
          aspectRatio: '2.39:1',
          composition: 'rule-of-thirds',
          focusPoint: 'center-left',
        },
        perspective: {
          angle: 'eye-level',
          height: 'medium',
          psychologicalEffect: 'neutral, observational',
          commonUses: ['establishing shots', 'context setting'],
        },
        motion: {
          type: 'dolly-in',
          speed: 'slow',
          direction: 'forward',
          purpose: 'draw viewer into scene',
        },
        editing: {
          transitionType: 'cut',
          duration: 0,
          effect: 'none',
          purpose: 'maintain continuity',
        },
      },
      combinedPrompt: {
        base: 'Wide establishing shot at eye level with slow dolly in movement',
        positive:
          'cinematic, professional cinematography, smooth camera movement, well-composed',
        negative: 'shaky, amateur, poorly framed, abrupt movement',
        technical: {
          fps: 24,
          resolution: '4K',
          aspectRatio: '2.39:1',
          codec: 'ProRes',
        },
      },
    },
    {
      id: 'shot-2',
      sceneId: 'scene-1',
      shotNumber: 2,
      shotType: 'medium',
      cameraAngle: 'eye-level',
      cameraMovement: 'static',
      transition: 'cut',
      compositionNotes: 'Two-shot for dialogue',
      order: 2,
      promptMetadata: {
        shotTypePrompt: {
          promptId: 'shot-medium',
          category: 'shot-type',
          name: 'Medium Shot',
        },
        cameraAnglePrompt: {
          promptId: 'angle-eye',
          category: 'camera-angle',
          name: 'Eye Level',
        },
        cameraMovementPrompt: {
          promptId: 'move-static',
          category: 'camera-movement',
          name: 'Static',
        },
        transitionPrompt: {
          promptId: 'trans-cut',
          category: 'transition',
          name: 'Cut',
        },
      },
      technicalSpecs: {
        framing: {
          type: 'medium',
          aspectRatio: '2.39:1',
          composition: 'two-shot',
          focusPoint: 'characters',
        },
        perspective: {
          angle: 'eye-level',
          height: 'medium',
          psychologicalEffect: 'intimate, conversational',
          commonUses: ['dialogue', 'character interaction'],
        },
        motion: {
          type: 'static',
          speed: 'none',
          direction: 'none',
          purpose: 'focus on performance',
        },
        editing: {
          transitionType: 'cut',
          duration: 0,
          effect: 'none',
          purpose: 'maintain dialogue flow',
        },
      },
      combinedPrompt: {
        base: 'Medium two-shot at eye level, static camera',
        positive: 'sharp focus, natural lighting, professional framing',
        negative: 'out of focus, poor lighting, awkward framing',
        technical: {
          fps: 24,
          resolution: '4K',
          aspectRatio: '2.39:1',
        },
      },
    },
    {
      id: 'shot-3',
      sceneId: 'scene-2',
      shotNumber: 3,
      shotType: 'close-up',
      cameraAngle: 'low-angle',
      cameraMovement: 'handheld',
      transition: 'cut',
      compositionNotes: 'Dramatic close-up for emotional impact',
      order: 3,
      promptMetadata: {
        shotTypePrompt: {
          promptId: 'shot-closeup',
          category: 'shot-type',
          name: 'Close-Up',
        },
        cameraAnglePrompt: {
          promptId: 'angle-low',
          category: 'camera-angle',
          name: 'Low Angle',
        },
        cameraMovementPrompt: {
          promptId: 'move-handheld',
          category: 'camera-movement',
          name: 'Handheld',
        },
        transitionPrompt: {
          promptId: 'trans-cut',
          category: 'transition',
          name: 'Cut',
        },
      },
      technicalSpecs: {
        framing: {
          type: 'close-up',
          aspectRatio: '2.39:1',
          composition: 'centered',
          focusPoint: 'eyes',
        },
        perspective: {
          angle: 'low-angle',
          height: 'below-subject',
          psychologicalEffect: 'powerful, dominant',
          commonUses: ['dramatic moments', 'character power'],
        },
        motion: {
          type: 'handheld',
          speed: 'subtle',
          direction: 'organic',
          purpose: 'add tension and energy',
        },
        editing: {
          transitionType: 'cut',
          duration: 0,
          effect: 'none',
          purpose: 'heighten drama',
        },
      },
      combinedPrompt: {
        base: 'Dramatic close-up from low angle with subtle handheld movement',
        positive: 'intense, emotional, cinematic, powerful',
        negative: 'too shaky, unfocused, poorly lit',
        technical: {
          fps: 24,
          resolution: '4K',
          aspectRatio: '2.39:1',
        },
      },
    },
  ];

  useEffect(() => {
    // Generate completeness report
    const completenessReport = metadataEnrichmentService.checkCompleteness(
      exampleScenes,
      exampleShots
    );
    setReport(completenessReport);
  }, []);

  if (!report) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Metadata Completeness Report</h1>

      {/* Overall Score */}
      <div
        style={{
          padding: '20px',
          marginBottom: '20px',
          backgroundColor: report.meetsThreshold ? '#d4edda' : '#f8d7da',
          border: `1px solid ${report.meetsThreshold ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
        }}
      >
        <h2>Overall Completeness: {report.overallScore.toFixed(1)}%</h2>
        <p>
          <strong>Status:</strong>{' '}
          {report.meetsThreshold ? (
            <span style={{ color: '#155724' }}>✓ Meets 90% Threshold</span>
          ) : (
            <span style={{ color: '#721c24' }}>✗ Below 90% Threshold</span>
          )}
        </p>
        <p>
          <strong>Fields:</strong> {report.completedFields} / {report.totalFields} completed
        </p>
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Recommendations</h3>
          <ul>
            {report.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Scene Completeness */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Scene Completeness</h3>
        {report.sceneCompleteness.map((scene) => (
          <div
            key={scene.entityId}
            style={{
              padding: '15px',
              marginBottom: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
            }}
          >
            <h4>
              {scene.entityName} - {scene.completenessScore.toFixed(1)}%
            </h4>
            {scene.missingFields.length > 0 && (
              <div>
                <strong>Missing Critical Fields:</strong>
                <ul>
                  {scene.missingFields.map((field, index) => (
                    <li key={index} style={{ color: '#dc3545' }}>
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {scene.optionalFields.length > 0 && (
              <div>
                <strong>Missing Optional Fields:</strong>
                <ul>
                  {scene.optionalFields.slice(0, 5).map((field, index) => (
                    <li key={index} style={{ color: '#ffc107' }}>
                      {field}
                    </li>
                  ))}
                  {scene.optionalFields.length > 5 && (
                    <li style={{ color: '#6c757d' }}>
                      ... and {scene.optionalFields.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Shot Completeness */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Shot Completeness</h3>
        {report.shotCompleteness.map((shot) => (
          <div
            key={shot.entityId}
            style={{
              padding: '15px',
              marginBottom: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
            }}
          >
            <h4>
              {shot.entityName} - {shot.completenessScore.toFixed(1)}%
            </h4>
            {shot.missingFields.length > 0 && (
              <div>
                <strong>Missing Critical Fields:</strong>
                <ul>
                  {shot.missingFields.map((field, index) => (
                    <li key={index} style={{ color: '#dc3545' }}>
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {shot.optionalFields.length > 0 && (
              <div>
                <strong>Missing Optional Fields:</strong>
                <ul>
                  {shot.optionalFields.slice(0, 5).map((field, index) => (
                    <li key={index} style={{ color: '#ffc107' }}>
                      {field}
                    </li>
                  ))}
                  {shot.optionalFields.length > 5 && (
                    <li style={{ color: '#6c757d' }}>
                      ... and {shot.optionalFields.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Missing Critical Fields Summary */}
      {report.missingCriticalFields.length > 0 && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
          }}
        >
          <h3>Critical Fields Requiring Attention</h3>
          <ul>
            {report.missingCriticalFields.map((field, index) => (
              <li key={index}>{field}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MetadataCompletenessExample;

