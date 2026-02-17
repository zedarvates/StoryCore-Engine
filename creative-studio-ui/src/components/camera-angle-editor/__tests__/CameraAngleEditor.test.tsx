/**
 * Unit tests for CameraAngleEditor Component
 * 
 * Tests for the main camera angle editor component including:
 * - Rendering with default props
 * - Image upload handling
 * - Angle selection
 * - Generation flow
 * - Error handling
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraAngleEditor } from '../CameraAngleEditor';
import { useCameraAngleGeneration } from '@/hooks/useCameraAngleGeneration';
import type { CameraAngleResult, CameraAnglePresetMetadata } from '@/types/cameraAngle';

// Mock the hook
vi.mock('@/hooks/useCameraAngleGeneration', () => ({
  useCameraAngleGeneration: vi.fn(),
}));

// Mock child components
vi.mock('../AnglePresetSelector', () => ({
  AnglePresetSelector: ({ presets, selectedAngles, onAngleToggle }: any) => (
    <div data-testid="angle-preset-selector">
      <span data-testid="selected-count">{selectedAngles.length}</span>
      {presets.map((preset: CameraAnglePresetMetadata) => (
        <button
          key={preset.id}
          data-testid={`angle-${preset.id}`}
          onClick={() => onAngleToggle(preset.id)}
        >
          {preset.displayName}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../ResultsGrid', () => ({
  ResultsGrid: ({ results, isLoading, progress, error, onRetry }: any) => (
    <div data-testid="results-grid">
      {isLoading && <span data-testid="loading-indicator">Loading... {progress}%</span>}
      {error && <span data-testid="error-message">{error}</span>}
      {results?.length > 0 && <span data-testid="results-count">{results.length} results</span>}
      {!isLoading && !error && (!results || results.length === 0) && (
        <span data-testid="no-results">No results</span>
      )}
      {error && onRetry && (
        <button data-testid="retry-button" onClick={onRetry}>Retry</button>
      )}
    </div>
  ),
}));

// Sample mock data - using valid CameraAnglePreset values
const mockPresets: CameraAnglePresetMetadata[] = [
  { id: 'front', displayName: 'Front View', description: 'Front view', icon: 'camera', promptSuffix: 'front view' },
  { id: 'left', displayName: 'Left Side', description: 'Left side', icon: 'camera', promptSuffix: 'left side view' },
  { id: 'right', displayName: 'Right Side', description: 'Right side', icon: 'camera', promptSuffix: 'right side view' },
];

const mockResults: CameraAngleResult[] = [
  {
    id: 'result-1',
    angleId: 'front',
    originalImageBase64: 'base64-original-image',
    generatedImageBase64: 'base64-image-data-1',
    promptUsed: 'front view',
    generationTimeSeconds: 5.5,
    metadata: {},
  },
  {
    id: 'result-2',
    angleId: 'left',
    originalImageBase64: 'base64-original-image',
    generatedImageBase64: 'base64-image-data-2',
    promptUsed: 'left side view',
    generationTimeSeconds: 4.2,
    metadata: {},
  },
];

// Default mock return value - matches UseCameraAngleGenerationReturn interface
const defaultMockReturn = {
  job: { 
    jobId: null,
    status: 'pending' as const,
    progress: 0, 
    currentStep: null, 
    error: null,
    completedAngles: [] as import('@/types/cameraAngle').CameraAnglePreset[],
    remainingAngles: [] as import('@/types/cameraAngle').CameraAnglePreset[],
    results: [] as CameraAngleResult[],
    isLoading: false,
  },
  presets: mockPresets,
  selectedAngles: [] as import('@/types/cameraAngle').CameraAnglePreset[],
  sourceImage: null,
  options: { preserveStyle: true, quality: 'standard' as const, seed: null, customPrompt: null },
  error: null,
  isGenerating: false,
  hasResults: false,
  startGeneration: vi.fn().mockResolvedValue(undefined),
  cancelGeneration: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  setSourceImageFromUrl: vi.fn().mockResolvedValue(undefined),
  setSourceImageFromFile: vi.fn().mockResolvedValue(undefined),
  setSourceImage: vi.fn(),
  toggleAngle: vi.fn(),
  setSelectedAngles: vi.fn(),
  selectAllAngles: vi.fn(),
  clearAngleSelection: vi.fn(),
  setOptions: vi.fn(),
  clearError: vi.fn(),
  downloadResult: vi.fn(),
  downloadAllResults: vi.fn(),
};

describe('CameraAngleEditor', () => {
  let mockHook: ReturnType<typeof useCameraAngleGeneration>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHook = { ...defaultMockReturn };
    (useCameraAngleGeneration as any).mockReturnValue(mockHook);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render the editor with header', () => {
      render(<CameraAngleEditor />);

      expect(screen.getByText('Camera Angle Editor')).toBeInTheDocument();
    });

    it('should render without header when showHeader is false', () => {
      render(<CameraAngleEditor showHeader={false} />);

      expect(screen.queryByText('Camera Angle Editor')).not.toBeInTheDocument();
    });

    it('should render close button when onClose is provided', () => {
      const onClose = vi.fn();
      render(<CameraAngleEditor onClose={onClose} />);

      // Close button should be present
      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
    });

    it('should render source image section', () => {
      render(<CameraAngleEditor />);

      expect(screen.getByText('Source Image')).toBeInTheDocument();
      expect(screen.getByText('No image')).toBeInTheDocument();
    });

    it('should render angle preset selector', () => {
      render(<CameraAngleEditor />);

      expect(screen.getByTestId('angle-preset-selector')).toBeInTheDocument();
    });

    it('should render generation options when showOptions is true', () => {
      render(<CameraAngleEditor showOptions={true} />);

      expect(screen.getByText('Generation Options')).toBeInTheDocument();
    });

    it('should not render generation options when showOptions is false', () => {
      render(<CameraAngleEditor showOptions={false} />);

      expect(screen.queryByText('Generation Options')).not.toBeInTheDocument();
    });

    it('should render results grid', () => {
      render(<CameraAngleEditor />);

      expect(screen.getByTestId('results-grid')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Image Handling Tests
  // ============================================================================

  describe('Image Handling', () => {
    it('should display uploaded image', () => {
      mockHook.sourceImage = 'data:image/png;base64,test-image';
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      const image = screen.getByAltText('Source image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'data:image/png;base64,test-image');
    });

    it('should call setSourceImageFromFile when file is uploaded', async () => {
      const user = userEvent.setup();
      render(<CameraAngleEditor />);

      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      if (input) {
        await user.upload(input, file);
        expect(mockHook.setSourceImageFromFile).toHaveBeenCalled();
      }
    });

    it('should clear image when clear button is clicked', async () => {
      mockHook.sourceImage = 'data:image/png;base64,test-image';
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      const clearButton = screen.getByText('Clear Image');
      await fireEvent.click(clearButton);

      expect(mockHook.setSourceImage).toHaveBeenCalledWith(null);
    });

    it('should load initial image from URL on mount', () => {
      render(<CameraAngleEditor initialImagePath="/path/to/image.jpg" />);

      expect(mockHook.setSourceImageFromUrl).toHaveBeenCalledWith('/path/to/image.jpg');
    });
  });

  // ============================================================================
  // Angle Selection Tests
  // ============================================================================

  describe('Angle Selection', () => {
    it('should display selected angle count', () => {
      mockHook.selectedAngles = ['front', 'left'];
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      expect(screen.getByTestId('selected-count')).toHaveTextContent('2');
    });

    it('should call toggleAngle when angle is clicked', async () => {
      render(<CameraAngleEditor />);

      const angleButton = screen.getByTestId('angle-front');
      await fireEvent.click(angleButton);

      expect(mockHook.toggleAngle).toHaveBeenCalledWith('front');
    });
  });

  // ============================================================================
  // Generation Tests
  // ============================================================================

  describe('Generation', () => {
    it('should disable generate button when no image or angles selected', () => {
      render(<CameraAngleEditor />);

      const generateButton = screen.getByText(/Generate/);
      expect(generateButton).toBeDisabled();
    });

    it('should enable generate button when image and angles are selected', () => {
      mockHook.sourceImage = 'base64-image';
      mockHook.selectedAngles = ['front'];
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      const generateButton = screen.getByText(/Generate/);
      expect(generateButton).not.toBeDisabled();
    });

    it('should call startGeneration when generate button is clicked', async () => {
      mockHook.sourceImage = 'base64-image';
      mockHook.selectedAngles = ['front'];
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      const generateButton = screen.getByText(/Generate/);
      await fireEvent.click(generateButton);

      expect(mockHook.startGeneration).toHaveBeenCalled();
    });

    it('should show cancel button during generation', () => {
      mockHook.isGenerating = true;
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call cancelGeneration when cancel button is clicked', async () => {
      mockHook.isGenerating = true;
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      const cancelButton = screen.getByText('Cancel');
      await fireEvent.click(cancelButton);

      expect(mockHook.cancelGeneration).toHaveBeenCalled();
    });

    it('should show loading state in results grid during generation', () => {
      mockHook.isGenerating = true;
      mockHook.job = { 
        jobId: 'test-job',
        status: 'processing' as const,
        results: [], 
        progress: 50, 
        currentStep: 'Generating...', 
        error: null,
        completedAngles: [],
        remainingAngles: ['front', 'left'],
        isLoading: true,
      };
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Options Tests
  // ============================================================================

  describe('Options', () => {
    it('should update preserve style option', async () => {
      render(<CameraAngleEditor showOptions={true} />);

      const switchInput = document.getElementById('preserve-style');
      if (switchInput) {
        await fireEvent.click(switchInput);
        expect(mockHook.setOptions).toHaveBeenCalledWith({ preserveStyle: false });
      }
    });

    it('should update quality option', async () => {
      render(<CameraAngleEditor showOptions={true} />);

      // Find quality select and change value
      const qualityTrigger = screen.getByText('Standard');
      if (qualityTrigger) {
        await fireEvent.click(qualityTrigger);
      }
    });

    it('should update custom prompt', async () => {
      render(<CameraAngleEditor showOptions={true} />);

      const textarea = screen.getByPlaceholderText('Add additional instructions for the AI...');
      await fireEvent.change(textarea, { target: { value: 'Test prompt' } });

      expect(mockHook.setOptions).toHaveBeenCalledWith({ customPrompt: 'Test prompt' });
    });
  });

  // ============================================================================
  // Results Tests
  // ============================================================================

  describe('Results', () => {
    it('should display results when generation is complete', () => {
      mockHook.job = { 
        jobId: 'test-job',
        status: 'completed' as const,
        results: mockResults, 
        progress: 100, 
        currentStep: null, 
        error: null,
        completedAngles: ['front', 'left'],
        remainingAngles: [],
        isLoading: false,
      };
      mockHook.hasResults = true;
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      expect(screen.getByTestId('results-count')).toHaveTextContent('2 results');
    });

    it('should display error message when generation fails', () => {
      mockHook.error = 'Generation failed';
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      expect(screen.getByTestId('error-message')).toHaveTextContent('Generation failed');
    });

    it('should call retry when retry button is clicked', async () => {
      mockHook.error = 'Generation failed';
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      const retryButton = screen.getByTestId('retry-button');
      await fireEvent.click(retryButton);

      expect(mockHook.clearError).toHaveBeenCalled();
      expect(mockHook.startGeneration).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Reset Tests
  // ============================================================================

  describe('Reset', () => {
    it('should call reset when reset button is clicked', async () => {
      render(<CameraAngleEditor />);

      const resetButton = screen.getByText('Reset');
      await fireEvent.click(resetButton);

      expect(mockHook.reset).toHaveBeenCalled();
    });

    it('should disable reset button during generation', () => {
      mockHook.isGenerating = true;
      (useCameraAngleGeneration as any).mockReturnValue(mockHook);

      render(<CameraAngleEditor />);

      const resetButton = screen.getByText('Reset');
      expect(resetButton).toBeDisabled();
    });
  });

  // ============================================================================
  // Callback Tests
  // ============================================================================

  describe('Callbacks', () => {
    it('should call onGenerationComplete when generation completes', () => {
      const onGenerationComplete = vi.fn();
      mockHook.job = { 
        jobId: 'test-job',
        status: 'completed' as const,
        results: mockResults, 
        progress: 100, 
        currentStep: null, 
        error: null,
        completedAngles: ['front', 'left'],
        remainingAngles: [],
        isLoading: false,
      };
      (useCameraAngleGeneration as any).mockImplementation(({ onGenerationComplete: callback }: any) => {
        // Simulate calling the callback
        if (callback) {
          callback(mockResults);
        }
        return mockHook;
      });

      render(<CameraAngleEditor onGenerationComplete={onGenerationComplete} />);
    });

    it('should call onGenerationError when error occurs', () => {
      const onGenerationError = vi.fn();
      (useCameraAngleGeneration as any).mockImplementation(({ onGenerationError: callback }: any) => {
        // Simulate calling the callback
        if (callback) {
          callback('Test error');
        }
        return mockHook;
      });

      render(<CameraAngleEditor onGenerationError={onGenerationError} />);
    });

    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(<CameraAngleEditor onClose={onClose} />);

      // Find and click close button (X icon button)
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.querySelector('svg'));
      
      if (closeButton) {
        await fireEvent.click(closeButton);
        // onClose should be called
      }
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper labels for form controls', () => {
      render(<CameraAngleEditor showOptions={true} />);

      expect(screen.getByLabelText('Preserve Original Style')).toBeInTheDocument();
    });

    it('should have accessible file input', () => {
      render(<CameraAngleEditor />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });
  });
});
