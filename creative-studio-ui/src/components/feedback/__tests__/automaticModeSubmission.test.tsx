/**
 * Integration tests for Automatic Mode submission flow
 * 
 * Requirements: 1.2, 1.5, 8.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackPanel } from '../FeedbackPanel';
import * as feedbackApi from '../utils/feedbackApi';
import * as diagnosticBridge from '../utils/diagnosticBridge';

// Mock the API and diagnostic bridge
vi.mock('../utils/feedbackApi');
vi.mock('../utils/diagnosticBridge');

describe('FeedbackPanel - Automatic Mode Submission', () => {
  const mockOnClose = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock diagnostic collection
    vi.mocked(diagnosticBridge.createReportPayload).mockResolvedValue({
      schema_version: '1.0',
      report_type: 'bug',
      timestamp: '2026-01-01T00:00:00.000Z',
      system_info: {
        storycore_version: '0.1.0',
        python_version: '3.9.0',
        os_platform: 'darwin',
        os_version: '10.15.7',
        language: 'en-US',
      },
      module_context: {
        active_module: 'test-module',
        module_state: {},
      },
      user_input: {
        description: 'Test bug description',
        reproduction_steps: 'Test steps',
      },
      diagnostics: {
        stacktrace: null,
        logs: [],
        memory_usage_mb: 100,
        process_state: {},
      },
      screenshot_base64: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should submit report via Automatic Mode successfully', async () => {
    // Mock successful API response
    vi.mocked(feedbackApi.submitReportAutomatic).mockResolvedValue({
      success: true,
      issueUrl: 'https://github.com/zedarvates/StoryCore-Engine/issues/123',
      issueNumber: 123,
    });

    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);

    // Select Automatic Mode
    const automaticModeRadio = screen.getByLabelText(/Automatic Mode/i);
    fireEvent.click(automaticModeRadio);

    // Fill in required fields
    const descriptionField = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionField, {
      target: { value: 'This is a test bug report with enough characters' },
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
    fireEvent.click(submitButton);

    // Wait for submission to complete
    await waitFor(() => {
      expect(feedbackApi.submitReportAutomatic).toHaveBeenCalledTimes(1);
    });

    // Verify success message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Report submitted successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/#123/i)).toBeInTheDocument();
    });

    // Verify the issue link is present
    const issueLink = screen.getByRole('link', { name: /#123/i });
    expect(issueLink).toHaveAttribute(
      'href',
      'https://github.com/zedarvates/StoryCore-Engine/issues/123'
    );
  });

  it('should display submission progress indicator', async () => {
    // Mock a delayed API response
    vi.mocked(feedbackApi.submitReportAutomatic).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                issueUrl: 'https://github.com/zedarvates/StoryCore-Engine/issues/123',
                issueNumber: 123,
              }),
            100
          )
        )
    );

    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);

    // Select Automatic Mode
    const automaticModeRadio = screen.getByLabelText(/Automatic Mode/i);
    fireEvent.click(automaticModeRadio);

    // Fill in required fields
    const descriptionField = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionField, {
      target: { value: 'This is a test bug report with enough characters' },
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
    fireEvent.click(submitButton);

    // Verify progress indicator is shown (look for the button text change)
    await waitFor(() => {
      const submittingButton = screen.getByRole('button', { name: /Submitting.../i });
      expect(submittingButton).toBeInTheDocument();
    });

    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText(/Report submitted successfully!/i)).toBeInTheDocument();
    });
  });

  it('should fall back to Manual Mode when backend is unavailable', async () => {
    // Mock backend unavailable response
    vi.mocked(feedbackApi.submitReportAutomatic).mockResolvedValue({
      success: false,
      error: 'Backend service unavailable: Network error',
      fallbackMode: 'manual',
    });

    // Mock window.open to prevent actual navigation
    const mockWindowOpen = vi.fn();
    global.window.open = mockWindowOpen;

    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);

    // Select Automatic Mode
    const automaticModeRadio = screen.getByLabelText(/Automatic Mode/i);
    fireEvent.click(automaticModeRadio);

    // Fill in required fields
    const descriptionField = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionField, {
      target: { value: 'This is a test bug report with enough characters' },
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
    fireEvent.click(submitButton);

    // Wait for fallback message
    await waitFor(() => {
      expect(
        screen.getByText(/Backend service unavailable.*Falling back to Manual Mode/i)
      ).toBeInTheDocument();
    });

    // Wait for Manual Mode to be triggered
    await waitFor(
      () => {
        expect(mockWindowOpen).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    // Verify dialog was closed after Manual Mode submission
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should display error message when submission fails without fallback', async () => {
    // Mock API error without fallback
    vi.mocked(feedbackApi.submitReportAutomatic).mockResolvedValue({
      success: false,
      error: 'Invalid payload: Description too short',
    });

    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);

    // Select Automatic Mode
    const automaticModeRadio = screen.getByLabelText(/Automatic Mode/i);
    fireEvent.click(automaticModeRadio);

    // Fill in required fields
    const descriptionField = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionField, {
      target: { value: 'This is a test bug report with enough characters' },
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
    fireEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(
        screen.getByText(/Invalid payload: Description too short/i)
      ).toBeInTheDocument();
    });

    // Verify dialog was not closed
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should include screenshot in payload when uploaded', async () => {
    // Mock URL.createObjectURL for the test environment
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    
    // Mock successful API response
    vi.mocked(feedbackApi.submitReportAutomatic).mockResolvedValue({
      success: true,
      issueUrl: 'https://github.com/zedarvates/StoryCore-Engine/issues/123',
      issueNumber: 123,
    });

    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);

    // Select Automatic Mode
    const automaticModeRadio = screen.getByLabelText(/Automatic Mode/i);
    fireEvent.click(automaticModeRadio);

    // Fill in required fields
    const descriptionField = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionField, {
      target: { value: 'This is a test bug report with enough characters' },
    });

    // Upload a screenshot
    const file = new File(['test'], 'screenshot.png', { type: 'image/png' });
    const screenshotInput = screen.getByLabelText(/Screenshot/i);
    fireEvent.change(screenshotInput, { target: { files: [file] } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
    fireEvent.click(submitButton);

    // Wait for submission to complete
    await waitFor(() => {
      expect(feedbackApi.submitReportAutomatic).toHaveBeenCalledTimes(1);
    });

    // Verify the payload includes screenshot_base64
    const callArgs = vi.mocked(feedbackApi.submitReportAutomatic).mock.calls[0][0];
    expect(callArgs.screenshot_base64).toBeTruthy();
  });

  it('should respect log consent setting', async () => {
    // Mock successful API response
    vi.mocked(feedbackApi.submitReportAutomatic).mockResolvedValue({
      success: true,
      issueUrl: 'https://github.com/zedarvates/StoryCore-Engine/issues/123',
      issueNumber: 123,
    });

    render(<FeedbackPanel isOpen={true} onClose={mockOnClose} />);

    // Select Automatic Mode
    const automaticModeRadio = screen.getByLabelText(/Automatic Mode/i);
    fireEvent.click(automaticModeRadio);

    // Fill in required fields
    const descriptionField = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionField, {
      target: { value: 'This is a test bug report with enough characters' },
    });

    // Enable log consent - use the correct label text
    const logConsentCheckbox = screen.getByRole('checkbox', {
      name: /Include application logs in my report/i,
    });
    fireEvent.click(logConsentCheckbox);

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Send to GitHub/i });
    fireEvent.click(submitButton);

    // Wait for submission to complete
    await waitFor(() => {
      expect(diagnosticBridge.createReportPayload).toHaveBeenCalledWith(
        'bug',
        'This is a test bug report with enough characters',
        '',
        true, // logConsent should be true
        undefined,
        undefined
      );
    });
  });
});
