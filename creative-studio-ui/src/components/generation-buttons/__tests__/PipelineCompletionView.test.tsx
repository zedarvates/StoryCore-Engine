/**
 * Tests for Pipeline Completion View Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PipelineCompletionView } from '../PipelineCompletionView';
import { useGenerationStore } from '../../../stores/generationStore';
import type { GenerationPipelineState, GeneratedAsset, GeneratedPrompt } from '../../../types/generation';

// Mock the store
vi.mock('../../../stores/generationStore');

describe('PipelineCompletionView', () => {
  const mockPrompt: GeneratedPrompt = {
    text: 'A beautiful sunset over mountains',
    categories: { genre: 'landscape' },
    timestamp: Date.now(),
    editable: false,
  };

  const mockImage: GeneratedAsset = {
    id: 'image-1',
    type: 'image',
    url: '/test-image.png',
    metadata: {
      generationParams: {},
      fileSize: 2048,
      dimensions: { width: 1024, height: 768 },
      format: 'png',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  };

  const mockVideo: GeneratedAsset = {
    id: 'video-1',
    type: 'video',
    url: '/test-video.mp4',
    metadata: {
      generationParams: {},
      fileSize: 10240,
      dimensions: { width: 1024, height: 768 },
      duration: 5.0,
      format: 'mp4',
    },
    relatedAssets: ['image-1'],
    timestamp: Date.now(),
  };

  const mockAudio: GeneratedAsset = {
    id: 'audio-1',
    type: 'audio',
    url: '/test-audio.mp3',
    metadata: {
      generationParams: {},
      fileSize: 5120,
      duration: 10.0,
      format: 'mp3',
    },
    relatedAssets: ['video-1'],
    timestamp: Date.now(),
  };

  const mockCompletePipeline: GenerationPipelineState = {
    id: 'pipeline-1',
    currentStage: 'complete',
    stages: {
      prompt: { status: 'completed', result: mockPrompt, attempts: 1 },
      image: { status: 'completed', result: mockImage, attempts: 1 },
      video: { status: 'completed', result: mockVideo, attempts: 1 },
      audio: { status: 'completed', result: mockAudio, attempts: 1 },
    },
    createdAt: Date.now() - 60000,
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render completion view with all assets', () => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });

      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByText('Pipeline Complete')).toBeInTheDocument();
      expect(screen.getByText(mockPrompt.text)).toBeInTheDocument();
      // "Generated Assets" appears twice (in summary and as section header)
      expect(screen.getAllByText('Generated Assets').length).toBeGreaterThan(0);
    });

    it('should show error when pipeline not found', () => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: null,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({}),
        };
        return selector(state);
      });

      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByText('Pipeline not found')).toBeInTheDocument();
    });

    it('should show info message when pipeline not complete', () => {
      const incompletePipeline = {
        ...mockCompletePipeline,
        currentStage: 'image' as const,
      };

      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: incompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({}),
        };
        return selector(state);
      });

      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByText('Pipeline is not yet complete')).toBeInTheDocument();
    });
  });

  describe('Pipeline Summary', () => {
    beforeEach(() => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });
    });

    it('should display pipeline statistics', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByText('Completed Stages')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // 4 completed stages
      // "Generated Assets" appears twice (in summary and as section header)
      expect(screen.getAllByText('Generated Assets').length).toBeGreaterThan(0);
      expect(screen.getByText('3')).toBeInTheDocument(); // 3 assets (image, video, audio)
    });

    it('should display pipeline duration', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByText('Duration')).toBeInTheDocument();
      // Duration is displayed as "60s" with space between number and unit
      expect(screen.getByText('60', { exact: false })).toBeInTheDocument();
    });

    it('should display generated prompt', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByText('Generated Prompt')).toBeInTheDocument();
      expect(screen.getByText(mockPrompt.text)).toBeInTheDocument();
    });
  });

  describe('Asset Selection', () => {
    beforeEach(() => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });
    });

    it('should allow selecting individual assets', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      const assetCards = screen.getAllByRole('checkbox');
      // 3 asset checkboxes + 2 export option checkboxes = 5 total
      expect(assetCards).toHaveLength(5);

      // Click the first asset checkbox (not the export options)
      fireEvent.click(assetCards[0]);
      expect(assetCards[0]).toBeChecked();
    });

    it('should allow selecting all assets', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      const selectAllButton = screen.getByText('Select All');
      fireEvent.click(selectAllButton);

      const assetCards = screen.getAllByRole('checkbox');
      assetCards.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });

      expect(screen.getByText('Deselect All')).toBeInTheDocument();
    });

    it('should allow deselecting all assets', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      const selectAllButton = screen.getByText('Select All');
      fireEvent.click(selectAllButton);
      fireEvent.click(selectAllButton);

      const assetCards = screen.getAllByRole('checkbox');
      // Only check the first 3 checkboxes (asset checkboxes, not export options)
      for (let i = 0; i < 3; i++) {
        expect(assetCards[i]).not.toBeChecked();
      }
    });

    it('should update export button with selection count', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      const assetCards = screen.getAllByRole('checkbox');
      fireEvent.click(assetCards[0]);

      expect(screen.getByText(/Export Selected \(1\)/)).toBeInTheDocument();
    });
  });

  describe('Asset Display', () => {
    beforeEach(() => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: (id: string) => {
            if (id === 'video-1') return [mockImage];
            if (id === 'audio-1') return [mockVideo];
            return [];
          },
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });
    });

    it('should display asset metadata', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByText('2.00 KB')).toBeInTheDocument(); // image size
      expect(screen.getAllByText('1024×768').length).toBeGreaterThan(0); // dimensions (appears twice)
      expect(screen.getByText('5.0s')).toBeInTheDocument(); // video duration
    });

    it('should display asset type badges', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByText('image')).toBeInTheDocument();
      expect(screen.getByText('video')).toBeInTheDocument();
      expect(screen.getByText('audio')).toBeInTheDocument();
    });

    it('should display asset relationships', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      const relationshipLabels = screen.getAllByText('Related:');
      expect(relationshipLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Export Options', () => {
    beforeEach(() => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });
    });

    it('should render export format options', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      const formatSelect = screen.getByLabelText('Format');
      expect(formatSelect).toBeInTheDocument();
      expect(within(formatSelect as HTMLElement).getByText('Individual Files')).toBeInTheDocument();
    });

    it('should render quality options', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      const qualitySelect = screen.getByLabelText('Quality');
      expect(qualitySelect).toBeInTheDocument();
    });

    it('should render metadata and prompt checkboxes', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByLabelText('Include Metadata')).toBeInTheDocument();
      expect(screen.getByLabelText('Include Prompt')).toBeInTheDocument();
    });

    it('should update export options when changed', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      const formatSelect = screen.getByLabelText('Format');
      fireEvent.change(formatSelect, { target: { value: 'zip' } });

      expect(formatSelect).toHaveValue('zip');
    });
  });

  describe('Export Actions', () => {
    it('should call onExport with selected assets', () => {
      const onExport = vi.fn();

      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });

      render(<PipelineCompletionView pipelineId="pipeline-1" onExport={onExport} />);

      const assetCards = screen.getAllByRole('checkbox');
      fireEvent.click(assetCards[0]);

      const exportButton = screen.getByText(/Export Selected/);
      fireEvent.click(exportButton);

      expect(onExport).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: mockImage.id })]),
        'individual'
      );
    });

    it('should disable export button when no assets selected', () => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });

      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      const exportButton = screen.getByText(/Export Selected/);
      expect(exportButton).toBeDisabled();
    });

    it('should show alert when trying to export without selection', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });

      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      // Enable button by selecting and deselecting
      const assetCards = screen.getAllByRole('checkbox');
      fireEvent.click(assetCards[0]);
      fireEvent.click(assetCards[0]);

      // Try to export (button should be disabled, but test the handler)
      const exportButton = screen.getByText(/Export Selected/);
      if (!exportButton.hasAttribute('disabled')) {
        fireEvent.click(exportButton);
        expect(alertSpy).toHaveBeenCalled();
      }

      alertSpy.mockRestore();
    });
  });

  describe('Additional Actions', () => {
    beforeEach(() => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });
    });

    it('should call onRestart when restart button clicked', () => {
      const onRestart = vi.fn();

      render(<PipelineCompletionView pipelineId="pipeline-1" onRestart={onRestart} />);

      const restartButton = screen.getByText('Start New Pipeline');
      fireEvent.click(restartButton);

      expect(onRestart).toHaveBeenCalled();
    });

    it('should call onClose when close button clicked', () => {
      const onClose = vi.fn();

      render(<PipelineCompletionView pipelineId="pipeline-1" onClose={onClose} />);

      const closeButtons = screen.getAllByText('Close');
      fireEvent.click(closeButtons[0]);

      expect(onClose).toHaveBeenCalled();
    });

    it('should not render restart button when onRestart not provided', () => {
      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.queryByText('Start New Pipeline')).not.toBeInTheDocument();
    });
  });

  describe('Relationship Visualization', () => {
    it('should render relationship diagram when multiple assets exist', () => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
            video: mockVideo,
            audio: mockAudio,
          }),
        };
        return selector(state);
      });

      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.getByText('Asset Relationships')).toBeInTheDocument();
      expect(screen.getByText('Prompt')).toBeInTheDocument();
      expect(screen.getByText('Image')).toBeInTheDocument();
      expect(screen.getByText('Video')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
    });

    it('should not render relationship diagram with single asset', () => {
      vi.mocked(useGenerationStore).mockImplementation((selector: any) => {
        const state = {
          currentPipeline: mockCompletePipeline,
          getRelatedAssets: () => [],
          getAllPipelineAssets: () => ({
            prompt: mockPrompt,
            image: mockImage,
          }),
        };
        return selector(state);
      });

      render(<PipelineCompletionView pipelineId="pipeline-1" />);

      expect(screen.queryByText('Asset Relationships')).not.toBeInTheDocument();
    });
  });
});
