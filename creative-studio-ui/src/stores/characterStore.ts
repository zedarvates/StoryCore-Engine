import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Character } from '@/types/character';
import { 
  listCharactersInProject, 
  loadCharacterFromProject, 
  saveCharacterToProject, 
  deleteCharacterFromProject 
} from '@/utils/characterStorage';

interface CharacterState {
  characters: Character[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjectCharacters: (projectId: string) => Promise<void>;
  addCharacter: (projectId: string, character: Character) => Promise<void>;
  updateCharacter: (projectId: string, character: Character) => Promise<void>;
  removeCharacter: (projectId: string, characterId: string) => Promise<void>;
}

export const useCharacterStore = create<CharacterState>()(
  devtools(
    (set, _get) => ({
      characters: [],
      isLoading: false,
      error: null,

      fetchProjectCharacters: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          const characterIds = await listCharactersInProject(projectId);
          const loadedCharacters: Character[] = [];

          for (const id of characterIds) {
            const character = await loadCharacterFromProject(projectId, id);
            if (character) loadedCharacters.push(character);
          }

          set({ characters: loadedCharacters, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch project characters:', error);
          set({ error: 'Failed to load characters', isLoading: false });
        }
      },

      addCharacter: async (projectId, character) => {
        try {
          await saveCharacterToProject(projectId, character.character_id, character);
          set((state) => ({
            characters: [...state.characters, character]
          }));
        } catch (error) {
          console.error('Failed to add character:', error);
          throw error;
        }
      },

      updateCharacter: async (projectId, character) => {
        try {
          await saveCharacterToProject(projectId, character.character_id, character);
          set((state) => ({
            characters: state.characters.map(char => 
              char.character_id === character.character_id ? character : char
            )
          }));
        } catch (error) {
          console.error('Failed to update character:', error);
          throw error;
        }
      },

      removeCharacter: async (projectId, characterId) => {
        try {
          await deleteCharacterFromProject(projectId, characterId);
          set((state) => ({
            characters: state.characters.filter(char => char.character_id !== characterId)
          }));
        } catch (error) {
          console.error('Failed to remove character:', error);
          throw error;
        }
      },
    }),
    { name: 'CharacterStore' }
  )
);
