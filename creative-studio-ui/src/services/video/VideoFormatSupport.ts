/**
 * VideoFormatSupport - Video format detection and validation
 * 
 * Provides format and codec detection for video files
 */

export interface SupportedFormat {
  mimeType: string;
  extensions: string[];
  codecs: string[];
  isSupported: boolean;
  notes?: string;
}

export interface DetectedFormat {
  mimeType: string;
  codec: string;
  isSupported: boolean;
  warnings: string[];
  recommendations: string[];
}

export interface FormatCapabilities {
  supportedFormats: SupportedFormat[];
  maxResolution: { width: number; height: number };
  maxFrameRate: number;
  supportsHardwareAcceleration: boolean;
}

const DEFAULT_FORMATS: SupportedFormat[] = [
  {
    mimeType: 'video/mp4',
    extensions: ['.mp4', '.m4v', '.mov'],
    codecs: ['avc1', 'avc2', 'hev1', 'hvc1'],
    isSupported: true,
    notes: 'H.264 and H.265 codec support',
  },
  {
    mimeType: 'video/webm',
    extensions: ['.webm'],
    codecs: ['vp8', 'vp9', 'vp09'],
    isSupported: true,
    notes: 'VP8 and VP9 codec support',
  },
  {
    mimeType: 'video/quicktime',
    extensions: ['.mov', '.qt'],
    codecs: ['avc1', 'mp4a'],
    isSupported: true,
    notes: 'QuickTime container format',
  },
];

export class VideoFormatSupport {
  private supportedFormats: SupportedFormat[];
  private browserCapabilities: FormatCapabilities | null = null;

  constructor(formats?: SupportedFormat[]) {
    this.supportedFormats = formats || DEFAULT_FORMATS;
    this.detectBrowserCapabilities();
  }

  private detectBrowserCapabilities(): void {
    const video = document.createElement('video');
    const supportsH264 = video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '';
    const supportsVP8 = video.canPlayType('video/webm; codecs="vp8"') !== '';
    
    this.browserCapabilities = {
      supportedFormats: this.supportedFormats,
      maxResolution: { width: 3840, height: 2160 },
      maxFrameRate: 60,
      supportsHardwareAcceleration: !!document.createElement('canvas').getContext('webgl'),
    };
    
    this.supportedFormats = this.supportedFormats.map(format => {
      if (format.mimeType === 'video/mp4') {
        return { ...format, isSupported: supportsH264 };
      }
      if (format.mimeType === 'video/webm') {
        return { ...format, isSupported: supportsVP8 };
      }
      return format;
    });
  }

  detectFromExtension(filename: string): DetectedFormat {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const format = this.supportedFormats.find(f => 
      f.extensions.some(e => e.toLowerCase() === ext)
    );

    if (!format) {
      return {
        mimeType: 'unknown',
        codec: 'unknown',
        isSupported: false,
        warnings: ['Unknown file format'],
        recommendations: ['Use MP4, WebM, or MOV format'],
      };
    }

    return {
      mimeType: format.mimeType,
      codec: this.detectCodec(filename),
      isSupported: format.isSupported && this.isBrowserCompatible(format.mimeType),
      warnings: format.isSupported ? [] : [`${format.mimeType} may not be supported`],
      recommendations: this.getRecommendations(format),
    };
  }

  private detectCodec(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes('h265') || lower.includes('hevc')) return 'H.265/HEVC';
    if (lower.includes('h264') || lower.includes('avc')) return 'H.264/AVC';
    if (lower.includes('vp9')) return 'VP9';
    if (lower.includes('vp8')) return 'VP8';
    return 'Unknown';
  }

  private getRecommendations(format: SupportedFormat): string[] {
    const recommendations: string[] = [];
    if (format.mimeType === 'video/mp4') {
      recommendations.push('Use H.264 codec for maximum compatibility');
    }
    if (format.mimeType === 'video/webm') {
      recommendations.push('Use VP9 codec for better compression');
    }
    return recommendations;
  }

  isBrowserCompatible(mimeType: string): boolean {
    const video = document.createElement('video');
    return video.canPlayType(mimeType) !== '';
  }

  isResolutionSupported(width: number, height: number): boolean {
    if (!this.browserCapabilities) return true;
    return width <= this.browserCapabilities.maxResolution.width &&
           height <= this.browserCapabilities.maxResolution.height;
  }

  isFrameRateSupported(fps: number): boolean {
    if (!this.browserCapabilities) return true;
    return fps <= this.browserCapabilities.maxFrameRate;
  }

  getSupportedFormats(): SupportedFormat[] {
    return this.supportedFormats;
  }

  getBrowserCapabilities(): FormatCapabilities {
    return this.browserCapabilities!;
  }

  getFormatSummary(): string {
    if (!this.browserCapabilities) return 'Unknown';
    const formats = this.supportedFormats
      .filter(f => f.isSupported)
      .map(f => f.mimeType.replace('video/', ''))
      .join(', ');
    return `Formats: ${formats || 'None detected'}`;
  }

  validateVideoFile(file: File): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const format = this.detectFromExtension(file.name);
    
    if (!format.isSupported) {
      errors.push(`Unsupported format: ${format.mimeType}`);
    }
    
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      warnings.push(`File size exceeds 500MB limit`);
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
}

let defaultInstance: VideoFormatSupport | null = null;

export function getDefaultFormatSupport(): VideoFormatSupport {
  if (!defaultInstance) {
    defaultInstance = new VideoFormatSupport();
  }
  return defaultInstance;
}

export default VideoFormatSupport;

