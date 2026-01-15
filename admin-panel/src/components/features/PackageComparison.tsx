'use client';

import { Card } from '@/components/ui';
import { Badge, Check, X } from 'lucide-react';
import type { Package } from '@/types';
import { cn } from '@/lib/utils';

interface PackageComparisonProps {
    packages: Package[];
    selectedPackages: string[];
    onSelect: (packageId: string) => void;
}

export function PackageComparison({ packages, selectedPackages, onSelect }: PackageComparisonProps) {
    const selected = packages.filter(p => selectedPackages.includes(p.id));
    
    if (selected.length === 0) {
        return (
            <Card className="p-8 text-center text-[var(--text-muted)]">
                Select at least 2 packages to compare
            </Card>
        );
    }

    // Get all unique features across selected packages
    const allFeatures = Array.from(
        new Set(selected.flatMap(p => p.features))
    ).sort();

    return (
        <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border)]">
                            <th className="text-left p-4 font-semibold text-sm text-[var(--text-muted)]">Feature</th>
                            {selected.map(pkg => (
                                <th key={pkg.id} className="text-center p-4 font-semibold text-sm min-w-[200px]">
                                    <div className="space-y-2">
                                        <div className="font-bold text-lg">{pkg.name}</div>
                                        <div className="text-[var(--text-secondary)] text-xs">{pkg.duration}</div>
                                        <div className="text-xl font-bold text-[var(--accent)]">
                                            {pkg.currency === 'USD' ? '$' : pkg.currency} {pkg.price}
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {allFeatures.map((feature, idx) => (
                            <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]/30">
                                <td className="p-4 font-medium">{feature}</td>
                                {selected.map(pkg => (
                                    <td key={pkg.id} className="p-4 text-center">
                                        {pkg.features.includes(feature) ? (
                                            <Check size={20} className="text-green-400 mx-auto" />
                                        ) : (
                                            <X size={20} className="text-red-400 mx-auto" />
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

