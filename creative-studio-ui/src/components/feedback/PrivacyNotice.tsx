/**
 * PrivacyNotice Component
 * 
 * Displays privacy notice explaining data collection and provides
 * a checkbox for users to consent to log collection.
 * 
 * Phase 2: Advanced Diagnostics
 * Requirements: 7.3, 7.4
 */

import React, { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

/**
 * Local storage key for consent preference
 */
const CONSENT_STORAGE_KEY = 'storycore-feedback-log-consent';

/**
 * Props for PrivacyNotice component
 */
export interface PrivacyNoticeProps {
  /**
   * Current consent state
   */
  logConsent: boolean;
  
  /**
   * Callback when consent state changes
   */
  onConsentChange: (consent: boolean) => void;
  
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Load consent preference from local storage
 * 
 * Requirements: 7.4
 * 
 * @returns Stored consent preference or false if not set
 */
export const loadConsentPreference = (): boolean => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Failed to load consent preference from local storage:', error);
    return false;
  }
};

/**
 * Save consent preference to local storage
 * 
 * Requirements: 7.4
 * 
 * @param consent Consent preference to save
 */
export const saveConsentPreference = (consent: boolean): void => {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, consent.toString());
  } catch (error) {
    console.error('Failed to save consent preference to local storage:', error);
  }
};

/**
 * PrivacyNotice Component
 * 
 * Requirements: 7.3, 7.4
 * 
 * Displays a privacy notice explaining what data will be collected and shared
 * when submitting feedback. Provides a checkbox for users to explicitly consent
 * to log collection. Persists the consent preference in local storage.
 */
export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({
  logConsent,
  onConsentChange,
  className = '',
}) => {
  const [isInitialized, setIsInitialized] = useState(false);

  // Load consent preference from local storage on mount
  useEffect(() => {
    if (!isInitialized) {
      const storedConsent = loadConsentPreference();
      if (storedConsent !== logConsent) {
        onConsentChange(storedConsent);
      }
      setIsInitialized(true);
    }
  }, [isInitialized, logConsent, onConsentChange]);

  // Handle consent checkbox change
  const handleConsentChange = (checked: boolean) => {
    onConsentChange(checked);
    saveConsentPreference(checked);
  };

  return (
    <div className={`grid gap-3 ${className}`}>
      {/* Privacy Notice Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-slate-700">
          <strong className="font-semibold">Privacy Notice:</strong> When you submit feedback, 
          we collect the following information to help us diagnose and fix issues:
          
          <ul className="mt-2 ml-4 space-y-1 list-disc text-xs">
            <li>
              <strong>System Information:</strong> StoryCore version, Python version, 
              operating system, and language settings
            </li>
            <li>
              <strong>Module Context:</strong> Active module name and current state
            </li>
            <li>
              <strong>Your Description:</strong> The text you provide in the form
            </li>
            <li>
              <strong>Screenshot:</strong> Any image you choose to upload (optional)
            </li>
            <li>
              <strong>Error Information:</strong> Stack traces for error reports
            </li>
          </ul>
          
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            All data is sent to our public GitHub repository and will be visible 
            to anyone. Sensitive information (file paths, usernames, API keys) 
            is automatically removed before submission.
          </p>
        </AlertDescription>
      </Alert>

      {/* Log Consent Checkbox */}
      <div className="flex items-start space-x-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
        <Checkbox
          id="log-consent"
          checked={logConsent}
          onCheckedChange={handleConsentChange}
          className="mt-0.5"
        />
        <div className="flex-1">
          <Label
            htmlFor="log-consent"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground"
          >
            Include application logs in my report
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            {logConsent ? (
              <>
                <strong className="text-green-800 dark:text-green-400">Enabled:</strong> The last 500 lines 
                of application logs will be included (with sensitive data removed). 
                This helps developers diagnose issues faster.
              </>
            ) : (
              <>
                <strong className="text-amber-800 dark:text-amber-400">Disabled:</strong> No logs will be 
                included. This may make it harder to diagnose your issue, but protects 
                your privacy.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Additional Privacy Information */}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        By submitting feedback, you acknowledge that your report will be publicly 
        visible on GitHub. You can review the complete report before submission 
        in Manual Mode.
      </p>
    </div>
  );
};
