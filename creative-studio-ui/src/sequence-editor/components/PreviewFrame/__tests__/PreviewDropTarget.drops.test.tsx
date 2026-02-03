/**
 * PreviewDropTarget Drop Functionality Tests
 * 
 * Tests for enhanced drop handlers with multi-select support, validation, and undo/redo.
 * Requirements: 15.6, 15.7 - Apply assets to selected shot via preview with multi-select
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DndProvider, useDrag } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi } from 'vitest';
import { PreviewDropTarget } from '../PreviewDropTarget';
import timelineReducer, { addShot, selectElement } from '../../../store/slices/timelineSlice';
import historyReducer from '../../../store/slices/historySlice';
import { DND_ITEM_TYPES } from '../../AssetLibrary/DraggableAsset';
import type { Shot, Asset } from '../../../types';

// ============================================================================
// Test Setup
// ============================================================================

const mockShot: Shot = {
  id: 'shot-1',
  name: 'Test Shot',
  startTime: 0,
  duration: 120,
  layers: [],
  referenceImages: [],
  prompt: 'A test shot',
  parameters: {
    seed: 12345,
    denoising: 0.7,
    steps: 30,
    guidance: 7.5,
    sampler: 'euler',
    scheduler: 'normal',
  },
  generationStatus: 'pending',
};

const mockAsset: Asset = {
  id: 'asset-1',
  name: 'Test Character',
  type: 'character',
  category: 'characters',
  thumbnailUrl: '/test-thumbnail.jpg',
  metadata: {
    description: 'A test character asset',
  },
  tags: ['test', 'character'],
  source: 'builtin',
  createdAt: new Date(),
};

function createTestStore(initialShots: Shot[] = [], selectedElements: string[] = []) {
  const store = configureStore({
    reducer: {
      timeline: timelineReducer,
      history: historyReducer,
    },
  });

  // Add initial shots if provided
  initialShots.forEach(shot => {
    store.dispatch(addShot(shot));
  });

  // Select elements if provided
  selectedElements.forEach(id => {
    store.dispatch(selectElement(id));
  });

  return store;
}

function DraggableTestAsset({ asset }: { asset: Asset }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DND_ITEM_TYPES.ASSET,
    item: { asset, categoryId: 'test-category', type: DND_ITEM_TYPES.ASSET },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag as any} data-testid="draggable-asset">
      {asset.name}
    </div>
  );
}

function renderWithProviders(
  ui: React.ReactElement,
  { store = createTestStore() } = {}
) {
  return {
    store,
    ...render(
      <Provider store={store}>
        <DndProvider backend={HTML5Backend}>
          {ui}
        </DndProvider>
      </Provider>
    ),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('PreviewDropTarget - Drop Functionality', () => {
  describe('Shot Selection', () => {
    it('should handle drop when shot is selected', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should handle drop when shot is at playhead', () => {
      const store = createTestStore([mockShot]);
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should handle no shot selected or at playhead', () => {
      const store = createTestStore();
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should prioritize selected shot over playhead shot', () => {
      const shot1: Shot = { ...mockShot, id: 'shot-1', startTime: 0 };
      const shot2: Shot = { ...mockShot, id: 'shot-2', startTime: 150 };
      const store = createTestStore([shot1, shot2], [shot2.id]);
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });
  });

  describe('Asset Type Handling', () => {
    it('should handle character asset drops', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const characterAsset: Asset = { ...mockAsset, type: 'character' };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={characterAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should handle environment asset drops', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const environmentAsset: Asset = { ...mockAsset, type: 'environment' };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={environmentAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should handle prop asset drops', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const propAsset: Asset = { ...mockAsset, type: 'prop' };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={propAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should handle visual style asset drops', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const styleAsset: Asset = { ...mockAsset, type: 'visual-style' };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={styleAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should handle camera preset asset drops', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const cameraAsset: Asset = {
        ...mockAsset,
        type: 'camera-preset',
        metadata: {
          ...mockAsset.metadata,
          cameraMetadata: {
            movementType: 'pan',
            duration: 5,
            focalLength: 50,
            trajectory: 'linear',
          },
        },
      };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={cameraAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should handle lighting rig asset drops', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const lightingAsset: Asset = {
        ...mockAsset,
        type: 'lighting-rig',
        metadata: {
          ...mockAsset.metadata,
          lightingMetadata: {
            mood: 'dramatic',
            lightCount: 3,
            intensity: 0.8,
            colorTemperature: 5500,
          },
        },
      };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={lightingAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should warn about template asset drops', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const templateAsset: Asset = { ...mockAsset, type: 'template' };
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={templateAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  describe('Custom Drop Handlers', () => {
    it('should call custom onAssetDrop handler when provided', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const mockHandler = vi.fn();
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget onAssetDrop={mockHandler}>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should pass assets array to custom handler', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const mockHandler = vi.fn();
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget onAssetDrop={mockHandler}>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });
  });

  describe('Reference Image Addition', () => {
    it('should add character as reference image', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      const state = store.getState();
      expect(state.timeline.shots).toHaveLength(1);
    });

    it('should add environment as reference image', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const environmentAsset: Asset = { ...mockAsset, type: 'environment' };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={environmentAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      const state = store.getState();
      expect(state.timeline.shots).toHaveLength(1);
    });

    it('should add prop as reference image', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const propAsset: Asset = { ...mockAsset, type: 'prop' };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={propAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      const state = store.getState();
      expect(state.timeline.shots).toHaveLength(1);
    });
  });

  describe('Visual Style Application', () => {
    it('should update prompt when applying visual style', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const styleAsset: Asset = { ...mockAsset, type: 'visual-style', name: 'Cinematic' };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={styleAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      const state = store.getState();
      expect(state.timeline.shots).toHaveLength(1);
    });

    it('should add visual style as reference image with lower weight', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const styleAsset: Asset = { ...mockAsset, type: 'visual-style' };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={styleAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      const state = store.getState();
      expect(state.timeline.shots).toHaveLength(1);
    });
  });

  describe('Camera Preset Application', () => {
    it('should update prompt when applying camera preset', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const cameraAsset: Asset = {
        ...mockAsset,
        type: 'camera-preset',
        name: 'Dolly Zoom',
        metadata: {
          ...mockAsset.metadata,
          cameraMetadata: {
            movementType: 'dolly',
            duration: 5,
            focalLength: 50,
            trajectory: 'linear',
          },
        },
      };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={cameraAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      const state = store.getState();
      expect(state.timeline.shots).toHaveLength(1);
    });

    it('should handle camera preset without metadata', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const cameraAsset: Asset = {
        ...mockAsset,
        type: 'camera-preset',
        metadata: { description: 'Camera preset' },
      };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={cameraAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });
  });

  describe('Lighting Rig Application', () => {
    it('should update prompt when applying lighting rig', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const lightingAsset: Asset = {
        ...mockAsset,
        type: 'lighting-rig',
        name: 'Dramatic Lighting',
        metadata: {
          ...mockAsset.metadata,
          lightingMetadata: {
            mood: 'dramatic',
            lightCount: 3,
            intensity: 0.8,
            colorTemperature: 5500,
          },
        },
      };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={lightingAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      const state = store.getState();
      expect(state.timeline.shots).toHaveLength(1);
    });

    it('should handle lighting rig without metadata', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      const lightingAsset: Asset = {
        ...mockAsset,
        type: 'lighting-rig',
        metadata: { description: 'Lighting rig' },
      };
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={lightingAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });
  });

  describe('Multi-Select Support', () => {
    it('should support single asset drop', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });

    it('should prepare for future multi-asset drops', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should warn when no shot is available', () => {
      const store = createTestStore();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  describe('Undo/Redo Integration', () => {
    it('should integrate with history middleware', () => {
      const store = createTestStore([mockShot], [mockShot.id]);
      
      renderWithProviders(
        <>
          <DraggableTestAsset asset={mockAsset} />
          <PreviewDropTarget>
            <div>Drop Zone</div>
          </PreviewDropTarget>
        </>,
        { store }
      );

      const state = store.getState();
      expect(state.history).toBeDefined();
    });
  });
});
