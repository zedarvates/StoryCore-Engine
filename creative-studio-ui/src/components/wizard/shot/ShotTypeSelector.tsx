/**
 * Shot Type Selector Component
 * 
 * Displays available shot types with visual previews and descriptions
 */

import React from 'react';
import { ShotType } from '@/types/shot';

// ============================================================================
// Shot Type Definitions with Metadata
// ============================================================================

interface ShotTypeOption {
  type: ShotType;
  label: string;
  description: string;
  icon: string;
  example: string;
  useCases: string[];
}

const SHOT_TYPES: ShotTypeOption[] = [
  {
    type: 'extreme-wide',
    label: 'Extreme Wide Shot',
    description: 'Shows the entire environment with characters as small figures',
    icon: '🌍',
    example: 'Vast landscape with tiny figures',
    useCases: ['Establishing shots', 'Epic scale', 'Environmental context'],
  },
  {
    type: 'wide',
    label: 'Wide Shot',
    description: 'Shows full body of characters with surrounding environment',
    icon: '🏞️',
    example: 'Full body shot in context',
    useCases: ['Action sequences', 'Group shots', 'Scene establishment'],
  },
  {
    type: 'medium',
    label: 'Medium Shot',
    description: 'Shows character from waist up, balancing character and environment',
    icon: '👤',
    example: 'Waist-up framing',
    useCases: ['Dialogue', 'Character interaction', 'General coverage'],
  },
  {
    type: 'close-up',
    label: 'Close-Up',
    description: 'Shows face or specific detail, emphasizing emotion or importance',
    icon: '😊',
    example: 'Face filling the frame',
    useCases: ['Emotional moments', 'Reactions', 'Important details'],
  },
  {
    type: 'extreme-close-up',
    label: 'Extreme Close-Up',
    description: 'Shows very specific detail like eyes, hands, or objects',
    icon: '👁️',
    example: 'Eyes, lips, or small objects',
    useCases: ['Intense emotion', 'Critical details', 'Dramatic emphasis'],
  },
  {
    type: 'over-the-shoulder',
    label: 'Over-the-Shoulder',
    description: 'Shows subject from behind another character\'s shoulder',
    icon: '👥',
    example: 'View from behind shoulder',
    useCases: ['Conversations', 'POV context', 'Character relationships'],
  },
  {
    type: 'pov',
    label: 'Point of View (POV)',
    description: 'Shows what a character sees from their perspective',
    icon: '👀',
    example: 'First-person perspective',
    useCases: ['Subjective experience', 'Immersion', 'Character perspective'],
  },
];

// ============================================================================
// Component Props
// ============================================================================

interface ShotTypeSelectorProps {
  selectedType?: ShotType;
  onSelect: (type: ShotType) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ShotTypeSelector({
  selectedType,
  onSelect,
  className = '',
}: ShotTypeSelectorProps) {
  return (
    <div className={`shot-type-selector ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Select Shot Type</h3>
        <p className="text-sm text-gray-600">
          Choose the framing and composition style for your shot
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHOT_TYPES.map((shotType) => (
          <button
            key={shotType.type}
            onClick={() => onSelect(shotType.type)}
            className={`
              relative p-4 rounded-lg border-2 transition-all text-left
              hover:shadow-lg hover:scale-105
              ${
                selectedType === shotType.type
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }
            `}
            aria-pressed={selectedType === shotType.type}
          >
            {/* Icon and Label */}
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl" role="img" aria-label={shotType.label}>
                {shotType.icon}
              </span>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{shotType.label}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {shotType.description}
                </p>
              </div>
              {selectedType === shotType.type && (
                <div className="absolute top-2 right-2">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Example */}
            <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              <span className="font-medium">Example:</span> {shotType.example}
            </div>

            {/* Use Cases */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Best for:
              </p>
              <div className="flex flex-wrap gap-1">
                {shotType.useCases.map((useCase, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs"
                  >
                    {useCase}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Type Summary */}
      {selectedType && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-semibold text-blue-900 dark:text-blue-100">
              Selected: {SHOT_TYPES.find(st => st.type === selectedType)?.label}
            </span>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {SHOT_TYPES.find(st => st.type === selectedType)?.description}
          </p>
        </div>
      )}
    </div>
  );
}
