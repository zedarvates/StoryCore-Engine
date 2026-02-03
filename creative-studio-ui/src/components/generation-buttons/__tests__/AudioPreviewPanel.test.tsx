/**
 * Tests for AudioPreviewPanel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioPreviewPanel } from '../AudioPreviewPanel';
import type { GeneratedAsset } from '../../../types/generation';

describe('AudioPreviewPanel', () => {
  const mockAsset: GeneratedAsset = {
    id: 'audio-1',
    type: 'audio',
    url: 'http://example.com/audio.mp3',
    metadata: {
      generationParams: {
        text: 'Test narration text',
        voiceType: 'neutral',
        speed: 1.0,
        pitch: 0,
        language: 'en-US',
        emotion: 'neutral',
      },
      fileSize: 1024000,
      duration: 30,
      format: 'mp3',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  };
  
  const mockOnSave = vi.fn();
  const mockOnRegenerate = vi.fn();
  const mockOnAssociate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock HTMLAudioElement
    global.HTMLAudioElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    global.HTMLAudioElement.prototype.pause = vi.fn();
    global.HTMLAudioElement.prototype.load = vi.fn();
    
    // Mock HTMLCanvasElement
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    });
  });
  
  describe('Rendering', () => {
    it('should render audio preview panel', () => {
      render(<AudioPreviewPanel asset={mockAsset} />);
      
      expect(screen.getByText('Generated Audio')).toBeInTheDocument();
      expect(screen.getByText(/audio generated successfully/i)).toBeInTheDocument();
    });
    
    it('should render waveform canvas', () => {
      render(<AudioPreviewPanel asset={mockAsset} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
    
    it('should render playback controls', () => {
      render(<AudioPreviewPanel asset={mockAsset} />);
      
      // Check for control buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
    
    it('should render metadata', () => {
      render(<AudioPreviewPanel asset={mockAsset} />);
      
      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText(/duration/i)).toBeInTheDocument();
      expect(screen.getByText(/size/i)).toBeInTheDocument();
      expect(screen.getByText(/format/i)).toBeInTheDocument();
    });
    
    it('should render generation parameters', () => {
      render(<AudioPreviewPanel asset={mockAsset} />);
      
      expect(screen.getByText('Generation Parameters')).toBeInTheDocument();
      expect(screen.getByText(/voice type/i)).toBeInTheDocument();
      expect(screen.getByText(/language/i)).toBeInTheDocument();
      expect(screen.getByText(/speed/i)).toBeInTheDocument();
    });
    
    it('should render narration text', () => {
      render(<AudioPreviewPanel asset={mockAsset} />);
      
      expect(screen.getByText('Test narration text')).toBeInTheDocument();
    });
  });
  
  describe('Action Buttons', () => {
    it('should render save button when onSave is provided', () => {
      render(<AudioPreviewPanel asset={mockAsset} onSave={mockOnSave} />);
      
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
    
    it('should call onSave when save button is clicked', () => {
      render(<AudioPreviewPanel asset={mockAsset} onSave={mockOnSave} />);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith(mockAsset);
    });
    
    it('should render regenerate button when onRegenerate is provided', () => {
      render(<AudioPreviewPanel asset={mockAsset} onRegenerate={mockOnRegenerate} />);
      
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
    });
    
    it('should call onRegenerate when regenerate button is clicked', () => {
      render(<AudioPreviewPanel asset={mockAsset} onRegenerate={mockOnRegenerate} />);
      
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      fireEvent.click(regenerateButton);
      
      expect(mockOnRegenerate).toHaveBeenCalled();
    });
    
    it('should render associate button when onAssociate is provided', () => {
      render(<AudioPreviewPanel asset={mockAsset} onAssociate={mockOnAssociate} />);
      
      expect(screen.getByRole('button', { name: /associate with shot/i })).toBeInTheDocument();
    });
    
    it('should call onAssociate when associate button is clicked', () => {
      render(<AudioPreviewPanel asset={mockAsset} onAssociate={mockOnAssociate} />);
      
      const associateButton = screen.getByRole('button', { name: /associate with shot/i });
      fireEvent.click(associateButton);
      
      expect(mockOnAssociate).toHaveBeenCalledWith(mockAsset);
    });
  });
  
  describe('Metadata Display', () => {
    it('should display file size', () => {
      render(<AudioPreviewPanel asset={mockAsset} />);
      
      expect(screen.getByText(/1000 KB/i)).toBeInTheDocument();
    });
    
    it('should display format', () => {
      render(<AudioPreviewPanel asset={mockAsset} />);
      
      expect(screen.getByText('MP3')).toBeInTheDocument();
    });
    
    it('should display voice parameters', () => {
      render(<AudioPreviewPanel asset={mockAsset} />);
      
      const neutralTexts = screen.getAllByText(/neutral/i);
      expect(neutralTexts.length).toBeGreaterThan(0);
      expect(screen.getByText(/en-US/i)).toBeInTheDocument();
      expect(screen.getByText(/1x/i)).toBeInTheDocument();
    });
  });
});
