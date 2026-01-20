/**
 * Clipboard Manager - Manages copy/paste operations for shots
 * 
 * This service handles:
 * - Internal clipboard for shots
 * - Copy, cut, and paste operations
 * - ID uniqueness generation
 * - Metadata preservation
 * - Cross-sequence compatibility validation
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.5
 */

import type { Shot } from '../../types';
import { generateId } from '../../utils/idGenerator';

// ============================================================================
// Types
// ============================================================================

export interface ClipboardData {
  shots: Shot[];
  operation: 'copy' | 'cut';
  timestamp: number;
  sourceSequenceId?: string;
}

export interface PasteOptions {
  targetSequenceId?: string;
  position?: number;
  validateCompatibility?: boolean;
}

export interface PasteResult {
  success: boolean;
  pastedShots: Shot[];
  errors?: string[];
}

// ============================================================================
// Clipboard Manager Class
// ============================================================================

export class ClipboardManager {
  private static instance: ClipboardManager;
  private clipboard: ClipboardData | null = null;
  private listeners: Set<(data: ClipboardData | null) => void> = new Set();

  private constructor() {
    // Initialize keyboard shortcuts
    this.initializeKeyboardShortcuts();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ClipboardManager {
    if (!ClipboardManager.instance) {
      ClipboardManager.instance = new ClipboardManager();
    }
    return ClipboardManager.instance;
  }

  /**
   * Initialize keyboard shortcuts for copy/paste
   * Requirements: 13.1
   */
  private initializeKeyboardShortcuts(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl+C - Copy
      if (ctrlKey && event.key === 'c' && !event.shiftKey) {
        event.preventDefault();
        this.triggerCopyEvent();
      }

      // Ctrl+X - Cut
      if (ctrlKey && event.key === 'x' && !event.shiftKey) {
        event.preventDefault();
        this.triggerCutEvent();
      }

      // Ctrl+V - Paste
      if (ctrlKey && event.key === 'v' && !event.shiftKey) {
        event.preventDefault();
        this.triggerPasteEvent();
      }
    });
  }

  /**
   * Trigger copy event (to be handled by components)
   */
  private triggerCopyEvent(): void {
    window.dispatchEvent(new CustomEvent('clipboard:copy'));
  }

  /**
   * Trigger cut event (to be handled by components)
   */
  private triggerCutEvent(): void {
    window.dispatchEvent(new CustomEvent('clipboard:cut'));
  }

  /**
   * Trigger paste event (to be handled by components)
   */
  private triggerPasteEvent(): void {
    window.dispatchEvent(new CustomEvent('clipboard:paste'));
  }

  /**
   * Copy shots to clipboard
   * Requirements: 13.1, 13.2
   */
  public copy(shots: Shot[], sourceSequenceId?: string): void {
    if (shots.length === 0) return;

    this.clipboard = {
      shots: shots.map(shot => ({ ...shot })), // Deep copy
      operation: 'copy',
      timestamp: Date.now(),
      sourceSequenceId,
    };

    this.notifyListeners();
  }

  /**
   * Cut shots to clipboard
   * Requirements: 13.1, 13.5
   */
  public cut(shots: Shot[], sourceSequenceId?: string): void {
    if (shots.length === 0) return;

    this.clipboard = {
      shots: shots.map(shot => ({ ...shot })), // Deep copy
      operation: 'cut',
      timestamp: Date.now(),
      sourceSequenceId,
    };

    this.notifyListeners();
  }

  /**
   * Paste shots from clipboard
   * Requirements: 13.2, 13.3, 13.4
   */
  public paste(options: PasteOptions = {}): PasteResult {
    if (!this.clipboard || this.clipboard.shots.length === 0) {
      return {
        success: false,
        pastedShots: [],
        errors: ['Clipboard is empty'],
      };
    }

    const errors: string[] = [];

    // Validate compatibility if requested
    if (options.validateCompatibility && options.targetSequenceId) {
      const compatibilityErrors = this.validateCompatibility(
        this.clipboard.shots,
        options.targetSequenceId
      );
      if (compatibilityErrors.length > 0) {
        return {
          success: false,
          pastedShots: [],
          errors: compatibilityErrors,
        };
      }
    }

    // Create new instances with unique IDs
    const pastedShots = this.clipboard.shots.map((shot, index) => {
      const newShot = this.createShotCopy(shot);
      
      // Set position if specified
      if (options.position !== undefined) {
        newShot.position = options.position + index;
      }

      return newShot;
    });

    return {
      success: true,
      pastedShots,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Create a copy of a shot with unique ID and updated timestamps
   * Requirements: 13.3, 13.4
   * 
   * Preserves all metadata except:
   * - id: New unique ID generated
   * - Nested IDs (audioTracks, effects, textLayers, animations, keyframes, transitions)
   * 
   * Preserved metadata:
   * - title, description, duration, position
   * - image URL
   * - All audioTrack properties (with new IDs)
   * - All effect properties (with new IDs)
   * - All textLayer properties (with new IDs)
   * - All animation properties (with new IDs)
   * - All transition properties (with new ID)
   * - Custom metadata fields
   */
  private createShotCopy(shot: Shot): Shot {
    const newShot: Shot = {
      ...shot,
      id: generateId(), // Generate unique ID
      // Preserve all metadata except ID and timestamps
      audioTracks: shot.audioTracks.map(track => ({
        ...track,
        id: generateId(), // New ID for audio track
        // Preserve all track properties including effects
        effects: track.effects.map(effect => ({
          ...effect,
          id: generateId(), // New ID for audio effect
          // Preserve automation curves with new keyframe IDs
          automationCurve: effect.automationCurve ? {
            ...effect.automationCurve,
            id: generateId(),
            keyframes: effect.automationCurve.keyframes.map(kf => ({
              ...kf,
              id: generateId(),
            })),
          } : undefined,
        })),
      })),
      effects: shot.effects.map(effect => ({
        ...effect,
        id: generateId(), // New ID for effect
      })),
      textLayers: shot.textLayers.map(layer => ({
        ...layer,
        id: generateId(), // New ID for text layer
      })),
      animations: shot.animations.map(animation => ({
        ...animation,
        id: generateId(), // New ID for animation
        keyframes: animation.keyframes.map(keyframe => ({
          ...keyframe,
          id: generateId(), // New ID for keyframe
        })),
      })),
      transitionOut: shot.transitionOut ? {
        ...shot.transitionOut,
        id: generateId(), // New ID for transition
      } : undefined,
    };

    return newShot;
  }

  /**
   * Validate compatibility with target sequence
   * Requirements: 13.8
   * 
   * Validates:
   * - Shot duration compatibility
   * - Effect support
   * - Audio format compatibility
   * - Text layer compatibility
   * - Animation compatibility
   */
  private validateCompatibility(
    shots: Shot[],
    targetSequenceId: string
  ): string[] {
    const errors: string[] = [];

    for (const shot of shots) {
      // Validate shot duration (example: must be between 0.1 and 60 seconds)
      if (shot.duration < 0.1 || shot.duration > 60) {
        errors.push(`Shot "${shot.title}" has invalid duration: ${shot.duration}s`);
      }

      // Validate audio tracks
      for (const track of shot.audioTracks) {
        // Check if audio format is supported (example validation)
        if (track.url && !this.isSupportedAudioFormat(track.url)) {
          errors.push(`Audio track "${track.name}" has unsupported format`);
        }

        // Validate audio effects
        for (const effect of track.effects) {
          if (!this.isSupportedAudioEffect(effect.type)) {
            errors.push(`Audio effect "${effect.type}" is not supported`);
          }
        }
      }

      // Validate visual effects
      for (const effect of shot.effects) {
        if (!this.isSupportedVisualEffect(effect.type)) {
          errors.push(`Visual effect "${effect.type}" is not supported`);
        }
      }

      // Validate text layers
      for (const layer of shot.textLayers) {
        if (layer.fontSize < 8 || layer.fontSize > 200) {
          errors.push(`Text layer has invalid font size: ${layer.fontSize}px`);
        }
      }

      // Validate animations
      for (const animation of shot.animations) {
        if (animation.keyframes.length < 2) {
          errors.push(`Animation must have at least 2 keyframes`);
        }
      }
    }

    return errors;
  }

  /**
   * Check if audio format is supported
   */
  private isSupportedAudioFormat(url: string): boolean {
    const supportedFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    return supportedFormats.some(format => url.toLowerCase().endsWith(format));
  }

  /**
   * Check if audio effect is supported
   */
  private isSupportedAudioEffect(effectType: string): boolean {
    const supportedEffects = [
      'limiter',
      'eq',
      'compressor',
      'voice-clarity',
      'noise-reduction',
      'reverb',
      'distortion',
      'bass-boost',
      'treble-boost',
      'gain',
    ];
    return supportedEffects.includes(effectType);
  }

  /**
   * Check if visual effect is supported
   */
  private isSupportedVisualEffect(effectType: string): boolean {
    const supportedEffects = ['filter', 'adjustment', 'overlay'];
    return supportedEffects.includes(effectType);
  }

  /**
   * Check if clipboard content can be pasted into target sequence
   * Requirements: 13.6
   */
  public canPasteIntoSequence(targetSequenceId: string): {
    canPaste: boolean;
    errors?: string[];
  } {
    if (!this.clipboard || this.clipboard.shots.length === 0) {
      return {
        canPaste: false,
        errors: ['Clipboard is empty'],
      };
    }

    const errors = this.validateCompatibility(this.clipboard.shots, targetSequenceId);

    return {
      canPaste: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get source sequence ID of clipboard content
   */
  public getSourceSequenceId(): string | undefined {
    return this.clipboard?.sourceSequenceId;
  }

  /**
   * Check if pasting between different sequences
   */
  public isCrossSequencePaste(targetSequenceId: string): boolean {
    if (!this.clipboard) return false;
    return (
      this.clipboard.sourceSequenceId !== undefined &&
      this.clipboard.sourceSequenceId !== targetSequenceId
    );
  }

  /**
   * Get clipboard content
   */
  public getContent(): ClipboardData | null {
    return this.clipboard;
  }

  /**
   * Get number of shots in clipboard
   */
  public getCount(): number {
    return this.clipboard?.shots.length || 0;
  }

  /**
   * Get clipboard operation type
   */
  public getOperation(): 'copy' | 'cut' | null {
    return this.clipboard?.operation || null;
  }

  /**
   * Clear clipboard
   */
  public clear(): void {
    this.clipboard = null;
    this.notifyListeners();
  }

  /**
   * Subscribe to clipboard changes
   */
  public subscribe(listener: (data: ClipboardData | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of clipboard changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.clipboard);
    });
  }

  /**
   * Export clipboard content as JSON
   */
  public exportToJSON(): string | null {
    if (!this.clipboard) return null;
    return JSON.stringify(this.clipboard, null, 2);
  }

  /**
   * Import clipboard content from JSON
   */
  public importFromJSON(json: string): boolean {
    try {
      const data = JSON.parse(json) as ClipboardData;
      if (data.shots && Array.isArray(data.shots)) {
        this.clipboard = data;
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import clipboard data:', error);
      return false;
    }
  }
}

// Export singleton instance
export const clipboardManager = ClipboardManager.getInstance();
