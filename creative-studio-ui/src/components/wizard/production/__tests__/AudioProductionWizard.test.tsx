import { vi } from 'vitest';
/**
 * Audio Production Wizard Tests
 */
import { LegacyAny } from '@/types/legacy';


import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioProductionWizard } from '../AudioProductionWizard';
import { useAudioRemixStore } from '@/stores/audioRemixStore';

// Mock the audio remix store
vi.mock('@/stores/audioRemixStore', () => ({
  useAudioRemixStore: vi.fn(() => ({
    currentTrackUrl: null,
    currentTrackId: null,
    trackName: '',
    musicStructure: null,
    isAnalyzing: false,
    analysisError: null,
    remixResult: null,
    remixPreview: null,
    isRemixing: false,
    remixError: null,
    targetDuration: 60,
    selectedStyle: 'smooth',
    suggestedCuts: [],
    selectedCuts: [],
    fadeInDuration: 0.5,
    fadeOutDuration: 1.0,
    crossfadeDuration: 2.0,
    preserveIntro: true,
    preserveOutro: true,
    isExporting: false,
    exportError: null,
    exportedUrl: null,
    loadTrack: vi.fn(),
    analyzeStructure: vi.fn(),
    setTargetDuration: vi.fn(),
    setRemixStyle: vi.fn(),
    calculateSuggestedCuts: vi.fn(),
    toggleCut: vi.fn(),
    applyEffect: vi.fn(),
    previewRemix: vi.fn(),
    executeRemix: vi.fn(),
    export: vi.fn(),
    reset: vi.fn(),
    clearResult: vi.fn(),
  })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as LegacyAny;

describe('AudioProductionWizard', () => {
  const mockOnClose = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders without crashing', () => {
    render(
      <AudioProductionWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('Audio Production Wizard')).toBeInTheDocument();
  });

  it('displays step 1 (Import Audio) by default', () => {
    render(
      <AudioProductionWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('Import Audio Track')).toBeInTheDocument();
  });

  it('shows all 6 steps in the step indicator', () => {
    render(
      <AudioProductionWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('Import Audio')).toBeInTheDocument();
    expect(screen.getByText('Analyze Structure')).toBeInTheDocument();
    expect(screen.getByText('Remix Style')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Effects')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('navigates to next step when clicking Next', async () => {
    render(
      <AudioProductionWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Analyze Structure')).toBeInTheDocument();
    });
  });

  it('navigates to previous step when clicking Previous', async () => {
    render(
      <AudioProductionWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    // Go forward twice
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    
    // Go back
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);
    
    await waitFor(() => {
      expect(screen.getByText('Analyze Structure')).toBeInTheDocument();
    });
  });

  it('calls onClose when clicking Cancel', () => {
    render(
      <AudioProductionWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});
