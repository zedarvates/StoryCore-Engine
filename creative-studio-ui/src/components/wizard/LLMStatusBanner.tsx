/**
 * LLM Status Banner Component
 * 
 * Displays the current status of the LLM service with appropriate messaging
 * and actions for users to configure or troubleshoot the service.
 */

import { AlertCircle, Settings, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLLMContext } from '@/providers/LLMProvider';

export interface LLMStatusBannerProps {
  onConfigure: () => void;
  showWhenConfigured?: boolean;
}

export function LLMStatusBanner({ 
  onConfigure,
  showWhenConfigured = false 
}: LLMStatusBannerProps) {
  const { isInitialized, isLoading, error, config, service } = useLLMContext();

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Initializing LLM service...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-800 mb-1">
              LLM Service Error
            </h4>
            <p className="text-sm text-red-700 mb-3">
              {error}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onConfigure}
              className="border-red-600 text-red-800 hover:bg-red-100"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure LLM
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not configured state
  if (!isInitialized || !config || !service) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-800 mb-1">
              LLM Service Not Configured
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              AI-powered features require LLM configuration. Please configure your LLM settings to use generation features in this wizard.
            </p>
            <div className="text-xs text-yellow-600 mb-3 bg-yellow-100 p-2 rounded">
              <strong>Note:</strong> If you're using Ollama, make sure it's running:
              <br />
              • Check if Ollama is installed
              <br />
              • Start Ollama service
              <br />
              • Verify it's accessible at http://localhost:11434
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onConfigure}
              className="border-yellow-600 text-yellow-800 hover:bg-yellow-100"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure LLM Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Configured state (only show if requested)
  if (showWhenConfigured) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-green-800">
              LLM service configured: <span className="font-semibold">{config.provider}</span> - {config.model}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onConfigure}
            className="text-green-700 hover:bg-green-100"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Don't show anything if configured and showWhenConfigured is false
  return null;
}
