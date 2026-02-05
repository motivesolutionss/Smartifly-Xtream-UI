/**
 * Smartifly RecentSearches Component
 * 
 * Recent search history with:
 * - Persistent storage (AsyncStorage)
 * - Clear all option
 * - Delete individual items
 * - Tap to search
 * - Maximum history limit
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

export interface RecentSearch {
    id: string;
    query: string;
    timestamp: number;
    resultCount?: number;
}

export interface RecentSearchesProps {
    searches: RecentSearch[];
    onSearchPress: (query: string) => void;
    onDeleteSearch: (id: string) => void;
    onClearAll: () => void;
    maxItems?: number;
    style?: ViewStyle;
}

// =============================================================================
// RECENT SEARCH ITEM
// =============================================================================

interface SearchItemProps {
    item: RecentSearch;
    onPress: () => void;
    onDelete: () => void;
}

const SearchItem: React.FC<SearchItemProps> = ({ item, onPress, onDelete }) => {
    // Format timestamp
    const formatTime = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <TouchableOpacity
            style={styles.searchItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Icon */}
            <View style={styles.searchIcon}>
                <Text style={styles.searchIconText}>🕐</Text>
            </View>

            {/* Content */}
            <View style={styles.searchContent}>
                <Text style={styles.searchQuery} numberOfLines={1}>
                    {item.query}
                </Text>
                <View style={styles.searchMeta}>
                    <Text style={styles.searchTime}>{formatTime(item.timestamp)}</Text>
                    {item.resultCount !== undefined && (
                        <Text style={styles.searchResults}>
                            • {item.resultCount} results
                        </Text>
                    )}
                </View>
            </View>

            {/* Delete Button */}
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={onDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Text style={styles.deleteIcon}>✕</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

// =============================================================================
// RECENT SEARCHES COMPONENT
// =============================================================================

const RecentSearches: React.FC<RecentSearchesProps> = ({
    searches,
    onSearchPress,
    onDeleteSearch,
    onClearAll,
    maxItems = 10,
    style,
}) => {
    // Limit displayed items
    const displayedSearches = searches.slice(0, maxItems);

    if (displayedSearches.length === 0) {
        return null;
    }

    return (
        <View style={[styles.container, style]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerIcon}>🕐</Text>
                    <Text style={styles.headerTitle}>Recent Searches</Text>
                </View>
                <TouchableOpacity
                    style={styles.clearButton}
                    onPress={onClearAll}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
            </View>

            {/* Search List */}
            <View style={styles.list}>
                {displayedSearches.map((item) => (
                    <SearchItem
                        key={item.id}
                        item={item}
                        onPress={() => onSearchPress(item.query)}
                        onDelete={() => onDeleteSearch(item.id)}
                    />
                ))}
            </View>
        </View>
    );
};

// =============================================================================
// HELPER: STORAGE FUNCTIONS
// =============================================================================

// Storage key
export const RECENT_SEARCHES_KEY = '@smartifly_recent_searches';

// Maximum stored searches
export const MAX_RECENT_SEARCHES = 20;

/**
 * Load recent searches from storage
 * Usage with AsyncStorage:
 * 
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * 
 * const loadRecentSearches = async (): Promise<RecentSearch[]> => {
 *   try {
 *     const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
 *     return data ? JSON.parse(data) : [];
 *   } catch (error) {
 *     console.error('Failed to load recent searches:', error);
 *     return [];
 *   }
 * };
 */

/**
 * Save recent searches to storage
 * 
 * const saveRecentSearches = async (searches: RecentSearch[]): Promise<void> => {
 *   try {
 *     await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
 *   } catch (error) {
 *     console.error('Failed to save recent searches:', error);
 *   }
 * };
 */

/**
 * Add a new search to history
 * 
 * const addRecentSearch = async (
 *   query: string,
 *   resultCount?: number
 * ): Promise<RecentSearch[]> => {
 *   const searches = await loadRecentSearches();
 *   
 *   // Remove duplicate if exists
 *   const filtered = searches.filter(s => s.query.toLowerCase() !== query.toLowerCase());
 *   
 *   // Add new search at the beginning
 *   const newSearch: RecentSearch = {
 *     id: Date.now().toString(),
 *     query,
 *     timestamp: Date.now(),
 *     resultCount,
 *   };
 *   
 *   const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
 *   await saveRecentSearches(updated);
 *   
 *   return updated;
 * };
 */

/**
 * Delete a search from history
 * 
 * const deleteRecentSearch = async (id: string): Promise<RecentSearch[]> => {
 *   const searches = await loadRecentSearches();
 *   const updated = searches.filter(s => s.id !== id);
 *   await saveRecentSearches(updated);
 *   return updated;
 * };
 */

/**
 * Clear all recent searches
 * 
 * const clearRecentSearches = async (): Promise<void> => {
 *   await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
 * };
 */

// =============================================================================
// TRENDING SEARCHES (Optional)
// =============================================================================

export interface TrendingSearchesProps {
    searches: string[];
    onSearchPress: (query: string) => void;
    style?: ViewStyle;
}

export const TrendingSearches: React.FC<TrendingSearchesProps> = ({
    searches,
    onSearchPress,
    style,
}) => {
    if (searches.length === 0) return null;

    return (
        <View style={[styles.container, style]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerIcon}>🔥</Text>
                    <Text style={styles.headerTitle}>Trending</Text>
                </View>
            </View>

            {/* Trending Tags */}
            <View style={styles.trendingList}>
                {searches.map((query, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.trendingTag}
                        onPress={() => onSearchPress(query)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.trendingText}>{query}</Text>
                    </TouchableOpacity>
                ))}
            </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.base,
        marginBottom: spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerIcon: {
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    clearButton: {
        padding: spacing.xs,
    },
    clearText: {
        fontSize: 13,
        color: colors.textMuted,
        fontWeight: '500',
    },
    list: {
        paddingHorizontal: spacing.base,
    },
    searchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.backgroundTertiary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    searchIconText: {
        fontSize: 16,
    },
    searchContent: {
        flex: 1,
    },
    searchQuery: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    searchMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xxs,
    },
    searchTime: {
        fontSize: 12,
        color: colors.textMuted,
    },
    searchResults: {
        fontSize: 12,
        color: colors.textMuted,
        marginLeft: spacing.xs,
    },
    deleteButton: {
        padding: spacing.sm,
    },
    deleteIcon: {
        fontSize: 12,
        color: colors.textMuted,
    },

    // Trending
    trendingList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
    },
    trendingTag: {
        backgroundColor: colors.backgroundTertiary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.round,
        borderWidth: 1,
        borderColor: colors.border,
    },
    trendingText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
});

export default RecentSearches;