'use client';

import { type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
    Ticket,
    Package,
    Megaphone,
    Bell,
    ArrowRight,
    AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

// Recent Tickets Widget
export interface RecentTicket {
    id: string;
    ticketNo: string;
    subject: string;
    status: string;
    createdAt: string;
}

export interface RecentTicketsWidgetProps {
    tickets: RecentTicket[];
    isLoading?: boolean;
    limit?: number;
}

export function RecentTicketsWidget({
    tickets,
    isLoading = false,
    limit = 5,
}: RecentTicketsWidgetProps) {
    if (isLoading) {
        return (
            <Card>
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="w-5 h-5 rounded" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Ticket size={20} className="text-indigo-400" />
                        Recent Tickets
                    </h3>
                    <Link
                        href="/tickets"
                        className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                        View all <ArrowRight size={14} />
                    </Link>
                </div>
                {tickets.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">
                        No recent tickets
                    </p>
                ) : (
                    <div className="space-y-3">
                        {tickets.slice(0, limit).map((ticket) => (
                            <Link
                                key={ticket.id}
                                href="/tickets"
                                className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {ticket.subject}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {ticket.ticketNo} • {formatRelativeTime(new Date(ticket.createdAt))}
                                    </p>
                                </div>
                                <StatusBadge status={ticket.status} />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}

// Active Announcements Widget
export interface ActiveAnnouncement {
    id: string;
    title: string;
    type: string;
    createdAt: string;
}

export interface ActiveAnnouncementsWidgetProps {
    announcements: ActiveAnnouncement[];
    isLoading?: boolean;
    limit?: number;
}

const announcementTypeIcons: Record<string, ReactNode> = {
    INFO: <AlertCircle size={14} className="text-blue-400" />,
    WARNING: <AlertCircle size={14} className="text-yellow-400" />,
    MAINTENANCE: <AlertCircle size={14} className="text-red-400" />,
    UPDATE: <AlertCircle size={14} className="text-green-400" />,
};

export function ActiveAnnouncementsWidget({
    announcements,
    isLoading = false,
    limit = 5,
}: ActiveAnnouncementsWidgetProps) {
    if (isLoading) {
        return (
            <Card>
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="w-5 h-5 rounded" />
                        <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Megaphone size={20} className="text-purple-400" />
                        Active Announcements
                    </h3>
                    <Link
                        href="/announcements"
                        className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                        View all <ArrowRight size={14} />
                    </Link>
                </div>
                {announcements.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">
                        No active announcements
                    </p>
                ) : (
                    <div className="space-y-2">
                        {announcements.slice(0, limit).map((announcement) => (
                            <div
                                key={announcement.id}
                                className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-secondary)]"
                            >
                                {announcementTypeIcons[announcement.type] || (
                                    <AlertCircle size={14} />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {announcement.title}
                                    </p>
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">
                                    {formatRelativeTime(new Date(announcement.createdAt))}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}

// Popular Packages Widget
export interface PopularPackage {
    id: string;
    name: string;
    duration: string;
    price: number;
    isPopular: boolean;
}

export interface PopularPackagesWidgetProps {
    packages: PopularPackage[];
    isLoading?: boolean;
    limit?: number;
}

export function PopularPackagesWidget({
    packages,
    isLoading = false,
    limit = 5,
}: PopularPackagesWidgetProps) {
    if (isLoading) {
        return (
            <Card>
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="w-5 h-5 rounded" />
                        <Skeleton className="h-5 w-36" />
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Package size={20} className="text-green-400" />
                        Popular Packages
                    </h3>
                    <Link
                        href="/packages"
                        className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                        View all <ArrowRight size={14} />
                    </Link>
                </div>
                {packages.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)] text-center py-4">
                        No packages found
                    </p>
                ) : (
                    <div className="space-y-2">
                        {packages.slice(0, limit).map((pkg) => (
                            <div
                                key={pkg.id}
                                className={cn(
                                    'flex items-center justify-between p-3 rounded-lg',
                                    pkg.isPopular
                                        ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30'
                                        : 'bg-[var(--bg-secondary)]'
                                )}
                            >
                                <div>
                                    <p className="text-sm font-medium">{pkg.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {pkg.duration}
                                    </p>
                                </div>
                                <span className="text-lg font-bold text-green-400">
                                    ${pkg.price}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
}

// System Health Widget
export interface SystemHealthProps {
    isHealthy: boolean;
    lastChecked?: Date;
}

export function SystemHealthWidget({ isHealthy, lastChecked }: SystemHealthProps) {
    return (
        <Card>
            <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">System Status</h3>
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'w-3 h-3 rounded-full',
                            isHealthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                        )}
                    />
                    <div>
                        <p className="font-medium">
                            {isHealthy ? 'All systems operational' : 'System issues detected'}
                        </p>
                        {lastChecked && (
                            <p className="text-xs text-[var(--text-muted)]">
                                Last checked {formatRelativeTime(lastChecked)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
