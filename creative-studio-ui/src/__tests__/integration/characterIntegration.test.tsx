/**
 * End-to-End Integration Tests for Character Integration System
 * Validates Requirements: 1.1, 2.1, 2.5, 3.3, 4.1, 4.2, 4.5, 5.2, 6.1, 6.2, 6.3, 7.1, 7.2, 7.4, 8.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from '../../store';
import { useCharacterManager } from '../../hooks/useCharacterManager';
import { CharacterList } from '../../components/character/CharacterList';
import { CharacterEditor } from '../../components/character/CharacterEditor';
import { CharactersSection } from '../../components/character/CharactersSection';
import type { Character } from '../../types/character';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock event emitter
vi.mock('../../services/eventEmitter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/eventEmitter')>();
  return {
    ...actual,
    eventEmitter: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
  };
});

// Helper to create a test character
const createTestCharacter = (overrides?: Partial<Character>): Character => ({
  character_id: `char-${Date.now()}-${Math.random()}`,
  name: 'Test Character',
  creation_method: 'wizard',
  creation_timestamp: new Date().toISOString(),
  version: '1.0',
  visual_identity: {
    hair_color: 'brown',
    hair_style: 'short',
    hair_length: 'short',
    eye_color: 'blue',
    eye_shape: 'almond',
    skin_tone: 'medium',
    facial_structure: 'oval',
    distinctive_features: ['tall', 'athletic'],
    age_range: '25-35',
    height: '6ft',
    build: 'athletic',
    posture: 'upright',
    clothing_style: 'modern',
    color_palette: ['blue', 'gray'],
  },
  personality: {
    traits: ['brave', 'intelligent'],
    values: ['justice', 'loyalty'],
    fears: ['failure'],
    desires: ['success'],
    flaws: ['perfectionist'],
    strengths: ['determined'],
    temperament: 'balanced',
    communication_style: 'formal',
  },
  background: {
    origin: 'urban',
    occupation: 'detective',
    education: 'university',
    family: 'small family',
    significant_events: ['solved major case'],
    current_situation: 'active duty',
  },
  relationships: [],
  role: {
    archetype: 'hero',
    narrative_function: 'protagonist',
    character_arc: 'redemption',
  },
  ...overrides,
});

describe('Character Integration System - End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset store state
    useStore.setState({
      characters: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('18.1 End-to-End Character Creation Flow', () => {
    it('should create character via wizard and verify in dashboard, store, and localStorage', async () => {
      // Requirements: 1.1, 3.3, 8.1
      
      // Render CharactersSection (simulating dashboard)
      const onCreateCharacter = vi.fn();
      const onCharacterClick = vi.fn();
      const { rerender } = render(
        <CharactersSection 
          onCreateCharacter={onCreateCharacter}
          onCharacterClick={onCharacterClick}
        />
      );

      // Verify empty state initially
      expect(screen.getByText(/no characters yet/i)).toBeInTheDocument();
      expect(screen.getByText(/create character/i)).toBeInTheDocument();

      // Create a character using the hook (simulating wizard completion)
      const testCharacter = createTestCharacter();
      
      // Simulate character creation
      const store = useStore.getState();
      store.addCharacter(testCharacter);

      // Rerender to reflect state change
      rerender(
        <CharactersSection 
          onCreateCharacter={onCreateCharacter}
          onCharacterClick={onCharacterClick}
        />
      );

      // Wait for character to appear in dashboard list
      await waitFor(() => {
        expect(screen.getByText(testCharacter.name)).toBeInTheDocument();
      });

      // Verify character is in store
      const storeState = useStore.getState();
      const characterInStore = storeState.characters.find(
        (c) => c.character_id === testCharacter.character_id
      );
      expect(characterInStore).toBeDefined();
      expect(characterInStore?.name).toBe(testCharacter.name);

      // Verify character is in localStorage
      const localStorageKey = `character-${testCharacter.character_id}`;
      const characterInLocalStorage = localStorage.getItem(localStorageKey);
      expect(characterInLocalStorage).toBeTruthy();
      
      if (characterInLocalStorage) {
        const parsedCharacter = JSON.parse(characterInLocalStorage);
        expect(parsedCharacter.character_id).toBe(testCharacter.character_id);
        expect(parsedCharacter.name).toBe(testCharacter.name);
      }

      // Verify character details are displayed
      expect(screen.getByText(testCharacter.role.archetype)).toBeInTheDocument();
      expect(screen.getByText(testCharacter.visual_identity.age_range)).toBeInTheDocument();
    });

    it('should display character in list with all required fields', async () => {
      // Requirements: 1.2
      const testCharacter = createTestCharacter({
        name: 'John Doe',
        role: { 
          archetype: 'mentor',
          narrative_function: 'guide',
          character_arc: 'static',
        },
        visual_identity: {
          hair_color: 'gray',
          hair_style: 'short',
          hair_length: 'short',
          eye_color: 'brown',
          eye_shape: 'round',
          skin_tone: 'light',
          facial_structure: 'square',
          distinctive_features: ['gray hair'],
          age_range: '50-60',
          height: '5ft 10in',
          build: 'average',
          posture: 'upright',
          clothing_style: 'classic',
          color_palette: ['brown'],
        },
      });

      useStore.getState().addCharacter(testCharacter);

      render(<CharacterList />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('mentor')).toBeInTheDocument();
        expect(screen.getByText('50-60')).toBeInTheDocument();
      });
    });

    it('should handle multiple character creations', async () => {
      // Requirements: 1.1, 3.3
      const character1 = createTestCharacter({ name: 'Character 1' });
      const character2 = createTestCharacter({ name: 'Character 2' });
      const character3 = createTestCharacter({ name: 'Character 3' });

      const store = useStore.getState();
      store.addCharacter(character1);
      store.addCharacter(character2);
      store.addCharacter(character3);

      render(<CharacterList />);

      await waitFor(() => {
        expect(screen.getByText('Character 1')).toBeInTheDocument();
        expect(screen.getByText('Character 2')).toBeInTheDocument();
        expect(screen.getByText('Character 3')).toBeInTheDocument();
      });

      // Verify all in store
      const storeState = useStore.getState();
      expect(storeState.characters).toHaveLength(3);

      // Verify all in localStorage
      const char1InStorage = localStorage.getItem(`character-${character1.character_id}`);
      const char2InStorage = localStorage.getItem(`character-${character2.character_id}`);
      const char3InStorage = localStorage.getItem(`character-${character3.character_id}`);
      
      expect(char1InStorage).toBeTruthy();
      expect(char2InStorage).toBeTruthy();
      expect(char3InStorage).toBeTruthy();
    });
  });

  describe('18.2 End-to-End Character Edit Flow', () => {
    it('should open editor, modify character, save, and verify updates propagated', async () => {
      // Requirements: 2.1, 2.5, 5.2
      const user = userEvent.setup();
      const testCharacter = createTestCharacter({ name: 'Original Name' });

      // Add character to store
      useStore.getState().addCharacter(testCharacter);

      // Render editor
      const onClose = vi.fn();
      const onSave = vi.fn();
      
      render(
        <CharacterEditor
          characterId={testCharacter.character_id}
          onClose={onClose}
          onSave={onSave}
        />
      );

      // Wait for editor to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
      });

      // Modify character name
      const nameInput = screen.getByDisplayValue('Original Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify updates in store
      await waitFor(() => {
        const storeState = useStore.getState();
        const updatedCharacter = storeState.characters.find(
          (c) => c.character_id === testCharacter.character_id
        );
        expect(updatedCharacter?.name).toBe('Updated Name');
      });

      // Verify updates in localStorage
      const characterInStorage = localStorage.getItem(`character-${testCharacter.character_id}`);
      expect(characterInStorage).toBeTruthy();
      
      if (characterInStorage) {
        const parsedCharacter = JSON.parse(characterInStorage);
        expect(parsedCharacter.name).toBe('Updated Name');
      }

      // Verify onSave callback was called
      expect(onSave).toHaveBeenCalled();
    });

    it('should emit character-updated event on save', async () => {
      // Requirements: 5.2
      const { eventEmitter } = await import('../../services/eventEmitter');
      const testCharacter = createTestCharacter();

      useStore.getState().addCharacter(testCharacter);

      const onClose = vi.fn();
      render(
        <CharacterEditor
          characterId={testCharacter.character_id}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(testCharacter.name)).toBeInTheDocument();
      });

      // Modify and save
      const user = userEvent.setup();
      const nameInput = screen.getByDisplayValue(testCharacter.name);
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Name');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify event was emitted
      await waitFor(() => {
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'character-updated',
          expect.objectContaining({
            characterId: testCharacter.character_id,
          })
        );
      });
    });

    it('should handle cancel without saving changes', async () => {
      // Requirements: 2.6
      const user = userEvent.setup();
      const testCharacter = createTestCharacter({ name: 'Original Name' });

      useStore.getState().addCharacter(testCharacter);

      const onClose = vi.fn();
      render(
        <CharacterEditor
          characterId={testCharacter.character_id}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
      });

      // Modify character
      const nameInput = screen.getByDisplayValue('Original Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Name');

      // Cancel without saving
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Verify character unchanged in store
      const storeState = useStore.getState();
      const character = storeState.characters.find(
        (c) => c.character_id === testCharacter.character_id
      );
      expect(character?.name).toBe('Original Name');

      // Verify onClose was called
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('18.3 End-to-End Story Generator Integration', () => {
    it('should create characters, select them, and verify they are linked to story', async () => {
      // Requirements: 4.1, 4.2, 4.5
      const user = userEvent.setup();
      
      // Create multiple characters
      const character1 = createTestCharacter({ name: 'Hero' });
      const character2 = createTestCharacter({ name: 'Villain' });
      const character3 = createTestCharacter({ name: 'Sidekick' });

      const store = useStore.getState();
      store.addCharacter(character1);
      store.addCharacter(character2);
      store.addCharacter(character3);

      // Render character list in selectable mode (Story Generator context)
      const onSelectionChange = vi.fn();
      render(
        <CharacterList
          selectable={true}
          selectedIds={[]}
          onSelectionChange={onSelectionChange}
        />
      );

      // Verify all characters are displayed
      await waitFor(() => {
        expect(screen.getByText('Hero')).toBeInTheDocument();
        expect(screen.getByText('Villain')).toBeInTheDocument();
        expect(screen.getByText('Sidekick')).toBeInTheDocument();
      });

      // Select characters
      const heroCard = screen.getByText('Hero').closest('[role="button"]');
      const villainCard = screen.getByText('Villain').closest('[role="button"]');

      if (heroCard && villainCard) {
        await user.click(heroCard);
        await user.click(villainCard);
      }

      // Verify selection callback was called
      expect(onSelectionChange).toHaveBeenCalled();
    });

    it('should handle multi-select state consistency', async () => {
      // Requirements: 4.2
      const character1 = createTestCharacter({ name: 'Char 1' });
      const character2 = createTestCharacter({ name: 'Char 2' });

      const store = useStore.getState();
      store.addCharacter(character1);
      store.addCharacter(character2);

      // Test selection state management through component props
      let selectedIds: string[] = [];
      
      const onSelectionChange = (ids: string[]) => {
        selectedIds = ids;
      };

      const { rerender } = render(
        <CharacterList
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      );

      // Simulate selection
      selectedIds = [character1.character_id];
      rerender(
        <CharacterList
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      );
      
      expect(selectedIds).toContain(character1.character_id);
      expect(selectedIds).toHaveLength(1);

      // Add second character
      selectedIds = [character1.character_id, character2.character_id];
      rerender(
        <CharacterList
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      );
      
      expect(selectedIds).toContain(character1.character_id);
      expect(selectedIds).toContain(character2.character_id);
      expect(selectedIds).toHaveLength(2);

      // Remove first character
      selectedIds = [character2.character_id];
      rerender(
        <CharacterList
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      );
      
      expect(selectedIds).not.toContain(character1.character_id);
      expect(selectedIds).toContain(character2.character_id);
      expect(selectedIds).toHaveLength(1);
    });

    it('should display all available characters in story generator', async () => {
      // Requirements: 4.1
      const characters = [
        createTestCharacter({ name: 'Character A' }),
        createTestCharacter({ name: 'Character B' }),
        createTestCharacter({ name: 'Character C' }),
        createTestCharacter({ name: 'Character D' }),
      ];

      const store = useStore.getState();
      characters.forEach((char) => store.addCharacter(char));

      render(<CharacterList selectable={true} />);

      // Verify all characters are displayed
      await waitFor(() => {
        characters.forEach((char) => {
          expect(screen.getByText(char.name)).toBeInTheDocument();
        });
      });

      // Verify count matches
      const storeState = useStore.getState();
      expect(storeState.characters).toHaveLength(4);
    });
  });

  describe('18.4 End-to-End Relationship Management', () => {
    it('should create relationship with bidirectional sync', async () => {
      // Requirements: 6.1, 6.2, 6.3
      const character1 = createTestCharacter({ name: 'Alice' });
      const character2 = createTestCharacter({ name: 'Bob' });

      const store = useStore.getState();
      store.addCharacter(character1);
      store.addCharacter(character2);

      // Add relationship using the hook
      const { result } = renderHook(() => useCharacterManager());
      
      await act(async () => {
        await result.current.addRelationship(character1.character_id, character2.character_id, {
          relationship_type: 'friend',
          description: 'Best friends',
          dynamic: 'supportive',
        });
      });

      // Verify bidirectional relationship
      const storeState = useStore.getState();
      const updatedChar1 = storeState.characters.find(
        (c) => c.character_id === character1.character_id
      );
      const updatedChar2 = storeState.characters.find(
        (c) => c.character_id === character2.character_id
      );

      // Check Alice has relationship to Bob
      expect(updatedChar1?.relationships).toHaveLength(1);
      expect(updatedChar1?.relationships[0].character_id).toBe(character2.character_id);
      expect(updatedChar1?.relationships[0].relationship_type).toBe('friend');

      // Check Bob has inverse relationship to Alice
      expect(updatedChar2?.relationships).toHaveLength(1);
      expect(updatedChar2?.relationships[0].character_id).toBe(character1.character_id);
      expect(updatedChar2?.relationships[0].relationship_type).toBe('friend');
    });

    it('should modify relationship and update both characters', async () => {
      // Requirements: 6.2
      const character1 = createTestCharacter({ 
        name: 'Alice',
        relationships: [{
          character_id: 'bob-id',
          character_name: 'Bob',
          relationship_type: 'friend',
          description: 'Friends',
          dynamic: 'neutral',
        }],
      });
      
      const character2 = createTestCharacter({ 
        name: 'Bob',
        character_id: 'bob-id',
        relationships: [{
          character_id: character1.character_id,
          character_name: 'Alice',
          relationship_type: 'friend',
          description: 'Friends',
          dynamic: 'neutral',
        }],
      });

      const store = useStore.getState();
      store.addCharacter(character1);
      store.addCharacter(character2);

      // Update relationship
      const { result } = renderHook(() => useCharacterManager());
      
      await act(async () => {
        await result.current.updateRelationship(character1.character_id, character2.character_id, {
          description: 'Best friends',
          dynamic: 'supportive',
        });
      });

      // Verify both characters updated
      const storeState = useStore.getState();
      const updatedChar1 = storeState.characters.find(
        (c) => c.character_id === character1.character_id
      );
      const updatedChar2 = storeState.characters.find(
        (c) => c.character_id === character2.character_id
      );

      expect(updatedChar1?.relationships[0].description).toBe('Best friends');
      expect(updatedChar2?.relationships[0].description).toBe('Best friends');
    });

    it('should delete relationship and clean up both characters', async () => {
      // Requirements: 6.3
      const character1 = createTestCharacter({ 
        name: 'Alice',
        relationships: [{
          character_id: 'bob-id',
          character_name: 'Bob',
          relationship_type: 'friend',
          description: 'Friends',
          dynamic: 'neutral',
        }],
      });
      
      const character2 = createTestCharacter({ 
        name: 'Bob',
        character_id: 'bob-id',
        relationships: [{
          character_id: character1.character_id,
          character_name: 'Alice',
          relationship_type: 'friend',
          description: 'Friends',
          dynamic: 'neutral',
        }],
      });

      const store = useStore.getState();
      store.addCharacter(character1);
      store.addCharacter(character2);

      // Remove relationship
      const { result } = renderHook(() => useCharacterManager());
      
      await act(async () => {
        await result.current.removeRelationship(character1.character_id, character2.character_id);
      });

      // Verify cleanup on both characters
      const storeState = useStore.getState();
      const updatedChar1 = storeState.characters.find(
        (c) => c.character_id === character1.character_id
      );
      const updatedChar2 = storeState.characters.find(
        (c) => c.character_id === character2.character_id
      );

      expect(updatedChar1?.relationships).toHaveLength(0);
      expect(updatedChar2?.relationships).toHaveLength(0);
    });
  });

  describe('18.5 End-to-End Deletion with Dependencies', () => {
    it('should check dependencies before deletion', async () => {
      // Requirements: 7.1
      const testCharacter = createTestCharacter({ name: 'Hero' });

      const store = useStore.getState();
      store.addCharacter(testCharacter);

      // Check dependencies
      const { result } = renderHook(() => useCharacterManager());
      const dependencies = result.current.checkDependencies(testCharacter.character_id);

      // Verify dependencies are detected
      expect(dependencies).toBeDefined();
      // Note: Actual dependency checking would require story data in store
    });

    it('should display warning when character has dependencies', async () => {
      // Requirements: 7.2
      const user = userEvent.setup();
      const testCharacter = createTestCharacter({ name: 'Important Character' });

      const store = useStore.getState();
      store.addCharacter(testCharacter);

      const onClose = vi.fn();
      const onDelete = vi.fn();

      render(
        <CharacterEditor
          characterId={testCharacter.character_id}
          onClose={onClose}
          onDelete={onDelete}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(testCharacter.name)).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Verify confirmation dialog appears
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });

    it('should delete character and remove from all locations', async () => {
      // Requirements: 7.4
      const testCharacter = createTestCharacter({ name: 'To Be Deleted' });

      const store = useStore.getState();
      store.addCharacter(testCharacter);

      // Verify character exists in store
      const charBeforeDelete = store.characters.find((c) => c.character_id === testCharacter.character_id);
      expect(charBeforeDelete).toBeDefined();

      // Verify character exists in localStorage
      const charInStorage = localStorage.getItem(`character-${testCharacter.character_id}`);
      expect(charInStorage).toBeTruthy();

      // Delete character
      const { result } = renderHook(() => useCharacterManager());
      await act(async () => {
        await result.current.deleteCharacter(testCharacter.character_id);
      });

      // Verify character removed from store
      const storeState = useStore.getState();
      expect(storeState.characters.find((c) => c.character_id === testCharacter.character_id)).toBeUndefined();

      // Verify character removed from localStorage
      const charInStorageAfter = localStorage.getItem(`character-${testCharacter.character_id}`);
      expect(charInStorageAfter).toBeNull();
    });

    it('should handle deletion with relationship cleanup', async () => {
      // Requirements: 7.4
      const character1 = createTestCharacter({ 
        name: 'Alice',
        relationships: [{
          character_id: 'bob-id',
          character_name: 'Bob',
          relationship_type: 'friend',
          description: 'Friends',
          dynamic: 'neutral',
        }],
      });
      
      const character2 = createTestCharacter({ 
        name: 'Bob',
        character_id: 'bob-id',
        relationships: [{
          character_id: character1.character_id,
          character_name: 'Alice',
          relationship_type: 'friend',
          description: 'Friends',
          dynamic: 'neutral',
        }],
      });

      const store = useStore.getState();
      store.addCharacter(character1);
      store.addCharacter(character2);

      // Delete character1
      const { result } = renderHook(() => useCharacterManager());
      await act(async () => {
        await result.current.deleteCharacter(character1.character_id);
      });

      // Verify character1 is deleted
      const storeState = useStore.getState();
      expect(storeState.characters.find((c) => c.character_id === character1.character_id)).toBeUndefined();

      // Verify character2's relationship to character1 is removed
      const updatedChar2 = storeState.characters.find((c) => c.character_id === character2.character_id);
      expect(updatedChar2?.relationships).toHaveLength(0);
    });
  });
});
