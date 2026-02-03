/**
 * Step 1: Project Type Selection
 * Allows users to select their project type and duration
 */

import { useState, useEffect } from 'react';
import { Film, Clock, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { ProjectType, ProjectTypeData } from '@/types/wizard';

// ============================================================================
// Project Type Definitions
// ============================================================================

interface ProjectTypeOption {
  type: ProjectType;
  label: string;
  description: string;
  durationRange: { min: number; max: number };
  defaultDuration: number;
}

const PROJECT_TYPE_OPTIONS: ProjectTypeOption[] = [
  {
    type: 'court-metrage',
    label: 'Court-métrage',
    description: 'Short film',
    durationRange: { min: 1, max: 30 },
    defaultDuration: 15,
  },
  {
    type: 'moyen-metrage',
    label: 'Moyen-métrage',
    description: 'Medium-length film',
    durationRange: { min: 30, max: 60 },
    defaultDuration: 45,
  },
  {
    type: 'long-metrage-standard',
    label: 'Long-métrage standard',
    description: 'Standard feature film',
    durationRange: { min: 60, max: 120 },
    defaultDuration: 90,
  },
  {
    type: 'long-metrage-premium',
    label: 'Long-métrage premium',
    description: 'Premium feature film',
    durationRange: { min: 120, max: 180 },
    defaultDuration: 150,
  },
  {
    type: 'tres-long-metrage',
    label: 'Très long-métrage',
    description: 'Epic feature film',
    durationRange: { min: 180, max: 300 },
    defaultDuration: 210,
  },
  {
    type: 'special-tv',
    label: 'Spécial TV/streaming',
    description: 'TV or streaming special',
    durationRange: { min: 45, max: 90 },
    defaultDuration: 60,
  },
  {
    type: 'episode-serie',
    label: 'Épisode de série',
    description: 'Series episode',
    durationRange: { min: 20, max: 60 },
    defaultDuration: 45,
  },
  {
    type: 'custom',
    label: 'Custom',
    description: 'Custom duration',
    durationRange: { min: 1, max: 999 },
    defaultDuration: 30,
  },
];

// ============================================================================
// Component Props
// ============================================================================

interface Step1_ProjectTypeProps {
  data: ProjectTypeData | null;
  onUpdate: (data: ProjectTypeData) => void;
  errors?: Record<string, string>;
}

// ============================================================================
// Component
// ============================================================================

export function Step1_ProjectType({ data, onUpdate, errors = {} }: Step1_ProjectTypeProps) {
  const [selectedType, setSelectedType] = useState<ProjectType | null>(data?.type || null);
  const [customDuration, setCustomDuration] = useState<string>(
    data?.type === 'custom' ? String(data.durationMinutes) : ''
  );
  const [durationError, setDurationError] = useState<string>('');

  // Update parent when selection changes
  useEffect(() => {
    if (selectedType && selectedType !== 'custom') {
      const option = PROJECT_TYPE_OPTIONS.find((opt) => opt.type === selectedType);
      if (option) {
        onUpdate({
          type: selectedType,
          durationMinutes: option.defaultDuration,
          durationRange: option.durationRange,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]); // Only depend on selectedType, not onUpdate

  // Handle project type selection
  const handleTypeSelect = (type: ProjectType) => {
    setSelectedType(type);
    setDurationError('');

    if (type !== 'custom') {
      setCustomDuration('');
    }
  };

  // Handle custom duration input
  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value);
    setDurationError('');

    const duration = parseInt(value, 10);

    if (value === '') {
      setDurationError('Duration is required');
      return;
    }

    if (isNaN(duration)) {
      setDurationError('Duration must be a number');
      return;
    }

    if (duration <= 0) {
      setDurationError('Duration must be greater than 0');
      return;
    }

    if (duration > 999) {
      setDurationError('Duration must be less than 1000 minutes');
      return;
    }

    // Valid duration - update parent
    onUpdate({
      type: 'custom',
      durationMinutes: duration,
      durationRange: { min: 1, max: 999 },
    });
  };

  // Get error message for display
  const getErrorMessage = () => {
    if (durationError) return durationError;
    if (errors.projectType) return errors.projectType;
    if (errors.durationMinutes) return errors.durationMinutes;
    return '';
  };

  return (
    <WizardFormLayout
      title="Project Type Selection"
      description="Choose the type and duration of your cinematic project"
    >
      {/* Error Summary */}
      {getErrorMessage() && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">{getErrorMessage()}</p>
        </div>
      )}

      {/* Project Type Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Project Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROJECT_TYPE_OPTIONS.map((option) => (
            <Card
              key={option.type}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedType === option.type
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              onClick={() => handleTypeSelect(option.type)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTypeSelect(option.type);
                }
              }}
              aria-pressed={selectedType === option.type}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      selectedType === option.type
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <Film className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base mb-1">{option.label}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {option.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>
                        {option.type === 'custom'
                          ? 'Custom duration'
                          : `${option.durationRange.min}-${option.durationRange.max} min`}
                      </span>
                    </div>
                  </div>
                  {selectedType === option.type && (
                    <div className="flex-shrink-0">
                      <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Duration Input */}
      {selectedType === 'custom' && (
        <FormField
          label="Custom Duration"
          name="customDuration"
          required
          error={durationError}
          helpText="Enter the duration of your project in minutes"
        >
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-gray-400" />
            <Input
              id="customDuration"
              type="number"
              min="1"
              max="999"
              value={customDuration}
              onChange={(e) => handleCustomDurationChange(e.target.value)}
              placeholder="Enter duration in minutes"
              className="flex-1"
              aria-describedby="customDuration-help"
              aria-invalid={!!durationError}
            />
            <span className="text-sm text-gray-500">minutes</span>
          </div>
        </FormField>
      )}

      {/* Duration Summary */}
      {selectedType && selectedType !== 'custom' && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Default Duration
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your project will be set to{' '}
                <strong>
                  {PROJECT_TYPE_OPTIONS.find((opt) => opt.type === selectedType)?.defaultDuration}{' '}
                  minutes
                </strong>
                . You can adjust scene durations later in the workflow.
              </p>
            </div>
          </div>
        </div>
      )}
    </WizardFormLayout>
  );
}
