/**
 * React Hook for Prompt Library Access
 * Provides easy access to the 93-prompt library for wizard components
 */

import { useState, useEffect, useCallback } from 'react';
import { promptLibrary, type PromptTemplate, type PromptCategory } from '../library/PromptLibraryService';

export interface UsePromptLibraryReturn {
  // Loading state
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
  
  // Library info
  totalPrompts: number;
  categories: Record<string, PromptCategory>;
  
  // Query methods
  getTimeOfDayPrompts: () => Promise<PromptTemplate[]>;
  getMoodPrompts: () => Promise<PromptTemplate[]>;
  getShotTypePrompts: () => Promise<PromptTemplate[]>;
  getCameraAnglePrompts: () => Promise<PromptTemplate[]>;
  getCameraMovementPrompts: () => Promise<PromptTemplate[]>;
  getTransitionPrompts: () => Promise<PromptTemplate[]>;
  getLightingPrompts: () => Promise<PromptTemplate[]>;
  getGenrePrompts: () => Promise<PromptTemplate[]>;
  getVisualStylePrompts: () => Promise<PromptTemplate[]>;
  getColorPalettePrompts: () => Promise<PromptTemplate[]>;
  getUniverseTypePrompts: () => Promise<PromptTemplate[]>;
  getCharacterArchetypePrompts: () => Promise<PromptTemplate[]>;
  getMasterCoherencePrompts: () => Promise<PromptTemplate[]>;
  getSceneElementPrompts: () => Promise<PromptTemplate[]>;
  
  // Utility methods
  loadPrompt: (path: string) => Promise<PromptTemplate>;
  fillPrompt: (template: PromptTemplate, values: Record<string, string | number>) => string;
  search: (query: string) => Promise<PromptTemplate[]>;
  searchByTags: (tags: string[]) => Promise<PromptTemplate[]>;
  validateValues: (template: PromptTemplate, values: Record<string, string | number>) => { valid: boolean; errors: string[] };
  
  // Reload
  reload: () => Promise<void>;
}

/**
 * Hook to access the prompt library
 * Automatically loads the library on mount
 */
export function usePromptLibrary(): UsePromptLibraryReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [categories, setCategories] = useState<Record<string, PromptCategory>>({});

  // Load library on mount
  const loadLibrary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [count, cats] = await Promise.all([
        promptLibrary.getTotalPromptCount(),
        promptLibrary.getCategories(),
      ]);
      
      setTotalPrompts(count);
      setCategories(cats);
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load prompt library'));
      setIsLoaded(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Wizard-specific query methods
  const getTimeOfDayPrompts = useCallback(() => promptLibrary.getTimeOfDayPrompts(), []);
  const getMoodPrompts = useCallback(() => promptLibrary.getMoodPrompts(), []);
  const getShotTypePrompts = useCallback(() => promptLibrary.getShotTypePrompts(), []);
  const getCameraAnglePrompts = useCallback(() => promptLibrary.getCameraAnglePrompts(), []);
  const getCameraMovementPrompts = useCallback(() => promptLibrary.getCameraMovementPrompts(), []);
  const getTransitionPrompts = useCallback(() => promptLibrary.getTransitionPrompts(), []);
  const getLightingPrompts = useCallback(() => promptLibrary.getLightingPrompts(), []);
  const getGenrePrompts = useCallback(() => promptLibrary.getGenrePrompts(), []);
  const getVisualStylePrompts = useCallback(() => promptLibrary.getVisualStylePrompts(), []);
  const getColorPalettePrompts = useCallback(() => promptLibrary.getColorPalettePrompts(), []);
  const getUniverseTypePrompts = useCallback(() => promptLibrary.getUniverseTypePrompts(), []);
  const getCharacterArchetypePrompts = useCallback(() => promptLibrary.getCharacterArchetypePrompts(), []);
  const getMasterCoherencePrompts = useCallback(() => promptLibrary.getMasterCoherencePrompts(), []);
  const getSceneElementPrompts = useCallback(() => promptLibrary.getSceneElementPrompts(), []);

  // Utility methods
  const loadPrompt = useCallback((path: string) => promptLibrary.loadPrompt(path), []);
  const fillPrompt = useCallback(
    (template: PromptTemplate, values: Record<string, string | number>) =>
      promptLibrary.fillPrompt(template, values),
    []
  );
  const search = useCallback((query: string) => promptLibrary.search(query), []);
  const searchByTags = useCallback((tags: string[]) => promptLibrary.searchByTags(tags), []);
  const validateValues = useCallback(
    (template: PromptTemplate, values: Record<string, string | number>) =>
      promptLibrary.validateValues(template, values),
    []
  );

  return {
    isLoading,
    isLoaded,
    error,
    totalPrompts,
    categories,
    getTimeOfDayPrompts,
    getMoodPrompts,
    getShotTypePrompts,
    getCameraAnglePrompts,
    getCameraMovementPrompts,
    getTransitionPrompts,
    getLightingPrompts,
    getGenrePrompts,
    getVisualStylePrompts,
    getColorPalettePrompts,
    getUniverseTypePrompts,
    getCharacterArchetypePrompts,
    getMasterCoherencePrompts,
    getSceneElementPrompts,
    loadPrompt,
    fillPrompt,
    search,
    searchByTags,
    validateValues,
    reload: loadLibrary,
  };
}

/**
 * Hook to access a specific category of prompts
 */
export function useCategoryPrompts(categoryId: string) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPrompts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const categoryPrompts = await promptLibrary.getPromptsByCategory(categoryId);
        if (mounted) {
          setPrompts(categoryPrompts);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load category prompts'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadPrompts();

    return () => {
      mounted = false;
    };
  }, [categoryId]);

  return { prompts, isLoading, error };
}

/**
 * Hook to access a single prompt by path
 */
export function usePrompt(path: string | null) {
  const [prompt, setPrompt] = useState<PromptTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path) {
      setPrompt(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const loadPrompt = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const template = await promptLibrary.loadPrompt(path);
        if (mounted) {
          setPrompt(template);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load prompt'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadPrompt();

    return () => {
      mounted = false;
    };
  }, [path]);

  return { prompt, isLoading, error };
}
