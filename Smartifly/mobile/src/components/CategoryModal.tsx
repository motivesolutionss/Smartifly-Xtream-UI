/**
 * Smartifly Category Modal Component
 *
 * Virtualized full-screen modal for selecting categories.
 */

import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Icon, colors, spacing, shadowColors } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useFilterStore from '../store/filterStore';
import useContentStore from '../store/contentStore';

type CategoryDomain = 'live' | 'movies' | 'series';

interface CategoryOption {
    id: string | null;
    name: string;
    domain: CategoryDomain;
    isAll?: boolean;
}

const domainLabel: Record<CategoryDomain, string> = {
    live: 'Live TV',
    movies: 'Movies',
    series: 'Series',
};

const CategoryModal: React.FC = () => {
    const insets = useSafeAreaInsets();
    const {
        selectedType,
        selectedCategory,
        isCategoryModalVisible,
        setCategory,
        setType,
        clearFilters,
        setCategoryModalVisible,
    } = useFilterStore();
    const liveCategories = useContentStore((state) => state.content.live.categories);
    const movieCategories = useContentStore((state) => state.content.movies.categories);
    const seriesCategories = useContentStore((state) => state.content.series.categories);

    const currentDomain = selectedType ?? null;
    const currentCategory = selectedType ? selectedCategory[selectedType] : null;

    const categories = useMemo((): CategoryOption[] => {
        const safeMap = (domain: CategoryDomain, rawCategories: unknown): CategoryOption[] => {
            if (!Array.isArray(rawCategories)) return [];
            return rawCategories
                .map((cat: any) => ({
                    id: String(cat?.category_id ?? ''),
                    name: String(cat?.category_name ?? ''),
                    domain,
                }))
                .filter((cat) => cat.id && cat.name);
        };

        if (currentDomain) {
            const domainCategories =
                currentDomain === 'live'
                    ? liveCategories
                    : currentDomain === 'movies'
                        ? movieCategories
                        : seriesCategories;

            return [
                { id: null, name: 'All', domain: currentDomain, isAll: true },
                ...safeMap(currentDomain, domainCategories),
            ];
        }

        return [
            { id: null, name: 'All categories', domain: 'live', isAll: true },
            ...safeMap('live', liveCategories),
            ...safeMap('movies', movieCategories),
            ...safeMap('series', seriesCategories),
        ];
    }, [
        liveCategories,
        movieCategories,
        seriesCategories,
        currentDomain,
    ]);

    const getTitle = () => {
        if (!currentDomain) return 'All Categories';
        return `${domainLabel[currentDomain]} Categories`;
    };

    const handleClose = useCallback(() => {
        setCategoryModalVisible(false);
    }, [setCategoryModalVisible]);

    const handleCategorySelect = useCallback((option: CategoryOption) => {
        if (option.isAll) {
            if (currentDomain) {
                setCategory(currentDomain, null, null);
            } else {
                clearFilters();
            }
            return;
        }

        if (!currentDomain || currentDomain !== option.domain) {
            setType(option.domain);
        }
        setCategory(option.domain, option.id, option.name);
    }, [clearFilters, currentDomain, setCategory, setType]);

    const isSelected = useCallback((option: CategoryOption) => {
        if (option.isAll) {
            return currentCategory === null;
        }
        return currentDomain === option.domain && currentCategory === option.id;
    }, [currentCategory, currentDomain]);

    const renderItem = useCallback(({ item }: { item: CategoryOption }) => {
        const selected = isSelected(item);

        return (
            <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => handleCategorySelect(item)}
                activeOpacity={0.7}
            >
                <View style={styles.categoryTextRow}>
                    <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                        {item.name}
                    </Text>
                    {!currentDomain && !item.isAll && (
                        <Text style={styles.domainTag}>{domainLabel[item.domain]}</Text>
                    )}
                </View>

                {selected && (
                    <Icon name="check" size={20} color={colors.textPrimary} />
                )}
            </TouchableOpacity>
        );
    }, [currentDomain, handleCategorySelect, isSelected]);

    return (
        <Modal
            visible={isCategoryModalVisible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={handleClose} />

                <View style={[styles.content, { paddingTop: insets.top + spacing.xl }]}>
                    <Text style={styles.title}>{getTitle()}</Text>

                    <FlashList
                        data={categories}
                        keyExtractor={(item, index) => item.id ? `${item.domain}-${item.id}` : `all-${index}`}
                        renderItem={renderItem}
                        // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                        estimatedItemSize={56}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.md }]}
                    />

                    <View style={[styles.closeContainer, { paddingBottom: insets.bottom + spacing.lg }]}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            activeOpacity={0.8}
                        >
                            <Icon name="x" size={24} color={colors.background} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

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
    listContent: {
        paddingBottom: spacing.base,
    },
    categoryItem: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
    },
    categoryTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flexShrink: 1,
    },
    categoryText: {
        fontSize: 22,
        fontWeight: '400',
        color: colors.textMuted,
        flexShrink: 1,
    },
    categoryTextSelected: {
        color: colors.textPrimary,
        fontWeight: '600',
    },
    domainTag: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
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
