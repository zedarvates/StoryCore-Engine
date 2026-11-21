import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './FrameComparisonView.css';

export interface FrameComparisonViewProps {
  videoUrl: string;
  frameRate: number;
  frame1: number;
  frame2: number;
  onClose?: () => void;
}

export const FrameComparisonView: React.FC<FrameComparisonViewProps> = ({
  videoUrl,
  frameRate,
  frame1: initialFrame1,
  frame2: initialFrame2,
  onClose
}) => {
  const [frame1, setFrame1] = useState(initialFrame1);
  const [frame2, setFrame2] = useState(initialFrame2);
  const [sliderPosition, setSliderPosition] = useState(50); // 0-100%
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'sidebyside'>('sidebyside');
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Convert frame to time
  const frameToTime = useCallback((frame: number): number => {
    return frame / frameRate;
  }, [frameRate]);

  // Format timecode
  const formatTimecode = useCallback((frame: number): string => {
    const totalSeconds = frame / frameRate;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const frames = frame % frameRate;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${Math.floor(frames).toString().padStart(2, '0')}`;
  }, [frameRate]);

  // Seek videos to frames
  useEffect(() => {
    if (video1Ref.current) {
      video1Ref.current.currentTime = frameToTime(frame1);
    }
  }, [frame1, frameToTime]);

  useEffect(() => {
    if (video2Ref.current) {
      video2Ref.current.currentTime = frameToTime(frame2);
    }
  }, [frame2, frameToTime]);

  // Handle slider drag
  const handleSliderDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderContainerRef.current) return;
    
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleSliderDrag(e);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!sliderContainerRef.current) return;
      
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleSliderDrag]);

  return (
    <div className="frame-comparison-view">
      <div className="frame-comparison-view__header">
        <h2>Comparaison de Frames</h2>
        <div className="frame-comparison-view__mode-toggle">
          <button
            className={comparisonMode === 'sidebyside' ? 'active' : ''}
            onClick={() => setComparisonMode('sidebyside')}
            title="Vue côte à côte"
          >
            ⬌
          </button>
          <button
            className={comparisonMode === 'slider' ? 'active' : ''}
            onClick={() => setComparisonMode('slider')}
            title="Vue avec slider"
          >
            ⬍⬌⬎
          </button>
        </div>
        {onClose && (
          <button className="frame-comparison-view__close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="frame-comparison-view__content">
        {comparisonMode === 'sidebyside' ? (
          <div className="frame-comparison-view__sidebyside">
            {/* Frame 1 */}
            <div className="frame-comparison-view__frame">
              <div className="frame-comparison-view__frame-header">
                <span>Frame {frame1}</span>
                <span className="frame-comparison-view__timecode">
                  {formatTimecode(frame1)}
                </span>
              </div>
              <div className="frame-comparison-view__video-container">
                <video
                  ref={video1Ref}
                  src={videoUrl}
                  className="frame-comparison-view__video"
                  preload="auto"
                />
              </div>
              <div className="frame-comparison-view__frame-controls">
                <button onClick={() => setFrame1(Math.max(0, frame1 - 1))}>
                  ←
                </button>
                <input
                  type="number"
                  value={frame1}
                  onChange={(e) => setFrame1(parseInt(e.target.value) || 0)}
                  min="0"
                />
                <button onClick={() => setFrame1(frame1 + 1)}>
                  →
                </button>
              </div>
            </div>

            {/* Frame 2 */}
            <div className="frame-comparison-view__frame">
              <div className="frame-comparison-view__frame-header">
                <span>Frame {frame2}</span>
                <span className="frame-comparison-view__timecode">
                  {formatTimecode(frame2)}
                </span>
              </div>
              <div className="frame-comparison-view__video-container">
                <video
                  ref={video2Ref}
                  src={videoUrl}
                  className="frame-comparison-view__video"
                  preload="auto"
                />
              </div>
              <div className="frame-comparison-view__frame-controls">
                <button onClick={() => setFrame2(Math.max(0, frame2 - 1))}>
                  ←
                </button>
                <input
                  type="number"
                  value={frame2}
                  onChange={(e) => setFrame2(parseInt(e.target.value) || 0)}
                  min="0"
                />
                <button onClick={() => setFrame2(frame2 + 1)}>
                  →
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="frame-comparison-view__slider-mode">
            <div
              ref={sliderContainerRef}
              className="frame-comparison-view__slider-container"
              onMouseDown={handleMouseDown}
            >
              {/* Frame 2 (background) */}
              <div className="frame-comparison-view__slider-background">
                <video
                  ref={video2Ref}
                  src={videoUrl}
                  className="frame-comparison-view__video"
                  preload="auto"
                />
                <div className="frame-comparison-view__slider-label frame-comparison-view__slider-label--right">
                  Frame {frame2} - {formatTimecode(frame2)}
                </div>
              </div>

              {/* Frame 1 (foreground with clip) */}
              <div
                className="frame-comparison-view__slider-foreground"
                style={{
                  clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
                }}
              >
                <video
                  ref={video1Ref}
                  src={videoUrl}
                  className="frame-comparison-view__video"
                  preload="auto"
                />
                <div className="frame-comparison-view__slider-label frame-comparison-view__slider-label--left">
                  Frame {frame1} - {formatTimecode(frame1)}
                </div>
              </div>

              {/* Slider Handle */}
              <div
                className="frame-comparison-view__slider-handle"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="frame-comparison-view__slider-line" />
                <div className="frame-comparison-view__slider-grip">
                  <span>⬌</span>
                </div>
              </div>
            </div>

            {/* Slider Mode Controls */}
            <div className="frame-comparison-view__slider-controls">
              <div className="frame-comparison-view__slider-control-group">
                <label>Frame 1:</label>
                <button onClick={() => setFrame1(Math.max(0, frame1 - 1))}>
                  ←
                </button>
                <input
                  type="number"
                  value={frame1}
                  onChange={(e) => setFrame1(parseInt(e.target.value) || 0)}
                  min="0"
                />
                <button onClick={() => setFrame1(frame1 + 1)}>
                  →
                </button>
              </div>
              <div className="frame-comparison-view__slider-control-group">
                <label>Frame 2:</label>
                <button onClick={() => setFrame2(Math.max(0, frame2 - 1))}>
                  ←
                </button>
                <input
                  type="number"
                  value={frame2}
                  onChange={(e) => setFrame2(parseInt(e.target.value) || 0)}
                  min="0"
                />
                <button onClick={() => setFrame2(frame2 + 1)}>
                  →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="frame-comparison-view__info">
        <div className="frame-comparison-view__info-item">
          <strong>Différence:</strong> {Math.abs(frame2 - frame1)} frames ({((Math.abs(frame2 - frame1) / frameRate)).toFixed(2)}s)
        </div>
        <div className="frame-comparison-view__info-item">
          <strong>Mode:</strong> {comparisonMode === 'sidebyside' ? 'Côte à côte' : 'Slider'}
        </div>
      </div>
    </div>
  );
};

export default FrameComparisonView;
