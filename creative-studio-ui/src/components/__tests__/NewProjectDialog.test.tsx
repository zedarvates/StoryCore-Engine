import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewProjectDialog } from '../NewProjectDialog';

describe('NewProjectDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnCreateProject = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnCreateProject.mockClear();
  });

  it('should not render when isOpen is false', () => {
    render(
      <NewProjectDialog
        isOpen={false}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter project name')).toBeInTheDocument();
  });

  it('should focus input when dialog opens', async () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const input = screen.getByPlaceholderText('Enter project name');
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it('should show error when project name is empty', async () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    expect(mockOnCreateProject).not.toHaveBeenCalled();
  });

  it('should show error when project name is too short', async () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const input = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(input, { target: { value: 'ab' } });

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Project name must be at least 3 characters')).toBeInTheDocument();
    });

    expect(mockOnCreateProject).not.toHaveBeenCalled();
  });

  it('should show error when project name is too long', async () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const input = screen.getByPlaceholderText('Enter project name');
    const longName = 'a'.repeat(51);
    fireEvent.change(input, { target: { value: longName } });

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Project name must be less than 50 characters')).toBeInTheDocument();
    });

    expect(mockOnCreateProject).not.toHaveBeenCalled();
  });

  it('should show error when project name contains invalid characters', async () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const input = screen.getByPlaceholderText('Enter project name');
    const invalidNames = ['test<name', 'test>name', 'test:name', 'test/name', 'test\\name'];

    for (const invalidName of invalidNames) {
      fireEvent.change(input, { target: { value: invalidName } });

      const submitButton = screen.getByText('Create Project');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Project name contains invalid characters')).toBeInTheDocument();
      });

      expect(mockOnCreateProject).not.toHaveBeenCalled();
      mockOnCreateProject.mockClear();
    }
  });

  it('should create project with valid name', async () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const input = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(input, { target: { value: 'My Test Project' } });

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreateProject).toHaveBeenCalledWith('My Test Project');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should trim whitespace from project name', async () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const input = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(input, { target: { value: '  My Project  ' } });

    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnCreateProject).toHaveBeenCalledWith('My Project');
    });
  });

  it('should close dialog when clicking close button', () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close dialog when clicking cancel button', () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close dialog when clicking backdrop', () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const backdrop = screen.getByText('Create New Project').closest('div')?.parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should clear error when typing', async () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    // Trigger error
    const submitButton = screen.getByText('Create Project');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    // Type to clear error
    const input = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(input, { target: { value: 'New Project' } });

    await waitFor(() => {
      expect(screen.queryByText('Project name is required')).not.toBeInTheDocument();
    });
  });

  it('should reset state when dialog closes', async () => {
    const { rerender } = render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const input = screen.getByPlaceholderText('Enter project name');
    fireEvent.change(input, { target: { value: 'Test Project' } });

    // Close dialog
    rerender(
      <NewProjectDialog
        isOpen={false}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    // Reopen dialog
    rerender(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    const reopenedInput = screen.getByPlaceholderText('Enter project name');
    expect(reopenedInput).toHaveValue('');
  });

  it('should display default settings information', () => {
    render(
      <NewProjectDialog
        isOpen={true}
        onClose={mockOnClose}
        onCreateProject={mockOnCreateProject}
      />
    );

    expect(screen.getByText('Default Settings:')).toBeInTheDocument();
    expect(screen.getByText('Empty storyboard')).toBeInTheDocument();
    expect(screen.getByText('All capabilities enabled')).toBeInTheDocument();
    expect(screen.getByText('Data Contract v1.0 format')).toBeInTheDocument();
  });
});
