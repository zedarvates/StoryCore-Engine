import React, { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

// ============================================================================
// Types
// ============================================================================

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (projectName: string, projectPath: string) => Promise<void>;
}

interface FormErrors {
  projectName?: string;
  projectPath?: string;
}

// ============================================================================
// Create Project Dialog Component
// ============================================================================

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreateProject,
}: CreateProjectDialogProps) {
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate project name
    if (!projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    } else if (projectName.length < 3) {
      newErrors.projectName = 'Project name must be at least 3 characters';
    } else if (projectName.length > 50) {
      newErrors.projectName = 'Project name must be less than 50 characters';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(projectName)) {
      newErrors.projectName = 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    // Validate project path
    if (!projectPath.trim()) {
      newErrors.projectPath = 'Project location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle directory selection
  const handleSelectDirectory = async () => {
    try {
      // Check if ElectronAPI is available
      if (window.electronAPI) {
        const result = await window.electronAPI.project.selectDirectory();
        if (result) {
          setProjectPath(result);
          setErrors((prev) => ({ ...prev, projectPath: undefined }));
        }
      } else {
        // Fallback for web/demo mode
        const mockPath = `C:/Users/Documents/StoryCore/${projectName || 'new-project'}`;
        setProjectPath(mockPath);
        setErrors((prev) => ({ ...prev, projectPath: undefined }));
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      setGeneralError('Failed to open directory picker');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    setGeneralError(null);

    try {
      await onCreateProject(projectName, projectPath);
      
      // Reset form on success
      setProjectName('');
      setProjectPath('');
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      setGeneralError(
        error instanceof Error ? error.message : 'Failed to create project'
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (!isCreating) {
      setProjectName('');
      setProjectPath('');
      setErrors({});
      setGeneralError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20">
              <FolderPlus className="w-5 h-5 text-blue-400" />
            </div>
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Set up a new StoryCore project. Choose a name and location for your project files.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* General Error */}
            {generalError && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-400">
                {generalError}
              </Alert>
            )}

            {/* Project Name Field */}
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-gray-200">
                Project Name *
              </Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setErrors((prev) => ({ ...prev, projectName: undefined }));
                }}
                placeholder="My Awesome Story"
                disabled={isCreating}
                className={`bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 ${
                  errors.projectName ? 'border-red-500' : ''
                }`}
              />
              {errors.projectName && (
                <p className="text-sm text-red-400">{errors.projectName}</p>
              )}
            </div>

            {/* Project Location Field */}
            <div className="space-y-2">
              <Label htmlFor="project-path" className="text-gray-200">
                Project Location *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="project-path"
                  value={projectPath}
                  onChange={(e) => {
                    setProjectPath(e.target.value);
                    setErrors((prev) => ({ ...prev, projectPath: undefined }));
                  }}
                  placeholder="C:/Users/Documents/StoryCore/my-project"
                  disabled={isCreating}
                  className={`flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 ${
                    errors.projectPath ? 'border-red-500' : ''
                  }`}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectDirectory}
                  disabled={isCreating}
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                >
                  Browse
                </Button>
              </div>
              {errors.projectPath && (
                <p className="text-sm text-red-400">{errors.projectPath}</p>
              )}
              <p className="text-xs text-gray-500">
                Choose where to save your project files
              </p>
            </div>

            {/* Project Structure Info */}
            <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-4">
              <h4 className="text-sm font-semibold text-gray-200 mb-2">
                Project Structure
              </h4>
              <p className="text-xs text-gray-400 mb-2">
                The following structure will be created:
              </p>
              <ul className="text-xs text-gray-500 space-y-1 font-mono">
                <li>📁 {projectName || 'project-name'}/</li>
                <li className="ml-4">📄 project.json</li>
                <li className="ml-4">📁 scenes/</li>
                <li className="ml-4">📁 characters/</li>
                <li className="ml-4">📁 worlds/</li>
                <li className="ml-4">📁 assets/</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
