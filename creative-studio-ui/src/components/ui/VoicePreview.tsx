import React, { useState, useRef, useCallback } from 'react';
import { Play, Pause, StopCircle, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// ============================================================================
// VoicePreview Component
// Prévisualisation audio des voix SAPI
// ============================================================================

interface VoicePreviewProps {
  voiceId: string;
  voiceName?: string;
  sampleText?: string;
  disabled?: boolean;
  className?: string;
}

export function VoicePreview({
  voiceId,
  voiceName,
  sampleText = "Bonjour, je suis la voix de prévisualisation.",
  disabled = false,
  className,
}: VoicePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const playPreview = useCallback(async () => {
    if (!voiceId) return;

    // Si déjà en cours de lecture, arrêter
    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsLoading(true);

    try {
      // Appel au service TTS pour générer l'audio
      const response = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId,
          text: sampleText,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération audio');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setAudioUrl(url);
      
      // Créer l'élément audio
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        console.error('Erreur de lecture audio');
      };

      audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Erreur de prévisualisation:', error);
      setIsLoading(false);
    }
  }, [voiceId, sampleText, isPlaying, stopAudio]);

  // Nettoyer l'URL audio lors du démontage
  React.useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={playPreview}
        disabled={!voiceId || disabled || isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            <span>Génération...</span>
          </>
        ) : isPlaying ? (
          <>
            <StopCircle className="h-4 w-4" />
            <span>Arrêter</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            <span>Écouter</span>
          </>
        )}
      </Button>

      {voiceName && (
        <span className="text-sm text-muted-foreground">
          {voiceName}
        </span>
      )}

      {audioUrl && (
        <audio ref={audioRef} className="hidden" src={audioUrl} />
      )}
    </div>
  );
}

// ============================================================================
// VoiceSelector Component
// Sélecteur de voix avec prévisualisation
// ============================================================================

interface Voice {
  id: string;
  name: string;
  gender?: string;
  language?: string;
  age?: string;
}

interface VoiceSelectorProps {
  voices: Voice[];
  value: string;
  onChange: (voiceId: string) => void;
  label?: string;
  required?: boolean;
  helpText?: string;
  className?: string;
}

export function VoiceSelector({
  voices,
  value,
  onChange,
  label = 'Voix SAPI',
  required = false,
  helpText,
  className,
}: VoiceSelectorProps) {
  const selectedVoice = voices.find(v => v.id === value);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <select
        id="voice-selector"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          'w-full px-3 py-2 rounded-lg border border-input bg-background',
          'text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        disabled={voices.length === 0}
      >
        <option value="">Sélectionnez une voix</option>
        {voices.map(voice => (
          <option key={voice.id} value={voice.id}>
            {voice.name} {voice.gender && `(${voice.gender})`} {voice.language && `- ${voice.language}`}
          </option>
        ))}
      </select>

      {helpText && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}

      {selectedVoice && (
        <VoicePreview
          voiceId={selectedVoice.id}
          voiceName={selectedVoice.name}
          disabled={!selectedVoice.id}
        />
      )}
    </div>
  );
}

// ============================================================================
// VoiceComparison Component
// Comparaison de plusieurs voix côte à côte
// ============================================================================

interface VoiceComparisonProps {
  voices: Voice[];
  sampleText?: string;
  className?: string;
}

export function VoiceComparison({
  voices,
  sampleText = "Bonjour, je suis la voix de prévisualisation.",
  className,
}: VoiceComparisonProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const playVoice = useCallback(async (voiceId: string) => {
    // Arrêter la voix en cours si différente
    if (playingId && playingId !== voiceId) {
      const currentAudio = audioRefs.current.get(playingId);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    // Si même voix, arrêter
    if (playingId === voiceId) {
      const audio = audioRefs.current.get(voiceId);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingId(null);
      return;
    }

    // Jouer la nouvelle voix
    try {
      setPlayingId(voiceId);
      
      const response = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text: sampleText }),
      });

      if (!response.ok) throw new Error('Erreur');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRefs.current.set(voiceId, audio);

      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setPlayingId(null);
      };

      audio.play();
    } catch (error) {
      console.error('Erreur:', error);
      setPlayingId(null);
    }
  }, [playingId, sampleText]);

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium text-foreground">Comparer les voix</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {voices.map(voice => (
          <Button
            key={voice.id}
            type="button"
            variant={playingId === voice.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => playVoice(voice.id)}
            className="justify-between"
          >
            <span>{voice.name}</span>
            {playingId === voice.id ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default VoicePreview;

