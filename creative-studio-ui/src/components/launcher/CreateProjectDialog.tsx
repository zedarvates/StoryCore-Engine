import React, { useState } from 'react';
import { FolderPlus, Loader2, Film, Tv, Video, Clock } from 'lucide-react';
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
  onCreateProject: (projectName: string, projectPath: string, format: SerializableProjectFormat) => Promise<void>;
}

interface FormErrors {
  projectName?: string;
  projectPath?: string;
  format?: string;
}

// Project format configuration
export interface ProjectFormat {
  id: string;
  name: string;
  duration: string;
  durationMinutes: number;
  sequences: number;
  shotDuration: number;
  iconType: 'film' | 'tv' | 'video' | 'clock';
  description: string;
}

// Serializable format data (without React components)
export interface SerializableProjectFormat {
  id: string;
  name: string;
  duration: string;
  durationMinutes: number;
  sequences: number;
  shotDuration: number;
  iconType: 'film' | 'tv' | 'video' | 'clock';
  description: string;
}

const PROJECT_FORMATS: ProjectFormat[] = [
  {
    id: 'court-metrage',
    name: 'Court-métrage',
    duration: '1-15 min',
    durationMinutes: 15,
    sequences: 15,
    shotDuration: 60,
    iconType: 'film',
    description: '15 sequences of 1 minute each',
  },
  {
    id: 'moyen-metrage',
    name: 'Moyen-métrage',
    duration: '15-40 min',
    durationMinutes: 40,
    sequences: 20,
    shotDuration: 120,
    iconType: 'video',
    description: '20 sequences of 2 minutes each',
  },
  {
    id: 'long-metrage-standard',
    name: 'Long-métrage standard',
    duration: '70-90 min',
    durationMinutes: 90,
    sequences: 30,
    shotDuration: 180,
    iconType: 'film',
    description: '30 sequences of 3 minutes each',
  },
  {
    id: 'long-metrage-premium',
    name: 'Long-métrage premium',
    duration: '100-120 min',
    durationMinutes: 120,
    sequences: 40,
    shotDuration: 180,
    iconType: 'film',
    description: '40 sequences of 3 minutes each',
  },
  {
    id: 'tres-long-metrage',
    name: 'Très long-métrage',
    duration: '120+ min',
    durationMinutes: 150,
    sequences: 50,
    shotDuration: 180,
    iconType: 'film',
    description: '50 sequences of 3 minutes each',
  },
  {
    id: 'special-tv',
    name: 'Spécial TV / Streaming',
    duration: '40-60 min',
    durationMinutes: 60,
    sequences: 25,
    shotDuration: 144,
    iconType: 'tv',
    description: '25 sequences of 2.4 minutes each',
  },
  {
    id: 'episode-serie',
    name: 'Épisode de série',
    duration: '11 ou 22 min',
    durationMinutes: 22,
    sequences: 11,
    shotDuration: 120,
    iconType: 'clock',
    description: '11 sequences of 2 minutes each',
  },
];

// Helper function to get icon component from type
const getIconComponent = (iconType: 'film' | 'tv' | 'video' | 'clock') => {
  switch (iconType) {
    case 'film':
      return <Film className="w-5 h-5" />;
    case 'tv':
      return <Tv className="w-5 h-5" />;
    case 'video':
      return <Video className="w-5 h-5" />;
    case 'clock':
      return <Clock className="w-5 h-5" />;
    default:
      return <Film className="w-5 h-5" />;
  }
};

// Helper function to convert format to serializable format
const toSerializableFormat = (format: ProjectFormat): SerializableProjectFormat => {
  return {
    id: format.id,
    name: format.name,
    duration: format.duration,
    durationMinutes: format.durationMinutes,
    sequences: format.sequences,
    shotDuration: format.shotDuration,
    iconType: format.iconType,
    description: format.description,
  };
};

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
  const [selectedFormat, setSelectedFormat] = useState<ProjectFormat>(PROJECT_FORMATS[0]); // Default: Court-métrage
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
      await onCreateProject(projectName, projectPath, toSerializableFormat(selectedFormat));
      
      // Reset form on success
      setProjectName('');
      setProjectPath('');
      setSelectedFormat(PROJECT_FORMATS[0]);
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
      setSelectedFormat(PROJECT_FORMATS[0]);
      setErrors({});
      setGeneralError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20">
              <FolderPlus className="w-5 h-5 text-blue-400" />
            </div>
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Set up a new StoryCore project. Choose a name, location, and format for your project files.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
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
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-gray-200">
                Format * <span className="text-gray-500 text-sm font-normal">(Durée moyenne)</span>
              </Label>
              <div className="grid grid-cols-1 gap-3">
                {PROJECT_FORMATS.map((format) => (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => setSelectedFormat(format)}
                    disabled={isCreating}
                    className={`
                      relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left
                      ${
                        selectedFormat.id === format.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                      }
                      ${isCreating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* Radio indicator */}
                    <div
                      className={`
                        flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${
                          selectedFormat.id === format.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-600'
                        }
                      `}
                    >
                      {selectedFormat.id === format.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>

                    {/* Icon */}
                    <div
                      className={`
                        flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg
                        ${
                          selectedFormat.id === format.id
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-700 text-gray-400'
                        }
                      `}
                    >
                      {getIconComponent(format.iconType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-semibold ${
                            selectedFormat.id === format.id ? 'text-white' : 'text-gray-200'
                          }`}
                        >
                          {format.name}
                        </span>
                        <span className="text-sm text-gray-400">{format.duration}</span>
                      </div>
                      <p className="text-sm text-gray-500">{format.description}</p>
                    </div>

                    {/* Checkmark */}
                    {selectedFormat.id === format.id && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Structure Info */}
            <div className="rounded-lg bg-gray-800/50 border border-gray-700 p-4">
              <h4 className="text-sm font-semibold text-gray-200 mb-2">
                Project Structure Preview
              </h4>
              <p className="text-xs text-gray-400 mb-3">
                The following structure will be created with <strong>{selectedFormat.sequences} sequences</strong>:
              </p>
              <ul className="text-xs text-gray-500 space-y-1 font-mono">
                <li>📁 {projectName || 'project-name'}/</li>
                <li className="ml-4">📄 project.json</li>
                <li className="ml-4">📁 sequences/</li>
                <li className="ml-6 text-gray-600">
                  📄 Sequence 1, Sequence 2, ... Sequence {selectedFormat.sequences}
                </li>
                <li className="ml-6 text-gray-600">
                  ⏱️ Each sequence: ~{selectedFormat.shotDuration}s duration
                </li>
                <li className="ml-4">📁 characters/</li>
                <li className="ml-4">📁 worlds/</li>
                <li className="ml-4">📁 assets/</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-blue-400">
                  ✨ Total duration: ~{selectedFormat.durationMinutes} minutes ({selectedFormat.sequences} sequences × {selectedFormat.shotDuration}s)
                </p>
              </div>
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
