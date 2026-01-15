import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
    /** Icon to display */
    icon?: ReactNode;
    /** Title text */
    title: string;
    /** Description text */
    description?: string;
    /** Action button */
    action?: {
        label: string;
        onClick: () => void;
    };
    /** Additional class names */
    className?: string;
}

/**
 * EmptyState component for when there's no data to display
 * 
 * @example
 * <EmptyState
 *   icon={<Globe size={48} />}
 *   title="No portals yet"
 *   description="Get started by creating your first portal"
 *   action={{
 *     label: "Add Portal",
 *     onClick: () => setShowModal(true)
 *   }}
 * />
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-12 px-6 text-center',
                className
            )}
        >
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-muted)] mb-4">
                {icon || <Inbox size={48} />}
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
                    {description}
                </p>
            )}
            {action && (
                <Button onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}
