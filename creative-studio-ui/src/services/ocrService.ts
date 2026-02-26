/**
 * OCR Service
 * 
 * Handles text recognition from images using Tesseract.js
 * Provides functionality to scan, extract, and manage text from images
 * with support for multiple languages and confidence filtering.
 * 
 * Inspired by CapCut's text scanning feature for easy text editing.
 */

import { createWorker, Worker, recognize } from 'tesseract.js';

// ============================================================================
// Types
// ============================================================================

export interface TextBlock {
  id: string;
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  lines: TextLine[];
  fontSize?: number;
  fontFamily?: string;
}

export interface TextLine {
  id: string;
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  words: TextWord[];
}

export interface TextWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OCRResult {
  text: string;
  blocks: TextBlock[];
  confidence: number;
  imageWidth: number;
  imageHeight: number;
  processingTime: number;
}

export interface OCRProgress {
  progress: number;
  status: string;
}

export type OCRLanguage = 
  | 'eng' 
  | 'fra' 
  | 'spa' 
  | 'deu' 
  | 'ita' 
  | 'por' 
  | 'chi_sim' 
  | 'chi_tra' 
  | 'jpn' 
  | 'kor' 
  | 'ara' 
  | 'rus';

export interface LanguageOption {
  code: OCRLanguage;
  name: string;
  nativeName: string;
}

// ============================================================================
// Constants
// ============================================================================

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'eng', name: 'English', nativeName: 'English' },
  { code: 'fra', name: 'French', nativeName: 'Français' },
  { code: 'spa', name: 'Spanish', nativeName: 'Español' },
  { code: 'deu', name: 'German', nativeName: 'Deutsch' },
  { code: 'ita', name: 'Italian', nativeName: 'Italiano' },
  { code: 'por', name: 'Portuguese', nativeName: 'Português' },
  { code: 'chi_sim', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'chi_tra', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'jpn', name: 'Japanese', nativeName: '日本語' },
  { code: 'kor', name: 'Korean', nativeName: '한국어' },
  { code: 'ara', name: 'Arabic', nativeName: 'العربية' },
  { code: 'rus', name: 'Russian', nativeName: 'Русский' },
];

// ============================================================================
// Internal Types for Tesseract.js
// ============================================================================

interface TesseractWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface TesseractLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words?: TesseractWord[];
}

interface TesseractBlock {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  lines?: TesseractLine[];
}

interface TesseractData {
  text: string;
  confidence: number;
  blocks?: TesseractBlock[];
}

interface TesseractResult {
  data: TesseractData;
}

// ============================================================================
// OCR Service Class
// ============================================================================

class OCRService {
  private workers: Map<string, Worker> = new Map();
  private isInitialized = false;

  /**
   * Initialize a Tesseract worker for a specific language
   */
  private async getWorker(language: OCRLanguage = 'eng'): Promise<Worker> {
    const workerKey = language;
    
    if (this.workers.has(workerKey)) {
      return this.workers.get(workerKey)!;
    }

    const worker = await createWorker(language, 1, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') {
          console.log('[OCR] Loading Tesseract core...');
        } else if (m.status === 'initializing tesseract') {
          console.log('[OCR] Initializing Tesseract...');
        } else if (m.status === 'loading language traineddata') {
          console.log(`[OCR] Loading ${language} language data...`);
        } else if (m.status === 'initializing api') {
          console.log('[OCR] Initializing API...');
        }
      },
    });

    this.workers.set(workerKey, worker);
    return worker;
  }

  /**
   * Recognize text from an image
   */
  async recognizeText(
    imageSource: string | HTMLImageElement | HTMLCanvasElement | Blob | File,
    options: {
      language?: OCRLanguage;
      onProgress?: (progress: OCRProgress) => void;
    } = {}
  ): Promise<OCRResult> {
    const { language = 'eng', onProgress } = options;
    const startTime = Date.now();

    try {
      onProgress?.({ progress: 0, status: 'Initializing OCR engine...' });
      
      const worker = await this.getWorker(language);
      
      onProgress?.({ progress: 10, status: 'Processing image...' });

      const result: TesseractResult = await worker.recognize(imageSource);

      onProgress?.({ progress: 90, status: 'Extracting text blocks...' });

      const ocrResult = this.parseOCRResult(result, startTime);

      onProgress?.({ progress: 100, status: 'Complete!' });

      return ocrResult;
    } catch (error) {
      console.error('[OCR] Recognition failed:', error);
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Tesseract result into structured format
   */
  private parseOCRResult(result: TesseractResult, startTime: number): OCRResult {
    const blocks: TextBlock[] = [];
    let globalConfidence = 0;
    let confidenceCount = 0;

    // Process data from Tesseract
    const data = result.data;
    
    if (data.blocks) {
      data.blocks.forEach((block, blockIndex) => {
        if (!block.text?.trim()) return;

        const lines: TextLine[] = [];
        
        if (block.lines) {
          block.lines.forEach((line, lineIndex) => {
            if (!line.text?.trim()) return;

            const words: TextWord[] = [];
            
            if (line.words) {
              line.words.forEach((word) => {
                if (!word.text?.trim()) return;

                words.push({
                  text: word.text,
                  confidence: word.confidence,
                  bbox: {
                    x0: word.bbox.x0,
                    y0: word.bbox.y0,
                    x1: word.bbox.x1,
                    y1: word.bbox.y1,
                  },
                });
              });
            }

            lines.push({
              id: `line-${blockIndex}-${lineIndex}`,
              text: line.text.trim(),
              confidence: line.confidence,
              bbox: {
                x0: line.bbox.x0,
                y0: line.bbox.y0,
                x1: line.bbox.x1,
                y1: line.bbox.y1,
              },
              words,
            });

            globalConfidence += line.confidence;
            confidenceCount++;
          });
        }

        // Estimate font size from bbox height
        const blockHeight = block.bbox.y1 - block.bbox.y0;
        const lineCount = lines.length || 1;
        const estimatedFontSize = Math.round(blockHeight / lineCount);

        blocks.push({
          id: `block-${blockIndex}`,
          text: block.text.trim(),
          confidence: block.confidence,
          bbox: {
            x0: block.bbox.x0,
            y0: block.bbox.y0,
            x1: block.bbox.x1,
            y1: block.bbox.y1,
          },
          lines,
          fontSize: estimatedFontSize,
        });
      });
    }

    return {
      text: data.text || '',
      blocks,
      confidence: confidenceCount > 0 ? globalConfidence / confidenceCount : 0,
      imageWidth: 0,
      imageHeight: 0,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Quick scan for fast text detection
   * Uses lower accuracy but faster processing
   */
  async quickScan(
    imageSource: string | HTMLImageElement | HTMLCanvasElement | Blob | File,
    options: {
      language?: OCRLanguage;
      onProgress?: (progress: OCRProgress) => void;
    } = {}
  ): Promise<OCRResult> {
    const { language = 'eng', onProgress } = options;
    const startTime = Date.now();

    try {
      onProgress?.({ progress: 0, status: 'Quick scan initializing...' });

      // Use Tesseract's recognize function directly
      const result: TesseractResult = await recognize(imageSource, language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            onProgress?.({ progress: Math.round(m.progress * 100), status: 'Scanning...' });
          }
        },
      });

      const ocrResult = this.parseOCRResult(result, startTime);

      onProgress?.({ progress: 100, status: 'Quick scan complete!' });

      return ocrResult;
    } catch (error) {
      console.error('[OCR] Quick scan failed:', error);
      throw new Error(`Quick scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from a specific region of an image
   */
  async recognizeRegion(
    imageSource: string | HTMLImageElement | HTMLCanvasElement | Blob | File,
    region: { x: number; y: number; width: number; height: number },
    options: {
      language?: OCRLanguage;
      onProgress?: (progress: OCRProgress) => void;
    } = {}
  ): Promise<OCRResult> {
    // Create a canvas to crop the region
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = region.width;
    canvas.height = region.height;

    // Load image if needed
    let img: HTMLImageElement | HTMLCanvasElement;
    
    if (typeof imageSource === 'string') {
      img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        (img as HTMLImageElement).src = imageSource;
      });
    } else if (imageSource instanceof HTMLImageElement) {
      img = imageSource;
    } else if (imageSource instanceof HTMLCanvasElement) {
      img = imageSource;
    } else {
      // Blob or File
      const bitmap = await createImageBitmap(imageSource);
      img = document.createElement('canvas');
      img.width = bitmap.width;
      img.height = bitmap.height;
      const tempCtx = img.getContext('2d')!;
      tempCtx.drawImage(bitmap, 0, 0);
    }

    // Draw cropped region
    ctx.drawImage(
      img,
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height
    );

    // Recognize text from the cropped region
    return this.recognizeText(canvas, options);
  }

  /**
   * Terminate all workers to free memory
   */
  async terminate(): Promise<void> {
    for (const [key, worker] of this.workers) {
      await worker.terminate();
      this.workers.delete(key);
    }
    this.isInitialized = false;
    console.log('[OCR] All workers terminated');
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(language: string): language is OCRLanguage {
    return SUPPORTED_LANGUAGES.some(l => l.code === language);
  }

  /**
   * Get language info by code
   */
  getLanguageInfo(code: OCRLanguage): LanguageOption | undefined {
    return SUPPORTED_LANGUAGES.find(l => l.code === code);
  }

  /**
   * Filter blocks by confidence threshold
   */
  filterByConfidence(blocks: TextBlock[], minConfidence: number = 70): TextBlock[] {
    return blocks
      .map(block => ({
        ...block,
        lines: block.lines.filter(line => line.confidence >= minConfidence),
      }))
      .filter(block => block.lines.length > 0 && block.confidence >= minConfidence);
  }

  /**
   * Merge close blocks into single blocks
   */
  mergeNearbyBlocks(blocks: TextBlock[], threshold: number = 20): TextBlock[] {
    if (blocks.length === 0) return blocks;

    const sorted = [...blocks].sort((a, b) => a.bbox.y0 - b.bbox.y0);
    const merged: TextBlock[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const verticalGap = next.bbox.y0 - current.bbox.y1;

      if (verticalGap <= threshold) {
        // Merge blocks
        current = {
          ...current,
          text: current.text + '\n' + next.text,
          bbox: {
            x0: Math.min(current.bbox.x0, next.bbox.x0),
            y0: Math.min(current.bbox.y0, next.bbox.y0),
            x1: Math.max(current.bbox.x1, next.bbox.x1),
            y1: Math.max(current.bbox.y1, next.bbox.y1),
          },
          lines: [...current.lines, ...next.lines],
          confidence: (current.confidence + next.confidence) / 2,
        };
      } else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }
}

// Export singleton instance
export const ocrService = new OCRService();

// Default export
export default ocrService;