/**
 * Installation Wizard Modal
 * Main container component that orchestrates the installation wizard
 */

import React, { useEffect, useState } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { InstallationWizardModalProps } from '../../types/installation';
import { useInstallationWizard } from '../../contexts/InstallationWizardContext';
import { useFileDetection } from '../../hooks/useFileDetection';
import { INSTALLATION_CONFIG } from '../../config/installationConfig';
import { installationApi } from '../../services/installationApiService';
import { DownloadStep } from './DownloadStep';
import { PlacementStep } from './PlacementStep';
import { InstallationStep } from './InstallationStep';
import { CompletionStep } from './CompletionStep';

export const InstallationWizardModal: React.FC<InstallationWizardModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const {
    wizardState,
    setCurrentStep,
    setFileDetected,
    setInstallationProgress,
    setInstallationError,
    setInstallationComplete,
    resetWizard
  } = useInstallationWizard();

  const [downloadZonePath, setDownloadZonePath] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // File detection hook
  const {
    fileDetected,
    fileValid,
    validationResult,
    refresh: refreshFileDetection
  } = useFileDetection({
    downloadZonePath,
    enabled: isOpen && wizardState.currentStep === 'placement'
  });

  // Initialize wizard
  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeWizard();
    }
  }, [isOpen, isInitialized]);

  // Update file detection state
  useEffect(() => {
    setFileDetected(fileDetected, fileValid);
  }, [fileDetected, fileValid, setFileDetected]);

  // Auto-advance to installation step when file is valid
  useEffect(() => {
    if (wizardState.currentStep === 'placement' && fileDetected && fileValid) {
      setTimeout(() => {
        setCurrentStep('installation');
      }, 1000);
    }
  }, [wizardState.currentStep, fileDetected, fileValid, setCurrentStep]);

  const initializeWizard = async () => {
    try {
      const response = await installationApi.initialize();

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to initialize wizard');
      }

      setDownloadZonePath(response.data.downloadZonePath);
      setIsInitialized(true);
    } catch (error) {
      console.error('Wizard initialization error:', error);
      setInstallationError('Failed to initialize installation wizard');
    }
  };

  const handleDownloadClick = () => {
    // Move to placement step after download link is clicked
    setTimeout(() => {
      setCurrentStep('placement');
    }, 500);
  };

  const handleOpenFolder = async () => {
    try {
      // Check if we're in Electron environment
      if (window.electronAPI?.openFolder) {
        // Use Electron API to open folder
        await window.electronAPI.openFolder(downloadZonePath);
      } else {
        // Fallback: Show path in alert for web environment
        alert(`Please navigate to this folder:\n\n${downloadZonePath}\n\nCopy the ComfyUI Portable ZIP file into this folder.`);
        
        // Try to copy path to clipboard
        try {
          await navigator.clipboard.writeText(downloadZonePath);
          ;
        } catch (clipboardError) {
          console.warn('Could not copy to clipboard:', clipboardError);
        }
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
      // Show error to user
      alert(`Could not open folder. Please manually navigate to:\n\n${downloadZonePath}`);
    }
  };

  const handleInstall = async () => {
    try {
      setInstallationProgress(0, 'Starting installation...');

      const zipFilePath = validationResult?.fileName
        ? `${downloadZonePath}/${validationResult.fileName}`
        : '';

      // Use the installation API service with WebSocket support
      const cleanup = await installationApi.install(
        {
          zipFilePath,
          enableCORS: true,
          installModels: INSTALLATION_CONFIG.requiredModels.map(m => m.id),
          installWorkflows: INSTALLATION_CONFIG.requiredWorkflows.map(w => w.id)
        },
        (update) => {
          // Progress update callback
          setInstallationProgress(update.progress, update.message);

          if (update.error) {
            setInstallationError(update.error);
            return;
          }

          if (update.progress >= 100) {
            // Installation complete, perform post-installation verification
            performPostInstallationVerification({
              comfyui_path: '',
              comfyui_url: 'http://127.0.0.1:8188',
              installed_models: [],
              installed_workflows: []
            });
          }
        },
        (error) => {
          // Error callback
          console.error('Installation error:', error);
          setInstallationError(error.message);
        }
      );

      // Store cleanup function for later use
      (window as any).__installationCleanup = cleanup;

    } catch (error) {
      console.error('Installation error:', error);
      setInstallationError(error instanceof Error ? error.message : 'Installation failed');
    }
  };

  const performPostInstallationVerification = async (installResult: any) => {
    try {
      setInstallationProgress(95, 'Verifying installation...');

      // Step 1: Verify installation using API service
      const verifyResponse = await installationApi.verify();
      
      if (!verifyResponse.success || !verifyResponse.data) {
        throw new Error(verifyResponse.error || 'Verification failed');
      }

      const verifyData = verifyResponse.data;

      // Step 2: Update application configuration
      setInstallationProgress(99, 'Updating configuration...');
      
      try {
        await updateApplicationConfiguration({
          comfyUIInstalled: true,
          comfyUIPath: installResult.comfyui_path,
          comfyUIUrl: verifyData.url || 'http://127.0.0.1:8188',
          installedAt: new Date().toISOString()
        });
      } catch (configError) {
        console.warn('Could not update configuration:', configError);
        // Continue anyway - configuration can be updated later
      }

      // Step 3: Complete installation
      setInstallationProgress(100, 'Installation complete!');
      
      setInstallationComplete(
        verifyData.url || 'http://127.0.0.1:8188',
        verifyData.models || [],
        verifyData.workflows || []
      );

    } catch (error) {
      console.error('Post-installation verification error:', error);
      setInstallationError(
        error instanceof Error 
          ? `Verification failed: ${error.message}` 
          : 'Post-installation verification failed'
      );
    }
  };

  const updateApplicationConfiguration = async (config: any) => {
    try {
      // Update local storage
      localStorage.setItem('comfyui_config', JSON.stringify(config));
      
      // Optionally update backend configuration
      // This would depend on your application's configuration system
      ;
      
      return true;
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  };

  const handleRetry = () => {
    setInstallationError(null);
    setInstallationProgress(0, '');
    handleInstall();
  };

  const handleOpenComfyUI = () => {
    if (wizardState.comfyUIUrl) {
      window.open(wizardState.comfyUIUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClose = () => {
    // Clean up WebSocket connection if exists
    if ((window as any).__installationCleanup) {
      (window as any).__installationCleanup();
      delete (window as any).__installationCleanup;
    }
    
    // Disconnect API service
    installationApi.disconnect();
    
    if (wizardState.currentStep === 'completion') {
      onComplete(wizardState.comfyUIUrl || '');
    }
    resetWizard();
    setIsInitialized(false);
    onClose();
  };

  if (!isOpen) return null;

  const steps = [
    { id: 'download', label: 'Download', number: 1 },
    { id: 'placement', label: 'Place File', number: 2 },
    { id: 'installation', label: 'Install', number: 3 },
    { id: 'completion', label: 'Complete', number: 4 }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === wizardState.currentStep);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              ComfyUI Installation Wizard
            </h1>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      index < currentStepIndex
                        ? 'bg-green-600 text-white'
                        : index === currentStepIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      index <= currentStepIndex
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className={`w-5 h-5 ${
                    index < currentStepIndex
                      ? 'text-green-500'
                      : 'text-gray-400'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] px-6 py-6">
          {wizardState.currentStep === 'download' && (
            <DownloadStep
              downloadUrl={INSTALLATION_CONFIG.downloadUrl}
              expectedFileName={INSTALLATION_CONFIG.expectedFileName}
              expectedFileSize="2.5 GB"
              onDownloadClick={handleDownloadClick}
            />
          )}

          {wizardState.currentStep === 'placement' && (
            <PlacementStep
              downloadZonePath={downloadZonePath}
              fileDetected={fileDetected}
              fileValid={fileValid}
              validationError={validationResult?.errors[0] || null}
              onOpenFolder={handleOpenFolder}
              onRefresh={refreshFileDetection}
            />
          )}

          {wizardState.currentStep === 'installation' && (
            <InstallationStep
              canInstall={fileDetected && fileValid}
              isInstalling={wizardState.installationProgress > 0 && wizardState.installationProgress < 100}
              progress={wizardState.installationProgress}
              statusMessage={wizardState.installationStatus}
              error={wizardState.installationError}
              onInstall={handleInstall}
              onRetry={handleRetry}
            />
          )}

          {wizardState.currentStep === 'completion' && (
            <CompletionStep
              success={wizardState.installationProgress === 100 && !wizardState.installationError}
              comfyUIUrl={wizardState.comfyUIUrl}
              installedModels={wizardState.installedModels}
              installedWorkflows={wizardState.installedWorkflows}
              onOpenComfyUI={handleOpenComfyUI}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {wizardState.currentStep === 'download' && 'Step 1 of 4: Download ComfyUI'}
              {wizardState.currentStep === 'placement' && 'Step 2 of 4: Place File'}
              {wizardState.currentStep === 'installation' && 'Step 3 of 4: Installation'}
              {wizardState.currentStep === 'completion' && 'Step 4 of 4: Complete'}
            </div>
            <button
              onClick={handleClose}
              disabled={wizardState.installationProgress > 0 && wizardState.installationProgress < 100}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                wizardState.installationProgress > 0 && wizardState.installationProgress < 100
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              title={
                wizardState.installationProgress > 0 && wizardState.installationProgress < 100
                  ? 'Cannot cancel during installation'
                  : 'Cancel and close wizard'
              }
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
