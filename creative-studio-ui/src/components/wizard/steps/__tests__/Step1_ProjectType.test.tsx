/**
 * Tests for Step1_ProjectType component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Step1_ProjectType } from '../Step1_ProjectType';
import type { ProjectTypeData } from '@/types/wizard';

describe('Step1_ProjectType', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    mockOnUpdate.mockClear();
  });

  it('renders all project type options', () => {
    render(<Step1_ProjectType data={null} onUpdate={mockOnUpdate} />);

    // Check that all project type options are displayed
    expect(screen.getByText('Court-métrage')).toBeInTheDocument();
    expect(screen.getByText('Moyen-métrage')).toBeInTheDocument();
    expect(screen.getByText('Long-métrage standard')).toBeInTheDocument();
    expect(screen.getByText('Long-métrage premium')).toBeInTheDocument();
    expect(screen.getByText('Très long-métrage')).toBeInTheDocument();
    expect(screen.getByText('Spécial TV/streaming')).toBeInTheDocument();
    expect(screen.getByText('Épisode de série')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('calls onUpdate when a predefined project type is selected', () => {
    render(<Step1_ProjectType data={null} onUpdate={mockOnUpdate} />);

    // Click on Court-métrage
    const courtMetrageCard = screen.getByText('Court-métrage').closest('[role="button"]');
    fireEvent.click(courtMetrageCard!);

    // Should call onUpdate with the correct data
    expect(mockOnUpdate).toHaveBeenCalledWith({
      type: 'court-metrage',
      durationMinutes: 15,
      durationRange: { min: 1, max: 30 },
    });
  });

  it('shows custom duration input when Custom is selected', () => {
    render(<Step1_ProjectType data={null} onUpdate={mockOnUpdate} />);

    // Custom duration input should not be visible initially
    expect(screen.queryByLabelText(/Custom Duration/i)).not.toBeInTheDocument();

    // Click on Custom
    const customCard = screen.getByText('Custom').closest('[role="button"]');
    fireEvent.click(customCard!);

    // Custom duration input should now be visible
    expect(screen.getByLabelText(/Custom Duration/i)).toBeInTheDocument();
  });

  it('validates custom duration is a positive number', () => {
    render(<Step1_ProjectType data={null} onUpdate={mockOnUpdate} />);

    // Select Custom
    const customCard = screen.getByText('Custom').closest('[role="button"]');
    fireEvent.click(customCard!);

    // Get the input
    const input = screen.getByPlaceholderText(/Enter duration in minutes/i);

    // Test negative number
    fireEvent.change(input, { target: { value: '-5' } });
    expect(screen.getAllByText(/Duration must be greater than 0/i).length).toBeGreaterThan(0);

    // Test zero
    fireEvent.change(input, { target: { value: '0' } });
    expect(screen.getAllByText(/Duration must be greater than 0/i).length).toBeGreaterThan(0);

    // Test valid number
    fireEvent.change(input, { target: { value: '45' } });
    expect(mockOnUpdate).toHaveBeenCalledWith({
      type: 'custom',
      durationMinutes: 45,
      durationRange: { min: 1, max: 999 },
    });
  });

  it('displays duration summary for predefined types', () => {
    render(<Step1_ProjectType data={null} onUpdate={mockOnUpdate} />);

    // Select Long-métrage standard
    const longMetrageCard = screen.getByText('Long-métrage standard').closest('[role="button"]');
    fireEvent.click(longMetrageCard!);

    // Should show duration summary
    expect(screen.getByText(/Default Duration/i)).toBeInTheDocument();
    expect(screen.getByText(/90 minutes/i)).toBeInTheDocument();
  });

  it('displays selected state correctly', () => {
    const initialData: ProjectTypeData = {
      type: 'moyen-metrage',
      durationMinutes: 45,
      durationRange: { min: 30, max: 60 },
    };

    render(<Step1_ProjectType data={initialData} onUpdate={mockOnUpdate} />);

    // The Moyen-métrage card should have the selected styling
    const moyenMetrageCard = screen.getByText('Moyen-métrage').closest('[role="button"]');
    expect(moyenMetrageCard).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports keyboard navigation', () => {
    render(<Step1_ProjectType data={null} onUpdate={mockOnUpdate} />);

    // Get the first card
    const courtMetrageCard = screen.getByText('Court-métrage').closest('[role="button"]');

    // Simulate Enter key press
    fireEvent.keyDown(courtMetrageCard!, { key: 'Enter' });

    // Should call onUpdate
    expect(mockOnUpdate).toHaveBeenCalledWith({
      type: 'court-metrage',
      durationMinutes: 15,
      durationRange: { min: 1, max: 30 },
    });
  });

  it('displays error messages', () => {
    const errors = {
      projectType: 'Project type is required',
    };

    render(<Step1_ProjectType data={null} onUpdate={mockOnUpdate} errors={errors} />);

    // Should display the error message
    expect(screen.getByText('Project type is required')).toBeInTheDocument();
  });
});
