import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCharacterPersistence } from '@/hooks/useCharacterPersistence';
import { eventEmitter, CharacterEventType, type CharacterCreatedEventPayload } from '@/services/eventEmitter';
import { createEmptyCharacter, type Character } from '@/types/character';
import { CharacterWizard } from '../CharacterWizard';

vi.mock('@/hooks/useCharacterPersistence', () => ({ useCharacterPersistence: vi.fn() }));
vi.mock('../../WizardVoiceAssistant', () => ({ WizardVoiceAssistant: () => null }));

describe('CharacterWizard completion', () => {
  const onComplete = vi.fn<(character: Character) => void>();
  const onCancel = vi.fn<() => void>();
  const saveCharacter = vi.fn<ReturnType<typeof useCharacterPersistence>['saveCharacter']>();
  const onCreated = vi.fn<(payload: CharacterCreatedEventPayload) => void>();
  let unsubscribe: () => void;

  beforeEach(async () => {
    vi.resetAllMocks();
    const actual = await vi.importActual<typeof import('@/hooks/useCharacterPersistence')>('@/hooks/useCharacterPersistence');
    vi.mocked(useCharacterPersistence).mockImplementation(() => ({ ...actual.useCharacterPersistence(), saveCharacter }));
    unsubscribe = eventEmitter.on(CharacterEventType.CHARACTER_CREATED, onCreated).unsubscribe;
  });

  afterEach(() => {
    unsubscribe();
    vi.restoreAllMocks();
  });

  function openWizard() {
    const character = createEmptyCharacter();
    const initialData = { ...character, name: 'Test Hero', role: { ...character.role, archetype: 'Protagonist' } };
    render(<CharacterWizard initialData={initialData} onComplete={onComplete} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /guided creation/i }));
  }

  function finishWizard() {
    openWizard();
    fireEvent.click(screen.getByRole('button', { name: 'Go to next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go to next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete wizard' }));
  }

  it('persists the character before invoking the callback and emitting the creation event', async () => {
    const saved = { ...createEmptyCharacter(), character_id: 'saved-hero', name: 'Test Hero' };
    let resolveSave!: (character: Character) => void;
    const pending = new Promise<Character>((resolve) => { resolveSave = resolve; });
    saveCharacter.mockReturnValue(pending);
    finishWizard();

    expect(saveCharacter).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      character_id: expect.any(String),
      name: 'Test Hero',
      creation_method: 'wizard',
      creation_timestamp: expect.any(Number),
    }));
    expect(onCreated).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();

    resolveSave(saved);
    await waitFor(() => expect(onComplete).toHaveBeenCalledExactlyOnceWith(saved));
    expect(onCreated).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      character: saved,
      source: 'wizard',
      timestamp: expect.any(Date),
    }));
  });

  it('reports a save failure without completing or emitting an event', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    saveCharacter.mockRejectedValue(new Error('Storage unavailable'));
    finishWizard();

    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('saving the character')));
    expect(onComplete).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('allows cancellation before persisting a character', () => {
    openWizard();
    fireEvent.click(screen.getByRole('button', { name: 'Abort Synthesis' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(saveCharacter).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
