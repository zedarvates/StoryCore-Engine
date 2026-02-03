/**
 * GenerationButtonToolbar Component Tests
 * 
 * Tests the toolbar container component that displays generation buttons
 * in editor and dashboard contexts.
 * 
 * Requirements: 5.1, 5.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GenerationButtonToolbar } from '../GenerationButtonToolbar';
import { useGenerationStore } from '../../../stores/generationStore';
import type { Shot, Sequence } from '../../../types';

// Mock the generation store
vi.mock('../../../stores/generationStore', () => ({
  useGenerationStore: vi.fn(),
}));

// Mock child components
vi.mock('../PromptGenerationButton', () => ({
  PromptGenerationButton: ({ onClick, isGenerating }: any) => (
    <button onClick={onClick} disabled={isGenerating} data-testid="prompt-button">
      {isGenerating ? 'Generating...' : 'Generate Prompt'}
    </button>
  ),
}));

vi.mock('../ImageGenerationButton', () => ({
  ImageGenerationButton: ({ onClick, isGenerating }: any) => (
    <button onClick={onClick} disabled={isGenerating} data-testid="image-button">
      {isGenerating ? 'Generating...' : 'Generate Image'}
    </button>
  ),
}));

vi.mock('../VideoGenerationButton', () => ({
  VideoGenerationButton: ({ onClick, isGenerating }: any) => (
    <button onClick={onClick} disabled={isGenerating} data-testid="video-button">
      {isGenerating ? 'Generating...' : 'Generate Video'}
    </button>
  ),
}));

vi.mock('../AudioGenerationButton', () => ({
  AudioGenerationButton: ({ onClick, isGenerating }: any) => (
    <button onClick={onClick} disabled={isGenerating} data-testid="audio-button">
      {isGenerating ? 'Generating...' : 'Generate Audio'}
    </button>
  ),
}));

vi.mock('../PromptGenerationDialog', () => ({
  PromptGenerationDialog: ({ isOpen, onClose, onGenerate }: any) =>
    isOpen ? (
      <div data-testid="prompt-dialog">
        <button onClick={() => {
          onGenerate({ text: 'Test prompt', categories: {} });
          onClose();
        }}>
          Generate
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('../ImageGenerationDialog', () => ({
  ImageGenerationDialog: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="image-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('../VideoGenerationDialog', () => ({
  VideoGenerationDialog: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="video-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('../AudioGenerationDialog', () => ({
  AudioGenerationDialog: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="audio-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('../GenerationProgressModal', () => ({
  GenerationProgressModal: ({ isOpen, generationType }: any) =>
    isOpen ? (
      <div data-testid="progress-modal">
        Generating {generationType}...
      </div>
    ) : null,
}));

describe('GenerationButtonToolbar', () => {
  const mockShot: Shot = {
    id: 'shot-1',
    title: 'Test Shot',
    description: 'Test description',
    duration: 5,
    position: 1,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {},
  };

  const mockSequence: Sequence = {
    id: 'seq-1',
    name: 'Test Sequence',
    shots: [mockShot],
    duration: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useGenerationStore as any).mockReturnValue({
      currentPipeline: null,
    });
  });

  describe('Component Rendering', () => {
    it('should render all generation buttons', () => {
      render(<GenerationButtonToolbar context="editor" />);

      expect(screen.getByTestId('prompt-button')).toBeInTheDocument();
      expect(screen.getByTestId('image-button')).toBeInTheDocument();
      expect(screen.getByTestId('video-button')).toBeInTheDocument();
      expect(screen.getByTestId('audio-button')).toBeInTheDocument();
    });

    it('should apply editor context class', () => {
      const { container } = render(<GenerationButtonToolbar context="editor" />);

      const toolbar = container.querySelector('.generation-toolbar-editor');
      expect(toolbar).toBeInTheDocument();
    });

    it('should apply dashboard context class', () => {
      const { container } = render(<GenerationButtonToolbar context="dashboard" />);

      const toolbar = container.querySelector('.generation-toolbar-dashboard');
      expect(toolbar).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <GenerationButtonToolbar context="editor" className="custom-class" />
      );

      const toolbar = container.querySelector('.custom-class');
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('Dialog Management', () => {
    it('should open prompt dialog when prompt button clicked', async () => {
      render(<GenerationButtonToolbar context="editor" />);

      const promptButton = screen.getByTestId('prompt-button');
      fireEvent.click(promptButton);

      await waitFor(() => {
        expect(screen.getByTestId('prompt-dialog')).toBeInTheDocument();
      });
    });

    it('should open image dialog when image button clicked', async () => {
      render(<GenerationButtonToolbar context="editor" />);

      const imageButton = screen.getByTestId('image-button');
      fireEvent.click(imageButton);

      await waitFor(() => {
        expect(screen.getByTestId('image-dialog')).toBeInTheDocument();
      });
    });

    it('should open video dialog when video button clicked', async () => {
      render(<GenerationButtonToolbar context="editor" />);

      const videoButton = screen.getByTestId('video-button');
      fireEvent.click(videoButton);

      await waitFor(() => {
        expect(screen.getByTestId('video-dialog')).toBeInTheDocument();
      });
    });

    it('should open audio dialog when audio button clicked', async () => {
      render(<GenerationButtonToolbar context="editor" />);

      const audioButton = screen.getByTestId('audio-button');
      fireEvent.click(audioButton);

      await waitFor(() => {
        expect(screen.getByTestId('audio-dialog')).toBeInTheDocument();
      });
    });

    it('should close dialog when close button clicked', async () => {
      render(<GenerationButtonToolbar context="editor" />);

      const promptButton = screen.getByTestId('prompt-button');
      fireEvent.click(promptButton);

      await waitFor(() => {
        expect(screen.getByTestId('prompt-dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('prompt-dialog')).not.toBeInTheDocument();
      });
    });

    it('should only show one dialog at a time', async () => {
      render(<GenerationButtonToolbar context="editor" />);

      // Open prompt dialog
      fireEvent.click(screen.getByTestId('prompt-button'));
      await waitFor(() => {
        expect(screen.getByTestId('prompt-dialog')).toBeInTheDocument();
      });

      // Open image dialog (should close prompt dialog)
      fireEvent.click(screen.getByTestId('image-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('prompt-dialog')).not.toBeInTheDocument();
        expect(screen.getByTestId('image-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Generation Progress', () => {
    it('should show progress modal when generation is in progress', () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'in_progress', progress: { stage: 'Generating', stageProgress: 50, overallProgress: 50, estimatedTimeRemaining: 10, message: 'Generating prompt...', cancellable: true } },
            image: { status: 'pending' },
            video: { status: 'pending' },
            audio: { status: 'pending' },
          },
        },
      });

      render(<GenerationButtonToolbar context="editor" />);

      expect(screen.getByTestId('progress-modal')).toBeInTheDocument();
      expect(screen.getByText(/Generating prompt/i)).toBeInTheDocument();
    });

    it('should not show progress modal when no generation is in progress', () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'completed' },
            image: { status: 'pending' },
            video: { status: 'pending' },
            audio: { status: 'pending' },
          },
        },
      });

      render(<GenerationButtonToolbar context="editor" />);

      expect(screen.queryByTestId('progress-modal')).not.toBeInTheDocument();
    });
  });

  describe('Context Integration', () => {
    it('should pass currentShot to toolbar in editor context', () => {
      render(
        <GenerationButtonToolbar
          context="editor"
          currentShot={mockShot}
        />
      );

      // Toolbar should render with shot context
      expect(screen.getByTestId('prompt-button')).toBeInTheDocument();
    });

    it('should pass currentSequence to toolbar in editor context', () => {
      render(
        <GenerationButtonToolbar
          context="editor"
          currentSequence={mockSequence}
        />
      );

      // Toolbar should render with sequence context
      expect(screen.getByTestId('prompt-button')).toBeInTheDocument();
    });

    it('should call onGenerationComplete when generation completes', async () => {
      const onGenerationComplete = vi.fn();

      render(
        <GenerationButtonToolbar
          context="editor"
          onGenerationComplete={onGenerationComplete}
        />
      );

      // Open prompt dialog
      fireEvent.click(screen.getByTestId('prompt-button'));

      await waitFor(() => {
        expect(screen.getByTestId('prompt-dialog')).toBeInTheDocument();
      });

      // Generate prompt
      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(onGenerationComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'prompt',
            metadata: expect.objectContaining({
              generationParams: expect.objectContaining({
                text: 'Test prompt',
              }),
            }),
          })
        );
      });
    });
  });

  describe('Button State Management', () => {
    it('should disable buttons during generation', () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'in_progress' },
            image: { status: 'pending' },
            video: { status: 'pending' },
            audio: { status: 'pending' },
          },
        },
      });

      render(<GenerationButtonToolbar context="editor" />);

      const promptButton = screen.getByTestId('prompt-button');
      expect(promptButton).toBeDisabled();
      expect(promptButton).toHaveTextContent('Generating...');
    });

    it('should enable buttons when not generating', () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'completed' },
            image: { status: 'pending' },
            video: { status: 'pending' },
            audio: { status: 'pending' },
          },
        },
      });

      render(<GenerationButtonToolbar context="editor" />);

      const promptButton = screen.getByTestId('prompt-button');
      expect(promptButton).not.toBeDisabled();
    });
  });

  describe('Pipeline State Integration', () => {
    it('should pass prompt result to image dialog', async () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: {
              status: 'completed',
              result: { text: 'Generated prompt text' },
            },
            image: { status: 'pending' },
            video: { status: 'pending' },
            audio: { status: 'pending' },
          },
        },
      });

      render(<GenerationButtonToolbar context="editor" />);

      fireEvent.click(screen.getByTestId('image-button'));

      await waitFor(() => {
        expect(screen.getByTestId('image-dialog')).toBeInTheDocument();
      });
    });

    it('should pass image result to video dialog', async () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'completed' },
            image: {
              status: 'completed',
              result: { id: 'img-1', type: 'image', url: '/test.png' },
            },
            video: { status: 'pending' },
            audio: { status: 'pending' },
          },
        },
      });

      render(<GenerationButtonToolbar context="editor" />);

      fireEvent.click(screen.getByTestId('video-button'));

      await waitFor(() => {
        expect(screen.getByTestId('video-dialog')).toBeInTheDocument();
      });
    });

    it('should pass video result to audio dialog', async () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'completed' },
            image: { status: 'completed' },
            video: {
              status: 'completed',
              result: { id: 'vid-1', type: 'video', url: '/test.mp4' },
            },
            audio: { status: 'pending' },
          },
        },
      });

      render(<GenerationButtonToolbar context="editor" />);

      fireEvent.click(screen.getByTestId('audio-button'));

      await waitFor(() => {
        expect(screen.getByTestId('audio-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Context Specific Tests', () => {
    it('should render toolbar in dashboard context without shot or sequence', () => {
      render(<GenerationButtonToolbar context="dashboard" />);

      expect(screen.getByTestId('prompt-button')).toBeInTheDocument();
      expect(screen.getByTestId('image-button')).toBeInTheDocument();
      expect(screen.getByTestId('video-button')).toBeInTheDocument();
      expect(screen.getByTestId('audio-button')).toBeInTheDocument();
    });

    it('should apply dashboard-specific styling', () => {
      const { container } = render(<GenerationButtonToolbar context="dashboard" />);

      const toolbar = container.querySelector('.generation-toolbar-dashboard');
      expect(toolbar).toBeInTheDocument();
      expect(toolbar).toHaveClass('generation-toolbar-dashboard');
    });

    it('should work independently in dashboard without editor context', async () => {
      render(<GenerationButtonToolbar context="dashboard" />);

      // Open and close dialogs
      fireEvent.click(screen.getByTestId('prompt-button'));
      await waitFor(() => {
        expect(screen.getByTestId('prompt-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByTestId('prompt-dialog')).not.toBeInTheDocument();
      });
    });

    it('should handle generation completion in dashboard context', async () => {
      const onGenerationComplete = vi.fn();

      render(
        <GenerationButtonToolbar
          context="dashboard"
          onGenerationComplete={onGenerationComplete}
        />
      );

      fireEvent.click(screen.getByTestId('prompt-button'));
      await waitFor(() => {
        expect(screen.getByTestId('prompt-dialog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate'));
      await waitFor(() => {
        expect(onGenerationComplete).toHaveBeenCalled();
      });
    });

    it('should maintain state across context switches', () => {
      const { rerender } = render(<GenerationButtonToolbar context="editor" />);

      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'completed', result: { text: 'Test' } },
            image: { status: 'pending' },
            video: { status: 'pending' },
            audio: { status: 'pending' },
          },
        },
      });

      rerender(<GenerationButtonToolbar context="dashboard" />);

      // State should persist
      expect(screen.getByTestId('prompt-button')).toBeInTheDocument();
    });
  });
});
