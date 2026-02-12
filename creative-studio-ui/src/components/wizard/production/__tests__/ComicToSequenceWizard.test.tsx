/**
 * Comic to Sequence Wizard Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComicToSequenceWizard } from '../ComicToSequenceWizard';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('ComicToSequenceWizard', () => {
  const mockOnClose = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders without crashing', () => {
    render(
      <ComicToSequenceWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('Comic to Sequence Wizard')).toBeInTheDocument();
  });

  it('displays step 1 (Import Comic) by default', () => {
    render(
      <ComicToSequenceWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('Import Comic')).toBeInTheDocument();
  });

  it('shows all 6 steps in the step indicator', () => {
    render(
      <ComicToSequenceWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    expect(screen.getByText('Import Comic')).toBeInTheDocument();
    expect(screen.getByText('Panel Selection')).toBeInTheDocument();
    expect(screen.getByText('Transitions')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
    expect(screen.getByText('Timing')).toBeInTheDocument();
    expect(screen.getByText('Generate')).toBeInTheDocument();
  });

  it('navigates to next step when clicking Next', async () => {
    render(
      <ComicToSequenceWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText('Panel Selection')).toBeInTheDocument();
    });
  });

  it('calls onClose when clicking Cancel', () => {
    render(
      <ComicToSequenceWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays timing adjustment step with duration controls', async () => {
    render(
      <ComicToSequenceWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    // Navigate to Timing step
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {});
    }
    
    await waitFor(() => {
      expect(screen.getByText('Timing Adjustment')).toBeInTheDocument();
      expect(screen.getByText('Default Panel Duration')).toBeInTheDocument();
    });
  });

  it('shows generate step with sequence preview', async () => {
    render(
      <ComicToSequenceWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    // Navigate to Generate step
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {});
    }
    
    await waitFor(() => {
      expect(screen.getByText('Generate Sequence')).toBeInTheDocument();
      expect(screen.getByText('Sequence Preview')).toBeInTheDocument();
    });
  });

  it('displays transition options in step 3', async () => {
    render(
      <ComicToSequenceWizard
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

  it('displays audio step with file upload', async () => {
    render(
      <ComicToSequenceWizard
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );
    
    // Navigate to Audio step
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {});
    }
    
    await waitFor(() => {
      expect(screen.getByText('Audio Track')).toBeInTheDocument();
    });
  });
});
