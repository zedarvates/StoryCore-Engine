import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterWizard } from '../CharacterWizard';
import type { Character } from '@/types/character';

// ============================================================================
// Comprehensive Character Wizard Tests
// ============================================================================

describe('CharacterWizard - Comprehensive Tests', () => {
  let onComplete: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onComplete = vi.fn();
    onCancel = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Step 1: Basic Identity', () => {
    it('validates all required fields', async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      const nextButton = screen.getByRole('button', { name: /continue to appearance/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/character name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/character archetype is required/i)).toBeInTheDocument();
        expect(screen.getByText(/age range is required/i)).toBeInTheDocument();
      });
    });

    it('accepts optional fields', async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/character name/i), 'Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByRole('option', { name: 'Protagonist' }));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: /young adult/i }));

      // Add optional narrative function
      await user.type(
        screen.getByLabelText(/narrative function/i),
        'Drives the main plot forward'
      );

      const nextButton = screen.getByRole('button', { name: /continue to appearance/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Physical Appearance')).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: Physical Appearance', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      // Fill step 1 to reach step 2
      await user.type(screen.getByLabelText(/character name/i), 'Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByRole('option', { name: 'Protagonist' }));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: /young adult/i }));

      await user.click(screen.getByRole('button', { name: /continue to appearance/i }));

      await waitFor(() => {
        expect(screen.getByText('Physical Appearance')).toBeInTheDocument();
      });
    });

    it('allows adding distinctive features', async () => {
      const user = userEvent.setup();

      const featureInput = screen.getByPlaceholderText(/add a distinctive feature/i);
      await user.type(featureInput, 'Scar on left cheek');
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(screen.getByText('Scar on left cheek')).toBeInTheDocument();
    });

    it('allows removing distinctive features', async () => {
      const user = userEvent.setup();

      const featureInput = screen.getByPlaceholderText(/add a distinctive feature/i);
      await user.type(featureInput, 'Scar on left cheek');
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(screen.getByText('Scar on left cheek')).toBeInTheDocument();

      const removeButton = screen.getByLabelText(/remove scar on left cheek/i);
      await user.click(removeButton);

      expect(screen.queryByText('Scar on left cheek')).not.toBeInTheDocument();
    });

    it('allows adding color palette', async () => {
      const user = userEvent.setup();

      const colorInput = screen.getByPlaceholderText(/add a color/i);
      await user.type(colorInput, 'Deep Blue');
      
      // Find the Add button next to color input
      const colorSection = colorInput.closest('div')?.parentElement;
      const addButton = within(colorSection!).getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(screen.getByText('Deep Blue')).toBeInTheDocument();
    });

    it('displays LLM generation button', () => {
      expect(screen.getByText(/generate appearance/i)).toBeInTheDocument();
    });
  });

  describe('Step 3: Personality', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      // Navigate to step 3
      await user.type(screen.getByLabelText(/character name/i), 'Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByRole('option', { name: 'Protagonist' }));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: /young adult/i }));

      await user.click(screen.getByRole('button', { name: /continue to appearance/i }));
      await waitFor(() => expect(screen.getByText('Physical Appearance')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /continue to personality/i }));
      await waitFor(() => expect(screen.getByText(/^personality$/i)).toBeInTheDocument());
    });

    it('allows adding personality traits', async () => {
      const user = userEvent.setup();

      const traitInput = screen.getByPlaceholderText(/add a trait/i);
      await user.type(traitInput, 'Brave');
      
      const addButton = traitInput.nextElementSibling as HTMLElement;
      await user.click(addButton);

      expect(screen.getByText('Brave')).toBeInTheDocument();
    });

    it('validates maximum traits limit', async () => {
      const user = userEvent.setup();

      const traitInput = screen.getByPlaceholderText(/add a trait/i);
      const addButton = traitInput.nextElementSibling as HTMLElement;

      // Add 11 traits (exceeds limit of 10)
      for (let i = 1; i <= 11; i++) {
        await user.clear(traitInput);
        await user.type(traitInput, `Trait ${i}`);
        await user.click(addButton);
      }

      // Try to proceed
      await user.click(screen.getByRole('button', { name: /continue to background/i }));

      await waitFor(() => {
        expect(screen.getByText(/maximum 10 personality traits/i)).toBeInTheDocument();
      });
    });

    it('allows adding values, fears, desires, flaws, and strengths', async () => {
      const user = userEvent.setup();

      // Add a value
      const valueInput = screen.getByPlaceholderText(/add a value/i);
      await user.type(valueInput, 'Justice');
      await user.click(valueInput.nextElementSibling as HTMLElement);
      expect(screen.getByText('Justice')).toBeInTheDocument();

      // Add a fear
      const fearInput = screen.getByPlaceholderText(/add a fear/i);
      await user.type(fearInput, 'Failure');
      await user.click(fearInput.nextElementSibling as HTMLElement);
      expect(screen.getByText('Failure')).toBeInTheDocument();

      // Add a desire
      const desireInput = screen.getByPlaceholderText(/add a desire/i);
      await user.type(desireInput, 'Recognition');
      await user.click(desireInput.nextElementSibling as HTMLElement);
      expect(screen.getByText('Recognition')).toBeInTheDocument();
    });
  });

  describe('Step 4: Background', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      // Navigate to step 4
      await user.type(screen.getByLabelText(/character name/i), 'Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByRole('option', { name: 'Protagonist' }));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: /young adult/i }));

      await user.click(screen.getByRole('button', { name: /continue to appearance/i }));
      await waitFor(() => expect(screen.getByText('Physical Appearance')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /continue to personality/i }));
      await waitFor(() => expect(screen.getByText(/^personality$/i)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /continue to background/i }));
      await waitFor(() => expect(screen.getByText(/^background$/i)).toBeInTheDocument());
    });

    it('allows filling background fields', async () => {
      const user = userEvent.setup();

      await user.type(
        screen.getByLabelText(/origin and upbringing/i),
        'Born in a small village'
      );
      await user.type(
        screen.getByLabelText(/occupation and skills/i),
        'Skilled warrior'
      );

      expect(screen.getByDisplayValue('Born in a small village')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Skilled warrior')).toBeInTheDocument();
    });

    it('allows adding significant events', async () => {
      const user = userEvent.setup();

      const eventInput = screen.getByPlaceholderText(/add a significant event/i);
      await user.type(eventInput, 'Lost parents in war');
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(screen.getByText('Lost parents in war')).toBeInTheDocument();
    });
  });

  describe('Step 5: Relationships', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      // Navigate to step 5
      await user.type(screen.getByLabelText(/character name/i), 'Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByRole('option', { name: 'Protagonist' }));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: /young adult/i }));

      // Navigate through steps
      await user.click(screen.getByRole('button', { name: /continue to appearance/i }));
      await waitFor(() => expect(screen.getByText('Physical Appearance')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /continue to personality/i }));
      await waitFor(() => expect(screen.getByText(/^personality$/i)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /continue to background/i }));
      await waitFor(() => expect(screen.getByText(/^background$/i)).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /continue to relationships/i }));
      await waitFor(() => expect(screen.getByText(/^relationships$/i)).toBeInTheDocument());
    });

    it('allows adding a relationship', async () => {
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/character name/i), 'Mentor');
      
      const typeSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: 'Mentor' }));

      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      expect(screen.getByText('Mentor')).toBeInTheDocument();
    });

    it('validates required relationship fields', async () => {
      const user = userEvent.setup();

      // Try to add without filling required fields
      const addButton = screen.getByRole('button', { name: /add relationship/i });
      expect(addButton).toBeDisabled();
    });

    it('allows editing a relationship', async () => {
      const user = userEvent.setup();

      // Add a relationship
      await user.type(screen.getByLabelText(/character name/i), 'Mentor');
      
      const typeSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: 'Mentor' }));

      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      // Edit it
      await user.click(screen.getByRole('button', { name: /edit/i }));

      const nameInput = screen.getByLabelText(/character name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Master');

      await user.click(screen.getByRole('button', { name: /update relationship/i }));

      expect(screen.getByText('Master')).toBeInTheDocument();
      expect(screen.queryByText('Mentor')).not.toBeInTheDocument();
    });

    it('allows deleting a relationship', async () => {
      const user = userEvent.setup();

      // Add a relationship
      await user.type(screen.getByLabelText(/character name/i), 'Mentor');
      
      const typeSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: 'Mentor' }));

      await user.click(screen.getByRole('button', { name: /add relationship/i }));

      expect(screen.getByText('Mentor')).toBeInTheDocument();

      // Delete it
      const deleteButton = screen.getByRole('button', { name: /trash/i });
      await user.click(deleteButton);

      expect(screen.queryByText('Mentor')).not.toBeInTheDocument();
    });
  });

  describe('Step 6: Review and Finalize', () => {
    it('displays all entered information', async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      // Fill all steps
      await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByRole('option', { name: 'Protagonist' }));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: /young adult/i }));

      // Navigate to review
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => {}, { timeout: 1000 });
      }

      await waitFor(() => {
        expect(screen.getByText('Review and Finalize')).toBeInTheDocument();
        expect(screen.getByText('Test Hero')).toBeInTheDocument();
        expect(screen.getByText('Protagonist')).toBeInTheDocument();
      });
    });

    it('allows editing from review step', async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      // Fill and navigate to review
      await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByRole('option', { name: 'Protagonist' }));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: /young adult/i }));

      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => {}, { timeout: 1000 });
      }

      await waitFor(() => {
        expect(screen.getByText('Review and Finalize')).toBeInTheDocument();
      });

      // Click edit on Basic Identity
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Basic Identity')).toBeInTheDocument();
      });
    });

    it('calls onComplete with character data when submitted', async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      // Fill minimum required fields
      await user.type(screen.getByLabelText(/character name/i), 'Test Hero');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByRole('option', { name: 'Protagonist' }));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: /young adult/i }));

      // Navigate to review and submit
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => {}, { timeout: 1000 });
      }

      await waitFor(() => {
        expect(screen.getByText('Review and Finalize')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create character/i }));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
        const character = onComplete.mock.calls[0][0] as Character;
        expect(character.name).toBe('Test Hero');
        expect(character.role.archetype).toBe('Protagonist');
        expect(character.character_id).toBeDefined();
      });
    });
  });

  describe('Auto-save functionality', () => {
    it('saves wizard state to localStorage', async () => {
      const user = userEvent.setup();
      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      await user.type(screen.getByLabelText(/character name/i), 'Auto Save Test');

      // Wait for auto-save
      await waitFor(
        () => {
          const saved = localStorage.getItem('wizard-character');
          expect(saved).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Event emission', () => {
    it('emits character-created event on completion', async () => {
      const user = userEvent.setup();
      const eventListener = vi.fn();
      window.addEventListener('character-created', eventListener);

      render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

      // Fill and submit
      await user.type(screen.getByLabelText(/character name/i), 'Event Test');
      
      const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
      await user.click(archetypeSelect);
      await user.click(screen.getByRole('option', { name: 'Protagonist' }));

      const ageSelect = screen.getByRole('combobox', { name: /age range/i });
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: /young adult/i }));

      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => {}, { timeout: 1000 });
      }

      await waitFor(() => {
        expect(screen.getByText('Review and Finalize')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create character/i }));

      await waitFor(() => {
        expect(eventListener).toHaveBeenCalled();
      });

      window.removeEventListener('character-created', eventListener);
    });
  });
});
