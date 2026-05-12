'use client';

import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Input, Select, Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui';
import { useCreateLedgerEntry, useFinanceSummary, useLedgerEntries } from '@/hooks';
import toast from 'react-hot-toast';

const ENTRY_TYPES = [
    'ADJUSTMENT',
    'REFUND',
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_RENEWED',
    'PLAN_CHANGED',
    'SUBSCRIPTION_CANCELED',
];

export default function FinancePage() {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [typeFilter, setTypeFilter] = useState('');
    const [form, setForm] = useState({
        type: 'ADJUSTMENT',
        amount: '',
        currency: 'USD',
        userId: '',
        licenseId: '',
        note: '',
    });

    const { data: summary, isLoading: summaryLoading } = useFinanceSummary();
    const { data: ledger, isLoading: entriesLoading } = useLedgerEntries({ page, limit, type: typeFilter || undefined });
    const createEntry = useCreateLedgerEntry();

    const onCreateEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(form.amount);
        if (!Number.isFinite(amount)) {
            toast.error('Amount must be numeric');
            return;
        }
        try {
            await createEntry.mutateAsync({
                type: form.type,
                amount,
                currency: form.currency,
                userId: form.userId ? Number(form.userId) : undefined,
                licenseId: form.licenseId ? Number(form.licenseId) : undefined,
                note: form.note || undefined,
            });
            toast.success('Ledger entry added');
            setForm((prev) => ({ ...prev, amount: '', userId: '', licenseId: '', note: '' }));
        } catch {
            toast.error('Failed to add ledger entry');
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader title="Finance" description="Revenue, subscriptions and accounting ledger" />

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card><div className="p-4"><p className="text-sm text-[var(--text-muted)]">Gross Revenue</p><p className="text-xl font-bold">{summaryLoading ? '...' : `$${summary?.grossRevenue ?? 0}`}</p></div></Card>
                    <Card><div className="p-4"><p className="text-sm text-[var(--text-muted)]">Refunds</p><p className="text-xl font-bold">{summaryLoading ? '...' : `$${summary?.refunds ?? 0}`}</p></div></Card>
                    <Card><div className="p-4"><p className="text-sm text-[var(--text-muted)]">Net Revenue</p><p className="text-xl font-bold">{summaryLoading ? '...' : `$${summary?.netRevenue ?? 0}`}</p></div></Card>
                    <Card><div className="p-4"><p className="text-sm text-[var(--text-muted)]">Active Subs</p><p className="text-xl font-bold">{summaryLoading ? '...' : summary?.activeSubscriptions ?? 0}</p></div></Card>
                    <Card><div className="p-4"><p className="text-sm text-[var(--text-muted)]">Users</p><p className="text-xl font-bold">{summaryLoading ? '...' : summary?.totalUsers ?? 0}</p></div></Card>
                    <Card><div className="p-4"><p className="text-sm text-[var(--text-muted)]">Ledger Entries</p><p className="text-xl font-bold">{summaryLoading ? '...' : summary?.totalEntries ?? 0}</p></div></Card>
                </div>

                <Card>
                    <div className="p-4 space-y-4">
                        <h3 className="text-lg font-semibold">Manual Ledger Entry</h3>
                        <form className="grid grid-cols-1 md:grid-cols-6 gap-3" onSubmit={onCreateEntry}>
                            <Select
                                value={form.type}
                                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                                options={ENTRY_TYPES.map((t) => ({ value: t, label: t }))}
                            />
                            <Input placeholder="Amount" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
                            <Input placeholder="Currency" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} required />
                            <Input placeholder="User ID (optional)" value={form.userId} onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))} />
                            <Input placeholder="License ID (optional)" value={form.licenseId} onChange={(e) => setForm((p) => ({ ...p, licenseId: e.target.value }))} />
                            <Input placeholder="Note" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
                            <div className="md:col-span-6">
                                <Button type="submit" isLoading={createEntry.isPending}>Add Entry</Button>
                            </div>
                        </form>
                    </div>
                </Card>

                <Card>
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold">Ledger Entries</h3>
                            <Select
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value);
                                    setPage(1);
                                }}
                                options={[{ value: '', label: 'All Types' }, ...ENTRY_TYPES.map((t) => ({ value: t, label: t }))]}
                            />
                        </div>

                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell header>Time</TableCell>
                                    <TableCell header>Type</TableCell>
                                    <TableCell header>User</TableCell>
                                    <TableCell header>License</TableCell>
                                    <TableCell header>Amount</TableCell>
                                    <TableCell header>Status</TableCell>
                                    <TableCell header>Note</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {entriesLoading ? (
                                    <TableRow><TableCell colSpan={7}>Loading entries...</TableCell></TableRow>
                                ) : (ledger?.items?.length ?? 0) === 0 ? (
                                    <TableRow><TableCell colSpan={7}>No ledger entries found</TableCell></TableRow>
                                ) : (
                                    (ledger?.items ?? []).map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                                            <TableCell>{entry.type}</TableCell>
                                            <TableCell>{entry.userId ?? '-'}</TableCell>
                                            <TableCell>{entry.licenseId ?? '-'}</TableCell>
                                            <TableCell>{entry.currency} {entry.amount}</TableCell>
                                            <TableCell>{entry.status}</TableCell>
                                            <TableCell>{entry.note || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <div className="flex items-center justify-between">
                            <p className="text-sm text-[var(--text-muted)]">Page {ledger?.page ?? page} of {ledger?.pages ?? 1}</p>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                                <Button variant="secondary" size="sm" disabled={page >= (ledger?.pages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
