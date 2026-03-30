/**
 * Automated Color Grading Service
 * 
 * Logic for applying LUT-based visual consistency across sequences.
 * Based on March 2026 Production Roadmap (Phase 4).
 */

export interface LUTPreset {
  id: string;
  name: string;
  description: string;
  prompt_suffix: string; // Instructions for the generation model
  visual_params: {
    contrast: number; // 0.0 to 2.0
    saturation: number; // 0.0 to 2.0
    brightness: number; // -100 to 100
    tint: string; // e.g., 'warm', 'cool', 'teal-orange'
  };
}

export const LUT_PRESETS: LUTPreset[] = [
  {
    id: 'teal-orange-action',
    name: 'Teal & Orange (Action)',
    description: 'High contrast, warm skin tones, and cool shadows. Classic blockbuster look.',
    prompt_suffix: 'cinematic teal and orange color grade, high contrast, warm skin tones, cool blue shadows, anamorphic look',
    visual_params: { contrast: 1.4, saturation: 1.1, brightness: -5, tint: 'teal-orange' }
  },
  {
    id: 'golden-hour-vintage',
    name: 'Golden Hour (Vintage)',
    description: 'Soft warm light, nostalgic film grain, and reduced contrast.',
    prompt_suffix: 'golden hour natural light, warm film aesthetic, 35mm film grain, vintage color grade, soft shadows',
    visual_params: { contrast: 0.9, saturation: 1.2, brightness: 10, tint: 'warm' }
  },
  {
    id: 'bleach-bypass-grit',
    name: 'Bleach Bypass (Grit)',
    description: 'High contrast, desaturated colors, and sharp details. Gritty war film look.',
    prompt_suffix: 'bleach bypass color grade, gritty texture, high contrast, low saturation, industrial look',
    visual_params: { contrast: 1.8, saturation: 0.6, brightness: -10, tint: 'cool' }
  },
  {
    id: 'noir-high-key',
    name: 'Noir (High Key)',
    description: 'Monochrome, extreme contrast, and dramatic shadows.',
    prompt_suffix: 'black and white film noir style, extreme contrast, sharp dramatic shadows, fine film grain',
    visual_params: { contrast: 2.0, saturation: 0.0, brightness: -20, tint: 'monochrome' }
  },
  {
    id: 'nordic-cold',
    name: 'Nordic (Cold)',
    description: 'Cool tones, soft light, and natural high saturation in blues/greens.',
    prompt_suffix: 'nordic cold color grade, muted tones, soft natural light, clean digital aesthetic',
    visual_params: { contrast: 1.1, saturation: 0.8, brightness: 5, tint: 'cool' }
  }
];

export class ColorGradingService {
  private static instance: ColorGradingService;

  public static getInstance() {
    if (!ColorGradingService.instance) {
      ColorGradingService.instance = new ColorGradingService();
    }
    return ColorGradingService.instance;
  }

  /**
   * Gets a specific grading preset by ID
   */
  public getPreset(id: string): LUTPreset | undefined {
    return LUT_PRESETS.find(p => p.id === id);
  }

  /**
   * Applies the grading preset to a prompt
   */
  public applyGradingToPrompt(prompt: string, presetId: string): string {
    const preset = this.getPreset(presetId);
    if (!preset) return prompt;
    
    return `${prompt}. ${preset.prompt_suffix}`;
  }

  /**
   * Returns suggested LUT presets based on a scene description
   */
  public suggestLutForScene(description: string): LUTPreset[] {
    const desc = description.toLowerCase();
    
    if (desc.includes('combat') || desc.includes('action') || desc.includes('explosion')) {
      return [this.getPreset('teal-orange-action')!, this.getPreset('bleach-bypass-grit')!];
    }
    
    if (desc.includes('sunset') || desc.includes('morning') || desc.includes('romantic')) {
      return [this.getPreset('golden-hour-vintage')!];
    }
    
    if (desc.includes('scary') || desc.includes('mystery') || desc.includes('shadow')) {
      return [this.getPreset('noir-high-key')!, this.getPreset('bleach-bypass-grit')!];
    }

    return LUT_PRESETS.slice(0, 3); // Default 3
  }
}

export const colorGradingService = ColorGradingService.getInstance();
