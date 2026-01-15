import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /** Card content */
    children: ReactNode;
    /** Additional class names */
    className?: string;
    /** Add hover effect */
    hoverable?: boolean;
    /** Add padding */
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export interface CardHeaderProps {
    /** Header content */
    children: ReactNode;
    /** Additional class names */
    className?: string;
    /** Actions to show on right side */
    actions?: ReactNode;
}

export interface CardBodyProps {
    /** Body content */
    children: ReactNode;
    /** Additional class names */
    className?: string;
}

export interface CardFooterProps {
    /** Footer content */
    children: ReactNode;
    /** Additional class names */
    className?: string;
}

const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

/**
 * Card component with glassmorphism styling
 * 
 * @example
 * <Card>
 *   <CardHeader actions={<Button size="sm">Edit</Button>}>
 *     <h3>Portal Details</h3>
 *   </CardHeader>
 *   <CardBody>
 *     Content goes here
 *   </CardBody>
 *   <CardFooter>
 *     <Button>Save</Button>
 *   </CardFooter>
 * </Card>
 */
export function Card({
    children,
    className,
    hoverable = false,
    padding = 'none',
    ...props
}: CardProps) {
    return (
        <div
            className={cn(
                'glass-card rounded-2xl border border-[var(--border)]',
                'bg-[var(--bg-card)] backdrop-blur-xl',
                hoverable && 'transition-all duration-300 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5',
                paddingStyles[padding],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className, actions }: CardHeaderProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-between p-6 border-b border-[var(--border)]',
                className
            )}
        >
            <div className="flex-1">{children}</div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}

export function CardBody({ children, className }: CardBodyProps) {
    return (
        <div className={cn('p-6', className)}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className }: CardFooterProps) {
    return (
        <div
            className={cn(
                'flex items-center justify-end gap-3 p-6 border-t border-[var(--border)]',
                className
            )}
        >
            {children}
        </div>
    );
}

// Stats Card variant for dashboard
export interface StatsCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function StatsCard({ title, value, icon, trend, className }: StatsCardProps) {
    return (
        <Card className={cn('p-6', className)} hoverable>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-[var(--text-secondary)]">{title}</p>
                    <p className="text-3xl font-bold mt-2">{value}</p>
                    {trend && (
                        <p
                            className={cn(
                                'text-sm mt-2',
                                trend.isPositive ? 'text-green-400' : 'text-red-400'
                            )}
                        >
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400">
                        {icon}
                    </div>
                )}
            </div>
        </Card>
    );
}

// Color scheme configurations for InteractiveStatsCard
const colorSchemes = {
    blue: {
        border: 'border-blue-500/20 hover:border-blue-500/40',
        bg: 'from-blue-500/5 to-cyan-500/5 group-hover:from-blue-500/10 group-hover:to-cyan-500/10',
        icon: 'from-blue-500/20 to-cyan-500/20',
        text: 'text-blue-400',
    },
    yellow: {
        border: 'border-yellow-500/20 hover:border-yellow-500/40',
        bg: 'from-yellow-500/5 to-orange-500/5 group-hover:from-yellow-500/10 group-hover:to-orange-500/10',
        icon: 'from-yellow-500/20 to-orange-500/20',
        text: 'text-yellow-400',
    },
    green: {
        border: 'border-green-500/20 hover:border-green-500/40',
        bg: 'from-green-500/5 to-emerald-500/5 group-hover:from-green-500/10 group-hover:to-emerald-500/10',
        icon: 'from-green-500/20 to-emerald-500/20',
        text: 'text-green-400',
    },
    gray: {
        border: 'border-gray-500/20 hover:border-gray-500/40',
        bg: 'from-gray-500/5 to-slate-500/5 group-hover:from-gray-500/10 group-hover:to-slate-500/10',
        icon: 'from-gray-500/20 to-slate-500/20',
        text: 'text-gray-400',
    },
    red: {
        border: 'border-red-500/20 hover:border-red-500/40',
        bg: 'from-red-500/5 to-rose-500/5 group-hover:from-red-500/10 group-hover:to-rose-500/10',
        icon: 'from-red-500/20 to-rose-500/20',
        text: 'text-red-400',
    },
    purple: {
        border: 'border-purple-500/20 hover:border-purple-500/40',
        bg: 'from-purple-500/5 to-violet-500/5 group-hover:from-purple-500/10 group-hover:to-violet-500/10',
        icon: 'from-purple-500/20 to-violet-500/20',
        text: 'text-purple-400',
    },
    indigo: {
        border: 'border-indigo-500/20 hover:border-indigo-500/40',
        bg: 'from-indigo-500/5 to-blue-500/5 group-hover:from-indigo-500/10 group-hover:to-blue-500/10',
        icon: 'from-indigo-500/20 to-blue-500/20',
        text: 'text-indigo-400',
    },
};

export type ColorScheme = keyof typeof colorSchemes;

export interface InteractiveStatsCardProps {
    /** Card title/label */
    title: string;
    /** Value to display (number or string) */
    value: string | number;
    /** Icon element to display */
    icon: ReactNode;
    /** Color scheme for the card */
    colorScheme?: ColorScheme;
    /** Click handler for filtering/interactivity */
    onClick?: () => void;
    /** Whether the card is currently active/selected */
    isActive?: boolean;
    /** Additional class names */
    className?: string;
}

/**
 * Interactive Stats Card with color schemes and click support
 * 
 * @example
 * <InteractiveStatsCard
 *     title="Open Tickets"
 *     value={stats.open}
 *     icon={<AlertCircle size={20} />}
 *     colorScheme="blue"
 *     onClick={() => setFilter('OPEN')}
 *     isActive={filter === 'OPEN'}
 * />
 */
export function InteractiveStatsCard({
    title,
    value,
    icon,
    colorScheme = 'blue',
    onClick,
    isActive = false,
    className,
}: InteractiveStatsCardProps) {
    const colors = colorSchemes[colorScheme];

    return (
        <Card
            className={cn(
                'group relative overflow-hidden transition-all duration-300',
                colors.border,
                onClick && 'cursor-pointer',
                isActive && 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)]',
                isActive && colors.text.replace('text-', 'ring-'),
                className
            )}
        >
            {/* Gradient background */}
            <div className={cn(
                'absolute inset-0 bg-gradient-to-br transition-all duration-300',
                colors.bg
            )} />

            {/* Content */}
            <div
                className="relative p-4 flex items-center gap-3"
                onClick={onClick}
            >
                {/* Icon */}
                <div className={cn(
                    'w-11 h-11 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0',
                    'group-hover:scale-110 transition-transform duration-300',
                    colors.icon
                )}>
                    <span className={colors.text}>{icon}</span>
                </div>

                {/* Text */}
                <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        {title}
                    </p>
                    <h3 className={cn('text-2xl font-bold', colors.text)}>
                        {value}
                    </h3>
                </div>
            </div>
        </Card>
    );
}

