/**
 * VoiceButton Component
 * 
 * A push-to-talk button for voice input.
 * Shows microphone state (idle, listening, error).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { voiceTextService } from '@/services/VoiceTextService';
import { soundService } from '@/services/SoundService';
import { useToast } from '@/hooks/use-toast';

interface VoiceButtonProps {
  onVoiceResult?: (transcript: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function VoiceButton({
  onVoiceResult,
  className,
  size = 'md',
  disabled = false,
}: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => voiceTextService.isSpeechRecognitionAvailable());
  const [isPressed, setIsPressed] = useState(false);
  const { toast } = useToast();

  // Listen for voice state changes from other sources
  useEffect(() => {
    const handleVoiceState = (event: CustomEvent<{ isListening: boolean }>) => {
      setIsListening(event.detail.isListening);
    };

    window.addEventListener('storycore:voice-state', handleVoiceState as EventListener);
    return () => {
      window.removeEventListener('storycore:voice-state', handleVoiceState as EventListener);
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || disabled || isListening) return;

    const settings = voiceTextService.getSettings();
    if (!settings.enabled) {
      toast({
        title: 'Voice désactivé',
        description: 'Activez la reconnaissance vocale dans les paramètres.',
        variant: 'default',
      });
      return;
    }

    soundService.play('mic-open');
    
    voiceTextService.startListening({
      onStart: () => setIsListening(true),
      onResult: (result) => {
        if (result.isFinal && onVoiceResult) {
          onVoiceResult(result.transcript);
        }
      },
      onError: (err) => {
        toast({
          title: 'Erreur vocale',
          description: err,
          variant: 'destructive',
        });
        setIsListening(false);
      },
      onEnd: () => setIsListening(false),
    });
  }, [disabled, isListening, isSupported, onVoiceResult, toast]);

  const stopListening = useCallback(() => {
    if (isListening) {
      soundService.play('mic-close');
      voiceTextService.stopListening();
    }
  }, [isListening]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Only handle primary button for MouseEvent
    if ('button' in e && e.button !== 0) return;
    
    e.preventDefault();
    if (disabled) return;
    setIsPressed(true);
    startListening();
  }, [disabled, startListening]);

  const handleMouseUp = useCallback(() => {
    if (isPressed) {
      setIsPressed(false);
      stopListening();
    }
  }, [isPressed, stopListening]);

  const sizeClasses = {
    sm: 'p-2 w-10 h-10',
    md: 'p-3 w-12 h-12',
    lg: 'p-4 w-16 h-16',
  };

  const iconSize = {
    sm: 18,
    md: 24,
    lg: 32,
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          'rounded-full bg-gray-800 text-gray-600 cursor-not-allowed',
          sizeClasses[size],
          className
        )}
        title="Reconnaissance vocale non supportée"
      >
        <MicOff size={iconSize[size]} />
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      {isListening && (
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20 pointer-events-none" />
      )}
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled}
        className={cn(
          'rounded-full transition-all duration-200 flex items-center justify-center relative z-10',
          isListening 
            ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-110' 
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white',
          isPressed && !disabled && 'scale-95 brightness-90',
          disabled && 'opacity-50 cursor-not-allowed grayscale',
          sizeClasses[size],
          className
        )}
        title={isListening ? 'À l\'écoute...' : 'Maintenir pour parler'}
      >
        {isListening ? (
          <div className="relative">
            <Mic size={iconSize[size]} />
            <div className="absolute -top-1 -right-1">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            </div>
          </div>
        ) : (
          <Mic size={iconSize[size]} />
        )}
      </button>
    </div>
  );
}
