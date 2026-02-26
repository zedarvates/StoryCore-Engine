/**
 * OCR Button Component
 * 
 * A button component that triggers the OCR text scanner dialog.
 * Can be integrated into image preview panels and image editing interfaces.
 * 
 * Inspired by CapCut's text scanning feature.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Scan, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  OCRTextScannerDialog,
  type TextBlock,
} from '@/components/modals/OCRTextScanner';

// ============================================================================
// Types
// ============================================================================

export interface OCRButtonProps {
  /** Image source to scan */
  imageSource: string | HTMLImageElement | HTMLCanvasElement | Blob | File | null;
  /** Callback when text is extracted */
  onTextExtracted?: (text: string, blocks: TextBlock[]) => void;
  /** Callback when text is edited */
  onTextEdited?: (blocks: TextBlock[]) => void;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Custom button class */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Custom button label */
  label?: string;
  /** Show icon only (no label) */
  iconOnly?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function OCRButton({
  imageSource,
  onTextExtracted,
  onTextEdited,
  variant = 'outline',
  size = 'sm',
  className,
  disabled = false,
  label = 'Scan Text',
  iconOnly = false,
}: OCRButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    if (imageSource) {
      setIsDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleOpenDialog}
        disabled={disabled || !imageSource}
        title="Scan text from image"
      >
        <Scan className={iconOnly ? 'w-4 h-4' : 'w-4 h-4 mr-2'} />
        {!iconOnly && label}
      </Button>

      <OCRTextScannerDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        imageSource={imageSource}
        onTextExtracted={onTextExtracted}
        onTextEdited={onTextEdited}
      />
    </>
  );
}

// ============================================================================
// Quick Scan Button - Minimal version for inline use
// ============================================================================

export interface QuickScanButtonProps {
  /** Image source to scan */
  imageSource: string | HTMLImageElement | HTMLCanvasElement | Blob | File | null;
  /** Callback when text is extracted */
  onScanComplete?: (text: string) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Custom className */
  className?: string;
}

export function QuickScanButton({
  imageSource,
  onScanComplete,
  disabled = false,
  className,
}: QuickScanButtonProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);

  const handleQuickScan = async () => {
    if (!imageSource) return;

    setIsScanning(true);
    try {
      const { ocrService } = await import('@/services/ocrService');
      const result = await ocrService.quickScan(imageSource);
      
      onScanComplete?.(result.text);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(result.text);
      
      toast({
        title: 'Text Scanned',
        description: `${result.text.length} characters copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to scan image',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={handleQuickScan}
      disabled={disabled || !imageSource || isScanning}
      title="Quick scan text"
    >
      {isScanning ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Scan className="w-4 h-4" />
      )}
    </Button>
  );
}

export default OCRButton;