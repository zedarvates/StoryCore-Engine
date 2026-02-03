/**
 * Text and Subtitle Effects Utility
 * 
 * Handles text overlay tools, subtitle system, automatic subtitle generation,
 * and advanced text styling with animations.
 * 
 * Requirements: 2.4, 9.7, 14.1
 */

import type { Shot, Layer, TextLayerData } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface TextOverlayData {
  content: string;
  font: string;
  size: number;
  weight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  color: string;
  position: { x: number; y: number }; // 0 to 1 (percentage)
  alignment: 'left' | 'center' | 'right';
  verticalAlignment: 'top' | 'middle' | 'bottom';
  rotation: number; // Degrees
  opacity: number; // 0 to 1
  animation?: TextAnimation;
}

export interface TextAnimation {
  type: AnimationType;
  duration: number; // Frames
  delay: number; // Frames
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  loop: boolean;
}

export type AnimationType =
  | 'fade-in'
  | 'fade-out'
  | 'slide-in-left'
  | 'slide-in-right'
  | 'slide-in-top'
  | 'slide-in-bottom'
  | 'zoom-in'
  | 'zoom-out'
  | 'rotate-in'
  | 'bounce'
  | 'typewriter';

export interface AnimatedTitleTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  defaultText: string;
  animation: TextAnimation;
  style: TextStyleData;
}

export interface SubtitleData {
  id: string;
  startTime: number; // Frame number
  endTime: number; // Frame number
  text: string;
  style: SubtitleStyle;
  speaker?: string;
}

export interface SubtitleStyle {
  font: string;
  size: number;
  color: string;
  backgroundColor: string;
  backgroundOpacity: number;
  position: 'top' | 'middle' | 'bottom';
  alignment: 'left' | 'center' | 'right';
  outline: {
    enabled: boolean;
    color: string;
    width: number;
  };
  shadow: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface SubtitleImportOptions {
  format: 'srt' | 'vtt' | 'ass' | 'ssa';
  encoding: 'utf-8' | 'utf-16' | 'iso-8859-1';
  fps: number;
}

export interface SubtitleExportOptions {
  format: 'srt' | 'vtt' | 'ass' | 'ssa';
  includeFormatting: boolean;
  includeTimestamps: boolean;
}

export interface SpeechToTextOptions {
  language: string; // ISO 639-1 code (e.g., 'en', 'fr', 'es')
  model: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  punctuation: boolean;
  timestamps: boolean;
  speakerDiarization: boolean;
}

export interface SubtitleSyncOptions {
  method: 'manual' | 'automatic' | 'audio-sync';
  tolerance: number; // Frames
  adjustmentMode: 'shift' | 'stretch' | 'individual';
}

export interface TextStyleData {
  font: string;
  size: number;
  weight: TextOverlayData['weight'];
  color: string;
  stroke: {
    enabled: boolean;
    color: string;
    width: number;
  };
  shadow: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  background: {
    enabled: boolean;
    color: string;
    opacity: number;
    padding: number;
    borderRadius: number;
  };
}

export interface TextKeyframeAnimation {
  property: 'opacity' | 'position' | 'rotation' | 'scale';
  keyframes: TextKeyframe[];
}

export interface TextKeyframe {
  time: number; // Frame number
  value: number | { x: number; y: number };
  easing: string;
}

export interface KaraokeEffect {
  enabled: boolean;
  highlightColor: string;
  mode: 'word' | 'syllable' | 'character';
  timing: KaraokeTiming[];
}

export interface KaraokeTiming {
  text: string;
  startTime: number; // Frame number
  endTime: number; // Frame number
}

// ============================================================================
// Basic Text Tools (10C.1)
// ============================================================================

/**
 * Create text overlay layer
 */
export function createTextOverlay(
  shotId: string,
  playheadPosition: number,
  textData: TextOverlayData,
  shots: Shot[]
): { shotId: string; layer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const relativePosition = playheadPosition - shot.startTime;
  if (relativePosition < 0 || relativePosition >= shot.duration) {
    return null;
  }
  
  const textLayer: Layer = {
    id: `text-${Date.now()}`,
    type: 'text',
    startTime: relativePosition,
    duration: Math.min(60, shot.duration - relativePosition), // Default 2 seconds at 30fps
    locked: false,
    hidden: false,
    opacity: textData.opacity,
    blendMode: 'normal',
    data: {
      content: textData.content,
      font: textData.font,
      size: textData.size,
      color: textData.color,
      position: textData.position,
      animation: textData.animation,
    } as TextLayerData,
  };
  
  return {
    shotId,
    layer: textLayer,
  };
}

/**
 * Get animated title templates
 */
export function getAnimatedTitleTemplates(): AnimatedTitleTemplate[] {
  return [
    {
      id: 'fade-in-title',
      name: 'Fade In Title',
      description: 'Simple fade in animation',
      thumbnail: '/templates/fade-in.png',
      defaultText: 'Your Title Here',
      animation: {
        type: 'fade-in',
        duration: 30,
        delay: 0,
        easing: 'ease-in',
        loop: false,
      },
      style: {
        font: 'Arial',
        size: 72,
        weight: 'bold',
        color: '#FFFFFF',
        stroke: { enabled: true, color: '#000000', width: 2 },
        shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 2, offsetY: 2 },
        background: { enabled: false, color: '#000000', opacity: 0.5, padding: 10, borderRadius: 5 },
      },
    },
    {
      id: 'slide-in-left',
      name: 'Slide In from Left',
      description: 'Text slides in from the left side',
      thumbnail: '/templates/slide-left.png',
      defaultText: 'Your Title Here',
      animation: {
        type: 'slide-in-left',
        duration: 20,
        delay: 0,
        easing: 'ease-out',
        loop: false,
      },
      style: {
        font: 'Helvetica',
        size: 64,
        weight: '700',
        color: '#FFFF00',
        stroke: { enabled: true, color: '#000000', width: 3 },
        shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
        background: { enabled: false, color: '#000000', opacity: 0.5, padding: 10, borderRadius: 5 },
      },
    },
    {
      id: 'typewriter',
      name: 'Typewriter Effect',
      description: 'Text appears character by character',
      thumbnail: '/templates/typewriter.png',
      defaultText: 'Your Title Here',
      animation: {
        type: 'typewriter',
        duration: 60,
        delay: 0,
        easing: 'linear',
        loop: false,
      },
      style: {
        font: 'Courier New',
        size: 48,
        weight: 'normal',
        color: '#00FF00',
        stroke: { enabled: false, color: '#000000', width: 0 },
        shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
        background: { enabled: true, color: '#000000', opacity: 0.8, padding: 15, borderRadius: 0 },
      },
    },
    {
      id: 'bounce',
      name: 'Bounce In',
      description: 'Text bounces into view',
      thumbnail: '/templates/bounce.png',
      defaultText: 'Your Title Here',
      animation: {
        type: 'bounce',
        duration: 40,
        delay: 0,
        easing: 'ease-out',
        loop: false,
      },
      style: {
        font: 'Impact',
        size: 80,
        weight: 'bold',
        color: '#FF00FF',
        stroke: { enabled: true, color: '#FFFFFF', width: 4 },
        shadow: { enabled: true, color: '#000000', blur: 15, offsetX: 3, offsetY: 3 },
        background: { enabled: false, color: '#000000', opacity: 0.5, padding: 10, borderRadius: 5 },
      },
    },
  ];
}

/**
 * Apply animated title template
 */
export function applyAnimatedTitleTemplate(
  shotId: string,
  playheadPosition: number,
  template: AnimatedTitleTemplate,
  customText: string,
  shots: Shot[]
): { shotId: string; layer: Layer } | null {
  const textData: TextOverlayData = {
    content: customText || template.defaultText,
    font: template.style.font,
    size: template.style.size,
    weight: template.style.weight,
    color: template.style.color,
    position: { x: 0.5, y: 0.5 }, // Center
    alignment: 'center',
    verticalAlignment: 'middle',
    rotation: 0,
    opacity: 1,
    animation: template.animation,
  };
  
  return createTextOverlay(shotId, playheadPosition, textData, shots);
}

// ============================================================================
// Subtitle System (10C.2)
// ============================================================================

/**
 * Create subtitle entry
 */
export function createSubtitle(
  startTime: number,
  endTime: number,
  text: string,
  style?: SubtitleStyle
): SubtitleData {
  const defaultStyle: SubtitleStyle = {
    font: 'Arial',
    size: 32,
    color: '#FFFFFF',
    backgroundColor: '#000000',
    backgroundOpacity: 0.7,
    position: 'bottom',
    alignment: 'center',
    outline: {
      enabled: true,
      color: '#000000',
      width: 2,
    },
    shadow: {
      enabled: false,
      color: '#000000',
      blur: 0,
      offsetX: 0,
      offsetY: 0,
    },
  };
  
  return {
    id: `subtitle-${Date.now()}`,
    startTime,
    endTime,
    text,
    style: style || defaultStyle,
  };
}

/**
 * Import subtitles from file
 */
export function importSubtitles(
  fileContent: string,
  options: SubtitleImportOptions
): SubtitleData[] {
  const subtitles: SubtitleData[] = [];
  
  switch (options.format) {
    case 'srt':
      subtitles.push(...parseSRT(fileContent, options.fps));
      break;
    case 'vtt':
      subtitles.push(...parseVTT(fileContent, options.fps));
      break;
    case 'ass':
    case 'ssa':
      subtitles.push(...parseASS(fileContent, options.fps));
      break;
  }
  
  return subtitles;
}

/**
 * Parse SRT format
 */
function parseSRT(content: string, fps: number): SubtitleData[] {
  const subtitles: SubtitleData[] = [];
  const blocks = content.trim().split('\n\n');
  
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    
    // Parse timestamp line (e.g., "00:00:01,000 --> 00:00:03,000")
    const timestampMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!timestampMatch) continue;
    
    const startTime = timeToFrames(
      parseInt(timestampMatch[1]),
      parseInt(timestampMatch[2]),
      parseInt(timestampMatch[3]),
      parseInt(timestampMatch[4]),
      fps
    );
    
    const endTime = timeToFrames(
      parseInt(timestampMatch[5]),
      parseInt(timestampMatch[6]),
      parseInt(timestampMatch[7]),
      parseInt(timestampMatch[8]),
      fps
    );
    
    const text = lines.slice(2).join('\n');
    
    subtitles.push(createSubtitle(startTime, endTime, text));
  }
  
  return subtitles;
}

/**
 * Parse VTT format
 */
function parseVTT(content: string, fps: number): SubtitleData[] {
  // Remove WEBVTT header
  const cleanContent = content.replace(/^WEBVTT\s*\n/, '');
  return parseSRT(cleanContent, fps); // VTT is similar to SRT
}

/**
 * Parse ASS/SSA format
 */
function parseASS(content: string, fps: number): SubtitleData[] {
  const subtitles: SubtitleData[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (!line.startsWith('Dialogue:')) continue;
    
    const parts = line.split(',');
    if (parts.length < 10) continue;
    
    // Parse timestamps
    const startTime = assTimeToFrames(parts[1].trim(), fps);
    const endTime = assTimeToFrames(parts[2].trim(), fps);
    const text = parts.slice(9).join(',').replace(/\\N/g, '\n');
    
    subtitles.push(createSubtitle(startTime, endTime, text));
  }
  
  return subtitles;
}

/**
 * Export subtitles to file format
 */
export function exportSubtitles(
  subtitles: SubtitleData[],
  options: SubtitleExportOptions,
  fps: number
): string {
  switch (options.format) {
    case 'srt':
      return exportToSRT(subtitles, fps);
    case 'vtt':
      return exportToVTT(subtitles, fps);
    case 'ass':
      return exportToASS(subtitles, fps);
    default:
      return exportToSRT(subtitles, fps);
  }
}

/**
 * Export to SRT format
 */
function exportToSRT(subtitles: SubtitleData[], fps: number): string {
  let output = '';
  
  subtitles.forEach((subtitle, index) => {
    output += `${index + 1}\n`;
    output += `${framesToTime(subtitle.startTime, fps)} --> ${framesToTime(subtitle.endTime, fps)}\n`;
    output += `${subtitle.text}\n\n`;
  });
  
  return output;
}

/**
 * Export to VTT format
 */
function exportToVTT(subtitles: SubtitleData[], fps: number): string {
  let output = 'WEBVTT\n\n';
  output += exportToSRT(subtitles, fps);
  return output;
}

/**
 * Export to ASS format
 */
function exportToASS(subtitles: SubtitleData[], fps: number): string {
  let output = '[Script Info]\nTitle: Exported Subtitles\n\n[V4+ Styles]\n';
  output += 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
  output += 'Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\n\n';
  output += '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
  
  subtitles.forEach((subtitle) => {
    const start = framesToAssTime(subtitle.startTime, fps);
    const end = framesToAssTime(subtitle.endTime, fps);
    const text = subtitle.text.replace(/\n/g, '\\N');
    output += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
  });
  
  return output;
}

// ============================================================================
// Automatic Subtitle Generation (10C.3)
// ============================================================================

/**
 * Generate subtitles from audio using speech-to-text
 */
export async function generateAutomaticSubtitles(
  audioLayer: Layer,
  options: SpeechToTextOptions
): Promise<SubtitleData[]> {
  // In a real implementation, this would call a speech-to-text API
  // For now, return mock subtitles
  const mockSubtitles: SubtitleData[] = [
    createSubtitle(0, 60, 'This is an automatically generated subtitle.'),
    createSubtitle(70, 150, 'Speech-to-text technology converts audio to text.'),
    createSubtitle(160, 240, 'Multiple languages are supported.'),
  ];
  
  return mockSubtitles;
}

/**
 * Synchronize subtitles with audio
 */
export function synchronizeSubtitles(
  subtitles: SubtitleData[],
  audioLayer: Layer,
  options: SubtitleSyncOptions
): SubtitleData[] {
  switch (options.adjustmentMode) {
    case 'shift':
      // Shift all subtitles by a fixed amount
      return subtitles.map((sub) => ({
        ...sub,
        startTime: sub.startTime + options.tolerance,
        endTime: sub.endTime + options.tolerance,
      }));
    
    case 'stretch':
      // Stretch subtitle timing proportionally
      const totalDuration = audioLayer.duration;
      const lastSubtitle = subtitles[subtitles.length - 1];
      const currentDuration = lastSubtitle ? lastSubtitle.endTime : 0;
      const stretchFactor = totalDuration / currentDuration;
      
      return subtitles.map((sub) => ({
        ...sub,
        startTime: Math.round(sub.startTime * stretchFactor),
        endTime: Math.round(sub.endTime * stretchFactor),
      }));
    
    case 'individual':
      // Adjust each subtitle individually (would require audio analysis)
      return subtitles;
    
    default:
      return subtitles;
  }
}

// ============================================================================
// Advanced Text Styling (10C.4)
// ============================================================================

/**
 * Apply advanced text styling
 */
export function applyTextStyle(
  layerId: string,
  style: TextStyleData,
  shot: Shot
): Layer | null {
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'text');
  if (!layer) return null;
  
  const textData = layer.data as TextLayerData;
  
  return {
    ...layer,
    data: {
      ...textData,
      font: style.font,
      size: style.size,
      color: style.color,
      // Additional style properties would be stored here
    },
  };
}

/**
 * Create text keyframe animation
 */
export function createTextKeyframeAnimation(
  property: TextKeyframeAnimation['property'],
  keyframes: TextKeyframe[]
): TextKeyframeAnimation {
  return {
    property,
    keyframes: keyframes.sort((a, b) => a.time - b.time),
  };
}

/**
 * Apply karaoke effect to subtitle
 */
export function applyKaraokeEffect(
  subtitle: SubtitleData,
  karaokeEffect: KaraokeEffect
): SubtitleData {
  // Generate timing for each word/syllable/character
  const timing = generateKaraokeTiming(
    subtitle.text,
    subtitle.startTime,
    subtitle.endTime,
    karaokeEffect.mode
  );
  
  return {
    ...subtitle,
    // Karaoke effect would be stored in subtitle data
  };
}

/**
 * Generate karaoke timing
 */
function generateKaraokeTiming(
  text: string,
  startTime: number,
  endTime: number,
  mode: KaraokeEffect['mode']
): KaraokeTiming[] {
  const timing: KaraokeTiming[] = [];
  const duration = endTime - startTime;
  
  let segments: string[] = [];
  
  switch (mode) {
    case 'word':
      segments = text.split(' ');
      break;
    case 'syllable':
      // Simple syllable splitting (would need more sophisticated algorithm)
      segments = text.split(/(?=[aeiou])/i);
      break;
    case 'character':
      segments = text.split('');
      break;
  }
  
  const segmentDuration = duration / segments.length;
  
  segments.forEach((segment, index) => {
    timing.push({
      text: segment,
      startTime: startTime + index * segmentDuration,
      endTime: startTime + (index + 1) * segmentDuration,
    });
  });
  
  return timing;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert time to frames
 */
function timeToFrames(hours: number, minutes: number, seconds: number, milliseconds: number, fps: number): number {
  const totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  return Math.round(totalSeconds * fps);
}

/**
 * Convert frames to time string (SRT format)
 */
function framesToTime(frames: number, fps: number): string {
  const totalSeconds = frames / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);
  
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
}

/**
 * Convert ASS time to frames
 */
function assTimeToFrames(time: string, fps: number): number {
  const match = time.match(/(\d+):(\d+):(\d+)\.(\d+)/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);
  const centiseconds = parseInt(match[4]);
  
  return timeToFrames(hours, minutes, seconds, centiseconds * 10, fps);
}

/**
 * Convert frames to ASS time string
 */
function framesToAssTime(frames: number, fps: number): string {
  const totalSeconds = frames / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centiseconds = Math.floor((totalSeconds % 1) * 100);
  
  return `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(centiseconds, 2)}`;
}

/**
 * Pad number with leading zeros
 */
function pad(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}

/**
 * Get text bounds for positioning
 */
export function getTextBounds(
  text: string,
  font: string,
  size: number
): { width: number; height: number } {
  // In a real implementation, this would measure text using canvas
  // For now, return estimated bounds
  const avgCharWidth = size * 0.6;
  const width = text.length * avgCharWidth;
  const height = size * 1.2;
  
  return { width, height };
}

/**
 * Convert position percentage to pixels
 */
export function positionToPixels(
  position: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: position.x * canvasWidth,
    y: position.y * canvasHeight,
  };
}
