/**
 * Tests for Step3_WorldBuilding component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Step3_WorldBuilding } from '../Step3_WorldBuilding';
import type { WorldBuildingData } from '@/types/wizard';

describe('Step3_WorldBuilding', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    mockOnUpdate.mockClear();
  });

  it('renders all basic world information fields', () => {
    render(<Step3_WorldBuilding data={null} onUpdate={mockOnUpdate} />);

    // Check that basic fields are displayed
    expect(screen.getByLabelText(/Time Period/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Primary Location/i)).toBeInTheDocument();
    expect(screen.getByText(/Universe Type/i)).toBeInTheDocument();
  });

  it('renders all universe type options', () => {
    render(<Step3_WorldBuilding data={null} onUpdate={mockOnUpdate} />);

    // Check that all universe type options are displayed
    expect(screen.getByText('Realistic')).toBeInTheDocument();
    expect(screen.getByText('Fantasy')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    expect(screen.getByText('Historical')).toBeInTheDocument();
    expect(screen.getByText('Alternate')).toBeInTheDocument();
  });

  it('allows adding a new location', async () => {
    render(<Step3_WorldBuilding data={null} onUpdate={mockOnUpdate} />);

    // Click Add Location button
    const addButton = screen.getByRole('button', { name: /Add Location/i });
    fireEvent.click(addButton);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText(/Add New Location/i)).toBeInTheDocument();
    });

    // Fill in location form
    const nameInput = screen.getByPlaceholderText(/e.g., The Grand Library/i);
    const descriptionInput = screen.getByPlaceholderText(/An ancient library/i);

    fireEvent.change(nameInput, { target: { value: 'The Grand Library' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'An ancient library containing forbidden knowledge' },
    });

    // Save location
    const saveButton = screen.getByRole('button', { name: /Add Location/i });
    fireEvent.click(saveButton);

    // Location should be added to the list
    await waitFor(() => {
      expect(screen.getByText('The Grand Library')).toBeInTheDocument();
    });
  });

  it('allows editing an existing location', async () => {
    const initialData: WorldBuildingData = {
      timePeriod: 'Medieval',
      primaryLocation: 'Kingdom',
      universeType: 'fantasy',
      worldRules: 'Magic exists',
      locations: [
        {
          id: 'loc-1',
          name: 'Castle',
          description: 'A large castle',
          visualCharacteristics: 'Stone walls',
          mood: 'serious',
        },
      ],
      culturalContext: 'Feudal society',
      technologyLevel: 2,
    };

    render(<Step3_WorldBuilding data={initialData} onUpdate={mockOnUpdate} />);

    // Click edit button
    const editButton = screen.getByLabelText(/Edit Castle/i);
    fireEvent.click(editButton);

    // Dialog should open with existing data
    await waitFor(() => {
      expect(screen.getByText(/Edit Location/i)).toBeInTheDocument();
    });

    // Verify existing data is loaded
    const nameInput = screen.getByDisplayValue('Castle');
    expect(nameInput).toBeInTheDocument();

    // Update the name
    fireEvent.change(nameInput, { target: { value: 'Royal Castle' } });

    // Save changes
    const updateButton = screen.getByRole('button', { name: /Update Location/i });
    fireEvent.click(updateButton);

    // Updated location should be displayed
    await waitFor(() => {
      expect(screen.getByText('Royal Castle')).toBeInTheDocument();
    });
  });

  it('allows deleting a location', async () => {
    const initialData: WorldBuildingData = {
      timePeriod: 'Medieval',
      primaryLocation: 'Kingdom',
      universeType: 'fantasy',
      worldRules: 'Magic exists',
      locations: [
        {
          id: 'loc-1',
          name: 'Castle',
          description: 'A large castle',
          visualCharacteristics: 'Stone walls',
          mood: 'serious',
        },
      ],
      culturalContext: 'Feudal society',
      technologyLevel: 2,
    };

    render(<Step3_WorldBuilding data={initialData} onUpdate={mockOnUpdate} />);

    // Verify location is displayed
    expect(screen.getByText('Castle')).toBeInTheDocument();

    // Click delete button
    const deleteButton = screen.getByLabelText(/Delete Castle/i);
    fireEvent.click(deleteButton);

    // Location should be removed
    await waitFor(() => {
      expect(screen.queryByText('Castle')).not.toBeInTheDocument();
    });
  });

  it('calls onUpdate when all required fields are filled', async () => {
    render(<Step3_WorldBuilding data={null} onUpdate={mockOnUpdate} />);

    // Fill in required fields
    const timePeriodInput = screen.getByLabelText(/Time Period/i);
    const primaryLocationInput = screen.getByLabelText(/Primary Location/i);

    fireEvent.change(timePeriodInput, { target: { value: 'Modern Day' } });
    fireEvent.change(primaryLocationInput, { target: { value: 'New York City' } });

    // Add a location
    const addButton = screen.getByRole('button', { name: /Add Location/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Add New Location/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/e.g., The Grand Library/i);
    const descriptionInput = screen.getByPlaceholderText(/An ancient library/i);

    fireEvent.change(nameInput, { target: { value: 'Central Park' } });
    fireEvent.change(descriptionInput, { target: { value: 'A large urban park' } });

    const saveButton = screen.getByRole('button', { name: /Add Location/i });
    fireEvent.click(saveButton);

    // Wait for onUpdate to be called
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled();
    });

    // Verify the data structure
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
    expect(lastCall).toMatchObject({
      timePeriod: 'Modern Day',
      primaryLocation: 'New York City',
      universeType: 'realistic',
      locations: expect.arrayContaining([
        expect.objectContaining({
          name: 'Central Park',
          description: 'A large urban park',
        }),
      ]),
    });
  });

  it('displays technology level slider correctly', () => {
    render(<Step3_WorldBuilding data={null} onUpdate={mockOnUpdate} />);

    // Find the technology level slider
    const slider = screen.getByLabelText(/Technology Level/i);
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '10');
  });

  it('updates technology level when slider changes', () => {
    render(<Step3_WorldBuilding data={null} onUpdate={mockOnUpdate} />);

    const slider = screen.getByLabelText(/Technology Level/i);
    fireEvent.change(slider, { target: { value: '8' } });

    // The displayed value should update
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('displays error messages', () => {
    const errors = {
      timePeriod: 'Time period is required',
      locations: 'At least one location is required',
    };

    render(<Step3_WorldBuilding data={null} onUpdate={mockOnUpdate} errors={errors} />);

    // Should display error messages (using getAllByText since errors appear in multiple places)
    const timePeriodErrors = screen.getAllByText(/Time period is required/i);
    expect(timePeriodErrors.length).toBeGreaterThan(0);
    
    const locationErrors = screen.getAllByText(/At least one location is required/i);
    expect(locationErrors.length).toBeGreaterThan(0);
  });

  it('displays world configuration summary when data is complete', () => {
    const completeData: WorldBuildingData = {
      timePeriod: 'Medieval',
      primaryLocation: 'Kingdom of Eldoria',
      universeType: 'fantasy',
      worldRules: 'Magic requires incantations',
      locations: [
        {
          id: 'loc-1',
          name: 'Castle',
          description: 'Royal castle',
          visualCharacteristics: 'Stone walls',
          mood: 'serious',
        },
      ],
      culturalContext: 'Feudal society',
      technologyLevel: 2,
    };

    render(<Step3_WorldBuilding data={completeData} onUpdate={mockOnUpdate} />);

    // Should display summary with the title
    expect(screen.getByText(/World Configuration/i)).toBeInTheDocument();
    
    // Verify the location is displayed
    expect(screen.getByText('Castle')).toBeInTheDocument();
  });

  it('supports keyboard navigation for universe type selection', () => {
    render(<Step3_WorldBuilding data={null} onUpdate={mockOnUpdate} />);

    // Get the Fantasy card
    const fantasyCard = screen.getByText('Fantasy').closest('[role="radio"]');

    // Simulate Enter key press
    fireEvent.keyDown(fantasyCard!, { key: 'Enter' });

    // The card should be selected (checked)
    expect(fantasyCard).toHaveAttribute('aria-checked', 'true');
  });

  it('prevents saving location without required fields', async () => {
    render(<Step3_WorldBuilding data={null} onUpdate={mockOnUpdate} />);

    // Open location dialog
    const addButton = screen.getByRole('button', { name: /Add Location/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Add New Location/i)).toBeInTheDocument();
    });

    // Try to save without filling required fields
    const saveButton = screen.getByRole('button', { name: /Add Location/i });
    expect(saveButton).toBeDisabled();
  });
});
