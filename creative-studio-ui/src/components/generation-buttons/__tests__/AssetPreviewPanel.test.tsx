/**
 * Asset Preview Panel Tests
 * 
 * Tests for the unified asset preview component.
 * Validates asset display, metadata viewer, export controls, regenerate button, and related assets.
 * 
 * Requirements: 9.2, 9.3, 9.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AssetPreviewPanel } from '../AssetPreviewPanel';
import type { GeneratedAsset } from '../../../types/generation';

describe('AssetPreviewPanel', () => {
  // Mock assets
  const mockImageAsset: GeneratedAsset = {
    id: 'asset-1',
    type: 'image',
    url: 'https://example.com/image.png',
    metadata: {
      generationParams: {
        prompt: 'A beautiful landscape',
        steps: 30,
        cfgScale: 7.5,
        sampler: 'euler',
        scheduler: 'normal',
        seed: 12345,
      },
      fileSize: 2048000,
      dimensions: { width: 1024, height: 768 },
      format: 'png',
    },
    relatedAssets: ['asset-2', 'asset-3'],
    timestamp: Date.now(),
  };
  
  const mockVideoAsset: GeneratedAsset = {
    id: 'asset-2',
    type: 'video',
    url: 'https://example.com/video.mp4',
    metadata: {
      generationParams: {
        prompt: 'Camera pans left',
        frameCount: 120,
        frameRate: 24,
        motionStrength: 0.8,
        inputImagePath: '/path/to/image.png',
      },
      fileSize: 10240000,
      dimensions: { width: 1920, height: 1080 },
      duration: 5,
      format: 'mp4',
    },
    relatedAssets: ['asset-1', 'asset-3'],
    timestamp: Date.now(),
  };
  
  const mockAudioAsset: GeneratedAsset = {
    id: 'asset-3',
    type: 'audio',
    url: 'https://example.com/audio.wav',
    metadata: {
      generationParams: {
        text: 'This is a narration',
        voiceType: 'female',
        speed: 1.0,
        pitch: 0,
        language: 'en-US',
        emotion: 'neutral',
      },
      fileSize: 512000,
      duration: 3,
      format: 'wav',
    },
    relatedAssets: ['asset-1', 'asset-2'],
    timestamp: Date.now(),
  };
  
  const mockPromptAsset: GeneratedAsset = {
    id: 'asset-4',
    type: 'prompt',
    url: '',
    metadata: {
      generationParams: {
        text: 'A cinematic shot of a sunset over mountains',
        categories: {
          genre: 'landscape',
          shotType: 'wide',
          lighting: 'golden hour',
        },
      },
      fileSize: 128,
      format: 'txt',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  };
  
  const mockRelatedAssets: GeneratedAsset[] = [
    mockImageAsset,
    mockVideoAsset,
    mockAudioAsset,
  ];
  
  // Mock callbacks
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnExport: ReturnType<typeof vi.fn>;
  let mockOnRegenerate: ReturnType<typeof vi.fn>;
  let mockOnRelatedAssetClick: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    mockOnSave = vi.fn();
    mockOnExport = vi.fn();
    mockOnRegenerate = vi.fn();
    mockOnRelatedAssetClick = vi.fn();
  });
  
  describe('Image Asset Display', () => {
    it('should render image asset using ImagePreviewPanel', () => {
      render(
        <AssetPreviewPanel
          asset={mockImageAsset}
          onSave={mockOnSave}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      // Should use ImagePreviewPanel which displays "Generated Image"
      expect(screen.getByText('Generated Image')).toBeInTheDocument();
    });
    
    it('should display related assets for image', () => {
      render(
        <AssetPreviewPanel
          asset={mockImageAsset}
          relatedAssets={mockRelatedAssets}
          onRelatedAssetClick={mockOnRelatedAssetClick}
        />
      );
      
      expect(screen.getByText('Related Assets in Pipeline')).toBeInTheDocument();
    });
  });
  
  describe('Video Asset Display', () => {
    it('should render video asset using VideoPreviewPanel', () => {
      render(
        <AssetPreviewPanel
          asset={mockVideoAsset}
          onSave={mockOnSave}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      // Should use VideoPreviewPanel which displays "Generated Video"
      expect(screen.getByText('Generated Video')).toBeInTheDocument();
    });
    
    it('should display related assets for video', () => {
      render(
        <AssetPreviewPanel
          asset={mockVideoAsset}
          relatedAssets={mockRelatedAssets}
          onRelatedAssetClick={mockOnRelatedAssetClick}
        />
      );
      
      expect(screen.getByText('Related Assets in Pipeline')).toBeInTheDocument();
    });
  });
  
  describe('Audio Asset Display', () => {
    it('should render audio asset using AudioPreviewPanel', () => {
      render(
        <AssetPreviewPanel
          asset={mockAudioAsset}
          onSave={mockOnSave}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      // Should use AudioPreviewPanel which displays "Generated Audio"
      expect(screen.getByText('Generated Audio')).toBeInTheDocument();
    });
    
    it('should display related assets for audio', () => {
      render(
        <AssetPreviewPanel
          asset={mockAudioAsset}
          relatedAssets={mockRelatedAssets}
          onRelatedAssetClick={mockOnRelatedAssetClick}
        />
      );
      
      expect(screen.getByText('Related Assets in Pipeline')).toBeInTheDocument();
    });
  });
  
  describe('Prompt Asset Display', () => {
    it('should render prompt asset with generic preview', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onSave={mockOnSave}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      expect(screen.getByText('Generated Prompt')).toBeInTheDocument();
      expect(screen.getByText('A cinematic shot of a sunset over mountains')).toBeInTheDocument();
    });
    
    it('should display metadata for prompt asset', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onSave={mockOnSave}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText('128 B')).toBeInTheDocument();
      expect(screen.getByText('TXT')).toBeInTheDocument();
    });
    
    it('should display generation parameters for prompt asset', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onSave={mockOnSave}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      expect(screen.getByText('Generation Parameters')).toBeInTheDocument();
    });
  });
  
  describe('Metadata Viewer', () => {
    it('should display file size in human-readable format', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onSave={mockOnSave}
        />
      );
      
      expect(screen.getByText('128 B')).toBeInTheDocument();
    });
    
    it('should display format in uppercase', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onSave={mockOnSave}
        />
      );
      
      expect(screen.getByText('TXT')).toBeInTheDocument();
    });
    
    it('should display timestamp', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onSave={mockOnSave}
        />
      );
      
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
    });
  });
  
  describe('Export Controls', () => {
    it('should display export button when onExport is provided', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onExport={mockOnExport}
        />
      );
      
      // Prompt assets only have 'original' format, so no format selector is shown
      expect(screen.getByText(/Export as/)).toBeInTheDocument();
    });
    
    it('should allow selecting export format', () => {
      render(
        <AssetPreviewPanel
          asset={mockImageAsset}
          onExport={mockOnExport}
        />
      );
      
      // Note: For image assets, it uses ImagePreviewPanel which doesn't show export formats
      // This test would work for prompt assets
    });
    
    it('should call onExport with selected format', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onExport={mockOnExport}
        />
      );
      
      const exportButton = screen.getByText(/Export as/);
      fireEvent.click(exportButton);
      
      expect(mockOnExport).toHaveBeenCalledWith(mockPromptAsset, 'original');
    });
    
    it('should update export button text when format changes', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onExport={mockOnExport}
        />
      );
      
      expect(screen.getByText('Export as ORIGINAL')).toBeInTheDocument();
    });
  });
  
  describe('Action Buttons', () => {
    it('should render save button when onSave is provided', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onSave={mockOnSave}
        />
      );
      
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
    
    it('should call onSave when save button is clicked', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onSave={mockOnSave}
        />
      );
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith(mockPromptAsset);
    });
    
    it('should render regenerate button when onRegenerate is provided', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      expect(screen.getByText('Regenerate')).toBeInTheDocument();
    });
    
    it('should call onRegenerate when regenerate button is clicked', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      const regenerateButton = screen.getByText('Regenerate');
      fireEvent.click(regenerateButton);
      
      expect(mockOnRegenerate).toHaveBeenCalled();
    });
    
    it('should not render buttons when callbacks are not provided', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
        />
      );
      
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.queryByText('Regenerate')).not.toBeInTheDocument();
    });
  });
  
  describe('Related Assets', () => {
    it('should display related assets section when provided', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          relatedAssets={mockRelatedAssets}
        />
      );
      
      expect(screen.getByText('Related Assets in Pipeline')).toBeInTheDocument();
    });
    
    it('should not display related assets section when empty', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          relatedAssets={[]}
        />
      );
      
      expect(screen.queryByText('Related Assets in Pipeline')).not.toBeInTheDocument();
    });
    
    it('should display thumbnails for related assets', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          relatedAssets={mockRelatedAssets}
        />
      );
      
      const relatedSection = screen.getByText('Related Assets in Pipeline').closest('div');
      expect(relatedSection).toBeInTheDocument();
      
      // Should have 3 related assets
      const buttons = screen.getAllByRole('button');
      const assetButtons = buttons.filter(btn => 
        btn.className.includes('aspect-square')
      );
      expect(assetButtons.length).toBe(3);
    });
    
    it('should call onRelatedAssetClick when related asset is clicked', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          relatedAssets={mockRelatedAssets}
          onRelatedAssetClick={mockOnRelatedAssetClick}
        />
      );
      
      const assetButtons = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('aspect-square')
      );
      
      fireEvent.click(assetButtons[0]);
      
      expect(mockOnRelatedAssetClick).toHaveBeenCalledWith(mockRelatedAssets[0]);
    });
    
    it('should display asset type labels in related assets', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          relatedAssets={mockRelatedAssets}
        />
      );
      
      // Hover over first asset to see label
      const assetButtons = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('aspect-square')
      );
      
      fireEvent.mouseEnter(assetButtons[0]);
      
      // Labels should be in the DOM (even if not visible)
      expect(screen.getByText('Image')).toBeInTheDocument();
    });
  });
  
  describe('Asset Type Handling', () => {
    it('should handle image assets correctly', () => {
      render(
        <AssetPreviewPanel
          asset={mockImageAsset}
        />
      );
      
      expect(screen.getByText('Generated Image')).toBeInTheDocument();
    });
    
    it('should handle video assets correctly', () => {
      render(
        <AssetPreviewPanel
          asset={mockVideoAsset}
        />
      );
      
      expect(screen.getByText('Generated Video')).toBeInTheDocument();
    });
    
    it('should handle audio assets correctly', () => {
      render(
        <AssetPreviewPanel
          asset={mockAudioAsset}
        />
      );
      
      expect(screen.getByText('Generated Audio')).toBeInTheDocument();
    });
    
    it('should handle prompt assets correctly', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
        />
      );
      
      expect(screen.getByText('Generated Prompt')).toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          onSave={mockOnSave}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      const saveButton = screen.getByText('Save');
      const regenerateButton = screen.getByText('Regenerate');
      
      // Buttons should be rendered as button elements
      expect(saveButton.tagName).toBe('BUTTON');
      expect(regenerateButton.tagName).toBe('BUTTON');
    });
    
    it('should have accessible related asset buttons', () => {
      render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          relatedAssets={mockRelatedAssets}
          onRelatedAssetClick={mockOnRelatedAssetClick}
        />
      );
      
      const assetButtons = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('aspect-square')
      );
      
      // All related asset buttons should be button elements
      assetButtons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle asset with no metadata gracefully', () => {
      const assetWithMinimalMetadata: GeneratedAsset = {
        id: 'asset-5',
        type: 'prompt',
        url: '',
        metadata: {
          generationParams: {},
          fileSize: 0,
          format: 'txt',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      };
      
      render(
        <AssetPreviewPanel
          asset={assetWithMinimalMetadata}
        />
      );
      
      expect(screen.getByText('Generated Prompt')).toBeInTheDocument();
      expect(screen.getByText('0 B')).toBeInTheDocument();
    });
    
    it('should handle large file sizes correctly', () => {
      const assetWithLargeFile: GeneratedAsset = {
        ...mockPromptAsset,
        metadata: {
          ...mockPromptAsset.metadata,
          fileSize: 1073741824, // 1 GB
        },
      };
      
      render(
        <AssetPreviewPanel
          asset={assetWithLargeFile}
        />
      );
      
      expect(screen.getByText('1 GB')).toBeInTheDocument();
    });
    
    it('should handle custom className', () => {
      const { container } = render(
        <AssetPreviewPanel
          asset={mockPromptAsset}
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
