export interface UserSummary {
    id: number;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN' | 'RESELLER';
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserListResponse {
    items: UserSummary[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface UserStats {
    total: number;
    active: number;
    suspended: number;
}
