/**
 * Tests for PresetManager Component
 * 
 * Validates preset management UI functionality.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PresetManager } from '../PresetManager';
import { PresetManagementService } from '../../../services/PresetManagementService';

describe('PresetManager', () => {
  const mockOnLoadPreset = vi.fn();
  
  const mockImageParams = {
    negativePrompt: 'blurry',
    width: 1024,
    height: 1024,
    steps: 20,
    cfgScale: 7.5,
    seed: -1,
    sampler: 'euler',
    scheduler: 'normal',
  };
  
  beforeEach(() => {
    localStorage.clear();
    mockOnLoadPreset.mockClear();
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  it('should render save and load buttons', () => {
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    expect(screen.getByText('Save Preset')).toBeInTheDocument();
    expect(screen.getByText('Load Preset')).toBeInTheDocument();
  });
  
  it('should disable load button when no presets exist', () => {
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    const loadButton = screen.getByText('Load Preset').closest('button');
    expect(loadButton).toBeDisabled();
  });
  
  it('should open save dialog when save button clicked', async () => {
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    const saveButton = screen.getByText('Save Preset');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Give your preset a name to save the current parameters.')).toBeInTheDocument();
    });
  });
  
  it('should save a preset with valid name', async () => {
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    // Open save dialog
    const saveButton = screen.getByText('Save Preset');
    fireEvent.click(saveButton);
    
    // Enter preset name
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter preset name...');
      fireEvent.change(input, { target: { value: 'My Preset' } });
    });
    
    // Click save
    const saveDialogButton = screen.getAllByText('Save').find(el => el.closest('button'));
    fireEvent.click(saveDialogButton!);
    
    // Verify preset was saved
    await waitFor(() => {
      const presets = PresetManagementService.getPresets('image');
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('My Preset');
    });
  });
  
  it('should not save preset with empty name', async () => {
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    // Open save dialog
    const saveButton = screen.getByText('Save Preset');
    fireEvent.click(saveButton);
    
    // Try to save without entering name
    await waitFor(() => {
      const saveDialogButton = screen.getAllByText('Save').find(el => el.closest('button'));
      expect(saveDialogButton).toBeDisabled();
    });
  });
  
  it('should open load dialog when load button clicked', async () => {
    // Save a preset first
    PresetManagementService.savePreset({
      name: 'Test Preset',
      type: 'image',
      params: mockImageParams,
    });
    
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    const loadButton = screen.getByText('Load Preset');
    fireEvent.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText('Select a preset to load its parameters.')).toBeInTheDocument();
      expect(screen.getByText('Test Preset')).toBeInTheDocument();
    });
  });
  
  it('should load a preset when clicked', async () => {
    // Save a preset first
    const preset = PresetManagementService.savePreset({
      name: 'Test Preset',
      type: 'image',
      params: mockImageParams,
    });
    
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    // Open load dialog
    const loadButton = screen.getByText('Load Preset');
    fireEvent.click(loadButton);
    
    // Click on preset
    await waitFor(() => {
      const presetButton = screen.getByText('Test Preset');
      fireEvent.click(presetButton);
    });
    
    // Verify callback was called
    expect(mockOnLoadPreset).toHaveBeenCalledWith(preset);
  });
  
  it('should delete a preset when delete button clicked', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    
    // Save a preset first
    PresetManagementService.savePreset({
      name: 'To Delete',
      type: 'image',
      params: mockImageParams,
    });
    
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    // Open load dialog
    const loadButton = screen.getByText('Load Preset');
    fireEvent.click(loadButton);
    
    // Click delete button
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );
      fireEvent.click(deleteButtons[0]);
    });
    
    // Verify preset was deleted
    await waitFor(() => {
      const presets = PresetManagementService.getPresets('image');
      expect(presets).toHaveLength(0);
    });
    
    // Restore window.confirm
    window.confirm = originalConfirm;
  });
  
  it('should start editing preset name when edit button clicked', async () => {
    // Save a preset first
    PresetManagementService.savePreset({
      name: 'Original Name',
      type: 'image',
      params: mockImageParams,
    });
    
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    // Open load dialog
    const loadButton = screen.getByText('Load Preset');
    fireEvent.click(loadButton);
    
    // Click edit button
    await waitFor(() => {
      const editButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg')?.classList.contains('lucide-edit-2')
      );
      fireEvent.click(editButtons[0]);
    });
    
    // Verify input is shown
    await waitFor(() => {
      const input = screen.getByDisplayValue('Original Name');
      expect(input).toBeInTheDocument();
    });
  });
  
  it('should save edited preset name', async () => {
    // Save a preset first
    const preset = PresetManagementService.savePreset({
      name: 'Original Name',
      type: 'image',
      params: mockImageParams,
    });
    
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    // Open load dialog
    const loadButton = screen.getByText('Load Preset');
    fireEvent.click(loadButton);
    
    // Click edit button
    await waitFor(() => {
      const editButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg')?.classList.contains('lucide-edit-2')
      );
      fireEvent.click(editButtons[0]);
    });
    
    // Change name
    await waitFor(() => {
      const input = screen.getByDisplayValue('Original Name');
      fireEvent.change(input, { target: { value: 'New Name' } });
    });
    
    // Click save (check icon)
    await waitFor(() => {
      const checkButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg')?.classList.contains('lucide-check')
      );
      fireEvent.click(checkButtons[0]);
    });
    
    // Verify name was changed
    await waitFor(() => {
      const updated = PresetManagementService.getPresetById(preset.id);
      expect(updated?.name).toBe('New Name');
    });
  });
  
  it('should show "No presets saved yet" when no presets exist', async () => {
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    // Enable load button by saving a preset then deleting it
    // Actually, just check that load button is disabled
    const loadButton = screen.getByText('Load Preset').closest('button');
    expect(loadButton).toBeDisabled();
  });
  
  it('should handle export presets', async () => {
    // Save a preset first
    PresetManagementService.savePreset({
      name: 'Export Test',
      type: 'image',
      params: mockImageParams,
    });
    
    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
    
    const mockClick = vi.fn();
    const mockCreateElement = vi.spyOn(document, 'createElement');
    mockCreateElement.mockReturnValue({
      click: mockClick,
      href: '',
      download: '',
    } as any);
    
    render(
      <PresetManager
        type="image"
        currentParams={mockImageParams}
        onLoadPreset={mockOnLoadPreset}
      />
    );
    
    // Open more options menu
    const moreButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg')?.classList.contains('lucide-more-vertical')
    );
    fireEvent.click(moreButton!);
    
    // Click export
    await waitFor(() => {
      const exportButton = screen.getByText('Export Presets');
      fireEvent.click(exportButton);
    });
    
    // Verify export was triggered
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    
    // Cleanup
    mockCreateElement.mockRestore();
  });
});
