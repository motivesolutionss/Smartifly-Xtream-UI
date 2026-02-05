/**
 * Smartifly Skeleton Loader Components
 * 
 * Placeholder components for loading states:
 * - Hero skeleton
 * - Row skeleton
 * - Card skeleton
 * - Full screen skeleton
 */

import React from 'react';
import {
    View,
    StyleSheet,
    ViewStyle,
    Dimensions,
} from 'react-native';

import { colors, spacing, borderRadius } from '../../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Skeleton specific overrides (can be moved to theme later)
const skeletonColors = {
    base: 'rgba(255, 255, 255, 0.06)',
    highlight: 'rgba(255, 255, 255, 0.1)',
};

// =============================================================================
// BASE SKELETON BOX
// =============================================================================

interface SkeletonBoxProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
    width = '100%',
    height = 16,
    borderRadius: br = borderRadius.md,
    style,
}) => (
    <View
        style={[
            styles.skeletonBox,
            { width: width as any, height, borderRadius: br },
            style,
        ]}
    />
);

// =============================================================================
// HERO SKELETON
// =============================================================================

export const HeroSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
    <View style={[styles.heroContainer, style]}>
        <View style={styles.heroContent}>
            {/* Badge */}
            <SkeletonBox width={100} height={24} style={styles.heroBadge} />

            {/* Title */}
            <SkeletonBox width="80%" height={28} style={styles.heroTitle} />

            {/* Meta */}
            <SkeletonBox width="50%" height={16} style={styles.heroMeta} />

            {/* Button */}
            <SkeletonBox width={140} height={44} borderRadius={borderRadius.lg} style={styles.heroButton} />
        </View>
    </View>
);

// =============================================================================
// CATEGORY PILLS SKELETON
// =============================================================================

export const CategorySkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
    <View style={[styles.categoryContainer, style]}>
        {[80, 100, 90, 85].map((width, i) => (
            <SkeletonBox
                key={i}
                width={width}
                height={36}
                borderRadius={999}
                style={styles.categoryPill}
            />
        ))}
    </View>
);

// =============================================================================
// ROW SKELETON
// =============================================================================

interface RowSkeletonProps {
    cardCount?: number;
    variant?: 'poster' | 'thumbnail' | 'channel';
    style?: ViewStyle;
}

export const RowSkeleton: React.FC<RowSkeletonProps> = ({
    cardCount = 5,
    variant = 'poster',
    style,
}) => {
    const getCardSize = () => {
        switch (variant) {
            case 'thumbnail': return { width: 160, height: 90 };
            case 'channel': return { width: 100, height: 100 };
            default: return { width: 120, height: 180 };
        }
    };

    const size = getCardSize();

    return (
        <View style={[styles.rowContainer, style]}>
            {/* Header */}
            <View style={styles.rowHeader}>
                <View style={styles.rowHeaderLeft}>
                    <SkeletonBox width={8} height={8} borderRadius={4} />
                    <SkeletonBox width={120} height={18} />
                </View>
                <SkeletonBox width={60} height={16} />
            </View>

            {/* Cards */}
            <View style={styles.rowCards}>
                {Array.from({ length: cardCount }).map((_, i) => (
                    <View key={i} style={styles.cardContainer}>
                        <SkeletonBox
                            width={size.width}
                            height={size.height}
                            borderRadius={borderRadius.lg}
                        />
                        <SkeletonBox
                            width={size.width * 0.8}
                            height={14}
                            style={styles.cardTitle}
                        />
                    </View>
                ))}
            </View>
        </View>
    );
};

// =============================================================================
// FULL HOME SKELETON
// =============================================================================

export const HomeScreenSkeleton: React.FC = () => (
    <View style={styles.screenContainer}>
        {/* Header */}
        <View style={styles.headerSkeleton}>
            <View style={styles.headerLeft}>
                <SkeletonBox width={36} height={36} borderRadius={10} />
                <View>
                    <SkeletonBox width={100} height={18} style={styles.headerTitle} />
                    <SkeletonBox width={80} height={12} style={styles.headerSubtitle} />
                </View>
            </View>
            <View style={styles.headerRight}>
                <SkeletonBox width={40} height={40} borderRadius={12} />
                <SkeletonBox width={40} height={40} borderRadius={20} />
            </View>
        </View>

        {/* Hero */}
        <HeroSkeleton style={styles.heroSection} />

        {/* Categories */}
        <CategorySkeleton style={styles.categorySection} />

        {/* Content Rows */}
        <RowSkeleton style={styles.rowSection} />
        <RowSkeleton style={styles.rowSection} />
        <RowSkeleton cardCount={4} style={styles.rowSection} />
    </View>
);

// =============================================================================
// GRID SKELETON
// =============================================================================

interface GridSkeletonProps {
    columns?: number;
    rows?: number;
    variant?: 'poster' | 'thumbnail';
    style?: ViewStyle;
}

export const GridSkeleton: React.FC<GridSkeletonProps> = ({
    columns = 3,
    rows = 3,
    variant = 'poster',
    style,
}) => {
    const isPoster = variant === 'poster';
    const cardWidth = (SCREEN_WIDTH - spacing.base * 2 - spacing.sm * (columns - 1)) / columns;
    const cardHeight = isPoster ? cardWidth * 1.5 : cardWidth * 0.56;

    return (
        <View style={[styles.gridContainer, style]}>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                    {Array.from({ length: columns }).map((__, colIndex) => (
                        <View key={colIndex} style={[styles.gridCard, { width: cardWidth }]}>
                            <SkeletonBox
                                width={cardWidth}
                                height={cardHeight}
                                borderRadius={borderRadius.lg}
                            />
                            <SkeletonBox
                                width={cardWidth * 0.8}
                                height={12}
                                style={styles.gridCardTitle}
                            />
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    skeletonBox: {
        backgroundColor: skeletonColors.base,
    },

    // Hero
    heroContainer: {
        height: 220,
        marginHorizontal: spacing.base,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.backgroundSecondary,
        justifyContent: 'flex-end',
        padding: spacing.base,
    },
    heroContent: {
        gap: spacing.sm,
    },
    heroBadge: {
        marginBottom: spacing.xs,
    },
    heroTitle: {
        marginBottom: spacing.xxs,
    },
    heroMeta: {
        marginBottom: spacing.sm,
    },
    heroButton: {
        marginTop: spacing.xs,
    },

    // Categories
    categoryContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
        marginVertical: spacing.md,
    },
    categoryPill: {},

    // Row
    rowContainer: {
        marginBottom: spacing.lg,
    },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.base,
        marginBottom: spacing.md,
    },
    rowHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    rowCards: {
        flexDirection: 'row',
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
    },
    cardContainer: {
        gap: spacing.xs,
    },
    cardTitle: {
        marginTop: spacing.xs,
    },

    // Screen
    screenContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.base,
        paddingTop: 60, // Account for status bar
        paddingBottom: spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerTitle: {
        marginBottom: spacing.xxs,
    },
    headerSubtitle: {},
    headerRight: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    heroSection: {
        marginTop: spacing.sm,
    },
    categorySection: {
        marginTop: spacing.md,
    },
    rowSection: {
        marginTop: spacing.lg,
    },

    // Grid
    gridContainer: {
        paddingHorizontal: spacing.base,
    },
    gridRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    gridCard: {
        gap: spacing.xs,
    },
    gridCardTitle: {
        marginTop: spacing.xs,
    },
});

export default HomeScreenSkeleton;