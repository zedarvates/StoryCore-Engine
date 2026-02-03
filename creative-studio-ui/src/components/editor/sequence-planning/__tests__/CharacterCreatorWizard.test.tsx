import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, describe, it, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { CharacterCreatorWizard } from '../CharacterCreatorWizard';

// Mock the LLMService and ttsService
vi.mock('../../../../services/llmService', () => ({
  LLMService: vi.fn().mockImplementation(() => ({
    generateText: vi.fn().mockResolvedValue('mock response'),
  })),
}));

vi.mock('../../../../services/ttsService', () => ({
  ttsService: {
    generateVoiceOver: vi.fn().mockResolvedValue('mock-audio-url'),
  },
}));

describe('CharacterCreatorWizard - Genre Handling', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test the getGenreString helper function behavior
  describe('getGenreString helper function', () => {
    it('should handle undefined genre', () => {
      const worldContext = { genre: undefined };
      
      render(
        <CharacterCreatorWizard 
          isOpen={true} 
          onClose={mockOnClose} 
          onSave={mockOnSave}
          worldContext={worldContext}
        />
      );

      // The component should render without throwing errors
      expect(screen.getByText('Créateur de Personnage')).toBeInTheDocument();
    });

    it('should handle null genre', () => {
      const worldContext = { genre: null };
      
      render(
        <CharacterCreatorWizard 
          isOpen={true} 
          onClose={mockOnClose} 
          onSave={mockOnSave}
          worldContext={worldContext}
        />
      );

      expect(screen.getByText('Créateur de Personnage')).toBeInTheDocument();
    });

    it('should handle string genre', () => {
      const worldContext = { genre: 'fantasy' };
      
      render(
        <CharacterCreatorWizard 
          isOpen={true} 
          onClose={mockOnClose} 
          onSave={mockOnSave}
          worldContext={worldContext}
        />
      );

      expect(screen.getByText('Créateur de Personnage')).toBeInTheDocument();
    });

    it('should handle array genre', () => {
      const worldContext = { genre: ['fantasy', 'adventure'] };
      
      render(
        <CharacterCreatorWizard 
          isOpen={true} 
          onClose={mockOnClose} 
          onSave={mockOnSave}
          worldContext={worldContext}
        />
      );

      expect(screen.getByText('Créateur de Personnage')).toBeInTheDocument();
    });

    it('should handle number genre', () => {
      const worldContext = { genre: 123 };
      
      render(
        <CharacterCreatorWizard 
          isOpen={true} 
          onClose={mockOnClose} 
          onSave={mockOnSave}
          worldContext={worldContext}
        />
      );

      expect(screen.getByText('Créateur de Personnage')).toBeInTheDocument();
    });
  });

  describe('generateLlmSuggestions function', () => {
    it('should not throw error when worldContext.genre is not an array', async () => {
      const worldContext = { 
        genre: 'fantasy', // String instead of array
        description: 'A magical world'
      };

      render(
        <CharacterCreatorWizard 
          isOpen={true} 
          onClose={mockOnClose} 
          onSave={mockOnSave}
          worldContext={worldContext}
        />
      );

      // Click the IA button to trigger generateLlmSuggestions
      const iaButton = screen.getAllByText('IA')[0];
      fireEvent.click(iaButton);

      // Wait for the LLM calls to complete
      await waitFor(() => {
        expect(screen.getByText('Créateur de Personnage')).toBeInTheDocument();
      });

      // Should not throw any errors
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should handle array genre correctly', async () => {
      const worldContext = { 
        genre: ['fantasy', 'adventure'],
        description: 'A magical world'
      };

      render(
        <CharacterCreatorWizard 
          isOpen={true} 
          onClose={mockOnClose} 
          onSave={mockOnSave}
          worldContext={worldContext}
        />
      );

      // Click the IA button to trigger generateLlmSuggestions
      const iaButton = screen.getAllByText('IA')[0];
      fireEvent.click(iaButton);

      // Wait for the LLM calls to complete
      await waitFor(() => {
        expect(screen.getByText('Créateur de Personnage')).toBeInTheDocument();
      });

      // Should not throw any errors
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });
});