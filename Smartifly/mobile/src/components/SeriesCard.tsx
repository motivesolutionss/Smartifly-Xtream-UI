import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import FastImageComponent from './FastImageComponent';
import { colors, borderRadius, spacing, Icon } from '../theme';

interface SeriesCardProps {
    item: any;
    onPress: (item: any) => void;
}

const SeriesCard = ({ item, onPress }: SeriesCardProps) => {
    const seasonCount = item.num_seasons || item.episode_run_time || null;

    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
            <FastImageComponent
                source={{ uri: item.cover || 'https://via.placeholder.com/120x180?text=No+Image' }}
                style={styles.poster}
                showLoader={false}
            />

            {item.rating_5based > 0 && (
                <View style={styles.ratingBadge}>
                    <Icon name="star" size={10} color={colors.warning} />
                    <Text style={styles.ratingText}>{item.rating_5based?.toFixed(1)}</Text>
                </View>
            )}

            {seasonCount && (
                <View style={styles.seasonBadge}>
                    <Text style={styles.seasonText}>
                        {seasonCount} {seasonCount === 1 ? 'Season' : 'Seasons'}
                    </Text>
                </View>
            )}

            <Text style={styles.cardTitle} numberOfLines={2}>
                {item.name || 'Untitled'}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        margin: spacing.xs,
        maxWidth: '31%',
    },
    poster: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: borderRadius.md,
        backgroundColor: colors.cardBackground,
    },
    ratingBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: colors.overlay,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    ratingText: {
        color: colors.warning,
        fontSize: 10,
        fontWeight: '700',
    },
    seasonBadge: {
        position: 'absolute',
        bottom: 36,
        left: 4,
        backgroundColor: colors.series,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    seasonText: {
        color: colors.textPrimary,
        fontSize: 9,
        fontWeight: '600',
    },
    cardTitle: {
        color: colors.textPrimary,
        fontSize: 12,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
});

export default memo(SeriesCard);
