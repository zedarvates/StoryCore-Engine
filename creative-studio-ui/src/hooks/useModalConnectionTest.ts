/**
 * useModalConnectionTest Hook
 *
 * Handles connection testing functionality for modal forms.
 * Supports both endpoint-based and custom function-based connection tests.
 */

import { useCallback } from 'react';
import type { ModalSchema, ConnectionTestResult } from '@/types/modal';

/**
 * Test connection via HTTP endpoint
 */
async function testHttpConnection(endpoint: string, timeout = 5000): Promise<ConnectionTestResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        responseTime,
        metadata: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        },
      };
    } else {
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
        metadata: {
          status: response.status,
          statusText: response.statusText,
        },
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          responseTime,
          error: 'Connection timeout',
        };
      }

      return {
        success: false,
        responseTime,
        error: error.message,
      };
    }

    return {
      success: false,
      responseTime,
      error: 'Unknown connection error',
    };
  }
}

/**
 * Hook for connection testing
 */
export function useModalConnectionTest(schema: ModalSchema) {
  /**
   * Test connection based on schema configuration
   */
  const testConnection = useCallback(async (data: Record<string, unknown>): Promise<ConnectionTestResult> => {
    if (!schema.connectionTest) {
      return {
        success: false,
        error: 'No connection test configured',
      };
    }

    const { endpoint } = schema.connectionTest;

    if (typeof endpoint === 'string') {
      // HTTP endpoint test
      return testHttpConnection(endpoint);
    } else if (typeof endpoint === 'function') {
      // Custom function test
      try {
        const startTime = Date.now();
        const success = await endpoint(data);
        const responseTime = Date.now() - startTime;

        return {
          success,
          responseTime,
          error: success ? undefined : 'Connection test failed',
        };
      } catch (error) {
        const responseTime = Date.now() - startTime;

        return {
          success: false,
          responseTime,
          error: error instanceof Error ? error.message : 'Connection test error',
        };
      }
    }

    return {
      success: false,
      error: 'Invalid connection test configuration',
    };
  }, [schema.connectionTest]);

  /**
   * Get connection test messages from schema
   */
  const getConnectionTestMessages = useCallback(() => {
    if (!schema.connectionTest) {
      return {
        successMessage: 'Connection successful',
        errorMessage: 'Connection failed',
      };
    }

    return {
      successMessage: schema.connectionTest.successMessage,
      errorMessage: schema.connectionTest.errorMessage,
    };
  }, [schema.connectionTest]);

  return {
    testConnection,
    getConnectionTestMessages,
  };
}
