import { cn } from '@/lib/utils';

export interface SkeletonProps {
    /** Additional class names for sizing/shaping */
    className?: string;
    /** Predefined skeleton type */
    variant?: 'text' | 'circular' | 'rectangular';
    /** Width (for text variant, defaults to 100%) */
    width?: string | number;
    /** Height */
    height?: string | number;
}

/**
 * Skeleton loading placeholder component
 * 
 * @example
 * <Skeleton className="h-4 w-32" />
 * 
 * @example
 * <Skeleton variant="circular" className="w-10 h-10" />
 */
export function Skeleton({
    className,
    variant = 'rectangular',
    width,
    height,
}: SkeletonProps) {
    const variantStyles = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-xl',
    };

    return (
        <div
            className={cn(
                'animate-pulse bg-[var(--bg-secondary)]',
                variantStyles[variant],
                className
            )}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
            }}
        />
    );
}

// Preset skeleton layouts
export function SkeletonCard() {
    return (
        <div className="glass-card rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton variant="circular" className="w-12 h-12" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
            </div>
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4 p-4 border-b border-[var(--border)]">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20" />
                </div>
            ))}
        </div>
    );
}

export function SkeletonStats() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl border border-[var(--border)] p-6">
                    <div className="flex justify-between">
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                        <Skeleton variant="circular" className="w-12 h-12" />
                    </div>
                </div>
            ))}
        </div>
    );
}
