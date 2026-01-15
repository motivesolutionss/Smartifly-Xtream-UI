'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, Button, Input, EmptyState, SkeletonCard, Badge } from '@/components/ui';
import { Select } from '@/components/ui/Select';
import { FormTextarea } from '@/components/forms';
import {
    useNotificationHistory,
    useDeviceStats,
    useSendNotification,
    useNotificationTemplates,
    useNotificationSegments
} from '@/hooks/useNotifications';
import toast from 'react-hot-toast';
import { Bell, Send, Smartphone, Monitor, Calendar, Image as ImageIcon, Link as LinkIcon, Layers } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export default function NotificationsPage() {
    const { data: history = [], isLoading: historyLoading } = useNotificationHistory();
    const { data: devices, isLoading: devicesLoading } = useDeviceStats();

    // Fetch Templates & Segments
    const { data: templates = [] } = useNotificationTemplates();
    const { data: segments = [] } = useNotificationSegments();

    const sendMutation = useSendNotification();

    // Form State
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [deepLink, setDeepLink] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [segmentId, setSegmentId] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [platformFilter, setPlatformFilter] = useState('ALL');

    // Handle Template Selection
    useEffect(() => {
        if (templateId) {
            const tmpl = templates.find((t: any) => t.id === templateId);
            if (tmpl) {
                setTitle(tmpl.title);
                setBody(tmpl.body);
                setImageUrl(tmpl.imageUrl || '');
                setDeepLink(tmpl.deepLink || '');
            }
        }
    }, [templateId, templates]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!title.trim() && !templateId)) {
            toast.error('Title is required');
            return;
        }

        const filters: any = {};
        if (platformFilter !== 'ALL') filters.platform = platformFilter;

        try {
            await sendMutation.mutateAsync({
                title,
                body,
                imageUrl,
                deepLink,
                templateId: templateId || undefined,
                segmentId: segmentId || undefined,
                scheduledAt: scheduledAt || undefined,
                filters: Object.keys(filters).length > 0 ? filters : undefined
            });

            if (scheduledAt) {
                toast.success('Notification scheduled!');
            } else {
                toast.success('Notification sent!');
            }

            // Reset crucial fields, keep specialized ones if user wants to send similar? No, reset all usually.
            setTitle('');
            setBody('');
            setImageUrl('');
            setDeepLink('');
            setScheduledAt('');
            setTemplateId('');
        } catch {
            toast.error('Failed to send notification');
        }
    };

    const totalDevices = devices?.total ?? 0;
    const isLoading = historyLoading || devicesLoading;

    // Derived audience count (mock logic for display)
    const getTargetAudienceText = () => {
        if (segmentId) {
            const seg = segments.find((s: any) => s.id === segmentId);
            return seg ? `Targeting segment: ${seg.name}` : 'Unknown segment';
        }
        if (platformFilter !== 'ALL') {
            return `Targeting ${platformFilter} users`;
        }
        return `All ${totalDevices} registered devices`;
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Push Notifications"
                    description="Send, schedule, and manage push notifications"
                    actions={
                        <Link href="/notifications/templates">
                            <Button variant="secondary" leftIcon={<Layers size={18} />}>
                                Manage Templates
                            </Button>
                        </Link>
                    }
                />

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Send Form */}
                    <Card className="lg:col-span-2">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Send size={20} />
                                Compose Notification
                            </h2>
                            <form onSubmit={handleSend} className="space-y-4">
                                {/* Template & Segment Row */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Select
                                        label="Use Template (Optional)"
                                        options={[
                                            { value: '', label: 'None (Custom)' },
                                            ...templates.map((t: any) => ({ value: t.id, label: t.name }))
                                        ]}
                                        value={templateId}
                                        onChange={(e) => setTemplateId(e.target.value)}
                                    />
                                    <Select
                                        label="Audience Segment"
                                        options={[
                                            { value: '', label: 'All Users (Default)' },
                                            ...segments.map((s: any) => ({ value: s.id, label: s.name }))
                                        ]}
                                        value={segmentId}
                                        onChange={(e) => setSegmentId(e.target.value)}
                                        disabled={platformFilter !== 'ALL'}
                                        helperText={platformFilter !== 'ALL' ? "Disabled because manual platform filter is active" : ""}
                                    />
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <Select
                                        label="Platform Filter"
                                        options={[
                                            { value: 'ALL', label: 'All Platforms' },
                                            { value: 'android', label: 'Android' },
                                            { value: 'ios', label: 'iOS' },
                                            { value: 'web', label: 'Web' },
                                        ]}
                                        value={platformFilter}
                                        onChange={(e) => setPlatformFilter(e.target.value)}
                                    />
                                </div>

                                <Input
                                    label="Title"
                                    placeholder="Notification title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    maxLength={100}
                                    required={!templateId}
                                />
                                <FormTextarea
                                    label="Message"
                                    placeholder="Notification message..."
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    maxLength={500}
                                    showCount
                                    autoResize
                                    minRows={3}
                                />

                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input
                                        label="Image URL"
                                        placeholder="https://..."
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        leftIcon={<ImageIcon size={16} />}
                                    />
                                    <Input
                                        label="Deep Link"
                                        placeholder="app://..."
                                        value={deepLink}
                                        onChange={(e) => setDeepLink(e.target.value)}
                                        leftIcon={<LinkIcon size={16} />}
                                    />
                                </div>

                                <div className="pt-4 border-t border-[var(--border)]">
                                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Calendar size={16} /> Scheduling
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <Input
                                            type="datetime-local"
                                            value={scheduledAt}
                                            onChange={(e) => setScheduledAt(e.target.value)}
                                            helperText="Leave empty to send immediately"
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    fullWidth
                                    isLoading={sendMutation.isPending}
                                    leftIcon={scheduledAt ? <Calendar size={18} /> : <Bell size={18} />}
                                >
                                    {scheduledAt ? 'Schedule Notification' : `Send to ${getTargetAudienceText()}`}
                                </Button>
                            </form>
                        </div>
                    </Card>

                    {/* Right Column: Stats & History */}
                    <div className="space-y-6">
                        {/* Device Stats */}
                        <Card>
                            <div className="p-6">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Smartphone size={20} />
                                    Registered Devices
                                </h2>
                                {devicesLoading ? (
                                    <div className="space-y-3">
                                        <SkeletonCard />
                                    </div>
                                ) : totalDevices === 0 ? (
                                    <p className="text-[var(--text-muted)] text-center py-8">
                                        No devices registered
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-center p-4 bg-[var(--bg-secondary)] rounded-xl">
                                            <p className="text-4xl font-bold">{totalDevices}</p>
                                            <p className="text-[var(--text-secondary)] text-sm">
                                                Total Devices
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            {devices && (
                                                <>
                                                    <div className="flex justify-between items-center p-3 bg-[var(--bg-secondary)] rounded-lg">
                                                        <span className="flex items-center gap-2">
                                                            <Smartphone size={16} />
                                                            Android
                                                        </span>
                                                        <span className="font-semibold">{devices.android}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 bg-[var(--bg-secondary)] rounded-lg">
                                                        <span className="flex items-center gap-2">
                                                            <Smartphone size={16} />
                                                            iOS
                                                        </span>
                                                        <span className="font-semibold">{devices.ios}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 bg-[var(--bg-secondary)] rounded-lg">
                                                        <span className="flex items-center gap-2">
                                                            <Monitor size={16} />
                                                            Web
                                                        </span>
                                                        <span className="font-semibold">{devices.web}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Simple History Preview (Last 5) */}
                        <Card>
                            <div className="p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold">Recent Activity</h3>
                                    <Link href="/notifications/history" className="text-xs text-[var(--accent)] hover:underline">View All</Link>
                                </div>
                                <div className="space-y-3">
                                    {history.slice(0, 5).map((n: any) => (
                                        <div key={n.id} className="text-sm p-3 bg-[var(--bg-secondary)] rounded-lg">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-medium truncate">{n.title}</span>
                                                <Badge
                                                    variant={n.status === 'SENT' ? 'green' : n.status === 'SCHEDULED' ? 'blue' : 'gray'}
                                                    className="text-[10px] px-1 py-0"
                                                >
                                                    {n.status}
                                                </Badge>
                                            </div>
                                            <p className="text-[var(--text-muted)] text-xs mb-1 truncate">{n.body}</p>
                                            <div className="text-[10px] text-[var(--text-muted)] flex justify-between">
                                                <span>{n.scheduledAt ? formatRelativeTime(new Date(n.scheduledAt)) : formatRelativeTime(new Date(n.sentAt || n.createdAt))}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {history.length === 0 && (
                                        <p className="text-center text-[var(--text-muted)] py-4">No history yet</p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Full History Section (Optional, or moved to separate page) */}
            </div>
        </AdminLayout>
    );
}
