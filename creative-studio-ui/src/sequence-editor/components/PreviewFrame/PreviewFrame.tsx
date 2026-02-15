/**
 * Preview Frame Component
 * 
 * Real-time video preview with playback controls and frame rendering.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 15.6
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setPlayheadPosition } from '../../store/slices/timelineSlice';
import { setPlaybackState, setPlaybackSpeed } from '../../store/slices/previewSlice';
import { PreviewDropTarget } from './PreviewDropTarget';
import { ViewModeToggle, type ViewMode } from './ViewModeToggle';
import { SceneView3D } from './SceneView3D';
import { FrameCache, createCanvasRenderFunction } from './FrameCache';
import { TransformOverlay } from './TransformOverlay';
import type { PlaybackState, Shot, Layer } from '../../types';
import './previewFrame.css';
import './previewDropTarget.css';
import './viewModeToggle.css';
import './sceneView3D.css';

// ============================================================================
// Constants
// ============================================================================

const MIN_RESOLUTION = { width: 640, height: 360 };
const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.5, 2];
const DEFAULT_FPS = 24;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format frames to timecode (HH:MM:SS:FF)
 */
function formatTimecode(frames: number, fps: number = DEFAULT_FPS): string {
  const totalSeconds = Math.floor(frames / fps);
  const remainingFrames = frames % fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${remainingFrames.toString().padStart(2, '0')}`;
}

/**
 * Calculate frame from position
 */
function getFrameFromPosition(position: number, zoomLevel: number): number {
  return Math.floor(position / zoomLevel);
}

// ============================================================================
// Component
// ============================================================================

export const PreviewFrame: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const { playheadPosition, zoomLevel, duration, shots, selectedElements } = useAppSelector((state) => state.timeline);
  const { playbackState, playbackSpeed } = useAppSelector((state) => state.preview);
  const { settings } = useAppSelector((state) => state.project);

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('video');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cachedImageData, setCachedImageData] = useState<ImageData | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCacheRef = useRef<FrameCache | null>(null);

  // Calculate current frame
  const currentFrame = useMemo(() => {
    return getFrameFromPosition(playheadPosition, zoomLevel);
  }, [playheadPosition, zoomLevel]);

  // Get current shot for preview
  const currentShot = useMemo(() => {
    return shots.find((shot: Shot) =>
      playheadPosition >= shot.startTime * zoomLevel &&
      playheadPosition < (shot.startTime + shot.duration) * zoomLevel
    );
  }, [shots, playheadPosition, zoomLevel]);

  // Get selected layer for transform overlay
  const selectedLayer = useMemo(() => {
    if (selectedElements.length === 0) return null;
    const targetId = selectedElements[0];

    // Check if it's a layer ID within a shot
    for (const shot of shots) {
      const layer = shot.layers.find((l: Layer) => l.id === targetId);
      if (layer) return layer;
    }
    return null;
  }, [shots, selectedElements]);

  // Calculate total frames
  const totalFrames = useMemo(() => {
    return Math.ceil(duration / zoomLevel);
  }, [duration, zoomLevel]);

  // Canvas dimensions
  const canvasWidth = settings?.resolution?.width || 1280;
  const canvasHeight = settings?.resolution?.height || 720;
  const aspectRatio = canvasWidth / canvasHeight;

  // Initialize frame cache
  useEffect(() => {
    if (!frameCacheRef.current) {
      frameCacheRef.current = new FrameCache({
        cacheRadius: 30,
        maxCacheSize: 100,
        lowQualityScale: 0.5,
        debounceDelay: 100,
        renderTimeout: 200,
      });
    }

    return () => {
      frameCacheRef.current?.clear();
    };
  }, []);

  // Create render function
  const renderFunction = useMemo(() => {
    if (!canvasRef.current) return null;
    return createCanvasRenderFunction(
      canvasRef.current,
      shots,
      zoomLevel,
      settings?.fps || DEFAULT_FPS
    );
  }, [shots, zoomLevel, settings?.fps]);

  // Render frame to canvas
  const renderFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use cached image data if available
    if (cachedImageData) {
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw cached image data
      ctx.putImageData(cachedImageData, 0, 0);

      // Draw shot info overlay
      if (currentShot) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(currentShot.name, canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`Frame: ${frame} | Time: ${formatTimecode(frame)}`, canvas.width / 2, canvas.height / 2 + 20);
      }
    } else {
      // Fallback rendering (placeholder)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (currentShot) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(currentShot.name, canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`Frame: ${frame} | Time: ${formatTimecode(frame)}`, canvas.width / 2, canvas.height / 2 + 20);

        if (currentShot.prompt) {
          ctx.font = '14px sans-serif';
          const words = currentShot.prompt.split(' ');
          const lines: string[] = [];
          let currentLine = '';

          words.forEach((word: string) => {
            if ((currentLine + word).length < 50) {
              currentLine += word + ' ';
            } else {
              lines.push(currentLine);
              currentLine = word + ' ';
            }
          });
          if (currentLine) lines.push(currentLine);

          ctx.fillStyle = '#888888';
          ctx.textAlign = 'left';
          lines.slice(0, 3).forEach((line, i) => {
            ctx.fillText(line.trim(), 20, canvas.height - 60 + i * 20);
          });
        }
      } else {
        ctx.fillStyle = '#333333';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No shot at current position', canvas.width / 2, canvas.height / 2);
      }
    }

    // Draw safe zones if enabled
    if (showSafeZones) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;

      // Action safe (90%)
      const actionSafeMargin = 0.05;
      ctx.strokeRect(
        canvas.width * actionSafeMargin,
        canvas.height * actionSafeMargin,
        canvas.width * (1 - actionSafeMargin * 2),
        canvas.height * (1 - actionSafeMargin * 2)
      );

      // Title safe (80%)
      const titleSafeMargin = 0.1;
      ctx.strokeRect(
        canvas.width * titleSafeMargin,
        canvas.height * titleSafeMargin,
        canvas.width * (1 - titleSafeMargin * 2),
        canvas.height * (1 - titleSafeMargin * 2)
      );

      // Center cross
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 20, canvas.height / 2);
      ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, canvas.height / 2 - 20);
      ctx.lineTo(canvas.width / 2, canvas.height / 2 + 20);
      ctx.stroke();
    }
  }, [currentShot, showSafeZones, cachedImageData]);

  // Render frame when playhead changes
  useEffect(() => {
    renderFrame(currentFrame);
  }, [currentFrame, renderFrame]);

  // Update cached frame with debouncing and adaptive quality
  useEffect(() => {
    const frameCache = frameCacheRef.current;
    const renderFn = renderFunction;

    if (!frameCache || !renderFn) return;

    // Determine quality based on playback state
    const quality = playbackState === 'playing' ? 'low' : 'high';

    // Debounced update for current frame
    frameCache.debouncedUpdate(currentFrame, quality, renderFn, (imageData) => {
      setCachedImageData(imageData);
    });

    // Preload frames around current position when paused
    if (playbackState === 'paused' || playbackState === 'stopped') {
      frameCache.preloadFrames(currentFrame, 'high', renderFn);
    }
  }, [currentFrame, playbackState, renderFunction]);

  // Invalidate cache when shots change
  useEffect(() => {
    const frameCache = frameCacheRef.current;
    if (frameCache) {
      frameCache.invalidateAll();
      setCachedImageData(null);
    }
  }, [shots]);

  // Playback loop
  const playbackLoop = useCallback((timestamp: number) => {
    if (playbackState !== 'playing') return;

    const fps = settings?.fps || DEFAULT_FPS;
    const frameInterval = 1000 / fps;
    const elapsed = timestamp - lastFrameTimeRef.current;

    if (elapsed >= frameInterval) {
      const framesToAdvance = Math.floor(elapsed / frameInterval);
      const newPosition = playheadPosition + framesToAdvance * zoomLevel * playbackSpeed;

      if (newPosition >= duration * zoomLevel) {
        // Loop or stop at end
        dispatch(setPlayheadPosition(0));
        dispatch(setPlaybackState('stopped'));
        return;
      }

      dispatch(setPlayheadPosition(newPosition));
      lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);
    }

    animationFrameRef.current = requestAnimationFrame(playbackLoop);
  }, [playbackState, playheadPosition, zoomLevel, duration, playbackSpeed, settings, dispatch]);

  // Start/stop playback
  useEffect(() => {
    if (playbackState === 'playing') {
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(playbackLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playbackState, playbackLoop]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    const newState: PlaybackState = playbackState === 'playing' ? 'paused' : 'playing';
    dispatch(setPlaybackState(newState));
  }, [playbackState, dispatch]);

  const handleStop = useCallback(() => {
    dispatch(setPlaybackState('stopped'));
    dispatch(setPlayheadPosition(0));
  }, [dispatch]);

  const handleFrameStep = useCallback((direction: 'forward' | 'backward') => {
    const frameAdvance = direction === 'forward' ? zoomLevel : -zoomLevel;
    dispatch(setPlayheadPosition(Math.max(0, playheadPosition + frameAdvance)));
  }, [dispatch, playheadPosition, zoomLevel]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseFloat(e.target.value);
    const newPosition = (progress / 100) * duration * zoomLevel;
    dispatch(setPlayheadPosition(newPosition));
  }, [dispatch, duration, zoomLevel]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.25, 0.25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click for pan
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'KeyK':
        case 'KeyJ':
          if (e.shiftKey) {
            // Reverse playback
            handlePlayPause();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleFrameStep('backward');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleFrameStep('forward');
          break;
        case 'Home':
          e.preventDefault();
          dispatch(setPlayheadPosition(0));
          break;
        case 'End':
          e.preventDefault();
          dispatch(setPlayheadPosition(duration * zoomLevel));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleFrameStep, dispatch, duration, zoomLevel]);

  // Calculate canvas display size
  const containerWidth = 640;
  const containerHeight = 360;

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // Handle puppet update from 3D scene
  const handlePuppetUpdate = useCallback((puppetData: unknown) => {
    // TODO: Update shot configuration with puppet data
    console.log('Puppet updated:', puppetData);
  }, []);

  return (
    <PreviewDropTarget>
      <div className="preview-frame" ref={containerRef}>
        {/* View Mode Toggle */}
        <ViewModeToggle
          currentMode={viewMode}
          onModeChange={handleViewModeChange}
        />

        {/* Canvas Container - Video Preview Mode */}
        {viewMode === 'video' && (
          <>
            <div
              className="preview-canvas-container"
              style={{
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="preview-canvas"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                }}
              />

              {/* Transform Overlay for selected layer */}
              {selectedLayer && currentShot && (
                <div
                  className="transform-overlay-container"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    pointerEvents: 'none',
                    transformOrigin: '0 0'
                  }}
                >
                  <TransformOverlay
                    shot={currentShot}
                    layer={selectedLayer}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    zoom={zoom}
                    pan={pan}
                  />
                </div>
              )}

              {/* Timecode Overlay */}
              <div className="timecode-overlay">
                <span className="current-timecode">{formatTimecode(currentFrame)}</span>
                <span className="separator">/</span>
                <span className="total-timecode">{formatTimecode(totalFrames)}</span>
              </div>

              {/* Safe Zones Toggle */}
              <button
                className={`safe-zone-btn ${showSafeZones ? 'active' : ''}`}
                onClick={() => setShowSafeZones(!showSafeZones)}
                title="Toggle safe zones"
              >
                ⬚
              </button>
            </div>
          </>
        )}

        {/* 3D Scene View Mode */}
        {viewMode === '3d-scene' && (
          <div className="preview-canvas-container">
            <SceneView3D
              width={canvasWidth}
              height={canvasHeight}
              currentFrame={currentFrame}
              onPuppetUpdate={handlePuppetUpdate}
            />
          </div>
        )}

        {/* Playback Controls */}
        <div className="playback-controls">
          {/* Time Slider */}
          <div className="time-slider-container">
            <input
              type="range"
              className="time-slider"
              min={0}
              max={100}
              step={0.1}
              value={duration > 0 ? (playheadPosition / (duration * zoomLevel)) * 100 : 0}
              onChange={handleSeek}
            />
          </div>

          {/* Control Buttons */}
          <div className="control-buttons">
            {/* Skip to start */}
            <button
              className="control-btn"
              onClick={() => dispatch(setPlayheadPosition(0))}
              title="Go to start (Home)"
            >
              ⏮
            </button>

            {/* Frame back */}
            <button
              className="control-btn"
              onClick={() => handleFrameStep('backward')}
              title="Previous frame (←)"
            >
              ⏪
            </button>

            {/* Stop */}
            <button
              className="control-btn"
              onClick={handleStop}
              title="Stop (K)"
            >
              ⏹
            </button>

            {/* Play/Pause */}
            <button
              className={`control-btn play-btn ${playbackState === 'playing' ? 'playing' : ''}`}
              onClick={handlePlayPause}
              title="Play/Pause (Space)"
            >
              {playbackState === 'playing' ? '⏸' : '▶️'}
            </button>

            {/* Frame forward */}
            <button
              className="control-btn"
              onClick={() => handleFrameStep('forward')}
              title="Next frame (→)"
            >
              ⏩
            </button>

            {/* Skip to end */}
            <button
              className="control-btn"
              onClick={() => dispatch(setPlayheadPosition(duration * zoomLevel))}
              title="Go to end (End)"
            >
              ⏭
            </button>
          </div>

          {/* Right Controls */}
          <div className="right-controls">
            {/* Playback Speed */}
            <select
              className="speed-select"
              value={playbackSpeed}
              onChange={(e) => dispatch(setPlaybackSpeed(parseFloat(e.target.value)))}
            >
              {PLAYBACK_SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>

            {/* Zoom Controls */}
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={handleZoomOut} title="Zoom out">−</button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button className="zoom-btn" onClick={handleZoomIn} title="Zoom in">+</button>
              <button className="zoom-btn" onClick={handleZoomReset} title="Reset zoom">⟲</button>
            </div>

            {/* Fullscreen */}
            <button
              className="control-btn fullscreen-btn"
              onClick={toggleFullscreen}
              title="Toggle fullscreen"
            >
              {isFullscreen ? '⛶' : '⛶'}
            </button>
          </div>
        </div>
      </div>
    </PreviewDropTarget>
  );
};

export default PreviewFrame;


