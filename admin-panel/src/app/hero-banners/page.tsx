'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Checkbox, DeleteConfirmDialog, EmptyState, Input, Modal, SkeletonCard } from '@/components/ui';
import { Plus, Image as ImageIcon, Pencil, Trash2 } from 'lucide-react';
import {
  useCreateHeroBanner,
  useDeleteHeroBanner,
  useHeroBanners,
  useUpdateHeroBanner,
} from '@/hooks';
import type { HeroBanner } from '@/types';

type FormState = {
  title: string;
  subtitle: string;
  imageUrl: string;
  targetType: 'movie' | 'series' | 'live' | 'custom';
  targetId: string;
  targetUrl: string;
  order: number;
  isActive: boolean;
};

const initialForm: FormState = {
  title: '',
  subtitle: '',
  imageUrl: '',
  targetType: 'custom',
  targetId: '',
  targetUrl: '',
  order: 0,
  isActive: true,
};

export default function HeroBannersPage() {
  const { data = [], isLoading, error } = useHeroBanners();
  const createMutation = useCreateHeroBanner();
  const updateMutation = useUpdateHeroBanner();
  const deleteMutation = useDeleteHeroBanner();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HeroBanner | null>(null);
  const [toDelete, setToDelete] = useState<HeroBanner | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const sorted = useMemo(() => [...data].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)), [data]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...initialForm, order: sorted.length });
    setShowModal(true);
  };

  const openEdit = (item: HeroBanner) => {
    setEditing(item);
    setForm({
      title: item.title ?? '',
      subtitle: item.subtitle ?? '',
      imageUrl: item.imageUrl ?? '',
      targetType: item.targetType ?? 'custom',
      targetId: item.targetId ?? '',
      targetUrl: item.targetUrl ?? '',
      order: Number(item.order ?? 0),
      isActive: item.isActive !== false,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      toast.error('Title and image URL are required');
      return;
    }
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      imageUrl: form.imageUrl.trim(),
      targetType: form.targetType,
      targetId: form.targetId.trim() || undefined,
      targetUrl: form.targetUrl.trim() || undefined,
      order: Number(form.order) || 0,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        toast.success('Hero banner updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Hero banner created');
      }
      setShowModal(false);
    } catch {
      toast.error('Failed to save hero banner');
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await deleteMutation.mutateAsync(toDelete.id);
      toast.success('Hero banner deleted');
      setToDelete(null);
    } catch {
      toast.error('Failed to delete hero banner');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Hero Banners"
          description="Manage fallback banners shown when provider hero images are missing."
          actions={
            <Button onClick={openCreate} leftIcon={<Plus size={18} />}>
              Add Hero Banner
            </Button>
          }
        />

        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
        ) : error ? (
          <Card padding="lg" className="text-center text-red-400">Failed to load hero banners</Card>
        ) : sorted.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ImageIcon size={48} />}
              title="No hero banners"
              description="Create at least one backend fallback hero banner."
              action={{ label: 'Add Hero Banner', onClick: openCreate }}
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {sorted.map((item) => (
              <Card key={item.id} hoverable>
                <div className="p-5 flex items-center gap-4">
                  <img src={item.imageUrl} alt={item.title} className="w-52 h-28 rounded-lg object-cover bg-[var(--bg-secondary)]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--text-primary)]">{item.title}</div>
                    <div className="text-sm text-[var(--text-secondary)] truncate">{item.subtitle || '-'}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      type: {item.targetType || 'custom'} | order: {item.order ?? 0} | {item.isActive ? 'active' : 'inactive'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil size={16} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setToDelete(item)} className="text-red-400"><Trash2 size={16} /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Hero Banner' : 'New Hero Banner'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} isLoading={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input label="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <Input label="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} required />
          <Input label="Target Type (movie|series|live|custom)" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: (e.target.value as FormState['targetType']) || 'custom' })} />
          <Input label="Target ID" value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })} />
          <Input label="Target URL" value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} />
          <Input label="Order" type="number" value={String(form.order)} onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })} />
          <div className="pt-2">
            <Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} label="Active" />
          </div>
        </div>
      </Modal>

      <DeleteConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        itemName={toDelete?.title}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
