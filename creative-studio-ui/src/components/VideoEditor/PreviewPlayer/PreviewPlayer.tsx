/**
 * Preview Player Component
 * Video preview with playback controls
 */

import React, { useRef, useEffect, useCallback, forwardRef } from 'react';
import './PreviewPlayer.css';

interface PreviewPlayerProps {
  src?: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  poster?: string;
}

export const PreviewPlayer = forwardRef<HTMLVideoElement, PreviewPlayerProps>(
  ({ src, currentTime, onTimeUpdate, onDurationChange, poster }, ref) => {
    const internalRef = useRef<HTMLVideoElement>(null);
    const combinedRef = (ref as React.MutableRefObject<HTMLVideoElement>) || internalRef;

    useEffect(() => {
      const video = combinedRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        onTimeUpdate(video.currentTime);
      };

      const handleLoadedMetadata = () => {
        onDurationChange(video.duration);
      };

      const handleEnded = () => {
        onTimeUpdate(0);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('ended', handleEnded);
      };
    }, [combinedRef, onTimeUpdate, onDurationChange]);

    useEffect(() => {
      const video = combinedRef.current;
      if (!video) return;

      if (Math.abs(video.currentTime - currentTime) > 0.1) {
        video.currentTime = currentTime;
      }
    }, [currentTime, combinedRef]);

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="preview-player">
        <video
          ref={combinedRef}
          className="preview-video"
          src={src}
          poster={poster}
          playsInline
        />
        {!src && (
          <div className="preview-placeholder">
            <div className="placeholder-icon">🎬</div>
            <p>No media selected</p>
          </div>
        )}
      </div>
    );
  }
);

PreviewPlayer.displayName = 'PreviewPlayer';

export default PreviewPlayer;

