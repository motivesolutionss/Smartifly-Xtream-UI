/**
 * Smartifly Category Filter Component
 * 
 * Netflix-style interactive filter chips for home screen.
 * States:
 * - Default: Shows all filter chips (Live TV, Films, Series, Categories)
 * - Filtered: Shows X button + selected filter + "All categories" dropdown
 */

import React, { useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet
} from 'react-native';
import { Icon, colors, spacing, borderRadius } from '../theme';
import useFilterStore, { ContentType } from '../store/filterStore';

// =============================================================================
// TYPES
// =============================================================================

interface CategoryFilterProps {
    onCategoryPress?: () => void;
    onTypePress?: (type: ContentType) => void;
}

interface FilterChip {
    id: ContentType;
    label: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const FILTER_CHIPS: FilterChip[] = [
    { id: 'live', label: 'Live TV' },
    { id: 'movies', label: 'Movies' },
    { id: 'series', label: 'Series' },
];

// =============================================================================
// COMPONENT
// =============================================================================

const CategoryFilter: React.FC<CategoryFilterProps> = ({ onCategoryPress, onTypePress }) => {
    const {
        selectedType,
        getCategoryNameForType,
        setType,
        clearFilters,
        setCategoryModalVisible,
    } = useFilterStore();

    // Get the category name for the current type
    const currentCategoryName = getCategoryNameForType();

    const isFiltered = selectedType !== null && !onTypePress;

    useEffect(() => {
        if (onTypePress && selectedType) {
            clearFilters();
        }
    }, [clearFilters, onTypePress, selectedType]);

    // Handle filter chip press
    const handleChipPress = (type: ContentType) => {
        if (onTypePress) {
            clearFilters();
            onTypePress(type);
            return;
        }

        if (selectedType === type) {
            // Already selected, clear filter
            clearFilters();
        } else {
            setType(type);
        }
    };

    // Handle clear button press
    const handleClear = () => {
        clearFilters();
    };

    // Handle categories dropdown press
    const handleCategoriesPress = () => {
        setCategoryModalVisible(true);
        onCategoryPress?.();
    };

    // Get label for selected type
    const getSelectedLabel = () => {
        return FILTER_CHIPS.find(chip => chip.id === selectedType)?.label || '';
    };

    return (
        <View style={styles.container}>
            {isFiltered ? (
                <React.Fragment>
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={handleClear}
                        activeOpacity={0.7}
                    >
                        <Icon name="x" size={16} color={colors.textPrimary} weight="bold" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.chip, styles.chipActive]}
                        onPress={() => handleChipPress(selectedType)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipText, styles.chipTextActive]}>
                            {getSelectedLabel()}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.chipWithArrow}
                        onPress={handleCategoriesPress}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.chipText}>
                            {currentCategoryName || 'All categories'}
                        </Text>
                        <Icon name="caretDown" size={14} color={colors.textSecondary} weight="bold" />
                    </TouchableOpacity>
                </React.Fragment>
            ) : (
                <React.Fragment>
                    {FILTER_CHIPS.map((chip) => (
                        <TouchableOpacity
                            key={chip.id}
                            style={styles.chip}
                            onPress={() => handleChipPress(chip.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.chipText}>{chip.label}</Text>
                        </TouchableOpacity>
                    ))}
                    {!onTypePress && (
                        <TouchableOpacity
                            style={styles.chipWithArrow}
                            onPress={handleCategoriesPress}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.chipText}>Categories</Text>
                            <Icon name="caretDown" size={14} color={colors.textSecondary} weight="bold" />
                        </TouchableOpacity>
                    )}
                </React.Fragment>
            )}
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 44,
    },
    clearButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.backgroundElevated,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundSecondary,
    },
    chipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primaryLight,
    },
    chipWithArrow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        backgroundColor: colors.backgroundSecondary,
        gap: spacing.xxs,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    chipTextActive: {
        color: colors.textPrimary,
    },
});

export default CategoryFilter;
