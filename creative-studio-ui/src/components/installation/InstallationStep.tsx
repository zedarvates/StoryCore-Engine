/**
 * Installation Step Component
 * Executes installation and displays progress
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, AlertTriangle, CheckCircle, XCircle, RotateCcw, Clock } from 'lucide-react';
import { InstallationStepProps } from '../../types/installation';

export const InstallationStep: React.FC<InstallationStepProps> = ({
  canInstall,
  isInstalling,
  progress,
  statusMessage,
  error,
  onInstall,
  onRetry
}) => {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [statusLog, setStatusLog] = useState<Array<{ timestamp: number; message: string }>>([]);
  const startTimeRef = useRef<number | null>(null);
  const lastProgressRef = useRef<number>(0);

  // Track installation start time
  useEffect(() => {
    if (isInstalling && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      lastProgressRef.current = progress;
    } else if (!isInstalling) {
      startTimeRef.current = null;
      lastProgressRef.current = 0;
    }
  }, [isInstalling, progress]);

  // Calculate estimated time remaining
  useEffect(() => {
    if (isInstalling && startTimeRef.current && progress > 0 && progress < 100) {
      const elapsedTime = Date.now() - startTimeRef.current;
      const progressDelta = progress - lastProgressRef.current;
      
      if (progressDelta > 0) {
        const timePerPercent = elapsedTime / progress;
        const remainingProgress = 100 - progress;
        const estimatedMs = timePerPercent * remainingProgress;
        setEstimatedTimeRemaining(Math.ceil(estimatedMs / 1000)); // Convert to seconds
        lastProgressRef.current = progress;
      }
    } else {
      setEstimatedTimeRemaining(null);
    }
  }, [isInstalling, progress]);

  // Update status log
  useEffect(() => {
    if (statusMessage && isInstalling) {
      setStatusLog(prev => {
        const newLog = [...prev, { timestamp: Date.now(), message: statusMessage }];
        // Keep only last 10 messages
        return newLog.slice(-10);
      });
    } else if (!isInstalling && progress === 0) {
      setStatusLog([]);
    }
  }, [statusMessage, isInstalling, progress]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };
  const getTooltipText = (): string => {
    if (isInstalling) {
      return 'Installation in progress...';
    }
    if (!canInstall) {
      return 'Place the ZIP file in the download zone first';
    }
    return 'Click to start installation';
  };

  const getButtonContent = () => {
    if (isInstalling) {
      return (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Installing...
        </>
      );
    }
    if (error) {
      return (
        <>
          <XCircle className="w-5 h-5" />
          Installation Failed
        </>
      );
    }
    if (progress === 100) {
      return (
        <>
          <CheckCircle className="w-5 h-5" />
          Installation Complete
        </>
      );
    }
    return (
      <>
        <Play className="w-5 h-5" />
        Start Installation
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          {isInstalling ? (
            <Loader2 className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" />
          ) : error ? (
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          ) : progress === 100 ? (
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          ) : (
            <Play className="w-8 h-8 text-green-600 dark:text-green-400" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isInstalling ? 'Installing ComfyUI' : error ? 'Installation Error' : progress === 100 ? 'Installation Complete' : 'Ready to Install'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {isInstalling
            ? 'Please wait while we set up ComfyUI...'
            : error
            ? 'An error occurred during installation'
            : progress === 100
            ? 'ComfyUI has been successfully installed'
            : 'Click the button below to begin installation'}
        </p>
      </div>

      {/* Installation Button */}
      {!isInstalling && progress < 100 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Step 3: Install ComfyUI
            </h3>

            <button
              onClick={onInstall}
              disabled={!canInstall || isInstalling}
              title={getTooltipText()}
              className={`inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-lg transition-all shadow-lg ${
                canInstall && !isInstalling
                  ? 'bg-green-600 hover:bg-green-700 text-white hover:shadow-xl cursor-pointer'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {getButtonContent()}
            </button>

            {canInstall && !isInstalling && (
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                ✓ Ready to install
              </p>
            )}

            {!canInstall && !isInstalling && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Waiting for ZIP file to be placed in download zone...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {(isInstalling || progress > 0) && progress < 100 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Installation Progress
              </h3>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Log */}
      {isInstalling && statusLog.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
            Installation Log
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {statusLog.map((log, index) => (
              <div key={index} className="text-xs font-mono text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-gray-400 dark:text-gray-600 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                Installation Failed
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300 mb-4">
                {error}
              </p>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Installation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {progress === 100 && !error && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-200 mb-2">
                Installation Successful!
              </h3>
              <p className="text-sm text-green-800 dark:text-green-300">
                ComfyUI Portable has been installed successfully with CORS enabled.
                You can now proceed to the next step.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Installation Info */}
      {!isInstalling && progress === 0 && !error && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                What will be installed?
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• ComfyUI Portable (extracted from ZIP)</li>
                <li>• CORS configuration for UI integration</li>
                <li>• Required models and workflows</li>
                <li>• Startup scripts with proper settings</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Estimated Time */}
      {isInstalling && estimatedTimeRemaining !== null && (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <p>Estimated time remaining: {formatTimeRemaining(estimatedTimeRemaining)}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Please do not close this window
          </p>
        </div>
      )}

      {isInstalling && estimatedTimeRemaining === null && progress > 0 && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Calculating estimated time...</p>
          <p className="text-xs mt-1">Please do not close this window</p>
        </div>
      )}
    </div>
  );
};
