'use client';

import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
    Button,
    Card,
    Modal,
    StatusBadge,
    PriorityBadge,
    EmptyState,
    Textarea,
    Checkbox,
    Badge,
    Tooltip,
    InteractiveStatsCard,
    Input,
    Select,
    Dropdown,
} from '@/components/ui';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';
import { ConfirmModal } from '@/components/ui/Modal';
import {
    usePaginatedTickets,
    useReplyTicket,
    useUpdateTicketStatus,
    useTicketTemplates,
    useUpdateTicketTags,
    useUploadAttachments,
    useTicketStats,
} from '@/hooks';
import type { Ticket, TicketTemplate } from '@/types';
import toast from 'react-hot-toast';
import {
    MoreVertical,
    Trash,
    Send,
    RefreshCw,
    Download,
    AlertCircle,
    Loader2,
    CheckCheck,
    XCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    Tag,
    Clock,
    CheckCircle,
    Trash2,
    MessageSquare,
    Eye,
    FileText,
    Paperclip,
    Plus,
    Columns,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
import { formatRelativeTime, cn } from '@/lib/utils';
import { ticketsApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export default function TicketsPage() {

    // State for params
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Ticket; direction: 'asc' | 'desc' } | null>(null);

    // Data Fetching
    const { data: paginatedResponse, isLoading, error, refetch } = usePaginatedTickets(
        currentPage,
        entriesPerPage,
        {
            status: statusFilter as any,
            priority: priorityFilter as any,
            search: searchQuery,
            sortBy: sortConfig?.key,
            sortDir: sortConfig?.direction,
        }
    );

    const tickets = paginatedResponse?.data || [];
    const meta = paginatedResponse?.pagination;

    const { data: statsData } = useTicketStats(); // For Stats Cards - counts ALL tickets
    const { mutate: updateStatusMutation } = useUpdateTicketStatus();
    const { mutate: updateTagsMutation } = useUpdateTicketTags();
    const replyMutation = useReplyTicket();
    const uploadAttachmentsMutation = useUploadAttachments();
    const { data: templates } = useTicketTemplates();

    // Local state
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'single' | 'bulk'; ticketId?: string }>({
        isOpen: false,
        type: 'single'
    });
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Handlers
    const handleSort = (key: keyof Ticket) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(tickets.map(t => t.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectTicket = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(tid => tid !== id));
        }
    };
    const queryClient = useQueryClient();


    // Stats
    // Stats from dedicated endpoint (counts ALL tickets, not date-filtered)
    const stats = useMemo(() => {
        const dist = statsData?.statusDistribution || [];
        const findCount = (name: string) => dist.find(d => d.name === name)?.value || 0;

        const open = findCount('OPEN');
        const inProgress = findCount('IN_PROGRESS');
        const resolved = findCount('RESOLVED');
        const closed = findCount('CLOSED');
        const total = statsData?.total || (open + inProgress + resolved + closed);

        return { open, inProgress, resolved, closed, total };
    }, [statsData]);

    // Sorting & Columns

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
        select: true,
        ticketNo: true,
        subject: true,
        customer: true,
        priority: true,
        status: true,
        sla: true,
        created: true,
        actions: true,
    });

    // Use server tickets directly
    const filteredTickets = tickets;

    const handleConfirmDelete = async () => {
        if (!confirmModal.ticketId && selectedIds.length === 0) return;

        setIsBulkLoading(true);
        try {
            if (confirmModal.type === 'single' && confirmModal.ticketId) {
                await ticketsApi.delete(confirmModal.ticketId);
                toast.success('Ticket deleted');
            } else if (confirmModal.type === 'bulk') {
                await ticketsApi.bulkAction(selectedIds, 'delete');
                toast.success(`Deleted ${selectedIds.length} tickets`);
                setSelectedIds([]);
            }
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        } catch {
            toast.error('Failed to delete ticket(s)');
        } finally {
            setIsBulkLoading(false);
            setConfirmModal({ isOpen: false, type: 'single' });
        }
    };

    // Pagination
    // Pagination from Server Meta
    const totalPages = meta?.totalPages || 1;
    const paginatedTickets = tickets; // Tickets are already paginated
    const startEntry = meta ? (meta.page - 1) * meta.limit + 1 : 0;
    const endEntry = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

    // Selection handlers
    const toggleSelectAll = () => {
        if (selectedIds.length === paginatedTickets.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedTickets.map(t => t.id));
        }
    };

    const toggleSelect = (id: string, checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(i => i !== id));
        }
    };

    // SLA helper
    const getSlaStatus = (ticket: Ticket) => {
        if (ticket.firstResponseAt) return 'responded';
        const createdAt = new Date(ticket.createdAt);
        const now = new Date();
        const hoursWaiting = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursWaiting > 24) return 'overdue';
        if (hoursWaiting > 12) return 'warning';
        return 'ok';
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await updateStatusMutation({ id, status: status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' });
            toast.success('Status updated');
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleBulkAction = async (action: 'close' | 'resolve' | 'delete') => {
        if (selectedIds.length === 0) return;

        if (action === 'delete') {
            setConfirmModal({ isOpen: true, type: 'bulk' });
            return;
        }

        setIsBulkLoading(true);
        try {
            await ticketsApi.bulkAction(selectedIds, action);
            toast.success(`${action} completed for ${selectedIds.length} tickets`);
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        } catch {
            toast.error(`Failed to ${action} tickets`);
        } finally {
            setIsBulkLoading(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await ticketsApi.export();
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tickets-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Tickets exported successfully');
        } catch {
            toast.error('Failed to export tickets');
        } finally {
            setIsExporting(false);
        }
    };

    // const uploadAttachmentsMutation = useUploadAttachments(); // This line was duplicated, removed.

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <PageHeader
                    title="Support Tickets"
                    description="Manage customer support requests"
                    actions={
                        <div className="flex items-center gap-2">
                            <Tooltip content="Refresh">
                                <Button variant="secondary" onClick={() => refetch()}>
                                    <RefreshCw size={18} />
                                </Button>
                            </Tooltip>
                            <Button
                                variant="secondary"
                                leftIcon={<Download size={18} />}
                                onClick={handleExport}
                                isLoading={isExporting}
                            >
                                Export
                            </Button>
                        </div>
                    }
                />

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InteractiveStatsCard
                        title="Open"
                        value={stats.open}
                        icon={<AlertCircle size={20} />}
                        colorScheme="blue"
                        onClick={() => setStatusFilter(statusFilter === 'OPEN' ? '' : 'OPEN')}
                        isActive={statusFilter === 'OPEN'}
                    />
                    <InteractiveStatsCard
                        title="In Progress"
                        value={stats.inProgress}
                        icon={<Loader2 size={20} />}
                        colorScheme="yellow"
                        onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')}
                        isActive={statusFilter === 'IN_PROGRESS'}
                    />
                    <InteractiveStatsCard
                        title="Resolved"
                        value={stats.resolved}
                        icon={<CheckCheck size={20} />}
                        colorScheme="green"
                        onClick={() => setStatusFilter(statusFilter === 'RESOLVED' ? '' : 'RESOLVED')}
                        isActive={statusFilter === 'RESOLVED'}
                    />
                    <InteractiveStatsCard
                        title="Closed"
                        value={stats.closed}
                        icon={<XCircle size={20} />}
                        colorScheme="gray"
                        onClick={() => setStatusFilter(statusFilter === 'CLOSED' ? '' : 'CLOSED')}
                        isActive={statusFilter === 'CLOSED'}
                    />
                </div>

                {/* Controls Bar */}
                <Card className="p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-[var(--bg-secondary)]/80 to-[var(--bg-secondary)]/40 backdrop-blur-sm">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between p-4">
                            {/* Left: Entries + Filters */}
                            <div className="flex items-center gap-6 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[var(--text-muted)]">Show</span>
                                    <select
                                        value={entriesPerPage}
                                        onChange={(e) => {
                                            setEntriesPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="h-9 px-3 text-sm font-medium bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all cursor-pointer"
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>

                                <div className="h-6 w-px bg-[var(--border)]" />

                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[var(--text-muted)]">Priority:</span>
                                    <select
                                        value={priorityFilter}
                                        onChange={(e) => {
                                            setPriorityFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="h-9 px-3 text-sm font-medium bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">All</option>
                                        <option value="URGENT">Urgent</option>
                                        <option value="HIGH">High</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="LOW">Low</option>
                                    </select>
                                </div>
                            </div>

                            {/* Right: Search & Columns */}
                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                <div className="relative w-full lg:w-80">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search tickets..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full h-10 pl-11 pr-10 text-sm bg-[var(--bg-primary)] border-2 border-[var(--border)] rounded-xl focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 outline-none transition-all placeholder:text-[var(--text-muted)] font-medium"
                                    />
                                </div>
                                <Dropdown
                                    trigger={
                                        <Button variant="secondary" className="h-10 px-3">
                                            <Columns size={18} />
                                        </Button>
                                    }
                                    items={[
                                        { key: 'header', label: 'Column Visibility', type: 'header' },
                                        {
                                            key: 'ticketNo',
                                            label: 'Ticket No',
                                            checked: visibleColumns.ticketNo,
                                            onClick: () => setVisibleColumns(prev => ({ ...prev, ticketNo: !prev.ticketNo }))
                                        },
                                        {
                                            key: 'subject',
                                            label: 'Subject',
                                            checked: visibleColumns.subject,
                                            onClick: () => setVisibleColumns(prev => ({ ...prev, subject: !prev.subject }))
                                        },
                                        {
                                            key: 'customer',
                                            label: 'Customer',
                                            checked: visibleColumns.customer,
                                            onClick: () => setVisibleColumns(prev => ({ ...prev, customer: !prev.customer }))
                                        },
                                        {
                                            key: 'priority',
                                            label: 'Priority',
                                            checked: visibleColumns.priority,
                                            onClick: () => setVisibleColumns(prev => ({ ...prev, priority: !prev.priority }))
                                        },
                                        {
                                            key: 'status',
                                            label: 'Status',
                                            checked: visibleColumns.status,
                                            onClick: () => setVisibleColumns(prev => ({ ...prev, status: !prev.status }))
                                        },
                                        {
                                            key: 'sla',
                                            label: 'SLA',
                                            checked: visibleColumns.sla,
                                            onClick: () => setVisibleColumns(prev => ({ ...prev, sla: !prev.sla }))
                                        },
                                        {
                                            key: 'created',
                                            label: 'Created',
                                            checked: visibleColumns.created,
                                            onClick: () => setVisibleColumns(prev => ({ ...prev, created: !prev.created }))
                                        }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && (
                    <div className="sticky top-4 z-10 flex items-center gap-2 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)] shadow-xl animate-in fade-in slide-in-from-top-4 w-fit mx-auto">
                        <span className="text-sm px-3 font-medium">{selectedIds.length} selected</span>
                        <div className="h-4 w-px bg-[var(--border)]" />
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() => handleBulkAction('resolve')}
                            disabled={isBulkLoading}
                        >
                            <CheckCircle size={14} className="mr-1" /> Resolve
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                            onClick={() => handleBulkAction('close')}
                            disabled={isBulkLoading}
                        >
                            <XCircle size={14} className="mr-1" /> Close
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleBulkAction('delete')}
                            disabled={isBulkLoading}
                        >
                            <Trash2 size={14} className="mr-1" /> Delete
                        </Button>
                    </div>
                )}

                {/* Table */}
                {error ? (
                    <div className="text-center py-12 text-red-400">
                        Failed to load tickets
                    </div>
                ) : isLoading ? (
                    <Card className="p-8 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
                    </Card>
                ) : filteredTickets.length === 0 ? (
                    <EmptyState
                        icon={<MessageSquare size={48} />}
                        title="No tickets found"
                        description="There are no tickets matching your filters"
                    />
                ) : (
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/50">
                                        <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-12">
                                            <Checkbox
                                                checked={selectedIds.length === paginatedTickets.length && paginatedTickets.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </th>
                                        {visibleColumns.ticketNo && (
                                            <th
                                                className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-28 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                                onClick={() => handleSort('ticketNo')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Ticket {sortConfig?.key === 'ticketNo' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.subject && (
                                            <th
                                                className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                                onClick={() => handleSort('subject')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Subject {sortConfig?.key === 'subject' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.customer && (
                                            <th
                                                className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                                onClick={() => handleSort('name')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Customer {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.priority && (
                                            <th
                                                className="text-center p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-24 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                                onClick={() => handleSort('priority')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Priority {sortConfig?.key === 'priority' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.status && (
                                            <th
                                                className="text-center p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-28 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                                onClick={() => handleSort('status')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        {visibleColumns.sla && (
                                            <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-20">
                                                SLA
                                            </th>
                                        )}
                                        {visibleColumns.created && (
                                            <th
                                                className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-32 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                                onClick={() => handleSort('createdAt')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Created {sortConfig?.key === 'createdAt' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                                </div>
                                            </th>
                                        )}
                                        <th className="text-right p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-28">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTickets.map((ticket) => {
                                        const slaStatus = getSlaStatus(ticket);
                                        return (
                                            <tr
                                                key={ticket.id}
                                                className={cn(
                                                    "border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]/30 transition-colors",
                                                    selectedIds.includes(ticket.id) && "bg-[var(--accent)]/5"
                                                )}
                                            >
                                                <td className="p-4">
                                                    <Checkbox
                                                        checked={selectedIds.includes(ticket.id)}
                                                        onCheckedChange={(c) => toggleSelect(ticket.id, c)}
                                                    />
                                                </td>
                                                {visibleColumns.ticketNo && (
                                                    <td className="p-4">
                                                        <span className="font-mono text-sm">{ticket.ticketNo}</span>
                                                    </td>
                                                )}
                                                {visibleColumns.subject && (
                                                    <td className="p-4">
                                                        <div className="max-w-[200px]">
                                                            <span className="truncate block font-medium" title={ticket.subject}>
                                                                {ticket.subject}
                                                            </span>
                                                            {ticket.tags && ticket.tags.length > 0 && (
                                                                <div className="flex gap-1 mt-1">
                                                                    {ticket.tags.slice(0, 2).map(tag => (
                                                                        <Badge key={tag} variant="default" className="text-[10px]">{tag}</Badge>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                                {visibleColumns.customer && (
                                                    <td className="p-4">
                                                        <div className="text-sm">
                                                            <p className="font-medium">{ticket.name}</p>
                                                            <p className="text-[var(--text-muted)] text-xs">{ticket.email}</p>
                                                        </div>
                                                    </td>
                                                )}
                                                {visibleColumns.priority && (
                                                    <td className="p-4 text-center">
                                                        <PriorityBadge priority={ticket.priority} />
                                                    </td>
                                                )}
                                                {visibleColumns.status && (
                                                    <td className="p-4 text-center">
                                                        <StatusBadge status={ticket.status} />
                                                    </td>
                                                )}
                                                {visibleColumns.sla && (
                                                    <td className="p-4 text-center">
                                                        <Tooltip content={slaStatus === 'overdue' ? 'No response in 24h+' : slaStatus === 'warning' ? 'No response in 12h+' : slaStatus === 'responded' ? 'First response sent' : 'Within SLA'}>
                                                            <div className={cn(
                                                                "w-3 h-3 rounded-full mx-auto",
                                                                slaStatus === 'overdue' && "bg-red-500",
                                                                slaStatus === 'warning' && "bg-yellow-500",
                                                                slaStatus === 'responded' && "bg-green-500",
                                                                slaStatus === 'ok' && "bg-blue-500"
                                                            )} />
                                                        </Tooltip>
                                                    </td>
                                                )}
                                                {visibleColumns.created && (
                                                    <td className="p-4">
                                                        <span className="text-sm text-[var(--text-secondary)]">
                                                            {formatRelativeTime(new Date(ticket.createdAt))}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Tooltip content="View Ticket">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 rounded-lg hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                                                                onClick={() => setSelectedTicket(ticket)}
                                                            >
                                                                <Eye size={14} />
                                                            </Button>
                                                        </Tooltip>
                                                        {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
                                                            <Tooltip content="Mark Resolved">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 rounded-lg text-green-400 hover:bg-green-500/10 hover:text-green-300 transition-all"
                                                                    onClick={() => handleUpdateStatus(ticket.id, 'RESOLVED')}
                                                                >
                                                                    <CheckCircle size={14} />
                                                                </Button>
                                                            </Tooltip>
                                                        )}
                                                        <Tooltip content="Delete">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                                                                onClick={() => setConfirmModal({ isOpen: true, type: 'single', ticketId: ticket.id })}
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]/30">
                            <div className="text-sm text-[var(--text-muted)]">
                                Showing {startEntry} to {endEntry} of {filteredTickets.length} entries
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronLeft size={16} />
                                    </Button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let page: number;
                                        if (totalPages <= 5) {
                                            page = i + 1;
                                        } else if (currentPage <= 3) {
                                            page = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            page = totalPages - 4 + i;
                                        } else {
                                            page = currentPage - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? 'primary' : 'ghost'}
                                                size="sm"
                                                onClick={() => setCurrentPage(page)}
                                                className="h-8 w-8 p-0"
                                            >
                                                {page}
                                            </Button>
                                        );
                                    })}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronRight size={16} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {/* Ticket Detail Modal */}
            <TicketDetailModal
                ticket={selectedTicket}
                isOpen={!!selectedTicket}
                onClose={() => setSelectedTicket(null)}
                templates={templates || []}
                onReply={async (text) => {
                    await replyMutation.mutateAsync({
                        id: selectedTicket!.id,
                        message: text
                    });
                }}
                onUpdateStatus={(status) => handleUpdateStatus(selectedTicket!.id, status)}
                onAddTag={(tag) => {
                    const currentTags = selectedTicket!.tags || [];
                    if (!currentTags.includes(tag)) {
                        updateTagsMutation({ id: selectedTicket!.id, tags: [...currentTags, tag] });
                    }
                }}
                onRemoveTag={(tag) => {
                    const currentTags = selectedTicket!.tags || [];
                    updateTagsMutation({ id: selectedTicket!.id, tags: currentTags.filter(t => t !== tag) });
                }}
                onFileUpload={async (files) => {
                    const formData = new FormData();
                    Array.from(files).forEach(file => {
                        formData.append('files', file);
                    });

                    await uploadAttachmentsMutation.mutateAsync({
                        id: selectedTicket!.id,
                        formData
                    });
                }}
                isReplyLoading={replyMutation.isPending}
                isUploading={uploadAttachmentsMutation.isPending}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, type: 'single' })}
                onConfirm={handleConfirmDelete}
                title={confirmModal.type === 'bulk' ? 'Delete Tickets' : 'Delete Ticket'}
                message={confirmModal.type === 'bulk'
                    ? `Are you sure you want to delete ${selectedIds.length} tickets? This action cannot be undone.`
                    : 'Are you sure you want to delete this ticket? This action cannot be undone.'}
                confirmText="Delete"
                variant="danger"
                isLoading={isBulkLoading}
            />
        </AdminLayout>
    );
}
