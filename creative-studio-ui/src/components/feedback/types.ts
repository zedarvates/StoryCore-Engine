/**
 * TypeScript interfaces for Feedback & Diagnostics Module
 */

/**
 * Report payload structure matching the Python backend schema
 */
export interface ReportPayload {
  schema_version: string;
  report_type: 'bug' | 'enhancement' | 'question';
  timestamp: string;
  system_info: SystemInfo;
  module_context: ModuleContext;
  user_input: UserInput;
  diagnostics: Diagnostics;
  screenshot_base64: string | null;
}

/**
 * System information collected from the user's environment
 */
export interface SystemInfo {
  storycore_version: string;
  python_version: string;
  os_platform: string;
  os_version: string;
  language: string;
}

/**
 * Module context information
 */
export interface ModuleContext {
  active_module: string;
  module_state: Record<string, any>;
}

/**
 * User-provided input for the report
 */
export interface UserInput {
  description: string;
  reproduction_steps: string;
}

/**
 * Diagnostic information collected automatically
 */
export interface Diagnostics {
  stacktrace: string | null;
  logs: string[];
  memory_usage_mb: number;
  process_state: Record<string, any>;
}

/**
 * Feedback panel component state
 */
export interface FeedbackState {
  reportType: 'bug' | 'enhancement' | 'question';
  description: string;
  reproductionSteps: string;
  screenshot: File | null;
  logConsent: boolean;
  submissionMode: 'manual' | 'automatic';
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Initial context that can be passed to the feedback panel
 */
export interface FeedbackInitialContext {
  errorMessage?: string;
  stackTrace?: string;
  activeModule?: string;
}

/**
 * Props for the FeedbackPanel component
 */
export interface FeedbackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: FeedbackInitialContext;
  onOpenPendingReports?: () => void;
}

/**
 * Form validation errors
 */
export interface FormValidationErrors {
  reportType?: string;
  description?: string;
  reproductionSteps?: string;
  screenshot?: string;
}

/**
 * Submission result
 */
export interface SubmissionResult {
  success: boolean;
  issueUrl?: string;
  issueNumber?: number;
  error?: string;
  fallbackMode?: 'manual';
}

/**
 * Pending report metadata from local storage
 */
export interface PendingReport {
  report_id: string;
  filename: string;
  filepath: string;
  timestamp: string;
  size_bytes: number;
}

/**
 * Retry status for a pending report
 */
export interface RetryStatus {
  report_id: string;
  status: 'idle' | 'retrying' | 'success' | 'error';
  error?: string;
}

/**
 * Props for the PendingReportsList component
 */
export interface PendingReportsListProps {
  isOpen: boolean;
  onClose: () => void;
}
