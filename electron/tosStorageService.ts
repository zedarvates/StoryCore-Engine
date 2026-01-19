/**
 * TOS Storage Service
 * 
 * Manages persistence of Terms of Service acceptance status.
 * Stores acceptance timestamp and version in user data directory.
 * 
 * Requirements: 4.2.1, 4.2.2, 4.2.4
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * TOS acceptance data structure
 */
export interface TOSAcceptance {
  /** Whether the user has accepted the TOS */
  accepted: boolean;
  /** Timestamp when TOS was accepted (milliseconds since epoch) */
  timestamp: number;
  /** TOS version that was accepted */
  version: string;
  /** Whether the user has dismissed the update banner */
  dismissedBanner?: boolean;
}

/**
 * Service for managing TOS acceptance persistence
 */
export class TOSStorageService {
  private storagePath: string;
  private currentVersion: string;

  /**
   * Create a new TOS storage service
   * 
   * @param version - Current TOS version (default: '1.0')
   */
  constructor(version: string = '1.0') {
    this.currentVersion = version;
    this.storagePath = path.join(app.getPath('userData'), 'tos-acceptance.json');
  }

  /**
   * Save TOS acceptance to storage
   * 
   * Requirements: 4.2.1
   * 
   * @param version - TOS version being accepted (default: current version)
   * @returns Promise that resolves when save is complete
   */
  async saveAcceptance(version?: string): Promise<void> {
    const data: TOSAcceptance = {
      accepted: true,
      timestamp: Date.now(),
      version: version || this.currentVersion,
      dismissedBanner: false,
    };

    try {
      const jsonData = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(this.storagePath, jsonData, 'utf-8');
      console.log('TOS acceptance saved:', data);
    } catch (error) {
      console.error('Failed to save TOS acceptance:', error);
      throw new Error('Failed to save TOS acceptance');
    }
  }

  /**
   * Check if TOS has been accepted
   * 
   * Requirements: 4.2.2
   * 
   * @returns Promise that resolves with acceptance data or null if not accepted
   */
  async checkAcceptance(): Promise<TOSAcceptance | null> {
    try {
      // Check if file exists
      if (!fs.existsSync(this.storagePath)) {
        console.log('TOS acceptance file not found - first time user');
        return null;
      }

      // Read and parse file
      const jsonData = await fs.promises.readFile(this.storagePath, 'utf-8');
      const data: TOSAcceptance = JSON.parse(jsonData);

      // Validate data structure
      if (!data.accepted || !data.timestamp || !data.version) {
        console.warn('Invalid TOS acceptance data - treating as not accepted');
        return null;
      }

      console.log('TOS acceptance found:', {
        version: data.version,
        timestamp: new Date(data.timestamp).toISOString(),
      });

      return data;
    } catch (error) {
      console.error('Failed to read TOS acceptance:', error);
      return null;
    }
  }

  /**
   * Check if TOS needs to be reviewed
   * 
   * Returns true if:
   * - User has never accepted TOS
   * - TOS version has changed and banner not dismissed
   * 
   * Requirements: 4.2.2, 4.2.4
   * 
   * @returns Promise that resolves with true if review needed
   */
  async needsReview(): Promise<boolean> {
    const acceptance = await this.checkAcceptance();

    // First time user - needs to accept
    if (!acceptance) {
      return true;
    }

    // Version changed and banner not dismissed - needs review
    if (acceptance.version !== this.currentVersion && !acceptance.dismissedBanner) {
      console.log('TOS version changed:', {
        old: acceptance.version,
        new: this.currentVersion,
      });
      return true;
    }

    // Already accepted current version
    return false;
  }

  /**
   * Check if TOS dialog should be shown
   * 
   * Requirements: 4.2.4
   * 
   * @returns Promise that resolves with true if dialog should be shown
   */
  async shouldShowDialog(): Promise<boolean> {
    const acceptance = await this.checkAcceptance();

    // First time user - show dialog
    if (!acceptance) {
      return true;
    }

    // Version changed - show dialog
    if (acceptance.version !== this.currentVersion) {
      return true;
    }

    // Already accepted current version - skip dialog
    return false;
  }

  /**
   * Dismiss the TOS update banner
   * 
   * Updates the acceptance record to mark banner as dismissed
   * without requiring re-acceptance.
   * 
   * @returns Promise that resolves when dismiss is complete
   */
  async dismissBanner(): Promise<void> {
    const acceptance = await this.checkAcceptance();

    if (!acceptance) {
      console.warn('Cannot dismiss banner - no acceptance record found');
      return;
    }

    // Update dismissedBanner flag
    acceptance.dismissedBanner = true;

    try {
      const jsonData = JSON.stringify(acceptance, null, 2);
      await fs.promises.writeFile(this.storagePath, jsonData, 'utf-8');
      console.log('TOS banner dismissed');
    } catch (error) {
      console.error('Failed to dismiss TOS banner:', error);
      throw new Error('Failed to dismiss TOS banner');
    }
  }

  /**
   * Clear TOS acceptance (for testing or reset)
   * 
   * @returns Promise that resolves when clear is complete
   */
  async clearAcceptance(): Promise<void> {
    try {
      if (fs.existsSync(this.storagePath)) {
        await fs.promises.unlink(this.storagePath);
        console.log('TOS acceptance cleared');
      }
    } catch (error) {
      console.error('Failed to clear TOS acceptance:', error);
      throw new Error('Failed to clear TOS acceptance');
    }
  }

  /**
   * Get current TOS version
   * 
   * @returns Current TOS version string
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Get storage file path (for testing)
   * 
   * @returns Path to TOS acceptance file
   */
  getStoragePath(): string {
    return this.storagePath;
  }
}
