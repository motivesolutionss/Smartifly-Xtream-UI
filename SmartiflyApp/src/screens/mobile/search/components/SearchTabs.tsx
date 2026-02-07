/**
 * Smartifly SearchTabs Component
 *
 * Tab bar for filtering search results.
 */

import React, { memo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, Icon, IconName } from '../../../../theme';

export type SearchTabType = 'all' | 'live' | 'movies' | 'series';

export interface SearchTabItem {
    id: SearchTabType;
    label: string;
    icon: IconName;
    color: string;
    count?: number;
}

export interface SearchTabsProps {
    activeTab: SearchTabType;
    onTabChange: (tab: SearchTabType) => void;
    counts?: {
        all?: number;
        live?: number;
        movies?: number;
        series?: number;
    };
    style?: ViewStyle;
}

const DEFAULT_TABS: SearchTabItem[] = [
    { id: 'all', label: 'All', icon: 'magnifyingGlass', color: colors.accent },
    { id: 'live', label: 'Live', icon: 'television', color: colors.live },
    { id: 'movies', label: 'Movies', icon: 'filmStrip', color: colors.movies },
    { id: 'series', label: 'Series', icon: 'monitorPlay', color: colors.series },
];

const SearchTabs: React.FC<SearchTabsProps> = ({
    activeTab,
    onTabChange,
    counts,
    style,
}) => {
    const allCount = counts
        ? (counts.live || 0) + (counts.movies || 0) + (counts.series || 0)
        : undefined;

    const getCount = (tabId: SearchTabType): number | undefined => {
        if (!counts) return undefined;
        if (tabId === 'all') return allCount;
        return counts[tabId];
    };

    return (
        <View style={[styles.container, style]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {DEFAULT_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const count = getCount(tab.id);

                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.tab,
                                isActive && [styles.tabActive, { backgroundColor: tab.color }],
                            ]}
                            onPress={() => onTabChange(tab.id)}
                            activeOpacity={0.7}
                        >
                            <Icon
                                name={tab.icon}
                                size={14}
                                color={isActive ? colors.textPrimary : colors.textSecondary}
                            />

                            <Text
                                style={[
                                    styles.tabLabel,
                                    isActive && styles.tabLabelActive,
                                ]}
                            >
                                {tab.label}
                            </Text>

                            {count !== undefined && count > 0 && (
                                <View
                                    style={[
                                        styles.countBadge,
                                        isActive && styles.countBadgeActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.countText,
                                            isActive && styles.countTextActive,
                                        ]}
                                    >
                                        {count > 99 ? '99+' : count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

export interface SearchPillsProps {
    activeTab: SearchTabType;
    onTabChange: (tab: SearchTabType) => void;
    counts?: {
        all?: number;
        live?: number;
        movies?: number;
        series?: number;
    };
    style?: ViewStyle;
}

export const SearchPills: React.FC<SearchPillsProps> = ({
    activeTab,
    onTabChange,
    counts,
    style,
}) => {
    const allCount = counts
        ? (counts.live || 0) + (counts.movies || 0) + (counts.series || 0)
        : undefined;

    const getCount = (tabId: SearchTabType): number | undefined => {
        if (!counts) return undefined;
        if (tabId === 'all') return allCount;
        return counts[tabId];
    };

    return (
        <View style={[styles.pillsContainer, style]}>
            {DEFAULT_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = getCount(tab.id);

                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={[
                            styles.pill,
                            isActive && [styles.pillActive, { backgroundColor: `${tab.color}20`, borderColor: tab.color }],
                        ]}
                        onPress={() => onTabChange(tab.id)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.pillLabel,
                                isActive && [styles.pillLabelActive, { color: tab.color }],
                            ]}
                        >
                            {tab.label}
                        </Text>
                        {count !== undefined && count > 0 && (
                            <Text
                                style={[
                                    styles.pillCount,
                                    isActive && [styles.pillCountActive, { color: tab.color }],
                                ]}
                            >
                                ({count})
                            </Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: spacing.md,
    },
    scrollContent: {
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.backgroundTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.xs,
    },
    tabActive: {
        borderColor: 'transparent',
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    tabLabelActive: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    countBadge: {
        backgroundColor: colors.glass,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.round,
        minWidth: 20,
        alignItems: 'center',
    },
    countBadgeActive: {
        backgroundColor: colors.borderStrong,
    },
    countText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
    },
    countTextActive: {
        color: colors.textPrimary,
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        backgroundColor: colors.backgroundTertiary,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.xxs,
    },
    pillActive: {},
    pillLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textMuted,
    },
    pillLabelActive: {
        fontWeight: '600',
    },
    pillCount: {
        fontSize: 12,
        color: colors.textMuted,
    },
    pillCountActive: {},
});

export default memo(SearchTabs);
