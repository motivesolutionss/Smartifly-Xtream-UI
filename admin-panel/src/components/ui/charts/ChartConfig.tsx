'use client';

// Chart color palette
export const CHART_COLORS = {
    primary: '#6366f1',
    secondary: '#a855f7',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
};

export const PIE_COLORS = ['#6366f1', '#a855f7', '#22c55e', '#f59e0b', '#3b82f6'];

// Custom Tooltip Component
export const CustomTooltip = ({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
}) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg">
                <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                        {entry.name}: {entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};
