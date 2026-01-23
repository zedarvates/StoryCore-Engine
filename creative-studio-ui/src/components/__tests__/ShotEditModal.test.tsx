import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShotEditModal } from '../ShotEditModal';
import { useStore } from '@/store';

// Mock the useStore hook
jest.mock('@/store', () => ({
  useStore: jest.fn(),
}));

describe('ShotEditModal', () => {
  const mockUpdateShot = jest.fn();
  const mockShot = {
    id: 'shot1',
    title: 'Test Shot',
    description: 'Test Description',
    duration: 30,
    image: 'test.jpg',
    position: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStore as jest.Mock).mockReturnValue(mockUpdateShot);
  });

  it('should not render when isOpen is false', () => {
    render(
      <ShotEditModal shot={mockShot} isOpen={false} onClose={() => {}} />
    );
    
    expect(screen.queryByText('Edit Shot')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <ShotEditModal shot={mockShot} isOpen={true} onClose={() => {}} />
    );
    
    expect(screen.getByText('Edit Shot')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Shot')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
  });

  it('should update form fields', () => {
    render(
      <ShotEditModal shot={mockShot} isOpen={true} onClose={() => {}} />
    );
    
    // Update title
    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    expect((titleInput as HTMLInputElement).value).toBe('New Title');
    
    // Update description
    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
    expect((descriptionInput as HTMLTextAreaElement).value).toBe('New Description');
    
    // Update duration
    const durationInput = screen.getByLabelText('Duration (seconds)');
    fireEvent.change(durationInput, { target: { value: '45' } });
    expect((durationInput as HTMLInputElement).value).toBe('45');
  });

  it('should call onClose when cancel button is clicked', () => {
    const mockOnClose = jest.fn();
    
    render(
      <ShotEditModal shot={mockShot} isOpen={true} onClose={mockOnClose} />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call updateShot and onClose when save button is clicked', () => {
    const mockOnClose = jest.fn();
    
    render(
      <ShotEditModal shot={mockShot} isOpen={true} onClose={mockOnClose} />
    );
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    expect(mockUpdateShot).toHaveBeenCalledWith('shot1', {
      title: 'Test Shot',
      description: 'Test Description',
      duration: 30,
      image: 'test.jpg',
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle image upload', () => {
    render(
      <ShotEditModal shot={mockShot} isOpen={true} onClose={() => {}} />
    );
    
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload Image') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    // Should update the image state
    expect(input.files?.[0]).toBe(file);
  });

  it('should handle image removal', () => {
    render(
      <ShotEditModal shot={mockShot} isOpen={true} onClose={() => {}} />
    );
    
    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);
    
    // Should remove the image
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });
});