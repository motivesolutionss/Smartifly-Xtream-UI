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
import { useABTests, useCreateABTest, useUpdateABTest, useDeleteABTest } from '@/hooks/useNotifications';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Split, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';

export default function ABTestingPage() {
    const { data: tests = [], isLoading } = useABTests();
    const createMutation = useCreateABTest();
    const updateMutation = useUpdateABTest();
    const deleteMutation = useDeleteABTest();

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [deleteItem, setDeleteItem] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        variantA_title: '',
        variantA_body: '',
        variantB_title: '',
        variantB_body: '',
        status: 'DRAFT'
    });

    const openModal = (t?: any) => {
        if (t) {
            setEditing(t);
            const vars = t.variants as any[];
            setFormData({
                name: t.name,
                variantA_title: vars[0]?.title || '',
                variantA_body: vars[0]?.body || '',
                variantB_title: vars[1]?.title || '',
                variantB_body: vars[1]?.body || '',
                status: t.status
            });
        } else {
            setEditing(null);
            setFormData({
                name: '',
                variantA_title: '',
                variantA_body: '',
                variantB_title: '',
                variantB_body: '',
                status: 'DRAFT'
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

        const variants = [
            { name: 'A', title: formData.variantA_title, body: formData.variantA_body },
            { name: 'B', title: formData.variantB_title, body: formData.variantB_body }
        ];

        const payload = {
            name: formData.name,
            variants,
            status: formData.status
        };

        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing.id, data: payload });
                toast.success('A/B Test updated');
            } else {
                await createMutation.mutateAsync(payload);
                toast.success('A/B Test created');
            }
            closeModal();
        } catch {
            toast.error('Failed to save A/B Test');
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        try {
            await deleteMutation.mutateAsync(deleteItem.id);
            toast.success('A/B Test deleted');
            setDeleteItem(null);
        } catch {
            toast.error('Failed to delete A/B Test');
        }
    };

    const toggleStatus = async (test: any) => {
        try {
            const newStatus = test.status === 'RUNNING' ? 'STOPPED' : 'RUNNING';
            await updateMutation.mutateAsync({ id: test.id, data: { status: newStatus } });
            toast.success(`Test ${newStatus === 'RUNNING' ? 'started' : 'stopped'}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader
                    title="A/B Testing"
                    description="Optimize notifications by testing different variants"
                    actions={
                        <Button onClick={() => openModal()} leftIcon={<Plus size={18} />}>
                            Create Test
                        </Button>
                    }
                />

                {isLoading ? (
                    <div className="grid md:grid-cols-2 gap-6">
                        {[1, 2].map((i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : tests.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={<Split size={48} />}
                            title="No A/B tests found"
                            description="Create your first A/B test to optimize engagement"
                            action={{ label: 'Create Test', onClick: () => openModal() }}
                        />
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {tests.map((t: any) => (
                            <Card key={t.id} hoverable className="flex flex-col h-full">
                                <div className="p-5 flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-lg">{t.name}</h3>
                                            <Badge variant={t.status === 'RUNNING' ? 'green' : 'gray'} className="mt-1">
                                                {t.status}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleStatus(t)}
                                                className={t.status === 'RUNNING' ? "text-yellow-500" : "text-green-500"}
                                                title={t.status === 'RUNNING' ? "Pause Test" : "Start Test"}
                                            >
                                                {t.status === 'RUNNING' ? <Pause size={16} /> : <Play size={16} />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openModal(t)}
                                            >
                                                <Pencil size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeleteItem(t)}
                                                className="text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
                                            <strong className="block text-xs text-[var(--text-muted)] mb-1">Variant A</strong>
                                            <p className="font-medium truncate">{t.variants[0]?.title}</p>
                                        </div>
                                        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
                                            <strong className="block text-xs text-[var(--text-muted)] mb-1">Variant B</strong>
                                            <p className="font-medium truncate">{t.variants[1]?.title}</p>
                                        </div>
                                    </div>

                                    <div className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                                        Created: {format(new Date(t.createdAt), 'MMM d, yyyy')}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editing ? 'Edit A/B Test' : 'New A/B Test'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button onClick={handleSubmit} isLoading={isSaving} disabled={!formData.name}>
                            {editing ? 'Update' : 'Create'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Test Name"
                        placeholder="e.g., Welcome Variant Test"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4 p-4 border border-[var(--border)] rounded-lg">
                            <h4 className="font-semibold text-center border-b pb-2 mb-2">Variant A (Control)</h4>
                            <Input
                                label="Title"
                                value={formData.variantA_title}
                                onChange={(e) => setFormData({ ...formData, variantA_title: e.target.value })}
                                required
                            />
                            <FormTextarea
                                label="Message"
                                value={formData.variantA_body}
                                onChange={(e) => setFormData({ ...formData, variantA_body: e.target.value })}
                                required
                                minRows={3}
                            />
                        </div>
                        <div className="space-y-4 p-4 border border-[var(--border)] rounded-lg">
                            <h4 className="font-semibold text-center border-b pb-2 mb-2">Variant B (Test)</h4>
                            <Input
                                label="Title"
                                value={formData.variantB_title}
                                onChange={(e) => setFormData({ ...formData, variantB_title: e.target.value })}
                                required
                            />
                            <FormTextarea
                                label="Message"
                                value={formData.variantB_body}
                                onChange={(e) => setFormData({ ...formData, variantB_body: e.target.value })}
                                required
                                minRows={3}
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
