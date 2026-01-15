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
import { useNotificationTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/useNotifications';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, LayoutTemplate, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import type { NotificationTemplate } from '@/types/notification';

export default function TemplatesPage() {
    const { data: templates = [], isLoading } = useNotificationTemplates();
    const createMutation = useCreateTemplate();
    const updateMutation = useUpdateTemplate();
    const deleteMutation = useDeleteTemplate();

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<NotificationTemplate | null>(null);
    const [deleteItem, setDeleteItem] = useState<NotificationTemplate | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        title: '',
        body: '',
        imageUrl: '',
        deepLink: '',
        category: 'General',
        isActive: true
    });

    const openModal = (t?: NotificationTemplate) => {
        if (t) {
            setEditing(t);
            setFormData({
                name: t.name,
                title: t.title,
                body: t.body,
                imageUrl: t.imageUrl || '',
                deepLink: t.deepLink || '',
                category: t.category,
                isActive: t.isActive
            });
        } else {
            setEditing(null);
            setFormData({
                name: '',
                title: '',
                body: '',
                imageUrl: '',
                deepLink: '',
                category: 'General',
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
        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing.id, data: formData });
                toast.success('Template updated');
            } else {
                await createMutation.mutateAsync(formData);
                toast.success('Template created');
            }
            closeModal();
        } catch {
            toast.error('Failed to save template');
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        try {
            await deleteMutation.mutateAsync(deleteItem.id);
            toast.success('Template deleted');
            setDeleteItem(null);
        } catch {
            toast.error('Failed to delete template');
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Notification Templates"
                    description="Manage reusable notification templates"
                    actions={
                        <Button onClick={() => openModal()} leftIcon={<Plus size={18} />}>
                            Create Template
                        </Button>
                    }
                />

                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : templates.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={<LayoutTemplate size={48} />}
                            title="No templates found"
                            description="Create your first notification template"
                            action={{ label: 'Create Template', onClick: () => openModal() }}
                        />
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((t: NotificationTemplate) => (
                            <Card key={t.id} hoverable className="flex flex-col h-full">
                                <div className="p-5 flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-lg">{t.name}</h3>
                                            <Badge variant={t.isActive ? 'green' : 'gray'} className="mt-1">
                                                {t.category}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openModal(t)}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Pencil size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeleteItem(t)}
                                                className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 p-3 bg-[var(--bg-secondary)] rounded-lg text-sm">
                                        <p className="font-medium text-[var(--text-primary)]">{t.title}</p>
                                        <p className="text-[var(--text-secondary)] line-clamp-2">{t.body}</p>
                                    </div>

                                    {(t.imageUrl || t.deepLink) && (
                                        <div className="flex gap-3 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                                            {t.imageUrl && (
                                                <span className="flex items-center gap-1">
                                                    <ImageIcon size={12} /> Image
                                                </span>
                                            )}
                                            {t.deepLink && (
                                                <span className="flex items-center gap-1">
                                                    <LinkIcon size={12} /> Deep Link
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editing ? 'Edit Template' : 'New Template'}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button onClick={handleSubmit} isLoading={isSaving} disabled={!formData.name || !formData.title || !formData.body}>
                            {editing ? 'Update' : 'Create'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Template Name"
                        placeholder="e.g., Welcome Message"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Category"
                            placeholder="e.g., General"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        />
                        <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                                />
                                <span className="text-sm font-medium">Active</span>
                            </label>
                        </div>
                    </div>

                    <div className="border-t border-[var(--border)] my-4 pt-4">
                        <h4 className="text-sm font-semibold mb-3 text-[var(--text-muted)]">Notification Content</h4>
                        <div className="space-y-4">
                            <Input
                                label="Title"
                                placeholder="Notification Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                            <FormTextarea
                                label="Message Body"
                                placeholder="Notification message..."
                                value={formData.body}
                                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                minRows={3}
                                required
                            />
                            <Input
                                label="Image URL (Optional)"
                                placeholder="https://example.com/image.png"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                leftIcon={<ImageIcon size={16} />}
                            />
                            <Input
                                label="Deep Link (Optional)"
                                placeholder="app://screen/details/1"
                                value={formData.deepLink}
                                onChange={(e) => setFormData({ ...formData, deepLink: e.target.value })}
                                leftIcon={<LinkIcon size={16} />}
                            />
                        </div>
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
