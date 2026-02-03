/**
 * DownloadProgressExample Component
 * 
 * Example demonstrating the usage of download progress tracking components.
 * Shows how to integrate DownloadStatusDisplay, MultiDownloadProgress, and DownloadNotifications.
 */

import React, { useState, useEffect } from 'react';
import { DownloadStatusDisplay, DownloadProgress } from './DownloadStatusDisplay';
import { MultiDownloadProgress } from './MultiDownloadProgress';
import { DownloadNotifications, useDownloadNotifications } from './DownloadNotifications';

/**
 * Example component showing download progress tracking
 */
export const DownloadProgressExample: React.FC = () => {
  const [downloads, setDownloads] = useState<DownloadProgress[]>([
    {
      modelName: 'FLUX Dev (11.9 GB)',
      totalBytes: 11900000000,
      downloadedBytes: 5950000000,
      speedMbps: 12.5,
      etaSeconds: 480,
      status: 'downloading',
    },
    {
      modelName: 'T5XXL (9.8 GB)',
      totalBytes: 9800000000,
      downloadedBytes: 9800000000,
      speedMbps: 0,
      etaSeconds: 0,
      status: 'completed',
    },
    {
      modelName: 'CLIP (246 MB)',
      totalBytes: 246000000,
      downloadedBytes: 123000000,
      speedMbps: 8.3,
      etaSeconds: 15,
      status: 'paused',
    },
  ]);

  // Simulate download progress
  useEffect(() => {
    const interval = setInterval(() => {
      setDownloads((prev) =>
        prev.map((download) => {
          if (download.status === 'downloading') {
            const newDownloaded = Math.min(
              download.downloadedBytes + download.speedMbps * 1024 * 1024,
              download.totalBytes
            );
            const remaining = download.totalBytes - newDownloaded;
            const newEta = remaining / (download.speedMbps * 1024 * 1024);

            return {
              ...download,
              downloadedBytes: newDownloaded,
              etaSeconds: newEta,
              status: newDownloaded >= download.totalBytes ? 'completed' : 'downloading',
            };
          }
          return download;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Use download notifications hook
  useDownloadNotifications(downloads, handleRetry);

  const handlePause = (modelName: string) => {
    setDownloads((prev) =>
      prev.map((download) =>
        download.modelName === modelName
          ? { ...download, status: 'paused' as const }
          : download
      )
    );
  };

  const handleResume = (modelName: string) => {
    setDownloads((prev) =>
      prev.map((download) =>
        download.modelName === modelName
          ? { ...download, status: 'downloading' as const }
          : download
      )
    );
  };

  const handleCancel = (modelName: string) => {
    setDownloads((prev) => prev.filter((download) => download.modelName !== modelName));
  };

  function handleRetry(modelName: string) {
    setDownloads((prev) =>
      prev.map((download) =>
        download.modelName === modelName
          ? {
              ...download,
              status: 'downloading' as const,
              downloadedBytes: 0,
              errorMessage: undefined,
            }
          : download
      )
    );
  }

  const handleClearCompleted = () => {
    setDownloads((prev) => prev.filter((download) => download.status !== 'completed'));
  };

  const handleAddDownload = () => {
    const newDownload: DownloadProgress = {
      modelName: `VAE (${Math.floor(Math.random() * 1000)} MB)`,
      totalBytes: Math.floor(Math.random() * 1000000000) + 100000000,
      downloadedBytes: 0,
      speedMbps: Math.random() * 15 + 5,
      etaSeconds: Math.floor(Math.random() * 600) + 60,
      status: 'downloading',
    };
    setDownloads((prev) => [...prev, newDownload]);
  };

  const handleSimulateError = () => {
    if (downloads.length > 0) {
      const randomIndex = Math.floor(Math.random() * downloads.length);
      setDownloads((prev) =>
        prev.map((download, index) =>
          index === randomIndex
            ? {
                ...download,
                status: 'failed' as const,
                errorMessage: 'Network connection lost',
              }
            : download
        )
      );
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Download Progress Tracking Example</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={handleAddDownload}>Add Download</button>
        <button onClick={handleSimulateError}>Simulate Error</button>
      </div>

      {/* Multi-download progress summary */}
      <MultiDownloadProgress
        downloads={downloads}
        onClearCompleted={handleClearCompleted}
      />

      {/* Individual download items */}
      <DownloadStatusDisplay
        activeDownloads={downloads}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
        onRetry={handleRetry}
      />

      {/* Download notifications (invisible component) */}
      <DownloadNotifications downloads={downloads} onRetry={handleRetry} />

      {/* Debug info */}
      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
        <h4>Debug Info</h4>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(downloads, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DownloadProgressExample;
