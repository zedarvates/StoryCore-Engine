import type { ColorAdjustments } from '../types/color-correction';

export function createDefaultColorAdjustments(): ColorAdjustments {
  return {
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
}
