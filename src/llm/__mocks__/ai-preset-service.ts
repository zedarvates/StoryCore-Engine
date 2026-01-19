import { LLMConfig } from '../interfaces';

export interface AIPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<LLMConfig>;
  category: 'creative' | 'analytical' | 'conversational' | 'technical';
  tags: string[];
}

export class AIPresetService {
  private presets: Map<string, AIPreset> = new Map();

  constructor() {
    // Load default presets in mock
    const defaultPresets: AIPreset[] = [
      {
        id: 'creative-writing',
        name: 'Creative Writing',
        description: 'High temperature for creative content',
        config: { temperature: 0.9, maxTokens: 2048 },
        category: 'creative',
        tags: ['writing', 'creative']
      }
    ];
    defaultPresets.forEach(preset => this.presets.set(preset.id, preset));
  }

  getAllPresets(): AIPreset[] {
    return Array.from(this.presets.values());
  }

  getPreset(id: string): AIPreset | null {
    return this.presets.get(id) || null;
  }

  getPresetsByCategory(category: AIPreset['category']): AIPreset[] {
    return Array.from(this.presets.values()).filter(p => p.category === category);
  }

  getPresetsByTags(tags: string[]): AIPreset[] {
    return Array.from(this.presets.values()).filter(p =>
      tags.some(tag => p.tags.includes(tag))
    );
  }

  addPreset(preset: Omit<AIPreset, 'id'> & { id?: string }): string {
    const id = preset.id || `custom-${Date.now()}`;
    this.presets.set(id, { ...preset, id });
    return id;
  }

  removePreset(id: string): boolean {
    return this.presets.delete(id);
  }

  applyPreset(id: string, baseConfig: LLMConfig): LLMConfig {
    const preset = this.getPreset(id);
    if (!preset) throw new Error(`Preset ${id} not found`);
    return { ...baseConfig, ...preset.config };
  }

  validatePreset(preset: Partial<AIPreset>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!preset.name) errors.push('Name required');
    if (!preset.config) errors.push('Config required');
    return { valid: errors.length === 0, errors };
  }
}