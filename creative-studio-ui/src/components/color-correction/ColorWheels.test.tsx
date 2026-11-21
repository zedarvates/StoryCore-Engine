import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { colorCorrectionPresetsService } from '@/services/ColorCorrectionPresets';
import { useColorCorrectionStore } from '@/stores/colorCorrectionStore';
import { ColorWheels } from './ColorWheels';

afterEach(() => {
  cleanup();
  useColorCorrectionStore.getState().resetAll();
});

it('reads and updates global hue alongside a color-specific adjustment', () => {
  const red = { colorRange: 'red' as const, hue: 5, saturation: 10, luminance: 0 };
  useColorCorrectionStore.getState().updateGlobalAdjustment({ hsl: [red] });
  render(<ColorWheels />);
  fireEvent.click(screen.getByRole('button', { name: /Advanced/ }));
  const hue = screen.getByRole('slider', { name: 'Hue' });
  expect(hue).toHaveValue('0');
  fireEvent.change(hue, { target: { value: '30' } });
  expect(hue).toHaveValue('30');
  expect(useColorCorrectionStore.getState().state.globalAdjustment.hsl).toEqual([
    red,
    { colorRange: 'all', hue: 30, saturation: 0, luminance: 0 },
  ]);
});

it('supplies complete default channels in built-in presets', () => {
  const presets = colorCorrectionPresetsService.getAllPresets();
  expect(presets.length).toBeGreaterThan(0);
  for (const { adjustments } of presets) {
    expect(adjustments.gain).toEqual([1, 1, 1]);
    expect(adjustments.curves.rgb).toHaveLength(4);
  }
});
