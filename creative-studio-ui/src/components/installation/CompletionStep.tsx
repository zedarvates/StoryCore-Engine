/**
 * Completion Step Component
 * Shows installation results and next steps
 */

import React from 'react';
import { CheckCircle, ExternalLink, X, Package, Workflow } from 'lucide-react';
import { CompletionStepProps } from '../../types/installation';

export const CompletionStep: React.FC<CompletionStepProps> = ({
  success,
  comfyUIUrl,
  installedModels,
  installedWorkflows,
  onOpenComfyUI,
  onClose
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className={`mx-auto w-20 h-20 ${
          success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        } rounded-full flex items-center justify-center mb-4`}>
          {success ? (
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          ) : (
            <X className="w-10 h-10 text-red-600 dark:text-red-400" />
          )}
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {success ? 'Installation Complete!' : 'Installation Incomplete'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {success
            ? 'ComfyUI Portable is ready to use'
            : 'Some issues occurred during installation'}
        </p>
      </div>

      {/* Success Content */}
      {success && (
        <>
          {/* ComfyUI URL */}
          {comfyUIUrl && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ComfyUI Server
                </h3>
                
                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Server URL
                    </span>
                  </div>
                  <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                    {comfyUIUrl}
                  </code>
                </div>

                <button
                  onClick={onOpenComfyUI}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
                >
                  Open ComfyUI
                  <ExternalLink className="w-4 h-4" />
                </button>

                <p className="text-xs text-gray-600 dark:text-gray-400">
                  ComfyUI will open in a new browser tab
                </p>
              </div>
            </div>
          )}

          {/* Installed Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Models */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Installed Models
                </h3>
              </div>
              {installedModels.length > 0 ? (
                <ul className="space-y-2">
                  {installedModels.map((model, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="truncate">{model}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No models installed
                </p>
              )}
            </div>

            {/* Workflows */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Workflow className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Installed Workflows
                </h3>
              </div>
              {installedWorkflows.length > 0 ? (
                <ul className="space-y-2">
                  {installedWorkflows.map((workflow, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="truncate">{workflow}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No workflows installed
                </p>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
              Next Steps
            </h3>
            <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Click "Open ComfyUI" to verify the installation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>ComfyUI will start automatically with CORS enabled</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Return to StoryCore-Engine to start creating content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>The UI will automatically connect to ComfyUI</span>
              </li>
            </ol>
          </div>

          {/* CORS Info */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-200 mb-1">
                  CORS Configured
                </h3>
                <p className="text-sm text-green-800 dark:text-green-300">
                  Cross-Origin Resource Sharing (CORS) has been properly configured.
                  The StoryCore-Engine UI can now communicate with ComfyUI without security errors.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Failure Content */}
      {!success && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
              Installation encountered issues
            </h3>
            <p className="text-sm text-red-800 dark:text-red-300">
              Some components may not have been installed correctly.
              Please check the installation log or try again.
            </p>
          </div>
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onClose}
          className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
        >
          {success ? 'Finish' : 'Close'}
        </button>
      </div>

      {/* Support Info */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        <p>Need help? Check the documentation or contact support</p>
      </div>
    </div>
  );
};
