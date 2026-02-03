/**
 * Redux Store Tests
 * 
 * Tests for the Redux store configuration and basic functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import projectReducer from '../slices/projectSlice';
import timelineReducer from '../slices/timelineSlice';
import assetsReducer from '../slices/assetsSlice';
import panelsReducer from '../slices/panelsSlice';
import toolsReducer from '../slices/toolsSlice';
import previewReducer from '../slices/previewSlice';
import historyReducer from '../slices/historySlice';

describe('Redux Store Configuration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        project: projectReducer,
        timeline: timelineReducer,
        assets: assetsReducer,
        panels: panelsReducer,
        tools: toolsReducer,
        preview: previewReducer,
        history: historyReducer,
      },
    });
  });

  it('should initialize with default state', () => {
    const state = store.getState();
    
    expect(state.project).toBeDefined();
    expect(state.timeline).toBeDefined();
    expect(state.assets).toBeDefined();
    expect(state.panels).toBeDefined();
    expect(state.tools).toBeDefined();
    expect(state.preview).toBeDefined();
    expect(state.history).toBeDefined();
  });

  it('should have correct initial project state', () => {
    const state = store.getState();
    
    expect(state.project.metadata).toBeNull();
    expect(state.project.settings.resolution).toEqual({ width: 1920, height: 1080 });
    expect(state.project.settings.fps).toBe(30);
    expect(state.project.saveStatus.state).toBe('saved');
    expect(state.project.generationStatus.state).toBe('idle');
  });

  it('should have correct initial timeline state', () => {
    const state = store.getState();
    
    expect(state.timeline.shots).toEqual([]);
    expect(state.timeline.tracks).toHaveLength(6); // 6 default tracks
    expect(state.timeline.playheadPosition).toBe(0);
    expect(state.timeline.zoomLevel).toBe(1);
    expect(state.timeline.selectedElements).toEqual([]);
    expect(state.timeline.duration).toBe(0);
  });

  it('should have correct initial assets state', () => {
    const state = store.getState();
    
    expect(state.assets.categories).toHaveLength(7); // 7 default categories
    expect(state.assets.searchQuery).toBe('');
  });

  it('should have correct initial panels state', () => {
    const state = store.getState();
    
    expect(state.panels.layout).toBeDefined();
    expect(state.panels.layout.assetLibrary.width).toBe(20);
    expect(state.panels.layout.preview.width).toBe(50);
    expect(state.panels.layout.shotConfig.width).toBe(30);
    expect(state.panels.layout.timeline.height).toBe(40);
    expect(state.panels.activePanel).toBeNull();
    expect(state.panels.shotConfigTarget).toBeNull();
  });

  it('should have correct initial tools state', () => {
    const state = store.getState();
    
    expect(state.tools.activeTool).toBe('select');
    expect(state.tools.toolSettings).toEqual({});
  });

  it('should have correct initial preview state', () => {
    const state = store.getState();
    
    expect(state.preview.currentFrame).toBeNull();
    expect(state.preview.playbackState).toBe('stopped');
    expect(state.preview.playbackSpeed).toBe(1);
  });

  it('should have correct initial history state', () => {
    const state = store.getState();
    
    expect(state.history.undoStack).toEqual([]);
    expect(state.history.redoStack).toEqual([]);
    expect(state.history.maxStackSize).toBe(50);
  });
});
