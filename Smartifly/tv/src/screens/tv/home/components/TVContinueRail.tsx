/**
 * TV Continue Watching Rail Component
 *
 * Performance upgrades:
 * - stable callbacks + safeData memo
 * - removeClippedSubviews on Android (usually big win)
 * - better batching defaults for TV
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import { colors, scale, scaleFont } from '../../../../theme';
import { usePerfProfile } from '../../../../utils/perf';
import TVContinueCard from './TVContinueCard';
import { WatchProgress } from '../../../../store/watchHistoryStore';

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_HEIGHT = scale(190);
const CARD_MARGIN = scale(16);
const TARGET_VISIBLE_CARDS = 5;
const LIST_LEFT_PADDING = scale(30);
const LIST_RIGHT_PADDING = scale(10);
const LIST_LEFT_FOCUS_MARGIN = scale(4);
const HOME_SIDEBAR_GAP = scale(130);

// =============================================================================
// TYPES
// =============================================================================

interface TVContinueRailProps {
  title: string;
  data: WatchProgress[];
  onPressItem: (item: WatchProgress) => void;
  onRemoveItem?: (item: WatchProgress) => void;
  sidebarTargetNode?: number;
}

const TVContinueRail: React.FC<TVContinueRailProps> = ({
  title,
  data,
  onPressItem,
  onRemoveItem,
  sidebarTargetNode,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [railWidth, setRailWidth] = useState<number>(Math.max(0, screenWidth - HOME_SIDEBAR_GAP));
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const perf = usePerfProfile();
  const railPerf = perf.continueRails;
  const computedCardWidth = useMemo(() => {
    const usableWidth = Math.max(0, railWidth - LIST_LEFT_PADDING - LIST_RIGHT_PADDING);
    const raw = (usableWidth - CARD_MARGIN * (TARGET_VISIBLE_CARDS - 1)) / TARGET_VISIBLE_CARDS;
    return Math.max(scale(220), Math.floor(raw));
  }, [railWidth]);
  const itemWidth = computedCardWidth + CARD_MARGIN;

  const renderItem = useCallback(
    ({ item }: { item: WatchProgress; index: number }) => (
      <TVContinueCard
        item={item}
        onPress={onPressItem}
        onRemove={onRemoveItem}
        width={computedCardWidth}
        height={CARD_HEIGHT}
        nextFocusLeft={sidebarTargetNode}
      />
    ),
    [computedCardWidth, onPressItem, onRemoveItem, sidebarTargetNode]
  );

  const getItemLayout = useCallback((_: unknown, index: number) => {
    return { length: itemWidth, offset: itemWidth * index, index };
  }, [itemWidth]);

  const keyExtractor = useCallback((item: WatchProgress) => String(item.id), []);
  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

  const onScrollToIndexFailed = useCallback(() => {
    // noop - avoids rare crashes on some android tv devices
  }, []);
  const onRailLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0) {
      setRailWidth((prev) => (Math.abs(prev - nextWidth) < 1 ? prev : nextWidth));
    }
  }, []);

  if (safeData.length === 0) return null;

  return (
    <View style={styles.container} onLayout={onRailLayout}>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        style={styles.list}
        horizontal
        data={safeData}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        removeClippedSubviews={false}
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
    overflow: 'hidden',
  },
  title: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: colors.textPrimary || '#EEE',
    marginBottom: scale(8),
    marginLeft: scale(30),
  },
  listContent: {
    paddingRight: LIST_RIGHT_PADDING,
  },
  list: {
    marginLeft: LIST_LEFT_PADDING + LIST_LEFT_FOCUS_MARGIN,
  },
  separator: {
    width: CARD_MARGIN,
  },
});

export default memo(TVContinueRail);
