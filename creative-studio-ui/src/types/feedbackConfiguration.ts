/**
 * Feedback configuration interface
 */
export interface FeedbackConfiguration {
  backend_proxy_url: string;
  default_mode: 'manual' | 'automatic';
  auto_collect_logs: boolean;
  max_log_lines: number;
  screenshot_max_size_mb: number;
  enable_crash_reports: boolean;
  privacy_consent_given: boolean;
}

// The feedback bridge is optional across Electron preload versions.
export interface FeedbackConfigurationAPI {
  getFeedbackConfig?: () => Promise<FeedbackConfiguration>;
  updateFeedbackConfig?: (updates: Partial<FeedbackConfiguration>) => Promise<void>;
  resetFeedbackConfig?: () => Promise<void>;
}
