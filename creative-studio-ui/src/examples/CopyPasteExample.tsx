/**
 * Copy/Paste Example Component
 * 
 * Demonstrates the copy/paste functionality for shots
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */

import React, { useState } from 'react';
import { useClipboard, useClipboardEvents } from '../hooks/useClipboard';
import { ClipboardIndicator } from '../components/clipboard/ClipboardIndicator';
import type { Shot } from '../types';

// Sample shots for demonstration
const createSampleShots = (): Shot[] => [
  {
    id: 'shot-1',
    title: 'Opening Scene',
    description: 'Wide establishing shot of the city',
    duration: 5,
    position: 0,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
  },
  {
    id: 'shot-2',
    title: 'Character Introduction',
    description: 'Close-up of main character',
    duration: 3,
    position: 1,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
  },
  {
    id: 'shot-3',
    title: 'Action Sequence',
    description: 'Dynamic action shot',
    duration: 7,
    position: 2,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
  },
];

export const CopyPasteExample: React.FC = () => {
  const [shots, setShots] = useState<Shot[]>(createSampleShots());
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([]);
  const [sequenceId] = useState('sequence-1');

  const { hasContent, count, operation, copy, cut, paste, clear } = useClipboard();

  // Handle clipboard keyboard events
  useClipboardEvents(
    () => handleCopy(),
    () => handleCut(),
    () => handlePaste()
  );

  const selectedShots = shots.filter(shot => selectedShotIds.includes(shot.id));

  const handleCopy = () => {
    if (selectedShots.length > 0) {
      copy(selectedShots, sequenceId);
      console.log(`Copied ${selectedShots.length} shot(s)`);
    }
  };

  const handleCut = () => {
    if (selectedShots.length > 0) {
      cut(selectedShots, sequenceId);
      console.log(`Cut ${selectedShots.length} shot(s)`);
      
      // Remove cut shots from the list
      setShots(shots.filter(shot => !selectedShotIds.includes(shot.id)));
      setSelectedShotIds([]);
    }
  };

  const handlePaste = () => {
    const result = paste({
      targetSequenceId: sequenceId,
      position: shots.length,
    });

    if (result.success && result.pastedShots.length > 0) {
      // Add pasted shots to the list
      const newShots = result.pastedShots.map((shot, index) => ({
        ...shot,
        position: shots.length + index,
      }));
      
      setShots([...shots, ...newShots]);
      console.log(`Pasted ${newShots.length} shot(s)`);
      
      // Select the pasted shots
      setSelectedShotIds(newShots.map(s => s.id));
    }
  };

  const toggleSelection = (shotId: string, multiSelect: boolean) => {
    if (multiSelect) {
      setSelectedShotIds(prev =>
        prev.includes(shotId)
          ? prev.filter(id => id !== shotId)
          : [...prev, shotId]
      );
    } else {
      setSelectedShotIds([shotId]);
    }
  };

  const selectAll = () => {
    setSelectedShotIds(shots.map(s => s.id));
  };

  const deselectAll = () => {
    setSelectedShotIds([]);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Copy/Paste Example</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Demonstrates copy/paste functionality for shots with keyboard shortcuts
        </p>
      </div>

      {/* Clipboard Status */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Clipboard Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Has Content:</span>
            <span className="ml-2 font-medium">{hasContent ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Count:</span>
            <span className="ml-2 font-medium">{count}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Operation:</span>
            <span className="ml-2 font-medium">{operation || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={handleCopy}
          disabled={selectedShots.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Copy (Ctrl+C)
        </button>
        <button
          onClick={handleCut}
          disabled={selectedShots.length === 0}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cut (Ctrl+X)
        </button>
        <button
          onClick={handlePaste}
          disabled={!hasContent}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Paste (Ctrl+V)
        </button>
        <button
          onClick={clear}
          disabled={!hasContent}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear Clipboard
        </button>
        <div className="flex-1" />
        <button
          onClick={selectAll}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Select All
        </button>
        <button
          onClick={deselectAll}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Deselect All
        </button>
      </div>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Click on shots to select them (Ctrl+Click for multi-select)</li>
          <li>Use Ctrl+C to copy selected shots</li>
          <li>Use Ctrl+X to cut selected shots (removes them from the list)</li>
          <li>Use Ctrl+V to paste shots from clipboard</li>
          <li>Pasted shots get unique IDs and are added to the end</li>
          <li>The clipboard indicator shows when shots are copied/cut</li>
        </ul>
      </div>

      {/* Shots List */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold mb-4">
          Shots ({shots.length})
        </h2>
        {shots.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            No shots. Paste some shots to get started!
          </div>
        ) : (
          shots.map((shot) => {
            const isSelected = selectedShotIds.includes(shot.id);
            return (
              <div
                key={shot.id}
                onClick={(e) => toggleSelection(shot.id, e.ctrlKey || e.metaKey)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{shot.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {shot.description}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>ID: {shot.id}</span>
                      <span>Duration: {shot.duration}s</span>
                      <span>Position: {shot.position}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="ml-4 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                      Selected
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clipboard Indicator */}
      <ClipboardIndicator position="bottom-right" />
    </div>
  );
};
