import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, scale, scaleFont } from '../../../.././../theme';
import { WatchProgress } from '@smartifly/shared/src/store/watchHistoryStore';
import { usePerfProfile } from '@smartifly/shared/src/utils/perf';
import TVContinueCard from '../../cards/continue/TVContinueCard';
import BaseHorizontalRail from '../base/BaseHorizontalRail';
import {
  HOME_SIDEBAR_GAP,
  getRailLayoutMetrics,
} from '../../layout/railSizing';

interface TVContinueRailProps {
  title: string;
  data: WatchProgress[];
  onPressItem: (item: WatchProgress) => void;
  onRemoveItem?: (item: WatchProgress) => void;
  sidebarTargetNode?: number;
  onRequestSidebarFocus?: () => void;
  onFocusIndex?: (index: number) => void;
}

const TVContinueRail: React.FC<TVContinueRailProps> = ({
  title,
  data,
  onPressItem,
  onRemoveItem: _onRemoveItem,
  sidebarTargetNode,
  onRequestSidebarFocus,
  onFocusIndex,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const perf = usePerfProfile();
  const [railWidth, setRailWidth] = useState<number>(Math.max(0, screenWidth - HOME_SIDEBAR_GAP));
  const railRef = useRef<FlatList<WatchProgress> | null>(null);

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const visibleCards = 5;
  const { cardWidth, cardHeight, cardGap, listLeft, contentLeft, contentRight } = useMemo(
    () => getRailLayoutMetrics('fiveUpContinue', railWidth),
    [railWidth]
  );
  const itemLength = cardWidth + cardGap;
  const railStyle = useMemo(() => ({ marginLeft: listLeft }), [listLeft]);
  const contentStyle = useMemo(
    () => ({ paddingLeft: contentLeft, paddingRight: contentRight }),
    [contentLeft, contentRight]
  );
  const separatorStyle = useMemo(() => ({ width: cardGap }), [cardGap]);

  const onRailLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0) {
      setRailWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    }
  }, []);

  const scrollToFocusedIndex = useCallback((index: number) => {
    const maxStartIndex = Math.max(0, safeData.length - visibleCards);
    const startIndex = Math.min(Math.max(0, index - visibleCards + 1), maxStartIndex);
    railRef.current?.scrollToOffset({
      offset: startIndex * itemLength,
      animated: true,
    });
  }, [itemLength, safeData.length, visibleCards]);

  const renderItem = useCallback(
    ({ item, index }: { item: WatchProgress; index: number }) => (
      <TVContinueCard
        item={item}
        onPress={onPressItem}
        onRemove={_onRemoveItem}
        onFocusItem={() => {
          scrollToFocusedIndex(index);
          onFocusIndex?.(index);
        }}
        width={cardWidth}
        height={cardHeight}
        nextFocusLeft={index === 0 ? sidebarTargetNode : undefined}
        onRequestSidebarFocus={index === 0 ? onRequestSidebarFocus : undefined}
      />
    ),
    [cardHeight, cardWidth, onFocusIndex, onPressItem, _onRemoveItem, onRequestSidebarFocus, scrollToFocusedIndex, sidebarTargetNode]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: itemLength, offset: itemLength * index, index }),
    [itemLength]
  );
  const keyExtractor = useCallback((item: WatchProgress) => String(item.id), []);
  const separator = useCallback(() => <View style={separatorStyle} />, [separatorStyle]);

  if (!safeData.length) return null;

  return (
    <View style={styles.container} onLayout={onRailLayout}>
      <Text style={styles.title}>{title}</Text>
      <BaseHorizontalRail
        railRef={railRef}
        railStyle={[styles.listBase, railStyle]}
        data={safeData}
        extraData={`${String(sidebarTargetNode ?? '')}:${cardWidth}`}
        renderItem={renderItem}
        renderSeparator={separator}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={contentStyle}
        removeClippedSubviews={false}
        windowSize={perf.rails.windowSize}
        initialNumToRender={perf.rails.initialNumToRender}
        maxToRenderPerBatch={perf.rails.maxToRenderPerBatch}
        updateCellsBatchingPeriod={perf.rails.updateCellsBatchingPeriod}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: scale(10),
    overflow: 'visible',
  },
  title: {
    marginLeft: scale(30),
    marginBottom: scale(8),
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: colors.textPrimary || '#EEE',
  },
  listBase: {
    marginLeft: 0,
  },
});

export default memo(TVContinueRail);
