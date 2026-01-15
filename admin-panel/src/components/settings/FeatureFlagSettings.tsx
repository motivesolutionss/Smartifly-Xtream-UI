
import { useState } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Table, Badge, TableRow, TableCell } from '@/components/ui';
import { FormSwitch } from '@/components/forms';
import { useFeatureFlags, useCreateFeatureFlag, useToggleFeatureFlag, useDeleteFeatureFlag, useUpdateFeatureFlag } from '@/hooks/useSettings';
import { Flag, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function FeatureFlagSettings() {
    const { data: flags, isLoading } = useFeatureFlags();
    const createMutation = useCreateFeatureFlag();
    const toggleMutation = useToggleFeatureFlag();
    const deleteMutation = useDeleteFeatureFlag();
    const updateMutation = useUpdateFeatureFlag();

    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ key: '', name: '', description: '', isEnabled: false });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createMutation.mutateAsync(formData);
            toast.success('Feature flag created');
            setIsCreating(false);
            setFormData({ key: '', name: '', description: '', isEnabled: false });
        } catch {
            toast.error('Failed to create flag');
        }
    };

    const handleUpdate = async (id: string) => {
        try {
            await updateMutation.mutateAsync({ id, data: formData });
            toast.success('Feature flag updated');
            setEditingId(null);
            setFormData({ key: '', name: '', description: '', isEnabled: false });
        } catch {
            toast.error('Failed to update flag');
        }
    };

    const handleEditClick = (flag: any) => {
        setEditingId(flag.id);
        setFormData({ key: flag.key, name: flag.name, description: flag.description, isEnabled: flag.isEnabled });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This might break the app if code relies on this flag.')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Flag deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleMutation.mutateAsync(id);
            toast.success('Flag toggled');
        } catch {
            toast.error('Failed to toggle');
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Flag size={20} /> Feature Flags
                    </h2>
                    <Button size="sm" onClick={() => setIsCreating(true)} disabled={isCreating} leftIcon={<Plus size={16} />}>
                        Create Flag
                    </Button>
                </CardHeader>
                <CardBody>
                    {isCreating && (
                        <form onSubmit={handleCreate} className="mb-6 bg-[var(--bg-secondary)] p-4 rounded-lg space-y-4 border border-[var(--border)]">
                            <h3 className="font-medium">New Feature Flag</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <Input label="Key (unique)" value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} placeholder="e.g. new_dashboard" required />
                                <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            <FormSwitch label="Enabled by default" checked={formData.isEnabled} onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })} />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button type="submit" isLoading={createMutation.isPending}>Create</Button>
                            </div>
                        </form>
                    )}

                    <Table>
                        <thead>
                            <TableRow>
                                <TableCell header>Flag Key</TableCell>
                                <TableCell header>Description</TableCell>
                                <TableCell header>Status</TableCell>
                                <TableCell header align="right">Actions</TableCell>
                            </TableRow>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : flags?.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-[var(--text-secondary)]">No feature flags found</TableCell></TableRow>
                            ) : (
                                flags?.map((flag) => (
                                    <TableRow key={flag.id}>
                                        <TableCell>
                                            <div className="font-medium">{flag.name}</div>
                                            <div className="text-xs text-[var(--text-secondary)] font-mono">{flag.key}</div>
                                        </TableCell>
                                        <TableCell className="text-sm">{flag.description || '-'}</TableCell>
                                        <TableCell>
                                            <FormSwitch
                                                checked={flag.isEnabled}
                                                onChange={() => handleToggle(flag.id)}
                                                disabled={toggleMutation.isPending}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => handleEditClick(flag)}><Edit2 size={16} /></Button>
                                                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(flag.id)}><Trash2 size={16} /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </tbody>
                    </Table>
                </CardBody>
            </Card>

            {/* Edit Modal/Form handled inline for simplicity or we could use a modal */}
            {editingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-lg">
                        <CardHeader><h3 className="text-lg font-bold">Edit Feature Flag</h3></CardHeader>
                        <CardBody className="space-y-4">
                            <Input label="Key (read-only)" value={formData.key} disabled />
                            <Input label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                <Button onClick={() => handleUpdate(editingId)} isLoading={updateMutation.isPending}>Save Changes</Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
}
