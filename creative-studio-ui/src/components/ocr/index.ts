/**
 * OCR Components Module
 * 
 * Provides components for OCR text scanning in images.
 * Inspired by CapCut's text scanning feature.
 */

export { OCRButton, QuickScanButton, default as OCRButtonDefault } from './OCRButton';
export type { OCRButtonProps, QuickScanButtonProps } from './OCRButton';

// Re-export types from the scanner dialog
export {
  type TextBlock,
  type TextLine,
  type TextWord,
  type OCRResult,
  type OCRProgress,
  type OCRLanguage,
  type LanguageOption,
  SUPPORTED_LANGUAGES,
} from '@/services/ocrService';

// Re-export the dialog
export { OCRTextScannerDialog } from '@/components/modals/OCRTextScanner';
export type { OCRTextScannerDialogProps } from '@/components/modals/OCRTextScanner';

// Re-export the hook
export { useOCRScanner } from '@/hooks/useOCRScanner';
export type { UseOCRScannerOptions, UseOCRScannerReturn } from '@/hooks/useOCRScanner';