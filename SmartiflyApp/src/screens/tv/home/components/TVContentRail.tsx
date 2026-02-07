import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
} from 'react-native';
import { colors, scale, scaleFont } from '../../../../theme';
import TVContentCard, { TVContentItem } from './TVContentCard';

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_WIDTH = scale(200);
const CARD_MARGIN = scale(24);
const ITEM_WIDTH = CARD_WIDTH + CARD_MARGIN;

// =============================================================================
// TYPES
// =============================================================================

interface TVContentRailProps {
    title: string;
    data: TVContentItem[];
    onPressItem: (item: TVContentItem) => void;
}

// =============================================================================
// TV CONTENT RAIL COMPONENT
// =============================================================================

const TVContentRail: React.FC<TVContentRailProps> = ({
    title,
    data,
    onPressItem,
}) => {
    // Memoized render function
    const renderItem = useCallback(({ item }: { item: TVContentItem }) => (
        <TVContentCard
            item={item}
            onPress={onPressItem}
            disableZoom={true}
        />
    ), [onPressItem]);

    // Fixed-size layout for instant scroll calculations
    const getItemLayout = useCallback((_: any, index: number) => ({
        length: ITEM_WIDTH,
        offset: ITEM_WIDTH * index,
        index,
    }), []);

    const keyExtractor = useCallback((item: TVContentItem) => item.id.toString(), []);

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
                windowSize={7} // Increased for smoother navigation
                initialNumToRender={8} // Render enough to cover viewport + some buffer
                maxToRenderPerBatch={4}
                updateCellsBatchingPeriod={50}
            />
        </View>
    );
};

export default React.memo(TVContentRail);

const styles = StyleSheet.create({
    container: {
        marginBottom: scale(4), // Reduced from 10
        width: '100%',
    },
    title: {
        fontSize: scaleFont(24),
        fontWeight: 'bold',
        color: colors.textPrimary || '#EEE',
        marginBottom: scale(8),
        marginLeft: scale(30), // Align with banner
        paddingLeft: scale(0), // Removed extra padding
    },
    listContent: {
        paddingHorizontal: scale(30), // Align with title
        paddingRight: scale(80),
    }
});
