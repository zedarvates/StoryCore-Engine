/**
 * Feedback Configuration Utility
 * 
 * Provides access to feedback system configuration settings.
 * Loads configuration from Python backend on initialization.
 * 
 * Requirements: 7.3
 */

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

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: FeedbackConfiguration = {
  backend_proxy_url: 'http://localhost:3000',
  default_mode: 'manual',
  auto_collect_logs: true,
  max_log_lines: 500,
  screenshot_max_size_mb: 5,
  enable_crash_reports: true,
  privacy_consent_given: false,
};

/**
 * Global configuration instance
 */
let globalConfig: FeedbackConfiguration | null = null;

/**
 * Load configuration from Python backend
 * 
 * Requirements: 7.3
 * 
 * @returns Promise resolving to configuration object
 */
async function loadConfigFromBackend(): Promise<FeedbackConfiguration> {
  try {
    // Check if we're in Electron environment with Python bridge
    if (window.electronAPI?.getFeedbackConfig) {
      const config = await window.electronAPI.getFeedbackConfig();
      console.log('Loaded feedback configuration from backend:', config);
      return config;
    }
    
    // Fallback: Try to load from environment variables (Vite)
    const envConfig: Partial<FeedbackConfiguration> = {};
    
    if (import.meta.env.VITE_BACKEND_URL) {
      envConfig.backend_proxy_url = import.meta.env.VITE_BACKEND_URL;
    }
    
    if (import.meta.env.VITE_FEEDBACK_DEFAULT_MODE) {
      const mode = import.meta.env.VITE_FEEDBACK_DEFAULT_MODE;
      if (mode === 'manual' || mode === 'automatic') {
        envConfig.default_mode = mode;
      }
    }
    
    // Merge with defaults
    const config = { ...DEFAULT_CONFIG, ...envConfig };
    console.log('Using environment-based feedback configuration:', config);
    return config;
  } catch (error) {
    console.warn('Failed to load feedback configuration, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Initialize feedback configuration
 * 
 * Should be called at application startup.
 * 
 * Requirements: 7.3
 * 
 * @returns Promise resolving to initialized configuration
 */
export async function initializeFeedbackConfig(): Promise<FeedbackConfiguration> {
  if (globalConfig === null) {
    globalConfig = await loadConfigFromBackend();
  }
  return globalConfig;
}

/**
 * Get current feedback configuration
 * 
 * Returns cached configuration if already loaded,
 * otherwise loads from backend.
 * 
 * Requirements: 7.3
 * 
 * @returns Promise resolving to configuration object
 */
export async function getFeedbackConfig(): Promise<FeedbackConfiguration> {
  if (globalConfig === null) {
    globalConfig = await loadConfigFromBackend();
  }
  return globalConfig;
}

/**
 * Update feedback configuration
 * 
 * Updates both in-memory cache and persists to backend.
 * 
 * Requirements: 7.3
 * 
 * @param updates Partial configuration updates
 * @returns Promise resolving when update is complete
 */
export async function updateFeedbackConfig(
  updates: Partial<FeedbackConfiguration>
): Promise<void> {
  try {
    // Update in-memory cache
    if (globalConfig === null) {
      globalConfig = await loadConfigFromBackend();
    }
    globalConfig = { ...globalConfig, ...updates };
    
    // Persist to backend if available
    if (window.electronAPI?.updateFeedbackConfig) {
      await window.electronAPI.updateFeedbackConfig(updates);
      console.log('Updated feedback configuration in backend:', updates);
    } else {
      console.warn('Backend not available, configuration update not persisted');
    }
  } catch (error) {
    console.error('Failed to update feedback configuration:', error);
    throw error;
  }
}

/**
 * Get a specific configuration value
 * 
 * @param key Configuration key
 * @returns Promise resolving to configuration value
 */
export async function getConfigValue<K extends keyof FeedbackConfiguration>(
  key: K
): Promise<FeedbackConfiguration[K]> {
  const config = await getFeedbackConfig();
  return config[key];
}

/**
 * Set a specific configuration value
 * 
 * @param key Configuration key
 * @param value Configuration value
 * @returns Promise resolving when update is complete
 */
export async function setConfigValue<K extends keyof FeedbackConfiguration>(
  key: K,
  value: FeedbackConfiguration[K]
): Promise<void> {
  await updateFeedbackConfig({ [key]: value } as Partial<FeedbackConfiguration>);
}

/**
 * Reset configuration to defaults
 * 
 * @returns Promise resolving when reset is complete
 */
export async function resetFeedbackConfig(): Promise<void> {
  try {
    // Reset in-memory cache
    globalConfig = { ...DEFAULT_CONFIG };
    
    // Reset in backend if available
    if (window.electronAPI?.resetFeedbackConfig) {
      await window.electronAPI.resetFeedbackConfig();
      console.log('Reset feedback configuration to defaults');
    }
  } catch (error) {
    console.error('Failed to reset feedback configuration:', error);
    throw error;
  }
}

/**
 * Get backend proxy URL from configuration
 * 
 * @returns Promise resolving to backend URL
 */
export async function getBackendProxyUrl(): Promise<string> {
  return getConfigValue('backend_proxy_url');
}

/**
 * Get default submission mode from configuration
 * 
 * @returns Promise resolving to default mode
 */
export async function getDefaultSubmissionMode(): Promise<'manual' | 'automatic'> {
  return getConfigValue('default_mode');
}

/**
 * Get auto-collect logs preference from configuration
 * 
 * @returns Promise resolving to auto-collect logs preference
 */
export async function getAutoCollectLogs(): Promise<boolean> {
  return getConfigValue('auto_collect_logs');
}

/**
 * Get maximum log lines from configuration
 * 
 * @returns Promise resolving to max log lines
 */
export async function getMaxLogLines(): Promise<number> {
  return getConfigValue('max_log_lines');
}

/**
 * Get screenshot max size from configuration
 * 
 * @returns Promise resolving to max size in MB
 */
export async function getScreenshotMaxSize(): Promise<number> {
  return getConfigValue('screenshot_max_size_mb');
}

/**
 * Get crash reports enabled status from configuration
 * 
 * @returns Promise resolving to crash reports enabled status
 */
export async function getCrashReportsEnabled(): Promise<boolean> {
  return getConfigValue('enable_crash_reports');
}

/**
 * Get privacy consent status from configuration
 * 
 * @returns Promise resolving to privacy consent status
 */
export async function getPrivacyConsent(): Promise<boolean> {
  return getConfigValue('privacy_consent_given');
}

/**
 * Set privacy consent status in configuration
 * 
 * @param consent Privacy consent status
 * @returns Promise resolving when update is complete
 */
export async function setPrivacyConsent(consent: boolean): Promise<void> {
  await setConfigValue('privacy_consent_given', consent);
}
