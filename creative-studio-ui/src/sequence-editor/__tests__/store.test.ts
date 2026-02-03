/**
 * Redux Store Tests
 * 
 * Basic tests to verify Redux store configuration and slices
 */

import { describe, it, expect } from 'vitest';
import { store } from '../store';
import { addShot, updateShot, setPlayheadPosition } from '../store/slices/timelineSlice';
import { setProject, markModified, markSaved } from '../store/slices/projectSlice';
import { setActiveTool } from '../store/slices/toolsSlice';
import { addAsset, setSearchQuery } from '../store/slices/assetsSlice';
import type { Shot } from '../types';

describe('Redux Store Configuration', () => {
  it('should have initial state for all slices', () => {
    const state = store.getState();
    
    expect(state.project).toBeDefined();
    expect(state.timeline).toBeDefined();
    expect(state.assets).toBeDefined();
    expect(state.panels).toBeDefined();
    expect(state.tools).toBeDefined();
    expect(state.preview).toBeDefined();
    expect(state.history).toBeDefined();
  });

  it('should have correct initial values', () => {
    const state = store.getState();
    
    expect(state.project.metadata).toBeNull();
    expect(state.project.saveStatus.state).toBe('saved');
    expect(state.timeline.shots).toEqual([]);
    expect(state.timeline.playheadPosition).toBe(0);
    expect(state.tools.activeTool).toBe('select');
    expect(state.preview.playbackState).toBe('stopped');
  });
});

describe('Timeline Slice', () => {
  it('should add a shot to the timeline', () => {
    const shot: Shot = {
      id: 'test-shot-1',
      name: 'Test Shot',
      startTime: 0,
      duration: 150,
      layers: [],
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

    store.dispatch(addShot(shot));
    const state = store.getState();
    
    expect(state.timeline.shots).toHaveLength(1);
    expect(state.timeline.shots[0].id).toBe('test-shot-1');
    expect(state.timeline.duration).toBe(150);
  });

  it('should update a shot', () => {
    store.dispatch(updateShot({ id: 'test-shot-1', updates: { duration: 200 } }));
    const state = store.getState();
    
    expect(state.timeline.shots[0].duration).toBe(200);
    expect(state.timeline.duration).toBe(200);
  });

  it('should update playhead position', () => {
    store.dispatch(setPlayheadPosition(100));
    const state = store.getState();
    
    expect(state.timeline.playheadPosition).toBe(100);
  });
});

describe('Project Slice', () => {
  it('should set project metadata', () => {
    const metadata = {
      name: 'Test Project',
      path: '/test/path',
      created: new Date(),
      modified: new Date(),
      author: 'Test Author',
      description: 'Test Description',
    };

    store.dispatch(setProject(metadata));
    const state = store.getState();
    
    expect(state.project.metadata).toEqual(metadata);
  });

  it('should mark project as modified', () => {
    store.dispatch(markModified());
    const state = store.getState();
    
    expect(state.project.saveStatus.state).toBe('modified');
  });

  it('should mark project as saved', () => {
    store.dispatch(markSaved());
    const state = store.getState();
    
    expect(state.project.saveStatus.state).toBe('saved');
    expect(state.project.saveStatus.lastSaveTime).toBeDefined();
  });
});

describe('Tools Slice', () => {
  it('should change active tool', () => {
    store.dispatch(setActiveTool('trim'));
    const state = store.getState();
    
    expect(state.tools.activeTool).toBe('trim');
  });
});

describe('Assets Slice', () => {
  it('should add an asset to a category', () => {
    const asset = {
      id: 'test-asset-1',
      name: 'Test Character',
      type: 'character' as const,
      category: 'characters',
      thumbnailUrl: '/test/thumbnail.jpg',
      metadata: {
        description: 'Test character',
      },
      tags: ['test'],
      source: 'user' as const,
      createdAt: new Date(),
    };

    store.dispatch(addAsset({ categoryId: 'characters', asset }));
    const state = store.getState();
    
    const charactersCategory = state.assets.categories.find(cat => cat.id === 'characters');
    expect(charactersCategory?.assets).toHaveLength(1);
    expect(charactersCategory?.assets[0].id).toBe('test-asset-1');
  });

  it('should set search query', () => {
    store.dispatch(setSearchQuery('test query'));
    const state = store.getState();
    
    expect(state.assets.searchQuery).toBe('test query');
  });
});
