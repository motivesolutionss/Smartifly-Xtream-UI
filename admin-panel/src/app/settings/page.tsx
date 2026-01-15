'use client';

import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, SkeletonCard } from '@/components/ui';
import { useSettings, useUpdateSettings } from '@/hooks';
import type { UpdateSettingsDTO } from '@/types';
import toast from 'react-hot-toast';

// Tabs
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { MaintenanceSettings } from '@/components/settings/MaintenanceSettings';
import { FeatureFlagSettings } from '@/components/settings/FeatureFlagSettings';
import { BackupSettings } from '@/components/settings/BackupSettings';
import { AuditLogSettings } from '@/components/settings/AuditLogSettings';

import { Settings, Wrench, Flag, Database, Shield } from 'lucide-react';

export default function SettingsPage() {
    const { data: settings, isLoading, error } = useSettings();
    const updateMutation = useUpdateSettings();
    const [activeTab, setActiveTab] = useState('general');

    const handleUpdate = async (data: UpdateSettingsDTO) => {
        try {
            await updateMutation.mutateAsync(data);
            toast.success('Settings saved');
        } catch {
            toast.error('Failed to save');
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="space-y-6 max-w-5xl mx-auto">
                    <PageHeader title="Settings" description="System configuration and maintenance" />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </AdminLayout>
        );
    }

    if (error || !settings) {
        return (
            <AdminLayout>
                <div className="text-center py-12 text-red-400">
                    Failed to load settings
                </div>
            </AdminLayout>
        );
    }

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
        { id: 'features', label: 'Feature Flags', icon: Flag },
        { id: 'backups', label: 'Backups', icon: Database },
        { id: 'audit', label: 'Audit Logs', icon: Shield },
    ];

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-6xl mx-auto">
                <PageHeader
                    title="System Settings"
                    description="Manage application configuration, features, and system health"
                />

                {/* Tabs Navigation */}
                <div className="flex overflow-x-auto border-b border-[var(--border)] gap-1 mb-6">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                                    ${isActive
                                        ? 'border-[var(--primary)] text-[var(--primary)]'
                                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
                                    }
                                `}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="min-h-[500px]">
                    {activeTab === 'general' && (
                        <GeneralSettings settings={settings} onUpdate={handleUpdate} />
                    )}
                    {activeTab === 'maintenance' && (
                        <MaintenanceSettings settings={settings} onUpdate={handleUpdate} />
                    )}
                    {activeTab === 'features' && (
                        <FeatureFlagSettings />
                    )}
                    {activeTab === 'backups' && (
                        <BackupSettings />
                    )}
                    {activeTab === 'audit' && (
                        <AuditLogSettings />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
