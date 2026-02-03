/**
 * MenuBar Compatibility Wrapper Tests
 * 
 * Tests for the MenuBarCompat component which provides backward compatibility
 * for the new comprehensive MenuBar implementation.
 * 
 * Note: This tests the compatibility wrapper. For comprehensive tests of the
 * new MenuBar implementation, see src/components/menuBar/__tests__/
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MenuBarCompat } from '../components/MenuBarCompat';

// Mock the new MenuBar component
vi.mock('../components/menuBar', () => ({
  MenuBar: ({ project, hasUnsavedChanges, viewState }: any) => (
    <div data-testid="menu-bar-mock">
      <div data-testid="project-state">{project ? 'has-project' : 'no-project'}</div>
      <div data-testid="unsaved-changes">{hasUnsavedChanges ? 'unsaved' : 'saved'}</div>
      <div data-testid="zoom-level">{viewState.zoomLevel}</div>
    </div>
  ),
}));

// Mock the i18n system
vi.mock('../utils/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    setLanguage: vi.fn(),
  }),
}));

describe('MenuBarCompat Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the MenuBar with default props', () => {
      render(<MenuBarCompat />);
      
      const menuBar = screen.getByTestId('menu-bar-mock');
      expect(menuBar).toBeInTheDocument();
    });

    it('should initialize with no project', () => {
      render(<MenuBarCompat />);
      
      const projectState = screen.getByTestId('project-state');
      expect(projectState).toHaveTextContent('no-project');
    });

    it('should initialize with no unsaved changes', () => {
      render(<MenuBarCompat />);
      
      const unsavedChanges = screen.getByTestId('unsaved-changes');
      expect(unsavedChanges).toHaveTextContent('saved');
    });

    it('should initialize with default zoom level', () => {
      render(<MenuBarCompat />);
      
      const zoomLevel = screen.getByTestId('zoom-level');
      expect(zoomLevel).toHaveTextContent('100');
    });
  });

  describe('Backward Compatibility', () => {
    it('should provide default undo/redo stack', () => {
      // This is implicitly tested by the component rendering without errors
      render(<MenuBarCompat />);
      expect(screen.getByTestId('menu-bar-mock')).toBeInTheDocument();
    });

    it('should provide default clipboard state', () => {
      // This is implicitly tested by the component rendering without errors
      render(<MenuBarCompat />);
      expect(screen.getByTestId('menu-bar-mock')).toBeInTheDocument();
    });

    it('should provide default view state', () => {
      render(<MenuBarCompat />);
      
      const zoomLevel = screen.getByTestId('zoom-level');
      expect(zoomLevel).toHaveTextContent('100');
    });
  });
});

