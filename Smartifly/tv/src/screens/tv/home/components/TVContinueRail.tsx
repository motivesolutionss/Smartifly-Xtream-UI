/**
 * TV Continue Watching Rail Component
 *
 * Performance upgrades:
 * - stable callbacks + safeData memo
 * - removeClippedSubviews on Android (usually big win)
 * - better batching defaults for TV
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Platform } from 'react-native';
import { colors, scale, scaleFont } from '../../../../theme';
import { usePerfProfile } from '../../../../utils/perf';
import TVContinueCard from './TVContinueCard';
import { WatchProgress } from '../../../../store/watchHistoryStore';

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_WIDTH = scale(220);
const CARD_MARGIN = scale(16);
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

const TVContinueRail: React.FC<TVContinueRailProps> = ({
  title,
  data,
  onPressItem,
  onRemoveItem,
}) => {
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const perf = usePerfProfile();
  const railPerf = perf.continueRails;

  const renderItem = useCallback(
    ({ item }: { item: WatchProgress }) => (
      <TVContinueCard item={item} onPress={onPressItem} onRemove={onRemoveItem} />
    ),
    [onPressItem, onRemoveItem]
  );

  const getItemLayout = useCallback((_: unknown, index: number) => {
    return { length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index };
  }, []);

  const keyExtractor = useCallback((item: WatchProgress) => String(item.id), []);

  const onScrollToIndexFailed = useCallback(() => {
    // noop – avoids rare crashes on some android tv devices
  }, []);

  if (safeData.length === 0) return null;

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
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={railPerf.windowSize}
        initialNumToRender={railPerf.initialNumToRender}
        maxToRenderPerBatch={railPerf.maxToRenderPerBatch}
        updateCellsBatchingPeriod={railPerf.updateCellsBatchingPeriod}
        onScrollToIndexFailed={onScrollToIndexFailed}
      />
    </View>
  );
};

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

export default memo(TVContinueRail);
