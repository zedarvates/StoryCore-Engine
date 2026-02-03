/**
 * Timeline Keyboard Shortcuts Hook
 * Keyboard shortcuts for timeline operations.
 */
import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setPlayheadPosition, setZoomLevel } from '../../store/slices/timelineSlice';
import type { Shot } from '../../types';

export const useTimelineKeyboard = (isFocused = true) => {
  const dispatch = useAppDispatch();
  const { shots, playheadPosition, zoomLevel } = useAppSelector(s => s.timeline);
  
  const duration = shots.reduce<number>((max: number, shot: Shot) => {
    const end = (shot.startTime || 0) + (shot.duration || 0);
    return Math.max(max, end);
  }, 0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isFocused) return;
    const isMod = e.ctrlKey || e.metaKey;
    
    switch (e.key) {
      case ' ':
        e.preventDefault();
        break; // Toggle play
      case 'ArrowLeft':
        e.preventDefault();
        dispatch(setPlayheadPosition(Math.max(0, playheadPosition - 1)));
        break;
      case 'ArrowRight':
        e.preventDefault();
        dispatch(setPlayheadPosition(Math.min(duration, playheadPosition + 1)));
        break;
      case 'Home':
        e.preventDefault();
        dispatch(setPlayheadPosition(0));
        break;
      case 'End':
        e.preventDefault();
        dispatch(setPlayheadPosition(duration));
        break;
      case '+':
      case '=':
        if (isMod) {
          e.preventDefault();
          dispatch(setZoomLevel(Math.min(500, zoomLevel + 10)));
        }
        break;
      case '-':
        if (isMod) {
          e.preventDefault();
          dispatch(setZoomLevel(Math.max(10, zoomLevel - 10)));
        }
        break;
      case '0':
        if (isMod) {
          e.preventDefault();
          dispatch(setZoomLevel(100));
        }
        break;
    }
  }, [dispatch, isFocused, playheadPosition, zoomLevel, duration]);

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

