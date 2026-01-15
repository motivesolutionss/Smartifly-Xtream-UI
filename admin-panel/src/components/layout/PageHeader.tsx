'use client';

import { type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface Breadcrumb {
    label: string;
    href?: string;
}

export interface PageHeaderProps {
    /** Page title */
    title: string;
    /** Page description */
    description?: string;
    /** Back navigation href */
    backHref?: string;
    /** Breadcrumb items */
    breadcrumbs?: Breadcrumb[];
    /** Action buttons */
    actions?: ReactNode;
    /** Additional content below header */
    children?: ReactNode;
    /** Additional class names */
    className?: string;
}

/**
 * PageHeader - Consistent page header with breadcrumbs and actions
 * 
 * @example
 * <PageHeader
 *   title="Edit Portal"
 *   breadcrumbs={[
 *     { label: 'Portals', href: '/portals' },
 *     { label: 'Edit' }
 *   ]}
 *   actions={<Button onClick={handleSave}>Save</Button>}
 * />
 */
export function PageHeader({
    title,
    description,
    backHref,
    breadcrumbs,
    actions,
    children,
    className,
}: PageHeaderProps) {
    const router = useRouter();

    return (
        <div className={cn('mb-8', className)}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1 text-sm mb-4" aria-label="Breadcrumb">
                    <Link
                        href="/dashboard"
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <Home size={14} />
                    </Link>
                    {breadcrumbs.map((crumb, index) => (
                        <span key={index} className="flex items-center gap-1">
                            <ChevronRight size={14} className="text-[var(--text-muted)]" />
                            {crumb.href ? (
                                <Link
                                    href={crumb.href}
                                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="text-[var(--text-secondary)]">{crumb.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}

            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {backHref && (
                        <button
                            onClick={() => router.push(backHref)}
                            className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors text-[var(--text-secondary)]"
                            aria-label="Go back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className="flex items-center gap-3">
                        {actions}
                    </div>
                )}
            </div>

            {/* Additional content */}
            {children && (
                <div className="mt-4">
                    {children}
                </div>
            )}
        </div>
    );
}

// Re-export as default for backward compatibility
export default PageHeader;
