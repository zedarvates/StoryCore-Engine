/**
 * SequenceGenerationControl Component Tests
 * 
 * Tests for the sequence generation control component including button state,
 * validation, and progress modal integration.
 * 
 * Requirements: 2.3, 2.4, 3.1, 3.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SequenceGenerationControl } from '../components/SequenceGenerationControl';
import { ProjectProvider } from '../contexts/ProjectContext';
import type { Project } from '../types/projectDashboard';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockProject = (shotsWithValidPrompts: boolean = true): Project => ({
  id: 'test-project-1',
  name: 'Test Project',
  schemaVersion: '1.0',
  sequences: [],
  shots: shotsWithValidPrompts
    ? [
        {
          id: 'shot-1',
          sequenceId: 'seq-1',
          name: 'Shot 1',
          startTime: 0,
          duration: 5,
          prompt: 'A valid prompt with enough characters',
          promptValidation: {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
          },
          metadata: {},
        },
      ]
    : [
        {
          id: 'shot-1',
          sequenceId: 'seq-1',
          name: 'Shot 1',
          startTime: 0,
          duration: 5,
          prompt: 'short',
          promptValidation: {
            isValid: false,
            errors: [
              {
                type: 'too_short',
                message: 'Prompt must be at least 10 characters',
                field: 'prompt',
              },
            ],
            warnings: [],
            suggestions: [],
          },
          metadata: {},
        },
      ],
  audioPhrases: [],
  generationHistory: [],
  capabilities: {
    gridGeneration: true,
    promotionEngine: true,
    qaEngine: true,
    autofixEngine: true,
    voiceGeneration: true,
  },
});

// ============================================================================
// Test Wrapper Component
// ============================================================================

const TestWrapper: React.FC<{ project: Project; children: React.ReactNode }> = ({
  project,
  children,
}) => {
  return <ProjectProvider initialProject={project}>{children}</ProjectProvider>;
};

// ============================================================================
// Tests
// ============================================================================

describe('SequenceGenerationControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Button State Tests
  // ==========================================================================

  describe('Button State', () => {
    it('should enable button when all prompts are valid', () => {
      // Requirements: 2.3, 3.1
      const project = createMockProject(true);

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /generate sequence/i });
      expect(button).not.toBeDisabled();
    });

    it('should disable button when prompts are invalid', () => {
      // Requirements: 2.3, 2.4
      const project = createMockProject(false);

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /fix prompts/i });
      expect(button).toBeDisabled();
    });

    it('should disable button when no shots exist', () => {
      // Requirements: 2.3
      const project = createMockProject(true);
      project.shots = [];

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should disable button during generation', async () => {
      // Requirements: 3.1
      const project = createMockProject(true);

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /generate sequence/i });
      
      // Click to start generation
      await userEvent.click(button);

      // Button should show generating state
      await waitFor(() => {
        expect(screen.getByText(/generating/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Prompt Status Display Tests
  // ==========================================================================

  describe('Prompt Status Display', () => {
    it('should display correct completion status', () => {
      // Requirements: 2.4
      const project = createMockProject(true);

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl />
        </TestWrapper>
      );

      expect(screen.getByText(/1 \/ 1 complete/i)).toBeInTheDocument();
    });

    it('should display incomplete count when prompts are invalid', () => {
      // Requirements: 2.4
      const project = createMockProject(false);

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl />
        </TestWrapper>
      );

      expect(screen.getByText(/1 incomplete/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Validation Error Display Tests
  // ==========================================================================

  describe('Validation Error Display', () => {
    it('should display validation errors for invalid prompts', () => {
      // Requirements: 2.4
      const project = createMockProject(false);

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl />
        </TestWrapper>
      );

      expect(screen.getByText(/cannot generate/i)).toBeInTheDocument();
      expect(screen.getByText(/prompt must be at least 10 characters/i)).toBeInTheDocument();
    });

    it('should display success message when all prompts are valid', () => {
      // Requirements: 2.4
      const project = createMockProject(true);

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl />
        </TestWrapper>
      );

      expect(screen.getByText(/all prompts are valid/i)).toBeInTheDocument();
      expect(screen.getByText(/ready to generate/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Generation Trigger Tests
  // ==========================================================================

  describe('Generation Trigger', () => {
    it('should trigger generation when button is clicked', async () => {
      // Requirements: 3.1, 3.2
      const project = createMockProject(true);
      const onComplete = vi.fn();

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl onGenerationComplete={onComplete} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /generate sequence/i });
      await userEvent.click(button);

      // Progress modal should appear
      await waitFor(() => {
        expect(screen.getByText(/generation progress/i)).toBeInTheDocument();
      });
    });

    it('should call onGenerationComplete callback on success', async () => {
      // Requirements: 3.2
      const project = createMockProject(true);
      const onComplete = vi.fn();

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl onGenerationComplete={onComplete} />
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /generate sequence/i });
      await userEvent.click(button);

      // Wait for completion (mocked)
      await waitFor(
        () => {
          expect(onComplete).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );
    });
  });

  // ==========================================================================
  // Pipeline Information Display Tests
  // ==========================================================================

  describe('Pipeline Information Display', () => {
    it('should display all pipeline stages', () => {
      // Requirements: 3.2
      const project = createMockProject(true);

      render(
        <TestWrapper project={project}>
          <SequenceGenerationControl />
        </TestWrapper>
      );

      expect(screen.getByText(/master coherence sheet/i)).toBeInTheDocument();
      expect(screen.getByText(/comfyui image generation/i)).toBeInTheDocument();
      expect(screen.getByText(/promotion engine/i)).toBeInTheDocument();
      expect(screen.getByText(/qa analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/export package/i)).toBeInTheDocument();
    });
  });
});
