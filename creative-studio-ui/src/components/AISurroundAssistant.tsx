import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { Shot, SurroundConfig } from '../types';
import { getAIPresetService, type AIPresetSuggestion } from '../services/aiPresetService';
import type { SurroundPreset } from '../components/SurroundPresetsPanel';

interface AISurroundAssistantProps {
  shot: Shot;
  currentConfig: SurroundConfig;
  onApplyPreset: (preset: SurroundPreset) => void;
}

/**
 * AISurroundAssistant - AI-powered surround sound preset suggestions
 * 
 * Features:
 * - "Ask AI" button to trigger analysis
 * - Scene type detection and display
 * - Suggested preset with reasoning
 * - Alternative preset options
 * - One-click preset application
 * - Loading and error states
 * 
 * Requirements: 20.11
 */
export const AISurroundAssistant: React.FC<AISurroundAssistantProps> = ({
  shot,
  currentConfig,
  onApplyPreset,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<AIPresetSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  const handleAskAI = async () => {
    setIsAnalyzing(true);
    setError(null);
    setSuggestion(null);
    setAppliedPresetId(null);

    try {
      const aiService = getAIPresetService();
      const result = await aiService.suggestPreset(shot);
      setSuggestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze scene');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyPreset = (preset: SurroundPreset) => {
    onApplyPreset(preset);
    setAppliedPresetId(preset.id);

    // Clear applied indicator after 2 seconds
    setTimeout(() => {
      setAppliedPresetId(null);
    }, 2000);
  };

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-blue-950/30 to-purple-950/30 rounded-lg border border-blue-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
        </div>

        <button
          onClick={handleAskAI}
          disabled={isAnalyzing}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
            isAnalyzing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Ask AI
            </>
          )}
        </button>
      </div>

      {/* Info message */}
      {!suggestion && !error && !isAnalyzing && (
        <div className="flex items-start gap-2 p-3 bg-blue-950/50 rounded-md border border-blue-800/50">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-200 dark:text-blue-100">
            Click "Ask AI" to analyze this scene and get intelligent surround sound preset
            recommendations based on the content.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-900/20 rounded-md border border-red-800/50">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">Analysis Failed</p>
            <p className="text-sm text-red-200 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Suggestion result */}
      {suggestion && (
        <div className="space-y-4">
          {/* Scene Analysis */}
          <div className="bg-gray-200 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-foreground mb-2">Scene Analysis</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Scene Type:</span>
                <span className="text-sm font-medium text-foreground capitalize">
                  {suggestion.analysis.sceneType}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        suggestion.confidence >= 80
                          ? 'bg-green-600'
                          : suggestion.confidence >= 50
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${suggestion.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {suggestion.confidence}%
                  </span>
                </div>
              </div>
              {suggestion.analysis.keywords.length > 0 && (
                <div className="pt-2 border-t border-gray-300 dark:border-gray-700">
                  <span className="text-xs text-muted-foreground">Detected keywords:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {suggestion.analysis.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-xs bg-blue-950/50 text-blue-300 rounded border border-blue-800/50"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Suggested Preset */}
          <div className="bg-gray-200 dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-600">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white dark:text-white">Recommended Preset</h4>
              <span className="text-xs px-2 py-1 bg-blue-950/50 text-blue-300 rounded font-medium border border-blue-800/50">
                {suggestion.preset.mode}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <h5 className="text-base font-medium text-white dark:text-white">
                  {suggestion.preset.name}
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {suggestion.preset.description}
                </p>
              </div>

              <div className="p-3 bg-blue-950/30 rounded-md border border-blue-800/50">
                <p className="text-sm text-blue-200 dark:text-blue-100">{suggestion.reasoning}</p>
              </div>

              {/* Channel levels preview */}
              <div className="space-y-1">
                <span className="text-xs text-gray-600 dark:text-gray-300">Channel Configuration:</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(suggestion.preset.channels).map(([channel, level]) => {
                    if (typeof level !== 'number') return null;
                    return (
                      <div key={channel} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-300 w-16 truncate">
                          {channel}:
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${level}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300 w-8 text-right">
                          {level}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => handleApplyPreset(suggestion.preset)}
                disabled={appliedPresetId === suggestion.preset.id}
                className={`w-full px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  appliedPresetId === suggestion.preset.id
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {appliedPresetId === suggestion.preset.id ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Applied!
                  </>
                ) : (
                  'Apply This Preset'
                )}
              </button>
            </div>
          </div>

          {/* Alternative Presets */}
          {suggestion.alternativePresets && suggestion.alternativePresets.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white dark:text-white">Alternative Options</h4>
              <div className="grid grid-cols-2 gap-2">
                {suggestion.alternativePresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="bg-gray-200 dark:bg-gray-800 p-3 rounded-lg border border-gray-300 dark:border-gray-700 hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-medium text-white dark:text-white">{preset.name}</h5>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                        {preset.mode}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{preset.description}</p>
                    {appliedPresetId === preset.id && (
                      <div className="mt-2 flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-xs font-medium">Applied</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scene info */}
      <div className="pt-3 border-t border-blue-800/50">
        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
          <div>
            <span className="font-medium">Scene:</span> {shot.title}
          </div>
          {shot.description && (
            <div>
              <span className="font-medium">Description:</span>{' '}
              {shot.description.slice(0, 100)}
              {shot.description.length > 100 && '...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Compact version of AI Assistant for inline use
 */
export const AISurroundAssistantCompact: React.FC<AISurroundAssistantProps> = ({
  shot,
  currentConfig,
  onApplyPreset,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<AIPresetSuggestion | null>(null);

  const handleQuickSuggest = async () => {
    setIsAnalyzing(true);

    try {
      const aiService = getAIPresetService();
      const result = await aiService.suggestPreset(shot);
      setSuggestion(result);

      // Auto-apply if high confidence
      if (result.confidence >= 80) {
        onApplyPreset(result.preset);
      }
    } catch (err) {
      console.error('AI suggestion failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleQuickSuggest}
        disabled={isAnalyzing}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isAnalyzing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        AI Suggest
      </button>

      {suggestion && (
        <span className="text-xs text-muted-foreground">
          Suggested: <span className="font-medium">{suggestion.preset.name}</span>
        </span>
      )}
    </div>
  );
};
