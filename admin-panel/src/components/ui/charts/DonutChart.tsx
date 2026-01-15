'use client';

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card } from '../Card';
import { Skeleton } from '../Skeleton';
import { CHART_COLORS, PIE_COLORS, CustomTooltip } from './ChartConfig';
import { DonutChartData } from './types';

export interface DonutChartProps {
    data: DonutChartData[];
    height?: number;
    isLoading?: boolean;
    title?: string;
    subtitle?: string;
    showLegend?: boolean;
}

/**
 * DonutChart component for part-to-whole visualization
 */
export function DonutChart({
    data,
    height = 200,
    isLoading = false,
    title,
    subtitle,
    showLegend = true,
}: DonutChartProps) {
    if (isLoading) {
        return (
            <Card>
                <div className="p-4">
                    {title && <Skeleton className="h-5 w-40 mb-2" />}
                    <Skeleton className="h-[200px] w-full rounded-full" />
                </div>
            </Card>
        );
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);

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
                <div className="flex items-center gap-4">
                    <ResponsiveContainer width={height} height={height}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="80%"
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    {showLegend && (
                        <div className="flex-1 space-y-2">
                            {data.map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{
                                                backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                                            }}
                                        />
                                        <span className="text-sm text-[var(--text-secondary)]">
                                            {item.name}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
