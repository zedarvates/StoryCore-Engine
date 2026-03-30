import type { LayerType, Shot, Layer } from '@/types';

/**
 * Track type configuration with colors and icons
 */
export const TRACK_CONFIG: Record<LayerType, { color: string; icon: string; height: number; name: string }> = {
  media: { color: '#4A90E2', icon: '🎬', height: 60, name: 'Media' },
  audio: { color: '#50C878', icon: '🔊', height: 40, name: 'Audio' },
  effects: { color: '#9B59B6', icon: '✨', height: 40, name: 'Effects' },
  transitions: { color: '#E67E22', icon: '↔️', height: 30, name: 'Transitions' },
  text: { color: '#F39C12', icon: '📝', height: 40, name: 'Text' },
  keyframes: { color: '#E74C3C', icon: '🔑', height: 30, name: 'Keyframes' },
};

/**
 * Layer type icons for canvas rendering
 */
export const LAYER_ICONS: Record<LayerType, string> = {
  media: '🎬',
  audio: '🔊',
  effects: '✨',
  transitions: '↔️',
  text: '📝',
  keyframes: '🔑',
};

/**
 * Format timecode from frame number
 */
export function formatTimecode(frame: number, fps: number = 24): string {
  const totalSeconds = Math.floor(frame / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const frames = frame % fps;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

/**
 * Get shots that have layers matching the specified track type
 */
export function getTrackShots(shots: Shot[], trackType: LayerType): Array<{ shot: Shot; layer: Layer }> {
  const result: Array<{ shot: Shot; layer: Layer }> = [];
  
  shots.forEach((shot) => {
    if (!shot.layers) return;
    
    shot.layers
      .filter((layer) => layer.type === trackType)
      .forEach((layer) => {
        result.push({ shot, layer });
      });
  });
  
  return result;
}

/**
 * Get layer index for stacking within a shot
 */
export function getLayerIndex(shot: Shot, trackType: LayerType, targetLayer: Layer): number {
  if (!shot.layers) return -1;
  
  return shot.layers
    .filter((l) => l.type === trackType)
    .indexOf(targetLayer);
}
