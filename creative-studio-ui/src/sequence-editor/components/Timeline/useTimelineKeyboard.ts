/**
 * Timeline Keyboard Shortcuts Hook
 * Keyboard shortcuts for timeline operations.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setPlayheadPosition, setZoomLevel, setIsPlaying } from '../../store/slices/timelineSlice';
import type { Shot } from '../../types';

export const useTimelineKeyboard = (isFocused = true) => {
  const dispatch = useAppDispatch();
  const { shots, playheadPosition, zoomLevel, isPlaying } = useAppSelector(s => s.timeline);
  
  const duration = shots.reduce<number>((max: number, shot: Shot) => {
    const end = (shot.startTime || 0) + (shot.duration || 0);
    return Math.max(max, end);
  }, 0);

  // Stable refs for values needed in global listener
  const isFocusedRef = useRef(isFocused);
  const playheadPositionRef = useRef(playheadPosition);
  const zoomLevelRef = useRef(zoomLevel);
  const durationRef = useRef(duration);

  const isPlayingRef = useRef(isPlaying);

  // Keep refs in sync
  useEffect(() => {
    isFocusedRef.current = isFocused;
    playheadPositionRef.current = playheadPosition;
    zoomLevelRef.current = zoomLevel;
    durationRef.current = duration;
    isPlayingRef.current = isPlaying;
  }, [isFocused, playheadPosition, zoomLevel, duration, isPlaying]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isFocusedRef.current) return;
    const isMod = e.ctrlKey || e.metaKey;
    
    // Ignore if focus is in an input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    switch (e.key) {
      case ' ':
        e.preventDefault();
        dispatch(setIsPlaying(!isPlayingRef.current));
        break;
      case 'j':
      case 'J':
        e.preventDefault();
        dispatch(setPlayheadPosition(Math.max(0, playheadPositionRef.current - 24)));
        break;
      case 'k':
      case 'K':
        e.preventDefault();
        // Stop playback
        break;
      case 'l':
      case 'L':
        e.preventDefault();
        // Play forward
        break;
      case 'ArrowLeft':
        e.preventDefault();
        dispatch(setPlayheadPosition(Math.max(0, playheadPositionRef.current - 1)));
        break;
      case 'ArrowRight':
        e.preventDefault();
        dispatch(setPlayheadPosition(Math.min(durationRef.current, playheadPositionRef.current + 1)));
        break;
      case 'Home':
        e.preventDefault();
        dispatch(setPlayheadPosition(0));
        break;
      case 'End':
        e.preventDefault();
        dispatch(setPlayheadPosition(durationRef.current));
        break;
      case '+':
      case '=':
        if (isMod) {
          e.preventDefault();
          dispatch(setZoomLevel(Math.min(500, zoomLevelRef.current + 10)));
        }
        break;
      case '-':
        if (isMod) {
          e.preventDefault();
          dispatch(setZoomLevel(Math.max(10, zoomLevelRef.current - 10)));
        }
        break;
      case '0':
        if (isMod) {
          e.preventDefault();
          dispatch(setZoomLevel(100));
        }
        break;
    }
  }, [dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: {
      play: 'Space', stop: 'K', stepBack: '←', stepForward: '→',
      start: 'Home', end: 'End', zoomIn: 'Ctrl++', zoomOut: 'Ctrl+-', zoomReset: 'Ctrl+0'
    }
  };
};

export default useTimelineKeyboard;

