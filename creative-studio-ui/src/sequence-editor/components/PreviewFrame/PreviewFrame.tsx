/**
 * Preview Frame Component
 * 
 * Real-time video preview with playback controls and frame rendering.
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
import type { Shot, Layer, AudioTrack } from '../../types';
import './previewFrame.css';
import './previewDropTarget.css';
import './viewModeToggle.css';
import './sceneView3D.css';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_FPS = 24;
const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.5, 2];

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimecode(frames: number, fps: number = DEFAULT_FPS): string {
  const totalSeconds = Math.floor(frames / fps);
  const remainingFrames = Math.max(0, frames % fps);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${remainingFrames.toString().padStart(2, '0')}`;
}

function getFrameFromPosition(position: number, zoomLevel: number): number {
  return Math.floor(position / zoomLevel);
}

// ============================================================================
// Component
// ============================================================================

export const PreviewFrame: React.FC = () => {
  const dispatch = useAppDispatch();
  // useToast() not used here, but imported

  // Redux state
  const { playheadPosition, zoomLevel, duration, shots, selectedElements } = useAppSelector((state) => state.timeline);
  const { playbackState, playbackSpeed } = useAppSelector((state) => state.preview);
  const { settings } = useAppSelector((state) => state.project);

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('video');
  const [showSafeZones, setShowSafeZones] = useState(false);
  // View State (Zoom/Pan)
  const [zoom, setZoom] = useState(1);
  const [pan] = useState({ x: 0, y: 0 });
  const [cachedImageData, setCachedImageData] = useState<ImageData | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCacheRef = useRef<FrameCache | null>(null);

  // Derived Values
  const currentFrame = useMemo(() => getFrameFromPosition(playheadPosition, zoomLevel), [playheadPosition, zoomLevel]);
  const totalFrames = useMemo(() => Math.ceil(duration / zoomLevel), [duration, zoomLevel]);

  const currentShot = useMemo(() => {
    return shots.find((shot: Shot) =>
      playheadPosition >= shot.startTime * zoomLevel &&
      playheadPosition < (shot.startTime + shot.duration) * zoomLevel
    );
  }, [shots, playheadPosition, zoomLevel]);

  const activeDialogue = useMemo(() => {
    if (!currentShot?.audioTracks) return null;
    const shotStartFrames = (currentShot.startTime || 0) * zoomLevel;
    const shotRelativeFrame = currentFrame - (shotStartFrames / zoomLevel);
    const shotRelativeSeconds = shotRelativeFrame / (settings?.fps || DEFAULT_FPS);

    return currentShot.audioTracks.find((track: AudioTrack) => 
      track.type === 'dialogue' && 
      track.startTime !== undefined &&
      track.duration !== undefined &&
      shotRelativeSeconds >= track.startTime && 
      shotRelativeSeconds < (track.startTime + track.duration)
    );
  }, [currentShot, currentFrame, zoomLevel, settings?.fps]);

  const selectedLayer = useMemo(() => {
    if (selectedElements.length === 0) return null;
    const targetId = selectedElements[0];
    for (const shot of shots) {
      const layer = shot.layers.find((l: Layer) => l.id === targetId);
      if (layer) return layer;
    }
    return null;
  }, [shots, selectedElements]);

  const canvasWidth = settings?.resolution?.width || 1280;
  const canvasHeight = settings?.resolution?.height || 720;

  // Render logic
  const renderFunction = useMemo(() => {
    if (!canvasRef.current) return null;
    return createCanvasRenderFunction(
      canvasRef.current,
      shots as Shot[],
      zoomLevel,
      settings?.fps || DEFAULT_FPS
    );
  }, [shots, zoomLevel, settings?.fps]);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (cachedImageData) {
      ctx.putImageData(cachedImageData, 0, 0);
    } else {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (currentShot) {
        ctx.fillStyle = '#fff';
        ctx.font = '24px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(currentShot.title || currentShot.name || 'Shot Preview', canvas.width / 2, canvas.height / 2);
      }
    }

    if (showSafeZones) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.strokeRect(canvas.width * 0.1, canvas.height * 0.1, canvas.width * 0.8, canvas.height * 0.8);
    }
  }, [currentShot, showSafeZones, cachedImageData]);

  // Effects
  useEffect(() => {
    if (!frameCacheRef.current) {
      frameCacheRef.current = new FrameCache({ cacheRadius: 30, maxCacheSize: 100 });
    }
    return () => frameCacheRef.current?.clear();
  }, []);

  useEffect(() => {
    renderFrame();
  }, [currentFrame, renderFrame]);

  useEffect(() => {
    const frameCache = frameCacheRef.current;
    if (!frameCache || !renderFunction) return;
    frameCache.debouncedUpdate(currentFrame, playbackState === 'playing' ? 'low' : 'high', renderFunction, setCachedImageData);
  }, [currentFrame, playbackState, renderFunction]);

  // Playback Loop defined before use
  const playbackLoop = useCallback(function loop(timestamp: number) {
    if (playbackState !== 'playing') return;
    const fps = settings?.fps || DEFAULT_FPS;
    const frameInterval = 1000 / fps / (playbackSpeed || 1);
    
    if (!lastFrameTimeRef.current) {
      lastFrameTimeRef.current = timestamp;
    }

    const elapsed = timestamp - lastFrameTimeRef.current;

    if (elapsed >= frameInterval) {
      const framesToAdvance = Math.floor(elapsed / frameInterval);
      const newPos = playheadPosition + (framesToAdvance * zoomLevel);
      
      if (newPos >= duration * zoomLevel) {
        dispatch(setPlaybackState('stopped'));
        dispatch(setPlayheadPosition(0));
        lastFrameTimeRef.current = 0;
        return;
      }

      dispatch(setPlayheadPosition(newPos));
      lastFrameTimeRef.current = timestamp;
    }
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [playbackState, playheadPosition, zoomLevel, duration, playbackSpeed, settings, dispatch]);

  useEffect(() => {
    if (playbackState === 'playing') {
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(playbackLoop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [playbackState, playbackLoop]);

  // Sync preview scale and pan properties
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.setProperty('--preview-scale', zoom.toString());
      canvasRef.current.style.setProperty('--preview-pan-x', `${pan.x / zoom}px`);
      canvasRef.current.style.setProperty('--preview-pan-y', `${pan.y / zoom}px`);
    }
  }, [zoom, pan]);

  // Handlers
  const handlePlayPause = () => dispatch(setPlaybackState(playbackState === 'playing' ? 'paused' : 'playing'));
  const handleStop = () => { dispatch(setPlaybackState('stopped')); dispatch(setPlayheadPosition(0)); };
  const handleFrameStep = (dir: 'f' | 'b') => dispatch(setPlayheadPosition(Math.max(0, playheadPosition + (dir === 'f' ? zoomLevel : -zoomLevel))));
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setPlayheadPosition((parseFloat(e.target.value) / 100) * duration * zoomLevel));

  return (
    <PreviewDropTarget>
      <div className="preview-frame" ref={containerRef}>
        <ViewModeToggle currentMode={viewMode} onModeChange={setViewMode} />

        {viewMode === 'video' && (
          <div className="preview-canvas-container">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="preview-canvas"
            />
            {selectedLayer && currentShot && (
              <TransformOverlay shot={currentShot} layer={selectedLayer} canvasWidth={canvasWidth} canvasHeight={canvasHeight} zoom={zoom} pan={pan} />
            )}
            <div className="timecode-overlay">
              {formatTimecode(currentFrame, settings?.fps)} / {formatTimecode(totalFrames, settings?.fps)}
            </div>
            <button className={`safe-zone-btn ${showSafeZones ? 'active' : ''}`} onClick={() => setShowSafeZones(!showSafeZones)}>⬚</button>
          </div>
        )}

        {viewMode === '3d-scene' && (
          <div className="preview-canvas-container relative overflow-hidden">
            <SceneView3D 
              width={canvasWidth} 
              height={canvasHeight} 
              currentFrame={currentFrame} 
              activeDialogue={activeDialogue}
            />
          </div>
        )}

        <div className="playback-controls">
          <div className="time-slider-container">
            <input type="range" title="Seek" className="time-slider" min={0} max={100} step={0.1} value={duration > 0 ? (playheadPosition / (duration * zoomLevel)) * 100 : 0} onChange={handleSeek} />
          </div>
          <div className="control-buttons">
            <button className="control-btn" title="Back to Start" aria-label="Back to Start" onClick={() => dispatch(setPlayheadPosition(0))}>⏮</button>
            <button className="control-btn" title="Previous Frame" aria-label="Previous Frame" onClick={() => handleFrameStep('b')}>⏪</button>
            <button className="control-btn" title="Stop" aria-label="Stop" onClick={handleStop}>⏹</button>
            <button 
              className={`control-btn play-btn ${playbackState === 'playing' ? 'playing' : ''}`} 
              title={playbackState === 'playing' ? 'Pause' : 'Play'}
              aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}
              onClick={handlePlayPause}
            >
              {playbackState === 'playing' ? '⏸' : '▶️'}
            </button>
            <button className="control-btn" title="Next Frame" aria-label="Next Frame" onClick={() => handleFrameStep('f')}>⏩</button>
            <button className="control-btn" title="Skip to End" aria-label="Skip to End" onClick={() => dispatch(setPlayheadPosition(duration * zoomLevel))}>⏭</button>
          </div>
          <div className="right-controls">
            <select 
              className="speed-select" 
              title="Playback Speed"
              aria-label="Select Playback Speed"
              value={playbackSpeed} 
              onChange={(e) => dispatch(setPlaybackSpeed(parseFloat(e.target.value)))}
            >
              {PLAYBACK_SPEEDS.map(s => <option key={s} value={s}>{s}x</option>)}
            </select>
            <div className="zoom-controls">
              <button className="zoom-btn" title="Zoom Out" aria-label="Zoom Out" onClick={() => setZoom(z => Math.max(0.25, z / 1.2))}>−</button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button className="zoom-btn" title="Zoom In" aria-label="Zoom In" onClick={() => setZoom(z => Math.min(4, z * 1.2))}>+</button>
            </div>
            <button className="control-btn" title="Toggle Fullscreen" aria-label="Toggle Fullscreen" onClick={() => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); }}>⛶</button>
          </div>
        </div>
      </div>
    </PreviewDropTarget>
  );
};

export default PreviewFrame;
