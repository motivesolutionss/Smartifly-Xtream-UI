// ============================================
// Announcement Types
// ============================================

export type AnnouncementType = 'INFO' | 'WARNING' | 'MAINTENANCE' | 'UPDATE';
export type AnnouncementPriority = 'LOW' | 'NORMAL' | 'URGENT';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Announcement {
    id: string;
    title: string;
    content: string;
    type: AnnouncementType;
    priority: AnnouncementPriority;
    status: AnnouncementStatus;
    audience?: string | null; // JSON string
    views: number;
    isActive: boolean;
    scheduledAt?: string | null;
    expiresAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAnnouncementDTO {
    title: string;
    content: string;
    type: AnnouncementType;
    priority: AnnouncementPriority;
    status: AnnouncementStatus;
    audience?: string[]; // Array of roles/ids
    scheduledAt?: string;
    expiresAt?: string;
}

export interface UpdateAnnouncementDTO {
    title?: string;
    content?: string;
    type?: AnnouncementType;
    priority?: AnnouncementPriority;
    status?: AnnouncementStatus;
    audience?: string[];
    isActive?: boolean;
    scheduledAt?: string | null;
    expiresAt?: string | null;
}

export type AnnouncementFormData = CreateAnnouncementDTO;

export const ANNOUNCEMENT_TYPE_OPTIONS = [
    { value: 'INFO', label: 'Information', color: 'blue' },
    { value: 'WARNING', label: 'Warning', color: 'yellow' },
    { value: 'MAINTENANCE', label: 'Maintenance', color: 'orange' },
    { value: 'UPDATE', label: 'Update', color: 'green' },
] as const;
