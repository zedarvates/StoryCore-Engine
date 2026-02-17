/**
 * Wizard Session Preservation Module
 * 
 * Provides session preservation functionality for wizard workflows,
 * allowing users to resume interrupted sessions with preserved form data.
 * 
 * Requirements: 13.5, 13.6
 */

import { getLogger } from './logger';
import type { WizardType } from './types';

/**
 * Preserved session data
 */
export interface PreservedSession {
  wizardId: string;
  wizardType: WizardType;
  currentStep: number;
  totalSteps: number;
  formData: Record<string, unknown>;
  timestamp: string;
  expiresAt: string;
}

/**
 * Session preservation configuration
 */
export interface SessionPreservationConfig {
  expirationHours: number;
  storageKey: string;
  autoSave: boolean;
  autoSaveIntervalMs: number;
}

/**
 * Default session preservation configuration
 */
const DEFAULT_CONFIG: SessionPreservationConfig = {
  expirationHours: 24,
  storageKey: 'wizard_sessions',
  autoSave: true,
  autoSaveIntervalMs: 30000, // 30 seconds
};

/**
 * Session preservation manager
 * Manages wizard session state persistence and restoration
 * 
 * Requirements: 13.5, 13.6
 */
export class SessionPreservationManager {
  private logger = getLogger();
  private config: SessionPreservationConfig;
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<SessionPreservationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Save wizard session to localStorage
   * 
   * @param wizardId - Unique wizard identifier
   * @param wizardType - Type of wizard
   * @param currentStep - Current step number
   * @param totalSteps - Total number of steps
   * @param formData - Form data to preserve
   * 
   * Requirements: 13.5
   */
  saveSession(
    wizardId: string,
    wizardType: WizardType,
    currentStep: number,
    totalSteps: number,
    formData: Record<string, unknown>
  ): void {
    try {
      const timestamp = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + this.config.expirationHours * 60 * 60 * 1000
      ).toISOString();

      const session: PreservedSession = {
        wizardId,
        wizardType,
        currentStep,
        totalSteps,
        formData: this.sanitizeFormData(formData),
        timestamp,
        expiresAt,
      };

      // Get existing sessions
      const sessions = this.getAllSessions();

      // Update or add session
      const existingIndex = sessions.findIndex((s) => s.wizardId === wizardId);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      // Save to localStorage
      localStorage.setItem(this.config.storageKey, JSON.stringify(sessions));

      this.logger.info('session', 'Wizard session saved', {
        wizardId,
        wizardType,
        currentStep,
        expiresAt,
      });
    } catch (error) {
      this.logger.error('session', 'Failed to save wizard session', error as Error, {
        wizardId,
        wizardType,
      });
    }
  }

  /**
   * Load wizard session from localStorage
   * 
   * @param wizardId - Wizard identifier
   * @returns Preserved session or undefined if not found or expired
   * 
   * Requirements: 13.5, 13.6
   */
  loadSession(wizardId: string): PreservedSession | undefined {
    try {
      const sessions = this.getAllSessions();
      const session = sessions.find((s) => s.wizardId === wizardId);

      if (!session) {
        this.logger.debug('session', 'No preserved session found', { wizardId });
        return undefined;
      }

      // Check if session has expired
      const expiresAt = new Date(session.expiresAt);
      const now = new Date();

      if (now > expiresAt) {
        this.logger.info('session', 'Preserved session has expired', {
          wizardId,
          expiresAt: session.expiresAt,
        });

        // Remove expired session
        this.deleteSession(wizardId);
        return undefined;
      }

      this.logger.info('session', 'Wizard session loaded', {
        wizardId,
        wizardType: session.wizardType,
        currentStep: session.currentStep,
        age: now.getTime() - new Date(session.timestamp).getTime(),
      });

      return session;
    } catch (error) {
      this.logger.error('session', 'Failed to load wizard session', error as Error, {
        wizardId,
      });
      return undefined;
    }
  }

  /**
   * Delete wizard session
   * 
   * @param wizardId - Wizard identifier
   */
  deleteSession(wizardId: string): void {
    try {
      const sessions = this.getAllSessions();
      const filtered = sessions.filter((s) => s.wizardId !== wizardId);

      localStorage.setItem(this.config.storageKey, JSON.stringify(filtered));

      // Clear auto-save timer if exists
      this.stopAutoSave(wizardId);

      this.logger.info('session', 'Wizard session deleted', { wizardId });
    } catch (error) {
      this.logger.error('session', 'Failed to delete wizard session', error as Error, {
        wizardId,
      });
    }
  }

  /**
   * Get all preserved sessions
   * 
   * @returns Array of preserved sessions
   */
  getAllSessions(): PreservedSession[] {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        return [];
      }

      const sessions: PreservedSession[] = JSON.parse(stored);
      return sessions;
    } catch (error) {
      this.logger.error('session', 'Failed to get all sessions', error as Error);
      return [];
    }
  }

  /**
   * Get sessions by wizard type
   * 
   * @param wizardType - Type of wizard
   * @returns Array of preserved sessions for the wizard type
   */
  getSessionsByType(wizardType: WizardType): PreservedSession[] {
    const sessions = this.getAllSessions();
    return sessions.filter((s) => s.wizardType === wizardType);
  }

  /**
   * Check if a session exists and is valid
   * 
   * @param wizardId - Wizard identifier
   * @returns True if session exists and is not expired
   */
  hasValidSession(wizardId: string): boolean {
    const session = this.loadSession(wizardId);
    return session !== undefined;
  }

  /**
   * Clean up expired sessions
   * Removes all sessions that have passed their expiration time
   * 
   * @returns Number of sessions removed
   */
  cleanupExpiredSessions(): number {
    try {
      const sessions = this.getAllSessions();
      const now = new Date();

      const validSessions = sessions.filter((session) => {
        const expiresAt = new Date(session.expiresAt);
        return now <= expiresAt;
      });

      const removedCount = sessions.length - validSessions.length;

      if (removedCount > 0) {
        localStorage.setItem(this.config.storageKey, JSON.stringify(validSessions));

        this.logger.info('session', 'Expired sessions cleaned up', {
          removedCount,
          remainingCount: validSessions.length,
        });
      }

      return removedCount;
    } catch (error) {
      this.logger.error('session', 'Failed to cleanup expired sessions', error as Error);
      return 0;
    }
  }

  /**
   * Start auto-save for a wizard session
   * 
   * @param wizardId - Wizard identifier
   * @param wizardType - Type of wizard
   * @param getSessionData - Function to get current session data
   * 
   * Requirements: 13.5
   */
  startAutoSave(
    wizardId: string,
    wizardType: WizardType,
    getSessionData: () => {
      currentStep: number;
      totalSteps: number;
      formData: Record<string, unknown>;
    }
  ): void {
    if (!this.config.autoSave) {
      return;
    }

    // Clear existing timer if any
    this.stopAutoSave(wizardId);

    const timer = setInterval(() => {
      try {
        const data = getSessionData();
        this.saveSession(
          wizardId,
          wizardType,
          data.currentStep,
          data.totalSteps,
          data.formData
        );

        this.logger.debug('session', 'Auto-save completed', { wizardId });
      } catch (error) {
        this.logger.error('session', 'Auto-save failed', error as Error, { wizardId });
      }
    }, this.config.autoSaveIntervalMs);

    this.autoSaveTimers.set(wizardId, timer);

    this.logger.info('session', 'Auto-save started', {
      wizardId,
      intervalMs: this.config.autoSaveIntervalMs,
    });
  }

  /**
   * Stop auto-save for a wizard session
   * 
   * @param wizardId - Wizard identifier
   */
  stopAutoSave(wizardId: string): void {
    const timer = this.autoSaveTimers.get(wizardId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(wizardId);

      this.logger.info('session', 'Auto-save stopped', { wizardId });
    }
  }

  /**
   * Stop all auto-save timers
   */
  stopAllAutoSave(): void {
    this.autoSaveTimers.forEach((timer, wizardId) => {
      clearInterval(timer);
      this.logger.debug('session', 'Auto-save stopped', { wizardId });
    });

    this.autoSaveTimers.clear();
    this.logger.info('session', 'All auto-save timers stopped');
  }

  /**
   * Sanitize form data before saving
   * Removes sensitive data and non-serializable values
   * 
   * @param formData - Raw form data
   * @returns Sanitized form data
   */
  private sanitizeFormData(formData: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(formData)) {
      // Skip functions and undefined values
      if (typeof value === 'function' || value === undefined) {
        continue;
      }

      // Skip File objects (can't be serialized)
      if (value instanceof File) {
        sanitized[key] = {
          _type: 'File',
          name: value.name,
          size: value.size,
          type: value.type,
        };
        continue;
      }

      // Handle arrays
      if (Array.isArray(value)) {
        sanitized[key] = value.map((item) => {
          if (item instanceof File) {
            return {
              _type: 'File',
              name: item.name,
              size: item.size,
              type: item.type,
            };
          }
          return item;
        });
        continue;
      }

      // Handle objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeFormData(value as Record<string, unknown>);
        continue;
      }

      // Primitive values
      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Update configuration
   * 
   * @param config - Partial configuration update
   */
  updateConfig(config: Partial<SessionPreservationConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('session', 'Configuration updated', this.config as any);
  }

  /**
   * Get current configuration
   * 
   * @returns Current configuration
   */
  getConfig(): SessionPreservationConfig {
    return { ...this.config };
  }
}

/**
 * Singleton session preservation manager instance
 */
let sessionManagerInstance: SessionPreservationManager | null = null;

/**
 * Get the singleton session preservation manager instance
 */
export function getSessionManager(): SessionPreservationManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionPreservationManager();
  }
  return sessionManagerInstance;
}

/**
 * Create a new session preservation manager instance
 */
export function createSessionManager(
  config?: Partial<SessionPreservationConfig>
): SessionPreservationManager {
  return new SessionPreservationManager(config);
}

/**
 * Set the singleton session preservation manager instance
 */
export function setSessionManager(manager: SessionPreservationManager): void {
  sessionManagerInstance = manager;
}

/**
 * Save wizard session using singleton manager
 * 
 * @param wizardId - Wizard identifier
 * @param wizardType - Type of wizard
 * @param currentStep - Current step number
 * @param totalSteps - Total number of steps
 * @param formData - Form data to preserve
 * 
 * Requirements: 13.5
 */
export function saveWizardSession(
  wizardId: string,
  wizardType: WizardType,
  currentStep: number,
  totalSteps: number,
  formData: Record<string, unknown>
): void {
  const manager = getSessionManager();
  manager.saveSession(wizardId, wizardType, currentStep, totalSteps, formData);
}

/**
 * Load wizard session using singleton manager
 * 
 * @param wizardId - Wizard identifier
 * @returns Preserved session or undefined
 * 
 * Requirements: 13.5, 13.6
 */
export function loadWizardSession(wizardId: string): PreservedSession | undefined {
  const manager = getSessionManager();
  return manager.loadSession(wizardId);
}

/**
 * Delete wizard session using singleton manager
 * 
 * @param wizardId - Wizard identifier
 */
export function deleteWizardSession(wizardId: string): void {
  const manager = getSessionManager();
  manager.deleteSession(wizardId);
}

/**
 * Check if wizard has valid preserved session
 * 
 * @param wizardId - Wizard identifier
 * @returns True if valid session exists
 */
export function hasValidWizardSession(wizardId: string): boolean {
  const manager = getSessionManager();
  return manager.hasValidSession(wizardId);
}

/**
 * Cleanup expired sessions using singleton manager
 * 
 * @returns Number of sessions removed
 */
export function cleanupExpiredSessions(): number {
  const manager = getSessionManager();
  return manager.cleanupExpiredSessions();
}

