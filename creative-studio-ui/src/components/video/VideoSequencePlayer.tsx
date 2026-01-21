import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoPlayer } from './VideoPlayer';
import type { Shot } from '@/types';

export interface VideoSequencePlayerProps {
  shots: Shot[];
  currentIndex: number;
  onShotChange?: (index: number) => void;
  seamlessTransition?: boolean;
  autoPlay?: boolean;
  className?: string;
}

interface PreloadedVideo {
  shotId: string;
  videoElement: HTMLVideoElement;
  isReady: boolean;
}

export const VideoSequencePlayer: React.FC<VideoSequencePlayerProps> = ({
  shots,
  currentIndex,
  onShotChange,
  seamlessTransition = true,
  autoPlay = false,
  className = '',
}) => {
  const [currentShotIndex, setCurrentShotIndex] = useState(currentIndex);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [preloadedVideos, setPreloadedVideos] = useState<Map<string, PreloadedVideo>>(new Map());
  const currentVideoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);

  // Get current and next shots
  const currentShot = shots[currentShotIndex];
  const nextShot = currentShotIndex < shots.length - 1 ? shots[currentShotIndex + 1] : null;

  // Preload next video
  const preloadNextVideo = useCallback(() => {
    if (!nextShot || !seamlessTransition) return;

    const videoUrl = nextShot.metadata?.videoUrl || nextShot.image;
    if (!videoUrl) return;

    // Check if already preloaded
    if (preloadedVideos.has(nextShot.id)) return;

    // Create video element for preloading
    const videoElement = document.createElement('video');
    videoElement.src = videoUrl;
    videoElement.preload = 'auto';

    const preloadedVideo: PreloadedVideo = {
      shotId: nextShot.id,
      videoElement,
      isReady: false,
    };

    // Listen for canplaythrough event
    videoElement.addEventListener('canplaythrough', () => {
      preloadedVideo.isReady = true;
      setPreloadedVideos((prev) => new Map(prev).set(nextShot.id, preloadedVideo));
    });

    // Start loading
    videoElement.load();

    setPreloadedVideos((prev) => new Map(prev).set(nextShot.id, preloadedVideo));
  }, [nextShot, seamlessTransition, preloadedVideos]);

  // Preload next video when current shot changes
  useEffect(() => {
    preloadNextVideo();
  }, [preloadNextVideo]);

  // Transition to next shot
  const transitionToShot = useCallback(
    (index: number) => {
      if (index < 0 || index >= shots.length) return;

      setCurrentShotIndex(index);
      onShotChange?.(index);

      // If playing, continue playing the next shot
      if (isPlaying && seamlessTransition) {
        // Small delay to ensure video is ready
        setTimeout(() => {
          if (currentVideoRef.current) {
            currentVideoRef.current.play().catch((err) => {
              console.error('Failed to play next video:', err);
            });
          }
        }, 50);
      }
    },
    [shots.length, onShotChange, isPlaying, seamlessTransition]
  );

  // Handle video ended
  const handleVideoEnded = useCallback(() => {
    if (currentShotIndex < shots.length - 1) {
      // Move to next shot
      transitionToShot(currentShotIndex + 1);
    } else {
      // End of sequence
      setIsPlaying(false);
    }
  }, [currentShotIndex, shots.length, transitionToShot]);

  // Sync current index from props
  useEffect(() => {
    if (currentIndex !== currentShotIndex) {
      setCurrentShotIndex(currentIndex);
    }
  }, [currentIndex, currentShotIndex]);

  // Synchronize audio between shots
  const synchronizeAudio = useCallback(() => {
    if (!currentVideoRef.current) return;

    // Get all audio tracks from current shot
    const audioTracks = currentShot?.audioTracks || [];

    // For each audio track, ensure it's synchronized with video playback
    audioTracks.forEach((track) => {
      // This is a placeholder for audio synchronization logic
      // In a real implementation, you would:
      // 1. Load audio files
      // 2. Sync their playback with video currentTime
      // 3. Handle volume, pan, and effects
      // 4. Ensure smooth transitions between shots
      ;
    });
  }, [currentShot]);

  // Synchronize audio when shot changes or playback state changes
  useEffect(() => {
    if (isPlaying) {
      synchronizeAudio();
    }
  }, [isPlaying, currentShotIndex, synchronizeAudio]);

  // Navigation controls
  const goToPreviousShot = useCallback(() => {
    if (currentShotIndex > 0) {
      transitionToShot(currentShotIndex - 1);
    }
  }, [currentShotIndex, transitionToShot]);

  const goToNextShot = useCallback(() => {
    if (currentShotIndex < shots.length - 1) {
      transitionToShot(currentShotIndex + 1);
    }
  }, [currentShotIndex, shots.length, transitionToShot]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          goToPreviousShot();
          break;
        case 'ArrowDown':
          e.preventDefault();
          goToNextShot();
          break;
        case 'PageUp':
          e.preventDefault();
          goToPreviousShot();
          break;
        case 'PageDown':
          e.preventDefault();
          goToNextShot();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousShot, goToNextShot]);

  // Cleanup preloaded videos
  useEffect(() => {
    return () => {
      preloadedVideos.forEach((preloaded) => {
        preloaded.videoElement.src = '';
        preloaded.videoElement.load();
      });
    };
  }, [preloadedVideos]);

  if (!currentShot) {
    return (
      <div className={`relative bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <div className="text-gray-600 text-6xl mb-4">🎬</div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Aucun plan disponible
          </h3>
          <p className="text-sm text-gray-400">
            La séquence ne contient aucun plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Video Player */}
      <VideoPlayer
        shot={currentShot}
        autoPlay={autoPlay}
        controls={true}
        onEnded={handleVideoEnded}
        className="w-full h-full"
      />

      {/* Sequence Navigation Overlay */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2 text-white text-sm">
          <span className="font-semibold">
            Plan {currentShotIndex + 1} / {shots.length}
          </span>
          {currentShot.title && (
            <>
              <span className="text-gray-400">-</span>
              <span className="text-gray-300">{currentShot.title}</span>
            </>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="absolute top-1/2 left-4 right-4 flex justify-between pointer-events-none">
        {currentShotIndex > 0 && (
          <button
            onClick={goToPreviousShot}
            className="pointer-events-auto p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-all"
            title="Plan précédent"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {currentShotIndex < shots.length - 1 && (
          <button
            onClick={goToNextShot}
            className="pointer-events-auto p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-all ml-auto"
            title="Plan suivant"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Preload indicator */}
      {seamlessTransition && nextShot && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 rounded-lg px-3 py-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            {preloadedVideos.get(nextShot.id)?.isReady ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Suivant prêt</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                <span>Chargement...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Shot Thumbnails Strip (optional) */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex gap-2 bg-black bg-opacity-70 rounded-lg p-2 max-w-full overflow-x-auto">
          {shots.map((shot, index) => (
            <button
              key={shot.id}
              onClick={() => transitionToShot(index)}
              className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                index === currentShotIndex
                  ? 'border-blue-500 scale-110'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
              title={shot.title}
            >
              {shot.image ? (
                <img
                  src={shot.image}
                  alt={shot.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
                  {index + 1}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoSequencePlayer;
