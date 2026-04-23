import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import NavBar from '../../../components/NavBar';
import ContentCard, { ContentItem } from '../home/components/ContentCard';
import { colors, spacing, borderRadius, Icon } from '../../../theme';
import { useWatchHistoryStore } from '../../../store/watchHistoryStore';
import type { FavoritesStackParamList } from '../../../navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LiveStreamItem, MovieItem, SeriesItem } from '../../../navigation/types';

// =============================================================================
// TYPES
// =============================================================================

type FavoritesScreenProps = NativeStackScreenProps<FavoritesStackParamList, 'FavoritesMain'>;
const MAIN_TAB_BOTTOM_SPACER = 112;

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { width: viewportWidth } = useWindowDimensions();
    const history = useWatchHistoryStore((state) => state.history);
    const GRID_GAP = spacing.sm;

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

    const gridCardWidth = useMemo(() => {
        const horizontalPadding = spacing.base * 2;
        const available = Math.max(0, viewportWidth - horizontalPadding - GRID_GAP);
        return Math.floor(available / 2);
    }, [viewportWidth, GRID_GAP]);

    const handlePress = useCallback((item: ContentItem) => {
        if (item.type === 'live') {
            const live = item.data as LiveStreamItem;
            (navigation as any).navigate('FullscreenPlayer', {
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
            sizeOverride={{
                width: gridCardWidth,
                height: item.type === 'live'
                    ? gridCardWidth
                    : Math.round(gridCardWidth * 1.48),
            }}
            style={styles.card}
        />
    ), [gridCardWidth, handlePress]);

    const keyExtractor = useCallback((item: ContentItem) => String(item.id), []);

    const emptyState = useMemo(() => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
                <Icon name="heart" size={26} color={colors.primary} />
            </View>
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
                <Icon name="arrowRight" size={14} color={colors.textPrimary} />
                <Text style={styles.emptyButtonText}>Browse Content</Text>
            </TouchableOpacity>
        </View>
    ), [navigation]);

    const listHeader = useMemo(() => (
        <View style={styles.infoRow}>
            <View style={styles.infoChip}>
                <View style={styles.infoDot} />
                <Text style={styles.infoChipText}>
                    {favoriteItems.length} items in watchlist
                </Text>
            </View>
        </View>
    ), [favoriteItems.length]);

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
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + MAIN_TAB_BOTTOM_SPACER }]}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                ListHeaderComponent={listHeader}
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
    infoRow: {
        marginBottom: spacing.md,
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.borderMedium,
        borderRadius: borderRadius.round,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        gap: spacing.xs,
    },
    infoDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: colors.primary,
    },
    infoChipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    emptyState: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xxl,
        alignItems: 'center',
        marginTop: spacing.xl,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
    },
    emptyIconWrap: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(229, 9, 20, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(229, 9, 20, 0.35)',
        marginBottom: spacing.md,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontSize: 20,
        fontWeight: '800',
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    emptyButtonText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default FavoritesScreen;
