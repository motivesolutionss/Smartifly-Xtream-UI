import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { scale, scaleFont } from '../../../.././../theme';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import TVContentCard, { TVContentItem } from '../../cards/catalog/TVContentCard';

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_HEIGHT = scale(378);
const LIVE_CARD_HEIGHT_RATIO = 0.6;
const CARD_MARGIN = scale(18);
const LEFT_ANCHOR = scale(30);
const LIST_VIEWPORT_OFFSET = scale(24);
const LIST_INNER_LEFT_PAD = scale(6);
const LIST_RIGHT_PAD = scale(12);
const TARGET_VISIBLE_LIVE_CARDS = 5;
const TARGET_VISIBLE_DEFAULT_CARDS = 6;
const HOME_SIDEBAR_GAP = scale(130);

interface TVContentRailProps {
  title: string;
  data: TVContentItem[];
  onPressItem: (item: TVContentItem) => void;
  onFocusItem?: (item: TVContentItem) => void;
  sidebarTargetNode?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

const TVContentRail: React.FC<TVContentRailProps> = ({
  title,
  data,
  onPressItem,
  onFocusItem,
  sidebarTargetNode,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [railWidth, setRailWidth] = useState<number>(Math.max(0, screenWidth - HOME_SIDEBAR_GAP));
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  // Check only first item — live rails are homogeneous; no need to scan all items
  const isLiveRail = safeData.length > 0 && safeData[0].type === 'live';
  const listUsableWidth = useMemo(() => {
    const width =
      railWidth -
      LIST_VIEWPORT_OFFSET -
      LIST_INNER_LEFT_PAD -
      LIST_RIGHT_PAD;
    return Math.max(0, width);
  }, [railWidth]);
  const liveCardWidth = useMemo(() => {
    const raw = (listUsableWidth - CARD_MARGIN * (TARGET_VISIBLE_LIVE_CARDS - 1)) / TARGET_VISIBLE_LIVE_CARDS;
    return Math.max(scale(220), Math.floor(raw));
  }, [listUsableWidth]);
  const defaultCardWidth = useMemo(() => {
    const raw = (listUsableWidth - CARD_MARGIN * (TARGET_VISIBLE_DEFAULT_CARDS - 1)) / TARGET_VISIBLE_DEFAULT_CARDS;
    return Math.max(scale(180), Math.floor(raw));
  }, [listUsableWidth]);
  const itemCardWidth = isLiveRail ? liveCardWidth : defaultCardWidth;
  const itemCardHeight = useMemo(
    () => (isLiveRail ? Math.round(itemCardWidth * LIVE_CARD_HEIGHT_RATIO) : CARD_HEIGHT),
    [isLiveRail, itemCardWidth]
  );
  const itemWidth = itemCardWidth + CARD_MARGIN;

  const perf = usePerfProfile();
  const railPerf = perf.rails;

  const renderItem = useCallback(
    ({ item, index }: { item: TVContentItem; index: number }) => {
      return (
        <TVContentCard
          item={item}
          onPress={onPressItem}
          onFocusItem={onFocusItem}
          width={itemCardWidth}
          height={itemCardHeight}
          // Only first card should hop to sidebar on left; others should move to previous card.
          nextFocusLeft={index === 0 ? sidebarTargetNode : null}
          focusable
        />
      );
    },
    [itemCardHeight, itemCardWidth, onFocusItem, onPressItem, sidebarTargetNode]
  );

  const getItemLayout = useCallback((_: unknown, index: number) => {
    return {
      length: itemWidth,
      offset: itemWidth * index,
      index,
    };
  }, [itemWidth]);

  const keyExtractor = useCallback((item: TVContentItem) => String(item.id), []);
  const renderSeparator = useCallback(() => <View style={styles.separator} />, []);
  const onRailLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0) {
      setRailWidth((prev) => (Math.abs(prev - nextWidth) < 1 ? prev : nextWidth));
    }
  }, []);

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
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={railPerf.windowSize}
        initialNumToRender={railPerf.initialNumToRender}
        maxToRenderPerBatch={railPerf.maxToRenderPerBatch}
        updateCellsBatchingPeriod={railPerf.updateCellsBatchingPeriod}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    marginBottom: scale(6),
    width: '100%',
    overflow: 'hidden',
  },
  title: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: '#E5E5E5',
    marginBottom: scale(8),
    marginLeft: LEFT_ANCHOR,
  },
  listContent: {
    paddingLeft: LIST_INNER_LEFT_PAD,
    paddingRight: LIST_RIGHT_PAD,
  },
  separator: {
    width: CARD_MARGIN,
  },
  list: {
    marginLeft: LIST_VIEWPORT_OFFSET,
  },
});

export default memo(TVContentRail);
