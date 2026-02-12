/**
 * FeedbackPanel Component
 * 
 * Main feedback panel component for submitting bug reports, feature requests,
 * and questions to the StoryCore-Engine GitHub repository.
 * 
 * Phase 1: MVP (Manual Mode)
 * - Report type selection
 * - Description and reproduction steps input
 * - Manual Mode submission (GitHub URL generation)
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FeedbackPanelProps, FeedbackState, FormValidationErrors, ReportPayload } from './types';
import { createReportPayload } from './utils/diagnosticBridge';
import { generateGitHubUrl, formatIssueBody } from './utils/githubTemplate';
import { copyToClipboard } from './utils/clipboard';
import { submitReportAutomatic } from './utils/feedbackApi';
import { PrivacyNotice } from './PrivacyNotice';
import { 
  initializeFeedbackConfig, 
  getDefaultSubmissionMode,
  getPrivacyConsent,
  setPrivacyConsent as updatePrivacyConsent
} from './utils/feedbackConfig';

/**
 * Local storage key for submission mode preference
 */
const SUBMISSION_MODE_STORAGE_KEY = 'storycore-feedback-submission-mode';

/**
 * Load submission mode preference from configuration
 * 
 * Requirements: 1.3, 7.3
 * 
 * @returns Promise resolving to saved submission mode or 'manual' as default
 */
const loadSubmissionModePreference = async (): Promise<'manual' | 'automatic'> => {
  try {
    // First try to load from configuration
    const configMode = await getDefaultSubmissionMode();
    if (configMode === 'manual' || configMode === 'automatic') {
      return configMode;
    }
  } catch (error) {
    console.warn('Failed to load submission mode from config:', error);
  }
  
  // Fallback to local storage
  try {
    const saved = localStorage.getItem(SUBMISSION_MODE_STORAGE_KEY);
    if (saved === 'manual' || saved === 'automatic') {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to load submission mode preference from localStorage:', error);
  }
  
  return 'manual'; // Default to manual mode
};

/**
 * Save submission mode preference to local storage
 * 
 * Requirements: 1.3
 * 
 * @param mode Submission mode to save
 */
const saveSubmissionModePreference = (mode: 'manual' | 'automatic'): void => {
  try {
    localStorage.setItem(SUBMISSION_MODE_STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save submission mode preference:', error);
  }
};

/**
 * Validate form fields
 * 
 * Requirements: 2.5
 * 
 * @param state Current form state
 * @returns Validation errors object
 */
const validateForm = (state: FeedbackState): FormValidationErrors => {
  const errors: FormValidationErrors = {};

  if (!state.reportType) {
    errors.reportType = 'Please select a report type';
  }

  if (!state.description || state.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }

  return errors;
};

/**
 * FeedbackPanel Component
 * 
 * Requirements: 2.1, 2.4, 2.5
 * 
 * Provides a modal dialog for users to submit feedback, bug reports,
 * and feature requests. In Phase 1, supports Manual Mode submission
 * which opens a pre-filled GitHub issue in the browser.
 */
export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  isOpen,
  onClose,
  initialContext,
  onOpenPendingReports,
}) => {
  // Form state management (Requirements: 2.5)
  const [formState, setFormState] = useState<FeedbackState>({
    reportType: 'bug',
    description: '',
    reproductionSteps: '',
    screenshot: null,
    logConsent: false,
    submissionMode: 'manual', // Will be updated from config
    isSubmitting: false,
    error: null,
  });

  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({});
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    issueUrl: string;
    issueNumber: number;
  } | null>(null);

  // Progress tracking state (Requirements: 2.7)
  const [progressState, setProgressState] = useState<{
    phase: 'idle' | 'collecting' | 'encoding' | 'submitting' | 'complete' | 'error';
    message: string;
  }>({
    phase: 'idle',
    message: '',
  });

  // Load configuration on mount (Requirements: 7.3)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Initialize configuration
        await initializeFeedbackConfig();
        
        // Load submission mode preference
        const mode = await loadSubmissionModePreference();
        setFormState(prev => ({ ...prev, submissionMode: mode }));
        
        // Load privacy consent
        const consent = await getPrivacyConsent();
        setFormState(prev => ({ ...prev, logConsent: consent }));
      } catch (error) {
        console.warn('Failed to load feedback configuration:', error);
      }
    };
    
    loadConfig();
  }, []);

  // Initialize form with initial context if provided
  useEffect(() => {
    if (initialContext && isOpen) {
      setFormState(prev => ({
        ...prev,
        description: initialContext.errorMessage || prev.description,
        reproductionSteps: initialContext.stackTrace 
          ? `Stack trace:\n${initialContext.stackTrace}`
          : prev.reproductionSteps,
      }));
    }
  }, [initialContext, isOpen]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      const resetForm = async () => {
        const savedMode = await loadSubmissionModePreference(); // Preserve mode preference
        setFormState({
          reportType: 'bug',
          description: '',
          reproductionSteps: '',
          screenshot: null,
          logConsent: false,
          submissionMode: savedMode,
          isSubmitting: false,
          error: null,
        });
        setValidationErrors({});
        setSubmissionSuccess(null);
        setProgressState({ phase: 'idle', message: '' });
      };
      resetForm();
    }
  }, [isOpen]);

  // Handle form field changes
  const handleReportTypeChange = (value: 'bug' | 'enhancement' | 'question') => {
    setFormState(prev => ({ ...prev, reportType: value }));
    // Clear validation error for this field
    if (validationErrors.reportType) {
      setValidationErrors(prev => ({ ...prev, reportType: undefined }));
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, description: e.target.value }));
    // Clear validation error for this field
    if (validationErrors.description) {
      setValidationErrors(prev => ({ ...prev, description: undefined }));
    }
  };

  const handleReproductionStepsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, reproductionSteps: e.target.value }));
  };

  // Handle submission mode change (Requirements: 1.3)
  const handleSubmissionModeChange = (mode: 'manual' | 'automatic') => {
    setFormState(prev => ({ ...prev, submissionMode: mode }));
    saveSubmissionModePreference(mode); // Persist to local storage
  };

  // Handle log consent change (Requirements: 7.3, 7.4)
  const handleLogConsentChange = async (consent: boolean) => {
    setFormState(prev => ({ ...prev, logConsent: consent }));
    
    // Persist privacy consent to configuration
    try {
      await updatePrivacyConsent(consent);
    } catch (error) {
      console.warn('Failed to save privacy consent to config:', error);
    }
  };

  // Handle screenshot upload (Requirements: 2.4, 3.5)
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      setFormState(prev => ({ ...prev, screenshot: null }));
      setValidationErrors(prev => ({ ...prev, screenshot: undefined }));
      return;
    }

    // Validate file format (PNG, JPG, GIF)
    const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validFormats.includes(file.type)) {
      setValidationErrors(prev => ({
        ...prev,
        screenshot: 'Invalid format. Please upload PNG, JPG, or GIF files only.',
      }));
      setFormState(prev => ({ ...prev, screenshot: null }));
      return;
    }

    // Validate file size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      setValidationErrors(prev => ({
        ...prev,
        screenshot: 'File too large. Maximum size is 5MB.',
      }));
      setFormState(prev => ({ ...prev, screenshot: null }));
      return;
    }

    // Valid file - update state
    setFormState(prev => ({ ...prev, screenshot: file }));
    setValidationErrors(prev => ({ ...prev, screenshot: undefined }));
  };

  // Handle screenshot removal
  const handleRemoveScreenshot = () => {
    setFormState(prev => ({ ...prev, screenshot: null }));
    setValidationErrors(prev => ({ ...prev, screenshot: undefined }));
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate form (Requirements: 2.5)
    const errors = validateForm(formState);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear any previous errors and success messages
    setValidationErrors({});
    setSubmissionSuccess(null);
    setFormState(prev => ({ ...prev, isSubmitting: true, error: null }));
    setProgressState({ phase: 'idle', message: '' });

    try {
      // Phase 1: Collect diagnostics (Requirements: 2.7)
      setProgressState({
        phase: 'collecting',
        message: 'Collecting diagnostic information...',
      });

      const payload = await createReportPayload(
        formState.reportType,
        formState.description,
        formState.reproductionSteps,
        formState.logConsent, // Pass log consent
        initialContext?.activeModule,
        initialContext?.stackTrace
      );

      // Phase 2: Encode screenshot if provided (Requirements: 2.7, 3.5)
      if (formState.screenshot) {
        setProgressState({
          phase: 'encoding',
          message: 'Processing screenshot...',
        });

        try {
          // Convert screenshot to base64
          const base64 = await fileToBase64(formState.screenshot);
          payload.screenshot_base64 = base64;
        } catch (screenshotError) {
          console.warn('Failed to encode screenshot:', screenshotError);
          // Continue without screenshot rather than failing
          setProgressState({
            phase: 'encoding',
            message: 'Screenshot processing failed, continuing without it...',
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Phase 3: Submit based on selected mode (Requirements: 2.7)
      setProgressState({
        phase: 'submitting',
        message: formState.submissionMode === 'automatic' 
          ? 'Submitting report to GitHub...' 
          : 'Preparing GitHub issue...',
      });

      if (formState.submissionMode === 'automatic') {
        // Automatic Mode submission flow (Requirements: 1.2)
        console.log('Submitting via Automatic Mode');
        
        const result = await submitReportAutomatic(payload);
        
        if (result.success && result.issueUrl && result.issueNumber) {
          // Success - show success message with issue link (Requirements: 2.7)
          console.log('Report submitted successfully:', result.issueUrl);
          setProgressState({
            phase: 'complete',
            message: 'Report submitted successfully!',
          });
          setSubmissionSuccess({
            issueUrl: result.issueUrl,
            issueNumber: result.issueNumber,
          });
          
          // Don't close the dialog immediately - let user see the success message
          // They can close it manually or we can auto-close after a delay
        } else {
          // Backend failed - check if we should fall back to Manual Mode
          // Requirements: 1.5, 8.1
          if (result.fallbackMode === 'manual') {
            console.log('Backend unavailable, falling back to Manual Mode');
            setProgressState({
              phase: 'error',
              message: 'Backend unavailable, switching to Manual Mode...',
            });
            setFormState(prev => ({
              ...prev,
              error: `${result.error || 'Backend service unavailable'}. Falling back to Manual Mode...`,
            }));
            
            // Wait a moment to show the error, then proceed with Manual Mode
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Fall through to Manual Mode submission
            await submitManualMode(payload);
          } else {
            // Show error without fallback (Requirements: 2.7)
            throw new Error(result.error || 'Failed to submit report');
          }
        }
      } else {
        // Manual Mode submission flow (Requirements: 1.1, 1.4)
        await submitManualMode(payload);
        setProgressState({
          phase: 'complete',
          message: 'Opening GitHub in your browser...',
        });
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setProgressState({
        phase: 'error',
        message: 'Submission failed',
      });
      setFormState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to submit feedback',
      }));
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  /**
   * Submit report using Manual Mode
   * 
   * Requirements: 1.1, 1.4
   */
  const submitManualMode = async (payload: ReportPayload) => {
    console.log('Submitting via Manual Mode');
    
    // 1. Generate GitHub URL with template
    const githubUrl = generateGitHubUrl(payload);

    // 2. Copy template to clipboard
    const template = formatIssueBody(payload);
    try {
      await copyToClipboard(template);
      console.log('Template copied to clipboard');
    } catch (clipboardError) {
      console.warn('Failed to copy to clipboard:', clipboardError);
      // Continue anyway - user can still submit via GitHub
    }

    // 3. Open URL in default browser
    const electronAPI = window.electronAPI as { openExternal?: (url: string) => Promise<void> };
    if (electronAPI?.openExternal) {
      // Use Electron API to open in external browser
      await electronAPI.openExternal(githubUrl);
    } else {
      // Fallback to window.open for web environment
      window.open(githubUrl, '_blank', 'noopener,noreferrer');
    }

    // Close the dialog after successful submission
    onClose();
  };

  /**
   * Convert File to base64 string
   * 
   * Requirements: 3.5
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>
            Report a bug, request a feature, or ask a question about StoryCore-Engine.
            Your feedback helps us improve the application.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Progress Indicator (Requirements: 2.7) */}
          {formState.isSubmitting && progressState.phase !== 'idle' && (
            <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                {/* Spinner */}
                <div className="flex-shrink-0">
                  <svg
                    className="animate-spin h-5 w-5 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                
                {/* Progress Message */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    {progressState.message}
                  </p>
                  
                  {/* Progress Steps */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-800">
                    <span className={progressState.phase === 'collecting' ? 'font-semibold' : ''}>
                      {progressState.phase === 'collecting' ? '● ' : '✓ '}
                      Diagnostics
                    </span>
                    <span>→</span>
                    <span className={progressState.phase === 'encoding' ? 'font-semibold' : progressState.phase === 'collecting' ? 'opacity-50' : ''}>
                      {progressState.phase === 'encoding' ? '● ' : progressState.phase === 'submitting' || progressState.phase === 'complete' ? '✓ ' : '○ '}
                      Processing
                    </span>
                    <span>→</span>
                    <span className={progressState.phase === 'submitting' ? 'font-semibold' : progressState.phase === 'collecting' || progressState.phase === 'encoding' ? 'opacity-50' : ''}>
                      {progressState.phase === 'submitting' ? '● ' : progressState.phase === 'complete' ? '✓ ' : '○ '}
                      Submitting
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display (Requirements: 2.7) */}
          {formState.error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-900">
                    Submission Error
                  </h3>
                  <p className="mt-1 text-sm text-red-800">
                    {formState.error}
                  </p>
                  {formState.error.includes('Backend') && (
                    <p className="mt-2 text-xs text-red-800">
                      Tip: Try using Manual Mode to submit your report directly through GitHub.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Display (Requirements: 1.2, 2.7) */}
          {submissionSuccess && (
            <div className="rounded-md bg-green-50 p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-green-900">
                    Report Submitted Successfully!
                  </h3>
                  <div className="mt-2 text-sm text-green-800">
                    <p>
                      Your feedback has been submitted as GitHub issue{' '}
                      <a
                        href={submissionSuccess.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline hover:text-green-900 inline-flex items-center gap-1"
                      >
                        #{submissionSuccess.issueNumber}
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </p>
                    <p className="mt-2">
                      You can track the progress and add additional comments on GitHub.
                    </p>
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(submissionSuccess.issueUrl, '_blank')}
                      className="bg-white hover:bg-green-50 border-green-300 text-green-700"
                    >
                      View Issue on GitHub
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report Type Selection */}
          <div className="grid gap-2">
            <Label htmlFor="report-type">
              Report Type <span className="text-red-500">*</span>
            </Label>
            <Select value={formState.reportType} onValueChange={handleReportTypeChange}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="enhancement">Feature Request</SelectItem>
                <SelectItem value="question">Question</SelectItem>
              </SelectContent>
            </Select>
            {validationErrors.reportType && (
              <p className="text-xs text-red-500">{validationErrors.reportType}</p>
            )}
          </div>

          {/* Submission Mode Selection (Requirements: 1.3) */}
          <div className="grid gap-3 p-4 border rounded-md bg-slate-50 dark:bg-slate-800">
            <Label className="text-base font-semibold text-foreground">
              Submission Mode
            </Label>
            <RadioGroup
              value={formState.submissionMode}
              onValueChange={handleSubmissionModeChange}
              className="gap-3"
            >
              {/* Manual Mode Option */}
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="manual" id="mode-manual" className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor="mode-manual"
                    className="font-medium cursor-pointer text-foreground"
                  >
                    Manual Mode
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Opens a pre-filled GitHub issue in your browser. You can review and edit before submitting.
                    The issue template will be copied to your clipboard.
                  </p>
                </div>
              </div>

              {/* Automatic Mode Option */}
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="automatic" id="mode-automatic" className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor="mode-automatic"
                    className="font-medium cursor-pointer text-foreground"
                  >
                    Automatic Mode
                  </Label>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Automatically creates a GitHub issue without opening your browser.
                    Requires backend service to be available.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Description Field */}
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-foreground">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the issue, feature request, or question..."
              className="min-h-[100px] text-foreground bg-background"
              value={formState.description}
              onChange={handleDescriptionChange}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Minimum 10 characters required
            </p>
            {validationErrors.description && (
              <p className="text-xs text-red-500">{validationErrors.description}</p>
            )}
          </div>

          {/* Reproduction Steps Field */}
          <div className="grid gap-2">
            <Label htmlFor="reproduction-steps" className="text-foreground">
              Reproduction Steps (Optional)
            </Label>
            <Textarea
              id="reproduction-steps"
              placeholder="Steps to reproduce the issue (if applicable)..."
              className="min-h-[80px] text-foreground bg-background"
              value={formState.reproductionSteps}
              onChange={handleReproductionStepsChange}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Help us understand how to reproduce the issue
            </p>
          </div>

          {/* Screenshot Upload Field */}
          <div className="grid gap-2">
            <Label htmlFor="screenshot">
              Screenshot (Optional)
            </Label>
            
            {!formState.screenshot ? (
              <div className="flex flex-col gap-2">
                <input
                  id="screenshot"
                  type="file"
                  title="Upload screenshot"
                  accept="image/png,image/jpeg,image/jpg,image/gif"
                  onChange={handleScreenshotChange}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    file:cursor-pointer cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or GIF (max 5MB)
                </p>
              </div>
            ) : (
              <div className="border rounded-md p-3 bg-slate-50 dark:bg-slate-800">
                {/* Screenshot Preview */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <img
                      src={URL.createObjectURL(formState.screenshot)}
                      alt="Screenshot preview"
                      className="w-24 h-24 object-cover rounded border"
                    />
                  </div>
                  
                  {/* File Information */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {formState.screenshot.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatFileSize(formState.screenshot.size)}</span>
                      <span>•</span>
                      <span className="uppercase">
                        {formState.screenshot.type.split('/')[1]}
                      </span>
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveScreenshot}
                    className="flex-shrink-0"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
            
            {validationErrors.screenshot && (
              <p className="text-xs text-red-500">{validationErrors.screenshot}</p>
            )}
          </div>

          {/* Privacy Notice and Log Consent */}
          <PrivacyNotice
            logConsent={formState.logConsent}
            onConsentChange={handleLogConsentChange}
            className="pt-2"
          />
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            {/* Left side: Link to pending reports */}
            {onOpenPendingReports && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPendingReports();
                }}
                className="text-sm text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline"
              >
                View pending reports
              </button>
            )}
            
            {/* Right side: Action buttons */}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={onClose} disabled={formState.isSubmitting}>
                {submissionSuccess ? 'Close' : 'Cancel'}
              </Button>
              {!submissionSuccess && (
                <Button 
                  type="submit" 
                  onClick={handleSubmit}
                  disabled={formState.isSubmitting}
                >
              {formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {progressState.phase === 'collecting' && 'Collecting...'}
                  {progressState.phase === 'encoding' && 'Processing...'}
                  {progressState.phase === 'submitting' && 'Submitting...'}
                  {progressState.phase === 'complete' && 'Complete'}
                  {progressState.phase === 'error' && 'Error'}
                  {progressState.phase === 'idle' && 'Submitting...'}
                </span>
              ) : (
                'Send to GitHub'
              )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
