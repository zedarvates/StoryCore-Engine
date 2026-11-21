/**
 * AssetImportButton Component
 * Provides a button to trigger file picker for asset import
 * Requirements: 9.1, 9.2
 */

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadIcon, CheckCircle2Icon, XCircleIcon } from 'lucide-react';
import { AssetService } from '@/services/assets/AssetService';
import type { ImportResult } from '@/types/asset';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export interface AssetImportButtonProps {
  projectPath: string;
  onImportComplete?: (results: ImportResult[]) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function AssetImportButton({
  projectPath,
  onImportComplete,
  variant = 'default',
  size = 'default',
  className,
}: AssetImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, filename: '' });
  const { toast } = useToast();
  const assetService = new AssetService();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setProgress({ current: 0, total: files.length, filename: '' });

    try {
      // Import assets with progress tracking
      const results = await assetService.importAssets(
        Array.from(files),
        projectPath,
        (current, total, filename) => {
          setProgress({ current, total, filename });
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
        const failedFiles = results
          .filter((r) => !r.success)
          .map((r, i) => `${files[i].name}: ${r.error}`)
          .join('\n');

        toast({
          title: 'Import Errors',
          description: `Failed to import ${failureCount} file${failureCount > 1 ? 's' : ''}:\n${failedFiles}`,
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
      setProgress({ current: 0, total: 0, filename: '' });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={handleButtonClick}
        disabled={isImporting}
        variant={variant}
        size={size}
        className="gap-2"
      >
        {isImporting ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Importing...
          </>
        ) : (
          <>
            <UploadIcon className="h-4 w-4" />
            Import Assets
          </>
        )}
      </Button>

      {/* Progress indicator */}
      {isImporting && progress.total > 0 && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
            <span className="text-muted-foreground truncate max-w-[200px]">
              {progress.filename}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} />
        </div>
      )}

      {/* Hidden file input with type filtering */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.mp3,.wav,.mp4,.mov"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
