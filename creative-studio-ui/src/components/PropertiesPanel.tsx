import { useRef, useState } from 'react';
import { useStore, useSelectedShot } from '../store';
import type { Shot, Project } from '../types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import {
  FileTextIcon,
  ClockIcon,
  MusicIcon,
  SparklesIcon,
  TypeIcon,
  SettingsIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon as PendingIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
  AlertCircleIcon,
} from 'lucide-react';

// ============================================================================
// PropertiesPanel Component
// ============================================================================

export function PropertiesPanel() {
  const selectedShot = useSelectedShot();
  const project = useStore((state) => state.project);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {selectedShot ? (
            <>
              <FileTextIcon className="h-5 w-5" />
              Shot Properties
            </>
          ) : (
            <>
              <SettingsIcon className="h-5 w-5" />
              Project Settings
            </>
          )}
        </h2>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {selectedShot ? (
            <ShotPropertiesForm shot={selectedShot} />
          ) : (
            <ProjectSettings project={project} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Shot Properties Form
// ============================================================================

interface ShotPropertiesFormProps {
  shot: Shot;
}

function ShotPropertiesForm({ shot }: ShotPropertiesFormProps) {
  const updateShot = useStore((state) => state.updateShot);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleTitleChange = (value: string) => {
    updateShot(shot.id, { title: value });
  };

  const handleDescriptionChange = (value: string) => {
    updateShot(shot.id, { description: value });
  };

  const handleDurationChange = (value: string) => {
    const duration = parseFloat(value);
    if (!isNaN(duration) && duration > 0) {
      updateShot(shot.id, { duration });
    }
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error state
    setUploadError(null);
    setIsUploading(true);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file');
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setUploadError('Image size must be less than 5MB');
        return;
      }

      // Convert image to base64
      const imageUrl = await convertImageToBase64(file);
      
      // Update shot with new image
      updateShot(shot.id, { image: imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Convert image file to base64
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as base64'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle image removal
  const handleImageRemove = () => {
    updateShot(shot.id, { image: undefined });
    setUploadError(null);
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="shot-title" className="text-sm font-medium">
            Title
          </Label>
          <Input
            id="shot-title"
            type="text"
            value={shot.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter shot title..."
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="shot-description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="shot-description"
            value={shot.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Enter shot description..."
            rows={4}
            className="mt-1.5 resize-none"
          />
        </div>

        <div>
          <Label htmlFor="shot-duration" className="text-sm font-medium flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Duration (seconds)
          </Label>
          <Input
            id="shot-duration"
            type="number"
            min="0.1"
            step="0.1"
            value={shot.duration}
            onChange={(e) => handleDurationChange(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      <Separator />

      {/* Image Upload Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Shot Image
        </Label>

        {/* Current Image Display */}
        {shot.image ? (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border bg-muted/50">
              <img
                src={shot.image}
                alt={shot.title || 'Shot thumbnail'}
                className="w-full h-48 object-cover"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={handleImageRemove}
              >
                <XIcon className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              Change Image
            </Button>
          </div>
        ) : (
          /* Upload Button */
          <div className="space-y-3">
            <div
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="rounded-full bg-primary/10 p-3 mb-3">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">Upload Shot Image</p>
              <p className="text-xs text-muted-foreground text-center">
                Click to select an image file
                <br />
                (Max 5MB, JPG, PNG, GIF, WebP)
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Select Image'}
            </Button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Error Message */}
        {uploadError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{uploadError}</p>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary">
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Uploading image...</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Shot Statistics */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Shot Statistics</h3>
        
        <div className="space-y-2">
          {/* Audio Tracks Count */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <MusicIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Audio Tracks</span>
            </div>
            <Badge variant="secondary">
              {shot.audioTracks.length}
            </Badge>
          </div>

          {/* Effects Count */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Effects</span>
            </div>
            <Badge variant="secondary">
              {shot.effects.length}
            </Badge>
          </div>

          {/* Text Layers Count */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Text Layers</span>
            </div>
            <Badge variant="secondary">
              {shot.textLayers.length}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Additional Information */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Additional Information</h3>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Shot ID:</span>
            <span className="font-mono text-xs">{shot.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Position:</span>
            <span>{shot.position + 1}</span>
          </div>
          {shot.transitionOut && (
            <div className="flex justify-between">
              <span>Transition:</span>
              <span className="capitalize">{shot.transitionOut.type}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Project Settings
// ============================================================================

interface ProjectSettingsProps {
  project: Project | null;
}

function ProjectSettings({ project }: ProjectSettingsProps) {
  const updateProject = useStore((state) => state.updateProject);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <SettingsIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No Project Loaded</h3>
        <p className="text-sm text-muted-foreground">
          Create or open a project to view settings
        </p>
      </div>
    );
  }

  const handleCapabilityToggle = (
    capability: keyof typeof project.capabilities,
    value: boolean
  ) => {
    if (!project) return;
    updateProject({
      capabilities: {
        ...project.capabilities,
        [capability]: value,
      },
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
      case 'passed':
        return <CheckCircle2Icon className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <PendingIcon className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
      case 'passed':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'failed':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'pending':
      default:
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Information */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Project Name</Label>
          <div className="mt-1.5 p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{project.project_name}</p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Schema Version</Label>
          <div className="mt-1.5 p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-mono">{project.schema_version}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Capabilities */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Capabilities</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="grid-generation" className="text-sm font-medium cursor-pointer">
                Grid Generation
              </Label>
              <p className="text-xs text-muted-foreground">
                Generate master coherence sheets
              </p>
            </div>
            <Switch
              id="grid-generation"
              checked={project.capabilities.grid_generation}
              onCheckedChange={(checked: boolean) =>
                handleCapabilityToggle('grid_generation', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="promotion-engine" className="text-sm font-medium cursor-pointer">
                Promotion Engine
              </Label>
              <p className="text-xs text-muted-foreground">
                Promote panels to full shots
              </p>
            </div>
            <Switch
              id="promotion-engine"
              checked={project.capabilities.promotion_engine}
              onCheckedChange={(checked: boolean) =>
                handleCapabilityToggle('promotion_engine', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="qa-engine" className="text-sm font-medium cursor-pointer">
                QA Engine
              </Label>
              <p className="text-xs text-muted-foreground">
                Quality analysis and scoring
              </p>
            </div>
            <Switch
              id="qa-engine"
              checked={project.capabilities.qa_engine}
              onCheckedChange={(checked: boolean) =>
                handleCapabilityToggle('qa_engine', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="autofix-engine" className="text-sm font-medium cursor-pointer">
                Autofix Engine
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatic quality correction
              </p>
            </div>
            <Switch
              id="autofix-engine"
              checked={project.capabilities.autofix_engine}
              onCheckedChange={(checked: boolean) =>
                handleCapabilityToggle('autofix_engine', checked)
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Generation Status */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Generation Status</h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {getStatusIcon(project.generation_status.grid)}
              <span className="text-sm">Grid Generation</span>
            </div>
            <Badge
              variant="secondary"
              className={getStatusColor(project.generation_status.grid)}
            >
              {project.generation_status.grid}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {getStatusIcon(project.generation_status.promotion)}
              <span className="text-sm">Promotion</span>
            </div>
            <Badge
              variant="secondary"
              className={getStatusColor(project.generation_status.promotion)}
            >
              {project.generation_status.promotion}
            </Badge>
          </div>
        </div>
      </div>

      {/* Project Metadata */}
      {project.metadata && Object.keys(project.metadata).length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Metadata</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {Object.entries(project.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="font-mono text-xs">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
