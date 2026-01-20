/**
 * Tests for ProjectContext
 * Validates state management, shot management, and dialogue phrase management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import type { Shot, DialoguePhrase } from '../types/projectDashboard';

// Helper to create wrapper with ProjectProvider
const createWrapper = (projectId?: string) => {
  return ({ children }: { children: React.ReactNode }) => (
    <ProjectProvider projectId={projectId}>{children}</ProjectProvider>
  );
};

describe('ProjectContext', () => {
  describe('useProject hook', () => {
    it('should throw error when used outside ProjectProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useProject());
      }).toThrow('useProject must be used within ProjectProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide context value when used within ProjectProvider', () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.project).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Project Management', () => {
    it('should load project when projectId is provided', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper('test-project-123'),
      });

      await waitFor(() => {
        expect(result.current.project).not.toBeNull();
      });

      expect(result.current.project?.id).toBe('test-project-123');
      expect(result.current.project?.schemaVersion).toBe('1.0');
    });

    it('should manually load project', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper(),
      });

      expect(result.current.project).toBeNull();

      await act(async () => {
        await result.current.loadProject('manual-project-456');
      });

      expect(result.current.project).not.toBeNull();
      expect(result.current.project?.id).toBe('manual-project-456');
    });
  });

  describe('Shot Management', () => {
    it('should update shot properties', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper('test-project'),
      });

      await waitFor(() => {
        expect(result.current.project).not.toBeNull();
      });

      // Add a shot to the project
      act(() => {
        if (result.current.project) {
          const shot: Shot = {
            id: 'shot-1',
            sequenceId: 'seq-1',
            startTime: 0,
            duration: 5,
            prompt: 'A beautiful sunset over the ocean',
            metadata: {},
          };
          result.current.project.shots.push(shot);
        }
      });

      // Update the shot
      act(() => {
        result.current.updateShot('shot-1', {
          prompt: 'A stunning sunset over the calm ocean with vibrant colors',
        });
      });

      const updatedShot = result.current.project?.shots.find(s => s.id === 'shot-1');
      expect(updatedShot?.prompt).toBe('A stunning sunset over the calm ocean with vibrant colors');
      expect(updatedShot?.promptValidation).toBeDefined();
      expect(updatedShot?.promptValidation?.isValid).toBe(true);
    });

    it('should validate all shots', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper('test-project'),
      });

      await waitFor(() => {
        expect(result.current.project).not.toBeNull();
      });

      // Add shots with valid and invalid prompts
      act(() => {
        if (result.current.project) {
          result.current.project.shots = [
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
              prompt: 'Short', // Too short
              metadata: {},
            },
          ];
        }
      });

      let validation: { valid: boolean; invalidShots: Shot[] };
      act(() => {
        validation = result.current.validateAllShots();
      });

      expect(validation!.valid).toBe(false);
      expect(validation!.invalidShots).toHaveLength(1);
      expect(validation!.invalidShots[0].id).toBe('shot-2');
    });

    it('should get prompt completion status', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper('test-project'),
      });

      await waitFor(() => {
        expect(result.current.project).not.toBeNull();
      });

      // Add shots with valid and invalid prompts
      act(() => {
        if (result.current.project) {
          result.current.project.shots = [
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
              prompt: 'Another valid prompt with sufficient length',
              metadata: {},
            },
            {
              id: 'shot-3',
              sequenceId: 'seq-1',
              startTime: 10,
              duration: 5,
              prompt: '', // Invalid
              metadata: {},
            },
          ];
        }
      });

      let status: { complete: number; incomplete: number; total: number };
      act(() => {
        status = result.current.getPromptCompletionStatus();
      });

      expect(status!.total).toBe(3);
      expect(status!.complete).toBe(2);
      expect(status!.incomplete).toBe(1);
    });
  });

  describe('Dialogue Phrase Management', () => {
    it('should add dialogue phrase', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper('test-project'),
      });

      await waitFor(() => {
        expect(result.current.project).not.toBeNull();
      });

      const newPhrase: Omit<DialoguePhrase, 'id'> = {
        shotId: 'shot-1',
        text: 'Hello, world!',
        startTime: 0,
        endTime: 2,
        metadata: {},
      };

      act(() => {
        result.current.addDialoguePhrase(newPhrase);
      });

      expect(result.current.project?.audioPhrases).toHaveLength(1);
      expect(result.current.project?.audioPhrases[0].text).toBe('Hello, world!');
      expect(result.current.project?.audioPhrases[0].id).toBeDefined();
    });

    it('should update dialogue phrase', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper('test-project'),
      });

      await waitFor(() => {
        expect(result.current.project).not.toBeNull();
      });

      // Add a phrase
      act(() => {
        result.current.addDialoguePhrase({
          shotId: 'shot-1',
          text: 'Original text',
          startTime: 0,
          endTime: 2,
          metadata: {},
        });
      });

      const phraseId = result.current.project?.audioPhrases[0].id;

      // Update the phrase
      act(() => {
        result.current.updateDialoguePhrase(phraseId!, {
          text: 'Updated text',
          endTime: 3,
        });
      });

      const updatedPhrase = result.current.project?.audioPhrases[0];
      expect(updatedPhrase?.text).toBe('Updated text');
      expect(updatedPhrase?.endTime).toBe(3);
    });

    it('should delete dialogue phrase', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper('test-project'),
      });

      await waitFor(() => {
        expect(result.current.project).not.toBeNull();
      });

      // Add a phrase
      act(() => {
        result.current.addDialoguePhrase({
          shotId: 'shot-1',
          text: 'To be deleted',
          startTime: 0,
          endTime: 2,
          metadata: {},
        });
      });

      expect(result.current.project?.audioPhrases).toHaveLength(1);
      const phraseId = result.current.project?.audioPhrases[0].id;

      // Delete the phrase
      act(() => {
        result.current.deleteDialoguePhrase(phraseId!);
      });

      expect(result.current.project?.audioPhrases).toHaveLength(0);
    });

    it('should link phrase to shot', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper('test-project'),
      });

      await waitFor(() => {
        expect(result.current.project).not.toBeNull();
      });

      // Add shots
      act(() => {
        if (result.current.project) {
          result.current.project.shots = [
            {
              id: 'shot-1',
              sequenceId: 'seq-1',
              startTime: 0,
              duration: 5,
              prompt: 'Shot 1',
              metadata: {},
            },
            {
              id: 'shot-2',
              sequenceId: 'seq-1',
              startTime: 5,
              duration: 5,
              prompt: 'Shot 2',
              metadata: {},
            },
          ];
        }
      });

      // Add a phrase linked to shot-1
      act(() => {
        result.current.addDialoguePhrase({
          shotId: 'shot-1',
          text: 'Phrase for shot 1',
          startTime: 0,
          endTime: 2,
          metadata: {},
        });
      });

      const phraseId = result.current.project?.audioPhrases[0].id;
      expect(result.current.project?.audioPhrases[0].shotId).toBe('shot-1');

      // Link to shot-2
      act(() => {
        result.current.linkPhraseToShot(phraseId!, 'shot-2');
      });

      expect(result.current.project?.audioPhrases[0].shotId).toBe('shot-2');
    });
  });

  describe('Selection Management', () => {
    it('should select and deselect shots', async () => {
      const { result } = renderHook(() => useProject(), {
        wrapper: createWrapper('test-project'),
      });

      await waitFor(() => {
        expect(result.current.project).not.toBeNull();
      });

      const shot: Shot = {
        id: 'shot-1',
        sequenceId: 'seq-1',
        startTime: 0,
        duration: 5,
        prompt: 'Test shot',
        metadata: {},
      };

      expect(result.current.selectedShot).toBeNull();

      act(() => {
        result.current.selectShot(shot);
      });

      expect(result.current.selectedShot).toEqual(shot);

      act(() => {
        result.current.selectShot(null);
      });

      expect(result.current.selectedShot).toBeNull();
    });
  });
});
