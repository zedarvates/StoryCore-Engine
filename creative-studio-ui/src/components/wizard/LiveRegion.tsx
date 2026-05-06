import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Live Region Component for Screen Reader Announcements
// ============================================================================

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  clearAfter?: number; // milliseconds
  className?: string;
}

/**
 * Live Region component for announcing dynamic content to screen readers
 * 
 * Usage:
 * - Use 'polite' for non-urgent updates (default)
 * - Use 'assertive' for important/urgent updates
 * - Use 'off' to disable announcements
 * 
 * @param message - The message to announce
 * @param politeness - The ARIA live politeness level
 * @param clearAfter - Optional delay before clearing the message (in ms)
 * @param className - Optional CSS classes
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  clearAfter,
  className,
}: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState(message);

  // Sync state if message prop changes
  const [prevMessage, setPrevMessage] = useState(message);
  if (prevMessage !== message) {
    setPrevMessage(message);
    setCurrentMessage(message);
  }

  useEffect(() => {
    if (clearAfter && currentMessage) {
      const timer = setTimeout(() => {
        setCurrentMessage('');
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [clearAfter, currentMessage]);

  if (politeness === 'off') {
    return (
      <div className={cn('sr-only', className)} aria-live="off">
        {currentMessage}
      </div>
    );
  }

  if (politeness === 'assertive') {
    return (
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className={cn('sr-only', className)}
      >
        {currentMessage}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn('sr-only', className)}
    >
      {currentMessage}
    </div>
  );
}

// ============================================================================
// Alert Live Region Component
// ============================================================================

interface AlertLiveRegionProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  clearAfter?: number;
  className?: string;
}

/**
 * Alert Live Region component for important announcements
 * Uses assertive politeness for immediate screen reader attention
 * 
 * @param message - The alert message to announce
 * @param type - The type of alert (affects semantics)
 * @param clearAfter - Optional delay before clearing the message (in ms)
 * @param className - Optional CSS classes
 */
export function AlertLiveRegion({
  message,
  type = 'info',
  clearAfter,
  className,
}: AlertLiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState(message);

  // Sync state if message prop changes
  const [prevMessage, setPrevMessage] = useState(message);
  if (prevMessage !== message) {
    setPrevMessage(message);
    setCurrentMessage(message);
  }

  useEffect(() => {
    if (clearAfter && currentMessage) {
      const timer = setTimeout(() => {
        setCurrentMessage('');
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [clearAfter, currentMessage]);

  if (type === 'warning' || type === 'error') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={cn('sr-only', className)}
      >
        {currentMessage}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className={cn('sr-only', className)}
    >
      {currentMessage}
    </div>
  );
}

// ============================================================================
// Loading Announcement Component
// ============================================================================

interface LoadingAnnouncementProps {
  isLoading: boolean;
  loadingMessage?: string;
  completeMessage?: string;
  className?: string;
}

/**
 * Loading Announcement component for async operations
 * Announces when loading starts and completes
 * 
 * @param isLoading - Whether the operation is currently loading
 * @param loadingMessage - Message to announce when loading starts
 * @param completeMessage - Message to announce when loading completes
 * @param className - Optional CSS classes
 */
export function LoadingAnnouncement({
  isLoading,
  loadingMessage = 'Loading...',
  completeMessage = 'Loading complete',
  className,
}: LoadingAnnouncementProps) {
  const [message, setMessage] = useState('');

  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);
  if (prevIsLoading !== isLoading) {
    setPrevIsLoading(isLoading);
    setMessage(isLoading ? loadingMessage : completeMessage);
  }

  useEffect(() => {
    if (!isLoading && message === completeMessage) {
      // Clear the completion message after a delay
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, completeMessage, message]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  );
}

// ============================================================================
// Step Change Announcement Component
// ============================================================================

interface StepChangeAnnouncementProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  className?: string;
}

/**
 * Step Change Announcement component for wizard navigation
 * Announces when the user navigates to a new step
 * 
 * @param currentStep - The current step number
 * @param totalSteps - The total number of steps
 * @param stepTitle - The title of the current step
 * @param className - Optional CSS classes
 */
export function StepChangeAnnouncement({
  currentStep,
  totalSteps,
  stepTitle,
  className,
}: StepChangeAnnouncementProps) {
  const [message, setMessage] = useState('');

  const announcement = `Step ${currentStep} of ${totalSteps}: ${stepTitle}`;
  const [prevAnnouncement, setPrevAnnouncement] = useState('');
  if (prevAnnouncement !== announcement) {
    setPrevAnnouncement(announcement);
    setMessage(announcement);
  }

  useEffect(() => {

    // Clear after announcement
    const timer = setTimeout(() => {
      setMessage('');
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentStep, totalSteps, stepTitle]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  );
}
