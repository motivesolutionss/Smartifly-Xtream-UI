'use client';

import { useState } from 'react';
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
    Badge
} from '@/components/ui';
import { FormTextarea } from '@/components/forms';
import { Select } from '@/components/ui/Select';
import { useNotificationSegments, useCreateSegment, useUpdateSegment, useDeleteSegment } from '@/hooks/useNotifications';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import type { NotificationSegment } from '@/types/notification';

export default function SegmentsPage() {
    const { data: segments = [], isLoading } = useNotificationSegments();
    const createMutation = useCreateSegment();
    const updateMutation = useUpdateSegment();
    const deleteMutation = useDeleteSegment();

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<NotificationSegment | null>(null);
    const [deleteItem, setDeleteItem] = useState<NotificationSegment | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        platform: 'ALL',
        isActive: true
    });

    const openModal = (s?: NotificationSegment) => {
        if (s) {
            setEditing(s);
            const filters = s.filters as any;
            setFormData({
                name: s.name,
                description: s.description || '',
                platform: filters?.platform || 'ALL',
                isActive: s.isActive
            });
        } else {
            setEditing(null);
            setFormData({
                name: '',
                description: '',
                platform: 'ALL',
                isActive: true
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const filters: any = {};
        if (formData.platform !== 'ALL') {
            filters.platform = formData.platform;
        }

        const payload = {
            name: formData.name,
            description: formData.description,
            filters,
            isActive: formData.isActive
        };

        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing.id, data: payload });
                toast.success('Segment updated');
            } else {
                await createMutation.mutateAsync(payload);
                toast.success('Segment created');
            }
            closeModal();
        } catch {
            toast.error('Failed to save segment');
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        try {
            await deleteMutation.mutateAsync(deleteItem.id);
            toast.success('Segment deleted');
            setDeleteItem(null);
        } catch {
            toast.error('Failed to delete segment');
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Audience Segments"
                    description="Define and manage target audience segments"
                    actions={
                        <Button onClick={() => openModal()} leftIcon={<Plus size={18} />}>
                            Create Segment
                        </Button>
                    }
                />

                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : segments.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={<Users size={48} />}
                            title="No segments found"
                            description="Create your first audience segment"
                            action={{ label: 'Create Segment', onClick: () => openModal() }}
                        />
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {segments.map((s: NotificationSegment) => {
                            const filters = s.filters as any;
                            return (
                                <Card key={s.id} hoverable className="flex flex-col h-full">
                                    <div className="p-5 flex-1 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-lg">{s.name}</h3>
                                                <Badge variant={s.isActive ? 'green' : 'gray'} className="mt-1">
                                                    {s.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openModal(s)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleteItem(s)}
                                                    className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>

                                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                            {s.description || "No description"}
                                        </p>

                                        <div className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                                            <strong>Filters:</strong> {Object.keys(filters).length === 0 ? 'None (All Users)' :
                                                Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editing ? 'Edit Segment' : 'New Segment'}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button onClick={handleSubmit} isLoading={isSaving} disabled={!formData.name}>
                            {editing ? 'Update' : 'Create'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Segment Name"
                        placeholder="e.g., Android Users"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <FormTextarea
                        label="Description"
                        placeholder="Description of this segment"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        minRows={2}
                    />

                    <div className="border-t border-[var(--border)] my-4 pt-4">
                        <h4 className="text-sm font-semibold mb-3 text-[var(--text-muted)]">Filtering Rules</h4>
                        <div className="space-y-4">
                            <Select
                                label="Platform"
                                options={[
                                    { value: 'ALL', label: 'All Platforms' },
                                    { value: 'android', label: 'Android' },
                                    { value: 'ios', label: 'iOS' },
                                    { value: 'web', label: 'Web' },
                                ]}
                                value={formData.platform}
                                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex items-center pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                            />
                            <span className="text-sm font-medium">Active (Available for selection)</span>
                        </label>
                    </div>
                </form>
            </Modal>

            <DeleteConfirmDialog
                isOpen={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={handleDelete}
                itemName={deleteItem?.name}
                isLoading={deleteMutation.isPending}
            />
        </AdminLayout>
    );
}
