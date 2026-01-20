/**
 * Service Warning Component
 * 
 * Displays warnings when required services (LLM, ComfyUI) are not configured
 */

import React from 'react';
import { AlertCircle, Settings, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface ServiceWarningProps {
  service: 'llm' | 'comfyui';
  variant?: 'inline' | 'banner';
  onConfigure?: () => void;
  className?: string;
}

const SERVICE_INFO = {
  llm: {
    title: 'LLM Non Configuré',
    description: 'Cette fonctionnalité nécessite un service LLM (OpenAI, Anthropic, Ollama, etc.) pour générer du contenu avec l\'IA.',
    configureText: 'Configurer LLM',
  },
  comfyui: {
    title: 'ComfyUI Non Connecté',
    description: 'Cette fonctionnalité nécessite ComfyUI pour générer des images. Installez et configurez ComfyUI pour l\'utiliser.',
    configureText: 'Configurer ComfyUI',
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
  const [comfyUIConfigured, setComfyUIConfigured] = React.useState(false);

  React.useEffect(() => {
    // Check LLM configuration from storycore-settings
    try {
      const storedSettings = localStorage.getItem('storycore-settings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        // LLM is configured if we have a provider and either an encrypted API key or it's Ollama
        const hasLLMConfig = settings.llm?.config?.provider;
        const hasApiKey = settings.llm?.encryptedApiKey;
        const isOllama = settings.llm?.config?.provider === 'ollama' || settings.llm?.config?.provider === 'local';
        setLLMConfigured(!!(hasLLMConfig && (hasApiKey || isOllama)));
      } else {
        setLLMConfigured(false);
      }
    } catch (error) {
      console.error('Failed to check LLM config:', error);
      setLLMConfigured(false);
    }

    // Check ComfyUI configuration from storycore-settings
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
      console.error('Failed to check ComfyUI config:', error);
      setComfyUIConfigured(false);
    }
  }, []);

  return {
    llmConfigured,
    comfyUIConfigured,
    anyConfigured: llmConfigured || comfyUIConfigured,
    allConfigured: llmConfigured && comfyUIConfigured,
  };
}
