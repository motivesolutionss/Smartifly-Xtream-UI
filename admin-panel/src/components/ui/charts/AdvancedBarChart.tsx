'use client';

import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Card } from '../Card';
import { Skeleton } from '../Skeleton';
import { CHART_COLORS, CustomTooltip } from './ChartConfig';

export interface BarChartData {
    name: string;
    value: number;
    secondaryValue?: number;
    [key: string]: string | number | undefined;
}

export interface AdvancedBarChartProps {
    data: BarChartData[];
    primaryDataKey?: string;
    secondaryDataKey?: string;
    xAxisKey?: string;
    primaryColor?: keyof typeof CHART_COLORS;
    secondaryColor?: keyof typeof CHART_COLORS;
    height?: number;
    isLoading?: boolean;
    title?: string;
    subtitle?: string;
    primaryName?: string;
    secondaryName?: string;
}

/**
 * AdvancedBarChart component for rich data visualization
 * Combines bars and lines for dual-metric analysis
 */
export function AdvancedBarChart({
    data,
    primaryDataKey = 'value',
    secondaryDataKey = 'secondaryValue',
    xAxisKey = 'name',
    primaryColor = 'primary',
    secondaryColor = 'secondary',
    height = 250,
    isLoading = false,
    title,
    subtitle,
    primaryName = 'Primary',
    secondaryName = 'Secondary',
}: AdvancedBarChartProps) {
    const pColor = CHART_COLORS[primaryColor];
    const sColor = CHART_COLORS[secondaryColor];

    if (isLoading) {
        return (
            <Card>
                <div className="p-4">
                    {title && <Skeleton className="h-5 w-40 mb-2" />}
                    <Skeleton className="h-[250px] w-full" />
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="p-4">
                {(title || subtitle) && (
                    <div className="mb-6">
                        {title && <h3 className="text-lg font-semibold">{title}</h3>}
                        {subtitle && (
                            <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>
                        )}
                    </div>
                )}
                <ResponsiveContainer width="100%" height={height}>
                    <ComposedChart data={data} barSize={20}>
                        <defs>
                            <linearGradient id={`gradient-bar-${primaryColor}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={pColor} stopOpacity={0.8} />
                                <stop offset="100%" stopColor={pColor} stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
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
                            dy={10}
                        />
                        <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Bar
                            yAxisId="left"
                            dataKey={primaryDataKey}
                            name={primaryName}
                            fill={`url(#gradient-bar-${primaryColor})`}
                            radius={[4, 4, 0, 0]}
                        />
                        {data.some(d => d[secondaryDataKey] !== undefined) && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey={secondaryDataKey}
                                name={secondaryName}
                                stroke={sColor}
                                strokeWidth={2}
                                dot={{ fill: sColor, r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
