import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (projectName: string) => void;
}

export function NewProjectDialog({ isOpen, onClose, onCreateProject }: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setProjectName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate project name
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setError('Project name is required');
      return;
    }

    if (trimmedName.length < 3) {
      setError('Project name must be at least 3 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Project name must be less than 50 characters');
      return;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      setError('Project name contains invalid characters');
      return;
    }

    // Create project
    onCreateProject(trimmedName);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create New Project</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="project-name" className="mb-2 block text-sm font-medium">
              Project Name
            </label>
            <input
              ref={inputRef}
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setError('');
              }}
              placeholder="Enter project name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? 'project-name-error' : undefined}
            />
            {error && (
              <p id="project-name-error" className="mt-1 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Project Settings Info */}
          <div className="mb-6 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p className="mb-1 font-medium">Default Settings:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Empty storyboard</li>
              <li>All capabilities enabled</li>
              <li>Data Contract v1.0 format</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
