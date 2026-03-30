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
import { AlertCircle, CheckCircle, AlertTriangle, Zap, Loader2, Undo2, Box, Layers } from 'lucide-react';
import { validatePrompt } from '../utils/promptValidation';
import { checkOllamaStatus } from '../services/ollamaConfig';
import { promptOptimizer } from '../services/ai/PromptOptimizationService';
import { CINEMATIC_SHOT_PRESETS } from '../constants/presets/shotPresets';
import { NarrativeLayerMapper } from '../services/NarrativeLayerMapper';
import { KritaLayoutPreview } from './KritaLayoutPreview';
import type { Shot, ShotPreset, PromptValidation } from '../types';

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

  const [validation, setValidation] = useState<PromptValidation | null>(
    validationError || null
  );
  const [isValidating, setIsValidating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(prompt || shot.prompt || '');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(shot.presetId || null);
  const [is3DMode, setIs3DMode] = useState<boolean>(shot.is3DMode || false);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean | null>(null);
  const activeNarrativeKeywords = NarrativeLayerMapper.getNarrativeKeywords(localPrompt);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // Sync local prompt with prop changes
  // ============================================================================

  useEffect(() => {
    setLocalPrompt(prompt);
  }, [prompt]);

  // Check Ollama status on mount
  useEffect(() => {
    async function checkOllama() {
      const available = await checkOllamaStatus();
      setIsOllamaAvailable(available);
    }
    checkOllama();
  }, []);

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

  // ============================================================================
  // Optimization Logic
  // ============================================================================
  
  const handleOptimize = useCallback(async () => {
    if (!localPrompt.trim() || isOptimizing) return;
    
    setPreviousPrompt(localPrompt);
    setIsOptimizing(true);
    try {
      const optimized = await promptOptimizer.balancePrompt(localPrompt);
      if (optimized && optimized !== localPrompt) {
        setLocalPrompt(optimized);
        onPromptChange(optimized);
        performValidation(optimized);
      }
    } catch (error) {
      console.error('Failed to optimize prompt:', error);
      setPreviousPrompt(null);
    } finally {
      setIsOptimizing(false);
    }
  }, [localPrompt, isOptimizing, onPromptChange, performValidation]);

  const handleUndo = useCallback(() => {
    if (previousPrompt !== null) {
      setLocalPrompt(previousPrompt);
      onPromptChange(previousPrompt);
      setPreviousPrompt(null);
      performValidation(previousPrompt);
    }
  }, [previousPrompt, onPromptChange, performValidation]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleApplyPreset = useCallback((preset: ShotPreset) => {
    const newPrompt = preset.promptTemplate;
    setSelectedPresetId(preset.id);
    setLocalPrompt(newPrompt);
    onPromptChange(newPrompt);
    performValidation(newPrompt);
    
    // Automatically enable 3D mode if supported by the preset
    const supports3D = !!preset.is3DSupported;
    setIs3DMode(supports3D);
    
    // Notify parent of the core state changes for persistence
    onPromptChange(newPrompt); // This usually triggers an update in parent
  }, [onPromptChange, performValidation]);

  // Update shot metadata when 3D mode or Preset changes
  useEffect(() => {
    // Only trigger if values actually differ from shot object
    if (selectedPresetId !== shot.presetId || is3DMode !== shot.is3DMode) {
      // Trigger a soft update in the parent (e.g. through a debounced metadata update)
      // For now we assume the parent handles the Shot object sync
    }
  }, [is3DMode, selectedPresetId, shot.presetId, shot.is3DMode]);

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
        
        {/* Validation Status Badge & Optimization Button */}
        <div className="flex items-center gap-2" role="status" aria-live="polite">
          <button
            onClick={handleOptimize}
            disabled={!localPrompt.trim() || isOptimizing || isOllamaAvailable === false}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              isOptimizing 
                ? 'bg-amber-100 text-amber-700 animate-pulse' 
                : isOllamaAvailable === false
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale'
                : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 shadow-sm'
            }`}
            title={isOllamaAvailable === false ? "Ollama non détecté (Service AI requis)" : "Optimiser avec GDPval (IA)"}
          >
            {isOptimizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className={`h-3 w-3 ${isOllamaAvailable === false ? 'text-gray-400' : 'text-amber-500'}`} />}
            Boost GDPval
          </button>

          {previousPrompt !== null && (
            <button
              onClick={handleUndo}
              disabled={isOptimizing}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-all"
              title="Annuler l'optimisation"
            >
              <Undo2 className="h-3 w-3" />
              Undo
            </button>
          )}

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

          {/* 2D/3D Mode Toggle (Only if preset supports 3D) */}
          {CINEMATIC_SHOT_PRESETS.find(p => p.id === selectedPresetId)?.is3DSupported && (
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner ml-2">
              <button
                onClick={() => setIs3DMode(false)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all ${
                  !is3DMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Use 2D Krita layers for layout"
              >
                <Layers className="h-2.5 w-2.5" />
                2D Layout
              </button>
              <button
                onClick={() => setIs3DMode(true)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all ${
                  is3DMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Use 3D Puppet for precision staging"
              >
                <Box className="h-2.5 w-2.5" />
                3D Rig
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cinematic Presets Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Cinematic Presets & Layout Guides
          </Label>
          
          {activeNarrativeKeywords.length > 0 && (
            <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">Narrative Active:</span>
              <div className="flex gap-1">
                {activeNarrativeKeywords.map(kw => (
                  <Badge key={kw} variant="outline" className="text-[8px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200 uppercase">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {CINEMATIC_SHOT_PRESETS.map((basePreset) => {
            // Adapt the preset visual in real-time based on what the user types!
            const preset = NarrativeLayerMapper.adaptLayoutToNarrative(localPrompt, basePreset);
            const isSelected = selectedPresetId === preset.id;

            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`group flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg transition-all shadow-sm ${
                  isSelected 
                    ? 'bg-blue-50 border border-blue-400 ring-1 ring-blue-100' 
                    : 'bg-white border border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
                title={preset.description}
              >
                {/* Layout Mini-Guide Icon */}
                <div className={`flex flex-wrap w-5 h-5 rounded-md overflow-hidden border ${isSelected ? 'border-blue-400 shadow-sm' : 'border-slate-300'}`}>
                  {Object.values(preset.layoutColors).filter(c => c).slice(0, 4).map((color, idx) => (
                    <div 
                      key={idx} 
                      className="w-1/2 h-1/2" 
                      style={{ backgroundColor: color as string }} 
                    />
                  ))}
                </div>
                <div className="text-left">
                  <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                    {preset.label}
                  </p>
                  <p className={`text-[9px] font-medium ${isSelected ? 'text-blue-500' : 'text-slate-500'}`}>
                    {preset.framing} • {preset.category}
                  </p>
                </div>
                {preset.is3DSupported && (
                  <div className="ml-auto" title="3D Rig Available">
                    <Box className="h-3 w-3 text-emerald-500 opacity-60" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time Artistic Precept (Krita) Preview */}
      {!is3DMode && selectedPresetId && CINEMATIC_SHOT_PRESETS.find(p => p.id === selectedPresetId)?.templatePath && (
        <div className="space-y-2 animate-in zoom-in-95 duration-500 delay-150">
          <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
            <Layers className="h-2.5 w-2.5 text-blue-500" />
            Live Artistic Layout Extract
          </Label>
          <KritaLayoutPreview
            templatePath={CINEMATIC_SHOT_PRESETS.find(p => p.id === selectedPresetId)!.templatePath!}
            narrativeContext={localPrompt}
            className="shadow-md border-blue-100 ring-2 ring-blue-50/50"
            width={400} 
            height={225}
          />
        </div>
      )}

      {/* 3D Staging Placeholder if 3D Mode is Active */}
      {is3DMode && selectedPresetId && CINEMATIC_SHOT_PRESETS.find(p => p.id === selectedPresetId)?.rigPath && (
        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-500">
           <Label className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
            <Box className="h-2.5 w-2.5 text-emerald-500" />
            3D Staging Mode (Puppet Engine)
          </Label>
          <div className="w-full h-[225px] bg-slate-900 rounded-lg flex flex-col items-center justify-center border-2 border-emerald-500/20 shadow-lg relative overflow-hidden group">
             <Box className="h-12 w-12 text-emerald-500 opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
             <div className="flex flex-col items-center mt-2">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 rounded">3D Precise Puppet Ready</span>
                <span className="text-[8px] text-emerald-300 mt-1 opacity-60">Rig: {CINEMATIC_SHOT_PRESETS.find(p => p.id === selectedPresetId)!.rigPath!.split('/').pop()}</span>
             </div>
             <div className="absolute top-2 right-2 flex gap-1">
                <Badge variant="outline" className="text-[7px] border-emerald-500/40 text-emerald-400 bg-emerald-950/50 backdrop-blur-sm">Real-time Ik System</Badge>
                <Badge variant="outline" className="text-[7px] border-emerald-500/40 text-emerald-400 bg-emerald-950/50 backdrop-blur-sm">{CINEMATIC_SHOT_PRESETS.find(p => p.id === selectedPresetId)!.animationId}</Badge>
             </div>
          </div>
        </div>
      )}

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
          {validation.errors?.map((error, index) => (
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
          {validation.warnings?.map((warning, index) => (
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
          {validation.suggestions?.length > 0 && (
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
