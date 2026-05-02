import React, { memo, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { scale, scaleFont } from '../../../.././../theme';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import TVContentCard, { TVContentItem } from '../../cards/catalog/TVContentCard';
import BaseHorizontalRail from '../base/BaseHorizontalRail';
import {
  HOME_SIDEBAR_GAP,
  RailLayoutPreset,
  getRailLayoutMetrics,
} from '../../layout/railSizing';

interface TVContentRailProps {
  title: string;
  data: TVContentItem[];
  layoutPreset?: RailLayoutPreset;
  onPressItem: (item: TVContentItem) => void;
  onFocusItem?: (item: TVContentItem) => void;
  sidebarTargetNode?: number;
  onRequestSidebarFocus?: () => void;
  onFocusIndex?: (index: number, kind: 'live' | 'catalog') => void;
}

const TVContentRail: React.FC<TVContentRailProps> = ({
  title,
  data,
  layoutPreset = 'sixUpPoster',
  onPressItem,
  onFocusItem,
  sidebarTargetNode,
  onRequestSidebarFocus,
  onFocusIndex,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const perf = usePerfProfile();
  const [railWidth, setRailWidth] = useState<number>(Math.max(0, screenWidth - HOME_SIDEBAR_GAP));

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const isLiveRail = safeData.length > 0 && safeData[0].type === 'live';
  const { cardWidth, cardHeight, cardGap, listLeft, contentLeft, contentRight } = useMemo(
    () => getRailLayoutMetrics(layoutPreset, railWidth),
    [layoutPreset, railWidth]
  );
  const itemLength = cardWidth + cardGap;
  const railPerf = perf.rails;

  const onRailLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0) {
      setRailWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: TVContentItem; index: number }) => (
      <TVContentCard
        item={isLiveRail ? { ...item, quality: item.quality ?? 'LIVE' } : item}
        onPress={onPressItem}
        onFocusItem={(focusedItem) => {
          onFocusItem?.(focusedItem);
          onFocusIndex?.(index, isLiveRail ? 'live' : 'catalog');
        }}
        width={cardWidth}
        height={cardHeight}
        nextFocusLeft={index === 0 ? sidebarTargetNode : undefined}
        onRequestSidebarFocus={index === 0 ? onRequestSidebarFocus : undefined}
        focusable
      />
    ),
    [cardHeight, cardWidth, isLiveRail, onFocusIndex, onFocusItem, onPressItem, onRequestSidebarFocus, sidebarTargetNode]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: itemLength, offset: itemLength * index, index }),
    [itemLength]
  );
  const keyExtractor = useCallback((item: TVContentItem) => String(item.id), []);
  const separator = useCallback(() => <View style={{ width: cardGap }} />, [cardGap]);
  const listStyle = useMemo(() => ({ marginLeft: listLeft }), [listLeft]);
  const contentStyle = useMemo(
    () => ({ paddingLeft: contentLeft, paddingRight: contentRight }),
    [contentLeft, contentRight]
  );

  return (
    <View style={styles.container} onLayout={onRailLayout}>
      <Text style={styles.title}>{title}</Text>
      <BaseHorizontalRail
        railStyle={[styles.listBase, listStyle]}
        data={safeData}
        extraData={`${isLiveRail ? 'live' : 'catalog'}:${String(sidebarTargetNode ?? '')}:${cardWidth}:${cardHeight}`}
        renderItem={renderItem}
        renderSeparator={separator}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={contentStyle}
        removeClippedSubviews={false}
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
    width: '100%',
    marginBottom: scale(6),
    overflow: 'hidden',
  },
  title: {
    marginLeft: scale(30),
    marginBottom: scale(8),
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#E5E5E5',
  },
  listBase: {
    marginLeft: 0,
  },
});

export default memo(TVContentRail);
