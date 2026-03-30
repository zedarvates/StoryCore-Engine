import { ShotPreset, ShotLayoutColors } from '../types/presets';

/**
 * Narrative Keyword Overrides
 * Maps story keywords to specific layout color changes.
 */
const NARRATIVE_OVERRIDES: Record<string, Partial<ShotLayoutColors>> = {
  // Biomes & Environment
  'desert': { background: '#EDC9AF', exterior: '#EDC9AF', ground: '#EDC9AF', sky: '#FFD700' },
  'désert': { background: '#EDC9AF', exterior: '#EDC9AF', ground: '#EDC9AF', sky: '#FFD700' },
  'sable': { background: '#EDC9AF', exterior: '#EDC9AF', ground: '#EDC9AF' },
  'forest': { background: '#228B22', ground: '#228B22', vegetation: '#006400' },
  'forêt': { background: '#228B22', ground: '#228B22', vegetation: '#006400' },
  'jungle': { vegetation: '#004d00', ground: '#002200' },
  'herbe': { ground: '#228B22', vegetation: '#228B22' },
  'grass': { ground: '#228B22', vegetation: '#228B22' },
  'tree': { vegetation: '#2E8B57', background: '#006400' },
  'arbre': { vegetation: '#2E8B57', background: '#006400' },
  'bush': { vegetation: '#556B2F' },
  'leaf': { vegetation: '#32CD32' },
  'feuille': { vegetation: '#32CD32' },
  'garden': { vegetation: '#90EE90', ground: '#8B4513' },
  'jardin': { vegetation: '#90EE90', ground: '#8B4513' },
  'snow': { ground: '#FFFFFF', sky: '#E0FFFF', background: '#F0F8FF' },
  'neige': { ground: '#FFFFFF', sky: '#E0FFFF', background: '#F0F8FF' },
  'ice': { ground: '#E0FFFF', sky: '#E0FFFF', liquids: '#B0E0E6' },
  'glace': { ground: '#E0FFFF', sky: '#E0FFFF', liquids: '#B0E0E6' },
  
  // Water & Liquids
  'water': { liquids: '#1E90FF' },
  'eau': { liquids: '#1E90FF' },
  'ocean': { liquids: '#000080', sky: '#87CEEB' },
  'océan': { liquids: '#000080', sky: '#87CEEB' },
  'sea': { liquids: '#000080' },
  'mer': { liquids: '#000080' },
  'lake': { liquids: '#4682B4' },
  'lac': { liquids: '#4682B4' },
  'river': { liquids: '#4682B4' },
  'rivière': { liquids: '#4682B4' },
  'rain': { liquids: '#708090', sky: '#778899', ground: '#2F4F4F' },
  'pluie': { liquids: '#708090', sky: '#778899', ground: '#2F4F4F' },
  'lava': { liquids: '#FF4500', sky: '#3D0C02' },
  'lave': { liquids: '#FF4500', sky: '#3D0C02' },

  // Architecture & Urban
  'city': { architecture: '#808080', background: '#696969' },
  'ville': { architecture: '#808080', background: '#696969' },
  'building': { architecture: '#A9A9A9' },
  'immeuble': { architecture: '#A9A9A9' },
  'house': { architecture: '#D2B48C', interior: '#8B4513' },
  'maison': { architecture: '#D2B48C', interior: '#8B4513' },
  'temple': { architecture: '#FFD700', background: '#DAA520' },
  'castle': { architecture: '#C0C0C0', background: '#696969' },
  'château': { architecture: '#C0C0C0', background: '#696969' },
  'office': { architecture: '#778899' },
  'factory': { architecture: '#708090', smoke: '#2F4F4F' },
  'usine': { architecture: '#708090', smoke: '#2F4F4F' },
  'ruins': { architecture: '#4B3621', background: '#2F4F4F' },
  'trash': { props: '#2F4F4F' }, 
  'poubelle': { props: '#2F4F4F' }, 
  'debris': { props: '#696969' },
  'débris': { props: '#696969' },
  'window': { liquids: '#AFEEEE' },
  'fenêtre': { liquids: '#AFEEEE' },
  'glass': { liquids: '#AFEEEE' },
  'verre': { liquids: '#AFEEEE' },

  // Time of day overrides
  'day': { sky: '#87CEEB', exterior: '#87CEEB' },
  'jour': { sky: '#87CEEB', exterior: '#87CEEB' },
  'night': { sky: '#191970', background: '#000033', exterior: '#191970', foreground: '#050510' },
  'nuit': { sky: '#191970', background: '#000033', exterior: '#191970', foreground: '#050510' },
  'sunset': { sky: '#FF7F50', exterior: '#FF4500', background: '#8B4513' },
  'sunrise': { sky: '#FFDAB9', exterior: '#FF8C00' },
  
  // Mood / Weather / FX
  'fog': { smoke: '#DCDCDC', background: '#A9A9A9' },
  'brouillard': { smoke: '#DCDCDC', background: '#A9A9A9' },
  'storm': { sky: '#708090', exterior: '#4682B4', smoke: '#2F4F4F' },
  'tempête': { sky: '#708090', exterior: '#4682B4', smoke: '#2F4F4F' },
  'explosion': { sfx: '#FF4500', smoke: '#808080', sparks: '#FFD700' },
  'fire': { sfx: '#FF0000', sparks: '#FFA500' },
  'feu': { sfx: '#FF0000', sparks: '#FFA500' },
  'smoke': { smoke: '#A9A9A9' },
  'fumée': { smoke: '#A9A9A9' },
  'magic': { sfx: '#9400D3', sparks: '#BA55D3' },
  'magie': { sfx: '#9400D3', sparks: '#BA55D3' },
  'portal': { sfx: '#00BFFF', sparks: '#1E90FF' },
  'portail': { sfx: '#00BFFF', sparks: '#1E90FF' },
  'beam': { sfx: '#FFFFFF', sparks: '#00FFFF' },
  'faisceau': { sfx: '#FFFFFF', sparks: '#00FFFF' }
};

/**
 * Preset ID mappings based on keywords
 */
const PRESET_SUGGESTIONS: Record<string, string> = {
  // Common keywords
  'véhicule': 'interior-vehicle-dialogue',
  'voiture': 'interior-vehicle-dialogue',
  'car': 'interior-vehicle-dialogue',
  'vaisseau': 'spaceship-cockpit-first-person',
  'spaceship': 'spaceship-cockpit-first-person',
  'paysage': 'establishing-wide-landscape',
  'landscape': 'establishing-wide-landscape',
  'visage': 'close-up-intensity',
  'dialogue': 'medium-shot-standard',
  'explosion': 'explosion-impact-extreme',
  'animal': 'nature-fauna-observational',
  'creature': 'nature-fauna-observational',
  'créature': 'nature-fauna-observational',
  'monstre': 'nature-fauna-observational',
  'lion': 'nature-fauna-observational',
  
  // Environment specific
  'forêt': 'forest-exterior-standard',
  'forest': 'forest-exterior-standard',
  'canyon': 'canyon-exterior-establishing',
  'espace': 'space-ruins-discovery',
  'space': 'space-ruins-discovery',
  'ruine': 'space-ruins-discovery',
  'ruins': 'space-ruins-discovery',
  'temple': 'temple-exterior-spiritual',
  'château': 'castle-exterior-majestic',
  'castle': 'castle-exterior-majestic',
  'mer': 'ocean-stormy-dramatic',
  'ocean': 'ocean-stormy-dramatic',
  'océan': 'ocean-stormy-dramatic',
  'ville': 'city-exterior-standard',
  'city': 'city-exterior-standard'
};

/**
 * NarrativeLayerMapper Service
 * Analyzes prompt text and adapts the visual layout guides dynamically.
 */
export class NarrativeLayerMapper {
  /**
   * Analyzes a prompt and returns an adapted version of the preset colors.
   */
  static adaptLayoutToNarrative(prompt: string, basePreset: ShotPreset): ShotPreset {
    const lowerPrompt = prompt.toLowerCase();
    const adaptedLayout = { ...basePreset.layoutColors };
    let hasChanges = false;

    // Check for each narrative keyword in the prompt
    Object.keys(NARRATIVE_OVERRIDES).forEach((keyword) => {
      if (lowerPrompt.includes(keyword)) {
        const overrides = NARRATIVE_OVERRIDES[keyword];
        
        // Apply overrides to the layout
        Object.keys(overrides).forEach((layer) => {
          if (overrides[layer]) {
            adaptedLayout[layer] = overrides[layer];
            hasChanges = true;
          }
        });
      }
    });

    if (!hasChanges) return basePreset;

    // Return a new preset object with the adapted layout
    return {
      ...basePreset,
      layoutColors: adaptedLayout
    };
  }

  /**
   * Suggests the best preset ID for a given prompt.
   */
  static suggestPresetId(prompt: string): string | null {
    const lowerPrompt = prompt.toLowerCase();
    for (const keyword of Object.keys(PRESET_SUGGESTIONS)) {
      if (lowerPrompt.includes(keyword)) {
        return PRESET_SUGGESTIONS[keyword];
      }
    }
    return null;
  }

  /**
   * Detects characterizing keywords to suggest layout tweaks.
   */
  static getNarrativeKeywords(prompt: string): string[] {
    const lowerPrompt = prompt.toLowerCase();
    return Object.keys(NARRATIVE_OVERRIDES).filter(keyword => lowerPrompt.includes(keyword));
  }
}

export default NarrativeLayerMapper;
