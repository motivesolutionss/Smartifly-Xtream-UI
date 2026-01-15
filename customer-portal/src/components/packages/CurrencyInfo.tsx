"use client";

import { useCurrency } from '@/contexts/CurrencyContext';
import { Info } from 'lucide-react';
import { CURRENCIES } from '@/lib/currency';

export function CurrencyInfo() {
    const { selectedCurrency, isLoading } = useCurrency();

    if (isLoading) return null;

    const currency = CURRENCIES.find(c => c.code === selectedCurrency);

    if (!currency || selectedCurrency === 'USD') return null;

    return (
        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/20 text-xs text-foreground-muted max-w-fit mx-auto mb-6">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span>
                Prices shown in <span className="font-semibold text-foreground">{currency.name}</span>
            </span>
        </div>
    );
}
