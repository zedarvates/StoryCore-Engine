/**
 * Persistence Example
 * 
 * Demonstrates the project persistence system with auto-save,
 * manual save, load, and error handling.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React, { useState } from 'react';
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import { SaveStatusIndicator } from '../components/SaveStatusIndicator';
import type { Shot } from '../types/projectDashboard';

// ============================================================================
// Example Component
// ============================================================================

const PersistenceExampleContent: React.FC = () => {
  const {
    project,
    loadProject,
    saveProject,
    updateShot,
    isSaving,
    isLoading,
    saveStatus,
    error,
  } = useProject();

  const [projectIdInput, setProjectIdInput] = useState('demo-project-1');

  // Handle load project
  const handleLoadProject = async () => {
    await loadProject(projectIdInput);
  };

  // Handle manual save
  const handleManualSave = async () => {
    await saveProject();
  };

  // Handle add test shot
  const handleAddTestShot = () => {
    if (!project) return;

    const newShot: Shot = {
      id: `shot-${Date.now()}`,
      sequenceId: 'seq-1',
      startTime: project.shots.length * 5,
      duration: 5,
      prompt: 'A beautiful sunset over the ocean with waves crashing on the shore',
      metadata: {
        cameraAngle: 'wide',
        lighting: 'golden hour',
        mood: 'peaceful',
      },
    };

    // This will trigger auto-save after 2 seconds
    updateShot(newShot.id, newShot);
  };

  // Handle update shot prompt
  const handleUpdatePrompt = (shotId: string, newPrompt: string) => {
    // This will trigger auto-save after 2 seconds
    updateShot(shotId, { prompt: newPrompt });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Project Persistence Example</h1>

      {/* Save Status Indicator */}
      <div className="mb-6 flex items-center gap-4">
        <SaveStatusIndicator />
        {error && (
          <div className="text-red-600 text-sm">
            Error: {error}
          </div>
        )}
      </div>

      {/* Project Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Project Controls</h2>

        <div className="space-y-4">
          {/* Load Project */}
          <div className="flex gap-2">
            <input
              type="text"
              value={projectIdInput}
              onChange={(e) => setProjectIdInput(e.target.value)}
              placeholder="Project ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            />
            <button
              onClick={handleLoadProject}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load Project'}
            </button>
          </div>

          {/* Manual Save */}
          {project && (
            <div className="flex gap-2">
              <button
                onClick={handleManualSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Manual Save'}
              </button>
              <button
                onClick={handleAddTestShot}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Add Test Shot (Auto-save in 2s)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project Info */}
      {project && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Project Information</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">ID:</span> {project.id}
            </div>
            <div>
              <span className="font-medium">Name:</span> {project.name}
            </div>
            <div>
              <span className="font-medium">Schema Version:</span> {project.schemaVersion}
            </div>
            <div>
              <span className="font-medium">Shots:</span> {project.shots.length}
            </div>
            <div>
              <span className="font-medium">Audio Phrases:</span> {project.audioPhrases.length}
            </div>
            <div>
              <span className="font-medium">Save Status:</span>{' '}
              <span className={`
                ${saveStatus === 'saved' ? 'text-green-600' : ''}
                ${saveStatus === 'saving' ? 'text-blue-600' : ''}
                ${saveStatus === 'error' ? 'text-red-600' : ''}
              `}>
                {saveStatus}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Shots List */}
      {project && project.shots.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Shots</h2>
          <div className="space-y-4">
            {project.shots.map((shot) => (
              <div key={shot.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-medium text-gray-600">
                    Shot {shot.id}
                  </div>
                  <div className="text-xs text-gray-500">
                    {shot.startTime}s - {shot.startTime + shot.duration}s
                  </div>
                </div>
                <textarea
                  value={shot.prompt}
                  onChange={(e) => handleUpdatePrompt(shot.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                  placeholder="Enter shot prompt..."
                />
                <div className="mt-2 text-xs text-gray-500">
                  Changes auto-save after 2 seconds
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to Use:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Enter a project ID and click "Load Project" to load or create a project</li>
          <li>Click "Add Test Shot" to add a shot (auto-saves after 2 seconds)</li>
          <li>Edit shot prompts - changes auto-save after 2 seconds</li>
          <li>Click "Manual Save" to save immediately</li>
          <li>Watch the save status indicator for feedback</li>
          <li>Reload the page and load the same project ID to verify persistence</li>
        </ol>
      </div>

      {/* Technical Details */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Technical Details:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Auto-save debouncing: 2 seconds (Requirement 9.1)</li>
          <li>Data Contract v1 validation on save/load (Requirement 9.3)</li>
          <li>Retry logic: 3 attempts with exponential backoff (Requirement 9.5)</li>
          <li>Storage: Browser localStorage (can be swapped for backend API)</li>
          <li>Save status indicator updates in real-time (Requirement 9.2)</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================================================
// Example with Provider
// ============================================================================

export const PersistenceExample: React.FC = () => {
  return (
    <ProjectProvider projectId="demo-project-1">
      <PersistenceExampleContent />
    </ProjectProvider>
  );
};

export default PersistenceExample;
