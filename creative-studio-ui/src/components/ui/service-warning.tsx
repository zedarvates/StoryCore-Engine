/**
 * Service Warning Component
 * 
 * Displays warnings when required services (LLM, ComfyUI) are not configured
 */

import React from 'react';
import { AlertCircle, Settings, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { llmConfigService } from '@/services/llmConfigService';

export interface ServiceWarningProps {
  service: 'llm' | 'comfyui';
  variant?: 'inline' | 'banner';
  onConfigure?: () => void;
  className?: string;
}

const SERVICE_INFO = {
  llm: {
   title: 'LLM Not Configured',
   description: 'This feature requires an LLM service (OpenAI, Anthropic, Ollama, etc.) to generate AI-powered content.',
   configureText: 'Configure LLM',
},
comfyui: {
   title: 'ComfyUI Not Connected',
   description: 'This feature requires ComfyUI to generate images. Install and configure ComfyUI to use it.',
   configureText: 'Configure ComfyUI',
},
};

export function ServiceWarning({ 
  service, 
  variant = 'inline', 
  onConfigure,
  className = '' 
}: ServiceWarningProps) {
  const info = SERVICE_INFO[service];

  if (variant === 'inline') {
    return (
      <div className={`flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md ${className}`}>
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {info.title}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {info.description}
          </p>
          {onConfigure && (
            <Button
              variant="outline"
              size="sm"
              onClick={onConfigure}
              className="mt-2 h-7 text-xs gap-1 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              <Settings className="h-3 w-3" />
              {info.configureText}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Alert variant="default" className={`border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 ${className}`}>
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        {info.title}
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        {info.description}
        {onConfigure && (
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
            className="mt-3 gap-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            <Settings className="h-4 w-4" />
            {info.configureText}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook to check if services are configured
 */
export function useServiceStatus() {
  const [llmConfigured, setLLMConfigured] = React.useState(false);
  const [llmChecking, setLLMChecking] = React.useState(true);
  const [comfyUIConfigured, setComfyUIConfigured] = React.useState(false);
  const [comfyUIChecking, setComfyUIChecking] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    let checkTimeout: NodeJS.Timeout | null = null;

    // Check LLM configuration using the centralized service
    const checkLLMConfig = async () => {
      try {
        // First check if the service is already initialized
        const currentConfig = llmConfigService.getConfig();
        const service = llmConfigService.getService();
        
        if (currentConfig && service) {
          // Service already initialized with config
          const hasValidConfig = 
            currentConfig.provider === 'local' ||
            (currentConfig.apiKey && currentConfig.apiKey.length > 0) ||
            currentConfig.provider === 'custom';
          
          if (isMounted) {
            setLLMConfigured(Boolean(hasValidConfig));
            setLLMChecking(false);
          }
          return;
        }

        // Service not fully initialized, try to initialize it
        try {
          await llmConfigService.initialize();
        } catch (initError) {
          console.warn('[useServiceStatus] LLM service initialization failed:', initError);
          // Continue to check stored config as fallback
        }

        if (!isMounted) return;

        // Use llmConfigService which is the single source of truth
        const isConfigured = llmConfigService.isConfigured();
        const config = llmConfigService.getConfig();
        
        // Service is configured if we have a config with required fields
        const hasValidConfig = config && (
          config.provider === 'local' || // Local provider (Ollama) doesn't need API key
          (config.apiKey && config.apiKey.length > 0) || // API providers need key
          config.provider === 'custom' // Custom provider may have its own auth
        );

        setLLMConfigured(Boolean(isConfigured && hasValidConfig));
      } catch (error) {
        console.error('[useServiceStatus] Failed to check LLM config:', error);
        if (isMounted) {
          // Fallback to localStorage check
          try {
            const storedSettings = localStorage.getItem('storycore-settings');
            if (storedSettings) {
              const settings = JSON.parse(storedSettings);
              const hasLLMConfig = settings.llm?.config?.provider;
              const isOllama = settings.llm?.config?.provider === 'ollama' || settings.llm?.config?.provider === 'local';
              setLLMConfigured(!!(hasLLMConfig || isOllama));
            } else {
              setLLMConfigured(false);
            }
          } catch {
            setLLMConfigured(false);
          }
        }
      } finally {
        if (isMounted) {
          setLLMChecking(false);
        }
      }
    };

    // Set a reasonable timeout to prevent hanging
    checkTimeout = setTimeout(() => {
      if (isMounted && llmChecking) {
        // If still checking after timeout, check one more time using direct service access
        const config = llmConfigService.getConfig();
        const service = llmConfigService.getService();
        
        if (config && service) {
          const hasValidConfig = 
            config.provider === 'local' ||
            (config.apiKey && config.apiKey.length > 0) ||
            config.provider === 'custom';
          setLLMConfigured(Boolean(hasValidConfig));
        }
        // Stop checking state
        setLLMChecking(false);
      }
    }, 3000); // 3 second timeout - reduced from 5s for faster feedback

    // Check immediately
    checkLLMConfig();

    // Subscribe to configuration changes
    const unsubscribe = llmConfigService.subscribe((config) => {
      if (!isMounted) return;
      const hasValidConfig = config !== null && (
        config.provider === 'local' ||
        (config.apiKey && config.apiKey.length > 0) ||
        config.provider === 'custom'
      );
      setLLMConfigured(Boolean(hasValidConfig));
      setLLMChecking(false);
    });

    return () => {
      isMounted = false;
      if (checkTimeout) {
        clearTimeout(checkTimeout);
      }
      unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    // Check ComfyUI configuration from storycore-settings
    const checkComfyUIConfig = async () => {
      try {
        const storedSettings = localStorage.getItem('storycore-settings');
        if (storedSettings) {
          const settings = JSON.parse(storedSettings);
          setComfyUIConfigured(!!(settings.comfyui?.config?.serverUrl));
        } else {
          // Fallback: check old comfyui-servers storage
          const comfyUIServers = localStorage.getItem('comfyui-servers');
          if (comfyUIServers) {
            const servers = JSON.parse(comfyUIServers);
            setComfyUIConfigured(!!(servers.servers && servers.servers.length > 0));
          } else {
            setComfyUIConfigured(false);
          }
        }
      } catch (error) {
        console.error('[useServiceStatus] Failed to check ComfyUI config:', error);
        if (isMounted) {
          setComfyUIConfigured(false);
        }
      } finally {
        if (isMounted) {
          setComfyUIChecking(false);
        }
      }
    };

    checkComfyUIConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    llmConfigured,
    llmChecking,
    comfyUIConfigured,
    comfyUIChecking,
    anyConfigured: llmConfigured || comfyUIConfigured,
    allConfigured: llmConfigured && comfyUIConfigured,
  };
}
