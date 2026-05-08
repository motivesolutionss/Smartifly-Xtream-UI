import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
} from 'react-native';
import useStore from '@smartifly/shared/src/store';
import useFavoritesStore, {
    FavoriteEntry,
    buildFavoritesScope,
} from '@smartifly/shared/src/store/favoritesStore';
import { colors, scale, scaleFont } from '../../theme';
import { TVFavoritesScreenProps, LiveStreamItem, MovieItem, SeriesItem } from '../../navigation/types';

const instructionalSteps = [
    'Browse the Home, Live, Movies, or Series sections',
    'Open the player and press the heart icon to bookmark it',
    'Return once you have at least one favorite saved',
];

const TVFavoritesScreen: React.FC<TVFavoritesScreenProps> = ({ navigation, focusEntryRef }) => {
    const selectedPortalId = useStore((state) => state.selectedPortal?.id ?? null);
    const username = useStore((state) => state.userInfo?.username ?? state.credentials?.username ?? null);
    const favoriteEntries = useFavoritesStore((state) => state.entries);

    const favoritesScope = React.useMemo(
        () => buildFavoritesScope(selectedPortalId, username),
        [selectedPortalId, username]
    );

    const favorites = React.useMemo(
        () => favoriteEntries
            .filter((item) => item.scope === favoritesScope)
            .sort((a, b) => b.addedAt - a.addedAt)
            .slice(0, 40),
        [favoriteEntries, favoritesScope]
    );

    const handlePress = React.useCallback((item: FavoriteEntry) => {
        const payload = (item.data as LiveStreamItem | MovieItem | SeriesItem) ?? ({
            stream_id: Number(item.entityId) || 0,
            name: item.title,
            stream_icon: item.image,
        } as LiveStreamItem);

        if (item.kind === 'live') {
            navigation.navigate('FullscreenPlayer', {
                type: 'live',
                item: payload as LiveStreamItem,
            });
            return;
        }

        if (item.kind === 'movie') {
            navigation.navigate('TVMovieDetail', {
                movie: payload as MovieItem,
            });
            return;
        }

        if (item.kind === 'series') {
            navigation.navigate('TVSeriesDetail', {
                series: payload as SeriesItem,
            });
            return;
        }

        navigation.navigate('FullscreenPlayer', {
            type: 'series',
            item: payload as SeriesItem,
            episodeUrl: item.episodeUrl,
        });
    }, [navigation]);

    const renderItem = ({ item, index }: { item: FavoriteEntry; index: number }) => (
        <Pressable
            ref={index === 0 ? focusEntryRef : undefined}
            style={styles.card}
            onPress={() => handlePress(item)}
        >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
                {item.kind.toUpperCase()}
                {item.subtitle ? ` · ${item.subtitle}` : ''}
            </Text>
        </Pressable>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Favorites Empty</Text>
            <Text style={styles.emptyText}>Save movies, shows, channels, or episodes so they appear here instantly.</Text>
            {instructionalSteps.map((step, index) => (
                <Text key={step} style={styles.instructionText}>{`${index + 1}. ${step}`}</Text>
            ))}
            <Pressable
                ref={focusEntryRef}
                style={styles.actionButton}
                onPress={() => navigation.navigate('TVShell')}
            >
                <Text style={styles.actionText}>Go to Home</Text>
            </Pressable>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.screenTitle}>Favorites</Text>
            {favorites.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.key}
                    renderItem={renderItem}
                    ItemSeparatorComponent={Separator}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
};

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: scale(40),
        backgroundColor: colors.background,
    },
    screenTitle: {
        fontSize: scaleFont(32),
        color: colors.textPrimary,
        fontWeight: '700',
        marginBottom: scale(20),
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: scaleFont(28),
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: scale(12),
    },
    emptyText: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: scale(24),
        fontSize: scaleFont(18),
    },
    instructionText: {
        color: colors.textMuted,
        fontSize: scaleFont(16),
        marginBottom: scale(6),
    },
    actionButton: {
        marginTop: scale(20),
        paddingHorizontal: scale(28),
        paddingVertical: scale(12),
        borderRadius: scale(10),
        borderWidth: 1,
        borderColor: colors.primary,
    },
    actionText: {
        color: colors.primary,
        fontSize: scaleFont(16),
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: scale(40),
    },
    card: {
        padding: scale(20),
        borderRadius: scale(14),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    title: {
        color: colors.textPrimary,
        fontSize: scaleFont(20),
        fontWeight: '600',
        marginBottom: scale(6),
    },
    meta: {
        color: colors.textSecondary,
        fontSize: scaleFont(16),
    },
    separator: {
        height: scale(12),
    },
});

export default TVFavoritesScreen;
