// ============================================
// Notification Types
// ============================================

export interface Notification {
    id: string;
    title: string;
    body: string;
    data?: Record<string, unknown> | null;
    sentAt?: string;
    sentBy?: string;
    status: 'PENDING' | 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
    scheduledAt?: string;
    error?: string;
    openedAt?: string;
    template?: { name: string };
    segment?: { name: string };
}

export interface NotificationTemplate {
    id: string;
    name: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    imageUrl?: string;
    deepLink?: string;
    category: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationSegment {
    id: string;
    name: string;
    description?: string;
    filters: Record<string, unknown>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DeviceToken {
    id: string;
    token: string;
    platform: 'android' | 'ios' | 'web';
    createdAt: string;
    updatedAt: string;
}

export interface SendNotificationDTO {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    imageUrl?: string;
    deepLink?: string;
    templateId?: string;
    segmentId?: string;
    scheduledAt?: string;
    filters?: Record<string, unknown>;
}

export interface DeviceStats {
    total: number;
    android: number;
    ios: number;
    web: number;
}

export type NotificationFormData = SendNotificationDTO;

