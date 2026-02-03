/**
 * Feedback API Utility
 * 
 * Provides functions to submit feedback reports to the backend proxy service.
 * 
 * Requirements: 1.2, 1.5, 8.1
 */

import { ReportPayload, SubmissionResult } from '../types';
import { getBackendProxyUrl as getConfiguredBackendUrl } from './feedbackConfig';

/**
 * Get the backend proxy URL from configuration
 * 
 * Requirements: 7.3
 * 
 * @returns Backend proxy URL
 */
async function getBackendProxyUrl(): Promise<string> {
  try {
    // Get URL from configuration
    const baseUrl = await getConfiguredBackendUrl();
    return `${baseUrl}/api/v1/report`;
  } catch (error) {
    console.warn('Failed to load backend URL from config, using default:', error);
    // Fallback to environment variable or default
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    return `${baseUrl}/api/v1/report`;
  }
}

/**
 * Submit a report payload to the backend proxy service
 * 
 * Requirements: 1.2
 * 
 * @param payload Report payload to submit
 * @returns Submission result with issue URL or error
 */
export async function submitReportAutomatic(
  payload: ReportPayload
): Promise<SubmissionResult> {
  const backendUrl = await getBackendProxyUrl();
  
  try {
    console.log('Submitting report to backend proxy:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Handle successful response
    if (response.ok) {
      const data = await response.json();
      console.log('Report submitted successfully:', data);
      
      return {
        success: true,
        issueUrl: data.issue_url,
        issueNumber: data.issue_number,
      };
    }

    // Handle error responses
    const errorData = await response.json().catch(() => ({
      status: 'error',
      message: `HTTP ${response.status}: ${response.statusText}`,
      fallback_mode: 'manual',
    }));

    console.error('Backend proxy returned error:', errorData);

    return {
      success: false,
      error: errorData.message || `Failed to submit report: ${response.statusText}`,
      fallbackMode: errorData.fallback_mode === 'manual' ? 'manual' : undefined,
    };
  } catch (error) {
    // Handle network errors or other exceptions
    console.error('Failed to submit report to backend proxy:', error);
    
    // Network errors indicate backend is unavailable
    // Requirements: 1.5, 8.1
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    return {
      success: false,
      error: `Backend service unavailable: ${errorMessage}`,
      fallbackMode: 'manual',
    };
  }
}

/**
 * Check if the backend proxy service is available
 * 
 * @returns True if backend is reachable, false otherwise
 */
export async function checkBackendAvailability(): Promise<boolean> {
  try {
    const baseUrl = await getConfiguredBackendUrl();
    const healthUrl = `${baseUrl}/health`;
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      // Short timeout to quickly detect unavailability
      signal: AbortSignal.timeout(3000),
    });
    
    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
}
