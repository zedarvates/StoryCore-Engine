/**
 * ShotPromptEditor Component
 * 
 * Multi-line textarea with character counter, real-time validation feedback,
 * and visual indicators for valid/invalid/warning states.
 * 
 * Requirements: 1.1, 1.5, 2.5
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { validatePrompt } from '../utils/promptValidation';
import type { Shot, PromptValidation } from '../types/projectDashboard';

// ============================================================================
// Component Props
// ============================================================================

export interface ShotPromptEditorProps {
  shot: Shot;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  validationError?: PromptValidation;
  suggestions?: string[];
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 500;
const DEBOUNCE_DELAY = 300; // milliseconds

// ============================================================================
// ShotPromptEditor Component
// ============================================================================

export const ShotPromptEditor: React.FC<ShotPromptEditorProps> = ({
  shot,
  prompt,
  onPromptChange,
  validationError,
  suggestions = [],
  className = '',
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [localPrompt, setLocalPrompt] = useState(prompt);
  const [validation, setValidation] = useState<PromptValidation | null>(
    validationError || null
  );
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Sync local prompt with prop changes
  // ============================================================================

  useEffect(() => {
    setLocalPrompt(prompt);
  }, [prompt]);

  // ============================================================================
  // Validation Logic
  // ============================================================================

  const performValidation = useCallback((text: string) => {
    const result = validatePrompt(text);
    setValidation(result);
    setIsValidating(false);
  }, []);

  // ============================================================================
  // Debounced onChange Handler
  // ============================================================================

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setLocalPrompt(newValue);
      setIsValidating(true);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounced timer
      debounceTimerRef.current = setTimeout(() => {
        performValidation(newValue);
        onPromptChange(newValue);
      }, DEBOUNCE_DELAY);
    },
    [onPromptChange, performValidation]
  );

  // ============================================================================
  // Cleanup on unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Initial validation
  // ============================================================================

  useEffect(() => {
    if (!validation && localPrompt) {
      performValidation(localPrompt);
    }
  }, [localPrompt, validation, performValidation]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const trimmedLength = localPrompt.trim().length;
  const characterCount = trimmedLength;
  const hasErrors = validation?.errors && validation.errors.length > 0;
  const hasWarnings = validation?.warnings && validation.warnings.length > 0;

  // Determine validation state
  let validationState: 'valid' | 'invalid' | 'warning' | 'idle' = 'idle';
  if (isValidating) {
    validationState = 'idle';
  } else if (hasErrors) {
    validationState = 'invalid';
  } else if (hasWarnings) {
    validationState = 'warning';
  } else if (localPrompt.trim().length > 0) {
    validationState = 'valid';
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`space-y-3 ${className}`} role="region" aria-label="Prompt editor">
      {/* Header with Label and Status Indicator */}
      <div className="flex items-center justify-between">
        <Label htmlFor={`prompt-${shot.id}`} className="text-sm font-medium">
          Shot Prompt
        </Label>
        
        {/* Validation Status Badge */}
        {validationState !== 'idle' && (
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            {validationState === 'valid' && (
              <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600" aria-label="Prompt is valid">
                <CheckCircle className="h-3 w-3" aria-hidden="true" />
                Valid
              </Badge>
            )}
            {validationState === 'invalid' && (
              <Badge variant="outline" className="flex items-center gap-1 text-red-600 border-red-600" aria-label="Prompt is invalid">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                Invalid
              </Badge>
            )}
            {validationState === 'warning' && (
              <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 border-yellow-600" aria-label="Prompt has warnings">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Warning
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Textarea with Visual Indicators */}
      <div className="relative">
        <Textarea
          id={`prompt-${shot.id}`}
          value={localPrompt}
          onChange={handleChange}
          placeholder="Enter a detailed prompt for this shot (10-500 characters)..."
          className={`min-h-[120px] resize-y ${
            validationState === 'invalid'
              ? 'border-red-500 focus-visible:ring-red-500'
              : validationState === 'warning'
              ? 'border-yellow-500 focus-visible:ring-yellow-500'
              : validationState === 'valid'
              ? 'border-green-500 focus-visible:ring-green-500'
              : ''
          }`}
          rows={5}
          aria-describedby={`prompt-help-${shot.id} prompt-counter-${shot.id}`}
          aria-invalid={validationState === 'invalid'}
        />
        
        {/* Character Counter */}
        <div className="absolute bottom-2 right-2 pointer-events-none">
          <Badge
            id={`prompt-counter-${shot.id}`}
            variant="secondary"
            className={`font-mono text-xs ${
              characterCount < MIN_PROMPT_LENGTH
                ? 'bg-red-100 text-red-700'
                : characterCount > MAX_PROMPT_LENGTH
                ? 'bg-red-100 text-red-700'
                : characterCount > MAX_PROMPT_LENGTH * 0.9
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
            }`}
            aria-label={`Character count: ${characterCount} of ${MAX_PROMPT_LENGTH}`}
          >
            {characterCount} / {MAX_PROMPT_LENGTH}
          </Badge>
        </div>
      </div>

      {/* Validation Feedback */}
      {validation && (
        <div className="space-y-2" role="alert" aria-live="polite">
          {/* Error Messages */}
          {validation.errors.map((error, index) => (
            <div
              key={`error-${index}`}
              className="flex items-start gap-2 p-2 rounded-md bg-red-50 border border-red-200"
            >
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium">{error.message}</p>
              </div>
            </div>
          ))}

          {/* Warning Messages */}
          {validation.warnings.map((warning, index) => (
            <div
              key={`warning-${index}`}
              className="flex items-start gap-2 p-2 rounded-md bg-yellow-50 border border-yellow-200"
            >
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 font-medium">{warning.message}</p>
                {warning.suggestion && (
                  <p className="text-xs text-yellow-700 mt-1">{warning.suggestion}</p>
                )}
              </div>
            </div>
          ))}

          {/* Suggestions */}
          {validation.suggestions.length > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-blue-50 border border-blue-200">
              <div className="flex-1">
                <p className="text-sm text-blue-800 font-medium mb-1">Suggestions:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  {validation.suggestions.map((suggestion, index) => (
                    <li key={`suggestion-${index}`}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Suggestions from Props */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">AI Suggestions:</Label>
          <div className="space-y-1" role="list" aria-label="AI-generated prompt suggestions">
            {suggestions.map((suggestion, index) => (
              <button
                key={`ai-suggestion-${index}`}
                onClick={() => {
                  setLocalPrompt(suggestion);
                  onPromptChange(suggestion);
                  performValidation(suggestion);
                }}
                className="w-full text-left p-2 rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                role="listitem"
                aria-label={`Apply suggestion: ${suggestion}`}
              >
                <p className="text-sm text-gray-700">{suggestion}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <p id={`prompt-help-${shot.id}`} className="text-xs text-muted-foreground">
        Describe the visual content, composition, lighting, mood, and any specific elements for this shot.
      </p>
    </div>
  );
};

export default ShotPromptEditor;
