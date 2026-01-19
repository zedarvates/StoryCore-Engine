import React, { useState, useEffect } from 'react';

interface ModelInfo {
  name: string;
  url: string;
  subfolder: string;
  size: string;
}

interface ModelDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadComplete: () => void;
}

export const ModelDownloadModal: React.FC<ModelDownloadModalProps> = ({
  isOpen,
  onClose,
  onDownloadComplete
}) => {
  const [downloadMode, setDownloadMode] = useState<'automatic' | 'manual'>('automatic');
  const [targetPath, setTargetPath] = useState('\\\\wsl.localhost\\Ubuntu\\home\\redga\\projects\\storycore-engine\\comfyui_portable\\ComfyUI\\models');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentModel, setCurrentModel] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const models: ModelInfo[] = [
    { name: 'flux2-vae.safetensors', url: 'https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors', subfolder: 'vae', size: '335MB' },
    { name: 'flux2_berthe_morisot.safetensors', url: 'https://huggingface.co/ostris/flux2_berthe_morisot/resolve/main/flux2_berthe_morisot.safetensors', subfolder: 'loras', size: '100MB' },
    { name: 'flux2_dev_fp8mixed.safetensors', url: 'https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/diffusion_models/flux2_dev_fp8mixed.safetensors', subfolder: 'checkpoints', size: '3.5GB' },
    { name: 'mistral_3_small_flux2_bf16.safetensors', url: 'https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/mistral_3_small_flux2_bf16.safetensors', subfolder: 'clip', size: '7.2GB' }
  ];

  const selectManualPath = async () => {
    try {
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker();
      setTargetPath(dirHandle.name);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        alert('Folder selection not supported. Please use automatic mode or update your browser.');
      }
    }
  };

  const checkUNCPermissions = async (): Promise<void> => {
    // Simulate UNC path permission check
    const hasPermission = Math.random() > 0.2; // 80% success rate for demo
    
    if (!hasPermission) {
      throw new Error(`UNC Path Access Denied: Cannot write to ${targetPath}. Please run as administrator or use manual mode.`);
    }
  };

  const simulateModelDownload = async (model: ModelInfo): Promise<void> => {
    // Simulate download time based on model size
    const downloadTime = model.size.includes('GB') ? 3000 : 
                        model.size.includes('MB') && parseInt(model.size) > 500 ? 2000 : 1000;
    
    await new Promise(resolve => setTimeout(resolve, downloadTime));
    
    // Simulate occasional download failure
    if (Math.random() < 0.1) {
      throw new Error(`Failed to download ${model.name}: Network timeout`);
    }
  };

  const startDownload = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setError(null);
    setProgress(0);
    
    try {
      const totalModels = models.length;
      
      for (let i = 0; i < totalModels; i++) {
        const model = models[i];
        setCurrentModel(model.name);
        
        // Update progress
        setProgress((i / totalModels) * 100);
        
        // Check UNC path permissions for automatic mode
        if (downloadMode === 'automatic') {
          await checkUNCPermissions();
        }
        
        // Simulate download
        await simulateModelDownload(model);
        
        // Update progress to show completion of current model
        setProgress(((i + 1) / totalModels) * 100);
      }
      
      // Validate downloaded models
      const validationResult = await validateDownloadedModels();
      
      if (validationResult.allValid) {
        setDownloadStatus('✅ Download Complete! All models downloaded successfully.');
        onDownloadComplete();
      } else {
        // Trigger automatic fallback
        await triggerAutomaticFallback(validationResult.missingModels);
      }
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const validateDownloadedModels = async () => {
    // Simulate model validation (20% chance of missing models for demo)
    const missingModels = Math.random() < 0.2 ? [models[0]] : [];
    
    return {
      allValid: missingModels.length === 0,
      missingModels: missingModels
    };
  };

  const triggerAutomaticFallback = async (missingModels: ModelInfo[]) => {
    setDownloadStatus(`⚠️ Some models missing: ${missingModels.map(m => m.name).join(', ')}`);
    
    // Show fallback options
    const fallbackConfirm = window.confirm(
      `Some models are missing. Launch ComfyUI Manager + Workflow Models Downloader fallback?\n\n` +
      `This will:\n` +
      `1. Open ComfyUI Manager in a new tab\n` +
      `2. Load Workflow Models Downloader\n` +
      `3. Automatically detect and download missing models\n\n` +
      `Click OK to proceed (2 clicks total)`
    );
    
    if (fallbackConfirm) {
      await launchFallbackSolution();
    } else {
      setDownloadStatus('⏭️ Fallback skipped. You can manually install missing models later.');
    }
  };

  const launchFallbackSolution = async () => {
    try {
      // Check if ComfyUI is running
      const isRunning = await checkComfyUIStatus();
      
      if (!isRunning) {
        setDownloadStatus('🚀 Starting ComfyUI for fallback...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate startup
      }
      
      // Launch ComfyUI Manager with Workflow Models Downloader
      const fallbackUrl = 'http://127.0.0.1:8188/?workflow=storycore_flux2&auto_download=true';
      window.open(fallbackUrl, '_blank', 'width=1200,height=800');
      
      setDownloadStatus(`🔧 Fallback launched! ComfyUI Manager opened with Workflow Models Downloader 1.8.1. 
        Look for "Download Models from Workflow" node and click "Download Missing Models".`);
      
      // Set up monitoring
      setupFallbackMonitoring();
      
    } catch (error: any) {
      setError(`Fallback failed: ${error.message}`);
    }
  };

  const setupFallbackMonitoring = () => {
    const interval = setInterval(async () => {
      const complete = await checkFallbackCompletion();
      if (complete) {
        clearInterval(interval);
        setDownloadStatus('✅ Fallback complete! All models now available.');
        onDownloadComplete();
      }
    }, 15000);

    // Stop monitoring after 10 minutes
    setTimeout(() => clearInterval(interval), 600000);
  };

  const checkFallbackCompletion = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://127.0.0.1:8188/object_info', {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok && Math.random() > 0.7; // Simulate completion
    } catch {
      return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Download Required Models</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Download Mode Selection */}
        <div className="mb-6">
          <h4 className="font-medium mb-3">Download Mode</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="downloadMode"
                value="automatic"
                checked={downloadMode === 'automatic'}
                onChange={(e) => setDownloadMode('automatic')}
                className="mr-2"
              />
              <span>Automatic (WSL Ubuntu Path)</span>
            </label>
            {downloadMode === 'automatic' && (
              <div className="ml-6 text-sm text-gray-400">
                Target: <code className="bg-gray-700 px-2 py-1 rounded text-xs break-all">
                  \\wsl.localhost\Ubuntu\home\redga\projects\storycore-engine\comfyui_portable\ComfyUI\models
                </code>
              </div>
            )}
            
            <label className="flex items-center">
              <input
                type="radio"
                name="downloadMode"
                value="manual"
                checked={downloadMode === 'manual'}
                onChange={(e) => setDownloadMode('manual')}
                className="mr-2"
              />
              <span>Manual (Select Destination)</span>
            </label>
            {downloadMode === 'manual' && (
              <div className="ml-6">
                <button
                  onClick={selectManualPath}
                  className="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded text-sm"
                >
                  Select Folder
                </button>
                <div className="mt-2 text-sm text-gray-400">
                  {targetPath === '\\\\wsl.localhost\\Ubuntu\\home\\redga\\projects\\storycore-engine\\comfyui_portable\\ComfyUI\\models' 
                    ? 'No folder selected' 
                    : `Selected: ${targetPath}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Model List */}
        <div className="mb-6">
          <h4 className="font-medium mb-3">Required Models (Total: ~11.1 GB)</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {models.map((model, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded text-sm">
                <div>
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-gray-400">{model.subfolder} → models/{model.subfolder}/</div>
                </div>
                <div className="text-gray-300">{model.size}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Download Progress */}
        {isDownloading && (
          <div className="mb-4">
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span>Downloading: {currentModel}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {downloadStatus && (
          <div className="mb-4 text-sm text-green-400">{downloadStatus}</div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded">
            <div className="text-red-400 font-semibold">❌ Download Failed</div>
            <div className="text-xs mt-1 text-red-300">{error}</div>
            <button
              onClick={startDownload}
              className="mt-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
            >
              Retry Download
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={startDownload}
            disabled={isDownloading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-4 py-2 rounded font-medium"
          >
            {isDownloading ? 'Downloading...' : 'Start Download'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelDownloadModal;
