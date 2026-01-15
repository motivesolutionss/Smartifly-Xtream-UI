'use client';

import { Card } from '../Card';
import { Skeleton } from '../Skeleton';
import { HeatmapCell } from './types';

export interface HeatmapProps {
    data: HeatmapCell[];
    dayLabels?: string[];
    hourLabels?: string[];
    isLoading?: boolean;
    title?: string;
    subtitle?: string;
    height?: number;
}

/**
 * Heatmap component for activity pattern visualization
 * Displays a 7-day × 24-hour grid with color intensity based on activity
 */
export function Heatmap({
    data,
    dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    hourLabels,
    isLoading = false,
    title,
    subtitle,
    height = 280,
}: HeatmapProps) {
    if (isLoading) {
        return (
            <Card>
                <div className="p-4">
                    {title && <Skeleton className="h-5 w-40 mb-2" />}
                    <Skeleton className="h-[280px] w-full" />
                </div>
            </Card>
        );
    }

    // Get color based on intensity (0-1)
    const getColor = (intensity: number) => {
        if (intensity === 0) return 'var(--bg-secondary)';
        if (intensity < 0.25) return 'rgba(34, 197, 94, 0.2)';
        if (intensity < 0.5) return 'rgba(34, 197, 94, 0.4)';
        if (intensity < 0.75) return 'rgba(34, 197, 94, 0.6)';
        return 'rgba(34, 197, 94, 0.9)';
    };

    // Generate hour labels (show every 3 hours)
    const displayHourLabels = hourLabels || Array.from({ length: 24 }, (_, i) =>
        i % 3 === 0 ? `${i}:00` : ''
    );

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
                <div className="overflow-x-auto" style={{ maxHeight: height }}>
                    {/* Hour labels */}
                    <div className="flex mb-1 ml-12">
                        {displayHourLabels.map((label, i) => (
                            <div
                                key={i}
                                className="flex-1 text-[10px] text-[var(--text-muted)] text-center min-w-[18px]"
                            >
                                {label}
                            </div>
                        ))}
                    </div>

                    {/* Grid rows */}
                    {dayLabels.map((dayLabel, dayIndex) => (
                        <div key={dayIndex} className="flex items-center mb-1">
                            {/* Day label */}
                            <div className="w-12 text-xs text-[var(--text-muted)] text-right pr-2">
                                {dayLabel}
                            </div>

                            {/* Hour cells */}
                            <div className="flex flex-1 gap-0.5">
                                {Array.from({ length: 24 }, (_, hourIndex) => {
                                    const cell = data.find(
                                        d => d.day === dayIndex && d.hour === hourIndex
                                    );
                                    const intensity = cell?.intensity || 0;
                                    const count = cell?.count || 0;

                                    return (
                                        <div
                                            key={hourIndex}
                                            className="flex-1 min-w-[18px] h-6 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-[var(--primary)] hover:ring-opacity-50"
                                            style={{ backgroundColor: getColor(intensity) }}
                                            title={`${dayLabel} ${hourIndex}:00 - ${count} actions`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center justify-end mt-4 gap-2 text-xs text-[var(--text-muted)]">
                        <span>Less</span>
                        <div className="flex gap-0.5">
                            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'var(--bg-secondary)' }} />
                            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }} />
                            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.4)' }} />
                            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.6)' }} />
                            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.9)' }} />
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
