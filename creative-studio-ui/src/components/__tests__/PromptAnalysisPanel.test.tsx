/**
 * Tests for PromptAnalysisPanel component
 * Requirements: 6.1, 6.2, 6.5
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromptAnalysisPanel } from '../PromptAnalysisPanel';
import { ProjectContext, type ProjectContextValue } from '../../contexts/ProjectContext';
import type { Project, Shot } from '../../types/projectDashboard';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: 'test-project',
    name: 'Test Project',
    schemaVersion: '1.0',
    sequences: [],
    shots: [],
    audioPhrases: [],
    generationHistory: [],
    capabilities: {
      gridGeneration: true,
      promotionEngine: true,
      qaEngine: true,
      autofixEngine: true,
      voiceGeneration: true,
    },
    ...overrides,
  };
}

function createMockContextValue(project: Project | null): ProjectContextValue {
  return {
    project,
    selectedShot: null,
    generationStatus: { stage: 'idle', progress: 0 },
    isGenerating: false,
    isLoading: false,
    error: null,
    loadProject: async () => {},
    saveProject: async () => {},
    updateShot: () => {},
    validateAllShots: () => ({ valid: true, invalidShots: [] }),
    getPromptCompletionStatus: () => {
      if (!project) return { complete: 0, incomplete: 0, total: 0 };
      const total = project.shots.length;
      const complete = project.shots.filter(s => s.prompt.trim().length >= 10).length;
      return { complete, incomplete: total - complete, total };
    },
    addDialoguePhrase: () => {},
    updateDialoguePhrase: () => {},
    deleteDialoguePhrase: () => {},
    linkPhraseToShot: () => {},
    generateSequence: async () => null,
    cancelGeneration: () => {},
    selectShot: () => {},
  };
}

function renderWithContext(project: Project | null) {
  const contextValue = createMockContextValue(project);
  return render(
    <ProjectContext.Provider value={contextValue}>
      <PromptAnalysisPanel />
    </ProjectContext.Provider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('PromptAnalysisPanel', () => {
  it('should render without crashing', () => {
    const project = createMockProject();
    renderWithContext(project);
    
    // Component should render
    expect(screen.getByText(/Total Shots/i)).toBeInTheDocument();
  });

  it('should display "No project loaded" when project is null', () => {
    renderWithContext(null);
    
    expect(screen.getByText(/No project loaded/i)).toBeInTheDocument();
  });

  it('should display summary statistics', () => {
    const project = createMockProject({
      shots: [
        {
          id: 'shot-1',
          sequenceId: 'seq-1',
          startTime: 0,
          duration: 5,
          prompt: 'Valid prompt with enough characters',
          metadata: {},
        },
        {
          id: 'shot-2',
          sequenceId: 'seq-1',
          startTime: 5,
          duration: 5,
          prompt: '',
          metadata: {},
        },
      ],
    });

    renderWithContext(project);

    // Should show total shots section
    expect(screen.getByText(/Total Shots/i)).toBeInTheDocument();
    
    // Should show the total count
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Should show overall analysis
    expect(screen.getByText(/Overall Analysis/i)).toBeInTheDocument();
  });

  it('should display "All prompts are complete" when all shots have valid prompts', () => {
    const project = createMockProject({
      shots: [
        {
          id: 'shot-1',
          sequenceId: 'seq-1',
          startTime: 0,
          duration: 5,
          prompt: 'Valid prompt with enough characters',
          metadata: {},
        },
        {
          id: 'shot-2',
          sequenceId: 'seq-1',
          startTime: 5,
          duration: 5,
          prompt: 'Another valid prompt here',
          metadata: {},
        },
      ],
    });

    renderWithContext(project);

    expect(screen.getByText(/All prompts are complete/i)).toBeInTheDocument();
  });

  it('should display shots needing attention when there are incomplete prompts', () => {
    const project = createMockProject({
      shots: [
        {
          id: 'shot-1',
          sequenceId: 'seq-1',
          startTime: 0,
          duration: 5,
          prompt: '',
          metadata: {},
        },
      ],
    });

    renderWithContext(project);

    expect(screen.getByText(/Shots Needing Attention/i)).toBeInTheDocument();
  });
});
