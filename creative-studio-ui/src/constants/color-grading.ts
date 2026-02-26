import { ColorCorrectionPreset, ColorAdjustments } from '../types/color-correction';

export const BASE_ADJUSTMENTS: ColorAdjustments = {
  lift: [0, 0, 0],
  gamma: [1, 1, 1],
  gain: [1, 1, 1],
  offset: [0, 0, 0],
  exposure: 0,
  contrast: 0,
  pivot: 0.5,
  saturation: 1.0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  clarity: 0,
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
  qualifier: {
    enabled: false,
    hue: { center: 0, width: 60, softness: 10 },
    saturation: { low: 0, high: 1, softLow: 0.1, softHigh: 0.1 },
    luminance: { low: 0, high: 1, softLow: 0.1, softHigh: 0.1 },
    softness: 0,
    showMatte: false,
  },
  curves: {
    rgb: [[], [], [], []],
    hueVsHue: [],
    hueVsSat: [],
    hueVsLum: [],
    lumVsSat: [],
  },
};

export const DEFAULT_PRESETS: ColorCorrectionPreset[] = [
  {
    id: 'preset-teal-orange',
    name: 'Teal & Orange',
    description: 'Classic cinematic look with teal shadows and orange skin tones.',
    category: 'cinematic',
    tags: ['cinematic', 'blockbuster', 'hollywood'],
    thumbnail: '',
    adjustments: {
      ...BASE_ADJUSTMENTS,
      lift: [0, 0.05, 0.1],
      gamma: [1.1, 1, 0.9],
      gain: [1.2, 1.1, 0.8],
      saturation: 1.2,
      contrast: 1.1,
      temperature: 10,
    }
  },
  {
    id: 'preset-bleach-bypass',
    name: 'Bleach Bypass',
    description: 'High contrast, low saturation look common in war films.',
    category: 'film',
    tags: ['gritty', 'war', 'harsh'],
    thumbnail: '',
    adjustments: {
      ...BASE_ADJUSTMENTS,
      lift: [-0.05, -0.05, -0.05],
      gain: [1.3, 1.3, 1.3],
      saturation: 0.6,
      contrast: 1.5,
    }
  },
  {
    id: 'preset-matrix',
    name: 'Digital Green',
    description: 'Heavy green tint in the midtones and shadows.',
    category: 'artistic',
    tags: ['green', 'sci-fi', 'stylized'],
    thumbnail: '',
    adjustments: {
      ...BASE_ADJUSTMENTS,
      lift: [0, 0.05, 0],
      gamma: [0.9, 1.2, 0.9],
      gain: [1, 1.1, 1],
      saturation: 0.9,
      contrast: 1.2,
      temperature: -5,
    }
  },
  {
    id: 'preset-noir',
    name: 'Film Noir',
    description: 'B&W with deep blacks and high contrast.',
    category: 'noir',
    tags: ['classic', 'bw', 'dramatic'],
    thumbnail: '',
    adjustments: {
      ...BASE_ADJUSTMENTS,
      lift: [-0.1, -0.1, -0.1],
      gain: [1.5, 1.5, 1.5],
      saturation: 0,
      contrast: 1.8,
    }
  },
  {
    id: 'preset-vintage',
    name: 'Vintage 70s',
    description: 'Warm highlights, faded blacks, and slight yellow tint.',
    category: 'vintage',
    tags: ['retro', 'warm', 'film'],
    thumbnail: '',
    adjustments: {
      ...BASE_ADJUSTMENTS,
      lift: [0.05, 0.02, 0],
      gamma: [1.1, 1.05, 1],
      gain: [1.2, 1.2, 0.9],
      saturation: 0.8,
      contrast: 0.9,
      temperature: 15,
    }
  }
];
