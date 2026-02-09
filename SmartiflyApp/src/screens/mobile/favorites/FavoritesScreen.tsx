import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import NavBar from '../../../components/NavBar';
import ContentCard, { ContentItem } from '../home/components/ContentCard';
import { colors, spacing } from '../../../theme';
import { useWatchHistoryStore } from '../../../store/watchHistoryStore';
import type { FavoritesStackParamList } from '../../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LiveStreamItem, MovieItem, SeriesItem } from '../../../navigation/types';

// =============================================================================
// TYPES
// =============================================================================

type FavoritesScreenProps = NativeStackScreenProps<FavoritesStackParamList, 'FavoritesMain'>;

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const history = useWatchHistoryStore((state) => state.history);

    const favorites = useMemo(() => (
        Object.values(history)
            .filter((item) => !item.completed && item.progress > 0)
            .sort((a, b) => b.lastWatched - a.lastWatched)
    ), [history]);

    const favoriteItems = useMemo<ContentItem[]>(() => (
        favorites.map((item) => {
            const isLive = item.type === 'live';
            return {
                id: item.id,
                name: item.title,
                image: item.thumbnail,
                type: item.type === 'movie' ? 'movie' : item.type === 'series' ? 'series' : 'live',
                progress: isLive ? undefined : item.progress,
                data: item.data || {
                    stream_id: item.streamId,
                    name: item.episodeTitle || item.title,
                    stream_icon: item.thumbnail,
                },
            } as ContentItem;
        })
    ), [favorites]);

    const handlePress = useCallback((item: ContentItem) => {
        if (item.type === 'live') {
            const live = item.data as LiveStreamItem;
            navigation.navigate('Player', {
                type: 'live',
                item: live,
            });
            return;
        }

        if (item.type === 'movie') {
            const movie = item.data as MovieItem;
            navigation.navigate('MovieDetail', { movie });
            return;
        }

        if (item.type === 'series') {
            const series = item.data as SeriesItem;
            navigation.navigate('SeriesDetail', { series });
        }
    }, [navigation]);

    const renderItem = useCallback(({ item }: { item: ContentItem }) => (
        <ContentCard
            item={item}
            onPress={handlePress}
            variant={item.type === 'live' ? 'channel' : 'poster'}
            showRating={item.type !== 'live'}
            style={styles.card}
        />
    ), [handlePress]);

    const keyExtractor = useCallback((item: ContentItem) => String(item.id), []);

    const emptyState = useMemo(() => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptyText}>
                Save movies, series, and live channels to see them here.
            </Text>
            <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('MainTabs' as any, {
                    screen: 'HomeTab',
                    params: { screen: 'HomeMain' },
                })}
            >
                <Text style={styles.emptyButtonText}>Browse Content</Text>
            </TouchableOpacity>
        </View>
    ), [navigation]);

    return (
        <View style={styles.container}>
            <NavBar
                variant="content"
                title="Favorites"
                showSearch
                onSearchPress={() => navigation.navigate('MainTabs' as any, {
                    screen: 'HomeTab',
                    params: { screen: 'Search' },
                })}
            />

            <FlashList
                data={favoriteItems}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                numColumns={2}
                // @ts-ignore FlashList runtime supports estimatedItemSize in current app version
                estimatedItemSize={220}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                ListEmptyComponent={emptyState}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        paddingHorizontal: spacing.base,
        paddingTop: spacing.sm,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    card: {
        marginRight: 0,
    },
    emptyState: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    emptyButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 999,
    },
    emptyButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default FavoritesScreen;
