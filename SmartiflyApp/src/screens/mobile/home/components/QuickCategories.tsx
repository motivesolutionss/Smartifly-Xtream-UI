/**
 * Smartifly Quick Categories Component
 * 
 * Horizontal scrollable category pills for quick filtering.
 * Data-driven: renders whatever is passed in `categories`.
 * Uses Phosphor icons for modern UI.
 */

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { Icon, colors, spacing, borderRadius } from '../../../../theme';

// =============================================================================
// TYPES
// =============================================================================

export interface CategoryItem {
    id: string;
    name: string;
    count?: number;
    color?: string;
    icon?: 'tv' | 'film' | 'play-circle' | string;
}

export interface QuickCategoriesProps {
    categories: CategoryItem[];
    onCategoryPress: (categoryId: string) => void;
    selectedCategory?: string;
    style?: ViewStyle;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const getIconComponent = (iconName: string | undefined, color: string, size: number = 16) => {
    switch (iconName) {
        case 'tv':
            return <Icon name="television" size={size} color={color} weight="bold" />;
        case 'film':
            return <Icon name="filmStrip" size={size} color={color} weight="bold" />;
        case 'play-circle':
            return <Icon name="playCircle" size={size} color={color} weight="bold" />;
        default:
            return null;
    }
};

// =============================================================================
// CATEGORY PILL COMPONENT
// =============================================================================

interface CategoryPillProps {
    category: CategoryItem;
    isActive: boolean;
    onPress: () => void;
}

const CategoryPill: React.FC<CategoryPillProps> = ({
    category,
    isActive,
    onPress,
}) => {
    const iconColor = isActive ? colors.textOnPrimary : (category.color || colors.textMuted);

    return (
        <TouchableOpacity
            style={[
                styles.pill,
                isActive && [styles.pillActive, { backgroundColor: category.color || colors.primary }],
                !isActive && { borderColor: colors.border }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Icon */}
            {category.icon && (
                <View style={styles.iconContainer}>
                    {getIconComponent(category.icon, iconColor)}
                </View>
            )}

            {/* Label */}
            <Text style={[
                styles.pillLabel,
                isActive && styles.pillLabelActive,
            ]}>
                {category.name}
            </Text>

            {/* Count Badge */}
            {category.count !== undefined && category.count > 0 && !isActive && (
                <View style={[styles.countBadge, { backgroundColor: (category.color || colors.textPrimary) + '30' }]}>
                    <Text style={[styles.countText, { color: category.color || colors.textPrimary }]}>
                        {category.count > 999 ? '999+' : category.count}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

// =============================================================================
// QUICK CATEGORIES COMPONENT
// =============================================================================

const QuickCategories: React.FC<QuickCategoriesProps> = ({
    categories,
    onCategoryPress,
    selectedCategory,
    style,
}) => {
    return (
        <View style={[styles.container, style]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {categories.map((category) => (
                    <CategoryPill
                        key={category.id}
                        category={category}
                        isActive={selectedCategory === category.id}
                        onPress={() => onCategoryPress(category.id)}
                    />
                ))}
            </ScrollView>
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
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        backgroundColor: colors.backgroundTertiary,
        borderWidth: 1,
        gap: spacing.xs,
    },
    pillActive: {
        borderColor: 'transparent',
    },
    iconContainer: {
        marginRight: 2,
    },
    pillLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    pillLabelActive: {
        color: colors.textOnPrimary,
        fontWeight: '600',
    },
    countBadge: {
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.round,
        marginLeft: spacing.xxs,
    },
    countText: {
        fontSize: 11,
        fontWeight: '600',
    },
});

export default QuickCategories;