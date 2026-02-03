/**
 * ZoomSlider Component
 * 
 * Precision zoom control with slider for timeline zooming.
 * Provides smooth zoom experience with keyboard shortcuts support.
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import React, { useCallback, useState, useEffect } from 'react';

interface ZoomSliderProps {
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
}

export const ZoomSlider: React.FC<ZoomSliderProps> = ({
  zoomLevel,
  onZoomChange,
  minZoom = 1,
  maxZoom = 100,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [sliderValue, setSliderValue] = useState(zoomLevel);

  // Convert zoom level to percentage for display
  const zoomPercentage = Math.round(zoomLevel * 10);
  const minPercentage = minZoom * 10;
  const maxPercentage = maxZoom * 10;

  // Convert slider position to zoom level
  const positionToZoom = (position: number) => {
    const percentage = minPercentage + (position / 100) * (maxPercentage - minPercentage);
    return percentage / 10;
  };

  // Convert zoom level to slider position
  const zoomToPosition = (zoom: number) => {
    const percentage = zoom * 10;
    return ((percentage - minPercentage) / (maxPercentage - minPercentage)) * 100;
  };

  // Handle slider input change
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newZoom = positionToZoom(value);
    setSliderValue(newZoom);
    onZoomChange(newZoom);
  }, [onZoomChange]);

  // Handle zoom in button
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(maxZoom, zoomLevel * 1.25);
    onZoomChange(newZoom);
    setSliderValue(newZoom);
  }, [zoomLevel, maxZoom, onZoomChange]);

  // Handle zoom out button
  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(minZoom, zoomLevel / 1.25);
    onZoomChange(newZoom);
    setSliderValue(newZoom);
  }, [zoomLevel, minZoom, onZoomChange]);

  // Handle fit to window
  const handleFitToWindow = useCallback(() => {
    onZoomChange(10); // Default zoom level
  }, [onZoomChange]);

  // Update slider value when zoom level changes externally
  useEffect(() => {
    if (!isDragging) {
      setSliderValue(zoomLevel);
    }
  }, [zoomLevel, isDragging]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      handleZoomIn();
    } else if (e.key === '-') {
      e.preventDefault();
      handleZoomOut();
    } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleFitToWindow();
    }
  }, [handleZoomIn, handleZoomOut, handleFitToWindow]);

  return (
    <div 
      className="zoom-slider-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Timeline zoom"
      aria-valuenow={zoomPercentage}
      aria-valuemin={minPercentage}
      aria-valuemax={maxPercentage}
    >
      {/* Zoom out button */}
      <button
        className="zoom-btn zoom-out-btn"
        onClick={handleZoomOut}
        title="Zoom out (Ctrl/Cmd + -)"
        disabled={zoomLevel <= minZoom}
      >
        −
      </button>

      {/* Zoom percentage display */}
      <div className="zoom-percentage-display" title={`Zoom: ${zoomPercentage}%`}>
        {zoomPercentage}%
      </div>

      {/* Zoom slider track */}
      <div className="zoom-slider-track">
        <input
          type="range"
          className="zoom-slider-input"
          min="0"
          max="100"
          step="0.5"
          value={zoomToPosition(sliderValue)}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        />
        
        {/* Track fill */}
        <div 
          className="zoom-slider-track-fill"
          style={{ width: `${zoomToPosition(sliderValue)}%` }}
        />
        
        {/* Track markers */}
        <div className="zoom-slider-markers">
          {[0, 25, 50, 75, 100].map((pos) => (
            <div
              key={pos}
              className="zoom-slider-marker"
              style={{ left: `${pos}%` }}
            />
          ))}
        </div>
      </div>

      {/* Zoom in button */}
      <button
        className="zoom-btn zoom-in-btn"
        onClick={handleZoomIn}
        title="Zoom in (Ctrl/Cmd + +)"
        disabled={zoomLevel >= maxZoom}
      >
        +
      </button>

      {/* Fit to window button */}
      <button
        className="zoom-btn fit-btn"
        onClick={handleFitToWindow}
        title="Fit to window (Ctrl/Cmd + 0)"
      >
        ⊡
      </button>
    </div>
  );
};

export default ZoomSlider;

