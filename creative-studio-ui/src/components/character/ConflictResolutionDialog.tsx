// ============================================================================
// Conflict Resolution Dialog
// ============================================================================
// Displays a dialog when concurrent modifications are detected
// Allows user to choose which version to keep or merge changes
// Requirements: 2.5
// ============================================================================

import React from 'react';
import type { Character } from '../../types/character';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  localCharacter: Character;
  remoteCharacter: Character;
  onResolve: (resolution: 'local' | 'remote' | 'merge') => void;
}

const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  onClose,
  localCharacter,
  remoteCharacter,
  onResolve,
}) => {
  if (!isOpen) {
    return null;
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleResolve = (resolution: 'local' | 'remote' | 'merge') => {
    onResolve(resolution);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Conflict Detected: {localCharacter.name}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            This character has been modified in multiple places. Please choose which version to keep.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Local Version */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Your Changes</h3>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(localCharacter.creation_timestamp)}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">{localCharacter.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Archetype:</span>
                  <span className="ml-2 text-gray-900">{localCharacter.role.archetype}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Age Range:</span>
                  <span className="ml-2 text-gray-900">{localCharacter.visual_identity.age_range}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Relationships:</span>
                  <span className="ml-2 text-gray-900">{localCharacter.relationships.length}</span>
                </div>
              </div>

              <button
                onClick={() => handleResolve('local')}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Keep Your Changes
              </button>
            </div>

            {/* Remote Version */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Other Changes</h3>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(remoteCharacter.creation_timestamp)}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">{remoteCharacter.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Archetype:</span>
                  <span className="ml-2 text-gray-900">{remoteCharacter.role.archetype}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Age Range:</span>
                  <span className="ml-2 text-gray-900">{remoteCharacter.visual_identity.age_range}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Relationships:</span>
                  <span className="ml-2 text-gray-900">{remoteCharacter.relationships.length}</span>
                </div>
              </div>

              <button
                onClick={() => handleResolve('remote')}
                className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Keep Other Changes
              </button>
            </div>
          </div>

          {/* Merge Option */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">
              Advanced: Manual Merge
            </h4>
            <p className="text-sm text-yellow-800 mb-3">
              This will open the character editor with both versions side-by-side, allowing you to manually merge the changes.
            </p>
            <button
              onClick={() => handleResolve('merge')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              Merge Manually
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionDialog;
