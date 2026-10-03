/**
 * Caption Styles Service
 * MI2: Caption Styles - Modern, Classic, Dynamic
 */

import {
  CaptionStyle,
  CaptionStylePreset,
  CaptionAnimation,
  CaptionEffect,
} from '../types/caption-style';

class CaptionStylesService {
  private styles: Map<string, CaptionStyle> = new Map();

  constructor() {
    this.initializeBuiltInStyles();
  }

  /**
   * Initialize built-in caption styles
   */
  private initializeBuiltInStyles(): void {
    // Modern styles
    this.registerStyle({
      id: 'modern_clean',
      name: 'Modern Clean',
      description: 'Clean, minimalist modern captions',
      category: 'modern',
      font: {
        family: 'Inter, system-ui, sans-serif',
        weight: 'medium',
        style: 'normal',
        size: 16,
        sizeUnit: 'px',
        lineHeight: 1.5,
        letterSpacing: 0,
        textTransform: 'none',
      },
      textAppearance: {
        color: '#FFFFFF',
        shadow: {
          offsetX: 0,
          offsetY: 1,
          blur: 2,
          color: '#000000',
          opacity: 30,
        },
      },
      background: {
        enabled: false,
        type: 'solid',
        color: '#000000',
        opacity: 0,
        padding: 0,
      },
      positioning: {
        alignment: 'center',
        verticalPosition: 'bottom',
        customYOffset: undefined,
        maxWidth: 80,
        margins: { left: 10, right: 10, top: 10, bottom: 10 },
      },
      animations: [
        {
          id: 'fade',
          type: 'fade',
          duration: 200,
          delay: 0,
          easing: 'ease-out',
        },
      ],
      effects: [],
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        forceBackground: false,
        minimumSize: true,
        colorContrast: 4.5,
      },
    });

    this.registerStyle({
      id: 'modern_bold',
      name: 'Modern Bold',
      description: 'Bold, attention-grabbing modern captions',
      category: 'modern',
      font: {
        family: 'Inter, system-ui, sans-serif',
        weight: 'bold',
        style: 'normal',
        size: 20,
        sizeUnit: 'px',
        lineHeight: 1.4,
        letterSpacing: 1,
        textTransform: 'uppercase',
      },
      textAppearance: {
        color: '#FFFFFF',
        shadow: {
          offsetX: 0,
          offsetY: 2,
          blur: 4,
          color: '#000000',
          opacity: 50,
        },
      },
      background: {
        enabled: true,
        type: 'rounded',
        color: '#000000',
        opacity: 75,
        padding: 12,
        cornerRadius: 8,
      },
      positioning: {
        alignment: 'center',
        verticalPosition: 'bottom',
        maxWidth: 70,
        margins: { left: 15, right: 15, top: 15, bottom: 15 },
      },
      animations: [
        {
          id: 'scale',
          type: 'scale',
          duration: 300,
          delay: 0,
          easing: 'ease-out',
        },
      ],
      effects: [],
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        forceBackground: true,
        minimumSize: true,
        colorContrast: 4.5,
      },
    });

    // Classic styles
    this.registerStyle({
      id: 'classic_standard',
      name: 'Classic Standard',
      description: 'Traditional subtitle style',
      category: 'classic',
      font: {
        family: 'Arial, Helvetica, sans-serif',
        weight: 'regular',
        style: 'normal',
        size: 18,
        sizeUnit: 'px',
        lineHeight: 1.4,
        letterSpacing: 0,
        textTransform: 'none',
      },
      textAppearance: {
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2,
      },
      background: {
        enabled: false,
        type: 'solid',
        color: '#000000',
        opacity: 0,
        padding: 0,
      },
      positioning: {
        alignment: 'center',
        verticalPosition: 'bottom',
        maxWidth: 80,
        margins: { left: 5, right: 5, top: 5, bottom: 5 },
      },
      animations: [
        {
          id: 'fade',
          type: 'fade',
          duration: 100,
          delay: 0,
          easing: 'linear',
        },
      ],
      effects: [],
      accessibility: {
        highContrast: true,
        reducedMotion: false,
        forceBackground: false,
        minimumSize: true,
        colorContrast: 4.5,
      },
    });

    this.registerStyle({
      id: 'classic_cinema',
      name: 'Classic Cinema',
      description: 'Cinema-style yellow subtitles',
      category: 'classic',
      font: {
        family: 'Georgia, serif',
        weight: 'regular',
        style: 'normal',
        size: 22,
        sizeUnit: 'px',
        lineHeight: 1.5,
        letterSpacing: 0.5,
        textTransform: 'none',
      },
      textAppearance: {
        color: '#FFD700',
        shadow: {
          offsetX: 0,
          offsetY: 1,
          blur: 2,
          color: '#000000',
          opacity: 60,
        },
      },
      background: {
        enabled: false,
        type: 'solid',
        color: '#000000',
        opacity: 0,
        padding: 0,
      },
      positioning: {
        alignment: 'center',
        verticalPosition: 'bottom',
        maxWidth: 75,
        margins: { left: 10, right: 10, top: 10, bottom: 10 },
      },
      animations: [
        {
          id: 'fade',
          type: 'fade',
          duration: 150,
          delay: 0,
          easing: 'ease-out',
        },
      ],
      effects: [],
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        forceBackground: false,
        minimumSize: true,
        colorContrast: 4.5,
      },
    });

    // Dynamic styles
    this.registerStyle({
      id: 'dynamic_typewriter',
      name: 'Dynamic Typewriter',
      description: 'Typewriter-style animated captions',
      category: 'dynamic',
      font: {
        family: 'Courier New, monospace',
        weight: 'regular',
        style: 'normal',
        size: 18,
        sizeUnit: 'px',
        lineHeight: 1.4,
        letterSpacing: 0,
        textTransform: 'none',
      },
      textAppearance: {
        color: '#00FF00',
        shadow: {
          offsetX: 0,
          offsetY: 0,
          blur: 3,
          color: '#00FF00',
          opacity: 50,
        },
      },
      background: {
        enabled: false,
        type: 'solid',
        color: '#000000',
        opacity: 0,
        padding: 0,
      },
      positioning: {
        alignment: 'left',
        verticalPosition: 'center',
        maxWidth: 60,
        margins: { left: 20, right: 20, top: 20, bottom: 20 },
      },
      animations: [
        {
          id: 'typewriter',
          type: 'typewriter',
          duration: 50,
          delay: 0,
          easing: 'linear',
        },
      ],
      effects: [],
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        forceBackground: false,
        minimumSize: true,
        colorContrast: 4.5,
      },
    });

    this.registerStyle({
      id: 'dynamic_pop',
      name: 'Dynamic Pop',
      description: 'Fun, bouncy animated captions',
      category: 'dynamic',
      font: {
        family: 'Poppins, system-ui, sans-serif',
        weight: 'bold',
        style: 'normal',
        size: 24,
        sizeUnit: 'px',
        lineHeight: 1.3,
        letterSpacing: 1,
        textTransform: 'uppercase',
      },
      textAppearance: {
        color: '#FFFFFF',
        gradient: {
          startColor: '#FF6B6B',
          endColor: '#4ECDC4',
          angle: 45,
        },
      },
      background: {
        enabled: true,
        type: 'rounded',
        color: '#000000',
        opacity: 80,
        padding: 16,
        cornerRadius: 16,
      },
      positioning: {
        alignment: 'center',
        verticalPosition: 'center',
        maxWidth: 70,
        margins: { left: 15, right: 15, top: 15, bottom: 15 },
      },
      animations: [
        {
          id: 'elastic',
          type: 'elastic',
          duration: 600,
          delay: 0,
          easing: 'ease-out',
        },
      ],
      effects: [
        {
          id: 'pulse',
          type: 'pulse',
          intensity: 20,
        },
      ],
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        forceBackground: true,
        minimumSize: true,
        colorContrast: 4.5,
      },
    });
  }

  /**
   * Register a caption style
   */
  registerStyle(style: CaptionStyle): void {
    this.styles.set(style.id, style);
  }

  /**
   * Get a style by ID
   */
  getStyle(id: string): CaptionStyle | undefined {
    return this.styles.get(id);
  }

  /**
   * Get all styles
   */
  getAllStyles(): CaptionStyle[] {
    return Array.from(this.styles.values());
  }

  /**
   * Get styles by category
   */
  getStylesByCategory(category: CaptionStyle['category']): CaptionStyle[] {
    return this.getAllStyles().filter((s) => s.category === category);
  }

  /**
   * Create a preset from a style
   */
  createPreset(style: CaptionStyle, author: string): CaptionStylePreset {
    return {
      id: `preset_${Date.now()}`,
      name: style.name,
      description: style.description,
      styleId: style.id,
      customizations: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author,
      isPublic: false,
      tags: [style.category],
      usageCount: 0,
    };
  }

  /**
   * Export styles as CSS
   */
  exportAsCSS(styleId: string): string {
    const style = this.getStyle(styleId);
    if (!style) return '';

    return `
.caption-${styleId} {
  font-family: ${style.font.family};
  font-size: ${style.font.size}${style.font.sizeUnit};
  font-weight: ${style.font.weight};
  font-style: ${style.font.style};
  line-height: ${style.font.lineHeight};
  letter-spacing: ${style.font.letterSpacing}px;
  text-transform: ${style.font.textTransform};
  color: ${style.textAppearance.color};
  background: ${style.background.enabled ? `rgba(${this.hexToRgb(style.background.color)}, ${style.background.opacity})` : 'transparent'};
  border-radius: ${style.background.cornerRadius || 0}px;
  padding: ${style.background.padding}px;
  text-align: ${style.positioning.alignment};
  max-width: ${style.positioning.maxWidth}%;
  text-shadow: ${style.textAppearance.shadow ? `${style.textAppearance.shadow.offsetX}px ${style.textAppearance.shadow.offsetY}px ${style.textAppearance.shadow.blur}px rgba(${this.hexToRgb(style.textAppearance.shadow.color)}, ${style.textAppearance.shadow.opacity / 100})` : 'none'};
}
    `.trim();
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
  }
}

export const captionStylesService = new CaptionStylesService();
export default CaptionStylesService;
