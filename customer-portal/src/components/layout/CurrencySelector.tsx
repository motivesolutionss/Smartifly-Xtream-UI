"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, DollarSign } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CURRENCIES } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface CurrencySelectorProps {
    className?: string;
}

export function CurrencySelector({ className }: CurrencySelectorProps) {
    const { selectedCurrency, setSelectedCurrency } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);

    const currentCurrency = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

    return (
        <div className={cn("relative", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover-lift-sm transition-all duration-500 glass-card"
            >
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="hidden xl:inline">{currentCurrency.code}</span>
                <ChevronDown className={cn(
                    "w-3 h-3 text-foreground-muted transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-64 glass-card-strong rounded-xl shadow-2xl border border-border/50 z-50 overflow-hidden"
                        >
                            <div className="p-2 max-h-80 overflow-y-auto">
                                <div className="px-3 py-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                                    Select Currency
                                </div>

                                {CURRENCIES.map((currency) => (
                                    <button
                                        key={currency.code}
                                        onClick={() => {
                                            setSelectedCurrency(currency.code);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group",
                                            selectedCurrency === currency.code
                                                ? "bg-primary/20 text-foreground"
                                                : "text-foreground-secondary hover:bg-background-hover hover:text-foreground"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-colors",
                                            selectedCurrency === currency.code
                                                ? "bg-primary/30 text-primary"
                                                : "bg-background-tertiary text-foreground-muted group-hover:bg-background-elevated"
                                        )}>
                                            {currency.symbol}
                                        </div>

                                        <div className="flex-1">
                                            <div className="font-semibold text-sm">{currency.code}</div>
                                            <div className="text-xs text-foreground-muted">{currency.name}</div>
                                        </div>

                                        {selectedCurrency === currency.code && (
                                            <Check className="w-4 h-4 text-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Bottom gradient line */}
                            <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
