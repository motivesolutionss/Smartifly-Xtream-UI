// ============================================
// Portal Types
// ============================================

export interface Portal {
    id: string;
    displayId: number;
    name: string;
    url: string;
    username?: string | null;
    password?: string | null;
    order: number;
    isActive: boolean;
    description?: string | null;
    category: string;
    healthStatus: 'ONLINE' | 'OFFLINE' | 'UNSTABLE' | 'UNKNOWN';
    lastCheckAt?: string;
    latency?: number;
    uptime?: number;
    activeConnections: number;
    errorCount: number;
    serverIp: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePortalDTO {
    name: string;
    url: string;
    username?: string;
    password?: string;
    description?: string;
    category?: string;
    serverIp?: string;
}

export interface UpdatePortalDTO {
    name?: string;
    url?: string;
    username?: string;
    password?: string;
    description?: string;
    isActive?: boolean;
    order?: number;
    category?: string;
    serverIp?: string;
}

export type PortalFormData = CreatePortalDTO;
