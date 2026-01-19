/**
 * Placement Step Component
 * Shows where to place the downloaded file and detects when it's placed
 */

import React, { useState } from 'react';
import { FolderOpen, Copy, Check, RefreshCw, AlertCircle, CheckCircle, XCircle, Folder } from 'lucide-react';
import { PlacementStepProps } from '../../types/installation';

export const PlacementStep: React.FC<PlacementStepProps> = ({
  downloadZonePath,
  fileDetected,
  fileValid,
  validationError,
  onOpenFolder,
  onRefresh
}) => {
  const [pathCopied, setPathCopied] = useState(false);

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(downloadZonePath);
      setPathCopied(true);
      setTimeout(() => setPathCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  };

  const getStatusIcon = () => {
    if (!fileDetected) {
      return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
    if (fileValid) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
    return <XCircle className="w-6 h-6 text-red-500" />;
  };

  const getStatusText = () => {
    if (!fileDetected) {
      return {
        title: 'Waiting for file...',
        description: 'Place the downloaded ZIP file in the folder below',
        color: 'text-gray-600 dark:text-gray-400'
      };
    }
    if (fileValid) {
      return {
        title: 'File detected!',
        description: 'The file is valid and ready for installation',
        color: 'text-green-600 dark:text-green-400'
      };
    }
    return {
      title: 'Invalid file',
      description: validationError || 'The file does not match requirements',
      color: 'text-red-600 dark:text-red-400'
    };
  };

  const status = getStatusText();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
          <Folder className="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Place the Downloaded File
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Move the ZIP file to the designated folder
        </p>
      </div>

      {/* File Detection Status */}
      <div className={`bg-white dark:bg-gray-800 border-2 ${
        fileValid ? 'border-green-300 dark:border-green-700' :
        fileDetected ? 'border-red-300 dark:border-red-700' :
        'border-gray-300 dark:border-gray-600'
      } rounded-lg p-6`}>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${status.color} mb-1`}>
              {status.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {status.description}
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh detection"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Download Zone Path */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Step 2: Place File in This Folder
        </h3>

        {/* Path Display */}
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Folder className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Download Zone
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
              {downloadZonePath}
            </code>
            <button
              onClick={handleCopyPath}
              className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copy path"
            >
              {pathCopied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Open Folder Button */}
        <button
          onClick={onOpenFolder}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
        >
          <FolderOpen className="w-5 h-5" />
          Open Folder in Explorer
        </button>
      </div>

      {/* Visual Instructions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          How to place the file:
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">1</span>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Click "Open Folder in Explorer" above to open the download zone
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">2</span>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Locate your downloaded ComfyUI ZIP file (usually in Downloads folder)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">3</span>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Copy or move the ZIP file into the opened folder
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">4</span>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Wait for automatic detection (or click the refresh button)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-detection Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
              Automatic Detection
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              The system checks for the file every 2 seconds. Once detected and validated,
              you'll be able to proceed to installation.
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {fileDetected && !fileValid && validationError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
                Validation Error
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300">
                {validationError}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
