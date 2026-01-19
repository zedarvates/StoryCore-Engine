import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterWizard } from '../CharacterWizard';

// ============================================================================
// Simple Character Wizard Tests
// ============================================================================

describe('CharacterWizard - Simple Tests', () => {
  it('renders the wizard with initial step', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    expect(screen.getByText('Create Character')).toBeInTheDocument();
    expect(screen.getByText('Basic Identity')).toBeInTheDocument();
    expect(screen.getByLabelText(/character name/i)).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Try to proceed without filling required fields
    const nextButton = screen.getByRole('button', { name: /continue to appearance/i });
    await user.click(nextButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/character name is required/i)).toBeInTheDocument();
    });
  });

  it('allows navigation to next step after filling required fields', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Fill required fields
    await user.type(screen.getByLabelText(/character name/i), 'Test Character');
    
    // Select archetype
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByRole('option', { name: 'Protagonist' }));

    // Select age range
    const ageSelect = screen.getByRole('combobox', { name: /age range/i });
    await user.click(ageSelect);
    await user.click(screen.getByRole('option', { name: /young adult/i }));

    // Proceed to next step
    const nextButton = screen.getByRole('button', { name: /continue to appearance/i });
    await user.click(nextButton);

    // Should be on step 2
    await waitFor(() => {
      expect(screen.getByText('Physical Appearance')).toBeInTheDocument();
    });
  });

  it('allows navigation back to previous step', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Fill required fields and go to step 2
    await user.type(screen.getByLabelText(/character name/i), 'Test Character');
    
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

    // Go back
    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);

    // Should be back on step 1
    await waitFor(() => {
      expect(screen.getByText('Basic Identity')).toBeInTheDocument();
      expect(screen.getByLabelText(/character name/i)).toHaveValue('Test Character');
    });
  });

  it('preserves form data when navigating between steps', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Fill step 1
    const characterName = 'Test Character';
    await user.type(screen.getByLabelText(/character name/i), characterName);
    
    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    await user.click(archetypeSelect);
    await user.click(screen.getByRole('option', { name: 'Protagonist' }));

    const ageSelect = screen.getByRole('combobox', { name: /age range/i });
    await user.click(ageSelect);
    await user.click(screen.getByRole('option', { name: /young adult/i }));

    // Go to step 2
    await user.click(screen.getByRole('button', { name: /continue to appearance/i }));

    await waitFor(() => {
      expect(screen.getByText('Physical Appearance')).toBeInTheDocument();
    });

    // Go back to step 1
    await user.click(screen.getByRole('button', { name: /back/i }));

    // Data should be preserved
    await waitFor(() => {
      expect(screen.getByLabelText(/character name/i)).toHaveValue(characterName);
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('displays world context when provided', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const worldContext = {
      id: 'world-1',
      name: 'Test World',
      genre: ['Fantasy'],
      timePeriod: 'Medieval',
      tone: ['Dark'],
      locations: [],
      rules: [],
      atmosphere: '',
      culturalElements: {
        languages: [],
        religions: [],
        traditions: [],
        historicalEvents: [],
        culturalConflicts: [],
      },
      technology: '',
      magic: '',
      conflicts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <CharacterWizard
        onComplete={onComplete}
        onCancel={onCancel}
        worldContext={worldContext}
      />
    );

    expect(screen.getByText(/creating character for world/i)).toBeInTheDocument();
    expect(screen.getByText('Test World')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<CharacterWizard onComplete={onComplete} onCancel={onCancel} />);

    // Check for required field indicators
    const nameInput = screen.getByLabelText(/character name/i);
    expect(nameInput).toHaveAttribute('aria-required', 'true');

    const archetypeSelect = screen.getByRole('combobox', { name: /character archetype/i });
    expect(archetypeSelect).toHaveAttribute('aria-required', 'true');
  });
});
