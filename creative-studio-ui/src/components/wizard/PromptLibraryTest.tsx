/**
 * Test Component to Verify All 93 Prompts Are Accessible
 * This component demonstrates that all prompts can be loaded and accessed
 */

import React, { useEffect, useState } from 'react';
import { usePromptLibrary } from '../../hooks/usePromptLibrary';
import type { PromptTemplate } from '../../library/PromptLibraryService';

export const PromptLibraryTest: React.FC = () => {
  const {
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
  } = usePromptLibrary();

  const [categoryPrompts, setCategoryPrompts] = useState<Record<string, PromptTemplate[]>>({});
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Load all category prompts to verify accessibility
  useEffect(() => {
    if (!isLoaded) return;

    const loadAllCategories = async () => {
      setLoadingCategories(true);
      try {
        const [
          timeOfDay,
          mood,
          shotTypes,
          cameraAngles,
          cameraMovements,
          transitions,
          lighting,
          genres,
          visualStyles,
          colorPalettes,
          universeTypes,
          characterArchetypes,
          masterCoherence,
          sceneElements,
        ] = await Promise.all([
          getTimeOfDayPrompts(),
          getMoodPrompts(),
          getShotTypePrompts(),
          getCameraAnglePrompts(),
          getCameraMovementPrompts(),
          getTransitionPrompts(),
          getLightingPrompts(),
          getGenrePrompts(),
          getVisualStylePrompts(),
          getColorPalettePrompts(),
          getUniverseTypePrompts(),
          getCharacterArchetypePrompts(),
          getMasterCoherencePrompts(),
          getSceneElementPrompts(),
        ]);

        setCategoryPrompts({
          'time-of-day': timeOfDay,
          'mood-atmosphere': mood,
          'shot-types': shotTypes,
          'camera-angles': cameraAngles,
          'camera-movements': cameraMovements,
          transitions,
          lighting,
          genres,
          'visual-styles': visualStyles,
          'color-palettes': colorPalettes,
          'universe-types': universeTypes,
          'character-archetypes': characterArchetypes,
          'master-coherence': masterCoherence,
          'scene-elements': sceneElements,
        });
      } catch (err) {
        console.error('Failed to load category prompts:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadAllCategories();
  }, [
    isLoaded,
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
  ]);

  // Calculate total loaded prompts
  const loadedPromptCount = Object.values(categoryPrompts).reduce(
    (sum, prompts) => sum + prompts.length,
    0
  );

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading prompt library...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 rounded-lg border border-red-200">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Library</h3>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  const allPromptsAccessible = loadedPromptCount === 93;

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Prompt Library Accessibility Test
        </h2>
        <p className="text-gray-600">
          Verifying that all 93 prompts are accessible in the wizard
        </p>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        {allPromptsAccessible ? (
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold">✓ All 93 Prompts Accessible</span>
          </div>
        ) : (
          <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold">
              {loadingCategories
                ? 'Loading...'
                : `${loadedPromptCount}/93 Prompts Loaded`}
            </span>
          </div>
        )}
      </div>

      {/* Library Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">{totalPrompts}</div>
          <div className="text-sm text-blue-800">Total Prompts in Library</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-purple-600">
            {Object.keys(categories).length}
          </div>
          <div className="text-sm text-purple-800">Categories</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-green-600">{loadedPromptCount}</div>
          <div className="text-sm text-green-800">Prompts Loaded</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Category Breakdown
        </h3>
        {Object.entries(categoryPrompts).map(([categoryId, prompts]) => {
          const categoryInfo = categories[categoryId];
          return (
            <div
              key={categoryId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {categoryInfo?.name || categoryId}
                </div>
                <div className="text-sm text-gray-600">
                  {categoryInfo?.description || 'No description'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {prompts.length} prompts
                </span>
                {prompts.length > 0 && (
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expected Counts */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">Expected Counts:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div>Time of Day: 6</div>
          <div>Mood: 10</div>
          <div>Shot Types: 7</div>
          <div>Camera Angles: 6</div>
          <div>Camera Movements: 8</div>
          <div>Transitions: 5</div>
          <div>Lighting: 4</div>
          <div>Genres: 15</div>
          <div>Visual Styles: 11</div>
          <div>Color Palettes: 6</div>
          <div>Universe Types: 5</div>
          <div>Character Archetypes: 3</div>
          <div>Master Coherence: 3</div>
          <div>Scene Elements: 4</div>
        </div>
      </div>
    </div>
  );
};
