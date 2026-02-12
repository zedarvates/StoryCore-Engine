/**
 * Contrast Checker Utility
 * 
 * Validates color contrast ratios for accessibility compliance (WCAG 2.1)
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a number between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    console.warn(`Invalid color format: ${color1} or ${color2}`);
    return 0;
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standard
 * AA requires 4.5:1 for normal text, 3:1 for large text
 */
export function meetsWCAG_AA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standard
 * AAA requires 7:1 for normal text, 4.5:1 for large text
 */
export function meetsWCAG_AAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Validate a color pair and return detailed results
 */
export function validateContrast(
  foreground: string,
  background: string,
  options: { isLargeText?: boolean; level?: 'AA' | 'AAA' } = {}
): {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  level: 'AA' | 'AAA' | 'FAIL';
  recommendation?: string;
} {
  const { isLargeText = false, level = 'AA' } = options;
  const ratio = getContrastRatio(foreground, background);

  const meetsAA = meetsWCAG_AA(ratio, isLargeText);
  const meetsAAA = meetsWCAG_AAA(ratio, isLargeText);

  let resultLevel: 'AA' | 'AAA' | 'FAIL' = 'FAIL';
  if (meetsAAA) resultLevel = 'AAA';
  else if (meetsAA) resultLevel = 'AA';

  let recommendation: string | undefined;
  if (!meetsAA) {
    const required = isLargeText ? 3 : 4.5;
    recommendation = `Contrast ratio ${ratio.toFixed(2)}:1 is below the required ${required}:1 for WCAG AA. Consider adjusting colors.`;
  }

  return {
    ratio: parseFloat(ratio.toFixed(2)),
    meetsAA,
    meetsAAA,
    level: resultLevel,
    recommendation,
  };
}

/**
 * Common color palette with validated contrasts
 */
export const ACCESSIBLE_COLORS = {
  // Primary colors
  primary: '#0066cc',
  primaryLight: '#66b3ff',
  primaryDark: '#003d99',

  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Status colors
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0891b2',

  // Text colors
  textPrimary: '#111827',
  textSecondary: '#4b5563',
  textTertiary: '#9ca3af',
  textInverse: '#ffffff',

  // Background colors
  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  bgTertiary: '#f3f4f6',
};

/**
 * Validate all colors in a palette
 */
export function validatePalette(
  palette: Record<string, string>,
  options: { level?: 'AA' | 'AAA' } = {}
): Record<string, unknown> {
  const results: Record<string, unknown> = {};

  // Check common text on background combinations
  const combinations = [
    { fg: 'textPrimary', bg: 'bgPrimary', name: 'Primary text on primary background' },
    { fg: 'textPrimary', bg: 'bgSecondary', name: 'Primary text on secondary background' },
    { fg: 'textSecondary', bg: 'bgPrimary', name: 'Secondary text on primary background' },
    { fg: 'textInverse', bg: 'primary', name: 'Inverse text on primary color' },
  ];

  combinations.forEach(({ fg, bg, name }) => {
    if (palette[fg] && palette[bg]) {
      results[name] = validateContrast(palette[fg], palette[bg], options);
    }
  });

  return results;
}

