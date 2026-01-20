/**
 * Unit tests for PromptManagementPanel component
 * Requirements: 1.1, 1.5
 * 
 * Note: These tests focus on component rendering and basic functionality.
 * Full integration tests with ProjectContext are in integration test suite.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromptManagementPanel } from '../PromptManagementPanel';
import type { Shot } from '../../types/projectDashboard';

// Mock the ProjectContext
const mockUseProject = vi.fn();
vi.mock('../../contexts/ProjectContext', () => ({
  useProject: () => mockUseProject(),
  ProjectProvider: ({ children }: any) => children,
}));

// Mock the ShotPromptEditor component
vi.mock('../ShotPromptEditor', () => ({
  ShotPromptEditor: ({ shot }: any) => (
    <div data-testid="shot-prompt-editor">
      <div data-testid="mock-shot-id">{shot.id}</div>
    </div>
  ),
}));

describe('PromptManagementPanel', () => {
  const createMockShot = (id: string, prompt: string = '', isValid: boolean = false): Shot => ({
    id,
    sequenceId: 'seq-1',
    startTime: 0,
    duration: 5,
    prompt,
    promptValidation: isValid
      ? { isValid: true, errors: [], warnings: [], suggestions: [] }
      : { isValid: false, errors: [{ type: 'too_short', message: 'Prompt is too short', field: 'prompt' }], warnings: [], suggestions: [] },
    metadata: {},
  });

  const createMockContext = (shots: Shot[] = [], selectedShot: Shot | null = null) => {
    const complete = shots.filter(s => s.promptValidation?.isValid).length;
    return {
      project: shots.length > 0 ? {
        id: 'project-1',
        name: 'Test Project',
        schemaVersion: '1.0',
        sequences: [],
        shots,
        audioPhrases: [],
        generationHistory: [],
        capabilities: {
          gridGeneration: true,
          promotionEngine: true,
          qaEngine: true,
          autofixEngine: true,
          voiceGeneration: true,
        },
      } : null,
      selectedShot,
      generationStatus: { stage: 'idle' as const, progress: 0 },
      isGenerating: false,
      isLoading: false,
      error: null,
      loadProject: vi.fn(),
      saveProject: vi.fn(),
      updateShot: vi.fn(),
      validateAllShots: vi.fn(() => ({ valid: true, invalidShots: [] })),
      getPromptCompletionStatus: vi.fn(() => ({
        complete,
        incomplete: shots.length - complete,
        total: shots.length,
      })),
      addDialoguePhrase: vi.fn(),
      updateDialoguePhrase: vi.fn(),
      deleteDialoguePhrase: vi.fn(),
      linkPhraseToShot: vi.fn(),
      generateSequence: vi.fn(),
      cancelGeneration: vi.fn(),
      selectShot: vi.fn(),
    };
  };

  describe('Shot List Rendering', () => {
    it('should display empty state when no shots exist', () => {
      mockUseProject.mockReturnValue(createMockContext([]));
      render(<PromptManagementPanel />);

      expect(screen.getByText('No shots in this project')).toBeInTheDocument();
      expect(screen.getByText('Add shots to begin prompt management')).toBeInTheDocument();
    });

    it('should render shot list with shots', () => {
      const shots = [
        createMockShot('shot-1', 'Valid prompt with enough characters', true),
        createMockShot('shot-2', 'Short', false),
      ];
      mockUseProject.mockReturnValue(createMockContext(shots));
      render(<PromptManagementPanel />);

      // Check that shot IDs are displayed (first 8 chars)
      expect(screen.getByText(/Shot shot-1/i)).toBeInTheDocument();
      expect(screen.getByText(/Shot shot-2/i)).toBeInTheDocument();
    });

    it('should display completion status summary', () => {
      const shots = [
        createMockShot('shot-1', 'Valid prompt with enough characters', true),
        createMockShot('shot-2', 'Short', false),
        createMockShot('shot-3', '', false),
      ];
      mockUseProject.mockReturnValue(createMockContext(shots));
      render(<PromptManagementPanel />);

      // Check completion badges
      expect(screen.getByText(/1.*Complete/i)).toBeInTheDocument();
      expect(screen.getByText(/2.*Incomplete/i)).toBeInTheDocument();
    });

    it('should show shot timing information', () => {
      const shot = createMockShot('shot-1', 'Test prompt', true);
      shot.startTime = 10;
      shot.duration = 5;
      mockUseProject.mockReturnValue(createMockContext([shot]));
      render(<PromptManagementPanel />);

      expect(screen.getByText(/Time: 10s - 15s/i)).toBeInTheDocument();
    });
  });

  describe('Shot Selection', () => {
    it('should show empty state when no shot is selected', () => {
      const shots = [createMockShot('shot-1', 'Test prompt', true)];
      mockUseProject.mockReturnValue(createMockContext(shots, null));
      render(<PromptManagementPanel />);

      expect(screen.getByText('No shot selected')).toBeInTheDocument();
      expect(screen.getByText('Select a shot from the list to edit its prompt')).toBeInTheDocument();
    });

    it('should display prompt editor when shot is selected', () => {
      const shot = createMockShot('shot-1', 'Test prompt', true);
      mockUseProject.mockReturnValue(createMockContext([shot], shot));
      render(<PromptManagementPanel />);

      // Check that editor is displayed
      expect(screen.getByTestId('shot-prompt-editor')).toBeInTheDocument();
      expect(screen.getByTestId('mock-shot-id')).toHaveTextContent('shot-1');
    });
  });

  describe('Prompt Completion Indicators', () => {
    it('should show "Complete" badge for valid prompts', () => {
      const shots = [createMockShot('shot-1', 'Valid prompt with enough characters', true)];
      mockUseProject.mockReturnValue(createMockContext(shots));
      render(<PromptManagementPanel />);

      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should show "Invalid" badge for invalid prompts', () => {
      const shots = [createMockShot('shot-1', 'Short', false)];
      mockUseProject.mockReturnValue(createMockContext(shots));
      render(<PromptManagementPanel />);

      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });

    it('should show "Empty" badge for empty prompts', () => {
      const shot = createMockShot('shot-1', '', false);
      shot.promptValidation = undefined; // No validation yet
      mockUseProject.mockReturnValue(createMockContext([shot]));
      render(<PromptManagementPanel />);

      expect(screen.getByText('Empty')).toBeInTheDocument();
    });
  });

  describe('Validation Error Display', () => {
    it('should display validation errors for selected shot', () => {
      const shot = createMockShot('shot-1', 'Short', false);
      mockUseProject.mockReturnValue(createMockContext([shot], shot));
      render(<PromptManagementPanel />);

      // Check for validation error display
      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('Prompt is too short')).toBeInTheDocument();
    });

    it('should not display validation errors for valid shots', () => {
      const shot = createMockShot('shot-1', 'Valid prompt with enough characters', true);
      mockUseProject.mockReturnValue(createMockContext([shot], shot));
      render(<PromptManagementPanel />);

      // Should not show validation errors
      expect(screen.queryByText('Validation Errors')).not.toBeInTheDocument();
    });
  });

  describe('Shot Details Display', () => {
    it('should display shot details when selected', () => {
      const shot = createMockShot('shot-1', 'Test prompt', true);
      shot.duration = 10;
      shot.startTime = 5;
      shot.sequenceId = 'seq-123';
      mockUseProject.mockReturnValue(createMockContext([shot], shot));
      render(<PromptManagementPanel />);

      // Check shot details - use getAllByText since shot-1 appears in multiple places
      const shotIdElements = screen.getAllByText('shot-1');
      expect(shotIdElements.length).toBeGreaterThan(0);
      expect(screen.getByText('10s')).toBeInTheDocument();
      expect(screen.getByText('5s')).toBeInTheDocument();
      expect(screen.getByText('seq-123')).toBeInTheDocument();
    });

    it('should display shot metadata badges when available', () => {
      const shot = createMockShot('shot-1', 'Test prompt', true);
      shot.metadata = {
        cameraAngle: 'wide',
        lighting: 'natural',
        mood: 'happy',
      };
      mockUseProject.mockReturnValue(createMockContext([shot], shot));
      render(<PromptManagementPanel />);

      // Check metadata badges - use getAllByText since metadata appears in both list and detail view
      const cameraElements = screen.getAllByText(/Camera: wide/i);
      expect(cameraElements.length).toBeGreaterThan(0);
      const lightingElements = screen.getAllByText(/Lighting: natural/i);
      expect(lightingElements.length).toBeGreaterThan(0);
      const moodElements = screen.getAllByText(/Mood: happy/i);
      expect(moodElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      mockUseProject.mockReturnValue(createMockContext([]));
      render(<PromptManagementPanel />);

      expect(screen.getByText('Shots')).toBeInTheDocument();
      expect(screen.getByText('Prompt Editor')).toBeInTheDocument();
    });

    it('should have descriptive text for empty states', () => {
      mockUseProject.mockReturnValue(createMockContext([]));
      render(<PromptManagementPanel />);

      expect(screen.getByText('No shots in this project')).toBeInTheDocument();
      expect(screen.getByText('No shot selected')).toBeInTheDocument();
    });
  });
});

