/**
 * DownloadNotifications Component
 * 
 * Handles download completion and failure notifications with retry options.
 * Integrates with NotificationService for consistent notification display.
 * 
 * Validates: Requirements 7.6, 7.7
 */

import React, { useEffect, useRef } from 'react';
import { notificationService } from '@/services/NotificationService';
import { DownloadProgress } from './DownloadStatusDisplay';

export interface DownloadNotificationsProps {
  downloads: DownloadProgress[];
  onRetry?: (modelName: string) => void;
}

/**
 * Track download status changes and show notifications
 */
export const DownloadNotifications: React.FC<DownloadNotificationsProps> = ({
  downloads,
  onRetry,
}) => {
  // Track previous download states to detect status changes
  const previousStatesRef = useRef<Map<string, DownloadProgress['status']>>(new Map());

  useEffect(() => {
    const previousStates = previousStatesRef.current;

    downloads.forEach((download) => {
      const previousStatus = previousStates.get(download.modelName);
      const currentStatus = download.status;

      // Only show notification if status changed
      if (previousStatus !== currentStatus) {
        // Download completed successfully
        if (currentStatus === 'completed' && previousStatus === 'downloading') {
          notificationService.success(
            'Download Complete',
            `${download.modelName} has been downloaded successfully.`,
            []
          );
        }

        // Download failed
        if (currentStatus === 'failed') {
          const actions = onRetry
            ? [
                {
                  label: 'Retry',
                  action: () => onRetry(download.modelName),
                  primary: true,
                },
              ]
            : undefined;

          notificationService.error(
            'Download Failed',
            `Failed to download ${download.modelName}. ${download.errorMessage || 'Please try again.'}`,
            actions
          );
        }

        // Download paused
        if (currentStatus === 'paused' && previousStatus === 'downloading') {
          notificationService.info(
            'Download Paused',
            `${download.modelName} download has been paused.`,
            []
          );
        }

        // Download resumed
        if (currentStatus === 'downloading' && previousStatus === 'paused') {
          notificationService.info(
            'Download Resumed',
            `${download.modelName} download has been resumed.`,
            []
          );
        }

        // Update previous state
        previousStates.set(download.modelName, currentStatus);
      }
    });

    // Clean up states for downloads that no longer exist
    const currentModelNames = new Set(downloads.map((d) => d.modelName));
    Array.from(previousStates.keys()).forEach((modelName) => {
      if (!currentModelNames.has(modelName)) {
        previousStates.delete(modelName);
      }
    });
  }, [downloads, onRetry]);

  // This component doesn't render anything - it only manages notifications
  return null;
};

/**
 * Hook for managing download notifications
 */
export function useDownloadNotifications(
  downloads: DownloadProgress[],
  onRetry?: (modelName: string) => void
) {
  const previousStatesRef = useRef<Map<string, DownloadProgress['status']>>(new Map());

  useEffect(() => {
    const previousStates = previousStatesRef.current;

    downloads.forEach((download) => {
      const previousStatus = previousStates.get(download.modelName);
      const currentStatus = download.status;

      // Only show notification if status changed
      if (previousStatus !== currentStatus) {
        // Download completed successfully
        if (currentStatus === 'completed' && previousStatus === 'downloading') {
          notificationService.success(
            'Download Complete',
            `${download.modelName} has been downloaded successfully.`
          );
        }

        // Download failed
        if (currentStatus === 'failed') {
          const actions = onRetry
            ? [
                {
                  label: 'Retry',
                  action: () => onRetry(download.modelName),
                  primary: true,
                },
              ]
            : undefined;

          notificationService.error(
            'Download Failed',
            `Failed to download ${download.modelName}. ${download.errorMessage || 'Please try again.'}`,
            actions
          );
        }

        // Download paused
        if (currentStatus === 'paused' && previousStatus === 'downloading') {
          notificationService.info(
            'Download Paused',
            `${download.modelName} download has been paused.`
          );
        }

        // Download resumed
        if (currentStatus === 'downloading' && previousStatus === 'paused') {
          notificationService.info(
            'Download Resumed',
            `${download.modelName} download has been resumed.`
          );
        }

        // Update previous state
        previousStates.set(download.modelName, currentStatus);
      }
    });

    // Clean up states for downloads that no longer exist
    const currentModelNames = new Set(downloads.map((d) => d.modelName));
    Array.from(previousStates.keys()).forEach((modelName) => {
      if (!currentModelNames.has(modelName)) {
        previousStates.delete(modelName);
      }
    });
  }, [downloads, onRetry]);
}

/**
 * Show notification for batch download completion
 */
export function showBatchDownloadComplete(
  totalCount: number,
  successCount: number,
  failedCount: number
): void {
  if (failedCount === 0) {
    notificationService.success(
      'All Downloads Complete',
      `Successfully downloaded ${successCount} model${successCount !== 1 ? 's' : ''}.`
    );
  } else if (successCount === 0) {
    notificationService.error(
      'All Downloads Failed',
      `Failed to download ${failedCount} model${failedCount !== 1 ? 's' : ''}. Please check your connection and try again.`
    );
  } else {
    notificationService.warning(
      'Downloads Partially Complete',
      `Downloaded ${successCount} model${successCount !== 1 ? 's' : ''} successfully, but ${failedCount} failed.`
    );
  }
}

/**
 * Show notification for download start
 */
export function showDownloadStart(modelName: string): void {
  notificationService.info(
    'Download Started',
    `Starting download of ${modelName}...`
  );
}

/**
 * Show notification for download cancelled
 */
export function showDownloadCancelled(modelName: string): void {
  notificationService.warning(
    'Download Cancelled',
    `${modelName} download has been cancelled.`
  );
}

export default DownloadNotifications;
