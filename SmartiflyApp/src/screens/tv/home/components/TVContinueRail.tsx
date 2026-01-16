/**
 * TV Continue Watching Rail Component
 * 
 * Special rail for Continue Watching with landscape cards.
 * Uses TVContinueCard instead of TVContentCard.
 * 
 * @enterprise-grade
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
} from 'react-native';
import { colors, scale, scaleFont } from '../../../../theme';
import TVContinueCard from './TVContinueCard';
import { WatchProgress } from '../../../../store/watchHistoryStore';

// =============================================================================
// TYPES
// =============================================================================

interface TVContinueRailProps {
    title: string;
    data: WatchProgress[];
    onPressItem: (item: WatchProgress) => void;
    onRemoveItem?: (item: WatchProgress) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

const TVContinueRail: React.FC<TVContinueRailProps> = ({
    title,
    data,
    onPressItem,
    onRemoveItem,
}) => {
    if (data.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            <FlatList
                horizontal
                data={data}
                renderItem={({ item }) => (
                    <TVContinueCard
                        item={item}
                        onPress={onPressItem}
                        onRemove={onRemoveItem}
                    />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsHorizontalScrollIndicator={false}
                removeClippedSubviews={false}
            />
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        marginBottom: scale(40),
        width: '100%',
    },
    title: {
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        color: colors.textPrimary || '#EEE',
        marginBottom: scale(16),
        marginLeft: scale(40),
    },
    listContent: {
        paddingHorizontal: scale(40),
        paddingRight: scale(80),
    },
});

export default TVContinueRail;
