/**
 * OCR Text Scanner Module
 * 
 * Provides components and hooks for scanning and editing text from images.
 * Inspired by CapCut's text scanning feature.
 */

export { 
  OCRTextScannerDialog,
  default as OCRTextScannerDialogDefault
} from './OCRTextScannerDialog';

export type { OCRTextScannerDialogProps } from './OCRTextScannerDialog';

// Re-export types from ocrService
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