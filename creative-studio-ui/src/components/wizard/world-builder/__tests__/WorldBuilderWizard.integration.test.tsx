import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WorldBuilderWizard } from '../WorldBuilderWizard';
import { useStore } from '@/store';
import { useWorldPersistence } from '@/hooks/useWorldPersistence';

// Mock the store and hooks
vi.mock('@/store', () => ({
  useStore: vi.fn(),
}));

vi.mock('@/hooks/useWorldPersistence', () => ({
  useWorldPersistence: vi.fn(),
}));

// Mock child components to simplify testing the wizard logic
vi.mock('../steps/QuickSetupStep', () => ({
  QuickSetupStep: ({ onUpdate, onApplyPreset }: any) => (
    <div data-testid="quick-setup-step">
      <button onClick={() => onUpdate({ name: 'Test World', genre: ['Fantasy'] })}>Set Name</button>
      <button onClick={() => onApplyPreset({ name: 'Preset World', genre: ['Sci-Fi'], culturalElements: {} })}>Apply Preset</button>
    </div>
  ),
}));

vi.mock('../steps/LocationsRulesStep', () => ({
  LocationsRulesStep: ({ onAddLocation }: any) => (
    <div data-testid="locations-rules-step">
      <button onClick={onAddLocation}>Add Location</button>
    </div>
  ),
}));

vi.mock('../steps/CultureReviewStep', () => ({
  CultureReviewStep: ({ onComplete }: any) => (
    <div data-testid="culture-review-step">
      <button onClick={onComplete}>Complete</button>
    </div>
  ),
}));

describe('WorldBuilderWizard Integration', () => {
  const mockAddWorld = vi.fn();
  const mockSaveWorld = vi.fn();
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockImplementation((selector: any) => selector({ addWorld: mockAddWorld }));
    (useWorldPersistence as any).mockReturnValue({ saveWorld: mockSaveWorld });
  });

  it('renders Step 1 (Foundations) initially', () => {
    render(<WorldBuilderWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    expect(screen.getByTestId('quick-setup-step')).toBeInTheDocument();
    expect(screen.getByText(/Foundations/)).toBeInTheDocument();
  });

  it('updates data and enables navigation when Step 1 is valid', async () => {
    render(<WorldBuilderWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    
    // Step 1 is invalid initially (no name/genre)
    const nextButton = screen.getByText('Continue Core');
    expect(nextButton).toBeDisabled();

    // Set valid data
    fireEvent.click(screen.getByText('Set Name'));
    
    await waitFor(() => {
      expect(nextButton).not.toBeDisabled();
    });

    fireEvent.click(nextButton);
    expect(screen.getByTestId('locations-rules-step')).toBeInTheDocument();
  });

  it('requires at least one location in Step 2', async () => {
    render(<WorldBuilderWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    
    // Move to Step 2
    fireEvent.click(screen.getByText('Set Name'));
    fireEvent.click(screen.getByText('Continue Core'));
    
    const nextButton = screen.getByText('Continue Core');
    expect(nextButton).toBeDisabled();

    // Add location
    fireEvent.click(screen.getByText('Add Location'));
    
    await waitFor(() => {
      expect(nextButton).not.toBeDisabled();
    });

    fireEvent.click(nextButton);
    expect(screen.getByTestId('culture-review-step')).toBeInTheDocument();
  });

  it('completes the wizard and saves the world', async () => {
    render(<WorldBuilderWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    
    // Complete Step 1
    fireEvent.click(screen.getByText('Set Name'));
    fireEvent.click(screen.getByText('Continue Core'));
    
    // Complete Step 2
    fireEvent.click(screen.getByText('Add Location'));
    fireEvent.click(screen.getByText('Continue Core'));
    
    // Complete Step 3
    fireEvent.click(screen.getByText('Complete'));
    
    expect(mockAddWorld).toHaveBeenCalled();
    expect(mockSaveWorld).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<WorldBuilderWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText('Cancel Genesis'));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});