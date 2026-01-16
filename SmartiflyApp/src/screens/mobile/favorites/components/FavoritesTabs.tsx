/**
 * Smartifly FavoritesTabs Component
 * 
 * Tab bar for filtering favorites:
 * - All
 * - Live TV
 * - Movies  
 * - Series
 * - With counts
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ViewStyle,
} from 'react-native';

import { colors, spacing, borderRadius } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export type FavoritesTabType = 'all' | 'live' | 'movies' | 'series';

export interface FavoritesTabItem {
    id: FavoritesTabType;
    label: string;
    icon: string;
    color: string;
}

export interface FavoritesTabsProps {
    activeTab: FavoritesTabType;
    onTabChange: (tab: FavoritesTabType) => void;
    counts: {
        total: number;
        live: number;
        movies: number;
        series: number;
    };
    style?: ViewStyle;
}

// =============================================================================
// DEFAULT TABS
// =============================================================================

const TABS: FavoritesTabItem[] = [
    { id: 'all', label: 'All', icon: '❤️', color: colors.accent },
    { id: 'live', label: 'Live', icon: '📺', color: colors.live },
    { id: 'movies', label: 'Movies', icon: '🎬', color: colors.movies },
    { id: 'series', label: 'Series', icon: '📀', color: colors.series },
];

// =============================================================================
// FAVORITES TABS COMPONENT
// =============================================================================

const FavoritesTabs: React.FC<FavoritesTabsProps> = ({
    activeTab,
    onTabChange,
    counts,
    style,
}) => {
    const getCount = (tabId: FavoritesTabType): number => {
        switch (tabId) {
            case 'all': return counts.total;
            case 'live': return counts.live;
            case 'movies': return counts.movies;
            case 'series': return counts.series;
            default: return 0;
        }
    };

    return (
        <View style={[styles.container, style]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {TABS.map((tab) => {
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
                            {/* Icon */}
                            <Text style={styles.tabIcon}>{tab.icon}</Text>

                            {/* Label */}
                            <Text style={[
                                styles.tabLabel,
                                isActive && styles.tabLabelActive,
                            ]}>
                                {tab.label}
                            </Text>

                            {/* Count */}
                            <View style={[
                                styles.countBadge,
                                isActive && styles.countBadgeActive,
                            ]}>
                                <Text style={[
                                    styles.countText,
                                    isActive && styles.countTextActive,
                                ]}>
                                    {count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

// =============================================================================
// SEGMENTED CONTROL VARIANT
// =============================================================================

export interface FavoritesSegmentedProps {
    activeTab: FavoritesTabType;
    onTabChange: (tab: FavoritesTabType) => void;
    counts: {
        total: number;
        live: number;
        movies: number;
        series: number;
    };
    style?: ViewStyle;
}

export const FavoritesSegmented: React.FC<FavoritesSegmentedProps> = ({
    activeTab,
    onTabChange,
    counts,
    style,
}) => {
    const getCount = (tabId: FavoritesTabType): number => {
        switch (tabId) {
            case 'all': return counts.total;
            case 'live': return counts.live;
            case 'movies': return counts.movies;
            case 'series': return counts.series;
            default: return 0;
        }
    };

    return (
        <View style={[styles.segmentedContainer, style]}>
            {TABS.map((tab, index) => {
                const isActive = activeTab === tab.id;
                const count = getCount(tab.id);
                const isFirst = index === 0;
                const isLast = index === TABS.length - 1;

                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={[
                            styles.segment,
                            isFirst && styles.segmentFirst,
                            isLast && styles.segmentLast,
                            isActive && [styles.segmentActive, { backgroundColor: tab.color }],
                        ]}
                        onPress={() => onTabChange(tab.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.segmentLabel,
                            isActive && styles.segmentLabelActive,
                        ]}>
                            {tab.label}
                        </Text>
                        <Text style={[
                            styles.segmentCount,
                            isActive && styles.segmentCountActive,
                        ]}>
                            ({count})
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

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
    tabIcon: {
        fontSize: 14,
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
        minWidth: 22,
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

    // Segmented variant
    segmentedContainer: {
        flexDirection: 'row',
        marginHorizontal: spacing.base,
        marginVertical: spacing.md,
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.lg,
        padding: spacing.xxs,
    },
    segment: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.xxs,
    },
    segmentFirst: {
        borderTopLeftRadius: borderRadius.lg - 2,
        borderBottomLeftRadius: borderRadius.lg - 2,
    },
    segmentLast: {
        borderTopRightRadius: borderRadius.lg - 2,
        borderBottomRightRadius: borderRadius.lg - 2,
    },
    segmentActive: {
        borderRadius: borderRadius.lg - 2,
    },
    segmentLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textMuted,
    },
    segmentLabelActive: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    segmentCount: {
        fontSize: 11,
        color: colors.textMuted,
    },
    segmentCountActive: {
        color: colors.textSecondary,
    },
});

export default FavoritesTabs;