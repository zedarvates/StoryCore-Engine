// src/lighting/types.ts
// Types for lighting configuration in the 3D sequence editor.

export enum LightingType {
  NATURAL = "natural",
  SOFT = "soft",
  RIM = "rim",
  BACKLIGHT = "backlight",
  OVERCAST = "overcast",
  WARM_SUNSET = "warm_sunset",
  COOL_MOONLIGHT = "cool_moonlight",
  STUDIO = "studio",
  DRAMATIC = "dramatic"
}

/**
 * Parameters defining a lighting setup for a shot.
 */
export interface LightingParams {
  /** The lighting type, constrained to the LightingType enum. */
  type: LightingType;
  /** Relative intensity (0.0 – 1.0). */
  intensity: number;
  /** Hex color code for the light (e.g., "#FFAA00"). */
  color: string;
  /** Position of the light in world coordinates. */
  position: {
    x: number;
    y: number;
    z: number;
  };
  /** Direction vector or named direction (e.g., "front", "right"). */
  direction: string;
}
