/**
 * DialogueContext - Dialogue phrase management operations
 * 
 * Responsibility: Dialogue phrase CRUD, timing, and shot linking
 * Part of ProjectContext split (see docs/PROJECTCONTEXT_ANALYSIS.md)
 * 
 * State Variables:
 * - Managed through project.audioPhrases (DialoguePhrase array)
 * 
 * Callback Functions:
 * - addDialoguePhrase(phrase): Add new phrase and return its ID
 * - updateDialoguePhrase(phraseId, updates): Update phrase properties
 * - deleteDialoguePhrase(phraseId): Remove phrase from project
 * - linkPhraseToShot(phraseId, shotId): Link phrase to a shot via shotId
 */

import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import type { DialoguePhrase } from '../types';

// Generate unique ID for phrases
const generatePhraseId = (): string => {
  return `phrase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

interface DialogueContextType {
  addDialoguePhrase: (phrase: DialoguePhrase) => string;
  updateDialoguePhrase: (phraseId: string, updates: Partial<DialoguePhrase>) => void;
  deleteDialoguePhrase: (phraseId: string) => void;
  linkPhraseToShot: (phraseId: string, shotId: string) => void;
}

export type { DialogueContextType };

const DialogueContext = createContext<DialogueContextType | undefined>(undefined);

export const DialogueProvider: React.FC<{ 
  children: React.ReactNode;
  phrases?: DialoguePhrase[];
  onPhrasesUpdate?: (phrases: DialoguePhrase[]) => void;
}> = ({ 
  children,
  phrases: externalPhrases,
  onPhrasesUpdate 
}) => {
  // Use external phrases if provided, otherwise use internal state
  const [internalPhrases, setInternalPhrases] = React.useState<DialoguePhrase[]>([]);
  
  // Use external phrases or internal state
  const phrases = externalPhrases !== undefined ? externalPhrases : internalPhrases;

  const addDialoguePhrase = useCallback((phrase: DialoguePhrase) => {
    const phraseId = phrase.id || generatePhraseId();
    const newPhrase: DialoguePhrase = {
      ...phrase,
      id: phraseId,
    };

    setInternalPhrases(prev => {
      const updatedPhrases = [...prev, newPhrase];
      onPhrasesUpdate?.(updatedPhrases);
      return updatedPhrases;
    });

    return phraseId;
  }, [onPhrasesUpdate]);

  const updateDialoguePhrase = useCallback((phraseId: string, updates: Partial<DialoguePhrase>) => {
    setInternalPhrases(prev => {
      const updatedPhrases = prev.map(phrase => 
        phrase.id === phraseId 
          ? { ...phrase, ...updates }
          : phrase
      );
      
      onPhrasesUpdate?.(updatedPhrases);
      return updatedPhrases;
    });
  }, [onPhrasesUpdate]);

  const deleteDialoguePhrase = useCallback((phraseId: string) => {
    setInternalPhrases(prev => {
      const updatedPhrases = prev.filter(phrase => phrase.id !== phraseId);
      onPhrasesUpdate?.(updatedPhrases);
      return updatedPhrases;
    });
  }, [onPhrasesUpdate]);

  const linkPhraseToShot = useCallback((phraseId: string, shotId: string) => {
    // Link phrase to shot by updating the phrase's shotId
    // The phrase maintains its own shotId for the relationship
    setInternalPhrases(prev => {
      const updatedPhrases = prev.map(phrase => 
        phrase.id === phraseId 
          ? { ...phrase, shotId }
          : phrase
      );
      
      onPhrasesUpdate?.(updatedPhrases);
      return updatedPhrases;
    });
  }, [onPhrasesUpdate]);

  const value = useMemo(() => ({
    addDialoguePhrase,
    updateDialoguePhrase,
    deleteDialoguePhrase,
    linkPhraseToShot
  }), [
    addDialoguePhrase,
    updateDialoguePhrase,
    deleteDialoguePhrase,
    linkPhraseToShot
  ]);

  return (
    <DialogueContext.Provider value={value}>
      {children}
    </DialogueContext.Provider>
  );
};

export const useDialogue = () => {
  const context = useContext(DialogueContext);
  if (!context) {
    throw new Error('useDialogue must be used within a DialogueProvider');
  }
  return context;
};
