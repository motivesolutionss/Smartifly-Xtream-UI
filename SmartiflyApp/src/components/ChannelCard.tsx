import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import FastImageComponent from './FastImageComponent';
import { colors, borderRadius, spacing } from '../theme';

interface ChannelCardProps {
    item: any;
    onPress: (item: any) => void;
}

const ChannelCard = ({ item, onPress }: ChannelCardProps) => {
    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
            <FastImageComponent
                source={{ uri: item.stream_icon || 'https://via.placeholder.com/120x120?text=No+Image' }}
                style={styles.logo}
                resizeMode="contain"
            />
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
    },
    logo: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: borderRadius.md,
        backgroundColor: colors.cardBackground,
    },
    cardTitle: {
        color: colors.textPrimary,
        fontSize: 12,
        marginTop: spacing.xs,
        textAlign: 'center',
        height: 32, // Fixed height for alignment
    },
});

export default memo(ChannelCard);
