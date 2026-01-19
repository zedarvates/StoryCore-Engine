import { useEffect, useRef } from 'react';
import { PlaybackEngine } from '../playback/PlaybackEngine';
import { useStore } from '../store';

export interface UsePlaybackEngineReturn {
  engine: PlaybackEngine | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * Hook to manage PlaybackEngine lifecycle and integration with store
 */
export const usePlaybackEngine = (): UsePlaybackEngineReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PlaybackEngine | null>(null);

  const shots = useStore((state) => state.shots);
  const isPlaying = useStore((state) => state.isPlaying);
  const currentTime = useStore((state) => state.currentTime);
  const playbackSpeed = useStore((state) => state.playbackSpeed);
  const setCurrentTime = useStore((state) => state.setCurrentTime);
  const play = useStore((state) => state.play);
  const pause = useStore((state) => state.pause);
  const _stop = useStore((state) => state.stop);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new PlaybackEngine(canvasRef.current);
    engineRef.current = engine;

    // Set up callbacks
    engine.onTime((time) => {
      setCurrentTime(time);
    });

    engine.onPlayState((playing) => {
      if (playing && !isPlaying) {
        play();
      } else if (!playing && isPlaying) {
        pause();
      }
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update shots when they change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setShots(shots);
      // Re-render current frame
      if (!isPlaying) {
        engineRef.current.seek(currentTime);
      }
    }
  }, [shots, isPlaying, currentTime]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!engineRef.current) return;

    if (isPlaying) {
      engineRef.current.play();
    } else {
      engineRef.current.pause();
    }
  }, [isPlaying]);

  // Handle seek
  useEffect(() => {
    if (!engineRef.current || isPlaying) return;
    engineRef.current.seek(currentTime);
  }, [currentTime, isPlaying]);

  // Handle playback speed changes
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setPlaybackSpeed(playbackSpeed);
  }, [playbackSpeed]);

  return {
    engine: engineRef.current,
    canvasRef,
  };
};
