import { vi } from 'vitest';
/**
 * Video Editor Wizard Tests
 */
import { LegacyAny } from '@/types/legacy';


import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoEditorWizard } from '../VideoEditorWizard';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as LegacyAny;

describe('VideoEditorWizard', () => {
  const mockOnClose = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders without crashing', () => {
    render(
      <VideoEditorWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('Video Editor Wizard')).toBeInTheDocument();
  });

  it('displays step 1 (Import Media) by default', () => {
    render(
      <VideoEditorWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('Import Media')).toBeInTheDocument();
  });

  it('shows all 6 steps in the step indicator', () => {
    render(
      <VideoEditorWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('Import Media')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Transitions')).toBeInTheDocument();
    expect(screen.getByText('Audio Sync')).toBeInTheDocument();
    expect(screen.getByText('Effects')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('navigates to next step when clicking Next', async () => {
    render(
      <VideoEditorWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });
  });

  it('calls onClose when clicking Cancel', () => {
    render(
      <VideoEditorWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays export step with duration summary', async () => {
    render(
      <VideoEditorWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    // Navigate to export step
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {});
    }
    
    await waitFor(() => {
      expect(screen.getByText('Export Settings')).toBeInTheDocument();
      expect(screen.getByText('Sequence Summary')).toBeInTheDocument();
    });
  });

  it('shows transition options in step 3', async () => {
    render(
      <VideoEditorWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    // Navigate to Transitions step
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {});
    }
    
    await waitFor(() => {
      expect(screen.getByText('Transition Effects')).toBeInTheDocument();
      expect(screen.getByText('Default Transition')).toBeInTheDocument();
    });
  });
});
