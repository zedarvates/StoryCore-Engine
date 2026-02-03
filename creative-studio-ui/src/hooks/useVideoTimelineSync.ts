/**
 * useVideoTimelineSync Hook - React hook for timeline-video synchronization
 * 
 * Provides easy access to VideoTimelineSyncService functionality
 * with React state integration.
 * 
 * @module hooks/useVideoTimelineSync
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { VideoTimelineSyncService, VideoTimelineSyncConfig, TimelineSyncState } from '../services/video/VideoTimelineSyncService';
import { VideoPlayerService } from '../services/video/VideoPlayerService';

// ============================================
// Hook Return Type
// ============================================

export interface UseVideoTimelineSyncReturn {
  // State
  syncState: TimelineSyncState;
  timelinePosition: number;
  videoPosition: number;
  isSynced: boolean;
  isScrubbing: boolean;
  drift: number;
  
  // Controls
  setTimelinePosition: (position: number) => void;
  connectToTimeline: (element: HTMLElement) => void;
  disconnectFromTimeline: () => void;
  
  // Configuration
  setEnabled: (enabled: boolean) => void;
  setSyncDirections: (config: { videoToTimeline?: boolean; timelineToVideo?: boolean }) => void;
  updateConfig: (config: Partial<VideoTimelineSyncConfig>) => void;
  
  // Service
  service: VideoTimelineSyncService | null;
}

// ============================================
// Hook
// ============================================

export function useVideoTimelineSync(
  videoService: VideoPlayerService | null,
  config?: Partial<VideoTimelineSyncConfig>
): UseVideoTimelineSyncReturn {
  // Service reference
  const serviceRef = useRef<VideoTimelineSyncService | null>(null);
  
  // State
  const [syncState, setSyncState] = useState<TimelineSyncState>({
    timelinePosition: 0,
    videoPosition: 0,
    isSynced: true,
    lastSyncTime: 0,
    drift: 0,
    isScrubbing: false,
    isEnabled: true,
  });
  
  // Timeline element reference
  const timelineRef = useRef<HTMLElement | null>(null);
  
  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new VideoTimelineSyncService(config);
    }
    
    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
      }
    };
  }, [config]);
  
  // Connect to video service
  useEffect(() => {
    const service = serviceRef.current;
    if (!service) return;
    
    if (videoService) {
      service.connectToVideoService(videoService);
    } else {
      service.disconnectFromVideoService();
    }
  }, [videoService]);
  
  // Set up state sync
  useEffect(() => {
    const service = serviceRef.current;
    if (!service) return;
    
    // Poll for state changes (or use event-based updates if available)
    const interval = setInterval(() => {
      setSyncState(service.getState());
    }, 50); // 20 updates per second
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  // Get service
  const service = serviceRef.current;
  
  // Computed values
  const timelinePosition = syncState.timelinePosition;
  const videoPosition = syncState.videoPosition;
  const isSynced = syncState.isSynced;
  const isScrubbing = syncState.isScrubbing;
  const drift = syncState.drift;
  
  // Control functions
  const setTimelinePosition = useCallback((position: number) => {
    service?.setTimelinePosition(position);
  }, [service]);
  
  const connectToTimeline = useCallback((element: HTMLElement) => {
    timelineRef.current = element;
    service?.connectToTimeline(element);
  }, [service]);
  
  const disconnectFromTimeline = useCallback(() => {
    if (timelineRef.current) {
      service?.disconnectFromTimeline();
      timelineRef.current = null;
    }
  }, [service]);
  
  const setEnabled = useCallback((enabled: boolean) => {
    service?.setEnabled(enabled);
  }, [service]);
  
  const setSyncDirections = useCallback((config: { videoToTimeline?: boolean; timelineToVideo?: boolean }) => {
    service?.setSyncDirections(config);
  }, [service]);
  
  const updateConfig = useCallback((newConfig: Partial<VideoTimelineSyncConfig>) => {
    service?.updateConfig(newConfig);
  }, [service]);
  
  return {
    // State
    syncState,
    timelinePosition,
    videoPosition,
    isSynced,
    isScrubbing,
    drift,
    
    // Controls
    setTimelinePosition,
    connectToTimeline,
    disconnectFromTimeline,
    
    // Configuration
    setEnabled,
    setSyncDirections,
    updateConfig,
    
    // Service
    service,
  };
}

// ============================================
// Shorthand Hook
// ============================================

/**
 * Hook for timeline-video sync with default configuration
 */
export function useTimelineSync(videoService: VideoPlayerService | null) {
  return useVideoTimelineSync(videoService);
}

