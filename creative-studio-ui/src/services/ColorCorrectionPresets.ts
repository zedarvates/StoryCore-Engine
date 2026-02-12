/**
 * Color Correction Presets Service
 * MI1: Color Correction Presets - Vintage, Noir, Vibrant, Cinematic
 */

import {
  ColorCorrectionPreset,
  ColorCorrectionPresetLibrary,
  ColorAdjustments,
} from '../types/color-correction';

class ColorCorrectionPresetsService {
  private presets: Map<string, ColorCorrectionPreset> = new Map();

  constructor() {
    this.initializeBuiltInPresets();
  }

  /**
   * Initialize built-in color correction presets
   */
  private initializeBuiltInPresets(): void {
    // Vintage presets
    this.registerPreset({
      id: 'vintage_faded',
      name: 'Vintage Faded',
      description: 'Soft faded vintage look with lifted blacks',
      category: 'vintage',
      adjustments: {
        exposure: 0.1,
        contrast: -10,
        highlights: 20,
        shadows: 15,
        whites: -5,
        blacks: 20,
        temperature: 5,
        tint: 2,
        saturation: -20,
        vibrance: -10,
        clarity: -5,
        fade: 15,
        grain: 8,
        vignette: {
          intensity: 25,
          midpoint: 50,
          roundness: 100,
          feather: 60,
          color: '#000000',
        },
        colorBalance: {
          shadows: [5, 0, -5],
          midtones: [5, 2, 0],
          highlights: [10, 5, 0],
        },
        hsl: [],
      },
      mood: 'nostalgic',
      tags: ['vintage', 'faded', 'soft', 'nostalgic'],
    });

    this.registerPreset({
      id: 'vintage_sepia',
      name: 'Vintage Sepia',
      description: 'Classic sepia tone with warm undertones',
      category: 'vintage',
      adjustments: {
        exposure: 0,
        contrast: 5,
        highlights: -10,
        shadows: 10,
        whites: -10,
        blacks: 5,
        temperature: 15,
        tint: 5,
        saturation: -40,
        vibrance: -20,
        clarity: 0,
        fade: 0,
        grain: 12,
        vignette: {
          intensity: 30,
          midpoint: 45,
          roundness: 100,
          feather: 50,
          color: '#000000',
        },
        colorBalance: {
          shadows: [10, 5, -15],
          midtones: [15, 8, -10],
          highlights: [20, 10, -5],
        },
        hsl: [
          { hue: 0, saturation: -100, luminance: 0, colorRange: 'orange' },
          { hue: 0, saturation: -100, luminance: 0, colorRange: 'yellow' },
        ],
      },
      mood: 'classic',
      tags: ['vintage', 'sepia', 'classic', 'warm'],
    });

    this.registerPreset({
      id: 'vintage_warm',
      name: 'Vintage Warm',
      description: 'Warm vintage tones with golden highlights',
      category: 'vintage',
      adjustments: {
        exposure: 0.05,
        contrast: -5,
        highlights: 25,
        shadows: 10,
        whites: 0,
        blacks: 10,
        temperature: 20,
        tint: 3,
        saturation: -15,
        vibrance: -5,
        clarity: -10,
        fade: 10,
        grain: 6,
        vignette: {
          intensity: 20,
          midpoint: 55,
          roundness: 90,
          feather: 55,
          color: '#000000',
        },
        colorBalance: {
          shadows: [8, 3, -8],
          midtones: [12, 5, -5],
          highlights: [18, 8, 0],
        },
        hsl: [],
      },
      mood: 'warm',
      tags: ['vintage', 'warm', 'golden', 'soft'],
    });

    // Noir presets
    this.registerPreset({
      id: 'noir_high_contrast',
      name: 'Noir High Contrast',
      description: 'Dramatic high-contrast black and white',
      category: 'noir',
      adjustments: {
        exposure: 0,
        contrast: 40,
        highlights: -20,
        shadows: -20,
        whites: 20,
        blacks: 30,
        temperature: 0,
        tint: 0,
        saturation: -100,
        vibrance: 0,
        clarity: 15,
        fade: 0,
        grain: 15,
        vignette: {
          intensity: 45,
          midpoint: 40,
          roundness: 100,
          feather: 70,
          color: '#000000',
        },
        colorBalance: {
          shadows: [0, 0, 0],
          midtones: [0, 0, 0],
          highlights: [0, 0, 0],
        },
        hsl: [],
      },
      mood: 'dramatic',
      tags: ['noir', 'black & white', 'dramatic', 'high contrast'],
    });

    this.registerPreset({
      id: 'noir_soft',
      name: 'Noir Soft',
      description: 'Soft black and white with gentle contrast',
      category: 'noir',
      adjustments: {
        exposure: 0.1,
        contrast: 15,
        highlights: 10,
        shadows: -5,
        whites: 5,
        blacks: 10,
        temperature: 0,
        tint: 0,
        saturation: -100,
        vibrance: 0,
        clarity: 5,
        fade: 0,
        grain: 20,
        vignette: {
          intensity: 35,
          midpoint: 50,
          roundness: 100,
          feather: 60,
          color: '#000000',
        },
        colorBalance: {
          shadows: [0, 0, 0],
          midtones: [0, 0, 0],
          highlights: [0, 0, 0],
        },
        hsl: [],
      },
      mood: 'subtle',
      tags: ['noir', 'soft', 'black & white', 'subtle'],
    });

    // Vibrant presets
    this.registerPreset({
      id: 'vibrant_saturated',
      name: 'Vibrant Saturated',
      description: 'High saturation for vivid colors',
      category: 'vibrant',
      adjustments: {
        exposure: 0,
        contrast: 10,
        highlights: 5,
        shadows: 0,
        whites: 0,
        blacks: -5,
        temperature: 0,
        tint: 0,
        saturation: 30,
        vibrance: 40,
        clarity: 15,
        fade: 0,
        grain: 0,
        vignette: {
          intensity: 0,
          midpoint: 50,
          roundness: 100,
          feather: 50,
          color: '#000000',
        },
        colorBalance: {
          shadows: [0, 0, 0],
          midtones: [0, 0, 0],
          highlights: [0, 0, 0],
        },
        hsl: [],
      },
      mood: 'energetic',
      tags: ['vibrant', 'saturated', 'vivid', 'energetic'],
    });

    this.registerPreset({
      id: 'vibrant_enhanced',
      name: 'Vibrant Enhanced',
      description: 'Balanced enhancement with punchy colors',
      category: 'vibrant',
      adjustments: {
        exposure: 0,
        contrast: 15,
        highlights: 10,
        shadows: -5,
        whites: 5,
        blacks: -3,
        temperature: 0,
        tint: 0,
        saturation: 15,
        vibrance: 25,
        clarity: 20,
        fade: 0,
        grain: 0,
        vignette: {
          intensity: 10,
          midpoint: 50,
          roundness: 100,
          feather: 50,
          color: '#000000',
        },
        colorBalance: {
          shadows: [0, 0, 0],
          midtones: [0, 0, 0],
          highlights: [0, 0, 0],
        },
        hsl: [],
      },
      mood: 'punchy',
      tags: ['vibrant', 'enhanced', 'punchy', 'balanced'],
    });

    // Cinematic presets
    this.registerPreset({
      id: 'cinematic_dramatic',
      name: 'Cinematic Dramatic',
      description: 'Dramatic cinematic look with deep blacks',
      category: 'cinematic',
      adjustments: {
        exposure: -0.1,
        contrast: 25,
        highlights: -15,
        shadows: -10,
        whites: -5,
        blacks: 20,
        temperature: -5,
        tint: 0,
        saturation: -10,
        vibrance: 10,
        clarity: 20,
        fade: 0,
        grain: 5,
        vignette: {
          intensity: 40,
          midpoint: 35,
          roundness: 100,
          feather: 65,
          color: '#000000',
        },
        colorBalance: {
          shadows: [-3, 0, 5],
          midtones: [-2, 0, 3],
          highlights: [0, -2, 5],
        },
        hsl: [],
      },
      mood: 'dramatic',
      tags: ['cinematic', 'dramatic', 'film', 'dark'],
    });

    this.registerPreset({
      id: 'cinematic_film',
      name: 'Cinematic Film',
      description: 'Classic film look with film grain',
      category: 'cinematic',
      adjustments: {
        exposure: 0,
        contrast: 10,
        highlights: 5,
        shadows: 5,
        whites: 0,
        blacks: 0,
        temperature: 2,
        tint: 1,
        saturation: -5,
        vibrance: 5,
        clarity: 10,
        fade: 5,
        grain: 18,
        vignette: {
          intensity: 25,
          midpoint: 45,
          roundness: 100,
          feather: 55,
          color: '#000000',
        },
        colorBalance: {
          shadows: [2, 1, -2],
          midtones: [3, 1, -1],
          highlights: [4, 2, 0],
        },
        hsl: [],
      },
      mood: 'filmic',
      tags: ['cinematic', 'film', 'classic', 'filmic'],
    });

    this.registerPreset({
      id: 'cinematic_anamorphic',
      name: 'Cinematic Anamorphic',
      description: 'Anamorphic lens flare and color characteristics',
      category: 'cinematic',
      adjustments: {
        exposure: 0.05,
        contrast: 15,
        highlights: 20,
        shadows: 0,
        whites: 10,
        blacks: 5,
        temperature: -8,
        tint: 2,
        saturation: -8,
        vibrance: 8,
        clarity: 18,
        fade: 0,
        grain: 10,
        vignette: {
          intensity: 30,
          midpoint: 40,
          roundness: 85,
          feather: 50,
          color: '#000000',
        },
        colorBalance: {
          shadows: [-5, -2, 8],
          midtones: [-3, -1, 5],
          highlights: [0, 0, 10],
        },
        hsl: [
          { hue: 5, saturation: 10, luminance: 0, colorRange: 'blue' },
        ],
      },
      mood: 'anamorphic',
      tags: ['cinematic', 'anamorphic', 'lens flare', 'modern'],
    });
  }

  /**
   * Register a new preset
   */
  registerPreset(preset: ColorCorrectionPreset): void {
    this.presets.set(preset.id, preset);
  }

  /**
   * Get a preset by ID
   */
  getPreset(id: string): ColorCorrectionPreset | undefined {
    return this.presets.get(id);
  }

  /**
   * Get all presets
   */
  getAllPresets(): ColorCorrectionPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: ColorCorrectionPreset['category']): ColorCorrectionPreset[] {
    return this.getAllPresets().filter((p) => p.category === category);
  }

  /**
   * Get presets by tag
   */
  getPresetsByTag(tag: string): ColorCorrectionPreset[] {
    return this.getAllPresets().filter((p) => 
      p.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  /**
   * Search presets
   */
  searchPresets(query: string): ColorCorrectionPreset[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPresets().filter((p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Export presets library
   */
  exportLibrary(): ColorCorrectionPresetLibrary {
    return {
      presets: this.getAllPresets(),
      customPresets: [],
      recentlyUsed: [],
      favorites: [],
    };
  }

  /**
   * Apply adjustments to create a new preset
   */
  createFromAdjustments(
    name: string,
    adjustments: ColorAdjustments,
    category: ColorCorrectionPreset['category'] = 'custom'
  ): ColorCorrectionPreset {
    const id = `custom_${Date.now()}`;
    return {
      id,
      name,
      description: '',
      category,
      adjustments,
      tags: ['custom'],
    };
  }

  /**
   * Blend two presets together
   */
  blendPresets(
    preset1Id: string,
    preset2Id: string,
    ratio: number = 0.5
  ): ColorCorrectionPreset | null {
    const preset1 = this.getPreset(preset1Id);
    const preset2 = this.getPreset(preset2Id);
    
    if (!preset1 || !preset2) return null;

    const blendedAdjustments: ColorAdjustments = {
      exposure: this.blendValue(preset1.adjustments.exposure, preset2.adjustments.exposure, ratio),
      contrast: this.blendValue(preset1.adjustments.contrast, preset2.adjustments.contrast, ratio),
      highlights: this.blendValue(preset1.adjustments.highlights, preset2.adjustments.highlights, ratio),
      shadows: this.blendValue(preset1.adjustments.shadows, preset2.adjustments.shadows, ratio),
      whites: this.blendValue(preset1.adjustments.whites, preset2.adjustments.whites, ratio),
      blacks: this.blendValue(preset1.adjustments.blacks, preset2.adjustments.blacks, ratio),
      temperature: this.blendValue(preset1.adjustments.temperature, preset2.adjustments.temperature, ratio),
      tint: this.blendValue(preset1.adjustments.tint, preset2.adjustments.tint, ratio),
      saturation: this.blendValue(preset1.adjustments.saturation, preset2.adjustments.saturation, ratio),
      vibrance: this.blendValue(preset1.adjustments.vibrance, preset2.adjustments.vibrance, ratio),
      clarity: this.blendValue(preset1.adjustments.clarity, preset2.adjustments.clarity, ratio),
      fade: this.blendValue(preset1.adjustments.fade, preset2.adjustments.fade, ratio),
      grain: this.blendValue(preset1.adjustments.grain, preset2.adjustments.grain, ratio),
      vignette: {
        intensity: this.blendValue(preset1.adjustments.vignette.intensity, preset2.adjustments.vignette.intensity, ratio),
        midpoint: this.blendValue(preset1.adjustments.vignette.midpoint, preset2.adjustments.vignette.midpoint, ratio),
        roundness: this.blendValue(preset1.adjustments.vignette.roundness, preset2.adjustments.vignette.roundness, ratio),
        feather: this.blendValue(preset1.adjustments.vignette.feather, preset2.adjustments.vignette.feather, ratio),
        color: preset1.adjustments.vignette.intensity > preset2.adjustments.vignette.intensity 
          ? preset1.adjustments.vignette.color 
          : preset2.adjustments.vignette.color,
      },
      colorBalance: {
        shadows: [
          this.blendValue(preset1.adjustments.colorBalance.shadows[0], preset2.adjustments.colorBalance.shadows[0], ratio),
          this.blendValue(preset1.adjustments.colorBalance.shadows[1], preset2.adjustments.colorBalance.shadows[1], ratio),
          this.blendValue(preset1.adjustments.colorBalance.shadows[2], preset2.adjustments.colorBalance.shadows[2], ratio),
        ],
        midtones: [
          this.blendValue(preset1.adjustments.colorBalance.midtones[0], preset2.adjustments.colorBalance.midtones[0], ratio),
          this.blendValue(preset1.adjustments.colorBalance.midtones[1], preset2.adjustments.colorBalance.midtones[1], ratio),
          this.blendValue(preset1.adjustments.colorBalance.midtones[2], preset2.adjustments.colorBalance.midtones[2], ratio),
        ],
        highlights: [
          this.blendValue(preset1.adjustments.colorBalance.highlights[0], preset2.adjustments.colorBalance.highlights[0], ratio),
          this.blendValue(preset1.adjustments.colorBalance.highlights[1], preset2.adjustments.colorBalance.highlights[1], ratio),
          this.blendValue(preset1.adjustments.colorBalance.highlights[2], preset2.adjustments.colorBalance.highlights[2], ratio),
        ],
      },
      hsl: [],
    };

    return {
      id: `blended_${Date.now()}`,
      name: `${preset1.name} × ${preset2.name}`,
      description: 'Blended preset',
      category: 'custom',
      adjustments: blendedAdjustments,
      tags: ['blended', 'custom'],
    };
  }

  private blendValue(a: number, b: number, ratio: number): number {
    return a + (b - a) * ratio;
  }
}

export const colorCorrectionPresetsService = new ColorCorrectionPresetsService();
export default ColorCorrectionPresetsService;
