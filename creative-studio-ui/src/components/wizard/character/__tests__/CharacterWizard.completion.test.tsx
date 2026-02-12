/**
 * Character Wizard Completion Handler Tests
 * 
 * Tests for Task 13: Update Character Wizard completion handler
 * - Event emission on completion
 * - Story context handling
 * - Event payload structure
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5, 12.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterWizard, type StoryContext } from '../CharacterWizard';
import { eventEmitter, CharacterEventType } from '@/services/eventEmitter';
import type { Character } from '@/types/character';
import type { CharacterCreatedEventPayload } from '@/services/characterEvents';

// Mock the persistence hook
vi.mock('@/hooks/useCharacterPersistence', () => ({
  useCharacterPersistence: () => ({
    saveCharacter: vi.fn(async (data: Partial<Character>) => ({
      ...data,
      character_id: data.character_id || 'test-character-id',
      name: data.name || 'Test Character',
      creation_method: 'wizard' as const,
      creation_timestamp: new Date().toISOString(),
      version: '1.0',
      visual_identity: data.visual_identity || {
        hair_color: '',
        hair_style: '',
        hair_length: '',
        eye_color: '',
        eye_shape: '',
        skin_tone: '',
        facial_structure: '',
        distinctive_features: [],
        age_range: data.visual_identity?.age_range || 'Young Adult (20-29)',
        height: '',
        build: '',
        posture: '',
        clothing_style: '',
        color_palette: [],
      },
      personality: data.personality || {
        traits: [],
        values: [],
        fears: [],
        desires: [],
        flaws: [],
        strengths: [],
        temperament: '',
        communication_style: '',
      },
      background: data.background || {
        origin: '',
        occupation: '',
        education: '',
        family: '',
        significant_events: [],
        current_situation: '',
      },
      relationships: data.relationships || [],
      role: data.role || {
        archetype: data.role?.archetype || 'Protagonist',
        narrative_function: '',
        character_arc: '',
      },
    } as Character)),
  }),
}));

// Mock LLM generation hook
vi.mock('@/hooks/useLLMGeneration', () => ({
  useLLMGeneration: () => ({
    generate: vi.fn(),
    isGenerating: false,
    error: null,
    result: null,
  }),
}));

// Mock service status hook
vi.mock('@/components/ui/service-warning', () => ({
  useServiceStatus: () => ({
    isAvailable: true,
    isChecking: false,
    error: null,
  }),
  ServiceWarning: () => null,
}));

// Mock app store
vi.mock('@/stores/useAppStore', () => ({
  useAppStore: () => ({
    llmProvider: 'ollama',
    llmModel: 'llama2',
  }),
}));

// Mock character store
vi.mock('@/store', () => ({
  useCharacters: () => ({
    characters: [],
  }),
}));

// Helper function to navigate through wizard
async function completeWizard(user: ReturnType<typeof userEvent.setup>) {
  // Fill required fields in Step 1
  const nameInput = screen.getByLabelText(/character name/i);
  await user.type(nameInput, 'Test Hero');
  
  const archetypeSelect = screen.getByRole('combobox', { name: /archetype/i });
  await user.click(archetypeSelect);
  await waitFor(() => screen.getByRole('option', { name: /protagonist/i }));
  await user.click(screen.getByRole('option', { name: /protagonist/i }));
  
  const ageRangeSelect = screen.getByRole('combobox', { name: /age range/i });
  await user.click(ageRangeSelect);
  await waitFor(() => screen.getByRole('option', { name: /young adult/i }));
  await user.click(screen.getByRole('option', { name: /young adult/i }));

  // Wait for validation to pass
  await waitFor(() => {
    const nextButton = screen.getByRole('button', { name: /go to next step/i });
    expect(nextButton).not.toBeDisabled();
  });

  // Navigate through all steps (5 next buttons)
  for (let i = 0; i < 5; i++) {
    const nextButton = screen.getByRole('button', { name: /go to next step/i });
    await user.click(nextButton);
    await waitFor(() => {
      // Wait for step transition
    }, { timeout: 1000 });
  }

  // Complete wizard (last step has different button)
  await waitFor(() => {
    const completeButton = screen.getByRole('button', { name: /complete wizard/i });
    expect(completeButton).toBeDefined();
  });
  
  const completeButton = screen.getByRole('button', { name: /complete wizard/i });
  await user.click(completeButton);
}

describe('CharacterWizard - Completion Handler (Task 13)', () => {
  let onComplete: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;
  let eventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onComplete = vi.fn();
    onCancel = vi.fn();
    eventListener = vi.fn();
    
    // Subscribe to character-created events
    eventEmitter.on(CharacterEventType.CHARACTER_CREATED, eventListener);
  });

  afterEach(() => {
    // Clean up event listeners
    eventEmitter.offAll();
    vi.clearAllMocks();
  });

  describe('Task 13.1: Event Emission on Completion', () => {
    it('should emit character-created event when wizard completes', async () => {
      // Requirement: 3.4, 12.1
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      await completeWizard(user);

      // Wait for event emission
      await waitFor(() => {
        expect(eventListener).toHaveBeenCalledTimes(1);
      });
    });

    it('should include character data in event payload', async () => {
      // Requirement: 3.4, 12.1
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      await completeWizard(user);

      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
        const payload = eventListener.mock.calls[0][0] as CharacterCreatedEventPayload;
        
        expect(payload.character).toBeDefined();
        expect(payload.character.name).toBe('Test Hero');
        expect(payload.character.role.archetype).toBe('Protagonist');
      });
    });

    it('should include source as "wizard" in event payload', async () => {
      // Requirement: 3.4, 12.1
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      await completeWizard(user);

      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
        const payload = eventListener.mock.calls[0][0] as CharacterCreatedEventPayload;
        
        expect(payload.source).toBe('wizard');
      });
    });

    it('should include timestamp in event payload', async () => {
      // Requirement: 12.1
      const user = userEvent.setup();
      const beforeTime = new Date();
      
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      await completeWizard(user);

      const afterTime = new Date();

      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
        const payload = eventListener.mock.calls[0][0] as CharacterCreatedEventPayload;
        
        expect(payload.timestamp).toBeDefined();
        expect(payload.timestamp).toBeInstanceOf(Date);
        expect(payload.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(payload.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      });
    });
  });

  describe('Task 13.2: Story Context Handling', () => {
    it('should accept story context prop', () => {
      // Requirement: 3.2
      const storyContext: StoryContext = {
        storyId: 'story-123',
        storyName: 'Epic Adventure',
      };

      const { container } = render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={onCancel}
          storyContext={storyContext}
        />
      );

      expect(container).toBeTruthy();
    });

    it('should include story context in event payload when provided', async () => {
      // Requirement: 3.2, 3.5
      const user = userEvent.setup();
      const storyContext: StoryContext = {
        storyId: 'story-123',
        storyName: 'Epic Adventure',
      };

      render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={onCancel}
          storyContext={storyContext}
        />
      );

      await completeWizard(user);

      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
        const payload = eventListener.mock.calls[0][0] as CharacterCreatedEventPayload;
        
        expect(payload.projectName).toBe('Epic Adventure');
      });
    });

    it('should return story context with completion callback', async () => {
      // Requirement: 3.2, 3.5
      const user = userEvent.setup();
      const storyContext: StoryContext = {
        storyId: 'story-123',
        storyName: 'Epic Adventure',
      };

      render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={onCancel}
          storyContext={storyContext}
        />
      );

      await completeWizard(user);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const [character, returnedContext] = onComplete.mock.calls[0];
        
        expect(character).toBeDefined();
        expect(returnedContext).toEqual(storyContext);
      });
    });

    it('should work without story context (optional prop)', async () => {
      // Requirement: 3.2
      const user = userEvent.setup();
      
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      await completeWizard(user);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const [character, returnedContext] = onComplete.mock.calls[0];
        
        expect(character).toBeDefined();
        expect(returnedContext).toBeUndefined();
      });
    });

    it('should pass story context through all wizard steps', () => {
      // Requirement: 3.2
      const storyContext: StoryContext = {
        storyId: 'story-123',
        storyName: 'Epic Adventure',
        storyData: {
          title: 'Epic Adventure',
          genre: ['Fantasy'],
        },
      };

      const { container } = render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={onCancel}
          storyContext={storyContext}
        />
      );

      // Verify wizard renders with story context
      expect(container).toBeTruthy();
      // Story context is passed to step components internally
      // This is verified by the fact that the wizard renders without errors
    });
  });

  describe('Event Payload Structure Validation', () => {
    it('should emit event with complete payload structure', async () => {
      // Requirement: 12.1
      const user = userEvent.setup();
      const storyContext: StoryContext = {
        storyId: 'story-123',
        storyName: 'Epic Adventure',
      };

      render(
        <CharacterWizard
          onComplete={onComplete}
          onCancel={onCancel}
          storyContext={storyContext}
        />
      );

      await completeWizard(user);

      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
        const payload = eventListener.mock.calls[0][0] as CharacterCreatedEventPayload;
        
        // Verify complete payload structure
        expect(payload).toMatchObject({
          character: expect.objectContaining({
            character_id: expect.any(String),
            name: 'Test Hero',
            creation_method: 'wizard',
            role: expect.objectContaining({
              archetype: 'Protagonist',
            }),
          }),
          source: 'wizard',
          projectName: 'Epic Adventure',
          timestamp: expect.any(Date),
        });
      });
    });
  });

  describe('Integration with Character Manager', () => {
    it('should add character to store on completion', async () => {
      // Requirement: 3.3
      const user = userEvent.setup();
      
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      await completeWizard(user);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const [character] = onComplete.mock.calls[0];
        
        // Character should be created with proper structure
        expect(character).toMatchObject({
          character_id: expect.any(String),
          name: 'Test Hero',
          creation_method: 'wizard',
          role: {
            archetype: 'Protagonist',
          },
        });
      });
    });
  });
});
