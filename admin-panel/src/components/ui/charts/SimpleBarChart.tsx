'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card } from '../Card';
import { Skeleton } from '../Skeleton';
import { CHART_COLORS, CustomTooltip } from './ChartConfig';
import { BarChartData } from './types';

export interface SimpleBarChartProps {
    data: BarChartData[];
    dataKey?: string;
    xAxisKey?: string;
    color?: keyof typeof CHART_COLORS;
    height?: number;
    isLoading?: boolean;
    title?: string;
    subtitle?: string;
}

/**
 * BarChart component for category comparison
 */
export function SimpleBarChart({
    data,
    dataKey = 'value',
    xAxisKey = 'name',
    color = 'primary',
    height = 200,
    isLoading = false,
    title,
    subtitle,
}: SimpleBarChartProps) {
    const chartColor = CHART_COLORS[color];

    if (isLoading) {
        return (
            <Card>
                <div className="p-4">
                    {title && <Skeleton className="h-5 w-40 mb-2" />}
                    <Skeleton className="h-[200px] w-full" />
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="p-4">
                {(title || subtitle) && (
                    <div className="mb-4">
                        {title && <h3 className="text-lg font-semibold">{title}</h3>}
                        {subtitle && (
                            <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>
                        )}
                    </div>
                )}
                <ResponsiveContainer width="100%" height={height}>
                    <BarChart data={data}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey={xAxisKey}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey={dataKey}
                            fill={chartColor}
                            radius={[4, 4, 0, 0]}
                            name="Value"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
