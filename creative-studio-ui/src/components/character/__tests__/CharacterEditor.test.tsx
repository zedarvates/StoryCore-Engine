import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CharacterEditor } from '../CharacterEditor';
import { useCharacterManager } from '@/hooks/useCharacterManager';
import type { Character } from '@/types/character';

// Mock the useCharacterManager hook
vi.mock('@/hooks/useCharacterManager');

const mockCharacter: Character = {
  character_id: 'char-1',
  name: 'Test Character',
  creation_method: 'wizard',
  creation_timestamp: '2024-01-01T00:00:00Z',
  version: '1.0',
  visual_identity: {
    hair_color: 'Black',
    hair_style: 'Straight',
    hair_length: 'Long',
    eye_color: 'Brown',
    eye_shape: 'Almond',
    skin_tone: 'Fair',
    facial_structure: 'Oval',
    distinctive_features: ['Scar on left cheek'],
    age_range: 'Young Adult (20-35)',
    height: 'Tall',
    build: 'Athletic',
    posture: 'Upright',
    clothing_style: 'Casual',
    color_palette: ['Blue', 'White'],
  },
  personality: {
    traits: ['Brave', 'Curious'],
    values: ['Honesty', 'Loyalty'],
    fears: ['Failure'],
    desires: ['Adventure'],
    flaws: ['Impulsive'],
    strengths: ['Intelligent'],
    temperament: 'Calm',
    communication_style: 'Direct',
  },
  background: {
    origin: 'Small village',
    occupation: 'Warrior',
    education: 'Self-taught',
    family: 'Orphan',
    significant_events: ['Lost parents at age 10'],
    current_situation: 'Traveling',
  },
  relationships: [],
  role: {
    archetype: 'Hero',
    narrative_function: 'Protagonist',
    character_arc: 'From naive to experienced',
  },
};

describe('CharacterEditor', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnDelete = vi.fn();
  const mockGetCharacter = vi.fn();
  const mockUpdateCharacter = vi.fn();
  const mockDeleteCharacter = vi.fn();
  const mockValidateCharacter = vi.fn();
  const mockCheckDependencies = vi.fn();
  const mockGetAllCharacters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGetCharacter.mockReturnValue(mockCharacter);
    mockUpdateCharacter.mockResolvedValue(mockCharacter);
    mockDeleteCharacter.mockResolvedValue(undefined);
    mockValidateCharacter.mockReturnValue({ valid: true, errors: {} });
    mockCheckDependencies.mockReturnValue({ stories: [], relationships: [] });
    mockGetAllCharacters.mockReturnValue([]);
    
    (useCharacterManager as any).mockReturnValue({
      getCharacter: mockGetCharacter,
      updateCharacter: mockUpdateCharacter,
      deleteCharacter: mockDeleteCharacter,
      validateCharacter: mockValidateCharacter,
      checkDependencies: mockCheckDependencies,
      getAllCharacters: mockGetAllCharacters,
    });
  });

  describe('Rendering', () => {
    it('should render the editor modal with character name', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByText(/Edit Character: Test Character/i)).toBeInTheDocument();
    });

    it('should render all tabs', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByRole('tab', { name: /Identity/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Appearance/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Personality/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Background/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Relationships/i })).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      expect(screen.getByRole('button', { name: /Delete Character/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });

    it('should not render if character not found', () => {
      mockGetCharacter.mockReturnValue(undefined);
      
      const { container } = render(
        <CharacterEditor
          characterId="non-existent"
          onClose={mockOnClose}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Tab Navigation', () => {
    it('should show Identity tab by default', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const identityTab = screen.getByRole('tab', { name: /Identity/i });
      expect(identityTab).toHaveClass('character-editor__tab--active');
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    });

    it('should switch to Appearance tab when clicked', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const appearanceTab = screen.getByRole('tab', { name: /Appearance/i });
      fireEvent.click(appearanceTab);
      
      expect(appearanceTab).toHaveClass('character-editor__tab--active');
      expect(screen.getByLabelText(/Hair Color/i)).toBeInTheDocument();
    });

    it('should switch to Personality tab when clicked', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const personalityTab = screen.getByRole('tab', { name: /Personality/i });
      fireEvent.click(personalityTab);
      
      expect(personalityTab).toHaveClass('character-editor__tab--active');
      expect(screen.getByLabelText(/Traits/i)).toBeInTheDocument();
    });

    it('should switch to Background tab when clicked', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const backgroundTab = screen.getByRole('tab', { name: /Background/i });
      fireEvent.click(backgroundTab);
      
      expect(backgroundTab).toHaveClass('character-editor__tab--active');
      expect(screen.getByLabelText(/Origin/i)).toBeInTheDocument();
    });

    it('should switch to Relationships tab when clicked', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const relationshipsTab = screen.getByRole('tab', { name: /Relationships/i });
      fireEvent.click(relationshipsTab);
      
      expect(relationshipsTab).toHaveClass('character-editor__tab--active');
      expect(screen.getAllByText(/Relationships/i).length).toBeGreaterThan(0);
    });
  });

  describe('Form Editing', () => {
    it('should populate form fields with character data', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Test Character');
      
      const archetypeSelect = screen.getByLabelText(/Archetype/i) as HTMLSelectElement;
      expect(archetypeSelect.value).toBe('Hero');
    });

    it('should update form data when fields are changed', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      expect((nameInput as HTMLInputElement).value).toBe('Updated Name');
    });

    it('should mark form as dirty when fields are changed', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      // Try to close - should show unsaved warning
      const closeButton = screen.getByRole('button', { name: /Close editor/i });
      fireEvent.click(closeButton);
      
      expect(screen.getAllByText(/Unsaved Changes/i).length).toBeGreaterThan(0);
    });

    it('should clear field errors when field is edited', () => {
      mockValidateCharacter.mockReturnValue({
        valid: false,
        errors: { name: ['Name is required'] },
      });
      
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      // Trigger validation by trying to save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);
      
      // Error should be displayed
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      
      // Edit the field
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'New Name' } });
      
      // Error should be cleared
      expect(screen.queryByText(/Name is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should validate form before saving', async () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockValidateCharacter).toHaveBeenCalled();
      });
    });

    it('should display validation errors', async () => {
      mockValidateCharacter.mockReturnValue({
        valid: false,
        errors: {
          name: ['Name is required'],
          'role.archetype': ['Archetype is required'],
        },
      });
      
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Archetype is required/i)).toBeInTheDocument();
      });
    });

    it('should not save if validation fails', async () => {
      mockValidateCharacter.mockReturnValue({
        valid: false,
        errors: { name: ['Name is required'] },
      });
      
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateCharacter).not.toHaveBeenCalled();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should call updateCharacter when save is clicked', async () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateCharacter).toHaveBeenCalledWith('char-1', expect.any(Object));
      });
    });

    it('should call onSave callback after successful save', async () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(mockCharacter);
      });
    });

    it('should close editor after successful save', async () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error message if save fails', async () => {
      mockUpdateCharacter.mockRejectedValue(new Error('Save failed'));
      
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Save failed/i)).toBeInTheDocument();
      });
    });

    it('should disable save button while saving', async () => {
      mockUpdateCharacter.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);
      
      expect(saveButton).toBeDisabled();
      expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
    });
  });

  describe('Cancel Functionality', () => {
    it('should close editor immediately if no changes', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show unsaved changes warning if form is dirty', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      // Make a change
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      // Try to cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      
      expect(screen.getAllByText(/Unsaved Changes/i).length).toBeGreaterThan(0);
    });

    it('should close editor when discard is confirmed', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      // Make a change
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      // Try to cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      
      // Confirm discard
      const discardButton = screen.getByRole('button', { name: /Discard Changes/i });
      fireEvent.click(discardButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should keep editor open when keep editing is clicked', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      // Make a change
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      // Try to cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      
      // Click keep editing
      const keepEditingButton = screen.getByRole('button', { name: /Keep Editing/i });
      fireEvent.click(keepEditingButton);
      
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.queryByText(/Unsaved Changes/i)).not.toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('should check dependencies when delete is clicked', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /Delete Character/i });
      fireEvent.click(deleteButton);
      
      expect(mockCheckDependencies).toHaveBeenCalledWith('char-1');
    });

    it('should show confirmation dialog without dependencies', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /Delete Character/i });
      fireEvent.click(deleteButton);
      
      expect(screen.getAllByText(/Delete Character/i).length).toBeGreaterThan(1);
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it('should show warning with story dependencies', () => {
      mockCheckDependencies.mockReturnValue({
        stories: [
          { id: 'story-1', title: 'Test Story' },
        ],
        relationships: [],
      });
      
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /Delete Character/i });
      fireEvent.click(deleteButton);
      
      expect(screen.getByText(/Stories \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Test Story/i)).toBeInTheDocument();
    });

    it('should show warning with relationship dependencies', () => {
      mockCheckDependencies.mockReturnValue({
        stories: [],
        relationships: [
          { character_id: 'char-2', name: 'Related Character' },
        ],
      });
      
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /Delete Character/i });
      fireEvent.click(deleteButton);
      
      expect(screen.getByText(/Relationships \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Related Character/i)).toBeInTheDocument();
    });

    it('should delete character when confirmed', async () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /Delete Character/i });
      fireEvent.click(deleteButton);
      
      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getAllByText(/Delete Character/i).length).toBeGreaterThan(1);
      });
      
      const confirmButtons = screen.getAllByRole('button', { name: /Delete Character/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
      
      await waitFor(() => {
        expect(mockDeleteCharacter).toHaveBeenCalledWith('char-1');
      });
    });

    it('should call onDelete callback after successful deletion', async () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
          onDelete={mockOnDelete}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /Delete Character/i });
      fireEvent.click(deleteButton);
      
      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getAllByText(/Delete Character/i).length).toBeGreaterThan(1);
      });
      
      const confirmButtons = screen.getAllByRole('button', { name: /Delete Character/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
      
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('char-1');
      });
    });

    it('should close editor after successful deletion', async () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /Delete Character/i });
      fireEvent.click(deleteButton);
      
      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getAllByText(/Delete Character/i).length).toBeGreaterThan(1);
      });
      
      const confirmButtons = screen.getAllByRole('button', { name: /Delete Character/i });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should cancel deletion when cancel is clicked', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /Delete Character/i });
      fireEvent.click(deleteButton);
      
      const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);
      
      expect(mockDeleteCharacter).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument(); // Still in editor
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close editor when Escape is pressed without changes', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show unsaved warning when Escape is pressed with changes', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      // Make a change
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(screen.getAllByText(/Unsaved Changes/i).length).toBeGreaterThan(0);
    });
  });

  describe('Backdrop Click', () => {
    it('should close editor when backdrop is clicked without changes', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const backdrop = screen.getByRole('presentation');
      fireEvent.click(backdrop);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show unsaved warning when backdrop is clicked with changes', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      // Make a change
      const nameInput = screen.getByLabelText(/Name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      
      const backdrop = screen.getByRole('presentation');
      fireEvent.click(backdrop);
      
      expect(screen.getAllByText(/Unsaved Changes/i).length).toBeGreaterThan(0);
    });

    it('should not close when clicking inside modal', () => {
      render(
        <CharacterEditor
          characterId="char-1"
          onClose={mockOnClose}
        />
      );
      
      const modal = screen.getByRole('dialog');
      fireEvent.click(modal);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
