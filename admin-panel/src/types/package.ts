// ============================================
// Package Types
// ============================================

export interface PricingTier {
    id: string;
    packageId: string;
    minQuantity: number;
    maxQuantity: number | null;
    price: number;
    discount: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface PackageAnalytics {
    id: string;
    packageId: string;
    views: number;
    purchases: number;
    revenue: number;
    conversionRate: number;
    lastViewedAt: string | null;
    lastPurchasedAt: string | null;
    updatedAt: string;
}

export interface FeatureTemplate {
    id: string;
    name: string;
    description: string | null;
    features: string[];
    category: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Package {
    id: string;
    name: string;
    description: string;
    duration: string;
    price: number;
    currency: string;
    features: string[];
    isPopular: boolean;
    isActive: boolean;
    order: number;
    pricingTiers?: PricingTier[];
    analytics?: PackageAnalytics;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePackageDTO {
    name: string;
    description: string;
    duration: string;
    price: number;
    currency?: string;
    features: string[];
    isPopular?: boolean;
    pricingTiers?: Omit<PricingTier, 'id' | 'packageId' | 'createdAt' | 'updatedAt'>[];
}

export interface UpdatePackageDTO {
    name?: string;
    description?: string;
    duration?: string;
    price?: number;
    currency?: string;
    features?: string[];
    isPopular?: boolean;
    isActive?: boolean;
    order?: number;
    pricingTiers?: Omit<PricingTier, 'id' | 'packageId' | 'createdAt' | 'updatedAt'>[];
}

export type PackageFormData = CreatePackageDTO;

export const DURATION_OPTIONS = [
    { value: '1 Month', label: '1 Month' },
    { value: '3 Months', label: '3 Months' },
    { value: '6 Months', label: '6 Months' },
    { value: '1 Year', label: '1 Year' },
] as const;

export const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
] as const;
