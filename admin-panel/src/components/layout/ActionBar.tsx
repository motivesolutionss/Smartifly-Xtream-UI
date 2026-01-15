'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Search, Filter, X, ChevronDown, Trash2, Download, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';

export interface FilterOption {
    key: string;
    label: string;
    options: { value: string; label: string }[];
}

export interface ActionBarProps {
    /** Search configuration */
    search?: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
    };
    /** Filter options */
    filters?: FilterOption[];
    /** Active filter values */
    activeFilters?: Record<string, string>;
    /** Filter change handler */
    onFilterChange?: (key: string, value: string) => void;
    /** Clear all filters */
    onClearFilters?: () => void;
    /** Selected items count (for bulk actions) */
    selectedCount?: number;
    /** Bulk action handlers */
    bulkActions?: {
        onDelete?: () => void;
        onExport?: () => void;
        custom?: DropdownItem[];
    };
    /** Primary action button */
    primaryAction?: ReactNode;
    /** Additional class names */
    className?: string;
}

/**
 * ActionBar - Search, filters, and bulk actions toolbar
 * 
 * @example
 * <ActionBar
 *   search={{
 *     value: searchQuery,
 *     onChange: setSearchQuery,
 *     placeholder: "Search tickets..."
 *   }}
 *   filters={[
 *     { key: 'status', label: 'Status', options: statusOptions }
 *   ]}
 *   activeFilters={activeFilters}
 *   onFilterChange={handleFilterChange}
 *   selectedCount={selectedRows.length}
 *   bulkActions={{ onDelete: handleBulkDelete }}
 *   primaryAction={<Button>Add New</Button>}
 * />
 */
export function ActionBar({
    search,
    filters = [],
    activeFilters = {},
    onFilterChange,
    onClearFilters,
    selectedCount = 0,
    bulkActions,
    primaryAction,
    className,
}: ActionBarProps) {
    const [showFilters, setShowFilters] = useState(false);

    const hasActiveFilters = Object.values(activeFilters).some((v) => v !== '' && v !== undefined);
    const hasBulkSelection = selectedCount > 0;

    // Build bulk action dropdown items
    const bulkActionItems: DropdownItem[] = [];
    if (bulkActions?.onDelete) {
        bulkActionItems.push({
            key: 'delete',
            label: 'Delete Selected',
            icon: <Trash2 size={14} />,
            onClick: bulkActions.onDelete,
            destructive: true,
        });
    }
    if (bulkActions?.onExport) {
        bulkActionItems.push({
            key: 'export',
            label: 'Export Selected',
            icon: <Download size={14} />,
            onClick: bulkActions.onExport,
        });
    }
    if (bulkActions?.custom) {
        bulkActionItems.push(...bulkActions.custom);
    }

    return (
        <div className={cn('space-y-4', className)}>
            {/* Main toolbar */}
            <div className="flex items-center gap-4">
                {/* Bulk actions (shown when items selected) */}
                {hasBulkSelection && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                        <span className="text-sm font-medium text-indigo-400">
                            {selectedCount} selected
                        </span>
                        {bulkActionItems.length > 0 && (
                            <Dropdown
                                trigger={
                                    <Button variant="ghost" size="sm">
                                        <MoreHorizontal size={16} />
                                    </Button>
                                }
                                items={bulkActionItems}
                            />
                        )}
                    </div>
                )}

                {/* Search */}
                {search && !hasBulkSelection && (
                    <div className="flex-1 max-w-sm">
                        <Input
                            value={search.value}
                            onChange={(e) => search.onChange(e.target.value)}
                            placeholder={search.placeholder || 'Search...'}
                            leftIcon={<Search size={16} />}
                            rightIcon={
                                search.value ? (
                                    <button
                                        onClick={() => search.onChange('')}
                                        className="p-0.5 hover:bg-[var(--bg-secondary)] rounded"
                                    >
                                        <X size={14} />
                                    </button>
                                ) : undefined
                            }
                        />
                    </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Filter toggle */}
                {filters.length > 0 && !hasBulkSelection && (
                    <Button
                        variant={showFilters || hasActiveFilters ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        leftIcon={<Filter size={16} />}
                    >
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-500 text-white rounded-full">
                                {Object.values(activeFilters).filter((v) => v).length}
                            </span>
                        )}
                    </Button>
                )}

                {/* Primary action */}
                {primaryAction}
            </div>

            {/* Filter bar */}
            {showFilters && filters.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl animate-fadeIn">
                    {filters.map((filter) => (
                        <div key={filter.key} className="flex items-center gap-2">
                            <span className="text-sm text-[var(--text-secondary)]">
                                {filter.label}:
                            </span>
                            <div className="relative">
                                <select
                                    value={activeFilters[filter.key] || ''}
                                    onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                                    className="appearance-none px-3 py-1.5 pr-8 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    <option value="">All</option>
                                    {filter.options.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={14}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"
                                />
                            </div>
                        </div>
                    ))}

                    {hasActiveFilters && (
                        <button
                            onClick={onClearFilters}
                            className="ml-auto text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
