'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
    /** Unique key for the column */
    key: string;
    /** Column header text */
    header: string;
    /** Function to render cell content */
    cell?: (row: T) => ReactNode;
    /** Whether column is sortable */
    sortable?: boolean;
    /** Column width */
    width?: string;
    /** Align content */
    align?: 'left' | 'center' | 'right';
    /** Whether column is visible */
    visible?: boolean;
}

export interface DataTableProps<T> {
    /** Data to display */
    data: T[];
    /** Column definitions */
    columns: Column<T>[];
    /** Unique key accessor */
    keyAccessor: (row: T) => string;
    /** Loading state */
    isLoading?: boolean;
    /** Search placeholder */
    searchPlaceholder?: string;
    /** Enable search */
    searchable?: boolean;
    /** Search fields to filter on */
    searchFields?: (keyof T)[];
    /** Enable pagination */
    pagination?: boolean;
    /** Items per page */
    pageSize?: number;
    /** Empty state content */
    emptyState?: ReactNode;
    /** Row click handler */
    onRowClick?: (row: T) => void;
    /** External page count for server-side pagination */
    pageCount?: number;
    /** Current page (controlled) */
    page?: number;
    /** Page change handler */
    onPageChange?: (page: number) => void;
    /** Enable server-side pagination mode */
    serverSidePagination?: boolean;
    className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

/**
 * DataTable component with sorting, filtering, and pagination
 * 
 * @example
 * <DataTable
 *   data={tickets}
 *   columns={[
 *     { key: 'ticketNo', header: 'Ticket #', sortable: true },
 *     { key: 'subject', header: 'Subject' },
 *     { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
 *   ]}
 *   keyAccessor={(row) => row.id}
 *   searchable
 *   searchFields={['ticketNo', 'subject', 'email']}
 *   pagination
 *   pageSize={10}
 * />
 */
export function DataTable<T extends object>({
    data,
    columns,
    keyAccessor,
    isLoading = false,
    searchPlaceholder = 'Search...',
    searchable = false,
    searchFields = [],
    pagination = false,
    pageSize = 10,
    emptyState,
    onRowClick,
    className,
    page,
    pageCount,
    onPageChange,
    serverSidePagination,
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [internalPage, setInternalPage] = useState(1);

    const currentPage = page ?? internalPage;
    const totalPages = pageCount ?? Math.ceil(data.length / pageSize);

    // Filter columns to only visible ones
    const visibleColumns = columns.filter((col) => col.visible !== false);

    // Filter data based on search
    const filteredData = useMemo(() => {
        if (!searchQuery || searchFields.length === 0) return data;

        const query = searchQuery.toLowerCase();
        return data.filter((row) =>
            searchFields.some((field) => {
                const value = (row as Record<string, unknown>)[field as string];
                if (value == null) return false;
                return String(value).toLowerCase().includes(query);
            })
        );
    }, [data, searchQuery, searchFields]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortKey || !sortDirection) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aVal = (a as Record<string, unknown>)[sortKey];
            const bVal = (b as Record<string, unknown>)[sortKey];

            if (aVal == null) return 1;
            if (bVal == null) return -1;

            const comparison = String(aVal).localeCompare(String(bVal), undefined, {
                numeric: true,
                sensitivity: 'base',
            });

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortKey, sortDirection]);

    // Paginate data
    const paginatedData = useMemo(() => {
        if (serverSidePagination) return sortedData; // Data is already paginated by server
        if (!pagination) return sortedData;

        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, pagination, currentPage, pageSize, serverSidePagination]);

    // Handle page change
    const handlePageChange = (p: number) => {
        const newPage = Math.max(1, Math.min(p, totalPages));
        if (onPageChange) {
            onPageChange(newPage);
        } else {
            setInternalPage(newPage);
        }
    };

    // Handle sort
    const handleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortKey(null);
                setSortDirection(null);
            }
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    // Reset to first page when search changes
    // Reset to first page when search changes
    const handleSearch = (value: string) => {
        setSearchQuery(value);
        if (onPageChange) {
            onPageChange(1);
        } else {
            setInternalPage(1);
        }
    };

    // Render sort icon
    const renderSortIcon = (key: string) => {
        if (sortKey !== key) {
            return <ChevronsUpDown size={14} className="opacity-50" />;
        }
        if (sortDirection === 'asc') {
            return <ChevronUp size={14} />;
        }
        return <ChevronDown size={14} />;
    };

    if (isLoading) {
        return (
            <div className={cn('glass-card rounded-2xl border border-[var(--border)] overflow-hidden', className)}>
                {searchable && (
                    <div className="p-4 border-b border-[var(--border)]">
                        <Skeleton className="h-10 w-64" />
                    </div>
                )}
                <div className="divide-y divide-[var(--border)]">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex gap-4 p-4">
                            {visibleColumns.map((col) => (
                                <Skeleton key={col.key} className="h-4 flex-1" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={cn('glass-card rounded-2xl border border-[var(--border)] overflow-hidden', className)}>
            {/* Search */}
            {searchable && (
                <div className="p-4 border-b border-[var(--border)]">
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        leftIcon={<Search size={16} />}
                        fullWidth={false}
                        className="max-w-xs"
                    />
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                            {visibleColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className={cn(
                                        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]',
                                        column.sortable && 'cursor-pointer select-none hover:text-[var(--text-primary)]',
                                        column.align === 'center' && 'text-center',
                                        column.align === 'right' && 'text-right'
                                    )}
                                    style={{ width: column.width }}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>{column.header}</span>
                                        {column.sortable && renderSortIcon(column.key)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns.length} className="py-12">
                                    {emptyState || (
                                        <EmptyState
                                            title="No data found"
                                            description={searchQuery ? 'Try adjusting your search' : undefined}
                                        />
                                    )}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row) => (
                                <tr
                                    key={keyAccessor(row)}
                                    className={cn(
                                        'transition-colors hover:bg-[var(--bg-secondary)]',
                                        onRowClick && 'cursor-pointer'
                                    )}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {visibleColumns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={cn(
                                                'px-4 py-3 text-sm text-[var(--text-primary)]',
                                                column.align === 'center' && 'text-center',
                                                column.align === 'right' && 'text-right'
                                            )}
                                        >
                                            {column.cell
                                                ? column.cell(row)
                                                : ((row as Record<string, unknown>)[column.key] as ReactNode) ?? '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
                    <p className="text-sm text-[var(--text-secondary)]">
                        Showing {(currentPage - 1) * pageSize + 1} to{' '}
                        {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <span className="text-sm text-[var(--text-secondary)]">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
