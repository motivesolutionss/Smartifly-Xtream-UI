/**
 * Network status utilities
 * Detects offline state and network errors
 */

/**
 * Checks if the browser is online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') {
    return true; // Assume online on server
  }
  return navigator.onLine;
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  // Check for network-related error messages
  const networkErrorMessages = [
    'Failed to fetch',
    'NetworkError',
    'Network request failed',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_NETWORK_CHANGED',
    'ERR_CONNECTION_REFUSED',
    'ERR_CONNECTION_RESET',
    'ERR_CONNECTION_TIMED_OUT',
  ];

  const errorMessage = error.message || String(error);
  return networkErrorMessages.some(msg => errorMessage.includes(msg));
}

/**
 * Gets a user-friendly error message based on error type
 */
export function getNetworkErrorMessage(error: any): string {
  if (!isOnline()) {
    return 'You are currently offline. Please check your internet connection and try again.';
  }

  if (isNetworkError(error)) {
    return 'Network error occurred. Please check your internet connection and try again.';
  }

  if (error.status === 408 || error.status === 504) {
    return 'Request timed out. Please try again.';
  }

  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (error.status >= 500) {
    return 'Server error occurred. Please try again later.';
  }

  return error.message || 'An error occurred. Please try again.';
}

/**
 * Listens for online/offline events
 */
export function onNetworkStatusChange(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op on server
  }

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

