'use client';

import { Card, CardHeader, CardBody } from '@/components/ui';
import { SimpleBarChart, TrendChart } from '@/components/ui';
import type { PackageAnalytics } from '@/types';
import { TrendingUp, Eye, ShoppingCart, DollarSign } from 'lucide-react';

interface PackageAnalyticsProps {
    analytics: Array<PackageAnalytics & { package: { id: string; name: string; price: number; currency: string } }>;
}

export function PackageAnalytics({ analytics }: PackageAnalyticsProps) {
    const totalViews = analytics.reduce((sum, a) => sum + a.views, 0);
    const totalPurchases = analytics.reduce((sum, a) => sum + a.purchases, 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);
    const avgConversionRate = analytics.length > 0
        ? analytics.reduce((sum, a) => sum + a.conversionRate, 0) / analytics.length
        : 0;

    // Prepare chart data
    const revenueData = analytics
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(a => ({
            name: a.package.name,
            value: a.revenue,
        }));

    const popularityData = analytics
        .sort((a, b) => b.views - a.views)
        .slice(0, 7)
        .map(a => ({
            name: a.package.name,
            value: a.views,
        }));

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardBody className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total Views</p>
                                <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <Eye size={24} className="text-blue-400" />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total Purchases</p>
                                <p className="text-2xl font-bold">{totalPurchases.toLocaleString()}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <ShoppingCart size={24} className="text-green-400" />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Total Revenue</p>
                                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <DollarSign size={24} className="text-purple-400" />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Avg Conversion</p>
                                <p className="text-2xl font-bold">{avgConversionRate.toFixed(1)}%</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                <TrendingUp size={24} className="text-yellow-400" />
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold">Top Revenue Packages</h3>
                    </CardHeader>
                    <CardBody>
                        <SimpleBarChart
                            data={revenueData}
                            color="success"
                            height={250}
                        />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold">Most Popular Packages</h3>
                    </CardHeader>
                    <CardBody>
                        <SimpleBarChart
                            data={popularityData}
                            color="primary"
                            height={250}
                        />
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

