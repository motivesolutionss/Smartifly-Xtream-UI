// ============================================
// API Response Types
// ============================================

// Generic API response wrapper
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

// Error response
export interface ApiError {
    error: string;
    message?: string;
    statusCode?: number;
}

// Pagination
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Auth types
export interface Admin {
    id: string;
    email: string;
    name: string | null;
    createdAt?: string;
}

export interface LoginResponse {
    token: string;
    refreshToken: string;
    admin: Admin;
}

export interface RefreshTokenResponse {
    token: string;
    refreshToken: string;
}

// Dashboard stats
export interface DashboardStats {
    portals: number;
    tickets: number;
    openTickets: number;
    packages: number;
    announcements: number;
    devices: number;
}

// Health check
export interface HealthCheckResponse {
    status: 'ok' | 'unhealthy';
    db: 'connected' | 'disconnected';
    timestamp: string;
}
