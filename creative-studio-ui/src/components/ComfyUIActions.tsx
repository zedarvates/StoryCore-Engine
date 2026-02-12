/**
 * ComfyUI Actions Component
 *
 * Provides action buttons for ComfyUI operations in the Canvas Area
 * - Generate images/videos from text prompts
 * - Upload media for processing
 * - Quick access to common workflows
 */

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Wand2,
  Upload,
  Image as ImageIcon,
  Video,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface ComfyUIActionsProps {
  className?: string;
  onWorkflowExecute?: (workflowType: string, params: unknown) => void;
  onMediaUpload?: (filePath: string) => void;
}

export const ComfyUIActions: React.FC<ComfyUIActionsProps> = ({
  className = '',
  onWorkflowExecute,
  onMediaUpload,
}) => {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingType, setExecutingType] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    setIsExecuting(true);
    setExecutingType('image');

    try {
      // Open prompt dialog or use default prompt
      const prompt = "A beautiful landscape with mountains and a lake, cinematic lighting, photorealistic";

      if (onWorkflowExecute) {
        await onWorkflowExecute('text-to-image', {
          prompt,
          width: 1024,
          height: 1024,
          steps: 25,
          cfg_scale: 7.5,
        });
      }

      toast({
        title: 'Image Generation Started',
        description: 'Generating image from text prompt...',
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to start image generation',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
      setExecutingType(null);
    }
  };

  const handleGenerateVideo = async () => {
    setIsExecuting(true);
    setExecutingType('video');

    try {
      // Open prompt dialog or use default prompt
      const prompt = "A cinematic scene of a forest in autumn, camera slowly moving through the trees";

      if (onWorkflowExecute) {
        await onWorkflowExecute('text-to-video', {
          prompt,
          width: 720,
          height: 480,
          frames: 121,
          fps: 24,
        });
      }

      toast({
        title: 'Video Generation Started',
        description: 'Generating video from text prompt...',
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to start video generation',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
      setExecutingType(null);
    }
  };

  const handleUploadMedia = async () => {
    // Create file input for media upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = false;

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        if (onMediaUpload) {
          await onMediaUpload(file.path);
        }

        toast({
          title: 'Media Uploaded',
          description: `${file.name} uploaded successfully`,
        });
      } catch (error) {
        toast({
          title: 'Upload Failed',
          description: 'Failed to upload media file',
          variant: 'destructive',
        });
      }
    };

    input.click();
  };

  const handleQuickWorkflow = async (workflowType: string) => {
    setIsExecuting(true);
    setExecutingType(workflowType);

    try {
      const workflows = {
        'anime-style': {
          prompt: "Anime character in fantasy setting, detailed, vibrant colors, studio ghibli style",
          width: 1024,
          height: 1536,
          steps: 30,
        },
        'realistic-portrait': {
          prompt: "Professional portrait photography, sharp focus, natural lighting, photorealistic",
          width: 1024,
          height: 1024,
          steps: 25,
        },
        'abstract-art': {
          prompt: "Abstract digital art, vibrant colors, geometric patterns, modern style",
          width: 1024,
          height: 1024,
          steps: 20,
        },
      };

      const params = workflows[workflowType as keyof typeof workflows];
      if (!params) return;

      if (onWorkflowExecute) {
        await onWorkflowExecute('text-to-image', params);
      }

      toast({
        title: 'Workflow Started',
        description: `${workflowType} generation in progress...`,
      });
    } catch (error) {
      toast({
        title: 'Workflow Failed',
        description: `Failed to start ${workflowType} workflow`,
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
      setExecutingType(null);
    }
  };

  return (
    <div className={`flex items-center gap-2 p-2 ${className}`}>
      {/* Primary Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleGenerateImage}
          disabled={isExecuting}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Generate Image from Text"
        >
          {isExecuting && executingType === 'image' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">Generate Image</span>
        </button>

        <button
          onClick={handleGenerateVideo}
          disabled={isExecuting}
          className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Generate Video from Text"
        >
          {isExecuting && executingType === 'video' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Video className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">Generate Video</span>
        </button>

        <button
          onClick={handleUploadMedia}
          disabled={isExecuting}
          className="flex items-center gap-2 px-3 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Upload Media for Processing"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Upload Media</span>
        </button>
      </div>

      {/* Quick Workflows */}
      <div className="flex items-center gap-1 ml-4 pl-4 border-l border-border">
        <span className="text-xs text-muted-foreground mr-2">Quick:</span>

        <button
          onClick={() => handleQuickWorkflow('anime-style')}
          disabled={isExecuting}
          className="flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground rounded hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Generate Anime-style Image"
        >
          {isExecuting && executingType === 'anime-style' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          <span className="text-xs">Anime</span>
        </button>

        <button
          onClick={() => handleQuickWorkflow('realistic-portrait')}
          disabled={isExecuting}
          className="flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground rounded hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Generate Realistic Portrait"
        >
          {isExecuting && executingType === 'realistic-portrait' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Wand2 className="w-3 h-3" />
          )}
          <span className="text-xs">Portrait</span>
        </button>

        <button
          onClick={() => handleQuickWorkflow('abstract-art')}
          disabled={isExecuting}
          className="flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground rounded hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Generate Abstract Art"
        >
          {isExecuting && executingType === 'abstract-art' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          <span className="text-xs">Abstract</span>
        </button>
      </div>
    </div>
  );
};

