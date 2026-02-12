import React, { useState } from 'react';
import { FolderOpen, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
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

interface OpenProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenProject: (projectPath: string) => Promise<void>;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    message: string;
    path?: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    path?: string;
  }>;
  config?: unknown;
}

// ============================================================================
// Open Project Dialog Component
// ============================================================================

export function OpenProjectDialog({
  open,
  onOpenChange,
  onOpenProject,
}: OpenProjectDialogProps) {
  const [projectPath, setProjectPath] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Handle directory selection
  const handleSelectDirectory = async () => {
    try {
      // Check if ElectronAPI is available
      if (window.electronAPI) {
        const result = await window.electronAPI.project.selectDirectory();
        if (result) {
          setProjectPath(result);
          setGeneralError(null);
          // Automatically validate when path is selected
          await validateProject(result);
        }
      } else {
        // Fallback for web/demo mode
        const mockPath = 'C:/Users/Documents/StoryCore/my-project';
        setProjectPath(mockPath);
        setGeneralError(null);
        // Mock validation result
        setValidationResult({
          isValid: true,
          errors: [],
          warnings: [],
        });
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      setGeneralError('Failed to open directory picker');
    }
  };

  // Validate project structure
  const validateProject = async (path: string) => {
    if (!path.trim()) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    setGeneralError(null);

    try {
      // Check if ElectronAPI is available
      if (window.electronAPI) {
        const result = await window.electronAPI.project.validate(path);
        setValidationResult(result);
      } else {
        // Mock validation for demo mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        setValidationResult({
          isValid: true,
          errors: [],
          warnings: [{ type: 'info', message: 'Demo mode: validation skipped' }],
        });
      }
    } catch (error) {
      console.error('Failed to validate project:', error);
      setValidationResult({
        isValid: false,
        errors: [{ type: 'error', message: error instanceof Error ? error.message : 'Failed to validate project' }],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectPath.trim()) {
      setGeneralError('Please select a project directory');
      return;
    }

    if (!validationResult) {
      await validateProject(projectPath);
      return;
    }

    if (!validationResult.isValid) {
      setGeneralError('Cannot open invalid project. Please fix the errors first.');
      return;
    }

    setIsOpening(true);
    setGeneralError(null);

    try {
      await onOpenProject(projectPath);
      
      // Reset form on success
      setProjectPath('');
      setValidationResult(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to open project:', error);
      setGeneralError(
        error instanceof Error ? error.message : 'Failed to open project'
      );
    } finally {
      setIsOpening(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (!isOpening && !isValidating) {
      setProjectPath('');
      setValidationResult(null);
      setGeneralError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/20">
              <FolderOpen className="w-5 h-5 text-purple-400" />
            </div>
            Open Existing Project
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Select a StoryCore project directory to open. The project will be validated before opening.
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

            {/* Project Path Field */}
            <div className="space-y-2">
              <Label htmlFor="project-path" className="text-gray-200">
                Project Directory *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="project-path"
                  value={projectPath}
                  onChange={(e) => {
                    setProjectPath(e.target.value);
                    setValidationResult(null);
                    setGeneralError(null);
                  }}
                  placeholder="C:/Users/Documents/StoryCore/my-project"
                  disabled={isOpening || isValidating}
                  className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectDirectory}
                  disabled={isOpening || isValidating}
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                >
                  Browse
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Select the root directory of your StoryCore project
              </p>
            </div>

            {/* Validation Button */}
            {projectPath && !validationResult && !isValidating && (
              <Button
                type="button"
                variant="outline"
                onClick={() => validateProject(projectPath)}
                className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                Validate Project
              </Button>
            )}

            {/* Validating State */}
            {isValidating && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Validating project...</span>
                </div>
              </div>
            )}

            {/* Validation Results */}
            {validationResult && !isValidating && (
              <div className="space-y-3">
                {/* Success Message */}
                {validationResult.isValid && (
                  <div className="rounded-lg bg-green-900/20 border border-green-800 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-green-400 mb-1">
                          Valid Project
                        </h4>
                        <p className="text-sm text-green-300">
                          Project structure is valid
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Errors */}
                {validationResult.errors.length > 0 && (
                  <div className="rounded-lg bg-red-900/20 border border-red-800 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-red-400 mb-2">
                          Validation Errors
                        </h4>
                        <ul className="space-y-1">
                          {validationResult.errors.map((error, index) => (
                            <li key={index} className="text-sm text-red-300">
                              • {error.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {validationResult.warnings.length > 0 && (
                  <div className="rounded-lg bg-yellow-900/20 border border-yellow-800 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-yellow-400 mb-2">
                          Warnings
                        </h4>
                        <ul className="space-y-1">
                          {validationResult.warnings.map((warning, index) => (
                            <li key={index} className="text-sm text-yellow-300">
                              • {warning.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isOpening || isValidating}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isOpening || isValidating || !validationResult?.isValid}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isOpening ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                'Open Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

