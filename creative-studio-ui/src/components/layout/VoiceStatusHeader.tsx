import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Settings, Keyboard } from 'lucide-react';
import { voiceTextService, type VoiceSettings } from '@/services/VoiceTextService';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';

export function VoiceStatusHeader() {
  const [settings, setSettings] = useState<VoiceSettings>(() => voiceTextService.getSettings());
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const setShowGeneralSettings = useAppStore((state) => state.setShowGeneralSettings);

  useEffect(() => {
    // Listen for voice state changes
    const handleVoiceState = (event: Event) => {
      const customEvent = event as CustomEvent<{ isListening: boolean }>;
      setIsListening(customEvent.detail.isListening);
    };

    // We can also poll for the current settings if they change elsewhere
    const interval = setInterval(() => {
      const current = voiceTextService.getSettings();
      setSettings(current);
    }, 1000);

    window.addEventListener('storycore:voice-state', handleVoiceState as EventListener);
    return () => {
      window.removeEventListener('storycore:voice-state', handleVoiceState as EventListener);
      clearInterval(interval);
    };
  }, []);

  // Mock volume level for visualization when listening
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isListening) {
      interval = setInterval(() => {
        setVolume(voiceTextService.getVolumeLevel());
      }, 50);
    } else {
      const timeout = setTimeout(() => {
        setVolume(0);
      }, 0);
      return () => clearTimeout(timeout);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening]);

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 group hover:border-primary/30 transition-all">
      {/* Icon and Status */}
      <div className="relative">
        {isListening ? (
          <Mic className="w-4 h-4 text-primary animate-pulse" />
        ) : (
          <MicOff className="w-4 h-4 text-muted-foreground" />
        )}
        {isListening && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        )}
      </div>

      {/* Mode Indicator */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {settings.inputMode === 'push-to-talk' ? 'PTT' : 'Activity'}
          </span>
          {settings.inputMode === 'push-to-talk' && (
            <div className="flex items-center gap-0.5 px-1 rounded bg-muted border border-border text-[9px] font-mono">
              <Keyboard className="w-2.5 h-2.5" />
              {settings.pttKeybind.replace('Key', '')}
            </div>
          )}
        </div>
        
        {/* Level Meter */}
        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden mt-0.5">
          <div 
            className={cn(
              "h-full transition-all duration-100",
              isListening ? "bg-primary" : "bg-muted-foreground/30"
            )}
            style={{ width: `${volume}%` }}
          />
        </div>
      </div>

      {/* Quick Action */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="w-6 h-6 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
        onClick={() => setShowGeneralSettings(true)}
        title="Voice Settings"
      >
        <Settings className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
