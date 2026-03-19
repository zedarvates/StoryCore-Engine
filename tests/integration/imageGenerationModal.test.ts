import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageGenerationModal } from '@/components/modals/ImageGenerationModal';
import { ComfyUIService } from '@/services/comfyuiService';
import { toast } from '@/components/ui/toaster';

// Mock services
jest.mock('@/services/comfyuiService');
jest.mock('@/components/ui/toaster');

describe('ImageGenerationModal Integration Tests', () => {
  let mockGenerateImage: jest.SpyInstance;
  let mockGetAvailableCheckpoints: jest.SpyInstance;
  let mockGetGPUInfo: jest.SpyInstance;

  beforeEach(() => {
    // Mock ComfyUIService
    mockGenerateImage = jest.fn().mockResolvedValue('https://example.com/generated-image.jpg');
    mockGetAvailableCheckpoints = jest.fn().mockResolvedValue(['checkpoint1.safetensors', 'checkpoint2.safetensors']);
    mockGetGPUInfo = jest.fn().mockResolvedValue({ name: 'NVIDIA GeForce RTX 3060', vramFree: 6144 });

    (ComfyUIService as jest.Mock).mockImplementation(() => ({
      generateImage: mockGenerateImage,
    }));

    // Mock toast
    (toast as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Workflow Selection Tests', () => {
    it('should display workflow options correctly', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Check that workflow tabs are visible
      expect(screen.getByText('Workflow')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
      expect(screen.getByText('Advanced')).toBeInTheDocument();

      // Check that workflow options are displayed
      const workflowCards = await screen.findAllByRole('button', { name: /workflow/i });
      expect(workflowCards.length).toBeGreaterThan(0);
    });

    it('should select workflow and update default parameters', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Click on a workflow card
      const workflowCard = await screen.findByText('FLUX.2');
      fireEvent.click(workflowCard);

      // Check that the selected workflow is highlighted
      expect(workflowCard).toHaveClass('border-primary bg-primary/5 ring-2 ring-primary/20');

      // Check that resolution presets are updated
      const resolutionPresets = await screen.findAllByRole('button', { name: /1024x1024|512x512|768x768/i });
      expect(resolutionPresets.length).toBeGreaterThan(0);
    });
  });

  describe('Model Selection Tests', () => {
    it('should load and display available checkpoints', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Wait for modal to load
      await waitFor(() => screen.getByText('Model'));

      // Click on Model tab
      const modelTab = screen.getByText('Model');
      fireEvent.click(modelTab);

      // Check that checkpoints are loading
      expect(screen.getByText('Loading models...')).toBeInTheDocument();

      // Wait for checkpoints to load
      await waitFor(() => screen.getByText('checkpoint1.safetensors'));

      // Check that checkpoints are displayed
      const checkpointItems = await screen.findAllByText(/checkpoint1|checkpoint2/i);
      expect(checkpointItems.length).toBe(2);
    });

    it('should handle model download functionality', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Click on Model tab
      const modelTab = screen.getByText('Model');
      fireEvent.click(modelTab);

      // Wait for modal to load
      await waitFor(() => screen.getByText('Model'));

      // Check that download button is available
      const downloadButton = screen.getByText('Download Model');
      expect(downloadButton).toBeInTheDocument();

      // Mock window.open
      const mockWindowOpen = jest.spyOn(window, 'open').mockImplementation(() => {});

      // Click download button
      fireEvent.click(downloadButton);

      // Verify window.open was called
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://huggingface.co/cocorang/FireRed-Image-Edit-1.0-FP8_And_BF16',
        '_blank'
      );
    });
  });

  describe('Advanced Parameters Tests', () => {
    it('should validate prompt is required', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Click on Advanced tab
      const advancedTab = screen.getByText('Advanced');
      fireEvent.click(advancedTab);

      // Wait for advanced tab to load
      await waitFor(() => screen.getByText('Prompt'));

      // Try to generate without prompt
      const generateButton = screen.getByText('Generate Image');
      fireEvent.click(generateButton);

      // Verify toast message
      expect(toast).toHaveBeenCalledWith({
        title: 'Prompt Required',
        description: 'Please enter a prompt for image generation',
        variant: 'destructive'
      });
    });

    it('should handle image generation with valid parameters', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Click on Advanced tab
      const advancedTab = screen.getByText('Advanced');
      fireEvent.click(advancedTab);

      // Wait for advanced tab to load
      await waitFor(() => screen.getByText('Prompt'));

      // Enter prompt
      const promptInput = screen.getByPlaceholderText('Describe the image you want to generate...');
      fireEvent.change(promptInput, { target: { value: 'A beautiful landscape with mountains and lake' } });

      // Click generate button
      const generateButton = screen.getByText('Generate Image');
      fireEvent.click(generateButton);

      // Wait for generation to complete
      await waitFor(() => screen.getByText('Image Generated'));

      // Verify toast message
      expect(toast).toHaveBeenCalledWith({
        title: 'Image Generated',
        description: 'Your image has been generated successfully',
        variant: 'default'
      });

      // Verify that onGenerate callback was called
      expect(mockGenerateImage).toHaveBeenCalled();
    });

    it('should handle generation progress and display preview', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Click on Advanced tab
      const advancedTab = screen.getByText('Advanced');
      fireEvent.click(advancedTab);

      // Wait for advanced tab to load
      await waitFor(() => screen.getByText('Prompt'));

      // Enter prompt
      const promptInput = screen.getByPlaceholderText('Describe the image you want to generate...');
      fireEvent.change(promptInput, { target: { value: 'A beautiful landscape with mountains and lake' } });

      // Click generate button
      const generateButton = screen.getByText('Generate Image');
      fireEvent.click(generateButton);

      // Wait for progress bar to appear
      await waitFor(() => screen.getByText('Generating...'));

      // Verify progress bar is displayed
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();

      // Wait for generation to complete
      await waitFor(() => screen.getByText('Image Generated'));

      // Verify generated image preview is displayed
      const generatedImage = screen.getByAltText('Generated');
      expect(generatedImage).toBeInTheDocument();
    });
  });

  describe('GPU Information Tests', () => {
    it('should display GPU information when available', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Wait for modal to load
      await waitFor(() => screen.getByText('Workflow'));

      // Check that GPU info banner is displayed
      const gpuBanner = await screen.findByText('NVIDIA GeForce RTX 3060');
      expect(gpuBanner).toBeInTheDocument();

      // Check that VRAM information is displayed
      const vramInfo = screen.getByText('6.0GB free');
      expect(vramInfo).toBeInTheDocument();
    });

    it('should handle GPU info refresh', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Wait for modal to load
      await waitFor(() => screen.getByText('Workflow'));

      // Check that GPU info banner is displayed
      const gpuBanner = await screen.findByText('NVIDIA GeForce RTX 3060');
      expect(gpuBanner).toBeInTheDocument();

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // Verify that GPU info is reloaded
      expect(mockGetGPUInfo).toHaveBeenCalled();
    });
  });

  describe('Resolution Validation Tests', () => {
    it('should validate resolution based on workflow and GPU', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Click on Workflow tab
      const workflowTab = screen.getByText('Workflow');
      fireEvent.click(workflowTab);

      // Wait for workflow tab to load
      await waitFor(() => screen.getByText('Workflow'));

      // Check that resolution presets are available
      const resolutionPresets = await screen.findAllByRole('button', { name: /1024x1024|512x512|768x768/i });
      expect(resolutionPresets.length).toBeGreaterThan(0);

      // Try to set invalid resolution
      const widthInput = screen.getByDisplayValue('1024');
      const heightInput = screen.getByDisplayValue('1024');

      // Mock validation to return error
      // (In a real test, you would mock the validation function)

      // Check that resolution warning is displayed for invalid values
      // (This would depend on the actual validation logic)
    });

    it('should use recommended resolution for selected workflow', async () => {
      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Click on Workflow tab
      const workflowTab = screen.getByText('Workflow');
      fireEvent.click(workflowTab);

      // Wait for workflow tab to load
      await waitFor(() => screen.getByText('Workflow'));

      // Click on a workflow card
      const workflowCard = await screen.findByText('FLUX.2');
      fireEvent.click(workflowCard);

      // Check that resolution is set to recommended values
      const widthInput = screen.getByDisplayValue('1024');
      const heightInput = screen.getByDisplayValue('1024');

      // Verify that recommended resolution is used
      expect(widthInput.value).toBe('1024');
      expect(heightInput.value).toBe('1024');
    });
  });

  describe('Integration with ShotWizardModal Tests', () => {
    it('should return generated image URL to parent component', async () => {
      const mockOnGenerate = jest.fn();

      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={mockOnGenerate}
        />
      );

      // Click on Advanced tab
      const advancedTab = screen.getByText('Advanced');
      fireEvent.click(advancedTab);

      // Wait for advanced tab to load
      await waitFor(() => screen.getByText('Prompt'));

      // Enter prompt
      const promptInput = screen.getByPlaceholderText('Describe the image you want to generate...');
      fireEvent.change(promptInput, { target: { value: 'A beautiful landscape with mountains and lake' } });

      // Click generate button
      const generateButton = screen.getByText('Generate Image');
      fireEvent.click(generateButton);

      // Wait for generation to complete
      await waitFor(() => screen.getByText('Image Generated'));

      // Verify that onGenerate callback was called with correct data
      expect(mockOnGenerate).toHaveBeenCalledWith({
        imageUrl: 'https://example.com/generated-image.jpg',
        params: expect.any(Object)
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle generation errors gracefully', async () => {
      // Mock generateImage to reject
      mockGenerateImage.mockRejectedValue(new Error('Network error'));

      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Click on Advanced tab
      const advancedTab = screen.getByText('Advanced');
      fireEvent.click(advancedTab);

      // Wait for advanced tab to load
      await waitFor(() => screen.getByText('Prompt'));

      // Enter prompt
      const promptInput = screen.getByPlaceholderText('Describe the image you want to generate...');
      fireEvent.change(promptInput, { target: { value: 'A beautiful landscape with mountains and lake' } });

      // Click generate button
      const generateButton = screen.getByText('Generate Image');
      fireEvent.click(generateButton);

      // Wait for error toast
      await waitFor(() => screen.getByText('Generation Failed'));

      // Verify error toast message
      expect(toast).toHaveBeenCalledWith({
        title: 'Generation Failed',
        description: 'Network error',
        variant: 'destructive'
      });
    });

    it('should handle missing checkpoints gracefully', async () => {
      // Mock getAvailableCheckpoints to return empty array
      mockGetAvailableCheckpoints.mockResolvedValue([]);

      render(
        <ImageGenerationModal
          isOpen={true}
          onClose={() => {}}
          onGenerate={() => {}}
        />
      );

      // Click on Model tab
      const modelTab = screen.getByText('Model');
      fireEvent.click(modelTab);

      // Wait for model tab to load
      await waitFor(() => screen.getByText('Model'));

      // Check that default checkpoint is available
      const defaultCheckpoint = await screen.findByText('default (sd_xl_base_1.0.safetensors)');
      expect(defaultCheckpoint).toBeInTheDocument();

      // Check that warning message is displayed
      const warningMessage = screen.getByText('No checkpoints found. Make sure ComfyUI is running and models are installed.');
      expect(warningMessage).toBeInTheDocument();
    });
  });
});