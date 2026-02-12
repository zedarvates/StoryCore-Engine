/**
 * Audio Production Wizard Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioProductionWizard } from '../AudioProductionWizard';
import { useAudioRemixStore } from '@/stores/audioRemixStore';

// Mock the audio remix store
jest.mock('@/stores/audioRemixStore', () => ({
  useAudioRemixStore: jest.fn(() => ({
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
    loadTrack: jest.fn(),
    analyzeStructure: jest.fn(),
    setTargetDuration: jest.fn(),
    setRemixStyle: jest.fn(),
    calculateSuggestedCuts: jest.fn(),
    toggleCut: jest.fn(),
    applyEffect: jest.fn(),
    previewRemix: jest.fn(),
    executeRemix: jest.fn(),
    export: jest.fn(),
    reset: jest.fn(),
    clearResult: jest.fn(),
  })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('AudioProductionWizard', () => {
  const mockOnClose = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
