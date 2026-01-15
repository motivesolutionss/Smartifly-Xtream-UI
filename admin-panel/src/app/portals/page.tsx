'use client';

import { useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
    Button,
    Card,
    Input,
    Modal,
    EmptyState,
    DeleteConfirmDialog,
    SkeletonCard,
    Tooltip,
    InteractiveStatsCard,
} from '@/components/ui';
import {
    usePortals,
    useCreatePortal,
    useUpdatePortal,
    useDeletePortal,
    useTogglePortal,
} from '@/hooks';
import type { Portal, CreatePortalDTO } from '@/types';
import toast from 'react-hot-toast';
import {
    Plus,
    Pencil,
    Trash2,
    Globe,
    AlertCircle,
    Upload,
    Download,
    Activity,
    RefreshCw,
    Server,
    AlertTriangle,
    Search,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Play,
    Square,
    Wifi,
    WifiOff,
    Zap,
} from 'lucide-react';
import { portalsApi } from '@/lib/api';
import { Checkbox, Badge, Dropdown } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

export default function PortalsPage() {
    const queryClient = useQueryClient();
    const { data: portals = [], isLoading, error } = usePortals();
    const createMutation = useCreatePortal();
    const updateMutation = useUpdatePortal();
    const deleteMutation = useDeletePortal();
    const toggleMutation = useTogglePortal();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showModal, setShowModal] = useState(false);
    const [editingPortal, setEditingPortal] = useState<Portal | null>(null);
    const [deletePortal, setDeletePortal] = useState<Portal | null>(null);
    const [formData, setFormData] = useState<CreatePortalDTO>({
        name: '',
        url: '',
        category: 'General',
        serverIp: '',
    });

    // Enhanced state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCheckingHealth, setIsCheckingHealth] = useState<string | null>(null);
    const [isRefreshingAll, setIsRefreshingAll] = useState(false);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Derived state
    const uniqueCategories = useMemo(() =>
        ['All', ...Array.from(new Set(portals.map(p => p.category || 'General')))],
        [portals]
    );

    const filteredPortals = useMemo(() => {
        return portals.filter(p => {
            const matchesCategory = categoryFilter === 'All' || (p.category || 'General') === categoryFilter;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.url.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [portals, categoryFilter, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredPortals.length / entriesPerPage);
    const paginatedPortals = useMemo(() => {
        const start = (currentPage - 1) * entriesPerPage;
        const end = start + entriesPerPage;
        return filteredPortals.slice(start, end);
    }, [filteredPortals, currentPage, entriesPerPage]);

    const startEntry = filteredPortals.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0;
    const endEntry = Math.min(currentPage * entriesPerPage, filteredPortals.length);

    // Stats
    const stats = {
        total: portals.length,
        online: portals.filter(p => p.healthStatus === 'ONLINE').length,
        offline: portals.filter(p => p.healthStatus === 'OFFLINE').length,
    };

    // Bulk selection handlers
    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(paginatedPortals.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelect = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(mid => mid !== id));
        }
    };

    // Health Check Handler
    const handleHealthCheck = async (id: string) => {
        setIsCheckingHealth(id);
        try {
            await portalsApi.checkHealth(id);
            toast.success('Health check completed');
            queryClient.invalidateQueries({ queryKey: ['portals'] });
        } catch {
            toast.error('Health check failed');
        } finally {
            setIsCheckingHealth(null);
        }
    };

    // Refresh All Handler
    const handleRefreshAll = async () => {
        setIsRefreshingAll(true);
        try {
            await Promise.all(portals.map(p => portalsApi.checkHealth(p.id)));
            toast.success('All portals refreshed');
            queryClient.invalidateQueries({ queryKey: ['portals'] });
        } catch {
            toast.error('Some health checks failed');
        } finally {
            setIsRefreshingAll(false);
        }
    };

    // Bulk Actions Handler
    const handleBulkAction = async (action: 'enable' | 'disable' | 'delete') => {
        try {
            await portalsApi.bulkAction(selectedIds, action);
            toast.success(`Bulk ${action} completed`);
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['portals'] });
        } catch {
            toast.error('Bulk action failed');
        }
    };

    // Export Handler
    const handleExport = (format: 'json' | 'csv' = 'json') => {
        try {
            let dataUri = '';
            let exportFileDefaultName = `portals-export-${new Date().toISOString().slice(0, 10)}.${format}`;

            if (format === 'json') {
                const dataStr = JSON.stringify(portals, null, 2);
                dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            } else {
                const headers = ['name', 'url', 'username', 'password', 'category', 'description', 'isActive'];
                const csvContent = [
                    headers.join(','),
                    ...portals.map(p => headers.map(h => {
                        const val = (p as any)[h];
                        const str = String(val === undefined || val === null ? '' : val);
                        return `"${str.replace(/"/g, '""')}"`;
                    }).join(','))
                ].join('\n');
                dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
            }

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            toast.success(`Export (${format.toUpperCase()}) started`);
        } catch {
            toast.error('Failed to export portals');
        }
    };

    // Import Handler
    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                let importedData: any[] = [];

                if (file.name.toLowerCase().endsWith('.csv')) {
                    const lines = content.split(/\r?\n/).filter(line => line.trim());
                    if (lines.length < 2) throw new Error('Invalid CSV');

                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

                    importedData = lines.slice(1).map(line => {
                        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                        const obj: any = {};
                        headers.forEach((h, i) => {
                            const val = values[i] ? values[i].replace(/^"|"$/g, '').replace(/""/g, '"') : '';
                            obj[h] = val;
                        });
                        return obj;
                    });
                } else {
                    importedData = JSON.parse(content);
                }

                if (!Array.isArray(importedData)) {
                    throw new Error('Invalid format: Expected an array of portals');
                }

                await portalsApi.import(importedData);
                toast.success(`Successfully imported ${importedData.length} portals`);
                queryClient.invalidateQueries({ queryKey: ['portals'] });
                event.target.value = '';
            } catch {
                toast.error('Import failed: Invalid file format');
            }
        };
        reader.readAsText(file);
    };

    const openModal = (portal?: Portal) => {
        if (portal) {
            setEditingPortal(portal);
            setFormData({
                name: portal.name,
                url: portal.url,
                category: portal.category || 'General',
                serverIp: portal.serverIp || ''
            });
        } else {
            setEditingPortal(null);
            setFormData({ name: '', url: '', category: 'General', serverIp: '' });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPortal(null);
        setFormData({ name: '', url: '', category: 'General', serverIp: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingPortal) {
                await updateMutation.mutateAsync({
                    id: editingPortal.id,
                    data: formData,
                });
                toast.success('Portal updated');
            } else {
                await createMutation.mutateAsync(formData);
                toast.success('Portal created');
            }
            closeModal();
        } catch (error) {
            const err = error as { response?: { data?: { error?: string } } };
            toast.error(err.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async () => {
        if (!deletePortal) return;

        try {
            await deleteMutation.mutateAsync(deletePortal.id);
            toast.success('Portal deleted');
            setDeletePortal(null);
        } catch {
            toast.error('Failed to delete portal');
        }
    };

    const handleToggle = async (portal: Portal) => {
        try {
            await toggleMutation.mutateAsync({
                id: portal.id,
                isActive: !portal.isActive,
            });
            toast.success(`Portal ${portal.isActive ? 'disabled' : 'enabled'}`);
        } catch {
            toast.error('Failed to update portal');
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;
    const canAddMore = portals.length < 5;

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ONLINE': return 'text-green-400';
            case 'OFFLINE': return 'text-red-400';
            case 'UNSTABLE': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'ONLINE': return 'bg-green-500';
            case 'OFFLINE': return 'bg-red-500';
            case 'UNSTABLE': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <PageHeader
                    title="Portals"
                    description="Manage DNS/Server portals"
                    actions={
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".json,.csv"
                                onChange={handleFileChange}
                            />

                            {/* Refresh All Button */}
                            <Tooltip content="Refresh all portals">
                                <Button
                                    variant="secondary"
                                    leftIcon={<RefreshCw size={16} className={isRefreshingAll ? 'animate-spin' : ''} />}
                                    onClick={handleRefreshAll}
                                    disabled={isRefreshingAll}
                                >
                                    Refresh
                                </Button>
                            </Tooltip>

                            {/* Import */}
                            <Button variant="secondary" leftIcon={<Upload size={16} />} onClick={handleImportClick}>
                                Import
                            </Button>

                            {/* Export Dropdown */}
                            <Dropdown
                                trigger={
                                    <Button variant="secondary" rightIcon={<ChevronDown size={14} />} leftIcon={<Download size={16} />}>
                                        Export
                                    </Button>
                                }
                                items={[
                                    { key: 'json', label: 'Export as JSON', onClick: () => handleExport('json') },
                                    { key: 'csv', label: 'Export as CSV', onClick: () => handleExport('csv') },
                                ]}
                            />

                            {/* Add Portal */}
                            <Tooltip
                                content={canAddMore ? 'Add new portal' : 'Maximum limit reached'}
                                position="left"
                            >
                                <Button
                                    onClick={() => openModal()}
                                    disabled={!canAddMore}
                                    leftIcon={<Plus size={18} />}
                                >
                                    Add Portal
                                </Button>
                            </Tooltip>
                        </div>
                    }
                />

                {/* Stats Cards - Compact Inline Design */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InteractiveStatsCard
                        title="Total Portals"
                        value={stats.total}
                        icon={<Server size={20} />}
                        colorScheme="indigo"
                    />
                    <InteractiveStatsCard
                        title="Online"
                        value={stats.online}
                        icon={<Wifi size={20} />}
                        colorScheme="green"
                    />
                    <InteractiveStatsCard
                        title="Issues"
                        value={stats.offline}
                        icon={<AlertTriangle size={20} />}
                        colorScheme="red"
                    />
                </div>

                {/* Controls Bar - Enhanced */}
                <Card className="p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-[var(--bg-secondary)]/80 to-[var(--bg-secondary)]/40 backdrop-blur-sm border-b border-[var(--border)]/50">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between p-4">
                            {/* Left: Entries + Category Filter */}
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[var(--text-muted)]">Show</span>
                                    <select
                                        value={entriesPerPage}
                                        onChange={(e) => {
                                            setEntriesPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="h-9 px-3 text-sm font-medium bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all cursor-pointer hover:border-[var(--accent)]/50"
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span className="text-sm font-medium text-[var(--text-muted)]">entries</span>
                                </div>

                                <div className="h-6 w-px bg-[var(--border)]" />

                                {/* Category Filter */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[var(--text-muted)]">Category:</span>
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => {
                                            setCategoryFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="h-9 px-3 text-sm font-medium bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all cursor-pointer hover:border-[var(--accent)]/50"
                                    >
                                        {uniqueCategories.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Right: Search */}
                            <div className="relative w-full lg:w-80">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search size={16} className="text-[var(--text-muted)]" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search portals..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full h-10 pl-11 pr-10 text-sm bg-[var(--bg-primary)] border-2 border-[var(--border)] rounded-xl focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 outline-none transition-all placeholder:text-[var(--text-muted)] font-medium"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        <span className="text-sm font-bold">×</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && (
                    <div className="sticky top-4 z-10 flex items-center gap-2 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)] shadow-xl animate-in fade-in slide-in-from-top-4 w-fit mx-auto">
                        <span className="text-sm px-3 font-medium">{selectedIds.length} selected</span>
                        <div className="h-4 w-px bg-[var(--border)]" />
                        <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-500/10" onClick={() => handleBulkAction('enable')}>
                            <Play size={14} className="mr-1" /> Enable
                        </Button>
                        <Button size="sm" variant="ghost" className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10" onClick={() => handleBulkAction('disable')}>
                            <Square size={14} className="mr-1" /> Disable
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleBulkAction('delete')}>
                            <Trash2 size={14} className="mr-1" /> Delete
                        </Button>
                    </div>
                )}

                {/* Table Content */}
                {isLoading ? (
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <Card padding="lg" className="text-center">
                        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
                        <p className="text-red-400">Failed to load portals</p>
                    </Card>
                ) : portals.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={<Globe size={48} />}
                            title="No portals found"
                            description="Add a new portal to get started"
                            action={{
                                label: 'Add Portal',
                                onClick: () => openModal(),
                            }}
                        />
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/50">
                                        <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-12">
                                            <Checkbox
                                                checked={selectedIds.length === paginatedPortals.length && paginatedPortals.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-16">ID</th>
                                        <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">Portal Name</th>
                                        <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-24">Category</th>
                                        <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-24">Status</th>
                                        <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-24">Latency</th>
                                        <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">URL</th>
                                        <th className="text-left p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-32">Server IP</th>
                                        <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-28">Connections</th>
                                        <th className="text-center p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-20">Errors</th>
                                        <th className="text-right p-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] w-32">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPortals.map((portal, index) => (
                                        <tr
                                            key={portal.id}
                                            className={cn(
                                                "border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]/30 transition-colors",
                                                selectedIds.includes(portal.id) && "bg-[var(--accent)]/5"
                                            )}
                                        >
                                            {/* Selection */}
                                            <td className="p-4">
                                                <Checkbox
                                                    checked={selectedIds.includes(portal.id)}
                                                    onCheckedChange={(c) => toggleSelect(portal.id, c)}
                                                />
                                            </td>

                                            {/* ID */}
                                            <td className="p-4">
                                                <span className="text-sm font-mono text-[var(--text-muted)]">
                                                    {portal.displayId || '—'}
                                                </span>
                                            </td>

                                            {/* Portal Name */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                                                        <Globe size={16} className="text-white" />
                                                    </div>
                                                    <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{portal.name}</span>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="p-4">
                                                <Badge variant="default" className="text-xs">
                                                    {portal.category || 'General'}
                                                </Badge>
                                            </td>

                                            {/* Status */}
                                            <td className="p-4 text-center">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        getStatusBg(portal.healthStatus),
                                                        portal.healthStatus === 'ONLINE' && "animate-pulse shadow-lg shadow-green-500/50"
                                                    )} />
                                                    <span className={cn("text-xs font-medium", getStatusColor(portal.healthStatus))}>
                                                        {portal.healthStatus === 'ONLINE' ? 'Online' :
                                                            portal.healthStatus === 'OFFLINE' ? 'Offline' :
                                                                portal.healthStatus === 'UNSTABLE' ? 'Unstable' : 'Unknown'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Latency */}
                                            <td className="p-4 text-center">
                                                {portal.latency ? (
                                                    <span className={cn(
                                                        "text-xs font-mono font-semibold",
                                                        portal.latency < 100 ? "text-green-400" :
                                                            portal.latency < 300 ? "text-yellow-400" : "text-red-400"
                                                    )}>
                                                        {portal.latency}ms
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-[var(--text-muted)]">—</span>
                                                )}
                                            </td>

                                            {/* URL */}
                                            <td className="p-4">
                                                <code className="text-xs text-[var(--text-secondary)] truncate block max-w-[200px]">
                                                    {portal.url}
                                                </code>
                                            </td>

                                            {/* Server IP */}
                                            <td className="p-4">
                                                {portal.serverIp ? (
                                                    <code className="text-xs font-mono text-[var(--text-secondary)]">
                                                        {portal.serverIp}
                                                    </code>
                                                ) : (
                                                    <span className="text-xs text-[var(--text-muted)]">—</span>
                                                )}
                                            </td>

                                            {/* Connections */}
                                            <td className="p-4 text-center">
                                                <span className="text-xs font-medium text-[var(--text-secondary)]">
                                                    {portal.activeConnections || 0}
                                                </span>
                                            </td>

                                            {/* Errors */}
                                            <td className="p-4 text-center">
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    (portal.errorCount || 0) > 0 ? "text-red-400" : "text-[var(--text-muted)]"
                                                )}>
                                                    {portal.errorCount || 0}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Refresh Services */}
                                                    <Tooltip content="Refresh Services">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                                                            onClick={() => handleHealthCheck(portal.id)}
                                                            disabled={isCheckingHealth === portal.id}
                                                        >
                                                            <RefreshCw size={14} className={isCheckingHealth === portal.id ? 'animate-spin' : ''} />
                                                        </Button>
                                                    </Tooltip>

                                                    {/* Edit */}
                                                    <Tooltip content="Edit Portal">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-400 transition-all"
                                                            onClick={() => openModal(portal)}
                                                        >
                                                            <Pencil size={14} />
                                                        </Button>
                                                    </Tooltip>

                                                    {/* Delete */}
                                                    <Tooltip content="Delete Portal">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
                                                            onClick={() => setDeletePortal(portal)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Table Footer - Pagination */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]/30">
                            <div className="text-sm text-[var(--text-muted)]">
                                Showing {startEntry} to {endEntry} of {filteredPortals.length} entries
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft size={16} />
                                    </Button>

                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? 'primary' : 'ghost'}
                                                size="sm"
                                                className={cn(
                                                    "h-8 w-8 p-0",
                                                    currentPage === pageNum && "bg-[var(--accent)] text-white"
                                                )}
                                                onClick={() => setCurrentPage(pageNum)}
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight size={16} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Limit warning */}
                {!canAddMore && (
                    <p className="text-center text-[var(--text-muted)] text-sm">
                        Maximum portal limit (5) reached
                    </p>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingPortal ? 'Edit Portal' : 'Add Portal'}
                size="md"
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button
                            onClick={(e) => handleSubmit(e as React.FormEvent)}
                            isLoading={isSaving}
                        >
                            {editingPortal ? 'Update' : 'Create'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Portal Name"
                        placeholder="My IPTV Server"
                        value={formData.name}
                        onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                        }
                        required
                    />
                    <Input
                        label="Server URL"
                        type="url"
                        placeholder="http://xtream.example.com"
                        value={formData.url}
                        onChange={(e) =>
                            setFormData({ ...formData, url: e.target.value })
                        }
                        required
                    />
                    <Input
                        label="Server IP"
                        placeholder="103.120.71.169 (optional - auto-resolved on health check)"
                        value={formData.serverIp || ''}
                        onChange={(e) =>
                            setFormData({ ...formData, serverIp: e.target.value })
                        }
                    />
                    <Input
                        label="Category"
                        placeholder="e.g. IPTV, VOD, Backup"
                        value={formData.category}
                        onChange={(e) =>
                            setFormData({ ...formData, category: e.target.value })
                        }
                    />
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <DeleteConfirmDialog
                isOpen={!!deletePortal}
                onClose={() => setDeletePortal(null)}
                onConfirm={handleDelete}
                itemName={deletePortal?.name}
                isLoading={deleteMutation.isPending}
            />
        </AdminLayout>
    );
}
