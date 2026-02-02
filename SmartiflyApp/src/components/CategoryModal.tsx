/**
 * Smartifly Category Modal Component
 * 
 * Full-screen modal for selecting content categories.
 * Netflix-style with:
 * - Blurred/dimmed background
 * - Scrollable category list
 * - X button at bottom to close
 */

import React, { useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Pressable,
} from 'react-native';
import { Icon, colors, spacing, shadowColors } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useFilterStore from '../store/filterStore';
import useStore from '../store';

// =============================================================================
// TYPES
// =============================================================================

interface CategoryItem {
    category_id: string;
    category_name: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

const CategoryModal: React.FC = () => {
    const insets = useSafeAreaInsets();

    const {
        selectedType,
        selectedCategory,
        isCategoryModalVisible,
        setCategory,
        setCategoryModalVisible,
    } = useFilterStore();

    const content = useStore((state) => state.content);

    // Get categories based on selected content type
    const categories = useMemo((): CategoryItem[] => {
        // Helper to safely get categories array
        const safeMap = (cats: any) => {
            if (!Array.isArray(cats)) return [];
            return cats.map(cat => ({
                category_id: String(cat.category_id || ''),
                category_name: String(cat.category_name || ''),
            }));
        };

        switch (selectedType) {
            case 'live':
                return content.live.loaded ? safeMap(content.live.categories) : [];
            case 'movies':
                return content.movies.loaded ? safeMap(content.movies.categories) : [];
            case 'series':
                return content.series.loaded ? safeMap(content.series.categories) : [];
            default:
                // If no type selected, show all categories combined
                return [
                    ...(content.live.loaded ? safeMap(content.live.categories) : []),
                    ...(content.movies.loaded ? safeMap(content.movies.categories) : []),
                    ...(content.series.loaded ? safeMap(content.series.categories) : []),
                ];
        }
    }, [content, selectedType]);

    // Get the domain key based on selectedType
    const getDomain = (): 'live' | 'movies' | 'series' => {
        switch (selectedType) {
            case 'live': return 'live';
            case 'movies': return 'movies';
            case 'series': return 'series';
            default: return 'live'; // fallback
        }
    };

    // Get current category for the active domain
    const currentCategory = (() => {
        switch (selectedType) {
            case 'live': return selectedCategory.live;
            case 'movies': return selectedCategory.movies;
            case 'series': return selectedCategory.series;
            default: return null;
        }
    })();

    // Handle category selection using domain-scoped setter
    const handleCategorySelect = (category: CategoryItem | null) => {
        const domain = getDomain();
        if (category) {
            setCategory(domain, category.category_id, category.category_name);
        } else {
            setCategory(domain, null, null);
        }
    };

    // Handle close
    const handleClose = () => {
        setCategoryModalVisible(false);
    };

    // Get title based on selected type
    const getTitle = () => {
        switch (selectedType) {
            case 'live': return 'Live TV Categories';
            case 'movies': return 'Movie Categories';
            case 'series': return 'Series Categories';
            default: return 'All Categories';
        }
    };

    return (
        <Modal
            visible={isCategoryModalVisible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={handleClose} />

                <View style={[
                    styles.content,
                    { paddingTop: insets.top + spacing.xl }
                ]}>
                    {/* Header */}
                    <Text style={styles.title}>{getTitle()}</Text>

                    {/* Category List */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* "All" option */}
                        <TouchableOpacity
                            style={styles.categoryItem}
                            onPress={() => handleCategorySelect(null)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.categoryText,
                                !currentCategory && styles.categoryTextSelected,
                            ]}>
                                All
                            </Text>
                            {!currentCategory && (
                                <Icon name="check" size={20} color={colors.textPrimary} weight="bold" />
                            )}
                        </TouchableOpacity>

                        {/* Category items */}
                        {categories.map((category) => {
                            const isSelected = currentCategory === category.category_id;
                            return (
                                <TouchableOpacity
                                    key={category.category_id}
                                    style={styles.categoryItem}
                                    onPress={() => handleCategorySelect(category)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        isSelected && styles.categoryTextSelected,
                                    ]}>
                                        {category.category_name}
                                    </Text>
                                    {isSelected && (
                                        <Icon name="check" size={20} color={colors.textPrimary} weight="bold" />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Close Button at Bottom */}
                    <View style={[styles.closeContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            activeOpacity={0.8}
                        >
                            <Icon name="x" size={24} color={colors.background} weight="bold" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.xl,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.lg,
    },
    categoryText: {
        fontSize: 22,
        fontWeight: '400',
        color: colors.textMuted,
    },
    categoryTextSelected: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    closeContainer: {
        alignItems: 'center',
        paddingTop: spacing.lg,
    },
    closeButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.textPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: shadowColors.default,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});

export default CategoryModal;
