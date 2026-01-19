/**
 * File Detection Hook
 * Polls for file presence and validates it
 */

import { useState, useCallback, useRef } from 'react';
import { FileValidationResult } from '../types/installation';
import { FILE_VALIDATION, INSTALLATION_CONFIG } from '../config/installationConfig';
import { useFilePolling } from './useFilePolling';

interface UseFileDetectionOptions {
  downloadZonePath: string;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseFileDetectionReturn {
  fileDetected: boolean;
  fileValid: boolean;
  validationResult: FileValidationResult | null;
  isPolling: boolean;
  refresh: () => Promise<void>;
}

export const useFileDetection = ({
  downloadZonePath,
  pollingInterval = INSTALLATION_CONFIG.pollingIntervalMs,
  enabled = true
}: UseFileDetectionOptions): UseFileDetectionReturn => {
  const [fileDetected, setFileDetected] = useState(false);
  const [fileValid, setFileValid] = useState(false);
  const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkFile = useCallback(async (): Promise<void> => {
    if (!downloadZonePath || !enabled) {
      return;
    }

    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `/api/installation/check-file?path=${encodeURIComponent(downloadZonePath)}`,
        {
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setFileDetected(data.exists);
      setFileValid(data.valid);

      if (data.exists) {
        const result: FileValidationResult = {
          valid: data.valid,
          fileName: data.fileName || '',
          fileSizeBytes: data.fileSize || 0,
          expectedSizeBytes: INSTALLATION_CONFIG.expectedFileSizeBytes,
          sizeMatch: validateFileSize(data.fileSize || 0),
          isZipFile: validateFileExtension(data.fileName || ''),
          isReadable: data.exists,
          errors: data.validationError ? [data.validationError] : []
        };

        setValidationResult(result);
      } else {
        setValidationResult(null);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }

      console.error('File check error:', error);
      setFileDetected(false);
      setFileValid(false);
      setValidationResult(null);
    }
  }, [downloadZonePath, enabled]);

  // Use the file polling hook
  const { isPolling, refresh: _refreshPolling } = useFilePolling({
    onPoll: checkFile,
    interval: pollingInterval,
    enabled: enabled && !!downloadZonePath,
    stopCondition: fileDetected && fileValid
  });

  const refresh = useCallback(async (): Promise<void> => {
    await checkFile();
  }, [checkFile]);

  return {
    fileDetected,
    fileValid,
    validationResult,
    isPolling,
    refresh
  };
};

// Validation helper functions
function validateFileSize(fileSize: number): boolean {
  const expectedSize = INSTALLATION_CONFIG.expectedFileSizeBytes;
  const tolerance = FILE_VALIDATION.sizeTolerance;
  const minSize = expectedSize * (1 - tolerance);
  const maxSize = expectedSize * (1 + tolerance);

  return fileSize >= minSize && fileSize <= maxSize;
}

function validateFileExtension(fileName: string): boolean {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return FILE_VALIDATION.allowedExtensions.includes(extension);
}

export function validateFileName(fileName: string, expectedPattern: string): { valid: boolean; error?: string } {
  if (!fileName) {
    return { valid: false, error: 'File name is empty' };
  }

  // Check if filename matches expected pattern
  if (!FILE_VALIDATION.fileNamePattern.test(fileName)) {
    return {
      valid: false,
      error: `File name does not match expected pattern. Expected: ${expectedPattern}`
    };
  }

  // Check file extension
  if (!validateFileExtension(fileName)) {
    return {
      valid: false,
      error: `Invalid file extension. Expected one of: ${FILE_VALIDATION.allowedExtensions.join(', ')}`
    };
  }

  return { valid: true };
}

export function validateFileSizeWithTolerance(
  fileSize: number,
  expectedSize: number,
  tolerance: number
): { valid: boolean; error?: string } {
  if (fileSize === 0) {
    return { valid: false, error: 'File size is 0 bytes' };
  }

  const minSize = expectedSize * (1 - tolerance);
  const maxSize = expectedSize * (1 + tolerance);

  if (fileSize < minSize) {
    return {
      valid: false,
      error: `File is too small (${formatBytes(fileSize)}). Expected at least ${formatBytes(minSize)}`
    };
  }

  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File is too large (${formatBytes(fileSize)}). Expected at most ${formatBytes(maxSize)}`
    };
  }

  return { valid: true };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
