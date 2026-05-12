export interface FinanceSummary {
    grossRevenue: number;
    refunds: number;
    netRevenue: number;
    activeSubscriptions: number;
    totalUsers: number;
    totalEntries: number;
}

export interface LedgerEntry {
    id: string;
    type: string;
    userId?: number | null;
    licenseId?: number | null;
    amount: number;
    currency: string;
    status: 'POSTED' | 'VOID';
    note?: string | null;
    createdAt: string;
}

export interface LedgerListResponse {
    items: LedgerEntry[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}
