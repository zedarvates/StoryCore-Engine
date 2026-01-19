import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EffectsPanel } from '../EffectsPanel';
import { useStore, useSelectedShot } from '../../store';
import type { Shot, Effect } from '../../types';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn(),
  useSelectedShot: vi.fn(),
}));

describe('EffectsPanel', () => {
  const mockAddEffect = vi.fn();
  const mockUpdateEffect = vi.fn();
  const mockDeleteEffect = vi.fn();
  const mockReorderEffects = vi.fn();

  const createMockShot = (effects: Effect[] = []): Shot => ({
    id: 'shot-1',
    title: 'Test Shot',
    description: 'Test description',
    duration: 5,
    position: 0,
    audioTracks: [],
    effects,
    textLayers: [],
    animations: [],
  });

  const createMockEffect = (overrides?: Partial<Effect>): Effect => ({
    id: 'effect-1',
    type: 'filter',
    name: 'Vintage',
    enabled: true,
    intensity: 50,
    parameters: {},
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useStore).mockImplementation((selector: any) => {
      const state = {
        addEffect: mockAddEffect,
        updateEffect: mockUpdateEffect,
        deleteEffect: mockDeleteEffect,
        reorderEffects: mockReorderEffects,
      };
      return selector ? selector(state) : state;
    });
  });

  describe('No Shot Selected', () => {
    beforeEach(() => {
      vi.mocked(useSelectedShot).mockReturnValue(null);
    });

    it('should display "No Shot Selected" message when no shot is selected', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('No Shot Selected')).toBeInTheDocument();
      expect(screen.getByText('Select a shot to apply visual effects')).toBeInTheDocument();
    });

    it('should display header with title', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Visual Effects')).toBeInTheDocument();
    });
  });

  describe('Shot Selected - No Effects', () => {
    beforeEach(() => {
      const shot = createMockShot();
      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should display shot title', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Test Shot')).toBeInTheDocument();
    });

    it('should display "No Effects Applied" message', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('No Effects Applied')).toBeInTheDocument();
      expect(screen.getByText('Add effects from the library below')).toBeInTheDocument();
    });

    it('should display effect library section', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Effect Library')).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(<EffectsPanel />);

      expect(screen.getByPlaceholderText('Search effects...')).toBeInTheDocument();
    });

    it('should display category filter', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });

    it('should display effect cards from library', () => {
      render(<EffectsPanel />);

      // Check for some effect names
      expect(screen.getByText('Vintage')).toBeInTheDocument();
      expect(screen.getByText('Sepia')).toBeInTheDocument();
      expect(screen.getByText('Black & White')).toBeInTheDocument();
    });

    it('should add effect when clicking on effect card', () => {
      render(<EffectsPanel />);

      const vintageButton = screen.getByRole('button', { name: /Vintage/i });
      fireEvent.click(vintageButton);

      expect(mockAddEffect).toHaveBeenCalledWith(
        'shot-1',
        expect.objectContaining({
          type: 'filter',
          name: 'Vintage',
          enabled: true,
          intensity: 50,
        })
      );
    });
  });

  describe('Search and Filter', () => {
    beforeEach(() => {
      const shot = createMockShot();
      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should filter effects by search query', () => {
      render(<EffectsPanel />);

      const searchInput = screen.getByPlaceholderText('Search effects...');
      fireEvent.change(searchInput, { target: { value: 'blur' } });

      // Should show blur effects
      expect(screen.getByText('Gaussian Blur')).toBeInTheDocument();
      expect(screen.getByText('Motion Blur')).toBeInTheDocument();

      // Should not show non-blur effects
      expect(screen.queryByText('Vintage')).not.toBeInTheDocument();
    });

    it('should filter effects by category', () => {
      render(<EffectsPanel />);

      // Open category dropdown and select "Color"
      const categorySelect = screen.getByRole('combobox');
      fireEvent.click(categorySelect);

      const colorOption = screen.getByRole('option', { name: 'Color' });
      fireEvent.click(colorOption);

      // Should show color effects
      expect(screen.getByText('Vintage')).toBeInTheDocument();
      expect(screen.getByText('Sepia')).toBeInTheDocument();

      // Should not show non-color effects
      expect(screen.queryByText('Gaussian Blur')).not.toBeInTheDocument();
    });

    it('should show "No effects found" when search has no results', () => {
      render(<EffectsPanel />);

      const searchInput = screen.getByPlaceholderText('Search effects...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No effects found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter')).toBeInTheDocument();
    });

    it('should display effect count', () => {
      render(<EffectsPanel />);

      // Should show total count initially
      expect(screen.getByText(/\d+ effects/)).toBeInTheDocument();
    });
  });

  describe('Applied Effects', () => {
    const effect1 = createMockEffect({ id: 'effect-1', name: 'Vintage', intensity: 70 });
    const effect2 = createMockEffect({ id: 'effect-2', name: 'Vignette', intensity: 30, enabled: false });

    beforeEach(() => {
      const shot = createMockShot([effect1, effect2]);
      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should display applied effects list', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Applied Effects')).toBeInTheDocument();
      expect(screen.getByText('2 active')).toBeInTheDocument();
    });

    it('should display each applied effect', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Vintage')).toBeInTheDocument();
      expect(screen.getByText('Vignette')).toBeInTheDocument();
    });

    it('should display effect intensity', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('70%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('should display effect type badge', () => {
      render(<EffectsPanel />);

      const badges = screen.getAllByText('filter');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should toggle effect enabled state', () => {
      render(<EffectsPanel />);

      // Find the first effect's toggle button (eye icon)
      const toggleButtons = screen.getAllByTitle(/Disable effect|Enable effect/);
      fireEvent.click(toggleButtons[0]);

      expect(mockUpdateEffect).toHaveBeenCalledWith(
        'shot-1',
        'effect-1',
        { enabled: false }
      );
    });

    it('should update effect intensity', () => {
      render(<EffectsPanel />);

      // Find intensity sliders
      const sliders = screen.getAllByRole('slider');
      
      // Simulate slider change
      fireEvent.change(sliders[0], { target: { value: '80' } });

      expect(mockUpdateEffect).toHaveBeenCalledWith(
        'shot-1',
        'effect-1',
        { intensity: 80 }
      );
    });

    it('should remove effect when clicking remove button', () => {
      render(<EffectsPanel />);

      const removeButtons = screen.getAllByTitle('Remove effect');
      fireEvent.click(removeButtons[0]);

      expect(mockDeleteEffect).toHaveBeenCalledWith('shot-1', 'effect-1');
    });

    it('should display reorder instruction', () => {
      render(<EffectsPanel />);

      expect(screen.getByText(/Drag to reorder/)).toBeInTheDocument();
      expect(screen.getByText(/Effects are applied from top to bottom/)).toBeInTheDocument();
    });
  });

  describe('Effect Library Categories', () => {
    beforeEach(() => {
      const shot = createMockShot();
      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should display color effects', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Vintage')).toBeInTheDocument();
      expect(screen.getByText('Sepia')).toBeInTheDocument();
      expect(screen.getByText('Black & White')).toBeInTheDocument();
    });

    it('should display blur effects', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Gaussian Blur')).toBeInTheDocument();
      expect(screen.getByText('Motion Blur')).toBeInTheDocument();
      expect(screen.getByText('Radial Blur')).toBeInTheDocument();
    });

    it('should display artistic effects', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Vignette')).toBeInTheDocument();
      expect(screen.getByText('Film Grain')).toBeInTheDocument();
      expect(screen.getByText('Light Leak')).toBeInTheDocument();
    });

    it('should display adjustment effects', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Brightness')).toBeInTheDocument();
      expect(screen.getByText('Contrast')).toBeInTheDocument();
      expect(screen.getByText('Saturation')).toBeInTheDocument();
    });

    it('should display effect descriptions', () => {
      render(<EffectsPanel />);

      expect(screen.getByText('Warm, nostalgic film look')).toBeInTheDocument();
      expect(screen.getByText('Smooth, even blur')).toBeInTheDocument();
      expect(screen.getByText('Darkened edges')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      const shot = createMockShot([createMockEffect()]);
      vi.mocked(useSelectedShot).mockReturnValue(shot);
    });

    it('should have accessible button labels', () => {
      render(<EffectsPanel />);

      expect(screen.getByTitle('Disable effect')).toBeInTheDocument();
      expect(screen.getByTitle('Remove effect')).toBeInTheDocument();
    });

    it('should have accessible form controls', () => {
      render(<EffectsPanel />);

      expect(screen.getByPlaceholderText('Search effects...')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have accessible sliders', () => {
      render(<EffectsPanel />);

      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(0);
    });
  });
});

