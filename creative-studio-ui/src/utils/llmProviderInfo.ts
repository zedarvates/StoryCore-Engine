/**
 * LLM Provider Information Utilities
 * 
 * Provides provider-specific branding, help text, and validation
 * 
 * Validates Requirements: 3.2
 */

import type { LLMProvider } from '@/services/llmService';

// ============================================================================
// Provider Branding
// ============================================================================

export interface ProviderBranding {
  name: string;
  displayName: string;
  description: string;
  logoUrl?: string;
  color: string;
  website: string;
  documentationUrl: string;
}

export const PROVIDER_BRANDING: Record<LLMProvider, ProviderBranding> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4, GPT-3.5, and other OpenAI models',
    color: '#10A37F',
    website: 'https://openai.com',
    documentationUrl: 'https://platform.openai.com/docs',
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic',
    description: 'Claude 3 and other Anthropic models',
    color: '#D97757',
    website: 'https://anthropic.com',
    documentationUrl: 'https://docs.anthropic.com',
  },
  local: {
    name: 'local',
    displayName: 'Local Server',
    description: 'Self-hosted LLM server (Ollama, LM Studio, etc.)',
    color: '#6366F1',
    website: '',
    documentationUrl: '',
  },
  custom: {
    name: 'custom',
    displayName: 'Custom Provider',
    description: 'Custom OpenAI-compatible API endpoint',
    color: '#8B5CF6',
    website: '',
    documentationUrl: '',
  },
};

// ============================================================================
// Provider-Specific Help Text
// ============================================================================

export interface ProviderHelpText {
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiKeyHelp: string;
  endpointLabel?: string;
  endpointPlaceholder?: string;
  endpointHelp?: string;
  setupInstructions: string[];
  commonIssues: string[];
}

export const PROVIDER_HELP_TEXT: Record<LLMProvider, ProviderHelpText> = {
  openai: {
    apiKeyLabel: 'OpenAI API Key',
    apiKeyPlaceholder: 'sk-...',
    apiKeyHelp: 'Your OpenAI API key from platform.openai.com',
    setupInstructions: [
      'Go to platform.openai.com',
      'Sign in or create an account',
      'Navigate to API Keys section',
      'Create a new API key',
      'Copy and paste it here',
    ],
    commonIssues: [
      'Insufficient credits - Add payment method',
      'Invalid API key - Check for typos',
      'Rate limit exceeded - Wait or upgrade plan',
    ],
  },
  anthropic: {
    apiKeyLabel: 'Anthropic API Key',
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyHelp: 'Your Anthropic API key from console.anthropic.com',
    setupInstructions: [
      'Go to console.anthropic.com',
      'Sign in or request access',
      'Navigate to API Keys',
      'Generate a new key',
      'Copy and paste it here',
    ],
    commonIssues: [
      'Access not granted - Request API access',
      'Invalid key format - Should start with sk-ant-',
      'Rate limit - Check your usage tier',
    ],
  },
  local: {
    apiKeyLabel: 'API Key (Optional)',
    apiKeyPlaceholder: 'Leave empty if not required',
    apiKeyHelp: 'Some local servers require authentication',
    endpointLabel: 'Server URL',
    endpointPlaceholder: 'http://localhost:11434',
    endpointHelp: 'The URL where your local LLM server is running',
    setupInstructions: [
      'Install Ollama, LM Studio, or similar',
      'Start the server',
      'Note the server URL (usually localhost)',
      'Enter the URL here',
      'Test the connection',
    ],
    commonIssues: [
      'Server not running - Start your LLM server',
      'Wrong port - Check server configuration',
      'Firewall blocking - Allow local connections',
    ],
  },
  custom: {
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Your API key',
    apiKeyHelp: 'API key for your custom endpoint',
    endpointLabel: 'API Endpoint',
    endpointPlaceholder: 'https://api.example.com/v1',
    endpointHelp: 'OpenAI-compatible API endpoint URL',
    setupInstructions: [
      'Obtain API credentials from your provider',
      'Get the base API endpoint URL',
      'Enter both here',
      'Ensure endpoint is OpenAI-compatible',
      'Test the connection',
    ],
    commonIssues: [
      'Incompatible API - Must be OpenAI-compatible',
      'CORS errors - Check server configuration',
      'Authentication failed - Verify credentials',
    ],
  },
};

// ============================================================================
// Provider-Specific Validation
// ============================================================================

export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export const PROVIDER_VALIDATION_RULES: Record<
  LLMProvider,
  {
    apiKey?: ValidationRule[];
    endpoint?: ValidationRule[];
  }
> = {
  openai: {
    apiKey: [
      {
        test: (value) => value.startsWith('sk-'),
        message: 'OpenAI API keys must start with "sk-"',
      },
      {
        test: (value) => value.length >= 40,
        message: 'OpenAI API keys are typically 40+ characters',
      },
    ],
  },
  anthropic: {
    apiKey: [
      {
        test: (value) => value.startsWith('sk-ant-'),
        message: 'Anthropic API keys must start with "sk-ant-"',
      },
      {
        test: (value) => value.length >= 40,
        message: 'Anthropic API keys are typically 40+ characters',
      },
    ],
  },
  local: {
    endpoint: [
      {
        test: (value) => {
          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'Must be a valid HTTP or HTTPS URL',
      },
      {
        test: (value) => {
          try {
            const url = new URL(value);
            return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.includes('.');
          } catch {
            return false;
          }
        },
        message: 'Must be a valid hostname',
      },
    ],
  },
  custom: {
    endpoint: [
      {
        test: (value) => {
          try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
          } catch {
            return false;
          }
        },
        message: 'Must be a valid HTTP or HTTPS URL',
      },
    ],
  },
};

// ============================================================================
// Provider Feature Support
// ============================================================================

export interface ProviderFeatures {
  supportsStreaming: boolean;
  supportsSystemPrompts: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  maxContextWindow: number;
  recommendedTemperature: number;
}

export const PROVIDER_FEATURES: Record<LLMProvider, ProviderFeatures> = {
  openai: {
    supportsStreaming: true,
    supportsSystemPrompts: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxContextWindow: 128000,
    recommendedTemperature: 0.7,
  },
  anthropic: {
    supportsStreaming: true,
    supportsSystemPrompts: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    maxContextWindow: 200000,
    recommendedTemperature: 0.7,
  },
  local: {
    supportsStreaming: true,
    supportsSystemPrompts: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    maxContextWindow: 8192,
    recommendedTemperature: 0.7,
  },
  custom: {
    supportsStreaming: true,
    supportsSystemPrompts: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    maxContextWindow: 8192,
    recommendedTemperature: 0.7,
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get branding information for a provider
 */
export function getProviderBranding(provider: LLMProvider): ProviderBranding {
  return PROVIDER_BRANDING[provider];
}

/**
 * Get help text for a provider
 */
export function getProviderHelpText(provider: LLMProvider): ProviderHelpText {
  return PROVIDER_HELP_TEXT[provider];
}

/**
 * Get validation rules for a provider
 */
export function getProviderValidationRules(provider: LLMProvider) {
  return PROVIDER_VALIDATION_RULES[provider];
}

/**
 * Get feature support for a provider
 */
export function getProviderFeatures(provider: LLMProvider): ProviderFeatures {
  return PROVIDER_FEATURES[provider];
}

/**
 * Validate a value against provider-specific rules
 */
export function validateProviderField(
  provider: LLMProvider,
  field: 'apiKey' | 'endpoint',
  value: string
): string | null {
  const rules = PROVIDER_VALIDATION_RULES[provider]?.[field];
  if (!rules) return null;

  for (const rule of rules) {
    if (!rule.test(value)) {
      return rule.message;
    }
  }

  return null;
}

/**
 * Check if a provider requires an API key
 */
export function providerRequiresApiKey(provider: LLMProvider): boolean {
  return provider === 'openai' || provider === 'anthropic' || provider === 'custom';
}

/**
 * Check if a provider requires a custom endpoint
 */
export function providerRequiresEndpoint(provider: LLMProvider): boolean {
  return provider === 'local' || provider === 'custom';
}
