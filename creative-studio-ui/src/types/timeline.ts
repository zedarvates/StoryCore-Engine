export interface VolumeKeyframe {
  id: string;
  time: number; // in seconds
  volume: number; // 0-1
  curveType?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'text' | 'image';
  startTime: number;
  duration: number;
  mediaId: string;
  effects?: string[];
}

export interface TimelineState {
  tracks: TimelineTrack[];
  currentTime: number;
  isPlaying: boolean;
  zoomLevel: number;
}