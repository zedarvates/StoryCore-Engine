import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorldWizard } from '../WorldWizard';

// ============================================================================
// Simple World Wizard Tests
// ============================================================================

describe('WorldWizard', () => {
  it('renders the wizard with first step', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<WorldWizard onComplete={onComplete} onCancel={onCancel} />);

    // Check wizard title
    expect(screen.getByText('Create World')).toBeInTheDocument();

    // Check step indicator
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();

    // Check first step content
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/World Name/i)).toBeInTheDocument();
  });

  it('displays validation errors for required fields', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<WorldWizard onComplete={onComplete} onCancel={onCancel} />);

    // Try to go to next step without filling required fields
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);

    // Should show validation errors
    expect(await screen.findByText(/World name is required/i)).toBeInTheDocument();
  });

  it('allows navigation between steps', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<WorldWizard onComplete={onComplete} onCancel={onCancel} />);

    // Fill required fields
    await user.type(screen.getByLabelText(/World Name/i), 'Test World');
    await user.type(screen.getByLabelText(/Time Period/i), 'Medieval');
    
    // Select genre
    const fantasyCheckbox = screen.getByLabelText('Fantasy');
    await user.click(fantasyCheckbox);

    // Select tone
    const darkCheckbox = screen.getByLabelText('Dark');
    await user.click(darkCheckbox);

    // Go to next step
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);

    // Should be on step 2
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    expect(screen.getByText('World Rules')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<WorldWizard onComplete={onComplete} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows all 5 steps in the step indicator', () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<WorldWizard onComplete={onComplete} onCancel={onCancel} />);

    // Check all step titles are present
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('World Rules')).toBeInTheDocument();
    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Culture')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('preserves form data when navigating back', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(<WorldWizard onComplete={onComplete} onCancel={onCancel} />);

    // Fill in world name
    const worldNameInput = screen.getByLabelText(/World Name/i);
    await user.type(worldNameInput, 'Eldoria');

    // Fill other required fields
    await user.type(screen.getByLabelText(/Time Period/i), 'Medieval');
    await user.click(screen.getByLabelText('Fantasy'));
    await user.click(screen.getByLabelText('Dark'));

    // Go to next step
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Go back to previous step
    await user.click(screen.getByRole('button', { name: /Previous/i }));

    // World name should still be there
    expect(worldNameInput).toHaveValue('Eldoria');
  });
});
