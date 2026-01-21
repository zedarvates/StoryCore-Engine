/**
 * Unit tests for ComfyUIControlPanel component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ComfyUIControlPanel } from '../ComfyUIControlPanel';
import { useAppStore } from '@/stores/useAppStore';

// Mock stores
vi.mock('@/stores/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

// Mock services
vi.mock('@/services/comfyuiService', () => ({
  testComfyUIConnection: vi.fn(),
}));

vi.mock('@/services/backendApiService', () => ({
  backendApi: {
    getComfyUIConfig: vi.fn(),
    getComfyUIQueue: vi.fn(),
    cancelComfyUIWorkflow: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('ComfyUIControlPanel', () => {
  const mockProject = {
    project_name: 'test-project',
    project_path: '/path/to/project',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useAppStore
    (useAppStore as jest.Mock).mockReturnValue({
      project: mockProject,
    });

    // Mock backend API
    const mockBackendApi = require('@/services/backendApiService').backendApi;
    mockBackendApi.getComfyUIConfig.mockReturnValue({
      serverUrl: 'http://localhost:8188',
      authentication: { type: 'none' },
    });
    mockBackendApi.getComfyUIQueue.mockResolvedValue({
      success: true,
      data: { pending: 2, running: 1, queue: [] },
    });
  });

  it('renders ComfyUI control panel', () => {
    render(<ComfyUIControlPanel />);

    expect(screen.getByText('ComfyUI Control')).toBeInTheDocument();
    expect(screen.getByText('Server Information')).toBeInTheDocument();
    expect(screen.getByText('Queue Status')).toBeInTheDocument();
    expect(screen.getByText('Quick Workflows')).toBeInTheDocument();
  });

  it('displays connection status', () => {
    render(<ComfyUIControlPanel />);

    expect(screen.getByText('disconnected')).toBeInTheDocument();
  });

  it('shows workflow execution buttons', () => {
    render(<ComfyUIControlPanel />);

    expect(screen.getByText('Generate Image')).toBeInTheDocument();
    expect(screen.getByText('Generate Video')).toBeInTheDocument();
    expect(screen.getByText('Upscale')).toBeInTheDocument();
    expect(screen.getByText('Inpaint')).toBeInTheDocument();
  });

  it('disables workflow buttons when not connected', () => {
    render(<ComfyUIControlPanel />);

    const imageButton = screen.getByText('Generate Image');
    expect(imageButton).toBeDisabled();
  });

  it('shows media upload component', () => {
    render(<ComfyUIControlPanel />);

    expect(screen.getByText('Upload Media for ComfyUI')).toBeInTheDocument();
  });

  it('displays queue status when available', async () => {
    render(<ComfyUIControlPanel />);

    await waitFor(() => {
      expect(screen.getByText('Pending:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // pending count
      expect(screen.getByText('Running:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // running count
    });
  });

  it('shows progress monitor section', () => {
    render(<ComfyUIControlPanel />);

    expect(screen.getByText('Workflow Progress')).toBeInTheDocument();
  });

  it('includes test connection button', () => {
    render(<ComfyUIControlPanel />);

    expect(screen.getByText('Test Connection')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    render(<ComfyUIControlPanel />);

    const refreshButton = screen.getByLabelText('Refresh status');
    fireEvent.click(refreshButton);

    // Should trigger queue status refresh
    await waitFor(() => {
      expect(require('@/services/backendApiService').backendApi.getComfyUIQueue).toHaveBeenCalled();
    });
  });
});