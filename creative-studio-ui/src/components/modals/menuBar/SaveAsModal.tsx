/**
 * SaveAsModal - Modal for saving project with a new name
 * 
 * Provides a form for saving the current project with:
 * - New project name input
 * - Optional location selection
 * - Validation and error handling
 * 
 * Requirements: 1.4
 */

import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface SaveAsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectName: string;
  onSaveAs: (newName: string, location?: string) => void | Promise<void>;
}

/**
 * SaveAsModal component
 * 
 * Modal dialog for saving project with a new name.
 */
export function SaveAsModal({
  isOpen,
  onClose,
  currentProjectName,
  onSaveAs,
}: SaveAsModalProps) {
  const [projectName, setProjectName] = useState(currentProjectName);
  const [location, setLocation] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    if (projectName.trim() === currentProjectName && !location) {
      setError('Please enter a different name or location');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSaveAs(projectName.trim(), location || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setProjectName(currentProjectName);
      setLocation('');
      setError(null);
      onClose();
    }
  };

  const handleBrowseLocation = () => {
    // This would trigger the native file picker
    // For now, we'll use a placeholder
    const electronAPI = (window as any).electron;
    if (electronAPI?.dialog?.showSaveDialog) {
      electronAPI.dialog.showSaveDialog({
        title: 'Save Project As',
        defaultPath: projectName,
        filters: [
          { name: 'StoryCore Project', extensions: ['json'] }
        ]
      }).then((result: { filePath?: string; canceled: boolean }) => {
        if (!result.canceled && result.filePath) {
          setLocation(result.filePath);
        }
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Save Project As"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="save-as-name">
            Project Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="save-as-name"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter new project name"
            disabled={isSaving}
            autoFocus
            className="w-full"
          />
        </div>

        {/* Location (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="save-as-location">Location (Optional)</Label>
          <div className="flex gap-2">
            <Input
              id="save-as-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Default location"
              disabled={isSaving}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleBrowseLocation}
              disabled={isSaving}
            >
              Browse
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Leave empty to use the default project location
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !projectName.trim()}
          >
            {isSaving ? 'Saving...' : 'Save As'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
