/**
 * Download Step Component
 * Displays download instructions and link for ComfyUI Portable
 */

import React from 'react';
import { Download, ExternalLink, Info, AlertCircle } from 'lucide-react';
import { DownloadStepProps } from '../../types/installation';

export const DownloadStep: React.FC<DownloadStepProps> = ({
  downloadUrl,
  expectedFileName,
  expectedFileSize,
  onDownloadClick
}) => {
  const handleDownloadClick = () => {
    // Open download URL in new tab
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    onDownloadClick();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
          <Download className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Download ComfyUI Portable
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          First, we need to download the ComfyUI Portable package
        </p>
      </div>

      {/* Why Manual Download */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
              Why manual download?
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Windows 11 security features may block automatic downloads from certain sources.
              To ensure a successful installation, we'll guide you through a manual download process.
            </p>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Step 1: Download the File
          </h3>
          
          <button
            onClick={handleDownloadClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-5" />
            Download ComfyUI Portable
            <ExternalLink className="w-4 h-4" />
          </button>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will open the download page in a new tab
          </p>
        </div>
      </div>

      {/* File Details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          What to download:
        </h3>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                File name:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded mt-1">
                {expectedFileName}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Expected size:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Approximately {expectedFileSize}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Checklist */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Download checklist:
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
              <span className="text-xs">1</span>
            </div>
            Click the download button above
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
              <span className="text-xs">2</span>
            </div>
            Find and download the correct file
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
              <span className="text-xs">3</span>
            </div>
            Wait for the download to complete
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
              <span className="text-xs">4</span>
            </div>
            Verify the file size matches
          </div>
        </div>
      </div>

      {/* Important Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
              Important
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Do not extract or rename the downloaded file. Keep it as-is for the next step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
