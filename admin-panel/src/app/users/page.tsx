'use client';

import { useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, Input, Select, Table, TableBody, TableCell, TableHead, TableRow } from '@/components/ui';
import { useActivateUser, useSuspendUser, useUserStats, useUsers } from '@/hooks';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'active' | 'suspended' | ''>('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: usersResponse, isLoading } = useUsers({
        page,
        limit,
        search: search || undefined,
        status,
    });
    const { data: stats } = useUserStats();
    const activateMutation = useActivateUser();
    const suspendMutation = useSuspendUser();

    const users = usersResponse?.items ?? [];
    const totalPages = usersResponse?.pages ?? 1;

    const statsCards = useMemo(
        () => [
            { label: 'Total Users', value: stats?.total ?? 0 },
            { label: 'Active Users', value: stats?.active ?? 0 },
            { label: 'Suspended Users', value: stats?.suspended ?? 0 },
        ],
        [stats]
    );

    const handleSuspendToggle = async (id: number, isActive: boolean) => {
        try {
            if (isActive) {
                await suspendMutation.mutateAsync({ id, reason: 'Suspended by admin from users page' });
                toast.success('User suspended');
            } else {
                await activateMutation.mutateAsync(id);
                toast.success('User activated');
            }
        } catch {
            toast.error('Failed to update user');
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader title="Users" description="Manage all registered users from backend" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsCards.map((item) => (
                        <Card key={item.label}>
                            <div className="p-4">
                                <p className="text-sm text-[var(--text-muted)]">{item.label}</p>
                                <p className="text-2xl font-bold">{item.value}</p>
                            </div>
                        </Card>
                    ))}
                </div>

                <Card>
                    <div className="p-4 space-y-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <Input
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by name or email"
                                leftIcon={<Search size={16} />}
                            />
                            <Select
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value as 'active' | 'suspended' | '');
                                    setPage(1);
                                }}
                                options={[
                                    { value: '', label: 'All Statuses' },
                                    { value: 'active', label: 'Active' },
                                    { value: 'suspended', label: 'Suspended' },
                                ]}
                            />
                            <Select
                                value={String(limit)}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                options={[
                                    { value: '10', label: '10' },
                                    { value: '25', label: '25' },
                                    { value: '50', label: '50' },
                                ]}
                            />
                        </div>

                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell header>Name</TableCell>
                                    <TableCell header>Email</TableCell>
                                    <TableCell header>Status</TableCell>
                                    <TableCell header>Created</TableCell>
                                    <TableCell header align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5}>Loading users...</TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5}>No users found</TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.isActive ? 'green' : 'red'}>
                                                    {user.isActive ? 'Active' : 'Suspended'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="sm"
                                                    variant={user.isActive ? 'danger' : 'primary'}
                                                    isLoading={activateMutation.isPending || suspendMutation.isPending}
                                                    onClick={() => handleSuspendToggle(user.id, user.isActive)}
                                                >
                                                    {user.isActive ? 'Suspend' : 'Activate'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <div className="flex items-center justify-between">
                            <p className="text-sm text-[var(--text-muted)]">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    Previous
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
