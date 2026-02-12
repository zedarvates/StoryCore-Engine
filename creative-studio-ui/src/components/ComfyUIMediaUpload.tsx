import React, { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  X,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface ComfyUIMediaUploadProps {
  onFileUploaded?: (file: File, uploadUrl: string) => void;
  acceptedTypes?: string;
  maxFileSize?: number; // in MB
  className?: string;
}

interface UploadState {
  file: File | null;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  uploadUrl?: string;
  error?: string;
}

export function ComfyUIMediaUpload({
  onFileUploaded,
  acceptedTypes = 'image/*,audio/*,video/*',
  maxFileSize = 100, // 100MB default
  className
}: ComfyUIMediaUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    status: 'idle',
    progress: 0,
  });

  const [dragOver, setDragOver] = useState(false);

  // Get file type icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-8 h-8" />;
    if (file.type.startsWith('audio/')) return <Music className="w-8 h-8" />;
    if (file.type.startsWith('video/')) return <Video className="w-8 h-8" />;
    return <FileText className="w-8 h-8" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Validate file
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    const maxSizeBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxFileSize}MB limit (${formatFileSize(file.size)})`,
      };
    }

    // Check file type
    const acceptedTypesArray = acceptedTypes.split(',').map(type => type.trim());
    const isAccepted = acceptedTypesArray.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.slice(0, -1);
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return {
        valid: false,
        error: `File type not supported. Accepted: ${acceptedTypes}`,
      };
    }

    return { valid: true };
  };

  // Upload file to ComfyUI
  const uploadToComfyUI = async (file: File): Promise<string> => {
    // Get ComfyUI server URL from backend config
    const backendConfig = await import('@/services/backendApiService').then(m => m.backendApi.getComfyUIConfig());
    if (!backendConfig) {
      throw new Error('ComfyUI is not configured. Please configure ComfyUI settings first.');
    }

    const serverUrl = backendConfig.serverUrl || 'http://localhost:8000';

    // Build headers with authentication if needed
    const headers: Record<string, string> = {};
    if (backendConfig.authentication?.type === 'basic' && backendConfig.authentication.username) {
      const credentials = btoa(`${backendConfig.authentication.username}:${backendConfig.authentication.password || ''}`);
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (backendConfig.authentication?.type === 'token' && backendConfig.authentication.token) {
      headers['Authorization'] = `Bearer ${backendConfig.authentication.token}`;
    }

    const formData = new FormData();
    formData.append('image', file); // ComfyUI expects 'image' field
    formData.append('type', 'input'); // or 'temp', 'output'
    formData.append('subfolder', 'user_uploads');

    try {
      const response = await fetch(`${serverUrl}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`ComfyUI upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.name) {
        throw new Error('Invalid response from ComfyUI upload endpoint');
      }

      // Return the ComfyUI file reference
      // ComfyUI typically returns: { name: "filename.jpg", subfolder: "user_uploads", type: "input" }
      const uploadUrl = `${serverUrl}/view?filename=${encodeURIComponent(result.name)}&subfolder=${encodeURIComponent(result.subfolder || 'user_uploads')}&type=${encodeURIComponent(result.type || 'input')}`;

      return uploadUrl;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to upload file to ComfyUI');
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateFile(file);

    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setUploadState({
      file,
      status: 'uploading',
      progress: 0,
    });

    try {
      const uploadUrl = await uploadToComfyUI(file);

      setUploadState({
        file,
        status: 'success',
        progress: 100,
        uploadUrl,
      });

      toast({
        title: 'Upload Successful',
        description: `${file.name} uploaded to ComfyUI`,
      });

      onFileUploaded?.(file, uploadUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState({
        file,
        status: 'error',
        progress: 0,
        error: errorMessage,
      });

      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [maxFileSize, acceptedTypes, toast, onFileUploaded]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Handle click to select
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Clear upload
  const clearUpload = () => {
    setUploadState({
      file: null,
      status: 'idle',
      progress: 0,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }
          ${uploadState.status === 'uploading' ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          aria-label="Upload media file for ComfyUI processing"
        />

        {uploadState.status === 'idle' && (
          <div className="space-y-2">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Upload Media for ComfyUI</p>
              <p className="text-xs text-muted-foreground">
                Drag & drop or click to select images, audio, or video files
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max size: {maxFileSize}MB • Types: {acceptedTypes}
              </p>
            </div>
          </div>
        )}

        {uploadState.status === 'uploading' && uploadState.file && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              {getFileIcon(uploadState.file)}
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium">Uploading {uploadState.file.name}</p>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {uploadState.progress}% • {formatFileSize(uploadState.file.size)}
              </p>
            </div>
          </div>
        )}

        {uploadState.status === 'success' && uploadState.file && (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              {getFileIcon(uploadState.file)}
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium">{uploadState.file.name}</p>
              <p className="text-xs text-green-600">Uploaded successfully</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(uploadState.file.size)} • Ready for processing
              </p>
            </div>
          </div>
        )}

        {uploadState.status === 'error' && uploadState.file && (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              {getFileIcon(uploadState.file)}
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium">{uploadState.file.name}</p>
              <p className="text-xs text-red-600">Upload failed</p>
              <p className="text-xs text-muted-foreground">
                {uploadState.error}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Clear Button */}
      {uploadState.file && uploadState.status !== 'uploading' && (
        <div className="flex justify-center">
          <button
            onClick={clearUpload}
            className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      )}
    </div>
  );
}
