import { useState, useCallback, useEffect } from 'react';

interface ModelInfo {
  name: string;
  filename: string;
  url: string;
  subfolder: string;
  size: number;
}

interface DownloadProgress {
  currentModel: string;
  progress: number;
  status: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
}

interface UseModelDownloadReturn {
  models: ModelInfo[];
  isDownloading: boolean;
  downloadProgress: DownloadProgress;
  autoDetectedPath: string;
  startDownload: (targetPath: string) => Promise<void>;
  resetDownload: () => void;
  checkModelAvailability: () => Promise<boolean>;
}

export const useModelDownload = (): UseModelDownloadReturn => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    currentModel: '',
    progress: 0,
    status: 'Ready to start download...',
    isComplete: false,
    hasError: false
  });
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
    return detectedPath;
  }, []);

  useEffect(() => {
    detectEnvironmentPath();
  }, [detectEnvironmentPath]);

  const downloadModel = async (model: ModelInfo, targetPath: string): Promise<void> => {
    // In a real implementation, this would use fetch with progress tracking
    // For now, we simulate the download process
    
    setDownloadProgress(prev => ({
      ...prev,
      currentModel: `Downloading ${model.name}...`,
      status: `${model.size} MB - Connecting to HuggingFace...`
    }));

    // Simulate download with progress updates
    for (let progress = 0; progress <= 100; progress += 10) {
      setDownloadProgress(prev => ({
        ...prev,
        status: progress < 100 
          ? `${model.size} MB - ${progress}% complete`
          : `${model.name} downloaded successfully`
      }));
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const startDownload = useCallback(async (targetPath: string): Promise<void> => {
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress({
      currentModel: '',
      progress: 0,
      status: 'Preparing download...',
      isComplete: false,
      hasError: false
    });

    try {
      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        await downloadModel(model, targetPath);
        
        const overallProgress = ((i + 1) / models.length) * 100;
        setDownloadProgress(prev => ({
          ...prev,
          progress: overallProgress
        }));
      }

      setDownloadProgress(prev => ({
        ...prev,
        currentModel: 'All models downloaded successfully!',
        status: 'Ready to use with ComfyUI',
        isComplete: true
      }));

    } catch (error) {
      setDownloadProgress(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        status: `❌ Download Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, models]);

  const resetDownload = useCallback(() => {
    setIsDownloading(false);
    setDownloadProgress({
      currentModel: '',
      progress: 0,
      status: 'Ready to start download...',
      isComplete: false,
      hasError: false
    });
  }, []);

  const checkModelAvailability = useCallback(async (): Promise<boolean> => {
    // In a real implementation, this would check if model files exist
    // For now, we simulate the check
    try {
      // This would typically use File System Access API or a backend service
      // to check if the model files exist in the target directory
      return downloadProgress.isComplete;
    } catch (error) {
      console.error('Error checking model availability:', error);
      return false;
    }
  }, [downloadProgress.isComplete]);

  return {
    models,
    isDownloading,
    downloadProgress,
    autoDetectedPath,
    startDownload,
    resetDownload,
    checkModelAvailability
  };
};
