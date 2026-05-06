/**
 * TrackDivider — Separateur video/audio draggable
 * Inspiré de LTX-Desktop, permet de redimensionner la zone video vs audio
 */
import React, { useCallback, useRef, useState, useEffect } from 'react';

interface TrackDividerProps {
  videoHeight: number;
  audioHeight: number;
  onVideoHeightChange: (height: number) => void;
  onAudioHeightChange: (height: number) => void;
  minVideoHeight?: number;
  minAudioHeight?: number;
}

export const TrackDivider: React.FC<TrackDividerProps> = ({
  videoHeight,
  audioHeight,
  onVideoHeightChange,
  onAudioHeightChange,
  minVideoHeight = 60,
  minAudioHeight = 30,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startVideoHeightRef = useRef(videoHeight);
  const totalHeight = videoHeight + audioHeight;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startVideoHeightRef.current = videoHeight;
  }, [videoHeight]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const newVideoHeight = Math.max(
        minVideoHeight,
        Math.min(totalHeight - minAudioHeight, startVideoHeightRef.current + deltaY)
      );
      const newAudioHeight = totalHeight - newVideoHeight;
      if (newAudioHeight >= minAudioHeight) {
        onVideoHeightChange(newVideoHeight);
        onAudioHeightChange(newAudioHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, totalHeight, minVideoHeight, minAudioHeight, onVideoHeightChange, onAudioHeightChange]);

  return (
    <div
      className={`track-divider ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      title="Faire glisser pour ajuster la hauteur video/audio"
    />
  );
};

export default TrackDivider;
