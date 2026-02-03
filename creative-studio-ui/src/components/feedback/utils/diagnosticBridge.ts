/**
 * Diagnostic Bridge Utility
 * 
 * Provides functions to call Python diagnostic collector via Electron bridge
 * and collect system information for feedback reports.
 */

import { ReportPayload, SystemInfo, ModuleContext } from '../types';

/**
 * Call Python diagnostic collector to gather system information
 * 
 * Requirements: 1.1, 3.1
 * 
 * @param moduleName Optional active module name
 * @returns System information and module context
 */
export async function collectDiagnostics(
  moduleName?: string
): Promise<{ systemInfo: SystemInfo; moduleContext: ModuleContext }> {
  try {
    // In a real implementation, this would call the Python backend via Electron IPC
    // For now, we'll collect what we can from the browser environment
    
    // Try to get system info from Electron API if available
    if (window.electronAPI) {
      // Placeholder for actual Electron IPC call to Python diagnostic collector
      // This would be implemented in the Electron main process
      // Example: const diagnostics = await window.electronAPI.feedback.collectDiagnostics(moduleName);
      
      // For now, return mock data with available information
      const systemInfo: SystemInfo = {
        storycore_version: '0.1.0', // Would come from Python
        python_version: '3.9.0', // Would come from Python
        os_platform: window.electronAPI.platform || 'unknown',
        os_version: 'unknown', // Would come from Python
        language: navigator.language || 'en-US',
      };

      const moduleContext: ModuleContext = {
        active_module: moduleName || 'unknown',
        module_state: {},
      };

      return { systemInfo, moduleContext };
    }

    // Fallback for web environment (limited information)
    const systemInfo: SystemInfo = {
      storycore_version: '0.1.0',
      python_version: 'unknown',
      os_platform: navigator.platform || 'unknown',
      os_version: 'unknown',
      language: navigator.language || 'en-US',
    };

    const moduleContext: ModuleContext = {
      active_module: moduleName || 'unknown',
      module_state: {},
    };

    return { systemInfo, moduleContext };
  } catch (error) {
    console.error('Failed to collect diagnostics:', error);
    
    // Return minimal information on error
    return {
      systemInfo: {
        storycore_version: 'unknown',
        python_version: 'unknown',
        os_platform: 'unknown',
        os_version: 'unknown',
        language: 'en-US',
      },
      moduleContext: {
        active_module: 'unknown',
        module_state: {},
      },
    };
  }
}

/**
 * Create a complete report payload
 * 
 * Requirements: 1.1, 3.3, 7.3, 7.5
 * 
 * @param reportType Type of report (bug, enhancement, question)
 * @param description User-provided description
 * @param reproductionSteps Steps to reproduce the issue
 * @param logConsent Whether user consented to log collection
 * @param moduleName Optional active module name
 * @param stackTrace Optional stack trace from error context
 * @returns Complete report payload
 */
export async function createReportPayload(
  reportType: 'bug' | 'enhancement' | 'question',
  description: string,
  reproductionSteps: string,
  logConsent: boolean,
  moduleName?: string,
  stackTrace?: string
): Promise<ReportPayload> {
  const { systemInfo, moduleContext } = await collectDiagnostics(moduleName);

  // Collect logs only if user has given consent (Requirements: 3.3, 7.3, 7.5)
  let logs: string[] = [];
  if (logConsent) {
    try {
      // In a real implementation, this would call the Python backend to collect logs
      // For now, we'll use a placeholder
      if (window.electronAPI?.feedback?.collectLogs) {
        logs = await window.electronAPI.feedback.collectLogs(500); // Last 500 lines
      }
    } catch (error) {
      console.warn('Failed to collect logs:', error);
      // Continue without logs rather than failing the entire submission
    }
  }

  const payload: ReportPayload = {
    schema_version: '1.0',
    report_type: reportType,
    timestamp: new Date().toISOString(),
    system_info: systemInfo,
    module_context: moduleContext,
    user_input: {
      description,
      reproduction_steps: reproductionSteps,
    },
    diagnostics: {
      stacktrace: stackTrace || null,
      logs: logs, // Include logs only if consent given
      memory_usage_mb: 0,
      process_state: {},
    },
    screenshot_base64: null, // Phase 1: No screenshot support yet
  };

  return payload;
}
