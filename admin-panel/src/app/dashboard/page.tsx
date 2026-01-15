'use client';

import { useRef, useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, StatsCard, SkeletonStats, TrendChart, SimpleBarChart, AdvancedBarChart, DonutChart, Heatmap, Button, DateRangePicker } from '@/components/ui';
import {
    RecentTicketsWidget,
    ActiveAnnouncementsWidget,
    PopularPackagesWidget,
    SystemHealthWidget,
} from '@/components/features';
import {
    useDashboardStats,
    useTickets,
    useAnnouncements,
    usePackages,
    usePackageAnalytics,
    useSocket,
    useDashboardAnalytics,
    useTicketAnalytics,
    useNotificationAnalytics,
    useAdminActivityHeatmap,
} from '@/hooks';
import {
    Globe,
    Ticket,
    Package,
    Bell,
    Plus,
    Eye,
    Send,
    Settings,
    TrendingUp,
    TrendingDown,
    Minus,
    Download,
    Clock,
    CheckCircle,
    AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function DashboardPage() {
    useSocket(); // Enable real-time updates

    // Date range state
    const [date, setDate] = useState<DateRange | undefined>({
        from: addDays(new Date(), -7),
        to: new Date(),
    });

    // Extract dates for API calls
    const startDate = date?.from;
    const endDate = date?.to;

    // Legacy stats hook (for basic counts)
    const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();

    // New analytics hooks with date range
    const { data: dashboardAnalytics, isLoading: analyticsLoading } = useDashboardAnalytics(startDate, endDate);
    const { data: ticketAnalytics, isLoading: ticketAnalyticsLoading } = useTicketAnalytics(startDate, endDate);
    const { data: notificationAnalytics, isLoading: notificationAnalyticsLoading } = useNotificationAnalytics(startDate, endDate);
    const { data: heatmapData, isLoading: heatmapLoading } = useAdminActivityHeatmap(startDate, endDate);

    // Legacy data (for widgets)
    const { data: tickets = [], isLoading: ticketsLoading } = useTickets();
    const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements();
    const { data: packages = [], isLoading: packagesLoading } = usePackages();
    const { data: packageAnalytics } = usePackageAnalytics();

    const dashboardRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!dashboardRef.current) return;

        try {
            setIsExporting(true);
            const dataUrl = await toPng(dashboardRef.current, {
                quality: 0.95,
                backgroundColor: '#0a0a0f',
                style: { margin: '0' },
            });

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [dashboardRef.current.scrollWidth, dashboardRef.current.scrollHeight],
            });

            pdf.addImage(dataUrl, 'PNG', 0, 0, dashboardRef.current.scrollWidth, dashboardRef.current.scrollHeight);
            pdf.save(`dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    // Filter recent open tickets
    const recentTickets = useMemo(() => {
        return tickets
            .filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
            .slice(0, 5)
            .map((t: any) => ({
                id: t.id,
                ticketNo: t.ticketNo,
                subject: t.subject,
                status: t.status,
                createdAt: t.createdAt,
            }));
    }, [tickets]);

    // Filter active announcements
    const activeAnnouncements = useMemo(() => {
        return announcements
            .filter((a) => a.isActive)
            .slice(0, 5)
            .map((a) => ({
                id: a.id,
                title: a.title,
                type: a.type,
                createdAt: a.createdAt,
            }));
    }, [announcements]);

    // Get popular packages
    const popularPackages = useMemo(() => {
        return packages
            .sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0))
            .slice(0, 5)
            .map((p) => ({
                id: p.id,
                name: p.name,
                duration: p.duration,
                price: p.price,
                isPopular: p.isPopular,
            }));
    }, [packages]);

    // Use real ticket trends from analytics API
    const ticketTrendData = useMemo(() => {
        if (dashboardAnalytics?.trends && dashboardAnalytics.trends.length > 0) {
            return dashboardAnalytics.trends.map(t => ({
                name: t.date,
                value: t.tickets,
            }));
        }
        // Fallback: generate from ticket timeline
        if (ticketAnalytics?.timeline) {
            return ticketAnalytics.timeline.map(t => ({
                name: t.date,
                value: t.created,
            }));
        }
        return [];
    }, [dashboardAnalytics, ticketAnalytics]);

    // Package analytics chart data - uses real analytics from API
    const packageChartData = useMemo(() => {
        if (packageAnalytics && Array.isArray(packageAnalytics)) {
            return (packageAnalytics as Array<{
                package: { name: string };
                views: number;
                purchases: number;
                revenue: number;
            }>).map(a => ({
                name: a.package?.name || 'Unknown',
                value: a.purchases || 0,
                revenue: Math.round(a.revenue || 0),
            }));
        }
        // Fallback to basic data if no analytics
        return popularPackages.map(p => ({
            name: p.name,
            value: 0,
            revenue: 0,
        }));
    }, [packageAnalytics, popularPackages]);

    // Notification delivery chart data
    const notificationChartData = useMemo(() => {
        if (notificationAnalytics?.timeline) {
            return notificationAnalytics.timeline.map(n => ({
                name: n.date,
                value: n.sent,
                failed: n.failed,
            }));
        }
        return [];
    }, [notificationAnalytics]);

    const isLoading = statsLoading || ticketsLoading || announcementsLoading || packagesLoading;

    // Get date range label
    const dateRangeLabel = useMemo(() => {
        if (date?.from && date?.to) {
            return `${format(date.from, 'MMM d')} - ${format(date.to, 'MMM d, yyyy')}`;
        }
        return 'Last 7 days';
    }, [date]);

    return (
        <AdminLayout>
            <div className="space-y-6" ref={dashboardRef}>
                {/* Page Header */}
                <PageHeader
                    title="Dashboard"
                    description="Analytics overview and system metrics"
                    actions={
                        <div className="flex items-center gap-2">
                            <DateRangePicker date={date} onSelect={setDate} />
                            <Button
                                variant="secondary"
                                leftIcon={<Download size={16} />}
                                onClick={handleExport}
                                isLoading={isExporting}
                            >
                                Export
                            </Button>
                        </div>
                    }
                />

                {/* Stats Grid */}
                {statsLoading ? (
                    <SkeletonStats />
                ) : statsError ? (
                    <Card padding="md" className="text-center text-red-400">
                        Failed to load statistics. Please refresh the page.
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatsCard
                            title="Portals"
                            value={dashboardAnalytics?.summary.portals ?? stats?.portals ?? 0}
                            icon={<Globe size={24} />}
                        />
                        <StatsCard
                            title="Open Tickets"
                            value={dashboardAnalytics?.summary.openTickets ?? stats?.openTickets ?? 0}
                            icon={<Ticket size={24} />}
                            trend={dashboardAnalytics?.comparison.tickets ?? undefined}
                        />
                        <StatsCard
                            title="Packages"
                            value={dashboardAnalytics?.summary.packages ?? stats?.packages ?? 0}
                            icon={<Package size={24} />}
                        />
                        <StatsCard
                            title="Registered Devices"
                            value={dashboardAnalytics?.summary.devices ?? stats?.devices ?? 0}
                            icon={<Bell size={24} />}
                            trend={dashboardAnalytics?.comparison.devices ?? undefined}
                        />
                    </div>
                )}

                {/* Resolution Time & Delivery Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <div className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Clock size={24} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Avg Resolution Time</p>
                                <p className="text-2xl font-bold">
                                    {dashboardAnalytics?.summary.avgResolutionHours
                                        ? `${dashboardAnalytics.summary.avgResolutionHours}h`
                                        : ticketAnalytics?.resolutionStats.average
                                            ? `${ticketAnalytics.resolutionStats.average}h`
                                            : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <CheckCircle size={24} className="text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Tickets Resolved</p>
                                <p className="text-2xl font-bold">
                                    {dashboardAnalytics?.summary.resolvedTickets ?? ticketAnalytics?.resolutionStats.totalResolved ?? 0}
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <Send size={24} className="text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Notification Delivery</p>
                                <p className="text-2xl font-bold">
                                    {dashboardAnalytics?.summary.deliveryRate ?? notificationAnalytics?.summary.deliveryRate ?? 100}%
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Quick Actions Card */}
                <Card>
                    <div className="p-4">
                        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/portals">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    leftIcon={<Plus size={16} />}
                                    className="justify-start"
                                >
                                    Add Portal
                                </Button>
                            </Link>
                            <Link href="/tickets">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    leftIcon={<Eye size={16} />}
                                    className="justify-start"
                                >
                                    View Tickets
                                </Button>
                            </Link>
                            <Link href="/notifications">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    leftIcon={<Send size={16} />}
                                    className="justify-start"
                                >
                                    Send Notification
                                </Button>
                            </Link>
                            <Link href="/settings">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    leftIcon={<Settings size={16} />}
                                    className="justify-start"
                                >
                                    Settings
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>

                {/* Ticket Intelligence Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TrendChart
                        title={`Ticket Trends (${dateRangeLabel})`}
                        subtitle="New tickets volume over time"
                        data={ticketTrendData}
                        color="primary"
                        height={220}
                        isLoading={analyticsLoading || ticketAnalyticsLoading}
                    />
                    {ticketAnalytics?.statusDistribution && (
                        <DonutChart
                            title="Tickets by Status"
                            subtitle="Current status distribution"
                            data={ticketAnalytics.statusDistribution}
                            height={180}
                            isLoading={ticketAnalyticsLoading}
                        />
                    )}
                    {!ticketAnalytics?.statusDistribution && (
                        <RecentTicketsWidget
                            tickets={recentTickets}
                            isLoading={ticketsLoading}
                        />
                    )}
                </div>

                {/* Notification Delivery Row */}
                {notificationAnalytics && notificationChartData.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SimpleBarChart
                            title="Notification Delivery"
                            subtitle="Sent notifications over time"
                            data={notificationChartData}
                            color="success"
                            height={220}
                            isLoading={notificationAnalyticsLoading}
                        />
                        <DonutChart
                            title="Notification Status"
                            subtitle="Delivery status breakdown"
                            data={notificationAnalytics.statusDistribution}
                            height={180}
                            isLoading={notificationAnalyticsLoading}
                        />
                    </div>
                )}

                {/* Package Intelligence Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AdvancedBarChart
                        title="Package Analytics"
                        subtitle="Sales vs Revenue Performance"
                        data={packageChartData}
                        primaryDataKey="value"
                        secondaryDataKey="revenue"
                        primaryName="Sales"
                        secondaryName="Revenue ($)"
                        primaryColor="success"
                        secondaryColor="secondary"
                        height={300}
                        isLoading={isLoading}
                    />
                    <PopularPackagesWidget
                        packages={popularPackages}
                        isLoading={packagesLoading}
                    />
                </div>

                {/* Admin Activity Heatmap */}
                {heatmapData && (
                    <Heatmap
                        title="Admin Activity Patterns"
                        subtitle={`Activity heatmap for ${dateRangeLabel}`}
                        data={heatmapData.heatmap}
                        dayLabels={heatmapData.dayLabels}
                        isLoading={heatmapLoading}
                    />
                )}

                {/* System & Announcements Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ActiveAnnouncementsWidget
                        announcements={activeAnnouncements}
                        isLoading={announcementsLoading}
                    />
                    <SystemHealthWidget isHealthy={true} lastChecked={new Date()} />
                </div>
            </div>
        </AdminLayout>
    );
}
