import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorldPersistence } from '@/hooks/useWorldPersistence';
import { useStore } from '@/store';
import type { World } from '@/types/world';
import { clearWizardState, loadWizardState } from '@/utils/wizardStorage';
import { WorldBuilderWizard } from '../WorldBuilderWizard';

vi.mock('@/hooks/useWorldPersistence', () => ({
  useWorldPersistence: vi.fn(),
}));

vi.mock('../../WizardVoiceAssistant', () => ({
  WizardVoiceAssistant: () => null,
}));

describe('World Builder Wizard', () => {
  const saveWorld = vi.fn<(world: World) => Promise<void>>();
  const addWorld = vi.fn<ReturnType<typeof useStore.getState>['addWorld']>();
  const onComplete = vi.fn<(world: World) => void>();
  const onCancel = vi.fn<() => void>();
  const originalAddWorld = useStore.getState().addWorld;

  beforeEach(async () => {
    vi.clearAllMocks();
    const actual = await vi.importActual<typeof import('@/hooks/useWorldPersistence')>('@/hooks/useWorldPersistence');
    vi.mocked(useWorldPersistence).mockImplementation(() => ({
      ...actual.useWorldPersistence(),
      saveWorld,
    }));
    useStore.setState({ addWorld });
  });

  afterEach(() => {
    clearWizardState('world');
    useStore.setState({ addWorld: originalAddWorld });
  });

  const next = () => screen.getByRole('button', { name: 'Continue Evolution' });

  it('keeps the next phase locked until both a name and an archetype are entered', () => {
    render(<WorldBuilderWizard onComplete={onComplete} onCancel={onCancel} />);
    expect(next()).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('What is this world called?'), { target: { value: 'Eldoria' } });
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Fantasy' }));
    expect(next()).toBeEnabled();
  });

  it('preserves the entered data when returning to the previous phase', () => {
    render(<WorldBuilderWizard onComplete={onComplete} onCancel={onCancel} initialData={{ name: 'Eldoria', genre: ['fantasy'] }} />);
    fireEvent.click(next());
    expect(screen.getByRole('heading', { name: 'Prime Locations' })).toBeInTheDocument();
    expect(next()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous Phase' }));
    expect(screen.getByDisplayValue('Eldoria')).toBeInTheDocument();
    expect(next()).toBeEnabled();
  });

  it('saves a draft with the current phase and world data', () => {
    render(<WorldBuilderWizard onComplete={onComplete} onCancel={onCancel} initialData={{ name: 'Eldoria', genre: ['fantasy'] }} />);
    fireEvent.click(next());
    fireEvent.click(screen.getByTitle('Save Draft'));
    expect(loadWizardState<World>('world')).toMatchObject({
      currentStep: 2,
      formData: { name: 'Eldoria', genre: ['fantasy'] },
    });
    expect(screen.getByText(/evolution saved/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('records a named location and completes with the same world saved to both destinations', async () => {
    render(<WorldBuilderWizard onComplete={onComplete} onCancel={onCancel} initialData={{ name: 'Eldoria', genre: ['fantasy'] }} />);
    fireEvent.click(next());
    fireEvent.click(screen.getByRole('button', { name: 'Record Site' }));
    fireEvent.change(screen.getByPlaceholderText('Title of Location...'), { target: { value: 'Ferry Pier' } });
    fireEvent.click(next());
    expect(screen.getByRole('heading', { name: 'Cultural Fabric' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finalize Reality' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    const world = onComplete.mock.calls[0][0];
    expect(world).toMatchObject({
      name: 'Eldoria',
      genre: ['fantasy'],
      locations: [{ name: 'Ferry Pier' }],
      keyObjects: [],
    });
    expect(addWorld).toHaveBeenCalledExactlyOnceWith(world);
    expect(saveWorld).toHaveBeenCalledExactlyOnceWith(world);
  });

  it('calls cancellation without storing or completing a new world', () => {
    render(<WorldBuilderWizard onComplete={onComplete} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abort Genesis' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
    expect(addWorld).not.toHaveBeenCalled();
    expect(saveWorld).not.toHaveBeenCalled();
  });
});
