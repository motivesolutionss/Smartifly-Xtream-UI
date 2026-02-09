import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
} from 'react-native';
import { colors, scale, scaleFont } from '../../../theme';
import { WatchProgress, useWatchHistoryStore } from '../../../store/watchHistoryStore';
import { TVFavoritesScreenProps, LiveStreamItem, MovieItem, SeriesItem } from '../../../navigation/types';

const instructionalSteps = [
    'Browse the Home, Live, Movies, or Series sections',
    'Highlight any item and press the heart icon to bookmark it',
    'Return once you have at least one favorite saved',
];


const TVFavoritesScreen: React.FC<TVFavoritesScreenProps> = ({ navigation, focusEntryRef }) => {
    // FIX: Optimized selector to prevent infinite re-renders
    // Using simple selector to get history object, which is referentially stable unless updated
    const history = useWatchHistoryStore((state) => state.history);

    // Compute favorites derived state inside component
    const favorites = React.useMemo(() => {
        return Object.values(history)
            .filter((item) => !item.completed && item.progress > 0)
            .sort((a, b) => b.lastWatched - a.lastWatched)
            .slice(0, 12);
    }, [history]);

    const handlePress = (item: WatchProgress) => {
        // Build payload from watch history data
        // If item.data exists (cached original content), use it
        // Otherwise construct a LiveStreamItem-compatible object from the WatchProgress fields
        const payload: LiveStreamItem | MovieItem | SeriesItem = (item.data as LiveStreamItem | MovieItem | SeriesItem) ?? ({
            stream_id: item.streamId,
            name: item.episodeTitle || item.title,
            stream_icon: item.thumbnail,
        } as LiveStreamItem);

        navigation.navigate('FullscreenPlayer', {
            type: item.type,
            item: payload,
        });
    };

    const renderItem = ({ item, index }: { item: WatchProgress; index: number }) => (
        <Pressable
            ref={index === 0 ? focusEntryRef : undefined}
            style={styles.card}
            onPress={() => handlePress(item)}
        >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.type.toUpperCase()} · {Math.round(item.progress)}% watched</Text>
        </Pressable>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Favorites Empty</Text>
            <Text style={styles.emptyText}>Save movies, shows, or channels you love so they appear here instantly.</Text>
            {instructionalSteps.map((step, index) => (
                <Text key={step} style={styles.instructionText}>{`${index + 1}. ${step}`}</Text>
            ))}
            <Pressable
                ref={focusEntryRef}
                style={styles.actionButton}
                onPress={() => navigation.navigate('TVHome')}
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
                    keyExtractor={(item) => item.id}
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
