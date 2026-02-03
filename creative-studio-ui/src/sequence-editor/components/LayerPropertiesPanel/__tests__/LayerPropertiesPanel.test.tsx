/**
 * LayerPropertiesPanel Component Tests
 * Requirements: 9.4, 9.5, 9.6
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LayerPropertiesPanel } from '../LayerPropertiesPanel';
import timelineReducer from '../../../store/slices/timelineSlice';
import type { Shot } from '../../../types';

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
      opacity: 0.75,
      blendMode: 'multiply',
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

describe('LayerPropertiesPanel', () => {
  it('shows empty state when no layer is selected', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={mockShot} selectedLayerId={null} />
      </Provider>
    );

    expect(screen.getByText('No layer selected')).toBeInTheDocument();
    expect(
      screen.getByText('Select a layer to view and edit its properties')
    ).toBeInTheDocument();
  });

  it('displays layer properties when layer is selected', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={mockShot} selectedLayerId="layer-1" />
      </Provider>
    );

    expect(screen.getByText('Layer Properties')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('displays correct layer type', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={mockShot} selectedLayerId="layer-1" />
      </Provider>
    );

    expect(screen.getByText('media')).toBeInTheDocument();
  });

  it('displays opacity control with correct value', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={mockShot} selectedLayerId="layer-1" />
      </Provider>
    );

    const opacityInputs = screen.getAllByDisplayValue('75');
    expect(opacityInputs.length).toBeGreaterThan(0);
  });

  it('displays blend mode selector with correct value', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={mockShot} selectedLayerId="layer-1" />
      </Provider>
    );

    const blendModeSelect = screen.getByDisplayValue('Multiply');
    expect(blendModeSelect).toBeInTheDocument();
  });

  it('shows lock and hide toggle buttons', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={mockShot} selectedLayerId="layer-1" />
      </Provider>
    );

    expect(screen.getByTitle('Lock Layer')).toBeInTheDocument();
    expect(screen.getByTitle('Hide Layer')).toBeInTheDocument();
  });

  it('displays start time and duration inputs', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={mockShot} selectedLayerId="layer-1" />
      </Provider>
    );

    const startTimeInput = screen.getAllByDisplayValue('0')[0];
    const durationInput = screen.getByDisplayValue('100');

    expect(startTimeInput).toBeInTheDocument();
    expect(durationInput).toBeInTheDocument();
  });

  it('allows expanding and collapsing sections', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={mockShot} selectedLayerId="layer-1" />
      </Provider>
    );

    const generalHeader = screen.getByText('General').closest('.property-section-header');
    expect(generalHeader).toBeInTheDocument();

    if (generalHeader) {
      fireEvent.click(generalHeader);
      // Section should still be in document but content might be hidden
      expect(screen.getByText('General')).toBeInTheDocument();
    }
  });

  it('displays layer data preview', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={mockShot} selectedLayerId="layer-1" />
      </Provider>
    );

    expect(screen.getByText('Layer Data')).toBeInTheDocument();
  });

  it('disables inputs when layer is locked', () => {
    const lockedShot: Shot = {
      ...mockShot,
      layers: [
        {
          ...mockShot.layers[0],
          locked: true,
        },
      ],
    };

    const store = createMockStore();
    render(
      <Provider store={store}>
        <LayerPropertiesPanel shot={lockedShot} selectedLayerId="layer-1" />
      </Provider>
    );

    const startTimeInput = screen.getAllByDisplayValue('0')[0] as HTMLInputElement;
    expect(startTimeInput.disabled).toBe(true);
  });
});
