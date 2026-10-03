import React, { useState, useEffect } from 'react';
import { Mic, MicOff, MonitorUp, MessageSquareText, PowerOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VoiceTextService } from '@/services/VoiceTextService';
import { AgentAudioVisualizer } from '@/components/ui/AgentAudioVisualizer';
import { useToast } from '@/hooks/use-toast';

export interface AgentFloatingControlBarProps {
  className?: string;
  onScreenCapture?: () => void;
  onToggleChat?: () => void;
  onEndCall?: () => void;
}

/**
 * AgentFloatingControlBar
 * 
 * Styled after LiveKit's agent-control-bar variant="livekit", this component provides
 * a floating, contextual control panel for interacting with the AI Agent in StoryCore.
 */
export function AgentFloatingControlBar({
  className,
  onScreenCapture,
  onToggleChat,
  onEndCall
}: AgentFloatingControlBarProps) {
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleVoiceState = (e: CustomEvent) => {
      setIsListening(e.detail.isListening);
    };
    window.addEventListener('storycore:voice-state', handleVoiceState as EventListener);
    
    // Initial state
    const service = VoiceTextService.getInstance();
    // @ts-ignore - accessing internal state for initial sync
    if (service.isListening) {
      setIsListening(true);
    }

    return () => {
      window.removeEventListener('storycore:voice-state', handleVoiceState as EventListener);
    };
  }, []);

  const handleToggleMic = () => {
    const voiceService = VoiceTextService.getInstance();
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      voiceService.startListening({
        onStart: () => {
          setIsListening(true);
          window.dispatchEvent(new CustomEvent('storycore:voice-state', { detail: { isListening: true } }));
        },
        onResult: (result) => {
          if (result.isFinal) {
            window.dispatchEvent(new CustomEvent('storycore:voice-ptt-result', { detail: result.transcript }));
          }
        },
        onError: (err) => {
          console.error(err);
          setIsListening(false);
          window.dispatchEvent(new CustomEvent('storycore:voice-state', { detail: { isListening: false } }));
          toast({ variant: 'destructive', title: 'Erreur Micro', description: err });
        },
        onEnd: () => {
          setIsListening(false);
          window.dispatchEvent(new CustomEvent('storycore:voice-state', { detail: { isListening: false } }));
        }
      });
    }
  };

  const handleEndCall = () => {
    const voiceService = VoiceTextService.getInstance();
    voiceService.stopListening();
    setIsListening(false);
    if (onEndCall) onEndCall();
  };

  return (
    <div
      className={cn(
        'flex flex-row items-center justify-center p-2 border shadow-lg bg-white/80 dark:bg-black/60 backdrop-blur-md rounded-[31px] gap-2 transition-all duration-300',
        isListening ? 'border-purple-500/50 shadow-purple-500/20' : 'border-slate-200 dark:border-slate-800',
        className
      )}
    >
      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-full p-1 items-center gap-1 transition-all">
        {/* Toggle Microphone */}
        <Button
          variant={isListening ? 'default' : 'ghost'}
          size="icon"
          className={cn(
            'rounded-full h-10 w-10 transition-colors',
            isListening ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          )}
          onClick={handleToggleMic}
          title={isListening ? 'Couper le micro' : 'Activer le micro'}
        >
          {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        {/* Visualizer (Only visible when mic is on) */}
        {isListening && (
          <div className="px-3">
            <AgentAudioVisualizer state="listening" size="sm" />
          </div>
        )}
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-full p-1 items-center gap-1">
        {/* Screen Capture */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          onClick={onScreenCapture}
          title="Partager / Capturer l'écran pour l'IA"
        >
          <MonitorUp className="w-5 h-5" />
        </Button>

        {/* Chat Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          onClick={onToggleChat}
          title="Ouvrir la zone de texte"
        >
          <MessageSquareText className="w-5 h-5" />
        </Button>
      </div>

      {/* Disconnect/End Button */}
      <Button
        variant="destructive"
        className="rounded-full h-10 px-4 font-mono text-xs font-bold tracking-wider bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
        onClick={handleEndCall}
      >
        <PowerOff className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">END CALL</span>
        <span className="inline sm:hidden">END</span>
      </Button>
    </div>
  );
}
