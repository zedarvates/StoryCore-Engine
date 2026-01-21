/**
 * AssetDropZone Component
 * Provides drag-and-drop functionality for asset import
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { useState, useCallback, DragEvent, ReactNode } from 'react';
import { AssetService } from '@/services/asset/AssetService';
import type { ImportResult } from '@/types/asset';
import { useToast } from '../../hooks/use-toast';
import { UploadCloudIcon } from 'lucide-react';

export interface AssetDropZoneProps {
  projectPath: string;
  onDrop?: (files: File[]) => void;
  onImportComplete?: (results: ImportResult[]) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function AssetDropZone({
  projectPath,
  onDrop,
  onImportComplete,
  children,
  className = '',
  disabled = false,
}: AssetDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const assetService = new AssetService();

  // Supported file extensions
  const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.mp3', '.wav', '.mp4', '.mov'];

  /**
   * Validates if files are droppable (supported types)
   */
  const validateFiles = useCallback((files: File[]): { valid: File[]; invalid: File[] } => {
    const valid: File[] = [];
    const invalid: File[] = [];

    files.forEach((file) => {
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(extension)) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    });

    return { valid, invalid };
  }, []);

  /**
   * Handles drag enter event
   * Requirements: 10.1
   */
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    // Check if dragged items contain files
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, [disabled]);

  /**
   * Handles drag over event
   * Requirements: 10.1, 10.4
   */
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    // Set drop effect to copy
    e.dataTransfer.dropEffect = 'copy';
  }, [disabled]);

  /**
   * Handles drag leave event
   */
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set isDragOver to false if we're leaving the drop zone entirely
    // (not just moving between child elements)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      setIsDragOver(false);
    }
  }, []);

  /**
   * Handles drop event
   * Requirements: 10.2, 10.3
   */
  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    // Get dropped files
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    // Validate files
    const { valid, invalid } = validateFiles(droppedFiles);

    // Show warning for invalid files
    if (invalid.length > 0) {
      toast({
        title: 'Unsupported Files',
        description: `${invalid.length} file${invalid.length > 1 ? 's' : ''} skipped. Supported formats: PNG, JPG, JPEG, MP3, WAV, MP4, MOV`,
        variant: 'destructive',
      });
    }

    // If no valid files, return
    if (valid.length === 0) return;

    // Notify parent about dropped files
    if (onDrop) {
      onDrop(valid);
    }

    // Import files using AssetService
    setIsImporting(true);
    try {
      const results = await assetService.importAssets(
        valid,
        projectPath,
        (current, total, filename) => {
          // Progress tracking could be shown in a toast or progress indicator
          ;
        }
      );

      // Count successes and failures
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      // Show success notification
      if (successCount > 0) {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${successCount} asset${successCount > 1 ? 's' : ''}`,
          variant: 'default',
        });
      }

      // Show error notification for failures
      if (failureCount > 0) {
        toast({
          title: 'Import Errors',
          description: `Failed to import ${failureCount} file${failureCount > 1 ? 's' : ''}`,
          variant: 'destructive',
        });
      }

      // Notify parent component
      if (onImportComplete) {
        onImportComplete(results);
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  }, [disabled, projectPath, validateFiles, onDrop, onImportComplete, assetService, toast]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative ${className}`}
      style={{ cursor: disabled ? 'not-allowed' : 'default' }}
    >
      {/* Visual feedback overlay when dragging over */}
      {isDragOver && !disabled && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg">
          <div className="flex flex-col items-center gap-2 text-primary">
            <UploadCloudIcon className="h-12 w-12" />
            <p className="text-lg font-semibold">Drop files to import</p>
            <p className="text-sm text-muted-foreground">
              Supported: PNG, JPG, JPEG, MP3, WAV, MP4, MOV
            </p>
          </div>
        </div>
      )}

      {/* Loading overlay when importing */}
      {isImporting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Importing assets...</p>
          </div>
        </div>
      )}

      {/* Children content */}
      {children}
    </div>
  );
}
