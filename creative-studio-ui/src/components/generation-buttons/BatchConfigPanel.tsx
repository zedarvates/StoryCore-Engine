/**
 * Batch Configuration Panel Component
 * 
 * Provides UI for configuring batch generation settings:
 * - Batch mode toggle
 * - Batch size control
 * - Variation parameter controls
 * 
 * Requirements: 11.1, 11.2
 */

import React from 'react';
import { useGenerationStore } from '../../stores/generationStore';
import type { BatchGenerationConfig } from '../../types/generation';

interface BatchConfigPanelProps {
  onClose?: () => void;
}

export const BatchConfigPanel: React.FC<BatchConfigPanelProps> = ({ onClose }) => {
  const { batchConfig, setBatchConfig } = useGenerationStore();

  const handleToggleBatch = () => {
    setBatchConfig({ enabled: !batchConfig.enabled });
  };

  const handleBatchSizeChange = (size: number) => {
    setBatchConfig({ batchSize: Math.max(1, Math.min(20, size)) });
  };

  const handleToggleVarySeeds = () => {
    setBatchConfig({
      variationParams: {
        ...batchConfig.variationParams,
        varySeeds: !batchConfig.variationParams.varySeeds,
      },
    });
  };

  const handleSeedRangeChange = (min: number, max: number) => {
    setBatchConfig({
      variationParams: {
        ...batchConfig.variationParams,
        seedRange: [min, max],
      },
    });
  };

  const handleToggleVaryPrompts = () => {
    setBatchConfig({
      variationParams: {
        ...batchConfig.variationParams,
        varyPrompts: !batchConfig.variationParams.varyPrompts,
      },
    });
  };

  const handleToggleVaryParameters = () => {
    setBatchConfig({
      variationParams: {
        ...batchConfig.variationParams,
        varyParameters: !batchConfig.variationParams.varyParameters,
      },
    });
  };

  return (
    <div className="batch-config-panel bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Batch Generation Settings</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close batch configuration"
          >
            ✕
          </button>
        )}
      </div>

      {/* Batch Mode Toggle */}
      <div className="flex items-center justify-between">
        <label htmlFor="batch-enabled" className="text-sm font-medium text-gray-300">
          Enable Batch Generation
        </label>
        <button
          id="batch-enabled"
          role="switch"
          aria-checked={batchConfig.enabled}
          onClick={handleToggleBatch}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            batchConfig.enabled ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              batchConfig.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {batchConfig.enabled && (
        <>
          {/* Batch Size */}
          <div className="space-y-2">
            <label htmlFor="batch-size" className="text-sm font-medium text-gray-300">
              Batch Size: {batchConfig.batchSize}
            </label>
            <input
              id="batch-size"
              type="range"
              min="1"
              max="20"
              value={batchConfig.batchSize}
              onChange={(e) => handleBatchSizeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1</span>
              <span>20</span>
            </div>
          </div>

          {/* Variation Parameters */}
          <div className="space-y-4 border-t border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-300">Variation Parameters</h4>

            {/* Vary Seeds */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="vary-seeds" className="text-sm text-gray-400">
                  Vary Seeds
                </label>
                <button
                  id="vary-seeds"
                  role="switch"
                  aria-checked={batchConfig.variationParams.varySeeds}
                  onClick={handleToggleVarySeeds}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    batchConfig.variationParams.varySeeds ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      batchConfig.variationParams.varySeeds ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {batchConfig.variationParams.varySeeds && (
                <div className="pl-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="seed-min" className="text-xs text-gray-500">
                      Min:
                    </label>
                    <input
                      id="seed-min"
                      type="number"
                      value={batchConfig.variationParams.seedRange?.[0] || 0}
                      onChange={(e) =>
                        handleSeedRangeChange(
                          parseInt(e.target.value),
                          batchConfig.variationParams.seedRange?.[1] || 999999
                        )
                      }
                      className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1"
                    />
                    <label htmlFor="seed-max" className="text-xs text-gray-500">
                      Max:
                    </label>
                    <input
                      id="seed-max"
                      type="number"
                      value={batchConfig.variationParams.seedRange?.[1] || 999999}
                      onChange={(e) =>
                        handleSeedRangeChange(
                          batchConfig.variationParams.seedRange?.[0] || 0,
                          parseInt(e.target.value)
                        )
                      }
                      className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Vary Prompts */}
            <div className="flex items-center justify-between">
              <label htmlFor="vary-prompts" className="text-sm text-gray-400">
                Vary Prompts
              </label>
              <button
                id="vary-prompts"
                role="switch"
                aria-checked={batchConfig.variationParams.varyPrompts}
                onClick={handleToggleVaryPrompts}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  batchConfig.variationParams.varyPrompts ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    batchConfig.variationParams.varyPrompts ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Vary Parameters */}
            <div className="flex items-center justify-between">
              <label htmlFor="vary-parameters" className="text-sm text-gray-400">
                Vary Parameters
              </label>
              <button
                id="vary-parameters"
                role="switch"
                aria-checked={batchConfig.variationParams.varyParameters}
                onClick={handleToggleVaryParameters}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  batchConfig.variationParams.varyParameters ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    batchConfig.variationParams.varyParameters ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3">
            <p className="text-xs text-blue-300">
              Batch generation will create {batchConfig.batchSize} variations with the selected
              parameters. Each variation will be queued and processed sequentially.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
