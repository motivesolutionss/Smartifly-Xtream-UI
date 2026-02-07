/**
 * CategoryList Component - PERFORMANCE OPTIMIZED
 * 
 * Memoized horizontal category filter list with:
 * - React.memo wrapper to prevent parent re-renders
 * - Memoized renderItem with useCallback
 * - Stable key extraction
 */

import React, { memo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ListRenderItemInfo,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

interface CategoryItem {
    id: string | null;
    name: string;
    count: number;
}

interface CategoryListProps {
    categories: CategoryItem[];
    totalCount: number;
    selectedCategory: string | null;
    onCategorySelect: (id: string | null, name: string | null) => void;
    activeColor?: string;
}

const CategoryList: React.FC<CategoryListProps> = ({
    categories,
    totalCount,
    selectedCategory,
    onCategorySelect,
    activeColor = colors.primary,
}) => {
    // Prepend "All" option to categories
    const data: CategoryItem[] = [
        { id: null, name: 'All', count: totalCount },
        ...categories,
    ];

    // Memoized key extractor
    const keyExtractor = useCallback(
        (item: CategoryItem) => String(item.id ?? 'all'),
        []
    );

    // Memoized render function - CRITICAL for preventing re-renders
    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<CategoryItem>) => {
            const isSelected = selectedCategory === item.id;
            return (
                <TouchableOpacity
                    style={[
                        styles.categoryChip,
                        isSelected && [styles.categoryChipActive, { backgroundColor: activeColor, borderColor: activeColor }],
                    ]}
                    onPress={() => onCategorySelect(item.id, item.name)}
                >
                    <Text
                        style={[
                            styles.categoryChipText,
                            isSelected && styles.categoryChipTextActive,
                        ]}
                    >
                        {item.name}
                    </Text>
                </TouchableOpacity>
            );
        },
        [selectedCategory, onCategorySelect, activeColor]
    );

    return (
        <FlatList
            horizontal
            data={data}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            style={styles.categoryList}
            contentContainerStyle={styles.categoryListContent}
            renderItem={renderItem}
            // Performance optimizations
            removeClippedSubviews={true}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
        />
    );
};

const styles = StyleSheet.create({
    categoryList: {
        maxHeight: 50,
    },
    categoryListContent: {
        paddingHorizontal: spacing.md,
    },
    categoryChip: {
        backgroundColor: colors.cardBackground,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipActive: {
        // backgroundColor and borderColor set dynamically via activeColor prop
    },
    categoryChipText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    categoryChipTextActive: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
});

export default memo(CategoryList);
