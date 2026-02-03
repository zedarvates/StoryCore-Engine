/**
 * NewProjectModal - Modal for creating a new project
 * 
 * Provides a form for creating a new StoryCore project with:
 * - Project name input
 * - Project type selection (optional)
 * - Initial settings configuration
 * 
 * Requirements: 1.1
 */

import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (projectName: string, projectType?: string) => void | Promise<void>;
}

/**
 * NewProjectModal component
 * 
 * Modal dialog for creating a new project with name and optional settings.
 */
export function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: NewProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<string>('standard');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreateProject(projectName.trim(), projectType);
      // Reset form on success
      setProjectName('');
      setProjectType('standard');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setProjectName('');
      setProjectType('standard');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Project"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="project-name">
            Project Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="project-name"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name"
            disabled={isCreating}
            autoFocus
            className="w-full"
          />
        </div>

        {/* Project Type */}
        <div className="space-y-2">
          <Label htmlFor="project-type">Project Type</Label>
          <select
            id="project-type"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            disabled={isCreating}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="standard">Standard Project</option>
            <option value="short-film">Short Film</option>
            <option value="feature">Feature Film</option>
            <option value="series">Series</option>
            <option value="documentary">Documentary</option>
          </select>
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
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isCreating || !projectName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
