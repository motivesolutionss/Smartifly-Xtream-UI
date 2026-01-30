/**
 * Smartifly FavoriteButton Component
 * 
 * Heart button for toggling favorites:
 * - Animated heart icon
 * - Haptic feedback
 * - Multiple sizes
 * - Toast notification
 */

import React, { useRef, useCallback } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Animated,
    ViewStyle,
} from 'react-native';

import { useFavoritesStore, FavoriteType, FavoriteItem } from '../store/favoritesStore';

import { colors, spacing } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export type FavoriteButtonSize = 'small' | 'medium' | 'large';

export interface FavoriteButtonProps {
    item: Omit<FavoriteItem, 'addedAt'>;
    size?: FavoriteButtonSize;
    showBackground?: boolean;
    style?: ViewStyle;
    onToggle?: (isFavorite: boolean) => void;
}

// =============================================================================
// SIZE CONFIGS
// =============================================================================

const SIZE_CONFIGS: Record<FavoriteButtonSize, { container: number; icon: number }> = {
    small: { container: 28, icon: 14 },
    medium: { container: 36, icon: 18 },
    large: { container: 44, icon: 22 },
};

// =============================================================================
// FAVORITE BUTTON COMPONENT
// =============================================================================

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
    item,
    size = 'medium',
    showBackground = true,
    style,
    onToggle,
}) => {
    // Store
    const isFavorite = useFavoritesStore(state => state.isFavorite(item.id, item.type));
    const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

    // Animation
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Size config
    const sizeConfig = SIZE_CONFIGS[size];

    // Handle press
    const handlePress = useCallback(async () => {
        // Animate
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.7,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // Toggle favorite
        const newState = await toggleFavorite(item);

        // Callback
        onToggle?.(newState);

        // Optional: Haptic feedback
        // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [item, toggleFavorite, onToggle, scaleAnim]);

    return (
        <TouchableOpacity
            style={[
                styles.container,
                showBackground && styles.containerWithBg,
                showBackground && isFavorite && styles.containerActive,
                {
                    width: sizeConfig.container,
                    height: sizeConfig.container,
                    borderRadius: sizeConfig.container / 2,
                },
                style,
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Animated.Text
                style={[
                    styles.icon,
                    { fontSize: sizeConfig.icon },
                    { transform: [{ scale: scaleAnim }] },
                ]}
            >
                {isFavorite ? '❤️' : '🤍'}
            </Animated.Text>
        </TouchableOpacity>
    );
};

// =============================================================================
// ICON ONLY VARIANT (no background)
// =============================================================================

export interface FavoriteIconProps {
    id: string | number;
    type: FavoriteType;
    size?: number;
    activeColor?: string;
    inactiveColor?: string;
    style?: ViewStyle;
}

export const FavoriteIcon: React.FC<FavoriteIconProps> = ({
    id,
    type,
    size = 18,
    activeColor = colors.primary,
    inactiveColor = colors.icon,
    style,
}) => {
    const isFavorite = useFavoritesStore(state => state.isFavorite(id, type));

    return (
        <Text style={[
            { fontSize: size, color: isFavorite ? activeColor : inactiveColor },
            style,
        ]}>
            {isFavorite ? '❤️' : '🤍'}
        </Text>
    );
};

// =============================================================================
// TEXT BUTTON VARIANT
// =============================================================================

export interface FavoriteTextButtonProps {
    item: Omit<FavoriteItem, 'addedAt'>;
    style?: ViewStyle;
    onToggle?: (isFavorite: boolean) => void;
}

export const FavoriteTextButton: React.FC<FavoriteTextButtonProps> = ({
    item,
    style,
    onToggle,
}) => {
    const isFavorite = useFavoritesStore(state => state.isFavorite(item.id, item.type));
    const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

    const handlePress = useCallback(async () => {
        const newState = await toggleFavorite(item);
        onToggle?.(newState);
    }, [item, toggleFavorite, onToggle]);

    return (
        <TouchableOpacity
            style={[styles.textButton, isFavorite && styles.textButtonActive, style]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Text style={styles.textButtonIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
            <Text style={[styles.textButtonLabel, isFavorite && styles.textButtonLabelActive]}>
                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </Text>
        </TouchableOpacity>
    );
};

// =============================================================================
// ADD TO LIST BUTTON (Combined with My List)
// =============================================================================

export interface AddToListButtonProps {
    item: Omit<FavoriteItem, 'addedAt'>;
    style?: ViewStyle;
    onToggle?: (isFavorite: boolean) => void;
}

export const AddToListButton: React.FC<AddToListButtonProps> = ({
    item,
    style,
    onToggle,
}) => {
    const isFavorite = useFavoritesStore(state => state.isFavorite(item.id, item.type));
    const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);

    const handlePress = useCallback(async () => {
        const newState = await toggleFavorite(item);
        onToggle?.(newState);
    }, [item, toggleFavorite, onToggle]);

    return (
        <TouchableOpacity
            style={[styles.addButton, isFavorite && styles.addButtonActive, style]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Text style={styles.addButtonIcon}>{isFavorite ? '✓' : '+'}</Text>
            <Text style={styles.addButtonLabel}>My List</Text>
        </TouchableOpacity>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    containerWithBg: {
        backgroundColor: colors.background,
    },
    containerActive: {
        backgroundColor: colors.primary + '33',
    },
    icon: {
        // fontSize set dynamically
    },

    // Text Button
    textButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        gap: spacing.sm,
    },
    textButtonActive: {
        // Active state
    },
    textButtonIcon: {
        fontSize: 18,
    },
    textButtonLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    textButtonLabelActive: {
        color: colors.primary,
    },

    // Add Button
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: spacing.xs,
    },
    addButtonActive: {
        backgroundColor: colors.primary + '33',
    },
    addButtonIcon: {
        fontSize: 18,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    addButtonLabel: {
        fontSize: 14,
        color: colors.textPrimary,
        fontWeight: '500',
    },
});

export default FavoriteButton;