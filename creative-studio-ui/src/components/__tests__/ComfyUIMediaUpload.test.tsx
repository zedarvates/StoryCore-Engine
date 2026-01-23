/**
 * Unit tests for ComfyUIMediaUpload component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComfyUIMediaUpload } from '../ComfyUIMediaUpload';

// Mock services
vi.mock('@/services/backendApiService', () => ({
  backendApi: {
    getComfyUIConfig: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('ComfyUIMediaUpload', () => {
  const mockOnFileUploaded = jest.fn();
  const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock backend API config
    const mockBackendApi = require('@/services/backendApiService').backendApi;
    mockBackendApi.getComfyUIConfig.mockReturnValue({
      serverUrl: 'http://localhost:8188',
      authentication: { type: 'none' },
    });

    // Mock fetch for ComfyUI upload
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ name: 'test.jpg', subfolder: 'user_uploads', type: 'input' }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders upload interface', () => {
    render(<ComfyUIMediaUpload onFileUploaded={mockOnFileUploaded} />);

    expect(screen.getByText('Upload Media for ComfyUI')).toBeInTheDocument();
    expect(screen.getByText('Drag & drop or click to select images, audio, or video files')).toBeInTheDocument();
  });

  it('shows file type and size restrictions', () => {
    render(<ComfyUIMediaUpload onFileUploaded={mockOnFileUploaded} maxFileSize={50} />);

    expect(screen.getByText('Max size: 50MB • Types: image/*,audio/*,video/*')).toBeInTheDocument();
  });

  it('handles file selection via click', async () => {
    render(<ComfyUIMediaUpload onFileUploaded={mockOnFileUploaded} />);

    const input = screen.getByLabelText('Upload media file for ComfyUI processing') as HTMLInputElement;

    // Simulate file selection
    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText('Uploading test.jpg')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Uploaded successfully')).toBeInTheDocument();
    });

    expect(mockOnFileUploaded).toHaveBeenCalledWith(
      mockFile,
      expect.stringContaining('/view?filename=test.jpg')
    );
  });

  it('validates file size', async () => {
    const mockToast = require('@/hooks/use-toast').useToast().toast;

    render(<ComfyUIMediaUpload onFileUploaded={mockOnFileUploaded} maxFileSize={1} />);

    const input = screen.getByLabelText('Upload media file for ComfyUI processing') as HTMLInputElement;

    // Create a large file (2MB)
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Invalid File',
        description: expect.stringContaining('File size exceeds 1MB limit'),
        variant: 'destructive',
      });
    });
  });

  it('validates file type', async () => {
    const mockToast = require('@/hooks/use-toast').useToast().toast;

    render(
      <ComfyUIMediaUpload
        onFileUploaded={mockOnFileUploaded}
        acceptedTypes="image/*"
      />
    );

    const input = screen.getByLabelText('Upload media file for ComfyUI processing') as HTMLInputElement;

    // Create a text file (not accepted)
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [textFile] } });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Invalid File',
        description: expect.stringContaining('File type not supported'),
        variant: 'destructive',
      });
    });
  });

  it('shows upload progress', async () => {
    render(<ComfyUIMediaUpload onFileUploaded={mockOnFileUploaded} />);

    const input = screen.getByLabelText('Upload media file for ComfyUI processing') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText('Uploading test.jpg')).toBeInTheDocument();
    });

    // Progress should be shown (implementation simulates progress)
    await waitFor(() => {
      expect(screen.getByText(/%/)).toBeInTheDocument();
    });
  });

  it('handles drag and drop', async () => {
    render(<ComfyUIMediaUpload onFileUploaded={mockOnFileUploaded} />);

    const dropZone = screen.getByText('Upload Media for ComfyUI').closest('div');

    // Simulate drag over
    fireEvent.dragOver(dropZone!);
    expect(dropZone).toHaveClass('border-primary');

    // Simulate drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [mockFile],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Uploading test.jpg')).toBeInTheDocument();
    });
  });

  it('allows clearing uploaded file', async () => {
    render(<ComfyUIMediaUpload onFileUploaded={mockOnFileUploaded} />);

    const input = screen.getByLabelText('Upload media file for ComfyUI processing') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(screen.getByText('Uploaded successfully')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(screen.getByText('Upload Media for ComfyUI')).toBeInTheDocument();
    expect(screen.queryByText('Uploaded successfully')).not.toBeInTheDocument();
  });

  it('handles upload errors', async () => {
    // Mock failed upload
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      })
    ) as jest.Mock;

    const mockToast = require('@/hooks/use-toast').useToast().toast;

    render(<ComfyUIMediaUpload onFileUploaded={mockOnFileUploaded} />);

    const input = screen.getByLabelText('Upload media file for ComfyUI processing') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Upload Failed',
        description: expect.stringContaining('ComfyUI upload failed'),
        variant: 'destructive',
      });
    });
  });
});
