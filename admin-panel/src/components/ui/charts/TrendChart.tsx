'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card } from '../Card';
import { Skeleton } from '../Skeleton';
import { CHART_COLORS, CustomTooltip } from './ChartConfig';

export interface LineChartData {
    name: string;
    value: number;
    [key: string]: string | number;
}

export interface AreaChartProps {
    data: LineChartData[];
    dataKey?: string;
    xAxisKey?: string;
    color?: keyof typeof CHART_COLORS;
    height?: number;
    showGrid?: boolean;
    isLoading?: boolean;
    title?: string;
    subtitle?: string;
}

/**
 * AreaChart component for trend visualization
 */
export function TrendChart({
    data,
    dataKey = 'value',
    xAxisKey = 'name',
    color = 'primary',
    height = 200,
    showGrid = true,
    isLoading = false,
    title,
    subtitle,
}: AreaChartProps) {
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
                    <AreaChart data={data}>
                        {showGrid && (
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--border)"
                                vertical={false}
                            />
                        )}
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
                        <defs>
                            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={chartColor}
                            strokeWidth={2}
                            fill={`url(#gradient-${color})`}
                            name="Value"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
