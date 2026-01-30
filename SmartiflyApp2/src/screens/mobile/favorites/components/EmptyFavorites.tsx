/**
 * Smartifly EmptyFavorites Component
 * 
 * Empty state for favorites:
 * - Icon and message
 * - Action button
 * - Type-specific messages
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
} from 'react-native';

import { FavoritesTabType } from './FavoritesTabs';

import { colors, spacing, borderRadius } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export interface EmptyFavoritesProps {
    activeTab?: FavoritesTabType;
    onExplore?: () => void;
    style?: ViewStyle;
}

// =============================================================================
// CONFIG
// =============================================================================

interface EmptyConfig {
    icon: string;
    title: string;
    description: string;
    buttonText: string;
}

const EMPTY_CONFIGS: Record<FavoritesTabType, EmptyConfig> = {
    all: {
        icon: '❤️',
        title: 'No Favorites Yet',
        description: 'Start adding your favorite content by tapping the heart icon on any movie, series, or channel.',
        buttonText: 'Explore Content',
    },
    live: {
        icon: '📺',
        title: 'No Live Channels',
        description: 'Add your favorite live TV channels to access them quickly.',
        buttonText: 'Browse Channels',
    },
    movies: {
        icon: '🎬',
        title: 'No Movies Saved',
        description: 'Save movies you want to watch later by tapping the heart icon.',
        buttonText: 'Browse Movies',
    },
    series: {
        icon: '📀',
        title: 'No Series Saved',
        description: 'Keep track of series you\'re watching by adding them to favorites.',
        buttonText: 'Browse Series',
    },
};

// =============================================================================
// EMPTY FAVORITES COMPONENT
// =============================================================================

const EmptyFavorites: React.FC<EmptyFavoritesProps> = ({
    activeTab = 'all',
    onExplore,
    style,
}) => {
    const config = EMPTY_CONFIGS[activeTab];

    return (
        <View style={[styles.container, style]}>
            {/* Icon */}
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{config.icon}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{config.title}</Text>

            {/* Description */}
            <Text style={styles.description}>{config.description}</Text>

            {/* How to Add */}
            <View style={styles.howTo}>
                <Text style={styles.howToTitle}>How to add favorites:</Text>
                <View style={styles.howToItem}>
                    <Text style={styles.howToIcon}>1️⃣</Text>
                    <Text style={styles.howToText}>Browse content on Home, Live, Movies, or Series</Text>
                </View>
                <View style={styles.howToItem}>
                    <Text style={styles.howToIcon}>2️⃣</Text>
                    <Text style={styles.howToText}>Tap the heart icon 🤍 on any item</Text>
                </View>
                <View style={styles.howToItem}>
                    <Text style={styles.howToIcon}>3️⃣</Text>
                    <Text style={styles.howToText}>It will appear here in your favorites ❤️</Text>
                </View>
            </View>

            {/* Action Button */}
            {onExplore && (
                <TouchableOpacity
                    style={styles.button}
                    onPress={onExplore}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>{config.buttonText}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

// =============================================================================
// COMPACT VARIANT
// =============================================================================

export interface EmptyFavoritesCompactProps {
    message?: string;
    style?: ViewStyle;
}

export const EmptyFavoritesCompact: React.FC<EmptyFavoritesCompactProps> = ({
    message = 'No favorites in this category',
    style,
}) => (
    <View style={[styles.compactContainer, style]}>
        <Text style={styles.compactIcon}>🤍</Text>
        <Text style={styles.compactMessage}>{message}</Text>
    </View>
);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.xl,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    icon: {
        fontSize: 36,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 280,
    },
    howTo: {
        marginTop: spacing.xl,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        padding: spacing.base,
        width: '100%',
        maxWidth: 300,
    },
    howToTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    howToItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
        gap: spacing.sm,
    },
    howToIcon: {
        fontSize: 14,
    },
    howToText: {
        flex: 1,
        fontSize: 13,
        color: colors.textMuted,
        lineHeight: 18,
    },
    button: {
        marginTop: spacing.xl,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },

    // Compact
    compactContainer: {
        paddingVertical: spacing.xxl,
        alignItems: 'center',
    },
    compactIcon: {
        fontSize: 32,
        marginBottom: spacing.md,
    },
    compactMessage: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
});

export default EmptyFavorites;