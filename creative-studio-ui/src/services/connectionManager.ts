/**
 * Connection Manager Service
 * 
 * Handles connection testing, retry logic, and error logging
 */

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error?: Error;
  latency?: number;
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  timeout: 5000,
};

/**
 * Test connection to a URL endpoint
 */
export async function testConnection(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  const timeout = options.timeout || DEFAULT_RETRY_OPTIONS.timeout;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        message: `Connected successfully (${latency}ms)`,
        latency,
      };
    } else {
      return {
        success: false,
        message: `Connection failed: HTTP ${response.status} ${response.statusText}`,
        latency,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: `Connection timeout after ${timeout}ms`,
          error,
          latency,
        };
      }
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error,
        latency,
      };
    }

    return {
      success: false,
      message: 'Connection failed: Unknown error',
      latency,
    };
  }
}

/**
 * Test connection with automatic retry
 */
export async function testConnectionWithRetry(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  } = {},
  retryOptions: RetryOptions = {}
): Promise<ConnectionTestResult> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastResult: ConnectionTestResult | null = null;
  let delay = opts.retryDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= opts.backoffMultiplier;
    }

    lastResult = await testConnection(url, options);

    if (lastResult.success) {
      return lastResult;
    }

    // Log retry attempt
    console.warn(
      `Connection attempt ${attempt + 1}/${opts.maxRetries + 1} failed:`,
      lastResult.message
    );
  }

  return lastResult || {
    success: false,
    message: 'All connection attempts failed',
  };
}

/**
 * Test API endpoint with authentication
 */
export async function testAPIEndpoint(
  url: string,
  apiKey?: string,
  retryOptions?: RetryOptions
): Promise<ConnectionTestResult> {
  const headers: Record<string, string> = {};
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return testConnectionWithRetry(url, { headers }, retryOptions);
}

/**
 * Test Ollama connection
 */
export async function testOllamaConnection(
  baseUrl: string,
  retryOptions?: RetryOptions
): Promise<ConnectionTestResult> {
  const url = `${baseUrl}/api/tags`;
  
  try {
    const result = await testConnectionWithRetry(url, {}, retryOptions);
    
    if (result.success) {
      // Try to get model count
      try {
        const response = await fetch(url);
        const data = await response.json();
        const modelCount = data.models?.length || 0;
        
        return {
          ...result,
          message: `Connected successfully - ${modelCount} models available`,
        };
      } catch {
        return result;
      }
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      error: error instanceof Error ? error : undefined,
    };
  }
}

/**
 * Test ComfyUI connection
 */
export async function testComfyUIConnection(
  serverUrl: string,
  retryOptions?: RetryOptions
): Promise<ConnectionTestResult> {
  const url = `${serverUrl}/system_stats`;
  
  return testConnectionWithRetry(url, {}, retryOptions);
}

/**
 * Log connection error for debugging
 */
export function logConnectionError(
  service: string,
  url: string,
  error: Error | string
): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : error;
  
  console.error(`[${timestamp}] Connection Error - ${service}:`, {
    url,
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Store in session storage for debugging
  try {
    const logs = JSON.parse(sessionStorage.getItem('connection_errors') || '[]');
    logs.push({
      timestamp,
      service,
      url,
      error: errorMessage,
    });
    
    // Keep only last 50 errors
    if (logs.length > 50) {
      logs.shift();
    }
    
    sessionStorage.setItem('connection_errors', JSON.stringify(logs));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get connection error logs
 */
export function getConnectionErrorLogs(): Array<{
  timestamp: string;
  service: string;
  url: string;
  error: string;
}> {
  try {
    return JSON.parse(sessionStorage.getItem('connection_errors') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear connection error logs
 */
export function clearConnectionErrorLogs(): void {
  try {
    sessionStorage.removeItem('connection_errors');
  } catch {
    // Ignore storage errors
  }
}
