/**
 * Contrast Checker Tests
 */

import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  meetsWCAG_AA,
  meetsWCAG_AAA,
  validateContrast,
  validatePalette,
  ACCESSIBLE_COLORS,
} from '../contrastChecker';

describe('contrastChecker', () => {
  describe('getContrastRatio', () => {
    it('should calculate contrast ratio between black and white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should calculate contrast ratio between similar colors', () => {
      const ratio = getContrastRatio('#cccccc', '#ffffff');
      expect(ratio).toBeLessThan(2);
    });

    it('should handle hex colors with or without #', () => {
      const ratio1 = getContrastRatio('#000000', '#ffffff');
      const ratio2 = getContrastRatio('000000', 'ffffff');
      expect(ratio1).toBeCloseTo(ratio2, 1);
    });
  });

  describe('meetsWCAG_AA', () => {
    it('should return true for high contrast ratio', () => {
      expect(meetsWCAG_AA(5)).toBe(true);
    });

    it('should return false for low contrast ratio', () => {
      expect(meetsWCAG_AA(3)).toBe(false);
    });

    it('should use different threshold for large text', () => {
      expect(meetsWCAG_AA(3, true)).toBe(true);
      expect(meetsWCAG_AA(3, false)).toBe(false);
    });
  });

  describe('meetsWCAG_AAA', () => {
    it('should return true for very high contrast ratio', () => {
      expect(meetsWCAG_AAA(7)).toBe(true);
    });

    it('should return false for medium contrast ratio', () => {
      expect(meetsWCAG_AAA(5)).toBe(false);
    });

    it('should use different threshold for large text', () => {
      expect(meetsWCAG_AAA(4.5, true)).toBe(true);
      expect(meetsWCAG_AAA(4.5, false)).toBe(false);
    });
  });

  describe('validateContrast', () => {
    it('should validate black on white', () => {
      const result = validateContrast('#000000', '#ffffff');
      expect(result.meetsAA).toBe(true);
      expect(result.meetsAAA).toBe(true);
      expect(result.level).toBe('AAA');
    });

    it('should fail for low contrast', () => {
      const result = validateContrast('#cccccc', '#ffffff');
      expect(result.meetsAA).toBe(false);
      expect(result.level).toBe('FAIL');
      expect(result.recommendation).toBeDefined();
    });

    it('should include recommendation for failing contrast', () => {
      const result = validateContrast('#999999', '#ffffff');
      if (!result.meetsAA) {
        expect(result.recommendation).toContain('below the required');
      }
    });
  });

  describe('validatePalette', () => {
    it('should validate accessible colors palette', () => {
      const results = validatePalette(ACCESSIBLE_COLORS);
      expect(Object.keys(results).length).toBeGreaterThan(0);
    });

    it('should check multiple color combinations', () => {
      const results = validatePalette(ACCESSIBLE_COLORS);
      const allPass = Object.values(results).every((r: any) => r.meetsAA);
      expect(allPass).toBe(true);
    });
  });

  describe('ACCESSIBLE_COLORS', () => {
    it('should have all required color properties', () => {
      expect(ACCESSIBLE_COLORS.primary).toBeDefined();
      expect(ACCESSIBLE_COLORS.white).toBeDefined();
      expect(ACCESSIBLE_COLORS.black).toBeDefined();
      expect(ACCESSIBLE_COLORS.textPrimary).toBeDefined();
      expect(ACCESSIBLE_COLORS.bgPrimary).toBeDefined();
    });

    it('should have valid hex color format', () => {
      const hexRegex = /^#[0-9a-f]{6}$/i;
      Object.values(ACCESSIBLE_COLORS).forEach((color) => {
        expect(color).toMatch(hexRegex);
      });
    });
  });
});
