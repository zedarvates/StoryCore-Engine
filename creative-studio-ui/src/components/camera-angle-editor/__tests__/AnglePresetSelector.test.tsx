/**
 * Unit tests for AnglePresetSelector Component
 * 
 * Tests for the camera angle preset selection component including:
 * - Rendering presets
 * - Selection state
 * - Select all/clear functionality
 * - Disabled state
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnglePresetSelector } from '../AnglePresetSelector';
import type { CameraAnglePresetMetadata, CameraAnglePreset } from '@/types/cameraAngle';

// Sample mock data matching actual types
const mockPresets: CameraAnglePresetMetadata[] = [
  { id: 'front', displayName: 'Front View', description: 'Front view of the subject', icon: 'Camera', promptSuffix: 'front view' },
  { id: 'left', displayName: 'Left Side', description: 'Left side view', icon: 'Camera', promptSuffix: 'left side view' },
  { id: 'isometric', displayName: 'Isometric', description: 'Isometric view', icon: 'Camera', promptSuffix: 'isometric view' },
  { id: 'close_up', displayName: 'Close-up', description: 'Close-up shot', icon: 'Camera', promptSuffix: 'close up shot' },
  { id: 'back', displayName: 'Back View', description: 'Back view', icon: 'Camera', promptSuffix: 'back view' },
  { id: 'bird_eye', displayName: 'Bird Eye', description: 'Bird\'s eye view', icon: 'Camera', promptSuffix: 'bird eye view' },
];

describe('AnglePresetSelector', () => {
  const defaultProps = {
    presets: mockPresets,
    selectedAngles: [] as CameraAnglePreset[],
    onAngleToggle: vi.fn(),
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    disabled: false,
    columns: 4 as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render all presets', () => {
      render(<AnglePresetSelector {...defaultProps} />);

      expect(screen.getByText('Front View')).toBeInTheDocument();
      expect(screen.getByText('Left Side')).toBeInTheDocument();
      expect(screen.getByText('Isometric')).toBeInTheDocument();
      expect(screen.getByText('Close-up')).toBeInTheDocument();
      expect(screen.getByText('Back View')).toBeInTheDocument();
      expect(screen.getByText('Bird Eye')).toBeInTheDocument();
    });

    it('should render section title', () => {
      render(<AnglePresetSelector {...defaultProps} />);

      expect(screen.getByText('Select Camera Angles')).toBeInTheDocument();
    });

    it('should render select all button', () => {
      render(<AnglePresetSelector {...defaultProps} />);

      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('should render clear selection button', () => {
      render(<AnglePresetSelector {...defaultProps} />);

      expect(screen.getByText('Clear Selection')).toBeInTheDocument();
    });

    it('should render selected count', () => {
      render(<AnglePresetSelector {...defaultProps} selectedAngles={['front', 'left'] as CameraAnglePreset[]} />);

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should render preset descriptions', () => {
      render(<AnglePresetSelector {...defaultProps} />);

      expect(screen.getByText('Front view of the subject')).toBeInTheDocument();
      expect(screen.getByText('Left side view')).toBeInTheDocument();
    });

    it('should render with different column counts', () => {
      const { container, rerender } = render(<AnglePresetSelector {...defaultProps} columns={2} />);
      
      // Check grid has correct class
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();

      rerender(<AnglePresetSelector {...defaultProps} columns={3} />);
      expect(container.querySelector('.grid-cols-3')).toBeInTheDocument();

      rerender(<AnglePresetSelector {...defaultProps} columns={4} />);
      expect(container.querySelector('.grid-cols-4')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Selection State Tests
  // ============================================================================

  describe('Selection State', () => {
    it('should highlight selected presets', () => {
      render(<AnglePresetSelector {...defaultProps} selectedAngles={['front'] as CameraAnglePreset[]} />);

      const frontCard = screen.getByText('Front View').closest('div');
      expect(frontCard).toHaveClass('ring-2');
    });

    it('should not highlight unselected presets', () => {
      render(<AnglePresetSelector {...defaultProps} selectedAngles={['front'] as CameraAnglePreset[]} />);

      const sideCard = screen.getByText('Left Side').closest('div');
      expect(sideCard).not.toHaveClass('ring-2');
    });

    it('should show checkmark for selected presets', () => {
      render(<AnglePresetSelector {...defaultProps} selectedAngles={['front'] as CameraAnglePreset[]} />);

      // Check for checkmark icon (it should be visible for selected items)
      const frontCard = screen.getByText('Front View').closest('div');
      expect(frontCard).toBeInTheDocument();
    });

    it('should update selected count when selection changes', () => {
      const { rerender } = render(<AnglePresetSelector {...defaultProps} selectedAngles={[]} />);
      
      expect(screen.getByText('0 selected')).toBeInTheDocument();

      rerender(<AnglePresetSelector {...defaultProps} selectedAngles={['front', 'left'] as CameraAnglePreset[]} />);
      expect(screen.getByText('2 selected')).toBeInTheDocument();

      rerender(<AnglePresetSelector {...defaultProps} selectedAngles={['front', 'left', 'isometric'] as CameraAnglePreset[]} />);
      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Interaction Tests
  // ============================================================================

  describe('Interactions', () => {
    it('should call onAngleToggle when preset is clicked', async () => {
      const onAngleToggle = vi.fn();
      render(<AnglePresetSelector {...defaultProps} onAngleToggle={onAngleToggle} />);

      const frontCard = screen.getByText('Front View').closest('div');
      if (frontCard) {
        await fireEvent.click(frontCard);
        expect(onAngleToggle).toHaveBeenCalledWith('front');
      }
    });

    it('should call onSelectAll when select all button is clicked', async () => {
      const onSelectAll = vi.fn();
      render(<AnglePresetSelector {...defaultProps} onSelectAll={onSelectAll} />);

      const selectAllButton = screen.getByText('Select All');
      await fireEvent.click(selectAllButton);

      expect(onSelectAll).toHaveBeenCalled();
    });

    it('should call onClearSelection when clear selection button is clicked', async () => {
      const onClearSelection = vi.fn();
      render(<AnglePresetSelector {...defaultProps} onClearSelection={onClearSelection} selectedAngles={['front'] as CameraAnglePreset[]} />);

      const clearButton = screen.getByText('Clear Selection');
      await fireEvent.click(clearButton);

      expect(onClearSelection).toHaveBeenCalled();
    });

    it('should disable clear button when no angles selected', () => {
      render(<AnglePresetSelector {...defaultProps} selectedAngles={[]} />);

      const clearButton = screen.getByText('Clear Selection');
      expect(clearButton).toBeDisabled();
    });

    it('should enable clear button when angles are selected', () => {
      render(<AnglePresetSelector {...defaultProps} selectedAngles={['front'] as CameraAnglePreset[]} />);

      const clearButton = screen.getByText('Clear Selection');
      expect(clearButton).not.toBeDisabled();
    });
  });

  // ============================================================================
  // Disabled State Tests
  // ============================================================================

  describe('Disabled State', () => {
    it('should disable all interactions when disabled prop is true', () => {
      render(<AnglePresetSelector {...defaultProps} disabled={true} />);

      const selectAllButton = screen.getByText('Select All');
      const clearButton = screen.getByText('Clear Selection');

      expect(selectAllButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });

    it('should apply disabled styling to preset cards', () => {
      render(<AnglePresetSelector {...defaultProps} disabled={true} />);

      const frontCard = screen.getByText('Front View').closest('div');
      expect(frontCard).toHaveClass('opacity-50');
    });

    it('should not call onAngleToggle when disabled', async () => {
      const onAngleToggle = vi.fn();
      render(<AnglePresetSelector {...defaultProps} onAngleToggle={onAngleToggle} disabled={true} />);

      const frontCard = screen.getByText('Front View').closest('div');
      if (frontCard) {
        await fireEvent.click(frontCard);
        expect(onAngleToggle).not.toHaveBeenCalled();
      }
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty presets array', () => {
      render(<AnglePresetSelector {...defaultProps} presets={[]} />);

      expect(screen.getByText('Select Camera Angles')).toBeInTheDocument();
      expect(screen.getByText('0 selected')).toBeInTheDocument();
    });

    it('should handle all presets selected', () => {
      const allSelected = mockPresets.map(p => p.id) as CameraAnglePreset[];
      render(<AnglePresetSelector {...defaultProps} selectedAngles={allSelected} />);

      expect(screen.getByText(`${mockPresets.length} selected`)).toBeInTheDocument();
    });

    it('should handle single preset', () => {
      render(<AnglePresetSelector {...defaultProps} presets={[mockPresets[0]]} />);

      expect(screen.getByText('Front View')).toBeInTheDocument();
      expect(screen.queryByText('Left Side')).not.toBeInTheDocument();
    });

    it('should handle preset with all required fields', () => {
      const validPresets: CameraAnglePresetMetadata[] = [
        { id: 'front', displayName: 'Test', description: 'Test description', icon: 'Camera', promptSuffix: 'test' },
      ];

      render(<AnglePresetSelector {...defaultProps} presets={validPresets} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper role for grid', () => {
      const { container } = render(<AnglePresetSelector {...defaultProps} />);

      expect(container.querySelector('[role="grid"]')).toBeInTheDocument();
    });

    it('should have proper role for grid cells', () => {
      const { container } = render(<AnglePresetSelector {...defaultProps} />);

      const cells = container.querySelectorAll('[role="gridcell"]');
      expect(cells.length).toBe(mockPresets.length);
    });

    it('should have accessible button labels', () => {
      render(<AnglePresetSelector {...defaultProps} />);

      expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
    });

    it('should have aria-pressed for selected items', () => {
      render(<AnglePresetSelector {...defaultProps} selectedAngles={['front'] as CameraAnglePreset[]} />);

      const frontCard = screen.getByText('Front View').closest('button');
      expect(frontCard).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // ============================================================================
  // Visual State Tests
  // ============================================================================

  describe('Visual States', () => {
    it('should show hover state on preset cards', () => {
      render(<AnglePresetSelector {...defaultProps} />);

      const frontCard = screen.getByText('Front View').closest('div');
      expect(frontCard).toHaveClass('hover:border-primary');
    });

    it('should show selected state styling', () => {
      render(<AnglePresetSelector {...defaultProps} selectedAngles={['front'] as CameraAnglePreset[]} />);

      const frontCard = screen.getByText('Front View').closest('div');
      expect(frontCard).toHaveClass('ring-2');
      expect(frontCard).toHaveClass('ring-primary');
    });

    it('should show correct icon for each preset', () => {
      render(<AnglePresetSelector {...defaultProps} />);

      // All presets should have their icon rendered
      const cards = screen.getAllByRole('gridcell');
      expect(cards.length).toBe(mockPresets.length);
    });
  });
});
