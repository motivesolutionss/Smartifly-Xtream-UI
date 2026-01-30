import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import FastImageComponent from './FastImageComponent';
import { colors, borderRadius, spacing } from '../theme';

interface MovieCardProps {
    item: any;
    onPress: (item: any) => void;
}

const MovieCard = ({ item, onPress }: MovieCardProps) => {
    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
            <FastImageComponent
                source={{ uri: item.stream_icon || 'https://via.placeholder.com/120x180?text=No+Image' }}
                style={styles.poster}
                showLoader={true}
            />
            {item.rating_5based > 0 && (
                <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>★ {item.rating_5based?.toFixed(1)}</Text>
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
    cardTitle: {
        color: colors.textPrimary,
        fontSize: 12,
        marginTop: spacing.xs,
        // Removed fixed height to allow text to wrap naturally
        textAlign: 'center',
    },
});

export default memo(MovieCard);
