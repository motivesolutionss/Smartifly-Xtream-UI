'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
    Button,
    Card,
    Input,
    Modal,
    Badge,
    EmptyState,
    DeleteConfirmDialog,
    SkeletonCard,
    Tabs,
    TabList,
    TabButton,
} from '@/components/ui';
import { Select } from '@/components/ui/Select';
import {
    useAnnouncements,
    useCreateAnnouncement,
    useUpdateAnnouncement,
    useDeleteAnnouncement,
} from '@/hooks';
import type { Announcement, CreateAnnouncementDTO, AnnouncementType, AnnouncementPriority, AnnouncementStatus } from '@/types';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Megaphone, Calendar, Users, Eye, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

// Dynamic import for Quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-40 bg-[var(--bg-secondary)] animate-pulse rounded-lg" />
});

const typeOptions = [
    { value: 'INFO', label: 'Info' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'UPDATE', label: 'Update' },
];

const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'URGENT', label: 'Urgent' },
];

const statusOptions = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const audienceOptions = [
    { value: 'ALL', label: 'All Users' },
    { value: 'ADMINS', label: 'Admins Only' },
    { value: 'USERS', label: 'Customers Only' },
];

const typeBadgeVariants: Record<string, 'blue' | 'yellow' | 'red' | 'green'> = {
    INFO: 'blue',
    WARNING: 'yellow',
    MAINTENANCE: 'red',
    UPDATE: 'green',
};

const priorityBadgeVariants: Record<string, 'gray' | 'blue' | 'red'> = {
    LOW: 'gray',
    NORMAL: 'blue',
    URGENT: 'red',
};

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'clean']
    ],
};

export default function AnnouncementsPage() {
    const { data: announcements = [], isLoading, error } = useAnnouncements();
    const createMutation = useCreateAnnouncement();
    const updateMutation = useUpdateAnnouncement();
    const deleteMutation = useDeleteAnnouncement();

    const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [deleteItem, setDeleteItem] = useState<Announcement | null>(null);

    const [formData, setFormData] = useState<{
        title: string;
        content: string;
        type: AnnouncementType;
        priority: AnnouncementPriority;
        status: AnnouncementStatus;
        audience: string;
        scheduledAt: string;
        expiresAt: string;
    }>({
        title: '',
        content: '',
        type: 'INFO',
        priority: 'NORMAL',
        status: 'DRAFT',
        audience: 'ALL',
        scheduledAt: '',
        expiresAt: '',
    });

    const filteredAnnouncements = useMemo(() => {
        if (activeTab === 'ALL') return announcements;
        return announcements.filter(a => a.status === activeTab);
    }, [announcements, activeTab]);

    const openModal = (a?: Announcement) => {
        if (a) {
            setEditing(a);

            let audienceValue = 'ALL';
            try {
                const parsed = a.audience ? JSON.parse(a.audience) : 'ALL';
                // If it's a simple string, matches our options
                if (typeof parsed === 'string') audienceValue = parsed;
                // If it's complex/array, default to ALL or handle specifically (simplification for now)
            } catch (e) {
                console.warn('Failed to parse audience JSON', e);
            }

            setFormData({
                title: a.title,
                content: a.content,
                type: a.type,
                priority: a.priority || 'NORMAL',
                status: a.status || 'DRAFT',
                audience: audienceValue,
                scheduledAt: a.scheduledAt ? new Date(a.scheduledAt).toISOString().slice(0, 16) : '',
                expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : '',
            });
        } else {
            setEditing(null);
            setFormData({
                title: '',
                content: '',
                type: 'INFO',
                priority: 'NORMAL',
                status: 'DRAFT',
                audience: 'ALL',
                scheduledAt: '',
                expiresAt: '',
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
    };

    const safeParseAudience = (audienceStr?: string | null) => {
        if (!audienceStr) return 'All Users';
        try {
            let parsed = JSON.parse(audienceStr);
            // Handle potentially double-stringified data from previous bug
            if (typeof parsed === 'string' && (parsed.startsWith('"') || parsed.startsWith('{') || parsed.startsWith('['))) {
                try {
                    const nested = JSON.parse(parsed);
                    parsed = nested;
                } catch { }
            }

            if (parsed === 'ALL') return 'All Users';
            if (parsed === 'ADMINS') return 'Admins Only';
            if (parsed === 'USERS') return 'Customers Only';
            return Array.isArray(parsed) ? `${parsed.length} Roles` : String(parsed);
        } catch {
            return 'All Users';
        }
    };

    const getContentPreview = (htmlContent: string) => {
        // Render preview as plain text to avoid stored-XSS sinks in admin list.
        return htmlContent
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data: any = {
            title: formData.title,
            content: formData.content,
            type: formData.type,
            priority: formData.priority,
            status: formData.status,
            // Send raw value, backend handles serialization if needed, 
            // but effectively for string enums we just send the string.
            audience: formData.audience,
            scheduledAt: formData.scheduledAt || null,
            expiresAt: formData.expiresAt || null,
        };

        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing.id, data });
                toast.success('Announcement updated');
            } else {
                await createMutation.mutateAsync(data);
                toast.success('Announcement created');
            }
            closeModal();
        } catch {
            toast.error('Failed to save announcement');
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        try {
            await deleteMutation.mutateAsync(deleteItem.id);
            toast.success('Announcement deleted');
            setDeleteItem(null);
        } catch {
            toast.error('Failed to delete announcement');
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Announcements"
                    description="Manage system-wide broadcasts and notifications"
                    actions={
                        <Button onClick={() => openModal()} leftIcon={<Plus size={18} />}>
                            Create Announcement
                        </Button>
                    }
                />

                <TabList>
                    <TabButton
                        isActive={activeTab === 'ALL'}
                        onClick={() => setActiveTab('ALL')}
                    >
                        All
                    </TabButton>
                    <TabButton
                        isActive={activeTab === 'PUBLISHED'}
                        onClick={() => setActiveTab('PUBLISHED')}
                    >
                        Published
                    </TabButton>
                    <TabButton
                        isActive={activeTab === 'DRAFT'}
                        onClick={() => setActiveTab('DRAFT')}
                    >
                        Drafts
                    </TabButton>
                    <TabButton
                        isActive={activeTab === 'ARCHIVED'}
                        onClick={() => setActiveTab('ARCHIVED')}
                    >
                        Archived
                    </TabButton>
                </TabList>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <Card padding="lg" className="text-center text-red-400">
                        Failed to load announcements
                    </Card>
                ) : filteredAnnouncements.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={<Megaphone size={48} />}
                            title="No announcements found"
                            description={activeTab === 'ALL' ? "Create your first announcement to get started" : `No ${activeTab.toLowerCase()} announcements found`}
                            action={{ label: 'Create Announcement', onClick: () => openModal() }}
                        />
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredAnnouncements.map((a) => (
                            <Card key={a.id} hoverable className="transition-all hover:border-[var(--accent)]/50">
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{a.title}</h3>
                                                <Badge variant={typeBadgeVariants[a.type]}>{a.type}</Badge>
                                                {a.priority === 'URGENT' && (
                                                    <Badge variant="red" className="animate-pulse">URGENT</Badge>
                                                )}
                                                <Badge variant={a.status === 'PUBLISHED' ? 'green' : 'gray'} className="text-[10px]">
                                                    {a.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {a.scheduledAt ? `Scheduled: ${format(new Date(a.scheduledAt), 'MMM d, yyyy HH:mm')}` : `Created: ${format(new Date(a.createdAt), 'MMM d, yyyy')}`}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users size={12} />
                                                    {safeParseAudience(a.audience)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Eye size={12} />
                                                    {a.views} views
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openModal(a)}
                                                className="hover:text-[var(--accent)]"
                                            >
                                                <Pencil size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeleteItem(a)}
                                                className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    <p className="text-[var(--text-secondary)] line-clamp-3 whitespace-pre-wrap break-words">
                                        {getContentPreview(a.content)}
                                    </p>

                                    {a.expiresAt && (
                                        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--warning)] bg-[var(--warning)]/5 w-fit px-2 py-1 rounded">
                                            <AlertTriangle size={12} />
                                            Expires: {format(new Date(a.expiresAt), 'MMM d, yyyy HH:mm')}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editing ? 'Edit Announcement' : 'New Announcement'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button
                            onClick={(e) => handleSubmit(e as React.FormEvent)}
                            isLoading={isSaving}
                        >
                            {editing ? 'Update Announcement' : 'Publish Announcement'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <Input
                            label="Title"
                            placeholder="e.g., Scheduled Maintenance"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Type"
                                options={typeOptions}
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                            />
                            <Select
                                label="Priority"
                                options={priorityOptions}
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Content</label>
                            <div className="bg-[var(--bg-input)] rounded-lg border border-[var(--border)] overflow-hidden">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.content}
                                    onChange={(content) => setFormData({ ...formData, content })}
                                    modules={quillModules}
                                    className="text-[var(--text-primary)] h-[200px] mb-12"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
                            <Select
                                label="Status"
                                options={statusOptions}
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            />
                            <Select
                                label="Target Audience"
                                options={audienceOptions}
                                value={formData.audience}
                                onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Schedule For (Optional)"
                                type="datetime-local"
                                value={formData.scheduledAt}
                                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                            />
                            <Input
                                label="Expires At (Optional)"
                                type="datetime-local"
                                value={formData.expiresAt}
                                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <DeleteConfirmDialog
                isOpen={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={handleDelete}
                itemName={deleteItem?.title}
                isLoading={deleteMutation.isPending}
            />
        </AdminLayout>
    );
}
