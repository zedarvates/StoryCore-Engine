/**
 * ShotDeletionDialog - Confirmation dialog for shot deletion with phrase handling
 * 
 * Prompts user to confirm shot deletion and choose whether to delete or unlink
 * associated dialogue phrases. Ensures no orphaned phrase references remain.
 * 
 * Requirements: 7.3
 */

import React from 'react';
import type { Shot, DialoguePhrase } from '../types/projectDashboard';

export interface ShotDeletionDialogProps {
  /** The shot to be deleted */
  shot: Shot;
  /** Dialogue phrases associated with this shot */
  associatedPhrases: DialoguePhrase[];
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when user confirms deletion with delete phrases option */
  onConfirmDelete: (deletePhrases: boolean) => void;
  /** Callback when user cancels deletion */
  onCancel: () => void;
}

/**
 * ShotDeletionDialog component
 * 
 * Displays a confirmation dialog when deleting a shot, allowing the user to choose
 * whether to delete or unlink associated dialogue phrases.
 * 
 * Requirements: 7.3
 */
export const ShotDeletionDialog: React.FC<ShotDeletionDialogProps> = ({
  shot,
  associatedPhrases,
  isOpen,
  onConfirmDelete,
  onCancel,
}) => {
  if (!isOpen) return null;

  const phraseCount = associatedPhrases.length;
  const hasPhrases = phraseCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shot-deletion-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="mb-4">
          <h2
            id="shot-deletion-dialog-title"
            className="text-xl font-semibold text-gray-900"
          >
            Delete Shot?
          </h2>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete shot <strong>{shot.id}</strong>?
          </p>

          {hasPhrases && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <p className="text-yellow-800 font-medium mb-2">
                ⚠️ This shot has {phraseCount} associated dialogue{' '}
                {phraseCount === 1 ? 'phrase' : 'phrases'}
              </p>
              <p className="text-yellow-700 text-sm">
                Choose what to do with the associated dialogue:
              </p>
            </div>
          )}

          {!hasPhrases && (
            <p className="text-gray-600 text-sm">
              This shot has no associated dialogue phrases.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {hasPhrases && (
            <>
              <button
                onClick={() => onConfirmDelete(true)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                aria-label="Delete shot and associated phrases"
              >
                Delete Shot and Phrases
              </button>
              <button
                onClick={() => onConfirmDelete(false)}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                aria-label="Delete shot but keep phrases unlinked"
              >
                Delete Shot, Keep Phrases (Unlink)
              </button>
            </>
          )}

          {!hasPhrases && (
            <button
              onClick={() => onConfirmDelete(false)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              aria-label="Delete shot"
            >
              Delete Shot
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            aria-label="Cancel deletion"
          >
            Cancel
          </button>
        </div>

        {/* Additional Info */}
        {hasPhrases && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Delete Shot and Phrases:</strong> Permanently removes the shot and all
              associated dialogue phrases.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              <strong>Keep Phrases (Unlink):</strong> Removes the shot but keeps dialogue
              phrases unlinked. You can link them to other shots later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShotDeletionDialog;
