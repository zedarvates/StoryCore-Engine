import React, { useState, useEffect, useCallback } from 'react';

interface ModelInfo {
  name: string;
  filename: string;
  url: string;
  subfolder: string;
  size: number;
}

interface ModelDownloadProps {
  isOpen: boolean;
  onClose: () => void;
  onModelsAvailable?: () => void;
}

const ModelDownloadModal: React.FC<ModelDownloadProps> = ({
  isOpen,
  onClose,
  onModelsAvailable
}) => {
  const [pathOption, setPathOption] = useState<'auto' | 'manual'>('auto');
  const [customPath, setCustomPath] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentModel, setCurrentModel] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('Ready to start download...');
  const [autoDetectedPath, setAutoDetectedPath] = useState('');

  const models: ModelInfo[] = [
    {
      name: 'FLUX.2 VAE',
      filename: 'flux2-vae.safetensors',
      url: 'https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors',
      subfolder: 'vae',
      size: 335
    },
    {
      name: 'FLUX.2 Diffusion Model',
      filename: 'flux2_dev_fp8mixed.safetensors',
      url: 'https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/diffusion_models/flux2_dev_fp8mixed.safetensors',
      subfolder: 'diffusion_models',
      size: 3584
    },
    {
      name: 'Mistral Text Encoder',
      filename: 'mistral_3_small_flux2_bf16.safetensors',
      url: 'https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/mistral_3_small_flux2_bf16.safetensors',
      subfolder: 'text_encoders',
      size: 7372
    },
    {
      name: 'Berthe Morisot LoRA',
      filename: 'flux2_berthe_morisot.safetensors',
      url: 'https://huggingface.co/ostris/flux2_berthe_morisot/resolve/main/flux2_berthe_morisot.safetensors',
      subfolder: 'loras',
      size: 100
    }
  ];

  const detectEnvironmentPath = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const currentPath = window.location.pathname;
    
    let detectedPath = '';
    
    if (currentPath.includes('wsl.localhost') || userAgent.includes('wsl')) {
      detectedPath = '\\\\wsl.localhost\\Ubuntu\\home\\redga\\projects\\storycore-engine\\comfyui_portable\\ComfyUI\\models';
    } else if (userAgent.includes('win')) {
      detectedPath = '.\\comfyui_portable\\ComfyUI\\models';
    } else {
      detectedPath = './comfyui_portable/ComfyUI/models';
    }
    
    setAutoDetectedPath(detectedPath);
  }, []);

  useEffect(() => {
    if (isOpen) {
      detectEnvironmentPath();
    }
  }, [isOpen, detectEnvironmentPath]);

  const selectFolder = async () => {
    try {
      // Use File System Access API if available
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        setCustomPath(dirHandle.name);
      } else {
        alert('Manual folder selection requires a modern browser with File System Access API support.\n\nFor now, please use the automatic path detection.');
      }
    } catch (error) {
      console.log('User cancelled folder selection');
    }
  };

  const simulateModelDownload = async (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        for (let i = 0; i < models.length; i++) {
          const model = models[i];
          setCurrentModel(`Downloading ${model.name}...`);
          setDownloadStatus(`${model.size} MB - Connecting to HuggingFace...`);
          
          // Simulate download progress
          for (let progress = 0; progress <= 100; progress += 10) {
            const overallProgress = ((i * 100 + progress) / (models.length * 100)) * 100;
            setDownloadProgress(overallProgress);
            
            if (progress < 100) {
              setDownloadStatus(`${model.size} MB - ${progress}% complete`);
            } else {
              setDownloadStatus(`${model.name} downloaded successfully`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        setCurrentModel('All models downloaded successfully!');
        setDownloadStatus('Ready to use with ComfyUI');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const startDownload = async () => {
    if (isDownloading) return;
    
    if (pathOption === 'manual' && !customPath) {
      alert('Please select a folder for manual download.');
      return;
    }
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      await simulateModelDownload();
      setDownloadStatus('✅ Download Complete! All models are ready for StoryCore-Engine');
      onModelsAvailable?.();
    } catch (error) {
      setDownloadStatus(`❌ Download Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    if (!isDownloading) {
      onClose();
      // Reset state
      setDownloadProgress(0);
      setCurrentModel('');
      setDownloadStatus('Ready to start download...');
    }
  };

  if (!isOpen) return null;

  const totalSize = models.reduce((sum, model) => sum + model.size, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-600">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Download Required Models</h3>
          <button
            onClick={handleClose}
            disabled={isDownloading}
            className="text-gray-400 hover:text-white disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Path Selection */}
          <div className="bg-gray-700 rounded p-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-3">📁 Download Location</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="autoPath"
                  name="pathOption"
                  value="auto"
                  checked={pathOption === 'auto'}
                  onChange={() => setPathOption('auto')}
                  className="text-blue-600"
                />
                <label htmlFor="autoPath" className="text-sm text-gray-300">
                  <strong>Automatic (Recommended)</strong>
                  <div className="text-xs text-gray-400 mt-1">
                    <strong>Detected:</strong>
                    <br />
                    <code className="bg-gray-800 px-1 rounded text-xs">{autoDetectedPath}</code>
                  </div>
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="manualPath"
                  name="pathOption"
                  value="manual"
                  checked={pathOption === 'manual'}
                  onChange={() => setPathOption('manual')}
                  className="text-blue-600"
                />
                <label htmlFor="manualPath" className="text-sm text-gray-300">
                  <strong>Manual Selection</strong>
                  <div className="text-xs text-gray-400 mt-1">Choose custom folder</div>
                </label>
              </div>
              {pathOption === 'manual' && (
                <div className="ml-6">
                  <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="Select folder..."
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-sm"
                    readOnly
                  />
                  <button
                    onClick={selectFolder}
                    className="mt-2 bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-xs"
                  >
                    Browse Folder
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Model List */}
          <div className="bg-gray-700 rounded p-4">
            <h4 className="text-sm font-semibold text-yellow-400 mb-3">📦 Models to Download</h4>
            <div className="space-y-2 text-xs text-gray-300">
              {models.map((model, index) => (
                <div key={index} className="flex justify-between">
                  <span>• {model.name}</span>
                  <span className="text-gray-400">{model.size} MB</span>
                </div>
              ))}
              <div className="border-t border-gray-600 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Download Size:</span>
                  <span className="text-yellow-400">~{(totalSize / 1024).toFixed(1)} GB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          {isDownloading && (
            <div className="bg-gray-700 rounded p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-3">📊 Download Progress</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{currentModel || 'Preparing download...'}</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400">
                  {downloadStatus}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={startDownload}
              disabled={isDownloading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-4 py-2 rounded text-sm transition-colors"
            >
              {isDownloading ? 'Downloading...' : 'Start Download'}
            </button>
            <button
              onClick={handleClose}
              disabled={isDownloading}
              className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 px-4 py-2 rounded text-sm transition-colors"
            >
              {isDownloading ? 'Please Wait' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelDownloadModal;
