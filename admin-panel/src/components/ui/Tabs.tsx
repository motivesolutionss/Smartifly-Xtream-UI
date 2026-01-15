'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
    /** Unique key */
    key: string;
    /** Tab label */
    label: ReactNode;
    /** Tab icon */
    icon?: ReactNode;
    /** Tab content */
    content: ReactNode;
    /** Whether tab is disabled */
    disabled?: boolean;
}

export interface TabsProps {
    /** Tab definitions */
    tabs: Tab[];
    /** Default active tab key */
    defaultTab?: string;
    /** Controlled active tab */
    activeTab?: string;
    /** Callback when tab changes */
    onTabChange?: (key: string) => void;
    /** Tab layout orientation */
    orientation?: 'horizontal' | 'vertical';
    /** Tab variant style */
    variant?: 'default' | 'pills' | 'underline';
    /** Full width tabs */
    fullWidth?: boolean;
    /** Additional class for container */
    className?: string;
    /** Additional class for tab list */
    tabListClassName?: string;
    /** Additional class for content */
    contentClassName?: string;
}

/**
 * Tabs component with horizontal/vertical orientation and multiple variants
 * 
 * @example
 * <Tabs
 *   tabs={[
 *     { key: 'overview', label: 'Overview', content: <OverviewPanel /> },
 *     { key: 'details', label: 'Details', icon: <Info size={14} />, content: <DetailsPanel /> },
 *     { key: 'history', label: 'History', content: <HistoryPanel /> },
 *   ]}
 *   defaultTab="overview"
 *   variant="underline"
 * />
 */
export function Tabs({
    tabs,
    defaultTab,
    activeTab: controlledActiveTab,
    onTabChange,
    orientation = 'horizontal',
    variant = 'default',
    fullWidth = false,
    className,
    tabListClassName,
    contentClassName,
}: TabsProps) {
    const [internalActiveTab, setInternalActiveTab] = useState(
        defaultTab || tabs[0]?.key || ''
    );

    const activeTab = controlledActiveTab ?? internalActiveTab;

    const handleTabClick = (key: string) => {
        if (controlledActiveTab === undefined) {
            setInternalActiveTab(key);
        }
        onTabChange?.(key);
    };

    const activeContent = tabs.find((tab) => tab.key === activeTab)?.content;

    const tabStyles = {
        default: {
            list: 'bg-[var(--bg-secondary)] p-1 rounded-xl',
            tab: 'rounded-lg',
            active: 'bg-[var(--bg-card)] shadow-sm',
            inactive: 'hover:bg-[var(--bg-card)]/50',
        },
        pills: {
            list: 'gap-2',
            tab: 'rounded-full px-4',
            active: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white',
            inactive: 'bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] border border-[var(--border)]',
        },
        underline: {
            list: 'border-b border-[var(--border)]',
            tab: 'border-b-2 -mb-px rounded-none',
            active: 'border-indigo-500 text-indigo-400',
            inactive: 'border-transparent hover:border-[var(--text-muted)]',
        },
    };

    const styles = tabStyles[variant];

    return (
        <div
            className={cn(
                'w-full',
                orientation === 'vertical' && 'flex gap-6',
                className
            )}
        >
            {/* Tab List */}
            <div
                role="tablist"
                className={cn(
                    'flex',
                    orientation === 'horizontal' && 'flex-row mb-4',
                    orientation === 'vertical' && 'flex-col w-48 shrink-0',
                    fullWidth && 'w-full',
                    styles.list,
                    tabListClassName
                )}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        aria-controls={`tabpanel-${tab.key}`}
                        className={cn(
                            'flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all',
                            fullWidth && 'flex-1',
                            styles.tab,
                            activeTab === tab.key
                                ? cn('text-[var(--text-primary)]', styles.active)
                                : cn('text-[var(--text-secondary)]', styles.inactive),
                            tab.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        onClick={() => !tab.disabled && handleTabClick(tab.key)}
                        disabled={tab.disabled}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div
                role="tabpanel"
                id={`tabpanel-${activeTab}`}
                className={cn('flex-1', contentClassName)}
            >
                {activeContent}
            </div>
        </div>
    );
}

// Simple TabGroup for manual control
export interface TabListProps {
    children: ReactNode;
    className?: string;
}

export function TabList({ children, className }: TabListProps) {
    return (
        <div
            role="tablist"
            className={cn(
                'flex bg-[var(--bg-secondary)] p-1 rounded-xl mb-4',
                className
            )}
        >
            {children}
        </div>
    );
}

export interface TabButtonProps {
    children: ReactNode;
    isActive?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}

export function TabButton({
    children,
    isActive,
    onClick,
    disabled,
    className,
}: TabButtonProps) {
    return (
        <button
            role="tab"
            aria-selected={isActive}
            className={cn(
                'flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                isActive
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]/50',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
