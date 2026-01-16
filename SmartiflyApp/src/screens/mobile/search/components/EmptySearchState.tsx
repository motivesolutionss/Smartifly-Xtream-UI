/**
 * Smartifly EmptySearchState Component
 * 
 * Empty states for search:
 * - Initial (no search yet)
 * - No results found
 * - Error state
 * - Suggestions
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
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

export type EmptyStateType = 'initial' | 'no-results' | 'error';

export interface EmptySearchStateProps {
    type: EmptyStateType;
    query?: string;
    suggestions?: string[];
    onSuggestionPress?: (suggestion: string) => void;
    onRetry?: () => void;
    style?: ViewStyle;
}

// =============================================================================
// STATE CONFIGS
// =============================================================================

interface StateConfig {
    icon: string;
    title: string;
    description: string | ((query?: string) => string);
}

const STATE_CONFIGS: Record<EmptyStateType, StateConfig> = {
    initial: {
        icon: '🔍',
        title: 'Search Everything',
        description: 'Find live channels, movies, and series all in one place.',
    },
    'no-results': {
        icon: '😕',
        title: 'No Results Found',
        description: (query) => `We couldn't find anything matching "${query}". Try different keywords.`,
    },
    error: {
        icon: '⚠️',
        title: 'Search Failed',
        description: 'Something went wrong. Please try again.',
    },
};

// =============================================================================
// EMPTY SEARCH STATE COMPONENT
// =============================================================================

const EmptySearchState: React.FC<EmptySearchStateProps> = ({
    type,
    query,
    suggestions = [],
    onSuggestionPress,
    onRetry,
    style,
}) => {
    const config = STATE_CONFIGS[type];
    const description = typeof config.description === 'function'
        ? config.description(query)
        : config.description;

    return (
        <View style={[styles.container, style]}>
            {/* Icon */}
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{config.icon}</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{config.title}</Text>

            {/* Description */}
            <Text style={styles.description}>{description}</Text>

            {/* Retry Button (for error state) */}
            {type === 'error' && onRetry && (
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={onRetry}
                    activeOpacity={0.8}
                >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsTitle}>
                        {type === 'initial' ? 'Try searching for:' : 'Try these instead:'}
                    </Text>
                    <View style={styles.suggestionsTags}>
                        {suggestions.map((suggestion, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.suggestionTag}
                                onPress={() => onSuggestionPress?.(suggestion)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.suggestionText}>{suggestion}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Search Tips (for initial state) */}
            {type === 'initial' && (
                <View style={styles.tipsContainer}>
                    <SearchTip icon="📺" text="Search for live channels by name" />
                    <SearchTip icon="🎬" text="Find movies by title or actor" />
                    <SearchTip icon="📀" text="Discover series by genre" />
                </View>
            )}

            {/* No Results Tips */}
            {type === 'no-results' && (
                <View style={styles.tipsContainer}>
                    <SearchTip icon="✓" text="Check your spelling" />
                    <SearchTip icon="✓" text="Try more general keywords" />
                    <SearchTip icon="✓" text="Use fewer words" />
                </View>
            )}
        </View>
    );
};

// =============================================================================
// SEARCH TIP COMPONENT
// =============================================================================

interface SearchTipProps {
    icon: string;
    text: string;
}

const SearchTip: React.FC<SearchTipProps> = ({ icon, text }) => (
    <View style={styles.tipRow}>
        <Text style={styles.tipIcon}>{icon}</Text>
        <Text style={styles.tipText}>{text}</Text>
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
    retryButton: {
        marginTop: spacing.lg,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    retryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    suggestionsContainer: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    suggestionsTitle: {
        fontSize: 13,
        color: colors.textMuted,
        marginBottom: spacing.md,
    },
    suggestionsTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    suggestionTag: {
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.accent + '30',
    },
    suggestionText: {
        fontSize: 13,
        color: colors.accent,
        fontWeight: '500',
    },
    tipsContainer: {
        marginTop: spacing.xl,
        alignItems: 'flex-start',
        width: '100%',
        maxWidth: 260,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    tipIcon: {
        fontSize: 14,
        width: 24,
        textAlign: 'center',
    },
    tipText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
});

export default EmptySearchState;