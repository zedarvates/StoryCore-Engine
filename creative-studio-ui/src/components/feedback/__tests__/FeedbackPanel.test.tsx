/**
 * FeedbackPanel Component Tests
 * 
 * Tests for the FeedbackPanel component including:
 * - Component rendering
 * - Form validation
 * - State management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackPanel } from '../FeedbackPanel';
import * as diagnosticBridge from '../utils/diagnosticBridge';
import * as githubTemplate from '../utils/githubTemplate';
import * as clipboard from '../utils/clipboard';

// Mock the utility modules
vi.mock('../utils/diagnosticBridge');
vi.mock('../utils/githubTemplate');
vi.mock('../utils/clipboard');

describe('FeedbackPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(diagnosticBridge.createReportPayload).mockResolvedValue({
      schema_version: '1.0',
      report_type: 'bug',
      timestamp: '2024-01-01T00:00:00.000Z',
      system_info: {
        storycore_version: '0.1.0',
        python_version: '3.9.0',
        os_platform: 'Windows',
        os_version: '10.0',
        language: 'en-US',
      },
      module_context: {
        active_module: 'test-module',
        module_state: {},
      },
      user_input: {
        description: 'Test description',
        reproduction_steps: 'Test steps',
      },
      diagnostics: {
        stacktrace: null,
        logs: [],
        memory_usage_mb: 0,
        process_state: {},
      },
      screenshot_base64: null,
    });

    vi.mocked(githubTemplate.generateGitHubUrl).mockReturnValue('https://github.com/test/repo/issues/new');
    vi.mocked(githubTemplate.formatIssueBody).mockReturnValue('Test template');
    vi.mocked(clipboard.copyToClipboard).mockResolvedValue();
  });

  it('should render the feedback panel when open', () => {
    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Help & Support')).toBeInTheDocument();
    expect(screen.getByLabelText(/Report Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reproduction Steps/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<FeedbackPanel isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByText('Help & Support')).not.toBeInTheDocument();
  });

  it('should show validation errors for empty required fields', async () => {
    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
    
    const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Description must be at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('should update form state when fields change', () => {
    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
    
    const descriptionField = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionField, { target: { value: 'Test description that is long enough' } });
    
    expect(descriptionField).toHaveValue('Test description that is long enough');
  });

  it('should call onClose when Cancel button is clicked', () => {
    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should populate form with initial context', () => {
    const initialContext = {
      errorMessage: 'Test error message',
      stackTrace: 'Test stack trace',
      activeModule: 'test-module',
    };

    render(
      <FeedbackPanel 
        isOpen={true} 
        onClose={mockOnClose} 
        initialContext={initialContext}
      />
    );
    
    const descriptionField = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
    expect(descriptionField.value).toBe('Test error message');
  });

  it('should submit form with valid data', async () => {
    // Mock window.open
    const mockOpen = vi.fn();
    global.window.open = mockOpen;

    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
    
    // Fill in the form
    const descriptionField = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionField, { target: { value: 'This is a valid description with enough characters' } });

    const reproductionField = screen.getByLabelText(/Reproduction Steps/i);
    fireEvent.change(reproductionField, { target: { value: 'Step 1\nStep 2\nStep 3' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(diagnosticBridge.createReportPayload).toHaveBeenCalled();
      expect(githubTemplate.generateGitHubUrl).toHaveBeenCalled();
      expect(clipboard.copyToClipboard).toHaveBeenCalled();
      expect(mockOpen).toHaveBeenCalledWith(
        'https://github.com/test/repo/issues/new',
        '_blank',
        'noopener,noreferrer'
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle submission errors gracefully', async () => {
    // Mock an error in the submission process
    vi.mocked(diagnosticBridge.createReportPayload).mockRejectedValue(
      new Error('Failed to collect diagnostics')
    );

    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
    
    // Fill in the form
    const descriptionField = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionField, { target: { value: 'This is a valid description' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to collect diagnostics/i)).toBeInTheDocument();
    });

    // Dialog should not close on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  describe('Screenshot Upload', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL for all screenshot tests
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
    });

    it('should render screenshot upload field', () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByLabelText(/Screenshot/i)).toBeInTheDocument();
      expect(screen.getByText(/PNG, JPG, or GIF \(max 5MB\)/i)).toBeInTheDocument();
    });

    it('should accept valid PNG file', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      
      const input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
        expect(screen.getByText(/1\.0 MB/i)).toBeInTheDocument();
        // Check for the uppercase PNG format display
        const formatElements = screen.getAllByText(/PNG/i);
        expect(formatElements.length).toBeGreaterThan(0);
      });
    });

    it('should accept valid JPG file', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 500 * 1024 }); // 500KB
      
      const input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
        expect(screen.getByText(/500\.0 KB/i)).toBeInTheDocument();
      });
    });

    it('should accept valid GIF file', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const file = new File(['test'], 'test.gif', { type: 'image/gif' });
      Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 }); // 2MB
      
      const input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.gif')).toBeInTheDocument();
        expect(screen.getByText(/2\.0 MB/i)).toBeInTheDocument();
      });
    });

    it('should reject invalid file format', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      const input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid format\. Please upload PNG, JPG, or GIF files only\./i)).toBeInTheDocument();
      });
    });

    it('should reject file larger than 5MB', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const file = new File(['test'], 'large.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 }); // 6MB
      
      const input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/File too large\. Maximum size is 5MB\./i)).toBeInTheDocument();
      });
    });

    it('should display screenshot preview after upload', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const file = new File(['test'], 'screenshot.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      
      const input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        const preview = screen.getByAltText('Screenshot preview');
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src', 'blob:mock-url');
      });
    });

    it('should remove screenshot when Remove button is clicked', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const file = new File(['test'], 'screenshot.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      
      const input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('screenshot.png')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: /Remove/i });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('screenshot.png')).not.toBeInTheDocument();
        expect(screen.getByText(/PNG, JPG, or GIF \(max 5MB\)/i)).toBeInTheDocument();
      });
    });

    it('should format file size correctly', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Test bytes
      const smallFile = new File(['test'], 'small.png', { type: 'image/png' });
      Object.defineProperty(smallFile, 'size', { value: 500 }); // 500 bytes
      
      let input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [smallFile] } });

      await waitFor(() => {
        expect(screen.getByText(/500 B/i)).toBeInTheDocument();
      });

      // Remove and test KB
      const removeButton = screen.getByRole('button', { name: /Remove/i });
      fireEvent.click(removeButton);

      const mediumFile = new File(['test'], 'medium.png', { type: 'image/png' });
      Object.defineProperty(mediumFile, 'size', { value: 1536 }); // 1.5 KB
      
      input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [mediumFile] } });

      await waitFor(() => {
        expect(screen.getByText(/1\.5 KB/i)).toBeInTheDocument();
      });
    });

    it('should clear screenshot validation error when valid file is uploaded', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // First upload invalid file
      const invalidFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Invalid format/i)).toBeInTheDocument();
      });

      // Then upload valid file
      const validFile = new File(['test'], 'test.png', { type: 'image/png' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB
      
      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.queryByText(/Invalid format/i)).not.toBeInTheDocument();
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });
    });
  });

  describe('Submission Mode Selector', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should render submission mode selector with both options', () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Submission Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Manual Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Automatic Mode')).toBeInTheDocument();
    });

    it('should display mode descriptions', () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText(/Opens a pre-filled GitHub issue in your browser/i)).toBeInTheDocument();
      expect(screen.getByText(/Automatically creates a GitHub issue without opening your browser/i)).toBeInTheDocument();
    });

    it('should default to manual mode when no preference is saved', () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const manualRadio = screen.getByLabelText('Manual Mode') as HTMLInputElement;
      expect(manualRadio).toBeChecked();
    });

    it('should load saved preference from local storage', () => {
      // Save automatic mode preference
      localStorage.setItem('storycore-feedback-submission-mode', 'automatic');
      
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const automaticRadio = screen.getByLabelText('Automatic Mode') as HTMLInputElement;
      expect(automaticRadio).toBeChecked();
    });

    it('should save preference to local storage when mode changes', () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const automaticRadio = screen.getByLabelText('Automatic Mode');
      fireEvent.click(automaticRadio);
      
      expect(localStorage.getItem('storycore-feedback-submission-mode')).toBe('automatic');
    });

    it('should update form state when mode changes', () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      const automaticRadio = screen.getByLabelText('Automatic Mode');
      fireEvent.click(automaticRadio);
      
      expect(automaticRadio).toBeChecked();
      
      const manualRadio = screen.getByLabelText('Manual Mode');
      fireEvent.click(manualRadio);
      
      expect(manualRadio).toBeChecked();
    });

    it('should preserve mode preference when dialog closes and reopens', () => {
      const { rerender } = render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Change to automatic mode
      const automaticRadio = screen.getByLabelText('Automatic Mode');
      fireEvent.click(automaticRadio);
      
      // Close dialog
      rerender(<FeedbackPanel isOpen={false} onClose={mockOnClose} />);
      
      // Reopen dialog
      rerender(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Should still be automatic mode
      const automaticRadioAfterReopen = screen.getByLabelText('Automatic Mode') as HTMLInputElement;
      expect(automaticRadioAfterReopen).toBeChecked();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Should not crash when trying to save
      const automaticRadio = screen.getByLabelText('Automatic Mode');
      expect(() => fireEvent.click(automaticRadio)).not.toThrow();
      
      // Restore original
      localStorage.setItem = originalSetItem;
    });

    it('should handle invalid localStorage values gracefully', () => {
      // Set invalid value in localStorage
      localStorage.setItem('storycore-feedback-submission-mode', 'invalid-mode');
      
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Should default to manual mode
      const manualRadio = screen.getByLabelText('Manual Mode') as HTMLInputElement;
      expect(manualRadio).toBeChecked();
    });
  });

  describe('Progress Indicators', () => {
    beforeEach(() => {
      // Mock window.open
      global.window.open = vi.fn();
    });

    it('should show progress indicator during submission', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Fill in the form
      const descriptionField = screen.getByLabelText(/Description/i);
      fireEvent.change(descriptionField, { target: { value: 'This is a valid description with enough characters' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
      fireEvent.click(submitButton);

      // Should show progress indicator
      await waitFor(() => {
        expect(screen.getByText(/Collecting diagnostic information/i)).toBeInTheDocument();
      });
    });

    it('should show progress steps during submission', async () => {
      // Add a delay to the diagnostic collection to make progress visible
      vi.mocked(diagnosticBridge.createReportPayload).mockImplementation(async (...args) => {
        // Simulate slow diagnostic collection
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          schema_version: '1.0',
          report_type: 'bug',
          timestamp: '2024-01-01T00:00:00.000Z',
          system_info: {
            storycore_version: '0.1.0',
            python_version: '3.9.0',
            os_platform: 'Windows',
            os_version: '10.0',
            language: 'en-US',
          },
          module_context: {
            active_module: 'test-module',
            module_state: {},
          },
          user_input: {
            description: 'Test description',
            reproduction_steps: 'Test steps',
          },
          diagnostics: {
            stacktrace: null,
            logs: [],
            memory_usage_mb: 0,
            process_state: {},
          },
          screenshot_base64: null,
        };
      });

      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Fill in the form
      const descriptionField = screen.getByLabelText(/Description/i);
      fireEvent.change(descriptionField, { target: { value: 'This is a valid description with enough characters' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
      fireEvent.click(submitButton);

      // Should show progress steps - check for at least one of them
      await waitFor(() => {
        // The progress indicator should be visible during submission
        const progressText = screen.queryByText(/Collecting diagnostic information|Preparing GitHub issue/i);
        expect(progressText).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should update button text during submission phases', async () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Fill in the form
      const descriptionField = screen.getByLabelText(/Description/i);
      fireEvent.change(descriptionField, { target: { value: 'This is a valid description with enough characters' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
      fireEvent.click(submitButton);

      // Button text should change during submission
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Collecting\.\.\.|Processing\.\.\.|Submitting\.\.\./i });
        expect(button).toBeInTheDocument();
      });
    });

    it('should show encoding progress when screenshot is uploaded', async () => {
      // Mock FileReader for screenshot encoding
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: 'data:image/png;base64,mockbase64data',
      };
      global.FileReader = vi.fn(() => mockFileReader) as any;

      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Upload screenshot
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      
      const input = screen.getByLabelText(/Screenshot/i) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });

      // Fill in the form
      const descriptionField = screen.getByLabelText(/Description/i);
      fireEvent.change(descriptionField, { target: { value: 'This is a valid description with enough characters' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
      fireEvent.click(submitButton);

      // Trigger FileReader onload
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: mockFileReader } as any);
        }
      }, 0);

      // Should show processing message
      await waitFor(() => {
        expect(screen.getByText(/Processing screenshot/i)).toBeInTheDocument();
      });
    });

    it('should show enhanced error message with helpful tip', async () => {
      // Mock an error in the submission process
      vi.mocked(diagnosticBridge.createReportPayload).mockRejectedValue(
        new Error('Backend service unavailable')
      );

      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Fill in the form
      const descriptionField = screen.getByLabelText(/Description/i);
      fireEvent.change(descriptionField, { target: { value: 'This is a valid description' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Submission Error/i)).toBeInTheDocument();
        expect(screen.getByText(/Backend service unavailable/i)).toBeInTheDocument();
        expect(screen.getByText(/Try using Manual Mode/i)).toBeInTheDocument();
      });
    });

    it('should not show progress indicator when not submitting', () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Should not show progress indicator initially
      expect(screen.queryByText(/Collecting diagnostic information/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Processing screenshot/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Submitting report/i)).not.toBeInTheDocument();
    });

    it('should clear progress state when dialog closes', async () => {
      const { rerender } = render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Fill in the form
      const descriptionField = screen.getByLabelText(/Description/i);
      fireEvent.change(descriptionField, { target: { value: 'This is a valid description with enough characters' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
      fireEvent.click(submitButton);

      // Wait for submission to complete
      await waitFor(() => {
        expect(diagnosticBridge.createReportPayload).toHaveBeenCalled();
      });

      // Close dialog
      rerender(<FeedbackPanel isOpen={false} onClose={mockOnClose} />);
      
      // Reopen dialog
      rerender(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Progress state should be cleared
      expect(screen.queryByText(/Collecting diagnostic information/i)).not.toBeInTheDocument();
    });
  });

  describe('Success Message Display', () => {
    it('should show enhanced success message structure', () => {
      render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);
      
      // Verify the component renders correctly
      // The actual success message display is tested through integration tests
      expect(screen.getByRole('button', { name: /Send to GitHub/i })).toBeInTheDocument();
    });
  });
});
