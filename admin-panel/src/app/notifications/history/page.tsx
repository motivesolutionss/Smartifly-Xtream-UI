'use client';

import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
    Card,
    Badge,
    EmptyState,
    SkeletonCard
} from '@/components/ui';
import { useNotificationHistory } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/lib/utils';
import { Bell, Clock, CheckCircle, AlertOctagon, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
    PENDING: { color: 'gray', icon: Clock },
    SCHEDULED: { color: 'blue', icon: Clock },
    SENT: { color: 'green', icon: CheckCircle },
    FAILED: { color: 'red', icon: AlertOctagon },
    CANCELLED: { color: 'gray', icon: XCircle },
};

export default function HistoryPage() {
    const { data: history = [], isLoading } = useNotificationHistory();

    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Notification History"
                    description="View sent and scheduled notifications"
                />

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : history.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={<Bell size={48} />}
                            title="No notifications found"
                            description="You haven't sent any notifications yet."
                        />
                    </Card>
                ) : (
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Message</th>
                                        <th className="px-6 py-4">Audience</th>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Timing</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {history.map((n: any) => {
                                        const StatusIcon = statusConfig[n.status as keyof typeof statusConfig]?.icon || Clock;
                                        const statusColor = statusConfig[n.status as keyof typeof statusConfig]?.color || 'gray';

                                        return (
                                            <tr key={n.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant={statusColor as any} className="flex items-center gap-1 w-fit">
                                                        <StatusIcon size={12} />
                                                        {n.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 max-w-md">
                                                    <p className="font-semibold text-[var(--text-primary)] truncate">{n.title}</p>
                                                    <p className="text-[var(--text-secondary)] truncate">{n.body}</p>
                                                    {n.template && (
                                                        <span className="text-xs text-[var(--accent)] mt-1 inline-block bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">
                                                            Template: {n.template.name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-secondary)]">
                                                    {n.segment ? (
                                                        <span className="flex items-center gap-1">
                                                            Segment: {n.segment.name}
                                                        </span>
                                                    ) : (
                                                        <span>All Users</span> // Or filter based on manually stored filters if we had them in history display
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-secondary)]">
                                                    {(n.data?.imageUrl || n.data?.deepLink) && (
                                                        <div className="flex gap-2">
                                                            {n.data.imageUrl && <Badge variant="gray" className="text-[10px]">Image</Badge>}
                                                            {n.data.deepLink && <Badge variant="gray" className="text-[10px]">Link</Badge>}
                                                        </div>
                                                    )}
                                                    {!n.data?.imageUrl && !n.data?.deepLink && <span className="text-[var(--text-muted)]">-</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-secondary)]">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {n.status === 'SCHEDULED'
                                                                ? format(new Date(n.scheduledAt), 'MMM d, HH:mm')
                                                                : format(new Date(n.sentAt || n.createdAt), 'MMM d, HH:mm')}
                                                        </span>
                                                        <span className="text-xs text-[var(--text-muted)]">
                                                            {n.status === 'SCHEDULED' ? 'Scheduled' : formatRelativeTime(new Date(n.sentAt || n.createdAt))}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}
