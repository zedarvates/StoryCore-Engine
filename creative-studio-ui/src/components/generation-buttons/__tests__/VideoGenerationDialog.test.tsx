/**
 * VideoGenerationDialog Component Tests
 * 
 * Tests for the video generation dialog component.
 * Validates parameter controls, validation, and integration with generation orchestrator.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoGenerationDialog } from '../VideoGenerationDialog';
import { useGenerationStore } from '../../../stores/generationStore';
import { generationOrchestrator } from '../../../services/GenerationOrchestrator';
import type { GeneratedAsset } from '../../../types/generation';

// Mock dependencies
vi.mock('../../../stores/generationStore');
vi.mock('../../../services/GenerationOrchestrator');

describe('VideoGenerationDialog', () => {
  const mockOnClose = vi.fn();
  const mockCompleteStage = vi.fn();
  const mockFailStage = vi.fn();
  const mockUpdateStageProgress = vi.fn();
  
  const mockSourceImage: GeneratedAsset = {
    id: 'image-1',
    type: 'image',
    url: 'data:image/png;base64,mock-image',
    metadata: {
      generationParams: {},
      fileSize: 1024,
      dimensions: { width: 1024, height: 1024 },
      format: 'png',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock store
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        id: 'pipeline-1',
        currentStage: 'image',
        stages: {
          prompt: {
            status: 'completed',
            result: {
              text: 'A beautiful landscape',
              categories: {},
              timestamp: Date.now(),
              editable: true,
            },
            attempts: 1,
          },
          image: {
            status: 'completed',
            result: mockSourceImage,
            attempts: 1,
          },
          video: {
            status: 'pending',
            attempts: 0,
          },
          audio: {
            status: 'pending',
            attempts: 0,
          },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      completeStage: mockCompleteStage,
      failStage: mockFailStage,
      updateStageProgress: mockUpdateStageProgress,
    } as any);
  });
  
  it('renders dialog when open', () => {
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Configure parameters for video generation/)).toBeInTheDocument();
  });
  
  it('does not render when closed', () => {
    render(
      <VideoGenerationDialog
        isOpen={false}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  
  it('displays source image preview', () => {
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const image = screen.getByAltText('Source for video generation');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockSourceImage.url);
  });
  
  it('pre-fills motion prompt from previous stage', () => {
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const promptInput = screen.getByLabelText(/Motion Description/);
    expect(promptInput).toHaveValue('A beautiful landscape, smooth camera movement, cinematic motion');
  });
  
  it('displays error when no source image available', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        id: 'pipeline-1',
        currentStage: 'prompt',
        stages: {
          prompt: { status: 'completed', attempts: 1 },
          image: { status: 'pending', attempts: 0 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      completeStage: mockCompleteStage,
      failStage: mockFailStage,
      updateStageProgress: mockUpdateStageProgress,
    } as any);
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText(/No source image available/)).toBeInTheDocument();
  });
  
  it('allows updating motion description', async () => {
    const user = userEvent.setup();
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const promptInput = screen.getByLabelText(/Motion Description/);
    await user.clear(promptInput);
    await user.type(promptInput, 'Camera pans left slowly');
    
    expect(promptInput).toHaveValue('Camera pans left slowly');
  });
  
  it('applies frame count presets', async () => {
    const user = userEvent.setup();
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const preset3s = screen.getByRole('button', { name: /3s \(73 frames\)/ });
    await user.click(preset3s);
    
    const frameCountInput = screen.getByDisplayValue('73');
    expect(frameCountInput).toBeInTheDocument();
  });
  
  it('applies dimension presets', async () => {
    const user = userEvent.setup();
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const presetHD = screen.getByRole('button', { name: /HD \(1024x576\)/ });
    await user.click(presetHD);
    
    const widthInput = screen.getByLabelText('Width');
    const heightInput = screen.getByLabelText('Height');
    
    expect(widthInput).toHaveValue(1024);
    expect(heightInput).toHaveValue(576);
  });
  
  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    // Clear the prompt
    const promptInput = screen.getByLabelText(/Motion Description/);
    await user.clear(promptInput);
    
    // Try to generate
    const generateButton = screen.getByRole('button', { name: /Generate Video/ });
    
    // Button should be disabled when prompt is empty
    expect(generateButton).toBeDisabled();
  });
  
  it('validates dimension constraints', async () => {
    const user = userEvent.setup();
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    // Set invalid width (not divisible by 8)
    const widthInput = screen.getByLabelText('Width');
    await user.clear(widthInput);
    await user.type(widthInput, '777');
    
    // Try to generate
    const generateButton = screen.getByRole('button', { name: /Generate Video/ });
    await user.click(generateButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Width must be divisible by 8')).toBeInTheDocument();
    });
  });
  
  it('calculates and displays video duration', () => {
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    // Default: 121 frames at 25 fps = 4.84s
    expect(screen.getByText(/Duration: 4\.8s/)).toBeInTheDocument();
  });
  
  it('calls generation orchestrator on generate', async () => {
    const user = userEvent.setup();
    const mockResult: GeneratedAsset = {
      id: 'video-1',
      type: 'video',
      url: 'data:video/mp4;base64,mock-video',
      metadata: {
        generationParams: {},
        fileSize: 2048,
        duration: 4.8,
        format: 'mp4',
      },
      relatedAssets: [mockSourceImage.id],
      timestamp: Date.now(),
    };
    
    vi.mocked(generationOrchestrator.generateVideo).mockResolvedValue(mockResult);
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /Generate Video/ });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(generationOrchestrator.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({
          inputImagePath: mockSourceImage.url,
          prompt: expect.stringContaining('smooth camera movement'),
          frameCount: 121,
          frameRate: 25,
          width: 1024,
          height: 1024,
          motionStrength: 0.8,
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });
  });
  
  it('completes stage and closes dialog on success', async () => {
    const user = userEvent.setup();
    const mockResult: GeneratedAsset = {
      id: 'video-1',
      type: 'video',
      url: 'data:video/mp4;base64,mock-video',
      metadata: {
        generationParams: {},
        fileSize: 2048,
        duration: 4.8,
        format: 'mp4',
      },
      relatedAssets: [mockSourceImage.id],
      timestamp: Date.now(),
    };
    
    vi.mocked(generationOrchestrator.generateVideo).mockResolvedValue(mockResult);
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /Generate Video/ });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(mockCompleteStage).toHaveBeenCalledWith('video', mockResult);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
  
  it('displays error on generation failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'ComfyUI server not available';
    
    vi.mocked(generationOrchestrator.generateVideo).mockRejectedValue(
      new Error(errorMessage)
    );
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /Generate Video/ });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
  
  it('disables controls during generation', async () => {
    const user = userEvent.setup();
    
    vi.mocked(generationOrchestrator.generateVideo).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /Generate Video/ });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generating.../ })).toBeDisabled();
    });
    
    const promptInput = screen.getByLabelText(/Motion Description/);
    expect(promptInput).toBeDisabled();
  });
  
  it('allows closing dialog when not generating', async () => {
    const user = userEvent.setup();
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
  
  it('prevents closing dialog during generation', async () => {
    const user = userEvent.setup();
    
    vi.mocked(generationOrchestrator.generateVideo).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /Generate Video/ });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generating.../ })).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeDisabled();
  });
  
  it('updates progress during generation', async () => {
    const user = userEvent.setup();
    let progressCallback: ((progress: any) => void) | undefined;
    
    vi.mocked(generationOrchestrator.generateVideo).mockImplementation(
      (params, onProgress) => {
        progressCallback = onProgress;
        return new Promise(() => {}); // Never resolves
      }
    );
    
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    const generateButton = screen.getByRole('button', { name: /Generate Video/ });
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(progressCallback).toBeDefined();
    });
    
    // Simulate progress update
    progressCallback!({
      stage: 'latent',
      stageProgress: 50,
      overallProgress: 25,
      estimatedTimeRemaining: 30000,
      message: 'Generating latent frames...',
      cancellable: false,
    });
    
    expect(mockUpdateStageProgress).toHaveBeenCalledWith('video', expect.objectContaining({
      stage: 'latent',
      stageProgress: 50,
    }));
  });
  
  it('adjusts motion strength slider', () => {
    render(
      <VideoGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        sourceImage={mockSourceImage}
      />
    );
    
    // Find all sliders and get the motion strength one (third slider)
    const sliders = screen.getAllByRole('slider');
    const motionStrengthSlider = sliders[2]; // Third slider is motion strength
    
    // Verify it's the motion strength slider by checking its value
    expect(motionStrengthSlider).toHaveAttribute('aria-valuenow', '0.8');
    
    // The display value should be visible
    expect(screen.getByText('0.80')).toBeInTheDocument();
  });
});
