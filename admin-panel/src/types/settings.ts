// ============================================
// Settings Types
// ============================================

export interface AppSettings {
    id: string;
    maintenanceMode: boolean;
    maintenanceMsg?: string | null;
    latestVersion: string;
    minVersion: string;
    updateUrl?: string | null;
    forceUpdate: boolean;
    contactEmail?: string | null;
    contactPhone?: string | null;
    aboutText?: string | null;
    termsUrl?: string | null;
    privacyUrl?: string | null;
    // Bank details for manual payments
    bankName?: string | null;
    accountTitle?: string | null;
    accountNumber?: string | null;
    iban?: string | null;
    paymentInstructions?: string | null;
    updatedAt: string;
}

export interface UpdateSettingsDTO {
    maintenanceMode?: boolean;
    maintenanceMsg?: string;
    latestVersion?: string;
    minVersion?: string;
    updateUrl?: string;
    forceUpdate?: boolean;
    contactEmail?: string;
    contactPhone?: string;
    aboutText?: string;
    termsUrl?: string;
    privacyUrl?: string;
    // Bank details for manual payments
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    iban?: string;
    paymentInstructions?: string;
}

export type SettingsFormData = UpdateSettingsDTO;

// New Types
export interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MaintenanceWindow {
    id: string;
    startTime: string;
    endTime: string;
    reason?: string;
    status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
    updatedAt: string;
}

export interface Backup {
    id: string;
    filename: string;
    size: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    url?: string;
    createdAt: string;
}

export interface SystemAuditLog {
    id: string;
    adminId?: string;
    action: string;
    resource: string;
    details?: any;
    ipAddress?: string;
    createdAt: string;
}

export interface AuditLogResponse {
    data: SystemAuditLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    }
}
