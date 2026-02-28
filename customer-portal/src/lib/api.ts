import { Package, Ticket, Settings, TicketReply, SubscriptionRequestData, SubscriptionRequest, TicketAttachment } from "@/types";
import { logger } from "./logger";
import { ENV } from "./env";
import { fetchWithRetry } from "./retry";
import { isOnline, isNetworkError, getNetworkErrorMessage } from "./network";

const BASE_URL = ENV.BACKEND_URL;

/**
 * Fetches data from the API with comprehensive error handling, retry logic, and network detection.
 * 
 * Features:
 * - Checks online/offline status before making requests
 * - Automatic retry with exponential backoff
 * - Timeout handling
 * - Network error detection and user-friendly messages
 * - Error message extraction from API responses
 * 
 * @template T - The expected return type
 * @param url - The API endpoint URL (relative or absolute)
 * @param options - Standard fetch options (method, headers, body, etc.)
 * @param retryOptions - Retry configuration
 * @param retryOptions.maxRetries - Maximum number of retry attempts (default: 3)
 * @param retryOptions.timeout - Request timeout in milliseconds (default: 30000)
 * 
 * @returns Promise resolving to the API response data
 * 
 * @throws {Error} If the request fails after all retries
 * @throws {Error} If the device is offline
 * @throws {Error} If the request times out
 * 
 * @example
 * ```ts
 * const packages = await fetchWithErrorHandling<Package[]>('/api/packages');
 * ```
 */
async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit,
  retryOptions?: { maxRetries?: number; timeout?: number }
): Promise<T> {
  // Check if offline before making request
  if (!isOnline()) {
    const error: any = new Error('You are currently offline. Please check your internet connection.');
    error.isOffline = true;
    throw error;
  }

  try {
    const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
    const response = await fetchWithRetry(
      url,
      {
        ...options,
        headers: {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...options?.headers,
        },
        // Add cache control for SSR
        cache: 'no-store', // Always fetch fresh data
      },
      {
        maxRetries: retryOptions?.maxRetries ?? 3,
        timeout: retryOptions?.timeout ?? 30000, // 30 seconds default
        // Don't retry on 4xx errors (client errors)
        retryableStatuses: [408, 429, 500, 502, 503, 504],
      }
    );

    const json = await response.json();
    // Type-safe extraction: prefer data property, fallback to entire response
    const data = json.data !== undefined ? json.data : json;
    return data as T;
  } catch (error: any) {
    logger.error(`Error fetching ${url}:`, error);

    // Enhance error with network information and context
    if (isNetworkError(error)) {
      error.isNetworkError = true;
      error.userMessage = getNetworkErrorMessage(error);
    }

    // Add timeout information
    if (error.isTimeout) {
      error.userMessage = `Request timed out. The server took too long to respond. Please try again.`;
    }

    // Set default user message if not set
    if (!error.userMessage) {
      error.userMessage = getNetworkErrorMessage(error);
    }

    throw error;
  }
}

/**
 * Fetches all available subscription packages from the backend.
 * 
 * @returns Promise resolving to an array of Package objects
 * @throws {Error} If the request fails or network is unavailable
 * 
 * @example
 * ```ts
 * const packages = await fetchPackages();
 * packages.forEach(pkg => console.log(pkg.name));
 * ```
 */
export async function fetchPackages(): Promise<Package[]> {
  return await fetchWithErrorHandling<Package[]>(`${BASE_URL}/api/packages`, undefined, {
    timeout: 30000, // 30 seconds for packages
  });
}

/**
 * Creates a new support ticket.
 * 
 * @param data - Ticket creation data
 * @param data.name - Customer's full name
 * @param data.email - Customer's email address
 * @param data.subject - Brief subject line for the ticket
 * @param data.message - Detailed message describing the issue
 * @param data.priority - Optional priority level (defaults to 'MEDIUM')
 * 
 * @returns Promise resolving to the created Ticket object with ticketNo
 * @throws {Error} If the request fails or validation errors occur
 * 
 * @example
 * ```ts
 * const ticket = await createTicket({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   subject: 'Login issue',
 *   message: 'I cannot log into my account',
 *   priority: 'HIGH'
 * });
 * console.log('Ticket created:', ticket.ticketNo);
 * ```
 */
export async function createTicket(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}): Promise<Ticket> {
  return await fetchWithErrorHandling<Ticket>(`${BASE_URL}/api/tickets`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, {
    timeout: 20000, // 20 seconds for ticket creation
  });
}

/**
 * Creates a new support ticket with file attachments.
 * 
 * @param data - Ticket creation data
 * @param files - Array of files to attach (max 3 files, 10MB each)
 * @returns Promise resolving to the created Ticket object with ticketNo
 * @throws {Error} If the request fails or validation errors occur
 */
export async function createTicketWithAttachments(
  data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  },
  files: File[]
): Promise<Ticket> {
  // Check if offline before making request
  if (!isOnline()) {
    const error: any = new Error('You are currently offline. Please check your internet connection.');
    error.isOffline = true;
    throw error;
  }

  try {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('subject', data.subject);
    formData.append('message', data.message);
    if (data.priority) {
      formData.append('priority', data.priority);
    }

    // Append files
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${BASE_URL}/api/tickets/with-attachments`, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header - browser will set it with boundary for multipart/form-data
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create ticket' }));
      const error: any = new Error(errorData.error || 'Failed to create ticket');
      error.status = response.status;
      error.userMessage = errorData.error || 'Failed to create ticket. Please try again.';
      throw error;
    }

    const json = await response.json();
    return json.ticket || json;
  } catch (error: any) {
    logger.error('Error creating ticket with attachments:', error);

    if (isNetworkError(error)) {
      error.isNetworkError = true;
      error.userMessage = getNetworkErrorMessage(error);
    }

    if (!error.userMessage) {
      error.userMessage = 'Failed to create ticket. Please try again.';
    }

    throw error;
  }
}

/**
 * Fetches a single ticket by its ticket number.
 * 
 * @param ticketNo - The unique ticket number/identifier
 * @returns Promise resolving to the Ticket object
 * @throws {Error} If the ticket is not found (404) or request fails
 * 
 * @example
 * ```ts
 * const ticket = await fetchTicket('TKT-12345');
 * console.log('Ticket status:', ticket.status);
 * ```
 */
export async function fetchTicket(ticketNo: string): Promise<Ticket> {
  if (!ticketNo || typeof ticketNo !== 'string') {
    throw new Error('Ticket number is required and must be a string');
  }
  return await fetchWithErrorHandling<Ticket>(`${BASE_URL}/api/tickets/${ticketNo}`, undefined, {
    timeout: 15000, // 15 seconds for ticket lookup
  });
}

/**
 * Fetches application settings from the backend.
 * Falls back to default settings if the backend endpoint is not available.
 * 
 * @returns Promise resolving to Settings object
 * @throws {Error} Only if both backend and fallback fail (unlikely)
 * 
 * @example
 * ```ts
 * const settings = await fetchSettings();
 * console.log('Support email:', settings.supportEmail);
 * ```
 */
export async function fetchSettings(): Promise<Settings> {
  try {
    return await fetchWithErrorHandling<Settings>(`${BASE_URL}/api/settings`, undefined, {
      timeout: 10000, // 10 seconds for settings
    });
  } catch (error) {
    // Fallback for settings if backend doesn't support public settings yet
    logger.warn('Using fallback settings:', error);
    const fallbackSettings: Settings = {
      siteName: 'Smartifly OTT Platform',
      supportEmail: 'support@smartifly.com',
      whatsappNumber: '+1234567890',
      socialLinks: {
        facebook: '#',
        twitter: '#',
        instagram: '#',
      },
    };
    return fallbackSettings;
  }
}

/**
 * Creates a new subscription request.
 * 
 * @param data - Subscription request data including packageId, fullName, email, and phoneNumber
 * @returns Promise resolving to an object with requestId
 * @throws {Error} If the request fails or validation errors occur
 * 
 * @example
 * ```ts
 * const response = await createSubscriptionRequest({
 *   packageId: 'pkg-123',
 *   fullName: 'John Doe',
 *   email: 'john@example.com',
 *   phoneNumber: '+1234567890'
 * });
 * console.log('Request ID:', response.requestId);
 * ```
 */
export async function createSubscriptionRequest(data: SubscriptionRequestData): Promise<{ requestId: string }> {
  return await fetchWithErrorHandling<{ requestId: string }>(
    `${BASE_URL}/api/subscriptions/request`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    {
      timeout: 20000, // 20 seconds for subscription request
    }
  );
}

export async function verifySubscriptionToken(token: string) {
  try {
    const response = await fetchWithRetry(
      `${BASE_URL}/api/subscriptions/verify/${token}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      {
        maxRetries: 2,
        timeout: 15000, // 15 seconds for verification
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Verification failed' }));
      const error: any = new Error(errorData.error || errorData.message || 'Verification failed');
      error.status = response.status;
      error.userMessage = errorData.error || errorData.message || 'Verification link expired or is invalid. Please request a new one.';
      throw error;
    }

    return await response.json();
  } catch (error: any) {
    logger.error('Error verifying subscription token:', error);

    if (!error.userMessage) {
      error.userMessage = error.message || 'Verification failed. Please try again.';
    }

    throw error;
  }
}

export async function getSubscriptionRequest(requestId: string) {
  return await fetchWithErrorHandling<SubscriptionRequest>(`${BASE_URL}/api/subscriptions/${requestId}`);
}

export interface SubscriptionLookupResult {
  email: string;
  fullName: string;
  status?: 'pending' | 'approved' | 'rejected'; // Optional since backend schema doesn't have this field yet
  package: {
    name: string;
    duration: string; // Backend returns string, not number
    price: number;
    currency: string;
  };
  submittedAt: string;
  isVerified: boolean;
  verifiedAt: string | null;
}

export interface SubscriptionLookupError {
  error: string;
  message?: string;
}

/**
 * Looks up a subscription request by email address.
 * 
 * @param email - The email address to lookup
 * @returns Promise resolving to SubscriptionLookupResult
 * @throws {Error} If the request fails (includes 404 if not found)
 * 
 * @example
 * ```ts
 * try {
 *   const result = await lookupSubscription('user@example.com');
 *   console.log('Status:', result.status);
 * } catch (error) {
 *   if (error.status === 404) {
 *     console.log('Subscription not found');
 *   }
 * }
 * ```
 */
export async function lookupSubscription(email: string): Promise<SubscriptionLookupResult> {
  try {
    return await fetchWithErrorHandling<SubscriptionLookupResult>(
      `${BASE_URL}/api/subscriptions/lookup?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
      },
      {
        timeout: 15000, // 15 seconds for lookup
        maxRetries: 2, // Fewer retries for lookup (404 is expected)
      }
    );
  } catch (error: any) {
    // Preserve status code for proper error handling in hooks
    if (error.status) {
      // Error already has status from fetchWithRetry
      // Add hint if available from error message
      if (error.userMessage && !error.hint) {
        error.hint = error.userMessage;
      }
    }
    throw error;
  }
}

/**
 * Adds a reply to an existing ticket.
 * 
 * @param ticketNo - The ticket number (e.g., TKT-123456)
 * @param message - The reply message content
 * @returns Promise resolving to the created TicketReply
 */
export async function replyTicket(ticketNo: string, message: string): Promise<TicketReply> {
  return await fetchWithErrorHandling<TicketReply>(`${BASE_URL}/api/tickets/${ticketNo}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }, {
    timeout: 15000,
  });
}

/**
 * Uploads attachments to an existing ticket.
 */
export async function uploadTicketAttachments(ticketNo: string, files: File[]): Promise<TicketAttachment[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return await fetchWithErrorHandling<TicketAttachment[]>(`${BASE_URL}/api/tickets/${ticketNo}/attachments`, {
    method: 'POST',
    body: formData,
  });
}
