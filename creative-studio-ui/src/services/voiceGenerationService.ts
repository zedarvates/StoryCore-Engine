/**
 * Voice Generation Service - Integration layer for ProjectDashboardNew
 * 
 * Provides voice generation functionality for dialogue phrases using the existing
 * TTS service. Handles async voice generation with loading states and stores
 * audio URL references on completion.
 * 
 * Requirements: 5.2, 5.3
 */

import { ttsService } from './ttsService';
import type { VoiceParameters } from '../types/projectDashboard';
import type { VoiceOver } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface VoiceGenerationOptions {
  text: string;
  voiceParams: VoiceParameters;
  onProgress?: (progress: number) => void;
}

export interface VoiceGenerationResult {
  success: boolean;
  audioUrl?: string;
  error?: string;
  duration?: number;
}

// ============================================================================
// Voice Generation Service
// ============================================================================

/**
 * Generate voice audio for dialogue phrase
 * 
 * Converts VoiceParameters to VoiceOver format and calls the TTS service.
 * Handles async generation with progress tracking and error handling.
 * 
 * Requirements: 5.2, 5.3
 * 
 * @param options - Voice generation options including text and parameters
 * @returns Promise resolving to generation result with audio URL
 */
export async function generateVoice(
  options: VoiceGenerationOptions
): Promise<VoiceGenerationResult> {
  const { text, voiceParams, onProgress } = options;

  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'Text cannot be empty',
      };
    }

    // Report initial progress
    onProgress?.(0);

    // Convert VoiceParameters to VoiceOver format
    const voiceOver: VoiceOver = {
      id: `voice-${Date.now()}`,
      text: text.trim(),
      voice: voiceParams.voiceType,
      language: voiceParams.language,
      speed: voiceParams.speed,
      pitch: voiceParams.pitch,
    };

    // Report progress before generation
    onProgress?.(25);

    // Generate voice using TTS service
    const startTime = Date.now();
    const audioUrl = await ttsService.generateVoiceOver(voiceOver);
    const duration = Date.now() - startTime;

    // Report completion
    onProgress?.(100);

    return {
      success: true,
      audioUrl,
      duration,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Voice generation failed';
    
    console.error('Voice generation error:', error);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get available voices from TTS service
 * 
 * @returns Promise resolving to array of available voices
 */
export async function getAvailableVoices() {
  try {
    return await ttsService.getAvailableVoices();
  } catch (error) {
    console.error('Failed to get available voices:', error);
    return [];
  }
}

/**
 * Validate voice parameters
 * 
 * @param params - Voice parameters to validate
 * @returns Validation result with error message if invalid
 */
export function validateVoiceParameters(params: VoiceParameters): {
  valid: boolean;
  error?: string;
} {
  // Validate speed
  if (params.speed < 0.5 || params.speed > 2.0) {
    return {
      valid: false,
      error: 'Speed must be between 0.5 and 2.0',
    };
  }

  // Validate pitch
  if (params.pitch < -12 || params.pitch > 12) {
    return {
      valid: false,
      error: 'Pitch must be between -12 and +12 semitones',
    };
  }

  // Validate voice type
  if (!['male', 'female', 'neutral'].includes(params.voiceType)) {
    return {
      valid: false,
      error: 'Voice type must be male, female, or neutral',
    };
  }

  // Validate language (basic check for ISO 639-1 format)
  if (!params.language || params.language.length !== 2) {
    return {
      valid: false,
      error: 'Language must be a valid ISO 639-1 code (2 characters)',
    };
  }

  return { valid: true };
}

/**
 * Estimate audio duration based on text length
 * 
 * Provides a rough estimate of how long the generated audio will be.
 * Useful for UI feedback and timeline planning.
 * 
 * @param text - Text to estimate duration for
 * @param speed - Speech speed multiplier (0.5 - 2.0)
 * @returns Estimated duration in seconds
 */
export function estimateAudioDuration(text: string, speed: number = 1.0): number {
  // Average speaking rate: ~150 words per minute at normal speed
  // Adjust for speed multiplier
  const wordsPerMinute = 150 * speed;
  const words = text.trim().split(/\s+/).length;
  const minutes = words / wordsPerMinute;
  const seconds = minutes * 60;
  
  // Add small buffer for pauses
  return Math.max(1, Math.ceil(seconds * 1.1));
}

// Export default service object for convenience
export const voiceGenerationService = {
  generateVoice,
  getAvailableVoices,
  validateVoiceParameters,
  estimateAudioDuration,
};

export default voiceGenerationService;
