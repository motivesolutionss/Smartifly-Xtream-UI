import { logger } from '../config';

export type ErrorCategory = 'network' | 'auth' | 'data' | 'unknown';

export interface SafeAppError {
    code: string;
    message: string;
    category: ErrorCategory;
    timestamp: number;
    retryable: boolean;
    suggestion?: string;
}

type SafeTemplate = {
    message: string;
    category: ErrorCategory;
    retryable: boolean;
    suggestion?: string;
};

const DEFAULT_MESSAGES: Record<ErrorCategory, string> = {
    network: 'Network issue detected. Please check your internet connection and try again.',
    auth: 'Authentication failed. Please verify your credentials and try again.',
    data: 'The server returned invalid data. Please try again in a moment.',
    unknown: 'Something went wrong. Please try again.',
};

const SAFE_TEMPLATES: Record<string, SafeTemplate> = {
    NO_PORTAL: {
        message: 'Please select a server to continue.',
        category: 'data',
        retryable: false,
    },
    INVALID_PORTAL: {
        message: 'Selected server configuration is invalid.',
        category: 'data',
        retryable: false,
        suggestion: 'Choose another server or contact support.',
    },
    INVALID_USERNAME: {
        message: 'Username is required.',
        category: 'auth',
        retryable: false,
    },
    INVALID_PASSWORD: {
        message: 'Password is required.',
        category: 'auth',
        retryable: false,
    },
    AUTH_INVALID: {
        message: 'Server returned an invalid authentication response.',
        category: 'auth',
        retryable: true,
        suggestion: 'Verify server URL and try again.',
    },
    AUTH_FAILED: {
        message: 'Login failed. Please check username and password.',
        category: 'auth',
        retryable: true,
    },
    LOGIN_ERROR: {
        message: 'Unable to connect to server right now.',
        category: 'network',
        retryable: true,
    },
    NOT_AUTH: {
        message: 'You are not authenticated. Please login again.',
        category: 'auth',
        retryable: false,
    },
    INVALID_CREDENTIALS: {
        message: 'Saved credentials are invalid or incomplete.',
        category: 'auth',
        retryable: false,
        suggestion: 'Logout and login again.',
    },
    PREFETCH_FAILED: {
        message: 'Unable to sync content right now.',
        category: 'network',
        retryable: true,
    },
    ANNOUNCEMENTS_FETCH_FAILED: {
        message: 'Could not refresh announcements right now.',
        category: 'network',
        retryable: true,
    },
};

const SENSITIVE_PATTERNS = [
    /https?:\/\/[^\s)]+/gi,
    /\b\d{1,3}(?:\.\d{1,3}){3}\b/g,
    /\b(password|passwd|token|apikey|api_key|secret)\b[^,\s]*/gi,
];

const sanitizeRawMessage = (raw?: string) => {
    if (!raw || typeof raw !== 'string') return '';
    let next = raw.replace(/\s+/g, ' ').trim();
    for (const pattern of SENSITIVE_PATTERNS) {
        next = next.replace(pattern, '[redacted]');
    }
    if (next.length > 220) {
        next = `${next.slice(0, 217)}...`;
    }
    return next;
};

export const inferErrorCategory = (error: any, fallback: ErrorCategory = 'unknown'): ErrorCategory => {
    const status = error?.response?.status;
    if (typeof status === 'number') {
        if (status === 401 || status === 403) return 'auth';
        if (status >= 400 && status < 500) return 'data';
        if (status >= 500) return 'network';
    }

    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();

    if (
        code === 'ECONNABORTED' ||
        code === 'ETIMEDOUT' ||
        code === 'ERR_NETWORK' ||
        message.includes('network') ||
        message.includes('timeout')
    ) {
        return 'network';
    }

    return fallback;
};

export const buildSafeAppError = (input: {
    code: string;
    message?: string;
    category?: ErrorCategory;
    retryable?: boolean;
    suggestion?: string;
}): SafeAppError => {
    const template = SAFE_TEMPLATES[input.code];
    const category = template?.category ?? input.category ?? 'unknown';
    const message =
        template?.message ??
        sanitizeRawMessage(input.message) ??
        DEFAULT_MESSAGES[category];

    return {
        code: input.code,
        message: message || DEFAULT_MESSAGES[category],
        category,
        timestamp: Date.now(),
        retryable: template?.retryable ?? input.retryable ?? false,
        suggestion: input.suggestion ?? template?.suggestion,
    };
};

export const toSafeMessageFromUnknown = (
    error: unknown,
    fallbackCode: string = 'UNKNOWN_ERROR',
    fallbackCategory: ErrorCategory = 'unknown'
) => {
    const category = inferErrorCategory(error as any, fallbackCategory);
    const safe = buildSafeAppError({
        code: fallbackCode,
        message: error instanceof Error ? error.message : undefined,
        category,
        retryable: category === 'network',
    });
    return safe.message;
};

export const logSafeError = (scope: string, error: unknown) => {
    const category = inferErrorCategory(error as any, 'unknown');
    const safeMessage = toSafeMessageFromUnknown(error, 'UNKNOWN_ERROR', category);
    logger.error(scope, { category, message: safeMessage });
};
