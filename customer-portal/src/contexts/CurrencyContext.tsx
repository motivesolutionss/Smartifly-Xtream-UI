"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchExchangeRates, ExchangeRates, CURRENCIES } from '@/lib/currency';
import { logger } from '@/lib/logger';

interface CurrencyContextType {
    selectedCurrency: string;
    setSelectedCurrency: (currency: string) => void;
    exchangeRates: ExchangeRates;
    isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = 'preferred-currency';

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [selectedCurrency, setSelectedCurrencyState] = useState<string>('USD');
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});
    const [isLoading, setIsLoading] = useState(true);

    // Load preferred currency from localStorage on mount (SSR-safe)
    useEffect(() => {
        // Check if window exists (client-side only)
        if (typeof window === 'undefined') return;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && CURRENCIES.some(c => c.code === saved)) {
            setSelectedCurrencyState(saved);
        }
    }, []);

    // Fetch exchange rates on mount
    useEffect(() => {
        let isMounted = true;
        
        async function loadRates() {
            if (!isMounted) return;
            setIsLoading(true);
            
            try {
                const rates = await fetchExchangeRates();
                if (isMounted) {
                    setExchangeRates(rates);
                }
            } catch (error) {
                if (isMounted) {
                    logger.error('Failed to load exchange rates:', error);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }
        
        loadRates();
        
        // Cleanup function to prevent state updates on unmounted component
        return () => {
            isMounted = false;
        };
    }, []);

    const setSelectedCurrency = (currency: string) => {
        setSelectedCurrencyState(currency);

        // SSR-safe: only write to localStorage on client-side
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, currency);
        }
    };

    return (
        <CurrencyContext.Provider
            value={{
                selectedCurrency,
                setSelectedCurrency,
                exchangeRates,
                isLoading,
            }}
        >
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}
