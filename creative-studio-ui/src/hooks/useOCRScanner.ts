/**
 * useOCRScanner Hook
 * 
 * A custom hook for managing OCR scanning functionality in components.
 * Provides state management, scanning functions, and dialog controls.
 * 
 * Inspired by CapCut's text scanning feature for easy text editing.
 */

import { useState, useCallback } from 'react';
import { 
  ocrService, 
  type TextBlock, 
  type OCRResult, 
  type OCRProgress, 
  type OCRLanguage 
} from '@/services/ocrService';

// ============================================================================
// Types
// ============================================================================

export interface UseOCRScannerOptions {
  /** Default language for OCR */
  defaultLanguage?: OCRLanguage;
  /** Callback when text is extracted */
  onTextExtracted?: (text: string, blocks: TextBlock[]) => void;
  /** Callback when text is edited */
  onTextEdited?: (blocks: TextBlock[]) => void;
  /** Callback on scan error */
  onError?: (error: Error) => void;
}

export interface UseOCRScannerReturn {
  /** OCR result data */
  result: OCRResult | null;
  /** All extracted text */
  text: string;
  /** Text blocks with bounding boxes */
  blocks: TextBlock[];
  /** Whether a scan is in progress */
  isScanning: boolean;
  /** Scan progress info */
  progress: OCRProgress;
  /** Current selected language */
  language: OCRLanguage;
  /** Whether the dialog is open */
  isDialogOpen: boolean;
  /** Currently selected image source */
  imageSource: string | HTMLImageElement | HTMLCanvasElement | Blob | File | null;
  /** Error message if scan failed */
  error: string | null;
  
  /** Set OCR language */
  setLanguage: (language: OCRLanguage) => void;
  /** Open the scanner dialog with an image */
  openScanner: (image: string | HTMLImageElement | HTMLCanvasElement | Blob | File) => void;
  /** Close the scanner dialog */
  closeScanner: () => void;
  /** Perform OCR scan on the current image */
  scan: () => Promise<void>;
  /** Update text blocks after editing */
  updateBlocks: (blocks: TextBlock[]) => void;
  /** Reset scanner state */
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useOCRScanner(options: UseOCRScannerOptions = {}): UseOCRScannerReturn {
  const {
    defaultLanguage = 'eng',
    onTextExtracted,
    onTextEdited,
    onError,
  } = options;

  // State
  const [result, setResult] = useState<OCRResult | null>(null);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<OCRProgress>({ progress: 0, status: '' });
  const [language, setLanguage] = useState<OCRLanguage>(defaultLanguage);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageSource, setImageSource] = useState<string | HTMLImageElement | HTMLCanvasElement | Blob | File | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Open scanner dialog with an image
   */
  const openScanner = useCallback((image: string | HTMLImageElement | HTMLCanvasElement | Blob | File) => {
    setImageSource(image);
    setIsDialogOpen(true);
    setError(null);
  }, []);

  /**
   * Close scanner dialog
   */
  const closeScanner = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  /**
   * Perform OCR scan
   */
  const scan = useCallback(async () => {
    if (!imageSource) {
      setError('No image source provided');
      return;
    }

    setIsScanning(true);
    setError(null);
    setProgress({ progress: 0, status: 'Initializing...' });

    try {
      const ocrResult = await ocrService.recognizeText(imageSource, {
        language,
        onProgress: setProgress,
      });

      setResult(ocrResult);
      setBlocks(ocrResult.blocks);
      setProgress({ progress: 100, status: 'Complete!' });

      // Notify callback
      onTextExtracted?.(ocrResult.text, ocrResult.blocks);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR scan failed';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsScanning(false);
    }
  }, [imageSource, language, onTextExtracted, onError]);

  /**
   * Update text blocks after editing
   */
  const updateBlocks = useCallback((newBlocks: TextBlock[]) => {
    setBlocks(newBlocks);
    onTextEdited?.(newBlocks);
  }, [onTextEdited]);

  /**
   * Reset scanner state
   */
  const reset = useCallback(() => {
    setResult(null);
    setBlocks([]);
    setIsScanning(false);
    setProgress({ progress: 0, status: '' });
    setError(null);
    setImageSource(null);
  }, []);

  return {
    result,
    text: result?.text || '',
    blocks,
    isScanning,
    progress,
    language,
    isDialogOpen,
    imageSource,
    error,
    
    setLanguage,
    openScanner,
    closeScanner,
    scan,
    updateBlocks,
    reset,
  };
}

export default useOCRScanner;