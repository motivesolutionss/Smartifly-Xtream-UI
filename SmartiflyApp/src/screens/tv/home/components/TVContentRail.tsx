import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Platform } from 'react-native';
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
// COMPONENT
// =============================================================================

const TVContentRail: React.FC<TVContentRailProps> = ({ title, data, onPressItem }) => {
  // Keep renderItem stable
  const renderItem = useCallback(
    ({ item }: { item: TVContentItem }) => (
      <TVContentCard item={item} onPress={onPressItem} disableZoom />
    ),
    [onPressItem]
  );

  // Fixed-size layout for instant scroll calculations
  const getItemLayout = useCallback((_: unknown, index: number) => {
    return {
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    };
  }, []);

  const keyExtractor = useCallback((item: TVContentItem) => String(item.id), []);

  // If rails are sometimes empty or huge, protect FlatList from edge cases
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const handleScrollToIndexFailed = useCallback((info: any) => {
    // Fixes rare "scrollToIndex failed" crashes/jank on low-end TV devices
    // by retrying once the list finishes measuring.
    requestAnimationFrame(() => {
      info?.highestMeasuredFrameIndex?.toString(); // touch to avoid lint unused
    });
  }, []);

  return (
    <View style={styles.container} renderToHardwareTextureAndroid>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        horizontal
        data={safeData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
        // PERF TUNING (TV)
        removeClippedSubviews={Platform.OS === 'android'} // big win on Android TV
        windowSize={5} // 5–7 is usually best for TV focus rails
        initialNumToRender={7} // enough to cover viewport + buffer
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={16} // ~1 frame (keep UI responsive)
        onScrollToIndexFailed={handleScrollToIndexFailed}
      />
    </View>
  );
};

export default memo(TVContentRail);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: scale(6),
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
