/**
 * TV Continue Watching Rail Component
 * 
 * Special rail for Continue Watching with landscape cards.
 * Uses TVContinueCard instead of TVContentCard.
 * 
 * @enterprise-grade
 */

import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
} from 'react-native';
import { colors, scale, scaleFont } from '../../../../theme';
import TVContinueCard from './TVContinueCard';
import { WatchProgress } from '../../../../store/watchHistoryStore';

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_WIDTH = scale(220);
const CARD_MARGIN = scale(24);
const ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;

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
    const renderItem = useCallback(({ item }: { item: WatchProgress }) => (
        <TVContinueCard
            item={item}
            onPress={onPressItem}
            onRemove={onRemoveItem}
        />
    ), [onPressItem, onRemoveItem]);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: ITEM_WIDTH,
        offset: ITEM_WIDTH * index,
        index,
    }), []);

    const keyExtractor = useCallback((item: WatchProgress) => item.id, []);

    if (data.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            <FlatList
                horizontal
                data={data}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                contentContainerStyle={styles.listContent}
                showsHorizontalScrollIndicator={false}
                // Performance optimizations
                removeClippedSubviews={false} // Restored for consistent focus sounds
                windowSize={5}
                initialNumToRender={6}
                maxToRenderPerBatch={3}
                updateCellsBatchingPeriod={50}
            />
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        marginBottom: scale(10),
        width: '100%',
    },
    title: {
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        color: colors.textPrimary || '#EEE',
        marginBottom: scale(8),
        marginLeft: scale(30),
    },
    listContent: {
        paddingHorizontal: scale(30),
        paddingRight: scale(80),
    },
});

export default React.memo(TVContinueRail);
