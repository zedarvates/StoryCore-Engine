/**
 * LLM Status Banner Component
 * 
 * Displays the current status of the LLM service with appropriate messaging
 * and actions for users to configure or troubleshoot the service.
 * Cyber/Neon themed.
 */

import { AlertCircle, Settings, Loader2, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLLMContext } from '@/providers/LLMProvider';
import { cn } from '@/lib/utils';

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
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 backdrop-blur-sm shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
          <p className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">
            Initializing Neural Interface...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-500/5 border border-red-500/30 rounded-lg p-4 mb-6 backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.1)]">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-500/20 rounded border border-red-500/30">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">
              Neural Link Interrupted
            </h4>
            <p className="text-xs text-red-400/70 mb-3 font-mono">
              {error}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onConfigure}
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-[10px] uppercase font-bold tracking-widest h-8"
            >
              <Settings className="w-3.5 h-3.5 mr-2" />
              Recalibrate Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not configured state
  if (!isInitialized || !config || !service) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 backdrop-blur-sm shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/20 rounded border border-primary/30">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">
              Neural Link Standby
            </h4>
            <p className="text-xs text-primary-foreground/60 mb-3 leading-relaxed">
              AI-powered synthesis requires active neural link configuration. Enhance your world-building efficiency by establishing a link.
            </p>
            <div className="text-[10px] text-primary/60 mb-4 bg-primary/10 p-3 rounded border border-primary/10 font-mono">
              <strong className="text-primary">DIAGNOSTIC:</strong> Establish link via local node (Ollama) or external matrix (OpenAI/Anthropic).
              <br />
              • Check if Ollama service is active
              <br />
              • Verify http://localhost:11434 accessibility
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onConfigure}
              className="border-primary/40 text-primary hover:bg-primary/10 text-[10px] uppercase font-bold tracking-widest h-8"
            >
              <Settings className="w-3.5 h-3.5 mr-2" />
              Establish Neural Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Configured state (only show if requested)
  if (showWhenConfigured) {
    return (
      <div className="bg-primary/5 border border-primary/30 rounded-lg p-3 mb-6 backdrop-blur-sm shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-primary neon-text" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Neural Link Online: <span className="opacity-70">{config.provider.toUpperCase()}</span> // {config.model}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onConfigure}
            className="text-primary/60 hover:text-primary hover:bg-primary/10 h-7 w-7 p-0"
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
