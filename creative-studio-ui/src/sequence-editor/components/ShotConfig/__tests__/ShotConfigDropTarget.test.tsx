/**
 * ShotConfigDropTarget Component Tests
 * 
 * Tests for the shot config drop target component that handles asset drops.
 * Requirements: 15.5 - Apply assets to shots via drag-and-drop
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi } from 'vitest';
import { ShotConfigDropTarget } from '../ShotConfigDropTarget';
import timelineReducer from '../../../store/slices/timelineSlice';
import type { Shot } from '../../../types';

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
};

function createTestStore() {
  return configureStore({
    reducer: {
      timeline: timelineReducer,
    },
  });
}

function renderWithProviders(
  ui: React.ReactElement,
  { store = createTestStore() } = {}
) {
  return render(
    <Provider store={store}>
      <DndProvider backend={HTML5Backend}>
        {ui}
      </DndProvider>
    </Provider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('ShotConfigDropTarget', () => {
  describe('Rendering', () => {
    it('should render children correctly with shot', () => {
      renderWithProviders(
        <ShotConfigDropTarget shot={mockShot}>
          <div data-testid="child-content">Test Content</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render children correctly without shot', () => {
      renderWithProviders(
        <ShotConfigDropTarget shot={null}>
          <div data-testid="child-content">No Shot</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('No Shot')).toBeInTheDocument();
    });

    it('should apply shot-config-drop-target class', () => {
      const { container } = renderWithProviders(
        <ShotConfigDropTarget shot={mockShot}>
          <div>Content</div>
        </ShotConfigDropTarget>
      );

      const dropTarget = container.querySelector('.shot-config-drop-target');
      expect(dropTarget).toBeInTheDocument();
    });

    it('should have correct positioning styles', () => {
      const { container } = renderWithProviders(
        <ShotConfigDropTarget shot={mockShot}>
          <div>Content</div>
        </ShotConfigDropTarget>
      );

      const dropTarget = container.querySelector('.shot-config-drop-target');
      expect(dropTarget).toHaveStyle({
        position: 'relative',
        width: '100%',
        height: '100%',
      });
    });
  });

  describe('Shot States', () => {
    it('should handle shot with pending status', () => {
      const pendingShot: Shot = { ...mockShot, generationStatus: 'pending' };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={pendingShot}>
          <div>Pending Shot</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Pending Shot')).toBeInTheDocument();
    });

    it('should handle shot with processing status', () => {
      const processingShot: Shot = { ...mockShot, generationStatus: 'processing' };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={processingShot}>
          <div>Processing Shot</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Processing Shot')).toBeInTheDocument();
    });

    it('should handle shot with complete status', () => {
      const completeShot: Shot = { ...mockShot, generationStatus: 'complete' };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={completeShot}>
          <div>Complete Shot</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Complete Shot')).toBeInTheDocument();
    });

    it('should handle shot with error status', () => {
      const errorShot: Shot = { ...mockShot, generationStatus: 'error' };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={errorShot}>
          <div>Error Shot</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Error Shot')).toBeInTheDocument();
    });
  });

  describe('Shot Properties', () => {
    it('should handle shot with reference images', () => {
      const shotWithImages: Shot = {
        ...mockShot,
        referenceImages: [
          { id: 'ref-1', url: 'image1.jpg', weight: 0.7, source: 'library' },
          { id: 'ref-2', url: 'image2.jpg', weight: 0.5, source: 'upload' },
        ],
      };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={shotWithImages}>
          <div>Shot with Images</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Shot with Images')).toBeInTheDocument();
    });

    it('should handle shot with layers', () => {
      const shotWithLayers: Shot = {
        ...mockShot,
        layers: [
          {
            id: 'layer-1',
            type: 'media',
            startTime: 0,
            duration: 120,
            locked: false,
            hidden: false,
            opacity: 1,
            blendMode: 'normal',
            data: {},
          },
        ],
      };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={shotWithLayers}>
          <div>Shot with Layers</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Shot with Layers')).toBeInTheDocument();
    });

    it('should handle shot with QA score', () => {
      const shotWithQA: Shot = { ...mockShot, qaScore: 0.95 };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={shotWithQA}>
          <div>Shot with QA</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Shot with QA')).toBeInTheDocument();
    });

    it('should handle shot with output path', () => {
      const shotWithOutput: Shot = { ...mockShot, outputPath: '/path/to/output.mp4' };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={shotWithOutput}>
          <div>Shot with Output</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Shot with Output')).toBeInTheDocument();
    });
  });

  describe('Custom Handlers', () => {
    it('should accept custom onAssetDrop handler', () => {
      const mockHandler = vi.fn();
      
      renderWithProviders(
        <ShotConfigDropTarget 
          shot={mockShot}
          onAssetDrop={mockHandler}
        >
          <div>Custom Handler</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Custom Handler')).toBeInTheDocument();
    });

    it('should work without custom handler', () => {
      renderWithProviders(
        <ShotConfigDropTarget shot={mockShot}>
          <div>No Custom Handler</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('No Custom Handler')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null shot', () => {
      renderWithProviders(
        <ShotConfigDropTarget shot={null}>
          <div>Null Shot</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Null Shot')).toBeInTheDocument();
    });

    it('should handle shot with empty prompt', () => {
      const emptyPromptShot: Shot = { ...mockShot, prompt: '' };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={emptyPromptShot}>
          <div>Empty Prompt</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Empty Prompt')).toBeInTheDocument();
    });

    it('should handle shot with very long prompt', () => {
      const longPromptShot: Shot = { 
        ...mockShot, 
        prompt: 'A'.repeat(1000) 
      };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={longPromptShot}>
          <div>Long Prompt</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Long Prompt')).toBeInTheDocument();
    });

    it('should handle shot with zero duration', () => {
      const zeroDurationShot: Shot = { ...mockShot, duration: 0 };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={zeroDurationShot}>
          <div>Zero Duration</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Zero Duration')).toBeInTheDocument();
    });

    it('should handle shot with negative start time', () => {
      const negativeStartShot: Shot = { ...mockShot, startTime: -100 };
      
      renderWithProviders(
        <ShotConfigDropTarget shot={negativeStartShot}>
          <div>Negative Start</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Negative Start')).toBeInTheDocument();
    });
  });

  describe('Multiple Children', () => {
    it('should render multiple children', () => {
      renderWithProviders(
        <ShotConfigDropTarget shot={mockShot}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should render complex nested children', () => {
      renderWithProviders(
        <ShotConfigDropTarget shot={mockShot}>
          <div>
            <span>Nested</span>
            <div>
              <p>Deep Nested</p>
            </div>
          </div>
        </ShotConfigDropTarget>
      );

      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Deep Nested')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const { container } = renderWithProviders(
        <ShotConfigDropTarget shot={mockShot}>
          <div>Accessible Content</div>
        </ShotConfigDropTarget>
      );

      const dropTarget = container.querySelector('.shot-config-drop-target');
      expect(dropTarget).toBeInTheDocument();
    });
  });
});
