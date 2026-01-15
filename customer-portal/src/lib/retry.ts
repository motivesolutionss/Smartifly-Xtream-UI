/**
 * Retry utility for API calls
 * Implements exponential backoff for failed requests
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  retryableErrors?: string[];
  timeout?: number; // Timeout in milliseconds
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors
  retryableErrors: ['NetworkError', 'Failed to fetch', 'Network request failed'],
  timeout: 30000, // 30 seconds default timeout
};

/**
 * Checks if an error is retryable
 */
function isRetryableError(error: any, options: Required<RetryOptions>): boolean {
  // Check for network errors
  if (error instanceof TypeError && options.retryableErrors.some(msg => error.message.includes(msg))) {
    return true;
  }

  // Check for retryable HTTP status codes
  if (error.status && options.retryableStatuses.includes(error.status)) {
    return true;
  }

  // Check error message for retryable patterns
  const errorMessage = error.message || String(error);
  if (options.retryableErrors.some(msg => errorMessage.includes(msg))) {
    return true;
  }

  return false;
}

/**
 * Calculates delay for retry attempt with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * Waits for specified milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error, opts)) {
        break;
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(attempt, opts);
      await wait(delay);
    }
  }

  throw lastError;
}

/**
 * Creates a timeout promise that rejects after specified milliseconds
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${ms}ms`));
    }, ms);
  });
}

/**
 * Retries a fetch request with exponential backoff and timeout support.
 * 
 * This function implements intelligent retry logic:
 * - Exponential backoff between retries
 * - Configurable maximum retries
 * - Timeout protection
 * - Retryable status code detection
 * - Network error handling
 * 
 * @param url - The URL to fetch
 * @param options - Standard fetch options (method, headers, body, signal, etc.)
 * @param retryOptions - Retry configuration
 * @param retryOptions.maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryOptions.timeout - Request timeout in milliseconds (default: 30000)
 * @param retryOptions.retryableStatuses - HTTP status codes that should trigger retry (default: [408, 429, 500, 502, 503, 504])
 * 
 * @returns Promise resolving to Response object
 * 
 * @throws {Error} If all retry attempts fail
 * @throws {Error} If request times out
 * 
 * @example
 * ```ts
 * const response = await fetchWithRetry('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * }, {
 *   maxRetries: 5,
 *   timeout: 60000
 * });
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const timeout = retryOptions.timeout || 30000; // Default 30 seconds

  return retry(async () => {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(url, {
          ...options,
          signal: controller.signal,
        }),
        createTimeout(timeout),
      ]) as Response;

      clearTimeout(timeoutId);

      // If response is not ok, create an error with status
      if (!response.ok) {
        const error: any = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle abort (timeout)
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        const timeoutError: any = new Error(`Request timed out after ${timeout}ms. Please try again.`);
        timeoutError.status = 408;
        timeoutError.isTimeout = true;
        throw timeoutError;
      }
      
      throw error;
    }
  }, retryOptions);
}

