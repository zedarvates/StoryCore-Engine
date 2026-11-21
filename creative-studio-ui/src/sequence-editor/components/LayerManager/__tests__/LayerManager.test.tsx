/**
 * LayerManager Component Tests
 * Requirements: 9.1, 9.2, 9.3, 9.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LayerManager } from '../LayerManager';
import timelineReducer from '../../../store/slices/timelineSlice';
import type { Shot, Layer } from '../../../types';

// Mock shot data
const mockShot: Shot = {
  id: 'shot-1',
  name: 'Test Shot',
  startTime: 0,
  duration: 100,
  layers: [
    {
      id: 'layer-1',
      type: 'media',
      startTime: 0,
      duration: 100,
      locked: false,
      hidden: false,
      opacity: 1,
      blendMode: 'normal',
      data: {
        sourceUrl: 'test.mp4',
        trim: { start: 0, end: 100 },
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          anchor: { x: 0.5, y: 0.5 },
        },
      },
    },
    {
      id: 'layer-2',
      type: 'text',
      startTime: 0,
      duration: 100,
      locked: false,
      hidden: false,
      opacity: 0.8,
      blendMode: 'overlay',
      data: {
        content: 'Test Text',
        font: 'Arial',
        size: 24,
        color: '#FFFFFF',
        position: { x: 0.5, y: 0.5 },
      },
    },
  ],
  referenceImages: [],
  prompt: 'Test prompt',
  parameters: {
    seed: 42,
    denoising: 0.7,
    steps: 20,
    guidance: 7.5,
    sampler: 'euler',
    scheduler: 'normal',
  },
  generationStatus: 'pending',
};

const createMockStore = () => {
  return configureStore({
    reducer: {
      timeline: timelineReducer,
    },
    preloadedState: {
      timeline: {
        shots: [mockShot],
        tracks: [],
        playheadPosition: 0,
        zoomLevel: 1,
        selectedElements: [],
        duration: 100,
        markers: [],
        regions: [],
        selectedMarkers: [],
        selectedRegions: [],
      },
    },
  });
};

describe('LayerManager', () => {
  it('renders layer list correctly', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerManager shot={mockShot} selectedLayerIds={[]} />
      </Provider>
    );

    expect(screen.getByText('Layers')).toBeInTheDocument();
    expect(screen.getByText(/Media/)).toBeInTheDocument();
    expect(screen.getByText(/Text/)).toBeInTheDocument();
  });

  it('displays add layer button', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerManager shot={mockShot} selectedLayerIds={[]} />
      </Provider>
    );

    const addButton = screen.getByText('+ Add Layer');
    expect(addButton).toBeInTheDocument();
  });

  it('shows add layer menu when button is clicked', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerManager shot={mockShot} selectedLayerIds={[]} />
      </Provider>
    );

    const addButton = screen.getByText('+ Add Layer');
    fireEvent.click(addButton);

    // Check for layer type options
    expect(screen.getByText('Audio')).toBeInTheDocument();
    expect(screen.getByText('Effects')).toBeInTheDocument();
    expect(screen.getByText('Transition')).toBeInTheDocument();
  });

  it('highlights selected layers', () => {
    const store = createMockStore();
    const { container } = render(
      <Provider store={store}>
        <LayerManager shot={mockShot} selectedLayerIds={['layer-1']} />
      </Provider>
    );

    const selectedLayer = container.querySelector('.layer-item.selected');
    expect(selectedLayer).toBeInTheDocument();
  });

  it('displays layer status icons for locked and hidden layers', () => {
    const lockedShot: Shot = {
      ...mockShot,
      layers: [
        {
          ...mockShot.layers[0],
          locked: true,
          hidden: true,
        },
      ],
    };

    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerManager shot={lockedShot} selectedLayerIds={[]} />
      </Provider>
    );

    expect(screen.getByTitle('Locked')).toBeInTheDocument();
    expect(screen.getByTitle('Hidden')).toBeInTheDocument();
  });

  it('shows empty state when no layers exist', () => {
    const emptyShot: Shot = {
      ...mockShot,
      layers: [],
    };

    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerManager shot={emptyShot} selectedLayerIds={[]} />
      </Provider>
    );

    expect(screen.getByText('No layers yet')).toBeInTheDocument();
    expect(screen.getByText('Click "Add Layer" to get started')).toBeInTheDocument();
  });

  it('displays layer information correctly', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerManager shot={mockShot} selectedLayerIds={[]} />
      </Provider>
    );

    expect(screen.getAllByText(/Duration: 100 frames/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Opacity: 80%/)).toBeInTheDocument();
    expect(screen.getByText(/Blend: overlay/)).toBeInTheDocument();
  });
});
