/**
 * Installation Wizard Modal
 * Main container component that orchestrates the installation wizard
 */
import { LegacyAny } from '@/types/legacy';


import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronRight, Check, Settings, ShieldCheck, Cpu } from 'lucide-react';
import { InstallationWizardModalProps } from '../../types/installation';
import { useInstallationWizard } from '../../contexts/InstallationWizardContext';
import { useFileDetection } from '../../hooks/useFileDetection';
import { INSTALLATION_CONFIG } from '../../config/installationConfig';
import { installationApi } from '../../services/installationApiService';
import { DownloadStep } from './DownloadStep';
import { PlacementStep } from './PlacementStep';
import { InstallationStep } from './InstallationStep';
import { CompletionStep } from './CompletionStep';
import '../wizard/WizardModal.css';

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

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(wizardState.installationProgress > 0 && wizardState.installationProgress < 100)) {
        handleClose();
      }
    },
    [onClose, wizardState.installationProgress]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      if (!isInitialized) {
        initializeWizard();
      }
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown, isInitialized]);

  // Update file detection state
  useEffect(() => {
    setFileDetected(fileDetected, fileValid);
  }, [fileDetected, fileValid, setFileDetected]);

  // Auto-advance to installation step when file is valid
  useEffect(() => {
    if (wizardState.currentStep === 'placement' && fileDetected && fileValid) {
      const timer = setTimeout(() => {
        setCurrentStep('installation');
      }, 1000);
      return () => clearTimeout(timer);
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
    setTimeout(() => {
      setCurrentStep('placement');
    }, 500);
  };

  const handleOpenFolder = async () => {
    try {
      if ((window as LegacyAny).electronAPI?.openFolder) {
        await (window as LegacyAny).electronAPI.openFolder(downloadZonePath);
      } else {
        alert(`Please navigate to this folder:\n\n${downloadZonePath}\n\nCopy the ComfyUI Portable ZIP file into this folder.`);
        try {
          await navigator.clipboard.writeText(downloadZonePath);
        } catch (clipboardError) {
          console.warn('Could not copy to clipboard:', clipboardError);
        }
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
      alert(`Could not open folder. Please manually navigate to:\n\n${downloadZonePath}`);
    }
  };

  const handleInstall = async () => {
    try {
      setInstallationProgress(0, 'Starting installation...');

      const zipFilePath = validationResult?.fileName
        ? `${downloadZonePath}/${validationResult.fileName}`
        : '';

      const cleanup = await installationApi.install(
        {
          zipFilePath,
          enableCORS: true,
          installModels: INSTALLATION_CONFIG.requiredModels.map(m => m.id),
          installWorkflows: INSTALLATION_CONFIG.requiredWorkflows.map(w => w.id)
        },
        (update) => {
          setInstallationProgress(update.progress, update.message);

          if (update.error) {
            setInstallationError(update.error);
            return;
          }

          if (update.progress >= 100) {
            performPostInstallationVerification({
              comfyui_path: '',
              comfyui_url: 'http://127.0.0.1:8188',
              installed_models: [],
              installed_workflows: []
            });
          }
        },
        (error) => {
          console.error('Installation error:', error);
          setInstallationError(error.message);
        }
      );

      (window as LegacyAny).__installationCleanup = cleanup;

    } catch (error) {
      console.error('Installation error:', error);
      setInstallationError(error instanceof Error ? error.message : 'Installation failed');
    }
  };

  const performPostInstallationVerification = async (installResult: LegacyAny) => {
    try {
      setInstallationProgress(95, 'Verifying installation...');
      const verifyResponse = await installationApi.verify();
      
      if (!verifyResponse.success || !verifyResponse.data) {
        throw new Error(verifyResponse.error || 'Verification failed');
      }

      const verifyData = verifyResponse.data;
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
      }

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

  const updateApplicationConfiguration = async (config: LegacyAny) => {
    try {
      localStorage.setItem('comfyui_config', JSON.stringify(config));
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
    if ((window as LegacyAny).__installationCleanup) {
      (window as LegacyAny).__installationCleanup();
      delete (window as LegacyAny).__installationCleanup;
    }
    
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
    <div className="wizard-modal-overlay" onClick={() => !(wizardState.installationProgress > 0 && wizardState.installationProgress < 100) && handleClose()}>
      <div className="wizard-modal-container max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
           <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Settings size={20} className={wizardState.installationProgress > 0 && wizardState.installationProgress < 100 ? "animate-spin" : ""} />
            </div>
            <div className="flex flex-col">
              <h2 className="wizard-modal-title">System Setup Wizard</h2>
              <span className="text-[10px] text-blue-400/70 uppercase tracking-widest font-black">Environment Provisioning Engine</span>
            </div>
          </div>
          <button
            className="wizard-modal-close"
            onClick={handleClose}
            aria-label="Fermer"
            disabled={wizardState.installationProgress > 0 && wizardState.installationProgress < 100}
          >
            <X size={20} />
          </button>
        </div>

        <div className="wizard-modal-content p-8">
           {/* Progress Line */}
           <div className="flex items-center justify-between mb-12 bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner">
             {steps.map((step, index) => (
               <React.Fragment key={step.id}>
                 <div className="flex flex-col items-center gap-2 relative z-10">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${
                     index < currentStepIndex 
                       ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                       : index === currentStepIndex 
                       ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] ring-4 ring-blue-500/20' 
                       : 'bg-black/40 border border-white/10 text-slate-500'
                   }`}>
                     {index < currentStepIndex ? <Check size={20} /> : step.number}
                   </div>
                   <span className={`text-[10px] uppercase font-black tracking-widest transition-colors ${
                     index <= currentStepIndex ? 'text-white' : 'text-slate-500'
                   }`}>{step.label}</span>
                 </div>
                 {index < steps.length - 1 && (
                   <div className={`flex-1 h-[2px] mx-4 transition-colors duration-1000 ${
                     index < currentStepIndex ? 'bg-emerald-500' : 'bg-white/10'
                   }`} />
                 )}
               </React.Fragment>
             ))}
           </div>

           <div className="installation-step-content min-h-[400px]">
              {wizardState.currentStep === 'download' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <DownloadStep
                    downloadUrl={INSTALLATION_CONFIG.downloadUrl}
                    expectedFileName={INSTALLATION_CONFIG.expectedFileName}
                    expectedFileSize="2.5 GB"
                    onDownloadClick={handleDownloadClick}
                  />
                </div>
              )}

              {wizardState.currentStep === 'placement' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <PlacementStep
                    downloadZonePath={downloadZonePath}
                    fileDetected={fileDetected}
                    fileValid={fileValid}
                    validationError={validationResult?.errors[0] || null}
                    onOpenFolder={handleOpenFolder}
                    onRefresh={refreshFileDetection}
                  />
                </div>
              )}

              {wizardState.currentStep === 'installation' && (
                <div className="animate-in fade-in zoom-in-95">
                  <InstallationStep
                    canInstall={fileDetected && fileValid}
                    isInstalling={wizardState.installationProgress > 0 && wizardState.installationProgress < 100}
                    progress={wizardState.installationProgress}
                    statusMessage={wizardState.installationStatus}
                    error={wizardState.installationError}
                    onInstall={handleInstall}
                    onRetry={handleRetry}
                  />
                </div>
              )}

              {wizardState.currentStep === 'completion' && (
                <div className="animate-in scale-in duration-500">
                  <CompletionStep
                    success={wizardState.installationProgress === 100 && !wizardState.installationError}
                    comfyUIUrl={wizardState.comfyUIUrl}
                    installedModels={wizardState.installedModels}
                    installedWorkflows={wizardState.installedWorkflows}
                    onOpenComfyUI={handleOpenComfyUI}
                    onClose={handleClose}
                  />
                </div>
              )}
           </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-black/60 flex justify-between items-center">
           <div className="flex items-center gap-4 text-slate-500">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg">
                <ShieldCheck size={12} className="text-emerald-400" /> Integrity Secured
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg">
                <Cpu size={12} className="text-blue-400" /> x64 Optimized
              </div>
           </div>
           
           <button 
             onClick={handleClose}
             disabled={wizardState.installationProgress > 0 && wizardState.installationProgress < 100}
             className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {wizardState.installationProgress > 0 && wizardState.installationProgress < 100 ? "Crucial Task in Progress" : "Quit Wizard"}
           </button>
        </div>
      </div>
    </div>
  );
};
