/**
 * LLM Diagnostic Utility
 * 
 * Provides comprehensive diagnostic information about LLM configuration and connectivity.
 * Helps troubleshoot issues with LLM service initialization and usage.
 */

import { loadConfiguration, hasStoredConfiguration, isCryptoAvailable } from './llmConfigStorage';
import { LLMService, type LLMConfig } from '@/services/llmService';
import { checkOllamaStatus } from '@/services/ollamaConfig';

// ============================================================================
// Types
// ============================================================================

export interface DiagnosticResult {
  timestamp: string;
  overall: 'healthy' | 'warning' | 'error';
  checks: {
    storage: DiagnosticCheck;
    configuration: DiagnosticCheck;
    encryption: DiagnosticCheck;
    connectivity: DiagnosticCheck;
    ollama: DiagnosticCheck;
  };
  recommendations: string[];
  config?: {
    provider: string;
    model: string;
    hasApiKey: boolean;
    streamingEnabled: boolean;
  };
}

export interface DiagnosticCheck {
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details?: unknown;
}

// ============================================================================
// Diagnostic Functions
// ============================================================================

/**
 * Check localStorage availability and stored configuration
 */
function checkStorage(): DiagnosticCheck {
  try {
    // Test localStorage write
    const testKey = '__storycore_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);

    // Check if configuration exists
    const hasConfig = hasStoredConfiguration();

    if (!hasConfig) {
      return {
        status: 'warning',
        message: 'No LLM configuration found in storage',
        details: {
          hasConfig: false,
          storageAvailable: true,
        },
      };
    }

    return {
      status: 'pass',
      message: 'Storage is available and configuration exists',
      details: {
        hasConfig: true,
        storageAvailable: true,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'localStorage is not available',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Check configuration validity
 */
async function checkConfiguration(): Promise<DiagnosticCheck> {
  try {
    const config = await loadConfiguration();

    if (!config) {
      return {
        status: 'warning',
        message: 'No configuration loaded',
        details: null,
      };
    }

    // Validate configuration fields
    const issues: string[] = [];

    if (!config.provider) {
      issues.push('Missing provider');
    }

    if (!config.model) {
      issues.push('Missing model');
    }

    // Check API key for providers that require it
    const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
    if (requiresApiKey && !config.apiKey) {
      issues.push('Missing API key (required for this provider)');
    }

    if (config.provider === 'local' && !config.apiEndpoint) {
      issues.push('Missing API endpoint for local provider');
    }

    if (issues.length > 0) {
      return {
        status: 'warning',
        message: 'Configuration has issues',
        details: {
          issues,
          config: {
            provider: config.provider,
            model: config.model,
            hasApiKey: !!config.apiKey,
            hasEndpoint: !!config.apiEndpoint,
          },
        },
      };
    }

    return {
      status: 'pass',
      message: 'Configuration is valid',
      details: {
        provider: config.provider,
        model: config.model,
        hasApiKey: !!config.apiKey,
        streamingEnabled: config.streamingEnabled,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Failed to load configuration',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Check encryption availability
 */
function checkEncryption(): DiagnosticCheck {
  try {
    const available = isCryptoAvailable();

    if (!available) {
      return {
        status: 'fail',
        message: 'Web Crypto API is not available',
        details: {
          cryptoAvailable: false,
          reason: 'Browser does not support Web Crypto API or running in insecure context',
        },
      };
    }

    // Check if encryption key exists in session storage
    const hasEncryptionKey = !!sessionStorage.getItem('storycore_encryption_key');

    if (!hasEncryptionKey) {
      return {
        status: 'warning',
        message: 'Encryption key not found in session',
        details: {
          cryptoAvailable: true,
          hasEncryptionKey: false,
          note: 'Key will be generated on first use',
        },
      };
    }

    return {
      status: 'pass',
      message: 'Encryption is available and configured',
      details: {
        cryptoAvailable: true,
        hasEncryptionKey: true,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Encryption check failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Check LLM service connectivity
 */
async function checkConnectivity(): Promise<DiagnosticCheck> {
  try {
    const config = await loadConfiguration();

    if (!config) {
      return {
        status: 'warning',
        message: 'Cannot test connectivity without configuration',
        details: null,
      };
    }

    // Create temporary service instance
    const service = new LLMService(config);

    // Validate connection
    const result = await service.validateConnection();

    if (result.success && result.data) {
      return {
        status: 'pass',
        message: 'Successfully connected to LLM provider',
        details: {
          provider: config.provider,
          model: config.model,
          connected: true,
        },
      };
    } else {
      return {
        status: 'fail',
        message: 'Failed to connect to LLM provider',
        details: {
          provider: config.provider,
          model: config.model,
          error: result.error,
          connected: false,
        },
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Connectivity test failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Check Ollama availability
 */
async function checkOllama(): Promise<DiagnosticCheck> {
  try {
    const available = await checkOllamaStatus();

    if (available) {
      return {
        status: 'pass',
        message: 'Ollama is available',
        details: {
          available: true,
          endpoint: 'http://localhost:11434',
        },
      };
    } else {
      return {
        status: 'warning',
        message: 'Ollama is not available',
        details: {
          available: false,
          endpoint: 'http://localhost:11434',
          note: 'Install Ollama for local LLM support',
        },
      };
    }
  } catch (error) {
    return {
      status: 'warning',
      message: 'Could not check Ollama status',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Generate recommendations based on diagnostic results
 */
function generateRecommendations(checks: DiagnosticResult['checks']): string[] {
  const recommendations: string[] = [];

  // Storage recommendations
  if (checks.storage.status === 'fail') {
    recommendations.push('Enable localStorage in your browser settings');
  } else if (checks.storage.status === 'warning') {
    recommendations.push('Configure LLM settings to enable AI features');
  }

  // Configuration recommendations
  if (checks.configuration.status === 'fail') {
    recommendations.push('Reconfigure LLM settings - current configuration is invalid');
  } else if (checks.configuration.status === 'warning') {
    const details = checks.configuration.details;
    if (details?.issues) {
      recommendations.push(...details.issues.map((issue: string) => `Fix: ${issue}`));
    }
  }

  // Encryption recommendations
  if (checks.encryption.status === 'fail') {
    recommendations.push('Use a modern browser with Web Crypto API support');
    recommendations.push('Ensure the application is served over HTTPS');
  }

  // Connectivity recommendations
  if (checks.connectivity.status === 'fail') {
    const details = checks.connectivity.details;
    if (details?.provider === 'local') {
      recommendations.push('Start Ollama service: ollama serve');
    } else if (details?.provider === 'openai' || details?.provider === 'anthropic') {
      recommendations.push('Verify your API key is valid and has sufficient credits');
      recommendations.push('Check your internet connection');
    }
  }

  // Ollama recommendations
  if (checks.ollama.status === 'warning') {
    recommendations.push('Install Ollama for free local LLM support: https://ollama.ai');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('LLM service is healthy and ready to use');
  }

  return recommendations;
}

/**
 * Determine overall health status
 */
function determineOverallStatus(checks: DiagnosticResult['checks']): 'healthy' | 'warning' | 'error' {
  const statuses = Object.values(checks).map(check => check.status);

  if (statuses.includes('fail')) {
    return 'error';
  }

  if (statuses.includes('warning')) {
    return 'warning';
  }

  return 'healthy';
}

// ============================================================================
// Main Diagnostic Function
// ============================================================================

/**
 * Run comprehensive LLM diagnostic
 */
export async function runLLMDiagnostic(): Promise<DiagnosticResult> {

  // Run all checks
  const storage = checkStorage();
  const configuration = await checkConfiguration();
  const encryption = checkEncryption();
  const connectivity = await checkConnectivity();
  const ollama = await checkOllama();

  const checks = {
    storage,
    configuration,
    encryption,
    connectivity,
    ollama,
  };

  // Generate recommendations
  const recommendations = generateRecommendations(checks);

  // Determine overall status
  const overall = determineOverallStatus(checks);

  // Get configuration summary
  let config: DiagnosticResult['config'] | undefined;
  try {
    const loadedConfig = await loadConfiguration();
    if (loadedConfig) {
      config = {
        provider: loadedConfig.provider,
        model: loadedConfig.model,
        hasApiKey: !!loadedConfig.apiKey,
        streamingEnabled: loadedConfig.streamingEnabled,
      };
    }
  } catch (error) {
    // Config not available
  }

  const result: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    overall,
    checks,
    recommendations,
    config,
  };


  return result;
}

/**
 * Print diagnostic results to console in a readable format
 */
export function printDiagnostic(result: DiagnosticResult): void {

  Object.entries(result.checks).forEach(([name, check]) => {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
    if (check.details) {
    }
  });

  if (result.config) {
  } else {
  }

  result.recommendations.forEach((rec, i) => {
  });

}

/**
 * Quick diagnostic check (returns boolean)
 */
export async function isLLMHealthy(): Promise<boolean> {
  const result = await runLLMDiagnostic();
  return result.overall === 'healthy';
}

/**
 * Get quick status message
 */
export async function getLLMStatusMessage(): Promise<string> {
  const result = await runLLMDiagnostic();

  if (result.overall === 'healthy') {
    return `✓ LLM service is healthy (${result.config?.provider} - ${result.config?.model})`;
  }

  if (result.overall === 'warning') {
    return `⚠ LLM service has warnings: ${result.recommendations[0]}`;
  }

  return `✗ LLM service has errors: ${result.recommendations[0]}`;
}

