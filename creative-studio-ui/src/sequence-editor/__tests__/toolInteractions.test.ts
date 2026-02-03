/**
 * Tool Interactions Tests
 * 
 * Unit tests for tool interaction utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  handleSelectTool,
  handleShotMove,
  handleShotTrim,
  handleShotSplit,
  handleRippleEdit,
  handleRollEdit,
  handleSlipEdit,
  handleSlideEdit,
  handleAddTransition,
  handleAddText,
  handleAddKeyframe,
  findShotAtFrame,
  findAdjacentShots,
  areShotsAdjacent,
  getShotEdge,
} from '../utils/toolInteractions';
import type { Shot, MediaLayerData } from '../types';

// ============================================================================
// Test Data
// ============================================================================

const createMockShot = (id: string, startTime: number, duration: number): Shot => ({
  id,
  name: `Shot ${id}`,
  startTime,
  duration,
  layers: [
    {
      id: `layer-${id}`,
      type: 'media',
      startTime: 0,
      duration,
      locked: false,
      hidden: false,
      opacity: 1,
      blendMode: 'normal',
      data: {
        sourceUrl: '',
        trim: { start: 0, end: duration },
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          anchor: { x: 0.5, y: 0.5 },
        },
      } as MediaLayerData,
    },
  ],
  referenceImages: [],
  prompt: 'Test prompt',
  parameters: {
    seed: 12345,
    denoising: 0.7,
    steps: 30,
    guidance: 7.5,
    sampler: 'euler',
    scheduler: 'normal',
  },
  generationStatus: 'pending',
});

// ============================================================================
// Select Tool Tests (10.1)
// ============================================================================

describe('handleSelectTool', () => {
  it('should select a single shot', () => {
    const result = handleSelectTool('shot-1', false, []);
    expect(result).toEqual(['shot-1']);
  });

  it('should add to selection with multi-select', () => {
    const result = handleSelectTool('shot-2', true, ['shot-1']);
    expect(result).toEqual(['shot-1', 'shot-2']);
  });

  it('should deselect with multi-select if already selected', () => {
    const result = handleSelectTool('shot-1', true, ['shot-1', 'shot-2']);
    expect(result).toEqual(['shot-2']);
  });

  it('should replace selection without multi-select', () => {
    const result = handleSelectTool('shot-3', false, ['shot-1', 'shot-2']);
    expect(result).toEqual(['shot-3']);
  });
});

describe('handleShotMove', () => {
  it('should move shot forward', () => {
    const shots = [createMockShot('shot-1', 0, 100)];
    const result = handleShotMove('shot-1', 50, shots);
    
    expect(result).not.toBeNull();
    expect(result?.newStartTime).toBe(50);
  });

  it('should move shot backward', () => {
    const shots = [createMockShot('shot-1', 100, 100)];
    const result = handleShotMove('shot-1', -50, shots);
    
    expect(result).not.toBeNull();
    expect(result?.newStartTime).toBe(50);
  });

  it('should not allow negative start time', () => {
    const shots = [createMockShot('shot-1', 10, 100)];
    const result = handleShotMove('shot-1', -50, shots);
    
    expect(result).not.toBeNull();
    expect(result?.newStartTime).toBe(0);
  });

  it('should return null for non-existent shot', () => {
    const shots = [createMockShot('shot-1', 0, 100)];
    const result = handleShotMove('shot-999', 50, shots);
    
    expect(result).toBeNull();
  });
});

// ============================================================================
// Trim Tool Tests (10.2)
// ============================================================================

describe('handleShotTrim', () => {
  it('should trim start edge', () => {
    const shots = [createMockShot('shot-1', 0, 100)];
    const result = handleShotTrim('shot-1', 'start', 20, shots);
    
    expect(result).not.toBeNull();
    expect(result?.newStartTime).toBe(20);
    expect(result?.newDuration).toBe(80);
  });

  it('should trim end edge', () => {
    const shots = [createMockShot('shot-1', 0, 100)];
    const result = handleShotTrim('shot-1', 'end', 20, shots);
    
    expect(result).not.toBeNull();
    expect(result?.newDuration).toBe(120);
  });

  it('should enforce minimum duration', () => {
    const shots = [createMockShot('shot-1', 0, 10)];
    const result = handleShotTrim('shot-1', 'end', -20, shots, 5);
    
    expect(result).not.toBeNull();
    expect(result?.newDuration).toBe(5);
  });

  it('should not allow negative start time', () => {
    const shots = [createMockShot('shot-1', 10, 100)];
    const result = handleShotTrim('shot-1', 'start', -20, shots);
    
    expect(result).not.toBeNull();
    expect(result?.newStartTime).toBe(0);
  });
});

// ============================================================================
// Split Tool Tests (10.3)
// ============================================================================

describe('handleShotSplit', () => {
  it('should split shot in the middle', () => {
    const shots = [createMockShot('shot-1', 0, 100)];
    const result = handleShotSplit('shot-1', 50, shots);
    
    expect(result).not.toBeNull();
    expect(result?.newShots[0].duration).toBe(50);
    expect(result?.newShots[1].duration).toBe(50);
    expect(result?.newShots[1].startTime).toBe(50);
  });

  it('should return null if split at start', () => {
    const shots = [createMockShot('shot-1', 0, 100)];
    const result = handleShotSplit('shot-1', 0, shots);
    
    expect(result).toBeNull();
  });

  it('should return null if split at end', () => {
    const shots = [createMockShot('shot-1', 0, 100)];
    const result = handleShotSplit('shot-1', 100, shots);
    
    expect(result).toBeNull();
  });

  it('should preserve layers in both shots', () => {
    const shots = [createMockShot('shot-1', 0, 100)];
    const result = handleShotSplit('shot-1', 50, shots);
    
    expect(result).not.toBeNull();
    expect(result?.newShots[0].layers.length).toBe(1);
    expect(result?.newShots[1].layers.length).toBe(1);
  });
});

// ============================================================================
// Ripple Edit Tests (10.4)
// ============================================================================

describe('handleRippleEdit', () => {
  it('should ripple edit and shift subsequent shots', () => {
    const shots = [
      createMockShot('shot-1', 0, 100),
      createMockShot('shot-2', 100, 100),
      createMockShot('shot-3', 200, 100),
    ];
    
    const result = handleRippleEdit('shot-1', 'end', 20, shots);
    
    expect(result).not.toBeNull();
    expect(result?.newDuration).toBe(120);
    expect(result?.affectedShots.length).toBe(2);
    expect(result?.affectedShots[0].newStartTime).toBe(120);
    expect(result?.affectedShots[1].newStartTime).toBe(220);
  });

  it('should not affect shots before the edited shot', () => {
    const shots = [
      createMockShot('shot-1', 0, 100),
      createMockShot('shot-2', 100, 100),
      createMockShot('shot-3', 200, 100),
    ];
    
    const result = handleRippleEdit('shot-2', 'end', 20, shots);
    
    expect(result).not.toBeNull();
    expect(result?.affectedShots.length).toBe(1);
    expect(result?.affectedShots[0].shotId).toBe('shot-3');
  });
});

// ============================================================================
// Roll Edit Tests (10.5)
// ============================================================================

describe('handleRollEdit', () => {
  it('should roll edit adjacent shots', () => {
    const shots = [
      createMockShot('shot-1', 0, 100),
      createMockShot('shot-2', 100, 100),
    ];
    
    const result = handleRollEdit('shot-1', 'shot-2', 20, shots);
    
    expect(result).not.toBeNull();
    expect(result?.leftNewDuration).toBe(120);
    expect(result?.rightNewStartTime).toBe(120);
    expect(result?.rightNewDuration).toBe(80);
  });

  it('should return null for non-adjacent shots', () => {
    const shots = [
      createMockShot('shot-1', 0, 100),
      createMockShot('shot-2', 150, 100),
    ];
    
    const result = handleRollEdit('shot-1', 'shot-2', 20, shots);
    
    expect(result).toBeNull();
  });

  it('should enforce minimum duration', () => {
    const shots = [
      createMockShot('shot-1', 0, 10),
      createMockShot('shot-2', 10, 10),
    ];
    
    const result = handleRollEdit('shot-1', 'shot-2', -15, shots, 5);
    
    expect(result).not.toBeNull();
    expect(result?.leftNewDuration).toBeGreaterThanOrEqual(5);
    expect(result?.rightNewDuration).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('findShotAtFrame', () => {
  it('should find shot at frame', () => {
    const shots = [
      createMockShot('shot-1', 0, 100),
      createMockShot('shot-2', 100, 100),
    ];
    
    const result = findShotAtFrame(50, shots);
    expect(result?.id).toBe('shot-1');
  });

  it('should return null if no shot at frame', () => {
    const shots = [
      createMockShot('shot-1', 0, 100),
      createMockShot('shot-2', 200, 100),
    ];
    
    const result = findShotAtFrame(150, shots);
    expect(result).toBeNull();
  });
});

describe('findAdjacentShots', () => {
  it('should find left and right adjacent shots', () => {
    const shots = [
      createMockShot('shot-1', 0, 100),
      createMockShot('shot-2', 100, 100),
      createMockShot('shot-3', 200, 100),
    ];
    
    const result = findAdjacentShots('shot-2', shots);
    
    expect(result.left?.id).toBe('shot-1');
    expect(result.right?.id).toBe('shot-3');
  });

  it('should return null for left if first shot', () => {
    const shots = [
      createMockShot('shot-1', 0, 100),
      createMockShot('shot-2', 100, 100),
    ];
    
    const result = findAdjacentShots('shot-1', shots);
    
    expect(result.left).toBeNull();
    expect(result.right?.id).toBe('shot-2');
  });

  it('should return null for right if last shot', () => {
    const shots = [
      createMockShot('shot-1', 0, 100),
      createMockShot('shot-2', 100, 100),
    ];
    
    const result = findAdjacentShots('shot-2', shots);
    
    expect(result.left?.id).toBe('shot-1');
    expect(result.right).toBeNull();
  });
});

describe('areShotsAdjacent', () => {
  it('should return true for adjacent shots', () => {
    const shot1 = createMockShot('shot-1', 0, 100);
    const shot2 = createMockShot('shot-2', 100, 100);
    
    expect(areShotsAdjacent(shot1, shot2)).toBe(true);
  });

  it('should return false for non-adjacent shots', () => {
    const shot1 = createMockShot('shot-1', 0, 100);
    const shot2 = createMockShot('shot-2', 150, 100);
    
    expect(areShotsAdjacent(shot1, shot2)).toBe(false);
  });
});

describe('getShotEdge', () => {
  it('should detect start edge', () => {
    const result = getShotEdge('shot-1', 105, 100, 200, 10);
    expect(result).toBe('start');
  });

  it('should detect end edge', () => {
    const result = getShotEdge('shot-1', 295, 100, 200, 10);
    expect(result).toBe('end');
  });

  it('should detect middle', () => {
    const result = getShotEdge('shot-1', 200, 100, 200, 10);
    expect(result).toBe('middle');
  });
});
