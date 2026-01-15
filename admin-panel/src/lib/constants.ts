// ============================================
// Application Constants
// ============================================

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// Portals
export const MAX_PORTALS = 5;

// Tickets
export const TICKET_STATUS = {
    OPEN: { label: 'Open', color: 'blue' },
    IN_PROGRESS: { label: 'In Progress', color: 'yellow' },
    RESOLVED: { label: 'Resolved', color: 'green' },
    CLOSED: { label: 'Closed', color: 'gray' },
} as const;

export const TICKET_PRIORITY = {
    LOW: { label: 'Low', color: 'gray' },
    MEDIUM: { label: 'Medium', color: 'blue' },
    HIGH: { label: 'High', color: 'orange' },
    URGENT: { label: 'Urgent', color: 'red' },
} as const;

// Announcements
export const ANNOUNCEMENT_TYPES = {
    INFO: { label: 'Information', color: 'blue', icon: 'Info' },
    WARNING: { label: 'Warning', color: 'yellow', icon: 'AlertTriangle' },
    MAINTENANCE: { label: 'Maintenance', color: 'orange', icon: 'Wrench' },
    UPDATE: { label: 'Update', color: 'green', icon: 'RefreshCw' },
} as const;

// Packages
export const PACKAGE_DURATIONS = [
    { value: '1 Month', label: '1 Month' },
    { value: '3 Months', label: '3 Months' },
    { value: '6 Months', label: '6 Months' },
    { value: '1 Year', label: '1 Year' },
] as const;

export const CURRENCIES = [
    { value: 'USD', label: 'USD ($)', symbol: '$' },
    { value: 'EUR', label: 'EUR (€)', symbol: '€' },
    { value: 'GBP', label: 'GBP (£)', symbol: '£' },
    { value: 'PKR', label: 'PKR (₨)', symbol: '₨' },
] as const;

// Notifications
export const PLATFORMS = {
    android: { label: 'Android', color: 'green' },
    ios: { label: 'iOS', color: 'blue' },
    web: { label: 'Web', color: 'purple' },
} as const;

// Date formats
export const DATE_FORMAT = {
    SHORT: 'MMM d, yyyy',
    LONG: 'MMMM d, yyyy',
    WITH_TIME: 'MMM d, yyyy h:mm a',
    ISO: 'yyyy-MM-dd',
} as const;

// Toast durations (ms)
export const TOAST_DURATION = {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 10000,
} as const;

// Debounce delays (ms)
export const DEBOUNCE = {
    SEARCH: 300,
    FORM: 500,
    RESIZE: 100,
} as const;

// Animation durations (ms)
export const ANIMATION = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
} as const;

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
} as const;

// Local storage keys
export const STORAGE_KEYS = {
    AUTH: 'auth-storage',
    THEME: 'theme',
    SIDEBAR_COLLAPSED: 'sidebar-collapsed',
} as const;
