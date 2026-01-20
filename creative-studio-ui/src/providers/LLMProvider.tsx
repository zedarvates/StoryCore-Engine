/**
 * LLM Provider
 * 
 * Centralized provider for LLM service initialization and management.
 * Ensures LLM service is initialized before any component tries to use it.
 * Provides context for accessing LLM service throughout the application.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { llmConfigService, initializeLLMConfigService } from '@/services/llmConfigService';
import type { LLMService, LLMConfig } from '@/services/llmService';

// ============================================================================
// Types
// ============================================================================

interface LLMContextValue {
  service: LLMService | null;
  config: LLMConfig | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  reinitialize: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const LLMContext = createContext<LLMContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface LLMProviderProps {
  children: ReactNode;
}

export function LLMProvider({ children }: LLMProviderProps) {
  const [state, setState] = useState<Omit<LLMContextValue, 'reinitialize'>>({
    service: null,
    config: null,
    isInitialized: false,
    isLoading: true,
    error: null,
  });

  // Initialize LLM service on mount
  useEffect(() => {
    async function initialize() {
      console.log('[LLMProvider] Initializing LLM service...');
      
      try {
        // Initialize the LLM configuration service
        await initializeLLMConfigService();
        
        // Get the service and configuration
        const service = llmConfigService.getService();
        const config = llmConfigService.getConfig();
        
        // If config exists and provider is local/ollama, verify Ollama is running
        if (config && (config.provider === 'local' || config.provider === 'ollama')) {
          const endpoint = config.apiEndpoint || 'http://localhost:11434';
          try {
            console.log('[LLMProvider] Checking Ollama availability at', endpoint);
            const response = await fetch(`${endpoint}/api/tags`, {
              method: 'GET',
              signal: AbortSignal.timeout(3000), // 3 second timeout
            });
            
            if (!response.ok) {
              console.warn('[LLMProvider] Ollama is not responding correctly');
              // Don't fail initialization, just warn
            } else {
              console.log('[LLMProvider] Ollama is available');
            }
          } catch (ollamaError) {
            console.warn('[LLMProvider] Ollama is not running or not accessible:', ollamaError);
            // Don't fail initialization, the banner will show the user they need to configure
          }
        }
        
        console.log('[LLMProvider] LLM service initialized successfully', {
          hasService: service !== null,
          hasConfig: config !== null,
          provider: config?.provider,
          model: config?.model,
        });
        
        setState({
          service,
          config,
          isInitialized: true,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('[LLMProvider] Initialization failed:', error);
        setState({
          service: null,
          config: null,
          isInitialized: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize LLM service',
        });
      }
    }

    initialize();
  }, []);

  // Subscribe to configuration changes
  useEffect(() => {
    if (!state.isInitialized) {
      return;
    }

    console.log('[LLMProvider] Subscribing to configuration changes...');
    
    const unsubscribe = llmConfigService.subscribe((config) => {
      const service = llmConfigService.getService();
      
      console.log('[LLMProvider] Configuration updated', {
        hasService: service !== null,
        hasConfig: config !== null,
        provider: config?.provider,
        model: config?.model,
      });
      
      setState(prev => ({
        ...prev,
        service,
        config,
      }));
    });

    return () => {
      console.log('[LLMProvider] Unsubscribing from configuration changes');
      unsubscribe();
    };
  }, [state.isInitialized]);

  // Reinitialize function for manual reinitialization
  const reinitialize = async () => {
    console.log('[LLMProvider] Manual reinitialization requested');
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      await initializeLLMConfigService();
      
      const service = llmConfigService.getService();
      const config = llmConfigService.getConfig();
      
      console.log('[LLMProvider] Reinitialization successful');
      
      setState({
        service,
        config,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[LLMProvider] Reinitialization failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to reinitialize LLM service',
      }));
    }
  };

  const contextValue: LLMContextValue = {
    ...state,
    reinitialize,
  };

  return (
    <LLMContext.Provider value={contextValue}>
      {children}
    </LLMContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access LLM context
 * 
 * @throws Error if used outside of LLMProvider
 * @returns LLM context value
 */
export function useLLMContext(): LLMContextValue {
  const context = useContext(LLMContext);
  
  if (!context) {
    throw new Error('useLLMContext must be used within LLMProvider');
  }
  
  return context;
}

/**
 * Hook to check if LLM is ready to use
 * 
 * @returns boolean indicating if LLM service is configured and ready
 */
export function useLLMReady(): boolean {
  const { isInitialized, service, config } = useLLMContext();
  return isInitialized && service !== null && config !== null;
}
