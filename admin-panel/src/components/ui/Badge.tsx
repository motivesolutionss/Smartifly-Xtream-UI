import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
    /** Badge content */
    children: ReactNode;
    /** Badge color variant */
    variant?: 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
    /** Badge size */
    size?: 'sm' | 'md';
    /** Optional dot indicator */
    dot?: boolean;
    /** Additional class names */
    className?: string;
}

const variantStyles = {
    default: 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)]',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

const dotStyles = {
    default: 'bg-[var(--text-secondary)]',
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
    purple: 'bg-purple-400',
    gray: 'bg-gray-400',
};

const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
};

/**
 * Badge component for status indicators, tags, and labels
 * 
 * @example
 * <Badge variant="green">Active</Badge>
 * 
 * @example
 * <Badge variant="yellow" dot>In Progress</Badge>
 */
export function Badge({
    children,
    variant = 'default',
    size = 'sm',
    dot = false,
    className,
}: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 font-medium rounded-full border',
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
        >
            {dot && (
                <span
                    className={cn('w-1.5 h-1.5 rounded-full', dotStyles[variant])}
                />
            )}
            {children}
        </span>
    );
}

// Preset badges for common use cases
export function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
        OPEN: { variant: 'blue', label: 'Open' },
        IN_PROGRESS: { variant: 'yellow', label: 'In Progress' },
        RESOLVED: { variant: 'green', label: 'Resolved' },
        CLOSED: { variant: 'gray', label: 'Closed' },
    };

    const config = statusConfig[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
    const priorityConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
        LOW: { variant: 'gray', label: 'Low' },
        MEDIUM: { variant: 'blue', label: 'Medium' },
        HIGH: { variant: 'yellow', label: 'High' },
        URGENT: { variant: 'red', label: 'Urgent' },
    };

    const config = priorityConfig[priority] || { variant: 'default', label: priority };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
    return (
        <Badge variant={isActive ? 'green' : 'gray'} dot>
            {isActive ? 'Active' : 'Inactive'}
        </Badge>
    );
}
