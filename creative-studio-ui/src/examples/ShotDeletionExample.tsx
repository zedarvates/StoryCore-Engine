/**
 * ShotDeletionExample - Example usage of shot deletion with phrase handling
 * 
 * Demonstrates how to use the ShotDeletionDialog component and deleteShot function
 * from ProjectContext to safely delete shots with proper phrase handling.
 * 
 * Requirements: 7.3
 */

import React, { useState } from 'react';
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import { ShotDeletionDialog } from '../components/ShotDeletionDialog';
import {
  validateShotDeletion,
  getShotDeletionSummary,
  validateShotPhraseIntegrity,
} from '../utils/shotDeletion';
import type { Shot } from '../types/projectDashboard';

/**
 * ShotListWithDeletion - Component that displays shots with delete buttons
 */
const ShotListWithDeletion: React.FC = () => {
  const { project, deleteShot } = useProject();
  const [shotToDelete, setShotToDelete] = useState<Shot | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  if (!project) {
    return <div className="p-4 text-gray-600">No project loaded</div>;
  }

  // Handle delete button click
  const handleDeleteClick = (shot: Shot) => {
    // Validate deletion
    const validation = validateShotDeletion(shot.id, project);

    if (!validation.canDelete) {
      alert(`Cannot delete shot: ${validation.errors.join(', ')}`);
      return;
    }

    // Show confirmation dialog
    setShotToDelete(shot);
    setShowDialog(true);
  };

  // Handle deletion confirmation
  const handleConfirmDelete = (deletePhrases: boolean) => {
    if (!shotToDelete) return;

    // Get summary for logging
    const summary = getShotDeletionSummary(shotToDelete.id, project, {
      deletePhrases,
    });

    console.log('Deleting shot:', summary);

    // Delete the shot
    deleteShot(shotToDelete.id, deletePhrases);

    // Validate integrity after deletion
    setTimeout(() => {
      if (project) {
        const integrity = validateShotPhraseIntegrity(project);
        if (!integrity.isValid) {
          console.error('Shot-phrase integrity validation failed:', integrity.errors);
        } else {
          console.log('Shot-phrase integrity validated successfully');
        }
      }
    }, 100);

    // Close dialog
    setShowDialog(false);
    setShotToDelete(null);
  };

  // Handle cancellation
  const handleCancel = () => {
    setShowDialog(false);
    setShotToDelete(null);
  };

  // Get associated phrases for the shot to delete
  const associatedPhrases = shotToDelete
    ? project.audioPhrases.filter(phrase => phrase.shotId === shotToDelete.id)
    : [];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Shots</h2>

      {project.shots.length === 0 ? (
        <p className="text-gray-600">No shots in project</p>
      ) : (
        <div className="space-y-4">
          {project.shots.map(shot => {
            const validation = validateShotDeletion(shot.id, project);
            const phraseCount = validation.associatedPhrases.length;

            return (
              <div
                key={shot.id}
                className="border border-gray-300 rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{shot.id}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Start: {shot.startTime}s | Duration: {shot.duration}s
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    Prompt: {shot.prompt || '(no prompt)'}
                  </p>
                  {phraseCount > 0 && (
                    <p className="text-sm text-orange-600 mt-2">
                      ⚠️ {phraseCount} associated dialogue{' '}
                      {phraseCount === 1 ? 'phrase' : 'phrases'}
                    </p>
                  )}
                  {validation.warnings.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {validation.warnings.map((warning, idx) => (
                        <div key={idx}>• {warning}</div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteClick(shot)}
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  aria-label={`Delete shot ${shot.id}`}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Deletion Dialog */}
      {shotToDelete && (
        <ShotDeletionDialog
          shot={shotToDelete}
          associatedPhrases={associatedPhrases}
          isOpen={showDialog}
          onConfirmDelete={handleConfirmDelete}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

/**
 * ShotDeletionExample - Main example component
 */
export const ShotDeletionExample: React.FC = () => {
  return (
    <ProjectProvider projectId="example-project">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8">
          <div className="bg-white rounded-lg shadow-md">
            <div className="border-b border-gray-200 px-6 py-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Shot Deletion Example
              </h1>
              <p className="text-gray-600 mt-2">
                Demonstrates shot deletion with phrase handling and confirmation dialog
              </p>
            </div>

            <ShotListWithDeletion />

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-2">Features:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Confirmation dialog before deletion</li>
                <li>✓ Option to delete or unlink associated phrases</li>
                <li>✓ Validation to prevent orphaned phrase references</li>
                <li>✓ Display of affected sequences and phrases</li>
                <li>✓ Integrity validation after deletion</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProjectProvider>
  );
};

export default ShotDeletionExample;
