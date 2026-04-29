import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { scale, scaleFont } from '../../../../theme';
import { usePerfProfile } from '../../../../utils/perf';
import TVContentCard, { TVContentItem } from './TVContentCard';

// =============================================================================
// CONSTANTS
// =============================================================================

const CARD_WIDTH = scale(240);
const LIVE_CARD_WIDTH = scale(320);
const LIVE_CARD_HEIGHT = scale(228);
const CARD_MARGIN = scale(18);
const LEFT_ANCHOR = scale(30);
const LIST_VIEWPORT_OFFSET = scale(24);
const LIST_INNER_LEFT_PAD = scale(6);

interface TVContentRailProps {
  title: string;
  data: TVContentItem[];
  onPressItem: (item: TVContentItem) => void;
  onFocusItem?: (item: TVContentItem) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

const TVContentRail: React.FC<TVContentRailProps> = ({
  title,
  data,
  onPressItem,
  onFocusItem,
}) => {
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const isLiveRail = useMemo(() => safeData.length > 0 && safeData.every((item) => item.type === 'live'), [safeData]);
  const itemCardWidth = isLiveRail ? LIVE_CARD_WIDTH : CARD_WIDTH;
  const itemWidth = itemCardWidth + CARD_MARGIN;

  const perf = usePerfProfile();
  const railPerf = perf.rails;

  const renderItem = useCallback(
    ({ item }: { item: TVContentItem }) => {
      return (
        <TVContentCard
          item={item}
          onPress={onPressItem}
          onFocusItem={onFocusItem}
          width={isLiveRail ? LIVE_CARD_WIDTH : undefined}
          height={isLiveRail ? LIVE_CARD_HEIGHT : undefined}
          focusable
        />
      );
    },
    [isLiveRail, onFocusItem, onPressItem]
  );

  const getItemLayout = useCallback((_: unknown, index: number) => {
    return {
      length: itemWidth,
      offset: itemWidth * index,
      index,
    };
  }, [itemWidth]);

  const keyExtractor = useCallback((item: TVContentItem) => String(item.id), []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        style={styles.list}
        horizontal
        data={safeData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={railPerf.windowSize}
        initialNumToRender={railPerf.initialNumToRender}
        maxToRenderPerBatch={railPerf.maxToRenderPerBatch}
        updateCellsBatchingPeriod={railPerf.updateCellsBatchingPeriod}
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
    paddingRight: scale(80),
  },
  list: {
    marginLeft: LIST_VIEWPORT_OFFSET,
  },
});
